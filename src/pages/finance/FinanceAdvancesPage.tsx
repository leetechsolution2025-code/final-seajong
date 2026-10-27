import React, { useState } from 'react';
import { CashStack, FileEarmarkCheck } from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { AdvancePaymentView } from '../departments/finance/AdvancePaymentView';
import { AdvanceSettlementView } from '../departments/finance/AdvanceSettlementView';
import type { ModernStepItem } from '../../types';

export interface FinanceAdvancesPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

const ADVANCE_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'advance-payment',
    title: 'Đề nghị tạm ứng',
    desc: 'Tiếp nhận & Xét duyệt',
    badge: 'TK 141',
    icon: <CashStack size={16} />,
  },
  {
    num: 2,
    id: 'refund-advance',
    title: 'Quyết toán hoàn ứng',
    desc: 'Hóa đơn & Đối soát chênh lệch',
    badge: 'TK 141 - 111',
    icon: <FileEarmarkCheck size={16} />,
  },
];

export const FinanceAdvancesPage: React.FC<FinanceAdvancesPageProps> = ({
  onShowToast,
  user,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <StepPage
      title="Quản lý tạm ứng & Hoàn ứng"
      description="Quy trình thẩm định tạm ứng chi phí công tác, mua sắm và quyết toán hóa đơn hoàn ứng của cán bộ công nhân viên"
      icon="bi-cash-coin"
      color="amber"
      badge="TẠM ỨNG & HOÀN ỨNG"
      steps={ADVANCE_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      tickerContext="advances"
    >
      {currentStep === 1 && (
        <AdvancePaymentView
          currentStep={currentStep}
          onShowToast={onShowToast}
          user={user}
        />
      )}
      {currentStep === 2 && (
        <AdvanceSettlementView
          onShowToast={onShowToast}
          user={user}
        />
      )}
    </StepPage>
  );
};

export default FinanceAdvancesPage;
