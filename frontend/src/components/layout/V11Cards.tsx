import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StudioCardProps {
  title: string;
  description: string;
  Icon: LucideIcon;
  image?: string;
  onClick: () => void;
}

export const StudioCard = ({ title, description, Icon, image, onClick }: StudioCardProps) => {
  return (
    <button onClick={onClick} className="v11-studio-card text-left">
      {image ? <div className="v11-card-bg" style={{ backgroundImage: `url(${image})` }} /> : null}
      <div className="v11-card-overlay" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-300 mt-1">{description}</p>
        </div>
        <div className="v11-icon-wrap">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
};

interface ToolCardProps {
  title: string;
  description: string;
  image?: string;
  onClick: () => void;
}

export const ToolCard = ({ title, description, image, onClick }: ToolCardProps) => {
  return (
    <button onClick={onClick} className="v11-tool-card text-left">
      {image ? <div className="v11-card-bg" style={{ backgroundImage: `url(${image})` }} /> : null}
      <div className="v11-card-overlay" />
      <div className="relative z-10">
        <p className="text-[15px] font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-300 mt-1">{description}</p>
      </div>
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
