import React, { forwardRef, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check2 } from 'react-bootstrap-icons';

export interface SelectOption {
  value: string;
  label: string;
  rightLabel?: React.ReactNode;
  disabled?: boolean;
}

interface ParsedOptionItem {
  value: string;
  label: React.ReactNode;
  rightLabel?: React.ReactNode;
  textLabel: string;
  disabled?: boolean;
  isGroupHeader?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  ariaLabel?: string;
}

function extractTextFromNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
  if (React.isValidElement(node)) {
    return extractTextFromNode((node.props as any)?.children);
  }
  return '';
}

function parseChildrenToOptions(children: React.ReactNode): ParsedOptionItem[] {
  const result: ParsedOptionItem[] = [];

  const traverse = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as any;

      if (child.type === React.Fragment) {
        traverse(props.children);
        return;
      }

      if (child.type === 'optgroup') {
        result.push({
          value: `__group_${props.label || result.length}`,
          label: props.label || '',
          textLabel: String(props.label || ''),
          isGroupHeader: true,
          disabled: true,
        });
        traverse(props.children);
        return;
      }

      if (child.type === 'option') {
        const textLabel = extractTextFromNode(props.children);
        const val = props.value !== undefined ? String(props.value) : textLabel;
        result.push({
          value: val,
          label: props.children,
          textLabel,
          disabled: Boolean(props.disabled),
        });
      }
    });
  };

  traverse(children);
  return result;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      options,
      children,
      className = '',
      id,
      ariaLabel,
      value,
      defaultValue,
      onChange,
      disabled,
      style,
      title,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const parsedOptions = useMemo<ParsedOptionItem[]>(() => {
      if (options && options.length > 0) {
        return options.map((opt) => ({
          value: String(opt.value),
          label: opt.label,
          rightLabel: opt.rightLabel,
          textLabel: opt.label,
          disabled: opt.disabled,
        }));
      }
      return parseChildrenToOptions(children);
    }, [options, children]);

    const firstSelectableValue = useMemo(() => {
      const first = parsedOptions.find((o) => !o.isGroupHeader);
      return first ? first.value : '';
    }, [parsedOptions]);

    const [internalValue, setInternalValue] = useState<string>(() => {
      if (value !== undefined) return String(value);
      if (defaultValue !== undefined) return String(defaultValue);
      return firstSelectableValue;
    });

    const currentValue = value !== undefined ? String(value) : internalValue;

    const selectedOption = useMemo(() => {
      return (
        parsedOptions.find((o) => !o.isGroupHeader && o.value === currentValue) ||
        parsedOptions.find((o) => !o.isGroupHeader) ||
        null
      );
    }, [parsedOptions, currentValue]);

    const [isOpen, setIsOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState<{
      top?: number;
      bottom?: number;
      left: number;
      minWidth: number;
      maxHeight: number;
    } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);

    const setMergedRef = useCallback(
      (node: HTMLSelectElement | null) => {
        hiddenSelectRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
        }
      },
      [ref]
    );

    const updateDropdownPosition = useCallback(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

      const maxMenuHeight = Math.min(280, Math.max(140, openUpward ? spaceAbove : spaceBelow));
      const measuredMenuWidth = menuRef.current ? menuRef.current.offsetWidth : rect.width;
      const effectiveWidth = Math.max(rect.width, measuredMenuWidth);
      const leftPos =
        rect.left + effectiveWidth > viewportWidth - 8
          ? Math.max(8, rect.right - effectiveWidth)
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

    useEffect(() => {
      if (!isOpen) return;
      updateDropdownPosition();
      const rafId = window.requestAnimationFrame(() => {
        updateDropdownPosition();
      });

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          containerRef.current &&
          !containerRef.current.contains(target) &&
          menuRef.current &&
          !menuRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };

      const handleScrollOrResize = (e: Event) => {
        if (menuRef.current && e.target && menuRef.current.contains(e.target as Node)) {
          return;
        }
        updateDropdownPosition();
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);

      return () => {
        window.cancelAnimationFrame(rafId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }, [isOpen, updateDropdownPosition]);

    // Tự động cuộn tới mục đang chọn khi mở menu
    useEffect(() => {
      if (isOpen && menuRef.current) {
        const activeEl = menuRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [isOpen]);

    const handleSelectOption = (opt: ParsedOptionItem) => {
      if (opt.disabled || opt.isGroupHeader) return;
      setInternalValue(opt.value);
      setIsOpen(false);

      if (onChange) {
        const syntheticEvent = {
          target: {
            value: opt.value,
            name: props.name || '',
            id: selectId || '',
          },
          currentTarget: {
            value: opt.value,
            name: props.name || '',
            id: selectId || '',
          },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div ref={containerRef} className={`form-group ${className}`} style={{ marginBottom: style?.marginBottom }}>
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
        )}
        <div className="select-container" style={{ position: 'relative' }}>
          {leftIcon && <span className="input-icon-prefix">{leftIcon}</span>}

          {/* Hidden native select for form/accessibility/ref compatibility */}
          <select
            id={selectId}
            ref={setMergedRef}
            value={currentValue}
            onChange={(e) => {
              setInternalValue(e.target.value);
              onChange?.(e);
            }}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 0,
              height: 0,
              overflow: 'hidden',
            }}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom Styled Trigger Button */}
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            title={title || selectedOption?.textLabel}
            aria-label={ariaLabel || props['aria-label'] || label || selectedOption?.textLabel}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
              }
            }}
            className={`form-select ${leftIcon ? 'has-prefix' : ''} ${error ? 'is-error' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              borderColor: isOpen ? 'var(--border-focus, #0284c7)' : undefined,
              boxShadow: isOpen ? '0 0 0 3px var(--color-primary-glow, rgba(2, 132, 199, 0.15))' : undefined,
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...style,
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                flex: 1,
              }}
            >
              {selectedOption ? selectedOption.label : ''}
            </span>
            {selectedOption?.rightLabel !== undefined && selectedOption?.rightLabel !== null && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  flexShrink: 0,
                }}
              >
                {selectedOption.rightLabel}
              </span>
            )}
          </button>

          <span
            className="select-arrow"
            aria-hidden="true"
            style={{
              transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
              transition: 'transform 0.18s ease, color 0.15s ease',
              color: isOpen ? 'var(--color-primary, #0284c7)' : undefined,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        {/* Custom Dropdown Menu via Portal */}
        {isOpen &&
          dropdownRect &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{
                position: 'fixed',
                top: dropdownRect.top,
                bottom: dropdownRect.bottom,
                left: dropdownRect.left,
                minWidth: dropdownRect.minWidth,
                maxWidth: 'min(420px, 94vw)',
                maxHeight: dropdownRect.maxHeight,
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow:
                  '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                padding: '4px',
                zIndex: 100000,
              }}
            >
              {parsedOptions.length === 0 ? (
                <div
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                  }}
                >
                  Không có lựa chọn
                </div>
              ) : (
                parsedOptions.map((opt, idx) => {
                  if (opt.isGroupHeader) {
                    return (
                      <div
                        key={`${opt.value}-${idx}`}
                        style={{
                          padding: '6px 10px 4px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                          marginTop: idx > 0 ? '3px' : 0,
                        }}
                      >
                        {opt.label}
                      </div>
                    );
                  }

                  const isSelected = opt.value === currentValue;
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => handleSelectOption(opt)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: opt.disabled
                          ? '#94a3b8'
                          : isSelected
                          ? '#0369a1'
                          : '#1e293b',
                        backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'background-color 0.12s ease, color 0.12s ease',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!opt.disabled && !isSelected) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!opt.disabled && !isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.rightLabel !== undefined && opt.rightLabel !== null ? (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '0.75rem',
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? '#0284c7' : '#64748b',
                            flexShrink: 0,
                            textAlign: 'right',
                          }}
                        >
                          {opt.rightLabel}
                        </span>
                      ) : (
                        isSelected && (
                          <Check2
                            size={15}
                            style={{ color: '#0284c7', flexShrink: 0, marginLeft: 'auto' }}
                          />
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>,
            document.body
          )}

        {error ? (
          <span className="form-helper is-error">{error}</span>
        ) : helperText ? (
          <span
            className="form-helper"
            style={{
              display: 'block',
              marginTop: '4px',
              fontSize: '0.75rem',
              color:
                typeof helperText === 'string' && helperText.includes('Không có yêu cầu')
                  ? '#64748b'
                  : 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
