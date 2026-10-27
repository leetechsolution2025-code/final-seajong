import React, { useState } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  Sliders, 
  Save, 
  Key, 
  Check, 
  Eye, 
  EyeOff, 
  Building2, 
  Mail, 
  Phone, 
  BadgeCheck,
  Bell,
  Volume2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('0988.123.456');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Preference switches
  const [enableSound, setEnableSound] = useState(true);
  const [enableDesktopNotif, setEnableDesktopNotif] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Đã cập nhật thông tin cá nhân thành công!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    setSaveStatus('Đã thay đổi mật khẩu tài khoản thành công!');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden z-10 animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 text-white font-bold flex items-center justify-center shadow-md shadow-pink-500/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cài Đặt Tài Khoản</h3>
              <p className="text-xs text-slate-500">
                {user?.employee?.departmentName || 'Hệ thống Seajong'} • {user?.employee?.position || user?.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Hồ sơ cá nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Đổi mật khẩu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tùy chọn</span>
          </button>
        </div>

        {/* Status alert */}
        {saveStatus && (
          <div className="m-4 mb-0 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          
          {/* ── Tab 1: Profile ── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Họ và tên cán bộ
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-pink-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email tài khoản
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-pink-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phòng ban trực thuộc
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled
                      value={user?.employee?.departmentName || 'Hệ thống'}
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chức danh / Vị trí
                  </label>
                  <div className="relative">
                    <BadgeCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      disabled
                      value={user?.employee?.position || user?.role || 'Nhân viên'}
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu thông tin</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Tab 2: Security ── */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại (Pass@123)"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-pink-500 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mật khẩu mới
                  </label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-pink-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-pink-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                Mẹo: Mật khẩu mặc định của tất cả các tài khoản demo trong hệ thống là <span className="font-mono font-bold">Pass@123</span> (hoặc <span className="font-mono font-bold">Admin@123</span> cho admin).
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-all cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Cập nhật mật khẩu</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Tab 3: Preferences ── */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Âm thanh thông báo</h4>
                    <p className="text-[11px] text-slate-500">Phát âm thanh bíp nhẹ khi có tin nhắn hoặc thông báo mới</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableSound}
                  onChange={(e) => setEnableSound(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Thông báo trình duyệt</h4>
                    <p className="text-[11px] text-slate-500">Hiển thị popup đẩy khi có đơn hàng hoặc phê duyệt khẩn cấp</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableDesktopNotif}
                  onChange={(e) => setEnableDesktopNotif(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Hiển thị bảng biểu cô đọng</h4>
                    <p className="text-[11px] text-slate-500">Thu hẹp padding để hiển thị nhiều dòng dữ liệu hơn trên một màn hình</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
