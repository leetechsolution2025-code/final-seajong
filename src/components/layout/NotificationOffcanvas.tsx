import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Calendar, 
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  department: string;
  sender: string;
  time: string;
  isRead: boolean;
  link?: string;
}

interface NotificationOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Phê duyệt hạn mức tín dụng',
    content: 'Ban Giám đốc đã thông qua đề xuất cấp hạn mức tín dụng 2.5 tỷ ₫ cho Nhà phân phối Miền Trung.',
    type: 'success',
    department: 'Ban Giám đốc',
    sender: 'Lê Công Vụ (CEO)',
    time: '15 phút trước',
    isRead: false,
    link: '/board',
  },
  {
    id: 'notif-2',
    title: 'Biên bản nghiệm thu KCS SJ-304',
    content: 'Phòng Quản lý chất lượng hoàn thành kiểm định lô sen vòi mạ crom SJ-304 với tỷ lệ đạt 99.8%.',
    type: 'info',
    department: 'Đảm bảo chất lượng QA',
    sender: 'Hà Thị Thu (Trưởng phòng QA)',
    time: '45 phút trước',
    isRead: false,
    link: '/qa',
  },
  {
    id: 'notif-3',
    title: 'Lệnh xuất kho số XK-2026-SJ92',
    content: 'Đã xuất 150 bộ sen vòi cao cấp giao đại lý dự án Hải Phòng. Xe tải BKS 29H-882.11 đang vận chuyển.',
    type: 'info',
    department: 'Kho vận & Logistics',
    sender: 'Ngô Hoàng Yến (Quản lý kho)',
    time: '2 giờ trước',
    isRead: false,
    link: '/logistics',
  },
  {
    id: 'notif-4',
    title: 'Cảnh báo tồn kho phôi đồng thấp',
    content: 'Tồn kho nguyên liệu đồng hợp kim CW617N tại Phân xưởng Đúc chỉ còn đủ cho 4 ngày sản xuất. Yêu cầu nhập gấp.',
    type: 'urgent',
    department: 'Mua hàng & Cung ứng',
    sender: 'Hệ thống tự động',
    time: '4 giờ trước',
    isRead: true,
    link: '/purchase',
  },
  {
    id: 'notif-5',
    title: 'Tổng hợp chấm công ca ngày',
    content: 'Phòng Nhân sự đã hoàn tất đối soát dữ liệu vân tay 24 cán bộ nhân viên trong ca làm việc hôm nay.',
    type: 'info',
    department: 'Nhân sự HR',
    sender: 'Cao Thị Phương (Trưởng phòng NS)',
    time: 'Hôm qua',
    isRead: true,
    link: '/hr',
  },
];

export const NotificationOffcanvas: React.FC<NotificationOffcanvasProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [tab, setTab] = useState<'all' | 'unread' | 'urgent'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  const clearAll = () => {
    setNotifications([]);
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
          
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
            {filtered.length === 0 ? (
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
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-pink-500"></span>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${style.bg}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-1.5 mb-1">
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

                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {item.content}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Từ: <span className="text-slate-700 font-medium">{item.sender}</span>
                          </span>

                          {item.link && (
                            <Link
                              to={item.link}
                              onClick={onClose}
                              className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                            >
                              <span>Xem chi tiết</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
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
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors cursor-pointer"
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
