import React, { useState } from 'react';
import { Receipt, Truck, Bank, PieChart } from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { DebtCostManagementView } from '../departments/finance/DebtCostManagementView';
import type { ModernStepItem } from '../../types';
import type { TickerItem } from '../../components/layout/DynamicTicker';

export interface FinanceDebtsPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

const DEBT_COST_TICKER_ITEMS: TickerItem[] = [
  {
    badge: 'CÔNG NỢ PHẢI THU',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    text: 'Theo dõi hạn mức công nợ khách hàng & đại lý (TK 131), kiểm soát chặt chẽ đối soát định kỳ và thu hồi nợ đúng hạn',
  },
  {
    badge: 'CÔNG NỢ PHẢI TRẢ',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'Quản lý lịch thanh toán nhà cung cấp & đối tác vận tải (TK 331), duy trì uy tín tín dụng doanh nghiệp AAA',
  },
  {
    badge: 'VAY VỐN NGÂN HÀNG',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'Kiểm soát hạn mức tín dụng & khế ước nhận nợ (TK 341), chủ động kế hoạch trả nợ gốc và chi phí lãi vay hàng tháng',
  },
  {
    badge: 'ĐỊNH MỨC CHI PHÍ',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'Giám sát 4 nhóm chi phí vận hành (TK 62-64), đảm bảo tỷ lệ chi phí trên doanh thu duy trì ở ngưỡng an toàn tối ưu',
  },
];

const DEBT_COST_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'receivable',
    title: 'Công nợ phải thu',
    mobileTitle: 'Phải thu',
    desc: 'Khách hàng & Đại lý',
    badge: 'TK 131',
    icon: <Receipt size={16} />,
  },
  {
    num: 2,
    id: 'payable',
    title: 'Công nợ phải trả',
    mobileTitle: 'Phải trả',
    desc: 'Nhà cung cấp & Thầu phụ',
    badge: 'TK 331',
    icon: <Truck size={16} />,
  },
  {
    num: 3,
    id: 'loan',
    title: 'Vay vốn ngân hàng',
    mobileTitle: 'Vay vốn',
    desc: 'Hạn mức & Tín dụng',
    badge: 'TK 341',
    icon: <Bank size={16} />,
  },
  {
    num: 4,
    id: 'expense',
    title: 'Quản lý chi phí',
    mobileTitle: 'Chi phí',
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
  const [tickerNews, setTickerNews] = useState<TickerItem[]>(DEBT_COST_TICKER_ITEMS);

  return (
    <div className="finance-debts-page h-full">
      <StepPage
        title="Quản lý công nợ và chi phí"
        description="Kiểm soát công nợ phải thu khách hàng, công nợ phải trả nhà cung cấp, nợ vay ngân hàng và 4 nhóm chi phí vận hành"
        icon="bi-credit-card"
        color="indigo"
        badge="CÔNG NỢ & CHI PHÍ"
        steps={DEBT_COST_STEPS}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        hideTicker={false}
        customTickerNews={tickerNews}
      >
        <DebtCostManagementView
          key={`debt-step-${currentStep}`}
          currentStep={currentStep}
          onShowToast={onShowToast}
          user={user}
          onUpdateTickerItems={setTickerNews}
        />
      </StepPage>
    </div>
  );
};

export default FinanceDebtsPage;
