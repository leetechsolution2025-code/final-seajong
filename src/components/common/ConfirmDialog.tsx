import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ExclamationTriangle,
  Trash,
  InfoCircle,
  CheckCircle,
  ExclamationCircle,
  X,
  ArrowRepeat,
} from 'react-bootstrap-icons';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'primary' | 'success';

export interface ConfirmDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title?: React.ReactNode;
  message?: React.ReactNode;
  warningNote?: React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  type?: ConfirmDialogVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
  loading?: boolean;
  zIndex?: number;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  itemCount?: number;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  open,
  onClose,
  onCancel,
  onConfirm,
  title = 'Xác nhận hành động',
  message,
  warningNote,
  confirmText = 'Xác nhận',
  confirmLabel,
  cancelText = 'Hủy bỏ',
  cancelLabel,
  variant,
  type,
  icon,
  isLoading = false,
  loading,
  zIndex = 1600,
  closeOnBackdropClick = false,
  closeOnEscape = true,
}) => {
  const isDialogVisible = open !== undefined ? open : (isOpen ?? false);
  const handleClose = onCancel || onClose || (() => {});
  const resolvedConfirmText = confirmLabel || confirmText;
  const resolvedCancelText = cancelLabel || cancelText;
  const resolvedLoading = loading !== undefined ? loading : isLoading;

  // Đóng khi nhấn phím Escape
  useEffect(() => {
    if (!isDialogVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && !resolvedLoading) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDialogVisible, closeOnEscape, resolvedLoading, handleClose]);

  // Ngăn cuộn trang phía sau khi dialog hiển thị
  useEffect(() => {
    if (!isDialogVisible) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDialogVisible]);

  if (!isDialogVisible) return null;

  // Cấu hình style và icon theo từng variant
  const activeVariant = variant || type || 'danger';
  const getVariantStyles = () => {
    switch (activeVariant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-50 border-rose-200/70 text-rose-600',
          defaultIcon: <Trash size={22} className="shrink-0" />,
          confirmBtn:
            'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus:ring-rose-500/30 shadow-sm shadow-rose-600/25',
          warningBox: 'bg-rose-50/80 border-rose-200/80 text-rose-800',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 border-amber-200/70 text-amber-600',
          defaultIcon: <ExclamationTriangle size={22} className="shrink-0" />,
          confirmBtn:
            'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white focus:ring-amber-500/30 shadow-sm shadow-amber-600/25',
          warningBox: 'bg-amber-50/80 border-amber-200/80 text-amber-800',
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-50 border-emerald-200/70 text-emerald-600',
          defaultIcon: <CheckCircle size={22} className="shrink-0" />,
          confirmBtn:
            'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white focus:ring-emerald-500/30 shadow-sm shadow-emerald-600/25',
          warningBox: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-800',
        };
      case 'info':
      case 'primary':
      default:
        return {
          iconBg: 'bg-sky-50 border-sky-200/70 text-sky-600',
          defaultIcon: <InfoCircle size={22} className="shrink-0" />,
          confirmBtn:
            'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white focus:ring-sky-500/30 shadow-sm shadow-sky-600/25',
          warningBox: 'bg-sky-50/80 border-sky-200/80 text-sky-800',
        };
    }
  };

  const vStyles = getVariantStyles();

  const handleConfirmClick = async () => {
    if (isLoading) return;
    await onConfirm();
  };

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.18s ease-out',
      }}
      onClick={closeOnBackdropClick && !isLoading ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          animation: 'modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với nút đóng */}
        <div className="relative pt-6 px-6 pb-2 flex items-start gap-3.5">
          {/* Badge Icon */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${vStyles.iconBg}`}
            style={{
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            {icon || vStyles.defaultIcon}
          </div>

          <div className="flex-1 pr-6 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-900 leading-snug"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              {title}
            </h3>
            {message && (
              <div
                className="mt-1 text-xs sm:text-[13px] text-slate-600 leading-relaxed"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                {message}
              </div>
            )}
          </div>

          {/* Close button X */}
          <button
            type="button"
            onClick={handleClose}
            disabled={resolvedLoading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Đóng hộp thoại"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning note callout nếu có */}
        {warningNote && (
          <div className="px-6 pt-1 pb-3">
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 leading-relaxed ${vStyles.warningBox}`}
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              <ExclamationCircle size={15} className="shrink-0 mt-0.5" />
              <span>{warningNote}</span>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={resolvedLoading}
            className="px-4 py-2 text-xs sm:text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 rounded-lg transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            {resolvedCancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={resolvedLoading}
            className={`px-4 py-2 text-xs sm:text-[13px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 focus:outline-hidden focus:ring-2 disabled:opacity-50 ${vStyles.confirmBtn}`}
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            {resolvedLoading ? (
              <>
                <ArrowRepeat size={14} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default ConfirmDialog;
