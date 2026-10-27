import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDepartment } from '../../context/DepartmentContext';
import { CalculatorModal } from './CalculatorModal';
import { NotificationOffcanvas } from './NotificationOffcanvas';
import { MessageOffcanvas } from './MessageOffcanvas';
import { AccountSettingsModal } from './AccountSettingsModal';
import { getAvatarInitials } from '../../utils/avatar';

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

const DEPT_LABEL: Record<string, string> = {
  board: 'Ban Giám đốc',
  hr: 'Phòng Nhân sự',
  finance: 'Tài chính - Kế toán',
  admin_ops: 'Hành chính – VP',
  banhang: 'Bán hàng Showroom',
  sales: 'Phòng Kinh doanh',
  marketing: 'Phòng Marketing',
  cs: 'CSKH & Bảo hành',
  logistics: 'Kho vận & Logistics',
  purchase: 'Phòng Mua hàng',
  qa: 'Đảm bảo chất lượng',
  production: 'Sản xuất',
  security: 'Bảo vệ – An ninh',
};

export const Topbar: React.FC<TopbarProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { activeDeptCode, setActiveDeptCode, navigateToUserDept } = useDepartment();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const switcherRef = useRef<HTMLDivElement>(null);
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
          setDepartments(res.data);
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

  const rawPosition = user?.employee?.position || '';
  const userPosition = POSITION_MAP[rawPosition] || rawPosition || (user?.role === 'ADMIN' ? 'Giám đốc' : 'Nhân viên');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 w-full bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs select-none">
        
        {/* ── LEFT: Toggle + Divider + Brand (chính xác như hình screenshot) ── */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu button with Bootstrap icon */}
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

          {/* Brand header in Topbar (Logo + Brand Text) */}
          <button
            type="button"
            onClick={() => setActiveDeptCode('board')}
            className="flex items-center gap-3 text-left cursor-pointer border-0 bg-transparent group p-0"
            title="Về Ban Giám đốc (Trang chủ)"
          >
            <div className="h-10 w-auto flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Seajong" className="h-9 w-auto object-contain" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[13.5px] font-black text-slate-900 tracking-tight uppercase leading-tight font-sans">
                CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM
              </span>
              <span className="text-[11px] text-slate-500 font-normal leading-none mt-0.5">
                Kinh doanh thiết bị phòng tắm, nhà bếp
              </span>
            </div>
          </button>
        </div>

        {/* ── RIGHT: Quick Actions with Bootstrap Icons & User Profile ── */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          
          {/* 1. App Switcher Grid (bi-grid-3x3-gap-fill) */}
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
              <i className="bi bi-grid-3x3-gap-fill text-[18px]" />
            </button>

            {/* Switcher Dropdown */}
            {switcherOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-dropdown">
                <div className="pb-2.5 mb-2.5 border-b border-slate-100 flex items-center justify-between px-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Quản lý 13 Phòng Ban
                    </h4>
                    <p className="text-[11px] text-slate-400">Chuyển nhanh sang các bộ phận được cấp quyền</p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                    EOS Master
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-1">
                  {departments.map((dept) => {
                    const isSelected = activeDeptCode === dept.code.toLowerCase();
                    return (
                      <button
                        key={dept.code}
                        type="button"
                        onClick={() => {
                          setActiveDeptCode(dept.code);
                          setSwitcherOpen(false);
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold'
                            : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-slate-800 bg-transparent'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-mono font-bold uppercase ${
                            isSelected ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        >
                          {dept.code}
                        </span>
                        <span className="text-xs font-semibold mt-1 line-clamp-1">
                          {dept.nameVi}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Calculator (bi-calculator) */}
          <button
            type="button"
            onClick={() => setCalcOpen(true)}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
            title="Máy tính (F2)"
          >
            <i className="bi bi-calculator text-[18px]" />
          </button>

          {/* 3. Notifications (bi-bell) */}
          <button
            type="button"
            onClick={() => {
              setNotifOpen(true);
              setMsgOpen(false);
              setSwitcherOpen(false);
              setUserMenuOpen(false);
            }}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border-0 bg-transparent relative"
            title="Thông báo"
          >
            <i className="bi bi-bell text-[18px]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          {/* 4. Messages (bi-chat-dots) */}
          <button
            type="button"
            onClick={() => {
              setMsgOpen(true);
              setNotifOpen(false);
              setSwitcherOpen(false);
              setUserMenuOpen(false);
            }}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border-0 bg-transparent relative"
            title="Tin nhắn nội bộ"
          >
            <i className="bi bi-chat-dots text-[17px]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"></span>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-1 opacity-60"></div>

          {/* 5. User Profile Pill & Dropdown (chính xác như hình screenshot) */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setSwitcherOpen(false);
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
                  {userPosition}
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
                </div>

                <div className="space-y-1">
                  {/* Account Settings Modal */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-left cursor-pointer border-0 bg-transparent"
                  >
                    <i className="bi bi-gear text-slate-500 text-[14px]" />
                    <span>Cài đặt tài khoản &amp; mật khẩu</span>
                  </button>

                  {/* Switch Demo user */}
                  <Link
                    to="/login"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-decoration-none"
                  >
                    <i className="bi bi-people text-slate-500 text-[14px]" />
                    <span>Đổi tài khoản nhân viên Demo</span>
                  </Link>

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

      {/* Floating Calculator Modal (F2) */}
      <CalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />

      {/* Notification Slide Drawer */}
      <NotificationOffcanvas isOpen={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Message Chat Slide Drawer */}
      <MessageOffcanvas isOpen={msgOpen} onClose={() => setMsgOpen(false)} />

      {/* Account Settings Modal */}
      <AccountSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};
