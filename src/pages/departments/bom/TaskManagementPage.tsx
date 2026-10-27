import React from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { TaskManagementView } from '../../../components/common/TaskManagementView';

export interface TaskManagementPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
}

export const TaskManagementPage: React.FC<TaskManagementPageProps> = ({
  onShowToast,
}) => {
  return (
    <StandardPage
      title="Quản trị công việc"
      description="Theo dõi tiến độ giao việc trọng yếu các xưởng sản xuất và phòng ban nghiệp vụ"
      icon="bi-kanban"
      color="indigo"
      badge="TIẾN ĐỘ THỰC THI"
      tickerContext="tasks"
      cardPadding="p-0"
      useCard={true}
    >
      <TaskManagementView
        hideTitle={true}
        department="all"
        showCategoryTabs={true}
        allowAdd={true}
        onShowToast={onShowToast}
      />
    </StandardPage>
  );
};

export default TaskManagementPage;
