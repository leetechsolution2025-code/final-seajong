import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileEarmarkText } from 'react-bootstrap-icons';
import { Button, type ButtonVariant } from './Button';

function extractTitleAndIcon(
  title: React.ReactNode,
  explicitIcon?: React.ReactNode
): { finalIcon: React.ReactNode; finalTitle: React.ReactNode } {
  if (explicitIcon !== undefined) {
    return { finalIcon: explicitIcon, finalTitle: title };
  }

  if (React.isValidElement(title)) {
    const props = (title.props as any) || {};
    const children = React.Children.toArray(props.children);

    if (children.length >= 2) {
      const firstChild = children[0];
      if (React.isValidElement(firstChild)) {
        let clonedIcon = firstChild;
        try {
          clonedIcon = React.cloneElement(firstChild as React.ReactElement<any>, {
            size: 22,
          });
        } catch {
          // fallback
        }

        const remaining = children.slice(1);
        const finalTitle = remaining.length === 1 ? remaining[0] : <>{remaining}</>;
        return { finalIcon: clonedIcon, finalTitle };
      }
    }
  }

  return {
    finalIcon: <FileEarmarkText size={22} />,
    finalTitle: title,
  };
}

export interface OffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  subHeader?: React.ReactNode;
  width?: string;
  position?: 'right' | 'left';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  bodyStyle?: React.CSSProperties;
  bodyClassName?: string;
  className?: string;
  slidePanel?: React.ReactNode;
  hasBackdrop?: boolean;
  zIndex?: number;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmVariant?: ButtonVariant;
  isSubmitting?: boolean;
  confirmDisabled?: boolean;
  confirmForm?: string;
  footerLeft?: React.ReactNode;
}

export const Offcanvas: React.FC<OffcanvasProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  subHeader,
  width = '400px',
  position = 'right',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  hasBackdrop = true,
  bodyStyle,
  bodyClassName = '',
  className = '',
  slidePanel,
  zIndex = 1400,
  confirmText,
  cancelText = 'Hủy bỏ',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  isSubmitting = false,
  confirmDisabled = false,
  confirmForm,
  footerLeft,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose();
    };

    if (isOpen) {
      if (hasBackdrop) {
        document.body.style.overflow = 'hidden';
      }
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (hasBackdrop) {
        document.body.style.overflow = 'unset';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape, hasBackdrop]);

  if (!isOpen) return null;

  const { finalIcon, finalTitle } = extractTitleAndIcon(title, icon);

  const effectiveFooter =
    footer !== undefined ? (
      footer
    ) : confirmText || onConfirm || confirmForm || footerLeft ? (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: footerLeft ? 'space-between' : 'flex-end',
          gap: '8px',
          width: '100%',
        }}
      >
        {footerLeft ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>{footerLeft}</div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel || onClose}
            disabled={isSubmitting}
          >
            {cancelText}
          </Button>
          <Button
            type={confirmForm ? 'submit' : 'button'}
            form={confirmForm}
            variant={confirmVariant}
            size="sm"
            isLoading={isSubmitting}
            disabled={confirmDisabled || isSubmitting}
            onClick={!confirmForm ? onConfirm : undefined}
          >
            {confirmText || 'Xác nhận'}
          </Button>
        </div>
      </div>
    ) : null;

  const content = (
    <div
      className={`offcanvas-backdrop ${!hasBackdrop ? 'no-backdrop' : ''}`}
      onClick={closeOnBackdropClick && hasBackdrop ? onClose : undefined}
      style={{
        cursor: closeOnBackdropClick && hasBackdrop ? 'pointer' : 'default',
        zIndex,
        ...(!hasBackdrop
          ? {
              backgroundColor: 'transparent',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              pointerEvents: 'none',
            }
          : {}),
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`offcanvas-panel ${position === 'left' ? 'position-left' : ''} ${className}`}
        style={{
          width: width || '400px',
          maxWidth: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          cursor: 'default',
          zIndex: zIndex + 1,
          pointerEvents: 'auto',
          boxShadow: !hasBackdrop ? '-6px 0 25px rgba(0,0,0,0.18)' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="offcanvas-header">
          <div className="offcanvas-header-content">
            {finalIcon ? (
              <div className="offcanvas-header-icon" aria-hidden="true">
                {finalIcon}
              </div>
            ) : null}
            <div className="offcanvas-header-text">
              <h3 className="offcanvas-title">{finalTitle}</h3>
              {description && <p className="offcanvas-description">{description}</p>}
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="offcanvas-close-btn"
              aria-label="Đóng bảng trượt"
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* SubHeader */}
        {subHeader && <div className="offcanvas-subheader border-b border-slate-200">{subHeader}</div>}

        {/* Body */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className={`offcanvas-body ${bodyClassName}`} style={bodyStyle}>
            {children}
          </div>
          {slidePanel}
        </div>

        {/* Footer */}
        {effectiveFooter && <div className="offcanvas-footer">{effectiveFooter}</div>}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default Offcanvas;
