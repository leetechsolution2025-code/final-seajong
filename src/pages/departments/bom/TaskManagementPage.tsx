import React from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { TaskManagementView } from '../../../components/common/TaskManagementView';

export interface TaskManagementPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
  department?: string;
}

export const TaskManagementPage: React.FC<TaskManagementPageProps> = ({
  onShowToast,
  department = 'all',
}) => {
  const isMarketing = department === 'marketing' || department === 'mkt';

  return (
    <StandardPage
      title="Quản trị công việc"
      description={
        isMarketing
          ? 'Theo dõi và quản trị tiến độ thực thi các công việc, chiến dịch phòng Marketing theo kế hoạch tháng'
          : 'Theo dõi tiến độ giao việc trọng yếu các xưởng sản xuất và phòng ban nghiệp vụ'
      }
      icon="bi-kanban"
      color="indigo"
      badge={isMarketing ? 'MARKETING SEAJONG' : 'TIẾN ĐỘ THỰC THI'}
      tickerContext="tasks"
      cardPadding="p-0"
      useCard={true}
      className="bom-task-page"
    >
      <TaskManagementView
        hideTitle={true}
        department={department}
        showCategoryTabs={!isMarketing}
        allowAdd={true}
        onShowToast={onShowToast}
      />
    </StandardPage>
  );
};

export default TaskManagementPage;
