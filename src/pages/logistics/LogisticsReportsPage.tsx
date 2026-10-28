import React, { useState } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { LogisticsReports } from '@/components/logistics/reports/LogisticsReports';
import type { ModernStepItem } from '@/types';

export const LogisticsReportsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'xnt',
      title: 'Xuất-nhập-tồn',
      desc: 'Báo cáo tổng hợp luân chuyển và giá trị tồn kho',
      icon: 'bi-arrow-left-right',
      badge: 'TỔNG HỢP',
    },
    {
      num: 2,
      id: 'the-kho',
      title: 'Thẻ kho',
      desc: 'Chi tiết lịch sử xuất nhập theo từng mặt hàng',
      icon: 'bi-card-list',
      badge: 'CHI TIẾT',
    },
    {
      num: 3,
      id: 'kiem-kho',
      title: 'Báo cáo kiểm kho',
      desc: 'Biên bản đối soát thực tế và cân bằng sổ sách',
      icon: 'bi-clipboard-check',
      badge: 'ĐỐI SOÁT',
    },
  ];

  return (
    <StepPage
      title="Báo cáo kho"
      description="Báo cáo tổng hợp xuất nhập tồn, biến động chi tiết thẻ kho và nhật ký đối soát kiểm kê kho"
      icon="bi-bar-chart-line"
      color="blue"
      badge="BÁO CÁO KHO"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={true}
    >
      <LogisticsReports currentStep={currentStep} />
    </StepPage>
  );
};

export default LogisticsReportsPage;
