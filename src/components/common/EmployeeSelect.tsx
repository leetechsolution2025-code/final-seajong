import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown } from 'react-bootstrap-icons';

export interface EmployeeItem {
  id: number | string;
  code?: string;
  employeeId?: string;
  userId?: string;
  name: string;
  department: string;
  departmentCode?: string;
  position?: string;
  phone?: string;
  email?: string;
}

// Danh mục nhân sự mặc định khi offline / đang tải (trống mặc định, nạp 100% từ DB)
export const DEFAULT_EMPLOYEES: EmployeeItem[] = [];

// Bộ nhớ cache dùng chung để tránh gọi lặp lại /api/users
let cachedEmployees: EmployeeItem[] | null = null;
let isFetchingEmployees = false;
const listeners: Array<(employees: EmployeeItem[]) => void> = [];

export async function fetchEmployeesFromDb(): Promise<EmployeeItem[]> {
  if (cachedEmployees && cachedEmployees.length > 0) {
    return cachedEmployees;
  }
  if (isFetchingEmployees) {
    return new Promise((resolve) => {
      listeners.push((emps) => resolve(emps));
    });
  }

  isFetchingEmployees = true;
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: EmployeeItem[] = data.map((u: any) => ({
          id: u.employeeId || u.id,
          code: u.code || '',
          employeeId: u.employeeId || String(u.id),
          userId: u.userId || String(u.id),
          name: u.name,
          department: u.department || 'Công ty',
          departmentCode: u.departmentCode || '',
          position: u.position || '',
          phone: u.phone || '',
          email: u.email || '',
        }));
        cachedEmployees = mapped;
        listeners.forEach((fn) => fn(mapped));
        listeners.length = 0;
        return mapped;
      }
    }

    const boardRes = await fetch('/api/board/users');
    if (boardRes.ok) {
      const boardData = await boardRes.json();
      if (Array.isArray(boardData) && boardData.length > 0) {
        const realEmps = boardData.filter((u: any) => u.employee);
        const listToUse = realEmps.length > 0 ? realEmps : boardData;
        const mapped: EmployeeItem[] = listToUse.map((u: any) => {
          const rawPos = u.employee?.position || u.position || '';
          const cleanPos = String(rawPos).startsWith('vtr-') ? '' : rawPos;
          return {
            id: u.employee?.id || u.id,
            code: u.employee?.code || u.code || '',
            employeeId: u.employee?.id || String(u.id),
            userId: String(u.id),
            name: u.employee?.fullName || u.name,
            department: u.employee?.departmentName || u.department || 'Công ty',
            departmentCode: u.employee?.departmentCode || u.departmentCode || '',
            position: cleanPos,
            phone: u.employee?.phone || u.phone || '',
            email: u.email || '',
          };
        });
        cachedEmployees = mapped;
        listeners.forEach((fn) => fn(mapped));
        listeners.length = 0;
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Không thể tải danh sách nhân viên:', err);
  } finally {
    isFetchingEmployees = false;
  }

  cachedEmployees = [];
  listeners.forEach((fn) => fn([]));
  listeners.length = 0;
  return [];
}

export interface EmployeeSelectProps {
  label?: string;
  required?: boolean;
  value?: string | string[];
  onChange?: (value: string, selectedEmployees?: EmployeeItem[]) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  departmentFilter?: string;
  employees?: EmployeeItem[];
  disabled?: boolean;
  error?: string;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  readOnly?: boolean;
  allowManualInput?: boolean;
  clearable?: boolean;
  showAllOption?: boolean;
  allOptionLabel?: string;
  hidePositionBadge?: boolean;
}

