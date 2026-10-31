import React from 'react';
import { useDepartment } from '../../context/DepartmentContext';
import { BoardPage } from '../../pages/BoardPage';
import { DepartmentPage } from '../../pages/DepartmentPage';

import { FeatureDetailView } from './FeatureDetailView';
import { EmployeesPage } from '../../pages/hr/EmployeesPage';
import { RecruitmentPage } from '../../pages/hr/RecruitmentPage';
import { ProbationPage } from '../../pages/hr/ProbationPage';
import { TrainingPage } from '../../pages/hr/TrainingPage';
import { AttendancePayrollPage } from '../../pages/hr/AttendancePayrollPage';
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
import { SalesOrderTrackingPage } from '../../pages/sales/SalesOrderTrackingPage';
import { SalesDealerSupportPage } from '../../pages/sales/SalesDealerSupportPage';
import { SalesInventoryPage } from '../../pages/sales/SalesInventoryPage';
import { FinanceOverviewPage } from '../../pages/finance/FinanceOverviewPage';
import { FinanceCashflowPage } from '../../pages/finance/FinanceCashflowPage';
import { FinanceDebtsPage } from '../../pages/finance/FinanceDebtsPage';
import { FinanceAssetsPage } from '../../pages/finance/FinanceAssetsPage';
import { FinanceReportsPage } from '../../pages/finance/FinanceReportsPage';
import { FinanceJournalPage } from '../../pages/finance/FinanceJournalPage';
import { FinanceDeclarationPage } from '../../pages/finance/FinanceDeclarationPage';
import { FinanceAdvancesPage } from '../../pages/finance/FinanceAdvancesPage';
import { LogisticsOverviewPage } from '../../pages/logistics/LogisticsOverviewPage';
import { LogisticsInboundPage } from '../../pages/logistics/LogisticsInboundPage';
import { LogisticsMaterialPickingPage } from '../../pages/logistics/LogisticsMaterialPickingPage';
import { LogisticsBatchPackingPage } from '../../pages/logistics/LogisticsBatchPackingPage';
import { WarehousesPage } from '../../pages/logistics/WarehousesPage';
import { LogisticsReportsPage } from '../../pages/logistics/LogisticsReportsPage';
import { LogisticsAuditLogsPage } from '../../pages/logistics/LogisticsAuditLogsPage';
import { DocumentApprovalPage } from '../../pages/departments/bom/DocumentApprovalPage';
import { CategoryManagementPage } from '../../pages/departments/bom/CategoryManagementPage';
import { LaborRulesPage } from '../../pages/departments/bom/LaborRulesPage';
import { UserAuthManagementPage } from '../../pages/departments/bom/UserAuthManagementPage';
import { DirectorPlanPage } from '../../pages/departments/bom/DirectorPlanPage';
import { TaskManagementPage } from '../../pages/departments/bom/TaskManagementPage';
import { MyTasksPage } from '../../pages/departments/bom/MyTasksPage';
import { MyRequestsPage } from '../../pages/departments/bom/MyRequestsPage';
import { MyAttendancePage } from '../../pages/departments/bom/MyAttendancePage';
import { DealerPortalPage } from '../../pages/dealer/DealerPortalPage';
import { ProductionOverviewPage } from '../../pages/production/ProductionOverviewPage';
import { ProductionDefectsPage } from '../../pages/production/ProductionDefectsPage';
import { ProductionBomPage } from '../../pages/production/ProductionBomPage';
import { QaOverviewPage } from '../../pages/qa/QaOverviewPage';
import { QaStandardsPage } from '../../pages/qa/QaStandardsPage';
import { QaDefectsSummaryPage } from '../../pages/qa/QaDefectsSummaryPage';
import { PurchaseOverviewPage } from '../../pages/purchase/PurchaseOverviewPage';
import { PurchaseSuppliersPage } from '../../pages/purchase/PurchaseSuppliersPage';
import { DataManagementPage } from '../../pages/departments/bom/DataManagementPage';

