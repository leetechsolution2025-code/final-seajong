import React, { useState } from 'react';
import { CashCoin, Building } from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { AssetManagementView } from '../departments/finance/AssetManagementView';
import type { ModernStepItem } from '../../types';

export interface FinanceAssetsPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

const ASSET_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'cash-assets',
    title: 'Vốn bằng tiền',
    desc: 'Quỹ tiền mặt & Ngân hàng',
    badge: 'TK 111 - 112',
    icon: <CashCoin size={16} />,
  },
  {
    num: 2,
    id: 'fixed-assets',
    title: 'Tài sản cố định',
    desc: 'Máy móc, nhà xưởng & Khấu hao',
    badge: 'TK 211 - 214',
    icon: <Building size={16} />,
  },
];

export const FinanceAssetsPage: React.FC<FinanceAssetsPageProps> = ({
  onShowToast,
  user,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <StepPage
      title="Quản lý tài sản & Vốn bằng tiền"
      description="Giám sát biến động quỹ tiền mặt, số dư tài khoản ngân hàng và quản lý danh mục tài sản cố định, trích khấu hao"
      icon="bi-wallet2"
      color="emerald"
      badge="TÀI SẢN & TIỀN TỆ"
      steps={ASSET_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      tickerContext="assets"
    >
      <AssetManagementView
        key={`asset-step-${currentStep}`}
        currentStep={currentStep}
        onShowToast={onShowToast}
      />
    </StepPage>
  );
};

export default FinanceAssetsPage;
