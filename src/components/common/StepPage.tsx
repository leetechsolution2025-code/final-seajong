import React from 'react';
import { PageTitle } from '../ui/PageTitle';
import { ModernStepper } from './ModernStepper';
import { DynamicTicker, type TickerItem } from '../layout/DynamicTicker';
import type { ModernStepItem } from '../../types';

export interface StepPageProps {
  /** Tiêu đề trang */
  title?: string;
  /** Mô tả phụ ngắn gọn */
  description?: string;
  /** Icon Bootstrap */
  icon?: string;
  /** Màu sắc accent */
  color?: 'rose' | 'indigo' | 'emerald' | 'amber' | 'blue' | 'violet' | 'cyan';
  badge?: string;
  /** Header tùy chỉnh (nếu muốn truyền trực tiếp PageTitle) */
  pageHeader?: React.ReactNode;
  /** Danh sách các bước */
  steps: ModernStepItem[];
  /** Bước hiện tại (1-based) */
  currentStep: number;
  /** Callback chuyển bước */
  onStepChange: (stepNum: number) => void;
  /** Thanh công cụ gắn liền dưới Stepper */
  stepperToolbar?: React.ReactNode;
  /** Nút hoặc tổ hợp tiện ích đặt cùng dòng bên phải với các bước Stepper */
  stepperExtraRight?: React.ReactNode;
  /** Nội dung bước hiện tại */
  children?: React.ReactNode;
  /** Màu nền khung ngoài, mặc định '#EBF0F5' */
  background?: string;
  /** ClassName bổ sung */
  className?: string;
  style?: React.CSSProperties;
  /** Ẩn Dynamic Ticker? Mặc định false */
  hideTicker?: boolean;
  /** Custom data cho Ticker */
  customTickerNews?: TickerItem[];
  /** Chỉ định context trực tiếp cho Ticker */
  tickerContext?: string;
}

export const StepPage: React.FC<StepPageProps> = ({
  title,
  description,
  icon = 'bi-grid',
  color = 'indigo',
  badge,
  pageHeader,
  steps,
  currentStep,
  onStepChange,
  stepperToolbar,
  stepperExtraRight,
  children,
  background = '#EBF0F5',
  className = '',
  style,
  hideTicker = false,
  customTickerNews,
  tickerContext,
}) => {
  return (
    <div
      className={`flex flex-col h-full flex-1 overflow-hidden is-step-page ${className}`}
      style={{
        background,
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        ...style,
      }}
    >
      {/* ── 1. PageTitle ở phía trên (khoảng đệm ngoài cố định 8px, TUYỆT ĐỐI KHÔNG CÓ NÚT) ── */}
      <div style={{ flexShrink: 0 }}>
        {pageHeader ? (
          pageHeader
        ) : title ? (
          <PageTitle
            title={title}
            description={description}
            icon={icon}
            color={color}
            badge={badge}
          />
        ) : null}

        {!hideTicker && (
          <DynamicTicker
            pageTitle={title}
            context={tickerContext}
            items={customTickerNews}
          />
        )}
      </div>

      {/* ── 2. Card chính bo góc rounded-xl, padding ngoài 8px chuẩn Enterprise Seajong ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          padding: 8,
          flex: '1 1 0%',
          minHeight: 0,
          height: '100%',
        }}
      >
        <div
          className="standard-page-card bg-white rounded-xl shadow-xs border border-slate-200/80 p-0 flex flex-col"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <ModernStepper
            steps={steps}
            currentStep={currentStep}
            onStepChange={onStepChange}
            toolbar={stepperToolbar}
            extraRight={stepperExtraRight}
            variant="card"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: 'none',
              borderRadius: 0,
              boxShadow: 'none',
            }}
          >
            {children}
          </ModernStepper>
        </div>
      </div>
    </div>
  );
};

export default StepPage;
