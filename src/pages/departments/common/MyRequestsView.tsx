import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileEarmarkText,
  Clock,
  CalendarCheck,
  CashCoin,
  Receipt,
  Airplane,
  Plus,
  X,
  PencilSquare,
  FileEarmarkPlus,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { DeleteButton } from '../../../components/common/DeleteButton';
import { Badge } from '../../../components/common/Badge';
import { TableToolbar, type TableToolbarFilter } from '../../../components/common/TableToolbar';
import { FullWidthTable } from '../../../components/common/FullWidthTable';
import { Pagination } from '../../../components/common/Pagination';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Select } from '../../../components/common/Select';
import { Input } from '../../../components/common/Input';
import { notifyFinanceUpdated } from '../../../services/financeSyncService';
import { useAuth } from '../../../context/AuthContext';

export type RequestType =
  | 'late_early'
  | 'leave'
  | 'advance'
  | 'refund'
  | 'business_trip'
  | 'other';

export type RequestStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface MyRequestItem {
  id: string;
  code: string;
  type: RequestType;
  title: string;
  content: string;
  createdAt: string;
  department: string;
  applicantName: string;
  applicantRole: string;

  // Đi muộn về sớm
  lateEarlyType?: 'late' | 'early';
  lateEarlyMinutes?: number;
  lateEarlyTargetTime?: string;
  lateEarlyDate?: string;

  // Nghỉ phép
  leaveCategory?: 'annual' | 'sick' | 'special' | 'unpaid';
  leaveSession?: 'all_day' | 'morning' | 'afternoon';
  leaveFromDate?: string;
  leaveToDate?: string;
  leaveDays?: number;
  handoverPerson?: string;

  // Tạm ứng
  advanceAmount?: number;
  advancePurpose?: string;
  advanceDueDate?: string;
  paymentMethod?: 'bank' | 'cash';
  bankAccount?: string;
  bankName?: string;

  // Hoàn tạm ứng
  advanceRefCode?: string;
  initialAdvanceAmount?: number;
  actualSpentAmount?: number;
  refundDifference?: number;
  invoiceList?: string;

  // Đi công tác
  tripDestination?: string;
  tripPurpose?: string;
  tripFromDate?: string;
  tripToDate?: string;
  tripTransport?: string;
  tripEstimatedCost?: number;

  // Thông tin xét duyệt
  approver: string;
  status: RequestStatus;
  statusLabel: string;
  approvalDate?: string;
  rejectionReason?: string;
  note?: string;
  userId?: number;
  userEmail?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  priorityLabel?: string;
}

export const APPROVER_GROUPS = [
  {
    group: 'Ban Giám đốc',
    options: [
      { label: 'Lê Công Vụ - Ban Giám đốc', value: 'Lê Công Vụ - Ban Giám đốc' },
      { label: 'Đoàn Thị Yến - Ban Giám đốc', value: 'Đoàn Thị Yến - Ban Giám đốc' },
    ],
  },
  {
    group: 'Trưởng các phòng ban',
    options: [
      { label: 'Cao Thị Phương - Phòng Nhân sự', value: 'Cao Thị Phương - Phòng Nhân sự' },
      { label: 'Trần Thị Linh - Phòng Tài chính – Kế toán', value: 'Trần Thị Linh - Phòng Tài chính – Kế toán' },
      { label: 'Nguyễn Thu Huyền - Phòng Marketing', value: 'Nguyễn Thu Huyền - Phòng Marketing' },
      { label: 'Lê Anh Vân - Phòng Đảm bảo chất lượng', value: 'Lê Anh Vân - Phòng Đảm bảo chất lượng' },
    ],
  },
  {
    group: 'Quản đốc phân xưởng và Điều phối',
    options: [
      { label: 'Hà Thị Bích Ngọc - Phòng Sản xuất', value: 'Hà Thị Bích Ngọc - Phòng Sản xuất' },
      { label: 'Nguyễn Văn Tiền - Phòng Kho vận', value: 'Nguyễn Văn Tiền - Phòng Kho vận' },
    ],
  },
];

export interface MyRequestsViewProps {
  department?: string;
  onShowToast?: (type: any, title: string, message: string, durationMs?: number) => void;
}

const formatNumberGroup = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
};

const parseApprover = (approverStr?: string): { name: string; role: string } => {
  if (!approverStr) return { name: '—', role: '' };
  if (approverStr.includes(' - ')) {
    const parts = approverStr.split(' - ');
    return {
      name: parts[0].trim(),
      role: parts.slice(1).join(' - ').trim(),
    };
  }
  return { name: approverStr.trim(), role: '' };
};


const getCurrentUserFromStorage = () => {
  try {
    const seajongStr = localStorage.getItem('seajong_user');
    if (seajongStr) {
      const s = JSON.parse(seajongStr);
      if (s.user) return s.user;
      if (s.email || s.id) return s;
    }
  } catch {}
  try {
    const sessionStr = localStorage.getItem('decodoor_session');
    if (sessionStr) {
      const s = JSON.parse(sessionStr);
      if (s.user) return s.user;
      if (s.email) return s;
    }
  } catch {}
  try {
    const userStr = localStorage.getItem('decodoor_current_user');
    if (userStr) return JSON.parse(userStr);
  } catch {}
  return null;
};

