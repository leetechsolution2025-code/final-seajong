import React from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { MyRequestsView } from '../common/MyRequestsView';

export interface MyRequestsPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  department?: string;
}

export const MyRequestsPage: React.FC<MyRequestsPageProps> = ({
  onShowToast,
  department = 'bom',
}) => {
  return (
    <StandardPage
      title="Yêu cầu và đề xuất cá nhân"
      description="Tạo đơn xin nghỉ phép, tạm ứng chi phí, công tác và theo dõi tiến độ phê duyệt"
      icon="bi-file-earmark-plus"
      color="amber"
      badge="CÁ NHÂN"
      tickerContext="my_requests"
      cardPadding="p-0"
      useCard={true}
    >
      <MyRequestsView
        department={department}
        onShowToast={onShowToast}
      />
    </StandardPage>
  );
};

export default MyRequestsPage;
