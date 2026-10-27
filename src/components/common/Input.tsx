import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefix?: React.ReactNode | string;
  suffix?: React.ReactNode | string;
  isPasswordToggle?: boolean;
  numberGroup?: boolean;       // Định dạng nhóm phân tách hàng nghìn (mặc định true khi type="number")
  hideZero?: boolean;          // Không mặc định hiển thị chữ số 0 (mặc định true khi type="number")
  allowDecimal?: boolean;      // Chấp nhận cả dấu '.' và dấu ',' khi nhập số thập phân (mặc định true khi type="number")
  allowNegative?: boolean;     // Cho phép nhập số âm
  onNumericChange?: (numericVal: number, cleanString: string) => void;
}

/**
 * Parse chuỗi thông minh nhận diện số nguyên, số thực, chấp nhận cả dấu '.' và ','
 */
export function parseSmartNumber(input: number | string | readonly string[] | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (Array.isArray(input)) input = input[0];
  if (typeof input === 'number') return isNaN(input) ? null : input;

  let str = String(input).trim().replace(/\s+/g, '');
  if (str === '') return null;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // European/VN: 1.234,56
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234.56
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && Number(parts[0]) > 0 && !str.startsWith('0')) {
      str = str.replace(',', '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (hasDot) {
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length >= 3 && parts[0].length <= 3 && Number(parts[0]) > 0 && !str.startsWith('0')) {
      str = str.replace('.', '');
    } else if (parts.length > 2) {
      str = str.replace(/\./g, '');
    }
  }

  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Định dạng số hiển thị cho input (chuẩn vi-VN: phân tách hàng nghìn bằng '.', thập phân bằng ',')
 */
