import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDoubleLeft,
  ChevronDoubleRight,
} from 'react-bootstrap-icons';

export interface PaginationProps {
  currentPage?: number;
  page?: number;
  totalItems?: number;
  totalCount?: number;
  currentCount?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  rightActions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  totalPages?: number;
  compact?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  page,
  totalItems,
  totalCount,
  currentCount,
  pageSize = 10,
  itemName = 'bản ghi',
  onPageChange,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  rightActions,
  className = '',
  style,
  totalPages: propTotalPages,
  compact = false,
}) => {
  const effectiveCurrentPage = currentPage ?? page ?? 1;
  const effectiveOnPageChange = onPageChange ?? onChange ?? (() => {});

  const safeCurrentPage = Math.max(1, Number(effectiveCurrentPage) || 1);
  const safeTotalItems = Math.max(0, Number(totalItems ?? totalCount) || 0);
  const safePageSize = Math.max(1, Number(pageSize) || 10);

  const calculatedTotalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const totalPages = propTotalPages !== undefined && propTotalPages > 0 ? propTotalPages : calculatedTotalPages;
  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;
  const endItem = Math.min(safeCurrentPage * safePageSize, safeTotalItems);

  // Sinh danh sách số trang áp dụng rút gọn truncate với dấu chấm lửng
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 3) {
      const pages: number[] = [];
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const siblingCount = 1;
    const leftSibling = Math.max(safeCurrentPage - siblingCount, 1);
    const rightSibling = Math.min(safeCurrentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSibling > 2;
    const showRightEllipsis = rightSibling < totalPages - 1;

    // Chỉ rút gọn phía sau
    if (!showLeftEllipsis && showRightEllipsis) {
      const leftRange: number[] = [];
      const end = Math.max(rightSibling, 2);
      for (let i = 1; i <= end; i++) {
        leftRange.push(i);
      }
      return [...leftRange, '...', totalPages];
    }

    // Chỉ rút gọn phía trước
    if (showLeftEllipsis && !showRightEllipsis) {
      const rightRange: number[] = [];
      const start = Math.min(leftSibling, totalPages - 1);
      for (let i = start; i <= totalPages; i++) {
        rightRange.push(i);
      }
      return [1, '...', ...rightRange];
    }

    // Rút gọn cả 2 đầu trước và sau
    if (showLeftEllipsis && showRightEllipsis) {
      const middleRange: number[] = [];
      for (let i = leftSibling; i <= rightSibling; i++) {
        middleRange.push(i);
      }
      return [1, '...', ...middleRange, '...', totalPages];
    }

    // Hiển thị toàn bộ khi vừa vặn
    const allPages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      allPages.push(i);
    }
    return allPages;
  };

  return (
    <div className={`table-pagination ${className}`.trim()} style={style}>
      {/* Left: Summary và Page Size */}
      <div className="pagination-left">
        <span>
          Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trong tổng số{' '}
          <strong>{safeTotalItems}</strong> {itemName}
        </span>

        {onPageSizeChange && (
          <div className="pagination-size-selector">
            <span style={{ color: 'var(--text-muted)' }}>Mỗi trang:</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  effectiveOnPageChange(1);
                }}
                className="pagination-select"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} dòng
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Right: Navigation Buttons và Optional Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div className="pagination-controls">
          <button
            className="pagination-nav-btn"
            onClick={() => effectiveOnPageChange(1)}
            disabled={safeCurrentPage === 1}
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <ChevronDoubleLeft size={16} />
          </button>

          <button
            className="pagination-nav-btn"
            onClick={() => effectiveOnPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            title="Trang trước"
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="pagination-pages">
            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  className={`pagination-page-btn ${p === safeCurrentPage ? 'is-active' : ''}`}
                  onClick={() => effectiveOnPageChange(p)}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="pagination-ellipsis">
                  {p}
                </span>
              )
            )}
          </div>

          <button
            className="pagination-nav-btn"
            onClick={() => effectiveOnPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages || totalPages === 0}
            title="Trang sau"
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>

          <button
            className="pagination-nav-btn"
            onClick={() => effectiveOnPageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages || totalPages === 0}
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <ChevronDoubleRight size={16} />
          </button>
        </div>

        {rightActions && (
          <div className="pagination-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {rightActions}
          </div>
        )}
      </div>
    </div>
  );
};
