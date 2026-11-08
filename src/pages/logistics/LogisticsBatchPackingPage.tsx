import React, { useState } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { LogisticsBatchPacking } from '@/components/logistics/batch-packing/LogisticsBatchPacking';
import type { ModernStepItem } from '@/types';
import { HourglassSplit, CheckCircleFill } from 'react-bootstrap-icons';

const BATCH_PACKING_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'processing',
    title: 'Đang thực hiện',
    mobileTitle: 'Đang làm',
    desc: 'Đơn gom hàng & dán nhãn đang chờ xuất kho',
    badge: 'ĐANG XỬ LÝ',
    icon: <HourglassSplit size={16} />,
  },
  {
    num: 2,
    id: 'completed',
    title: 'Đã hoàn thành',
    mobileTitle: 'Hoàn thành',
    desc: 'Đơn gom hàng & dán nhãn đã hoàn tất',
    badge: 'HOÀN TẤT',
    badgeVariant: 'success',
    icon: <CheckCircleFill size={16} />,
  },
];

export const LogisticsBatchPackingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <StepPage
      className="logistics-mobile-page material-picking-mobile-page"
      title="Gom hàng và dán nhãn"
      description="Gom đơn soạn hàng loạt, đóng gói và in tem dán nhãn vận chuyển."
      icon="bi-box-seam-fill"
      color="blue"
      badge="VẬN HÀNH KHO"
      steps={BATCH_PACKING_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={true}
    >
      <LogisticsBatchPacking currentStep={currentStep} onStepChange={setCurrentStep} />
    </StepPage>
  );
};

export default LogisticsBatchPackingPage;
