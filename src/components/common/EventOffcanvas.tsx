import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  GeoAlt,
  People,
  Search,
  X,
  Check2,
  ChevronDown,
  Trash,
  CalendarCheck,
} from 'react-bootstrap-icons';
import { Offcanvas } from './Offcanvas';
import type { PlannerItem } from './TodoListPlanner';
import type { UserProfile } from '../../types';
import { calendarEventService, getCurrentSessionUser, getLocalCachedEvents } from '../../services/calendarEventService';

// ─── Interfaces và Helpers ───────────────────────────────────────────────────

export interface EventOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  initialSlide?: 'calendar' | 'create' | 'detail';
  defaultView?: 'month' | 'week' | 'day' | 'agenda';
  initialDate?: string;
  onEventsChange?: (events: PlannerItem[]) => void;
  user?: UserProfile;
}

interface WeekDayItem {
  date: Date;
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  dayNumber: string;
  isToday: boolean;
}

interface MonthGridCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const getTodayDateKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getCategoryColor = (catOrPriority?: string): string => {
  switch (catOrPriority) {
    case 'urgent':
      return '#ef4444';
    case 'meeting':
      return '#0284c7';
    case 'review':
      return '#8b5cf6';
    case 'inspection':
      return '#f59e0b';
    case 'milestone':
      return '#10b981';
    case 'finance':
      return '#06b6d4';
    default:
      return '#0284c7';
  }
};

const getMonthGridCells = (refDate: Date): MonthGridCell[] => {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;

  const startDate = new Date(year, month, 1 - dayOfWeek);
  const cells: MonthGridCell[] = [];
  const todayKey = getTodayDateKey();

  for (let i = 0; i < 35; i++) {
    const cur = new Date(startDate);
    cur.setDate(startDate.getDate() + i);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    cells.push({
      date: cur,
      dateKey: key,
      dayNumber: cur.getDate(),
      isCurrentMonth: cur.getMonth() === month,
      isToday: key === todayKey,
    });
  }

  const lastCell = cells[34];
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (lastCell.date.getMonth() === month && lastCell.dayNumber < lastDayOfMonth) {
    for (let i = 35; i < 42; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      cells.push({
        date: cur,
        dateKey: key,
        dayNumber: cur.getDate(),
        isCurrentMonth: cur.getMonth() === month,
        isToday: key === todayKey,
      });
    }
  }

  return cells;
};

