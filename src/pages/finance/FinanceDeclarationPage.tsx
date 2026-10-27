import React from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { FinancialDataDeclarationView } from '../departments/finance/FinancialDataDeclarationView';

export interface FinanceDeclarationPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const FinanceDeclarationPage: React.FC<FinanceDeclarationPageProps> = ({ onShowToast }) => {
  return (
    <StandardPage
      title="Khai báo số dư đầu kỳ"
      description="Thiết lập số dư ban đầu cho các tài khoản tiền tệ, công nợ, kho hàng và tài sản cố định"
      icon="bi-database-check"
      color="emerald"
      badge="SỐ DƯ ĐẦU KỲ"
      tickerContext="finance"
      cardPadding="p-0"
      useCard={true}
    >
      <FinancialDataDeclarationView onShowToast={onShowToast} />
    </StandardPage>
  );
};

export default FinanceDeclarationPage;
