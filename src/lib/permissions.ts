import type { User, DeptAccessEntry } from '../types';

export type AccessLevel = 'none' | 'view' | 'full';

/**
 * Chuẩn hoá mã phòng ban về mã chuẩn của hệ thống
 */
export function normalizeDeptCode(code?: string | null): string {
  const c = (code || '').trim().toLowerCase();
  if (!c) return 'board';
  if (c === 'kho' || c === 'kho-hang' || c === 'warehouse') return 'logistics';
  if (c === 'tai-chinh' || c === 'ke-toan') return 'finance';
  if (c === 'san-xuat' || c === 'sx') return 'production';
  if (c === 'mua-hang' || c === 'procurement' || c === 'purchasing') return 'purchase';
  if (c === 'kd' || c === 'kinh-doanh') return 'sales';
  if (c === 'nhan-su') return 'hr';
  if (c === 'qc' || c === 'quality' || c === 'quan-ly-chat-luong') return 'qa';
  if (c === 'dai-ly') return 'dealer';
  return c;
}

/**
 * Kiểm tra tài khoản có vai trò Quản trị viên hệ thống (ADMIN / SUPERADMIN / DIRECTOR)
 */
export function isAdminUser(user?: Partial<User> | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPERADMIN' || role === 'DIRECTOR';
}

/**
 * Đọc mảng quyền chức năng đã cấp cho tài khoản
 */
export function parseUserPermissions(user?: Partial<User> | null): string[] {
  if (!user || !user.permissions) return [];
  if (Array.isArray(user.permissions)) {
    return user.permissions.filter((x): x is string => typeof x === 'string');
  }
  if (typeof user.permissions === 'string') {
    try {
      const parsed = JSON.parse(user.permissions);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Đọc mảng quyền truy cập phòng ban đã cấp cho tài khoản
 */
export function parseUserDeptAccess(user?: Partial<User> | null): DeptAccessEntry[] {
  if (!user || !user.deptAccess) return [];
  let raw: unknown[] = [];
  if (Array.isArray(user.deptAccess)) {
    raw = user.deptAccess;
  } else if (typeof user.deptAccess === 'string') {
    try {
      const parsed = JSON.parse(user.deptAccess);
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      raw = [];
    }
  }

  const result: DeptAccessEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      result.push({ code: normalizeDeptCode(item), level: 'full' });
    } else if (item && typeof item === 'object' && 'code' in item) {
      const obj = item as { code?: string; level?: string };
      if (obj.code) {
        const lvl: AccessLevel =
          obj.level === 'full' || obj.level === 'view' ? obj.level : 'none';
        if (lvl !== 'none') {
          result.push({ code: normalizeDeptCode(obj.code), level: lvl });
        }
      }
    }
  }
  return result;
}

/**
 * Kiểm tra tài khoản có quyền chức năng nghiệp vụ cụ thể hay không
 * - ADMIN mặc định có toàn quyền
 * - USER kiểm tra trực tiếp trong danh sách permissions được cấp
 */
export function hasPermission(user: Partial<User> | null | undefined, permKey: string): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const perms = parseUserPermissions(user);
  return perms.includes(permKey);
}

/**
 * Kiểm tra tài khoản có ít nhất 1 quyền trong danh sách permKeys hay không
 */
export function hasAnyPermission(
  user: Partial<User> | null | undefined,
  permKeys: string[]
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (permKeys.length === 0) return true;
  const perms = parseUserPermissions(user);
  return permKeys.some((k) => perms.includes(k));
}

/**
 * Bản đồ quyền chức năng đặc thù theo từng phòng ban
 */
export const DEPT_SPECIFIC_PERMISSIONS: Record<string, string[]> = {
  board: ['approve_request', 'plan', 'task'],
  sales: ['crm', 'sales_orders', 'oem_sales', 'view_prices'],
  finance: ['approve_budget', 'finance_cashflow', 'finance_debts', 'finance_reports'],
  logistics: ['logistics_assign', 'logistics_in_out', 'logistics_picking', 'logistics_print'],
  production: ['prod_orders', 'prod_bom', 'prod_defects'],
  qa: ['qa_inspect', 'qa_standards', 'qa_defects'],
  purchase: ['purchase_po', 'purchase_suppliers'],
  marketing: ['mkt_products', 'mkt_campaigns'],
  hr: ['hr_profiles', 'hr_payroll'],
};

