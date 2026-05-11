import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, Video, Sparkles, X } from 'lucide-react';
import { BACKEND_API } from '../../config/api';
import { fetchJson } from '../../utils/fetchJson';
import { useToast } from '../../components/ui/Toast';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { comfyService } from '../../services/comfyService';
import { LoraSelector } from '../../components/ui/LoraSelector';
import { FeddaButton } from '../../components/ui/FeddaPrimitives';

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
      onClick={() => {
        if (previewUrl) return;
        ref.current?.click();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onDragOver={(e) => e.preventDefault()}
      className={`relative rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] hover:border-violet-500/35 transition-all overflow-hidden h-[200px] ${previewUrl ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {previewUrl ? (
        <div className="h-full bg-black/40">
          {isVideo ? (
            <video src={previewUrl} className="w-full h-full object-contain" controls playsInline />
          ) : (
            <img src={previewUrl} alt={label} className="w-full h-full object-contain" />
          )}
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-2">
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-violet-400/80" /> : <Upload className="w-6 h-6 text-white/40" />}
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{uploading ? 'Uploading...' : label}</span>
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
  const startVideoRef = useRef<HTMLVideoElement | null>(null);
  const manualImageInputRef = useRef<HTMLInputElement | null>(null);
  const manualVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [prompt] = usePersistentState(
    'wan21_sd_prompt',
    'full-body dancer, clean anatomy, stable identity, dynamic choreography, cinematic camera tracking, detailed wardrobe textures, realistic skin, high motion coherence, high quality',
  );

  const [width, setWidth] = usePersistentState('wan21_sd_width', 512);
  const [height, setHeight] = usePersistentState('wan21_sd_height', 512);
  const [videoLength, setVideoLength] = usePersistentState('wan21_sd_length', 5);
  const [fps] = usePersistentState('wan21_sd_fps', 24);
  const [seed] = usePersistentState('wan21_sd_seed', -1);
  const [poseSpatial] = usePersistentState('wan21_sd_pose_spatial', 1);
  const [poseTemporal] = usePersistentState('wan21_sd_pose_temporal', 1);
  const [showAdvanced, setShowAdvanced] = usePersistentState('wan21_sd_show_advanced', false);

  const [loraName, setLoraName] = usePersistentState('wan21_sd_lora_name', '');
  const [loraStrength, setLoraStrength] = usePersistentState('wan21_sd_lora_strength', 1);
  const [zimageDenoise, setZimageDenoise] = usePersistentState('wan21_sd_zimage_denoise', 0.82);

  const [subjectImageFile, setSubjectImageFile] = usePersistentState<string | null>('wan21_sd_subject_image', null);
  const [subjectImageNonce, setSubjectImageNonce] = useState<number>(Date.now());
  const [motionVideoFile, setMotionVideoFile] = usePersistentState<string | null>('wan21_sd_motion_video', null);
  const [uploadingSubject, setUploadingSubject] = useState(false);
  const [uploadingMotion, setUploadingMotion] = useState(false);

  const [tkUrl, setTkUrl] = useState('');
  const [isDownloadingTk, setIsDownloadingTk] = useState(false);
  const [tkProgress, setTkProgress] = useState(0);
  const [profileUrl, setProfileUrl] = useState('');
  const [profileMaxItems, setProfileMaxItems] = useState(30);
  const [profileMode, setProfileMode] = useState<'all' | 'custom'>('all');
  const [profileInfoLoading, setProfileInfoLoading] = useState(false);
  const [profileVideoCount, setProfileVideoCount] = useState<number | null>(null);
  const [profileTitle, setProfileTitle] = useState('');
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);
  const [profileProgress, setProfileProgress] = useState(0);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isGeneratingFrameImage, setIsGeneratingFrameImage] = useState(false);
  const [zimagePreviewUrl, setZimagePreviewUrl] = useState<string | null>(null);
  const [zimageReferenceFile, setZimageReferenceFile] = useState<string | null>(null);
  const [zimageOutputMeta, setZimageOutputMeta] = useState<{ filename: string; subfolder?: string; type?: string } | null>(null);
  const [runImageUsed, setRunImageUsed] = useState<string | null>(null);
  const [promotedInputFile, setPromotedInputFile] = useState<string | null>(null);
  const promoteRetryRef = useRef<number>(0);

  const [startSecond, setStartSecond] = usePersistentState('wan21_sd_start_second', 0);
  const [endSecond, setEndSecond] = usePersistentState('wan21_sd_end_second', 5);
  const [videoDurationSec, setVideoDurationSec] = useState(5);
  const [scalePercent] = usePersistentState('wan21_sd_scale_percent', 100);
  const [resolutionProfile, setResolutionProfile] = usePersistentState<'square' | 'portrait' | 'landscape'>(
    'wan21_sd_resolution_profile',
    'square',
  );
  const [showLatestVideo, setShowLatestVideo] = usePersistentState('wan21_sd_show_latest_video', false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPromptId, setPendingPromptId] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = usePersistentState<string | null>('wan21_sd_current_video', null);
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);

  const prevCountRef = useRef(0);
  const { toast } = useToast();
  const { state: execState, error: execError, lastOutputVideos, outputReadyCount, registerNodeMap, cancelExecution } = useComfyExecution();

  const subjectPreview = subjectImageFile
    ? `/comfy/view?filename=${encodeURIComponent(subjectImageFile)}&type=input&v=${subjectImageNonce}`
    : null;
  const motionPreview = motionVideoFile ? `/comfy/view?filename=${encodeURIComponent(motionVideoFile)}&type=input` : null;

  useEffect(() => {
    comfyService
      .getLoras()
      .then((loras) => {
        const filtered = loras.filter((l) => {
          const n = l.replace(/\\/g, '/').toLowerCase();
          return n.includes('zimage') || n.includes('wan') || n.includes('lightx2v');
        });
        setAvailableLoras(filtered);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!motionPreview) return;
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = motionPreview;
    probe.onloadedmetadata = () => {
      const seconds = Math.max(1, Math.floor(probe.duration || 0));
      setVideoDurationSec(seconds);
      const w = Math.max(64, Math.floor(probe.videoWidth || width));
      const h = Math.max(64, Math.floor(probe.videoHeight || height));
      setWidth(Math.max(64, Math.floor((w * scalePercent) / 100)));
      setHeight(Math.max(64, Math.floor((h * scalePercent) / 100)));
      if (startSecond > seconds) setStartSecond(seconds - 1);
      if (endSecond > seconds) setEndSecond(seconds);
      if (endSecond <= startSecond) setEndSecond(Math.min(seconds, startSecond + 1));
    };
  }, [motionPreview, startSecond, endSecond, setStartSecond, setEndSecond, scalePercent, setWidth, setHeight, width, height]);

  const uploadFile = async (
    file: File,
    setFilename: (name: string) => void,
    setUploading: (value: boolean) => void,
  ) => {
    setUploading(true);
    try {
      const data = await comfyService.uploadInputFile(file);
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
            setMotionVideoFile(status.error);
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

  const handleProfileDownload = async () => {
    if (!profileUrl.trim() || isDownloadingProfile) return;
    setIsDownloadingProfile(true);
    setProfileProgress(0);
    try {
      const countToDownload =
        profileMode === 'all'
          ? (profileVideoCount && profileVideoCount > 0 ? profileVideoCount : 500)
          : profileMaxItems;
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/download/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: profileUrl.trim(), max_items: countToDownload }),
      });
      if (!data.success) throw new Error(data.error || 'Failed to start profile download');

      const jobId = data.job_id;
      const poll = setInterval(async () => {
        try {
          const status = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/download/status/${jobId}`);
          if (status.status === 'completed') {
            clearInterval(poll);
            setIsDownloadingProfile(false);
            setProfileUrl('');
            toast(status.error || 'Profile download completed', 'success');
          } else if (status.status === 'error') {
            clearInterval(poll);
            setIsDownloadingProfile(false);
            throw new Error(status.error || 'Profile download failed');
          } else {
            setProfileProgress(status.progress || 0);
          }
        } catch (e: any) {
          clearInterval(poll);
          setIsDownloadingProfile(false);
          toast(e.message || 'Profile polling failed', 'error');
        }
      }, 1000);
    } catch (error: any) {
      setIsDownloadingProfile(false);
      toast(error.message || 'Failed to download profile', 'error');
    }
  };

  const fetchProfileInfo = async () => {
    if (!profileUrl.trim() || profileInfoLoading) return;
    setProfileInfoLoading(true);
    try {
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/download/profile-info?url=${encodeURIComponent(profileUrl.trim())}`);
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch profile info');
      setProfileVideoCount(Number(data.video_count || 0));
      setProfileTitle(String(data.title || data.uploader || 'Profile'));
      if (profileMode === 'all' && Number(data.video_count || 0) > 0) {
        setProfileMaxItems(Number(data.video_count));
      }
      toast(`Profile found: ${Number(data.video_count || 0)} videos`, 'success');
    } catch (e: any) {
      toast(e.message || 'Could not fetch profile info', 'error');
      setProfileVideoCount(null);
      setProfileTitle('');
    } finally {
      setProfileInfoLoading(false);
    }
  };

  const captureFrameAtSelectedSecond = async (options?: { assignSubject?: boolean }): Promise<string | null> => {
    if (!motionVideoFile || isCapturing) return null;
    const assignSubject = options?.assignSubject ?? false;
    setIsCapturing(true);
    try {
      const data = await fetchJson<any>(
        `${BACKEND_API.BASE_URL}/api/video/extract-frame?filename=${encodeURIComponent(motionVideoFile)}&frame_second=${encodeURIComponent(startSecond)}&frame_index=${encodeURIComponent(Math.max(0, Math.floor(startSecond * Math.max(1, fps))))}`,
        { method: 'POST' },
      );
      if (data.success) {
        if (assignSubject) {
          setSubjectImageFile(data.filename);
          setSubjectImageNonce(Date.now());
        }
        return String(data.filename);
      }
      throw new Error(data.error || 'Capture failed');
    } catch (e: any) {
      toast(e.message || 'Capture failed', 'error');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (!motionVideoFile) return;
    const timer = setTimeout(async () => {
      await captureFrameAtSelectedSecond();
    }, 350);
    return () => clearTimeout(timer);
  }, [motionVideoFile, startSecond]);

  useEffect(() => {
    const el = startVideoRef.current;
    if (!el || !motionVideoFile) return;
    try {
      el.currentTime = Math.max(0, Math.min(startSecond, Math.max(1, videoDurationSec)));
    } catch {}
  }, [startSecond, motionVideoFile, videoDurationSec]);

  const generateImageFromSelectedStartPoint = async () => {
    if (isGeneratingFrameImage) return;
    setIsGeneratingFrameImage(true);
    try {
      let baseImage = subjectImageFile;
      if (!baseImage && motionVideoFile) {
        baseImage = await captureFrameAtSelectedSecond({ assignSubject: true });
      }
      if (!baseImage) throw new Error('No reference image available. Capture start frame first.');

      // Prepare a higher-quality input for Z-Image only (does not affect steady dancer run size).
      const prep = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/image/prepare-zimage-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: baseImage,
          target_short_side: 1024,
          max_long_side: 1536,
          divisible: 64,
          target_name: 'zimage_input_latest.png',
        }),
      });
      const zimageInput = prep?.success && prep?.filename ? String(prep.filename) : baseImage;

      const gen = await fetchJson<any>(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: 'z-image-img2img',
          params: {
            prompt:
              'same pose, same camera framing, same background, keep scene and lighting natural, full color, photorealistic portrait, clean skin texture, high detail',
            image: zimageInput,
            denoise: Math.max(0.55, Math.min(0.95, Number(zimageDenoise) || 0.82)),
            seed: seed === -1 ? Math.floor(Math.random() * 10_000_000_000) : seed,
            ...(loraName ? { loras: [{ name: loraName, strength: loraStrength }] } : {}),
            client_id: (comfyService as any).clientId,
          },
        }),
      });

      if (!gen?.success || !gen?.prompt_id) throw new Error(gen?.detail || 'Failed to start Z-Image generation');
      toast('Z-Image job started. Waiting for output...', 'success');

      const promptId = String(gen.prompt_id);
      let promotedInput: string | null = null;
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const st = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/generate/status/${encodeURIComponent(promptId)}`);
        const status = String(st?.status || '');
        const imgs = (st?.images || []) as Array<{ filename: string; subfolder?: string }>;
        if (status === 'error') throw new Error(st?.error || 'Z-Image failed');

        const statusDone = status === 'completed' || status === 'done' || status === 'success' || status === 'not_found';
        if (statusDone || imgs.length > 0) {
          if (!imgs.length) throw new Error('Z-Image finished but no image output was returned.');

          const sorted = [...imgs].sort((a, b) => {
            const score = (f: string) => {
              const n = (f || '').toLowerCase();
              if (n.includes('rgthree') || n.includes('compare') || n.includes('_temp_') || n.includes('cvssd')) return 0;
              return 2;
            };
            return score(b.filename) - score(a.filename);
          });

          for (const img of sorted) {
            setZimagePreviewUrl(`/comfy/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=output`);
            setZimageOutputMeta({ filename: img.filename, subfolder: img.subfolder || '', type: 'output' });
            const promote = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/image/promote-output`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: img.filename,
                subfolder: img.subfolder || '',
                target_name: 'sd_subject_latest.png',
              }),
            });
            if (promote?.success && promote?.filename) {
              promotedInput = String(promote.filename);
              break;
            }
          }

          if (!promotedInput) throw new Error('Z-Image output found, but failed to set it as Reference Image.');
          break;
        }
      }
      if (!promotedInput) throw new Error('Timed out waiting for Z-Image output');

      setSubjectImageFile(promotedInput);
      setSubjectImageNonce(Date.now());
      setZimageReferenceFile(promotedInput);
      setRunImageUsed(promotedInput);
      setPromotedInputFile(promotedInput);
      toast('Z-Image character generated and set as Reference Image', 'success');
    } catch (e: any) {
      toast(e?.message || 'Z-Image start-point generation failed', 'error');
    } finally {
      setIsGeneratingFrameImage(false);
    }
  };

  useEffect(() => {
    if (!isGenerating && !pendingPromptId) return;
    if (!lastOutputVideos?.length) return;
    const newVids = lastOutputVideos.slice(prevCountRef.current);
    if (!newVids.length) return;
    prevCountRef.current = lastOutputVideos.length;

    const urls = newVids.map((v) => ({
      url: `/comfy/view?filename=${encodeURIComponent(v.filename)}&subfolder=${encodeURIComponent(v.subfolder)}&type=${v.type}`,
      isVitPose: v.filename.toLowerCase().includes('vitpose') || v.filename.toLowerCase().includes('skeleton'),
    }));

    const mainVid = urls.find((u) => !u.isVitPose);
    if (mainVid) setCurrentVideo(mainVid.url);

  }, [outputReadyCount, lastOutputVideos, isGenerating, pendingPromptId, setCurrentVideo]);

  useEffect(() => {
    if (!pendingPromptId) return;
    if (execState === 'error') {
      toast(execError?.message || 'SteadyDancer failed during pose detection.', 'error');
      setIsGenerating(false);
      setPendingPromptId(null);
      return;
    }
    if (execState !== 'done') return;
    setIsGenerating(false);
    setPendingPromptId(null);
    toast('SteadyDancer video ready', 'success');
  }, [execState, pendingPromptId, execError, toast]);

  const handleGenerate = async () => {
    if (!subjectImageFile || !motionVideoFile || !prompt.trim() || isGenerating) return;

    prevCountRef.current = lastOutputVideos?.length ?? 0;
    setCurrentVideo(null);
    setIsGenerating(true);

    fetchJson<any>(`${BACKEND_API.BASE_URL}/api/workflow/node-map/wan21-steady-dancer`)
      .then((d) => {
        if (d.success) registerNodeMap(d.node_map);
      })
      .catch(() => {});

    const normalizedStartSec = Math.max(0, Math.floor(startSecond));
    const normalizedEndSec = Math.max(normalizedStartSec + 1, Math.floor(endSecond));

    // Locked "Original Match" runtime defaults.
    const sampleFps = 16; // matches VHS_LoadVideo force_rate in the original flow
    const outputFps = 24;
    const lockedSteps = 4;
    const lockedCfg = 1.0;
    const lockedContextFrames = 81;
    const lockedAttentionMode: 'sdpa' | 'xformers' = 'sdpa';
    const lockedLoadDevice: 'offload_device' | 'cuda' = 'offload_device';
    const lockedTextDevice: 'gpu' | 'offload_device' = 'gpu';
    const lockedUseDiskCache = true;
    const lockedSamplerForceOffload = true;
    const lockedInterpolation: 1 | 2 = 2;
    const lockedVideoLengthSec = Math.max(1, Math.min(12, Number(videoLength) || 5));

    const startFrame = normalizedStartSec * sampleFps;
    const frameCount = Math.min(81, Math.max(1, (normalizedEndSec - normalizedStartSec) * sampleFps));

    let runWidth = 512;
    let runHeight = 512;
    if (resolutionProfile === 'portrait') {
      runWidth = 480;
      runHeight = 832;
    } else if (resolutionProfile === 'landscape') {
      runWidth = 832;
      runHeight = 480;
    }

    let imageForRun = zimageReferenceFile || subjectImageFile;
    // Hard fallback: always prefer newest Z-Image output if available.
    try {
      const latest = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/image/promote-latest-zimage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (latest?.success && latest?.filename) {
        imageForRun = String(latest.filename);
        setSubjectImageFile(imageForRun);
        setSubjectImageNonce(Date.now());
        setZimageReferenceFile(imageForRun);
        setRunImageUsed(imageForRun);
        setPromotedInputFile(imageForRun);
      }
    } catch {
      // ignore and continue with explicit promotion below
    }

    if (zimageOutputMeta?.filename) {
      try {
        const promote = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/image/promote-output`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: zimageOutputMeta.filename,
            subfolder: zimageOutputMeta.subfolder || '',
            type: zimageOutputMeta.type || 'output',
            target_name: 'sd_subject_latest.png',
          }),
        });
        if (promote?.success && promote?.filename) {
          imageForRun = String(promote.filename);
          setSubjectImageFile(imageForRun);
          setSubjectImageNonce(Date.now());
          setZimageReferenceFile(imageForRun);
          setRunImageUsed(imageForRun);
          setPromotedInputFile(imageForRun);
        }
      } catch {
        // fallback to current imageForRun
      }
    }
    setRunImageUsed(imageForRun);

    try {
      const data = await fetchJson<any>(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.GENERATE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: 'wan21-steady-dancer',
          params: {
            image: imageForRun,
            reference_video: motionVideoFile,
            prompt: prompt.trim(),
            width: runWidth,
            height: runHeight,
            video_length_seconds: lockedVideoLengthSec,
            fps: outputFps,
            steps: lockedSteps,
            cfg: lockedCfg,
            context_frames: lockedContextFrames,
            attention_mode: lockedAttentionMode,
            load_device: lockedLoadDevice,
            text_device: lockedTextDevice,
            use_disk_cache: lockedUseDiskCache,
            sampler_force_offload: lockedSamplerForceOffload,
            interpolation_multiplier: lockedInterpolation,
            pose_strength_spatial: poseSpatial,
            pose_strength_temporal: poseTemporal,
            seed: seed === -1 ? Math.floor(Math.random() * 10_000_000_000) : seed,
            skip_frames: startFrame,
            max_frames: frameCount,
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

  const needsPromotedZimage = !!zimageOutputMeta && !zimageReferenceFile;
  const canGenerate = !!subjectImageFile && !!motionVideoFile && !!prompt.trim() && !isGenerating && !needsPromotedZimage;
  const secondMax = Math.max(1, videoDurationSec);

  useEffect(() => {
    if (!needsPromotedZimage || isGeneratingFrameImage) return;
    let cancelled = false;
    const tryPromote = async () => {
      try {
        const latest = await fetchJson<any>(`${BACKEND_API.BASE_URL}/api/image/promote-latest-zimage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!cancelled && latest?.success && latest?.filename) {
          const fn = String(latest.filename);
          setSubjectImageFile(fn);
          setSubjectImageNonce(Date.now());
          setZimageReferenceFile(fn);
          setRunImageUsed(fn);
          setPromotedInputFile(fn);
          promoteRetryRef.current = 0;
          return;
        }
      } catch {
        // keep retrying below
      }

      if (!cancelled && promoteRetryRef.current < 8) {
        promoteRetryRef.current += 1;
        setTimeout(tryPromote, 900);
      }
    };

    tryPromote();
    return () => {
      cancelled = true;
    };
  }, [needsPromotedZimage, isGeneratingFrameImage]);

  return (
    <div className="flex h-full bg-[#07080a] overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
        <div className="p-4 lg:p-5 pt-1 space-y-3">
          <div className="space-y-3">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0f] p-3.5 space-y-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
                <button
                  onClick={() => setShowLatestVideo(!showLatestVideo)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/55">Latest Generated Video</span>
                  <span className="text-[10px] text-white/60">{showLatestVideo ? 'Hide' : 'Show'}</span>
                </button>
                {showLatestVideo && (
                  <div className="rounded-xl border border-white/[0.08] bg-black/25 p-2">
                    {currentVideo ? (
                      <video src={currentVideo} controls className="w-full max-h-[300px] rounded-lg bg-black object-contain" />
                    ) : (
                      <div className="h-[140px] flex items-center justify-center text-white/35 text-sm">No video yet</div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0f] p-3.5 space-y-3 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => manualImageInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] text-[10px] font-black uppercase tracking-[0.12em] text-white/80"
                  >
                    Upload Image
                  </button>
                  <button
                    onClick={() => manualVideoInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] text-[10px] font-black uppercase tracking-[0.12em] text-white/80"
                  >
                    Upload Video
                  </button>
                  <input
                    ref={manualImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      uploadFile(
                        file,
                        (name) => {
                          setSubjectImageFile(name);
                          setSubjectImageNonce(Date.now());
                          setZimageReferenceFile(null);
                          setRunImageUsed(name);
                          setPromotedInputFile(name);
                        },
                        setUploadingSubject,
                      );
                      e.currentTarget.value = '';
                    }}
                  />
                  <input
                    ref={manualVideoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      uploadFile(file, (name) => setMotionVideoFile(name), setUploadingMotion);
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.08] bg-black/25 p-2 space-y-2">
                    <div className="text-[10px] text-white/65">Paste TikTok/YouTube URL for single video download</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tkUrl}
                        onChange={(e) => setTkUrl(e.target.value)}
                        placeholder="Paste TikTok/YouTube URL"
                        className="flex-1 bg-black/30 border border-white/[0.08] rounded-lg px-2 py-2 text-[11px] text-white/90 outline-none placeholder:text-white/28"
                      />
                      <button
                        onClick={handleTkDownload}
                        disabled={!tkUrl.trim() || isDownloadingTk}
                        className="px-2 py-2 rounded-lg bg-violet-500/14 hover:bg-violet-500/26 text-violet-300 text-[10px] font-black uppercase tracking-wide disabled:opacity-30"
                      >
                        {isDownloadingTk ? `${tkProgress}%` : 'Download'}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-black/25 p-2 space-y-2">
                  <div className="text-[10px] text-white/65">Download full TikTok profile (batch)</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={profileUrl}
                      onChange={(e) => setProfileUrl(e.target.value)}
                      placeholder="Paste TikTok profile URL"
                      className="flex-1 bg-black/30 border border-white/[0.08] rounded-lg px-2 py-2 text-[11px] text-white/90 outline-none placeholder:text-white/28"
                    />
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={profileMaxItems}
                      onChange={(e) => setProfileMaxItems(Math.max(1, Math.min(500, Number(e.target.value) || 30)))}
                      className="w-20 bg-black/30 border border-white/[0.08] rounded-lg px-2 py-2 text-[11px] text-white/90 outline-none"
                      title="Max videos"
                    />
                    <button
                      onClick={fetchProfileInfo}
                      disabled={!profileUrl.trim() || profileInfoLoading}
                      className="px-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wide disabled:opacity-30"
                    >
                      {profileInfoLoading ? 'Checking...' : 'Check'}
                    </button>
                    <button
                      onClick={handleProfileDownload}
                      disabled={!profileUrl.trim() || isDownloadingProfile}
                      className="px-2 py-2 rounded-lg bg-cyan-500/14 hover:bg-cyan-500/26 text-cyan-300 text-[10px] font-black uppercase tracking-wide disabled:opacity-30"
                    >
                      {isDownloadingProfile ? `${profileProgress}%` : 'Download'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/70">
                    <span>{profileTitle ? `${profileTitle}` : 'Profile not checked yet'}</span>
                    <span>{profileVideoCount !== null ? `${profileVideoCount} videos` : ''}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <label className="flex items-center gap-1 text-white/75">
                      <input
                        type="radio"
                        checked={profileMode === 'all'}
                        onChange={() => setProfileMode('all')}
                      />
                      All
                    </label>
                    <label className="flex items-center gap-1 text-white/75">
                      <input
                        type="radio"
                        checked={profileMode === 'custom'}
                        onChange={() => setProfileMode('custom')}
                      />
                      Custom
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={profileMaxItems}
                      onChange={(e) => setProfileMaxItems(Math.max(1, Math.min(500, Number(e.target.value) || 30)))}
                      disabled={profileMode !== 'custom'}
                      className="w-20 bg-black/30 border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] text-white/90 outline-none disabled:opacity-40"
                      title="Custom video count"
                    />
                  </div>
                </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start rounded-xl border border-white/[0.08] bg-black/20 p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between min-h-[20px]">
                      <div className="text-[10px] font-semibold tracking-wide text-white/70">Reference Image</div>
                      {subjectImageFile && (
                        <button
                          onClick={() => {
                            setSubjectImageFile(null);
                            setRunImageUsed(null);
                            setZimageReferenceFile(null);
                            setPromotedInputFile(null);
                          }}
                          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-white/55 hover:text-white/80"
                          title="Clear reference image"
                        >
                          <X className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>
                    <UploadCard
                      label="Reference Image"
                      accept="image/*"
                      previewUrl={subjectPreview}
                      uploading={uploadingSubject}
                      onFile={(file) =>
                        uploadFile(
                          file,
                          (name) => {
                            setSubjectImageFile(name);
                            setSubjectImageNonce(Date.now());
                            setZimageReferenceFile(null);
                            setRunImageUsed(name);
                            setPromotedInputFile(name);
                          },
                          setUploadingSubject,
                        )
                      }
                    />
                    <div className="space-y-2 mt-3">
                      <FeddaButton
                        onClick={async () => {
                          const captured = await captureFrameAtSelectedSecond({ assignSubject: true });
                          if (captured) {
                            setSubjectImageNonce(Date.now());
                            setZimageReferenceFile(null);
                            setRunImageUsed(captured);
                            setPromotedInputFile(captured);
                          }
                        }}
                        disabled={!motionVideoFile || isCapturing}
                        variant="violet"
                        className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 disabled:opacity-35"
                      >
                        {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Capture Start Frame</span>
                      </FeddaButton>
                      <FeddaButton
                        onClick={generateImageFromSelectedStartPoint}
                        disabled={!subjectImageFile || isGeneratingFrameImage || isCapturing}
                        variant="violet"
                        className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 disabled:opacity-35"
                      >
                        {isGeneratingFrameImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>Generate with Z-Image</span>
                      </FeddaButton>
                      <FeddaButton
                        disabled={!canGenerate}
                        onClick={handleGenerate}
                        variant="violet"
                        className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 transition-all disabled:opacity-30"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        <span>Run</span>
                      </FeddaButton>
                      {isGenerating && (
                        <FeddaButton
                          onClick={async () => {
                            try {
                              await cancelExecution();
                              setIsGenerating(false);
                              setPendingPromptId(null);
                              toast('Generation cancelled', 'success');
                            } catch (e: any) {
                              toast(e?.message || 'Cancel failed', 'error');
                            }
                          }}
                          variant="ghost"
                          className="w-full py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.12em] border border-red-400/30 text-red-300 hover:bg-red-500/10"
                        >
                          <span>Cancel</span>
                        </FeddaButton>
                      )}
                      {runImageUsed && (
                        <div className="text-[10px] text-white/55 px-1 truncate">Run uses: {runImageUsed}</div>
                      )}
                      {promotedInputFile && (
                        <div className="text-[10px] text-emerald-300/80 px-1 truncate">Promoted to input: {promotedInputFile}</div>
                      )}
                      {needsPromotedZimage && (
                        <div className="text-[10px] text-amber-300/80 px-1">Run locked: promote Z-Image to input first.</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between min-h-[20px]">
                      <div className="text-[10px] font-semibold tracking-wide text-white/70">Latest Z-Image output</div>
                      {zimagePreviewUrl && (
                        <button
                          onClick={() => setZimagePreviewUrl(null)}
                          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-white/55 hover:text-white/80"
                          title="Clear latest Z-Image preview"
                        >
                          <X className="w-3 h-3" />
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-2">
                      {zimagePreviewUrl ? (
                        <img src={zimagePreviewUrl} alt="Latest Z-Image output" className="w-full h-[200px] object-contain rounded-lg bg-black/40" />
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-[10px] text-white/40 uppercase tracking-wider">No Z-Image output yet</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {!motionVideoFile && (
                      <UploadCard
                        label="Load Reference Video"
                        accept="video/*"
                        previewUrl={motionPreview}
                        uploading={uploadingMotion}
                        onFile={(file) => uploadFile(file, (name) => setMotionVideoFile(name), setUploadingMotion)}
                      />
                    )}
                {motionVideoFile && (
                  <div className="px-0 py-0 space-y-2">
                    <div className="flex items-center justify-between min-h-[20px]">
                      <div className="text-[10px] font-semibold text-white/75">Pick a start point from Reference Video</div>
                      <button
                        onClick={() => setMotionVideoFile(null)}
                        className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-white/55 hover:text-white/80"
                        title="Clear reference video"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/70">
                      <span>Start: {startSecond}</span>
                      <span>End: {endSecond}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-lg overflow-hidden border border-white/[0.08] bg-black/35 relative">
                        <video ref={startVideoRef} src={motionPreview || undefined} className="w-full h-40 object-contain bg-black" muted playsInline controls />
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-violet-400/90"
                          style={{ left: `${(startSecond / Math.max(1, secondMax)) * 100}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-cyan-400/90"
                          style={{ left: `${(endSecond / Math.max(1, secondMax)) * 100}%` }}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[9px] uppercase tracking-[0.14em] text-white/45">Start point</div>
                        <input
                          type="range"
                          min={0}
                          max={secondMax}
                          step={1}
                          value={startSecond}
                          onChange={(e) => {
                            const next = Math.min(Number(e.target.value), endSecond - 1);
                            setStartSecond(Math.max(0, next));
                          }}
                          className="w-full accent-violet-400"
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[9px] uppercase tracking-[0.14em] text-white/45">End point</div>
                        <input
                          type="range"
                          min={0}
                          max={secondMax}
                          step={1}
                          value={endSecond}
                          onChange={(e) => {
                            const next = Math.max(Number(e.target.value), startSecond + 1);
                            setEndSecond(Math.min(secondMax, next));
                          }}
                          className="w-full accent-cyan-400"
                        />
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-400/70 to-cyan-400/70"
                        style={{
                          marginLeft: `${(startSecond / Math.max(1, secondMax)) * 100}%`,
                          width: `${(Math.max(1, endSecond - startSecond) / Math.max(1, secondMax)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-white/45">Selected start point is used for frame capture.</div>
                  </div>
                )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b0f] p-3.5 space-y-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
                <LoraSelector
                  label="Z-Image LoRA (for selected start point image generation)"
                  value={loraName}
                  onChange={setLoraName}
                  strength={loraStrength}
                  onStrengthChange={setLoraStrength}
                  options={availableLoras}
                  accent="violet"
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/55">
                    <span>Denoise</span>
                    <span className="font-mono text-white/75">{Number(zimageDenoise).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.55}
                    max={0.95}
                    step={0.01}
                    value={zimageDenoise}
                    onChange={(e) => setZimageDenoise(Number(e.target.value))}
                    className="w-full accent-violet-400"
                  />
                </div>

              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white/70 transition-colors"
                >
                  Advanced
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                    <label className="text-[10px] text-white/35">Resolution Profile
                      <select
                        value={resolutionProfile}
                        onChange={(e) =>
                          setResolutionProfile(
                            e.target.value as 'square' | 'portrait' | 'landscape',
                          )
                        }
                        className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px]"
                      >
                        <option value="square">Square (512x512)</option>
                        <option value="portrait">Portrait (480x832)</option>
                        <option value="landscape">Landscape (832x480)</option>
                      </select>
                    </label>

                    <label className="text-[10px] text-white/35 block max-w-[220px]">
                      Length (sec)
                      <input
                        type="number"
                        value={videoLength}
                        min={1}
                        max={12}
                        onChange={(e) => setVideoLength(Math.max(1, Math.min(12, Number(e.target.value) || 5)))}
                        className="mt-1 w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-2 py-2 text-[11px] font-mono"
                      />
                    </label>
                    <p className="text-[10px] text-white/45">
                      Other run settings are locked to the original stable profile.
                    </p>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
