import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar3, ChevronLeft, ChevronRight, XLg, Clock } from 'react-bootstrap-icons';

export interface DatePickerProps {
  label?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  showTime?: boolean;
  defaultEndOfDayTime?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

const WEEKDAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function parseDateValue(raw?: string): {
  year: number;
  month: number; // 0-11
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
} | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Format: YYYY-MM-DD or YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3]),
      hours: isoMatch[4] !== undefined ? Number(isoMatch[4]) : 0,
      minutes: isoMatch[5] !== undefined ? Number(isoMatch[5]) : 0,
      seconds: isoMatch[6] !== undefined ? Number(isoMatch[6]) : 0,
    };
  }

  // Format: DD/MM/YYYY
  const vnMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (vnMatch) {
    return {
      year: Number(vnMatch[3]),
      month: Number(vnMatch[2]) - 1,
      day: Number(vnMatch[1]),
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
      seconds: d.getSeconds(),
    };
  }
  return null;
}

function formatDisplayDate(
  parsed: ReturnType<typeof parseDateValue>,
  showTime = false
): string {
  if (!parsed) return '';
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month + 1).padStart(2, '0');
  const yyyy = parsed.year;
  if (!showTime) {
    return `${dd}/${mm}/${yyyy}`;
  }
  const hh = String(parsed.hours).padStart(2, '0');
  const mi = String(parsed.minutes).padStart(2, '0');
  const ss = String(parsed.seconds).padStart(2, '0');
  return `${hh}:${mi}:${ss} ${dd}/${mm}/${yyyy}`;
}

