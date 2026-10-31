import React, { useState, useEffect } from 'react';
import { PersonPlus, PersonBadge, CalendarCheck } from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import type { ModernStepItem } from '../../types';
import { RecruitmentManagementView } from './RecruitmentManagementView';

export const RecruitmentPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [counts, setCounts] = useState({ requests: 0, candidates: 0, interviews: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [reqRes, candRes, intRes] = await Promise.all([
          fetch('/api/recruitment/requests'),
          fetch('/api/recruitment/candidates'),
          fetch('/api/recruitment/interviews'),
        ]);
        const [reqData, candData, intData] = await Promise.all([
          reqRes.ok ? reqRes.json() : [],
          candRes.ok ? candRes.json() : [],
          intRes.ok ? intRes.json() : [],
        ]);
        setCounts({
          requests: Array.isArray(reqData) ? reqData.length : 0,
          candidates: Array.isArray(candData) ? candData.length : 0,
          interviews: Array.isArray(intData) ? intData.length : 0,
        });
      } catch {}
    };
    fetchCounts();
    const timer = setInterval(fetchCounts, 5000);
    return () => clearInterval(timer);
  }, []);

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'recruitment-requests',
      title: 'Yêu cầu tuyển dụng',
      desc: 'Nhu cầu định biên các bộ phận',
      icon: <PersonPlus size={16} />,
      badge: `${counts.requests} yêu cầu`,
      badgeVariant: 'brand',
      color: '#e11d48',
    },
    {
      num: 2,
      id: 'recruitment-candidates',
      title: 'Danh sách ứng viên',
      desc: 'Hồ sơ CV và sàng lọc ứng viên',
      icon: <PersonBadge size={16} />,
      badge: `${counts.candidates} hồ sơ`,
      badgeVariant: 'warning',
      color: '#2563eb',
    },
    {
      num: 3,
      id: 'recruitment-interviews',
      title: 'Danh sách phỏng vấn',
      desc: 'Lịch phỏng vấn và đánh giá kết quả',
      icon: <CalendarCheck size={16} />,
      badge: `${counts.interviews} lịch PV`,
      badgeVariant: 'success',
      color: '#059669',
    },
  ];

  return (
    <StepPage
      title="Quản trị tuyển dụng"
      description="Quản lý nhu cầu định biên, sàng lọc hồ sơ ứng viên, tổ chức phỏng vấn và chuyển giao nhân sự thử việc Seajong."
      icon="bi-person-plus"
      color="rose"
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step) => setCurrentStep(Number(step))}
    >
      <RecruitmentManagementView
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
      />
    </StepPage>
  );
};

export default RecruitmentPage;
