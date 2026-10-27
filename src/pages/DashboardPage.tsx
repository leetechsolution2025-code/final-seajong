import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { DashboardSummary } from '../types';
import { 
  Building2, 
  Warehouse, 
  Users, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Activity,
  BadgeCheck,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('seajong_token');
        const res = await fetch('/api/dashboard/summary', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json.data);
          }
        }
      } catch (err) {
        console.error('Lỗi nạp dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const getGroupName = (group: string) => {
    switch (group) {
      case 'management':
        return 'Ban Điều hành';
      case 'core':
        return 'Khối Nghiệp vụ';
      case 'business':
        return 'Khối Kinh doanh';
      case 'support':
        return 'Khối Hỗ trợ & Kỹ thuật';
      default:
        return 'Phòng ban';
    }
  };

  const getGroupBadgeColor = (group: string) => {
    switch (group) {
      case 'management':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'core':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'business':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'support':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-sky-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-sky-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-medium mb-3 border border-sky-500/30">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            Hệ thống Quản trị & Điều hành Seajong ERP
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Xin chào, {user?.name || 'Quản trị viên'}!
          </h1>
          
          {/* User Profile Badge */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white border border-white/15 font-medium">
              <Briefcase className="w-3.5 h-3.5 text-sky-400" />
              <span>Chức vụ: <strong>{user?.employee?.position || 'Quản trị viên'}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              <span>Phòng ban: <strong>{user?.employee?.departmentName || 'Ban Giám đốc'}</strong></span>
            </span>
            {user?.employee?.code && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px]">
                Mã: {user.employee.code}
              </span>
            )}
          </div>

          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            Bạn đang đăng nhập phiên làm việc với quyền hạn của phòng ban <strong>{user?.employee?.departmentName || 'Hệ thống'}</strong>.
            Cơ sở dữ liệu SQLite đã nạp đủ 13 phòng ban và 24 nhân sự demo chuẩn như dự án client-seajong.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phòng Ban Chuẩn</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">
              {loading ? '-' : data?.stats.departments || 13}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Chuẩn Seajong
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Đầy đủ 13 phòng ban chức năng</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhân Sự Demo</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">
              {loading ? '-' : data?.stats.employees || 24}
            </span>
            <span className="text-xs text-sky-600 font-medium">Đã kích hoạt</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Liên kết đầy đủ Employee & User login</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kho Hàng Chuẩn</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">
              {loading ? '-' : data?.stats.warehouses || 4}
            </span>
            <span className="text-xs text-slate-500 font-mono text-[11px]">CHÍNH / KVP / LỖI / SHOWROOM</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Quy chuẩn kho vật tư & thành phẩm</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tốc Độ Phản Hồi</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">&lt; 30ms</span>
            <span className="text-xs text-emerald-600 font-medium">Cổng 5175 & 3005</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Vite Dev Server + SQLite độc lập</p>
        </div>
      </div>

      {/* Warehouses & Departments Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kho Hàng Chuẩn Seajong (4 cột) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-sky-600" />
                <h2 className="font-semibold text-slate-800 text-base">Hệ Thống Kho Hàng</h2>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-1 rounded-md">
                Logistics
              </span>
            </div>

            <div className="space-y-3">
              {data?.warehouses && data.warehouses.length > 0 ? (
                data.warehouses.map((wh) => (
                  <Link 
                    key={wh.code}
                    to="/logistics"
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 hover:border-pink-300 hover:bg-pink-50/20 transition-all text-decoration-none group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-100/70 text-pink-700 flex items-center justify-center font-bold text-xs font-mono group-hover:scale-105 transition-transform">
                        {wh.code.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm group-hover:text-pink-600 transition-colors">{wh.name}</div>
                        <div className="text-xs text-slate-400 font-mono">Mã: {wh.code}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <CheckCircle2 className="w-3 h-3" />
                      Sẵn sàng
                    </span>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-slate-400 text-center py-4">Đang tải danh sách kho...</div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Đồng bộ kho vận và kế toán Seajong
          </div>
        </div>

        {/* Danh sách 13 Phòng ban (8 cột) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="font-semibold text-slate-800 text-base">Cấu Trúc 13 Phòng Ban Chuẩn</h2>
                <p className="text-xs text-slate-400">Đồng bộ đầy đủ theo cơ cấu dự án client-seajong</p>
              </div>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-2.5 py-1 rounded-lg">
              13 Phòng ban
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data?.departments && data.departments.length > 0 ? (
              data.departments.map((dept) => (
                <Link 
                  key={dept.code}
                  to={`/${dept.code}`}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-pink-300 hover:bg-pink-50/20 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer text-decoration-none"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200 group-hover:border-pink-200 group-hover:text-pink-600 transition-colors">
                        {dept.code}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getGroupBadgeColor(dept.group)}`}>
                        {getGroupName(dept.group)}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-pink-600 transition-colors">{dept.nameVi}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">{dept.nameEn}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="group-hover:text-pink-600 font-medium transition-colors">Vào phòng ban</span>
                    <span className="text-slate-300 group-hover:text-pink-600 group-hover:translate-x-0.5 transition-all font-bold">→</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-slate-400 col-span-3 text-center py-4">Đang nạp phòng ban...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
