import { useEffect, useMemo, useState } from 'react';
import { Activity, BrainCircuit, Loader2, Trash2, Zap, DownloadCloud, Play, KeyRound } from 'lucide-react';
import { useComfyStatus } from '../../hooks/useComfyStatus';
import { useOllamaStatus } from '../../hooks/useOllamaStatus';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { BACKEND_API, COMFY_API } from '../../config/api';

export const TopSystemStrip = () => {
  const comfy = useComfyStatus(3000);
  const ollama = useOllamaStatus();
  const { state, currentNodeName, progress, overallProgress, isDownloaderNode } = useComfyExecution();
  
  const [comfyStats, setComfyStats] = useState<any>(null);
  const [gpuStats, setGpuStats] = useState<any>(null);
  const [purging, setPurging] = useState(false);
  const [hfConfigured, setHfConfigured] = useState(false);
  const [hfLoading, setHfLoading] = useState(true);
  const [hfSaving, setHfSaving] = useState(false);
  const [civitaiConfigured, setCivitaiConfigured] = useState(false);
  const [civitaiLoading, setCivitaiLoading] = useState(true);
  const [civitaiSaving, setCivitaiSaving] = useState(false);

  // Poll hardware + comfy system stats
  useEffect(() => {
    let mounted = true;

    const update = async () => {
      // GPU stats from our backend
      try {
        const r = await fetch('/api/hardware/stats', { cache: 'no-store' });
        if (r.ok && mounted) setGpuStats(await r.json());
      } catch {}

      // ComfyUI VRAM stats — only when online
      if (comfy.isConnected) {
        try {
          const r = await fetch(`${COMFY_API.BASE_URL}/system_stats`, { cache: 'no-store' });
          if (r.ok && mounted) setComfyStats(await r.json());
        } catch {}
      } else {
        if (mounted) setComfyStats(null);
      }
    };

    update();
    const id = setInterval(update, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, [comfy.isConnected]);

  useEffect(() => {
    let mounted = true;

    const loadTokenStatus = async () => {
      try {
        const [hfResp, civitaiResp] = await Promise.all([
          fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.SETTINGS_HF_TOKEN_STATUS}`, { cache: 'no-store' }),
          fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.SETTINGS_CIVITAI_KEY_STATUS}`, { cache: 'no-store' }),
        ]);
        const [hfData, civitaiData] = await Promise.all([hfResp.json(), civitaiResp.json()]);
        if (mounted) {
          setHfConfigured(!!hfData.configured);
          setCivitaiConfigured(!!civitaiData.configured);
        }
      } catch {
        if (mounted) {
          setHfConfigured(false);
          setCivitaiConfigured(false);
        }
      } finally {
        if (mounted) {
          setHfLoading(false);
          setCivitaiLoading(false);
        }
      }
    };

    loadTokenStatus();
    return () => { mounted = false; };
  }, []);

  const gpu = useMemo(() => {
    if (!comfyStats?.devices?.length) return null;
    const d = comfyStats.devices[0];
    const total = Number(d.vram_total || 0);
    const free = Number(d.vram_free || 0);
    const used = Math.max(0, total - free);
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    return {
      name: String(d.name || '').replace('NVIDIA GeForce ', ''),
      usedGiB: (used / 1024 ** 3).toFixed(1),
      totalGiB: (total / 1024 ** 3).toFixed(1),
      pct,
      temp: gpuStats?.gpu?.temperature ?? null,
    };
  }, [comfyStats, gpuStats]);

  const handlePurge = async () => {
    if (purging) return;
    if (!confirm('Purge VRAM? This stops active generation and unloads all models.')) return;
    setPurging(true);
    try {
      await fetch(`${COMFY_API.BASE_URL}/free`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: true, free_memory: true }),
      });
    } finally {
      setPurging(false);
    }
  };

  const comfyLabel = comfy.isLoading
    ? 'Checking...'
    : comfy.isConnected ? 'ComfyUI Online' : 'ComfyUI Offline';

  const ollamaLabel = ollama.isLoading
    ? 'Checking...'
    : ollama.isConnected ? 'Ollama Online' : 'Ollama Offline';

  const handleHfToken = async () => {
    if (hfSaving) return;
    const nextToken = window.prompt(
      hfConfigured
        ? 'Paste a new Hugging Face token to replace the current one. Leave blank to remove it.'
        : 'Paste your Hugging Face token (starts with hf_). It will be auto-applied to downloader nodes.',
      ''
    );

    if (nextToken === null) return;

    const trimmed = nextToken.trim();
    if (!trimmed && hfConfigured && !window.confirm('Remove the saved Hugging Face token?')) {
      return;
    }

    setHfSaving(true);
    try {
      const r = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.SETTINGS_HF_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      });
      if (!r.ok) throw new Error('Failed to save token');
      const data = await r.json();
      setHfConfigured(!!data.configured);
    } catch {
      window.alert('Could not save Hugging Face token.');
    } finally {
      setHfSaving(false);
    }
  };

  const handleCivitaiKey = async () => {
    if (civitaiSaving) return;
    const nextKey = window.prompt(
      civitaiConfigured
        ? 'Paste a new Civitai API key to replace the current one. Leave blank to remove it.'
        : 'Paste your Civitai API key. It will be auto-applied to Civitai downloads.',
      ''
    );

    if (nextKey === null) return;

    const trimmed = nextKey.trim();
    if (!trimmed && civitaiConfigured && !window.confirm('Remove the saved Civitai API key?')) {
      return;
    }

    setCivitaiSaving(true);
    try {
      const r = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.SETTINGS_CIVITAI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: trimmed }),
      });
      if (!r.ok) throw new Error('Failed to save Civitai key');
      const data = await r.json();
      setCivitaiConfigured(!!data.configured);
    } catch {
      window.alert('Could not save Civitai API key.');
    } finally {
      setCivitaiSaving(false);
    }
  };

  return (
    <div className="hidden xl:flex items-center gap-2">

      {/* Execution Progress Bar */}
      {state === 'executing' && (
        <div className="h-8 px-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center gap-2.5 min-w-[280px]">
           {isDownloaderNode ? (
             <DownloadCloud className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
           ) : (
             <Play className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
           )}
           
           <div className="flex-1 flex flex-col justify-center">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 w-32 truncate" title={currentNodeName}>
                 {currentNodeName || 'Running...'}
               </span>
               <span className="text-[9px] font-mono text-cyan-400/80">
                 {progress}%
               </span>
             </div>
             
             {/* Progress bars (Dual: Node Progress vs Overall Progress) */}
             <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden relative">
                {/* Overall workflow progress (Background low opacity) */}
                <div 
                   className="absolute top-0 left-0 h-full bg-cyan-700/50 transition-all duration-300"
                   style={{ width: `${overallProgress}%` }}
                />
                {/* Current Node Progress (Foreground bright) */}
                <div 
                   className="absolute top-0 left-0 h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                   style={{ width: `${progress}%` }}
                />
             </div>
           </div>
        </div>
      )}

      {/* GPU VRAM pill */}
      <div className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 flex items-center gap-2 text-xs">
        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        {gpu ? (
          <>
            <span className="text-slate-200 font-medium">{gpu.name}</span>
            {gpu.temp !== null && (
              <span className={`font-semibold ${gpu.temp > 80 ? 'text-red-400' : gpu.temp > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {gpu.temp}°C
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-14 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${gpu.pct}%`,
                    background: gpu.pct > 90
                      ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                      : gpu.pct > 75
                        ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                        : 'linear-gradient(90deg,#34d399,#10b981)',
                  }}
                />
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{gpu.usedGiB}/{gpu.totalGiB}GB</span>
            </div>
          </>
        ) : (
          <span className="text-slate-500 text-[11px]">GPU loading…</span>
        )}
      </div>

      {/* Purge VRAM button */}
      <button
        id="purge-vram-btn"
        onClick={handlePurge}
        disabled={purging || !comfy.isConnected}
        title="Purge VRAM — unload all models"
        className="h-8 px-3 rounded-lg border border-red-500/25 bg-red-500/8 hover:bg-red-500/18 text-red-300 text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
      >
        {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        {purging ? 'Purging' : 'Purge VRAM'}
      </button>

      <button
        onClick={handleCivitaiKey}
        disabled={civitaiSaving}
        title="Save Civitai API key for Civitai model downloads"
        className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 ${
          civitaiConfigured
            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/18'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/18'
        }`}
      >
        {(civitaiSaving || civitaiLoading) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
        {civitaiSaving ? 'Saving Key' : civitaiConfigured ? 'Civitai Key Set' : 'Civitai Key Missing'}
      </button>

      <button
        onClick={handleHfToken}
        disabled={hfSaving}
        title="Save Hugging Face token for gated model downloads"
        className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 ${
          hfConfigured
            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/18'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/18'
        }`}
      >
        {(hfSaving || hfLoading) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
        {hfSaving ? 'Saving Token' : hfConfigured ? 'HF Token Set' : 'HF Token Missing'}
      </button>

      {/* ComfyUI status */}
      <div className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
        comfy.isConnected
          ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300'
          : 'border-white/10 bg-white/5 text-slate-500'
      }`}>
        {comfy.isLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Activity className="w-3.5 h-3.5" />
        }
        {comfyLabel}
      </div>

      {/* Ollama status */}
      <div className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
        ollama.isConnected
          ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300'
          : 'border-white/10 bg-white/5 text-slate-500'
      }`}>
        {ollama.isLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <BrainCircuit className="w-3.5 h-3.5" />
        }
        {ollamaLabel}
      </div>
    </div>
  );
};
