import React from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { FinancialReportsView } from '../departments/finance/FinancialReportsView';

export interface FinanceReportsPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const FinanceReportsPage: React.FC<FinanceReportsPageProps> = ({ onShowToast }) => {
  return (
    <StandardPage
      title="Báo cáo tài chính & Kết quả kinh doanh"
      description="Hệ thống báo cáo tài chính tổng hợp theo chuẩn mực kế toán Việt Nam Thông tư 200/2014/TT-BTC"
      icon="bi-file-earmark-bar-graph"
      color="blue"
      badge="CHUẨN TT200"
      tickerContext="finance"
      cardPadding="p-0"
      useCard={true}
    >
      <FinancialReportsView onShowToast={onShowToast} />
    </StandardPage>
  );
};

export default FinanceReportsPage;
