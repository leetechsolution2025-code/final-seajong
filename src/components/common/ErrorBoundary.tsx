import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary bắt được lỗi:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleClearCacheAndReload = () => {
    try {
      sessionStorage.clear();
      // Giữ lại token và user để không bị đăng xuất nếu không cần thiết
      const token = localStorage.getItem('seajong_token');
      const user = localStorage.getItem('seajong_user');
      localStorage.clear();
      if (token) localStorage.setItem('seajong_token', token);
      if (user) localStorage.setItem('seajong_user', user);
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0">
                <i className="bi bi-exclamation-triangle-fill text-2xl" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 m-0">Đã xảy ra sự cố hiển thị</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Hệ thống Seajong đã ngăn chặn màn hình trắng và ghi nhận lỗi bên dưới
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 max-h-60 overflow-y-auto font-mono text-xs text-rose-700 whitespace-pre-wrap select-all">
              {this.state.error?.message || 'Lỗi không xác định'}
              {this.state.error?.stack && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-300"
              >
                Xóa bộ nhớ đệm & Tải lại
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm"
              >
                <i className="bi bi-arrow-clockwise me-1.5" />
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

