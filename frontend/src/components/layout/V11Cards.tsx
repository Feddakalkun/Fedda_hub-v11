import { useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StudioCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  image?: string;
  video?: string;
  hideContent?: boolean;
  onClick: () => void;
}

export const StudioCard = ({ title, description, Icon, image, video, hideContent, onClick }: StudioCardProps) => {
  const [videoEnabled, setVideoEnabled] = useState(Boolean(video));
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleEnter = () => {
    if (videoEnabled && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`v11-studio-card v11-hub-card text-left ${hideContent ? 'v11-card-minimal' : ''}`}
    >
      {image ? <div className="v11-card-bg" style={{ backgroundImage: `url(${image})` }} /> : null}
      {video && videoEnabled ? (
        <video
          ref={videoRef}
          className="v11-card-video"
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoEnabled(false)}
        >
          <source src={video} type="video/mp4" />
        </video>
      ) : null}
      <div className="v11-card-overlay" />
      {!hideContent ? (
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="text-sm text-slate-300 mt-1">{description}</p>
          </div>
          <div className="v11-icon-wrap">
            <Icon className="w-4 h-4" />
          </div>
        </div>
      ) : null}
    </button>
  );
};

interface ToolCardProps {
  title: string;
  description: string;
  image?: string;
  video?: string;
  hideContent?: boolean;
  onClick: () => void;
}

export const ToolCard = ({ title, description, image, video, hideContent, onClick }: ToolCardProps) => {
  const [videoEnabled, setVideoEnabled] = useState(Boolean(video));
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleEnter = () => {
    if (videoEnabled && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`v11-tool-card v11-square-card text-left ${hideContent ? 'v11-card-minimal' : ''}`}
    >
      {image ? <div className="v11-card-bg" style={{ backgroundImage: `url(${image})` }} /> : null}
      {video && videoEnabled ? (
        <video
          ref={videoRef}
          className="v11-card-video"
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoEnabled(false)}
        >
          <source src={video} type="video/mp4" />
        </video>
      ) : null}
      <div className="v11-card-overlay" />
      {!hideContent ? (
        <div className="relative z-10">
          <p className="text-[15px] font-semibold text-white">{title}</p>
          <p className="text-xs text-slate-300 mt-1">{description}</p>
        </div>
      ) : null}
    </button>
  );
};

interface SectionGroupProps {
  title: string;
  children: ReactNode;
}

export const SectionGroup = ({ title, children }: SectionGroupProps) => {
  return (
    <section className="v11-section-panel">
      <p className="v11-kicker mb-3">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>
    </section>
  );
};
