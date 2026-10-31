import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import type { User } from '../types';
import { canAccessDepartment, getDefaultAllowedDepartment } from '../lib/permissions';

export interface DepartmentContextType {
  activeDeptCode: string;
  setActiveDeptCode: (code: string) => void;
  activeMenuKey: string;
  setActiveMenuKey: (key: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToUserDept: (targetUser?: User | null) => void;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);

  // Đọc phòng ban khởi tạo từ user hoặc localStorage hoặc mặc định là 'board'
  const [activeDeptCode, setActiveDeptCodeState] = useState<string>(() => {
    const saved = localStorage.getItem('seajong_active_dept');
    if (saved) return saved.toLowerCase();
    return user?.employee?.departmentCode?.toLowerCase() || 'board';
  });

  const [activeMenuKey, setActiveMenuKey] = useState<string>('overview');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Hàm chuyển ngay lập tức đến đúng phòng ban của nhân viên/user đăng nhập
  const navigateToUserDept = (targetUser?: User | null) => {
    const u = targetUser || user;
    if (!u) return;

    const targetDept = getDefaultAllowedDepartment(u);

    setActiveDeptCodeState(targetDept);
    setActiveMenuKey('overview');
    setActiveTab('overview');
    localStorage.setItem('seajong_active_dept', targetDept);
    if (u.id) {
      localStorage.setItem('seajong_user_id', u.id);
    }

    // Rút gọn địa chỉ URL ngay lập tức về root '/'
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  // Tự động đồng bộ và điều hướng đến đúng phòng ban khi tài khoản đăng nhập mới hoặc chuyển đổi tài khoản
  useEffect(() => {
    if (!user) {
      lastUserIdRef.current = null;
      return;
    }

    const currentUserId = user.id;
    const storedUserId = localStorage.getItem('seajong_user_id');
    const isNewLogin = !lastUserIdRef.current && (!storedUserId || storedUserId !== currentUserId);
    const isSwitchedUser = Boolean(lastUserIdRef.current && lastUserIdRef.current !== currentUserId);

    if (user.role === 'DEALER') {
      setActiveDeptCodeState('dealer');
      localStorage.setItem('seajong_active_dept', 'dealer');
    } else if (isNewLogin || isSwitchedUser) {
      // Khi phát hiện tài khoản đăng nhập mới hoặc tài khoản khác với tài khoản lưu trước đó:
      // Luôn điều hướng ngay lập tức về phòng ban của chính người dùng đó!
      navigateToUserDept(user);
    } else {
      // Cùng tài khoản (người dùng F5 hoặc reload trang):
      // Ưu tiên phòng ban đang truy cập được lưu trong localStorage nếu có quyền truy cập
      const saved = localStorage.getItem('seajong_active_dept');
      if (saved && canAccessDepartment(user, saved)) {
        setActiveDeptCodeState(saved.toLowerCase());
      } else {
        navigateToUserDept(user);
      }
    }

    lastUserIdRef.current = currentUserId;
  }, [user]);

  // Đảm bảo URL trình duyệt luôn rút gọn sạch ở '/' (không lộ /hr, /board...)
  useEffect(() => {
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/');
    }
  }, [activeDeptCode]);

  const setActiveDeptCode = (code: string) => {
    if (user?.role === 'DEALER' && code !== 'dealer') {
      return; // Cấm đại lý chuyển sang phòng ban nội bộ khác
    }
    const cleanCode = code.toLowerCase().trim();
    if (user && !canAccessDepartment(user, cleanCode)) {
      return; // Chặn chuyển sang phòng ban chưa được cấp quyền truy cập
    }
    setActiveDeptCodeState(cleanCode);
    localStorage.setItem('seajong_active_dept', cleanCode);
    setActiveMenuKey('overview');
    setActiveTab('overview');

    // Rút gọn địa chỉ URL ngay lập tức về root '/'
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  return (
    <DepartmentContext.Provider
      value={{
        activeDeptCode,
        setActiveDeptCode,
        activeMenuKey,
        setActiveMenuKey,
        activeTab,
        setActiveTab,
        navigateToUserDept,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
};

export default DepartmentContext;
