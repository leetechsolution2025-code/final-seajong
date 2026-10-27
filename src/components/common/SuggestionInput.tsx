import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check2, X } from 'react-bootstrap-icons';

export interface SuggestionItem {
  id?: string;
  value: string;
  label?: string;
  subText?: string;
  category?: string;
  badge?: string;
}

export interface SuggestionInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onSelect'> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (item: SuggestionItem) => void;
  suggestions: (SuggestionItem | string)[];
  placeholder?: string;
  emptyMessage?: string;
  maxSuggestions?: number;
  containerStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  showClearButton?: boolean;
}

/**
 * Hàm loại bỏ dấu tiếng Việt để tìm kiếm thông minh
 */
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Component SuggestionInput: Ô nhập liệu có danh sách gợi ý và tự động lọc thời gian thực.
 * Chuẩn Design System Deco Door: Hỗ trợ gõ tự do, tìm kiếm nhanh, phân nhóm danh mục.
 */
export const SuggestionInput: React.FC<SuggestionInputProps> = ({
  label,
  required = false,
  error,
  helperText,
  value = '',
  onChange,
  onSelectSuggestion,
  suggestions,
  placeholder = 'Nhập hoặc chọn gợi ý...',
  emptyMessage = 'Không tìm thấy gợi ý phù hợp',
  maxSuggestions = 50,
  containerStyle,
  inputStyle,
  showClearButton = true,
  disabled = false,
  readOnly = false,
  className = '',
  id,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  // Đánh dấu người dùng đang trực tiếp gõ tìm kiếm
  const [isTyping, setIsTyping] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);

  // Chuẩn hoá mảng gợi ý thành mảng SuggestionItem
  const normalizedSuggestions = useMemo<SuggestionItem[]>(() => {
    return suggestions.map((item) => {
      if (typeof item === 'string') {
        return { value: item, label: item };
      }
      return {
        ...item,
        label: item.label || item.value,
      };
    });
  }, [suggestions]);

  // Lọc gợi ý: Khi người dùng mở xem (click/focus), luôn hiển thị TOÀN BỘ danh sách gợi ý để người dùng chọn.
  // Chỉ lọc khi người dùng đang thực sự gõ phím (isTyping = true)
  const filteredSuggestions = useMemo<SuggestionItem[]>(() => {
    if (!isTyping || !value || !value.trim()) {
      return normalizedSuggestions.slice(0, maxSuggestions);
    }
    const cleanKeyword = removeVietnameseTones(value);
    const matched = normalizedSuggestions.filter((item) => {
      const cleanVal = removeVietnameseTones(item.value);
      const cleanLabel = removeVietnameseTones(item.label || '');
      const cleanSub = removeVietnameseTones(item.subText || '');
      const cleanCat = removeVietnameseTones(item.category || '');
      return (
        cleanVal.includes(cleanKeyword) ||
        cleanLabel.includes(cleanKeyword) ||
        cleanSub.includes(cleanKeyword) ||
        cleanCat.includes(cleanKeyword)
      );
    });
    return matched.slice(0, maxSuggestions);
  }, [value, isTyping, normalizedSuggestions, maxSuggestions]);

  // Tính toán hướng mở (lên trên hoặc xuống dưới) dựa trên không gian màn hình thực tế
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const count = filteredSuggestions.length;
      const estimatedHeight = Math.min(240, Math.max(70, count * 36 + 16));

      // Chỉ lật lên trên nếu khoảng trống phía dưới màn hình thực sự không đủ và phía trên đủ chỗ
      if (spaceBelow < estimatedHeight && rect.top > estimatedHeight + 30) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, filteredSuggestions.length]);

  // Nhóm các gợi ý theo category nếu có
  const groupedSuggestions = useMemo<{ category: string; items: SuggestionItem[] }[]>(() => {
    const hasCategory = filteredSuggestions.some((s) => !!s.category);
    if (!hasCategory) {
      return [{ category: '', items: filteredSuggestions }];
    }

    const groups: { [key: string]: SuggestionItem[] } = {};
    filteredSuggestions.forEach((item) => {
      const cat = item.category || 'Khác';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    return Object.keys(groups).map((category) => ({
      category,
      items: groups[category],
    }));
  }, [filteredSuggestions]);

  // Click outside listener
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const handleSelect = (item: SuggestionItem) => {
    setIsTyping(false);
    onChange(item.value);
    onSelectSuggestion?.(item);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
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
        zIndex: isOpen ? 9999 : undefined,
        ...containerStyle,
      }}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="form-label"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-primary, #0f172a)',
            marginBottom: '4px',
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>}
        </label>
      )}

      {/* Khung ô input chính */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          className="form-input form-control"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off"
          onChange={(e) => {
            setIsTyping(true);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (!disabled && !readOnly) {
              setIsOpen(true);
              setIsTyping(false);
              inputRef.current?.select();
            }
          }}
          onClick={() => {
            if (!disabled && !readOnly) {
              setIsOpen(true);
              setIsTyping(false);
            }
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '36px',
            padding: showClearButton ? '5px 52px 5px 10px' : '5px 28px 5px 10px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: `1px solid ${
              error
                ? 'var(--color-danger, #ef4444)'
                : isOpen
                ? 'var(--color-primary, #0284c7)'
                : 'var(--border-default, #cbd5e1)'
            }`,
            fontSize: '0.8125rem',
            outline: 'none',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            boxShadow: isOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
            ...inputStyle,
          }}
          {...props}
        />

        {/* Các nút bấm tiện ích bên phải ô input */}
        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {showClearButton && value && !disabled && !readOnly && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsTyping(true);
                inputRef.current?.focus();
                setIsOpen(true);
              }}
              title="Xoá nội dung"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
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
            onClick={() => {
              if (!disabled && !readOnly) {
                setIsOpen((prev) => !prev);
                setIsTyping(false);
                inputRef.current?.focus();
              }
            }}
            title="Xem danh sách gợi ý"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
          >
            <ChevronDown
              size={13}
              style={{
                transition: 'transform 0.2s ease',
                transform: isOpen ? (openUpward ? 'none' : 'rotate(180deg)') : (openUpward ? 'rotate(180deg)' : 'none'),
              }}
            />
          </button>
        </div>
      </div>

      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '3px' }}>
          {error}
        </span>
      )}
      {helperText && !error && (
        <span
          style={{
            fontSize: '0.75rem',
            color: helperText.includes('Chưa có dữ liệu')
              ? '#d97706'
              : helperText.includes('Tạm tính')
              ? '#059669'
              : helperText.includes('Không có yêu cầu')
              ? '#64748b'
              : 'var(--text-muted)',
            fontWeight: helperText.includes('Chưa có dữ liệu') || helperText.includes('Tạm tính') ? 600 : 500,
            display: 'block',
            marginTop: '4px',
          }}
        >
          {helperText}
        </span>
      )}

      {/* Menu thả xuống gợi ý */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            ...(openUpward
              ? { bottom: 'calc(100% + 4px)' }
              : { top: 'calc(100% + 4px)' }),
            left: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '280px',
            maxHeight: '240px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.16), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 10000,
            padding: '4px 0',
          }}
        >
          {filteredSuggestions.length === 0 ? (
            <div
              style={{
                padding: '12px 14px',
                fontSize: '0.78125rem',
                color: '#94a3b8',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              {emptyMessage}
            </div>
          ) : (
            groupedSuggestions.map((group, gIdx) => (
              <div key={group.category || gIdx}>
                {group.category && (
                  <div
                    style={{
                      padding: '6px 12px 3px 12px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      backgroundColor: '#f8fafc',
                      borderTop: gIdx > 0 ? '1px solid #f1f5f9' : 'none',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {group.category}
                  </div>
                )}
                {group.items.map((item) => {
                  const isSelected = item.value === value;
                  return (
                    <div
                      key={item.id || item.value}
                      onClick={() => handleSelect(item)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.78125rem',
                        color: isSelected ? '#0369a1' : '#1e293b',
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ lineHeight: 1.35 }}>{item.label || item.value}</span>
                        {isSelected && <Check2 size={14} style={{ color: '#0284c7', flexShrink: 0 }} />}
                      </div>
                      {(item.subText || item.badge) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: '#64748b' }}>
                          {item.subText && <span>{item.subText}</span>}
                          {item.badge && (
                            <span
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
