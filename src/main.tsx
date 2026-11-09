import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import App from './App';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

import { ToastProvider } from './components/ui/Toast';

// Trên điện thoại (đặc biệt là iPhone/iOS Safari): khi focus vào ô nhập liệu có thể tự động zoom lớn lên,
// và khi nhập xong (nhấn nút "Xong" / blur) sẽ tự động thu phóng vừa vặn lại màn hình (scale = 1.0).
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener(
    'focusout',
    (e) => {
      if (window.innerWidth > 768) return;
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT')
      ) {
        return;
      }
      setTimeout(() => {
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')
        ) {
          return;
        }
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover'
          );
          window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' as ScrollBehavior });
          setTimeout(() => {
            viewportMeta.setAttribute(
              'content',
              'width=device-width, initial-scale=1.0, viewport-fit=cover'
            );
          }, 350);
        }
      }, 60);
    },
    true
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <DepartmentProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </DepartmentProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
