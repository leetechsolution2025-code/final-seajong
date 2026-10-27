import React, { ReactNode, useState, useEffect } from 'react';
import { PageHeader, PageHeaderProps } from './PageHeader';
import { DynamicTicker } from './DynamicTicker';

export interface SplitLayoutPageProps {
  title: string;
  description?: string;
  icon?: string;
  color?: 'rose' | 'indigo' | 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan';
  badge?: string;
  /** Số cột trái (1-11), mặc định 4. Cột phải = 12 - leftCols */
  leftCols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  leftTopContent?: ReactNode;
  leftContent?: ReactNode;
  rightTopContent?: ReactNode;
  rightContent?: ReactNode;
  /** Tab hiển thị trên giao diện mobile ("left" hoặc "right") */
  mobileActiveTab?: 'left' | 'right';
  leftTabLabel?: string;
  rightTabLabel?: string;
  padding?: string | number;
  gap?: string | number;
  hideTicker?: boolean;
  tickerContext?: string;
  customTickerNews?: any[];
}

export const SplitLayoutPage: React.FC<SplitLayoutPageProps> = ({
  title,
  description,
  icon = 'bi-grid',
  color = 'indigo',
  badge,
  leftCols = 4,
  leftTopContent,
  leftContent,
  rightTopContent,
  rightContent,
  mobileActiveTab,
  leftTabLabel = 'Danh sách',
  rightTabLabel = 'Cấu hình chi tiết',
  padding = 8,
  gap = 8,
  hideTicker = false,
  tickerContext,
  customTickerNews,
}) => {
  const [internalTab, setInternalTab] = useState<'left' | 'right'>('left');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeTab = mobileActiveTab !== undefined ? mobileActiveTab : internalTab;
  const gapValue = typeof gap === 'number' ? `${gap}px` : gap;
  const paddingValue = typeof padding === 'number' ? `${padding}px` : padding;

  return (
    <div
      className="flex flex-col h-full flex-1 overflow-hidden select-none"
      style={{
        background: '#EBF0F5',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
      }}
    >
      {/* ── HEADER (TUYỆT ĐỐI KHÔNG CÓ NÚT BẤM THEO AGENTS.MD) ── */}
      <div style={{ flexShrink: 0 }}>
        <PageHeader
          title={title}
          description={description}
          icon={icon}
          color={color}
          badge={badge}
        />
        {!hideTicker && (
          <DynamicTicker
            pageTitle={title}
            context={tickerContext}
            items={customTickerNews}
          />
        )}
      </div>

      {/* ── SPLIT BODY ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          padding: paddingValue,
          minHeight: 0,
          height: '100%',
        }}
      >
        {/* Mobile Tab Switcher */}
        {mobileActiveTab === undefined && isMobile && (
          <div
            className="flex p-1 mb-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs shrink-0"
          >
            <button
              type="button"
              onClick={() => setInternalTab('left')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'left'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <i className={`bi ${icon}`} />
              <span>{leftTabLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => setInternalTab('right')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'right'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <i className="bi bi-shield-check" />
              <span>{rightTabLabel}</span>
            </button>
          </div>
        )}

        {/* 2-Column Desktop / Responsive Layout */}
        <div
          className="flex-1 flex flex-col lg:flex-row overflow-hidden"
          style={{
            gap: gapValue,
            minHeight: 0,
            height: '100%',
          }}
        >
          {/* CỘT TRÁI (User List) */}
          <div
            className={`flex flex-col overflow-hidden ${
              isMobile && activeTab === 'right' ? 'hidden' : 'flex'
            }`}
            style={{
              flex: isMobile ? '1 1 auto' : `0 0 ${Math.round((leftCols / 12) * 100)}%`,
              maxWidth: isMobile ? '100%' : `${Math.round((leftCols / 12) * 100)}%`,
              minWidth: isMobile ? '100%' : '340px',
              height: '100%',
            }}
          >
            {leftTopContent && <div className="shrink-0 mb-2">{leftTopContent}</div>}
            <div className="app-card bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col p-3 sm:p-4 overflow-hidden min-h-0">
              {leftContent}
            </div>
          </div>

          {/* CỘT PHẢI (Permission Editor) */}
          <div
            className={`flex-1 flex flex-col overflow-hidden min-w-0 ${
              isMobile && activeTab === 'left' ? 'hidden' : 'flex'
            }`}
            style={{
              height: '100%',
            }}
          >
            {rightTopContent && <div className="shrink-0 mb-2">{rightTopContent}</div>}
            <div className="app-card bg-white rounded-xl border border-slate-200/80 shadow-2xs flex-1 flex flex-col p-0 overflow-hidden min-h-0">
              {rightContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitLayoutPage;
