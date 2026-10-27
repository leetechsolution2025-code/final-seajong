import React from 'react';
import { MegaphoneFill } from 'react-bootstrap-icons';
import { Badge } from './Badge';

export interface TickerItemObject {
  text: string;
  tag?: string;
  tagVariant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: React.ReactNode;
  link?: string;
  onClick?: () => void;
}

export type TickerItem = string | TickerItemObject;

export interface TickerProps {
  /** Danh sách các tin, thông báo hoặc chỉ số */
  items?: TickerItem[];
  /** Chuỗi văn bản duy nhất (nếu không truyền danh sách items) */
  text?: string;
  /** Tiêu đề huy hiệu cố định ở góc trái (Mặc định: 'THÔNG BÁO') */
  badgeText?: string;
  /** Biểu tượng bên cạnh huy hiệu */
  icon?: React.ReactNode;
  /** Thời gian hoàn thành 1 vòng chạy (giây, mặc định: 35s) */
  speed?: number;
  /** Tạm dừng khi rê chuột qua (Mặc định: true) */
  pauseOnHover?: boolean;
  /** Dấu phân cách giữa các tin */
  separator?: React.ReactNode;
  /** Tuỳ chỉnh style cho container */
  style?: React.CSSProperties;
  /** ClassName bổ sung */
  className?: string;
}

/**
 * Phân tích chuỗi có chứa **in đậm** thành các thẻ strong nổi bật
 */
const renderFormattedText = (raw: string) => {
  if (!raw.includes('**')) {
    return <span>{raw}</span>;
  }
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return (
            <strong
              key={index}
              style={{
                color: 'var(--text-primary)',
                fontWeight: 700,
                backgroundColor: 'rgba(23, 92, 211, 0.06)',
                padding: '1px 5px',
                borderRadius: '4px',
                margin: '0 2px',
              }}
            >
              {content}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export const Ticker: React.FC<TickerProps> = ({
  items,
  text,
  badgeText = 'BẢN TIN',
  icon,
  speed = 35,
  separator = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 20px',
        color: 'var(--color-primary)',
        opacity: 0.6,
        fontSize: '0.875rem',
      }}
    >
      ✦
    </span>
  ),
  style,
  className = '',
}) => {
  // Chuẩn hóa danh sách items
  const resolvedItems: TickerItem[] = React.useMemo(() => {
    if (items && items.length > 0) return items;
    if (text) return [text];
    return [
      'Hệ thống quản trị Deco Door Enterprise - Chúc quý cán bộ nhân viên một ngày làm việc hiệu quả và thành công!',
    ];
  }, [items, text]);

  const renderContent = () => (
    <>
      {resolvedItems.map((item, idx) => {
        const isObj = typeof item !== 'string';
        const itemText = isObj ? item.text : item;
        const itemTag = isObj ? item.tag : undefined;
        const itemTagVariant = isObj ? item.tagVariant || 'brand' : 'brand';
        const itemIcon = isObj ? item.icon : null;
        const itemClick = isObj ? item.onClick : undefined;

        return (
          <React.Fragment key={idx}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                cursor: itemClick ? 'pointer' : 'default',
              }}
              onClick={itemClick}
            >
              {itemTag && (
                <Badge variant={itemTagVariant} style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                  {itemTag}
                </Badge>
              )}
              {itemIcon && (
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {itemIcon}
                </span>
              )}
              {renderFormattedText(itemText)}
            </div>
            {idx < resolvedItems.length - 1 && separator}
          </React.Fragment>
        );
      })}
    </>
  );

  return (
    <div
      className={`ticker-container ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '36px',
        backgroundColor: 'var(--bg-surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '0 12px',
        marginTop: '0px',
        marginBottom: '0px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* 1. Phần tiêu đề / Huy hiệu cố định góc trái */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0,
          paddingRight: '12px',
          borderRight: '1px solid var(--border-default)',
          zIndex: 2,
          backgroundColor: 'var(--bg-surface-1)',
          height: '100%',
        }}
      >
        <span
          style={{
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon || <MegaphoneFill size={13} />}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--color-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {badgeText}
        </span>
      </div>

      {/* 2. Đường chạy chữ cuộn từ phải qua trái */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          paddingLeft: '12px',
          maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 20px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 20px), transparent)',
        }}
      >
        <div
          className="ticker-track"
          style={{ '--ticker-duration': `${speed}s` } as React.CSSProperties}
        >
          {/* Lượt 1 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', paddingRight: '20px' }}>
            {renderContent()}
          </div>
          {/* Lượt 2 (tạo vòng lặp vô tận trơn tru không ngắt quãng) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', paddingRight: '20px' }} aria-hidden="true">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ticker;
