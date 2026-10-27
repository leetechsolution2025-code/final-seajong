import { useState, useEffect, useMemo, forwardRef } from 'react';
import { Select, type SelectProps, type SelectOption } from './Select';

export interface DepartmentItem {
  id: number | string;
  code: string;
  name: string;
  nameVi?: string;
  nameEn?: string;
  group?: string;
  icon?: string;
  sortOrder?: number;
  status?: 'active' | 'hidden' | string;
  isActive?: boolean;
  parentId?: number | null;
}

// Danh mục phòng ban mặc định dự phòng chuẩn theo cơ sở dữ liệu Seajong
export const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
  { id: 'board', code: 'board', name: 'Ban Giám đốc', nameVi: 'Ban Giám đốc', nameEn: 'Board of Directors', sortOrder: 1, status: 'active', isActive: true },
  { id: 'hr', code: 'hr', name: 'Nhân sự', nameVi: 'Nhân sự', nameEn: 'Human Resources', sortOrder: 10, status: 'active', isActive: true },
  { id: 'finance', code: 'finance', name: 'Tài chính – Kế toán', nameVi: 'Tài chính – Kế toán', nameEn: 'Finance & Accounting', sortOrder: 11, status: 'active', isActive: true },
  { id: 'sales', code: 'sales', name: 'Kinh doanh', nameVi: 'Kinh doanh', nameEn: 'Sales', sortOrder: 20, status: 'active', isActive: true },
  { id: 'marketing', code: 'marketing', name: 'Marketing', nameVi: 'Marketing', nameEn: 'Marketing', sortOrder: 21, status: 'active', isActive: true },
  { id: 'logistics', code: 'logistics', name: 'Kho vận', nameVi: 'Kho vận', nameEn: 'Logistics & Warehouse', sortOrder: 31, status: 'active', isActive: true },
  { id: 'purchase', code: 'purchase', name: 'Mua hàng', nameVi: 'Mua hàng', nameEn: 'Purchasing', sortOrder: 32, status: 'active', isActive: true },
  { id: 'qa', code: 'qa', name: 'Đảm bảo chất lượng', nameVi: 'Đảm bảo chất lượng', nameEn: 'Quality Assurance', sortOrder: 33, status: 'active', isActive: true },
  { id: 'production', code: 'production', name: 'Sản xuất', nameVi: 'Sản xuất', nameEn: 'Production', sortOrder: 35, status: 'active', isActive: true },
];

// Bộ nhớ cache dùng chung cho toàn bộ ứng dụng để tránh request trùng lặp
let cachedDepartments: DepartmentItem[] | null = null;
let isFetchingDepartments = false;
const listeners: Array<(depts: DepartmentItem[]) => void> = [];