export function formatNumericDisplay(
  val: number | string | readonly string[] | null | undefined,
  hideZero = true,
  numberGroup = true
): string {
  if (val === null || val === undefined || val === '') return '';
  if (Array.isArray(val)) val = val[0];
  const num = parseSmartNumber(val);
  if (num === null) return '';
  if (hideZero && num === 0) return '';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const str = String(absNum);
  const parts = str.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let formattedInteger = integerPart;
  if (numberGroup) {
    formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const sign = isNegative ? '-' : '';
  if (decimalPart !== undefined) {
    return `${sign}${formattedInteger},${decimalPart}`;
  }
  return `${sign}${formattedInteger}`;
}

/**
 * Định dạng giá trị khi đang gõ (typing), giữ nguyên ý đồ của người dùng (dấu phẩy/chấm ở cuối, số 0 sau thập phân...)
 */
export function formatTypingValue(
  raw: string,
  allowDecimal = true,
  numberGroup = true,
  allowNegative = false
): { display: string; numeric: number; cleanString: string } {
  if (!raw || raw.trim() === '') {
    return { display: '', numeric: 0, cleanString: '' };
  }

  let str = raw.trim();

  // Cho phép dấu âm nếu bắt đầu bằng '-' và allowNegative = true
  const isNegative = allowNegative && str.startsWith('-');
  if (str.startsWith('-')) str = str.slice(1);

  // Nếu người dùng vừa gõ dấu '.' hoặc ',' khi ô đang trống
  if ((str === '.' || str === ',') && allowDecimal) {
    return {
      display: (isNegative ? '-' : '') + '0,',
      numeric: 0,
      cleanString: (isNegative ? '-' : '') + '0.',
    };
  }

  let hasDecimal = false;
  let integerRaw = '';
  let decimalRaw = '';

  if (!allowDecimal) {
    integerRaw = str.replace(/\D/g, '');
  } else {
    const commaIndex = str.indexOf(',');
    if (commaIndex !== -1) {
      hasDecimal = true;
      integerRaw = str.slice(0, commaIndex).replace(/\./g, '');
      decimalRaw = str.slice(commaIndex + 1).replace(/\D/g, '');
    } else if (str.endsWith('.')) {
      hasDecimal = true;
      integerRaw = str.slice(0, -1).replace(/\./g, '');
      decimalRaw = '';
    } else {
      const dotIndex = str.lastIndexOf('.');
      if (dotIndex !== -1) {
        const afterDot = str.slice(dotIndex + 1);
        const parts = str.split('.');
        if (parts.length === 2 && afterDot.length < 3) {
          hasDecimal = true;
          integerRaw = parts[0];
          decimalRaw = afterDot;
        } else {
          integerRaw = str.replace(/\./g, '');
        }
      } else {
        integerRaw = str;
      }
    }
  }

  // Lọc chỉ giữ chữ số cho phần nguyên
  integerRaw = integerRaw.replace(/\D/g, '');

  if (!integerRaw && !hasDecimal) {
    return { display: isNegative ? '-' : '', numeric: 0, cleanString: isNegative ? '-' : '' };
  }

  // Bỏ số 0 ở đầu phần nguyên (ví dụ 05 -> 5) trừ khi đó là '0'
  if (integerRaw.length > 1 && integerRaw.startsWith('0')) {
    integerRaw = integerRaw.replace(/^0+/, '');
    if (integerRaw === '') integerRaw = '0';
  }

  let formattedInteger = integerRaw;
  if (numberGroup && integerRaw) {
    formattedInteger = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } else if (!integerRaw && hasDecimal) {
    formattedInteger = '0';
  }

  let display = (isNegative ? '-' : '') + formattedInteger;
  if (hasDecimal && allowDecimal) {
    display += ',' + decimalRaw;
  }

  let cleanString = '';
  let numeric = 0;
  if (integerRaw || (hasDecimal && decimalRaw)) {
    cleanString = (isNegative ? '-' : '') + (integerRaw || '0') + (hasDecimal ? '.' + (decimalRaw || '') : '');
    numeric = Number(cleanString) || 0;
  }

  return { display, numeric, cleanString };
}

/**
 * Tính vị trí con trỏ sau khi format
 */
function getNewCursorPosition(oldText: string, newText: string, oldCursor: number): number {
  let nonSeparatorBeforeCursor = 0;
  for (let i = 0; i < oldCursor && i < oldText.length; i++) {
    if (oldText[i] !== '.') {
      nonSeparatorBeforeCursor++;
    }
  }
  let newCursor = 0;
  let count = 0;
  while (newCursor < newText.length && count < nonSeparatorBeforeCursor) {
    if (newText[newCursor] !== '.') {
      count++;
    }
    newCursor++;
  }
  return newCursor;
}

/**
 * Tạo synthetic event tương thích với onChange của HTMLInputElement
 */
function createSyntheticEvent(
  originalEvent: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
  cleanValue: string,
  numericValue: number
): React.ChangeEvent<HTMLInputElement> {
  const currentTarget = originalEvent.currentTarget || originalEvent.target;
  const target = Object.create(currentTarget, {
    value: { value: cleanValue, writable: true, enumerable: true, configurable: true },
    valueAsNumber: { value: numericValue, writable: true, enumerable: true, configurable: true },
  });

  return {
    ...originalEvent,
    target,
    currentTarget: target,
  } as React.ChangeEvent<HTMLInputElement>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      prefix,
      suffix,
      isPasswordToggle = false,
      type = 'text',
      className = '',
      id,
      style,
      numberGroup,
      hideZero,
      allowDecimal,
      allowNegative = false,
      onNumericChange,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Xác định chế độ số
    const isNumeric = type === 'number' || numberGroup === true;
    const effectiveHideZero = hideZero !== undefined ? hideZero : isNumeric;
    const effectiveNumberGroup = numberGroup !== undefined ? numberGroup : isNumeric;
    const effectiveAllowDecimal = allowDecimal !== undefined ? allowDecimal : isNumeric;

    // Giá trị hiển thị trên ô nhập
    const [displayValue, setDisplayValue] = useState<string>(() => {
      if (!isNumeric) return (value as string) ?? '';
      return formatNumericDisplay(value, effectiveHideZero, effectiveNumberGroup);
    });

    // Đồng bộ khi value prop bên ngoài thay đổi
    useEffect(() => {
      if (!isNumeric) {
        return;
      }

      const currentParsed = parseSmartNumber(displayValue) ?? 0;
      const incomingParsed = parseSmartNumber(value) ?? 0;

      // Nếu giá trị truyền vào là 0 (hoặc rỗng) và hideZero đang bật
      if (effectiveHideZero && (incomingParsed === 0 || value === '' || value === null || value === undefined)) {
        if (!isFocused && displayValue !== '') {
          setDisplayValue('');
        }
        return;
      }

      // Khi không focus hoặc giá trị số prop thực sự khác giá trị đang hiển thị
      if (!isFocused || currentParsed !== incomingParsed) {
        setDisplayValue(formatNumericDisplay(value, effectiveHideZero, effectiveNumberGroup));
      }
    }, [value, isNumeric, effectiveHideZero, effectiveNumberGroup, isFocused]);

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const actualType = isPasswordToggle
      ? showPassword ? 'text' : 'password'
      : isNumeric ? 'text' : type;

    // Gán ref cho cả innerRef và forwarded ref
    const handleRef = (node: HTMLInputElement | null) => {
      (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    };

    // Xử lý thay đổi dữ liệu khi người dùng gõ
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isNumeric) {
        if (onChange) onChange(e);
        return;
      }

      const inputEl = e.target;
      const raw = inputEl.value;
      const oldCursor = inputEl.selectionStart || raw.length;

      // Nếu người dùng xóa rỗng ô input
      if (!raw || raw.trim() === '') {
        setDisplayValue('');
        if (onNumericChange) onNumericChange(0, '');
        if (onChange) {
          const synthetic = createSyntheticEvent(e, '', 0);
          onChange(synthetic);
        }
        return;
      }

      const { display, numeric, cleanString } = formatTypingValue(
        raw,
        effectiveAllowDecimal,
        effectiveNumberGroup,
        allowNegative
      );

      const newCursor = getNewCursorPosition(raw, display, oldCursor);
      setDisplayValue(display);

      if (onNumericChange) onNumericChange(numeric, cleanString);

      if (onChange) {
        const synthetic = createSyntheticEvent(e, cleanString, numeric);
        onChange(synthetic);
      }

      requestAnimationFrame(() => {
        if (innerRef.current && document.activeElement === innerRef.current) {
          innerRef.current.setSelectionRange(newCursor, newCursor);
        }
      });
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumeric) {
        setIsFocused(true);
      }
      if (onFocus) onFocus(e);
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isNumeric) {
        setIsFocused(false);
        const num = parseSmartNumber(displayValue) ?? 0;
        if (effectiveHideZero && num === 0) {
          if (displayValue !== '') {
            setDisplayValue('');
            if (onChange) {
              const synthetic = createSyntheticEvent(e, '', 0);
              onChange(synthetic);
            }
          }
        } else if (displayValue.endsWith(',')) {
          const trimmed = displayValue.slice(0, -1);
          setDisplayValue(trimmed);
        }
      }
      if (onBlur) onBlur(e);
    };

    // Hiển thị phần đuôi (suffix hoặc rightIcon hoặc password toggle)
    const effectivePrefix = prefix !== undefined ? prefix : leftIcon;
    const effectiveSuffix = suffix !== undefined ? suffix : rightIcon;

    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
        )}
        <div className="input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {effectivePrefix && (
            <span
              className="input-icon-prefix"
              style={{
                position: 'absolute',
                left: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                pointerEvents: 'none',
                userSelect: 'none',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary, #64748b)',
                fontWeight: 500,
                zIndex: 2,
              }}
            >
              {effectivePrefix}
            </span>
          )}
          <input
            id={inputId}
            ref={handleRef}
            type={actualType}
            inputMode={isNumeric ? 'decimal' : undefined}
            value={isNumeric ? displayValue : value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={`form-input ${effectivePrefix ? 'has-prefix' : ''} ${
              effectiveSuffix || isPasswordToggle ? 'has-suffix' : ''
            } ${error ? 'is-error' : ''}`}
            style={{
              paddingLeft: effectivePrefix ? '32px' : undefined,
              paddingRight: effectiveSuffix ? (typeof effectiveSuffix === 'string' && effectiveSuffix.length > 2 ? '48px' : '36px') : undefined,
              ...style,
            }}
            {...props}
          />
          {isPasswordToggle ? (
            <button
              type="button"
              className="input-icon-suffix"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              tabIndex={-1}
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          ) : (
            effectiveSuffix && (
              <span
                className="input-icon-suffix"
                style={{
                  position: 'absolute',
                  right: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                  zIndex: 2,
                }}
              >
                {effectiveSuffix}
              </span>
            )
          )}
        </div>
        {error ? (
          <span className="form-helper is-error">{error}</span>
        ) : helperText ? (
          <span
            className="form-helper"
            style={{
              display: 'block',
              marginTop: '4px',
              fontSize: '0.75rem',
              color: typeof helperText === 'string' && helperText.includes('Chưa có dữ liệu')
                ? '#d97706'
                : typeof helperText === 'string' && helperText.includes('Tạm tính')
                ? '#059669'
                : typeof helperText === 'string' && helperText.includes('Không có yêu cầu')
                ? '#64748b'
                : 'var(--text-muted)',
              fontWeight: typeof helperText === 'string' && (helperText.includes('Chưa có dữ liệu') || helperText.includes('Tạm tính')) ? 600 : 500,
            }}
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
