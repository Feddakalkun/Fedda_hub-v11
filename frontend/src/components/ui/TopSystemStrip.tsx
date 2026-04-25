import { useEffect, useMemo, useState } from 'react';
import { Activity, BrainCircuit, DownloadCloud, KeyRound, Loader2, Play, Trash2, Zap } from 'lucide-react';
import { useComfyStatus } from '../../hooks/useComfyStatus';
import { useOllamaStatus } from '../../hooks/useOllamaStatus';
import { useComfyExecution } from '../../contexts/ComfyExecutionContext';
import { BACKEND_API, COMFY_API } from '../../config/api';
import { TEXT_MODELS, VISION_MODELS } from '../../config/ollamaModels';

type ModelListResponse = {
  success?: boolean;
  ollama_online?: boolean;
  models?: string[];
  text_models?: string[];
  vision_models?: string[];
  selected_text_model?: string | null;
  selected_vision_model?: string | null;
};

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

  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaTextModels, setOllamaTextModels] = useState<string[]>([]);
  const [ollamaVisionModels, setOllamaVisionModels] = useState<string[]>([]);
  const [selectedTextModel, setSelectedTextModel] = useState('');
  const [selectedVisionModel, setSelectedVisionModel] = useState('');
  const [savingModelSelection, setSavingModelSelection] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');

  const [pullModel, setPullModel] = useState('');
  const [pullingModel, setPullingModel] = useState(false);
  const [pullStatus, setPullStatus] = useState('');

  const fetchOllamaModels = async () => {
    setModelsLoading(true);
    try {
      const r = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.OLLAMA_MODELS}`, { cache: 'no-store' });
      const data: ModelListResponse = await r.json();
      if (!r.ok || !data?.success) {
        setModelsError('Ollama list unavailable');
        setOllamaModels([]);
        setOllamaTextModels([]);
        setOllamaVisionModels([]);
        return;
      }
      const models = Array.isArray(data.models) ? data.models : [];
      const textModels = Array.isArray(data.text_models) ? data.text_models : [];
      const visionModels = Array.isArray(data.vision_models) ? data.vision_models : [];
      setModelsError('');
      setOllamaModels(models);
      setOllamaTextModels(textModels);
      setOllamaVisionModels(visionModels);
      setSelectedTextModel(String(data.selected_text_model || ''));
      setSelectedVisionModel(String(data.selected_vision_model || ''));
    } catch {
      setModelsError('Ollama list unavailable');
      setOllamaModels([]);
      setOllamaTextModels([]);
      setOllamaVisionModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      try {
        const r = await fetch('/api/hardware/stats', { cache: 'no-store' });
        if (r.ok && mounted) setGpuStats(await r.json());
      } catch {}

      if (comfy.isConnected) {
        try {
          const r = await fetch(`${COMFY_API.BASE_URL}/system_stats`, { cache: 'no-store' });
          if (r.ok && mounted) setComfyStats(await r.json());
        } catch {}
      } else if (mounted) {
        setComfyStats(null);
      }
      await fetchOllamaModels();
    };

    void update();
    const id = setInterval(() => void update(), 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
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
        if (!mounted) return;
        setHfConfigured(Boolean(hfData?.configured));
        setCivitaiConfigured(Boolean(civitaiData?.configured));
      } catch {
        if (!mounted) return;
        setHfConfigured(false);
        setCivitaiConfigured(false);
      } finally {
        if (!mounted) return;
        setHfLoading(false);
        setCivitaiLoading(false);
      }
    };
    void loadTokenStatus();
    return () => {
      mounted = false;
    };
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

  const systemRam = useMemo(() => {
    const ram = gpuStats?.system?.ram;
    if (!ram || typeof ram !== 'object') return null;
    if (typeof ram.used_gb !== 'number' || typeof ram.total_gb !== 'number') return null;
    return {
      used: ram.used_gb as number,
      total: ram.total_gb as number,
      pct: Number(ram.percentage ?? 0),
    };
  }, [gpuStats]);

  const installedSet = useMemo(() => new Set(ollamaModels.map((m) => m.toLowerCase())), [ollamaModels]);
  const recommendedModels = useMemo(() => {
    const merged = [...TEXT_MODELS.map((m) => m.id), ...VISION_MODELS.map((m) => m.id)];
    return Array.from(new Set(merged));
  }, []);
  const missingRecommended = useMemo(
    () => recommendedModels.filter((m) => !installedSet.has(m.toLowerCase())),
    [recommendedModels, installedSet],
  );

  useEffect(() => {
    if (!pullModel) {
      setPullModel((missingRecommended[0] || recommendedModels[0] || '').trim());
    }
  }, [pullModel, missingRecommended, recommendedModels]);

  const persistModelSelection = async (nextText: string, nextVision: string) => {
    if (savingModelSelection) return;
    setSavingModelSelection(true);
    try {
      await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.OLLAMA_MODEL_SELECTION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_model: nextText || null,
          vision_model: nextVision || null,
        }),
      });
    } finally {
      setSavingModelSelection(false);
    }
  };

  const handlePullModel = async () => {
    if (!pullModel || pullingModel) return;
    setPullingModel(true);
    setPullStatus('Starting...');
    try {
      const response = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.OLLAMA_PULL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pullModel }),
      });
      if (!response.ok) throw new Error('Pull failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const text = line.trim();
            if (!text) continue;
            try {
              const obj = JSON.parse(text);
              if (obj.status) setPullStatus(String(obj.status));
              if (obj.error) setPullStatus(`Error: ${obj.error}`);
            } catch {}
          }
        }
      }
      setPullStatus('Done');
      await fetchOllamaModels();
    } catch {
      setPullStatus('Pull failed');
    } finally {
      setPullingModel(false);
    }
  };

  const handlePurge = async () => {
    if (purging) return;
    if (!confirm('Purge VRAM? This stops active generation and unloads all models.')) return;
    setPurging(true);
    try {
      await fetch(`${COMFY_API.BASE_URL}/free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unload_models: true, free_memory: true }),
      });
    } finally {
      setPurging(false);
    }
  };

  const comfyLabel = comfy.isLoading ? 'Checking...' : comfy.isConnected ? 'Comfy' : 'Comfy Off';
  const ollamaLabel = ollama.isLoading ? 'Checking...' : ollama.isConnected ? 'Ollama' : 'Ollama Off';

  const handleHfToken = async () => {
    if (hfSaving) return;
    const nextToken = window.prompt(
      hfConfigured ? 'Paste a new Hugging Face token, blank = remove.' : 'Paste your Hugging Face token (hf_...).',
      '',
    );
    if (nextToken === null) return;
    const trimmed = nextToken.trim();
    if (!trimmed && hfConfigured && !window.confirm('Remove saved Hugging Face token?')) return;
    setHfSaving(true);
    try {
      const r = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.SETTINGS_HF_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      });
      if (!r.ok) throw new Error('save failed');
      const data = await r.json();
      setHfConfigured(Boolean(data?.configured));
    } catch {
      window.alert('Could not save Hugging Face token.');
    } finally {
      setHfSaving(false);
    }
  };

  const handleCivitaiKey = async () => {
    if (civitaiSaving) return;
    const nextKey = window.prompt(
      civitaiConfigured ? 'Paste a new Civitai key, blank = remove.' : 'Paste your Civitai API key.',
      '',
    );
    if (nextKey === null) return;
    const trimmed = nextKey.trim();
    if (!trimmed && civitaiConfigured && !window.confirm('Remove saved Civitai key?')) return;
    setCivitaiSaving(true);
    try {
      const r = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.SETTINGS_CIVITAI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: trimmed }),
      });
      if (!r.ok) throw new Error('save failed');
      const data = await r.json();
      setCivitaiConfigured(Boolean(data?.configured));
    } catch {
      window.alert('Could not save Civitai API key.');
    } finally {
      setCivitaiSaving(false);
    }
  };

  return (
    <div className="hidden xl:flex items-center gap-2 overflow-x-auto max-w-full pr-1">
      {state === 'executing' && (
        <div className="h-8 px-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center gap-2.5 min-w-[250px]">
          {isDownloaderNode ? (
            <DownloadCloud className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          ) : (
            <Play className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          )}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 w-28 truncate" title={currentNodeName}>
                {currentNodeName || 'Running'}
              </span>
              <span className="text-[9px] font-mono text-cyan-400/80">{progress}%</span>
            </div>
            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full bg-cyan-700/50 transition-all duration-300" style={{ width: `${overallProgress}%` }} />
              <div className="absolute top-0 left-0 h-full bg-cyan-400 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 flex items-center gap-2 text-xs min-w-[230px]">
        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        {gpu ? (
          <>
            <span className="text-slate-200 font-medium truncate max-w-[90px]" title={gpu.name}>{gpu.name}</span>
            <span className="text-slate-400 font-mono text-[11px]">{gpu.usedGiB}/{gpu.totalGiB}G</span>
            {systemRam ? (
              <span className="text-slate-400 font-mono text-[11px]">RAM {systemRam.used.toFixed(0)}/{systemRam.total.toFixed(0)}G</span>
            ) : (
              <span className="text-slate-500 text-[11px]">RAM ...</span>
            )}
          </>
        ) : (
          <span className="text-slate-500 text-[11px]">GPU loading…</span>
        )}
      </div>

      <div className="h-8 px-2 rounded-lg border border-white/10 bg-white/5 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">LLM</span>
        <select
          value={selectedTextModel}
          onChange={(e) => {
            const next = e.target.value;
            setSelectedTextModel(next);
            void persistModelSelection(next, selectedVisionModel);
          }}
          disabled={!ollama.isConnected || savingModelSelection || (ollamaTextModels.length === 0 && ollamaModels.length === 0)}
          className="h-6 min-w-[140px] max-w-[180px] bg-black/40 border border-white/10 rounded px-2 text-[11px] text-slate-200 disabled:opacity-50"
          title="Text model for prompt operations"
        >
          <option value="">Auto</option>
          {(ollamaTextModels.length ? ollamaTextModels : ollamaModels).map((model) => (
            <option key={`text-${model}`} value={model}>{model}</option>
          ))}
        </select>
      </div>

      <div className="h-8 px-2 rounded-lg border border-white/10 bg-white/5 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">Vision</span>
        <select
          value={selectedVisionModel}
          onChange={(e) => {
            const next = e.target.value;
            setSelectedVisionModel(next);
            void persistModelSelection(selectedTextModel, next);
          }}
          disabled={!ollama.isConnected || savingModelSelection || (ollamaVisionModels.length === 0 && ollamaModels.length === 0)}
          className="h-6 min-w-[140px] max-w-[180px] bg-black/40 border border-white/10 rounded px-2 text-[11px] text-slate-200 disabled:opacity-50"
          title="Vision model for captioning"
        >
          <option value="">Auto</option>
          {(ollamaVisionModels.length ? ollamaVisionModels : ollamaModels).map((model) => (
            <option key={`vision-${model}`} value={model}>{model}</option>
          ))}
        </select>
      </div>

      <div className="h-8 px-2 rounded-lg border border-white/10 bg-white/5 flex items-center gap-2">
        <select
          value={pullModel}
          onChange={(e) => setPullModel(e.target.value)}
          className="h-6 min-w-[150px] max-w-[220px] bg-black/40 border border-white/10 rounded px-2 text-[11px] text-slate-200"
          title={modelsError || pullStatus || 'Install recommended Ollama model'}
        >
          {missingRecommended.length > 0 ? (
            missingRecommended.map((model) => <option key={`missing-${model}`} value={model}>{model}</option>)
          ) : (
            recommendedModels.map((model) => <option key={`all-${model}`} value={model}>{model}</option>)
          )}
        </select>
        <button
          onClick={handlePullModel}
          disabled={!pullModel || pullingModel}
          className="h-6 px-2 rounded border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[10px] font-semibold disabled:opacity-40"
          title={modelsLoading ? 'Loading model list...' : pullStatus || 'Download selected Ollama model'}
        >
          {pullingModel ? 'Pulling...' : 'Install'}
        </button>
      </div>

      <button
        onClick={handlePurge}
        disabled={purging || !comfy.isConnected}
        title="Purge VRAM"
        className="h-8 px-3 rounded-lg border border-red-500/25 bg-red-500/8 hover:bg-red-500/18 text-red-300 text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
      >
        {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        Purge
      </button>

      <button
        onClick={handleCivitaiKey}
        disabled={civitaiSaving}
        title="Save Civitai API key"
        className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 ${
          civitaiConfigured
            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/18'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/18'
        }`}
      >
        {(civitaiSaving || civitaiLoading) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
        Civitai
      </button>

      <button
        onClick={handleHfToken}
        disabled={hfSaving}
        title="Save Hugging Face token"
        className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 ${
          hfConfigured
            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/18'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/18'
        }`}
      >
        {(hfSaving || hfLoading) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
        HF
      </button>

      <div className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
        comfy.isConnected
          ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300'
          : 'border-white/10 bg-white/5 text-slate-500'
      }`}>
        {comfy.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        {comfyLabel}
      </div>

      <div className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
        ollama.isConnected
          ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300'
          : 'border-white/10 bg-white/5 text-slate-500'
      }`}>
        {ollama.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
        {ollamaLabel}
      </div>
    </div>
  );
};

