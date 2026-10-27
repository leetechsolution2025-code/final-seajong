import React from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { GeneralJournalView } from '../departments/finance/GeneralJournalView';

export interface FinanceJournalPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const FinanceJournalPage: React.FC<FinanceJournalPageProps> = ({ onShowToast }) => {
  return (
    <StandardPage
      title="Sổ nhật ký chung"
      description="Quản lý và ghi nhận toàn bộ các bút toán phát sinh trong kỳ theo mẫu số S03a-DN"
      icon="bi-journal-text"
      color="indigo"
      badge="MẪU S03a-DN"
      tickerContext="finance"
      cardPadding="p-0"
      useCard={true}
    >
      <GeneralJournalView onShowToast={onShowToast} />
    </StandardPage>
  );
};

export default FinanceJournalPage;
