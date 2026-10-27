import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SplitLayoutPage } from '../../../components/layout/SplitLayoutPage';
import { SearchInput } from '../../../components/ui/SearchInput';
import { useToast } from '../../../components/ui/Toast';

// ── Constants ─────────────────────────────────────────────────────────────────
export const SYSTEM_PERMISSIONS = [
  { key: 'crm',             label: 'Quản lý khách hàng (CRM)',   icon: 'bi-person-heart',       color: '#3b82f6' },
  { key: 'chat',            label: 'Nhắn tin nội bộ',             icon: 'bi-chat-dots',           color: '#10b981' },
  { key: 'notify',          label: 'Thông báo hệ thống',          icon: 'bi-bell',                color: '#f59e0b' },
  { key: 'task',            label: 'Quản lý công việc',           icon: 'bi-kanban',              color: '#8b5cf6' },
  { key: 'report',          label: 'Xem báo cáo',                 icon: 'bi-bar-chart-line',      color: '#06b6d4' },
  { key: 'plan',            label: 'Lập kế hoạch',                icon: 'bi-calendar3',           color: '#f43f5e' },
  { key: 'approve_request', label: 'Duyệt yêu cầu',               icon: 'bi-check2-circle',       color: '#22c55e' },
  { key: 'oem_sales',       label: 'Bán hàng OEM',                icon: 'bi-bag-check',           color: '#0ea5e9' },
  { key: 'view_prices',     label: 'Hiển thị giá sản phẩm',       icon: 'bi-tag',                 color: '#8b5cf6' },
  { key: 'approve_budget',  label: 'Duyệt ngân sách',             icon: 'bi-cash-coin',           color: '#ef4444' },
];

const GROUP_COLORS: Record<string, string> = {
  management: '#6366f1',
  core: '#0ea5e9',
  business: '#10b981',
  support: '#f59e0b',
};

const GROUP_LABELS: Record<string, string> = {
  management: 'Ban điều hành',
  core: 'Khối lõi',
  business: 'Khối kinh doanh',
  support: 'Hỗ trợ / Vận hành',
};

const ROLE_OPTIONS = [
  {
    value: 'USER',
    label: 'Nhân viên',
    desc: 'Truy cập theo phân quyền được cấp cụ thể',
    icon: 'bi-person',
    color: '#6366f1',
  },
  {
    value: 'ADMIN',
    label: 'Quản trị viên',
    desc: 'Toàn quyền quản lý phân hệ & thiết lập hệ thống',
    icon: 'bi-shield-check',
    color: '#f59e0b',
  },
];

const LEVEL_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  none: { label: 'Không có quyền', color: '#64748b', bg: '#f1f5f9', icon: 'bi-x-circle' },
  view: { label: 'Chỉ xem',        color: '#2563eb', bg: '#eff6ff', icon: 'bi-eye' },
  full: { label: 'Toàn quyền',     color: '#059669', bg: '#ecfdf5', icon: 'bi-unlock' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type Dept = {
  code: string;
  nameVi: string;
  nameEn?: string;
  icon?: string;
  group: string;
  isActive: boolean;
};

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  permissions: string;
  deptAccess: string;
  createdAt: string;
  employee: {
    fullName?: string;
    departmentName: string;
    departmentCode: string;
    position: string;
    status: string;
    phone: string | null;
  } | null;
};

