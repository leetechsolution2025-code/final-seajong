import { useState, useEffect } from 'react';
import {
  type CompanyInfo,
  getStoredCompanyInfo,
  fetchCompanyInfo,
} from '../services/companyService';

/**
 * Custom React hook để lấy thông tin doanh nghiệp thời gian thực.
 * Tự động khởi tạo ngay từ LocalStorage, đồng bộ khi DB trả về,
 * và cập nhật tức thì khi có thay đổi trên bất kỳ trang nào.
 */
export const useCompanyInfo = (): CompanyInfo => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(getStoredCompanyInfo);

  useEffect(() => {
    // Lắng nghe sự kiện cập nhật từ cùng trang hoặc từ tab khác
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanyInfo>;
      if (customEvent.detail) {
        setCompanyInfo(customEvent.detail);
      } else {
        setCompanyInfo(getStoredCompanyInfo());
      }
    };

    window.addEventListener('company-info-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Kéo dữ liệu mới nhất từ server
    fetchCompanyInfo().then((latest) => {
      setCompanyInfo(latest);
    });

    return () => {
      window.removeEventListener('company-info-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return companyInfo;
};
