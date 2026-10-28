import React from 'react';
import { StandardPage } from '@/components/layout/StandardPage';
import { LogisticsBatchPacking } from '@/components/logistics/batch-packing/LogisticsBatchPacking';

export const LogisticsBatchPackingPage: React.FC = () => {
  return (
    <StandardPage
      title="Gom hàng và dán nhãn"
      description="Gom đơn soạn hàng loạt, đóng gói và in tem dán nhãn vận chuyển."
      icon="bi-box-seam-fill"
      color="blue"
      badge="VẬN HÀNH KHO"
      hideTicker={true}
    >
      <LogisticsBatchPacking />
    </StandardPage>
  );
};

export default LogisticsBatchPackingPage;
