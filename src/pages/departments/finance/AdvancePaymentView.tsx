import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  CashCoin,
  Building,
  CreditCard,
  Cash,
  ClockHistory,
  CheckLg,
  XLg,
  FileEarmarkSpreadsheet,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { TableToolbar, type TableToolbarFilter } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';
import {
  DepartmentSelect,
  useDepartmentOptions,
  matchDepartment,
} from '../../../components/common/DepartmentSelect';

export interface AdvancePaymentItem {
  id: string;
  code: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  purpose: string;
  project?: string;
  amount: number;
  requestedDate: string;
  paymentMethod: 'bank_transfer' | 'cash';
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  reviewStatus?: 'unprocessed' | 'in_review'; // 'Chưa xử lý' | 'Đang trình duyệt'
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

// Dữ liệu mẫu thực tế của Deco Door
const INITIAL_ADVANCE_PAYMENTS: AdvancePaymentItem[] = [];

// Định dạng tiền tệ VND
const formatVND = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
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

  // Tải dữ liệu tạm ứng từ Database
  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/advance-payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data || []);
      }
    } catch (e) {
      console.error('Lỗi nạp dữ liệu tạm ứng:', e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPayments();
  }, []);

  // Bộ lọc và tìm kiếm cho TableToolbar
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const { options: deptOptions } = useDepartmentOptions({ includeAll: true });
  const [selectedReviewStatus, setSelectedReviewStatus] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State Modal xem chi tiết phiếu
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null);

  // State Modal tạo mới phiếu tạm ứng
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [newProject, setNewProject] = useState('Sun Grand Boulevard Sầm Sơn');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newDepartment, setNewDepartment] = useState('Xưởng Sản xuất gỗ');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer');
  const [newBankName, setNewBankName] = useState('Techcombank');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
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

  // Lọc dữ liệu theo bước, từ khóa, bộ phận, trạng thái xử lý
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Lọc theo bước (status)
      if (item.status !== stepStatus) return false;

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

      // Lọc theo trạng thái xử lý ở bước 1 (Chưa xử lý, Đang trình duyệt)
      if (currentStep === 1 && selectedReviewStatus !== 'all') {
        if (item.reviewStatus !== selectedReviewStatus) return false;
      }

      return true;
    });
  }, [payments, stepStatus, searchQuery, selectedDept, selectedReviewStatus, selectedPaymentMethod, currentStep]);

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
        minWidth: '165px',
        options: [
          { value: 'all', label: 'Tất cả trạng thái' },
          { value: 'unprocessed', label: 'Chưa xử lý' },
          { value: 'in_review', label: 'Đang trình duyệt' },
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
  }, [selectedDept, selectedReviewStatus, selectedPaymentMethod, currentStep]);

  // Hành động Phê duyệt
  const handleApprove = async (item: AdvancePaymentItem) => {
    const approverName = user?.name ? `${user.name} (Phê duyệt)` : 'Hà Hải Lâm (Ban Giám Đốc)';
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/advance-payments/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
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
                  approver: approverName,
                  approvedDate: today,
                }
              : p
          )
        );
        onShowToast?.('success', 'Đã duyệt tạm ứng', `Phiếu ${item.code} với số tiền ${formatVND(item.amount)} đã được phê duyệt thành công.`);
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
    const today = new Date().toISOString().split('T')[0];

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

  // Tạo mới phiếu tạm ứng
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurpose || !newAmount || Number(newAmount) <= 0) {
      if (onShowToast) {
        onShowToast('error', 'Thiếu thông tin', 'Vui lòng nhập mục đích và số tiền tạm ứng hợp lệ.');
      }
      return;
    }

    const nextIndex = payments.length + 1;
    const newCode = `TU-${new Date().getFullYear()}/${String(nextIndex).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const newItemPayload = {
      code: newCode,
      employeeName: user?.name || 'Nguyễn Văn Thành',
      employeeCode: user?.employeeCode || 'NV-2026-08',
      department: newDepartment,
      purpose: newPurpose,
      project: newProject,
      amount: Number(newAmount),
      requestedDate: today,
      paymentMethod: newPaymentMethod,
      bankInfo:
        newPaymentMethod === 'bank_transfer'
          ? {
              bankName: newBankName,
              accountNumber: newBankAccount || '19038291048192',
              accountName: (newAccountName || user?.name || 'NGUYEN VAN THANH').toUpperCase(),
            }
          : undefined,
      status: 'pending',
      reviewStatus: 'unprocessed',
      deadlineRefund: newDeadline || today,
      note: newNote,
      attachedDocsCount: 0,
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
        setIsCreateModalOpen(false);

        // Reset form
        setNewPurpose('');
        setNewAmount('');
        setNewNote('');
        setNewBankAccount('');
        setNewAccountName('');

        if (onShowToast) {
          onShowToast('success', 'Tạo yêu cầu thành công', `Đã lưu phiếu tạm ứng ${newCode} vào cơ sở dữ liệu.`);
        }

        // Nếu không ở bước 1, chuyển về bước 1
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
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentStep === 2 && (
              <Button
                variant="outline"
                onClick={() => {
                  if (onShowToast) {
                    onShowToast('info', 'Xuất báo cáo', 'Đang tải về danh sách các khoản tạm ứng đã phê duyệt (Excel).');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <FileEarmarkSpreadsheet size={15} /> Xuất Excel
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              <Plus size={16} /> Tạo yêu cầu tạm ứng
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
                <th style={{ padding: '8px 14px', width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ padding: '8px 14px', minWidth: '320px' }}>Mã phiếu</th>
                <th style={{ padding: '8px 14px', width: '180px' }}>Người đề xuất</th>
                <th style={{ padding: '8px 14px', width: '140px', textAlign: 'right' }}>Số tiền tạm ứng</th>
                {currentStep === 1 && (
                  <>
                    <th style={{ padding: '8px 14px', width: '110px', textAlign: 'center' }}>Ngày yêu cầu</th>
                    <th style={{ padding: '8px 14px', width: '110px', textAlign: 'center' }}>Hạn hoàn ứng</th>
                  </>
                )}
                {currentStep === 2 && (
                  <>
                    <th style={{ padding: '8px 14px', width: '180px' }}>Người duyệt và Ngày duyệt</th>
                    <th style={{ padding: '8px 14px', width: '110px', textAlign: 'center' }}>Hạn hoàn ứng</th>
                    <th style={{ padding: '8px 14px', width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <th style={{ padding: '8px 14px', minWidth: '220px' }}>Lý do từ chối</th>
                    <th style={{ padding: '8px 14px', width: '160px' }}>Người từ chối</th>
                    <th style={{ padding: '8px 14px', width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={currentStep === 1 ? 6 : 7}
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
                    colSpan={currentStep === 1 ? 6 : 7}
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
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* 1. STT */}
                      <td style={{ padding: '7px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {stt}
                      </td>

                      {/* 2. Mã phiếu + Badge hình thức + Trạng thái xử lý + Mục đích và Dự án */}
                      <td style={{ padding: '7px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span
                            onClick={() => setSelectedPayment(item)}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#2563eb',
                              background: 'rgba(37, 99, 235, 0.08)',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                            title="Xem chi tiết phiếu tạm ứng"
                          >
                            {item.code}
                          </span>

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

                          {/* Badge trạng thái xử lý ở bước 1 */}
                          {currentStep === 1 && item.reviewStatus && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: item.reviewStatus === 'in_review' ? '#b45309' : '#475569',
                                background:
                                  item.reviewStatus === 'in_review'
                                    ? 'rgba(245, 158, 11, 0.12)'
                                    : 'rgba(100, 116, 139, 0.1)',
                                padding: '1.5px 7px',
                                borderRadius: '20px',
                              }}
                            >
                              {item.reviewStatus === 'in_review' ? 'Đang trình duyệt' : 'Chưa xử lý'}
                            </span>
                          )}
                        </div>

                        {/* Nội dung Mục đích và Dự án đưa xuống dưới mã phiếu */}
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
                        {item.project && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px',
                              fontSize: '0.7rem',
                              color: '#0284c7',
                              background: 'rgba(2, 132, 199, 0.08)',
                              padding: '1.5px 6px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            <Building size={10} /> {item.project}
                          </div>
                        )}
                      </td>

                      {/* 3. Người đề xuất (Không hiển thị mã nhân viên dưới tên) */}
                      <td style={{ padding: '7px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.employeeName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          {item.department}
                        </div>
                      </td>

                      {/* 4. Số tiền tạm ứng */}
                      <td
                        style={{
                          padding: '7px 14px',
                          textAlign: 'right',
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
                      </td>

                      {/* CÁC CỘT THEO BƯỚC 1: YÊU CẦU TẠM ỨNG (Bỏ cột thao tác duyệt) */}
                      {currentStep === 1 && (
                        <>
                          <td style={{ padding: '7px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {item.requestedDate}
                          </td>
                          <td style={{ padding: '7px 14px', textAlign: 'center', color: '#b45309', fontWeight: 600 }}>
                            {item.deadlineRefund}
                          </td>
                        </>
                      )}

                      {/* CÁC CỘT THEO BƯỚC 2: ĐÃ DUYỆT */}
                      {currentStep === 2 && (
                        <>
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                              {item.approver}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '1px' }}>
                              Duyệt ngày {item.approvedDate}
                            </div>
                          </td>
                          <td style={{ padding: '7px 14px', textAlign: 'center', color: '#0f172a', fontWeight: 600 }}>
                            {item.deadlineRefund}
                          </td>
                          <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Xem chi tiết"
                                onClick={() => setSelectedPayment(item)}
                                style={{
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#2563eb',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  padding: 0,
                                }}
                              >
                                <Eye size={13} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="In phiếu chi tạm ứng"
                                onClick={() => {
                                  if (onShowToast) {
                                    onShowToast('info', 'In phiếu chi', `Đang kết nối máy in phiếu chi cho mã ${item.code}`);
                                  }
                                }}
                                style={{
                                  background: 'rgba(100, 116, 139, 0.1)',
                                  color: '#475569',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  padding: 0,
                                }}
                              >
                                <Printer size={13} />
                              </Button>
                            </div>
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
                          <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Xem chi tiết"
                              onClick={() => setSelectedPayment(item)}
                              style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#2563eb',
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                padding: 0,
                              }}
                            >
                              <Eye size={13} />
                            </Button>
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

      {/* MODAL 1: TẠO MỚI YÊU CẦU TẠM ỨNG */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Lập phiếu đề xuất tạm ứng"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                Phòng ban đề xuất <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <DepartmentSelect
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-1)',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                Dự án / Công trình liên quan
              </label>
              <select
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-1)',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="Sun Grand Boulevard Sầm Sơn">Sun Grand Boulevard Sầm Sơn</option>
                <option value="Vinhomes Royal Island Vũ Yên Hải Phòng">Vinhomes Royal Island Vũ Yên Hải Phòng</option>
                <option value="Masteri Centre Point Quận 9">Masteri Centre Point Quận 9</option>
                <option value="Khu Đô Thị Sinh Thái Aqua City">Khu Đô Thị Sinh Thái Aqua City</option>
                <option value="Ecopark Retreat Bến Lức Long An">Ecopark Retreat Bến Lức Long An</option>
                <option value="Nhà máy Seajong">Nhà máy Seajong</option>
                <option value="Nội bộ công ty">Nội bộ công ty</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Mục đích và Nội dung tạm ứng <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              required
              rows={2}
              value={newPurpose}
              onChange={(e) => setNewPurpose(e.target.value)}
              placeholder="Ví dụ: Tạm ứng công tác phí đo đạc công trình, mua vật tư cấp bách xưởng gỗ..."
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface-1)',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                Số tiền tạm ứng (VNĐ) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                required
                min={100000}
                step={50000}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="Nhập số tiền..."
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-1)',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                Hình thức nhận tiền
              </label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-1)',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                <option value="cash">Tiền mặt tại thủ quỹ</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                Hạn hoàn ứng dự kiến
              </label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-1)',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {newPaymentMethod === 'bank_transfer' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '14px',
                background: 'var(--bg-surface-2)',
                padding: '12px',
                borderRadius: '8px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Ngân hàng
                </label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Techcombank, Vietcombank..."
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface-1)',
                    padding: '0 10px',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Số tài khoản
                </label>
                <input
                  type="text"
                  value={newBankAccount}
                  onChange={(e) => setNewBankAccount(e.target.value)}
                  placeholder="1903..."
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface-1)',
                    padding: '0 10px',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Chủ tài khoản
                </label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="NGUYEN VAN A"
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface-1)',
                    padding: '0 10px',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              Ghi chú bổ sung
            </label>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Đính kèm thông tin hóa đơn hoặc lý do giải ngân cấp tốc..."
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface-1)',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit">
              <CheckLg size={16} /> Gửi duyệt đề xuất
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: XEM CHI TIẾT PHIẾU TẠM ỨNG */}
      {selectedPayment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          title={`Chi tiết phiếu tạm ứng ${selectedPayment.code}`}
          maxWidth="680px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header tóm tắt */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: '10px',
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
                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  SỐ TIỀN TẠM ỨNG
                </span>
                <div
                  style={{
                    fontSize: '22px',
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
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    fontSize: '12px',
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
                      <CheckCircle size={14} /> ĐÃ DUYỆT VÀ GIẢI NGÂN
                    </>
                  ) : selectedPayment.status === 'rejected' ? (
                    <>
                      <XCircle size={14} /> ĐÃ TỪ CHỐI
                    </>
                  ) : (
                    <>
                      <ClockHistory size={14} /> ĐANG CHỜ DUYỆT
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div style={{ background: 'var(--bg-surface-2)', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Người yêu cầu:</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedPayment.employeeName} ({selectedPayment.employeeCode})
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{selectedPayment.department}</div>
              </div>

              <div style={{ background: 'var(--bg-surface-2)', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>Dự án liên quan:</div>
                <div style={{ fontWeight: 700, color: '#0284c7' }}>{selectedPayment.project || 'Nội bộ'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Hạn hoàn ứng: <strong>{selectedPayment.deadlineRefund}</strong>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '14px 16px', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>Mục đích tạm ứng:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {selectedPayment.purpose}
              </div>
              {selectedPayment.note && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Ghi chú: {selectedPayment.note}
                </div>
              )}
            </div>

            {/* Thông tin nhận tiền */}
            {selectedPayment.paymentMethod === 'bank_transfer' && selectedPayment.bankInfo && (
              <div style={{ background: 'var(--bg-surface-2)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>Tài khoản nhận tiền:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedPayment.bankInfo.bankName} - Số TK: <strong>{selectedPayment.bankInfo.accountNumber}</strong>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Chủ TK: {selectedPayment.bankInfo.accountName}
                </div>
              </div>
            )}

            {/* Thông tin phê duyệt nếu đã duyệt / từ chối */}
            {selectedPayment.status === 'approved' && (
              <div style={{ background: 'rgba(22, 163, 74, 0.06)', border: '1px solid rgba(22, 163, 74, 0.2)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ color: '#16a34a', fontWeight: 700, marginBottom: '2px' }}>Phê duyệt bởi:</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPayment.approver} vào ngày {selectedPayment.approvedDate}</div>
              </div>
            )}

            {selectedPayment.status === 'rejected' && (
              <div style={{ background: 'rgba(220, 38, 38, 0.06)', border: '1px solid rgba(220, 38, 38, 0.2)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ color: '#dc2626', fontWeight: 700, marginBottom: '2px' }}>Lý do từ chối:</div>
                <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedPayment.rejectReason}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Xử lý bởi: {selectedPayment.approver} ({selectedPayment.rejectedDate})</div>
              </div>
            )}

            {/* Nút thao tác dưới Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setSelectedPayment(null)}>
                Đóng
              </Button>

              {selectedPayment.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleReject(selectedPayment)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <XLg size={14} /> Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(selectedPayment)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckLg size={16} /> Phê duyệt tạm ứng
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
