import React, { useState } from 'react';
import { Receipt, Truck, Bank, PieChart } from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { DebtCostManagementView } from '../departments/finance/DebtCostManagementView';
import type { ModernStepItem } from '../../types';

export interface FinanceDebtsPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

const DEBT_COST_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'receivable',
    title: 'Công nợ phải thu',
    desc: 'Khách hàng & Đại lý',
    badge: 'TK 131',
    icon: <Receipt size={16} />,
  },
  {
    num: 2,
    id: 'payable',
    title: 'Công nợ phải trả',
    desc: 'Nhà cung cấp & Thầu phụ',
    badge: 'TK 331',
    icon: <Truck size={16} />,
  },
  {
    num: 3,
    id: 'loan',
    title: 'Vay vốn ngân hàng',
    desc: 'Hạn mức & Tín dụng',
    badge: 'TK 341',
    icon: <Bank size={16} />,
  },
  {
    num: 4,
    id: 'expense',
    title: 'Quản lý chi phí',
    desc: '4 nhóm định mức chi',
    badge: 'TK 62-64',
    icon: <PieChart size={16} />,
  },
];

export const FinanceDebtsPage: React.FC<FinanceDebtsPageProps> = ({
  onShowToast,
  user,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <StepPage
      title="Quản lý công nợ và chi phí"
      description="Kiểm soát công nợ phải thu khách hàng, công nợ phải trả nhà cung cấp, nợ vay ngân hàng và 4 nhóm chi phí vận hành"
      icon="bi-credit-card"
      color="indigo"
      badge="CÔNG NỢ & CHI PHÍ"
      steps={DEBT_COST_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      tickerContext="debts"
    >
      <DebtCostManagementView
        key={`debt-step-${currentStep}`}
        currentStep={currentStep}
        onShowToast={onShowToast}
        user={user}
      />
    </StepPage>
  );
};

export default FinanceDebtsPage;
