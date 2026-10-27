import React from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { FinanceOverviewView } from '../departments/finance/FinanceOverviewView';

export interface FinanceOverviewPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
}

export const FinanceOverviewPage: React.FC<FinanceOverviewPageProps> = ({
  onShowToast,
  onNavigate,
}) => {
  return (
    <StandardPage
      title="Tổng quan Tài chính – Kế toán"
      description="Trung tâm điều hành dòng tiền, giám sát quỹ tiền mặt, ngân hàng, công nợ và lệnh chi tiền"
      icon="bi-speedometer2"
      color="blue"
      badge="ĐIỀU HÀNH DÒNG TIỀN"
      tickerContext="finance"
      cardPadding="p-0"
      useCard={true}
    >
      <FinanceOverviewView
        onShowToast={onShowToast}
        onNavigate={onNavigate}
      />
    </StandardPage>
  );
};

export default FinanceOverviewPage;