export type DeptAccess = {
  code: string;
  level: 'none' | 'view' | 'full';
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string | null, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function avatarColor(str: string) {
  const colors = [
    '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#06b6d4', '#f43f5e', '#8b5cf6',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function parseJson<T>(str: string | undefined | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 40 }: { user: { name: string | null; email: string }; size?: number }) {
  const bg = avatarColor(user.email || user.name || 'user');
  const initStr = initials(user.name, user.email);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.max(11, Math.round(size * 0.36)),
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}
    >
      {initStr}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ADMIN:      { label: 'Quản trị viên', color: '#b45309', bg: '#fef3c7' },
    USER:       { label: 'Nhân viên',     color: '#4338ca', bg: '#e0e7ff' },
    SUPERADMIN: { label: 'SuperAdmin',    color: '#b91c1c', bg: '#fee2e2' },
  };
  const cfg = map[role] ?? map.USER;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-tight"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function ToggleSwitch({
  on,
  onChange,
  color = '#6366f1',
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className="relative shrink-0 rounded-full cursor-pointer transition-colors duration-200"
      style={{
        width: 36,
        height: 20,
        backgroundColor: on ? color : '#cbd5e1',
        border: 'none',
        outline: 'none',
        padding: 0,
      }}
    >
      <span
        className="block rounded-full bg-white shadow-sm transition-all duration-200"
        style={{
          width: 14,
          height: 14,
          position: 'absolute',
          top: 3,
          left: on ? 19 : 3,
        }}
      />
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export const UserAuthManagementPage: React.FC = () => {
  const toast = useToast();

  // Data states
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'ADMIN' | 'USER'>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Edit states for selected user
  const [editRole, setEditRole] = useState('USER');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editDeptAccess, setEditDeptAccess] = useState<DeptAccess[]>([]);
  const [activeTab, setActiveTab] = useState<'perms' | 'dept'>('perms');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resDepts, resUsers] = await Promise.all([
        fetch('/api/company/departments'),
        fetch('/api/board/users'),
      ]);

      if (resDepts.ok) {
        const deptsData = await resDepts.json();
        if (Array.isArray(deptsData)) {
          setDepartments(deptsData.filter((d: Dept) => d.isActive));
        }
      }

      if (resUsers.ok) {
        const usersData = await resUsers.json();
        const list: UserRow[] = Array.isArray(usersData) ? usersData : [];
        setUsers(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu phân quyền:', err);
      toast.error('Lỗi nạp dữ liệu', 'Không thể kết nối đến máy chủ CSDL.');
    } finally {
      setLoading(false);
    }
  }, [toast, selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selected user changes, update edit states
  useEffect(() => {
    const u = users.find((x) => x.id === selectedId);
    if (!u) return;

    setEditRole(u.role);
    setEditPerms(parseJson<string[]>(u.permissions, []));

    const existingAccess = parseJson<DeptAccess[]>(u.deptAccess, []);
    setEditDeptAccess(
      departments.map((d) => {
        const found = existingAccess.find((x) => x.code === d.code);
        return { code: d.code, level: found?.level ?? 'none' };
      })
    );
    setDirty(false);
  }, [selectedId, users, departments]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId]
  );

  const handleSelectUser = (u: UserRow) => {
    if (u.id === selectedId) return;
    if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Bạn có muốn bỏ qua không?')) {
      return;
    }
    setSelectedId(u.id);
  };

  const handleTogglePerm = (key: string) => {
    setEditPerms((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
    setDirty(true);
  };

  const handleSelectAllPerms = () => {
    setEditPerms(SYSTEM_PERMISSIONS.map((p) => p.key));
    setDirty(true);
  };

  const handleDeselectAllPerms = () => {
    setEditPerms([]);
    setDirty(true);
  };

  const handleCycleDeptLevel = (code: string) => {
    const cycle: DeptAccess['level'][] = ['none', 'view', 'full'];
    setEditDeptAccess((prev) =>
      prev.map((d) => {
        if (d.code !== code) return d;
        const nextIndex = (cycle.indexOf(d.level) + 1) % 3;
        return { ...d, level: cycle[nextIndex] };
      })
    );
    setDirty(true);
  };

  const handleSetDeptLevel = (code: string, level: DeptAccess['level']) => {
    setEditDeptAccess((prev) =>
      prev.map((d) => (d.code === code ? { ...d, level } : d))
    );
    setDirty(true);
  };

  const handleSetAllDeptLevel = (level: DeptAccess['level']) => {
    setEditDeptAccess((prev) => prev.map((d) => ({ ...d, level })));
    setDirty(true);
  };

  const handleReset = () => {
    if (!selectedUser) return;
    setEditRole(selectedUser.role);
    setEditPerms(parseJson<string[]>(selectedUser.permissions, []));
    const existingAccess = parseJson<DeptAccess[]>(selectedUser.deptAccess, []);
    setEditDeptAccess(
      departments.map((d) => {
        const found = existingAccess.find((x) => x.code === d.code);
        return { code: d.code, level: found?.level ?? 'none' };
      })
    );
    setDirty(false);
  };

  const handleSave = async () => {
    if (!selectedId || !selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/board/users/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          permissions: editPerms,
          deptAccess: editDeptAccess.filter((d) => d.level !== 'none'),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Lỗi lưu thông tin');
      }

      toast.success(
        'Đã lưu phân quyền',
        `Cập nhật quyền thành công cho tài khoản ${selectedUser.name || selectedUser.email}`
      );
      setDirty(false);

      // Cập nhật lại danh sách users tại chỗ
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== selectedId) return u;
          return {
            ...u,
            role: editRole,
            permissions: JSON.stringify(editPerms),
            deptAccess: JSON.stringify(editDeptAccess.filter((d) => d.level !== 'none')),
          };
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      toast.error('Lỗi cập nhật', msg);
    } finally {
      setSaving(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        (u.name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee?.departmentName ?? '').toLowerCase().includes(q) ||
        (u.employee?.position ?? '').toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const adminCount = useMemo(() => users.filter((u) => u.role === 'ADMIN').length, [users]);
  const userCount = useMemo(() => users.filter((u) => u.role === 'USER').length, [users]);

  // ── LEFT PANEL: User List ───────────────────────────────────────────────────
  const leftContent = (
    <div className="flex flex-col h-full min-h-0">
      {/* Search Input */}
      <div className="mb-2 shrink-0">
        <SearchInput
          placeholder="Tìm kiếm tài khoản, họ tên, phòng ban..."
          value={search}
          onChange={setSearch}
        />
      </div>

      {/* Role Filter Tabs */}
      <div className="flex gap-1.5 mb-3 shrink-0 p-1 bg-slate-100 rounded-lg">
        {(
          [
            ['', 'Tất cả', users.length],
            ['ADMIN', 'Quản trị', adminCount],
            ['USER', 'Nhân viên', userCount],
          ] as const
        ).map(([v, label, count]) => {
          const isActive = roleFilter === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setRoleFilter(v as '' | 'ADMIN' | 'USER')}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer text-center ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              {label}{' '}
              <span className={`text-[10px] font-semibold ${isActive ? 'text-indigo-500' : 'opacity-60'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* User Item List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <i className="bi bi-arrow-repeat text-xl text-indigo-600 animate-spin" />
            <span>Đang tải danh sách người dùng...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <i className="bi bi-person-x text-3xl text-slate-300" />
            <span>Không tìm thấy người dùng phù hợp</span>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelected = u.id === selectedId;
            const displayName = u.name || u.employee?.fullName || u.email.split('@')[0];
            const deptText = u.employee?.departmentName || 'Hệ thống chung';
            const posText = u.employee?.position || (u.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên');

            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-300/80 shadow-2xs'
                    : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <UserAvatar user={{ name: displayName, email: u.email }} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-indigo-900' : 'text-slate-800'
                      }`}
                    >
                      {displayName}
                    </span>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <i className="bi bi-building text-[10px] text-slate-400" />
                    <span>{deptText}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600 font-medium">{posText}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">
                    {u.email}
                  </div>
                </div>
                <i
                  className={`bi bi-chevron-right text-xs shrink-0 transition-transform ${
                    isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span>Tổng số: <b>{users.length}</b> tài khoản</span>
        <span>Hiển thị: <b>{filteredUsers.length}</b></span>
      </div>
    </div>
  );

  // ── RIGHT PANEL: Permission & Access Editor ─────────────────────────────────
  const rightContent = !selectedUser ? (
    <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400 text-center gap-3">
      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
        <i className="bi bi-person-lock text-3xl" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-700 m-0">Chọn tài khoản người dùng</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Vui lòng bấm vào một người dùng trong danh sách bên trái để xem và phân quyền chi tiết
        </p>
      </div>
    </div>
  ) : (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* ── User Header Profile Bar ── */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            user={{ name: selectedUser.name, email: selectedUser.email }}
            size={48}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 m-0 truncate">
                {selectedUser.name || selectedUser.employee?.fullName || selectedUser.email}
              </h3>
              <RoleBadge role={selectedUser.role} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Hoạt động
              </span>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono text-slate-600">{selectedUser.email}</span>
              {selectedUser.employee && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-700">
                    {selectedUser.employee.departmentName}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-indigo-600 font-medium">
                    {selectedUser.employee.position}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action / Save Bar */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {dirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Đặt lại
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
              dirty
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm animate-pulse'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : dirty ? (
              <>
                <i className="bi bi-check2-circle text-sm" />
                <span>Lưu thay đổi</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2 text-sm" />
                <span>Đã đồng bộ CSDL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Tabs (Vai trò & Quyền hạn | Truy cập phòng ban) ── */}
      <div className="px-4 pt-3 pb-0 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('perms')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'perms'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="bi bi-shield-lock" />
            <span>Vai trò & Quyền hạn</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {editRole === 'ADMIN' ? 'Toàn quyền' : `${editPerms.length} quyền`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dept')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'dept'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="bi bi-diagram-3" />
            <span>Truy cập phòng ban</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {departments.length} bộ phận
            </span>
          </button>
        </div>

        {dirty && (
          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1 pb-2">
            <i className="bi bi-exclamation-circle-fill text-amber-500" />
            Có thay đổi chưa lưu
          </span>
        )}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 space-y-6">
        {activeTab === 'perms' ? (
          <>
            {/* Section 1: Vai trò hệ thống */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  1. Vai trò tài khoản hệ thống
                </span>
                <span className="text-[11px] text-slate-400">
                  Chọn cấp độ quản trị tài khoản
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((r) => {
                  const isActive = editRole === r.value;
                  return (
                    <div
                      key={r.value}
                      onClick={() => {
                        setEditRole(r.value);
                        setDirty(true);
                      }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : '#f1f5f9',
                          color: r.color,
                        }}
                      >
                        <i className={`bi ${r.icon} text-lg`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {r.label}
                          </span>
                          {isActive && (
                            <i className="bi bi-check-circle-fill text-indigo-600 text-sm" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug m-0">
                          {r.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Quyền chức năng */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  2. Quyền chức năng nghiệp vụ
                </span>
                {editRole === 'USER' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPerms}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-none p-0"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllPerms}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer bg-transparent border-none p-0"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                )}
              </div>

              {editRole === 'ADMIN' ? (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <i className="bi bi-shield-fill-check text-lg" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 m-0">
                      Quản trị viên — Toàn quyền hệ thống
                    </h5>
                    <p className="text-[11.5px] text-amber-700/90 mt-1 leading-relaxed m-0">
                      Tài khoản Quản trị viên (ADMIN) mặc định sở hữu toàn bộ quyền hạn chức năng
                      và quyền truy cập toàn diện 18 phòng ban của Seajong Việt Nam.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SYSTEM_PERMISSIONS.map((p) => {
                    const isChecked = editPerms.includes(p.key);
                    return (
                      <div
                        key={p.key}
                        onClick={() => handleTogglePerm(p.key)}
                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-slate-50/80 border-indigo-200 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${p.color} 14%, transparent)`,
                              color: p.color,
                            }}
                          >
                            <i className={`bi ${p.icon} text-sm`} />
                          </div>
                          <span
                            className={`text-xs truncate ${
                              isChecked
                                ? 'font-bold text-slate-900'
                                : 'font-medium text-slate-700'
                            }`}
                          >
                            {p.label}
                          </span>
                        </div>
                        <ToggleSwitch
                          on={isChecked}
                          onChange={() => handleTogglePerm(p.key)}
                          color={p.color}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Tab 2: Phân quyền truy cập phòng ban */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Ma trận phân quyền truy cập phòng ban
                </span>
                <span className="text-[11px] text-slate-400">
                  Click vào nút mức độ quyền để chuyển đổi (Không có quyền → Chỉ xem → Toàn quyền)
                </span>
              </div>

              {/* Quick actions for all departments */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetAllDeptLevel('full')}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                >
                  Toàn quyền tất cả
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllDeptLevel('view')}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
                >
                  Chỉ xem tất cả
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllDeptLevel('none')}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Xóa quyền
                </button>
              </div>
            </div>

            {/* Department List */}
            <div className="space-y-2">
              {departments.map((d) => {
                const currentAccess = editDeptAccess.find((x) => x.code === d.code) ?? {
                  code: d.code,
                  level: 'none' as const,
                };
                const cfg = LEVEL_LABELS[currentAccess.level];
                const dColor = GROUP_COLORS[d.group] || '#6366f1';
                const groupName = GROUP_LABELS[d.group] || 'Phòng ban';

                return (
                  <div
                    key={d.code}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${dColor} 12%, transparent)`,
                          color: dColor,
                        }}
                      >
                        <i className={`bi ${d.icon || 'bi-building'} text-sm`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {d.nameVi}
                          </span>
                          <span
                            className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${dColor} 10%, transparent)`,
                              color: dColor,
                            }}
                          >
                            {groupName}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          Mã: {d.code} {d.nameEn ? `· ${d.nameEn}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Level Selector Button */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <div className="hidden md:flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
                        {(['none', 'view', 'full'] as const).map((lvl) => {
                          const isActive = currentAccess.level === lvl;
                          const lvlCfg = LEVEL_LABELS[lvl];
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleSetDeptLevel(d.code, lvl)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-white shadow-2xs font-extrabold'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                              style={{
                                color: isActive ? lvlCfg.color : undefined,
                              }}
                            >
                              {lvlCfg.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Mobile / Quick Cycle Button */}
                      <button
                        type="button"
                        onClick={() => handleCycleDeptLevel(d.code)}
                        className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border"
                        style={{
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                          borderColor: `color-mix(in srgb, ${cfg.color} 30%, transparent)`,
                        }}
                      >
                        <i className={`bi ${cfg.icon}`} />
                        <span>{cfg.label}</span>
                        <i className="bi bi-arrow-repeat text-[10px] opacity-70" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <SplitLayoutPage
      title="Phân quyền người dùng & Tài khoản"
      description="Quản lý tài khoản đăng nhập, nhóm quyền hạn và phân quyền truy cập 18 phòng ban"
      icon="bi-person-lock"
      color="violet"
      badge="SYSTEM ADMIN"
      hideTicker={true}
      tickerContext="users"
      leftCols={4}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
};

export default UserAuthManagementPage;
