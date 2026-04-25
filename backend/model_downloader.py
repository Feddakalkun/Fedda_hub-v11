import os
import re
import requests
import threading
import time
from pathlib import Path
from typing import Optional, Dict, List, Any

class ModelDownloader:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.comfy_models_dir = root_dir / "ComfyUI" / "models"
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

# Instance for shared use
model_downloader = ModelDownloader(Path(__file__).parent.parent)
