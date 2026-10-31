import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';

export const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  );

  // Tự động thu gọn trên màn hình Điện thoại / iPad / Tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Đang khởi tạo Seajong ERP...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#f1f5f9] flex flex-col overflow-hidden">
      {/* ── TOPBAR FULL WIDTH TRÊN TOÀN MÀN HÌNH (100% Full Row) ── */}
      <Topbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* ── BODY NẰM DƯỚI TOPBAR (pt-16) ── */}
      <div className="pt-16 flex flex-1 w-full h-full min-h-0 overflow-hidden relative">
        {/* Lớp phủ mờ khi mở Sidebar trên màn hình di động (< 768px) */}
        {!collapsed && (
          <div
            className="fixed inset-0 top-16 bg-slate-900/40 z-30 md:hidden transition-opacity"
            onClick={() => setCollapsed(true)}
          />
        )}

        {/* Sidebar navigation fixed bên trái từ top-16 xuống đáy */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        {/* Main Content Area */}
        <main 
          className={`flex-1 w-full transition-all duration-300 min-w-0 flex flex-col h-full min-h-0 overflow-hidden ml-0 ${
            collapsed ? 'md:ml-18' : 'md:ml-64'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
