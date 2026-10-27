import React, { ReactNode } from 'react';

export interface KPICardProps {
  label: string;
  value: number | string | ReactNode;
  icon: string;        // Bootstrap icon class vd: "bi-people-fill"
  accent?: string;     // Hex color vd: "#2563eb"
  prefix?: ReactNode;  // Tiền tố vd: "+"
  suffix?: ReactNode;  // Hậu tố vd: "%"
  colClass?: string;   // Responsive col vd: "col-6 col-lg-3"
  subtitle?: string;   // Phụ đề vd: tổng giá trị
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  badge?: ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon,
  accent = '#10b981',
  prefix = '',
  suffix = '',
  colClass = '',
  subtitle,
  className = '',
  style,
  onClick,
  badge,
}) => {
  return (
    <div
      onClick={onClick}
      className={`app-card bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      } ${colClass} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: 0,
        ...style,
      }}
    >
      {/* Icon trong hộp bo góc màu nhạt */}
      <div
        className="rounded-lg flex items-center justify-center shrink-0"
        style={{
          width: '42px',
          height: '42px',
          backgroundColor: `${accent}16`,
          border: `1px solid ${accent}30`,
        }}
      >
        <i
          className={`bi ${icon}`}
          style={{ color: accent, fontSize: '1.25rem', lineHeight: 1 }}
        />
      </div>

      {/* Nội dung thống kê */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p
            className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate mb-0"
            title={typeof label === 'string' ? label : undefined}
          >
            {label}
          </p>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        <p
          className="text-lg font-bold text-slate-900 truncate mb-0 leading-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          {prefix}
          {value}
          {suffix}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5 mb-0">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default KPICard;
