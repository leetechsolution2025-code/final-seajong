import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDepartment } from '../context/DepartmentContext';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Building2, 
  X, 
  Search, 
  Check, 
  ChevronRight,
  ShieldCheck,
  BadgeCheck
} from 'lucide-react';

interface CompanyInfo {
  name?: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
}

interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentCode: string;
  departmentName: string;
  position: string;
}

interface Department {
  code: string;
  nameVi: string;
  nameEn: string;
  group: string;
  sortOrder: number;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@seajong.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyInfo>({
    name: 'Công ty Cổ phần Seajong Faucet Việt Nam',
    shortName: 'seajong',
    logoUrl: '/logo.png',
  });

  // Demo accounts modal state
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { login } = useAuth();
  const { navigateToUserDept } = useDepartment();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Fetch company info
    fetch('/api/company')
      .then((r) => (r.ok ? r.json() : {}))
      .then((res: any) => {
        const d = res.data || res;
        if (d && d.name) setCompany(d);
      })
      .catch(() => {});

    // 2. Fetch demo users
    fetch('/api/demo-users')
      .then((r) => (r.ok ? r.json() : {}))
      .then((res: any) => {
        if (res.success && Array.isArray(res.data)) {
          setDemoUsers(res.data);
        }
      })
      .catch(() => {});

    // 3. Fetch departments
    fetch('/api/departments')
      .then((r) => (r.ok ? r.json() : {}))
      .then((res: any) => {
        if (res.success && Array.isArray(res.data)) {
          setDepartments(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success && res.user) {
        navigateToUserDept(res.user);
        navigate('/');
      } else {
        setError(res.message || 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoUser = async (user: DemoUser, autoLogin: boolean = true) => {
    const pw = user.email === 'admin@seajong.com' ? 'Admin@123' : 'Pass@123';
    setEmail(user.email);
    setPassword(pw);
    setError(null);
    setShowDemoModal(false);

    if (autoLogin) {
      setLoading(true);
      try {
        const res = await login(user.email, pw);
        if (res.success && res.user) {
          navigateToUserDept(res.user);
          navigate('/');
        } else {
          setError(res.message || 'Đăng nhập không thành công');
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối đến máy chủ');
      } finally {
        setLoading(false);
      }
    }
  };

  const logoSrc = company.logoUrl || '/logo.png';

  const filteredDemoUsers = demoUsers.filter((u) => {
    const matchesDept = selectedDeptFilter === 'all' || u.departmentCode === selectedDeptFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.position.toLowerCase().includes(q) ||
      u.departmentName.toLowerCase().includes(q);
    return matchesDept && matchesQuery;
  });

  return (
    <div className="login-root">
      {/* ── LEFT: Ảnh nền + Overlay ── */}
      <div className="login-left">
        <div className="login-overlay" />
        <div className="login-left-content">
          <div className="login-brand-badge">
            {/* Lớp đổ bóng (Shadow layer) */}
            <img src={logoSrc} alt="Logo Shadow" className="login-brand-logo-shadow" />
            {/* Lớp hiển thị chính màu trắng */}
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

      {/* ── RIGHT: Form đăng nhập ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center mb-6">
            <img src={logoSrc} alt={company.name || 'Seajong'} className="h-14 mx-auto object-contain mb-2" />
            <h2 className="text-xl font-bold text-slate-800">{company.name}</h2>
            <p className="text-xs text-slate-500">Hệ điều hành Doanh nghiệp số</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="login-form">
            {/* Email / Username */}
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">
                Tên đăng nhập
              </label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@seajong.com"
                  autoComplete="email"
                  disabled={loading}
                  className="login-input"
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
                  disabled={loading}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
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
                  className="login-checkbox"
                />
                <span>Ghi nhớ thông tin đăng nhập</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Mật khẩu demo mặc định là: Pass@123 (hoặc Admin@123 cho tài khoản admin)')}
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
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Quick Demo Picker Section */}
          <div className="login-demo-box">
            <p className="text-xs text-slate-500 mb-2">Tài khoản nhân viên demo theo phòng ban:</p>
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="w-full py-2.5 px-3 bg-pink-50/80 hover:bg-pink-100/80 border border-pink-200 text-pink-700 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span>Chọn từ 13 phòng ban ({demoUsers.length || 24} nhân sự)</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] bg-pink-200/60 px-2 py-0.5 rounded-md">
                <span>Khám phá</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </button>
          </div>

          {/* Footer */}
          <p className="login-footer">
            © {new Date().getFullYear()} {company.name || 'Công ty Cổ phần Seajong Faucet Việt Nam'} — EOS
          </p>
        </div>
      </div>

      {/* ── MODAL: CHỌN TÀI KHOẢN DEMO THEO 13 PHÒNG BAN ── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tài Khoản Nhân Viên Demo Seajong</h3>
                  <p className="text-xs text-slate-500">13 Phòng Ban chuẩn • Đăng nhập tức thì bằng Pass@123</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, chức vụ hoặc phòng ban..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Xoá
                  </button>
                )}
              </div>

              {/* Department Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedDeptFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedDeptFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({demoUsers.length})
                </button>
                {departments.map((dept) => {
                  const count = demoUsers.filter((u) => u.departmentCode === dept.code).length;
                  return (
                    <button
                      key={dept.code}
                      type="button"
                      onClick={() => setSelectedDeptFilter(dept.code)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                        selectedDeptFilter === dept.code
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{dept.nameVi}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          selectedDeptFilter === dept.code ? 'bg-pink-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredDemoUsers.length > 0 ? (
                filteredDemoUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => selectDemoUser(u)}
                    className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-pink-300 hover:bg-pink-50/40 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-pink-100 group-hover:to-pink-200 text-slate-700 group-hover:text-pink-700 flex items-center justify-center font-bold text-sm shrink-0 transition-colors">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm group-hover:text-pink-600 transition-colors">
                            {u.name}
                          </span>
                          {u.role === 'ADMIN' ? (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                              ADMIN
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {u.departmentCode.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-700">{u.position}</span>
                          <span>•</span>
                          <span className="text-pink-600 font-medium">{u.departmentName}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-pink-600 text-slate-600 group-hover:text-white text-xs font-semibold transition-all shrink-0 ml-2"
                    >
                      Đăng nhập
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Không tìm thấy nhân viên nào phù hợp.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Mật khẩu đồng bộ cho tất cả: <code className="bg-slate-200 px-1 py-0.5 rounded-sm font-mono text-slate-800">Pass@123</code> (Admin: <code className="bg-slate-200 px-1 py-0.5 rounded-sm font-mono text-slate-800">Admin@123</code>)
              </span>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