/**
 * Lấy mức độ truy cập ('none' | 'view' | 'full') của người dùng đối với một phòng ban
 */
export function getDeptAccessLevel(
  user: Partial<User> | null | undefined,
  deptCode: string
): AccessLevel {
  if (!user) return 'none';
  const target = normalizeDeptCode(deptCode);

  if (user.role === 'DEALER') {
    return target === 'dealer' ? 'full' : 'none';
  }

  // Tài khoản ADMIN
  if (isAdminUser(user)) {
    const primaryDept = normalizeDeptCode(
      user.employee?.departmentCode || (user.departmentCode !== 'all' ? user.departmentCode : 'board')
    );
    const deptAccess = parseUserDeptAccess(user);
    // Nếu là Admin tổng hoặc Ban Giám đốc hoặc chưa giới hạn deptAccess -> Toàn quyền mọi phòng ban
    if (
      deptAccess.length === 0 ||
      primaryDept === 'board' ||
      user.email?.toLowerCase() === 'admin@seajong.com'
    ) {
      return 'full';
    }
    if (target === primaryDept || target === 'board') {
      return 'full';
    }
    const found = deptAccess.find((d) => d.code === target);
    if (found) return found.level;
    // Nếu Admin có quyền chức năng thuộc phòng ban đó
    const deptPerms = DEPT_SPECIFIC_PERMISSIONS[target] || [];
    const explicitPerms = parseUserPermissions(user);
    if (deptPerms.some((k) => explicitPerms.includes(k))) {
      return 'full';
    }
    return 'none';
  }

  // Tài khoản USER (Nhân viên):
  // 1. Kiểm tra cấu hình Truy cập phòng ban (deptAccess)
  const deptAccess = parseUserDeptAccess(user);
  const foundAccess = deptAccess.find((d) => d.code === target);
  if (foundAccess) {
    return foundAccess.level;
  }

  // 2. Phòng ban trực thuộc chính thức của nhân sự
  const userPrimaryDept = user.employee?.departmentCode
    ? normalizeDeptCode(user.employee.departmentCode)
    : user.departmentCode && user.departmentCode !== 'all'
    ? normalizeDeptCode(user.departmentCode)
    : null;

  if (userPrimaryDept && userPrimaryDept === target) {
    return 'full';
  }

  // 3. Nếu nhân viên chưa được gán phòng ban cụ thể (Hệ thống chung) và chưa có deptAccess nào
  if (!userPrimaryDept && deptAccess.length === 0) {
    // Nếu có quyền chức năng của phòng ban đó thì mở phòng ban đó
    const deptPerms = DEPT_SPECIFIC_PERMISSIONS[target] || [];
    const userPerms = parseUserPermissions(user);
    if (deptPerms.some((k) => userPerms.includes(k))) {
      return 'full';
    }
    // Cho phép xem phòng ban mặc định board (nhưng các chức năng bên trong vẫn khoá theo quyền)
    if (target === 'board') return 'view';
    return 'none';
  }

  // 4. Nếu nhân viên được cấp quyền chức năng nghiệp vụ thuộc phòng ban target
  const deptPerms = DEPT_SPECIFIC_PERMISSIONS[target] || [];
  const userPerms = parseUserPermissions(user);
  if (deptPerms.some((k) => userPerms.includes(k))) {
    return 'full';
  }

  return 'none';
}

/**
 * Kiểm tra người dùng có được phép truy cập vào phòng ban hay không
 */
export function canAccessDepartment(
  user: Partial<User> | null | undefined,
  deptCode: string
): boolean {
  return getDeptAccessLevel(user, deptCode) !== 'none';
}

/**
 * Lấy phòng ban mặc định hợp lệ đầu tiên cho người dùng
 */
