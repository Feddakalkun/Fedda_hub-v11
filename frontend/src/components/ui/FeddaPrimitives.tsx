import type { ButtonHTMLAttributes, ReactNode } from 'react';

type FeddaButtonVariant = 'ghost' | 'violet' | 'cyan' | 'emerald';

interface FeddaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: FeddaButtonVariant;
  children: ReactNode;
}

const variantClassMap: Record<FeddaButtonVariant, string> = {
  ghost: 'fedda-btn-ghost',
  violet: 'border border-violet-500/35 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25',
  cyan: 'fedda-btn-soft-cyan',
  emerald: 'fedda-btn-soft-emerald',
};

export const FeddaButton = ({
  variant = 'ghost',
  className = '',
  disabled,
  children,
  ...props
}: FeddaButtonProps) => {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`${variantClassMap[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`.trim()}
    >
      {children}
    </button>
  );
};

interface FeddaPanelProps {
  className?: string;
  children: ReactNode;
}

export const FeddaPanel = ({ className = '', children }: FeddaPanelProps) => {
  return <div className={`fedda-surface-panel ${className}`.trim()}>{children}</div>;
};

interface FeddaSectionTitleProps {
  children: ReactNode;
  className?: string;
}

export const FeddaSectionTitle = ({ children, className = '' }: FeddaSectionTitleProps) => {
  return <p className={`fedda-kicker ${className}`.trim()}>{children}</p>;
};
