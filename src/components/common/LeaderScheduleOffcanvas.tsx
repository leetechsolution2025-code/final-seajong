import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Telephone,
  ChevronLeft,
  ChevronRight,
  Clock,
  GeoAlt,
  CalendarCheck,
  CalendarEvent,
  People,
} from 'react-bootstrap-icons';
import { Offcanvas } from './Offcanvas';
import { userService, type UserItem } from '../../services/userService';

export interface LeaderInfo {
  id?: number | string;
  name: string;
  role: string;
  department?: string;
  phone: string;
  email?: string;
  avatarText?: string;
  avatarColor?: string;
  avatarUrl?: string;
}

export interface LeaderScheduleEvent {
  id: string;
  userId?: string;
  userEmail: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd: string; // HH:mm
  location?: string;
  category?: string;
  priority?: 'urgent' | 'high' | 'normal';
  status?: string;
  assigneeName?: string;
}

export interface WeekDayItem {
  date: Date;
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  dayNumber: string;
  isToday: boolean;
}

export interface LeaderScheduleOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  leader?: LeaderInfo;
}

// Fallback thông tin Giám đốc thực tế theo cơ sở dữ liệu Seajong
const DEFAULT_LEADER: LeaderInfo = {
  id: '2091',
  name: 'Lê Công Vụ',
  role: 'Giám đốc',
  department: 'Ban Giám đốc',
  phone: '0988 123 456',
  email: 'lecongvu@seajong.com',
  avatarText: 'LV',
  avatarColor: '#059669',
};

// Hàm định dạng ngày dạng YYYY-MM-DD
const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Hàm lấy danh sách 7 ngày trong tuần (từ Thứ Hai đến Chủ Nhật)
const getWeekDaysList = (refDate: Date): WeekDayItem[] => {
  const d = new Date(refDate);
  const day = d.getDay();
  // Điều chỉnh để tuần bắt đầu từ Thứ Hai (Monday = 1, Sunday = 0 => diff -6)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);

  const days: WeekDayItem[] = [];
  const shortLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const fullLabels = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  const todayKey = formatDateKey(new Date());

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const key = formatDateKey(cur);
    days.push({
      date: cur,
      dateKey: key,
      shortLabel: shortLabels[i],
      fullLabel: fullLabels[i],
      dayNumber: String(cur.getDate()).padStart(2, '0'),
      isToday: key === todayKey,
    });
  }
  return days;
};

