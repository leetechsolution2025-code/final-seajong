import React from 'react';
import { StandardPage } from '@/components/layout/StandardPage';
import { LogisticsInbound } from '@/components/logistics/inbound/LogisticsInbound';

export const LogisticsInboundPage: React.FC = () => {
  return (
    <StandardPage
      title="Nhập, xuất và kiểm kho"
      description="Quản lý nhập kho, xuất kho và kiểm tra đối soát tồn kho thực tế."
      icon="bi-arrow-down-left-square"
      color="blue"
      badge="VẬN HÀNH KHO"
      hideTicker={true}
    >
      <LogisticsInbound />
    </StandardPage>
  );
};

export default LogisticsInboundPage;
