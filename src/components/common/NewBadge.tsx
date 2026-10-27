import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// 1. GIAO DIỆN VÀ THIẾT KẾ HUY HIỆU "MỚI" (Visual Component)
// ============================================================================

export interface NewBadgeProps {
  /** Điều kiện hiển thị (mặc định: true) */
  show?: boolean;
  /** Nhãn chữ hiển thị (mặc định: "Mới") */
  label?: string;
  /** Chấm tròn chỉ báo màu sắc (mặc định: true) */
  hasDot?: boolean;
  /** Kích thước huy hiệu (sm | md | lg) */
  size?: 'sm' | 'md' | 'lg';
  /** Tông màu: 'danger' (đỏ tươi - mặc định), 'brand' (xanh thương hiệu), 'warning' (vàng cam), 'emerald' (xanh lá) */
  variant?: 'danger' | 'brand' | 'warning' | 'emerald';
  className?: string;
  style?: React.CSSProperties;
}

export const NewBadge: React.FC<NewBadgeProps> = ({
  show = true,
  label = 'Mới',
  hasDot = true,
  size = 'sm',
  variant = 'danger',
  className = '',
  style,
}) => {
  if (!show) return null;

  const sizeConfig = {
    sm: { fontSize: '0.625rem', padding: '1px 6px', dotSize: '5px' },
    md: { fontSize: '0.6875rem', padding: '2px 8px', dotSize: '6px' },
    lg: { fontSize: '0.75rem', padding: '3px 10px', dotSize: '7px' },
  }[size];

  const variantStyles = {
    danger: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      color: '#dc2626',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      dotColor: '#ef4444',
    },
    brand: {
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      color: '#1d4ed8',
      border: '1px solid rgba(37, 99, 235, 0.25)',
      dotColor: '#2563eb',
    },
    warning: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#d97706',
      border: '1px solid rgba(245, 158, 11, 0.28)',
      dotColor: '#f59e0b',
    },
    emerald: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      color: '#059669',
      border: '1px solid rgba(16, 185, 129, 0.28)',
      dotColor: '#10b981',
    },
  }[variant];

  return (
    <span
      className={`decodoor-new-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: variantStyles.backgroundColor,
        color: variantStyles.color,
        border: variantStyles.border,
        fontSize: sizeConfig.fontSize,
        fontWeight: 700,
        padding: sizeConfig.padding,
        borderRadius: '9999px',
        letterSpacing: '0.02em',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        fontFamily: "'Roboto Condensed', sans-serif",
        userSelect: 'none',
        ...style,
      }}
    >
      {hasDot && (
        <span
          style={{
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: '50%',
            backgroundColor: variantStyles.dotColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
};

// ============================================================================
// 2. HOOK QUẢN LÝ QUY TẮC VÒNG ĐỜI HUY HIỆU MỚI (State và Persistence Hook)
// ============================================================================

export interface UseNewBadgeManagerOptions {
  /** Khóa lưu trữ danh sách ID đã đọc trong localStorage */
  storageKey: string;
  /** Danh sách các trạng thái được xem là "Mới" nếu chưa đọc. Mặc định: ['pending', 'new', 'unread'] */
  pendingStatuses?: string[];
}

export interface NewBadgeManager {
  readIds: string[];
  markAsRead: (id: string | number) => void;
  markAllAsRead: (ids: (string | number)[]) => void;
  resetAll: () => void;
  isNew: (id: string | number, status?: string) => boolean;
}

/**
 * Hook quản lý vòng đời trạng thái của các mục "Mới":
 * 1. Nhận biết mục mới: khi ID chưa nằm trong danh sách đã đọc AND (không kiểm tra trạng thái HOẶC trạng thái thuộc pendingStatuses).
 * 2. Tự động gỡ bỏ: khi gọi `markAsRead(id)` (thường gắn vào sự kiện onClick mở xem chi tiết).
 * 3. Đồng bộ và lưu trữ bền vững qua localStorage.
 */
export function useNewBadgeManager({
  storageKey,
  pendingStatuses = ['pending', 'new', 'unread'],
}: UseNewBadgeManagerOptions): NewBadgeManager {
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markAsRead = useCallback(
    (id: string | number) => {
      const idStr = String(id);
      setReadIds((prev) => {
        if (prev.includes(idStr)) return prev;
        const updated = [...prev, idStr];
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [storageKey]
  );

  const markAllAsRead = useCallback(
    (ids: (string | number)[]) => {
      setReadIds((prev) => {
        const idStrs = ids.map(String);
        const updated = Array.from(new Set([...prev, ...idStrs]));
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [storageKey]
  );

  const resetAll = useCallback(() => {
    setReadIds([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const isNew = useCallback(
    (id: string | number, status?: string) => {
      const idStr = String(id);
      if (readIds.includes(idStr)) return false;
      if (status !== undefined) {
        return pendingStatuses.includes(status);
      }
      return true;
    },
    [readIds, pendingStatuses]
  );

  return useMemo(
    () => ({
      readIds,
      markAsRead,
      markAllAsRead,
      resetAll,
      isNew,
    }),
    [readIds, markAsRead, markAllAsRead, resetAll, isNew]
  );
}

// ============================================================================
// 3. SMART COMPONENT TIỆN DỤNG (KẾT HỢP CẢ COMPONENT VÀ MANAGER)
// ============================================================================

export interface SmartNewBadgeProps extends Omit<NewBadgeProps, 'show'> {
  id: string | number;
  status?: string;
  manager: NewBadgeManager;
}

export const SmartNewBadge: React.FC<SmartNewBadgeProps> = ({
  id,
  status,
  manager,
  ...rest
}) => {
  const show = manager.isNew(id, status);
  return <NewBadge show={show} {...rest} />;
};
