import React from 'react';
import { useDepartment } from '../../context/DepartmentContext';
import { BoardPage } from '../../pages/BoardPage';
import { DepartmentPage } from '../../pages/DepartmentPage';

import { FeatureDetailView } from './FeatureDetailView';
import { EmployeesPage } from '../../pages/hr/EmployeesPage';
import { MarketingProductsPage } from '../../pages/marketing/MarketingProductsPage';
import { BrandIdentityPage } from '../../pages/marketing/BrandIdentityPage';
import { MarketingPlanPage } from '../../pages/marketing/MarketingPlanPage';
import { NotebookView } from '../common/NotebookView';
import { SalesPartnersPage } from '../../pages/sales/SalesPartnersPage';
import { SalesCustomersPage } from '../../pages/sales/SalesCustomersPage';
import { SalesPricingPage } from '../../pages/sales/SalesPricingPage';
import { SalesPlanPage } from '../../pages/sales/SalesPlanPage';
import { SalesBusinessResultsPage } from '../../pages/sales/SalesBusinessResultsPage';
import { SalesInternalReportsPage } from '../../pages/sales/SalesInternalReportsPage';
import { SalesOrdersPage } from '../../pages/sales/SalesOrdersPage';
import { SalesInventoryPage } from '../../pages/sales/SalesInventoryPage';
import { FinanceOverviewPage } from '../../pages/finance/FinanceOverviewPage';
import { FinanceCashflowPage } from '../../pages/finance/FinanceCashflowPage';
import { FinanceDebtsPage } from '../../pages/finance/FinanceDebtsPage';
import { FinanceAssetsPage } from '../../pages/finance/FinanceAssetsPage';
import { FinanceReportsPage } from '../../pages/finance/FinanceReportsPage';
import { FinanceJournalPage } from '../../pages/finance/FinanceJournalPage';
import { FinanceDeclarationPage } from '../../pages/finance/FinanceDeclarationPage';
import { FinanceAdvancesPage } from '../../pages/finance/FinanceAdvancesPage';
import { DocumentApprovalPage } from '../../pages/departments/bom/DocumentApprovalPage';
import { CategoryManagementPage } from '../../pages/departments/bom/CategoryManagementPage';
import { LaborRulesPage } from '../../pages/departments/bom/LaborRulesPage';
import { UserAuthManagementPage } from '../../pages/departments/bom/UserAuthManagementPage';
import { DirectorPlanPage } from '../../pages/departments/bom/DirectorPlanPage';
import { TaskManagementPage } from '../../pages/departments/bom/TaskManagementPage';
import { MyTasksPage } from '../../pages/departments/bom/MyTasksPage';
import { MyRequestsPage } from '../../pages/departments/bom/MyRequestsPage';

