import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDepartment } from '../../context/DepartmentContext';
import { CasioCalculator } from '../common/CasioCalculator';
import { NotificationOffcanvas } from './NotificationOffcanvas';
import { MessageOffcanvas, type SalesStaffMember } from './MessageOffcanvas';
import { AccountSettingsModal } from './AccountSettingsModal';
import { getAvatarInitials } from '../../utils/avatar';
import { canAccessDepartment, hasPermission, isAdminUser } from '../../lib/permissions';

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface Department {
  code: string;
  nameVi: string;
  nameEn: string;
  group: string;
  sortOrder: number;
}

const SYSTEM_DEPT_CODES = new Set([
  'board',
  'hr',
  'finance',
  'sales',
  'marketing',
  'logistics',
  'purchase',
  'qa',
  'production',
]);

const DEPT_LABEL: Record<string, string> = {
  board: 'Ban Giám đốc',
  hr: 'Phòng Nhân sự',
  finance: 'Tài chính - Kế toán',
  sales: 'Phòng Kinh doanh',
  marketing: 'Phòng Marketing',
  logistics: 'Kho vận & Logistics',
  purchase: 'Phòng Mua hàng',
  qa: 'Đảm bảo chất lượng',
  production: 'Sản xuất',
};

export const Topbar: React.FC<TopbarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { activeDeptCode, setActiveDeptCode, setActiveMenuKey, navigateToUserDept } = useDepartment();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [salesPickerOpen, setSalesPickerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [salesStaffList, setSalesStaffList] = useState<SalesStaffMember[]>([]);
  const [selectedSalesStaff, setSelectedSalesStaff] = useState<SalesStaffMember | null>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const switcherRef = useRef<HTMLDivElement>(null);
  const salesPickerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch departments for Quick Switcher
  useEffect(() => {
    fetch('/api/departments')
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ success: boolean; data: Department[] }>;
      })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setDepartments(
            res.data.filter((d) => SYSTEM_DEPT_CODES.has((d.code || '').toLowerCase()))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
      if (salesPickerRef.current && !salesPickerRef.current.contains(e.target as Node)) {
        setSalesPickerOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // F2 Shortcut for Calculator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCalcOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute User Initials via unified utility
  const userName = user?.name || 'Lê Công Vụ';
  const userInitials = getAvatarInitials(userName);

  const POSITION_MAP: Record<string, string> = {
    'vtr-20260401-8730-eauc': 'Giám đốc',
    'vtr-20260401-1547-pvnx': 'Trợ lý giám đốc',
    'vtr-20260401-1964-sbmg': 'Trưởng phòng',
    'vtr-20260401-5965-bpwb': 'Thủ kho',
    'vtr-20260506-8426-tbrm': 'Phụ kho',
    'vtr-20260423-1936-rhsc': 'Media',
    'vtr-20260423-7487-kbld': 'Design',
    'vtr-20260423-8087-dhzp': 'Content',
    'vtr-20260423-9537-ppxf': 'SEO',
    'vtr-20260423-5271-tfgm': 'Quản đốc xưởng sản xuất',
    'vtr-20260506-4479-xema': 'Kế toán',
    'vtr-20260506-5443-ydsz': 'Kế toán nội bộ',
    'vtr-20260506-4026-xhba': 'Kế toán tổng hợp',
    'vtr-20260506-1576-bahy': 'Lắp ráp',
    'vtr-20260506-4259-uwpn': 'Giao hàng',
    'vtr-20260506-6329-ltts': 'Mua hàng',
    'vtr-20260506-0090-kkjp': 'Lái xe',
    'vtr-20260506-6657-nwnu': 'Tạp vụ',
    'vtr-20260506-0437-ktqb': 'Cộng tác viên',
    'vtr-20260508-5167-ugnx': 'Bán hàng',
    'vtr-20260603-9393-rvwb': 'Giao hàng',
    'vtr-20260603-2034-jjbl': 'Trưởng bộ phận',
  };

  // Nhận diện tài khoản Khách hàng vs Đại lý / Nhà phân phối
  const isCustomer =
    user?.role === 'CUSTOMER' ||
    user?.departmentCode === 'customer' ||
    user?.email?.includes('@customer.');
  const isDealer =
    !isCustomer &&
    (user?.role === 'DEALER' ||
      !!user?.customer ||
      !!(user as any)?.customerId ||
      user?.departmentCode === 'dealer' ||
      user?.email?.includes('@dealer.'));

  const rawPosition = user?.employee?.position || user?.position || '';
  const userPosition = isCustomer
    ? 'Khách hàng thân thiết'
    : isDealer
    ? (user?.customer?.loai ? `Đại lý ${user.customer.loai}` : 'Đại lý chính thức')
    : (POSITION_MAP[rawPosition] || rawPosition || (user?.role === 'ADMIN' ? 'Giám đốc' : 'Nhân viên'));

  const userSubtitle = isCustomer
    ? (user?.customer?.code ? `Khách hàng • ${user.customer.code}` : 'Khách hàng thân thiết')
    : isDealer
    ? (user?.customer?.code ? `Đại lý • ${user.customer.code}` : 'Đại lý chính thức')
    : userPosition;

  const isAdminAccount = !isDealer && !isCustomer && isAdminUser(user);
  const canUseNotify = hasPermission(user, 'notify');
  const canUseChat = true;

  // Polling số lượng tin nhắn chưa đọc mỗi 5s theo mã định danh
  useEffect(() => {
    const chatUserId = isCustomer
      ? String(user?.id || 'guest-customer')
      : String(user?.id || user?.employee?.id || user?.employee?.code || '');
    if (!chatUserId) return;

    const fetchUnread = async () => {
      try {
        const token =
          sessionStorage.getItem('seajong_token') || localStorage.getItem('seajong_token') || '';
        const headers: Record<string, string> = { 'X-Chat-User-Id': chatUserId };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch('/api/messages', { headers });
        if (res.ok) {
          const data = await res.json();
          setUnreadMsgCount(Number(data.unreadCount || 0));
        }
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 5000);
    return () => clearInterval(timer);
  }, [isCustomer, user?.id, user?.employee?.id, user?.employee?.code]);

  // Polling số lượng thông báo chưa đọc mỗi 15s
  useEffect(() => {
    if (isCustomer) return;
    const fetchUnreadNotifications = async () => {
      try {
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
          if (typeof data.unreadCount === 'number') {
            setUnreadNotifCount(data.unreadCount);
          }
        }
      } catch {
        // ignore
      }
    };

    fetchUnreadNotifications();
    const timer = setInterval(fetchUnreadNotifications, 10000);

    const handleNotifUpdate = () => {
      fetchUnreadNotifications();
    };
    window.addEventListener('decodoor_notifications_updated', handleNotifUpdate);
    window.addEventListener('seajong_notifications_updated', handleNotifUpdate);
    window.addEventListener('decodoor_notification_created', handleNotifUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener('decodoor_notifications_updated', handleNotifUpdate);
      window.removeEventListener('seajong_notifications_updated', handleNotifUpdate);
      window.removeEventListener('decodoor_notification_created', handleNotifUpdate);
    };
  }, [isCustomer, user?.id]);

  // Nạp danh sách nhân viên Phòng Kinh doanh theo mã định danh departmentCode === 'sales'
  useEffect(() => {
    if (!isCustomer) return;
    let cancelled = false;

    const loadSalesStaff = async () => {
      try {
        const res = await fetch('/api/users');
        let rawList: any[] = [];
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) rawList = data;
        }
        if (rawList.length === 0) {
          const bRes = await fetch('/api/board/users');
          if (bRes.ok) {
            const bData = await bRes.json();
            if (Array.isArray(bData)) {
              rawList = bData
                .filter((u: any) => u.employee)
                .map((u: any) => ({
                  id: u.id,
                  userId: u.id,
                  employeeId: u.employee?.id || '',
                  code: u.employee?.code || '',
                  name: u.employee?.fullName || u.name,
                  phone: u.employee?.phone || '',
                  email: u.email || '',
                  position: u.employee?.position || 'Bán hàng',
                  department: u.employee?.departmentName || 'Kinh doanh',
                  departmentCode: u.employee?.departmentCode || '',
                }));
            }
          }
        }

        const salesOnly: SalesStaffMember[] = rawList
          .filter((item: any) => String(item.departmentCode || '').toLowerCase() === 'sales')
          .map((item: any) => {
            const rawPos = String(item.positionCode || item.position || '');
            const cleanPos =
              POSITION_MAP[rawPos] || (rawPos.startsWith('vtr-') ? 'Bán hàng' : rawPos) || 'Bán hàng';
            const fullName = item.name || item.fullName || 'Nhân viên Kinh doanh';
            const uniqueId = String(item.userId || item.id || item.employeeId || item.code);
            return {
              id: uniqueId,
              code: String(item.code || item.employeeId || uniqueId),
              name: fullName,
              position: cleanPos,
              department: 'Phòng Kinh doanh',
              departmentCode: 'sales',
              phone: item.phone || '',
              email: item.email || '',
              avatarText: getAvatarInitials(fullName),
            };
          });

        const finalList: SalesStaffMember[] =
          salesOnly.length > 0
            ? salesOnly
            : [
                {
                  id: 'cmsbc9bfu00voyg9msjo51cs3',
                  code: 'EMP-20260802-0737-W52I',
                  name: 'Nguyên Văn Thành',
                  position: 'Bán hàng',
                  department: 'Phòng Kinh doanh',
                  departmentCode: 'sales',
                  phone: '0981183234',
                  avatarText: 'NT',
                },
                {
                  id: 'cmsbmcjyn00xayg9m09qq3d9d',
                  code: 'EMP-20260802-1273-I1N6',
                  name: 'Lê Vụ',
                  position: 'Trưởng phòng',
                  department: 'Phòng Kinh doanh',
                  departmentCode: 'sales',
                  phone: '0931399343',
                  avatarText: 'LV',
                },
                {
                  id: 'cmvv5z1fw0anoyge82m3f6gig',
                  code: 'EMP-20261030-8148-D642',
                  name: 'Đoàn Thị Yến',
                  position: 'Bán hàng',
                  department: 'Phòng Kinh doanh',
                  departmentCode: 'sales',
                  phone: '0982191626',
                  avatarText: 'ĐY',
                },
              ];

        if (cancelled) return;
        setSalesStaffList(finalList);

        let initialSelected = finalList[0] || null;
        try {
          const savedRaw = localStorage.getItem('seajong_selected_sales_staff_v1');
          if (savedRaw) {
            const parsed = JSON.parse(savedRaw);
            const matched = finalList.find(
              (s) =>
                String(s.id) === String(parsed?.id) ||
                (Boolean(parsed?.code) && String(s.code) === String(parsed.code))
            );
            if (matched) initialSelected = matched;
          }
        } catch {
          // ignore
        }
        setSelectedSalesStaff(initialSelected);
      } catch {
        // ignore
      }
    };

    loadSalesStaff();
    return () => {
      cancelled = true;
    };
  }, [isCustomer]);

  const handleSelectSalesStaff = (staff: SalesStaffMember) => {
    setSelectedSalesStaff(staff);
    try {
      localStorage.setItem('seajong_selected_sales_staff_v1', JSON.stringify(staff));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 w-full bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs select-none">
        
        {/* ── LEFT: Toggle + Divider + Brand (chính xác như hình screenshot) ── */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu button with Bootstrap icon (Ẩn khi ở trang Khách hàng không có Sidebar) */}
          {!isCustomer && (
            <>
              <button
                type="button"
                onClick={onToggle}
                className="w-[38px] h-[38px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                title="Thu gọn / Mở rộng Sidebar"
              >
                <i className="bi bi-list text-[24px]" />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block opacity-60"></div>
            </>
          )}

          {/* Brand header in Topbar (Logo + Brand Text) */}
          <button
            type="button"
            onClick={() => {
              if (isCustomer) {
                setActiveDeptCode('customer');
              } else if (user?.role === 'DEALER' || isDealer) {
                setActiveDeptCode('dealer');
              } else if (canAccessDepartment(user, 'board')) {
                setActiveDeptCode('board');
              } else {
                navigateToUserDept();
              }
            }}
            className="flex items-center gap-3 text-left cursor-pointer border-0 bg-transparent group p-0"
            title={
              isCustomer
                ? 'Về Cổng thông tin Khách hàng (Trang chủ)'
                : user?.role === 'DEALER'
                ? 'Về Cổng Đại lý (Trang chủ)'
                : 'Về Trang chủ bộ phận'
            }
          >
            <div className="h-10 w-auto flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Seajong" className="h-9 w-auto object-contain" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[13.5px] font-black text-slate-900 tracking-tight uppercase leading-tight font-sans">
                CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM
              </span>
              <span className="text-[11px] text-slate-500 font-normal leading-none mt-0.5">
                {isCustomer
                  ? 'Cổng thông tin Khách hàng & Bảo hành điện tử'
                  : user?.role === 'DEALER'
                  ? 'Hệ thống đại lý và nhà phân phối'
                  : 'Kinh doanh thiết bị phòng tắm, nhà bếp'}
              </span>
            </div>
          </button>
        </div>

        {/* ── RIGHT: Quick Actions with Bootstrap Icons & User Profile ── */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          
          {isCustomer ? (
            <div className="relative" ref={salesPickerRef}>
              <button
                type="button"
                onClick={() => {
                  setSalesPickerOpen(!salesPickerOpen);
                  setUserMenuOpen(false);
                  setSwitcherOpen(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold mr-1 shadow-2xs transition-all cursor-pointer"
                title="Nhấn để chọn Nhân viên bán hàng hỗ trợ (Phòng Kinh doanh)"
              >
                <i className="bi bi-person-badge-fill text-emerald-600 text-sm" />
                <span className="hidden md:inline text-slate-600 font-medium">
                  Nhân viên bán hàng:
                </span>
                <span className="font-bold text-emerald-900 truncate max-w-[115px] sm:max-w-[160px]">
                  {selectedSalesStaff?.name || 'Chọn NV bán hàng'}
                </span>
                <i className="bi bi-chevron-down text-[10px] text-emerald-700" />
              </button>

              {salesPickerOpen && (
                <div className="fixed left-3 right-3 top-[68px] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-dropdown">
                  <div className="pb-2 mb-2 border-b border-slate-100 flex items-center justify-between gap-2 px-1">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
                        Nhân viên Bán hàng
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate m-0">
                        Chọn nhân viên Phòng Kinh doanh hỗ trợ bạn
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Phòng Kinh doanh ({salesStaffList.length})
                    </span>
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {salesStaffList.map((staff) => {
                      const isSelected =
                        selectedSalesStaff &&
                        (String(selectedSalesStaff.id) === String(staff.id) ||
                          (Boolean(selectedSalesStaff.code) &&
                            String(selectedSalesStaff.code) === String(staff.code)));
                      return (
                        <div
                          key={staff.id}
                          onClick={() => {
                            handleSelectSalesStaff(staff);
                            setSalesPickerOpen(false);
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/70'
                              : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-800 text-white'
                                }`}
                              >
                                {staff.avatarText}
                              </div>
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {staff.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 font-semibold shrink-0">
                                  {staff.position}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                                {staff.code ? `${staff.code}` : 'Phòng Kinh doanh'}
                                {staff.phone ? ` • ${staff.phone}` : ''}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSalesStaff(staff);
                              setSalesPickerOpen(false);
                              setMsgOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer border-0 shadow-2xs"
                            title={`Chat trực tiếp với ${staff.name}`}
                          >
                            <i className="bi bi-chat-dots-fill text-[11px]" />
                            <span>Chat</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSalesStaff && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSalesPickerOpen(false);
                          setMsgOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-xs"
                      >
                        <i className="bi bi-chat-dots-fill text-xs" />
                        <span>Chat ngay với {selectedSalesStaff.name}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : user?.role === 'DEALER' || isDealer ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 text-sky-800 rounded-full text-xs font-semibold mr-1 shadow-2xs">
              <i className="bi bi-shop text-sky-600 text-sm" />
              <span className="hidden md:inline text-slate-600 font-medium">Đại lý:</span>
              <span className="font-bold text-sky-900">{user?.customer?.code || user?.name}</span>
            </div>
          ) : (
            /* 1. App Switcher Grid (bi-grid-3x3-gap-fill) */
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => {
                  setSwitcherOpen(!switcherOpen);
                  setUserMenuOpen(false);
                }}
                className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl transition-all cursor-pointer border-0 ${
                  switcherOpen 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent'
                }`}
                title="Quản lý trực tiếp (Chuyển bộ phận)"
              >
                <i className="bi bi-grid-3x3-gap-fill text-[19px]" />
              </button>

            {/* Switcher Dropdown */}
            {switcherOpen && (
              <div className="fixed left-3 right-3 top-[68px] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-dropdown">
                <div className="pb-2.5 mb-2.5 border-b border-slate-100 flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Quản lý Phòng Ban
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">Chuyển nhanh sang các bộ phận được cấp quyền</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    EOS Master
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-1.5 max-h-80 overflow-y-auto">
                  {departments.map((dept) => {
                    const isSelected = activeDeptCode === dept.code.toLowerCase();
                    const hasAccess = canAccessDepartment(user, dept.code);
                    return (
                      <button
                        key={dept.code}
                        type="button"
                        disabled={!hasAccess}
                        onClick={() => {
                          if (!hasAccess) return;
                          setActiveDeptCode(dept.code);
                          setSwitcherOpen(false);
                        }}
                        title={
                          hasAccess
                            ? `Chuyển sang ${dept.nameVi}`
                            : `Chưa được cấp quyền truy cập ${dept.nameVi}`
                        }
                        className={`px-1.5 py-2.5 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                          !hasAccess
                            ? 'border-slate-100 bg-slate-50/70 text-slate-400 opacity-55 cursor-not-allowed'
                            : isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold cursor-pointer'
                            : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-slate-800 bg-transparent cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase ${
                              isSelected ? 'text-indigo-600' : 'text-slate-400'
                            }`}
                          >
                            {dept.code}
                          </span>
                          {!hasAccess && (
                            <i className="bi bi-lock-fill text-[10px] text-slate-400" />
                          )}
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold mt-1 line-clamp-1 leading-tight">
                          {dept.nameVi}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* 2. Calculator (bi-calculator) - Ẩn trên màn hình điện thoại di động */}
          <button
            type="button"
            onClick={() => setCalcOpen(true)}
            className="hidden md:flex w-[38px] h-[38px] items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
            title="Máy tính (F2)"
          >
            <i className="bi bi-calculator text-[18px]" />
          </button>

          {/* 3. Notifications (bi-bell) - Ẩn trên trang Khách hàng */}
          {!isCustomer && (
            <button
              type="button"
              disabled={!canUseNotify}
              onClick={() => {
                if (!canUseNotify) return;
                setNotifOpen(true);
                setMsgOpen(false);
                setSwitcherOpen(false);
                setUserMenuOpen(false);
              }}
              className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl transition-all border-0 bg-transparent relative ${
                canUseNotify
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                  : 'text-slate-300 opacity-60 cursor-not-allowed'
              }`}
              title={canUseNotify ? 'Thông báo' : 'Thông báo hệ thống (Chưa được cấp quyền)'}
            >
              <i className="bi bi-bell text-[18px]" />
              {canUseNotify ? (
                unreadNotifCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                ) : null
              ) : (
                <i className="bi bi-lock-fill text-[9px] text-slate-400 absolute bottom-1.5 right-1.5" />
              )}
            </button>
          )}

          {/* 4. Messages (bi-chat-dots) */}
          <button
            type="button"
            disabled={!canUseChat}
            onClick={() => {
              if (!canUseChat) return;
              setMsgOpen(true);
              setNotifOpen(false);
              setSwitcherOpen(false);
              setSalesPickerOpen(false);
              setUserMenuOpen(false);
            }}
            className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl transition-all border-0 bg-transparent relative ${
              canUseChat
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
                : 'text-slate-300 opacity-60 cursor-not-allowed'
            }`}
            title={
              isCustomer
                ? `Chat với Nhân viên bán hàng (${selectedSalesStaff?.name || 'Phòng Kinh doanh'})`
                : 'Tin nhắn nội bộ'
            }
          >
            <i className="bi bi-chat-dots text-[17px]" />
            {unreadMsgCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600 ring-2 ring-white"></span>
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-1 opacity-60"></div>

          {/* 5. User Profile Pill & Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setSwitcherOpen(false);
                setSalesPickerOpen(false);
              }}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer border-0 bg-transparent"
            >
              {/* Avatar circle (36px soft purple/lavender circle with dark indigo letters LV) */}
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-sans shrink-0">
                {userInitials}
              </div>

              {/* User text & Chevron */}
              <div className="text-left hidden sm:flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-slate-900 leading-tight">
                    {userName}
                  </span>
                  <i className="bi bi-chevron-down text-[11px] text-slate-400 ms-0.5" />
                </div>
                <span className="text-[11px] text-slate-500 font-normal leading-none mt-0.5">
                  {userSubtitle}
                </span>
              </div>
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-dropdown">
                {/* User info box */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-2">
                  <div className="font-bold text-slate-900 text-sm">{userName}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{user?.email || 'admin@seajong.com'}</div>

                  {isCustomer ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDeptCode('customer');
                          setUserMenuOpen(false);
                        }}
                        className="w-full mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] hover:bg-emerald-50/60 p-1.5 rounded-lg transition-colors text-left border-0 bg-transparent cursor-pointer group"
                        title="Bấm để chuyển về Cổng thông tin Khách hàng"
                      >
                        <span className="font-medium text-slate-600">Kênh truy cập:</span>
                        <span className="font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                          Cổng Khách hàng
                          <i className="bi bi-box-arrow-in-right text-xs" />
                        </span>
                      </button>
                      <div className="mt-1 flex items-center justify-between text-[11px] px-1.5">
                        <span className="font-medium text-slate-600">Mã khách hàng:</span>
                        <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {user?.customer?.code || 'KH-VIP'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] px-1.5">
                        <span className="font-medium text-slate-600">Hạng thành viên:</span>
                        <span className="font-bold text-slate-800">{userPosition}</span>
                      </div>
                    </>
                  ) : isDealer ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDeptCode('dealer');
                          setUserMenuOpen(false);
                        }}
                        className="w-full mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] hover:bg-indigo-50/60 p-1.5 rounded-lg transition-colors text-left border-0 bg-transparent cursor-pointer group"
                        title="Bấm để chuyển về Cổng thông tin Đại lý & Nhà phân phối"
                      >
                        <span className="font-medium text-slate-600">Kênh đối tác:</span>
                        <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                          Đại lý &amp; Nhà phân phối
                          <i className="bi bi-box-arrow-in-right text-xs" />
                        </span>
                      </button>
                      <div className="mt-1 flex items-center justify-between text-[11px] px-1.5">
                        <span className="font-medium text-slate-600">Mã đại lý:</span>
                        <span className="font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {user?.customer?.code || 'KH0003'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] px-1.5">
                        <span className="font-medium text-slate-600">Vai trò:</span>
                        <span className="font-bold text-slate-800">{userPosition}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          navigateToUserDept();
                          setUserMenuOpen(false);
                        }}
                        className="w-full mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] hover:bg-indigo-50/60 p-1.5 rounded-lg transition-colors text-left border-0 bg-transparent cursor-pointer group"
                        title="Bấm để chuyển về phòng ban trực thuộc của bạn"
                      >
                        <span className="font-medium text-slate-600">Phòng ban:</span>
                        <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                          {user?.employee?.departmentName || 'Ban Giám đốc'}
                          <i className="bi bi-box-arrow-in-right text-xs" />
                        </span>
                      </button>
                      <div className="mt-1 flex items-center justify-between text-[11px] px-1.5">
                        <span className="font-medium text-slate-600">Chức vụ:</span>
                        <span className="font-bold text-slate-800">{userPosition}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  {/* Account Settings Modal (Khóa trên trang Khách hàng) */}
                  <button
                    type="button"
                    disabled={isCustomer}
                    onClick={() => {
                      if (isCustomer) return;
                      setUserMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left border-0 bg-transparent ${
                      isCustomer
                        ? 'text-slate-400 opacity-60 cursor-not-allowed'
                        : 'text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                    }`}
                    title={
                      isCustomer
                        ? 'Chức năng cài đặt tài khoản đã bị khóa đối với Khách hàng trực tuyến'
                        : 'Cài đặt tài khoản & mật khẩu'
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <i
                        className={`bi bi-gear text-[14px] ${
                          isCustomer ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      />
                      <span>Cài đặt tài khoản &amp; mật khẩu</span>
                    </span>
                    {isCustomer && (
                      <i className="bi bi-lock-fill text-[11px] text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Quản trị dữ liệu (Chỉ hiển thị cho tài khoản Admin / Ban Giám đốc) */}
                  {isAdminAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveDeptCode('board');
                        setActiveMenuKey('data-management');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-left cursor-pointer border-0 bg-transparent"
                    >
                      <i className="bi bi-database-lock text-slate-500 text-[14px]" />
                      <span>Quản trị dữ liệu</span>
                    </button>
                  )}

                  <div className="h-px bg-slate-100 my-1"></div>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <i className="bi bi-box-arrow-right text-[14px]" />
                    <span>Đăng xuất hệ thống</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Máy tính cầm tay Casio DX-120B Draggable (F2) */}
      <CasioCalculator isOpen={calcOpen} onClose={() => setCalcOpen(false)} />

      {/* Notification Slide Drawer */}
      <NotificationOffcanvas 
        isOpen={notifOpen} 
        onClose={() => setNotifOpen(false)} 
        onUnreadChange={setUnreadNotifCount}
      />

      {/* Message Chat Slide Drawer */}
      <MessageOffcanvas
        isOpen={msgOpen}
        onClose={() => setMsgOpen(false)}
        salesStaffList={salesStaffList}
        selectedSalesStaff={selectedSalesStaff}
        onSelectSalesStaff={handleSelectSalesStaff}
        onUnreadChange={setUnreadMsgCount}
      />

      {/* Account Settings Modal */}
      <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};
