import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDepartment } from '../context/DepartmentContext';
import { useToast } from '../components/ui/Toast';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Store,
  UserCheck,
} from 'lucide-react';

export type LoginAudienceType = 'staff' | 'dealer' | 'customer';

interface CompanyInfo {
  name?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
}

const AUDIENCE_OPTIONS: {
  id: LoginAudienceType;
  label: string;
  shortLabel: string;
  inputLabel: string;
  inputPlaceholder: string;
  defaultEmail: string;
  defaultPass: string;
}[] = [
  {
    id: 'staff',
    label: 'Nhân viên',
    shortLabel: 'Nhân viên',
    inputLabel: 'Email công việc hoặc Mã nhân viên',
    inputPlaceholder: 'VD: admin@seajong.com hoặc mã nhân viên',
    defaultEmail: 'admin@seajong.com',
    defaultPass: 'Pass@123',
  },
  {
    id: 'dealer',
    label: 'Đại lý',
    shortLabel: 'Đại lý',
    inputLabel: 'Số điện thoại, Mã đại lý hoặc Email',
    inputPlaceholder: 'VD: KH0010, 0961764999 hoặc mã đại lý',
    defaultEmail: 'KH0010',
    defaultPass: '123456',
  },
  {
    id: 'customer',
    label: 'Khách hàng',
    shortLabel: 'Khách hàng',
    inputLabel: 'Đối tượng truy cập',
    inputPlaceholder: 'Khách hàng mua sắm trực tuyến',
    defaultEmail: 'Khách hàng mua sắm',
    defaultPass: '123456',
  },
];

export const LoginPage: React.FC = () => {
  const [loginType, setLoginType] = useState<LoginAudienceType>('staff');
  const [email, setEmail] = useState('admin@seajong.com');
  const [password, setPassword] = useState('Pass@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<CompanyInfo>({
    name: 'Công ty Cổ phần Seajong Faucet Việt Nam',
    shortName: 'seajong',
    logoUrl: '/logo.png',
  });

  const { login } = useAuth();
  const { navigateToUserDept } = useDepartment();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/company')
      .then((r) => (r.ok ? r.json() : {}))
      .then((res: any) => {
        const d = res.data || res;
        if (d && d.name) setCompany(d);
      })
      .catch(() => {});
  }, []);

  const currentAudience =
    AUDIENCE_OPTIONS.find((opt) => opt.id === loginType) || AUDIENCE_OPTIONS[0];

  const handleSelectAudience = (type: LoginAudienceType) => {
    setLoginType(type);

    const opt = AUDIENCE_OPTIONS.find((o) => o.id === type);
    if (opt) {
      setEmail(opt.defaultEmail);
      setPassword(opt.defaultPass);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginType !== 'customer' && (!email.trim() || !password.trim())) {
      toast.warning(
        'Thiếu thông tin đăng nhập',
        'Vui lòng nhập đầy đủ tài khoản và mật khẩu.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await login(
        loginType === 'customer' ? 'khachhang@seajong.com' : email,
        loginType === 'customer' ? '123456' : password,
        loginType
      );
      if (res.success && res.user) {
        navigateToUserDept(res.user);
        navigate('/');
      } else {
        toast.error(
          'Đăng nhập không thành công',
          res.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.'
        );
      }
    } catch {
      toast.error(
        'Lỗi kết nối máy chủ',
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = company.logoUrl || '/logo.png';

  return (
    <div className="login-root">
      {/* ── LEFT: Ảnh nền + Overlay ── */}
      <div className="login-left">
        <div className="login-overlay" />
        <div className="login-left-content">
          <div className="login-brand-badge">
            <img src={logoSrc} alt="Logo Shadow" className="login-brand-logo-shadow" />
            <img src={logoSrc} alt={company.name || 'Seajong'} className="login-brand-logo" />
          </div>
          <h2 className="login-tagline">
            Hệ điều hành
            <br />
            Doanh nghiệp số
          </h2>
          <p className="login-tagline-sub">Quản trị toàn diện · Vận hành thông minh</p>
        </div>
      </div>

      {/* ── RIGHT: Form đăng nhập đa đối tượng ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-main">
            {/* Mobile Brand Header */}
            <div className="lg:hidden text-center mb-6">
              <img
                src={logoSrc}
                alt={company.name || 'Seajong'}
                className="h-14 mx-auto object-contain mb-2.5"
              />
              <h2 className="text-lg font-bold text-slate-800 leading-snug">{company.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Hệ điều hành Doanh nghiệp số</p>
            </div>

            {/* ── BỘ CHỌN 3 ĐỐI TƯỢNG ĐĂNG NHẬP ── */}
            <div className="mb-5">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const isActive = loginType === opt.id;
                  const IconComp =
                    opt.id === 'staff' ? Building2 : opt.id === 'dealer' ? Store : UserCheck;

                  const activeColorClasses =
                    opt.id === 'staff'
                      ? 'bg-white text-pink-700 border-pink-200 shadow-xs'
                      : opt.id === 'dealer'
                      ? 'bg-white text-sky-700 border-sky-200 shadow-xs'
                      : 'bg-white text-emerald-700 border-emerald-200 shadow-xs';

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAudience(opt.id)}
                      className={`flex items-center justify-center gap-1.5 text-center py-2.5 px-2 rounded-lg border transition-all cursor-pointer select-none ${
                        isActive
                          ? activeColorClasses
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-semibold leading-tight">
                        {opt.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="login-form">
              {/* Account Identifier */}
              <div className="login-field">
                <label htmlFor="login-email" className="login-label">
                  {currentAudience.inputLabel}
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={currentAudience.inputPlaceholder}
                    autoComplete="username"
                    disabled={loading || loginType === 'customer'}
                    className="login-input disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="login-field">
                <label htmlFor="login-password" className="login-label">
                  Mật khẩu
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading || loginType === 'customer'}
                    className="login-input disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || loginType === 'customer'}
                    className="login-eye-btn disabled:opacity-40 disabled:cursor-not-allowed"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="login-row">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loginType === 'customer'}
                    className="login-checkbox disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span>Ghi nhớ thông tin đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      'Hỗ trợ cấp lại mật khẩu',
                      loginType === 'staff'
                        ? 'Mật khẩu nhân viên mặc định: Pass@123'
                        : loginType === 'dealer'
                        ? 'Mật khẩu Đại lý mặc định: 123456'
                        : 'Khách hàng nhấn Đăng nhập để vào trực tiếp trang mua hàng.'
                    )
                  }
                  className="login-forgot"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit Button */}
              <button id="btn-login-submit" type="submit" disabled={loading} className="login-btn">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 login-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <span>Đăng nhập</span>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="login-footer">
            © {new Date().getFullYear()} {company.name || 'Công ty Cổ phần Seajong Faucet Việt Nam'} — EOS
          </p>
        </div>
      </div>
    </div>
  );
};
