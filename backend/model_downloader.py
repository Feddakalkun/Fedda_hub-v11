import os
import re
import requests
import threading
import time
import yt_dlp
from pathlib import Path
from typing import Optional, Dict, List, Any

class ModelDownloader:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.comfy_models_dir = root_dir / "ComfyUI" / "models"
        self.comfy_input_dir = root_dir / "ComfyUI" / "input"
        self.progress: Dict[str, dict] = {}
        self.lock = threading.Lock()
        self._active_downloads: Dict[str, threading.Thread] = {}

        self.zimage_core_specs: Dict[str, Dict[str, Any]] = {
            "z_image_turbo_bf16.safetensors": {
                "relative_dir": Path("unet"),
                "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_bf16.safetensors",
                "min_bytes": 10 * 1024 * 1024,
            },
            "qwen_3_4b.safetensors": {
                "relative_dir": Path("clip"),
                "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors",
                "min_bytes": 10 * 1024 * 1024,
            },
            "z-image-vae.safetensors": {
                "relative_dir": Path("vae"),
                "url": "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors",
                "min_bytes": 5 * 1024 * 1024,
            },
            "clip_vision_h.safetensors": {
                "relative_dir": Path("clip_vision"),
                "url": "https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors",
                "min_bytes": 100 * 1024 * 1024,
            },
        }

    def get_progress(self, filename: str) -> dict:
        with self.lock:
            return self.progress.get(filename, {"status": "idle", "progress": 0})

    def _update_progress(self, filename: str, status: str, progress: int = 0, error: str = None):
        with self.lock:
            self.progress[filename] = {
                "status": status,
                "progress": progress,
                "error": error,
                "timestamp": time.time()
            }

    def download_direct(self, url: str, dest_path: Path, filename: str, headers: Optional[dict] = None):
        """Standard HTTP download with progress tracking."""
        try:
            self._update_progress(filename, "downloading", 0)
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            response = requests.get(url, stream=True, timeout=30, headers=headers or {})
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            downloaded_size = 0

            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)
                        if total_size > 0:
                            prog = int((downloaded_size / total_size) * 100)
                            if prog % 5 == 0: # Reduce lock contention
                                self._update_progress(filename, "downloading", prog)

            self._update_progress(filename, "completed", 100)
            return True
        except Exception as e:
            self._update_progress(filename, "error", 0, str(e))
            if dest_path.exists():
                dest_path.unlink()
            return False
        finally:
            with self.lock:
                self._active_downloads.pop(filename, None)

    def _is_valid_file(self, path: Path, min_bytes: int = 10240) -> bool:
        try:
            return path.exists() and path.stat().st_size >= min_bytes
        except Exception:
            return False

    def _start_download_if_needed(self, filename: str, dest_path: Path, url: str, min_bytes: int) -> str:
        if self._is_valid_file(dest_path, min_bytes=min_bytes):
            self._update_progress(filename, "completed", 100)
            return "completed"

        with self.lock:
            existing = self._active_downloads.get(filename)
            if existing and existing.is_alive():
                return "downloading"

            t = threading.Thread(
                target=self.download_direct,
                args=(url, dest_path, filename),
                daemon=True,
            )
            self._active_downloads[filename] = t
            t.start()
            return "downloading"

    def ensure_zimage_core_models(self, required_filenames: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Ensure required Z-Image core models are present.
        Starts background downloads for missing files and returns a status summary.
        """
        names = required_filenames or list(self.zimage_core_specs.keys())
        file_states: List[Dict[str, Any]] = []

        for filename in names:
            spec = self.zimage_core_specs.get(filename)
            if not spec:
                file_states.append({
                    "filename": filename,
                    "status": "unknown",
                    "error": "No download spec found for this model",
                })
                continue

            dest_path = self.comfy_models_dir / spec["relative_dir"] / filename
            min_bytes = int(spec.get("min_bytes", 10240))
            status = self._start_download_if_needed(filename, dest_path, str(spec["url"]), min_bytes)
            progress = self.get_progress(filename)

            file_states.append({
                "filename": filename,
                "status": status,
                "progress": int(progress.get("progress", 0)),
                "path": str(dest_path),
                "exists": self._is_valid_file(dest_path, min_bytes=min_bytes),
                "error": progress.get("error"),
            })

        ready = all(f["status"] == "completed" and f["exists"] for f in file_states if f["status"] != "unknown")
        return {
            "success": True,
            "ready": ready,
            "files": file_states,
        }

    def sync_hf_repo(self, repo_id: str, subfolder: str, limit: Optional[int] = None):
        """Syncs all .safetensors from a HuggingFace repo to models/loras/<subfolder>."""
        try:
            dest_dir = self.comfy_models_dir / "loras" / subfolder
            dest_dir.mkdir(parents=True, exist_ok=True)

            # 1. Fetch file list from HF API
            url = f"https://huggingface.co/api/models/{repo_id}/tree/main"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            items = resp.json()
            files = [item["path"] for item in items if item["path"].lower().endswith(".safetensors")]
            
            if limit:
                files = files[:limit]

            # 2. Download loop
            # For brevity, we process sequentially in a thread
            def _task():
                for f in files:
                    filename = Path(f).name
                    local_path = dest_dir / filename
                    if local_path.exists() and local_path.stat().st_size > 10000:
                        continue # Skip existing
                    
                    file_url = f"https://huggingface.co/{repo_id}/resolve/main/{f}"
                    self.download_direct(file_url, local_path, filename)
            
            threading.Thread(target=_task, daemon=True).start()
            return {"success": True, "total_files": len(files)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def download_media_url(self, url: str):
        """Use yt-dlp to download a video from TikTok/Youtube/etc into ComfyUI input."""
        job_id = f"dl_{int(time.time())}"
        
        def _task():
            try:
                self._update_progress(job_id, "downloading", 0)
                
                def progress_hook(d):
                    if d['status'] == 'downloading':
                        p = d.get('_percent_str', '0%').replace('%','')
                        try:
                            self._update_progress(job_id, "downloading", int(float(p)))
                        except: pass
                
                ydl_opts = {
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                    'outtmpl': str(self.comfy_input_dir / 'tk_%(id)s.%(ext)s'),
                    'progress_hooks': [progress_hook],
                    'noplaylist': True,
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                    final_name = Path(filename).name
                
                self._update_progress(job_id, "completed", 100, error=final_name) # Hack: use error field to return filename
            except Exception as e:
                self._update_progress(job_id, "error", 0, str(e))

        threading.Thread(target=_task, daemon=True).start()
        return {"success": True, "job_id": job_id}

    def download_profile_url(self, url: str, max_items: int = 30):
        """Use yt-dlp to download a full profile/feed (up to max_items) into ComfyUI input."""
        job_id = f"dprof_{int(time.time())}"
        max_items = max(1, min(int(max_items or 30), 500))

        def _task():
            try:
                self._update_progress(job_id, "downloading", 0)

                downloaded_count = 0

                def progress_hook(d):
                    nonlocal downloaded_count
                    if d.get('status') == 'downloading':
                        p = str(d.get('_percent_str', '0%')).replace('%', '').strip()
                        try:
                            self._update_progress(job_id, "downloading", int(float(p)))
                        except Exception:
                            pass
                    elif d.get('status') == 'finished':
                        downloaded_count += 1

                ydl_opts = {
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                    'outtmpl': str(self.comfy_input_dir / 'tkprof_%(uploader_id|uploader)s_%(id)s.%(ext)s'),
                    'progress_hooks': [progress_hook],
                    'noplaylist': False,
                    'playlistend': max_items,
                    'ignoreerrors': True,
                    'quiet': True,
                    'no_warnings': True,
                }

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    if not info:
                        raise RuntimeError("No profile info returned")

                self._update_progress(job_id, "completed", 100, error=f"Downloaded {downloaded_count} videos")
            except Exception as e:
                self._update_progress(job_id, "error", 0, str(e))

        threading.Thread(target=_task, daemon=True).start()
        return {"success": True, "job_id": job_id}

    def get_profile_info(self, url: str) -> Dict[str, Any]:
        """Fetch profile/playlist metadata without downloading."""
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'skip_download': True,
                'ignoreerrors': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    return {"success": False, "error": "No profile info returned"}

            entries = info.get('entries') or []
            valid_entries = [e for e in entries if e]
            count = len(valid_entries)
            uploader = info.get('uploader') or info.get('uploader_id') or info.get('channel') or ''
            title = info.get('title') or uploader or 'Profile'
            return {
                "success": True,
                "title": title,
                "uploader": uploader,
                "video_count": count,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

# Instance for shared use
model_downloader = ModelDownloader(Path(__file__).parent.parent)
