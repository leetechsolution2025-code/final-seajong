import React from 'react';

export interface FullWidthTableProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
}

/**
 * FullWidthTable - Component bao bọc bảng dữ liệu chính chiếm trọn chiều rộng và chiều cao
 * Chuẩn phong cách thiết kế Deco Door Enterprise: Sticky header, custom scrollbar, chống giật nháy khi tải dữ liệu.
 */
export const FullWidthTable: React.FC<FullWidthTableProps> = ({
  children,
  className = '',
  style,
  loading = false,
  loadingText = 'Đang tải dữ liệu...',
}) => {
  return (
    <div
      className={`table-container full-width-table-wrapper ${className}`}
      style={{
        position: 'relative',
        flex: '1 1 0%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        border: 'none',
        borderRadius: 0,
        backgroundColor: 'var(--bg-surface-1, #ffffff)',
        ...style,
      }}
    >
      {/* Thanh chạy tiến trình mượt mà ở cạnh trên khi loading (chống nháy) */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2.5px',
            overflow: 'hidden',
            zIndex: 40,
            backgroundColor: 'rgba(23, 92, 211, 0.1)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: '100%',
              backgroundColor: 'var(--color-primary, #175cd3)',
              borderRadius: '2px',
              animation: 'fullWidthTableIndeterminate 1.2s ease-in-out infinite',
            }}
          />
        </div>
      )}

      {/* Lớp phủ loading mờ mượt mà, giữ nguyên cấu trúc DOM bảng để triệt tiêu hiện tượng nháy */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(1px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 35,
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
              border: '1px solid var(--border-default, #e2e8f0)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary, #475569)',
            }}
          >
            <div
              style={{
                width: '13px',
                height: '13px',
                border: '2px solid rgba(23, 92, 211, 0.2)',
                borderTopColor: 'var(--color-primary, #175cd3)',
                borderRadius: '50%',
                animation: 'fullWidthTableSpin 0.7s linear infinite',
              }}
            />
            <span>{loadingText}</span>
          </div>
        </div>
      )}

      <div
        className="table-responsive custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          width: '100%',
          opacity: loading ? 0.75 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes fullWidthTableIndeterminate {
          0% { left: -40%; width: 40%; }
          50% { left: 20%; width: 60%; }
          100% { left: 100%; width: 40%; }
        }
        @keyframes fullWidthTableSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .full-width-table-wrapper table {
          width: 100% !important;
          min-width: 100% !important;
          border-collapse: collapse;
        }
      `}</style>
    </div>
  );
};
