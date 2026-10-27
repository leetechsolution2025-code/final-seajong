export interface EmployeeInfo {
  code: string;
  fullName: string;
  position: string;
  departmentCode: string;
  departmentName: string;
  branchCode?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  deptAccess?: string[];
  employee?: EmployeeInfo | null;
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
