import { useEffect, useRef, useState } from 'react';
import { Film, Loader2, RefreshCw, Upload, Video, Download, Wand2 } from 'lucide-react';
import { BACKEND_API } from '../../config/api';
import { fetchJson } from '../../utils/fetchJson';
import { useToast } from '../../components/ui/Toast';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { comfyService } from '../../services/comfyService';
import { PromptAssistant } from '../../components/ui/PromptAssistant';
import { LoraSelector } from '../../components/ui/LoraSelector';
import { FeddaButton, FeddaSectionTitle } from '../../components/ui/FeddaPrimitives';
import { VideoOutputPanel } from '../../components/layout/VideoOutputPanel';

function UploadCard({
  label,
  accept,
  previewUrl,
  uploading,
  onFile,
}: {
  label: string;
  accept: string;
  previewUrl: string | null;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isVideo = accept.includes('video');
  return (
    <div
      onClick={() => ref.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="relative rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] hover:border-violet-500/30 transition-all cursor-pointer overflow-hidden h-[180px]"
    >
      {previewUrl ? (
        <div className="h-full bg-black/40">
          {isVideo ? (
            <video src={previewUrl} className="w-full h-full object-contain" muted loop autoPlay playsInline />
          ) : (
            <img src={previewUrl} alt={label} className="w-full h-full object-contain" />
          )}
          <div className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/75">Replace</span>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-2">
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-violet-400/70" /> : <Upload className="w-6 h-6 text-white/15" />}
          <span className="text-[9px] font-black uppercase tracking-widest text-white/25">{uploading ? 'Uploading...' : label}</span>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

export const Wan21SteadyDancerPage = () => {
  const [prompt, setPrompt] = usePersistentState(
    'wan21_sd_prompt',
    'full body dancing, cinematic lighting, natural motion, high quality, master piece',
  );
  const [width, setWidth] = usePersistentState('wan21_sd_width', 512);
  const [height, setHeight] = usePersistentState('wan21_sd_height', 864);
  const [videoLength, setVideoLength] = usePersistentState('wan21_sd_length', 5);
  const [fps, setFps] = usePersistentState('wan21_sd_fps', 24);
  const [seed, setSeed] = usePersistentState('wan21_sd_seed', -1);
  const [steps, setSteps] = usePersistentState('wan21_sd_steps', 4);
  const [cfg, setCfg] = usePersistentState('wan21_sd_cfg', 1);
  const [poseSpatial, setPoseSpatial] = usePersistentState('wan21_sd_pose_spatial', 1);
  const [poseTemporal, setPoseTemporal] = usePersistentState('wan21_sd_pose_temporal', 1);
  const [loraName, setLoraName] = usePersistentState('wan21_sd_lora_name', '');
  const [loraStrength, setLoraStrength] = usePersistentState('wan21_sd_lora_strength', 1);
  const [syncPrompt, setSyncPrompt] = usePersistentState(
    'wan21_sd_sync_prompt',
    'same body pose as reference, full body portrait, z-image style, clean face, high detail',
  );
  const [syncNegativePrompt, setSyncNegativePrompt] = usePersistentState(
    'wan21_sd_sync_neg_prompt',
    'blurry, low quality, deformed, extra limbs, bad anatomy',
  );
  const [syncPoseStrength, setSyncPoseStrength] = usePersistentState('wan21_sd_sync_pose_strength', 1);
  const [syncLoraStrength, setSyncLoraStrength] = usePersistentState('wan21_sd_sync_lora_strength', 1);
  const [syncDenoise, setSyncDenoise] = usePersistentState('wan21_sd_sync_denoise', 0.7);
  const [syncWorkflowAccurate, setSyncWorkflowAccurate] = usePersistentState('wan21_sd_sync_workflow_accurate', true);

  // Quality Presets
  const [quality, setQuality] = usePersistentState<'fast' | 'balanced' | 'high'>('wan21_sd_quality', 'balanced');
  
  // Trimming
  const [skipFrames, setSkipFrames] = usePersistentState('wan21_sd_skip_frames', 0);
  const [maxFrames, setMaxFrames] = usePersistentState('wan21_sd_max_frames', 121);

  const [showAdvanced, setShowAdvanced] = usePersistentState('wan21_sd_show_advanced', false);

  const [subjectImageFile, setSubjectImageFile] = usePersistentState<string | null>('wan21_sd_subject_image', null);
  const [motionVideoFile, setMotionVideoFile] = usePersistentState<string | null>('wan21_sd_motion_video', null);
  const [uploadingSubject, setUploadingSubject] = useState(false);
  const [uploadingMotion, setUploadingMotion] = useState(false);

  // TikTok Download
  const [tkUrl, setTkUrl] = useState('');
  const [isDownloadingTk, setIsDownloadingTk] = useState(false);
  const [tkProgress, setTkProgress] = useState(0);

  // Frame Capture
  const [isCapturing, setIsCapturing] = useState(false);
  const [syncingPose, setSyncingPose] = useState(false);
  const [autoBuildingSubject, setAutoBuildingSubject] = useState(false);

  const syncPoseFromVideo = async () => {
    if (!motionVideoFile) {
      toast('Please upload a video first', 'error');
      return;
    }
    setSyncingPose(true);
    try {
      const res = await fetchJson(`${BACKEND_API.BASE_URL}/api/video/sync-pose-character`, {
        method: 'POST',
        body: JSON.stringify({
          video_filename: motionVideoFile,
          prompt: syncPrompt.trim() || prompt,
          negative_prompt: syncNegativePrompt.trim(),
          lora_name: loraName,
            lora_strength: syncLoraStrength,
            pose_strength: syncPoseStrength,
        }),
      });

      if (res.success && res.filename) {
        setSubjectImageFile(res.filename);
        toast('Pose-locked subject generated. Ready for Steady Dancer.', 'success');
      } else {
        toast(res.error || 'Failed to sync pose', 'error');
      }
    } catch (e) {
      toast('Error syncing pose', 'error');
    } finally {
      setSyncingPose(false);
    }
  };

  const sendToImageReference = (filename: string, promptOverride?: string) => {
    if (!filename) return;
    try {
      window.localStorage.setItem(
        'fedda_zimage_img2img_handoff',
        JSON.stringify({
          source: 'steady-dancer',
          filename,
          prompt: (promptOverride || syncPrompt || prompt || '').trim(),
          lora_name: loraName || '',
          created_at: Date.now(),
        }),
      );
      window.dispatchEvent(new CustomEvent('fedda:navigate', { detail: { tab: 'z-image-img2img' } }));
      toast('Sent to Z-Image Img2Img', 'success');
    } catch {
      toast('Failed to send handoff to Z-Image Img2Img', 'error');
    }
  };

  const runAutoBuildSubject = async () => {
    if (!motionVideoFile || autoBuildingSubject) return;
    setAutoBuildingSubject(true);
    try {
      const captured = await handleCaptureFrame();
      if (!captured) throw new Error('Failed to capture first frame');

      const seedForImg2Img = seed === -1 ? Math.floor(Math.random() * 10_000_000_000) : seed;
      const autoSteps = syncWorkflowAccurate ? 9 : Math.max(1, Math.min(25, steps || 9));
      const autoCfg = syncWorkflowAccurate ? 1 : Math.max(0.5, Math.min(3, cfg || 1));
      const autoDenoise = Math.max(0.15, Math.min(0.8, syncDenoise || 0.7));
      const gen = await fetchJson<any>(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: 'z-image-img2img',
          params: {
            prompt: (syncPrompt || prompt || '').trim(),
            negative: syncNegativePrompt.trim(),
            image: captured,
            seed: seedForImg2Img,
            steps: autoSteps,
            cfg: autoCfg,
            denoise: autoDenoise,
            ...(loraName ? { loras: [{ name: loraName, strength: syncLoraStrength }] } : {}),
            client_id: (comfyService as any).clientId,
          },
        }),
      });
      if (!gen?.success || !gen?.prompt_id) {
        throw new Error(gen?.detail || 'Failed to start img2img');
      }

      const promptId = String(gen.prompt_id);
      let promotedInput: string | null = null;

      for (let i = 0; i < 180; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const st = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/generate/status/${encodeURIComponent(promptId)}`);
        const imgs = (st?.images || []) as Array<{ filename: string; subfolder?: string; type?: string }>;
        if (!imgs.length) continue;
        const latest = imgs[imgs.length - 1];
        const promote = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/image/promote-output`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: latest.filename,
            subfolder: latest.subfolder || '',
          }),
        });
        if (promote?.success && promote?.filename) {
          promotedInput = String(promote.filename);
          break;
        }
      }

      if (!promotedInput) throw new Error('Timed out waiting for img2img output');
      setSubjectImageFile(promotedInput);
      toast('Auto subject ready: capture + img2img complete', 'success');
    } catch (e: any) {
      toast(e?.message || 'Auto subject build failed', 'error');
    } finally {
      setAutoBuildingSubject(false);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPromptId, setPendingPromptId] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = usePersistentState<string | null>('wan21_sd_current_video', null);
  const [history, setHistory] = usePersistentState<string[]>('wan21_sd_history', []);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);

  const prevCountRef = useRef(0);
  const sessionRef = useRef<string[]>([]);

  const { toast } = useToast();
  const { state: execState, error: execError, lastOutputVideos, outputReadyCount, registerNodeMap } = useComfyExecution();

  const subjectPreview = subjectImageFile ? `/comfy/view?filename=${encodeURIComponent(subjectImageFile)}&type=input` : null;
  const motionPreview = motionVideoFile ? `/comfy/view?filename=${encodeURIComponent(motionVideoFile)}&type=input` : null;

  useEffect(() => {
    // Ensure core models (CLIP vision, etc) are present
    fetchJson<any>(`${BACKEND_API.BASE_URL}/api/models/zimage-core/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models: ['clip_vision_h.safetensors'] })
    }).catch(() => {});

    comfyService
      .getLoras()
      .then((loras) => {
        const filtered = loras.filter((l) => {
          const n = l.replace(/\\/g, '/').toLowerCase();
          return n.includes('wan') || n.includes('lightx2v');
        });
        setAvailableLoras(filtered);
      })
      .catch(() => {});
  }, []);

  const uploadFile = async (
    file: File,
    setFilename: (name: string) => void,
    setUploading: (value: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/upload`, { method: 'POST', body: form });
      if (!data.success) throw new Error(data.detail || 'Upload failed');
      setFilename(data.filename);
    } catch (error: any) {
      toast(error.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTkDownload = async () => {
    if (!tkUrl.trim() || isDownloadingTk) return;
    setIsDownloadingTk(true);
    setTkProgress(0);
    try {
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/download/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tkUrl.trim() }),
      });
      if (!data.success) throw new Error(data.error || 'Failed to start download');

      const jobId = data.job_id;
      const poll = setInterval(async () => {
        try {
          const status = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/download/status/${jobId}`);
          if (status.status === 'completed') {
            clearInterval(poll);
            setIsDownloadingTk(false);
            setMotionVideoFile(status.error); // We stored the filename in 'error' field as a hack
            setTkUrl('');
            toast('Video downloaded successfully', 'success');
          } else if (status.status === 'error') {
            clearInterval(poll);
            setIsDownloadingTk(false);
            throw new Error(status.error || 'Download failed');
          } else {
            setTkProgress(status.progress || 0);
          }
        } catch (e: any) {
          clearInterval(poll);
          setIsDownloadingTk(false);
          toast(e.message || 'Polling failed', 'error');
        }
      }, 1000);
    } catch (error: any) {
      setIsDownloadingTk(false);
      toast(error.message || 'Failed to download', 'error');
    }
  };

  const handleCaptureFrame = async (): Promise<string | null> => {
    if (!motionVideoFile || isCapturing) return null;
    setIsCapturing(true);
    try {
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/video/extract-frame?filename=${encodeURIComponent(motionVideoFile)}`, {
        method: 'POST'
      });
      if (data.success) {
        setSubjectImageFile(data.filename);
        toast('Captured first frame as subject', 'success');
        return data.filename as string;
      } else {
        throw new Error(data.error || 'Capture failed');
      }
    } catch (e: any) {
      toast(e.message || 'Capture failed', 'error');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (!isGenerating && !pendingPromptId) return;
    if (!lastOutputVideos?.length) return;
    const newVids = lastOutputVideos.slice(prevCountRef.current);
    if (!newVids.length) return;
    prevCountRef.current = lastOutputVideos.length;

    const urls = newVids.map(
      (v) => ({
        url: `/comfy/view?filename=${encodeURIComponent(v.filename)}&subfolder=${encodeURIComponent(v.subfolder)}&type=${v.type}`,
        isVitPose: v.filename.toLowerCase().includes('vitpose') || v.filename.toLowerCase().includes('skeleton')
      })
    );

    sessionRef.current = [...sessionRef.current, ...urls.map(u => u.url)];
    
    // Pick the best video to show: Strictly ignore vitpose for the main view
    const mainVid = urls.find(u => !u.isVitPose);
    if (mainVid) {
      console.log('SteadyDancer: Setting main video output:', mainVid.url);
      setCurrentVideo(mainVid.url);
    } else if (urls.length > 0) {
      console.log('SteadyDancer: Only pose/skeleton received, waiting for main video...');
    } else {
      console.warn('SteadyDancer: Received outputReadyCount trigger but no new videos found.');
    }

    setHistory((prev) => [...urls.map(u => u.url), ...prev.filter((u) => !urls.map(x => x.url).includes(u))].slice(0, 40));
  }, [outputReadyCount, lastOutputVideos, isGenerating, pendingPromptId, setCurrentVideo, setHistory]);

  useEffect(() => {
    if (!pendingPromptId) return;
    if (execState === 'error') {
      const msg = String(execError?.message || '').toLowerCase();
      if (msg.includes('no bones found')) {
        toast(
          'No bones found: use a motion video with one clearly visible full body (head + arms + legs in frame).',
          'error',
        );
      } else if (execError?.message) {
        toast(execError.message, 'error');
      } else {
        toast('SteadyDancer failed during pose detection.', 'error');
      }
      setIsGenerating(false);
      setPendingPromptId(null);
      return;
    }
    if (execState !== 'done') return;
    setIsGenerating(false);
    setPendingPromptId(null);
    toast('SteadyDancer video ready', 'success');
  }, [execState, pendingPromptId, toast]);

  const handleGenerate = async () => {
    if (!subjectImageFile || !motionVideoFile || !prompt.trim() || isGenerating) return;
    sessionRef.current = [];
    prevCountRef.current = lastOutputVideos?.length ?? 0;
    setCurrentVideo(null);
    setIsGenerating(true);

    fetchJson<any>(`${BACKEND_API.BASE_URL}/api/workflow/node-map/wan21-steady-dancer`)
      .then((d) => {
        if (d.success) registerNodeMap(d.node_map);
      })
      .catch(() => {});

    // Set params based on quality
    let finalSteps = steps;
    let finalCfg = cfg;
    if (quality === 'fast') { finalSteps = 4; finalCfg = 1.0; }
    else if (quality === 'balanced') { finalSteps = 8; finalCfg = 1.2; }
    else if (quality === 'high') { finalSteps = 14; finalCfg = 1.8; }

    try {
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: 'wan21-steady-dancer',
          params: {
            image: subjectImageFile,
            reference_video: motionVideoFile,
            prompt: prompt.trim(),
            width,
            height,
            video_length_seconds: videoLength,
            fps,
            steps: finalSteps,
            cfg: finalCfg,
            pose_strength_spatial: poseSpatial,
            pose_strength_temporal: poseTemporal,
            seed: seed === -1 ? Math.floor(Math.random() * 10_000_000_000) : seed,
            skip_frames: skipFrames,
            max_frames: maxFrames,
            ...(loraName ? { lora_name: loraName, lora_strength: loraStrength } : {}),
            client_id: (comfyService as any).clientId,
          },
        }),
      });
      if (data.success) setPendingPromptId(data.prompt_id);
      else throw new Error(data.detail || 'Failed');
    } catch (error: any) {
      toast(error.message || 'Failed to start generation', 'error');
      setIsGenerating(false);
    }
  };

  const canGenerate = !!subjectImageFile && !!motionVideoFile && !!prompt.trim() && !isGenerating;

  return (
    <div className="flex h-full bg-[#080808] overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col border-r border-white/[0.04] overflow-y-auto custom-scrollbar">
        <div className="px-5 py-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-violet-400" />
              <h2 className="fedda-kicker text-violet-100/90 tracking-widest">WAN 2.1 Steady Dancer</h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <UploadCard
                label="Step 1: Upload Subject"
                accept="image/*"
                previewUrl={subjectPreview}
                uploading={uploadingSubject}
                onFile={(file) => uploadFile(file, (name) => setSubjectImageFile(name), setUploadingSubject)}
              />
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/80">Pose-lock Subject Builder</div>
              <textarea
                value={syncPrompt}
                onChange={(e) => setSyncPrompt(e.target.value)}
                rows={2}
                placeholder="Prompt for the subject image generated from captured pose..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white/90 outline-none"
              />
              <input
                value={syncNegativePrompt}
                onChange={(e) => setSyncNegativePrompt(e.target.value)}
                placeholder="Negative prompt (optional)"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white/80 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-white/45">Pose Strength
                  <input
                    type="number"
                    value={syncPoseStrength}
                    step={0.1}
                    min={0}
                    max={2}
                    onChange={(e) => setSyncPoseStrength(Number(e.target.value) || 1)}
                    className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-[11px] font-mono"
                  />
                </label>
                <label className="text-[10px] text-white/45">Sync LoRA Strength
                  <input
                    type="number"
                    value={syncLoraStrength}
                    step={0.1}
                    min={0}
                    max={2}
                    onChange={(e) => setSyncLoraStrength(Number(e.target.value) || 1)}
                    className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-[11px] font-mono"
                  />
                </label>
                <label className="text-[10px] text-white/45">Img2Img Denoise
                  <input
                    type="number"
                    value={syncDenoise}
                    step={0.05}
                    min={0.15}
                    max={0.8}
                    onChange={(e) => setSyncDenoise(Number(e.target.value) || 0.7)}
                    className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-[11px] font-mono"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSyncDenoise(0.35)}
                  className="px-2 py-1 rounded-md border border-white/15 bg-white/5 text-[10px] text-white/70 hover:bg-white/10"
                >
                  Identity Keep (0.35)
                </button>
                <button
                  onClick={() => setSyncDenoise(0.7)}
                  className="px-2 py-1 rounded-md border border-white/15 bg-white/5 text-[10px] text-white/70 hover:bg-white/10"
                >
                  Identity Shift (0.70)
                </button>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-white/55">
                <input
                  type="checkbox"
                  checked={!!syncWorkflowAccurate}
                  onChange={(e) => setSyncWorkflowAccurate(e.target.checked)}
                />
                Workflow-accurate mode (steps=9, cfg=1.0, euler/simple)
              </label>
            </div>

            <div className="relative group">
              <UploadCard
                label="Step 2: Upload Motion"
                    accept="video/*"
                    previewUrl={motionPreview}
                    uploading={uploadingMotion}
                    onFile={(file) => uploadFile(file, (name) => setMotionVideoFile(name), setUploadingMotion)}
                  />
                  {motionVideoFile && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={handleCaptureFrame}
                        disabled={isCapturing}
                        title="Simple Frame Capture"
                        className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                      >
                        {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={syncPoseFromVideo}
                        disabled={syncingPose}
                        title="Magic Sync: Character from Pose"
                        className="p-2 rounded-xl bg-violet-500/20 backdrop-blur-md border border-violet-500/30 text-violet-300 hover:bg-violet-500/40 transition-all shadow-lg shadow-violet-500/10"
                      >
                        {syncingPose ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* TikTok Download Input */}
                <div className="flex gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <input
                    type="text"
                    value={tkUrl}
                    onChange={(e) => setTkUrl(e.target.value)}
                    placeholder="or paste TikTok/YouTube URL..."
                    className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-white/10"
                  />
                  <button
                    onClick={handleTkDownload}
                    disabled={!tkUrl.trim() || isDownloadingTk}
                    className="p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 transition-all disabled:opacity-30"
                  >
                    {isDownloadingTk ? (
                      <div className="relative w-4 h-4 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="absolute text-[6px] font-bold">{tkProgress}%</span>
                      </div>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {motionVideoFile && (
                    <button
                      onClick={runAutoBuildSubject}
                      disabled={isCapturing || autoBuildingSubject || isGenerating}
                      className="px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 disabled:opacity-40 transition-all"
                    >
                      {autoBuildingSubject ? 'Auto Building Subject...' : 'Auto Build Subject (Capture + Img2Img)'}
                    </button>
                  )}
                  {motionVideoFile && (
                    <button
                      onClick={async () => {
                        const captured = await handleCaptureFrame();
                        if (captured) sendToImageReference(captured, syncPrompt);
                      }}
                      disabled={isCapturing}
                      className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
                    >
                      {isCapturing ? 'Capturing...' : 'Capture Frame + Open Z-Image Img2Img'}
                    </button>
                  )}
                  {subjectImageFile && (
                    <button
                      onClick={() => sendToImageReference(subjectImageFile, syncPrompt)}
                      className="px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] font-black uppercase tracking-wider hover:bg-violet-500/20 transition-all"
                    >
                      Open Current Subject In Z-Image Img2Img
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Quality Setting</span>
              <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                {(['fast', 'balanced', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      quality === q 
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                        : 'text-white/20 hover:text-white/40'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <PromptAssistant
              context="wan-scene"
              value={prompt}
              onChange={setPrompt}
              placeholder="Describe outfit/style..."
              minRows={3}
              accent="violet"
              label="Step 3: Style Prompt"
              enableCaption={false}
            />
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${showAdvanced ? 'rotate-180' : ''} transition-transform`} />
              {showAdvanced ? 'Trimming & Advanced Settings' : 'Trimming & Advanced Settings'}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t border-white/[0.04] animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] text-white/35">Start Frame
                    <input type="number" value={skipFrames} min={0} onChange={(e) => setSkipFrames(Number(e.target.value) || 0)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                  <label className="text-[10px] text-white/35">Max Frames to Load
                    <input type="number" value={maxFrames} min={1} onChange={(e) => setMaxFrames(Number(e.target.value) || 121)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <label className="text-[10px] text-white/35">Width
                    <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value) || 512)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                  <label className="text-[10px] text-white/35">Height
                    <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value) || 864)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                  <label className="text-[10px] text-white/35">FPS
                    <input type="number" value={fps} min={12} max={60} onChange={(e) => setFps(Number(e.target.value) || 24)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                  <label className="text-[10px] text-white/35">Seed
                    <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value))} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <label className="text-[10px] text-white/35">Steps Override
                    <input type="number" value={steps} min={1} max={12} onChange={(e) => setSteps(Number(e.target.value) || 4)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono opacity-50" />
                  </label>
                  <label className="text-[10px] text-white/35">CFG Override
                    <input type="number" value={cfg} step={0.1} min={0.5} max={3} onChange={(e) => setCfg(Number(e.target.value) || 1)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono opacity-50" />
                  </label>
                  <label className="text-[10px] text-white/35">Pose Spat
                    <input type="number" value={poseSpatial} step={0.1} min={0} max={2} onChange={(e) => setPoseSpatial(Number(e.target.value) || 1)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                  <label className="text-[10px] text-white/35">Pose Temp
                    <input type="number" value={poseTemporal} step={0.1} min={0} max={2} onChange={(e) => setPoseTemporal(Number(e.target.value) || 1)} className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono" />
                  </label>
                </div>

                <LoraSelector
                  label="LoRA Override (optional)"
                  value={loraName}
                  onChange={setLoraName}
                  strength={loraStrength}
                  onStrengthChange={setLoraStrength}
                  options={availableLoras}
                  accent="violet"
                />
              </div>
            )}
          </div>

          <div className="pt-4 pb-10">
            <FeddaButton
              disabled={!canGenerate}
              onClick={handleGenerate}
              variant="violet"
              className="w-full py-5 rounded-3xl font-black text-[12px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 transition-all disabled:opacity-30"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
              <span>{isGenerating ? 'Generating...' : 'Start Motion Transfer'}</span>
            </FeddaButton>
          </div>
        </div>
      </div>

      <VideoOutputPanel
        title="Dancer Output"
        currentVideo={currentVideo}
        history={history}
        isGenerating={isGenerating}
      />
    </div>
  );
};
