import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    loginType?: 'staff' | 'dealer' | 'customer'
  ) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const sessionToken = sessionStorage.getItem('seajong_token');
      const localToken = localStorage.getItem('seajong_token');
      const token = sessionToken || localToken;
      if (!sessionToken && localToken) {
        sessionStorage.setItem('seajong_token', localToken);
      }
      const res = await fetch('/api/auth/me', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const savedAudience =
            sessionStorage.getItem('seajong_login_audience') ||
            localStorage.getItem('seajong_login_audience');
          const resolvedUser = { ...data.user };
          if (savedAudience === 'customer' && (resolvedUser.customer || resolvedUser.role === 'DEALER')) {
            resolvedUser.role = 'CUSTOMER';
            resolvedUser.departmentCode = 'customer';
            resolvedUser.deptAccess = ['customer'];
          } else if (savedAudience === 'dealer' && (resolvedUser.customer || resolvedUser.role === 'CUSTOMER')) {
            resolvedUser.role = 'DEALER';
            resolvedUser.departmentCode = 'dealer';
            resolvedUser.deptAccess = ['dealer'];
          }
          setUser(resolvedUser);
          return;
        }
      }
      setUser(null);
    } catch (err) {
      console.error('Lỗi kiểm tra session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (
    email: string,
    password: string,
    loginType?: 'staff' | 'dealer' | 'customer'
  ) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, loginType }),
      });

      const rawText = await res.text();
      let data: any = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!data) {
        return {
          success: false,
          message: 'Máy chủ phản hồi không hợp lệ hoặc đang khởi động lại. Vui lòng thử lại.',
        };
      }

      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Thông tin đăng nhập không chính xác. Vui lòng thử lại.',
        };
      }

      if (data.token) {
        sessionStorage.setItem('seajong_token', data.token);
        if (loginType !== 'customer' || !localStorage.getItem('seajong_token')) {
          localStorage.setItem('seajong_token', data.token);
        }
      }
      if (loginType) {
        sessionStorage.setItem('seajong_login_audience', loginType);
        if (loginType !== 'customer' || !localStorage.getItem('seajong_login_audience')) {
          localStorage.setItem('seajong_login_audience', loginType);
        }
      }

      const resolvedUser = { ...data.user };
      if (loginType === 'customer' && (resolvedUser.customer || resolvedUser.role === 'DEALER')) {
        resolvedUser.role = 'CUSTOMER';
        resolvedUser.departmentCode = 'customer';
        resolvedUser.deptAccess = ['customer'];
      } else if (loginType === 'dealer' && (resolvedUser.customer || resolvedUser.role === 'CUSTOMER')) {
        resolvedUser.role = 'DEALER';
        resolvedUser.departmentCode = 'dealer';
        resolvedUser.deptAccess = ['dealer'];
      }

      setUser(resolvedUser);
      return { success: true, user: resolvedUser };
    } catch {
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      sessionStorage.removeItem('seajong_token');
      sessionStorage.removeItem('seajong_login_audience');
      localStorage.removeItem('seajong_token');
      localStorage.removeItem('seajong_active_dept');
      localStorage.removeItem('seajong_user_id');
      localStorage.removeItem('seajong_login_audience');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
