import React from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { MyTasksView } from '../common/MyTasksView';

export interface MyTasksPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
  user?: any;
}

export const MyTasksPage: React.FC<MyTasksPageProps> = ({
  onShowToast,
  user,
}) => {
  return (
    <StandardPage
      title="Danh sách công việc cá nhân"
      description="Quản lý, tiếp nhận và báo cáo tiến độ công việc được giao trong ngày"
      icon="bi-list-check"
      color="blue"
      badge="CÁ NHÂN"
      tickerContext="my_tasks"
      cardPadding="p-0"
      useCard={true}
    >
      <MyTasksView
        hideTitle={true}
        department="all"
        showCategoryTabs={true}
        allowAdd={true}
        user={user}
        onShowToast={onShowToast}
      />
    </StandardPage>
  );
};

export default MyTasksPage;
