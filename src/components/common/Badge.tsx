import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  hasDot?: boolean;
  pulseDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  hasDot = false,
  pulseDot = false,
  className = '',
  style,
}) => {
  const dotColorMap = {
    brand: 'var(--brand-400)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
    neutral: 'var(--text-muted)',
  };

  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {hasDot && (
        <span
          className={`badge-dot ${pulseDot ? 'pulse' : ''}`}
          style={{ backgroundColor: dotColorMap[variant] }}
        />
      )}
      {children}
    </span>
  );
};
