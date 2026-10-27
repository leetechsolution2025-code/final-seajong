import React, { useState, useEffect } from 'react';

export interface PageHeaderProps {
  /** Tên phòng ban / tiêu đề trang */
  title: string;
  /** Mô tả ngắn */
  description?: string;
  /** Icon Bootstrap (vd: "bi-shield-lock", "bi-people", "bi-building") */
  icon?: string;
  /** Màu accent cho icon box: "rose" | "indigo" | "emerald" | "amber" | "blue" | "violet" | "cyan" */
  color?: 'rose' | 'indigo' | 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan';
  /** Badge hiển thị cạnh tiêu đề (VD: "SECURITY", "FINANCE") */
  badge?: string;
  /** Không cho phép nút bấm bên trong PageTitle theo AGENTS.md */
  showBackButton?: boolean;
  backUrl?: string;
  children?: React.ReactNode;
}

const WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  rose: { bg: 'ph-icon-box-rose', icon: 'ph-icon-rose' },
  indigo: { bg: 'ph-icon-box-indigo', icon: 'ph-icon-indigo' },
  emerald: { bg: 'ph-icon-box-emerald', icon: 'ph-icon-emerald' },
  amber: { bg: 'ph-icon-box-amber', icon: 'ph-icon-amber' },
  blue: { bg: 'ph-icon-box-blue', icon: 'ph-icon-blue' },
  violet: { bg: 'ph-icon-box-violet', icon: 'ph-icon-violet' },
  cyan: { bg: 'ph-icon-box-cyan', icon: 'ph-icon-cyan' },
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon = 'bi-grid',
  color = 'indigo',
  badge,
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${WEEKDAYS[now.getDay()]}, ngày ${day} tháng ${month} năm ${year}`;

  const colors = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <div className="page-header-bar select-none">
      {/* ── LEFT: Icon box + Tên phòng ban + mô tả (TUYỆT ĐỐI KHÔNG CÓ NÚT BẤM) ── */}
      <div className="page-header-left">
        {/* Icon box với hiệu ứng màu chuẩn client-seajong */}
        <div className={`ph-icon-box ${colors.bg}`}>
          <i className={`bi ${icon} ${colors.icon}`} />
        </div>

        {/* Text */}
        <div className="ph-text">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-header-title">{title}</h1>
            {badge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="page-header-desc">{description}</p>}
        </div>
      </div>

      {/* ── RIGHT: Chỉ hiển thị đồng hồ điện tử thời gian thực (TUYỆT ĐỐI KHÔNG CÓ NÚT BẤM) ── */}
      <div className="page-header-right">
        <div className="flex flex-col text-right select-none pl-2 border-l border-slate-300/60 hidden sm:flex">
          <span className="page-header-clock font-mono">{timeStr}</span>
          <span className="page-header-date">{dateStr}</span>
        </div>
      </div>
    </div>
  );
};

// Alias export PageTitle
export const PageTitle = PageHeader;
export default PageHeader;
