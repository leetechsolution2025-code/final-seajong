import React, { useState } from 'react';

export interface InsightPoint {
  date_start: string;
  spend: string;
  impressions: string;
  reach: string;
  leads: string;
  clicks: string;
  unit?: string;
  platform?: string;
}

interface MarketingAreaChartProps {
  data: InsightPoint[];
  range: '7' | '14' | '30';
  onRangeChange: (r: '7' | '14' | '30') => void;
  campaignName?: string;
}

export const MarketingAreaChart: React.FC<MarketingAreaChartProps> = ({
  data,
  range,
  onRangeChange,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter based on range
  const numDays = parseInt(range, 10);
  const chartData = data.slice(-numDays);

  if (chartData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[220px]">
        <i className="bi bi-graph-up text-3xl mb-2 opacity-50" />
        <span className="text-xs font-semibold">Chưa có dữ liệu báo cáo</span>
      </div>
    );
  }

  // Calculate coordinates for SVG
  const values = chartData.map((d) => parseFloat(d.impressions) || 100);
  const minVal = 0;
  const maxVal = Math.max(...values, 1000) * 1.15;

  const width = 600;
  const height = 180;
  const paddingX = 25;
  const paddingY = 22;

  const getX = (idx: number) => {
    if (chartData.length <= 1) return width / 2;
    return paddingX + (idx / (chartData.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    return height - paddingY - ratio * (height - paddingY * 2);
  };

  // Build smooth cubic bezier path
  const points = chartData.map((d, i) => ({
    x: getX(i),
    y: getY(parseFloat(d.impressions) || 0),
    data: d,
    leftPct: (getX(i) / width) * 100,
    topPct: (getY(parseFloat(d.impressions) || 0) / height) * 100,
  }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    pathD += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  // Format date helper
  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Tooltip positioning logic (clamp left to stay within card)
  const isNearTop = activePoint ? activePoint.topPct < 45 : false;
  const tooltipLeftClamped = activePoint
    ? Math.max(16, Math.min(84, activePoint.leftPct))
    : 50;

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none">
      {/* Chart Canvas Area */}
      <div className="relative flex-1 min-h-[160px] w-full">
        {/* 1. Underlying SVG: only renders grid, area gradient & spline path */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="mktEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mktLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="mktGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#10b981" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#mktEmeraldGrad)" />

          {/* Spline Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#mktLineGrad)"
            strokeWidth="3"
            filter="url(#mktGlow)"
            strokeLinecap="round"
          />

          {/* Vertical dashed guideline when hovered */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={height - paddingY}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {/* 2. Interactive Columns for hover triggers */}
        <div
          className="absolute inset-0 flex"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {points.map((_, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoverIndex(idx)}
              className="flex-1 h-full cursor-pointer"
            />
          ))}
        </div>

        {/* 3. HTML Mark Icons: 100% PERFECTLY ROUND (Không bao giờ bị méo theo tỷ lệ khung hình) */}
        <div className="absolute inset-0 pointer-events-none">
          {points.map((pt, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <div
                key={idx}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-150"
                style={{
                  left: `${pt.leftPct}%`,
                  top: `${pt.topPct}%`,
                  width: isHovered ? 16 : 9,
                  height: isHovered ? 16 : 9,
                }}
              >
                <div
                  className={`w-full h-full rounded-full transition-all duration-200 ${
                    isHovered
                      ? 'bg-emerald-500 ring-4 ring-emerald-500/25 shadow-md scale-110'
                      : 'bg-white border-2 border-emerald-500 shadow-2xs'
                  }`}
                  style={{ aspectRatio: '1 / 1' }}
                />
              </div>
            );
          })}
        </div>

        {/* 4. REDESIGNED TOOLTIP: Chuẩn giao diện sáng, sang trọng của Seajong ERP */}
        {activePoint && (
          <div
            className={`absolute z-30 pointer-events-none transition-all duration-150 ease-out ${
              isNearTop ? 'top-auto' : ''
            }`}
            style={{
              left: `${tooltipLeftClamped}%`,
              top: isNearTop
                ? `calc(${activePoint.topPct}% + 18px)`
                : `calc(${activePoint.topPct}% - 14px)`,
              transform: isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              minWidth: 200,
            }}
          >
            {/* Tooltip Card */}
            <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3 text-slate-800">
              {/* Arrow */}
              <div
                className={`absolute w-2.5 h-2.5 bg-white border-slate-200 ${
                  isNearTop
                    ? '-top-1.5 left-1/2 -translate-x-1/2 rotate-45 border-t border-l'
                    : '-bottom-1.5 left-1/2 -translate-x-1/2 rotate-45 border-b border-r'
                }`}
              />

              {/* Header: Date + Leads Badge */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                  <i className="bi bi-calendar3 text-slate-400" />
                  {formatDateDisplay(activePoint.data.date_start)}
                </span>
                <span className="text-[11px] font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                  +{parseInt(activePoint.data.leads || '0')} Leads
                </span>
              </div>

              {/* Body: 2x2 Grid of detailed metrics */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-0.5">
                    <i className="bi bi-eye-fill text-blue-500" />
                    Hiển thị
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {parseInt(activePoint.data.impressions || '0').toLocaleString('vi-VN')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-0.5">
                    <i className="bi bi-cursor-fill text-indigo-500" />
                    Clicks
                  </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {parseInt(activePoint.data.clicks || '0').toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="col-span-2 pt-1 border-t border-slate-100/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                    <i className="bi bi-wallet2 text-amber-500" />
                    Chi phí ngày:
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                    {Math.round(parseFloat(activePoint.data.spend || '0')).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Labels & Range filter buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
        <div className="flex items-center gap-1.5">
          {(['7', '14', '30'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer ${
                range === r
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
              }`}
            >
              {r} ngày
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 font-medium">
          Dữ liệu: <span className="font-bold text-slate-700">{chartData.length} mốc ngày</span>
        </div>
      </div>
    </div>
  );
};
