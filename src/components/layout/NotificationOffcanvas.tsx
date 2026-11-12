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
  Loader2,
  ChevronRight,
  ArrowLeft,
  User,
  Clock,
  ExternalLink
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
  priority?: string;
  priorityLevel?: string;
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
  
  // Quản lý 2 slide: Slide 1 (Danh sách), Slide 2 (Chi tiết)
  const [activeSlide, setActiveSlide] = useState<1 | 2>(1);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

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
      setActiveSlide(1); // Mặc định mở ở Slide 1
      setSelectedNotif(null);
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const cleanSenderName = (sender?: string) => {
    if (!sender) return 'Hệ thống tự động';
    if (
      sender.includes('Công ty cổ phần Seajong') ||
      sender.includes('Seajong Faucet') ||
      sender.toLowerCase().includes('admin')
    ) {
      return 'Hệ thống tự động';
    }
    return sender;
  };

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
    setSelectedNotif(null);
    setActiveSlide(1);
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

  const deleteSingle = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setActiveSlide(1);
    setSelectedNotif(null);

    try {
      const token = sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token');
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user?.id ? { 'x-chat-user-id': user.id } : {}),
        },
      });
    } catch (err) {
      console.error('Lỗi xoá thông báo:', err);
    }
  };

  const handleOpenDetail = (item: NotificationItem) => {
    markAsRead(item.id);
    setSelectedNotif(item);
    setActiveSlide(2);
  };

  const filtered = notifications.filter((item) => {
    if (tab === 'unread') return !item.isRead;
    if (tab === 'urgent') return item.type === 'urgent' || item.priorityLevel === 'urgent';
    return true;
  });

  const getPriorityBadge = (item: NotificationItem) => {
    const pLevel = item.priorityLevel || (item.type === 'urgent' ? 'urgent' : 'normal');
    if (pLevel === 'urgent') {
      return {
        label: 'Khẩn cấp',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    }
    if (pLevel === 'high') {
      return {
        label: 'Ưu tiên cao',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (pLevel === 'low') {
      return {
        label: 'Thấp',
        className: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
    }
    return {
      label: 'Bình thường',
      className: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    };
  };

  const getBadgeStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
        };
      default:
        return {
          icon: Info,
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
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
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={idx} className="text-xs text-slate-700 leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-semibold text-slate-900">
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
          className="offcanvas-panel pointer-events-auto w-full sm:w-[400px] max-w-[400px] h-full bg-white shadow-2xl flex flex-col border-0 sm:border-l border-slate-200 animate-slide-left overflow-hidden"
          style={{ width: '400px' }}
        >

          {/* HEADER CHUNG */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            {activeSlide === 1 ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center border border-pink-200 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Trung tâm thông báo</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSlide(1)}
                  className="px-2 py-1 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Quay về danh sách thông báo"
                >
                  <ArrowLeft className="w-4 h-4 text-pink-600" />
                  <span>Quay lại</span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-800">Chi tiết thông báo</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              {activeSlide === 1 && unreadCount > 0 && (
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VÙNG CHỨA 2 SLIDE CHUYỂN ĐỘNG TRƯỢT NGANG */}
          <div className="flex-1 overflow-hidden relative">
            <div 
              className="flex w-[200%] h-full transition-transform duration-300 ease-in-out"
              style={{ transform: activeSlide === 1 ? 'translateX(0%)' : 'translateX(-50%)' }}
            >
              
              {/* ══════════════ SLIDE 1: DANH SÁCH THÔNG BÁO ══════════════ */}
              <div className="w-1/2 h-full flex flex-col bg-white">
                {/* Filter Tabs */}
                <div className="flex items-center px-4 pt-2.5 border-b border-slate-100 gap-2 bg-white shrink-0">
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

                {/* Danh sách items của Slide 1: hiển thị tiêu đề, thời gian, người gửi, mức độ ưu tiên */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
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
                      const priority = getPriorityBadge(item);
                      const senderName = cleanSenderName(item.sender);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenDetail(item)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                            !item.isRead
                              ? 'bg-pink-50/20 border-pink-200/80 shadow-xs hover:border-pink-300 hover:bg-pink-50/30'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          {!item.isRead && (
                            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-pink-100"></span>
                          )}

                          {/* Dòng 1: Mức độ ưu tiên + Thời gian */}
                          <div className="flex items-center gap-1.5 mb-1.5 pr-4">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${priority.className}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                              {priority.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.time}
                            </span>
                          </div>

                          {/* Dòng 2: Tiêu đề thông báo */}
                          <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-pink-600 transition-colors line-clamp-2">
                            {item.title}
                          </h4>

                          {/* Dòng 3: Người gửi + Mũi tên xem chi tiết */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[280px]">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-slate-400">Từ:</span>
                              <span className="font-medium text-slate-700 truncate">{senderName}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-[11px] font-semibold text-pink-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                              <span>Chi tiết</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Slide 1 */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
                  <span className="text-[11px]">Hệ thống thông báo Seajong ERP</span>
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

              {/* ══════════════ SLIDE 2: CHI TIẾT THÔNG BÁO ══════════════ */}
              <div className="w-1/2 h-full flex flex-col bg-white">
                {selectedNotif ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      
                      {/* Huy hiệu ưu tiên & thời gian */}
                      <div className="flex items-center justify-between gap-2">
                        {(() => {
                          const priority = getPriorityBadge(selectedNotif);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priority.className}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                              Mức độ: {priority.label}
                            </span>
                          );
                        })()}

                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {selectedNotif.time}
                        </span>
                      </div>

                      {/* Tiêu đề thông báo đầy đủ */}
                      <div className="pb-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {selectedNotif.title}
                        </h3>
                      </div>

                      {/* Box thông tin nguồn gửi */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Phòng ban liên quan:</span>
                          <span className="font-semibold text-slate-800">{selectedNotif.department}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Người gửi:</span>
                          <span className="font-semibold text-slate-800">{cleanSenderName(selectedNotif.sender)}</span>
                        </div>
                      </div>

                      {/* Toàn bộ nội dung chi tiết */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Nội dung chi tiết
                        </label>
                        <div className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200/70">
                          {renderContentLines(selectedNotif.content)}
                        </div>
                      </div>

                      {/* Nút hành động trực tiếp xem chứng từ (nếu có liên kết) */}
                      {selectedNotif.link && (
                        <div className="pt-2">
                          <Link
                            to={selectedNotif.link}
                            onClick={onClose}
                            className="w-full py-2.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                          >
                            <span>Xem chi tiết chứng từ / hồ sơ</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Footer Slide 2 */}
                    <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                      <button
                        type="button"
                        onClick={() => deleteSingle(selectedNotif.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa thông báo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSlide(1)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Quay về danh sách
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                    <Info className="w-8 h-8 stroke-[1.5] text-slate-300 mb-2" />
                    <p className="text-xs">Chưa chọn thông báo nào</p>
                    <button
                      type="button"
                      onClick={() => setActiveSlide(1)}
                      className="mt-3 text-xs text-pink-600 font-semibold hover:underline cursor-pointer"
                    >
                      Quay về danh sách
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
