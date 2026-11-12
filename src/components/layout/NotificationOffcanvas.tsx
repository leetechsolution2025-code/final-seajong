import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  ShieldAlert,
  Trash2,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export interface NotificationItem {
  id: string;
  notificationId?: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  department: string;
  sender: string;
  time: string;
  isRead: boolean;
  link?: string;
  createdAt?: string;
}

interface NotificationOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export const NotificationOffcanvas: React.FC<NotificationOffcanvasProps> = ({
  isOpen,
  onClose,
  onUnreadChange,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'all' | 'unread' | 'urgent'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token');
      const res = await fetch('/api/notifications', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.id ? { 'x-chat-user-id': user.id } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          const unread = typeof data.unreadCount === 'number'
            ? data.unreadCount
            : data.notifications.filter((n: NotificationItem) => !n.isRead).length;
          onUnreadChange?.(unread);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, onUnreadChange]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    const newCount = Math.max(0, unreadCount - 1);
    onUnreadChange?.(newCount);

    try {
      const token = sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.id ? { 'x-chat-user-id': user.id } : {}),
        },
      });
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    onUnreadChange?.(0);

    try {
      const token = sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.id ? { 'x-chat-user-id': user.id } : {}),
        },
      });
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err);
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    setNotifications([]);
    onUnreadChange?.(0);

    try {
      const token = sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token');
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.id ? { 'x-chat-user-id': user.id } : {}),
        },
      });
    } catch (err) {
      console.error('Lỗi xoá tất cả thông báo:', err);
    }
  };

  const filtered = notifications.filter((item) => {
    if (tab === 'unread') return !item.isRead;
    if (tab === 'urgent') return item.type === 'urgent';
    return true;
  });

  const getBadgeStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          dot: 'bg-emerald-500',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
        };
      default:
        return {
          icon: Info,
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
          dot: 'bg-sky-500',
        };
    }
  };

  const renderContentLines = (text: string) => {
    if (!text) return null;
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('---'));

    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={idx} className="text-xs text-slate-600 leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-semibold text-slate-800">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer - tuân thủ chuẩn AGENTS.md width 400px */}
      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 max-w-full flex pl-0 md:pl-10 pointer-events-none">
        <div 
          className="offcanvas-panel pointer-events-auto w-full sm:w-[400px] max-w-[400px] h-full bg-white shadow-2xl flex flex-col border-0 sm:border-l border-slate-200 animate-slide-left"
          style={{ width: '400px' }}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center border border-pink-200">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Trung Tâm Thông Báo</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors text-xs flex items-center gap-1 font-medium cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-4 h-4 text-pink-600" />
                  <span className="text-[11px] hidden sm:inline text-slate-700">Đã đọc hết</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 pt-2.5 border-b border-slate-100 gap-2 bg-white">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`pb-2 text-xs font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
                tab === 'all'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('unread')}
              className={`pb-2 text-xs font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
                tab === 'unread'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('urgent')}
              className={`pb-2 text-xs font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
                tab === 'urgent'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Khẩn cấp
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && notifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-7 h-7 text-pink-500 animate-spin mb-2" />
                <p className="text-xs font-medium">Đang tải thông báo...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
                <p className="text-xs font-medium">Không có thông báo nào</p>
              </div>
            ) : (
              filtered.map((item) => {
                const style = getBadgeStyle(item.type);
                const Icon = style.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      !item.isRead
                        ? 'bg-pink-50/20 border-pink-200/70 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {!item.isRead && (
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-pink-100"></span>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${style.bg}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {item.department}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.time}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h4>

                        <div className="mt-1">
                          {renderContentLines(item.content)}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 truncate max-w-[170px]">
                            Từ: <span className="text-slate-700 font-medium">{item.sender}</span>
                          </span>

                          {item.link ? (
                            <Link
                              to={item.link}
                              onClick={() => {
                                markAsRead(item.id);
                                onClose();
                              }}
                              className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 shrink-0 ml-2"
                            >
                              <span>Xem chi tiết</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px]">Hệ thống thông báo Seajong ERP v2.0</span>
            <button
              type="button"
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
