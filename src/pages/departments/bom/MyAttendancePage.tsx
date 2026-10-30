import React from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { MyAttendanceView } from '../common/MyAttendanceView';

export interface MyAttendancePageProps {
  onShowToast?: (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => void;
  onNavigate?: (navId: string) => void;
  user?: any;
}

export const MyAttendancePage: React.FC<MyAttendancePageProps> = ({
  onShowToast,
  onNavigate,
  user,
}) => {
  return (
    <StandardPage
      title="Chấm công và điểm danh"
      description="Ghi nhận thời gian làm việc qua mạng nội bộ WiFi/LAN & định vị GPS"
      icon="bi-clock-history"
      color="blue"
      badge="CÁ NHÂN"
      tickerContext="my_attendance"
      useCard={false}
    >
      <MyAttendanceView
        user={user}
        onShowToast={onShowToast}
        onNavigate={onNavigate}
      />
    </StandardPage>
  );
};

export default MyAttendancePage;

