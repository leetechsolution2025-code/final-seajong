import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StandardPage } from '../../../components/layout/StandardPage';
import { TableToolbar } from '../../../components/common/TableToolbar';
import { FullWidthTable } from '../../../components/common/FullWidthTable';
import { Pagination } from '../../../components/common/Pagination';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Select } from '../../../components/common/Select';
import { Input } from '../../../components/common/Input';
import { ConfirmDialog, type ConfirmDialogVariant } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../components/ui/Toast';

export interface BackupFileItem {
  name: string;
  size: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface CurrentDbInfo {
  fileName: string;
  size: string;
  sizeBytes: number;
  updatedAt: string;
  counts?: {
    employees: number;
    users: number;
    attendances: number;
    personalRequests: number;
    orders: number;
    customers: number;
  };
}

export interface BackupConfigState {
  autoBackupEnabled: boolean;
  scheduleFrequency: string;
  backupTime: string;
  autoCleanupEnabled: boolean;
  retentionDays: number;
  maxBackups: number;
  cleanupScope: string;
}

export interface DbTableItem {
  name: string;
  rowCount: number;
  isReady?: boolean;
}

const TABLE_VI_LABELS: Record<string, string> = {
  _ProductCategories: 'Liên kết Sản phẩm – Danh mục Seajong',
  Employee: 'Hồ sơ nhân sự',
  EmploymentHistory: 'Lịch sử công tác nhân sự',
  User: 'Tài khoản người dùng',
  Attendance: 'Dữ liệu chấm công',
  AttendanceConfirmation: 'Xác nhận bảng chấm công',
  Payroll: 'Bảng lương nhân viên',
  PayrollConfirmation: 'Xác nhận phiếu lương',
  PersonalRequest: 'Yêu cầu cá nhân (Nghỉ phép, Muộn/Sớm, OT)',
  LaborContract: 'Hợp đồng lao động',
  LaborPolicy: 'Chính sách & Nội quy lao động',
  LaborShift: 'Cấu hình ca làm việc',
  LaborLunchRule: 'Quy định ăn ca & phụ cấp suất ăn',
  LaborOvertimeRule: 'Quy định làm thêm giờ (OT)',
  LaborViolationConfig: 'Cấu hình xử lý vi phạm chấm công',
  LaborViolationRule: 'Khung hình thức kỷ luật đi muộn/về sớm',
  LaborHolidayRule: 'Lịch nghỉ Lễ, Tết hưởng nguyên lương',
  LaborLeavePolicy: 'Chính sách nghỉ phép năm & chế độ',
  InsuranceHistory: 'Lịch sử tham gia Bảo hiểm',
  InsuranceConfig: 'Cấu hình tỷ lệ Bảo hiểm',
  RecruitmentRequest: 'Yêu cầu tuyển dụng',
  Candidate: 'Hồ sơ ứng viên',
  InterviewScorecard: 'Phiếu đánh giá phỏng vấn',
  EmployeeProbation: 'Hồ sơ theo dõi thử việc',
  EmployeeProbationEvent: 'Sự kiện đánh giá thử việc',
  TrainingPlan: 'Kế hoạch đào tạo',
  TrainingCourse: 'Khóa đào tạo nội bộ',
  TrainingParticipant: 'Học viên tham gia đào tạo',
  TrainingRequest: 'Đề xuất đào tạo',
  Customer: 'Khách hàng & Đại lý phân phối',
  CustomerCareHistory: 'Lịch sử chăm sóc khách hàng',
  PartnerCareHistory: 'Lịch sử chăm sóc đối tác',
  SaleOrder: 'Đơn hàng bán (Sale Orders)',
  SaleOrderItem: 'Chi tiết sản phẩm đơn hàng',
  Quotation: 'Báo giá khách hàng',
  QuotationItem: 'Chi tiết sản phẩm báo giá',
  QuotationNegotiation: 'Lịch sử đàm phán báo giá',
  Contract: 'Hợp đồng kinh tế',
  DealerSupportTicket: 'Yêu cầu hỗ trợ đại lý',
  SalesYearlyPlan: 'Kế hoạch kinh doanh năm',
  SalesMonthlyPlan: 'Kế hoạch kinh doanh tháng',
  OemSalesYearlyPlan: 'Kế hoạch doanh số OEM năm',
  OemMasterYearlyPlan: 'Kế hoạch tổng thể OEM năm',
  SalesPolicy: 'Chính sách bán hàng',
  SalesPromotion: 'Chương trình khuyến mãi',
  InternalIncomeReport: 'Báo cáo kết quả kinh doanh nội bộ',
  InternalKpiCriteria: 'Tiêu chí đánh giá KPI nội bộ',
  InternalKpiReport: 'Báo cáo đánh giá KPI định kỳ',
  InternalKpiReportDetail: 'Chi tiết chấm điểm KPI',
  SoftSkillQA: 'Cẩm nang kỹ năng & xử lý tình huống',
  Revenue: 'Doanh thu ghi nhận',
  Expense: 'Chi phí hoạt động',
  Debt: 'Công nợ phải thu / phải trả',
  Asset: 'Tài sản cố định & CCDC',
  BankLoan: 'Khoản vay ngân hàng',
  BankDisbursement: 'Giải ngân khoản vay',
  AccountingAccount: 'Hệ thống tài khoản kế toán',
  JournalEntry: 'Bút toán nhật ký chung',
  JournalLine: 'Chi tiết dòng bút toán',
  MonthlyBalance: 'Số dư kế toán tháng',
  PaymentNotification: 'Thông báo thanh toán',
  InventoryItem: 'Danh mục vật tư & hàng hóa kho',
  InventoryCategory: 'Nhóm vật tư hàng hóa kho',
  InventoryStock: 'Tồn kho theo kho bãi',
  InventoryReservation: 'Đặt giữ hàng tồn kho',
  StockMovement: 'Lịch sử nhập xuất kho',
  StockCount: 'Phiếu kiểm kê kho',
  StockCountLine: 'Chi tiết dòng kiểm kê kho',
  Warehouse: 'Danh sách kho bãi',
  LogisticsTicket: 'Phiếu điều phối kho vận',
  LogisticsTicketItem: 'Chi tiết phiếu kho vận',
  LogisticsSyncLog: 'Nhật ký đồng bộ kho vận',
  PurchaseRequest: 'Yêu cầu mua hàng (PR)',
  PurchaseRequestItem: 'Chi tiết yêu cầu mua hàng',
  PurchaseOrder: 'Đơn đặt hàng mua (PO)',
  PurchaseOrderItem: 'Chi tiết đơn đặt hàng mua',
  PurchaseOrderActivity: 'Nhật ký tiến độ đơn mua hàng',
  Supplier: 'Nhà cung cấp',
  SupplierCategory: 'Nhóm nhà cung cấp',
  Carrier: 'Đơn vị vận chuyển',
  ProductionIncident: 'Sự cố sản xuất',
  DefectRecord: 'Bản ghi lỗi sản phẩm (QC)',
  DefectActivity: 'Lịch sử xử lý lỗi chất lượng',
  QualityInspection: 'Kiểm định chất lượng (QA/QC)',
  DinhMuc: 'Định mức nguyên vật liệu (BOM)',
  DinhMucVatTu: 'Chi tiết vật tư định mức',
  SeajongProduct: 'Sản phẩm thương hiệu Seajong',
  SeajongCategory: 'Danh mục sản phẩm Seajong',
  SeajongProductVariation: 'Biến thể sản phẩm Seajong',
  SeajongSyncLog: 'Nhật ký đồng bộ sản phẩm Seajong',
  MarketingCampaign: 'Chiến dịch Marketing',
  MarketingLead: 'Khách hàng tiềm năng (Leads)',
  MarketingContent: 'Nội dung truyền thông',
  MarketingBudgetPlan: 'Ngân sách Marketing',
  MarketingAnnualPlan: 'Kế hoạch Marketing năm',
  MarketingMonthlyPlan: 'Kế hoạch Marketing tháng',
  MarketingYearlyPlan: 'Kế hoạch tổng thể Marketing',
  Task: 'Công việc & Nhiệm vụ',
  TaskComment: 'Bình luận công việc',
  ApprovalRequest: 'Tờ trình & Phê duyệt tài liệu',
  ApprovalComment: 'Ý kiến phê duyệt',
  Meeting: 'Lịch họp & Biên bản họp',
  Notification: 'Thông báo hệ thống',
  NotificationRecipient: 'Người nhận thông báo',
  Message: 'Tin nhắn nội bộ',
  MessageParticipant: 'Thành viên hội thoại nội bộ',
  Category: 'Danh mục dùng chung hệ thống',
  CategoryTypeDef: 'Định nghĩa nhóm danh mục',
  DepartmentCategory: 'Danh mục phòng ban & bộ phận',
  CompanyInfo: 'Thông tin doanh nghiệp',
  Client: 'Thông tin đơn vị thành viên',
  Branch: 'Chi nhánh & Văn phòng',
  BranchWifi: 'Cấu hình mạng WiFi chấm công',
  BranchDevice: 'Thiết bị máy chấm công vân tay/AI',
  MasterYearlyPlan: 'Kế hoạch tổng thể Ban Giám đốc',
  accounting_chart_of_accounts: 'Hệ thống tài khoản kế toán (TT200)',
  accounting_journal_entries: 'Sổ nhật ký chung kế toán',
  accounting_journal_lines: 'Chi tiết định khoản nhật ký chung',
  accounting_opening_balances: 'Số dư đầu kỳ tài khoản kế toán',
  admin_hr_items: 'Dữ liệu hành chính & thử việc nhân sự',
  advance_payments: 'Phiếu chi tạm ứng nhân viên',
  advance_settlements: 'Phiếu quyết toán hoàn ứng',
  bank_loan_drawdowns: 'Khế ước giải ngân vay ngân hàng',
  bank_loan_repayments: 'Lịch sử trả nợ vay ngân hàng',
  bank_loans: 'Hợp đồng tín dụng ngân hàng',
  calendar_events: 'Lịch sự kiện & lịch công tác',
  cash_and_bank_assets: 'Quỹ tiền mặt & tiền gửi ngân hàng',
  contracts: 'Hợp đồng tài chính – kinh tế',
  customers: 'Danh mục đối tác công nợ',
  debt_payables: 'Sổ chi tiết công nợ phải trả (TK 331)',
  debt_receivables: 'Sổ chi tiết công nợ phải thu (TK 131)',
  financial_expenses: 'Khoản mục chi phí tài chính',
  financial_initial_declarations: 'Khai báo số dư tài chính ban đầu',
  financial_vouchers: 'Chứng từ thu chi tài chính',
  fixed_asset_depreciations: 'Bảng trích khấu hao TSCĐ',
  fixed_asset_maintenances: 'Lịch sử bảo trì tài sản cố định',
  fixed_assets: 'Danh mục tài sản cố định',
  goods: 'Danh mục hàng hóa kế toán',
  monthly_payrolls: 'Bảng tổng hợp quỹ lương tháng',
  payment_orders: 'Ủy nhiệm chi & đề nghị thanh toán',
  quotations: 'Hồ sơ báo giá tài chính',
  recruitment_candidates: 'Danh sách ứng viên tuyển dụng',
  recruitment_interviews: 'Lịch phỏng vấn ứng viên',
  recruitment_requests: 'Đề xuất tuyển dụng nhân sự',
  system_settings: 'Cấu hình tham số hệ thống',
  training_courses: 'Chương trình đào tạo nội bộ',
  warehouse_movements: 'Thẻ kho & phiếu nhập xuất',
};

export const DataManagementPage: React.FC = () => {
  const { success, error } = useToast();

  const [backups, setBackups] = useState<BackupFileItem[]>([]);
  const [currentDb, setCurrentDb] = useState<CurrentDbInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [selectedBackup, setSelectedBackup] = useState<BackupFileItem | null>(null);
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<BackupConfigState>({
    autoBackupEnabled: true,
    scheduleFrequency: 'daily',
    backupTime: '02:00',
    autoCleanupEnabled: true,
    retentionDays: 30,
    maxBackups: 30,
    cleanupScope: 'auto_only',
  });

  // Offcanvas 400px chọn bảng dữ liệu cần thay thế
  const [restoreDrawerOpen, setRestoreDrawerOpen] = useState<boolean>(false);
  const [inspectingTables, setInspectingTables] = useState<boolean>(false);
  const [restoreTarget, setRestoreTarget] = useState<{
    filename: string;
    displayFilename?: string;
    isStaged?: boolean;
    size: string;
    tables: DbTableItem[];
  } | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [onlyNonEmptyTables, setOnlyNonEmptyTables] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: React.ReactNode;
    variant: ConfirmDialogVariant;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'Xác nhận',
    onConfirm: () => {},
  });

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/board/data');
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data.backups) ? data.backups : []);
        if (data.currentDb) {
          setCurrentDb(data.currentDb);
        }
        if (data.config) {
          setConfigForm({
            autoBackupEnabled: Boolean(data.config.autoBackupEnabled ?? true),
            scheduleFrequency: String(data.config.scheduleFrequency || 'daily'),
            backupTime: String(data.config.backupTime || '02:00'),
            autoCleanupEnabled: Boolean(data.config.autoCleanupEnabled ?? true),
            retentionDays: Number(data.config.retentionDays) || 30,
            maxBackups: Number(data.config.maxBackups) || 30,
            cleanupScope: String(data.config.cleanupScope || 'auto_only'),
          });
        }
      } else {
        error('Lỗi', 'Không thể lấy danh sách bản sao lưu dữ liệu');
      }
    } catch {
      error('Lỗi', 'Không thể kết nối máy chủ quản trị dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      const res = await fetch('/api/board/data/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        success('Đã lưu thiết lập', data.message || 'Đã cập nhật cấu hình tự động sao lưu và lưu trữ');
        setConfigOpen(false);
        await fetchBackups();
      } else {
        error('Lỗi', data.error || 'Không thể lưu cấu hình sao lưu');
      }
    } catch {
      error('Lỗi', 'Không thể kết nối máy chủ khi lưu thiết lập');
    } finally {
      setSavingConfig(false);
    }
  };

  const getBackupTypeMeta = (name: string) => {
    if (name.startsWith('before_restore_')) {
      return {
        code: 'SAFETY',
        label: 'Sao lưu dự phòng',
        desc: 'Tự động sao lưu dự phòng trước khi khôi phục dữ liệu',
        variant: 'warning' as const,
        icon: 'bi-shield-fill-check',
      };
    }
    if (name.startsWith('auto_')) {
      return {
        code: 'AUTO',
        label: 'Sao lưu tự động',
        desc: 'Tự động sao lưu định kỳ theo lịch hệ thống',
        variant: 'info' as const,
        icon: 'bi-robot',
      };
    }
    return {
      code: 'MANUAL',
      label: 'Sao lưu thủ công',
      desc: 'Bản sao lưu chủ động do Quản trị viên tạo',
      variant: 'success' as const,
      icon: 'bi-person-check-fill',
    };
  };

  const filteredBackups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return backups.filter((item) => {
      const meta = getBackupTypeMeta(item.name);
      if (typeFilter !== 'ALL' && meta.code !== typeFilter) return false;
      if (q && !item.name.toLowerCase().includes(q) && !meta.label.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [backups, searchQuery, typeFilter]);

  const paginatedBackups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBackups.slice(start, start + pageSize);
  }, [filteredBackups, page, pageSize]);

  // Danh sách bảng lọc trong Offcanvas 400px
  const filteredDbTables = useMemo(() => {
    if (!restoreTarget) return [];
    const q = tableSearchQuery.trim().toLowerCase();
    return restoreTarget.tables.filter((tbl) => {
      if (onlyNonEmptyTables && tbl.rowCount <= 0) return false;
      if (q) {
        const viLabel = (TABLE_VI_LABELS[tbl.name] || '').toLowerCase();
        if (!tbl.name.toLowerCase().includes(q) && !viLabel.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [restoreTarget, tableSearchQuery, onlyNonEmptyTables]);

  const handleCreateBackupClick = () => {
    setConfirmConfig({
      title: 'Tạo bản sao lưu dữ liệu mới',
      message: 'Hệ thống sẽ sao chép toàn bộ cơ sở dữ liệu hiện tại thành một file sao lưu (.db) an toàn.',
      variant: 'info',
      confirmText: 'Tạo sao lưu ngay',
      onConfirm: executeCreateBackup,
    });
    setConfirmOpen(true);
  };

  const executeCreateBackup = async () => {
    setConfirmOpen(false);
    try {
      setBusy(true);
      const res = await fetch('/api/board/data', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        success('Thành công', data.message || 'Đã tạo bản sao lưu dữ liệu mới');
        await fetchBackups();
      } else {
        error('Lỗi', data.error || 'Không thể tạo bản sao lưu');
      }
    } catch {
      error('Lỗi', 'Đã xảy ra lỗi khi tạo bản sao lưu');
    } finally {
      setBusy(false);
    }
  };

  // Mở Offcanvas 400px chọn bảng từ một file sao lưu có sẵn
  const handleRestoreClick = async (filename: string) => {
    try {
      setSelectedBackup(null);
      setRestoreDrawerOpen(true);
      setInspectingTables(true);
      setTableSearchQuery('');
      setOnlyNonEmptyTables(false);

      const res = await fetch(`/api/board/data/tables?filename=${encodeURIComponent(filename)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.tables)) {
        const tbls: DbTableItem[] = data.tables;
        setRestoreTarget({
          filename: data.filename || filename,
          size: data.size || '',
          tables: tbls,
        });
        setSelectedTables(new Set(tbls.map((t) => t.name)));
      } else {
        setRestoreDrawerOpen(false);
        error('Lỗi đọc file', data.error || 'Không thể đọc danh sách bảng từ file sao lưu');
      }
    } catch {
      setRestoreDrawerOpen(false);
      error('Lỗi', 'Không thể kết nối máy chủ để đọc danh sách bảng');
    } finally {
      setInspectingTables(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Khi người dùng chọn file .db từ máy: Tải file lên & mở ngay Offcanvas 400px chọn bảng cần thay thế
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.db') && !lower.endsWith('.sqlite') && !lower.endsWith('.sqlite3')) {
      error('Định dạng không hợp lệ', 'Chỉ hỗ trợ file cơ sở dữ liệu có đuôi .db');
      return;
    }

    try {
      setRestoreDrawerOpen(true);
      setInspectingTables(true);
      setTableSearchQuery('');
      setOnlyNonEmptyTables(false);
      setRestoreTarget(null);

      const res = await fetch(
        `/api/board/data/inspect-upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
          },
          body: file,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.tables)) {
        const tbls: DbTableItem[] = data.tables;
        setRestoreTarget({
          filename: data.filename || file.name,
          displayFilename: data.displayFilename || file.name,
          isStaged: true,
          size: data.size || `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          tables: tbls,
        });
        setSelectedTables(new Set(tbls.map((t) => t.name)));
      } else {
        setRestoreDrawerOpen(false);
        error('Lỗi tải file', data.error || 'Không thể đọc cấu trúc bảng của file .db');
      }
    } catch {
      setRestoreDrawerOpen(false);
      error('Lỗi hệ thống', 'Không thể tải file .db lên máy chủ');
    } finally {
      setInspectingTables(false);
    }
  };

  const handleCancelRestoreDrawer = () => {
    if (busy) return;
    if (restoreTarget?.isStaged && restoreTarget.filename) {
      fetch(`/api/board/data/staging?filename=${encodeURIComponent(restoreTarget.filename)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    setRestoreDrawerOpen(false);
    setRestoreTarget(null);
  };

  const executeRestoreSelectedTables = async () => {
    if (!restoreTarget) return;
    if (selectedTables.size === 0) {
      error('Chưa chọn bảng', 'Vui lòng chọn ít nhất 1 bảng dữ liệu để thay thế');
      return;
    }

    try {
      setBusy(true);
      const res = await fetch('/api/board/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: restoreTarget.filename,
          isStaged: Boolean(restoreTarget.isStaged),
          tables: Array.from(selectedTables),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRestoreDrawerOpen(false);
        setRestoreTarget(null);
        success(
          'Thay thế dữ liệu thành công',
          data.message || `Đã thay thế ${selectedTables.size} bảng dữ liệu. Đang tải lại...`
        );
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        error('Lỗi phục hồi', data.error || 'Không thể thay thế dữ liệu các bảng đã chọn');
        setBusy(false);
      }
    } catch {
      error('Lỗi', 'Đã xảy ra lỗi kết nối khi thay thế dữ liệu');
      setBusy(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (!restoreTarget) return;
    const targetList = filteredDbTables.map((t) => t.name);
    const allFilteredSelected =
      targetList.length > 0 && targetList.every((name) => selectedTables.has(name));

    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        targetList.forEach((name) => next.delete(name));
      } else {
        targetList.forEach((name) => next.add(name));
      }
      return next;
    });
  };

  const handleDeleteClick = (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmConfig({
      title: 'Xác nhận xóa bản sao lưu',
      message: `Bạn có chắc chắn muốn xóa file sao lưu "${filename}" khỏi máy chủ?`,
      variant: 'danger',
      confirmText: 'Xóa bản sao lưu',
      onConfirm: () => executeDelete(filename),
    });
    setConfirmOpen(true);
  };

  const executeDelete = async (filename: string) => {
    setConfirmOpen(false);
    try {
      const res = await fetch(`/api/board/data?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success('Đã xóa', `Đã xóa bản sao lưu ${filename}`);
        setBackups((prev) => prev.filter((b) => b.name !== filename));
        if (selectedBackup?.name === filename) {
          setSelectedBackup(null);
        }
      } else {
        error('Lỗi', 'Không thể xóa bản sao lưu');
      }
    } catch {
      error('Lỗi', 'Đã xảy ra lỗi khi xóa bản sao lưu');
    }
  };

  const handleDownloadFile = (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/board/data?download=${encodeURIComponent(filename)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allFilteredSelected =
    filteredDbTables.length > 0 && filteredDbTables.every((t) => selectedTables.has(t.name));

  return (
    <StandardPage
      title="Quản trị dữ liệu"
      description="Quản lý bản sao lưu an toàn, tải lên file .db và thay thế cơ sở dữ liệu toàn hệ thống Seajong"
      icon="bi-database-lock"
      color="indigo"
      badge="DỮ LIỆU HỆ THỐNG"
      hideTicker={true}
    >
      {/* Hidden File Input for .db Upload */}
      <input
        type="file"
        accept=".db,.sqlite,.sqlite3"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TableToolbar chuẩn dự án */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm theo tên file sao lưu (.db)..."
        filters={[
          {
            id: 'backup-type-filter',
            value: typeFilter,
            onChange: (val) => {
              setTypeFilter(val);
              setPage(1);
            },
            minWidth: '175px',
            options: [
              { value: 'ALL', label: 'Tất cả phân loại' },
              { value: 'MANUAL', label: 'Sao lưu thủ công' },
              { value: 'SAFETY', label: 'Sao lưu dự phòng' },
              { value: 'AUTO', label: 'Sao lưu tự động' },
            ],
          },
        ]}
        rightActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<i className="bi bi-cloud-arrow-up" />}
              onClick={handleCreateBackupClick}
              isLoading={busy}
              disabled={busy}
            >
              Tạo bản sao
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<i className="bi bi-cloud-upload" />}
              onClick={handleUploadClick}
              disabled={busy || inspectingTables}
            >
              Khôi phục dữ liệu
            </Button>
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              title="Thiết lập tự động sao lưu & lưu trữ"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--border-default, #e2e8f0)',
                backgroundColor: configOpen ? 'var(--bg-surface-2, #f1f5f9)' : 'var(--bg-surface-1, #ffffff)',
                color: 'var(--text-secondary, #475569)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              className="hover:bg-slate-100 hover:text-indigo-600"
            >
              <i className="bi bi-gear text-[15px]" />
            </button>
          </div>
        }
        showMenu={false}
      />

      {/* Bảng danh sách bản sao lưu chuẩn FullWidthTable */}
      <FullWidthTable loading={loading}>
        <table
          className="custom-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.8125rem',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--bg-surface-2, #f8fafc)',
            }}
          >
            <tr
              style={{
                backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                borderBottom: '1px solid var(--border-default, #e2e8f0)',
                color: 'var(--text-secondary, #64748b)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <th style={{ padding: '10px 12px', width: '56px', textAlign: 'center' }}>STT</th>
              <th style={{ padding: '10px 14px' }}>TÊN FILE SAO LƯU (.DB)</th>
              <th style={{ padding: '10px 12px', width: '190px' }}>PHÂN LOẠI</th>
              <th style={{ padding: '10px 12px', width: '130px', textAlign: 'right' }}>DUNG LƯỢNG</th>
              <th style={{ padding: '10px 12px', width: '180px', textAlign: 'center' }}>THỜI GIAN TẠO</th>
              <th style={{ padding: '10px 14px', width: '230px', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBackups.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}
                >
                  Chưa có bản sao lưu nào. Hãy bấm &ldquo;Tạo bản sao&rdquo; hoặc &ldquo;Khôi phục dữ liệu&rdquo;.
                </td>
              </tr>
            ) : (
              paginatedBackups.map((item, idx) => {
                const stt = (page - 1) * pageSize + idx + 1;
                const meta = getBackupTypeMeta(item.name);
                const isSelected = selectedBackup?.name === item.name;

                return (
                  <tr
                    key={item.name}
                    onClick={() => setSelectedBackup(item)}
                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/90'
                    }`}
                    title="Nhấn vào dòng để xem chi tiết hoặc phục hồi bản sao lưu"
                  >
                    <td className="px-3 py-2.5 text-center text-xs font-mono text-slate-400">{stt}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <i className="bi bi-database-fill-check text-sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 font-mono truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{meta.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={meta.variant}>
                        <i className={`bi ${meta.icon} mr-1`} />
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.size}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-mono text-slate-600">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3.5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<i className="bi bi-download" />}
                          onClick={(e) => handleDownloadFile(item.name, e)}
                          title="Tải file .db về máy"
                        >
                          Tải về
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<i className="bi bi-arrow-counterclockwise" />}
                          onClick={() => handleRestoreClick(item.name)}
                          disabled={busy || inspectingTables}
                          title="Chọn bảng dữ liệu để thay thế từ bản sao lưu này"
                        >
                          Phục hồi
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(item.name, e)}
                          disabled={busy}
                          className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                          title="Xóa bản sao lưu"
                        >
                          <i className="bi bi-trash text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </FullWidthTable>

      {/* Phân trang chuẩn dự án */}
      <Pagination
        currentPage={page}
        totalItems={filteredBackups.length}
        pageSize={pageSize}
        itemName="bản sao lưu"
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      {/* Offcanvas 400px hiển thị danh sách các bảng trong DB để chọn thay thế */}
      <Offcanvas
        isOpen={restoreDrawerOpen}
        onClose={handleCancelRestoreDrawer}
        title="Chọn bảng dữ liệu thay thế"
        width="400px"
        confirmText={
          restoreTarget
            ? `Thay thế (${selectedTables.size}/${restoreTarget.tables.length})`
            : 'Thay thế dữ liệu'
        }
        cancelText="Hủy bỏ"
        onConfirm={executeRestoreSelectedTables}
        onCancel={handleCancelRestoreDrawer}
        isSubmitting={busy}
        confirmDisabled={busy || inspectingTables || selectedTables.size === 0}
      >
        {inspectingTables ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2.5">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <div className="text-xs font-semibold text-slate-700">
              Đang phân tích danh sách bảng trong file (.db)...
            </div>
          </div>
        ) : restoreTarget ? (
          <div className="flex flex-col gap-3 text-xs">
            {/* Thông tin file nguồn */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">File cơ sở dữ liệu nguồn</div>
                <div className="font-mono font-bold text-slate-900 truncate mt-0.5">
                  {restoreTarget.displayFilename || restoreTarget.filename}
                </div>
              </div>
              <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                {restoreTarget.size}
              </span>
            </div>

            {/* Tìm kiếm bảng & Chọn tất cả */}
            <div className="space-y-2">
              <Input
                type="text"
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Tìm tên bảng (VD: Employee, Attendance, SaleOrder...)"
              />

              <div className="flex items-center justify-between px-1 pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAllFiltered}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                  <span>
                    Chọn tất cả ({selectedTables.size}/{restoreTarget.tables.length} bảng)
                  </span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={onlyNonEmptyTables}
                    onChange={(e) => setOnlyNonEmptyTables(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                  />
                  <span>Chỉ bảng có dữ liệu</span>
                </label>
              </div>
            </div>

            {/* Danh sách các bảng trong DB */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[calc(100vh-310px)] overflow-y-auto bg-white">
              {filteredDbTables.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Không tìm thấy bảng dữ liệu phù hợp
                </div>
              ) : (
                filteredDbTables.map((tbl) => {
                  const isChecked = selectedTables.has(tbl.name);
                  const viDesc = TABLE_VI_LABELS[tbl.name];
                  const isReady = tbl.isReady !== false && Boolean(viDesc);

                  return (
                    <label
                      key={tbl.name}
                      className={`flex items-center justify-between gap-2.5 px-3 py-2 cursor-pointer transition-colors select-none ${
                        isChecked ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTableSelection(tbl.name)}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-slate-800 truncate text-xs">
                            {tbl.name}
                          </div>
                          {isReady ? (
                            <div className="text-[11px] text-slate-500 truncate">{viDesc}</div>
                          ) : (
                            <div className="text-[11px] font-medium text-rose-500 truncate">
                              Chưa sẵn sàng
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${
                          tbl.rowCount > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {tbl.rowCount.toLocaleString('vi-VN')} dòng
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </Offcanvas>

      {/* Offcanvas 400px thiết lập thời gian tự động sao lưu & lưu trữ tự động xóa */}
      <Offcanvas
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Thiết lập sao lưu & lưu trữ"
        width="400px"
        confirmText="Lưu thiết lập"
        cancelText="Đóng"
        onConfirm={handleSaveConfig}
        isSubmitting={savingConfig}
        confirmDisabled={savingConfig}
      >
        <div className="space-y-4 text-xs">
          {/* Khối 1: Lịch tự động sao lưu */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-[13px]">Tự động sao lưu định kỳ</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tạo bản sao lưu cơ sở dữ liệu theo lịch
                </div>
              </div>
              <input
                type="checkbox"
                checked={configForm.autoBackupEnabled}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, autoBackupEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chu kỳ sao lưu
                </label>
                <Select
                  value={configForm.scheduleFrequency}
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, scheduleFrequency: e.target.value }))
                  }
                  disabled={!configForm.autoBackupEnabled}
                  options={[
                    { value: 'daily', label: 'Hằng ngày' },
                    { value: '6h', label: 'Mỗi 6 giờ' },
                    { value: '12h', label: 'Mỗi 12 giờ' },
                    { value: 'weekly', label: 'Hằng tuần (Thứ 2)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Thời điểm sao lưu
                </label>
                <Input
                  type="time"
                  value={configForm.backupTime}
                  disabled={
                    !configForm.autoBackupEnabled ||
                    configForm.scheduleFrequency === '6h' ||
                    configForm.scheduleFrequency === '12h'
                  }
                  onChange={(e) =>
                    setConfigForm((prev) => ({ ...prev, backupTime: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Khối 2: Thời gian lưu trữ & Tự động xóa */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-[13px]">Tự động xóa bản sao lưu cũ</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Giải phóng dung lượng theo thời hạn lưu trữ
                </div>
              </div>
              <input
                type="checkbox"
                checked={configForm.autoCleanupEnabled}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, autoCleanupEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Thời gian lưu trữ
                </label>
                <Select
                  value={String(configForm.retentionDays)}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      retentionDays: Number(e.target.value) || 30,
                    }))
                  }
                  disabled={!configForm.autoCleanupEnabled}
                  options={[
                    { value: '7', label: '7 ngày' },
                    { value: '14', label: '14 ngày' },
                    { value: '30', label: '30 ngày' },
                    { value: '60', label: '60 ngày' },
                    { value: '90', label: '90 ngày' },
                    { value: '180', label: '180 ngày' },
                    { value: '365', label: '365 ngày' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Số bản lưu tối đa
                </label>
                <Select
                  value={String(configForm.maxBackups)}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      maxBackups: Number(e.target.value) || 30,
                    }))
                  }
                  disabled={!configForm.autoCleanupEnabled}
                  options={[
                    { value: '10', label: 'Tối đa 10 bản' },
                    { value: '20', label: 'Tối đa 20 bản' },
                    { value: '30', label: 'Tối đa 30 bản' },
                    { value: '50', label: 'Tối đa 50 bản' },
                    { value: '100', label: 'Tối đa 100 bản' },
                  ]}
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Phạm vi tự động xóa
              </label>
              <Select
                value={configForm.cleanupScope}
                onChange={(e) =>
                  setConfigForm((prev) => ({ ...prev, cleanupScope: e.target.value }))
                }
                disabled={!configForm.autoCleanupEnabled}
                options={[
                  { value: 'auto_only', label: 'Bản sao lưu tự động & trước phục hồi' },
                  { value: 'all', label: 'Tất cả bản sao lưu vượt thời hạn' },
                ]}
              />
            </div>
          </div>

          {/* Chỉ số kiểm soát ngắn gọn */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">Tổng bản sao lưu</div>
              <div className="font-bold text-slate-800 mt-0.5">{backups.length} file (.db)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">Dung lượng DB hiện tại</div>
              <div className="font-bold text-indigo-600 mt-0.5">{currentDb?.size || '—'}</div>
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* Offcanvas 400px chi tiết bản sao lưu khi nhấn vào dòng */}
      <Offcanvas
        isOpen={Boolean(selectedBackup)}
        onClose={() => setSelectedBackup(null)}
        title="Chi tiết bản sao lưu (.db)"
        width="400px"
        confirmText="Chọn bảng thay thế"
        cancelText="Đóng"
        onConfirm={
          selectedBackup
            ? () => {
                handleRestoreClick(selectedBackup.name);
              }
            : undefined
        }
        confirmDisabled={busy || inspectingTables}
      >
        {selectedBackup && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div>
                <div className="text-[11px] text-slate-400">Tên file cơ sở dữ liệu</div>
                <div className="font-mono font-bold text-slate-900 break-all mt-0.5">
                  {selectedBackup.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                <div>
                  <div className="text-[11px] text-slate-400">Dung lượng</div>
                  <div className="font-mono font-bold text-indigo-600 mt-0.5">{selectedBackup.size}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Thời gian lưu</div>
                  <div className="font-mono font-semibold text-slate-700 mt-0.5">
                    {new Date(selectedBackup.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Phân loại</span>
                <Badge variant={getBackupTypeMeta(selectedBackup.name).variant}>
                  {getBackupTypeMeta(selectedBackup.name).label}
                </Badge>
              </div>
            </div>

            {currentDb?.counts && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Chỉ số cơ sở dữ liệu hiện hành</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-400">Nhân sự</div>
                    <div className="font-bold text-slate-800">{currentDb.counts.employees} hồ sơ</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-400">Tài khoản</div>
                    <div className="font-bold text-slate-800">{currentDb.counts.users} user</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-400">Bản ghi chấm công</div>
                    <div className="font-bold text-slate-800">{currentDb.counts.attendances} dòng</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-[11px] text-slate-400">Yêu cầu cá nhân</div>
                    <div className="font-bold text-slate-800">{currentDb.counts.personalRequests} đơn</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                leftIcon={<i className="bi bi-download" />}
                onClick={() => handleDownloadFile(selectedBackup.name)}
              >
                Tải file .db về máy
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<i className="bi bi-trash" />}
                onClick={() => handleDeleteClick(selectedBackup.name)}
              >
                Xóa
              </Button>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* Hộp thoại xác nhận tạo / xóa sao lưu */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        confirmText={confirmConfig.confirmText}
        cancelText="Hủy bỏ"
        loading={busy}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </StandardPage>
  );
};

export default DataManagementPage;