export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  label,
  required = false,
  value = '',
  onChange,
  multiple = true,
  placeholder = 'Chọn nhân viên...',
  searchPlaceholder = 'Gõ để lọc nhân viên, phòng ban...',
  departmentFilter,
  employees: propEmployees,
  disabled = false,
  error,
  className = '',
  style,
  inputStyle,
  readOnly = false,
  allowManualInput = true,
  clearable = true,
  showAllOption = false,
  allOptionLabel,
  hidePositionBadge = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [staffData, setStaffData] = useState<EmployeeItem[]>(
    propEmployees !== undefined ? propEmployees : (cachedEmployees || DEFAULT_EMPLOYEES)
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    minWidth: number;
    maxHeight: number;
  } | null>(null);

  const updateDropdownPosition = useCallback(() => {
    const el = inputWrapperRef.current || containerRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxMenuHeight = Math.min(260, Math.max(160, openUpward ? spaceAbove : spaceBelow));
    const effectiveWidth = Math.max(rect.width, 260);
    const leftPos =
      rect.left + effectiveWidth > viewportWidth - 8
        ? Math.max(8, viewportWidth - effectiveWidth - 8)
        : Math.max(8, rect.left);

    if (openUpward) {
      setDropdownRect({
        bottom: viewportHeight - rect.top + 4,
        left: leftPos,
        minWidth: rect.width,
        maxHeight: maxMenuHeight,
      });
    } else {
      setDropdownRect({
        top: rect.bottom + 4,
        left: leftPos,
        minWidth: rect.width,
        maxHeight: maxMenuHeight,
      });
    }
  }, []);

  // Tải danh sách nhân sự nếu chưa có
  useEffect(() => {
    if (propEmployees !== undefined) {
      setStaffData(propEmployees);
      return;
    }
    let cancelled = false;
    fetchEmployeesFromDb().then((data) => {
      if (!cancelled) {
        setStaffData(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [propEmployees]);

  // Click outside để đóng dropdown
  useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();
    const rafId = window.requestAnimationFrame(() => {
      updateDropdownPosition();
    });

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target && menuRef.current.contains(e.target as Node)) {
        return;
      }
      updateDropdownPosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateDropdownPosition]);

  // Focus ô tìm kiếm khi mở dropdown
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Theo dõi danh sách mã định danh (id) đang chọn để phân biệt chính xác các nhân sự trùng họ tên
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Chuẩn hoá mảng token đang được truyền qua value (hỗ trợ cả mã định danh id/code hoặc chuỗi hiển thị)
  const selectedTokens = useMemo<string[]>(() => {
    if (Array.isArray(value)) {
      return value.map((v) => v.replace(/\s*\(.*?\)/g, '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.replace(/\s*\(.*?\)/g, '').trim())
        .filter(Boolean);
    }
    return [];
  }, [value]);

  // Đồng bộ selectedIds từ value theo ưu tiên mã định danh (id / code / employeeId / userId) trước
  useEffect(() => {
    if (selectedTokens.length === 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prevIds) => {
      // Nếu các nhân sự trong prevIds đã khớp với selectedTokens thì giữ nguyên đúng mã định danh đã chọn
      const prevMatched = staffData.filter((s) => prevIds.includes(String(s.id)));
      if (
        prevMatched.length === selectedTokens.length &&
        prevMatched.every(
          (s, idx) =>
            String(s.id) === selectedTokens[idx] ||
            s.code === selectedTokens[idx] ||
            s.name === selectedTokens[idx]
        )
      ) {
        return prevIds;
      }

      const resolvedIds: string[] = [];
      for (const token of selectedTokens) {
        const byIdentifier = staffData.find(
          (s) =>
            String(s.id) === token ||
            (Boolean(s.code) && String(s.code) === token) ||
            (Boolean(s.employeeId) && String(s.employeeId) === token) ||
            (Boolean(s.userId) && String(s.userId) === token)
        );
        if (byIdentifier) {
          resolvedIds.push(String(byIdentifier.id));
          continue;
        }
        const byName = staffData.find(
          (s) =>
            s.name.toLowerCase() === token.toLowerCase() &&
            !resolvedIds.includes(String(s.id))
        );
        if (byName) {
          resolvedIds.push(String(byName.id));
        }
      }
      return resolvedIds;
    });
  }, [selectedTokens, staffData]);

  // Tìm nhân sự được chọn khi là single mode (multiple === false) ưu tiên theo mã định danh
  const singleSelectedEmp = useMemo(() => {
    if (multiple) return null;
    if (selectedIds[0]) {
      const byId = staffData.find((s) => String(s.id) === selectedIds[0]);
      if (byId) return byId;
    }
    const token = selectedTokens[0];
    if (!token) return null;
    return (
      staffData.find(
        (s) =>
          String(s.id) === token ||
          (Boolean(s.code) && String(s.code) === token) ||
          (Boolean(s.employeeId) && String(s.employeeId) === token) ||
          (Boolean(s.userId) && String(s.userId) === token)
      ) ||
      staffData.find((s) => s.name.toLowerCase() === token.toLowerCase()) ||
      null
    );
  }, [multiple, selectedIds, selectedTokens, staffData]);

  const inputValue = useMemo(() => {
    if (selectedIds.length > 0) {
      const matched = selectedIds
        .map((id) => staffData.find((s) => String(s.id) === id))
        .filter(Boolean) as EmployeeItem[];
      if (matched.length === selectedTokens.length) {
        return matched.map((m) => m.name).join(', ');
      }
    }
    if (Array.isArray(value)) {
      return value.map((v) => v.replace(/\s*\(.*?\)/g, '').trim()).join(', ');
    }
    if (!value) return '';
    return value.replace(/\s*\(.*?\)/g, '').trim();
  }, [value, selectedIds, selectedTokens, staffData]);

  // Lọc danh sách theo từ khoá tìm kiếm và mã phòng ban
  const filteredEmployees = useMemo(() => {
    let list = staffData;
    if (departmentFilter) {
      const df = departmentFilter.toLowerCase();
      list = list.filter(
        (e) =>
          (e.departmentCode && e.departmentCode.toLowerCase() === df) ||
          e.department.toLowerCase().includes(df)
      );
    }
    if (!searchTerm.trim()) return list;

    const q = searchTerm.toLowerCase();
    return list.filter(
      (e) =>
        String(e.id).toLowerCase().includes(q) ||
        (e.code && e.code.toLowerCase().includes(q)) ||
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        (e.position && e.position.toLowerCase().includes(q))
    );
  }, [staffData, departmentFilter, searchTerm]);

  // Xử lý khi chọn/bỏ chọn một nhân viên căn cứ theo mã định danh (staff.id)
  const handleToggle = (staff: EmployeeItem) => {
    if (disabled || readOnly) return;

    const targetId = String(staff.id);
    let nextIds: string[];
    if (multiple) {
      if (selectedIds.includes(targetId)) {
        nextIds = selectedIds.filter((id) => id !== targetId);
      } else {
        nextIds = [...selectedIds, targetId];
      }
    } else {
      nextIds = [targetId];
      setIsOpen(false);
    }

    setSelectedIds(nextIds);
    const selectedObjs = nextIds
      .map((id) => staffData.find((s) => String(s.id) === id))
      .filter(Boolean) as EmployeeItem[];
    const updatedStr = selectedObjs.map((s) => s.name).join(', ');
    onChange?.(updatedStr, selectedObjs);
  };

  // Cho phép nhập tay trực tiếp nếu allowManualInput = true
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
    const selectedObjs = parts
      .map(
        (token) =>
          staffData.find(
            (s) =>
              String(s.id) === token ||
              (Boolean(s.code) && String(s.code) === token) ||
              s.name.toLowerCase() === token.toLowerCase()
          ) || null
      )
      .filter(Boolean) as EmployeeItem[];
    setSelectedIds(selectedObjs.map((s) => String(s.id)));
    onChange?.(val, selectedObjs);
  };

  return (
    <div
      ref={containerRef}
      className={`form-group ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        marginBottom: 0,
        ...style,
      }}
    >
      {label && (
        <label
          className="form-label"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>}
        </label>
      )}

      {/* Ô input chính */}
      <div ref={inputWrapperRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          className="form-input form-control"
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          readOnly={!allowManualInput || readOnly}
          onChange={handleInputChange}
          onClick={() => {
            if (!disabled && !readOnly) {
              setIsOpen((prev) => !prev);
            }
          }}
          style={{
            width: '100%',
            height: '36px',
            padding: '5px 30px 5px 10px',
            paddingRight: !hidePositionBadge && singleSelectedEmp && (singleSelectedEmp.position || singleSelectedEmp.department) ? '135px' : (clearable && selectedTokens.length > 0 ? '44px' : '28px'),
            borderRadius: 'var(--radius-sm, 6px)',
            border: `1px solid ${error ? 'var(--color-danger, #ef4444)' : isOpen ? 'var(--color-primary, #4f46e5)' : 'var(--border-default, #cbd5e1)'}`,
            fontSize: '0.8125rem',
            outline: 'none',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            cursor: !allowManualInput ? 'pointer' : 'text',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: isOpen ? '0 0 0 2px rgba(79, 70, 229, 0.15)' : 'none',
            ...inputStyle,
          }}
        />

        {/* Hiển thị chức vụ sang cạnh phải của ô nhập liệu (không dùng ngoặc đơn) */}
        {!hidePositionBadge && singleSelectedEmp && (singleSelectedEmp.position || singleSelectedEmp.department) && (
          <span
            style={{
              position: 'absolute',
              right: clearable && selectedTokens.length > 0 && !disabled && !readOnly ? '42px' : '26px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#0369a1',
              backgroundColor: '#e0f2fe',
              padding: '2px 7px',
              borderRadius: '4px',
              border: '1px solid #bae6fd',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              maxWidth: '105px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={singleSelectedEmp.position || singleSelectedEmp.department}
          >
            {singleSelectedEmp.position || singleSelectedEmp.department}
          </span>
        )}

        {/* Nút xoá nhanh khi đã chọn nhân viên */}
        {clearable && selectedTokens.length > 0 && !disabled && !readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIds([]);
              onChange?.('', []);
            }}
            title="Bỏ chọn / Xem tất cả"
            style={{
              position: 'absolute',
              right: '22px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          disabled={disabled || readOnly}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled && !readOnly) {
              setIsOpen((prev) => !prev);
            }
          }}
          title="Chọn nhân sự công ty"
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronDown
            size={14}
            style={{
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
      </div>

      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '3px' }}>
          {error}
        </span>
      )}

      {/* Dropdown danh sách gợi ý nhân viên nội bộ */}
      {isOpen &&
        !disabled &&
        dropdownRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              bottom: dropdownRect.bottom,
              left: dropdownRect.left,
              minWidth: dropdownRect.minWidth,
              width: 'max-content',
              maxWidth: 'min(420px, calc(100vw - 16px))',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
              zIndex: 100000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: dropdownRect.maxHeight,
              animation: 'fadeIn 0.12s ease-out',
            }}
          >
          {/* Ô tìm kiếm lọc theo ký tự */}
          <div
            style={{
              padding: '6px 8px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={12}
                style={{ position: 'absolute', left: '8px', color: '#94a3b8' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px 24px 4px 26px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: "'Roboto Condensed', sans-serif",
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Danh sách nhân viên: Họ tên bên trái, Phòng ban căn thẳng bên phải */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '180px' }}>
            {showAllOption && (
              <div
                onClick={() => {
                  setSelectedIds([]);
                  onChange?.('', []);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: selectedTokens.length === 0 ? '#f0f9ff' : 'transparent',
                  transition: 'background-color 0.12s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (selectedTokens.length !== 0) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (selectedTokens.length !== 0) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  checked={selectedTokens.length === 0}
                  onChange={() => {}}
                  style={{
                    width: '15px',
                    height: '15px',
                    marginRight: '8px',
                    cursor: 'pointer',
                    accentColor: '#0284c7',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: selectedTokens.length === 0 ? 700 : 500,
                    fontSize: '0.8125rem',
                    color: selectedTokens.length === 0 ? '#0284c7' : '#1e293b',
                  }}
                >
                  {allOptionLabel || `Tất cả nhân sự (${staffData.length})`}
                </span>
              </div>
            )}
            {filteredEmployees.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                }}
              >
                Không tìm thấy nhân viên phù hợp
              </div>
            ) : (
              filteredEmployees.map((staff) => {
                const selected = selectedIds.includes(String(staff.id));
                return (
                  <div
                    key={String(staff.id)}
                    onClick={() => handleToggle(staff)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      backgroundColor: selected ? '#f0f9ff' : 'transparent',
                      transition: 'background-color 0.12s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      checked={selected}
                      onChange={() => {}} // Xử lý qua div onClick
                      style={{
                        width: '15px',
                        height: '15px',
                        marginRight: '8px',
                        cursor: 'pointer',
                        accentColor: '#0284c7',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginRight: '12px',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: selected ? 700 : 500,
                          fontSize: '0.8125rem',
                          color: selected ? '#0284c7' : '#1e293b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {staff.name}
                      </span>
                      {staff.code && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {staff.code}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {departmentFilter ? (staff.position || staff.department) : staff.department}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Thanh footer đóng dropdown */}
          <div
            style={{
              padding: '5px 8px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            <span>
              Đã chọn: <strong>{selectedIds.length}</strong> {multiple ? 'người' : ''}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '2px 6px',
              }}
            >
              Xong
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
