import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PencilSquare, Trash } from 'react-bootstrap-icons';
import { ConfirmDialog } from './ConfirmDialog';

export interface SwipeDeleteRequest {
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

interface SwipeTableContextValue {
  swipedRowId: string | null;
  setSwipedRowId: React.Dispatch<React.SetStateAction<string | null>>;
  requestDeleteConfirm: (req: SwipeDeleteRequest) => void;
}

const SwipeTableContext = createContext<SwipeTableContextValue | null>(null);

export const useSwipeTableContext = () => useContext(SwipeTableContext);

/**
 * SwipeableTableProvider - Bao bọc bảng dữ liệu để đồng bộ trạng thái dòng đang vuốt (chỉ mở 1 dòng tại 1 thời điểm)
 * và tích hợp sẵn ConfirmDialog dùng chung khi người dùng bấm nút "Xoá" trên thanh trượt mobile.
 */
export const SwipeableTableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SwipeDeleteRequest | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const requestDeleteConfirm = useCallback((req: SwipeDeleteRequest) => {
    setSwipedRowId(null);
    setPendingDelete(req);
  }, []);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await pendingDelete.onConfirm();
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SwipeTableContext.Provider value={{ swipedRowId, setSwipedRowId, requestDeleteConfirm }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <ConfirmDialog
          isOpen={Boolean(pendingDelete)}
          title={pendingDelete?.title || 'Xác nhận xoá dữ liệu'}
          message={
            pendingDelete?.message ||
            'Bạn có chắc chắn muốn xoá mục đã chọn không? Thao tác này không thể hoàn tác.'
          }
          confirmText={pendingDelete?.confirmText || 'Xoá dữ liệu'}
          cancelText={pendingDelete?.cancelText || 'Huỷ'}
          variant="danger"
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        />,
        document.body
      )}
    </SwipeTableContext.Provider>
  );
};

export interface SwipeableTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Mã định danh duy nhất của dòng */
  rowId: string | number;
  /** Sự kiện khi chạm/click vào dòng (mở chi tiết) */
  onRowClick?: () => void;
  /** Sự kiện khi bấm nút "Sửa" trên thanh trượt mobile */
  onEdit?: () => void;
  /** Sự kiện khi xác nhận "Xoá" trên ConfirmDialog sau khi bấm nút "Xoá" trên thanh trượt mobile */
  onDelete?: () => void | Promise<void>;
  /** Tiêu đề hộp thoại ConfirmDialog khi bấm Xoá */
  deleteConfirmTitle?: React.ReactNode;
  confirmTitle?: React.ReactNode;
  /** Nội dung thông báo trong ConfirmDialog khi bấm Xoá */
  deleteConfirmMessage?: React.ReactNode;
  confirmMessage?: React.ReactNode;
  /** Nhãn nút xác nhận xoá trong ConfirmDialog */
  deleteConfirmText?: string;
  /** Nhãn nút Sửa trên thanh trượt (mặc định: "Sửa") */
  editLabel?: string;
  /** Nhãn nút Xoá trên thanh trượt (mặc định: "Xoá") */
  deleteLabel?: string;
  /** Bỏ qua ConfirmDialog và gọi thẳng onDelete? (mặc định: false) */
  skipDeleteConfirm?: boolean;
}

/**
 * Kiểm tra xem một phần tử <td> có đang bị ẩn trên màn hình mobile (<= 768px) hay không
 */
function isTdHiddenOnMobile(element: React.ReactElement<any>): boolean {
  const cls = String(element.props?.className || '');
  if (!cls) return false;
  const tokens = cls.split(/\s+/);
  const hasHidden = tokens.includes('hidden');
  const hasDesktopShow = tokens.some(
    (t) =>
      t === 'sm:table-cell' ||
      t === 'md:table-cell' ||
      t === 'lg:table-cell' ||
      t === 'xl:table-cell'
  );
  return hasHidden && hasDesktopShow;
}

/**
 * SwipeableTableRow - Component dòng bảng (<tr>) dùng chung có tích hợp cử chỉ vuốt từ phải sang trái
 * trên màn hình điện thoại (<= 768px) để hiển thị thanh 2 nút "Sửa" và "Xoá" kèm ConfirmDialog xác nhận.
 * Không ảnh hưởng đến giao diện trên các màn hình lớn (> 768px).
 */
