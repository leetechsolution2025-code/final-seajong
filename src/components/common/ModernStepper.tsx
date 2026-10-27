import React from 'react';
import { Lock } from 'react-bootstrap-icons';
import type { ModernStepItem } from '../../types';

export interface ModernStepperProps {
  steps: ModernStepItem[];
  currentStep: number;
  onStepChange: (stepNum: number) => void;
  /** Thanh công cụ gồm bộ lọc, tìm kiếm, nút bấm đặt ngay dưới stepper */
  toolbar?: React.ReactNode;
  /** Nút hoặc tổ hợp tiện ích đặt cùng dòng bên phải với các bước Stepper */
  extraRight?: React.ReactNode;
  /** Khoảng cách lề ngang (mặc định 20px) */
  paddingX?: string | number;
  /** Khoảng cách lề dọc (mặc định 12px) */
  paddingY?: string | number;
  /** Kiểu hiển thị: card (có khung), borderless (không khung nền), pills */
  variant?: 'card' | 'borderless' | 'pills';
  /** Nội dung tab con tương ứng với bước hiện tại */
  children?: React.ReactNode;
  /** Bổ sung lớp CSS */
  className?: string;
  style?: React.CSSProperties;
}

export const ModernStepper: React.FC<ModernStepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  toolbar,
  extraRight,
  paddingX = 16,
  paddingY = 10,
  variant = 'card',
  children,
  className = '',
  style,
}) => {
  const padX = typeof paddingX === 'number' ? `${paddingX}px` : paddingX;
  const padY = typeof paddingY === 'number' ? `${paddingY}px` : paddingY;

  return (
    <div
      className={`modern-stepper-wrapper ${variant === 'card' ? 'is-card' : ''} ${className}`}
      style={style}
    >
      {/* Header bar chứa các bước (Tabs) */}
      <div
        className="modern-stepper-container"
        style={{
          padding: `${padY} ${padX}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        role="tablist"
        aria-label="Quy trình thực hiện"
      >
        <div className="modern-stepper-inner" style={{ flex: 1, minWidth: 0 }}>
          {steps.map((s, idx) => {
            const isActive = currentStep === s.num;
            const isPast = currentStep > s.num;
            const isLocked = Boolean(s.locked);

            return (
              <React.Fragment key={s.id || s.num}>
                {/* Step button / tab item */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-disabled={isLocked}
                  className={`modern-step-item ${isActive ? 'is-active' : ''} ${
                    isPast ? 'is-past' : ''
                  } ${isLocked ? 'is-locked' : ''}`}
                  onClick={() => {
                    if (!isLocked) {
                      onStepChange(s.num);
                    }
                  }}
                  title={isLocked ? 'Bước này hiện đang bị khóa' : undefined}
                >
                  {/* Icon Box */}
                  <div
                    className="modern-step-icon"
                    style={{
                      ...(isActive ? { background: '#003087', color: '#ffffff' } : {}),
                      ...(isActive && s.color ? { background: s.color } : {}),
                    }}
                  >
                    {isLocked ? (
                      <Lock size={15} />
                    ) : React.isValidElement(s.icon) ? (
                      s.icon
                    ) : typeof s.icon === 'string' ? (
                      <i
                        className={`bi ${s.icon.startsWith('bi-') ? s.icon : `bi-${s.icon}`}`}
                        style={{ fontSize: 16 }}
                      />
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '0.8125rem' }}>{s.num}</span>
                    )}

                    {/* Dấu chấm thông báo cập nhật nhấp nháy */}
                    {s.hasNewData && !isLocked && (
                      <span className="modern-step-pulse-dot" />
                    )}
                  </div>

                  {/* Step Text Info */}
                  <div className="modern-step-text">
                    <div className="modern-step-title-row">
                      <span className="modern-step-title">{s.title}</span>
                      {(() => {
                        if (s.badge === undefined || s.badge === null || (s.badge as unknown) === false) return null;
                        if (typeof s.badge === 'number' && s.badge <= 0) return null;
                        if (typeof s.badge === 'string') {
                          const trimmed = s.badge.trim();
                          if (!trimmed || trimmed === '0' || trimmed === '()' || trimmed === '(0)') return null;
                        }
                        return (
                          <span
                            className={`modern-step-badge badge-${
                              s.badgeVariant || (isActive ? 'brand' : 'neutral')
                            }`}
                          >
                            {s.badge}
                          </span>
                        );
                      })()}
                    </div>
                    {s.desc && <span className="modern-step-desc">{s.desc}</span>}
                  </div>
                </button>

                {/* Đường nối giữa các bước (Connector divider) */}
                {idx < steps.length - 1 && (
                  <div
                    className={`modern-stepper-divider ${
                      currentStep > s.num ? 'is-completed' : ''
                    }`}
                  >
                    <div className="divider-line" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {extraRight && (
          <div className="modern-stepper-actions ml-4 shrink-0 flex items-center gap-2">
            {extraRight}
          </div>
        )}
      </div>

      {/* Thanh công cụ toolbar (Tìm kiếm, bộ lọc, nút bấm) */}
      {toolbar && <div className="modern-stepper-toolbar">{toolbar}</div>}

      {/* Nội dung tab tương ứng (nếu có truyền children) */}
      {children && <div className="modern-stepper-content">{children}</div>}
    </div>
  );
};

export default ModernStepper;