export const DashboardView: React.FC = () => {
  const { activeDeptCode, activeMenuKey } = useDepartment();

  // ── PHÒNG TÀI CHÍNH – KẾ TOÁN (FINANCE) ROUTES ──
  if (activeDeptCode === 'finance' || activeDeptCode === 'tai-chinh' || activeDeptCode === 'ke-toan') {
    if (activeMenuKey === 'cashflow' || activeMenuKey === 'cashflow-tracking') {
      return <FinanceCashflowPage />;
    }
    if (activeMenuKey === 'debts' || activeMenuKey === 'debt-cost-mgmt') {
      return <FinanceDebtsPage />;
    }
    if (activeMenuKey === 'advances' || activeMenuKey === 'advance-payment' || activeMenuKey === 'refund-advance') {
      return <FinanceAdvancesPage />;
    }
    if (activeMenuKey === 'assets') {
      return <FinanceAssetsPage />;
    }
    if (activeMenuKey === 'inventory' || activeMenuKey === 'inventory-reports' || activeMenuKey === 'audit-logs') {
      return <SalesInventoryPage />;
    }
    if (activeMenuKey === 'reports' || activeMenuKey === 'financial-reports') {
      return <FinanceReportsPage />;
    }
    if (activeMenuKey === 'journal-entries' || activeMenuKey === 'general-journal') {
      return <FinanceJournalPage />;
    }
    if (activeMenuKey === 'initial-declaration') {
      return <FinanceDeclarationPage />;
    }
    if (activeMenuKey === 'overview' || !activeMenuKey) {
      return <FinanceOverviewPage />;
    }
  }

  // ── PHÒNG KINH DOANH (SALES) ROUTES ──
  if (activeMenuKey === 'partners') {
    return <SalesPartnersPage />;
  }
  if (activeMenuKey === 'customers' || activeMenuKey === 'dealers') {
    return <SalesCustomersPage />;
  }
  if (activeMenuKey === 'pricing') {
    return <SalesPricingPage />;
  }
  if (activeMenuKey === 'sales_plan' || (activeMenuKey === 'plan' && activeDeptCode === 'sales')) {
    return <SalesPlanPage />;
  }
  if (activeMenuKey === 'business-results') {
    return <SalesBusinessResultsPage />;
  }
  if (activeMenuKey === 'internal-reports') {
    return <SalesInternalReportsPage />;
  }
  if (activeMenuKey === 'inventory' && activeDeptCode === 'sales') {
    return <SalesInventoryPage />;
  }
  if (activeMenuKey === 'orders' || activeMenuKey === 'sale_orders') {
    return <SalesOrdersPage />;
  }

  // Khi người dùng chọn chức năng Quản lý hồ sơ nhân viên
  if (activeMenuKey === 'employees') {
    return <EmployeesPage />;
  }

  // Khi người dùng chọn chức năng Sổ ghi chép
  if (activeMenuKey === 'notebook' || activeMenuKey === 'journal') {
    return <NotebookView department={activeDeptCode} />;
  }

  // Khi người dùng chọn chức năng Sản phẩm (chuẩn client-seajong)
  if (activeMenuKey === 'products' || activeMenuKey === 'product') {
    return <MarketingProductsPage />;
  }

  // Khi người dùng chọn chức năng Nhận diện thương hiệu (chuẩn client-seajong)
  if (activeMenuKey === 'brand' || activeMenuKey === 'brand-identity') {
    return <BrandIdentityPage />;
  }

  // Khi người dùng chọn chức năng Lập kế hoạch Marketing (chuẩn client-seajong)
  if (activeMenuKey === 'mkt_plan' || activeMenuKey === 'marketing-plan' || activeMenuKey === 'planing-1111') {
    return <MarketingPlanPage />;
  }

  // Khi người dùng chọn chức năng Phê duyệt tài liệu / Trung tâm phê duyệt (chuẩn client-skydoor)
  if (activeMenuKey === 'approvals' || activeMenuKey === 'requests_approvals' || activeMenuKey === 'hr_requests_approvals') {
    return <DocumentApprovalPage />;
  }

  // Khi người dùng chọn chức năng Quản lý danh mục hệ thống (chuẩn client-skydoor kết nối DB thực tế)
  if (activeMenuKey === 'categories' || activeMenuKey === 'system_categories' || activeMenuKey === 'danh-muc') {
    return <CategoryManagementPage />;
  }

  // Khi người dùng chọn chức năng Nội quy lao động (chuẩn client-skydoor kết nối DB thực tế)
  if (activeMenuKey === 'labor-policy' || activeMenuKey === 'labor-rules' || activeMenuKey === 'labor_policy') {
    return <LaborRulesPage />;
  }

  // Khi người dùng chọn chức năng Phân quyền người dùng (chuẩn client-seajong kết nối DB thực tế)
  if (activeMenuKey === 'users' || activeMenuKey === 'user-auth' || activeMenuKey === 'permissions' || activeMenuKey === 'user_auth') {
    return <UserAuthManagementPage />;
  }

  // Khi người dùng chọn chức năng Lập kế hoạch của Ban Giám đốc (chuẩn client-seajong kết nối DB thực tế)
  if (
    (activeMenuKey === 'plan' && (activeDeptCode === 'board' || !activeDeptCode)) ||
    activeMenuKey === 'board_plan' ||
    activeMenuKey === 'director-plan' ||
    activeMenuKey === 'master-plan'
  ) {
    return <DirectorPlanPage />;
  }



  // Khi người dùng chọn chức năng Quản trị công việc (chuẩn client-skydoor với biểu đồ Gantt & danh sách nhiệm vụ)
  if (
    activeMenuKey === 'tasks' ||
    activeMenuKey === 'task-management' ||
    activeMenuKey === 'work-management' ||
    activeMenuKey === 'task'
  ) {
    return <TaskManagementPage />;
  }

  // Khi người dùng chọn Danh sách công việc cá nhân (chuẩn client-skydoor với MyTasksView)
  if (
    activeMenuKey === 'my_tasks' ||
    activeMenuKey === 'my-tasks' ||
    activeMenuKey === 'personal-tasks'
  ) {
    return <MyTasksPage />;
  }

  // Khi người dùng chọn Yêu cầu cá nhân (chuẩn client-skydoor với MyRequestsView)
  if (
    activeMenuKey === 'my_requests' ||
    activeMenuKey === 'my-requests' ||
    activeMenuKey === 'requests'
  ) {
    return <MyRequestsPage />;
  }

  // Khi người dùng chọn bất kỳ chức năng con nào từ Sidebar
  if (activeMenuKey && activeMenuKey !== 'overview') {
    return <FeatureDetailView menuKey={activeMenuKey} deptCode={activeDeptCode} />;
  }

  // Khi ở màn hình Tổng quan
  if (activeDeptCode === 'board') {
    return <BoardPage />;
  }

  return <DepartmentPage deptCode={activeDeptCode} />;
};

export default DashboardView;