export const MyRequestsView: React.FC<MyRequestsViewProps> = ({
  department = 'finance',
  onShowToast,
}) => {
  const { user: authUser } = useAuth();
  const [requests, setRequests] = useState<MyRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasLoadedRef = useRef<boolean>(false);
  const lastPayloadHashRef = useRef<string>('');

  // Tải dữ liệu thực tế từ CSDL SQLite (/api/personal-requests) của riêng cá nhân đang đăng nhập
  const fetchRequests = async (silent = false) => {
    if (!silent && !hasLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      const user: any = authUser || getCurrentUserFromStorage();
      const storedUserId = localStorage.getItem('seajong_user_id');
      const email = user?.email || user?.employee?.workEmail || '';
      const uid = user?.employee?.id || user?.id || storedUserId || '';
      const uname = user?.employee?.fullName || user?.name || '';

      if (!email && !uid && !uname) {
        if (!silent) setIsLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('scope', 'mine');
      if (email) params.append('userEmail', String(email));
      if (uid) params.append('userId', String(uid));
      if (uname) params.append('userName', String(uname));

      const url = `/api/personal-requests?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const nextHash = JSON.stringify(list);
        if (nextHash !== lastPayloadHashRef.current) {
          lastPayloadHashRef.current = nextHash;
          setRequests(list);
        }
        hasLoadedRef.current = true;
      }
    } catch (err) {
      console.error('Lỗi khi tải yêu cầu cá nhân từ CSDL:', err);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    try {
      localStorage.removeItem('decodoor_my_requests');
    } catch {}
    lastPayloadHashRef.current = '';
    fetchRequests(false);

    const handleSync = () => {
      fetchRequests(true);
    };

    window.addEventListener('decodoor_request_created', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);

    const interval = setInterval(() => fetchRequests(true), 5000);

    return () => {
      window.removeEventListener('decodoor_request_created', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, [authUser?.id, authUser?.email, authUser?.name]);

  // Bộ lọc
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal tạo mới / chỉnh sửa
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MyRequestItem | null>(null);
  const [selectedCreateType, setSelectedCreateType] = useState<RequestType>('late_early');

  const defaultTodayDmy = useMemo(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }, []);

  // Form tạo mới
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formApprover, setFormApprover] = useState('Lê Công Vụ - Ban Giám đốc');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [formNote, setFormNote] = useState('');

  // Form Đi muộn về sớm
  const [lateEarlyType, setLateEarlyType] = useState<'late' | 'early'>('late');
  const [lateEarlyMinutes, setLateEarlyMinutes] = useState('30');
  const [lateEarlyDate, setLateEarlyDate] = useState(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });
  const [lateEarlyTargetTime, setLateEarlyTargetTime] = useState('08:30');

  // Form Nghỉ phép
  const [leaveCategory, setLeaveCategory] = useState<'annual' | 'sick' | 'special' | 'unpaid'>('annual');
  const [leaveSession, setLeaveSession] = useState<'all_day' | 'morning' | 'afternoon'>('all_day');
  const [leaveFromDate, setLeaveFromDate] = useState(defaultTodayDmy);
  const [leaveToDate, setLeaveToDate] = useState(defaultTodayDmy);
  const [leaveDays, setLeaveDays] = useState('1');
  const [handoverPerson, setHandoverPerson] = useState('');

  // Tự động xác định số ngày nghỉ từ dữ liệu Thời gian nghỉ, Từ ngày và Đến ngày
  useEffect(() => {
    const parseDmy = (str: string): Date | null => {
      if (!str) return null;
      const s = str.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/').map(Number);
        return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [yyyy, mm, dd] = s.slice(0, 10).split('-').map(Number);
        return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
      }
      return null;
    };

    const fromDt = parseDmy(leaveFromDate);
    const toDt = parseDmy(leaveToDate) || fromDt;
    if (!fromDt || !toDt || toDt < fromDt) {
      setLeaveDays(leaveSession === 'all_day' ? '1' : '0.5');
      return;
    }

    const cur = new Date(fromDt.getFullYear(), fromDt.getMonth(), fromDt.getDate());
    const end = new Date(toDt.getFullYear(), toDt.getMonth(), toDt.getDate());
    let workDaysCount = 0;
    let guard = 0;
    while (cur <= end && guard < 60) {
      guard++;
      if (cur.getDay() !== 0) {
        workDaysCount++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    const baseDays = Math.max(1, workDaysCount);
    const weight = leaveSession === 'all_day' ? 1 : 0.5;
    setLeaveDays(String(baseDays * weight));
  }, [leaveFromDate, leaveToDate, leaveSession]);

  // Kiểm soát quỹ phép năm của nhân viên (Tối đa 12 ngày/năm • 1 ngày phép có lương/tháng)
  const leaveQuotaSummary = useMemo(() => {
    const parseDmy = (str?: string): Date | null => {
      if (!str) return null;
      const s = str.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/').map(Number);
        return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [yyyy, mm, dd] = s.slice(0, 10).split('-').map(Number);
        return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
      }
      return null;
    };

    const refDt = parseDmy(leaveFromDate) || new Date();
    const targetYear = refDt.getFullYear();
    const targetMonth = refDt.getMonth() + 1;
    const targetMonthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const sUser: any = authUser || getCurrentUserFromStorage();
    const targetApplicant =
      editingRequest?.applicantName ||
      sUser?.employee?.fullName ||
      sUser?.name ||
      '';
    const targetEmail =
      editingRequest?.userEmail ||
      sUser?.employee?.workEmail ||
      sUser?.email ||
      '';

    // Lọc các đơn nghỉ phép của chính nhân viên đang thao tác (trừ đơn đang sửa nếu có)
    const empLeaveReqs = requests
      .filter((r) => {
        if (r.type !== 'leave') return false;
        if (editingRequest && r.id === editingRequest.id) return false;
        if (r.status === 'rejected') return false;
        const sameName =
          r.applicantName &&
          targetApplicant &&
          r.applicantName.toLowerCase().trim() === targetApplicant.toLowerCase().trim();
        const sameEmail =
          r.userEmail &&
          targetEmail &&
          r.userEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim();
        return sameName || sameEmail || !targetApplicant;
      })
      .sort((a, b) => {
        const da = parseDmy(a.leaveFromDate) || new Date(0);
        const db = parseDmy(b.leaveFromDate) || new Date(0);
        return da.getTime() - db.getTime();
      });

    const paidAnnualByMonth = new Map<string, number>();
    let totalYearPaidAnnualUsed = 0;
    let totalMonthLeaveDays = 0;

    for (const r of empLeaveReqs) {
      const fDt = parseDmy(r.leaveFromDate);
      const tDt = parseDmy(r.leaveToDate) || fDt;
      if (!fDt || !tDt) continue;

      const ses = r.leaveSession || 'all_day';
      const dayWeight = ses === 'morning' || ses === 'afternoon' ? 0.5 : 1.0;
      const cur = new Date(fDt.getFullYear(), fDt.getMonth(), fDt.getDate());
      const end = new Date(tDt.getFullYear(), tDt.getMonth(), tDt.getDate());
      let guard = 0;

      while (cur <= end && guard < 60) {
        guard++;
        if (cur.getDay() !== 0) {
          const y = cur.getFullYear();
          const m = cur.getMonth() + 1;
          const mKey = `${y}-${String(m).padStart(2, '0')}`;

          if (mKey === targetMonthKey) {
            totalMonthLeaveDays += dayWeight;
          }

          if (y === targetYear && (r.leaveCategory || 'annual') === 'annual') {
            const usedInM = paidAnnualByMonth.get(mKey) || 0;
            const avail = Math.max(
              0,
              Math.min(1.0 - usedInM, 12.0 - totalYearPaidAnnualUsed)
            );
            const paidPortion = Math.min(dayWeight, avail);
            paidAnnualByMonth.set(mKey, usedInM + paidPortion);
            totalYearPaidAnnualUsed += paidPortion;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    const currentReqDays = parseFloat(leaveDays) || (leaveSession === 'all_day' ? 1 : 0.5);
    const usedPaidInTargetMonth = paidAnnualByMonth.get(targetMonthKey) || 0;
    const remainingYearBefore = Math.max(0, 12 - totalYearPaidAnnualUsed);
    const remainingMonthPaidBefore = Math.max(
      0,
      Math.min(1.0 - usedPaidInTargetMonth, remainingYearBefore)
    );

    const paidDaysForCurrent =
      leaveCategory === 'annual'
        ? Math.min(currentReqDays, remainingMonthPaidBefore)
        : leaveCategory === 'special'
          ? currentReqDays
          : 0;
    const unpaidDaysForCurrent = Math.max(0, currentReqDays - paidDaysForCurrent);
    const remainingYearAfter =
      leaveCategory === 'annual'
        ? Math.max(0, remainingYearBefore - paidDaysForCurrent)
        : remainingYearBefore;
    const totalMonthWithCurrent = totalMonthLeaveDays + currentReqDays;

    return {
      targetMonth,
      targetYear,
      maxAnnualQuota: 12,
      totalYearPaidAnnualUsed,
      remainingYearBefore,
      remainingYearAfter,
      totalMonthLeaveDays,
      totalMonthWithCurrent,
      usedPaidInTargetMonth,
      remainingMonthPaidBefore,
      currentReqDays,
      paidDaysForCurrent,
      unpaidDaysForCurrent,
    };
  }, [requests, editingRequest, leaveFromDate, leaveToDate, leaveSession, leaveDays, leaveCategory]);

  // Kiểm tra định mức phép năm hưởng lương (12 ngày/năm và 1 ngày/tháng): nếu hết phép có lương khả dụng trong tháng thì khóa nút Gửi yêu cầu phê duyệt
  const isAnnualLeaveQuotaExceeded =
    selectedCreateType === 'leave' &&
    leaveCategory === 'annual' &&
    (leaveQuotaSummary.remainingMonthPaidBefore <= 0 ||
      leaveQuotaSummary.currentReqDays > leaveQuotaSummary.remainingMonthPaidBefore ||
      leaveQuotaSummary.remainingYearBefore <= 0);

  // Form Tạm ứng
  const [advanceAmount, setAdvanceAmount] = useState('5000000');
  const [advancePurpose, setAdvancePurpose] = useState('Tạm ứng công tác phí');
  const [advanceDueDate, setAdvanceDueDate] = useState('20/10/2026');
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<'bank' | 'cash'>('bank');
  const [bankAccount, setBankAccount] = useState('19033458992011');
  const [bankName, setBankName] = useState('Techcombank Đà Nẵng');

  // Form Hoàn tạm ứng
  const [advanceRefCode, setAdvanceRefCode] = useState('YC-2026-079');
  const [initialAdvanceAmount, setInitialAdvanceAmount] = useState('15000000');
  const [actualSpentAmount, setActualSpentAmount] = useState('12500000');
  const [invoiceList, setInvoiceList] = useState('Hóa đơn vé máy bay và khách sạn');

  // Form Đi công tác
  const [tripDestination, setTripDestination] = useState('Thành phố Hồ Chí Minh');
  const [tripPurpose, setTripPurpose] = useState('Họp đại hội khách hàng và ký kết đại lý');
  const [tripFromDate, setTripFromDate] = useState('15/10/2026');
  const [tripToDate, setTripToDate] = useState('17/10/2026');
  const [tripTransport, setTripTransport] = useState('Máy bay khứ hồi và taxi nội đô');
  const [tripEstimatedCost, setTripEstimatedCost] = useState('10000000');

  // Modal Chi tiết
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<MyRequestItem | null>(null);

  // Confirm xóa / hủy yêu cầu
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<MyRequestItem | null>(null);

  // Lọc dữ liệu (chỉ hiển thị các yêu cầu & đề xuất của chính cá nhân đang đăng nhập)
  const filteredRequests = useMemo(() => {
    const activeUser: any = authUser || getCurrentUserFromStorage();
    const myEmail = (activeUser?.employee?.workEmail || activeUser?.email || '').toLowerCase().trim();
    const myName = (activeUser?.employee?.fullName || activeUser?.name || '').toLowerCase().trim();
    const myId = String(activeUser?.employee?.id || activeUser?.id || '').trim();

    return requests.filter((item) => {
      if (myEmail || myName || myId) {
        const itemEmail = (item.userEmail || '').toLowerCase().trim();
        const itemName = (item.applicantName || '').toLowerCase().trim();
        const itemId = String(item.userId || '').trim();
        const isMine =
          (myEmail && itemEmail && itemEmail === myEmail) ||
          (myName && itemName && itemName === myName) ||
          (myId && itemId && itemId === myId);
        if (!isMine) return false;
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchValue.trim()) {
        const query = searchValue.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(query);
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchContent = item.content.toLowerCase().includes(query);
        const matchApprover = item.approver.toLowerCase().includes(query);
        if (!matchCode && !matchTitle && !matchContent && !matchApprover) return false;
      }
      return true;
    });
  }, [requests, typeFilter, statusFilter, searchValue, authUser]);

  // Phân trang
  const pagedList = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Toggle chọn 1 dòng
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle chọn tất cả trên trang hiện tại
  const toggleSelectAll = () => {
    const currentPageIds = pagedList.map((item) => item.id);
    const allSelected =
      currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Xóa hàng loạt
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const deletedCodes = requests.filter((r) => selectedIds.includes(r.id)).map((r) => r.code);
    try {
      const res = await fetch('/api/personal-requests/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        const count = selectedIds.length;

        // Tự động đồng bộ và dọn dẹp các phân hệ liên quan (Ban Giám đốc, Tài chính, Kế toán)
        try {
          notifyFinanceUpdated('personal_requests', 'delete');
          window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
          window.dispatchEvent(new CustomEvent('decodoor_finance_cashflow_updated'));

          const savedDocs = localStorage.getItem('decodoor_approval_documents');
          if (savedDocs) {
            const parsed = JSON.parse(savedDocs);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(
                (d: any) => !deletedCodes.includes(d.code) && !selectedIds.includes(d.id)
              );
              localStorage.setItem('decodoor_approval_documents', JSON.stringify(filtered));
            }
          }
        } catch (syncErr) {
          console.warn('Lỗi đồng bộ xoá hàng loạt liên hoàn:', syncErr);
        }

        setRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
        setSelectedIds([]);
        if (onShowToast) {
          onShowToast('success', 'Xóa thành công', `Đã xóa ${count} yêu cầu cá nhân và đồng bộ xóa khỏi các phân hệ liên quan`);
        }
      }
    } catch (err) {
      console.error('Lỗi khi xóa hàng loạt yêu cầu:', err);
    }
  };



  // Bộ lọc cho TableToolbar
  const toolbarFilters = useMemo((): TableToolbarFilter[] => {
    return [
      {
        id: 'request-type-filter',
        value: typeFilter,
        onChange: (val) => {
          setTypeFilter(val);
          setCurrentPage(1);
        },
        options: [
          { value: 'all', label: 'Tất cả loại yêu cầu' },
          { value: 'late_early', label: 'Đi muộn về sớm' },
          { value: 'leave', label: 'Nghỉ phép' },
          { value: 'advance', label: 'Tạm ứng chi phí' },
          { value: 'refund', label: 'Hoàn tạm ứng' },
          { value: 'business_trip', label: 'Đi công tác' },
          { value: 'other', label: 'Yêu cầu khác' },
        ],
        minWidth: '180px',
      },
      {
        id: 'request-status-filter',
        value: statusFilter,
        onChange: (val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        },
        options: [
          { value: 'all', label: 'Tất cả trạng thái' },
          { value: 'pending', label: 'Chờ phê duyệt' },
          { value: 'approved', label: 'Đã phê duyệt' },
          { value: 'completed', label: 'Đã chi tiền hoặc hoàn tất' },
          { value: 'rejected', label: 'Từ chối duyệt' },
        ],
        minWidth: '180px',
      },
    ];
  }, [typeFilter, statusFilter]);

  // Nhãn loại yêu cầu
  const getTypeBadge = (type: RequestType) => {
    switch (type) {
      case 'late_early':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#f3e8ff',
              color: '#7e22ce',
              border: '1px solid #e9d5ff',
            }}
          >
            <Clock size={12} />
            Đi muộn về sớm
          </span>
        );
      case 'leave':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            <CalendarCheck size={12} />
            Nghỉ phép
          </span>
        );
      case 'advance':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            <CashCoin size={12} />
            Tạm ứng
          </span>
        );
      case 'refund':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
            }}
          >
            <Receipt size={12} />
            Hoàn tạm ứng
          </span>
        );
      case 'business_trip':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
            }}
          >
            <Airplane size={12} />
            Đi công tác
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            <FileEarmarkText size={12} />
            Đề xuất khác
          </span>
        );
    }
  };

  // Badge trạng thái
  const getStatusBadge = (status: RequestStatus, label: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning" style={{ fontWeight: 700 }}>
            {label}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="success" style={{ fontWeight: 700 }}>
            {label}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="brand" style={{ fontWeight: 700 }}>
            {label}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" style={{ fontWeight: 700 }}>
            {label}
          </Badge>
        );
      default:
        return <Badge variant="neutral">{label}</Badge>;
    }
  };

  // Reset và mở modal tạo mới
  const handleOpenCreateModal = (type: RequestType = 'late_early') => {
    setEditingRequest(null);
    setViewingRequest(null);
    setSelectedCreateType(type);
    setFormTitle('');
    setFormContent('');
    setFormNote('');
    setFormApprover('Lê Công Vụ - Ban Giám đốc');
    setFormPriority('medium');
    setCreateModalOpen(true);
  };

  // Mở Offcanvas ở chế độ chỉnh sửa (Edit)
  const handleOpenEditModal = (item: MyRequestItem) => {
    setEditingRequest(item);
    setViewingRequest(item);
    setSelectedCreateType(item.type);
    setFormTitle(item.title || '');
    setFormContent(item.content || '');
    setFormNote(item.note || item.content || '');
    setFormApprover(item.approver || 'Lê Công Vụ - Ban Giám đốc');
    setFormPriority(item.priority || 'medium');

    if (item.type === 'late_early') {
      if (item.lateEarlyType) setLateEarlyType(item.lateEarlyType);
      if (item.lateEarlyMinutes) setLateEarlyMinutes(String(item.lateEarlyMinutes));
      if (item.lateEarlyDate) setLateEarlyDate(item.lateEarlyDate);
      if (item.lateEarlyTargetTime) setLateEarlyTargetTime(item.lateEarlyTargetTime);
    } else if (item.type === 'leave') {
      if (item.leaveCategory) setLeaveCategory(item.leaveCategory);
      if (item.leaveSession) setLeaveSession(item.leaveSession);
      if (item.leaveFromDate) setLeaveFromDate(item.leaveFromDate);
      if (item.leaveToDate) setLeaveToDate(item.leaveToDate);
      if (item.leaveDays) setLeaveDays(String(item.leaveDays));
      if (item.handoverPerson) setHandoverPerson(item.handoverPerson);
    } else if (item.type === 'advance') {
      if (item.advanceAmount) setAdvanceAmount(String(item.advanceAmount));
      if (item.advancePurpose) setAdvancePurpose(item.advancePurpose);
      if (item.advanceDueDate) setAdvanceDueDate(item.advanceDueDate);
      if (item.paymentMethod) setAdvancePaymentMethod(item.paymentMethod);
      if (item.bankAccount) setBankAccount(item.bankAccount);
      if (item.bankName) setBankName(item.bankName);
    } else if (item.type === 'refund') {
      if (item.advanceRefCode) setAdvanceRefCode(item.advanceRefCode);
      if (item.initialAdvanceAmount) setInitialAdvanceAmount(String(item.initialAdvanceAmount));
      if (item.actualSpentAmount) setActualSpentAmount(String(item.actualSpentAmount));
      if (item.invoiceList) setInvoiceList(item.invoiceList);
    } else if (item.type === 'business_trip') {
      if (item.tripDestination) setTripDestination(item.tripDestination);
      if (item.tripPurpose) setTripPurpose(item.tripPurpose);
      if (item.tripFromDate) setTripFromDate(item.tripFromDate);
      if (item.tripToDate) setTripToDate(item.tripToDate);
      if (item.tripTransport) setTripTransport(item.tripTransport);
      if (item.tripEstimatedCost) setTripEstimatedCost(String(item.tripEstimatedCost));
    }

    setCreateModalOpen(true);
  };

  // Submit tạo mới hoặc lưu chỉnh sửa yêu cầu
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnnualLeaveQuotaExceeded) {
      if (onShowToast) {
        onShowToast(
          'warning',
          'Hết phép có lương khả dụng trong tháng',
          `Tháng ${leaveQuotaSummary.targetMonth}/${leaveQuotaSummary.targetYear} chỉ còn ${leaveQuotaSummary.remainingMonthPaidBefore}/1 ngày phép có lương khả dụng (Đơn đăng ký: ${leaveQuotaSummary.currentReqDays} ngày). Vui lòng chọn hình thức nghỉ khác!`
        );
      }
      return;
    }
    const newId = `REQ-${Date.now().toString().slice(-4)}`;
    const randomCodeNum = Math.floor(100 + Math.random() * 900);
    const newCode = `YC-2026-${randomCodeNum}`;
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let computedTitle = formTitle.trim();
    let computedContent = formContent.trim();

    if (selectedCreateType === 'late_early') {
      const typeText = lateEarlyType === 'late' ? 'Đi muộn' : 'Về sớm';
      if (!computedTitle) {
        computedTitle = `Xin phép ${typeText.toLowerCase()} ${lateEarlyMinutes} phút ngày ${lateEarlyDate}`;
      }
      if (!computedContent) {
        computedContent = `Thời gian dự kiến: ${lateEarlyTargetTime}. Lý do: Giải quyết việc cá nhân`;
      }
    } else if (selectedCreateType === 'leave') {
      if (!computedTitle) {
        computedTitle = `Xin nghỉ phép ${leaveDays} ngày từ ${leaveFromDate} đến ${leaveToDate}`;
      }
      if (!computedContent) {
        computedContent = `Bàn giao công việc cho ${handoverPerson}`;
      }
    } else if (selectedCreateType === 'advance') {
      const numAmount = parseFloat(advanceAmount.replace(/[^0-9]/g, '')) || 0;
      if (!computedTitle) {
        computedTitle = `Tạm ứng ${formatNumberGroup(numAmount)} VND cho ${advancePurpose}`;
      }
      if (!computedContent) {
        computedContent = `Thời hạn hoàn ứng dự kiến: ${advanceDueDate}. Phương thức nhận: ${advancePaymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}`;
      }
    } else if (selectedCreateType === 'refund') {
      const diff = (parseFloat(initialAdvanceAmount.replace(/[^0-9]/g, '')) || 0) - (parseFloat(actualSpentAmount.replace(/[^0-9]/g, '')) || 0);
      if (!computedTitle) {
        computedTitle = `Hoàn tạm ứng theo phiếu ${advanceRefCode}`;
      }
      if (!computedContent) {
        computedContent = `Thực chi: ${formatNumberGroup(actualSpentAmount)} VND. Chênh lệch: ${formatNumberGroup(Math.abs(diff))} VND`;
      }
    } else if (selectedCreateType === 'business_trip') {
      if (!computedTitle) {
        computedTitle = `Đăng ký công tác tại ${tripDestination}`;
      }
      if (!computedContent) {
        computedContent = `Thời gian: ${tripFromDate} đến ${tripToDate}. Phương tiện: ${tripTransport}`;
      }
    }

    // Nếu đang ở chế độ chỉnh sửa (Edit mode)
    if (editingRequest) {
      const updatedItem: MyRequestItem = {
        ...editingRequest,
        type: selectedCreateType,
        title: computedTitle,
        content: computedContent,
        approver: formApprover,
        note: formNote.trim() || undefined,

        lateEarlyType,
        lateEarlyMinutes: parseInt(lateEarlyMinutes, 10) || 30,
        lateEarlyDate,
        lateEarlyTargetTime,

        leaveCategory,
        leaveSession,
        leaveFromDate,
        leaveToDate,
        leaveDays: parseFloat(leaveDays) || 1,
        handoverPerson,

        advanceAmount: parseFloat(advanceAmount.replace(/[^0-9]/g, '')) || 0,
        advancePurpose,
        advanceDueDate,
        paymentMethod: advancePaymentMethod,
        bankAccount,
        bankName,

        advanceRefCode,
        initialAdvanceAmount: parseFloat(initialAdvanceAmount.replace(/[^0-9]/g, '')) || 0,
        actualSpentAmount: parseFloat(actualSpentAmount.replace(/[^0-9]/g, '')) || 0,
        refundDifference: (parseFloat(initialAdvanceAmount.replace(/[^0-9]/g, '')) || 0) - (parseFloat(actualSpentAmount.replace(/[^0-9]/g, '')) || 0),
        invoiceList,

        tripDestination,
        tripPurpose,
        tripFromDate,
        tripToDate,
        tripTransport,
        tripEstimatedCost: parseFloat(tripEstimatedCost.replace(/[^0-9]/g, '')) || 0,
        priority: formPriority,
        priorityLabel:
          formPriority === 'urgent'
            ? 'Khẩn cấp'
            : formPriority === 'high'
            ? 'Cao'
            : formPriority === 'low'
            ? 'Thấp'
            : 'Trung bình',
      };

      try {
        const res = await fetch(`/api/personal-requests/${editingRequest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem),
        });
        if (res.ok) {
          const saved = await res.json();
          setRequests((prev) => prev.map((r) => (r.id === editingRequest.id ? saved : r)));
        } else {
          setRequests((prev) => prev.map((r) => (r.id === editingRequest.id ? updatedItem : r)));
        }
      } catch (err) {
        console.error('Lỗi khi lưu cập nhật yêu cầu:', err);
        setRequests((prev) => prev.map((r) => (r.id === editingRequest.id ? updatedItem : r)));
      }

      setCreateModalOpen(false);
      const code = editingRequest.code;
      setEditingRequest(null);

      if (onShowToast) {
        onShowToast(
          'success',
          'Cập nhật yêu cầu thành công',
          `Phiếu yêu cầu ${code} đã được cập nhật thông tin`
        );
      }
      return;
    }

    // Đọc thông tin user đăng nhập
    let applicantName = 'Lê Công Vụ';
    let applicantRole = 'Nhân viên';
    let userId: any;
    let userEmail: string | undefined;
    let userDept = '';
    try {
      const sUser: any = authUser || getCurrentUserFromStorage();
      if (sUser) {
        applicantName = sUser.employee?.fullName || sUser.name || applicantName;
        applicantRole = sUser.employee?.position || sUser.roleName || sUser.position || applicantRole;
        userId = sUser.employee?.id || sUser.id;
        userEmail = sUser.employee?.workEmail || sUser.email;
        userDept = sUser.employee?.departmentName || sUser.department || '';
      }
    } catch {}

    const deptMap: Record<string, string> = {
      admin: 'Phòng hành chính nhân sự',
      finance: 'Phòng tài chính',
      sales: 'Phòng kinh doanh',
      logistics: 'Bộ phận kho vận',
      production: 'Bộ phận sản xuất',
      technical: 'Bộ phận xử lý hồ sơ',
    };
    const finalDept = userDept || deptMap[department] || 'Phòng hành chính nhân sự';

    const newItem: MyRequestItem = {
      id: newId,
      code: newCode,
      type: selectedCreateType,
      title: computedTitle,
      content: computedContent,
      createdAt: dateStr,
      department: finalDept,
      applicantName,
      applicantRole,
      approver: formApprover,
      status: 'pending',
      statusLabel: 'Chờ duyệt',
      note: formNote.trim() || undefined,
      userId,
      userEmail,

      lateEarlyType,
      lateEarlyMinutes: parseInt(lateEarlyMinutes, 10) || 30,
      lateEarlyDate,
      lateEarlyTargetTime,

      leaveCategory,
      leaveSession,
      leaveFromDate,
      leaveToDate,
      leaveDays: parseFloat(leaveDays) || 1,
      handoverPerson,

      advanceAmount: parseFloat(advanceAmount.replace(/[^0-9]/g, '')) || 0,
      advancePurpose,
      advanceDueDate,
      paymentMethod: advancePaymentMethod,
      bankAccount,
      bankName,

      advanceRefCode,
      initialAdvanceAmount: parseFloat(initialAdvanceAmount.replace(/[^0-9]/g, '')) || 0,
      actualSpentAmount: parseFloat(actualSpentAmount.replace(/[^0-9]/g, '')) || 0,
      refundDifference: (parseFloat(initialAdvanceAmount.replace(/[^0-9]/g, '')) || 0) - (parseFloat(actualSpentAmount.replace(/[^0-9]/g, '')) || 0),
      invoiceList,

      tripDestination,
      tripPurpose,
      tripFromDate,
      tripToDate,
      tripTransport,
      tripEstimatedCost: parseFloat(tripEstimatedCost.replace(/[^0-9]/g, '')) || 0,
      priority: formPriority,
      priorityLabel:
        formPriority === 'urgent'
          ? 'Khẩn cấp'
          : formPriority === 'high'
          ? 'Cao'
          : formPriority === 'low'
          ? 'Thấp'
          : 'Trung bình',
    };

    try {
      const res = await fetch('/api/personal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const saved = await res.json();
        setRequests((prev) => [saved, ...prev]);
        window.dispatchEvent(new CustomEvent('decodoor_request_created', { detail: saved }));
        try {
          localStorage.setItem('decodoor_request_last_created', Date.now().toString());
        } catch {}
      } else {
        setRequests((prev) => [newItem, ...prev]);
        window.dispatchEvent(new CustomEvent('decodoor_request_created', { detail: newItem }));
      }
    } catch (err) {
      console.error('Lỗi khi lưu yêu cầu mới vào CSDL:', err);
      setRequests((prev) => [newItem, ...prev]);
      window.dispatchEvent(new CustomEvent('decodoor_request_created', { detail: newItem }));
    }

    setCreateModalOpen(false);

    if (onShowToast) {
      onShowToast(
        'success',
        'Tạo yêu cầu thành công',
        `Phiếu yêu cầu ${newCode} đã được gửi tới ${formApprover} để phê duyệt`
      );
    }
  };

  // Xóa / Hủy yêu cầu
  const handleConfirmCancel = async () => {
    if (!requestToCancel) return;
    try {
      await fetch(`/api/personal-requests/${requestToCancel.id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Lỗi khi hủy yêu cầu:', err);
    }

    // Tự động đồng bộ và dọn dẹp các phân hệ liên quan (Ban Giám đốc, Tài chính, Kế toán)
    try {
      notifyFinanceUpdated('personal_requests', 'delete');
      window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
      window.dispatchEvent(new CustomEvent('decodoor_finance_cashflow_updated'));

      // Làm sạch cache decodoor_approval_documents nếu có
      const savedDocs = localStorage.getItem('decodoor_approval_documents');
      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (d: any) => d.code !== requestToCancel.code && d.id !== `APR-REQ-${requestToCancel.id}`
          );
          localStorage.setItem('decodoor_approval_documents', JSON.stringify(filtered));
        }
      }
    } catch (syncErr) {
      console.warn('Lỗi đồng bộ xoá liên hoàn:', syncErr);
    }

    setRequests((prev) => prev.filter((i) => i.id !== requestToCancel.id));
    setSelectedIds((prev) => prev.filter((id) => id !== requestToCancel.id));
    setConfirmCancelOpen(false);
    if (onShowToast) {
      onShowToast(
        'success',
        'Đã hủy yêu cầu',
        `Phiếu yêu cầu ${requestToCancel.code} đã được hủy bỏ và đồng bộ xóa khỏi các phân hệ liên quan`
      );
    }
    setRequestToCancel(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        fontFamily: "'Roboto Condensed', sans-serif",
        overflow: 'hidden',
      }}
    >


      {/* ── 2. TABLE TOOLBAR TIÊU CHUẨN ── */}
      <div style={{ flexShrink: 0 }}>
        <TableToolbar
        showMenu={false}
        searchValue={searchValue}
        onSearchChange={(val) => {
          setSearchValue(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm theo mã phiếu, nội dung, lý do, người duyệt..."
        filters={toolbarFilters}
        style={{ marginBottom: 0, padding: '16px 20px 12px 20px' }}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => handleOpenCreateModal('late_early')}
              style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Tạo mới
            </Button>

            <DeleteButton
              size="sm"
              itemCount={selectedIds.length}
              disabled={selectedIds.length === 0}
              onConfirm={handleConfirmBulkDelete}
              dialogTitle="Xác nhận xóa yêu cầu cá nhân"
              dialogMessage={
                selectedIds.length > 0
                  ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} yêu cầu cá nhân đã chọn khỏi cơ sở dữ liệu? Dữ liệu sau khi xóa sẽ không thể phục hồi.`
                  : 'Bạn có chắc chắn muốn xóa yêu cầu này không?'
              }
            />
          </div>
        }
      />
      </div>

      {/* ── 3. BẢNG DANH SÁCH YÊU CẦU CÁ NHÂN FULLWIDTH VÀ PAGINATION ── */}
      <FullWidthTable
        loading={isLoading}
        loadingText="Đang tải dữ liệu yêu cầu cá nhân từ cơ sở dữ liệu..."
      >
        <table
          className="custom-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.8125rem',
            fontFamily: "'Roboto Condensed', sans-serif",
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
                color: 'var(--text-secondary, #475569)',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <th style={{ padding: '12px 14px', width: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={pagedList.length > 0 && pagedList.every((item) => selectedIds.includes(item.id))}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color, #2563eb)' }}
                  title="Chọn tất cả trên trang này"
                />
              </th>
              <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Nội dung yêu cầu</th>
              <th style={{ padding: '12px 14px', width: '150px', minWidth: '140px', whiteSpace: 'nowrap' }}>Thời gian gửi</th>
              <th style={{ padding: '12px 14px', width: '130px', minWidth: '120px', textAlign: 'right', whiteSpace: 'nowrap' }}>Số tiền VND</th>
              <th style={{ padding: '12px 14px', width: '220px', minWidth: '200px', whiteSpace: 'nowrap' }}>Người phê duyệt</th>
              <th style={{ padding: '12px 14px', width: '130px', minWidth: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {pagedList.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                  Không có yêu cầu cá nhân nào trong hệ thống
                </td>
              </tr>
            ) : (
              pagedList.map((item) => {
                const isChecked = selectedIds.includes(item.id);
                const hasAmount = item.advanceAmount || item.actualSpentAmount || item.tripEstimatedCost;
                const displayAmount =
                  item.type === 'advance'
                    ? item.advanceAmount
                    : item.type === 'refund'
                    ? item.actualSpentAmount
                    : item.type === 'business_trip'
                    ? item.tripEstimatedCost
                    : undefined;

                return (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenEditModal(item)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td
                      style={{ padding: '12px 14px', textAlign: 'center', width: '44px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectRow(item.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary-color, #2563eb)' }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: "'Roboto Condensed', sans-serif",
                            backgroundColor: 'var(--brand-50, #eff6ff)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--brand-700, #1d4ed8)',
                            border: '1px solid rgba(29, 78, 216, 0.18)',
                          }}
                        >
                          {item.code}
                        </span>
                        {getTypeBadge(item.type)}
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontFamily: "'Roboto Condensed', sans-serif",
                          color: '#0f172a',
                          fontSize: '0.875rem',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          lineHeight: 1.4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.content}
                      >
                        {item.content}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {item.createdAt}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {hasAmount && displayAmount !== undefined ? (
                        <span style={{ color: item.type === 'refund' ? '#16a34a' : '#0f172a' }}>
                          {formatNumberGroup(displayAmount)}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', width: '220px', minWidth: '200px', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const { name, role } = parseApprover(item.approver);
                        return (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
                              {name}
                            </div>
                            {role && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                                {role}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(item.status, item.statusLabel)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </FullWidthTable>

      {/* ── 4. COMPONENT PAGINATION TÍCH HỢP TRỰC TIẾP VÀO CHÂN BẢNG ── */}
      <div
        className="pagination-container"
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border-default, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-1, #ffffff)',
          padding: 0,
        }}
      >
        <Pagination
          currentPage={currentPage}
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* ── 4. OFFCANVAS TẠO YÊU CẦU CÁ NHÂN MỚI (400PX) ── */}
      <Offcanvas
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingRequest(null);
        }}
        icon={
          editingRequest ? (
            <PencilSquare size={22} style={{ color: 'var(--brand-600, #2563eb)' }} />
          ) : (
            <FileEarmarkPlus size={22} style={{ color: 'var(--brand-600, #2563eb)' }} />
          )
        }
        title={editingRequest ? `Chỉnh sửa yêu cầu ${editingRequest.code}` : 'Tạo yêu cầu cá nhân mới'}
        description={
          editingRequest
            ? 'Cập nhật nội dung thủ tục và thông tin trình duyệt'
            : 'Lựa chọn loại thủ tục cá nhân và điền thông tin để trình duyệt'
        }
        width="400px"
        position="right"
        bodyStyle={{ display: 'flex', flexDirection: 'column' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingRequest(null);
              }}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              form="create-request-form"
              variant="primary"
              disabled={isAnnualLeaveQuotaExceeded}
              title={
                isAnnualLeaveQuotaExceeded
                  ? `Tháng ${leaveQuotaSummary.targetMonth}/${leaveQuotaSummary.targetYear} đã hết hoặc không đủ ngày nghỉ phép có lương khả dụng (${leaveQuotaSummary.remainingMonthPaidBefore}/1 ngày). Vui lòng chọn hình thức nghỉ khác.`
                  : undefined
              }
              style={{
                fontWeight: 700,
                opacity: isAnnualLeaveQuotaExceeded ? 0.5 : 1,
                cursor: isAnnualLeaveQuotaExceeded ? 'not-allowed' : 'pointer',
              }}
            >
              {editingRequest ? 'Lưu thay đổi' : 'Gửi yêu cầu phê duyệt'}
            </Button>
          </div>
        }
      >
        {/* Banner thông tin và Phê duyệt / Từ chối khi ở chế độ chỉnh sửa */}
        {editingRequest && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              marginBottom: '12px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                  Mã: {editingRequest.code}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                  Gửi lúc: {editingRequest.createdAt}
                </div>
              </div>
              <div>
                {getStatusBadge(editingRequest.status, editingRequest.statusLabel)}
              </div>
            </div>

            {/* Thao tác Phê duyệt / Từ chối trực tiếp cho cấp quản lý / Nhân sự */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px dashed #cbd5e1',
              }}
            >
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/personal-requests/${editingRequest.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        status: 'approved',
                        statusLabel: 'Đã phê duyệt',
                        leaveCategory,
                        leaveSession,
                        leaveFromDate,
                        leaveToDate,
                        leaveDays: parseFloat(leaveDays) || (leaveSession === 'all_day' ? 1 : 0.5),
                        note: formNote.trim() || undefined,
                      }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setRequests((prev) =>
                        prev.map((r) => (r.id === editingRequest.id ? updated : r))
                      );
                      setEditingRequest(updated);
                      window.dispatchEvent(new CustomEvent('decodoor_request_updated', { detail: updated }));
                    }
                  } catch {}
                  setCreateModalOpen(false);
                  setEditingRequest(null);
                  if (onShowToast) {
                    onShowToast(
                      'success',
                      'Đã phê duyệt đơn',
                      `Đơn ${editingRequest.code} đã được phê duyệt. Hệ thống đã tự động cập nhật bảng chấm công và chế độ lương tương ứng.`
                    );
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#16a34a',
                  borderColor: '#16a34a',
                  fontWeight: 700,
                }}
              >
                Phê duyệt đơn
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/personal-requests/${editingRequest.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        status: 'rejected',
                        statusLabel: 'Từ chối duyệt',
                        leaveCategory,
                        leaveSession,
                        leaveFromDate,
                        leaveToDate,
                        leaveDays: parseFloat(leaveDays) || (leaveSession === 'all_day' ? 1 : 0.5),
                        note: formNote.trim() || 'Không phê duyệt đơn xin nghỉ',
                      }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setRequests((prev) =>
                        prev.map((r) => (r.id === editingRequest.id ? updated : r))
                      );
                      setEditingRequest(updated);
                      window.dispatchEvent(new CustomEvent('decodoor_request_updated', { detail: updated }));
                    }
                  } catch {}
                  setCreateModalOpen(false);
                  setEditingRequest(null);
                  if (onShowToast) {
                    onShowToast(
                      'warning',
                      'Đã từ chối đơn',
                      `Đơn ${editingRequest.code} không được duyệt. Nếu nhân viên đi làm sẽ tính công bình thường; nếu vắng mặt thực tế sẽ ghi nhận "Vắng mặt chưa được chấp thuận" chuyển Nhân sự kiểm tra.`
                    );
                  }
                }}
                style={{ flex: 1, fontWeight: 700 }}
              >
                Từ chối duyệt
              </Button>
            </div>
          </div>
        )}

        {/* Loại yêu cầu đề xuất và Mức độ ưu tiên trên cùng một dòng */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '12px', marginBottom: '14px', flexShrink: 0 }}>
          <Select
            label="Loại yêu cầu đề xuất"
            required
            value={selectedCreateType}
            onChange={(e) => setSelectedCreateType(e.target.value as RequestType)}
            style={{ fontWeight: 600 }}
          >
            <option value="late_early">Đi muộn về sớm</option>
            <option value="leave">Nghỉ phép</option>
            <option value="advance">Tạm ứng</option>
            <option value="refund">Hoàn tạm ứng</option>
            <option value="business_trip">Đi công tác</option>
          </Select>

          <Select
            label="Mức độ ưu tiên"
            value={formPriority}
            onChange={(e) => setFormPriority(e.target.value as any)}
            style={{
              fontWeight: 700,
              color:
                formPriority === 'urgent'
                  ? '#dc2626'
                  : formPriority === 'high'
                  ? '#d97706'
                  : formPriority === 'low'
                  ? '#64748b'
                  : '#2563eb',
            }}
          >
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
            <option value="urgent">Khẩn cấp / Gấp</option>
          </Select>
        </div>

        {/* Form Fields Body */}
        <form
          id="create-request-form"
          onSubmit={handleSubmitCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}
        >
              {/* 1. Form Đi muộn về sớm */}
              {selectedCreateType === 'late_early' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '12px' }}>
                    <Select
                      label="Hình thức đề xuất"
                      value={lateEarlyType}
                      onChange={(e) => setLateEarlyType(e.target.value as any)}
                    >
                      <option value="late">Xin đi muộn đầu giờ</option>
                      <option value="early">Xin về sớm cuối giờ</option>
                    </Select>

                    <Input
                      label="Ngày áp dụng"
                      required
                      type="text"
                      value={lateEarlyDate}
                      onChange={(e) => setLateEarlyDate(e.target.value)}
                      placeholder="Ví dụ: 05/10/2026"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '12px' }}>
                    <Select
                      label="Số phút dự kiến"
                      value={lateEarlyMinutes}
                      onChange={(e) => setLateEarlyMinutes(e.target.value)}
                    >
                      <option value="15">15 phút</option>
                      <option value="30">30 phút</option>
                      <option value="45">45 phút</option>
                      <option value="60">60 phút - 1 giờ</option>
                      <option value="90">90 phút - 1.5 giờ</option>
                      <option value="120">120 phút - 2 giờ</option>
                    </Select>

                    <Input
                      label="Giờ dự kiến đến hoặc về"
                      required
                      type="text"
                      value={lateEarlyTargetTime}
                      onChange={(e) => setLateEarlyTargetTime(e.target.value)}
                      placeholder="Ví dụ: 08:30"
                    />
                  </div>
                </div>
              )}

              {/* 2. Form Nghỉ phép */}
              {selectedCreateType === 'leave' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Select
                    label="Phân loại nghỉ phép"
                    value={leaveCategory}
                    onChange={(e) => {
                      const nextCat = e.target.value as 'annual' | 'sick' | 'special' | 'unpaid';
                      setLeaveCategory(nextCat);
                      if (nextCat === 'annual' && onShowToast) {
                        onShowToast(
                          'info',
                          'Kiểm soát quỹ phép năm (Tối đa 12 ngày/năm)',
                          `Tổng số ngày phép năm còn lại: ${leaveQuotaSummary.remainingYearBefore}/12 ngày • Số ngày nghỉ trong tháng ${leaveQuotaSummary.targetMonth}/${leaveQuotaSummary.targetYear}: ${leaveQuotaSummary.totalMonthWithCurrent} ngày.`
                        );
                      }
                    }}
                  >
                    <option value="annual">Nghỉ phép năm hưởng lương (1 ngày/tháng)</option>
                    <option value="special">Nghỉ hưởng lương theo chế độ</option>
                    <option value="unpaid">Nghỉ không hưởng lương</option>
                    <option value="sick">Các loại nghỉ khác theo chính sách công ty</option>
                  </Select>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: '10px' }}>
                    <Select
                      label="Thời gian nghỉ"
                      value={leaveSession}
                      onChange={(e) => {
                        const nextSes = e.target.value as 'all_day' | 'morning' | 'afternoon';
                        setLeaveSession(nextSes);
                        if (nextSes === 'morning' || nextSes === 'afternoon') {
                          setLeaveToDate(leaveFromDate);
                        }
                      }}
                    >
                      <option value="all_day">Cả ngày</option>
                      <option value="morning">Buổi sáng</option>
                      <option value="afternoon">Buổi chiều</option>
                    </Select>

                    <Input
                      label={leaveSession === 'morning' || leaveSession === 'afternoon' ? 'Ngày nghỉ phép' : 'Từ ngày'}
                      required
                      type="text"
                      value={leaveFromDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLeaveFromDate(val);
                        if (leaveSession === 'morning' || leaveSession === 'afternoon') {
                          setLeaveToDate(val);
                        }
                      }}
                      placeholder="DD/MM/YYYY"
                    />
                    <Input
                      label="Đến ngày"
                      required={leaveSession === 'all_day'}
                      disabled={leaveSession === 'morning' || leaveSession === 'afternoon'}
                      type="text"
                      value={leaveSession === 'all_day' ? leaveToDate : leaveFromDate}
                      onChange={(e) => {
                        if (leaveSession === 'all_day') {
                          setLeaveToDate(e.target.value);
                        }
                      }}
                      placeholder="DD/MM/YYYY"
                      style={
                        leaveSession === 'morning' || leaveSession === 'afternoon'
                          ? {
                              backgroundColor: '#f1f5f9',
                              color: '#94a3b8',
                              cursor: 'not-allowed',
                            }
                          : undefined
                      }
                    />
                  </div>

                  {/* Kiểm soát phép năm (12 ngày/năm • 1 ngày/tháng) */}
                  {leaveCategory === 'annual' && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: isAnnualLeaveQuotaExceeded ? '#fef2f2' : '#f0fdf4',
                        border: isAnnualLeaveQuotaExceeded
                          ? '1px solid #fecaca'
                          : '1px solid #bbf7d0',
                        fontSize: '0.78rem',
                        color: isAnnualLeaveQuotaExceeded ? '#991b1b' : '#166534',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        Kiểm soát phép năm
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          backgroundColor: '#ffffff',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(0,0,0,0.08)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                            Tổng số ngày còn lại ({leaveQuotaSummary.targetYear}):
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                            {leaveQuotaSummary.remainingYearBefore} / 12 ngày
                          </div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: isAnnualLeaveQuotaExceeded ? '#64748b' : '#15803d',
                              fontWeight: 600,
                            }}
                          >
                            {isAnnualLeaveQuotaExceeded
                              ? `Đã nghỉ phép năm: ${leaveQuotaSummary.totalYearPaidAnnualUsed}/12 ngày`
                              : `Sau đơn này còn: ${leaveQuotaSummary.remainingYearAfter} ngày`}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                            Số ngày nghỉ trong tháng {leaveQuotaSummary.targetMonth}/{leaveQuotaSummary.targetYear}:
                          </div>
                          <div
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 800,
                              color: isAnnualLeaveQuotaExceeded ? '#dc2626' : '#15803d',
                            }}
                          >
                            Khả dụng: {leaveQuotaSummary.remainingMonthPaidBefore} / 1 ngày
                          </div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: isAnnualLeaveQuotaExceeded ? '#dc2626' : '#15803d',
                              fontWeight: 700,
                            }}
                          >
                            {leaveQuotaSummary.remainingMonthPaidBefore <= 0
                              ? `Đã hết phép có lương tháng ${leaveQuotaSummary.targetMonth} (Đã nghỉ: ${leaveQuotaSummary.usedPaidInTargetMonth}/1 ngày)`
                              : leaveQuotaSummary.currentReqDays > leaveQuotaSummary.remainingMonthPaidBefore
                                ? `Vượt phép có lương khả dụng (Đơn này: ${leaveQuotaSummary.currentReqDays} ngày)`
                                : `Đã nghỉ phép có lương: ${leaveQuotaSummary.usedPaidInTargetMonth}/1 ngày`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Người tiếp nhận bàn giao công việc"
                    type="text"
                    value={handoverPerson}
                    onChange={(e) => setHandoverPerson(e.target.value)}
                    placeholder="Họ tên và bộ phận đồng nghiệp nhận bàn giao"
                  />
                </div>
              )}

              {/* 3. Form Tạm ứng */}
              {selectedCreateType === 'advance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Input
                      label="Số tiền xin tạm ứng VND"
                      required
                      type="text"
                      value={formatNumberGroup(advanceAmount)}
                      onChange={(e) => setAdvanceAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ fontWeight: 700, color: '#b91c1c' }}
                    />
                    <Input
                      label="Hạn hoàn ứng dự kiến"
                      required
                      type="text"
                      value={advanceDueDate}
                      onChange={(e) => setAdvanceDueDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  <Input
                    label="Mục đích tạm ứng chi tiết"
                    required
                    type="text"
                    value={advancePurpose}
                    onChange={(e) => setAdvancePurpose(e.target.value)}
                    placeholder="Ví dụ: Tạm ứng công tác phí dự án, mua vật tư mẫu xưởng mộc..."
                  />

                  <Select
                    label="Phương thức nhận tiền"
                    value={advancePaymentMethod}
                    onChange={(e) => setAdvancePaymentMethod(e.target.value as any)}
                  >
                    <option value="bank">Chuyển khoản qua số tài khoản cá nhân</option>
                    <option value="cash">Nhận tiền mặt tại quỹ công ty</option>
                  </Select>

                  <Input
                    label="Số tài khoản thụ hưởng"
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Ví dụ: 19033458992011"
                  />

                  <Input
                    label="Ngân hàng thụ hưởng"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ví dụ: Techcombank - Chi nhánh Đà Nẵng"
                  />
                </div>
              )}

              {/* 4. Form Hoàn tạm ứng */}
              {selectedCreateType === 'refund' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Input
                      label="Mã phiếu tạm ứng liên quan"
                      required
                      type="text"
                      value={advanceRefCode}
                      onChange={(e) => setAdvanceRefCode(e.target.value)}
                      placeholder="Ví dụ: YC-2026-079"
                    />
                    <Input
                      label="Số tiền đã tạm ứng VND"
                      required
                      type="text"
                      value={formatNumberGroup(initialAdvanceAmount)}
                      onChange={(e) => setInitialAdvanceAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Input
                      label="Số tiền thực chi theo hóa đơn VND"
                      required
                      type="text"
                      value={formatNumberGroup(actualSpentAmount)}
                      onChange={(e) => setActualSpentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ fontWeight: 700, color: '#0284c7' }}
                    />

                    <div className="form-group">
                      <label className="form-label">Chênh lệch thừa thiếu VND</label>
                      <div
                        style={{
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          borderRadius: 'var(--radius-md, 6px)',
                          backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                          border: '1px solid var(--border-default, #cbd5e1)',
                          fontSize: '0.875rem',
                          fontWeight: 800,
                          color:
                            (parseFloat(initialAdvanceAmount) || 0) >= (parseFloat(actualSpentAmount) || 0)
                              ? '#16a34a'
                              : '#dc2626',
                        }}
                      >
                        {(parseFloat(initialAdvanceAmount) || 0) >= (parseFloat(actualSpentAmount) || 0)
                          ? `Nộp lại quỹ: ${formatNumberGroup((parseFloat(initialAdvanceAmount) || 0) - (parseFloat(actualSpentAmount) || 0))} VND`
                          : `Công ty chi thêm: ${formatNumberGroup((parseFloat(actualSpentAmount) || 0) - (parseFloat(initialAdvanceAmount) || 0))} VND`}
                      </div>
                    </div>
                  </div>

                  <Input
                    label="Bảng kê hóa đơn chứng từ kèm theo"
                    required
                    type="text"
                    value={invoiceList}
                    onChange={(e) => setInvoiceList(e.target.value)}
                    placeholder="Ví dụ: 3 hóa đơn điện tử VAT vé máy bay và hóa đơn khách sạn..."
                  />
                </div>
              )}

              {/* 5. Form Đi công tác */}
              {selectedCreateType === 'business_trip' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Input
                    label="Địa điểm công tác"
                    required
                    type="text"
                    value={tripDestination}
                    onChange={(e) => setTripDestination(e.target.value)}
                    placeholder="Tỉnh thành hoặc công trình dự án"
                  />

                  <Input
                    label="Phương tiện di chuyển"
                    required
                    type="text"
                    value={tripTransport}
                    onChange={(e) => setTripTransport(e.target.value)}
                    placeholder="Xe công ty, máy bay, xe khách..."
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Input
                      label="Từ ngày"
                      required
                      type="text"
                      value={tripFromDate}
                      onChange={(e) => setTripFromDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                    <Input
                      label="Đến ngày"
                      required
                      type="text"
                      value={tripToDate}
                      onChange={(e) => setTripToDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  <Input
                    label="Dự toán kinh phí VND"
                    type="text"
                    value={formatNumberGroup(tripEstimatedCost)}
                    onChange={(e) => setTripEstimatedCost(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{ fontWeight: 700 }}
                  />
                </div>
              )}

              {/* Các trường chung bên dưới */}
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                <Select
                  label="Người phê duyệt"
                  required
                  value={formApprover}
                  onChange={(e) => setFormApprover(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  {APPROVER_GROUPS.map((grp) => (
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
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '4px', flexShrink: 0 }}>
                    Ghi chú hoặc ý kiến bổ sung
                  </label>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Nhập thêm chi tiết hoặc giải trình nếu cần..."
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '100px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              
        </form>
      </Offcanvas>

      {/* ── 5. MODAL XEM CHI TIẾT YÊU CẦU ── */}
      {detailModalOpen && viewingRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setDetailModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                  {viewingRequest.code}
                </span>
                {getTypeBadge(viewingRequest.type)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                }}
              >
                <X size={20} />
              </Button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Tiêu đề yêu cầu
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {viewingRequest.title}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Nội dung chi tiết
                </div>
                <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '2px', lineHeight: 1.5 }}>
                  {viewingRequest.content}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Người làm đơn:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{viewingRequest.applicantName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{viewingRequest.applicantRole} • {viewingRequest.department}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Thời gian gửi:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{viewingRequest.createdAt}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Người xét duyệt:</div>
                  {(() => {
                    const { name, role } = parseApprover(viewingRequest.approver);
                    return (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{name}</div>
                        {role && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{role}</div>}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Trạng thái hiện tại:</div>
                  <div style={{ marginTop: '4px' }}>
                    {getStatusBadge(viewingRequest.status, viewingRequest.statusLabel)}
                  </div>
                </div>
              </div>

              {viewingRequest.note && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Ý kiến phê duyệt hoặc ghi chú
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#0f172a', fontStyle: 'italic', marginTop: '2px' }}>
                    "{viewingRequest.note}"
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {viewingRequest.status === 'pending' && (
                  <>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setRequestToCancel(viewingRequest);
                        setDetailModalOpen(false);
                        setConfirmCancelOpen(true);
                      }}
                    >
                      Hủy yêu cầu này
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/personal-requests/${viewingRequest.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              status: 'approved',
                              statusLabel: 'Đã phê duyệt',
                            }),
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setRequests((prev) =>
                              prev.map((r) => (r.id === viewingRequest.id ? updated : r))
                            );
                          }
                        } catch {}
                        setDetailModalOpen(false);
                        if (onShowToast) {
                          onShowToast(
                            'success',
                            'Đã phê duyệt yêu cầu',
                            `Phiếu yêu cầu ${viewingRequest.code} đã được phê duyệt và tự động đồng bộ sang bảng chấm công.`
                          );
                        }
                      }}
                      style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                    >
                      Phê duyệt ngay
                    </Button>
                  </>
                )}
              </div>
              <Button type="button" variant="primary" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. CONFIRM DIALOG HỦY YÊU CẦU ── */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        title="Xác nhận hủy yêu cầu"
        message={`Bạn có chắc chắn muốn hủy phiếu yêu cầu ${requestToCancel?.code || ''}? Sau khi hủy bỏ thông tin này sẽ không còn trong danh sách gửi duyệt.`}
        confirmText="Xác nhận hủy"
        cancelText="Đóng"
        type="danger"
        onConfirm={handleConfirmCancel}
        onClose={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
};

export default MyRequestsView;
