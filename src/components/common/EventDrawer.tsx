import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GeoAlt,
  People,
  Search,
  X,
  Check2,
  ChevronDown,
  Trash,
} from 'react-bootstrap-icons';
import { Offcanvas } from './Offcanvas';
import type { PlannerItem } from './TodoListPlanner';
import { calendarEventService, getCurrentSessionUser, getLocalCachedEvents, setLocalCachedEvents } from '../../services/calendarEventService';

export interface EventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'detail' | 'edit';
  initialDate?: string;
  initialEvent?: PlannerItem | null;
  onSaved?: (event: PlannerItem) => void;
  onDeleted?: (eventId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const getTodayDateKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Gửi thông báo mời tham gia sự kiện đến các nhân sự khách mời được chọn
 * Kèm nút Đồng ý / Từ chối trực tiếp trong thông báo
 */
export function dispatchEventInvitationNotifications(
  event: {
    title: string;
    date: string;
    timeStart?: string;
    timeEnd?: string;
    isAllDay?: boolean;
    location?: string;
    priority?: string;
  },
  attendeeIds: string[],
  companyUsers: Array<{ id: number | string; name: string; department?: string; position?: string }>,
  senderUser: { name: string; role?: string; department?: string }
) {
  if (!attendeeIds || attendeeIds.length === 0) return;

  try {
    const rawSaved = localStorage.getItem('decodoor_notifications_list');
    const existingList: any[] = rawSaved ? JSON.parse(rawSaved) : [];

    const formattedDate = (() => {
      try {
        const parts = event.date.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch {}
      return event.date;
    })();

    const timeStr = event.isAllDay ? 'Cả ngày' : `${event.timeStart || '08:00'} - ${event.timeEnd || '09:00'}`;
    const locStr = event.location ? ` tại ${event.location}` : '';

    const newNotifications: any[] = [];

    attendeeIds.forEach((attId) => {
      const u = companyUsers.find((user) => String(user.id) === String(attId));
      const notifItem = {
        id: `notif-event-${Date.now()}-${attId}-${Math.floor(Math.random() * 1000)}`,
        title: `Lời mời tham dự sự kiện: ${event.title}`,
        content: `Chào ${u?.name || 'đồng nghiệp'}, bạn được mời tham dự sự kiện "${event.title}" vào ngày ${formattedDate} (${timeStr})${locStr}. Người mời: ${senderUser.name}. Vui lòng bấm Đồng ý hoặc Từ chối tham gia.`,
        type: 'info',
        priority: event.priority === 'urgent' ? 'urgent' : event.priority === 'high' ? 'high' : 'normal',
        audience: 'individual',
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          name: senderUser.name,
          role: senderUser.role || 'Người tổ chức sự kiện',
          department: senderUser.department || 'Ban Điều Hành decodoor',
        },
        actionRequired: true,
        actionType: 'confirm',
        actionStatus: 'pending',
      };
      newNotifications.push(notifItem);
    });

    const updated = [...newNotifications, ...existingList];
    localStorage.setItem('decodoor_notifications_list', JSON.stringify(updated));

    // Phát sự kiện ra window để Header và NotificationOffcanvas cập nhật tức thì
    window.dispatchEvent(new CustomEvent('decodoor_notification_added', { detail: newNotifications }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Lỗi khi gửi thông báo sự kiện:', err);
  }
}

/**
 * Offcanvas Tạo mới / Chi tiết sự kiện (dùng chung cho toàn bộ dự án)
 */
export const EventDrawer: React.FC<EventDrawerProps> = ({
  isOpen,
  onClose,
  mode = 'create',
  initialDate,
  initialEvent,
  onSaved,
  onDeleted,
  onShowToast,
}) => {
  const sessionUser = useMemo(() => getCurrentSessionUser(), []);

  // Danh sách nhân viên trong công ty để chọn khách mời
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: number | string; name: string; department?: string; position?: string; avatarColor?: string; avatarText?: string }>>([
    { id: 2063, name: 'Lê Anh Văn', department: 'Phòng kinh doanh', position: 'Trưởng phòng', avatarText: 'AV', avatarColor: '#ca8a04' },
    { id: 101, name: 'Trần Văn Bảo', department: 'Ban Giám Đốc', position: 'Phó Giám Đốc', avatarText: 'TB', avatarColor: '#0284c7' },
    { id: 102, name: 'Nguyễn Thị Mai', department: 'Phòng Kế toán', position: 'Kế toán trưởng', avatarText: 'NM', avatarColor: '#8b5cf6' },
    { id: 103, name: 'Phạm Tuấn Hưng', department: 'Phòng Kỹ thuật và BOM', position: 'Trưởng phòng', avatarText: 'TH', avatarColor: '#10b981' },
    { id: 104, name: 'Đỗ Thị Lan', department: 'Hành chính nhân sự', position: 'Chuyên viên', avatarText: 'DL', avatarColor: '#ec4899' },
    { id: 105, name: 'Hoàng Quốc Việt', department: 'Nhà máy sản xuất', position: 'Quản đốc xưởng', avatarText: 'HV', avatarColor: '#f59e0b' },
  ]);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCompanyUsers(
            data.map((u: any) => ({
              id: u.id,
              name: u.name,
              department: u.department || '',
              position: u.position || '',
              avatarColor: u.avatarColor || '#0284c7',
              avatarText: u.avatarText || (u.name ? u.name.split(' ').map((n: string) => n[0]).slice(-2).join('').toUpperCase() : 'NV'),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => initialDate || getTodayDateKey());
  const [endDate, setEndDate] = useState(() => initialDate || getTodayDateKey());
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:30');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [notifyMinutes, setNotifyMinutes] = useState<number>(15);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);
  const [attendeesSearch, setAttendeesSearch] = useState('');
  const attendeesDropdownRef = useRef<HTMLDivElement>(null);
  const [priority, setPriority] = useState<string>('high');
  const [description, setDescription] = useState('');

  // Đồng bộ khi mở modal hoặc thay đổi initialEvent
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'create') {
      setTitle('');
      setDate(initialDate || getTodayDateKey());
      setEndDate(initialDate || getTodayDateKey());
      setTimeStart('09:00');
      setTimeEnd('10:30');
      setIsAllDay(false);
      setLocation('');
      setRecurrence('none');
      setNotifyMinutes(15);
      setAttendees([]);
      setIsAttendeesOpen(false);
      setAttendeesSearch('');
      setPriority('high');
      setDescription('');
    } else if (initialEvent) {
      setTitle(initialEvent.title || '');
      setDate(initialEvent.date || getTodayDateKey());
      setEndDate(initialEvent.endDate || initialEvent.date || getTodayDateKey());
      setTimeStart(initialEvent.timeStart || '09:00');
      setTimeEnd(initialEvent.timeEnd || '10:30');
      setIsAllDay(!!initialEvent.isAllDay);
      setLocation(initialEvent.location || '');
      setPriority((initialEvent.priority as string) || 'high');

      const desc = initialEvent.description || '';
      let rec: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'none';
      if (desc.includes('Mỗi ngày')) rec = 'daily';
      else if (desc.includes('Mỗi tuần')) rec = 'weekly';
      else if (desc.includes('Mỗi tháng')) rec = 'monthly';
      else if (desc.includes('Mỗi năm')) rec = 'yearly';
      setRecurrence(rec);

      const notifyMatch = desc.match(/Nhắc trước:\s*(\d+)\s*phút/);
      if (notifyMatch && notifyMatch[1]) {
        setNotifyMinutes(parseInt(notifyMatch[1], 10));
      } else {
        setNotifyMinutes(15);
      }

      const attendeesMatch = desc.match(/Khách mời:\s*([^\n•]+)/);
      if (attendeesMatch && attendeesMatch[1]) {
        const names = attendeesMatch[1].split(',').map((s) => s.trim().toLowerCase());
        const matchedIds = companyUsers
          .filter((u) => names.some((n) => u.name.toLowerCase().includes(n) || n.includes(u.name.toLowerCase())))
          .map((u) => String(u.id));
        setAttendees(matchedIds);
      } else {
        setAttendees([]);
      }

      const cleanNotes = desc
        .split('\n')
        .filter((line) => !line.trim().startsWith('•'))
        .join('\n')
        .trim();
      setDescription(cleanNotes);
    }
  }, [isOpen, mode, initialDate, initialEvent, companyUsers]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attendeesDropdownRef.current && !attendeesDropdownRef.current.contains(e.target as Node)) {
        setIsAttendeesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const attendeesNames = companyUsers
      .filter((u) => attendees.includes(String(u.id)))
      .map((u) => u.name)
      .join(', ');

    const recurrenceLabel = {
      none: '',
      daily: 'Mỗi ngày',
      weekly: 'Mỗi tuần',
      monthly: 'Mỗi tháng',
      yearly: 'Mỗi năm',
    }[recurrence];

    const descriptionParts: string[] = [];
    if (description.trim()) {
      descriptionParts.push(description.trim());
    }
    if (recurrenceLabel) {
      descriptionParts.push(`• Lặp lại: ${recurrenceLabel}`);
    }
    if (notifyMinutes > 0) {
      descriptionParts.push(`• Nhắc trước: ${notifyMinutes} phút`);
    }
    if (attendeesNames) {
      descriptionParts.push(`• Khách mời: ${attendeesNames}`);
    }

    const fullDescription = descriptionParts.join('\n');

    const effectiveEndDate = endDate && endDate >= date
      ? endDate
      : date;

    const isMultiDay = Boolean(effectiveEndDate && effectiveEndDate !== date);
    const effectiveIsAllDay = isAllDay || isMultiDay;

    if (mode === 'create') {
      const newEvent: PlannerItem = {
        id: `bom-ev-${Date.now()}`,
        title: title.trim(),
        description: fullDescription || undefined,
        type: 'event',
        date,
        endDate: effectiveEndDate,
        timeStart: effectiveIsAllDay ? undefined : timeStart,
        timeEnd: effectiveIsAllDay ? undefined : timeEnd,
        isAllDay: effectiveIsAllDay,
        location: location.trim() || undefined,
        category: 'meeting' as any,
        priority: priority as any,
        assigneeName: sessionUser.name,
        status: 'todo',
        createdAt: new Date().toISOString(),
      };

      // Lưu SQLite
      await calendarEventService.createEvent(
        {
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date || date,
          endDate: effectiveEndDate,
          timeStart: newEvent.timeStart,
          timeEnd: newEvent.timeEnd,
          location: newEvent.location,
          category: newEvent.category,
          priority: newEvent.priority,
        },
        sessionUser
      );

      // Cập nhật cache cục bộ
      const currentCache = getLocalCachedEvents(sessionUser.email || sessionUser.id);
      setLocalCachedEvents(sessionUser.email || sessionUser.id, [newEvent, ...currentCache]);

      // TỰ ĐỘNG ĐẨY THÔNG BÁO VỚI NỘI DUNG PHÙ HỢP ĐẾN CÁC KHÁCH MỜI CÓ NÚT ĐỒNG Ý / TỪ CHỐI
      if (attendees.length > 0) {
        dispatchEventInvitationNotifications(
          {
            title: newEvent.title,
            date: newEvent.date || date,
            timeStart: newEvent.timeStart,
            timeEnd: newEvent.timeEnd,
            isAllDay: newEvent.isAllDay,
            location: newEvent.location,
            priority: newEvent.priority,
          },
          attendees,
          companyUsers,
          sessionUser
        );
      }

      onSaved?.(newEvent);
      onShowToast?.(
        'success',
        'Đã tạo sự kiện',
        attendees.length > 0
          ? `Đã lưu sự kiện "${newEvent.title}" và gửi lời mời đến ${attendees.length} nhân sự.`
          : `Đã lưu sự kiện "${newEvent.title}" vào lịch.`
      );
    } else if (initialEvent) {
      const updatedItem: PlannerItem = {
        ...initialEvent,
        title: title.trim(),
        description: fullDescription || undefined,
        date,
        endDate: effectiveEndDate,
        timeStart: effectiveIsAllDay ? undefined : timeStart,
        timeEnd: effectiveIsAllDay ? undefined : timeEnd,
        isAllDay: effectiveIsAllDay,
        location: location.trim() || undefined,
        priority: priority as any,
      };

      await calendarEventService.updateEvent(
        initialEvent.id,
        {
          title: updatedItem.title,
          description: updatedItem.description,
          date: updatedItem.date,
          endDate: effectiveEndDate,
          timeStart: updatedItem.timeStart,
          timeEnd: updatedItem.timeEnd,
          location: updatedItem.location,
          priority: updatedItem.priority,
        },
        sessionUser
      );

      const currentCache = getLocalCachedEvents(sessionUser.email || sessionUser.id);
      const updatedCache = currentCache.map((it) => (it.id === initialEvent.id ? updatedItem : it));
      setLocalCachedEvents(sessionUser.email || sessionUser.id, updatedCache);

      // Gửi thông báo cập nhật tới khách mời nếu có
      if (attendees.length > 0) {
        dispatchEventInvitationNotifications(
          {
            title: updatedItem.title,
            date: updatedItem.date || date,
            timeStart: updatedItem.timeStart,
            timeEnd: updatedItem.timeEnd,
            isAllDay: updatedItem.isAllDay,
            location: updatedItem.location,
            priority: updatedItem.priority,
          },
          attendees,
          companyUsers,
          sessionUser
        );
      }

      onSaved?.(updatedItem);
      onShowToast?.('success', 'Đã cập nhật', `Đã lưu thay đổi cho "${updatedItem.title}".`);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!initialEvent) return;
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này khỏi lịch làm việc?')) return;

    await calendarEventService.deleteEvent(initialEvent.id, sessionUser);
    const currentCache = getLocalCachedEvents(sessionUser.email || sessionUser.id);
    setLocalCachedEvents(
      sessionUser.email || sessionUser.id,
      currentCache.filter((it) => it.id !== initialEvent.id)
    );

    onDeleted?.(initialEvent.id);
    onShowToast?.('info', 'Đã xóa sự kiện', 'Sự kiện đã được xóa khỏi lịch làm việc.');
    onClose();
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Tạo mới sự kiện' : 'Chi tiết sự kiện'}
      bodyStyle={{
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          height: '100%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Vùng nội dung cuộn */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '3px',
          }}
        >
          {/* 1. Tiêu đề */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
              Tiêu đề sự kiện <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Họp giao ban điều hành, Giám định nhà máy..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '7px 11px',
                fontSize: '0.84375rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                color: 'var(--text-primary, #0f172a)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* 2. TỪ NGÀY, ĐẾN NGÀY VÀ THỜI GIAN */}
          <div>
            {/* Hàng 1: Từ ngày và Đến ngày luôn luôn hiển thị */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Từ ngày <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setDate(newStart);
                    if (!endDate || endDate < newStart) {
                      setEndDate(newStart);
                    }
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '7px 9px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Đến ngày <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={endDate || date}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '7px 9px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Hàng 2: Giờ Bắt đầu, Giờ Kết thúc và Checkbox Cả ngày trên CÙNG 1 DÒNG */}
            {(() => {
              const isMultiDay = Boolean(endDate && endDate !== date);
              const isLocked = isAllDay || isMultiDay;
              return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Bắt đầu
                    </span>
                    <input
                      type="time"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      disabled={isLocked}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: isLocked ? 'var(--bg-surface-3, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                        color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary)',
                        boxSizing: 'border-box',
                        outline: 'none',
                        cursor: isLocked ? 'not-allowed' : 'text',
                        opacity: isLocked ? 0.7 : 1,
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Kết thúc
                    </span>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      disabled={isLocked}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: isLocked ? 'var(--bg-surface-3, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                        color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary)',
                        boxSizing: 'border-box',
                        outline: 'none',
                        cursor: isLocked ? 'not-allowed' : 'text',
                        opacity: isLocked ? 0.7 : 1,
                      }}
                    />
                  </div>
                  <div style={{ flexShrink: 0, paddingBottom: '7px' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: isMultiDay ? 'not-allowed' : 'pointer',
                        color: isMultiDay
                          ? 'var(--color-primary, #0284c7)'
                          : (isAllDay ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary)'),
                        whiteSpace: 'nowrap',
                        opacity: isMultiDay ? 0.8 : 1,
                      }}
                      title={isMultiDay ? 'Sự kiện diễn ra nhiều ngày (mặc định cả ngày)' : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={isMultiDay ? true : isAllDay}
                        disabled={isMultiDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        style={{
                          cursor: isMultiDay ? 'not-allowed' : 'pointer',
                          width: '14px',
                          height: '14px',
                          accentColor: 'var(--color-primary, #0284c7)',
                        }}
                      />
                      Cả ngày
                    </label>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 3. Địa điểm tổ chức */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
              Địa điểm tổ chức
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '8px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <GeoAlt size={13} color="#ef4444" />
              </div>
              <input
                type="text"
                placeholder="VD: Phòng họp VIP tầng 12, Nhà máy Hà Nam..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 11px 7px 36px',
                  fontSize: '0.8125rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* 4. Lặp lại và Thông báo trước */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Lặp lại
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '7px 9px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="none">Không lặp lại</option>
                <option value="daily">Mỗi ngày</option>
                <option value="weekly">Mỗi tuần</option>
                <option value="monthly">Mỗi tháng</option>
                <option value="yearly">Mỗi năm</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                Thông báo trước
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={notifyMinutes}
                  onChange={(e) => setNotifyMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="15"
                  style={{
                    width: '100%',
                    padding: '7px 46px 7px 11px',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '10px',
                    fontSize: '0.78125rem',
                    fontWeight: 600,
                    color: 'var(--text-muted, #64748b)',
                    pointerEvents: 'none',
                  }}
                >
                  phút
                </span>
              </div>
            </div>
          </div>

          {/* 5. Khách mời (với checkbox chọn nhân sự trong công ty) */}
          <div ref={attendeesDropdownRef} style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
              Khách mời
            </label>
            <button
              type="button"
              onClick={() => setIsAttendeesOpen(!isAttendeesOpen)}
              style={{
                width: '100%',
                padding: '7px 11px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                color: attendees.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxSizing: 'border-box',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <People size={14} color="var(--color-primary, #0284c7)" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attendees.length === 0 ? 'Chọn nhân viên tham gia...' : `Đã chọn ${attendees.length} nhân viên`}
                </span>
              </div>
              <ChevronDown
                size={13}
                color="var(--text-muted)"
                style={{
                  transform: isAttendeesOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  flexShrink: 0,
                }}
              />
            </button>

            {isAttendeesOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={12} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Tìm nhân viên, phòng ban..."
                    value={attendeesSearch}
                    onChange={(e) => setAttendeesSearch(e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.78125rem',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '4px' }}>
                  {companyUsers
                    .filter((u) => {
                      if (!attendeesSearch.trim()) return true;
                      const q = attendeesSearch.toLowerCase();
                      return u.name.toLowerCase().includes(q) || (u.department && u.department.toLowerCase().includes(q));
                    })
                    .map((user) => {
                      const isSelected = attendees.includes(String(user.id));
                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            setAttendees((prev) =>
                              isSelected ? prev.filter((id) => id !== String(user.id)) : [...prev, String(user.id)]
                            );
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                            transition: 'background-color 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--color-primary, #0284c7)' }}
                          />
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: user.avatarColor || '#0284c7',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65625rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {user.avatarText || user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.65625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {user.position || user.department}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div style={{ padding: '5px 8px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface-2, #f8fafc)' }}>
                  <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                    Đã chọn: <strong style={{ color: 'var(--color-primary, #0284c7)' }}>{attendees.length}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {attendees.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAttendees([])}
                        style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Bỏ chọn hết
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAttendeesOpen(false)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: 'var(--color-primary, #0284c7)', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Xong
                    </button>
                  </div>
                </div>
              </div>
            )}

            {attendees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {companyUsers
                  .filter((u) => attendees.includes(String(u.id)))
                  .map((user) => (
                    <span
                      key={user.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(2, 132, 199, 0.08)',
                        color: 'var(--color-primary, #0284c7)',
                        fontSize: '0.71875rem',
                        fontWeight: 600,
                      }}
                    >
                      {user.name}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttendees((prev) => prev.filter((id) => id !== String(user.id)));
                        }}
                      />
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* 6. Mức độ ưu tiên */}
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
              Mức độ ưu tiên
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px',
                padding: '2px',
                backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
              }}
            >
              {[
                { id: 'normal', label: 'Bình thường', color: '#475569' },
                { id: 'high', label: 'Quan trọng', color: '#0284c7' },
                { id: 'urgent', label: 'Khẩn cấp', color: '#ef4444' },
              ].map((p) => {
                const isSel = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    style={{
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontSize: '0.78125rem',
                      fontWeight: isSel ? 700 : 500,
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isSel ? '#ffffff' : 'transparent',
                      color: isSel ? p.color : 'var(--text-muted, #64748b)',
                      boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Tóm tắt nội dung */}
          <div style={{ flex: 1, minHeight: '80px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
              Tóm tắt nội dung
            </label>
            <textarea
              placeholder="Mô tả mục tiêu, tài liệu cần chuẩn bị, ghi chú thêm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                minHeight: '60px',
                padding: '8px 11px',
                fontSize: '0.8125rem',
                lineHeight: '1.45',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* FOOTER CỐ ĐỊNH Ở ĐÁY OFFCANVAS */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: mode === 'create' ? 'flex-end' : 'space-between',
            gap: '8px',
            paddingTop: '8px',
            marginTop: '6px',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            backgroundColor: 'var(--bg-surface, #ffffff)',
          }}
        >
          {mode !== 'create' && (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--color-danger, #ef4444)',
                cursor: 'pointer',
              }}
            >
              <Trash size={14} /> Xóa sự kiện
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {mode === 'create' ? 'Hủy bỏ' : 'Đóng'}
            </button>
            <button
              type="submit"
              style={{
                padding: '6px 16px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--color-primary, #0284c7)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              }}
            >
              <Check2 size={15} /> {mode === 'create' ? 'Lưu sự kiện' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </form>
    </Offcanvas>
  );
};
