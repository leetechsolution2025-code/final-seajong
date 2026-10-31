import React, { useEffect, useRef, useState } from 'react';

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
 * Chuẩn phong cách thiết kế Enterprise: Sticky header, custom scrollbar, chống giật nháy triệt để khi tải dữ liệu thời gian thực.
 */
export const FullWidthTable: React.FC<FullWidthTableProps> = ({
  children,
  className = '',
  style,
  loading = false,
  loadingText = 'Đang tải dữ liệu...',
}) => {
  // Ghi nhận bảng đã từng hoàn tất tải dữ liệu ít nhất 1 lần
  const hasLoadedOnceRef = useRef<boolean>(!loading);
  // Lưu giữ cấu trúc DOM bảng hợp lệ gần nhất để khi reload ngầm (polling / filter) không bị xóa trắng tbody
  const stableChildrenRef = useRef<React.ReactNode>(children);

  if (!loading) {
    hasLoadedOnceRef.current = true;
    stableChildrenRef.current = children;
  }

  // Trì hoãn hiển thị chỉ báo loading để các truy vấn nhanh (< 250ms) hoặc polling ngầm không bao giờ nhấp nháy
  const [showInitialSpinner, setShowInitialSpinner] = useState<boolean>(false);
  const [showTopProgressBar, setShowTopProgressBar] = useState<boolean>(false);

  useEffect(() => {
    if (!loading) {
      setShowInitialSpinner(false);
      setShowTopProgressBar(false);
      return;
    }

    // Nếu là lần tải đầu tiên chưa có dữ liệu: chờ 180ms mới hiện spinner
    let spinnerTimer: ReturnType<typeof setTimeout> | null = null;
    if (!hasLoadedOnceRef.current) {
      spinnerTimer = setTimeout(() => {
        setShowInitialSpinner(true);
      }, 180);
    }

    // Thanh tiến trình mảnh ở mép trên: chỉ hiện nếu tải lâu hơn 350ms
    const barTimer = setTimeout(() => {
      setShowTopProgressBar(true);
    }, 350);

    return () => {
      if (spinnerTimer) clearTimeout(spinnerTimer);
      clearTimeout(barTimer);
    };
  }, [loading]);

  // Nếu đang loading lại sau khi đã có dữ liệu, giữ nguyên nội dung bảng cũ để triệt tiêu nhấp nháy 100%
  const renderedChildren =
    loading && hasLoadedOnceRef.current && stableChildrenRef.current
      ? stableChildrenRef.current
      : children;

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
      {/* Thanh chạy tiến trình siêu mảnh ở cạnh trên khi tác vụ tải kéo dài > 350ms */}
      {showTopProgressBar && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            overflow: 'hidden',
            zIndex: 40,
            backgroundColor: 'rgba(23, 92, 211, 0.08)',
            pointerEvents: 'none',
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

      {/* Lớp phủ spinner chỉ hiển thị duy nhất ở lần khởi tạo đầu tiên nếu chưa có dữ liệu */}
      {showInitialSpinner && !hasLoadedOnceRef.current && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 35,
            pointerEvents: 'none',
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
          opacity: 1,
        }}
      >
        {renderedChildren}
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
          text-align: left;
          font-size: 0.8125rem;
        }
        .full-width-table-wrapper table thead th {
          position: sticky;
          top: 0;
          z-index: 10;
          padding: 10px 16px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-secondary, #475569);
          background-color: var(--bg-surface-2, #f8fafc);
          border-top: 1px solid var(--border-subtle, #e2e8f0);
          border-bottom: 1px solid var(--border-default, #e2e8f0);
          white-space: nowrap;
        }
        .full-width-table-wrapper table tbody td {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle, #f1f5f9);
          color: var(--text-primary, #1e293b);
          vertical-align: middle;
        }
        .full-width-table-wrapper table tbody tr {
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }
        .full-width-table-wrapper table tbody tr:hover {
          background-color: rgba(248, 250, 252, 0.9);
        }
        .full-width-table-wrapper input[type="checkbox"],
        .full-width-table-wrapper .form-check-input {
          width: 0.875rem !important;
          height: 0.875rem !important;
          min-width: 0.875rem !important;
          min-height: 0.875rem !important;
        }
      `}</style>
    </div>
  );
};
