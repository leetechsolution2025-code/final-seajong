import React, { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { DynamicTicker } from './DynamicTicker';

export interface StandardPageProps {
  title: string;
  description?: string;
  icon?: string;
  color?: 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan' | 'indigo';
  badge?: string;
  children?: ReactNode;
  /** Action buttons bên phải header */
  headerActions?: ReactNode;
  /** Nút quay lại */
  showBackButton?: boolean;
  backUrl?: string;
  /** Màu nền, mặc định #EBF0F5 */
  background?: string;
  /** Tự động bọc trong card trắng? */
  useCard?: boolean;
  /** Độ bo góc của card trắng, mặc định rounded-xl (12px) */
  cardRounded?: string;
  /** Padding bên trong card trắng, mặc định 'p-0' để TableToolbar chạm viền đúng 8px */
  cardPadding?: string;
  paddingClassName?: string;
  afterHeader?: ReactNode;
  hideTicker?: boolean;
  /** Custom data cho Ticker */
  customTickerNews?: any[];
  /** Chỉ định context trực tiếp cho Ticker */
  tickerContext?: string;
}

export const StandardPage: React.FC<StandardPageProps> = ({
  title,
  description,
  icon = 'bi-grid',
  color = 'indigo',
  badge,
  children,
  headerActions,
  showBackButton = false,
  backUrl,
  background = '#EBF0F5',
  useCard = true,
  cardRounded = 'rounded-xl',
  cardPadding = 'p-0',
  paddingClassName = 'p-2',
  afterHeader,
  hideTicker = false,
  customTickerNews,
  tickerContext,
}) => {
  return (
    <div
      className="flex flex-col h-full flex-1 overflow-hidden"
      style={{
        background,
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
      }}
    >
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
        {afterHeader}
      </div>

      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          padding: 8,
          flex: '1 1 0%',
          minHeight: 0,
          height: '100%',
        }}
      >
        {useCard ? (
          <div
            className={`standard-page-card bg-white ${cardRounded} shadow-xs border border-slate-200/80 ${cardPadding} flex flex-col`}
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: '1 1 0%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%',
              }}
            >
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default StandardPage;