export const DashboardView: React.FC = () => {
  const { activeDeptCode, activeMenuKey } = useDepartment();

  // ── QUẢN TRỊ DỮ LIỆU HỆ THỐNG (ADMIN / BAN GIÁM ĐỐC) ──
  if (activeMenuKey === 'data-management' || activeMenuKey === 'board_data' || activeMenuKey === 'data') {
    return <DataManagementPage />;
  }

  // ── CỔNG THÔNG TIN ĐẠI LÝ (DEALER PORTAL) ──
  if (activeDeptCode === 'dealer' || activeDeptCode === 'dai-ly') {
    return <DealerPortalPage />;
  }

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

  // ── BỘ PHẬN KHO HÀNG (LOGISTICS / KHO VẬN) ──
  if (activeDeptCode === 'logistics' || activeDeptCode === 'kho' || activeDeptCode === 'kho-hang' || activeDeptCode === 'warehouse') {
    if (activeMenuKey === 'system' || activeMenuKey === 'warehouses' || activeMenuKey === 'warehouse-system') {
      return <WarehousesPage />;
    }
    if (activeMenuKey === 'inbound') {
      return <LogisticsInboundPage />;
    }
    if (activeMenuKey === 'material-picking') {
      return <LogisticsMaterialPickingPage />;
    }
    if (activeMenuKey === 'batch-packing') {
      return <LogisticsBatchPackingPage />;
    }
    if (activeMenuKey === 'inventory-reports' || activeMenuKey === 'reports' || activeMenuKey === 'bao-cao-kho') {
      return <LogisticsReportsPage />;
    }
    if (activeMenuKey === 'audit-logs' || activeMenuKey === 'nhat-ky-kho' || activeMenuKey === 'nhat-ky-hoat-dong-kho') {
      return <LogisticsAuditLogsPage />;
    }
    if (activeMenuKey === 'overview' || !activeMenuKey) {
      return <LogisticsOverviewPage />;
    }
  }

  // ── BỘ PHẬN SẢN XUẤT (PRODUCTION) ──
  if (activeDeptCode === 'production' || activeDeptCode === 'san-xuat' || activeDeptCode === 'sx') {
    if (activeMenuKey === 'defects') {
      return <ProductionDefectsPage />;
    }
    if (activeMenuKey === 'bom') {
      return <ProductionBomPage />;
    }
    if (activeMenuKey === 'inventory') {
      return <SalesInventoryPage />;
    }
    if (activeMenuKey === 'overview' || !activeMenuKey) {
      return <ProductionOverviewPage />;
    }
  }

  // ── BỘ PHẬN QUẢN LÝ CHẤT LƯỢNG (QA / QC) ──
  if (activeDeptCode === 'qa' || activeDeptCode === 'qc' || activeDeptCode === 'quality' || activeDeptCode === 'quan-ly-chat-luong') {
    if (activeMenuKey === 'standards' || activeMenuKey === 'qa_standards') {
      return <QaStandardsPage />;
    }
    if (activeMenuKey === 'defects-summary' || activeMenuKey === 'defects_summary') {
      return <QaDefectsSummaryPage />;
    }
    if (activeMenuKey === 'overview' || !activeMenuKey) {
      return <QaOverviewPage />;
    }
  }

  // ── BỘ PHẬN MUA HÀNG (PURCHASE / PROCUREMENT) ──
  if (
    activeDeptCode === 'purchase' ||
    activeDeptCode === 'procurement' ||
    activeDeptCode === 'mua-hang' ||
    activeDeptCode === 'purchasing'
  ) {
    if (activeMenuKey === 'suppliers' || activeMenuKey === 'carriers') {
      return <PurchaseSuppliersPage />;
    }
    if (activeMenuKey === 'inventory') {
      return <SalesInventoryPage />;
    }
    if (activeMenuKey === 'overview' || !activeMenuKey) {
      return <PurchaseOverviewPage />;
    }
  }

  if (activeMenuKey === 'suppliers' || activeMenuKey === 'carriers') {
    return <PurchaseSuppliersPage />;
  }
  if (activeMenuKey === 'purchasing') {
    return <PurchaseOverviewPage />;
  }

  if (activeMenuKey === 'standards' || activeMenuKey === 'qa_standards') {
    return <QaStandardsPage />;
  }
  if (activeMenuKey === 'defects-summary' || activeMenuKey === 'defects_summary') {
    return <QaDefectsSummaryPage />;
  }
  if (activeMenuKey === 'defects') {
    return <ProductionDefectsPage />;
  }
  if (activeMenuKey === 'bom') {
    return <ProductionBomPage />;
  }

  // Khi người dùng chọn chức năng từ menu trực tiếp
  if (activeMenuKey === 'inventory-reports' || activeMenuKey === 'bao-cao-kho') {
    return <LogisticsReportsPage />;
  }
  if (activeMenuKey === 'audit-logs' || activeMenuKey === 'nhat-ky-kho' || activeMenuKey === 'nhat-ky-hoat-dong-kho') {
    return <LogisticsAuditLogsPage />;
  }
  if (activeMenuKey === 'inbound') {
    return <LogisticsInboundPage />;
  }
  if (activeMenuKey === 'material-picking') {
    return <LogisticsMaterialPickingPage />;
  }
  if (activeMenuKey === 'batch-packing') {
    return <LogisticsBatchPackingPage />;
  }
  if (activeMenuKey === 'system' || activeMenuKey === 'warehouses' || activeMenuKey === 'warehouse-system') {
    return <WarehousesPage />;
  }

  // ── PHÒNG KINH DOANH (SALES) ROUTES ──
  if (activeMenuKey === 'order-tracking' || activeMenuKey === 'order_tracking') {
    return <SalesOrderTrackingPage />;
  }
  if (activeMenuKey === 'dealer-support' || activeMenuKey === 'dealer_support') {
    return <SalesDealerSupportPage />;
  }
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
  if (activeMenuKey === 'inventory') {
    return <SalesInventoryPage />;
  }
  if (activeMenuKey === 'orders' || activeMenuKey === 'sale_orders') {
    return <SalesOrdersPage />;
  }

  // Khi người dùng chọn chức năng Quản lý hồ sơ nhân viên
  if (activeMenuKey === 'employees') {
    return <EmployeesPage />;
  }

  // Khi người dùng chọn chức năng Tuyển dụng và đào tạo (chuẩn client-skydoor)
  if (activeMenuKey === 'recruitment' || activeMenuKey === 'interviews') {
    return <RecruitmentPage />;
  }
  if (activeMenuKey === 'probation') {
    return <ProbationPage />;
  }
  if (activeMenuKey === 'training') {
    return <TrainingPage />;
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

  // Khi người dùng chọn Tổng hợp công và tính lương của bộ phận Nhân sự (chuẩn client-seajong kết nối bộ máy yêu cầu cá nhân)
  if (
    activeMenuKey === 'attendance-payroll' ||
    activeMenuKey === 'payroll'
  ) {
    return <AttendancePayrollPage />;
  }

  // Khi người dùng chọn Chấm công cá nhân
  if (
    activeMenuKey === 'my_attendance' ||
    activeMenuKey === 'my-attendance' ||
    activeMenuKey === 'attendance'
  ) {
    return <MyAttendancePage />;
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
