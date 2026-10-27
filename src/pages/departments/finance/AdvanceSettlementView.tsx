import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Eye,
  Printer,
  CashCoin,
  FileEarmarkSpreadsheet,
  CheckCircle,
  ExclamationTriangle,
  ClockHistory,
  Receipt,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Check2,
  Trash,
  CheckLg,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { TableToolbar, type TableToolbarFilter } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Modal } from '../../../components/common/Modal';
import {
  useDepartmentOptions,
  matchDepartment,
} from '../../../components/common/DepartmentSelect';

// --- DATA TYPES ---
export interface InvoiceItem {
  id: string;
  invoiceNo: string;
  supplier: string;
  content: string;
  amount: number;
  vatAmount?: number;
  date: string;
}

export interface AdvanceSettlementItem {
  id: string;
  advanceCode: string;
  settlementCode?: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  purpose: string;
  project: string;
  advanceAmount: number;
  approvedDate: string;
  approver: string;
  deadlineRefund: string;
  settlementDate?: string;
  actualSpent: number; // Thực chi theo chứng từ hóa đơn
  status: 'settled' | 'processing' | 'unsettled' | 'overdue';
  invoices: InvoiceItem[];
  note?: string;
}

export interface AdvanceSettlementViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  user?: any;
}

// --- DỮ LIỆU MẪU DECO DOOR VỀ CÁC KHOẢN TẠM ỨNG ĐÃ ĐƯỢC PHÊ DUYỆT VÀ HOÀN TẠM ỨNG ---
const INITIAL_SETTLEMENT_ITEMS: AdvanceSettlementItem[] = [];

// Helper format tiền tệ VND
const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