export const SwipeableTableRow: React.FC<SwipeableTableRowProps> = ({
  rowId,
  onRowClick,
  onEdit,
  onDelete,
  deleteConfirmTitle,
  confirmTitle,
  deleteConfirmMessage,
  confirmMessage,
  deleteConfirmText = 'Xoá dữ liệu',
  editLabel = 'Sửa',
  deleteLabel = 'Xoá',
  skipDeleteConfirm = false,
  className = '',
  onClick,
  children,
  ...rest
}) => {
  const effectiveConfirmTitle = deleteConfirmTitle ?? confirmTitle ?? 'Xác nhận xoá dữ liệu';
  const effectiveConfirmMessage =
    deleteConfirmMessage ??
    confirmMessage ??
    'Bạn có chắc chắn muốn xoá mục này không? Thao tác này không thể hoàn tác.';
  const ctx = useSwipeTableContext();
  const [localSwipedId, setLocalSwipedId] = useState<string | null>(null);
  const [localPendingDelete, setLocalPendingDelete] = useState< boolean >(false);
  const [localDeleting, setLocalDeleting] = useState<boolean>(false);

  const normalizedId = String(rowId);
  const activeSwipedId = ctx ? ctx.swipedRowId : localSwipedId;
  const setActiveSwipedId = ctx ? ctx.setSwipedRowId : setLocalSwipedId;
  const isSwipedOpen = activeSwipedId === normalizedId;
  const hasSwipeActions = Boolean(onEdit || onDelete);

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    isDragging: boolean;
    didSwipe: boolean;
  }>({
    startX: 0,
    startY: 0,
    isDragging: false,
    didSwipe: false,
  });

  const handleTouchStart = (e: React.TouchEvent<HTMLTableRowElement>) => {
    if (!hasSwipeActions || window.innerWidth > 768) return;
    const t = e.touches[0];
    dragStateRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      isDragging: true,
      didSwipe: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLTableRowElement>) => {
    const st = dragStateRef.current;
    if (!hasSwipeActions || !st.isDragging || window.innerWidth > 768) return;
    const t = e.touches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
      st.didSwipe = true;
      if (dx < -24) {
        setActiveSwipedId(normalizedId);
      } else if (dx > 20 && isSwipedOpen) {
        setActiveSwipedId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    dragStateRef.current.isDragging = false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (!hasSwipeActions || window.innerWidth > 768) return;
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      isDragging: true,
      didSwipe: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLTableRowElement>) => {
    const st = dragStateRef.current;
    if (!hasSwipeActions || !st.isDragging || window.innerWidth > 768) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
      st.didSwipe = true;
      if (dx < -24) {
        setActiveSwipedId(normalizedId);
      } else if (dx > 20 && isSwipedOpen) {
        setActiveSwipedId(null);
      }
    }
  };

  const handleMouseUp = () => {
    dragStateRef.current.isDragging = false;
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (dragStateRef.current.didSwipe) {
      dragStateRef.current.didSwipe = false;
      return;
    }
    if (activeSwipedId) {
      setActiveSwipedId(null);
      return;
    }
    if (onRowClick) {
      onRowClick();
    } else if (onClick) {
      onClick(e);
    }
  };

  const triggerDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setActiveSwipedId(null);
    if (!onDelete) return;
    if (skipDeleteConfirm) {
      onDelete();
      return;
    }
    if (ctx) {
      ctx.requestDeleteConfirm({
        title: effectiveConfirmTitle,
        message: effectiveConfirmMessage,
        confirmText: deleteConfirmText,
        onConfirm: onDelete,
      });
    } else {
      setLocalPendingDelete(true);
    }
  };

  const childArray = React.Children.toArray(children);
  let targetTdIndex = -1;
  for (let i = childArray.length - 1; i >= 0; i--) {
    const child = childArray[i];
    if (React.isValidElement(child) && !isTdHiddenOnMobile(child)) {
      targetTdIndex = i;
      break;
    }
  }

  const enhancedChildren = childArray.map((child, idx) => {
    if (idx !== targetTdIndex || !React.isValidElement(child)) {
      return child;
    }
    const typedChild = child as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
    const existingClassName = typedChild.props.className || '';
    return React.cloneElement(typedChild, {
      className: `${existingClassName} relative mobile-swipe-target-td`.trim(),
      children: (
        <>
          {typedChild.props.children}
          {isSwipedOpen && hasSwipeActions && (
            <div
              className="mobile-row-swipe-actions"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <button
                  type="button"
                  className="mobile-swipe-btn is-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSwipedId(null);
                    onEdit();
                  }}
                >
                  <PencilSquare className="w-3.5 h-3.5" />
                  <span>{editLabel}</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="mobile-swipe-btn is-delete"
                  onClick={triggerDelete}
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>{deleteLabel}</span>
                </button>
              )}
            </div>
          )}
        </>
      ),
    });
  });

  return (
    <>
      <tr
        {...rest}
        className={`swipeable-table-row ${isSwipedOpen ? 'is-swiped-open' : ''} ${className}`.trim()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleRowClick}
      >
        {enhancedChildren}
      </tr>
      {!ctx && localPendingDelete && onDelete && typeof document !== 'undefined' && createPortal(
        <ConfirmDialog
          isOpen={localPendingDelete}
          title={effectiveConfirmTitle}
          message={effectiveConfirmMessage}
          confirmText={deleteConfirmText}
          cancelText="Huỷ"
          variant="danger"
          loading={localDeleting}
          onConfirm={async () => {
            try {
              setLocalDeleting(true);
              await onDelete();
              setLocalPendingDelete(false);
            } finally {
              setLocalDeleting(false);
            }
          }}
          onClose={() => {
            if (!localDeleting) setLocalPendingDelete(false);
          }}
        />,
        document.body
      )}
    </>
  );
};

export default SwipeableTableRow;

