/**
 * Dịch vụ quản lý thông tin doanh nghiệp (Company Information Service)
 * Đảm bảo thông tin doanh nghiệp (Deco Door) luôn được lưu trữ bền vững (persistent):
 * 1. Khởi tạo tức thì từ localStorage hoặc giá trị mặc định của Deco Door (không bao giờ bị null / trắng).
 * 2. Tự động đồng bộ với SQLite Backend (/api/company).
 * 3. Đồng bộ hóa tức thì giữa tất cả components qua CustomEvent và storage event.
 */

export interface CompanyInfo {
  id?: number;
  company_name: string;
  short_name: string;
  tax_code: string;
  slogan: string;
  legal_rep: string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  domain: string;
  logo_url: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  company_name: 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM',
  short_name: 'SEAJONG',
  tax_code: '0109999999',
  slogan: 'Kinh doanh thiết bị phòng tắm, nhà bếp - Tiên phong kiến tạo giá trị thực',
  legal_rep: 'Lê Công Vụ',
  industry: 'Kinh doanh thiết bị vệ sinh, sen vòi cao cấp',
  address: 'Hà Nội, Việt Nam',
  phone: '0988 888 888',
  email: 'info@seajong.vn',
  website: 'https://seajong.vn',
  domain: 'seajong.vn',
  logo_url: '/logo.png',
};

const STORAGE_KEY = 'seajong_company_info';

/**
 * Đọc thông tin doanh nghiệp đã lưu trong LocalStorage (hoặc lấy mặc định nếu chưa lưu)
 */
export const getStoredCompanyInfo = (): CompanyInfo => {
  if (typeof window === 'undefined') return DEFAULT_COMPANY_INFO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.company_name || parsed.short_name)) {
        return {
          ...DEFAULT_COMPANY_INFO,
          ...parsed,
          logo_url: parsed.logo_url || DEFAULT_COMPANY_INFO.logo_url,
        };
      }
    }
  } catch (e) {
    console.error('Lỗi khi đọc thông tin doanh nghiệp từ storage:', e);
  }
  return DEFAULT_COMPANY_INFO;
};

/**
 * Lưu thông tin doanh nghiệp vào LocalStorage và thông báo cho toàn bộ ứng dụng
 */
export const saveStoredCompanyInfo = (info: CompanyInfo): void => {
  if (typeof window === 'undefined') return;
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const newRaw = JSON.stringify(info);
    if (currentRaw === newRaw) {
      return; // Không thay đổi, tránh phát event gây re-render vô hạn
    }
    localStorage.setItem(STORAGE_KEY, newRaw);
    // Bắn event để tất cả component trên cùng trang cập nhật ngay lập tức
    window.dispatchEvent(new CustomEvent('company-info-updated', { detail: info }));
  } catch (e) {
    console.error('Lỗi khi lưu thông tin doanh nghiệp vào storage:', e);
  }
};

/**
 * Tải thông tin từ Backend Server (với fallback LocalStorage)
 */
export const fetchCompanyInfo = async (): Promise<CompanyInfo> => {
  const local = getStoredCompanyInfo();
  try {
    // Thử gọi proxy trước (/api/company), nếu không được thử trực tiếp localhost:3001
    const res = await fetch('/api/company')
      .catch(() => fetch('http://localhost:3001/api/company'));

    if (res && res.ok) {
      const data = await res.json();
      if (data && (data.company_name || data.short_name)) {
        const merged: CompanyInfo = {
          ...DEFAULT_COMPANY_INFO,
          company_name: data.company_name || local.company_name,
          short_name: data.short_name || local.short_name,
          tax_code: data.tax_code || local.tax_code,
          slogan: data.slogan !== undefined && data.slogan !== null ? data.slogan : local.slogan,
          legal_rep: data.legal_rep || local.legal_rep,
          industry: data.industry || local.industry,
          address: data.address || local.address,
          phone: data.phone || local.phone,
          email: data.email || local.email,
          website: data.website || local.website,
          domain: data.domain || local.domain,
          logo_url: data.logo_url || local.logo_url,
        };
        saveStoredCompanyInfo(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Backend server chưa phản hồi, sử dụng thông tin từ bộ nhớ cục bộ:', err);
  }
  return local;
};

/**
 * Lưu thông tin doanh nghiệp lên Backend Server và đồng bộ LocalStorage
 */
export const saveCompanyInfoToServer = async (
  formData: FormData,
  localUpdate: Partial<CompanyInfo>
): Promise<{ success: boolean; logoUrl?: string; message?: string }> => {
  // 1. Lưu ngay vào LocalStorage để đảm bảo không bao giờ bị mất
  const current = getStoredCompanyInfo();
  const updated: CompanyInfo = { ...current, ...localUpdate };
  saveStoredCompanyInfo(updated);

  // 2. Gửi lên Backend để lưu vào SQLite
  try {
    const res = await fetch('/api/company', {
      method: 'POST',
      body: formData,
    }).catch(() =>
      fetch('http://localhost:3001/api/company', {
        method: 'POST',
        body: formData,
      })
    );

    if (res && res.ok) {
      const result = await res.json();
      if (result.logoUrl) {
        updated.logo_url = result.logoUrl;
        saveStoredCompanyInfo(updated);
      }
      return { success: true, logoUrl: result.logoUrl, message: result.message };
    }
  } catch (err) {
    console.error('Lỗi khi gửi thông tin lên backend:', err);
  }

  return { success: true, message: 'Đã lưu vào bộ nhớ cục bộ hệ thống' };
};