const getWeekDaysList = (refDate: Date): WeekDayItem[] => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  const days: WeekDayItem[] = [];
  const shortLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const fullLabels = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  const todayKey = getTodayDateKey();

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const dayNum = String(cur.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${dayNum}`;
    days.push({
      date: cur,
      dateKey: key,
      shortLabel: shortLabels[i],
      fullLabel: fullLabels[i],
      dayNumber: dayNum,
      isToday: key === todayKey,
    });
  }
  return days;
};

const isEventOnDate = (it: PlannerItem, dateKey: string): boolean => {
  if (!it.date) return false;
  if (!it.endDate || it.endDate === it.date) {
    return it.date === dateKey;
  }
  return dateKey >= it.date && dateKey <= it.endDate;
};

/**
 * Gửi thông báo mời tham gia sự kiện đến các nhân sự được chọn
 * Thông báo có actionRequired: true, actionType: 'confirm', actionStatus: 'pending' (với nút Đồng ý / Từ chối)
 */
export function dispatchEventInvitationNotifications(
  event: {
    title: string;
    date: string;
    timeStart?: string;
    timeEnd?: string;
    isAllDay?: boolean;
    location?: string;
    description?: string;
    priority?: string;
  },
  attendeeIds: string[],
  companyUsers: Array<{ id: number | string; name: string; department?: string; position?: string }>,
  senderUser: { name: string; role?: string; department?: string }
) {
  if (!attendeeIds || attendeeIds.length === 0) return;

  try {
    const rawSaved = localStorage.getItem('seajong_notifications_list') || localStorage.getItem('decodoor_notifications_list');
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
        content: `Chào ${u?.name || 'bạn'}, bạn được mời tham dự sự kiện "${event.title}" vào ngày ${formattedDate} (${timeStr})${locStr}. Người mời: ${senderUser.name}. Vui lòng bấm Đồng ý hoặc Từ chối tham gia.`,
        type: 'info',
        priority: event.priority === 'urgent' ? 'urgent' : event.priority === 'high' ? 'high' : 'normal',
        audience: 'individual',
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          name: senderUser.name,
          role: senderUser.role || 'Người tổ chức sự kiện',
          department: senderUser.department || 'Ban Điều Hành Seajong',
        },
        actionRequired: true,
        actionType: 'confirm',
        actionStatus: 'pending',
      };
      newNotifications.push(notifItem);
    });

    const updated = [...newNotifications, ...existingList];
    localStorage.setItem('seajong_notifications_list', JSON.stringify(updated));

    // Kích hoạt cập nhật thời gian thực cho Header và NotificationOffcanvas
    window.dispatchEvent(new CustomEvent('seajong_notification_added', { detail: newNotifications }));
    window.dispatchEvent(new CustomEvent('decodoor_notification_added', { detail: newNotifications }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Lỗi khi gửi thông báo sự kiện:', err);
  }
}

// ─── Component Chính ─────────────────────────────────────────────────────────

export const EventOffcanvas: React.FC<EventOffcanvasProps> = ({
  isOpen,
  onClose,
  onShowToast,
  initialSlide = 'calendar',
  defaultView = 'week',
  initialDate,
  onEventsChange,
  user,
}) => {
  const sessionUser = useMemo(() => user || getCurrentSessionUser(), [user]);

  // Slide điều khiển: 'calendar' (các view tháng/tuần/ngày/lịch biểu), 'create' (Tạo mới), 'detail' (Chi tiết)
  const [slideMode, setSlideMode] = useState<'calendar' | 'create' | 'detail'>(initialSlide);
  const [calendarViewType, setCalendarViewType] = useState<'month' | 'week' | 'day' | 'agenda'>(defaultView);

  // Đồng bộ lại khi isOpen hoặc initialSlide thay đổi
  useEffect(() => {
    if (isOpen) {
      setSlideMode(initialSlide);
    }
  }, [isOpen, initialSlide]);

  // Danh sách sự kiện
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>(() => {
    const cached = getLocalCachedEvents(sessionUser.email || sessionUser.id);
    if (cached && cached.length > 0) return cached;
    return [];
  });

  // Tải danh sách sự kiện từ SQLite Database
  useEffect(() => {
    let isMounted = true;
    calendarEventService.getMyEvents(sessionUser).then((items) => {
      if (isMounted && items && items.length > 0) {
        setPlannerItems(items);
        onEventsChange?.(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [sessionUser, onEventsChange]);

  const savePlannerItems = useCallback((newItems: PlannerItem[]) => {
    setPlannerItems(newItems);
    onEventsChange?.(newItems);
    try {
      const userKey = sessionUser.email || sessionUser.id;
      localStorage.setItem(`seajong_calendar_events_${userKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, JSON.stringify(newItems));
      localStorage.setItem(`decodoor_calendar_events_${userKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, JSON.stringify(newItems));
      localStorage.setItem('seajong_events_planner', JSON.stringify(newItems));
    } catch (e) {
      console.error(e);
    }
  }, [sessionUser, onEventsChange]);

  // Danh sách nhân sự công ty để chọn khách mời
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

  // ─── State Form Tạo mới sự kiện (Slide 5) ──────────────────────────────────
  const [createEventTitle, setCreateEventTitle] = useState('');
  const [createEventDate, setCreateEventDate] = useState(() => initialDate || getTodayDateKey());
  const [createEventEndDate, setCreateEventEndDate] = useState(() => initialDate || getTodayDateKey());
  const [createEventTimeStart, setCreateEventTimeStart] = useState('09:00');
  const [createEventTimeEnd, setCreateEventTimeEnd] = useState('10:30');
  const [createEventIsAllDay, setCreateEventIsAllDay] = useState(false);
  const [createEventLocation, setCreateEventLocation] = useState('');
  const [createEventRecurrence, setCreateEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [createEventNotifyMinutes, setCreateEventNotifyMinutes] = useState<number>(15);
  const [createEventAttendees, setCreateEventAttendees] = useState<string[]>([]);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);
  const [attendeesSearch, setAttendeesSearch] = useState('');
  const attendeesDropdownRef = useRef<HTMLDivElement>(null);
  const [createEventPriority, setCreateEventPriority] = useState<string>('high');
  const [createEventDescription, setCreateEventDescription] = useState('');

  // ─── State Form Chi tiết / Chỉnh sửa sự kiện (Slide 6) ─────────────────────
  const [detailEventId, setDetailEventId] = useState<string>('');
  const [detailEventTitle, setDetailEventTitle] = useState('');
  const [detailEventDate, setDetailEventDate] = useState(() => getTodayDateKey());
  const [detailEventEndDate, setDetailEventEndDate] = useState(() => getTodayDateKey());
  const [detailEventTimeStart, setDetailEventTimeStart] = useState('09:00');
  const [detailEventTimeEnd, setDetailEventTimeEnd] = useState('10:00');
  const [detailEventIsAllDay, setDetailEventIsAllDay] = useState(false);
  const [detailEventLocation, setDetailEventLocation] = useState('');
  const [detailEventRecurrence, setDetailEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [detailEventNotifyMinutes, setDetailEventNotifyMinutes] = useState<number>(15);
  const [detailEventAttendees, setDetailEventAttendees] = useState<string[]>([]);
  const [isDetailAttendeesOpen, setIsDetailAttendeesOpen] = useState(false);
  const [detailAttendeesSearch, setDetailAttendeesSearch] = useState('');
  const detailAttendeesDropdownRef = useRef<HTMLDivElement>(null);
  const [detailEventPriority, setDetailEventPriority] = useState<string>('high');
  const [detailEventDescription, setDetailEventDescription] = useState('');

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attendeesDropdownRef.current && !attendeesDropdownRef.current.contains(e.target as Node)) {
        setIsAttendeesOpen(false);
      }
      if (detailAttendeesDropdownRef.current && !detailAttendeesDropdownRef.current.contains(e.target as Node)) {
        setIsDetailAttendeesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mở form Tạo mới sự kiện
  const handleOpenCreateSlide = useCallback((prefillDate?: string) => {
    setCreateEventTitle('');
    setCreateEventDate(prefillDate || getTodayDateKey());
    setCreateEventEndDate(prefillDate || getTodayDateKey());
    setCreateEventTimeStart('09:00');
    setCreateEventTimeEnd('10:30');
    setCreateEventLocation('');
    setCreateEventDescription('');
    setCreateEventRecurrence('none');
    setCreateEventNotifyMinutes(15);
    setCreateEventAttendees([]);
    setIsAttendeesOpen(false);
    setAttendeesSearch('');
    setCreateEventPriority('high');
    setCreateEventIsAllDay(false);
    setSlideMode('create');
  }, []);

  // Mở form Chi tiết sự kiện
  const handleOpenDetailSlide = useCallback(
    (ev: PlannerItem) => {
      setDetailEventId(ev.id);
      setDetailEventTitle(ev.title);
      setDetailEventDate(ev.date || getTodayDateKey());
      setDetailEventEndDate(ev.endDate || ev.date || getTodayDateKey());
      setDetailEventTimeStart(ev.timeStart || '09:00');
      setDetailEventTimeEnd(ev.timeEnd || '10:00');
      setDetailEventIsAllDay(!!ev.isAllDay);
      setDetailEventLocation(ev.location || '');
      setDetailEventPriority((ev.priority as string) || 'high');

      const desc = ev.description || '';
      let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'none';
      if (desc.includes('Mỗi ngày')) recurrence = 'daily';
      else if (desc.includes('Mỗi tuần')) recurrence = 'weekly';
      else if (desc.includes('Mỗi tháng')) recurrence = 'monthly';
      else if (desc.includes('Mỗi năm')) recurrence = 'yearly';
      setDetailEventRecurrence(recurrence);

      const notifyMatch = desc.match(/Nhắc trước:\s*(\d+)\s*phút/);
      if (notifyMatch && notifyMatch[1]) {
        setDetailEventNotifyMinutes(parseInt(notifyMatch[1], 10));
      } else {
        setDetailEventNotifyMinutes(15);
      }

      const attendeesMatch = desc.match(/Khách mời:\s*([^\n•]+)/);
      if (attendeesMatch && attendeesMatch[1]) {
        const names = attendeesMatch[1].split(',').map((s) => s.trim().toLowerCase());
        const matchedIds = companyUsers
          .filter((u) => names.some((n) => u.name.toLowerCase().includes(n) || n.includes(u.name.toLowerCase())))
          .map((u) => String(u.id));
        setDetailEventAttendees(matchedIds);
      } else {
        setDetailEventAttendees([]);
      }

      const cleanNotes = desc
        .split('\n')
        .filter((line) => !line.trim().startsWith('•'))
        .join('\n')
        .trim();
      setDetailEventDescription(cleanNotes);

      setIsDetailAttendeesOpen(false);
      setDetailAttendeesSearch('');
      setSlideMode('detail');
    },
    [companyUsers]
  );

  // Xử lý Lưu sự kiện mới
  const handleSaveNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventTitle.trim()) return;

    const attendeesNames = companyUsers
      .filter((u) => createEventAttendees.includes(String(u.id)))
      .map((u) => u.name)
      .join(', ');

    const recurrenceLabel = {
      none: '',
      daily: 'Mỗi ngày',
      weekly: 'Mỗi tuần',
      monthly: 'Mỗi tháng',
      yearly: 'Mỗi năm',
    }[createEventRecurrence];

    const descriptionParts: string[] = [];
    if (createEventDescription.trim()) {
      descriptionParts.push(createEventDescription.trim());
    }
    if (recurrenceLabel) {
      descriptionParts.push(`• Lặp lại: ${recurrenceLabel}`);
    }
    if (createEventNotifyMinutes > 0) {
      descriptionParts.push(`• Nhắc trước: ${createEventNotifyMinutes} phút`);
    }
    if (attendeesNames) {
      descriptionParts.push(`• Khách mời: ${attendeesNames}`);
    }

    const fullDescription = descriptionParts.join('\n');

    const effectiveEndDate = createEventEndDate && createEventEndDate >= createEventDate
      ? createEventEndDate
      : createEventDate;

    const isMultiDay = Boolean(effectiveEndDate && effectiveEndDate !== createEventDate);
    const isAllDay = createEventIsAllDay || isMultiDay;

    const newEvent: PlannerItem = {
      id: `bom-ev-${Date.now()}`,
      title: createEventTitle.trim(),
      description: fullDescription || undefined,
      type: 'event',
      date: createEventDate,
      endDate: effectiveEndDate,
      timeStart: isAllDay ? undefined : createEventTimeStart,
      timeEnd: isAllDay ? undefined : createEventTimeEnd,
      isAllDay: isAllDay,
      location: createEventLocation.trim() || undefined,
      category: 'meeting' as any,
      priority: createEventPriority as any,
      assigneeName: sessionUser.name,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    const updated = [newEvent, ...plannerItems];
    savePlannerItems(updated);

    await calendarEventService.createEvent(
      {
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date || createEventDate,
        endDate: effectiveEndDate,
        timeStart: newEvent.timeStart,
        timeEnd: newEvent.timeEnd,
        location: newEvent.location,
        category: newEvent.category,
        priority: newEvent.priority,
      },
      sessionUser
    );

    // TỰ ĐỘNG ĐẨY THÔNG BÁO VỚI NỘI DUNG PHÙ HỢP ĐẾN KHÁCH MỜI CÓ NÚT "ĐỒNG Ý", "TỪ CHỐI"
    if (createEventAttendees.length > 0) {
      dispatchEventInvitationNotifications(
        {
          title: newEvent.title,
          date: newEvent.date || createEventDate,
          timeStart: newEvent.timeStart,
          timeEnd: newEvent.timeEnd,
          isAllDay: newEvent.isAllDay,
          location: newEvent.location,
          description: createEventDescription,
          priority: newEvent.priority,
        },
        createEventAttendees,
        companyUsers,
        sessionUser
      );
    }

    setSlideMode('calendar');
    onShowToast?.(
      'success',
      'Đã tạo sự kiện',
      createEventAttendees.length > 0
        ? `Đã lưu sự kiện "${newEvent.title}" và gửi thông báo mời tham gia tới ${createEventAttendees.length} nhân sự.`
        : `Đã lưu sự kiện "${newEvent.title}" vào lịch.`
    );
  };

  // Xử lý Cập nhật sự kiện từ Slide chi tiết
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailEventTitle.trim() || !detailEventId) return;

    const attendeesNames = companyUsers
      .filter((u) => detailEventAttendees.includes(String(u.id)))
      .map((u) => u.name)
      .join(', ');

    const recurrenceLabel = {
      none: '',
      daily: 'Mỗi ngày',
      weekly: 'Mỗi tuần',
      monthly: 'Mỗi tháng',
      yearly: 'Mỗi năm',
    }[detailEventRecurrence];

    const descriptionParts: string[] = [];
    if (detailEventDescription.trim()) {
      descriptionParts.push(detailEventDescription.trim());
    }
    if (recurrenceLabel) {
      descriptionParts.push(`• Lặp lại: ${recurrenceLabel}`);
    }
    if (detailEventNotifyMinutes > 0) {
      descriptionParts.push(`• Nhắc trước: ${detailEventNotifyMinutes} phút`);
    }
    if (attendeesNames) {
      descriptionParts.push(`• Khách mời: ${attendeesNames}`);
    }

    const fullDescription = descriptionParts.join('\n');

    const effectiveEndDate = detailEventEndDate && detailEventEndDate >= detailEventDate
      ? detailEventEndDate
      : detailEventDate;

    const isMultiDay = Boolean(effectiveEndDate && effectiveEndDate !== detailEventDate);
    const isAllDay = detailEventIsAllDay || isMultiDay;

    const existing = plannerItems.find((it) => it.id === detailEventId);
    const updatedItem: PlannerItem = {
      id: detailEventId,
      title: detailEventTitle.trim(),
      description: fullDescription || undefined,
      type: 'event',
      date: detailEventDate,
      endDate: effectiveEndDate,
      timeStart: isAllDay ? undefined : detailEventTimeStart,
      timeEnd: isAllDay ? undefined : detailEventTimeEnd,
      isAllDay: isAllDay,
      location: detailEventLocation.trim() || undefined,
      category: 'meeting' as any,
      priority: detailEventPriority as any,
      assigneeName: sessionUser.name,
      status: 'todo',
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const updated = plannerItems.map((it) => (it.id === detailEventId ? updatedItem : it));
    savePlannerItems(updated);

    await calendarEventService.updateEvent(
      detailEventId,
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

    // Gửi thông báo cập nhật tới khách mời nếu có
    if (detailEventAttendees.length > 0) {
      dispatchEventInvitationNotifications(
        {
          title: updatedItem.title,
          date: updatedItem.date || detailEventDate,
          timeStart: updatedItem.timeStart,
          timeEnd: updatedItem.timeEnd,
          isAllDay: updatedItem.isAllDay,
          location: updatedItem.location,
          description: detailEventDescription,
          priority: updatedItem.priority,
        },
        detailEventAttendees,
        companyUsers,
        sessionUser
      );
    }

    setSlideMode('calendar');
    onShowToast?.('success', 'Đã cập nhật', `Đã cập nhật sự kiện "${updatedItem.title}".`);
  };

  // Xóa sự kiện
  const handleDeleteEvent = async (idToDelete: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này khỏi lịch?')) return;
    const updated = plannerItems.filter((it) => it.id !== idToDelete);
    savePlannerItems(updated);
    await calendarEventService.deleteEvent(idToDelete, sessionUser);
    setSlideMode('calendar');
    onShowToast?.('info', 'Đã xóa sự kiện', 'Sự kiện đã được xóa khỏi lịch.');
  };

  // ─── State Lịch Tháng (Slide 1) ─────────────────────────────────────────────
  const [refMonthDate, setRefMonthDate] = useState<Date>(() => new Date());
  const [selectedMonthDayKey, setSelectedMonthDayKey] = useState<string>(() => getTodayDateKey());
  const currentMonthCells = useMemo(() => getMonthGridCells(refMonthDate), [refMonthDate]);

  const monthHeaderLabel = useMemo(() => {
    const m = String(refMonthDate.getMonth() + 1).padStart(2, '0');
    return `Tháng ${m}/${refMonthDate.getFullYear()}`;
  }, [refMonthDate]);

  const selectedMonthDayEvents = useMemo(() => {
    return plannerItems
      .filter((it) => isEventOnDate(it, selectedMonthDayKey) && (it.type === 'event' || !it.type))
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  }, [plannerItems, selectedMonthDayKey]);

  // ─── State Lịch Tuần (Slide 2 - Mặc định) ──────────────────────────────────
  const [refWeekDate, setRefWeekDate] = useState<Date>(() => new Date());
  const weekDays = useMemo(() => getWeekDaysList(refWeekDate), [refWeekDate]);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => getTodayDateKey());

  // Đảm bảo mỗi khi mở drawer lịch sự kiện, tháng và ngày luôn được lấy động theo thời điểm hiện hành thực tế
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setRefMonthDate(now);
      setRefWeekDate(now);
      const todayKey = getTodayDateKey();
      setSelectedMonthDayKey(todayKey);
      setSelectedDayKey(todayKey);
    }
  }, [isOpen]);

  const weekHeaderLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    const mStart = String(first.date.getMonth() + 1).padStart(2, '0');
    const mEnd = String(last.date.getMonth() + 1).padStart(2, '0');
    const yStart = first.date.getFullYear();
    const yEnd = last.date.getFullYear();

    if (mStart === mEnd && yStart === yEnd) {
      return `Tháng ${mStart}/${yStart}`;
    }
    return `${mStart}/${yStart} - ${mEnd}/${yEnd}`;
  }, [weekDays]);

  const selectedDayEvents = useMemo(() => {
    return plannerItems
      .filter((it) => isEventOnDate(it, selectedDayKey) && (it.type === 'event' || !it.type))
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  }, [plannerItems, selectedDayKey]);

  const selectedDayInfo = useMemo(() => {
    const found = weekDays.find((d) => d.dateKey === selectedDayKey);
    if (found) return found;
    const parts = selectedDayKey.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const fullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const shortLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return {
        date: d,
        dateKey: selectedDayKey,
        shortLabel: shortLabels[d.getDay()],
        fullLabel: fullLabels[d.getDay()],
        dayNumber: String(d.getDate()).padStart(2, '0'),
        isToday: selectedDayKey === getTodayDateKey(),
      };
    }
    return null;
  }, [weekDays, selectedDayKey]);

  // ─── State Lịch Ngày (Slide 3) ─────────────────────────────────────────────
  const [currentDayDate, setCurrentDayDate] = useState<Date>(() => new Date());
  const currentDayKey = useMemo(() => {
    const y = currentDayDate.getFullYear();
    const m = String(currentDayDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDayDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDayDate]);

  const currentDayInfo = useMemo(() => {
    const fullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const d = currentDayDate;
    return {
      fullLabel: fullLabels[d.getDay()],
      dayNumber: String(d.getDate()).padStart(2, '0'),
      monthNumber: String(d.getMonth() + 1).padStart(2, '0'),
      yearNumber: d.getFullYear(),
      isToday: currentDayKey === getTodayDateKey(),
    };
  }, [currentDayDate, currentDayKey]);

  const currentDayEvents = useMemo(() => {
    return plannerItems
      .filter((it) => isEventOnDate(it, currentDayKey) && (it.type === 'event' || !it.type))
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  }, [plannerItems, currentDayKey]);

  // Đồng hồ thời gian thực cập nhật mỗi 30s
  const [nowTime, setNowTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Cuộn container sao cho đường kẻ đỏ luôn nằm chính giữa chiều cao hiển thị
  const scrollToCurrentTime = useCallback(() => {
    if (!timelineContainerRef.current || !currentTimeRef.current) return;
    const container = timelineContainerRef.current;
    const target = currentTimeRef.current;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Vị trí của target so với nội dung cuộn của container
    const targetTopRelativeToContainer = targetRect.top - containerRect.top + container.scrollTop;
    // Điểm cuộn để target nằm chính giữa viewport của container
    const desiredScrollTop = targetTopRelativeToContainer - container.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, desiredScrollTop),
      behavior: 'smooth',
    });
  }, []);

  // Tự động cuộn căn giữa đường đỏ khi mở tab Lịch Ngày hoặc khi chuyển về Hôm nay
  useEffect(() => {
    if (calendarViewType === 'day' && isOpen && currentDayInfo.isToday) {
      const timer1 = setTimeout(scrollToCurrentTime, 60);
      const timer2 = setTimeout(scrollToCurrentTime, 240);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [calendarViewType, isOpen, currentDayDate, currentDayInfo.isToday, scrollToCurrentTime]);

  // Khung giờ hiển thị trong timeline Lịch Ngày (đủ 24 giờ: từ 00:00 đến 23:00)
  const DAY_HOURS = useMemo(
    () => [
      '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
    ],
    []
  );

  // ─── State Lịch Biểu (Slide 4 - Agenda) ────────────────────────────────────
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  const agendaGroupedItems = useMemo(() => {
    const todayKey = getTodayDateKey();
    let filtered = plannerItems.filter((it) => it.type === 'event' || !it.type);

    if (agendaFilter === 'today') {
      filtered = filtered.filter((it) => it.date === todayKey);
    } else if (agendaFilter === 'upcoming') {
      filtered = filtered.filter((it) => !it.date || it.date >= todayKey);
    }

    if (agendaSearch.trim()) {
      const q = agendaSearch.toLowerCase();
      filtered = filtered.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.description && it.description.toLowerCase().includes(q)) ||
          (it.location && it.location.toLowerCase().includes(q))
      );
    }

    const groups: { [dateKey: string]: PlannerItem[] } = {};
    filtered.forEach((it) => {
      const k = it.date || 'Chưa xếp ngày';
      if (!groups[k]) groups[k] = [];
      groups[k].push(it);
    });

    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
    });

    return groups;
  }, [plannerItems, agendaSearch, agendaFilter]);

  const agendaDateSortedKeys = useMemo(() => {
    return Object.keys(agendaGroupedItems).sort((a, b) => a.localeCompare(b));
  }, [agendaGroupedItems]);


  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setSlideMode('calendar');
      }}
      title={
        slideMode === 'create'
          ? 'Tạo mới sự kiện'
          : slideMode === 'detail'
          ? 'Chi tiết sự kiện'
          : 'Lịch sự kiện'
      }
      bodyStyle={{
        padding: slideMode === 'calendar' ? '8px' : '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: slideMode === 'calendar' ? 'auto' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, boxSizing: 'border-box', overflow: 'hidden', flex: 1 }}>
        {slideMode === 'create' ? (
          /* ─── SLIDE 5: TẠO MỚI SỰ KIỆN ─── */
          <div
            id="slide-calendar-create-event"
            style={{
              height: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <form
              onSubmit={handleSaveNewEvent}
              style={{
                height: '100%',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Vùng nhập liệu cuộn */}
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
                    value={createEventTitle}
                    onChange={(e) => setCreateEventTitle(e.target.value)}
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
                        value={createEventDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setCreateEventDate(newStart);
                          if (!createEventEndDate || createEventEndDate < newStart) {
                            setCreateEventEndDate(newStart);
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
                        value={createEventEndDate || createEventDate}
                        min={createEventDate}
                        onChange={(e) => setCreateEventEndDate(e.target.value)}
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
                    const isMultiDay = Boolean(createEventEndDate && createEventEndDate !== createEventDate);
                    const isLocked = createEventIsAllDay || isMultiDay;
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
                            value={createEventTimeStart}
                            onChange={(e) => setCreateEventTimeStart(e.target.value)}
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
                            value={createEventTimeEnd}
                            onChange={(e) => setCreateEventTimeEnd(e.target.value)}
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
                                : (createEventIsAllDay ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary)'),
                              whiteSpace: 'nowrap',
                              opacity: isMultiDay ? 0.8 : 1,
                            }}
                            title={isMultiDay ? 'Sự kiện diễn ra nhiều ngày (mặc định cả ngày)' : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={isMultiDay ? true : createEventIsAllDay}
                              disabled={isMultiDay}
                              onChange={(e) => setCreateEventIsAllDay(e.target.checked)}
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
                      value={createEventLocation}
                      onChange={(e) => setCreateEventLocation(e.target.value)}
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
                      value={createEventRecurrence}
                      onChange={(e) => setCreateEventRecurrence(e.target.value as any)}
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
                        value={createEventNotifyMinutes}
                        onChange={(e) => setCreateEventNotifyMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
                      color: createEventAttendees.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
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
                        {createEventAttendees.length === 0
                          ? 'Chọn nhân viên tham gia...'
                          : `Đã chọn ${createEventAttendees.length} nhân viên`}
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
                            const isSelected = createEventAttendees.includes(String(user.id));
                            return (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setCreateEventAttendees((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== String(user.id))
                                      : [...prev, String(user.id)]
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
                          Đã chọn: <strong style={{ color: 'var(--color-primary, #0284c7)' }}>{createEventAttendees.length}</strong>
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {createEventAttendees.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCreateEventAttendees([])}
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

                  {createEventAttendees.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {companyUsers
                        .filter((u) => createEventAttendees.includes(String(u.id)))
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
                                setCreateEventAttendees((prev) => prev.filter((id) => id !== String(user.id)));
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
                      const isSel = createEventPriority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCreateEventPriority(p.id)}
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
                    value={createEventDescription}
                    onChange={(e) => setCreateEventDescription(e.target.value)}
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
                  justifyContent: 'flex-end',
                  gap: '8px',
                  paddingTop: '8px',
                  marginTop: '6px',
                  borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSlideMode('calendar')}
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
                  Hủy bỏ
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
                  <Check2 size={15} /> Lưu sự kiện
                </button>
              </div>
            </form>
          </div>
        ) : slideMode === 'detail' ? (
          /* ─── SLIDE 6: CHI TIẾT SỰ KIỆN ─── */
          <div
            id="slide-calendar-detail-event"
            style={{
              height: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <form
              onSubmit={handleUpdateEvent}
              style={{
                height: '100%',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
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
                {/* Tiêu đề */}
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                    Tiêu đề sự kiện <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={detailEventTitle}
                    onChange={(e) => setDetailEventTitle(e.target.value)}
                    required
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
                        value={detailEventDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setDetailEventDate(newStart);
                          if (!detailEventEndDate || detailEventEndDate < newStart) {
                            setDetailEventEndDate(newStart);
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
                        value={detailEventEndDate || detailEventDate}
                        min={detailEventDate}
                        onChange={(e) => setDetailEventEndDate(e.target.value)}
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
                    const isMultiDay = Boolean(detailEventEndDate && detailEventEndDate !== detailEventDate);
                    const isLocked = detailEventIsAllDay || isMultiDay;
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
                            value={detailEventTimeStart}
                            onChange={(e) => setDetailEventTimeStart(e.target.value)}
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
                            value={detailEventTimeEnd}
                            onChange={(e) => setDetailEventTimeEnd(e.target.value)}
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
                                : (detailEventIsAllDay ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary)'),
                              whiteSpace: 'nowrap',
                              opacity: isMultiDay ? 0.8 : 1,
                            }}
                            title={isMultiDay ? 'Sự kiện diễn ra nhiều ngày (mặc định cả ngày)' : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={isMultiDay ? true : detailEventIsAllDay}
                              disabled={isMultiDay}
                              onChange={(e) => setDetailEventIsAllDay(e.target.checked)}
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

                {/* Địa điểm */}
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
                      placeholder="VD: Phòng họp VIP..."
                      value={detailEventLocation}
                      onChange={(e) => setDetailEventLocation(e.target.value)}
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

                {/* Lặp lại và Thông báo trước */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Lặp lại
                    </label>
                    <select
                      value={detailEventRecurrence}
                      onChange={(e) => setDetailEventRecurrence(e.target.value as any)}
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
                        value={detailEventNotifyMinutes}
                        onChange={(e) => setDetailEventNotifyMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
                      <span style={{ position: 'absolute', right: '10px', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', pointerEvents: 'none' }}>
                        phút
                      </span>
                    </div>
                  </div>
                </div>

                {/* Khách mời */}
                <div ref={detailAttendeesDropdownRef} style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                    Khách mời
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDetailAttendeesOpen(!isDetailAttendeesOpen)}
                    style={{
                      width: '100%',
                      padding: '7px 11px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      color: detailEventAttendees.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
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
                        {detailEventAttendees.length === 0
                          ? 'Chọn nhân viên tham gia...'
                          : `Đã chọn ${detailEventAttendees.length} nhân viên`}
                      </span>
                    </div>
                    <ChevronDown
                      size={13}
                      color="var(--text-muted)"
                      style={{
                        transform: isDetailAttendeesOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {isDetailAttendeesOpen && (
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
                          value={detailAttendeesSearch}
                          onChange={(e) => setDetailAttendeesSearch(e.target.value)}
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
                            if (!detailAttendeesSearch.trim()) return true;
                            const q = detailAttendeesSearch.toLowerCase();
                            return u.name.toLowerCase().includes(q) || (u.department && u.department.toLowerCase().includes(q));
                          })
                          .map((user) => {
                            const isSelected = detailEventAttendees.includes(String(user.id));
                            return (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setDetailEventAttendees((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== String(user.id))
                                      : [...prev, String(user.id)]
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
                          Đã chọn: <strong style={{ color: 'var(--color-primary, #0284c7)' }}>{detailEventAttendees.length}</strong>
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {detailEventAttendees.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDetailEventAttendees([])}
                              style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Bỏ chọn hết
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsDetailAttendeesOpen(false)}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: 'var(--color-primary, #0284c7)', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailEventAttendees.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {companyUsers
                        .filter((u) => detailEventAttendees.includes(String(u.id)))
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
                                setDetailEventAttendees((prev) => prev.filter((id) => id !== String(user.id)));
                              }}
                            />
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Mức độ ưu tiên */}
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
                      const isSel = detailEventPriority === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setDetailEventPriority(p.id)}
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

                {/* Ghi chú / Tóm tắt */}
                <div style={{ flex: 1, minHeight: '80px', display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                    Tóm tắt nội dung
                  </label>
                  <textarea
                    placeholder="Mô tả mục tiêu, tài liệu cần chuẩn bị, ghi chú thêm..."
                    value={detailEventDescription}
                    onChange={(e) => setDetailEventDescription(e.target.value)}
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

              {/* FOOTER CHI TIẾT */}
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  marginTop: '6px',
                  borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(detailEventId)}
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

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSlideMode('calendar')}
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
                    Đóng
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
                    <Check2 size={15} /> Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* ─── 4 CHẾ ĐỘ XEM LỊCH (THÁNG, TUẦN, NGÀY, LỊCH BIỂU) ─── */
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
                backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                padding: '4px',
                borderRadius: 'var(--radius-md, 8px)',
                marginBottom: '8px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
              }}
            >
              {[
                { id: 'month', label: 'Tháng' },
                { id: 'week', label: 'Tuần' },
                { id: 'day', label: 'Ngày' },
                { id: 'agenda', label: 'Lịch biểu' },
              ].map((tab) => {
                const isActive = calendarViewType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCalendarViewType(tab.id as 'month' | 'week' | 'day' | 'agenda')}
                    style={{
                      padding: '6px 0',
                      textAlign: 'center',
                      fontSize: '0.78125rem',
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: 'var(--radius-sm, 6px)',
                      backgroundColor: isActive ? 'var(--color-primary, #0284c7)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              {/* 1. VIEW THÁNG */}
              {calendarViewType === 'month' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-md, 8px)',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRefMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                        }}
                        title="Tháng trước"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                        }}
                        title="Tháng sau"
                      >
                        <ChevronRight size={13} />
                      </button>

                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '4px' }}>
                        {monthHeaderLabel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setRefMonthDate(now);
                          setSelectedMonthDayKey(getTodayDateKey());
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.71875rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm, 4px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--color-primary, #0284c7)',
                          cursor: 'pointer',
                        }}
                      >
                        Hôm nay
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCreateSlide(selectedMonthDayKey)}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: 'none',
                          backgroundColor: 'var(--color-primary, #0284c7)',
                          color: '#ffffff',
                          cursor: 'pointer',
                        }}
                        title="Thêm sự kiện mới"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Lưới lịch tháng */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      backgroundColor: 'var(--bg-surface-1, #ffffff)',
                      padding: '8px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {currentMonthCells.map((cell) => {
                        const isSelected = cell.dateKey === selectedMonthDayKey;
                        const eventCount = plannerItems.filter((it) => isEventOnDate(it, cell.dateKey) && (it.type === 'event' || !it.type)).length;
                        return (
                          <button
                            key={cell.dateKey}
                            type="button"
                            onClick={() => setSelectedMonthDayKey(cell.dateKey)}
                            style={{
                              padding: '6px 2px',
                              borderRadius: '6px',
                              border: isSelected ? '1px solid var(--color-primary, #0284c7)' : '1px solid transparent',
                              backgroundColor: isSelected ? 'var(--color-primary, #0284c7)' : cell.isToday ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                              color: isSelected ? '#ffffff' : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted, #94a3b8)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: '38px',
                            }}
                          >
                            <span style={{ fontSize: '0.78125rem', fontWeight: isSelected || cell.isToday ? 700 : 500 }}>
                              {cell.dayNumber}
                            </span>
                            {eventCount > 0 && (
                              <span
                                style={{
                                  width: '4px',
                                  height: '4px',
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#ffffff' : '#0284c7',
                                  marginTop: '2px',
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Danh sách sự kiện của ngày đang chọn trong tháng */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Sự kiện ngày {selectedMonthDayKey} ({selectedMonthDayEvents.length})
                    </div>
                    {selectedMonthDayEvents.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Không có sự kiện nào trong ngày này.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedMonthDayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleOpenDetailSlide(ev)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle, #e2e8f0)',
                              backgroundColor: 'var(--bg-surface-1, #ffffff)',
                              cursor: 'pointer',
                              borderLeft: `3px solid ${getCategoryColor(ev.priority || ev.category)}`,
                            }}
                          >
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {ev.title}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>{ev.isAllDay ? 'Cả ngày' : `${ev.timeStart || ''} - ${ev.timeEnd || ''}`}</span>
                              {ev.location && <span>• {ev.location}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. VIEW TUẦN (MẶC ĐỊNH) */}
              {calendarViewType === 'week' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-md, 8px)',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRefWeekDate((prev) => {
                            const n = new Date(prev);
                            n.setDate(n.getDate() - 7);
                            return n;
                          });
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                        }}
                        title="Tuần trước"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefWeekDate((prev) => {
                            const n = new Date(prev);
                            n.setDate(n.getDate() + 7);
                            return n;
                          });
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                        }}
                        title="Tuần sau"
                      >
                        <ChevronRight size={13} />
                      </button>

                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '4px' }}>
                        {weekHeaderLabel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRefWeekDate(new Date());
                          setSelectedDayKey(getTodayDateKey());
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.71875rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm, 4px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--color-primary, #0284c7)',
                          cursor: 'pointer',
                        }}
                      >
                        Hôm nay
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCreateSlide(selectedDayKey)}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: 'none',
                          backgroundColor: 'var(--color-primary, #0284c7)',
                          color: '#ffffff',
                          cursor: 'pointer',
                        }}
                        title="Thêm sự kiện mới"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Thanh chọn 7 ngày trong tuần */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      backgroundColor: 'var(--bg-surface-1, #ffffff)',
                      padding: '6px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    {weekDays.map((wd) => {
                      const isSelected = wd.dateKey === selectedDayKey;
                      const count = plannerItems.filter((it) => isEventOnDate(it, wd.dateKey) && (it.type === 'event' || !it.type)).length;
                      return (
                        <button
                          key={wd.dateKey}
                          type="button"
                          onClick={() => setSelectedDayKey(wd.dateKey)}
                          style={{
                            padding: '6px 2px',
                            borderRadius: '6px',
                            border: isSelected ? '1px solid var(--color-primary, #0284c7)' : '1px solid transparent',
                            backgroundColor: isSelected ? 'var(--color-primary, #0284c7)' : wd.isToday ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontSize: '0.65625rem', opacity: isSelected ? 0.9 : 0.6, fontWeight: 600 }}>{wd.shortLabel}</span>
                          <span style={{ fontSize: '0.84375rem', fontWeight: 700, marginTop: '1px' }}>{wd.dayNumber}</span>
                          {count > 0 && (
                            <span
                              style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? '#ffffff' : '#0284c7',
                                marginTop: '2px',
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* KHỐI 3: TIÊU ĐỀ NGÀY ĐANG CHỌN */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selectedDayInfo
                          ? `${selectedDayInfo.fullLabel}, ${selectedDayInfo.dayNumber}/${String(
                              selectedDayInfo.date.getMonth() + 1
                            ).padStart(2, '0')}`
                          : 'Lịch ngày'}
                      </span>
                      {selectedDayInfo?.isToday && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(2, 132, 199, 0.12)',
                            color: 'var(--color-primary, #0284c7)',
                          }}
                        >
                          Hôm nay
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>
                      {selectedDayEvents.length} sự kiện
                    </span>
                  </div>

                  {/* KHỐI 4: DANH SÁCH THẺ SỰ KIỆN CHI TIẾT TRONG NGÀY */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingRight: '2px',
                    }}
                  >
                    {selectedDayEvents.length === 0 ? (
                      <div
                        style={{
                          padding: '36px 16px',
                          textAlign: 'center',
                          backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                          borderRadius: 'var(--radius-md, 8px)',
                          border: '1px dashed var(--border-subtle, #cbd5e1)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '10px',
                        }}
                      >
                        <CalendarCheck size={28} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                          Không có lịch trình trong ngày này
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateSlide(selectedDayKey)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--color-primary, #0284c7)',
                            backgroundColor: 'transparent',
                            color: 'var(--color-primary, #0284c7)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={14} /> Thêm sự kiện mới
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedDayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleOpenDetailSlide(ev)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle, #e2e8f0)',
                              backgroundColor: 'var(--bg-surface-1, #ffffff)',
                              cursor: 'pointer',
                              borderLeft: `4px solid ${getCategoryColor(ev.priority || ev.category)}`,
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ fontSize: '0.84375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {ev.title}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.65625rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: ev.priority === 'urgent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                                  color: ev.priority === 'urgent' ? '#ef4444' : '#0284c7',
                                }}
                              >
                                {ev.priority === 'urgent' ? 'Khẩn cấp' : 'Quan trọng'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={11} /> {ev.isAllDay ? 'Cả ngày' : `${ev.timeStart || ''} - ${ev.timeEnd || ''}`}
                              </span>
                              {ev.location && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <GeoAlt size={11} /> {ev.location}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. VIEW NGÀY (TIMELINE THEO GIỜ CÓ ĐƯỜNG ĐỎ CĂN GIỮA) */}
              {calendarViewType === 'day' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* THANH ĐIỀU HƯỚNG NGÀY */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-md, 8px)',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDayDate((prev) => {
                            const n = new Date(prev);
                            n.setDate(n.getDate() - 1);
                            return n;
                          });
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                        }}
                        title="Ngày hôm trước"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDayDate((prev) => {
                            const n = new Date(prev);
                            n.setDate(n.getDate() + 1);
                            return n;
                          });
                        }}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                        }}
                        title="Ngày hôm sau"
                      >
                        <ChevronRight size={13} />
                      </button>

                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '4px' }}>
                        {currentDayInfo.fullLabel}, {currentDayInfo.dayNumber}/{currentDayInfo.monthNumber}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentDayDate(new Date());
                          setTimeout(scrollToCurrentTime, 80);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.71875rem',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm, 4px)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          color: 'var(--color-primary, #0284c7)',
                          cursor: 'pointer',
                        }}
                      >
                        Hôm nay
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCreateSlide(currentDayKey)}
                        style={{
                          width: '26px',
                          height: '26px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: 'none',
                          backgroundColor: 'var(--color-primary, #0284c7)',
                          color: '#ffffff',
                          cursor: 'pointer',
                        }}
                        title="Thêm sự kiện mới"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* THANH TỔNG HỢP NHANH TRONG NGÀY */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {currentDayInfo.fullLabel}, {currentDayInfo.dayNumber}/{currentDayInfo.monthNumber}
                      </span>
                      {currentDayInfo.isToday && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(2, 132, 199, 0.12)',
                            color: 'var(--color-primary, #0284c7)',
                          }}
                        >
                          Hôm nay
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>
                      {currentDayEvents.length} sự kiện
                    </span>
                  </div>

                  {/* TIMELINE THEO GIỜ (HOURLY VIEW - ĐỦ 24 GIỜ) */}
                  <div
                    ref={timelineContainerRef}
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      paddingRight: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      position: 'relative',
                    }}
                  >
                    {DAY_HOURS.map((hourStr) => {
                      const hourNum = parseInt(hourStr.split(':')[0], 10);
                      const slotEvents = currentDayEvents.filter((ev) => {
                        if (!ev.timeStart) return false;
                        const evHour = parseInt(ev.timeStart.split(':')[0], 10);
                        return evHour === hourNum;
                      });

                      const isCurrentHour = currentDayInfo.isToday && nowTime.getHours() === hourNum;
                      const minutePercent = (nowTime.getMinutes() / 60) * 100;

                      return (
                        <div
                          key={hourStr}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            gap: '8px',
                            minHeight: slotEvents.length > 0 ? 'auto' : '40px',
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* ĐƯỜNG THẲNG MÀU ĐỎ HIỂN THỊ GIỜ HIỆN TẠI (VỚI BADGE VÀ CHẤM ĐỎ) */}
                          {isCurrentHour && (
                            <div
                              ref={currentTimeRef}
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: `${minutePercent}%`,
                                display: 'flex',
                                alignItems: 'center',
                                zIndex: 20,
                                pointerEvents: 'none',
                                transform: 'translateY(-50%)',
                              }}
                            >
                              <div
                                style={{
                                  width: '42px',
                                  textAlign: 'right',
                                  paddingRight: '4px',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-block',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    lineHeight: 1.1,
                                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
                                  }}
                                >
                                  {String(nowTime.getHours()).padStart(2, '0')}:
                                  {String(nowTime.getMinutes()).padStart(2, '0')}
                                </span>
                              </div>

                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ef4444',
                                  marginLeft: '-4px',
                                  marginRight: '-4px',
                                  flexShrink: 0,
                                  boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
                                }}
                              />

                              <div
                                style={{
                                  flex: 1,
                                  height: '2px',
                                  backgroundColor: '#ef4444',
                                  boxShadow: '0 1px 3px rgba(239, 68, 68, 0.35)',
                                }}
                              />
                            </div>
                          )}

                          {/* Cột mốc giờ */}
                          <div
                            style={{
                              width: '42px',
                              flexShrink: 0,
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: isCurrentHour ? '#ef4444' : 'var(--text-muted, #94a3b8)',
                              paddingTop: '2px',
                              textAlign: 'right',
                            }}
                          >
                            {hourStr}
                          </div>

                          {/* Khối sự kiện hoặc rãnh thời gian */}
                          <div
                            onClick={() => {
                              if (slotEvents.length === 0) {
                                const endH = String((hourNum + 1) % 24).padStart(2, '0');
                                handleOpenCreateSlide(currentDayKey);
                                setCreateEventTimeStart(hourStr);
                                setCreateEventTimeEnd(`${endH}:00`);
                              }
                            }}
                            style={{
                              flex: 1,
                              borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                              paddingTop: '2px',
                              paddingBottom: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              minHeight: '38px',
                              cursor: slotEvents.length === 0 ? 'pointer' : 'default',
                              borderRadius: '4px',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (slotEvents.length === 0) {
                                e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.04)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (slotEvents.length === 0) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            title={slotEvents.length === 0 ? `Nhấn để thêm sự kiện lúc ${hourStr}` : undefined}
                          >
                            {slotEvents.map((event) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetailSlide(event);
                                }}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-md, 8px)',
                                  backgroundColor: 'var(--bg-surface-1, #ffffff)',
                                  border: '1px solid var(--border-subtle, #e2e8f0)',
                                  borderLeft: `4px solid ${getCategoryColor(event.category || event.priority)}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  cursor: 'pointer',
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.71875rem',
                                      fontWeight: 700,
                                      color: 'var(--color-primary, #0284c7)',
                                    }}
                                  >
                                    <Clock size={11} />
                                    <span>
                                      {event.timeStart || '08:00'} - {event.timeEnd || '09:00'}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {event.priority === 'urgent' && (
                                      <span
                                        style={{
                                          fontSize: '0.65625rem',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                          color: '#ef4444',
                                          fontWeight: 600,
                                        }}
                                      >
                                        Khẩn cấp
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEvent(event.id);
                                      }}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-muted, #94a3b8)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      title="Xóa sự kiện"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    fontSize: '0.78125rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {event.title}
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    fontSize: '0.6875rem',
                                    color: 'var(--text-muted, #64748b)',
                                  }}
                                >
                                  {event.location && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <GeoAlt size={10} style={{ color: '#ef4444' }} />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                  {event.assigneeName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <People size={10} style={{ color: '#0284c7' }} />
                                      <span>{event.assigneeName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. VIEW LỊCH BIỂU (AGENDA) */}
              {calendarViewType === 'agenda' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Tìm sự kiện theo tên, địa điểm..."
                        value={agendaSearch}
                        onChange={(e) => setAgendaSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px 6px 26px',
                          fontSize: '0.78125rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateSlide()}
                      style={{
                        width: '28px',
                        height: '28px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: 'none',
                        backgroundColor: 'var(--color-primary, #0284c7)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Thêm sự kiện mới"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Bộ lọc phạm vi Lịch biểu */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '4px',
                      padding: '2px',
                      backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'today', label: 'Hôm nay' },
                      { id: 'upcoming', label: 'Sắp tới' },
                    ].map((f) => {
                      const isSel = agendaFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setAgendaFilter(f.id as any)}
                          style={{
                            padding: '4px 0',
                            textAlign: 'center',
                            fontSize: '0.71875rem',
                            fontWeight: isSel ? 700 : 500,
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: isSel ? '#ffffff' : 'transparent',
                            color: isSel ? 'var(--color-primary, #0284c7)' : 'var(--text-muted, #64748b)',
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    {agendaDateSortedKeys.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78125rem' }}>
                        Không tìm thấy sự kiện nào.
                      </div>
                    ) : (
                      agendaDateSortedKeys.map((dateKey) => (
                        <div key={dateKey} style={{ marginBottom: '12px' }}>
                          <div
                            style={{
                              fontSize: '0.71875rem',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                              padding: '2px 6px',
                              backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                              borderRadius: '4px',
                              marginBottom: '6px',
                            }}
                          >
                            {dateKey}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {agendaGroupedItems[dateKey].map((ev) => (
                              <div
                                key={ev.id}
                                onClick={() => handleOpenDetailSlide(ev)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle, #e2e8f0)',
                                  backgroundColor: 'var(--bg-surface-1, #ffffff)',
                                  cursor: 'pointer',
                                  borderLeft: `3px solid ${getCategoryColor(ev.priority || ev.category)}`,
                                }}
                              >
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {ev.title}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                                  <span>{ev.isAllDay ? 'Cả ngày' : `${ev.timeStart || ''} - ${ev.timeEnd || ''}`}</span>
                                  {ev.location && <span>• {ev.location}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Offcanvas>
  );
};
