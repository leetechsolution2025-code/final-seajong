export interface EmployeeInfo {
  code: string;
  fullName: string;
  position: string;
  departmentCode: string;
  departmentName: string;
  branchCode?: string | null;
}

export interface CustomerInfo {
  id: string;
  code: string;
  name: string;
  dienThoai?: string | null;
  address?: string | null;
  hanMucCongNo?: number;
  doanhSoCamKet?: number;
  loai?: string | null;
  nguoiChamSoc?: {
    id: string;
    fullName: string;
    phone?: string | null;
  } | null;
}

export interface DeptAccessEntry {
  code: string;
  level: 'none' | 'view' | 'full';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  deptAccess?: Array<string | DeptAccessEntry>;
  departmentCode?: string;
  position?: string;
  employee?: EmployeeInfo | null;
  customer?: CustomerInfo | null;
}

export interface Department {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  group: string;
  sortOrder: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface DashboardSummary {
  company: string;
  stats: {
    departments: number;
    employees: number;
    warehouses: number;
    activeProjects: number;
  };
  departments: Department[];
  warehouses: Warehouse[];
}

export interface ModernStepItem {
  num: number;
  id: string;
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  locked?: boolean;
  hasNewData?: boolean;
  badge?: string | number;
  badgeVariant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  color?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  initials: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClick?: () => void;
}