export const LeaderScheduleOffcanvas: React.FC<LeaderScheduleOffcanvasProps> = ({
  isOpen,
  onClose,
  onShowToast: _onShowToast,
  leader: externalLeader,
}) => {
  const [dbLeader, setDbLeader] = useState<LeaderInfo>(externalLeader || DEFAULT_LEADER);
  const [leaderEvents, setLeaderEvents] = useState<LeaderScheduleEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Quản lý tuần tham chiếu và ngày đang chọn trong tuần
  const [refWeekDate, setRefWeekDate] = useState<Date>(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // 1. Tải thông tin Giám đốc thực tế từ DB khi mở Offcanvas
  useEffect(() => {
    let isMounted = true;

    const fetchLeaderFromDb = async () => {
      if (externalLeader) {
        setDbLeader(externalLeader);
        return;
      }

      try {
        const users: UserItem[] = await userService.getUsers();
        if (isMounted && Array.isArray(users) && users.length > 0) {
          const foundDirector = users.find(
            (u) =>
              (u.department && u.department.toLowerCase().includes('giám đốc')) ||
              (u.position && u.position.toLowerCase().includes('giám đốc')) ||
              u.name === 'Lê Công Vụ'
          );

          if (foundDirector) {
            setDbLeader({
              id: foundDirector.id,
              name: foundDirector.name,
              role: foundDirector.position || 'Giám đốc',
              department: foundDirector.department || 'Ban Giám đốc',
              phone: foundDirector.phone || '0988 123 456',
              email: foundDirector.email,
              avatarText: foundDirector.avatarText || 'LV',
              avatarColor: foundDirector.avatarColor || '#059669',
            });
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin Giám đốc từ DB:', err);
      }
    };

    if (isOpen) {
      fetchLeaderFromDb();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, externalLeader]);

  const activeLeader = externalLeader || dbLeader;
  const directorEmail = activeLeader.email || 'lecongvu@seajong.com';
  const directorId = activeLeader.id || '2091';

  // 2. Tải lịch sự kiện của Giám đốc từ Database
  const loadDirectorCalendarEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const queryParams = new URLSearchParams({
        userEmail: directorEmail,
        userId: String(directorId),
      });

      const res = await fetch(`/api/calendar-events?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeaderEvents(data);
        }
      }
    } catch (e) {
      console.warn('Lỗi tải lịch sự kiện lãnh đạo từ DB:', e);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [directorEmail, directorId]);

  useEffect(() => {
    if (isOpen) {
      loadDirectorCalendarEvents();
    }
  }, [isOpen, loadDirectorCalendarEvents]);

  // Danh sách 7 ngày trong tuần
  const currentWeekDays = useMemo(() => getWeekDaysList(refWeekDate), [refWeekDate]);

  // Tiêu đề dải ngày tuần (VD: "05/10 - 11/10/2026")
  const weekRangeLabel = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const first = currentWeekDays[0];
    const last = currentWeekDays[6];
    const m1 = String(first.date.getMonth() + 1).padStart(2, '0');
    const m2 = String(last.date.getMonth() + 1).padStart(2, '0');
    return `${first.dayNumber}/${m1} - ${last.dayNumber}/${m2}/${last.date.getFullYear()}`;
  }, [currentWeekDays]);

  // Điều hướng tuần trước / tuần sau / hôm nay
  const handlePrevWeek = () => {
    setRefWeekDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
  };

  const handleNextWeek = () => {
    setRefWeekDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
  };

  const handleCurrentWeek = () => {
    setRefWeekDate(new Date());
    setSelectedDayKey(formatDateKey(new Date()));
  };

  // Lọc sự kiện hiển thị
  const weekDayKeys = useMemo(() => new Set(currentWeekDays.map((d) => d.dateKey)), [currentWeekDays]);

  // Sự kiện trong tuần hiện tại
  const eventsInCurrentWeek = useMemo(() => {
    return leaderEvents
      .filter((ev) => weekDayKeys.has(ev.date))
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.timeStart || '').localeCompare(b.timeStart || '');
      });
  }, [leaderEvents, weekDayKeys]);

  // Sự kiện hiển thị (theo ngày đã chọn, hoặc tất cả trong tuần)
  const displayedEvents = useMemo(() => {
    if (!selectedDayKey) return eventsInCurrentWeek;
    return eventsInCurrentWeek.filter((ev) => ev.date === selectedDayKey);
  }, [eventsInCurrentWeek, selectedDayKey]);

  // Thông tin ngày đang chọn (nếu có)
  const selectedDayInfo = useMemo(() => {
    if (!selectedDayKey) return null;
    return currentWeekDays.find((d) => d.dateKey === selectedDayKey) || null;
  }, [currentWeekDays, selectedDayKey]);

  const initials =
    activeLeader.avatarText ||
    (activeLeader.name
      ? activeLeader.name
          .split(' ')
          .map((w) => w[0])
          .filter(Boolean)
          .slice(-2)
          .join('')
          .toUpperCase()
      : 'LV');
  const bgAvatarColor = activeLeader.avatarColor || '#059669';

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title="Lịch làm việc của lãnh đạo"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box' }}>
        {/* ── 1. KHỐI THÔNG TIN GIÁM ĐỐC TỪ DB ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: bgAvatarColor,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.02em',
              boxShadow: `0 2px 8px ${bgAvatarColor}40`,
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            {activeLeader.avatarUrl ? (
              <img
                src={activeLeader.avatarUrl}
                alt={activeLeader.name}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top center' }}
              />
            ) : (
              <span>{initials}</span>
            )}
            <span
              style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '2px solid var(--bg-surface-2, #ffffff)',
              }}
              title="Đang làm việc"
            />
          </div>

          {/* Chi tiết: Họ và tên, Chức vụ, Số điện thoại */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.25,
              }}
            >
              {activeLeader.name}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.71875rem',
                  fontWeight: 600,
                  color: bgAvatarColor,
                  backgroundColor: `${bgAvatarColor}18`,
                  padding: '1px 7px',
                  borderRadius: '4px',
                  display: 'inline-block',
                }}
              >
                {activeLeader.role}
              </span>
              {activeLeader.department && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  • {activeLeader.department}
                </span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginTop: '1px',
              }}
            >
              <Telephone size={11} style={{ color: bgAvatarColor }} />
              <a
                href={`tel:${(activeLeader.phone || '').replace(/\s+/g, '')}`}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = bgAvatarColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                title="Nhấn để gọi điện thoại"
              >
                {activeLeader.phone || 'Chưa cập nhật SĐT'}
              </a>
            </div>
          </div>
        </div>

        {/* ── 2. THANH ĐIỀU HƯỚNG TUẦN (PREV / NEXT TUẦN) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handlePrevWeek}
              style={{
                width: '28px',
                height: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-1, #ffffff)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Tuần trước"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              style={{
                width: '28px',
                height: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-1, #ffffff)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Tuần sau"
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              style={{
                padding: '4px 8px',
                fontSize: '0.71875rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-1, #ffffff)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Về tuần hiện tại"
            >
              Hôm nay
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            <CalendarEvent size={13} style={{ color: bgAvatarColor }} />
            <span>{weekRangeLabel}</span>
          </div>
        </div>

        {/* ── 3. DẢI 7 NGÀY TRONG TUẦN (WEEK STRIP) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            padding: '4px',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {currentWeekDays.map((d) => {
            const isSelected = selectedDayKey === d.dateKey;
            const eventCount = leaderEvents.filter((ev) => ev.date === d.dateKey).length;

            return (
              <button
                key={d.dateKey}
                type="button"
                onClick={() => {
                  if (selectedDayKey === d.dateKey) {
                    setSelectedDayKey(null);
                  } else {
                    setSelectedDayKey(d.dateKey);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 2px 5px 2px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  border: isSelected
                    ? 'none'
                    : d.isToday
                    ? `1.5px solid ${bgAvatarColor}`
                    : '1px solid transparent',
                  backgroundColor: isSelected
                    ? bgAvatarColor
                    : d.isToday
                    ? `${bgAvatarColor}14`
                    : 'transparent',
                  color: isSelected
                    ? '#ffffff'
                    : d.isToday
                    ? bgAvatarColor
                    : 'var(--text-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
                title={`${d.fullLabel} (${d.dayNumber}) - ${eventCount} lịch làm việc`}
              >
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    marginBottom: '2px',
                    opacity: isSelected ? 0.95 : 0.8,
                  }}
                >
                  {d.shortLabel}
                </span>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: isSelected || d.isToday ? 700 : 500,
                    lineHeight: 1,
                  }}
                >
                  {d.dayNumber}
                </span>

                {/* Dot indicator đánh dấu ngày có sự kiện */}
                <div
                  style={{
                    display: 'flex',
                    gap: '2px',
                    marginTop: '4px',
                    height: '4px',
                    alignItems: 'center',
                  }}
                >
                  {eventCount > 0 && (
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: isSelected
                          ? '#ffffff'
                          : d.isToday
                          ? '#ef4444'
                          : bgAvatarColor,
                      }}
                    />
                  )}
                  {eventCount > 1 && (
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : '#f59e0b',
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 4. TIÊU ĐỀ LỌC VÀ DANH SÁCH LỊCH LÀM VIỆC CỦA LÃNH ĐẠO ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {selectedDayInfo
                ? `${selectedDayInfo.fullLabel} (${selectedDayInfo.dayNumber}/${String(selectedDayInfo.date.getMonth() + 1).padStart(2, '0')})`
                : 'Lịch toàn tuần'}
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-surface-3, #e2e8f0)',
                color: 'var(--text-secondary)',
              }}
            >
              {displayedEvents.length} lịch
            </span>
          </div>

          {selectedDayKey && (
            <button
              type="button"
              onClick={() => setSelectedDayKey(null)}
              style={{
                border: 'none',
                background: 'transparent',
                color: bgAvatarColor,
                fontSize: '0.71875rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              Xem cả tuần
            </button>
          )}
        </div>

        {/* ── 5. DANH SÁCH CÁC SỰ KIỆN LÀM VIỆC ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '2px',
          }}
        >
          {isLoadingEvents ? (
            <div
              style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
              }}
            >
              Đang đồng bộ lịch làm việc của lãnh đạo...
            </div>
          ) : displayedEvents.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CalendarCheck size={28} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedDayInfo
                  ? `Không có lịch làm việc trong ngày ${selectedDayInfo.fullLabel}`
                  : 'Không có lịch làm việc nào trong tuần này'}
              </div>
              <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                Giám đốc chưa có lịch họp hoặc công tác nào được xếp trong khoảng thời gian này.
              </div>
            </div>
          ) : (
            displayedEvents.map((ev) => {
              const priorityColor =
                ev.priority === 'urgent' ? '#ef4444' : ev.priority === 'high' ? '#f59e0b' : bgAvatarColor;
              const priorityBg =
                ev.priority === 'urgent'
                  ? 'rgba(239, 68, 68, 0.12)'
                  : ev.priority === 'high'
                  ? 'rgba(245, 158, 11, 0.12)'
                  : `${bgAvatarColor}14`;
              const priorityText =
                ev.priority === 'urgent' ? 'Khẩn cấp' : ev.priority === 'high' ? 'Quan trọng' : 'Thường';

              // Format ngày của event nếu xem toàn tuần
              const dateParts = ev.date.split('-');
              const eventDateLabel =
                dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : ev.date;

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${priorityColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Hàng 1: Thời gian, Ngày, Badge mức độ */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: bgAvatarColor,
                      }}
                    >
                      <Clock size={11} />
                      <span>
                        {ev.timeStart || '08:00'} - {ev.timeEnd || '09:00'}
                      </span>
                      {!selectedDayKey && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginLeft: '4px',
                          }}
                        >
                          ({eventDateLabel})
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '0.65625rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: priorityBg,
                        color: priorityColor,
                      }}
                    >
                      {priorityText}
                    </span>
                  </div>

                  {/* Hàng 2: Tiêu đề sự kiện */}
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                    }}
                  >
                    {ev.title}
                  </div>

                  {/* Hàng 3: Mô tả (nếu có) */}
                  {ev.description && (
                    <div
                      style={{
                        fontSize: '0.71875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.35,
                      }}
                    >
                      {ev.description}
                    </div>
                  )}

                  {/* Hàng 4: Địa điểm và Người liên quan */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {ev.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <GeoAlt size={10} style={{ color: '#ef4444' }} />
                        <span>{ev.location}</span>
                      </div>
                    )}
                    {ev.assigneeName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <People size={10} style={{ color: bgAvatarColor }} />
                        <span>{ev.assigneeName}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Offcanvas>
  );
};

export default LeaderScheduleOffcanvas;

