import React from 'react';
import { TaskManagementView } from '../../../components/common/TaskManagementView';
import type {
  TaskManagementViewProps,
  UserTaskItem,
} from '../../../components/common/TaskManagementView';

export type { UserTaskItem, TaskManagementViewProps };
export interface MyTasksViewProps extends TaskManagementViewProps {}

export const MyTasksView: React.FC<MyTasksViewProps> = (props) => {
  return (
    <TaskManagementView
      title="Công việc của tôi"
      subtitle="Danh sách đầu việc và nhiệm vụ cá nhân được phân công phụ trách"
      {...props}
      onlyMyTasks={true}
    />
  );
};

export default MyTasksView;