export function getDefaultAllowedDepartment(user?: Partial<User> | null): string {
  if (!user) return 'board';
  if (user.role === 'DEALER' || user.departmentCode === 'dealer') return 'dealer';
  if (user.employee?.departmentCode) {
    return normalizeDeptCode(user.employee.departmentCode);
  }
  const deptAccess = parseUserDeptAccess(user);
  if (deptAccess.length > 0) {
    return deptAccess[0].code;
  }
  // Kiểm tra theo quyền chức năng đã cấp
  const userPerms = parseUserPermissions(user);
  for (const [dept, keys] of Object.entries(DEPT_SPECIFIC_PERMISSIONS)) {
    if (keys.some((k) => userPerms.includes(k))) {
      return dept;
    }
  }
  return 'board';
}

/**
 * Quy định quyền cần thiết cho từng menu chức năng trên Sidebar & DashboardView
 */
export function getRequiredPermissionsForMenu(
  deptCode: string,
  menuKey: string
): { keys: string[]; label: string; adminOnly?: boolean } | null {
  const dept = normalizeDeptCode(deptCode);
  const key = (menuKey || '').trim().toLowerCase();

  // Các mục cá nhân & tổng quan luôn mở cho nhân viên thuộc phòng ban
  if (
    !key ||
    key === 'overview' ||
    key === 'my_tasks' ||
    key === 'my-tasks' ||
    key === 'personal-tasks' ||
    key === 'my_attendance' ||
    key === 'my-attendance' ||
    key === 'attendance' ||
    key === 'my_requests' ||
    key === 'my-requests' ||
    key === 'requests' ||
    key === 'recruitment_req' ||
    key === 'documents' ||
    key === 'meetings' ||
    key === 'notebook' ||
    key === 'journal'
  ) {
    return null;
  }

  // 1. Nhóm Quản trị hệ thống (Chỉ ADMIN)
  if (
    key === 'users' ||
    key === 'user-auth' ||
    key === 'permissions' ||
    key === 'user_auth' ||
    key === 'categories' ||
    key === 'system_categories' ||
    key === 'danh-muc' ||
    key === 'data-management' ||
    key === 'board_data' ||
    key === 'data'
  ) {
    return {
      keys: [],
      label: 'Quản trị viên hệ thống (ADMIN)',
      adminOnly: true,
    };
  }

  if (key === 'labor-policy' || key === 'labor-rules' || key === 'labor_policy') {
    return {
      keys: ['hr_profiles'],
      label: 'Quản lý hồ sơ nhân sự & Nội quy lao động',
    };
  }

  // 2. Nhóm Duyệt yêu cầu / Phê duyệt tài liệu
  if (key === 'approvals' || key === 'requests_approvals' || key === 'hr_requests_approvals') {
    return {
      keys: ['approve_request'],
      label: 'Duyệt yêu cầu & tờ trình',
    };
  }

  // 3. Nhóm Quản trị công việc
  if (
    key === 'tasks' ||
    key === 'task-management' ||
    key === 'work-management' ||
    key === 'task'
  ) {
    return {
      keys: ['task'],
      label: 'Quản trị & giao công việc',
    };
  }

  // 4. Nhóm Lập kế hoạch
  if (
    key === 'plan' ||
    key === 'board_plan' ||
    key === 'director-plan' ||
    key === 'master-plan' ||
    key === 'sales_plan'
  ) {
    return {
      keys: ['plan'],
      label: 'Lập kế hoạch chiến lược',
    };
  }

  if (key === 'mkt_plan' || key === 'marketing-plan' || key === 'planing-1111') {
    return {
      keys: ['plan', 'mkt_campaigns'],
      label: 'Lập kế hoạch chiến lược / Marketing',
    };
  }

  // 5. Phòng Kinh doanh (sales)
  if (key === 'order-tracking' || key === 'order_tracking' || key === 'orders' || key === 'sale_orders') {
    if (dept === 'dealer') return null;
    return {
      keys: ['sales_orders', 'oem_sales'],
      label: 'Tạo & quản lý đơn bán hàng / OEM',
    };
  }
  if (key === 'dealer-support' || key === 'dealer_support') {
    return {
      keys: ['crm', 'sales_orders', 'oem_sales'],
      label: 'Quản lý khách hàng (CRM) / Đơn bán hàng',
    };
  }
  if (key === 'partners' || key === 'customers' || (key === 'dealers' && dept === 'sales')) {
    return {
      keys: ['crm'],
      label: 'Quản lý khách hàng (CRM)',
    };
  }
  if (key === 'pricing') {
    return {
      keys: ['view_prices'],
      label: 'Hiển thị giá & chiết khấu',
    };
  }
  if (key === 'business-results' || key === 'internal-reports') {
    return {
      keys: ['report'],
      label: 'Xem báo cáo tổng hợp',
    };
  }

  // 6. Phòng Tài chính – Kế toán (finance)
  if (key === 'cashflow' || key === 'cashflow-tracking') {
    return {
      keys: ['finance_cashflow'],
      label: 'Quản lý dòng tiền & thu chi',
    };
  }
  if (key === 'debts' || key === 'debt-cost-mgmt') {
    if (dept === 'dealer') return null;
    return {
      keys: ['finance_debts', 'approve_budget'],
      label: 'Quản lý công nợ & tạm ứng',
    };
  }
  if (key === 'advances' || key === 'advance-payment' || key === 'refund-advance') {
    return {
      keys: ['finance_debts', 'approve_budget', 'finance_cashflow'],
      label: 'Quản lý công nợ & tạm ứng / Duyệt ngân sách',
    };
  }
  if (key === 'assets' && dept === 'finance') {
    return {
      keys: ['approve_budget', 'finance_debts', 'finance_cashflow'],
      label: 'Quản lý tài chính & tài sản',
    };
  }
  if (key === 'journal-entries' || key === 'general-journal' || key === 'initial-declaration') {
    return {
      keys: ['finance_cashflow', 'finance_debts', 'finance_reports'],
      label: 'Nghiệp vụ Kế toán nội bộ',
    };
  }
  if (key === 'financial-reports' || (key === 'reports' && dept === 'finance')) {
    return {
      keys: ['finance_reports', 'report'],
      label: 'Lập & xuất báo cáo tài chính',
    };
  }

  // 7. Bộ phận Kho vận (logistics)
  if (key === 'system' || key === 'warehouses' || key === 'warehouse-system') {
    return {
      keys: ['logistics_assign', 'logistics_in_out'],
      label: 'Điều phối kho / Thực hiện xuất nhập & kiểm kho',
    };
  }
  if (key === 'inbound') {
    return {
      keys: ['logistics_in_out', 'logistics_assign'],
      label: 'Thực hiện xuất / nhập & kiểm kho',
    };
  }
  if (key === 'material-picking') {
    return {
      keys: ['logistics_picking', 'logistics_assign'],
      label: 'Cấp phát vật tư & gom hàng',
    };
  }
  if (key === 'batch-packing') {
    return {
      keys: ['logistics_picking', 'logistics_print', 'logistics_assign'],
      label: 'Cấp phát vật tư & gom hàng / In tem nhiệt',
    };
  }
  if (
    key === 'inventory-reports' ||
    key === 'bao-cao-kho' ||
    (key === 'reports' && dept === 'logistics')
  ) {
    return {
      keys: ['report', 'logistics_assign', 'logistics_in_out', 'finance_reports'],
      label: 'Xem báo cáo tổng hợp / Báo cáo kho',
    };
  }
  if (
    key === 'audit-logs' ||
    key === 'nhat-ky-kho' ||
    key === 'nhat-ky-hoat-dong-kho'
  ) {
    return {
      keys: ['report', 'logistics_assign', 'logistics_in_out', 'finance_reports'],
      label: 'Nhật ký hoạt động kho / Báo cáo kho',
    };
  }

  // 8. Phòng Sản xuất (production)
  if (key === 'defects') {
    return {
      keys: ['prod_defects'],
      label: 'Xử lý & khắc phục hàng lỗi',
    };
  }
  if (key === 'bom') {
    return {
      keys: ['prod_bom'],
      label: 'Xây dựng định mức vật tư (BOM)',
    };
  }

  // 9. Bộ phận Đảm bảo chất lượng (qa)
  if (key === 'standards' || key === 'qa_standards') {
    return {
      keys: ['qa_standards'],
      label: 'Thiết lập tiêu chuẩn chất lượng',
    };
  }
  if (key === 'defects-summary' || key === 'defects_summary') {
    return {
      keys: ['qa_defects', 'qa_inspect'],
      label: 'Lập biên bản & tổng hợp hàng lỗi / Kiểm định QC',
    };
  }

  // 10. Phòng Mua hàng (purchase)
  if (key === 'suppliers' || key === 'carriers' || key === 'purchasing') {
    return {
      keys: ['purchase_suppliers', 'purchase_po'],
      label: 'Quản lý nhà cung cấp & đơn mua hàng (PO)',
    };
  }

  // 11. Phòng Marketing (marketing)
  if (key === 'products' || key === 'product' || key === 'brand' || key === 'brand-identity') {
    return {
      keys: ['mkt_products'],
      label: 'Quản lý sản phẩm & thương hiệu',
    };
  }
  if (
    key === 'competitors' ||
    key === 'market-analysis' ||
    key === 'events' ||
    (key === 'dealers' && dept === 'marketing')
  ) {
    return {
      keys: ['mkt_campaigns'],
      label: 'Thị trường, sự kiện & đối thủ',
    };
  }

  // 12. Phòng Nhân sự (hr)
  if (
    key === 'recruitment' ||
    key === 'interviews' ||
    key === 'probation' ||
    key === 'training' ||
    key === 'employees' ||
    key === 'promotions' ||
    key === 'terminations' ||
    key === 'stationery'
  ) {
    return {
      keys: ['hr_profiles'],
      label: 'Quản lý hồ sơ nhân sự & tuyển dụng',
    };
  }
  if (
    key === 'attendance-payroll' ||
    key === 'payroll' ||
    key === 'insurance' ||
    key === 'salary-adjustments'
  ) {
    return {
      keys: ['hr_payroll'],
      label: 'Chấm công, tính lương & bảo hiểm',
    };
  }

  // 13. Mục Kho hàng dùng chung ở các bộ phận
  if (key === 'inventory') {
    if (dept === 'production') {
      return {
        keys: ['prod_orders', 'prod_bom', 'logistics_in_out'],
        label: 'Quản lý lệnh sản xuất / Định mức BOM / Kho vận',
      };
    }
    if (dept === 'finance') {
      return {
        keys: ['finance_reports', 'report', 'logistics_in_out'],
        label: 'Báo cáo tài chính / Theo dõi kho hàng',
      };
    }
    if (dept === 'sales') {
      return {
        keys: ['sales_orders', 'oem_sales', 'crm', 'logistics_in_out'],
        label: 'Quản lý đơn bán hàng / Khách hàng',
      };
    }
    if (dept === 'purchase') {
      return {
        keys: ['purchase_po', 'purchase_suppliers', 'logistics_in_out'],
        label: 'Đơn mua hàng (PO) / Nhà cung cấp',
      };
    }
  }

  return null;
}

/**
 * Kiểm tra một mục menu trong Sidebar / DashboardView có bị khoá đối với người dùng hiện tại không
 */
export function isMenuLocked(
  user: Partial<User> | null | undefined,
  deptCode: string,
  menuKey: string
): boolean {
  if (!user) return true;
  if (isAdminUser(user)) return false;

  const req = getRequiredPermissionsForMenu(deptCode, menuKey);
  if (!req) return false;
  if (req.adminOnly) return !isAdminUser(user);
  return !hasAnyPermission(user, req.keys);
}

/**
 * Trả về thông báo lý do khoá menu (dùng cho tooltip / màn hình thông báo khoá)
 */
export function getMenuLockReason(
  user: Partial<User> | null | undefined,
  deptCode: string,
  menuKey: string
): string | null {
  if (!isMenuLocked(user, deptCode, menuKey)) return null;
  const req = getRequiredPermissionsForMenu(deptCode, menuKey);
  if (!req) return 'Tài khoản chưa được cấp quyền truy cập chức năng này';
  if (req.adminOnly) {
    return 'Chức năng chỉ dành cho Quản trị viên hệ thống (ADMIN)';
  }
  return `Chưa được cấp quyền: ${req.label}`;
}

