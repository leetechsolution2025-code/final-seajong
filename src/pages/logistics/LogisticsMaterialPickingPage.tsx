import React from 'react';
import { StandardPage } from '@/components/layout/StandardPage';
import { LogisticsMaterialPicking } from '@/components/logistics/material-picking/LogisticsMaterialPicking';

export const LogisticsMaterialPickingPage: React.FC = () => {
  return (
    <StandardPage
      title="Cấp phát vật tư"
      description="Nhặt linh kiện và cấp phát vật tư cho lệnh sản xuất."
      icon="bi-tools"
      color="amber"
      badge="VẬN HÀNH KHO"
      hideTicker={true}
    >
      <LogisticsMaterialPicking />
    </StandardPage>
  );
};

export default LogisticsMaterialPickingPage;
