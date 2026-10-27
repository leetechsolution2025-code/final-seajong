import type { PlannerItem } from '../components/common/TodoListPlanner';
import type { UserProfile } from '../types';

export interface CalendarEventDTO {
  id: string;
  userId?: string;
  userEmail: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  category?: string;
  priority?: string;
  status?: string;
  assigneeName?: string;
  type?: 'event';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Lấy thông tin người dùng đang đăng nhập từ Session
 */
export function getCurrentSessionUser(): UserProfile {
  try {
    const raw = localStorage.getItem('seajong_user') || localStorage.getItem('decodoor_session') || sessionStorage.getItem('decodoor_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      const u = parsed.user || parsed;
      if (u) {
        const email = u.email || 'lecongvu@seajong.vn';
        const name = u.employee?.fullName || u.name || 'Lê Công Vụ';
        return {
          id: String(u.id || email),
          name: name,
          email: email,
          role: u.role || u.employee?.position || 'Giám đốc',
          department: u.employee?.departmentName || u.department || 'Ban Giám đốc',
          initials: name ? name.split(' ').map((p: string) => p[0]).join('').toUpperCase() : 'LCV',
        };
      }
    }
  } catch (err) {
    console.error('Lỗi khi đọc session:', err);
  }

  // Mặc định cho người dùng quản trị / giám đốc nếu chưa có session cụ thể
  return {
    id: 'usr-admin',
    name: 'Lê Công Vụ',
    email: 'lecongvu@seajong.vn',
    role: 'Giám đốc',
    department: 'Ban Giám đốc',
    initials: 'LCV',
  };
}

/**
 * Key localStorage riêng biệt theo từng tài khoản người dùng
 * Đảm bảo cô lập dữ liệu hoàn toàn: lịch của ai chỉ lưu trong vùng của người đó
 */
export function getUserEventsStorageKey(userEmail: string): string {
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `decodoor_calendar_events_${safeEmail}`;
}

/**
 * Đọc dữ liệu sự kiện đã lưu trong Cache cục bộ của người dùng
 */
export function getLocalCachedEvents(userEmail: string): PlannerItem[] {
  try {
    const key = getUserEventsStorageKey(userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Lỗi đọc cache sự kiện:', e);
  }
  return [];
}

/**
 * Lưu dữ liệu sự kiện vào Cache cục bộ của người dùng
 */
export function setLocalCachedEvents(userEmail: string, items: PlannerItem[]): void {
  try {
    const key = getUserEventsStorageKey(userEmail);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error('Lỗi ghi cache sự kiện:', e);
  }
}

/**
 * Service quản lý Lịch sự kiện cá nhân kết nối SQLite Database
 * Đảm bảo: Lịch của ai người đó xem (Phân quyền và cô lập dữ liệu cấp người dùng)
 */
export const calendarEventService = {
  /**
   * Tải danh sách sự kiện từ SQLite Database cho người dùng hiện tại
   */
  async getMyEvents(customUser?: UserProfile): Promise<PlannerItem[]> {
    const user = customUser || getCurrentSessionUser();
    const userEmail = user.email || user.id;

    try {
      const queryParams = new URLSearchParams({
        userEmail: userEmail,
        userId: user.id || userEmail,
      });

      const res = await fetch(`/api/calendar-events?${queryParams.toString()}`);
      if (res.ok) {
        const events: CalendarEventDTO[] = await res.json();
        const plannerItems: PlannerItem[] = events.map((ev) => ({
          id: ev.id,
          title: ev.title,
          description: ev.description || '',
          date: ev.date,
          endDate: ev.endDate || undefined,
          timeStart: ev.timeStart || '08:00',
          timeEnd: ev.timeEnd || '09:00',
          location: ev.location || undefined,
          category: (ev.category as any) || 'meeting',
          priority: (ev.priority as any) || 'high',
          status: (ev.status as any) || 'todo',
          assigneeName: ev.assigneeName || user.name,
          type: 'event',
          createdAt: ev.createdAt || new Date().toISOString(),
        }));

        // Đồng bộ vào cache của chính người dùng này
        setLocalCachedEvents(userEmail, plannerItems);
        return plannerItems;
      }
    } catch (err) {
      console.warn('Không thể kết nối đến máy chủ SQLite DB, sử dụng dữ liệu bộ nhớ đệm:', err);
    }

    // Nếu mạng chậm hoặc server chưa sẵn sàng, trả về cache của user
    return getLocalCachedEvents(userEmail);
  },

  /**
   * Tạo sự kiện mới cho người dùng hiện tại
   */
  async createEvent(
    data: {
      title: string;
      date: string;
      endDate?: string;
      timeStart?: string;
      timeEnd?: string;
      location?: string;
      description?: string;
      category?: string;
      priority?: string;
    },
    customUser?: UserProfile
  ): Promise<PlannerItem> {
    const user = customUser || getCurrentSessionUser();
    const userEmail = user.email || user.id;
    const eventId = `ev-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newItem: PlannerItem = {
      id: eventId,
      title: data.title.trim(),
      description: data.description || '',
      date: data.date,
      endDate: data.endDate || undefined,
      timeStart: data.timeStart || '08:00',
      timeEnd: data.timeEnd || '09:00',
      location: data.location?.trim() || undefined,
      category: (data.category as any) || 'meeting',
      priority: (data.priority as any) || 'high',
      status: 'todo',
      assigneeName: user.name,
      type: 'event',
      createdAt: new Date().toISOString(),
    };

    // 1. Cập nhật ngay vào cache của user để UI phản hồi lập tức (optimistic UI)
    const currentCached = getLocalCachedEvents(userEmail);
    const updatedCache = [newItem, ...currentCached];
    setLocalCachedEvents(userEmail, updatedCache);

    // 2. Gửi request lưu vào bảng calendar_events trong SQLite DB
    try {
      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newItem.id,
          userId: user.id || userEmail,
          userEmail: userEmail,
          title: newItem.title,
          description: newItem.description,
          date: newItem.date,
          endDate: newItem.endDate,
          timeStart: newItem.timeStart,
          timeEnd: newItem.timeEnd,
          location: newItem.location,
          category: newItem.category,
          priority: newItem.priority,
          status: newItem.status,
          assigneeName: newItem.assigneeName,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('Lỗi khi lưu sự kiện vào SQLite DB:', errJson);
      }
    } catch (e) {
      console.warn('Lỗi mạng khi lưu sự kiện:', e);
    }

    return newItem;
  },

  /**
   * Cập nhật sự kiện hiện có cho người dùng
   */
  async updateEvent(
    eventId: string,
    data: {
      title?: string;
      description?: string;
      date?: string;
      endDate?: string;
      timeStart?: string;
      timeEnd?: string;
      location?: string;
      category?: string;
      priority?: string;
      status?: string;
    },
    customUser?: UserProfile
  ): Promise<boolean> {
    const user = customUser || getCurrentSessionUser();
    const userEmail = user.email || user.id;

    // 1. Cập nhật cache của user
    const currentCached = getLocalCachedEvents(userEmail);
    const updatedCache = currentCached.map((it) => {
      if (it.id === eventId) {
        return {
          ...it,
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.date !== undefined ? { date: data.date } : {}),
          ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
          ...(data.timeStart !== undefined ? { timeStart: data.timeStart } : {}),
          ...(data.timeEnd !== undefined ? { timeEnd: data.timeEnd } : {}),
          ...(data.location !== undefined ? { location: data.location } : {}),
          ...(data.category !== undefined ? { category: data.category as any } : {}),
          ...(data.priority !== undefined ? { priority: data.priority as any } : {}),
          ...(data.status !== undefined ? { status: data.status as any } : {}),
        };
      }
      return it;
    });
    setLocalCachedEvents(userEmail, updatedCache);

    // 2. Gửi request PUT đến SQLite DB
    try {
      const res = await fetch(`/api/calendar-events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id || userEmail,
          userEmail: userEmail,
          ...data,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Lỗi mạng khi cập nhật sự kiện:', e);
      return true;
    }
  },

  /**
   * Xóa sự kiện (chỉ chủ sở hữu mới có quyền xóa)
   */
  async deleteEvent(eventId: string, customUser?: UserProfile): Promise<boolean> {
    const user = customUser || getCurrentSessionUser();
    const userEmail = user.email || user.id;

    // 1. Cập nhật cache của user lập tức
    const currentCached = getLocalCachedEvents(userEmail);
    const updatedCache = currentCached.filter((it) => it.id !== eventId);
    setLocalCachedEvents(userEmail, updatedCache);

    // 2. Gửi request xóa đến SQLite DB
    try {
      const queryParams = new URLSearchParams({
        userEmail: userEmail,
        userId: user.id || userEmail,
      });

      const res = await fetch(`/api/calendar-events/${eventId}?${queryParams.toString()}`, {
        method: 'DELETE',
      });

      return res.ok;
    } catch (e) {
      console.warn('Lỗi mạng khi xóa sự kiện:', e);
      return true;
    }
  },
};