export const AdvanceSettlementView: React.FC<AdvanceSettlementViewProps> = ({
  onShowToast,
}) => {
  const [data, setData] = useState<AdvanceSettlementItem[]>(INITIAL_SETTLEMENT_ITEMS);
  const [isLoading, setIsLoading] = useState(false);

  // Tải dữ liệu hoàn tạm ứng từ Database
  const fetchSettlements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/advance-settlements');
      if (res.ok) {
        const rows = await res.json();
        setData(rows || []);
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu hoàn tạm ứng:', e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSettlements();
  }, []);

  // Filters và Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL'); // 'ALL' | 'MULTIPLE' | 'SINGLE'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expanded employees state for grouped items (Keyed by employeeCode)
  // Default expanded for easy viewing
  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({
    'NV-DA004': true, // Đặng Tuấn Anh
    'NV-SX014': true, // Nguyễn Văn Thành
    'NV-KT028': true, // Trần Đình Trọng
  });

  // Modal States
  const [selectedItem, setSelectedItem] = useState<AdvanceSettlementItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateSettlementModalOpen, setIsCreateSettlementModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form state cho lập phiếu hoàn ứng mới
  const [targetAdvanceId, setTargetAdvanceId] = useState('');
  const [newActualSpent, setNewActualSpent] = useState<number>(0);
  const [newNote, setNewNote] = useState('');
  const [newInvoices, setNewInvoices] = useState<
    Array<{ invoiceNo: string; supplier: string; content: string; amount: number; date: string }>
  >([]);
  const [tempInv, setTempInv] = useState({
    invoiceNo: '',
    supplier: '',
    content: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  // 1. FILTERING DATA
  const filteredItems = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.advanceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.settlementCode && item.settlementCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = departmentFilter === 'ALL' || matchDepartment(item.department, departmentFilter);
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchDept && matchStatus;
    });
  }, [data, searchQuery, departmentFilter, statusFilter]);

  // 2. GOM NHÓM THEO TÊN NHÂN VIÊN (Yêu cầu đề bài)
  // - Nếu người xin tạm ứng có nhiều hơn một khoản tạm ứng thì sẽ được gom lại theo tên nhân viên
  // - Nhân viên có 1 khoản tạm ứng sẽ được giữ đơn lẻ
  const groupedEntities = useMemo(() => {
    const map = new Map<string, AdvanceSettlementItem[]>();

    filteredItems.forEach((item) => {
      const key = item.employeeCode;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    const groups: Array<{
      key: string;
      employeeName: string;
      employeeCode: string;
      department: string;
      items: AdvanceSettlementItem[];
      hasMultiple: boolean;
      totalAdvance: number;
      totalActualSpent: number;
      totalDifference: number; // totalActualSpent - totalAdvance
      settledCount: number;
      processingCount: number;
      overdueCount: number;
      unsettledCount: number;
    }> = [];

    map.forEach((items, key) => {
      const first = items[0];
      const hasMultiple = items.length > 1;

      // Áp dụng bộ lọc gom nhóm nếu có
      if (groupFilter === 'MULTIPLE' && !hasMultiple) return;
      if (groupFilter === 'SINGLE' && hasMultiple) return;

      const totalAdvance = items.reduce((sum, it) => sum + it.advanceAmount, 0);
      const totalActualSpent = items.reduce((sum, it) => sum + (it.actualSpent || 0), 0);
      const totalDifference = totalActualSpent - totalAdvance;

      const settledCount = items.filter((it) => it.status === 'settled').length;
      const processingCount = items.filter((it) => it.status === 'processing').length;
      const overdueCount = items.filter((it) => it.status === 'overdue').length;
      const unsettledCount = items.filter((it) => it.status === 'unsettled').length;

      groups.push({
        key,
        employeeName: first.employeeName,
        employeeCode: first.employeeCode,
        department: first.department,
        items,
        hasMultiple,
        totalAdvance,
        totalActualSpent,
        totalDifference,
        settledCount,
        processingCount,
        overdueCount,
        unsettledCount,
      });
    });

    // Sắp xếp: Các nhóm có nhiều khoản tạm ứng lên trước để người dùng dễ theo dõi
    return groups.sort((a, b) => {
      if (a.hasMultiple && !b.hasMultiple) return -1;
      if (!a.hasMultiple && b.hasMultiple) return 1;
      return b.items.length - a.items.length;
    });
  }, [filteredItems, groupFilter]);

  // Phân trang theo thực thể (entity nhóm hoặc đơn lẻ)
  const paginatedEntities = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return groupedEntities.slice(startIndex, startIndex + pageSize);
  }, [groupedEntities, currentPage, pageSize]);

  // 3. STATS THỐNG KÊ TỔNG THỂ
  const stats = useMemo(() => {
    const totalAdvance = data.reduce((acc, it) => acc + it.advanceAmount, 0);
    const totalActualSpent = data.reduce((acc, it) => acc + (it.actualSpent || 0), 0);

    // Tính tiền thu hồi về quỹ (khoản có actualSpent < advanceAmount)
    let refundToCollect = 0;
    // Tính tiền cần chi thêm (khoản có actualSpent > advanceAmount)
    let extraReimbursement = 0;

    data.forEach((it) => {
      if (it.actualSpent > 0) {
        const diff = it.actualSpent - it.advanceAmount;
        if (diff < 0) {
          refundToCollect += Math.abs(diff);
        } else if (diff > 0) {
          extraReimbursement += diff;
        }
      }
    });

    const settledCount = data.filter((it) => it.status === 'settled').length;
    const processingCount = data.filter((it) => it.status === 'processing').length;
    const overdueCount = data.filter((it) => it.status === 'overdue').length;
    const unsettledCount = data.filter((it) => it.status === 'unsettled').length;

    return {
      totalAdvance,
      totalActualSpent,
      refundToCollect,
      extraReimbursement,
      settledCount,
      processingCount,
      overdueCount,
      unsettledCount,
      totalCount: data.length,
    };
  }, [data]);

  // Danh sách các phòng ban từ CSDL thực tế để lọc
  const { options: departmentOptions } = useDepartmentOptions({
    includeAll: true,
    allValue: 'ALL',
    allLabel: 'Tất cả phòng ban',
  });

  // Bộ lọc toolbar
  const toolbarFilters: TableToolbarFilter[] = [
    {
      id: 'department',
      value: departmentFilter,
      onChange: (v) => {
        setDepartmentFilter(v);
        setCurrentPage(1);
      },
      options: departmentOptions,
      minWidth: '180px',
    },
    {
      id: 'status',
      value: statusFilter,
      onChange: (v) => {
        setStatusFilter(v);
        setCurrentPage(1);
      },
      options: [
        { value: 'ALL', label: 'Tất cả trạng thái hoàn ứng' },
        { value: 'settled', label: 'Đã quyết toán' },
        { value: 'processing', label: 'Đang quyết toán' },
        { value: 'unsettled', label: 'Chưa nộp chứng từ' },
        { value: 'overdue', label: 'Quá hạn hoàn ứng' },
      ],
      minWidth: '190px',
    },
    {
      id: 'grouping',
      value: groupFilter,
      onChange: (v) => {
        setGroupFilter(v);
        setCurrentPage(1);
      },
      options: [
        { value: 'ALL', label: 'Tất cả (Gom nhóm và Đơn lẻ)' },
        { value: 'MULTIPLE', label: 'Chỉ nhân viên nhiều khoản' },
        { value: 'SINGLE', label: 'Chỉ khoản đơn lẻ' },
      ],
      minWidth: '210px',
    },
  ];

  // Toggle expand / collapse cho 1 nhóm
  const toggleEmployeeExpand = (empCode: string) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [empCode]: !prev[empCode],
    }));
  };

  // Toggle expand / collapse tất cả
  const toggleAllExpand = (expand: boolean) => {
    const newState: Record<string, boolean> = {};
    groupedEntities.forEach((g) => {
      if (g.hasMultiple) {
        newState[g.employeeCode] = expand;
      }
    });
    setExpandedEmployees(newState);
  };

  const areAllExpanded = useMemo(() => {
    const multiGroups = groupedEntities.filter((g) => g.hasMultiple);
    if (multiGroups.length === 0) return false;
    return multiGroups.every((g) => expandedEmployees[g.employeeCode] === true);
  }, [groupedEntities, expandedEmployees]);

  // Helper render Badge trạng thái
  const renderStatusBadge = (status: AdvanceSettlementItem['status']) => {
    switch (status) {
      case 'settled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle size={11} /> Đã quyết toán
          </span>
        );
      case 'processing':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#2563eb',
              whiteSpace: 'nowrap',
            }}
          >
            <ClockHistory size={11} /> Đang quyết toán
          </span>
        );
      case 'unsettled':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              whiteSpace: 'nowrap',
            }}
          >
            <ClockHistory size={11} /> Chưa nộp chứng từ
          </span>
        );
      case 'overdue':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              whiteSpace: 'nowrap',
            }}
          >
            <ExclamationTriangle size={11} /> Quá hạn hoàn ứng
          </span>
        );
      default:
        return null;
    }
  };

  // Helper render chênh lệch thu/chi bù
  const renderDifferenceBadge = (advance: number, actual: number, status: AdvanceSettlementItem['status']) => {
    if (status === 'unsettled' || actual === 0) {
      return (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
          Chưa quyết toán
        </span>
      );
    }

    const diff = actual - advance;
    if (diff === 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary, #64748b)',
            fontWeight: 600,
          }}
        >
          <Check2 size={13} style={{ color: '#10b981' }} /> Cân bằng (0 đ)
        </span>
      );
    } else if (diff < 0) {
      // Hoàn lại tiền thừa về quỹ
      return (
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.78125rem',
              fontWeight: 700,
              color: '#059669',
            }}
          >
            <ArrowDownLeft size={12} /> -{formatCurrency(Math.abs(diff))}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#059669', fontWeight: 500 }}>
            Thu hoàn nộp quỹ
          </div>
        </div>
      );
    } else {
      // Chi thêm cho nhân viên
      return (
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.78125rem',
              fontWeight: 700,
              color: '#d97706',
            }}
          >
            <ArrowUpRight size={12} /> +{formatCurrency(diff)}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#d97706', fontWeight: 500 }}>
            Công ty chi bù thêm
          </div>
        </div>
      );
    }
  };

  // Mở modal tạo quyết toán hoàn ứng mới
  const handleOpenCreateModal = (advance?: AdvanceSettlementItem) => {
    if (advance) {
      setTargetAdvanceId(advance.id);
      setNewActualSpent(advance.actualSpent || advance.advanceAmount);
      setNewNote(advance.note || '');
      setNewInvoices(advance.invoices.map((i) => ({ ...i })));
    } else {
      // Tìm khoản đầu tiên chưa quyết toán
      const firstUnsettled = data.find((d) => d.status === 'unsettled' || d.status === 'processing');
      setTargetAdvanceId(firstUnsettled ? firstUnsettled.id : (data[0]?.id || ''));
      setNewActualSpent(firstUnsettled ? firstUnsettled.advanceAmount : 0);
      setNewNote('');
      setNewInvoices([]);
    }
    setTempInv({
      invoiceNo: '',
      supplier: '',
      content: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsCreateSettlementModalOpen(true);
  };

  // Thêm hóa đơn vào danh sách
  const handleAddInvoice = () => {
    if (!tempInv.invoiceNo.trim() || !tempInv.amount) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập số hóa đơn/chứng từ và số tiền');
      return;
    }
    const amt = parseFloat(tempInv.amount.replace(/[^0-9]/g, '')) || 0;
    if (amt <= 0) {
      onShowToast?.('warning', 'Số tiền không hợp lệ', 'Số tiền hóa đơn phải lớn hơn 0');
      return;
    }

    const newInvItem = {
      invoiceNo: tempInv.invoiceNo.trim(),
      supplier: tempInv.supplier.trim() || 'Hóa đơn bán lẻ / Đơn vị cung ứng',
      content: tempInv.content.trim() || 'Chi phí vật tư / dịch vụ thực tế',
      amount: amt,
      date: tempInv.date || '11/10/2026',
    };

    const updated = [...newInvoices, newInvItem];
    setNewInvoices(updated);

    // Tự động tính lại tổng thực chi
    const totalSpent = updated.reduce((s, it) => s + it.amount, 0);
    setNewActualSpent(totalSpent);

    // Reset input
    setTempInv({
      invoiceNo: '',
      supplier: '',
      content: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  // Xóa 1 hóa đơn
  const handleRemoveInvoice = (idx: number) => {
    const updated = newInvoices.filter((_, i) => i !== idx);
    setNewInvoices(updated);
    const totalSpent = updated.reduce((s, it) => s + it.amount, 0);
    setNewActualSpent(totalSpent);
  };

  // Lưu hoàn tất quyết toán
  const handleSaveSettlement = async (asCompleted: boolean) => {
    if (!targetAdvanceId) {
      onShowToast?.('error', 'Lỗi', 'Chưa chọn phiếu tạm ứng');
      return;
    }

    const targetItem = data.find((d) => d.id === targetAdvanceId);
    if (!targetItem) return;

    const settlementCode = targetItem.settlementCode || `HTU-2026/0${data.length + 1}`;
    const status: AdvanceSettlementItem['status'] = asCompleted ? 'settled' : 'processing';
    const today = new Date().toISOString().split('T')[0];
    const invoicesPayload = newInvoices.map((inv, idx) => ({
      id: `inv-new-${idx}`,
      invoiceNo: inv.invoiceNo,
      supplier: inv.supplier,
      content: inv.content,
      amount: inv.amount,
      date: inv.date,
    }));

    try {
      const res = await fetch(`/api/advance-settlements/${targetItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementCode,
          settlementDate: today,
          actualSpent: newActualSpent,
          status,
          note: newNote.trim() || targetItem.note,
          invoices: invoicesPayload,
        }),
      });

      if (res.ok) {
        setData((prev) =>
          prev.map((it) => {
            if (it.id === targetAdvanceId) {
              return {
                ...it,
                settlementCode,
                settlementDate: today,
                actualSpent: newActualSpent,
                status,
                note: newNote.trim() || it.note,
                invoices: invoicesPayload,
              };
            }
            return it;
          })
        );

        setIsCreateSettlementModalOpen(false);
        onShowToast?.(
          'success',
          asCompleted ? 'Quyết toán hoàn tất' : 'Đã cập nhật hồ sơ hoàn ứng',
          asCompleted
            ? `Phiếu hoàn ứng ${settlementCode} của ${targetItem.employeeName} đã được phê duyệt quyết toán`
            : `Đã lưu hồ sơ hoàn ứng ${settlementCode} chuyển sang trạng thái thẩm tra chứng từ`
        );
      } else {
        onShowToast?.('error', 'Lỗi', 'Không thể lưu hồ sơ quyết toán vào CSDL.');
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
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-surface-1)',
      }}
    >
      {/* 1. KHỐI THỐNG KÊ TỔNG QUAN (KPI CARDS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-2)',
        }}
      >
        {/* Card 1: Tổng tiền tạm ứng đã duyệt */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              TỔNG TẠM ỨNG ĐÃ DUYỆT
            </span>
            <CashCoin size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatCurrency(stats.totalAdvance)}
          </div>
          <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tổng cộng {stats.totalCount} phiếu tạm ứng đã giải ngân
          </div>
        </div>

        {/* Card 2: Thực chi đã thẩm tra */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              THỰC CHI ĐÃ QUYẾT TOÁN
            </span>
            <Receipt size={18} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(stats.totalActualSpent)}
          </div>
          <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats.settledCount} phiếu đã quyết toán ({stats.totalCount > 0 ? Math.round((stats.settledCount / stats.totalCount) * 100) : 0}%)
          </div>
        </div>

        {/* Card 3: Cần thu hoàn nộp lại quỹ */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              CẦN THU HOÀN TRẢ QUỸ
            </span>
            <ArrowDownLeft size={18} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(stats.refundToCollect)}
          </div>
          <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tiền dư thừa nhân viên cần nộp hoàn quỹ
          </div>
        </div>

        {/* Card 4: Công ty cần chi bù thêm */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              CÔNG TY CẦN CHI BÙ THÊM
            </span>
            <ArrowUpRight size={18} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>
            {formatCurrency(stats.extraReimbursement)}
          </div>
          <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Chi vượt hóa đơn thực tế hợp lệ
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TÌM KIẾM, BỘ LỌC VÀ NÚT TÁC VỤ */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm mã phiếu TU/HTU, tên nhân viên, dự án, mục đích..."
        searchMinWidth="260px"
        filters={toolbarFilters}
        actionsAfterSearch={
          <Button
            variant="secondary"
            onClick={() => toggleAllExpand(!areAllExpanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78125rem',
              fontWeight: 600,
              padding: '0 12px',
              height: '38px',
              whiteSpace: 'nowrap',
            }}
          >
            {areAllExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {areAllExpanded ? 'Thu gọn nhóm' : 'Mở rộng tất cả'}
          </Button>
        }
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => {
                onShowToast?.('info', 'Xuất Excel', 'Đang trích xuất danh sách hoàn tạm ứng ra file Excel...');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 600,
                height: '38px',
              }}
            >
              <FileEarmarkSpreadsheet size={15} /> Xuất Excel
            </Button>

            <Button
              variant="primary"
              onClick={() => handleOpenCreateModal()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78125rem',
                fontWeight: 600,
                height: '38px',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={16} /> Lập phiếu hoàn ứng
            </Button>
          </div>
        }
        style={{
          padding: '12px 20px',
          margin: 0,
          backgroundColor: 'var(--bg-surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />

      {/* 3. BẢNG DỮ LIỆU FULL WIDTH VỚI QUY TẮC GOM NHÓM THEO TÊN NHÂN VIÊN */}
      <div
        className="table-container"
        style={{
          flex: '1 1 0%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
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
                <th style={{ padding: '8px 14px', width: '55px', textAlign: 'center' }}>STT</th>
                <th style={{ padding: '8px 14px', minWidth: '300px' }}>Mã phiếu / Nội dung tạm ứng và Dự án</th>
                <th style={{ padding: '8px 14px', width: '220px' }}>Người xin tạm ứng</th>
                <th style={{ padding: '8px 14px', width: '135px', textAlign: 'right' }}>Số tiền tạm ứng</th>
                <th style={{ padding: '8px 14px', width: '145px', textAlign: 'right' }}>Thực chi quyết toán</th>
                <th style={{ padding: '8px 14px', width: '160px', textAlign: 'right' }}>Chênh lệch thu / bù</th>
                <th style={{ padding: '8px 14px', width: '115px', textAlign: 'center' }}>Hạn hoàn ứng</th>
                <th style={{ padding: '8px 14px', width: '140px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '8px 14px', width: '110px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: 'center',
                      padding: '50px 16px',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>Đang nạp dữ liệu hoàn tạm ứng từ máy chủ...</div>
                    </div>
                  </td>
                </tr>
              ) : paginatedEntities.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: 'center',
                      padding: '50px 16px',
                      color: 'var(--text-muted, #94a3b8)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Receipt size={38} style={{ color: '#cbd5e1' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>Không tìm thấy dữ liệu hoàn tạm ứng nào</div>
                      <div style={{ fontSize: '12px' }}>Thử thay đổi từ khóa tìm kiếm hoặc các điều kiện lọc</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEntities.map((group, groupIndex) => {
                  const stt = (currentPage - 1) * pageSize + groupIndex + 1;
                  const isExpanded = !!expandedEmployees[group.employeeCode];

                  // --- TRƯỜNG HỢP 1: NHÂN VIÊN CÓ NHIỀU HƠN 1 KHOẢN TẠM ỨNG (GOM NHÓM THEO TÊN NHÂN VIÊN) ---
                  if (group.hasMultiple) {
                    return (
                      <React.Fragment key={`group-${group.key}`}>
                        {/* DÒNG TIÊU ĐỀ GOM NHÓM (MASTER ROW) */}
                        <tr
                          style={{
                            backgroundColor: isExpanded
                              ? 'rgba(99, 102, 241, 0.05)'
                              : 'var(--bg-surface-2, #f8fafc)',
                            borderTop: '2px solid var(--border-default, #e2e8f0)',
                            borderBottom: '1px solid var(--border-default, #e2e8f0)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onClick={() => toggleEmployeeExpand(group.employeeCode)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isExpanded
                              ? 'rgba(99, 102, 241, 0.05)'
                              : 'var(--bg-surface-2, #f8fafc)';
                          }}
                        >
                          {/* Nút toggle và STT nhóm */}
                          <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  backgroundColor: 'var(--bg-surface-1)',
                                  color: 'var(--color-primary)',
                                  padding: 0,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEmployeeExpand(group.employeeCode);
                                }}
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </Button>
                              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{stt}</span>
                            </div>
                          </td>

                          {/* Tổng hợp nội dung các khoản tạm ứng của nhân viên này */}
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(99, 102, 241, 0.14)',
                                  color: 'var(--color-primary)',
                                }}
                              >
                                <Receipt size={12} /> Gom nhóm {group.items.length} khoản tạm ứng
                              </span>

                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                [{group.items.map((it) => it.advanceCode).join(', ')}]
                              </span>
                            </div>
                            <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Nhấn để {isExpanded ? 'thu gọn' : 'mở rộng xem chi tiết từng khoản'}
                            </div>
                          </td>

                          {/* Tên nhân viên và Bộ phận */}
                          <td style={{ padding: '7px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  color: 'var(--color-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  flexShrink: 0,
                                }}
                              >
                                {group.employeeName.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                                  {group.employeeName}
                                </div>
                                <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                                  {group.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Tổng tiền tạm ứng */}
                          <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.84375rem', color: 'var(--text-primary)' }}>
                              {formatCurrency(group.totalAdvance)}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                              Tổng {group.items.length} phiếu
                            </div>
                          </td>

                          {/* Tổng thực chi quyết toán */}
                          <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.84375rem', color: '#059669' }}>
                              {formatCurrency(group.totalActualSpent)}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                              {group.settledCount}/{group.items.length} đã duyệt
                            </div>
                          </td>

                          {/* Tổng chênh lệch thu / bù */}
                          <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                            {renderDifferenceBadge(group.totalAdvance, group.totalActualSpent, 'processing')}
                          </td>

                          {/* Tiến độ hoàn ứng */}
                          <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.71875rem',
                                fontWeight: 600,
                                backgroundColor: group.overdueCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface-1)',
                                color: group.overdueCount > 0 ? '#dc2626' : 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {group.overdueCount > 0 ? `${group.overdueCount} quá hạn` : `${group.settledCount}/${group.items.length} hoàn tất`}
                            </span>
                          </td>

                          {/* Trạng thái tổng hợp */}
                          <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                            {group.overdueCount > 0 ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  color: '#dc2626',
                                }}
                              >
                                <ExclamationTriangle size={11} /> Có khoản quá hạn
                              </span>
                            ) : group.settledCount === group.items.length ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                  color: '#059669',
                                }}
                              >
                                <CheckCircle size={11} /> Hoàn tất tất cả
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                  color: '#2563eb',
                                }}
                              >
                                <ClockHistory size={11} /> Đang hoàn ứng
                              </span>
                            )}
                          </td>

                          {/* Thao tác nhóm */}
                          <td style={{ padding: '7px 14px', textAlign: 'center' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEmployeeExpand(group.employeeCode);
                              }}
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                height: '26px',
                              }}
                            >
                              {isExpanded ? 'Thu lại' : 'Chi tiết'}
                            </Button>
                          </td>
                        </tr>

                        {/* CÁC DÒNG CON CHI TIẾT (SUB-ROWS CHO TỪNG KHOẢN TẠM ỨNG) */}
                        {isExpanded &&
                          group.items.map((subItem, subIndex) => (
                            <tr
                              key={subItem.id}
                              style={{
                                backgroundColor: 'var(--bg-surface-1)',
                                borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-surface-1)';
                              }}
                            >
                              {/* Sub STT */}
                              <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    fontSize: '0.71875rem',
                                    color: 'var(--text-muted, #94a3b8)',
                                    fontFamily: 'monospace',
                                    paddingLeft: '12px',
                                  }}
                                >
                                  ↳ {stt}.{subIndex + 1}
                                </span>
                              </td>

                              {/* Mã phiếu và Mục đích/Dự án */}
                              <td
                                style={{
                                  padding: '7px 14px',
                                  borderLeft: '3px solid var(--color-primary)',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                      fontSize: '0.78125rem',
                                      color: 'var(--color-primary)',
                                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {subItem.advanceCode}
                                  </span>

                                  {subItem.settlementCode ? (
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        color: '#059669',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      Phiếu hoàn: {subItem.settlementCode}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: '0.6875rem',
                                        color: 'var(--text-muted, #94a3b8)',
                                        fontStyle: 'italic',
                                      }}
                                    >
                                      Chưa lập phiếu hoàn
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-primary)',
                                    marginTop: '3px',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {subItem.purpose}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.6875rem',
                                    color: 'var(--text-secondary)',
                                    marginTop: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Building size={10} /> Dự án: <strong style={{ color: 'var(--text-primary)' }}>{subItem.project}</strong>
                                </div>
                              </td>

                              {/* Người duyệt và Ngày duyệt giải ngân */}
                              <td style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Duyệt: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{subItem.approver}</span>
                                </div>
                                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                                  Ngày duyệt: {subItem.approvedDate}
                                </div>
                              </td>

                              {/* Tiền tạm ứng */}
                              <td style={{ padding: '7px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                                  {formatCurrency(subItem.advanceAmount)}
                                </div>
                              </td>

                              {/* Thực chi */}
                              <td style={{ padding: '7px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: subItem.actualSpent > 0 ? '#059669' : 'var(--text-muted)' }}>
                                  {subItem.actualSpent > 0 ? formatCurrency(subItem.actualSpent) : '—'}
                                </div>
                                {subItem.invoices.length > 0 && (
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                    {subItem.invoices.length} chứng từ/HĐ
                                  </div>
                                )}
                              </td>

                              {/* Chênh lệch thu / bù */}
                              <td style={{ padding: '7px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                                {renderDifferenceBadge(subItem.advanceAmount, subItem.actualSpent, subItem.status)}
                              </td>

                              {/* Hạn hoàn ứng */}
                              <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div
                                  style={{
                                    fontSize: '0.78125rem',
                                    fontWeight: subItem.status === 'overdue' ? 700 : 500,
                                    color: subItem.status === 'overdue' ? '#dc2626' : 'var(--text-primary)',
                                  }}
                                >
                                  {subItem.deadlineRefund}
                                </div>
                              </td>

                              {/* Trạng thái */}
                              <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                {renderStatusBadge(subItem.status)}
                              </td>

                              {/* Thao tác */}
                              <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Xem chi tiết hoàn ứng"
                                    onClick={() => {
                                      setSelectedItem(subItem);
                                      setIsDetailModalOpen(true);
                                    }}
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-subtle)',
                                      backgroundColor: 'var(--bg-surface-2)',
                                      color: 'var(--text-primary)',
                                      padding: 0,
                                    }}
                                  >
                                    <Eye size={13} />
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Lập / Cập nhật quyết toán"
                                    onClick={() => handleOpenCreateModal(subItem)}
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-subtle)',
                                      backgroundColor: 'var(--bg-surface-2)',
                                      color: 'var(--color-primary)',
                                      padding: 0,
                                    }}
                                  >
                                    <Receipt size={13} />
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="In phiếu hoàn ứng"
                                    onClick={() => {
                                      setSelectedItem(subItem);
                                      setIsPrintModalOpen(true);
                                    }}
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-subtle)',
                                      backgroundColor: 'var(--bg-surface-2)',
                                      color: '#059669',
                                      padding: 0,
                                    }}
                                  >
                                    <Printer size={13} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  }

                  // --- TRƯỜNG HỢP 2: NHÂN VIÊN CHỈ CÓ 1 KHOẢN TẠM ỨNG (HIỂN THỊ ĐƠN LẺ) ---
                  const singleItem = group.items[0];
                  return (
                    <tr
                      key={singleItem.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-1)';
                      }}
                    >
                      {/* STT */}
                      <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{stt}</span>
                      </td>

                      {/* Mã phiếu và Mục đích/Dự án */}
                      <td style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.78125rem',
                              color: 'var(--color-primary)',
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {singleItem.advanceCode}
                          </span>

                          {singleItem.settlementCode ? (
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: '#059669',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              Phiếu hoàn: {singleItem.settlementCode}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                color: 'var(--text-muted, #94a3b8)',
                                fontStyle: 'italic',
                              }}
                            >
                              Chưa lập phiếu hoàn
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)',
                            marginTop: '3px',
                            lineHeight: 1.3,
                          }}
                        >
                          {singleItem.purpose}
                        </div>
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Building size={10} /> Dự án: <strong style={{ color: 'var(--text-primary)' }}>{singleItem.project}</strong>
                        </div>
                      </td>

                      {/* Người xin tạm ứng và Bộ phận */}
                      <td style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                          {singleItem.employeeName}
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                          {singleItem.department}
                        </div>
                      </td>

                      {/* Tiền tạm ứng */}
                      <td style={{ padding: '7px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {formatCurrency(singleItem.advanceAmount)}
                        </div>
                      </td>

                      {/* Thực chi */}
                      <td style={{ padding: '7px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: singleItem.actualSpent > 0 ? '#059669' : 'var(--text-muted)' }}>
                          {singleItem.actualSpent > 0 ? formatCurrency(singleItem.actualSpent) : '—'}
                        </div>
                        {singleItem.invoices.length > 0 && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                            {singleItem.invoices.length} chứng từ/HĐ
                          </div>
                        )}
                      </td>

                      {/* Chênh lệch thu / bù */}
                      <td style={{ padding: '7px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {renderDifferenceBadge(singleItem.advanceAmount, singleItem.actualSpent, singleItem.status)}
                      </td>

                      {/* Hạn hoàn ứng */}
                      <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontSize: '0.78125rem',
                            fontWeight: singleItem.status === 'overdue' ? 700 : 500,
                            color: singleItem.status === 'overdue' ? '#dc2626' : 'var(--text-primary)',
                          }}
                        >
                          {singleItem.deadlineRefund}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {renderStatusBadge(singleItem.status)}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '7px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết hoàn ứng"
                            onClick={() => {
                              setSelectedItem(singleItem);
                              setIsDetailModalOpen(true);
                            }}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-2)',
                              color: 'var(--text-primary)',
                              padding: 0,
                            }}
                          >
                            <Eye size={13} />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Lập / Cập nhật quyết toán"
                            onClick={() => handleOpenCreateModal(singleItem)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-2)',
                              color: 'var(--color-primary)',
                              padding: 0,
                            }}
                          >
                            <Receipt size={13} />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="In phiếu hoàn ứng"
                            onClick={() => {
                              setSelectedItem(singleItem);
                              setIsPrintModalOpen(true);
                            }}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface-2)',
                              color: '#059669',
                              padding: 0,
                            }}
                          >
                            <Printer size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PHÂN TRANG (PAGINATION) */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 8px', backgroundColor: 'var(--bg-surface-1)' }}>
          <Pagination
            currentPage={currentPage}
            totalItems={groupedEntities.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            rightActions={
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Hiển thị <strong>{groupedEntities.length}</strong> thực thể ({stats.totalCount} phiếu tạm ứng)
              </div>
            }
          />
        </div>
      </div>

      {/* --- MODAL 1: XEM CHI TIẾT HOÀN TẠM ỨNG --- */}
      {selectedItem && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Hồ sơ hoàn tạm ứng: ${selectedItem.settlementCode || selectedItem.advanceCode}`}
          maxWidth="840px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} /> In phiếu quyết toán
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenCreateModal(selectedItem);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Receipt size={14} /> Chỉnh sửa quyết toán
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.8125rem' }}>
            {/* Box 1: Thông tin đề xuất tạm ứng gốc */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  1. THÔNG TIN PHIẾU TẠM ỨNG GỐC
                </div>
                {renderStatusBadge(selectedItem.status)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Mã phiếu tạm ứng: </span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{selectedItem.advanceCode}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Người xin tạm ứng: </span>
                  <strong>{selectedItem.employeeName}</strong> ({selectedItem.employeeCode})
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Phòng ban / Bộ phận: </span>
                  <strong>{selectedItem.department}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Người duyệt và Ngày duyệt: </span>
                  <strong>{selectedItem.approver}</strong> ({selectedItem.approvedDate})
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Số tiền đã tạm ứng: </span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '0.9375rem' }}>{formatCurrency(selectedItem.advanceAmount)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Hạn hoàn tạm ứng: </span>
                  <strong style={{ color: selectedItem.status === 'overdue' ? '#dc2626' : 'var(--text-primary)' }}>
                    {selectedItem.deadlineRefund}
                  </strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mục đích tạm ứng: </span>
                  <span>{selectedItem.purpose}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dự án liên quan: </span>
                  <strong>{selectedItem.project}</strong>
                </div>
              </div>
            </div>

            {/* Box 2: Tóm tắt đối soát chênh lệch tài chính */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                textAlign: 'center',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  SỐ TIỀN ĐÃ TẠM ỨNG
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {formatCurrency(selectedItem.advanceAmount)}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  SỐ TIỀN THỰC CHI THEO CHỨNG TỪ
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                  {formatCurrency(selectedItem.actualSpent)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  CHÊNH LỆCH ĐỐI SOÁT
                </div>
                <div style={{ marginTop: '4px' }}>
                  {renderDifferenceBadge(selectedItem.advanceAmount, selectedItem.actualSpent, selectedItem.status)}
                </div>
              </div>
            </div>

            {/* Box 3: Danh sách bảng kê hóa đơn / chứng từ kèm theo */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                2. BẢNG KÊ HÓA ĐƠN VÀ CHỨNG TỪ QUYẾT TOÁN THỰC TẾ ({selectedItem.invoices.length} chứng từ)
              </div>
              {selectedItem.invoices.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-surface-2)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Chưa có hóa đơn hoặc chứng từ đính kèm
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem' }}>
                    <thead style={{ backgroundColor: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <tr>
                        <th style={{ padding: '6px 10px', textAlign: 'center', width: '40px' }}>STT</th>
                        <th style={{ padding: '6px 10px', width: '120px' }}>Số hóa đơn/CT</th>
                        <th style={{ padding: '6px 10px' }}>Nội dung chi / Đơn vị xuất</th>
                        <th style={{ padding: '6px 10px', width: '90px', textAlign: 'center' }}>Ngày CT</th>
                        <th style={{ padding: '6px 10px', width: '120px', textAlign: 'right' }}>Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.invoices.map((inv, idx) => (
                        <tr key={inv.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 600, fontFamily: 'monospace' }}>{inv.invoiceNo}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <div style={{ fontWeight: 500 }}>{inv.content}</div>
                            <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>{inv.supplier}</div>
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>{inv.date}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(inv.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: 'var(--bg-surface-2)', fontWeight: 700 }}>
                      <tr>
                        <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'right' }}>
                          TỔNG THỰC CHI QUYẾT TOÁN:
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#059669', fontSize: '0.84375rem' }}>
                          {formatCurrency(selectedItem.actualSpent)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Box 4: Ghi chú kế toán */}
            {selectedItem.note && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  border: '1px dashed var(--color-primary)',
                  fontSize: '0.78125rem',
                }}
              >
                <strong>Ghi chú kế toán: </strong> {selectedItem.note}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* --- MODAL 2: LẬP / CẬP NHẬT PHIẾU HOÀN TẠM ỨNG --- */}
      <Modal
        isOpen={isCreateSettlementModalOpen}
        onClose={() => setIsCreateSettlementModalOpen(false)}
        title="Lập / Cập nhật quyết toán hoàn tạm ứng"
        maxWidth="860px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsCreateSettlementModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSaveSettlement(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              Lưu tạm (Đang xử lý)
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSaveSettlement(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckLg size={16} /> Phê duyệt hoàn tất quyết toán
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.8125rem' }}>
          {/* Chọn phiếu tạm ứng cần quyết toán */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Chọn khoản tạm ứng đã phê duyệt: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={targetAdvanceId}
              onChange={(e) => {
                const selId = e.target.value;
                setTargetAdvanceId(selId);
                const found = data.find((d) => d.id === selId);
                if (found) {
                  setNewActualSpent(found.actualSpent || found.advanceAmount);
                  setNewNote(found.note || '');
                  setNewInvoices(found.invoices.map((i) => ({ ...i })));
                }
              }}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-1)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
            >
              {data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.advanceCode} - {item.employeeName} ({item.department}) - Tạm ứng:{' '}
                  {formatCurrency(item.advanceAmount)} - {item.purpose.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          {/* Chi tiết tính toán chênh lệch tự động */}
          {(() => {
            const currentSelected = data.find((d) => d.id === targetAdvanceId);
            if (!currentSelected) return null;

            const diff = newActualSpent - currentSelected.advanceAmount;

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>Tiền đã tạm ứng:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {formatCurrency(currentSelected.advanceAmount)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>Tổng thực chi theo HĐ:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                    {formatCurrency(newActualSpent)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>Kết quả chênh lệch:</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: '2px' }}>
                    {diff === 0 ? (
                      <span style={{ color: 'var(--text-secondary)' }}>Cân bằng (0 đ)</span>
                    ) : diff < 0 ? (
                      <span style={{ color: '#059669' }}>Thu hoàn quỹ: {formatCurrency(Math.abs(diff))}</span>
                    ) : (
                      <span style={{ color: '#d97706' }}>Công ty chi bù: +{formatCurrency(diff)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Form thêm chứng từ / hóa đơn */}
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-1)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>
              Kê khai hóa đơn và chứng từ chi tiêu:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Số hóa đơn / Phiếu chi:
                </label>
                <input
                  type="text"
                  placeholder="VD: HD-00921"
                  value={tempInv.invoiceNo}
                  onChange={(e) => setTempInv({ ...tempInv, invoiceNo: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Đơn vị cung ứng / Nội dung chi:
                </label>
                <input
                  type="text"
                  placeholder="VD: Cửa hàng cơ khí Minh Phát / Mua phụ kiện cửa..."
                  value={tempInv.content}
                  onChange={(e) => setTempInv({ ...tempInv, content: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Số tiền (VNĐ):
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={tempInv.amount}
                  onChange={(e) => setTempInv({ ...tempInv, amount: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78125rem',
                    textAlign: 'right',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Ngày chứng từ:
                </label>
                <input
                  type="date"
                  value={tempInv.date}
                  onChange={(e) => setTempInv({ ...tempInv, date: e.target.value })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78125rem',
                  }}
                />
              </div>

              <Button
                variant="primary"
                onClick={handleAddInvoice}
                style={{
                  height: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={16} /> Thêm
              </Button>
            </div>

            {/* Bảng danh sách hóa đơn đã thêm */}
            {newInvoices.length > 0 && (
              <div style={{ marginTop: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78125rem' }}>
                  <thead style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                    <tr>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '35px' }}>#</th>
                      <th style={{ padding: '6px 8px', width: '120px' }}>Số HĐ</th>
                      <th style={{ padding: '6px 8px' }}>Nội dung chi</th>
                      <th style={{ padding: '6px 8px', width: '90px', textAlign: 'center' }}>Ngày</th>
                      <th style={{ padding: '6px 8px', width: '120px', textAlign: 'right' }}>Số tiền</th>
                      <th style={{ padding: '6px 8px', width: '45px', textAlign: 'center' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newInvoices.map((inv, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, fontFamily: 'monospace' }}>{inv.invoiceNo}</td>
                        <td style={{ padding: '6px 8px' }}>{inv.content}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{inv.date}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveInvoice(idx)}
                            style={{
                              color: '#ef4444',
                              width: '24px',
                              height: '24px',
                              padding: 0,
                            }}
                            title="Xóa dòng"
                          >
                            <Trash size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ backgroundColor: 'var(--bg-surface-2)', fontWeight: 700 }}>
                    <tr>
                      <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right' }}>
                        TỔNG CỘNG THỰC CHI:
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#059669' }}>
                        {formatCurrency(newActualSpent)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Ghi chú và chứng từ đính kèm */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Ý kiến / Ghi chú quyết toán của kế toán thanh toán:
            </label>
            <textarea
              rows={3}
              placeholder="Nhập ghi chú đối soát, số phiếu thu nộp tiền thừa hoặc ủy nhiệm chi chi bù..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-1)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* --- MODAL 3: IN BIÊN BẢN / PHIẾU THANH TOÁN TẠM ỨNG (PRINT PREVIEW) --- */}
      {selectedItem && (
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`In phiếu thanh toán tạm ứng: ${selectedItem.settlementCode || selectedItem.advanceCode}`}
          maxWidth="780px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="secondary" onClick={() => setIsPrintModalOpen(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                  onShowToast?.('success', 'In thành công', 'Đang gửi lệnh in phiếu hoàn tạm ứng ra máy in...');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> In phiếu ra giấy (A4)
              </Button>
            </div>
          }
        >
          {/* Mẫu phiếu A4 chuẩn kế toán */}
          <div
            style={{
              padding: '24px 28px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontFamily: '"Times New Roman", Times, serif',
            }}
          >
            {/* Header doanh nghiệp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase' }}>
                  CÔNG TY CỔ PHẦN SẢN XUẤT DECO DOOR
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  KCN Yên Phong mở rộng, Huyện Yên Phong, Tỉnh Bắc Ninh
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Mã số thuế: 2301198822 | ĐT: 0222.388.9999
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
                <div><strong>Mẫu số 04 - TT</strong></div>
                <div>(Ban hành theo Thông tư 200/2014/TT-BTC)</div>
                <div style={{ marginTop: '4px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                  Số: {selectedItem.settlementCode || selectedItem.advanceCode}
                </div>
              </div>
            </div>

            {/* Tiêu đề phiếu */}
            <div style={{ textAlign: 'center', margin: '20px 0 16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                GIẤY THANH TOÁN TIỀN TẠM ỨNG
              </div>
              <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>
                Ngày {selectedItem.settlementDate || '11/10/2026'}
              </div>
            </div>

            {/* Thông tin nhân viên và tạm ứng */}
            <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
              <div>- Họ và tên người thanh toán: <strong>{selectedItem.employeeName}</strong> (Mã NV: {selectedItem.employeeCode})</div>
              <div>- Bộ phận (Phòng ban): <strong>{selectedItem.department}</strong></div>
              <div>- Theo phiếu tạm ứng số: <strong>{selectedItem.advanceCode}</strong> ngày {selectedItem.approvedDate}</div>
              <div>- Mục đích tạm ứng: {selectedItem.purpose}</div>
              <div>- Công trình / Dự án: <strong>{selectedItem.project}</strong></div>
            </div>

            {/* Bảng thanh toán quyết toán */}
            <div style={{ marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #334155', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #334155', textAlign: 'center' }}>
                    <th style={{ border: '1px solid #334155', padding: '6px' }}>Khoản mục</th>
                    <th style={{ border: '1px solid #334155', padding: '6px', width: '140px' }}>Số tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #334155', padding: '6px', fontWeight: 600 }}>I. Số tiền tạm ứng đã nhận:</td>
                    <td style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(selectedItem.advanceAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #334155', padding: '6px', fontWeight: 600 }}>II. Số tiền đã thực chi theo chứng từ:</td>
                    <td style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {formatCurrency(selectedItem.actualSpent)}
                    </td>
                  </tr>
                  {selectedItem.invoices.map((inv, i) => (
                    <tr key={i} style={{ fontStyle: 'italic', color: '#475569' }}>
                      <td style={{ border: '1px solid #334155', padding: '4px 6px 4px 20px' }}>
                        - HĐ {inv.invoiceNo}: {inv.content} ({inv.supplier})
                      </td>
                      <td style={{ border: '1px solid #334155', padding: '4px 6px', textAlign: 'right' }}>
                        {formatCurrency(inv.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td style={{ border: '1px solid #334155', padding: '6px' }}>III. Chênh lệch thanh toán đối soát:</td>
                    <td style={{ border: '1px solid #334155', padding: '6px', textAlign: 'right' }}>
                      {selectedItem.actualSpent - selectedItem.advanceAmount === 0 ? (
                        '0 đ (Cân bằng)'
                      ) : selectedItem.actualSpent < selectedItem.advanceAmount ? (
                        <span style={{ color: '#059669' }}>
                          Nộp hoàn quỹ: {formatCurrency(selectedItem.advanceAmount - selectedItem.actualSpent)}
                        </span>
                      ) : (
                        <span style={{ color: '#d97706' }}>
                          Chi thêm: +{formatCurrency(selectedItem.actualSpent - selectedItem.advanceAmount)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Chữ ký 4 bên chuẩn kế toán */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center', marginTop: '36px', fontSize: '12px' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Người đề nghị</div>
                <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                <div style={{ marginTop: '55px', fontWeight: 700 }}>{selectedItem.employeeName}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Kế toán thanh toán</div>
                <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                <div style={{ marginTop: '55px', fontWeight: 700 }}>Vũ Thị Lan Hương</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Kế toán trưởng</div>
                <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                <div style={{ marginTop: '55px', fontWeight: 700 }}>Phạm Thanh Thảo</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Thủ trưởng đơn vị</div>
                <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký, đóng dấu)</div>
                <div style={{ marginTop: '55px', fontWeight: 700 }}>Hà Hải Lâm</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
