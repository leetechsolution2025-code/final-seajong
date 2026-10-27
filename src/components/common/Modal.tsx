import React, { useEffect, useState } from 'react';
import { X } from 'react-bootstrap-icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  headerIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  isStatic?: boolean;
  zIndex?: number;
  isFullscreen?: boolean;
  padding?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  headerIcon,
  headerActions,
  children,
  footer,
  maxWidth = '520px',
  isStatic = false,
  zIndex = 1100,
  isFullscreen = false,
  padding,
}) => {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStatic) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 200);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isStatic]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (isStatic) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);
    } else {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: isFullscreen ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isFullscreen ? 0 : '16px',
        backgroundColor: isFullscreen ? 'var(--bg-surface-1, #ffffff)' : 'rgba(0, 0, 0, 0.65)',
        backdropFilter: isFullscreen ? undefined : 'blur(8px)',
        WebkitBackdropFilter: isFullscreen ? undefined : 'blur(8px)',
        animation: 'fade-in 0.2s ease-out',
      }}
      onClick={handleBackdropClick}
    >
      <div
        className={isFullscreen ? '' : 'card-glass'}
        style={{
          width: isFullscreen ? '100vw' : '100%',
          maxWidth: isFullscreen ? '100vw' : maxWidth,
          height: isFullscreen ? '100vh' : undefined,
          borderRadius: isFullscreen ? 0 : '16px',
          padding: padding ? padding : (isFullscreen ? '8px' : '24px'),
          boxShadow: isFullscreen ? 'none' : 'var(--shadow-lg), var(--shadow-glow)',
          border: isFullscreen ? 'none' : '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          gap: isFullscreen ? '8px' : '16px',
          maxHeight: isFullscreen ? '100vh' : '90vh',
          overflowY: isFullscreen ? 'hidden' : 'auto',
          backgroundColor: 'var(--bg-surface-1, #ffffff)',
          boxSizing: 'border-box',
          transform: isShaking ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.15s ease-in-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingBottom: isFullscreen ? '8px' : '14px',
            borderBottom: '1px solid var(--border-subtle, #e5e7eb)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isFullscreen ? '8px' : '12px' }}>
            {headerIcon && (
              <div
                style={{
                  width: isFullscreen ? '34px' : '42px',
                  height: isFullscreen ? '34px' : '42px',
                  borderRadius: isFullscreen ? '8px' : '12px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--color-primary, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {headerIcon}
              </div>
            )}
            <div>
              <h3 style={{ fontSize: isFullscreen ? '1.0625rem' : '1.1875rem', fontWeight: 700, margin: 0, lineHeight: 1.25, fontFamily: 'var(--font-display, inherit)', color: 'var(--text-primary)' }}>
                {title}
              </h3>
              {description && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: 0 }}>
                  {description}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {headerActions}
            <button
              onClick={onClose}
              style={{
                width: isFullscreen ? '30px' : '36px',
                height: isFullscreen ? '30px' : '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-2, #f3f4f6)',
                color: 'var(--text-secondary, #6b7280)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              aria-label="Đóng"
            >
              <X size={isFullscreen ? 18 : 20} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: isFullscreen ? '1 1 0%' : undefined,
            display: isFullscreen ? 'flex' : undefined,
            flexDirection: isFullscreen ? 'column' : undefined,
            minHeight: isFullscreen ? 0 : undefined,
            overflow: isFullscreen ? 'hidden' : undefined,
            overflowY: isFullscreen ? undefined : 'auto',
            marginTop: isFullscreen ? 0 : '8px',
            fontSize: '0.875rem',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              marginTop: isFullscreen ? 'auto' : '16px',
              paddingTop: isFullscreen ? '8px' : '16px',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