function buildIsoString(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  showTime: boolean
): string {
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  if (!showTime) {
    return `${yyyy}-${mm}-${dd}`;
  }
  const hh = String(hours).padStart(2, '0');
  const mi = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  required,
  value = '',
  onChange,
  placeholder = 'Chọn ngày...',
  prefix,
  showTime = false,
  defaultEndOfDayTime = false,
  clearable = false,
  disabled = false,
  className = '',
  style,
  title,
}) => {
  const parsedValue = useMemo(() => parseDateValue(value), [value]);

  const now = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() =>
    parsedValue ? parsedValue.year : now.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    parsedValue ? parsedValue.month : now.getMonth()
  );
  const [timeState, setTimeState] = useState<{ hours: number; minutes: number; seconds: number }>(
    () => ({
      hours: parsedValue ? parsedValue.hours : defaultEndOfDayTime ? 23 : 0,
      minutes: parsedValue ? parsedValue.minutes : defaultEndOfDayTime ? 59 : 0,
      seconds: parsedValue ? parsedValue.seconds : defaultEndOfDayTime ? 59 : 0,
    })
  );

  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
      setTimeState({
        hours: parsedValue.hours,
        minutes: parsedValue.minutes,
        seconds: parsedValue.seconds,
      });
    }
  }, [parsedValue]);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  }>({
    top: 0,
    left: 0,
    openUpward: false,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const estHeight = showTime ? 345 : 300;
    const estWidth = 276;

    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceBelow < estHeight && rect.top > spaceBelow;

    let left = rect.left;
    if (left + estWidth > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - estWidth - 8);
    }

    setPopoverCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left,
      openUpward,
    });
  }, [showTime]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Tính toán danh sách 42 ngày hiển thị trong lưới lịch tháng
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // getDay(): 0 = CN, 1 = T2 ... 6 = T7 -> chuyển về 0 = T2 ... 6 = CN
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      year: number;
      month: number;
      day: number;
      isCurrentMonth: boolean;
    }[] = [];

    // Ngày tháng trước
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ year: y, month: m, day: d, isCurrentMonth: false });
    }

    // Ngày tháng hiện tại
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({ year: viewYear, month: viewMonth, day: d, isCurrentMonth: true });
    }

    // Ngày tháng sau cho đủ 42 ô
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ year: y, month: m, day: d, isCurrentMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (y: number, m: number, d: number) => {
    const nextIso = buildIsoString(
      y,
      m,
      d,
      timeState.hours,
      timeState.minutes,
      timeState.seconds,
      showTime
    );
    onChange?.(nextIso);
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (field: 'hours' | 'minutes' | 'seconds', val: number) => {
    const clamped =
      field === 'hours'
        ? Math.max(0, Math.min(23, val))
        : Math.max(0, Math.min(59, val));
    const nextTime = { ...timeState, [field]: clamped };
    setTimeState(nextTime);

    const base = parsedValue || {
      year: viewYear,
      month: viewMonth,
      day: now.getDate(),
    };
    const nextIso = buildIsoString(
      base.year,
      base.month,
      base.day,
      nextTime.hours,
      nextTime.minutes,
      nextTime.seconds,
      showTime
    );
    onChange?.(nextIso);
  };

  const handleQuickToday = () => {
    const today = new Date();
    const h = defaultEndOfDayTime ? 23 : 0;
    const m = defaultEndOfDayTime ? 59 : 0;
    const s = defaultEndOfDayTime ? 59 : 0;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setTimeState({ hours: h, minutes: m, seconds: s });
    const nextIso = buildIsoString(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      h,
      m,
      s,
      showTime
    );
    onChange?.(nextIso);
    setIsOpen(false);
  };

  const handleQuickStartOfYear = () => {
    const y = viewYear || new Date().getFullYear();
    setViewMonth(0);
    setTimeState({ hours: 0, minutes: 0, seconds: 0 });
    const nextIso = buildIsoString(y, 0, 1, 0, 0, 0, showTime);
    onChange?.(nextIso);
    setIsOpen(false);
  };

  const displayStr = formatDisplayDate(parsedValue, showTime);

  return (
    <div
      ref={containerRef}
      className={`form-group ${className}`}
      style={{ marginBottom: style?.marginBottom }}
    >
      {label && (
        <label className="form-label">
          {label}
          {required && <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>}
        </label>
      )}

      <div className="input-container" style={{ position: 'relative', width: '100%' }}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          title={title || displayStr || placeholder}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
            }
          }}
          className="form-input"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            paddingLeft: '11px',
            paddingRight: '10px',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            borderColor: isOpen ? 'var(--border-focus, #0284c7)' : undefined,
            boxShadow: isOpen
              ? '0 0 0 3px var(--color-primary-glow, rgba(2, 132, 199, 0.15))'
              : undefined,
            backgroundColor: '#ffffff',
            whiteSpace: 'nowrap',
            ...style,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: 0,
              flex: 1,
              overflow: 'hidden',
            }}
          >
            {prefix && (
              <span
                style={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {prefix}
              </span>
            )}
            <span
              style={{
                color: displayStr ? '#0f172a' : '#94a3b8',
                fontWeight: displayStr ? 600 : 500,
                fontSize: '0.8125rem',
                fontVariantNumeric: 'tabular-nums',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayStr || placeholder}
            </span>
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              color: isOpen ? '#0284c7' : '#64748b',
            }}
          >
            {clearable && displayStr && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                title="Xóa ngày"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: '4px',
                  color: '#94a3b8',
                }}
              >
                <XLg size={11} />
              </span>
            )}
            <Calendar3 size={13} />
          </span>
        </button>

        {isOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: popoverCoords.openUpward ? undefined : popoverCoords.top,
                bottom: popoverCoords.openUpward
                  ? window.innerHeight - popoverCoords.top
                  : undefined,
                left: popoverCoords.left,
                width: '276px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                boxShadow:
                  '0 12px 28px -4px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                padding: '10px',
                zIndex: 99999,
                boxSizing: 'border-box',
                fontFamily: "'Roboto Condensed', -apple-system, BlinkMacSystemFont, sans-serif",
                userSelect: 'none',
              }}
            >
              {/* Header chọn Tháng / Năm */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  padding: '2px 4px',
                }}
              >
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Tháng trước"
                >
                  <ChevronLeft size={13} />
                </button>

                <div
                  style={{
                    fontSize: '0.84375rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '0.01em',
                  }}
                >
                  Tháng {String(viewMonth + 1).padStart(2, '0')} / {viewYear}
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Tháng sau"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Tiêu đề các thứ trong tuần */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px',
                  marginBottom: '4px',
                }}
              >
                {WEEKDAYS_VN.map((w, idx) => (
                  <div
                    key={w}
                    style={{
                      textAlign: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: idx === 6 ? '#ef4444' : '#64748b',
                      padding: '3px 0',
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Lưới 42 ngày */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px',
                }}
              >
                {calendarDays.map((cell, idx) => {
                  const isSelected =
                    parsedValue &&
                    parsedValue.year === cell.year &&
                    parsedValue.month === cell.month &&
                    parsedValue.day === cell.day;

                  const isToday =
                    now.getFullYear() === cell.year &&
                    now.getMonth() === cell.month &&
                    now.getDate() === cell.day;

                  return (
                    <button
                      key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                      type="button"
                      onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                      style={{
                        height: '30px',
                        borderRadius: '7px',
                        border: isToday && !isSelected ? '1px solid #38bdf8' : '1px solid transparent',
                        backgroundColor: isSelected ? '#0284c7' : 'transparent',
                        color: isSelected
                          ? '#ffffff'
                          : cell.isCurrentMonth
                          ? '#1e293b'
                          : '#cbd5e1',
                        fontSize: '0.78125rem',
                        fontWeight: isSelected || isToday ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Bộ chọn Giờ : Phút : Giây (nếu bật showTime) */}
              {showTime && (
                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#64748b',
                    }}
                  >
                    <Clock size={12} />
                    <span>Thời gian:</span>
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={String(timeState.hours).padStart(2, '0')}
                      onChange={(e) => handleTimeChange('hours', Number(e.target.value))}
                      style={{
                        width: '38px',
                        height: '26px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        color: '#0f172a',
                      }}
                    />
                    <span style={{ fontWeight: 700, color: '#64748b' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={String(timeState.minutes).padStart(2, '0')}
                      onChange={(e) => handleTimeChange('minutes', Number(e.target.value))}
                      style={{
                        width: '38px',
                        height: '26px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        color: '#0f172a',
                      }}
                    />
                    <span style={{ fontWeight: 700, color: '#64748b' }}>:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={String(timeState.seconds).padStart(2, '0')}
                      onChange={(e) => handleTimeChange('seconds', Number(e.target.value))}
                      style={{
                        width: '38px',
                        height: '26px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        color: '#0f172a',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Footer tiện ích nhanh */}
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleQuickStartOfYear}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      fontSize: '0.71875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Đầu năm
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickToday}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                      backgroundColor: '#f0f9ff',
                      color: '#0284c7',
                      fontSize: '0.71875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Hôm nay
                  </button>
                </div>

                {showTime ? (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '0.71875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Xong
                  </button>
                ) : (
                  value && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange?.('');
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        fontSize: '0.71875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Xóa
                    </button>
                  )
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
};

