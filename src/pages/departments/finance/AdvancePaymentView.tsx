import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle,
  XCircle,
  CashCoin,
  Building,
  CreditCard,
  Cash,
  ClockHistory,
  CheckLg,
  XLg,
  FileEarmarkSpreadsheet,
  FileEarmarkPlus,
  FileEarmarkText,
  Send,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { TableToolbar, type TableToolbarFilter } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { DataRetentionOffcanvas } from '../../../components/common/DataRetentionOffcanvas';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import {
  useDepartmentOptions,
  matchDepartment,
} from '../../../components/common/DepartmentSelect';
import { useFinanceRealtimeSync, notifyFinanceUpdated } from '../../../services/financeSyncService';

export interface AdvancePaymentItem {
  id: string;
  code: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  purpose: string;
  project?: string;
  amount: number;
  approvedAmount?: number;
  requestedDate: string;
  paymentMethod: 'bank_transfer' | 'cash';
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  reviewStatus?: 'unprocessed' | 'in_review' | 'approved' | 'disbursed' | 'rejected';
  approver?: string;
  approvedDate?: string;
  rejectReason?: string;
  rejectedDate?: string;
  deadlineRefund: string;
  note?: string;
  attachedDocsCount?: number;
}

export interface AdvancePaymentViewProps {
  currentStep: number;
  onStepChange?: (step: number) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

// Dữ liệu mẫu thực tế của Seajong
const INITIAL_ADVANCE_PAYMENTS: AdvancePaymentItem[] = [];

// Định dạng tiền tệ VND
const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

// Định dạng phân cách hàng nghìn bằng dấu chấm
const formatNumberGroup = (val: string | number): string => {
  const numStr = String(val ?? '').replace(/[^0-9]/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('vi-VN');
};

const getDefaultDeadlineVN = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const AdvancePaymentView: React.FC<AdvancePaymentViewProps> = ({
  currentStep,
  onStepChange,
  onShowToast,
  user,
}) => {
  // Danh sách dữ liệu chính nạp từ DB
  const [payments, setPayments] = useState<AdvancePaymentItem[]>(INITIAL_ADVANCE_PAYMENTS);
  const [isLoading, setIsLoading] = useState(false);

  // Danh sách nhân sự thực tế từ DB để chọn Người phê duyệt
  const [dbApproverGroups, setDbApproverGroups] = useState<
    Array<{ group: string; options: Array<{ label: string; value: string }> }>
  >([]);

  React.useEffect(() => {
    fetch('/api/hr/employees?pageSize=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const emps = Array.isArray(res?.employees) ? res.employees : [];
        const activeEmps = emps.filter(
          (e: any) => String(e.status || '').toLowerCase() !== 'resigned' && String(e.profileStatus || '').toLowerCase() !== 'resigned'
        );

        const boardOpts: Array<{ label: string; value: string }> = [];
        const financeOpts: Array<{ label: string; value: string }> = [];
        const managerOpts: Array<{ label: string; value: string }> = [];

        const leaderKeywords = ['giám đốc', 'trưởng phòng', 'trưởng bộ phận', 'quản đốc', 'thủ kho', 'kế toán'];

        activeEmps.forEach((e: any) => {
          const name = String(e.fullName || '').trim();
          if (!name) return;
          const deptCode = String(e.departmentCode || '').toLowerCase();
          const deptName = String(e.departmentName || 'Phòng ban').trim();
          const posTitle = String(e.positionTitle || e.position || '').trim();
          const posLower = posTitle.toLowerCase();
          const val = `${name} - ${deptName}`;
          const label = posTitle && posTitle !== '—' ? `${name} (${posTitle} - ${deptName})` : val;

          if (deptCode === 'board' || deptName.toLowerCase().includes('giám đốc')) {
            boardOpts.push({ label, value: val });
          } else if (
            deptCode === 'finance' ||
            deptCode === 'accounting' ||
            deptName.toLowerCase().includes('kế toán') ||
            deptName.toLowerCase().includes('tài chính')
          ) {
            financeOpts.push({ label, value: val });
          } else if (leaderKeywords.some((kw) => posLower.includes(kw))) {
            managerOpts.push({ label, value: val });
          }
        });

        const groups: Array<{ group: string; options: Array<{ label: string; value: string }> }> = [];
        if (boardOpts.length > 0) {
          groups.push({ group: 'Ban Giám đốc (Dữ liệu thực tế DB)', options: boardOpts });
        }
        if (financeOpts.length > 0) {
          groups.push({ group: 'Phòng Tài chính – Kế toán (Dữ liệu thực tế DB)', options: financeOpts });
        }
        if (managerOpts.length > 0) {
          groups.push({ group: 'Trưởng / Quản lý các bộ phận (Dữ liệu thực tế DB)', options: managerOpts });
        }

        setDbApproverGroups(groups);
        const firstOpt = groups[0]?.options?.[0]?.value;
        if (firstOpt) {
          setNewApprover(firstOpt);
        }
      })
      .catch(() => { });
  }, []);

  // Tải dữ liệu tạm ứng từ Database (hỗ trợ làm mới ngầm thời gian thực không giật loading)
  const fetchPayments = React.useCallback(async (silent = false, retryCount = 0) => {
    if (!silent) setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch('/api/advance-payments', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      window.clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      } else if (retryCount < 2) {
        window.setTimeout(() => fetchPayments(silent, retryCount + 1), 800);
        return;
      }
    } catch (e) {
      window.clearTimeout(timeoutId);
      if (retryCount < 2) {
        window.setTimeout(() => fetchPayments(silent, retryCount + 1), 800);
        return;
      }
      console.error('Lỗi nạp dữ liệu tạm ứng:', e);
    } finally {
      window.clearTimeout(timeoutId);
      if (!silent) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPayments(false);
  }, [fetchPayments]);

  // Đồng bộ tự động thời gian thực (BroadcastChannel, CustomEvent, Storage & Polling)
  useFinanceRealtimeSync(() => {
    fetchPayments(true);
  }, true);

  // Bộ lọc và tìm kiếm cho TableToolbar
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const { options: deptOptions } = useDepartmentOptions({ includeAll: true });
  const [selectedReviewStatus, setSelectedReviewStatus] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State Offcanvas xem chi tiết phiếu
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);
  const [approvedAmountStr, setApprovedAmountStr] = useState<string>('');
  const [isSubmittingDirector, setIsSubmittingDirector] = useState(false);

