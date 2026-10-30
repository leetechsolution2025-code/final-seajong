import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ThreeDotsVertical, ArrowRepeat, FileEarmarkExcel, Printer } from 'react-bootstrap-icons';
import { Input } from './Input';
import { Select, type SelectOption } from './Select';

export interface TableToolbarMenuItem {
  id?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

export interface TableToolbarFilter {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  minWidth?: string;
  ariaLabel?: string;
  leftIcon?: React.ReactNode;
}

export interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchMinWidth?: string;
  searchWidth?: number | string;
  filters?: TableToolbarFilter[] | React.ReactNode;
  customFilters?: React.ReactNode;
  actionsBeforeSearch?: React.ReactNode;
  actionsAfterSearch?: React.ReactNode;
  actions?: React.ReactNode;
  rightActions?: React.ReactNode;
  wrap?: boolean;
  style?: React.CSSProperties;

  // Cấu hình Dropdown Menu ba chấm ở cuối bên phải
  showMenu?: boolean; // Luôn mặc định là true (luôn có icon ba chấm ở cuối bên phải)
  menuItems?: TableToolbarMenuItem[];
  menuContent?: React.ReactNode | ((closeMenu: () => void) => React.ReactNode);
  onRefresh?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  printLabel?: string;
  menuTooltip?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchMinWidth = '200px',
  searchWidth,
  filters,
  customFilters,
  actionsBeforeSearch,
  actionsAfterSearch,
  actions,
  rightActions,
  wrap = false,
  style,
  showMenu = true,
  menuItems,
  menuContent,
  onRefresh,
  onExportExcel,
  onPrint,
  printLabel,
  menuTooltip = 'Thao tác khác',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài hoặc nhấn phím ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Các mục menu mặc định nếu không truyền menuItems cụ thể
  const defaultItems = useMemo<TableToolbarMenuItem[]>(() => {
    if (menuItems) return menuItems;

    const items: TableToolbarMenuItem[] = [];

    // Mục Xuất Excel
    items.push({
      id: 'export-excel',
      label: 'Xuất ra bảng Excel',
      icon: <FileEarmarkExcel size={15} style={{ color: '#10b981', flexShrink: 0 }} />,
      onClick: onExportExcel || (() => window.print()),
    });

    // Mục In ấn / Báo cáo
    items.push({
      id: 'print-report',
      label: printLabel || 'In báo cáo',
      icon: <Printer size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />,
      onClick: onPrint || (() => window.print()),
    });

    // Đường kẻ phân cách
    items.push({
      id: 'divider',
      label: '',
      divider: true,
      onClick: () => {},
    });

    // Mục Làm mới dữ liệu
    items.push({
      id: 'refresh-data',
      label: 'Làm mới dữ liệu',
      icon: <ArrowRepeat size={15} style={{ color: '#8b5cf6', flexShrink: 0 }} />,
      onClick: onRefresh || (() => window.location.reload()),
    });

    return items;
  }, [menuItems, onExportExcel, onPrint, onRefresh, printLabel]);

  return (
    <div
      className="table-toolbar"
      style={{
        display: 'flex',
        width: '100%',
        gap: '8px',
        padding: '8px',
        marginBottom: '8px',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: '8px', flexWrap: wrap ? 'wrap' : 'nowrap', flex: '1 1 auto', minWidth: 0, alignItems: 'center' }}>
        {/* Nút hành động hoặc Toggle đặt trước các bộ lọc và hộp tìm kiếm */}
        {actionsBeforeSearch && (
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
            {actionsBeforeSearch}
          </div>
        )}

        {/* 1. Dynamic Filter Selects (Lọc theo phòng ban, lọc theo trạng thái...) hiển thị trước */}
        {Array.isArray(filters) ? (
          filters.map((filter, idx) => (
            <div
              key={filter.id || idx}
              style={{ minWidth: filter.minWidth || '180px', flex: '0 0 auto' }}
            >
              <Select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                options={filter.options}
                leftIcon={filter.leftIcon}
                aria-label={filter.ariaLabel}
                style={{ marginBottom: 0 }}
              >
                {filter.children}
              </Select>
            </div>
          ))
        ) : (
          filters && (
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filters}
            </div>
          )
        )}

        {/* Custom Filters (Khoảng ngày, Toggle...) hiển thị liền kề các bộ lọc */}
        {customFilters && (
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {customFilters}
          </div>
        )}

        {/* 2. Hộp tìm kiếm (Search Box) hiển thị sau các bộ lọc */}
        {onSearchChange !== undefined && (
          <div style={{ flex: searchWidth ? `0 0 ${typeof searchWidth === 'number' ? `${searchWidth}px` : searchWidth}` : `1 1 ${searchMinWidth}`, minWidth: '220px' }}>
            <Input
              placeholder={searchPlaceholder}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              leftIcon={<Search size={16} />}
              style={{ marginBottom: 0 }}
            />
          </div>
        )}

        {/* 3. Nút hành động đặt ngay sau hộp tìm kiếm */}
        {actionsAfterSearch && (
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
            {actionsAfterSearch}
          </div>
        )}
      </div>

      {/* Khu vực hành động bên phải: luôn có icon ba chấm ở cuối bên phải */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {rightActions || actions}

        {showMenu && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              title={menuTooltip}
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              style={{
                backgroundColor: isMenuOpen ? 'var(--bg-surface-3, #f1f5f9)' : 'transparent',
                color: isMenuOpen ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary, #64748b)',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                padding: '8px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '38px',
                width: '38px',
                boxSizing: 'border-box',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isMenuOpen) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-3, #f1f5f9)';
                  e.currentTarget.style.color = 'var(--text-primary, #1e293b)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMenuOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary, #64748b)';
                }
              }}
            >
              <ThreeDotsVertical size={16} />
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  backgroundColor: 'var(--bg-surface-1, #ffffff)',
                  border: '1px solid var(--border-default, #e2e8f0)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.25)',
                  padding: '4px 0',
                  minWidth: '180px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {menuContent ? (
                  typeof menuContent === 'function' ? menuContent(() => setIsMenuOpen(false)) : menuContent
                ) : (
                  defaultItems.map((item, idx) => {
                    if (item.divider) {
                      return (
                        <div
                          key={item.id || `divider-${idx}`}
                          style={{
                            height: '1px',
                            backgroundColor: 'var(--border-subtle, #e2e8f0)',
                            margin: '4px 0',
                          }}
                        />
                      );
                    }
                    return (
                      <button
                        key={item.id || (typeof item.label === 'string' ? item.label : `action-${idx}`)}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => {
                          setIsMenuOpen(false);
                          item.onClick();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '8px 14px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: item.danger ? 'var(--color-danger, #ef4444)' : 'var(--text-primary, #1e293b)',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          cursor: item.disabled ? 'not-allowed' : 'pointer',
                          opacity: item.disabled ? 0.5 : 1,
                          textAlign: 'left',
                          fontFamily: "'Roboto Condensed', sans-serif",
                          transition: 'background-color 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          if (!item.disabled) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {item.icon && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                            {item.icon}
                          </span>
                        )}
                        <span>{item.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