export async function fetchDepartmentsFromDb(): Promise<DepartmentItem[]> {
  if (cachedDepartments && cachedDepartments.length > 0) {
    return cachedDepartments;
  }
  if (isFetchingDepartments) {
    return new Promise((resolve) => {
      listeners.push((depts) => resolve(depts));
    });
  }

  isFetchingDepartments = true;
  try {
    const res = await fetch('/api/departments');
    if (res.ok) {
      const json = await res.json();
      const rawData = Array.isArray(json) ? json : json.data;
      if (Array.isArray(rawData) && rawData.length > 0) {
        const activeDepts: DepartmentItem[] = rawData
          .filter((item: any) => item.isActive !== false && item.status !== 'hidden')
          .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map((item: any) => ({
            id: item.id || item.code,
            code: item.code,
            name: item.nameVi || item.name || item.code,
            nameVi: item.nameVi || item.name,
            nameEn: item.nameEn,
            group: item.group,
            icon: item.icon,
            sortOrder: item.sortOrder || 0,
            status: item.isActive !== false ? 'active' : 'hidden',
            isActive: item.isActive !== false,
          }));
        if (activeDepts.length > 0) {
          cachedDepartments = activeDepts;
          listeners.forEach((fn) => fn(activeDepts));
          listeners.length = 0;
          return activeDepts;
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi khi tải danh mục phòng ban từ DB:', err);
  } finally {
    isFetchingDepartments = false;
  }

  cachedDepartments = DEFAULT_DEPARTMENTS;
  listeners.forEach((fn) => fn(DEFAULT_DEPARTMENTS));
  listeners.length = 0;
  return DEFAULT_DEPARTMENTS;
}

/**
 * Ánh xạ chuẩn hóa từ tên phòng ban sang key/mã code
 */
export function getDeptKeyFromName(name?: string): string {
  if (!name) return 'sales';
  const lower = name.toLowerCase().trim();
  if (lower.includes('hội đồng') || lower.includes('hdqt')) return 'board';
  if (lower.includes('giám đốc') || lower.includes('bgd') || lower.includes('board') || lower.includes('bom') || lower.includes('ceo')) return 'board';
  if (lower.includes('nhân sự') || lower.includes('hành chính') || lower.includes('hr') || lower.includes('hcns')) return 'hr';
  if (lower.includes('tài chính') || lower.includes('kế toán') || lower.includes('finance') || lower.includes('tc')) return 'finance';
  if (lower.includes('marketing') || lower.includes('mkt') || lower.includes('truyền thông')) return 'marketing';
  if (lower.includes('kinh doanh') || lower.includes('bán hàng') || lower.includes('sales') || lower.includes('kd')) return 'sales';
  if (lower.includes('kho') || lower.includes('logistics') || lower.includes('vận chuyển') || lower.includes('giao nhận')) return 'logistics';
  if (lower.includes('mua hàng') || lower.includes('thu mua') || lower.includes('cung ứng') || lower.includes('purchase')) return 'purchase';
  if (lower.includes('chất lượng') || lower.includes('qa') || lower.includes('qc') || lower.includes('kcs')) return 'qa';
  if (lower.includes('sản xuất') || lower.includes('nhà máy') || lower.includes('xưởng') || lower.includes('production') || lower.includes('sx')) return 'production';
  if (lower.includes('khách hàng') || lower.includes('cskh') || lower.includes('cs')) return 'cs';
  return lower;
}

/**
 * Helper kiểm tra khớp phòng ban linh hoạt (hỗ trợ cả mã code, key hệ thống và tên tiếng Việt có dấu/không dấu)
 */
export function matchDepartment(itemDept?: string, filterValue?: string): boolean {
  if (!filterValue || filterValue === 'all' || filterValue === 'ALL') return true;
  if (!itemDept) return false;

  const itemNorm = itemDept.toLowerCase().trim();
  const filterNorm = filterValue.toLowerCase().trim();

  // Khớp chính xác
  if (itemNorm === filterNorm) return true;

  // Khớp mã chuẩn hóa
  const itemKey = getDeptKeyFromName(itemNorm);
  const filterKey = getDeptKeyFromName(filterNorm);
  if (itemKey === filterKey) return true;

  // Khớp qua mã ánh xạ code phòng ban
  const aliasMap: Record<string, string[]> = {
    board: ['board', 'bgd', 'bom', 'giám đốc', 'ban giám đốc'],
    bgd: ['board', 'bgd', 'bom', 'giám đốc', 'ban giám đốc'],
    bom: ['board', 'bgd', 'bom', 'giám đốc', 'ban giám đốc'],
    hr: ['hr', 'hcns', 'nhân sự', 'hành chính', 'hành chính – nhân sự'],
    hcns: ['hr', 'hcns', 'nhân sự', 'hành chính', 'hành chính – nhân sự'],
    finance: ['finance', 'tc', 'tài chính', 'kế toán', 'tài chính – kế toán'],
    tc: ['finance', 'tc', 'tài chính', 'kế toán', 'tài chính – kế toán'],
    sales: ['sales', 'kd', 'kinh doanh', 'bán hàng'],
    kd: ['sales', 'kd', 'kinh doanh', 'bán hàng'],
    marketing: ['marketing', 'mkt', 'tiếp thị', 'truyền thông'],
    mkt: ['marketing', 'mkt', 'tiếp thị', 'truyền thông'],
    logistics: ['logistics', 'kho', 'kho vận', 'vận chuyển', 'giao nhận'],
    kho: ['logistics', 'kho', 'kho vận', 'vận chuyển', 'giao nhận'],
    purchase: ['purchase', 'mua hàng', 'thu mua', 'cung ứng'],
    qa: ['qa', 'qc', 'kcs', 'chất lượng', 'đảm bảo chất lượng'],
    production: ['production', 'sx', 'sản xuất', 'nhà máy', 'xưởng'],
    sx: ['production', 'sx', 'sản xuất', 'nhà máy', 'xưởng'],
    cs: ['cs', 'chăm sóc khách hàng', 'cskh'],
  };

  const aliases = aliasMap[filterNorm] || aliasMap[filterKey] || [];
  if (aliases.some((a) => itemNorm.includes(a) || itemKey === a)) return true;

  return itemNorm.includes(filterNorm) || filterNorm.includes(itemNorm);
}

/**
 * Hook nạp danh sách phòng ban từ CSDL với cơ chế tự động cập nhật
 */
export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentItem[]>(
    cachedDepartments || DEFAULT_DEPARTMENTS
  );
  const [loading, setLoading] = useState<boolean>(!cachedDepartments);

  const refresh = async () => {
    setLoading(true);
    cachedDepartments = null;
    const depts = await fetchDepartmentsFromDb();
    setDepartments(depts);
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartmentsFromDb().then((depts) => {
      setDepartments(depts);
      setLoading(false);
    });

    const handleSync = () => {
      refresh();
    };

    window.addEventListener('seajong_departments_updated', handleSync);
    window.addEventListener('departments_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('seajong_departments_updated', handleSync);
      window.removeEventListener('departments_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return { departments, loading, refresh, matchDepartment, getDeptKeyFromName };
}

export interface UseDepartmentOptionsConfig {
  includeAll?: boolean;
  allLabel?: string;
  allValue?: string;
  valueType?: 'name' | 'code' | 'id';
}

/**
 * Hook trả về danh sách options cho Select / TableToolbar bộ lọc phòng ban
 */
export function useDepartmentOptions(config: UseDepartmentOptionsConfig = {}) {
  const {
    includeAll = false,
    allLabel = 'Tất cả phòng ban',
    allValue = 'all',
    valueType = 'name',
  } = config;

  const { departments, loading, refresh } = useDepartments();

  const options: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [];
    if (includeAll) {
      list.push({ value: allValue, label: allLabel });
    }
    departments.forEach((dept) => {
      let val = dept.name;
      if (valueType === 'code') val = dept.code;
      else if (valueType === 'id') val = String(dept.id);
      list.push({ value: val, label: dept.name });
    });
    return list;
  }, [departments, includeAll, allLabel, allValue, valueType]);

  return { options, departments, loading, refresh };
}

export interface DepartmentSelectProps extends Omit<SelectProps, 'options'> {
  includeAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
  valueType?: 'name' | 'code' | 'id';
  customOptions?: SelectOption[];
}

/**
 * Component DepartmentSelect: Bộ chọn phòng ban đồng bộ chuẩn theo CSDL DB
 */
export const DepartmentSelect = forwardRef<HTMLSelectElement, DepartmentSelectProps>(
  (
    {
      includeAllOption = false,
      allOptionLabel = 'Tất cả phòng ban',
      allOptionValue = 'all',
      valueType = 'name',
      customOptions,
      label,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const { options } = useDepartmentOptions({
      includeAll: includeAllOption,
      allLabel: allOptionLabel,
      allValue: allOptionValue,
      valueType,
    });

    const finalOptions = customOptions || options;

    return (
      <Select
        ref={ref}
        label={label}
        value={value}
        onChange={onChange}
        options={finalOptions}
        {...props}
      />
    );
  }
);

DepartmentSelect.displayName = 'DepartmentSelect';