  React.useEffect(() => {
    if (selectedPayment) {
      setApprovedAmountStr(String(selectedPayment.amount || 0));
    }
  }, [selectedPayment?.id, selectedPayment?.amount]);

  // State Offcanvas Thiết lập xoá (dọn dẹp dữ liệu quá hạn)
  const [isCleanupOffcanvasOpen, setIsCleanupOffcanvasOpen] = useState(false);

  // Định mức tạm ứng theo quy định trong Nội quy lao động (mặc định 3.000.000 đ)
  const [advanceLimit, setAdvanceLimit] = useState<number>(3000000);
  const [isAutoApproveEnabled, setIsAutoApproveEnabled] = useState<boolean>(true);

  React.useEffect(() => {
    const loadLaborAdvanceLimit = () => {
      const savedAuto = localStorage.getItem('seajong_accounting_auto_enabled');
      if (savedAuto !== null) {
        setIsAutoApproveEnabled(savedAuto !== 'false');
      }

      fetch('/api/system-settings')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.accounting_auto_enabled !== undefined) {
            setIsAutoApproveEnabled(Boolean(data.accounting_auto_enabled));
          }
          if (data && Number(data.accounting_emergency_advance) > 0) {
            const dbLimit = Number(data.accounting_emergency_advance);
            setAdvanceLimit(dbLimit);
            localStorage.setItem('seajong_accounting_emergency_advance', String(dbLimit));
          } else {
            const localVal = Number(localStorage.getItem('seajong_accounting_emergency_advance') || 0);
            if (localVal > 0 && localVal !== 5000000) {
              setAdvanceLimit(localVal);
            } else {
              setAdvanceLimit(3000000);
            }
          }
        })
        .catch(() => {
          const localVal = Number(localStorage.getItem('seajong_accounting_emergency_advance') || 0);
          if (localVal > 0 && localVal !== 5000000) {
            setAdvanceLimit(localVal);
          }
        });
    };

    loadLaborAdvanceLimit();

    const handleSettingsSaved = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        if (customEvt.detail.accountingAutoEnabled !== undefined) {
          setIsAutoApproveEnabled(Boolean(customEvt.detail.accountingAutoEnabled));
        }
        if (Number(customEvt.detail.accountingEmergencyAdvance) > 0) {
          setAdvanceLimit(Number(customEvt.detail.accountingEmergencyAdvance));
        }
      } else {
        loadLaborAdvanceLimit();
      }
    };

    window.addEventListener('seajong_settings_saved', handleSettingsSaved);
    return () => window.removeEventListener('seajong_settings_saved', handleSettingsSaved);
  }, []);

  // State Offcanvas tạo mới phiếu tạm ứng (đồng bộ với Tạo yêu cầu cá nhân)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [newAmount, setNewAmount] = useState<string>('5000000');
  const [deductFromSalary, setDeductFromSalary] = useState<boolean>(true);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer');
  const [newBankName, setNewBankName] = useState('Techcombank Đà Nẵng');
  const [newBankAccount, setNewBankAccount] = useState('19033458992011');
  const [newDeadline, setNewDeadline] = useState<string>(() => getDefaultDeadlineVN());
  const [newApprover, setNewApprover] = useState<string>('Lê Công Vụ - Ban Giám đốc');
  const [newNote, setNewNote] = useState('');

  // Xác định danh sách theo bước hiện tại
  const stepStatus = useMemo(() => {
    switch (currentStep) {
      case 1:
        return 'pending';
      case 2:
        return 'approved';
      case 3:
        return 'rejected';
      default:
        return 'pending';
    }
  }, [currentStep]);

  // Lọc dữ liệu theo bước, từ khóa, bộ phận, trạng thái xử lý (ưu tiên xếp phiếu chờ duyệt lên đầu ở Bước 1)
  const filteredPayments = useMemo(() => {
    const filtered = payments.filter((item) => {
      if (currentStep === 2 && item.status !== 'approved') return false;
      if (currentStep === 3 && item.status !== 'rejected') return false;

      // Lọc theo trạng thái ở bước 1
      if (currentStep === 1 && selectedReviewStatus !== 'all') {
        if (selectedReviewStatus === 'pending' && item.status !== 'pending') return false;
        if (selectedReviewStatus === 'approved' && item.status !== 'approved') return false;
        if (selectedReviewStatus === 'rejected' && item.status !== 'rejected') return false;
        if (
          (selectedReviewStatus === 'unprocessed' || selectedReviewStatus === 'in_review') &&
          (item.status !== 'pending' || item.reviewStatus !== selectedReviewStatus)
        ) {
          return false;
        }
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchEmp = item.employeeName.toLowerCase().includes(q);
        const matchPurpose = item.purpose.toLowerCase().includes(q);
        const matchProject = item.project?.toLowerCase().includes(q);
        if (!matchCode && !matchEmp && !matchPurpose && !matchProject) return false;
      }

      // Lọc theo phòng ban
      if (selectedDept !== 'all' && !matchDepartment(item.department, selectedDept)) return false;

      // Lọc theo hình thức chi
      if (selectedPaymentMethod !== 'all' && item.paymentMethod !== selectedPaymentMethod) return false;

      return true;
    });

    if (currentStep === 1) {
      const orderMap: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
      return [...filtered].sort((a, b) => (orderMap[a.status] ?? 9) - (orderMap[b.status] ?? 9));
    }
    return filtered;
  }, [payments, searchQuery, selectedDept, selectedReviewStatus, selectedPaymentMethod, currentStep]);

  // Dữ liệu phân trang
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  // Bộ lọc cho TableToolbar
  const toolbarFilters: TableToolbarFilter[] = useMemo(() => {
    const filters: TableToolbarFilter[] = [
      {
        id: 'dept-filter',
        value: selectedDept,
        onChange: (val) => {
          setSelectedDept(val);
          setCurrentPage(1);
        },
        minWidth: '175px',
        options: deptOptions,
      },
    ];

    if (currentStep === 1) {
      filters.push({
        id: 'status-filter',
        value: selectedReviewStatus,
        onChange: (val) => {
          setSelectedReviewStatus(val);
          setCurrentPage(1);
        },
        minWidth: '175px',
        options: [
          { value: 'all', label: 'Tất cả trạng thái' },
          { value: 'pending', label: 'Chờ phê duyệt' },
          { value: 'approved', label: 'Đã phê duyệt' },
          { value: 'rejected', label: 'Đã từ chối' },
        ],
      });
    }

    if (currentStep === 2) {
      filters.push({
        id: 'method-filter',
        value: selectedPaymentMethod,
        onChange: (val) => {
          setSelectedPaymentMethod(val);
          setCurrentPage(1);
        },
        minWidth: '165px',
        options: [
          { value: 'all', label: 'Tất cả hình thức' },
          { value: 'bank_transfer', label: 'Chuyển khoản' },
          { value: 'cash', label: 'Tiền mặt' },
        ],
      });
    }

    return filters;
  }, [selectedDept, selectedReviewStatus, selectedPaymentMethod, currentStep, deptOptions]);

  // Hành động Phê duyệt
  const handleApprove = async (item: AdvancePaymentItem, customAmount?: number) => {
    const approverName = user?.name ? `${user.name} (Phê duyệt)` : 'Lê Công Vụ (Ban Giám Đốc)';
    const d = new Date();
    const today = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const finalAmount = customAmount && customAmount > 0 ? customAmount : item.amount;

    try {
      const res = await fetch(`/api/advance-payments/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          approvedAmount: finalAmount,
          approver: approverName,
          approvedDate: today,
        }),
      });

      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                ...p,
                status: 'approved',
                approvedAmount: finalAmount,
                approver: approverName,
                approvedDate: today,
              }
              : p
          )
        );
        notifyFinanceUpdated('advance_payments', 'update');
        notifyFinanceUpdated('payment_orders', 'create');
        window.dispatchEvent(new CustomEvent('seajong_payment_orders_updated'));
        window.dispatchEvent(new CustomEvent('seajong_cashflow_updated'));
        onShowToast?.(
          'success',
          'Đã duyệt tạm ứng & sinh Lệnh chi tiền',
          `Phiếu ${item.code} đã được duyệt với số tiền ${formatVND(finalAmount)} và tự động sinh Lệnh chi tiền trên Trang Tổng quan.`
        );
      } else {
        onShowToast?.('error', 'Lỗi', 'Không thể duyệt phiếu tạm ứng trên hệ thống.');
      }
    } catch (e) {
      onShowToast?.('error', 'Lỗi mạng', 'Không thể kết nối đến máy chủ.');
    }

    if (selectedPayment?.id === item.id) {
      setSelectedPayment(null);
    }
  };

  // Hành động Từ chối
  const handleReject = async (item: AdvancePaymentItem, reason?: string) => {
    const finalReason = reason || 'Hồ sơ tạm ứng chưa cung cấp đủ dự toán chi tiết hoặc hóa đơn đính kèm';
    const approverName = user?.name ? `${user.name} (Từ chối)` : 'Phạm Thanh Thảo (Kế toán trưởng)';
    const d = new Date();
    const today = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    try {
      const res = await fetch(`/api/advance-payments/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          approver: approverName,
          rejectedDate: today,
          rejectReason: finalReason,
        }),
      });

      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                ...p,
                status: 'rejected',
                approver: approverName,
                rejectedDate: today,
                rejectReason: finalReason,
              }
              : p
          )
        );
        notifyFinanceUpdated('advance_payments', 'update');
        onShowToast?.('warning', 'Từ chối tạm ứng', `Đã từ chối phiếu ${item.code}. Lý do: ${finalReason}`);
      } else {
        onShowToast?.('error', 'Lỗi', 'Không thể từ chối phiếu tạm ứng trên hệ thống.');
      }
    } catch (e) {
      onShowToast?.('error', 'Lỗi mạng', 'Không thể kết nối đến máy chủ.');
    }

    if (selectedPayment?.id === item.id) {
      setSelectedPayment(null);
    }
  };

  // Hành động Trình Giám đốc phê duyệt (khi số tiền vượt mức quy định trong Nội quy lao động)
  const handleSubmitToDirector = async (item: AdvancePaymentItem) => {
    setIsSubmittingDirector(true);
    const submitterName = user?.name || 'Bộ phận Kế toán';
    try {
      const res = await fetch(`/api/advance-payments/${item.id}/submit-director`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: item.code,
          employeeName: item.employeeName,
          employeeCode: item.employeeCode,
          department: item.department,
          purpose: item.purpose,
          project: item.project,
          amount: item.amount,
          requestedDate: item.requestedDate,
          deadlineRefund: item.deadlineRefund,
          paymentMethod: item.paymentMethod,
          bankInfo: item.bankInfo,
          note: item.note,
          limitAmount: advanceLimit,
          submittedBy: submitterName,
        }),
      });

      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                ...p,
                reviewStatus: 'in_review',
                approver: 'Lê Công Vụ - Ban Giám đốc',
              }
              : p
          )
        );
        notifyFinanceUpdated('advance_payments', 'update');
        window.dispatchEvent(new CustomEvent('seajong_approval_documents_updated'));
        window.dispatchEvent(new CustomEvent('seajong_notifications_updated'));
        onShowToast?.(
          'info',
          'Đã trình Giám đốc phê duyệt',
          `Phiếu ${item.code} (${formatVND(item.amount)}) vượt mức quy định (${formatVND(advanceLimit)}) đã được gửi thông tin và thông báo tới Giám đốc.`
        );
        setSelectedPayment(null);
      } else {
        onShowToast?.('error', 'Lỗi', 'Không thể gửi trình phê duyệt lên Giám đốc.');
      }
    } catch {
      onShowToast?.('error', 'Lỗi mạng', 'Không thể kết nối đến máy chủ.');
    } finally {
      setIsSubmittingDirector(false);
    }
  };

  // Tạo mới phiếu tạm ứng
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(String(newAmount).replace(/[^0-9]/g, '')) || 0;
    if (!newPurpose.trim() || numericAmount <= 0) {
      onShowToast?.('error', 'Thiếu thông tin', 'Vui lòng nhập mục đích và số tiền tạm ứng hợp lệ.');
      return;
    }

    const nextIndex = payments.length + 1;
    const newCode = `YC-${new Date().getFullYear()}-${String(100 + nextIndex)}`;
    const now = new Date();
    const todayVN = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const deadlineParts = String(newDeadline || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (deadlineParts) {
      const deadMs = new Date(
        Number(deadlineParts[3]),
        Number(deadlineParts[2]) - 1,
        Number(deadlineParts[1])
      ).getTime();
      if (deadMs < todayMidnight) {
        onShowToast?.(
          'error',
          'Ngày hoàn ứng không hợp lệ',
          'Hạn hoàn ứng dự kiến không được nhỏ hơn ngày yêu cầu tạm ứng.'
        );
        return;
      }
    }

    const newItemPayload = {
      code: newCode,
      employeeName: user?.name || 'Lê Công Vụ',
      employeeCode: user?.employeeCode || 'NV-2026-01',
      department: user?.departmentName || user?.department || 'Phòng Tài chính - Kế toán',
      purpose: newPurpose.trim(),
      project: deductFromSalary ? 'Trừ tạm ứng vào lương' : '',
      amount: numericAmount,
      requestedDate: todayVN,
      paymentMethod: newPaymentMethod,
      bankInfo:
        newPaymentMethod === 'bank_transfer'
          ? {
            bankName: newBankName || 'Techcombank Đà Nẵng',
            accountNumber: newBankAccount || '19033458992011',
            accountName: (user?.name || 'LE CONG VU').toUpperCase(),
          }
          : undefined,
      status: 'pending',
      reviewStatus: 'unprocessed',
      approver: newApprover,
      deadlineRefund: newDeadline || getDefaultDeadlineVN(),
      note: newNote.trim(),
      attachedDocsCount: 1,
    };

    try {
      const res = await fetch('/api/advance-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemPayload),
      });

      if (res.ok) {
        const created = await res.json();
        setPayments((prev) => [created, ...prev]);
        notifyFinanceUpdated('advance_payments', 'create');
        setIsCreateModalOpen(false);

        // Reset form
        setNewPurpose('');
        setNewAmount('5000000');
        setNewNote('');
        setNewDeadline(getDefaultDeadlineVN());

        onShowToast?.('success', 'Tạo yêu cầu thành công', `Đã lưu phiếu tạm ứng ${newCode} vào cơ sở dữ liệu.`);

        if (currentStep !== 1 && onStepChange) {
          onStepChange(1);
        }
      } else {
        onShowToast?.('error', 'Lỗi', 'Không thể lưu phiếu tạm ứng vào CSDL.');
      }
    } catch (e) {
      onShowToast?.('error', 'Lỗi mạng', 'Không thể kết nối đến máy chủ.');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 1. Component TableToolbar */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        searchPlaceholder={
          currentStep === 1
            ? 'Tìm mã phiếu, người đề xuất, nội dung tạm ứng...'
            : currentStep === 2
              ? 'Tìm phiếu tạm ứng đã duyệt, dự án, người duyệt...'
              : 'Tìm phiếu tạm ứng bị từ chối, lý do...'
        }
        searchMinWidth="240px"
        filters={toolbarFilters}
        menuItems={[
          {
            id: 'cleanup-settings',
            label: 'Thiết lập xoá',
            icon: <ClockHistory size={15} style={{ color: '#d97706' }} />,
            onClick: () => setIsCleanupOffcanvasOpen(true),
          },
        ]}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {currentStep === 2 && (
              <Button
                variant="outline"
                size="sm"
                className="!hidden sm:!inline-flex"
                leftIcon={<FileEarmarkSpreadsheet size={14} />}
                onClick={() => {
                  onShowToast?.('info', 'Xuất báo cáo', 'Đang tải về danh sách các khoản tạm ứng đã phê duyệt (Excel).');
                }}
                style={{ fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Xuất Excel
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={15} />}
              onClick={() => setIsCreateModalOpen(true)}
              style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              <span className="hidden sm:inline">Tạo yêu cầu tạm ứng</span>
              <span className="sm:hidden">Tạo mới</span>
            </Button>
          </div>
        }
        style={{
          marginBottom: '8px',
          padding: '12px 18px',
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />

      {/* 2. Component fullWidthTable: Bảng dữ liệu chính toàn màn hình */}
      <div
        className="table-container"
        style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          border: 'none',
          borderRadius: 0,
          backgroundColor: 'var(--bg-surface-1)',
        }}
      >
        <div
          className="table-responsive custom-scrollbar"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'auto',
          }}
        >
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
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface-2)',
                  borderBottom: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ padding: '8px 14px' }}>Mã phiếu</th>
                <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '190px' }}>Người đề xuất</th>
                <th style={{ padding: '8px 14px', width: '140px', textAlign: 'right' }}>Số tiền tạm ứng</th>
                {currentStep === 1 && (
                  <>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '125px', textAlign: 'center' }}>Ngày yêu cầu</th>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '145px', textAlign: 'center' }}>Ngày hoàn tạm ứng</th>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '150px', textAlign: 'center' }}>Trạng thái</th>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '190px' }}>Người duyệt và Ngày duyệt</th>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '145px', textAlign: 'center' }}>Ngày hoàn tạm ứng</th>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', minWidth: '220px' }}>Lý do từ chối</th>
                    <th className="hidden sm:table-cell" style={{ padding: '8px 14px', width: '170px' }}>Người từ chối</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={currentStep === 1 ? 7 : 6}
                    style={{
                      textAlign: 'center',
                      padding: '48px 16px',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Đang nạp dữ liệu tạm ứng từ máy chủ...</div>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={currentStep === 1 ? 7 : 6}
                    style={{
                      textAlign: 'center',
                      padding: '48px 16px',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CashCoin size={36} style={{ color: '#cbd5e1' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Không tìm thấy khoản tạm ứng nào</div>
                      <div style={{ fontSize: '12px' }}>Thử thay đổi từ khóa tìm kiếm hoặc các điều kiện lọc</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const stt = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedPayment(item)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Nhấn để xem chi tiết & xử lý phiếu tạm ứng"
                    >
                      {/* 1. STT */}
                      <td className="hidden sm:table-cell" style={{ padding: '7px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {stt}
                      </td>

                      {/* 2. Mã phiếu + Badge Trừ tạm ứng vào lương (nếu có) + Badge hình thức + Mục đích */}
                      <td style={{ padding: '7px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#2563eb',
                              background: 'rgba(37, 99, 235, 0.08)',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                            }}
                          >
                            {item.code}
                          </span>

                          {/* Badge Trừ tạm ứng vào lương (nếu có) đặt trước Chuyển khoản */}
                          {item.project && item.project.toLowerCase().includes('lương') && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: '#7c3aed',
                                background: 'rgba(124, 58, 237, 0.08)',
                                padding: '1.5px 7px',
                                borderRadius: '20px',
                              }}
                            >
                              <Building size={10} /> Trừ tạm ứng vào lương
                            </span>
                          )}

                          {/* Badge hình thức bên cạnh mã phiếu */}
                          {item.paymentMethod === 'bank_transfer' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: '#0284c7',
                                background: 'rgba(2, 132, 199, 0.08)',
                                padding: '1.5px 7px',
                                borderRadius: '20px',
                              }}
                            >
                              <CreditCard size={11} /> Chuyển khoản
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: '#059669',
                                background: 'rgba(5, 150, 105, 0.08)',
                                padding: '1.5px 7px',
                                borderRadius: '20px',
                              }}
                            >
                              <Cash size={11} /> Tiền mặt
                            </span>
                          )}
                        </div>

                        {/* Nội dung Mục đích đưa xuống dưới mã phiếu */}
                        <div
                          style={{
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            lineHeight: 1.35,
                            fontSize: '0.8125rem',
                            maxWidth: '460px',
                          }}
                        >
                          {item.purpose}
                        </div>
                        <div className="sm:hidden flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">{item.employeeName}</span>
                          <span>•</span>
                          <span>{item.department}</span>
                          {item.deadlineRefund && (
                            <>
                              <span>•</span>
                              <span>Hoàn ứng: <strong className="font-mono text-amber-700">{item.deadlineRefund}</strong></span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. Người đề xuất */}
                      <td className="hidden sm:table-cell" style={{ padding: '7px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.employeeName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          {item.department}
                        </div>
                      </td>

                      {/* 4. Số tiền tạm ứng (và Số tiền phê duyệt hiển thị bên dưới) */}
                      <td
                        style={{
                          padding: '7px 14px',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color:
                              currentStep === 2
                                ? '#16a34a'
                                : currentStep === 3
                                  ? '#dc2626'
                                  : '#ea580c',
                          }}
                        >
                          {formatVND(item.amount)}
                        </div>
                        {item.status === 'approved' && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: '#16a34a',
                              marginTop: '2px',
                            }}
                          >
                            Duyệt: {formatVND(item.approvedAmount || item.amount)}
                          </div>
                        )}
                      </td>

                      {/* CÁC CỘT THEO BƯỚC 1: YÊU CẦU TẠM ỨNG & XỬ LÝ */}
                      {currentStep === 1 && (
                        <>
                          <td className="hidden sm:table-cell" style={{ padding: '7px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {item.requestedDate}
                          </td>
                          <td className="hidden sm:table-cell" style={{ padding: '7px 14px', textAlign: 'center', color: '#b45309', fontWeight: 700, fontFamily: 'monospace' }}>
                            {item.deadlineRefund || item.requestedDate || '—'}
                          </td>
                          <td className="hidden sm:table-cell" style={{ padding: '7px 14px', textAlign: 'center' }}>
                            {item.status === 'approved' ? (
                              item.reviewStatus === 'disbursed' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 9px',
                                    borderRadius: '20px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(16, 185, 129, 0.14)',
                                    color: '#047857',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                  }}
                                >
                                  <CheckCircle size={11} /> Đã chi tiền
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 9px',
                                    borderRadius: '20px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                                    color: '#15803d',
                                    border: '1px solid rgba(22, 163, 74, 0.25)',
                                  }}
                                >
                                  <CheckCircle size={11} /> Đã phê duyệt
                                </span>
                              )
                            ) : item.status === 'rejected' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 9px',
                                  borderRadius: '20px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                  color: '#b91c1c',
                                  border: '1px solid rgba(220, 38, 38, 0.25)',
                                }}
                              >
                                <XCircle size={11} /> Đã từ chối
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 9px',
                                  borderRadius: '20px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(234, 88, 12, 0.1)',
                                  color: '#c2410c',
                                  border: '1px solid rgba(234, 88, 12, 0.25)',
                                }}
                              >
                                <ClockHistory size={11} /> Chờ phê duyệt
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      {/* CÁC CỘT THEO BƯỚC 2: ĐÃ DUYỆT */}
                      {currentStep === 2 && (
                        <>
                          <td className="hidden sm:table-cell" style={{ padding: '7px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                              {item.approver}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '1px' }}>
                              Duyệt ngày {item.approvedDate}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell" style={{ padding: '7px 14px', textAlign: 'center', color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>
                            {item.deadlineRefund || item.requestedDate || '—'}
                          </td>
                        </>
                      )}

                      {/* CÁC CỘT THEO BƯỚC 3: ĐÃ TỪ CHỐI */}
                      {currentStep === 3 && (
                        <>
                          <td style={{ padding: '7px 14px' }}>
                            <div
                              style={{
                                color: '#dc2626',
                                fontSize: '0.78rem',
                                lineHeight: 1.35,
                                maxWidth: '320px',
                              }}
                            >
                              {item.rejectReason || 'Không đủ điều kiện tạm ứng'}
                            </div>
                          </td>
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                              {item.approver}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              Từ chối: {item.rejectedDate}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Component Pagination */}
        <div
          className="pagination-container"
          style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-1)',
            padding: '4px 8px',
          }}
        >
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPayments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            rightActions={
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Tổng cộng: <strong style={{ color: 'var(--text-primary)' }}>{filteredPayments.length}</strong> phiếu
              </div>
            }
          />
        </div>
      </div>

      {/* OFFCANVAS 1: TẠO MỚI YÊU CẦU TẠM ỨNG (CHUẨN 400PX ĐỒNG BỘ YÊU CẦU CÁ NHÂN) */}
      <Offcanvas
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        icon={<FileEarmarkPlus size={22} style={{ color: 'var(--brand-600, #2563eb)' }} />}
        title="Tạo yêu cầu tạm ứng"
        description="Điền thông tin đề nghị tạm ứng kinh phí để trình duyệt"
        width="400px"
        position="right"
        bodyStyle={{ display: 'flex', flexDirection: 'column' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              form="create-advance-payment-form"
              variant="primary"
              style={{ fontWeight: 700 }}
            >
              Gửi yêu cầu phê duyệt
            </Button>
          </div>
        }
      >
        <form
          id="create-advance-payment-form"
          onSubmit={handleCreateSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Input
                label="Số tiền xin tạm ứng VND"
                required
                type="text"
                value={formatNumberGroup(newAmount)}
                onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ fontWeight: 700, color: '#b91c1c' }}
              />
              <div style={{ marginTop: '8px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={deductFromSalary}
                    onChange={(e) => setDeductFromSalary(e.target.checked)}
                    style={{
                      width: '15px',
                      height: '15px',
                      accentColor: '#2563eb',
                      cursor: 'pointer',
                    }}
                  />
                  <span>Trừ tạm ứng vào lương</span>
                </label>
              </div>
            </div>

            <div>
              <Input
                label="Hạn hoàn ứng dự kiến"
                required
                type="text"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>

          <Input
            label="Mục đích tạm ứng chi tiết"
            required
            type="text"
            value={newPurpose}
            onChange={(e) => setNewPurpose(e.target.value)}
            placeholder="Ví dụ: Tạm ứng công tác phí dự án, mua vật tư mẫu..."
          />

          <Select
            label="Phương thức nhận tiền"
            value={newPaymentMethod}
            onChange={(e) => setNewPaymentMethod(e.target.value as 'bank_transfer' | 'cash')}
          >
            <option value="bank_transfer">Chuyển khoản qua số tài khoản cá nhân</option>
            <option value="cash">Nhận tiền mặt tại quỹ công ty</option>
          </Select>

          {newPaymentMethod === 'bank_transfer' && (
            <>
              <Input
                label="Số tài khoản thụ hưởng"
                type="text"
                value={newBankAccount}
                onChange={(e) => setNewBankAccount(e.target.value)}
                placeholder="Ví dụ: 19033458992011"
              />

              <Input
                label="Ngân hàng thụ hưởng"
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Ví dụ: Techcombank Đà Nẵng"
              />
            </>
          )}

          <div
            style={{
              marginTop: '6px',
              paddingTop: '14px',
              borderTop: '1px dashed #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
              minHeight: 0,
            }}
          >
            <Select
              label="Người phê duyệt"
              required
              value={newApprover}
              onChange={(e) => setNewApprover(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {dbApproverGroups.map((grp) => (
                <optgroup key={grp.group} label={grp.group}>
                  {grp.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '4px',
                  flexShrink: 0,
                }}
              >
                Ghi chú hoặc ý kiến bổ sung
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Nhập thêm chi tiết hoặc giải trình nếu cần..."
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '72px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default, #cbd5e1)',
                  backgroundColor: 'var(--bg-surface-1, #ffffff)',
                  padding: '8px 12px',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </form>
      </Offcanvas>

      {/* OFFCANVAS 2: XEM CHI TIẾT & PHÊ DUYỆT PHIẾU TẠM ỨNG (CHUẨN 400PX) */}
      <Offcanvas
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        icon={<FileEarmarkText size={22} style={{ color: 'var(--brand-600, #2563eb)' }} />}
        title={selectedPayment ? `Chi tiết phiếu ${selectedPayment.code}` : 'Chi tiết phiếu tạm ứng'}
        description="Thông tin đề nghị tạm ứng và trạng thái xét duyệt"
        width="400px"
        position="right"
        footer={
          selectedPayment ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedPayment(null)}>
                Đóng
              </Button>
              {selectedPayment.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<XLg size={13} />}
                    onClick={() => handleReject(selectedPayment)}
                  >
                    Từ chối
                  </Button>
                  {!isAutoApproveEnabled || selectedPayment.amount > advanceLimit ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Send size={13} />}
                      disabled={isSubmittingDirector}
                      onClick={() => handleSubmitToDirector(selectedPayment)}
                    >
                      {isSubmittingDirector ? 'Đang trình...' : 'Trình phê duyệt'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<CheckLg size={14} />}
                      onClick={() => {
                        const parsed = Number(approvedAmountStr.replace(/[^0-9]/g, ''));
                        handleApprove(selectedPayment, parsed > 0 ? parsed : selectedPayment.amount);
                      }}
                    >
                      Phê duyệt
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                background:
                  selectedPayment.status === 'approved'
                    ? 'rgba(22, 163, 74, 0.08)'
                    : selectedPayment.status === 'rejected'
                      ? 'rgba(220, 38, 38, 0.08)'
                      : 'rgba(234, 88, 12, 0.08)',
                border:
                  selectedPayment.status === 'approved'
                    ? '1px solid rgba(22, 163, 74, 0.2)'
                    : selectedPayment.status === 'rejected'
                      ? '1px solid rgba(220, 38, 38, 0.2)'
                      : '1px solid rgba(234, 88, 12, 0.2)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Số tiền xin tạm ứng
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color:
                      selectedPayment.status === 'approved'
                        ? '#16a34a'
                        : selectedPayment.status === 'rejected'
                          ? '#dc2626'
                          : '#ea580c',
                  }}
                >
                  {formatVND(selectedPayment.amount)}
                </div>
                {selectedPayment.status === 'approved' && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', marginTop: '3px' }}>
                    Số tiền phê duyệt: {formatVND(selectedPayment.approvedAmount || selectedPayment.amount)}
                  </div>
                )}
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '11px',
                  background:
                    selectedPayment.status === 'approved'
                      ? '#16a34a'
                      : selectedPayment.status === 'rejected'
                        ? '#dc2626'
                        : '#ea580c',
                  color: '#ffffff',
                }}
              >
                {selectedPayment.status === 'approved' ? (
                  <>
                    <CheckCircle size={12} /> {selectedPayment.reviewStatus === 'disbursed' ? 'Đã chi tiền' : 'Đã phê duyệt'}
                  </>
                ) : selectedPayment.status === 'rejected' ? (
                  <>
                    <XCircle size={12} /> Đã từ chối
                  </>
                ) : (
                  <>
                    <ClockHistory size={12} /> Chờ phê duyệt
                  </>
                )}
              </span>
            </div>

            {selectedPayment.status === 'pending' && isAutoApproveEnabled && selectedPayment.amount <= advanceLimit && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                  Số tiền phê duyệt (VNĐ)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberGroup(approvedAmountStr)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setApprovedAmountStr(raw);
                    }}
                    placeholder="Nhập số tiền phê duyệt..."
                    style={{
                      width: '100%',
                      padding: '8px 42px 8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#2563eb',
                      outline: 'none',
                    }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                    VNĐ
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--bg-surface-2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Người đề xuất</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPayment.employeeName}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{selectedPayment.department}</div>
              </div>

              <div style={{ background: 'var(--bg-surface-2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Ngày hoàn tạm ứng</div>
                <div style={{ fontWeight: 700, color: '#b45309', fontFamily: 'monospace' }}>
                  {selectedPayment.deadlineRefund || selectedPayment.requestedDate || '—'}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Yêu cầu: {selectedPayment.requestedDate}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '10px 12px', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '3px' }}>Mục đích tạm ứng</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {selectedPayment.purpose}
              </div>
              {selectedPayment.project && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                  Phân loại: {selectedPayment.project}
                </div>
              )}
              {selectedPayment.note && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Ghi chú: {selectedPayment.note}
                </div>
              )}
            </div>

            {selectedPayment.paymentMethod === 'bank_transfer' && selectedPayment.bankInfo && (
              <div style={{ background: 'var(--bg-surface-2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '3px' }}>Tài khoản nhận tiền</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedPayment.bankInfo.bankName}
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700 }}>
                  STK: {selectedPayment.bankInfo.accountNumber}
                </div>
                {selectedPayment.bankInfo.accountName && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Chủ TK: {selectedPayment.bankInfo.accountName}
                  </div>
                )}
              </div>
            )}

            {selectedPayment.status === 'approved' && (
              <div style={{ background: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '12px' }}>Thông tin phê duyệt</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '12px', marginTop: '2px' }}>
                  {selectedPayment.approver} • Ngày duyệt: {selectedPayment.approvedDate}
                </div>
              </div>
            )}

            {selectedPayment.status === 'rejected' && (
              <div style={{ background: 'rgba(220, 38, 38, 0.06)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px' }}>Lý do từ chối</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '12px', marginTop: '2px' }}>{selectedPayment.rejectReason}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                  Xử lý bởi: {selectedPayment.approver} ({selectedPayment.rejectedDate})
                </div>
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* OFFCANVAS 3: THIẾT LẬP XOÁ DỮ LIỆU TẠM ỨNG QUÁ HẠN (CHUẨN 400PX) */}
      <DataRetentionOffcanvas
        isOpen={isCleanupOffcanvasOpen}
        onClose={() => setIsCleanupOffcanvasOpen(false)}
        ticketType="ADVANCE_PAYMENTS"
        title="Thiết lập thời gian lưu trữ"
        description="Cấu hình tự động dọn dẹp phiếu tạm ứng quá thời hạn lưu trữ"
        entityLabel="phiếu"
        onCleanedUp={() => fetchPayments(true)}
      />
    </div>
  );
};
