import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { loadStoredMedia, triggerMediaDownload, type MediaItem } from '../utils/mediaStore';

export const VideosPage = () => {
  const [items, setItems] = useState<MediaItem[]>([]);

  const refresh = () => setItems(loadStoredMedia());

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 2500);
    const onFocus = () => refresh();
    const onStorage = () => refresh();
    const onGallery = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    window.addEventListener('fedda:gallery-updated', onGallery as EventListener);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('fedda:gallery-updated', onGallery as EventListener);
    };
  }, []);

  const videos = useMemo(() => items.filter((i) => i.kind === 'video'), [items]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-white">Videos</h2>
            <span className="text-[11px] text-slate-400">{videos.length} videos</span>
          </div>
          <button
            onClick={refresh}
            className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium fedda-btn-ghost"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="h-[60vh] rounded-2xl border border-white/10 bg-black/30 flex items-center justify-center text-slate-500">
            No generated videos yet.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {videos.map((item, idx) => (
              <div key={`${item.url}-${idx}`} className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                <div className="aspect-video bg-black">
                  <video src={item.url} className="w-full h-full object-cover" controls playsInline />
                </div>
                <div className="p-2 space-y-2">
                  <div className="text-[10px] text-slate-500 truncate">{item.source}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                      className="px-2 py-1 rounded-lg border border-white/10 text-[11px] text-slate-200 hover:bg-white/5 inline-flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </button>
                    <button
                      onClick={() => triggerMediaDownload(item.url, `fedda-video-${idx + 1}.mp4`)}
                      className="px-2 py-1 rounded-lg border border-cyan-400/30 text-[11px] text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 inline-flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
