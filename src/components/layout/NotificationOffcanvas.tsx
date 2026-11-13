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
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../common/ConfirmDialog';

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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quản lý 2 slide: Slide 1 (Danh sách), Slide 2 (Chi tiết)
  const [activeSlide, setActiveSlide] = useState<1 | 2>(1);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // Quản lý ConfirmDialog
  const [itemToDelete, setItemToDelete] = useState<NotificationItem | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState<boolean>(false);

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
      setSearchQuery('');
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
    if (selectedNotif?.id === id) {
      setActiveSlide(1);
      setSelectedNotif(null);
    }

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

  // Định dạng hiển thị người gửi | phòng ban
  const getSenderAndDept = (item: NotificationItem) => {
    let s = (item.sender || '').trim();
    if (!s || s.includes('Công ty cổ phần') || s.includes('Seajong Faucet') || s.toLowerCase().includes('admin')) {
      s = 'Ban Quản trị';
    }
    const d = (item.department || '').trim();
    if (d && d !== 'Hệ thống') {
      return `${s} | ${d}`;
    }
    return s;
  };

  // Lọc theo Tab và Từ khóa tìm kiếm
  const filtered = notifications.filter((item) => {
    if (tab === 'unread' && item.isRead) return false;
    if (tab === 'urgent' && item.type !== 'urgent' && item.priorityLevel !== 'urgent') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchContent = (item.content || '').toLowerCase().includes(q);
      const matchSender = (item.sender || '').toLowerCase().includes(q);
      const matchDept = (item.department || '').toLowerCase().includes(q);
      return matchTitle || matchContent || matchSender || matchDept;
    }

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

  const renderContentLines = (text: string) => {
    if (!text) return null;
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('---'));

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={idx} className="text-sm text-slate-700 leading-relaxed">
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
    <>
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

            {/* HEADER CHUẨN ĐỒNG BỘ TOÀN DỰ ÁN */}
            <div className="offcanvas-header bg-slate-50/90 border-b border-slate-200 py-3.5 px-4 flex items-center justify-between shrink-0">
              {activeSlide === 1 ? (
                <div className="offcanvas-header-content flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="offcanvas-header-icon shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.18) 100%)',
                      color: '#db2777',
                      borderColor: 'rgba(236, 72, 153, 0.25)',
                    }}
                    aria-hidden="true"
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="offcanvas-header-text min-w-0 flex-1">
                    <h3 className="offcanvas-title">Trung tâm thông báo</h3>
                    <div className="offcanvas-description">
                      {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="offcanvas-header-content flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setActiveSlide(1)}
                    className="px-2 py-1.5 -ml-1 rounded-lg text-slate-700 hover:text-pink-600 hover:bg-slate-200/70 transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
                    title="Quay về danh sách thông báo"
                  >
                    <ArrowLeft className="w-4 h-4 text-pink-600" />
                    <span>Quay lại</span>
                  </button>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <h3 className="offcanvas-title text-base">Chi tiết thông báo</h3>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {activeSlide === 1 && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-pink-600 hover:bg-slate-200/60 transition-colors text-xs flex items-center gap-1 font-semibold cursor-pointer"
                    title="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="w-4 h-4 text-pink-600" />
                    <span className="hidden sm:inline">Đã đọc hết</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="offcanvas-close-btn p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Đóng bảng trượt"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* VÙNG CHỨA 2 SLIDE CHUYỂN ĐỘNG TRƯỢT NGANG */}
            <div className="flex-1 overflow-hidden relative w-full h-full">
              <div 
                className="flex w-full h-full transition-transform duration-300 ease-in-out"
                style={{ transform: activeSlide === 1 ? 'translateX(0%)' : 'translateX(-100%)' }}
              >
                
                {/* ══════════════ SLIDE 1: DANH SÁCH THÔNG BÁO ══════════════ */}
                <div className="w-full min-w-full shrink-0 h-full flex flex-col bg-white overflow-hidden">
                  
                  {/* Hộp tìm kiếm thông báo */}
                  <div className="px-3.5 pt-2.5 pb-2 bg-slate-50/50 border-b border-slate-100 shrink-0">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm thông báo, người gửi, phòng ban..."
                        className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all text-slate-800 placeholder-slate-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs - chuẩn font size text-sm */}
                  <div className="flex items-center px-4 pt-2 border-b border-slate-100 gap-3 bg-white shrink-0">
                    <button
                      type="button"
                      onClick={() => setTab('all')}
                      className={`pb-2.5 text-sm font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
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
                      className={`pb-2.5 text-sm font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
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
                      className={`pb-2.5 text-sm font-semibold px-2 border-b-2 transition-colors cursor-pointer ${
                        tab === 'urgent'
                          ? 'border-pink-600 text-pink-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Khẩn cấp
                    </button>
                  </div>

                  {/* Danh sách items của Slide 1: nút xóa góc trên bên trái, tiêu đề, thời gian, người gửi | phòng ban, mức độ ưu tiên */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    {loading && notifications.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
                        <p className="text-sm font-medium">Đang tải thông báo...</p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <CheckCircle2 className="w-11 h-11 stroke-[1.5] text-slate-300 mb-2" />
                        <p className="text-sm font-medium">
                          {searchQuery ? 'Không tìm thấy thông báo phù hợp' : 'Không có thông báo nào'}
                        </p>
                      </div>
                    ) : (
                      filtered.map((item) => {
                        const priority = getPriorityBadge(item);
                        const senderAndDept = getSenderAndDept(item);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleOpenDetail(item)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                              !item.isRead
                                ? 'bg-pink-50/25 border-pink-200 shadow-xs hover:border-pink-300 hover:bg-pink-50/40'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            {!item.isRead && (
                              <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-pink-100"></span>
                            )}

                            {/* Dòng 1: Nút xóa ở góc trên bên trái (icon only) + Mức độ ưu tiên + Thời gian */}
                            <div className="flex items-center gap-2 mb-1.5 pr-5">
                              {/* Nút Xoá ở góc trên bên trái mỗi thông báo */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToDelete(item);
                                }}
                                className="p-1 -ml-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                                title="Xóa thông báo này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${priority.className}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                                {priority.label}
                              </span>

                              <span className="text-xs text-slate-500 font-medium">
                                {item.time}
                              </span>
                            </div>

                            {/* Dòng 2: Tiêu đề thông báo (chuẩn font text-sm font-bold) */}
                            <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-pink-600 transition-colors line-clamp-2">
                              {item.title}
                            </h4>

                            {/* Dòng 3: Người gửi | Bộ phận hoặc phòng ban + Mũi tên xem chi tiết */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate max-w-[270px]">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-slate-400 font-normal">Từ:</span>
                                <span className="font-semibold text-slate-700 truncate">
                                  {senderAndDept}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-semibold text-pink-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                                <span>Chi tiết</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Slide 1 */}
                  <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
                    <span className="text-xs">Hệ thống thông báo Seajong ERP</span>
                    <button
                      type="button"
                      onClick={() => setIsConfirmClearAllOpen(true)}
                      disabled={notifications.length === 0}
                      className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa tất cả</span>
                    </button>
                  </div>
                </div>

                {/* ══════════════ SLIDE 2: CHI TIẾT THÔNG BÁO ══════════════ */}
                <div className="w-full min-w-full shrink-0 h-full flex flex-col bg-white overflow-hidden">
                  {selectedNotif ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {/* Huy hiệu ưu tiên & thời gian */}
                        <div className="flex items-center justify-between gap-2">
                          {(() => {
                            const priority = getPriorityBadge(selectedNotif);
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${priority.className}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                                Mức độ: {priority.label}
                              </span>
                            );
                          })()}

                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {selectedNotif.time}
                          </span>
                        </div>

                        {/* Tiêu đề thông báo đầy đủ */}
                        <div className="pb-3 border-b border-slate-100">
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {selectedNotif.title}
                          </h3>
                        </div>

                        {/* Box thông tin nguồn gửi: Người gửi | Bộ phận hoặc phòng ban */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Nguồn gửi:</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {getSenderAndDept(selectedNotif)}
                            </span>
                          </div>
                        </div>

                        {/* Toàn bộ nội dung chi tiết */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Nội dung chi tiết
                          </label>
                          <div className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200">
                            {renderContentLines(selectedNotif.content)}
                          </div>
                        </div>

                        {/* Nút hành động trực tiếp xem chứng từ (nếu có liên kết) */}
                        {selectedNotif.link && (
                          <div className="pt-2">
                            <Link
                              to={selectedNotif.link}
                              onClick={onClose}
                              className="w-full py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
                            >
                              <span>Xem chi tiết chứng từ / hồ sơ</span>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Footer Slide 2 */}
                      <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                        <button
                          type="button"
                          onClick={() => setItemToDelete(selectedNotif)}
                          className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Xóa thông báo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveSlide(1)}
                          className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors cursor-pointer"
                        >
                          Quay về danh sách
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                      <Info className="w-9 h-9 stroke-[1.5] text-slate-300 mb-2" />
                      <p className="text-sm">Chưa chọn thông báo nào</p>
                      <button
                        type="button"
                        onClick={() => setActiveSlide(1)}
                        className="mt-3 text-sm text-pink-600 font-semibold hover:underline cursor-pointer"
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

      {/* DIALOG XÁC NHẬN XÓA TỪNG THÔNG BÁO */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Xác nhận xóa thông báo"
        message={
          <div>
            Bạn có chắc chắn muốn xóa thông báo này?
            {itemToDelete && (
              <p className="mt-2 p-2 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 line-clamp-2">
                {itemToDelete.title}
              </p>
            )}
          </div>
        }
        confirmText="Xóa thông báo"
        cancelText="Hủy bỏ"
        variant="danger"
        zIndex={1700}
        onConfirm={async () => {
          if (itemToDelete) {
            await deleteSingle(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* DIALOG XÁC NHẬN XÓA TẤT CẢ THÔNG BÁO */}
      <ConfirmDialog
        isOpen={isConfirmClearAllOpen}
        title="Xác nhận xóa tất cả thông báo"
        message="Bạn có chắc chắn muốn xóa toàn bộ danh sách thông báo? Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác."
        confirmText="Xóa tất cả"
        cancelText="Hủy bỏ"
        variant="danger"
        zIndex={1700}
        onConfirm={async () => {
          await clearAll();
          setIsConfirmClearAllOpen(false);
        }}
        onCancel={() => setIsConfirmClearAllOpen(false)}
      />
    </>
  );
};
