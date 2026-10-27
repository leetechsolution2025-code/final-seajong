import React, { useState } from 'react';
import { StepPage } from '../../../components/common/StepPage';
import { LaborRulesView } from './LaborRulesView';
import { HolidayRulesView } from './HolidayRulesView';
import { IntranetSetupView } from './IntranetSetupView';
import { SystemParametersView } from './SystemParametersView';
import type { ModernStepItem } from '../../../types';
import { Book, CalendarCheck, Wifi, Sliders } from 'react-bootstrap-icons';
import { useToast } from '../../../components/ui/Toast';

export interface LaborRulesPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
}

export const LaborRulesPage: React.FC<LaborRulesPageProps> = ({
  onShowToast: propsOnShowToast,
  onNavigate: _onNavigate,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const toast = useToast();

  const handleToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    if (propsOnShowToast) {
      propsOnShowToast(type, title, message);
    } else if (toast && toast[type]) {
      toast[type](title, message);
    }
  };

  const laborRulesSteps: ModernStepItem[] = [
    {
      num: 1,
      id: 'labor-rules',
      title: 'Quy chế lao động',
      desc: 'Quy định làm việc và kỷ luật',
      icon: <Book size={16} />,
    },
    {
      num: 2,
      id: 'holiday-rules',
      title: 'Quy định nghỉ lễ',
      desc: 'Lịch nghỉ lễ và phép năm',
      icon: <CalendarCheck size={16} />,
    },
    {
      num: 3,
      id: 'intranet-setup',
      title: 'Thiết lập mạng nội bộ',
      desc: 'Cấu hình LAN và bảo mật',
      icon: <Wifi size={16} />,
    },
    {
      num: 4,
      id: 'param-setup',
      title: 'Thiết lập thông số',
      desc: 'Tham số hệ thống và API Key',
      icon: <Sliders size={16} />,
    },
  ];

  return (
    <StepPage
      title="Nội quy lao động"
      description="Quy chế công ty Seajong, thỏa ước lao động tập thể và quy chuẩn kỷ luật"
      icon="bi-book"
      color="violet"
      badge="NỘI QUY LAO ĐỘNG"
      tickerContext="labor-policy"
      hideTicker={true}
      steps={laborRulesSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      <div
        className="custom-scrollbar"
        style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        {currentStep === 1 && (
          <LaborRulesView onShowToast={handleToast} />
        )}
        {currentStep === 2 && (
          <HolidayRulesView onShowToast={handleToast} />
        )}
        {currentStep === 3 && (
          <IntranetSetupView onShowToast={handleToast} />
        )}
        {currentStep === 4 && (
          <SystemParametersView onShowToast={handleToast} />
        )}
      </div>
    </StepPage>
  );
};

export default LaborRulesPage;
