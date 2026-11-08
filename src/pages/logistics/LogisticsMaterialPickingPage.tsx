import React, { useState } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { LogisticsMaterialPicking } from '@/components/logistics/material-picking/LogisticsMaterialPicking';
import type { ModernStepItem } from '@/types';
import { HourglassSplit, CheckCircleFill } from 'react-bootstrap-icons';

const MATERIAL_PICKING_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'processing',
    title: 'Đang thực hiện',
    mobileTitle: 'Đang làm',
    desc: 'Lệnh cấp phát vật tư đang chờ xuất kho',
    badge: 'ĐANG XỬ LÝ',
    icon: <HourglassSplit size={16} />,
  },
  {
    num: 2,
    id: 'completed',
    title: 'Đã hoàn thành',
    mobileTitle: 'Hoàn thành',
    desc: 'Lệnh cấp phát vật tư đã hoàn tất',
    badge: 'HOÀN TẤT',
    badgeVariant: 'success',
    icon: <CheckCircleFill size={16} />,
  },
];

export const LogisticsMaterialPickingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <StepPage
      className="logistics-mobile-page material-picking-mobile-page"
      title="Cấp phát vật tư"
      description="Nhặt linh kiện và cấp phát vật tư cho lệnh sản xuất."
      icon="bi-tools"
      color="amber"
      badge="VẬN HÀNH KHO"
      steps={MATERIAL_PICKING_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={true}
    >
      <LogisticsMaterialPicking currentStep={currentStep} onStepChange={setCurrentStep} />
    </StepPage>
  );
};

export default LogisticsMaterialPickingPage;
