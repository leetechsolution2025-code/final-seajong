import React from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { CategoryManagementView } from './CategoryManagementView';

export interface CategoryManagementPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
}

export const CategoryManagementPage: React.FC<CategoryManagementPageProps> = ({
  onShowToast,
  onNavigate,
}) => {
  return (
    <StandardPage
      title="Quản lý danh mục hệ thống"
      description="Thiết lập danh mục sản phẩm, nhóm hàng, khách hàng, nhà cung cấp và trạng thái quy trình"
      icon="bi-folder-symlink"
      color="violet"
      badge="DANH MỤC HỆ THỐNG"
      tickerContext="categories"
      useCard={false}
    >
      <CategoryManagementView
        onShowToast={onShowToast}
        onSelectNav={onNavigate}
      />
    </StandardPage>
  );
};

export default CategoryManagementPage;
