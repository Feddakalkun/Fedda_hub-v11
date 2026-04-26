import { useEffect, useRef, useState } from 'react';
import { Film, Loader2, RefreshCw, Upload, Video } from 'lucide-react';
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
      className="relative rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] hover:border-violet-500/30 transition-all cursor-pointer overflow-hidden min-h-[160px]"
    >
      {previewUrl ? (
        <div className="h-full">
          {isVideo ? (
            <video src={previewUrl} className="w-full h-full object-cover min-h-[160px]" muted loop autoPlay playsInline />
          ) : (
            <img src={previewUrl} alt={label} className="w-full h-full object-cover min-h-[160px]" />
          )}
          <div className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/75">Replace</span>
          </div>
        </div>
      ) : (
        <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-2">
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

  useEffect(() => {
    if (!isGenerating && !pendingPromptId) return;
    if (!lastOutputVideos?.length) return;
    const newVids = lastOutputVideos.slice(prevCountRef.current);
    if (!newVids.length) return;
    prevCountRef.current = lastOutputVideos.length;
    const urls = newVids.map(
      (v) => `/comfy/view?filename=${encodeURIComponent(v.filename)}&subfolder=${encodeURIComponent(v.subfolder)}&type=${v.type}`,
    );
    sessionRef.current = [...sessionRef.current, ...urls];
    setCurrentVideo(urls[0]);
    setHistory((prev) => [...urls, ...prev.filter((u) => !urls.includes(u))].slice(0, 40));
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
    if (quality === 'fast') { finalSteps = 3; finalCfg = 1.0; }
    else if (quality === 'balanced') { finalSteps = 5; finalCfg = 1.2; }
    else if (quality === 'high') { finalSteps = 8; finalCfg = 1.5; }

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
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-violet-400" />
            <h2 className="fedda-kicker text-violet-100/90 tracking-widest">WAN 2.1 Steady Dancer</h2>
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
              <UploadCard
                label="Step 2: Upload Motion"
                accept="video/*"
                previewUrl={motionPreview}
                uploading={uploadingMotion}
                onFile={(file) => uploadFile(file, (name) => setMotionVideoFile(name), setUploadingMotion)}
              />
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
