import React from "react";
import { cn } from "../../lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TableColumn<T> {
  /** Tiêu đề cột */
  header: React.ReactNode;
  /** Key trong row hoặc render function */
  render: (row: T, index: number) => React.ReactNode;
  /** Độ rộng cố định (px hoặc %) */
  width?: number | string;
  /** Căn lề nội dung ô */
  align?: "left" | "center" | "right";
  /** Không wrap text trong header */
  noWrap?: boolean;
  /** Hợp nhất cột động */
  colSpan?: (row: T, index: number) => number | undefined;
}

export interface TableProps<T> {
  /** Dữ liệu của bảng */
  rows: T[];
  /** Định nghĩa cột */
  columns: TableColumn<T>[];
  /** Đang fetch lần đầu → hiển thị skeleton */
  loading?: boolean;
  /** Đang refetch → mờ nhẹ, không xóa data */
  fetching?: boolean;
  /** Key duy nhất cho mỗi row (mặc định dùng index) */
  rowKey?: (row: T) => string | number;
  /** Click vào row */
  onRowClick?: (row: T) => void;
  /** Số skeleton rows khi loading */
  skeletonRows?: number;
  /** Nội dung hiển thị khi không có data */
  emptyIcon?: string;
  emptyText?: string;
  /** Zebra striping */
  striped?: boolean;
  /** Min-width cho bảng */
  minWidth?: number | string;
  /** Font size mặc định */
  fontSize?: number;
  /** Giảm chiều cao dòng (padding nhỏ hơn) */
  compact?: boolean;
  /** Ghim tiêu đề bảng */
  stickyHeader?: boolean;
  /** Ghim dòng đầu tiên (thường là dòng Tổng cộng) */
  stickyFirstRow?: boolean;
  /** Style tùy chỉnh cho wrapper */
  wrapperStyle?: React.CSSProperties;
  /** Class tùy chỉnh cho wrapper */
  wrapperClassName?: string;
  /** Custom render header function to override default standard th row */
  renderHeader?: () => React.ReactNode;
  /** Callback click on full-width row action button */
  onFullWidthActionClick?: (row: T, index: number) => void;
  /** Callback click on full-width row delete button */
  onFullWidthDeleteClick?: (row: T, index: number) => void;
  /** Callback on full-width row content value change */
  onFullWidthContentChange?: (row: T, index: number, val: string) => void;
  /** Bỏ hoàn toàn border của bảng */
  borderless?: boolean;
  /** Class tùy chỉnh cho mỗi dòng */
  rowClassName?: (row: T, index: number) => string | undefined;
  /** Style tùy chỉnh cho mỗi dòng */
  rowStyle?: (row: T, index: number) => React.CSSProperties | undefined;
  /** Class tùy chỉnh cho từng ô */
  cellClassName?: (row: T, column: TableColumn<T>, index: number) => string | undefined;
  /** Style tùy chỉnh cho từng ô */
  cellStyle?: (row: T, column: TableColumn<T>, index: number) => React.CSSProperties | undefined;
  /** Thuộc tính table-layout: fixed (mặc định là auto) */
  fixedLayout?: boolean;
  /** Custom render expanded sub-row */
  renderExpandedRow?: (row: T, index: number) => React.ReactNode;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow({ cols, borderless }: { cols: number; borderless?: boolean }) {
  return (
    <tr style={{ borderBottom: borderless ? "none" : "1px solid var(--border)" }}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} style={{ padding: "12px 14px", borderBottom: borderless ? "none" : "1px solid var(--border)" }}>
          <div
            style={{
              height: 12, borderRadius: 4,
              background: "var(--muted, #f1f5f9)",
              width: j === 0 ? "65%" : j === cols - 1 ? "40%" : "55%",
              animation: "tbl-pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table<T>({
  rows = [],
  columns,
  loading = false,
  fetching = false,
  rowKey,
  onRowClick,
  skeletonRows = 7,
  emptyIcon = "bi-inbox",
  emptyText = "Không có dữ liệu",
  striped = true,
  minWidth,
  fontSize = 13,
  compact = false,
  stickyHeader = true,
  stickyFirstRow = false,
  wrapperStyle,
  wrapperClassName,
  renderHeader,
  onFullWidthActionClick,
  onFullWidthDeleteClick,
  onFullWidthContentChange,
  borderless = false,
  rowClassName,
  rowStyle,
  cellClassName,
  cellStyle,
  fixedLayout = false,
  renderExpandedRow,
}: TableProps<T>) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <>
      <style>{`
        @keyframes tbl-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .app-tbl-row { transition: background 0.12s; }
        .app-tbl-row:hover td {
          background: color-mix(in srgb, var(--primary) 5%, var(--background)) !important;
        }
        .sticky-header th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--card, var(--background)) !important;
        }
        .sticky-first-row tr:first-child td {
          position: sticky;
          top: 33px;
          z-index: 9;
          background: white !important;
          border-bottom: 2px solid var(--border) !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
      `}</style>

      <div
        className={cn(
          "app-responsive-table-wrapper",
          stickyHeader && "sticky-header",
          stickyFirstRow && "sticky-first-row",
          wrapperClassName
        )}
        style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: "visible",
          opacity: fetching ? 0.5 : 1,
          pointerEvents: fetching ? "none" : "auto",
          transition: "opacity 0.15s",
          ...wrapperStyle,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            tableLayout: fixedLayout ? "fixed" : undefined,
            ...(minWidth ? { minWidth } : {}),
            fontSize,
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <thead>
            {renderHeader ? (
              renderHeader()
            ) : (
              <tr style={{ borderTop: borderless ? "none" : "1px solid var(--border)", borderBottom: borderless ? "none" : "2px solid var(--border)" }}>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className="text-uppercase"
                    style={{
                      padding: compact ? "8px 12px" : "9px 14px",
                      textAlign: col.align ?? "left",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--muted-foreground)",
                      borderTop: borderless ? "none" : "1px solid var(--border)",
                      borderBottom: borderless ? "none" : "2px solid var(--border)",
                      whiteSpace: col.noWrap !== false ? "nowrap" : undefined,
                      width: col.width,
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            )}
          </thead>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} borderless={borderless} />
              ))
            ) : safeRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "48px 14px",
                    textAlign: "center",
                    color: "var(--muted-foreground)",
                    fontSize: 13,
                  }}
                >
                  <i
                    className={`bi ${emptyIcon}`}
                    style={{ fontSize: 28, display: "block", marginBottom: 10, opacity: 0.25 }}
                  />
                  {emptyText}
                </td>
              </tr>
            ) : (
              safeRows.map((row, idx) => {
                const key = rowKey ? rowKey(row) : idx;
                const isOdd = striped && idx % 2 !== 0;
                const isFullWidth = (row as any).isFullWidth;

                if (isFullWidth) {
                  return (
                    <tr 
                      key={key} 
                      className={cn(rowClassName ? rowClassName(row, idx) : undefined)}
                      style={{ 
                        background: "var(--muted-background, #f8f9fa)", 
                        borderBottom: borderless ? "none" : "1px solid var(--border)",
                        ...((rowStyle && rowStyle(row, idx)) || {}),
                      }}
                    >
                      <td 
                        colSpan={columns.length} 
                        style={{ 
                          padding: compact ? "8px 12px" : "10px 14px", 
                          fontWeight: 700,
                          fontSize: 12,
                          color: "var(--primary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                          borderBottom: borderless ? "none" : "1px solid var(--border)",
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          {(() => {
                            const fullContent = (row as any).fullWidthContent || "";
                            if (typeof fullContent !== "string") {
                              return <>{fullContent}</>;
                            }
                            const match = fullContent.match(/^([IVXLCDM\d]+\.\s*)(.*)$/i);
                            const prefix = match ? match[1] : "";
                            const mainText = match ? match[2] : fullContent;

                            return (
                              <>
                                {prefix && <span className="text-secondary">{prefix}</span>}
                                {onFullWidthContentChange && !(row as any).disableContentChange ? (
                                  <input
                                    type="text"
                                    value={mainText}
                                    onChange={(e) => {
                                      const newVal = prefix + e.target.value;
                                      onFullWidthContentChange(row, idx, newVal);
                                    }}
                                    className="form-control form-control-sm border-0 bg-transparent p-0 text-primary fw-bold"
                                    style={{ 
                                      fontSize: 12, 
                                      textTransform: "uppercase", 
                                      letterSpacing: "0.02em",
                                      width: "auto",
                                      minWidth: "250px",
                                      height: "auto",
                                      minHeight: "auto",
                                      outline: "none",
                                      boxShadow: "none"
                                    }}
                                    placeholder="Nhập tên..."
                                  />
                                ) : (
                                  <span>{mainText}</span>
                                )}
                              </>
                            );
                          })()}
                          <div className="d-inline-flex align-items-center gap-1">
                            {onFullWidthActionClick && !(row as any).disableAdd && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onFullWidthActionClick(row, idx);
                                }}
                                className="btn btn-sm btn-link p-0 text-primary d-inline-flex align-items-center justify-content-center transition"
                                style={{ textDecoration: "none", width: "20px", height: "20px" }}
                                title="Thêm mục con"
                              >
                                <i className="bi bi-plus-circle-fill" style={{ fontSize: 14 }} />
                              </button>
                            )}
                            {onFullWidthDeleteClick && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onFullWidthDeleteClick(row, idx);
                                }}
                                className="btn btn-sm btn-link p-0 text-danger d-inline-flex align-items-center justify-content-center transition"
                                style={{ textDecoration: "none", width: "20px", height: "20px" }}
                                title="Xóa phòng ban"
                              >
                                <i className="bi bi-trash3-fill" style={{ fontSize: 13 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <React.Fragment key={key}>
                    <tr
                      className={cn(
                        onRowClick ? "app-tbl-row" : undefined,
                        rowClassName ? rowClassName(row, idx) : undefined
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      style={{
                        borderBottom: borderless ? "none" : "1px solid var(--border)",
                        cursor: onRowClick ? "pointer" : undefined,
                        background: isOdd
                          ? "color-mix(in srgb, var(--muted) 25%, transparent)"
                          : "transparent",
                        ...((rowStyle && rowStyle(row, idx)) || {}),
                      }}
                    >
                      {(() => {
                        const cells: React.ReactNode[] = [];
                        let skipCount = 0;
                        for (let ci = 0; ci < columns.length; ci++) {
                          if (skipCount > 0) {
                            skipCount--;
                            continue;
                          }
                          const col = columns[ci];
                          const span = col.colSpan ? col.colSpan(row, idx) : 1;
                          if (span === 0) {
                            continue;
                          }
                          if (span && span > 1) {
                            skipCount = span - 1;
                          }
                          cells.push(
                            <td
                              key={ci}
                              colSpan={span}
                              className={cn(
                                cellClassName ? cellClassName(row, col, idx) : undefined
                              )}
                              style={{
                                padding: compact ? "8px 12px" : "11px 14px",
                                verticalAlign: "middle",
                                textAlign: col.align ?? "left",
                                borderBottom: borderless ? "none" : "1px solid var(--border)",
                                ...((cellStyle && cellStyle(row, col, idx)) || {}),
                              }}
                            >
                              {col.render(row, idx)}
                            </td>
                          );
                        }
                        return cells;
                      })()}
                    </tr>
                    {renderExpandedRow && renderExpandedRow(row, idx)}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Table;
