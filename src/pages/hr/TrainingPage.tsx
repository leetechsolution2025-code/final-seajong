import React from 'react';
import StandardPage from '../../components/layout/StandardPage';
import { TrainingManagementView } from './TrainingManagementView';

export const TrainingPage: React.FC = () => {
  return (
    <StandardPage
      title="Kế hoạch đào tạo"
      badge="NHÂN SỰ"
      description="Tổ chức các khóa đào tạo hội nhập, chuyên môn sản phẩm, lắp dựng showroom và nâng cao năng lực nhân sự Seajong."
      icon="bi-mortarboard"
      color="rose"
    >
      <TrainingManagementView />
    </StandardPage>
  );
};

export default TrainingPage;

