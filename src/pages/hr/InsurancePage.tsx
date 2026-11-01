import React, { useState } from 'react';
import { People, ArrowLeftRight, HeartPulse, Gear } from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import type { ModernStepItem } from '../../types';
import { InsuranceManagementView } from './InsuranceManagementView';

export const InsurancePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [counts, setCounts] = useState({
    participants: 0,
    fluctuations: 0,
    claims: 0,
  });

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'insurance-participants',
      title: 'Danh sách tham gia',
      mobileTitle: 'Danh sách',
      desc: 'Danh sách nhân sự đóng BHXH',
      icon: <People size={16} />,
      badge: `${counts.participants} nhân sự`,
      badgeVariant: 'brand',
      color: '#16a34a',
    },
    {
      num: 2,
      id: 'insurance-fluctuations',
      title: 'Biến động',
      mobileTitle: 'Biến động',
      desc: 'Báo tăng/giảm lao động',
      icon: <ArrowLeftRight size={16} />,
      badge: `${counts.fluctuations} hồ sơ`,
      badgeVariant: 'warning',
      color: '#2563eb',
    },
    {
      num: 3,
      id: 'insurance-claims',
      title: 'Chế độ và trợ cấp',
      mobileTitle: 'Chế độ',
      desc: 'Ốm đau, thai sản, dưỡng sức',
      icon: <HeartPulse size={16} />,
      badge: `${counts.claims} chế độ`,
      badgeVariant: 'success',
      color: '#e11d48',
    },
    {
      num: 4,
      id: 'insurance-settings',
      title: 'Thiết lập',
      mobileTitle: 'Thiết lập',
      desc: 'Tỷ lệ đóng và cấu hình',
      icon: <Gear size={16} />,
      color: '#059669',
    },
  ];

  return (
    <StepPage
      title="Bảo hiểm xã hội & Y tế"
      description="Hồ sơ trích đóng BHXH, BHYT, BHTN và giải quyết chế độ ốm đau, thai sản"
      icon="bi-shield-check"
      color="rose"
      className="hr-insurance-step-page"
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step) => setCurrentStep(Number(step))}
    >
      <InsuranceManagementView
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
        onCountsChange={setCounts}
      />
    </StepPage>
  );
};

export default InsurancePage;

