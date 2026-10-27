import React, { useState } from 'react';
import {
  CartCheck,
  ClipboardCheck,
  ArrowDownLeftCircle,
  ArrowUpRightCircle,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { CashflowTrackingView } from '../departments/finance/CashflowTrackingView';
import { CASHFLOW_TICKER_ITEMS } from '../../components/layout/DynamicTicker';
import type { ModernStepItem } from '../../types';

export interface FinanceCashflowPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

const CASHFLOW_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'orders',
    title: 'Duyệt đơn hàng',
    desc: 'Đơn hàng & hợp đồng bán lẻ',
    badge: 'BÁN HÀNG',
    icon: <CartCheck size={16} />,
  },
  {
    num: 2,
    id: 'requests',
    title: 'Duyệt yêu cầu',
    desc: 'Tờ trình, chi phí & tạm ứng',
    badge: 'ĐỀ XUẤT',
    icon: <ClipboardCheck size={16} />,
  },
  {
    num: 3,
    id: 'inflow',
    title: 'Dòng vào',
    desc: 'Thu nợ & dòng tiền thu',
    badge: 'TK 111/112',
    icon: <ArrowDownLeftCircle size={16} />,
  },
  {
    num: 4,
    id: 'outflow',
    title: 'Dòng ra',
    desc: 'Lệnh chi tiền & xuất quỹ',
    badge: 'TK 111/112',
    icon: <ArrowUpRightCircle size={16} />,
  },
];

export const FinanceCashflowPage: React.FC<FinanceCashflowPageProps> = ({
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <StepPage
      title="Theo dõi dòng tiền"
      description="Giám sát điều hành chu chuyển dòng tiền vào – ra, phê duyệt đơn hàng, kiểm soát giải ngân lệnh chi và thu hồi công nợ thời gian thực"
      icon="bi-cash-coin"
      color="emerald"
      badge="DÒNG TIỀN DOANH NGHIỆP"
      steps={CASHFLOW_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      tickerContext="cashflow"
      customTickerNews={CASHFLOW_TICKER_ITEMS}
    >
      <CashflowTrackingView
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        onShowToast={onShowToast}
      />
    </StepPage>
  );
};

export default FinanceCashflowPage;
