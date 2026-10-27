import type { MonthlyPlanItem } from '../pages/departments/bom/BusinessPlanView';

const STORAGE_KEY = 'decodoor_business_plans';
const STATUS_STORAGE_KEY = 'decodoor_business_plan_statuses';

export interface BusinessPlansData {
  plans: Record<string, MonthlyPlanItem[]>;
  statuses: Record<string, 'draft' | 'approved' | 'active'>;
}

/**
 * Tải toàn bộ dữ liệu kế hoạch các năm từ SQLite Database hoặc Fallback LocalStorage
 */
export async function fetchBusinessPlansFromDB(): Promise<BusinessPlansData | null> {
  try {
    const res = await fetch('/api/business-plans');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && json.data.plans && Object.keys(json.data.plans).length > 0) {
        // Lưu cache lại localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data.plans));
          localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(json.data.statuses || {}));
        } catch {}
        return {
          plans: json.data.plans,
          statuses: json.data.statuses || {},
        };
      }
    }
  } catch (err) {
    console.warn('Không thể kết nối đến Backend SQLite, chuyển sang nạp từ LocalStorage:', err);
  }

  // Fallback sang localStorage nếu DB chưa có bản ghi nào
  try {
    const cachedPlans = localStorage.getItem(STORAGE_KEY);
    const cachedStatuses = localStorage.getItem(STATUS_STORAGE_KEY);
    if (cachedPlans) {
      return {
        plans: JSON.parse(cachedPlans),
        statuses: cachedStatuses ? JSON.parse(cachedStatuses) : {},
      };
    }
  } catch {}

  return null;
}

/**
 * Lưu kế hoạch 1 năm cụ thể vào SQLite Database
 */
export async function saveBusinessPlanToDB(
  year: string,
  monthlyPlans: MonthlyPlanItem[],
  status: string,
  totalRevenue: number,
  totalUnits: number,
  totalRecovery: number
): Promise<{ success: boolean; message?: string }> {
  // Cập nhật ngay vào localStorage để đảm bảo dữ liệu không mất kể cả khi offline
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    const plansObj = cached ? JSON.parse(cached) : {};
    plansObj[year] = monthlyPlans;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plansObj));

    const cachedSt = localStorage.getItem(STATUS_STORAGE_KEY);
    const statusesObj = cachedSt ? JSON.parse(cachedSt) : {};
    statusesObj[year] = status;
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusesObj));
  } catch {}

  try {
    const res = await fetch('/api/business-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year,
        status,
        totalRevenue,
        totalUnits,
        totalRecovery,
        monthlyPlans,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return { success: json.success, message: json.message };
    }
  } catch (err: any) {
    console.error('Lỗi khi lưu kế hoạch vào SQLite DB:', err);
    return { success: false, message: err?.message || 'Lỗi mạng khi lưu vào DB' };
  }

  return { success: true, message: 'Đã lưu kế hoạch vào bộ nhớ cache trình duyệt.' };
}

/**
 * Lưu toàn bộ kế hoạch tất cả các năm vào SQLite Database
 */
export async function saveAllBusinessPlansToDB(
  allPlans: Record<string, MonthlyPlanItem[]>,
  allStatuses: Record<string, 'draft' | 'approved' | 'active'>
): Promise<{ success: boolean; message?: string }> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPlans));
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(allStatuses));
  } catch {}

  try {
    const res = await fetch('/api/business-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allPlans,
        allStatuses,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return { success: json.success, message: json.message };
    }
  } catch (err: any) {
    console.error('Lỗi khi lưu tất cả kế hoạch vào SQLite DB:', err);
    return { success: false, message: err?.message };
  }

  return { success: true };
}
