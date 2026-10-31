import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar3Range,
  CashStack,
  EggFried,
  SendCheck,
  ArrowRepeat,
  SendFill,
  Check2Circle,
  ClockHistory,
  EnvelopePaper,
  Calculator,
  Printer,
  PatchCheckFill,
  CheckCircleFill,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog, type ConfirmDialogVariant } from '../../components/common/ConfirmDialog';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import type { ModernStepItem } from '../../types';

interface AttendanceDayCell {
  code: string;
  label?: string;
  registeredLunch?: boolean;
  registeredDinner?: boolean;
  workday?: number;
  otHours?: number;
  violationMinutes?: number;
  leaveDays?: number;
  morningIn?: string | null;
  morningOut?: string | null;
  afternoonIn?: string | null;
  afternoonOut?: string | null;
}

interface Employee {
  id: string;
  code: string;
  fullName: string;
  position: string;
  positionCode?: string;
  avatarUrl?: string;
  attendance: (AttendanceDayCell | null)[];
  baseSalary?: number;
  insuranceDeduction?: number;
  advanceDeduction?: number;
  mealAllowance?: number;
  fuelAllowance?: number;
  phoneAllowance?: number;
  seniorityAllowance?: number;
  payrollStatus?: string | null;
  isConfirmed?: boolean;
  isPayrollConfirmed?: boolean;
  requestSummary?: {
    totalRequests: number;
    pendingCount: number;
    approvedLeaveRequests: number;
    approvedLateEarlyRequests: number;
    approvedOtRequests: number;
  };
}

interface Department {
  id: string;
  name: string;
  employees: Employee[];
}

const STATUS_MAP: Record<
  string,
  { label: string; icon: string; color: string; bgColor: string; borderColor: string }
> = {
  OK: {
    label: 'Đủ công',
    icon: 'bi-check',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  WARN: {
    label: 'Vi phạm nhẹ (≤60p)',
    icon: 'bi-exclamation-triangle',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  ERR: {
    label: 'Vi phạm nặng',
    icon: 'bi-x',
    color: '#e11d48',
    bgColor: '#fff1f2',
    borderColor: '#f43f5e',
  },
  P: {
    label: 'Nghỉ phép',
    icon: 'P',
    color: '#175cd3',
    bgColor: '#eff8ff',
    borderColor: '#2e90fa',
  },
  KL: {
    label: 'Nghỉ không lương',
    icon: 'KL',
    color: '#475467',
    bgColor: '#f2f4f7',
    borderColor: '#98a2b3',
  },
  BHXH: {
    label: 'Nghỉ ốm có BHXH',
    icon: 'BH',
    color: '#c11574',
    bgColor: '#fdf2fa',
    borderColor: '#ee46bc',
  },
  '-': {
    label: 'Vắng không phép',
    icon: 'bi-dash',
    color: '#e11d48',
    bgColor: '#fff1f2',
    borderColor: '#fda4af',
  },
  L: {
    label: 'Ngày lễ',
    icon: 'L',
    color: '#4f46e5',
    bgColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  OT: {
    label: 'Làm thêm giờ',
    icon: 'OT',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
};

function getStatusStyles(code: string) {
  const map: Record<string, string> = {
    OK: 'OK',
    WARN: 'WARN',
    ERR: 'ERR',
    P: 'P',
    KL: 'KL',
    BHXH: 'BHXH',
    '-': '-',
    L: 'L',
  };
  const dowCodes = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const finalCode = dowCodes.includes(code) ? 'OK' : map[code] || code;
  if (finalCode === 'CN') {
    return {
      label: '',
      icon: '',
      color: 'transparent',
      bgColor: 'transparent',
      borderColor: 'transparent',
    };
  }
  return (
    STATUS_MAP[finalCode] || {
      label: code,
      icon: '',
      color: '#64748b',
      bgColor: '#f1f5f9',
      borderColor: '#e2e8f0',
    }
  );
}

const DayHeader: React.FC<{ day: number; year: number; month: number; currentDay?: number }> = ({
  day,
  year,
  month,
  currentDay,
}) => {
  const dowMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const date = new Date(year, month - 1, day);
  const dow = dowMap[date.getDay()];
  const isActive = currentDay !== undefined && day === currentDay;
  const isWeekend = date.getDay() === 0;

  return (
    <th
      style={{
        width: '38px',
        minWidth: '38px',
        padding: '6px 2px',
        textAlign: 'center',
        borderBottom: '1px solid var(--border-default, #e2e8f0)',
        backgroundColor: isActive
          ? 'rgba(23, 92, 211, 0.08)'
          : isWeekend
          ? 'var(--bg-surface-3, #f1f5f9)'
          : 'var(--bg-surface-2, #f8fafc)',
        color: isActive ? 'var(--brand-600, #175cd3)' : 'var(--text-secondary, #64748b)',
      }}
    >
      <div style={{ fontSize: '12.5px', fontWeight: 700, lineHeight: 1.1 }}>{day}</div>
      <div style={{ fontSize: '9.5px', fontWeight: 600, opacity: 0.85, lineHeight: 1.1 }}>{dow}</div>
    </th>
  );
};

export const AttendancePayrollPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'monthly' | 'payroll' | 'lunch'>('monthly');
  const [data, setData] = useState<Department[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    leaveToday: 0,
    workDays: 26,
    totalViolationMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [showLunchModal, setShowLunchModal] = useState(false);
  const [summaryDate, setSummaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [positions, setPositions] = useState<{ code: string; name: string }[]>([]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isAccountingApproved, setIsAccountingApproved] = useState(false);
  const [isDirectorSubmitted, setIsDirectorSubmitted] = useState(false);
  const [isDirectorApproved, setIsDirectorApproved] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant?: ConfirmDialogVariant;
    action: () => Promise<void>;
  } | null>(null);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedAttendanceEmp, setSelectedAttendanceEmp] = useState<{
    emp: Employee;
    deptName: string;
  } | null>(null);
  const [selectedPayrollEmp, setSelectedPayrollEmp] = useState<{
    emp: Employee;
    deptName: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const isDirectorUser =
    currentUser?.role === 'admin' ||
    Boolean(currentUser?.position && currentUser.position.includes('Giám đốc')) ||
    Boolean((currentUser as any)?.name && String((currentUser as any).name).includes('Lê Công Vụ')) ||
    Boolean(
      (currentUser as any)?.fullName && String((currentUser as any).fullName).includes('Lê Công Vụ'),
    ) ||
    (currentUser as any)?.departmentCode === 'board';

  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();
  const daysInMonthCount = new Date(year, month, 0).getDate();
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  const currentDay =
    new Date().getMonth() + 1 === month && new Date().getFullYear() === year
      ? new Date().getDate()
      : -1;

  const monthYearOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    for (let m = 1; m <= 12; m++) {
      list.push({
        value: `${m}-${year}`,
        label: `Tháng ${String(m).padStart(2, '0')}/${year}`,
      });
    }
    return list;
  }, [year]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance-payroll?month=${month}&year=${year}`);
      if (res.ok) {
        const result = await res.json();
        setData(Array.isArray(result.departments) ? result.departments : []);
        if (result.stats) setStats(result.stats);
        setIsAccountingApproved(Boolean(result.isAccountingApproved));
        setIsDirectorSubmitted(Boolean(result.isDirectorSubmitted));
        setIsDirectorApproved(Boolean(result.isDirectorApproved));
        if (result.companyInfo) setCompanyInfo(result.companyInfo);
      }
    } catch (err) {
      console.error('Error fetching attendance-payroll:', err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
    fetch('/api/board/categories?type=position')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPositions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchData]);

  // Tự động đồng bộ dữ liệu thực tế từ CSDL khi yêu cầu cá nhân hoặc chấm công thay đổi
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener('personal-request-updated', handleRefresh);
    window.addEventListener('attendance-updated', handleRefresh);
    return () => {
      window.removeEventListener('personal-request-updated', handleRefresh);
      window.removeEventListener('attendance-updated', handleRefresh);
    };
  }, [fetchData]);

  const getPositionName = (code: string) => {
    if (!code) return '—';
    const pos = positions.find((p) => p.code === code);
    return pos ? pos.name : code;
  };

  const filteredData = useMemo(
    () =>
      data
        .filter((dept) => selectedDept === 'all' || dept.name === selectedDept)
        .map((dept) => ({
          ...dept,
          employees: dept.employees.filter(
            (emp) =>
              emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (emp.code || '').toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((dept) => dept.employees.length > 0),
    [data, selectedDept, searchQuery],
  );

  const allFilteredEmployees = useMemo(
    () =>
      filteredData.flatMap((dept) =>
        dept.employees.map((emp) => ({ ...emp, deptName: dept.name })),
      ),
    [filteredData],
  );

  const pagedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFilteredEmployees.slice(start, start + pageSize);
  }, [allFilteredEmployees, currentPage, pageSize]);

  const handleCalculatePayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(
          'success',
          result.message || `Đã tính toán bảng lương tháng ${month}/${year} thành công!`,
        );
        await fetchData();
      } else {
        showToast('error', result.error || 'Có lỗi xảy ra khi tính lương.');
      }
    } catch {
      showToast('error', 'Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const runConfirmedPost = async (url: string, successFallback: string) => {
    setConfirmModal(null);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast('success', result.message || successFallback);
        await fetchData();
      } else {
        showToast('error', result.error || 'Có lỗi xảy ra.');
      }
    } catch {
      showToast('error', 'Không thể kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishAttendance = () => {
    setConfirmModal({
      open: true,
      title: 'Xác nhận phát hành phiếu chấm công',
      message: `Bạn có chắc chắn muốn phát hành phiếu chấm công cho tháng ${month}/${year}? Hệ thống sẽ tổng hợp dữ liệu và gửi thông báo đến từng nhân viên để kiểm tra.`,
      confirmLabel: 'Phát hành ngay',
      variant: 'primary',
      action: () =>
        runConfirmedPost('/api/hr/attendance/publish', 'Đã phát hành phiếu chấm công thành công!'),
    });
  };

  const handleSendToAccounting = () => {
    setConfirmModal({
      open: true,
      title: 'Xác nhận chuyển bảng lương cho phòng Kế toán',
      message: `Bạn có chắc chắn muốn chuyển bảng lương tháng ${month}/${year} tới phòng Kế toán? Hệ thống sẽ đồng bộ số liệu chấm công, phép năm, tăng ca và khấu trừ tới bộ phận Kế toán.`,
      confirmLabel: 'Xác nhận chuyển',
      variant: 'info',
      action: () =>
        runConfirmedPost(
          '/api/hr/payroll/send-accounting',
          'Đã chuyển dữ liệu bảng lương tới phòng Kế toán!',
        ),
    });
  };

  const handleSendToDirector = () => {
    if (isDirectorApproved) return;
    if (isDirectorSubmitted && isDirectorUser) {
      setConfirmModal({
        open: true,
        title: 'Xác nhận phê duyệt bảng lương',
        message: `Bạn có chắc chắn muốn phê duyệt bảng lương tháng ${month}/${year} với vai trò Ban Giám đốc? Sau khi duyệt, trạng thái bảng lương sẽ chuyển thành "Đã duyệt".`,
        confirmLabel: 'Phê duyệt ngay',
        variant: 'success',
        action: () =>
          runConfirmedPost(
            '/api/hr/payroll/approve-director',
            'Đã phê duyệt bảng lương thành công!',
          ),
      });
    } else {
      setConfirmModal({
        open: true,
        title: 'Xác nhận trình Ban Giám đốc phê duyệt bảng lương',
        message: `Bạn có chắc chắn muốn trình bảng lương tháng ${month}/${year} lên Ban Giám đốc phê duyệt?`,
        confirmLabel: 'Trình duyệt ngay',
        variant: 'primary',
        action: () =>
          runConfirmedPost(
            '/api/hr/payroll/send-director',
            'Đã trình Ban Giám đốc phê duyệt bảng lương!',
          ),
      });
    }
  };

  const handlePublishPayroll = () => {
    setConfirmModal({
      open: true,
      title: 'Xác nhận phát hành phiếu lương',
      message: `Bạn có chắc chắn muốn phát hành phiếu lương tháng ${month}/${year}? Hệ thống sẽ gửi thông báo chi tiết lương đến từng nhân viên.`,
      confirmLabel: 'Phát hành ngay',
      variant: 'success',
      action: () =>
        runConfirmedPost('/api/hr/payroll/publish', 'Đã phát hành phiếu lương thành công!'),
    });
  };

  const totalEmployeesCount = allFilteredEmployees.length;
  const totalMealsMonth = allFilteredEmployees.reduce((sum, emp) => {
    const lunches = emp.attendance.filter((a) => a?.registeredLunch).length;
    const dinners = emp.attendance.filter((a) => a?.registeredDinner).length;
    return sum + lunches + dinners;
  }, 0);

  const totalNetSum = allFilteredEmployees.reduce((acc, emp) => {
    const cong = emp.attendance.reduce((c, a) => c + (a?.workday || 0), 0);
    const ot = emp.attendance.reduce((c, a) => c + (a?.otHours || 0), 0);
    const salary = emp.baseSalary || 0;
    const mealTotal = (emp.mealAllowance || 0) * cong;
    const otherAllowances =
      (emp.fuelAllowance || 0) + (emp.phoneAllowance || 0) + (emp.seniorityAllowance || 0);
    const allowances = mealTotal + otherAllowances;
    const standardWorkDays = stats.workDays || 1;
    const salaryTheoCong = (salary / standardWorkDays) * cong;
    const otSalary = ot * (salary / standardWorkDays / 8);
    const khauTruBH = (emp.insuranceDeduction ?? 0) + (emp.advanceDeduction ?? 0);
    return acc + Math.max(0, Math.round(salaryTheoCong + allowances + otSalary - khauTruBH));
  }, 0);

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'monthly',
      title: 'Bảng chấm công',
      desc: 'Dữ liệu chấm công chi tiết',
      icon: <Calendar3Range size={16} />,
      badge: `${stats.totalEmployees} NV`,
      badgeVariant: 'brand',
      color: '#e11d48',
    },
    {
      num: 2,
      id: 'payroll',
      title: 'Bảng lương',
      desc: 'Tính toán và chi trả thu nhập',
      icon: <CashStack size={16} />,
      badge: isDirectorApproved
        ? 'Đã duyệt'
        : isDirectorSubmitted
        ? 'Chờ BGĐ'
        : isAccountingApproved
        ? 'Kế toán duyệt'
        : 'Bản nháp',
      badgeVariant: isDirectorApproved ? 'success' : isDirectorSubmitted ? 'warning' : 'brand',
      color: '#2563eb',
    },
    {
      num: 3,
      id: 'lunch',
      title: 'Đăng ký ăn trưa',
      desc: 'Danh sách đặt cơm hằng ngày',
      icon: <EggFried size={16} />,
      badge: `${totalMealsMonth} suất`,
      badgeVariant: 'success',
      color: '#059669',
    },
  ];

  const currentStepNum = activeTab === 'monthly' ? 1 : activeTab === 'payroll' ? 2 : 3;

  return (
    <StepPage
      title="Tổng hợp công và tính lương"
      description="Quản lý dữ liệu chấm công chi tiết, liên kết đơn xin nghỉ phép / đi muộn về sớm, tính toán bảng lương và đăng ký suất ăn Seajong."
      icon="bi-calculator"
      color="rose"
      hideTicker={true}
      steps={steps}
      currentStep={currentStepNum}
      onStepChange={(num) => {
        setCurrentPage(1);
        if (Number(num) === 1) setActiveTab('monthly');
        else if (Number(num) === 2) setActiveTab('payroll');
        else setActiveTab('lunch');
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0%',
          minHeight: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface-1, #ffffff)',
        }}
      >
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`fixed top-4 right-4 z-[1500] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-[13px] font-bold transition-all ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <i
              className={`bi ${
                toastMsg.type === 'success'
                  ? 'bi-check-circle-fill text-emerald-600'
                  : 'bi-exclamation-triangle-fill text-rose-600'
              } text-base`}
            />
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* ── THANH CÔNG CỤ CHUẨN DỰ ÁN (TableToolbar) ── */}
        <TableToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm theo mã NV, họ tên hoặc chức vụ..."
          filters={[
            {
              id: 'month-year-filter',
              value: `${month}-${year}`,
              onChange: (val) => {
                const [m, y] = val.split('-').map(Number);
                if (m && y) {
                  setViewDate(new Date(y, m - 1, 1));
                  setCurrentPage(1);
                }
              },
              minWidth: '145px',
              options: monthYearOptions,
            },
            {
              id: 'dept-filter',
              value: selectedDept,
              onChange: (val) => {
                setSelectedDept(val);
                setCurrentPage(1);
              },
              minWidth: '175px',
              options: [
                { value: 'all', label: 'Tất cả phòng ban' },
                ...data.map((d) => ({ value: d.name, label: d.name })),
              ],
            },
          ]}
          rightActions={
            activeTab === 'monthly' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublishAttendance}
                  isLoading={loading}
                  leftIcon={<SendCheck size={15} />}
                  style={{ fontWeight: 700 }}
                >
                  Phát hành phiếu chấm công
                </Button>
              </div>
            ) : activeTab === 'payroll' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCalculatePayroll}
                  disabled={loading}
                  leftIcon={<ArrowRepeat size={14} />}
                  style={{ fontWeight: 700 }}
                >
                  Tính lương
                </Button>
                <Button
                  variant={isAccountingApproved ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleSendToAccounting}
                  disabled={loading || isAccountingApproved}
                  leftIcon={<SendFill size={13} />}
                  style={{ fontWeight: 700 }}
                >
                  {isAccountingApproved ? 'Đã chuyển KT' : 'Chuyển kế toán'}
                </Button>
                <Button
                  variant={
                    isDirectorApproved || (isDirectorSubmitted && isDirectorUser)
                      ? 'success'
                      : 'primary'
                  }
                  size="sm"
                  disabled={
                    loading ||
                    !isAccountingApproved ||
                    (isDirectorApproved && !isDirectorUser) ||
                    (isDirectorSubmitted && !isDirectorUser)
                  }
                  onClick={handleSendToDirector}
                  leftIcon={
                    isDirectorApproved ? (
                      <CheckCircleFill size={14} />
                    ) : isDirectorSubmitted && isDirectorUser ? (
                      <Check2Circle size={15} />
                    ) : isDirectorSubmitted ? (
                      <ClockHistory size={14} />
                    ) : (
                      <SendFill size={13} />
                    )
                  }
                  style={{ fontWeight: 700 }}
                >
                  {isDirectorApproved
                    ? 'Đã duyệt'
                    : isDirectorSubmitted && isDirectorUser
                    ? 'Duyệt bảng lương'
                    : isDirectorSubmitted
                    ? 'Đã trình BGĐ'
                    : 'Trình duyệt'}
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handlePublishPayroll}
                  disabled={loading || !isAccountingApproved}
                  leftIcon={<EnvelopePaper size={14} />}
                  style={{ fontWeight: 700 }}
                >
                  Phát hành phiếu lương
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '150px' }}>
                  <Input
                    type="date"
                    value={summaryDate}
                    onChange={(e) => setSummaryDate(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowLunchModal(true)}
                  leftIcon={<Calculator size={14} />}
                  style={{ fontWeight: 700 }}
                >
                  Tổng hợp suất ăn
                </Button>
              </div>
            )
          }
          onRefresh={fetchData}
          onPrint={() => window.print()}
          style={{
            marginBottom: 0,
            padding: '8px',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            flexShrink: 0,
          }}
        />

        {/* ── THANH CHÚ THÍCH TRẠNG THÁI NHỎ GỌN (Step 1) ── */}
        {activeTab === 'monthly' && (
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-2, #f8fafc)',
              borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              overflowX: 'auto',
              flexShrink: 0,
              fontSize: '11px',
              color: 'var(--text-secondary, #475467)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
              {Object.entries(STATUS_MAP).map(([key, info]) => (
                <div
                  key={key}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      backgroundColor: info.bgColor,
                      border: `1px solid ${info.borderColor}40`,
                      color: info.color,
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {info.icon.startsWith('bi-') ? <i className={`bi ${info.icon}`} /> : info.icon}
                  </span>
                  <span style={{ fontWeight: 600 }}>{info.label}</span>
                </div>
              ))}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'inline-block',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface-3, #f1f5f9)',
                    border: '1px solid var(--border-default, #e2e8f0)',
                  }}
                />
                <span style={{ fontWeight: 600 }}>Chủ nhật</span>
              </div>
            </div>
            <div style={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--brand-600, #175cd3)' }}>
              Chuẩn công tháng {month}/{year}: {stats.workDays} ngày
            </div>
          </div>
        )}

        {/* ── BẢNG DỮ LIỆU CHÍNH (FullWidthTable) ── */}
        <FullWidthTable loading={loading} loadingText="Đang tải dữ liệu công và lương...">
          {activeTab === 'monthly' ? (
            <table
              className="custom-table"
              style={{
                width: 'max-content',
                minWidth: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                }}
              >
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <th
                    style={{
                      padding: '8px 12px',
                      width: '220px',
                      minWidth: '220px',
                      position: 'sticky',
                      left: 0,
                      zIndex: 30,
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                      borderRight: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    NHÂN VIÊN
                  </th>
                  {daysInMonth.map((day) => (
                    <DayHeader
                      key={day}
                      day={day}
                      year={year}
                      month={month}
                      currentDay={currentDay}
                    />
                  ))}
                  <th
                    style={{
                      padding: '8px 6px',
                      width: '58px',
                      minWidth: '58px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    }}
                  >
                    CÔNG
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      width: '58px',
                      minWidth: '58px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                    }}
                  >
                    PHÉP
                  </th>
                  <th
                    style={{
                      padding: '8px 6px',
                      width: '68px',
                      minWidth: '68px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    }}
                  >
                    THÊM GIỜ
                  </th>
                  <th
                    style={{
                      padding: '8px 8px',
                      width: '74px',
                      minWidth: '74px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    }}
                  >
                    VI PHẠM
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={daysInMonth.length + 5}
                      style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}
                    >
                      Không tìm thấy dữ liệu nhân sự phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedEmployees.map((emp) => {
                    const cong = emp.attendance.reduce((acc, a) => acc + (a?.workday || 0), 0);
                    const phep = emp.attendance.reduce((acc, a) => {
                      if (typeof a?.leaveDays === 'number' && a.leaveDays > 0)
                        return acc + a.leaveDays;
                      if (['P', 'KL', 'BHXH'].includes(a?.code || '')) return acc + 1;
                      return acc;
                    }, 0);
                    const ot = emp.attendance.reduce((acc, a) => acc + (a?.otHours || 0), 0);
                    const viPham = emp.attendance.reduce(
                      (acc, a) => acc + (a?.violationMinutes || 0),
                      0,
                    );

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => setSelectedAttendanceEmp({ emp, deptName: emp.deptName })}
                        title="Nhấn vào dòng để xem phiếu chấm công chi tiết"
                      >
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            borderRight: '1px solid var(--border-subtle, #f1f5f9)',
                          }}
                        >
                          <div className="flex flex-col min-w-0 gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '12.5px',
                                  color: 'var(--text-primary, #0f172a)',
                                }}
                                className="group-hover:text-blue-600 truncate"
                              >
                                {emp.fullName}
                              </span>
                              {emp.isConfirmed && (
                                <PatchCheckFill
                                  size={12}
                                  className="text-emerald-600 shrink-0"
                                  title="Đã xác nhận bảng công"
                                />
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '10.5px',
                                color: 'var(--text-muted, #64748b)',
                              }}
                              className="truncate"
                            >
                              {getPositionName(emp.position)} • {emp.deptName}
                            </span>
                          </div>
                        </td>

                        {daysInMonth.map((day, idx) => {
                          const attObj = emp.attendance[idx];
                          const status = attObj?.code;
                          const label = attObj?.label;
                          const date = new Date(year, month - 1, day);
                          const isActive = day === currentDay;
                          const isWeekend = date.getDay() === 0;
                          const stStyle = status ? getStatusStyles(status) : null;

                          return (
                            <td
                              key={day}
                              style={{
                                padding: 0,
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                                backgroundColor: isActive
                                  ? 'rgba(23, 92, 211, 0.04)'
                                  : isWeekend
                                  ? 'rgba(241, 245, 249, 0.65)'
                                  : 'transparent',
                              }}
                              title={label || ''}
                            >
                              <div
                                className="flex items-center justify-center relative"
                                style={{ height: '34px' }}
                              >
                                {status && stStyle ? (
                                  <div
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '5px',
                                      fontWeight: 700,
                                      fontSize:
                                        status === 'WARN' || status === 'ERR' ? '9px' : '11px',
                                      backgroundColor: stStyle.bgColor,
                                      border: `1px solid ${stStyle.borderColor}40`,
                                      color: stStyle.color,
                                    }}
                                  >
                                    {status === 'WARN' || status === 'ERR' ? (
                                      <span>{attObj?.workday?.toFixed(1)}</span>
                                    ) : stStyle.icon.startsWith('bi-') ? (
                                      <i className={`bi ${stStyle.icon} text-[13px] font-bold`} />
                                    ) : (
                                      <span>{stStyle.icon || status}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      borderRadius: '5px',
                                      border: '1px dashed rgba(148, 163, 184, 0.25)',
                                    }}
                                  />
                                )}

                                {/* Meal indicators */}
                                <div
                                  className="flex items-center gap-0.5"
                                  style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    right: '2px',
                                    zIndex: 2,
                                  }}
                                >
                                  {attObj?.registeredLunch && (
                                    <div
                                      style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '9999px',
                                        backgroundColor: '#e11d48',
                                        border: '1px solid #ffffff',
                                      }}
                                      title="Đã đăng ký ăn trưa"
                                    />
                                  )}
                                  {attObj?.registeredDinner && (
                                    <div
                                      style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '9999px',
                                        backgroundColor: '#175cd3',
                                        border: '1px solid #ffffff',
                                      }}
                                      title="Đã đăng ký ăn tối"
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}

                        <td
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                            color: '#059669',
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            fontSize: '12.5px',
                          }}
                        >
                          {cong > 0 ? cong.toFixed(1) : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                            color: 'var(--brand-600, #175cd3)',
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            fontSize: '12.5px',
                          }}
                        >
                          {phep > 0 ? (Number.isInteger(phep) ? phep : phep.toFixed(1)) : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                            color: '#0284c7',
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            fontSize: '12.5px',
                          }}
                        >
                          {ot > 0 ? ot.toFixed(1) : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                            color: viPham > 0 ? '#e11d48' : 'var(--text-muted, #94a3b8)',
                            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                            fontSize: '12.5px',
                          }}
                        >
                          {viPham > 0 ? `${viPham}p` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'payroll' ? (
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
                  <th style={{ padding: '10px 14px', minWidth: '220px' }}>NHÂN VIÊN</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>LƯƠNG CƠ BẢN</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>NGÀY CÔNG</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>PHỤ CẤP</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#e11d48' }}>
                    KHẤU TRỪ
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706' }}>
                    LƯƠNG OT
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>
                    THỰC LĨNH
                  </th>
                  <th style={{ padding: '10px 14px', width: '150px', textAlign: 'center' }}>
                    TRẠNG THÁI
                  </th>
                </tr>
                {isAccountingApproved && (
                  <tr
                    style={{
                      backgroundColor: isDirectorApproved
                        ? '#ecfdf5'
                        : isDirectorSubmitted
                        ? '#fffbeb'
                        : '#eff8ff',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    }}
                  >
                    <td colSpan={8} style={{ padding: '8px 14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: isDirectorApproved
                            ? '#059669'
                            : isDirectorSubmitted
                            ? '#d97706'
                            : '#175cd3',
                        }}
                      >
                        <CheckCircleFill size={14} />
                        <span>
                          {isDirectorApproved
                            ? 'ĐÃ DUYỆT BẢNG LƯƠNG'
                            : isDirectorSubmitted
                            ? 'BẢNG LƯƠNG ĐANG CHỜ GIÁM ĐỐC DUYỆT'
                            : 'KẾ TOÁN ĐÃ DUYỆT BẢNG LƯƠNG'}
                        </span>
                        <span style={{ fontWeight: 500, color: '#475467', marginLeft: '6px' }}>
                          ({totalEmployeesCount} nhân sự • Tổng thực lĩnh:{' '}
                          {totalNetSum.toLocaleString('vi-VN')} đ)
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </thead>
              <tbody>
                {pagedEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}
                    >
                      Không tìm thấy dữ liệu bảng lương phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedEmployees.map((emp) => {
                    const cong = emp.attendance.reduce((acc, a) => acc + (a?.workday || 0), 0);
                    const ot = emp.attendance.reduce((acc, a) => acc + (a?.otHours || 0), 0);
                    const salary = emp.baseSalary || 0;
                    const mealTotal = (emp.mealAllowance || 0) * cong;
                    const otherAllowances =
                      (emp.fuelAllowance || 0) +
                      (emp.phoneAllowance || 0) +
                      (emp.seniorityAllowance || 0);
                    const allowances = mealTotal + otherAllowances;
                    const standardWorkDays = stats.workDays || 1;
                    const salaryTheoCong = (salary / standardWorkDays) * cong;
                    const otSalary = ot * (salary / standardWorkDays / 8);
                    const khauTru = (emp.insuranceDeduction ?? 0) + (emp.advanceDeduction ?? 0);
                    const net = Math.max(0, salaryTheoCong + allowances + otSalary - khauTru);

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}
                        onClick={() => setSelectedPayrollEmp({ emp, deptName: emp.deptName })}
                        title="Nhấn vào dòng để xem phiếu lương chi tiết"
                      >
                        <td style={{ padding: '8px 14px' }}>
                          <div className="flex flex-col min-w-0 gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  color: 'var(--text-primary, #0f172a)',
                                }}
                                className="group-hover:text-blue-600 truncate"
                              >
                                {emp.fullName}
                              </span>
                              {emp.isPayrollConfirmed && (
                                <CheckCircleFill
                                  size={12}
                                  className="text-emerald-600 shrink-0"
                                  title="Đã xác nhận phiếu lương"
                                />
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted, #64748b)',
                              }}
                              className="truncate"
                            >
                              {getPositionName(emp.position)} • {emp.deptName}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: 'var(--text-primary, #0f172a)',
                          }}
                        >
                          {Math.round(salary).toLocaleString('vi-VN')} đ
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: 'var(--brand-600, #175cd3)',
                          }}
                        >
                          {cong.toFixed(1)}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: 'var(--text-primary, #0f172a)',
                          }}
                        >
                          {Math.round(allowances).toLocaleString('vi-VN')} đ
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: '#e11d48',
                          }}
                        >
                          {Math.round(khauTru).toLocaleString('vi-VN')} đ
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: '#d97706',
                          }}
                        >
                          {ot > 0
                            ? `${ot.toFixed(1)}h (${Math.round(otSalary).toLocaleString('vi-VN')} đ)`
                            : '—'}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#059669',
                          }}
                        >
                          {Math.round(net).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          {isDirectorApproved ||
                          emp.payrollStatus === 'Đã duyệt' ||
                          emp.payrollStatus === 'Giám đốc đã duyệt' ? (
                            <Badge variant="success" style={{ fontWeight: 700 }}>
                              Đã duyệt
                            </Badge>
                          ) : isDirectorSubmitted ||
                            emp.payrollStatus === 'Chờ Giám đốc duyệt' ? (
                            <Badge variant="warning" style={{ fontWeight: 700 }}>
                              Chờ Giám đốc duyệt
                            </Badge>
                          ) : isAccountingApproved ||
                            emp.payrollStatus === 'Kế toán đã duyệt' ? (
                            <Badge variant="brand" style={{ fontWeight: 700 }}>
                              Kế toán đã duyệt
                            </Badge>
                          ) : (
                            <Badge variant="neutral" style={{ fontWeight: 600 }}>
                              Bản nháp
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table
              className="custom-table"
              style={{
                width: 'max-content',
                minWidth: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'left',
                fontSize: '0.8125rem',
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                }}
              >
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <th
                    style={{
                      padding: '8px 12px',
                      width: '220px',
                      minWidth: '220px',
                      position: 'sticky',
                      left: 0,
                      zIndex: 30,
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                      borderRight: '1px solid var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    NHÂN VIÊN
                  </th>
                  {daysInMonth.map((day) => (
                    <DayHeader key={day} day={day} year={year} month={month} />
                  ))}
                  <th
                    style={{
                      padding: '8px 8px',
                      width: '80px',
                      minWidth: '80px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    }}
                  >
                    ĂN TRƯA
                  </th>
                  <th
                    style={{
                      padding: '8px 8px',
                      width: '80px',
                      minWidth: '80px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                      borderBottom: '1px solid var(--border-default, #e2e8f0)',
                    }}
                  >
                    ĂN TỐI
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedEmployees.map((emp) => {
                  const totalLunch = emp.attendance.filter((a) => a?.registeredLunch).length;
                  const totalDinner = emp.attendance.filter((a) => a?.registeredDinner).length;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedAttendanceEmp({ emp, deptName: emp.deptName })}
                      title="Nhấn vào dòng để xem chi tiết chấm công & suất ăn"
                    >
                      <td
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                          backgroundColor: 'var(--bg-surface-1, #ffffff)',
                          padding: '6px 12px',
                          borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                          borderRight: '1px solid var(--border-subtle, #f1f5f9)',
                        }}
                      >
                        <div className="flex flex-col min-w-0 gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '12.5px',
                                color: 'var(--text-primary, #0f172a)',
                              }}
                              className="group-hover:text-blue-600 truncate"
                            >
                              {emp.fullName}
                            </span>
                            {emp.isConfirmed && (
                              <PatchCheckFill
                                size={12}
                                className="text-emerald-600 shrink-0"
                                title="Đã xác nhận bảng công"
                              />
                            )}
                          </div>
                          <span
                            style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)' }}
                            className="truncate"
                          >
                            {emp.deptName}
                          </span>
                        </div>
                      </td>
                      {daysInMonth.map((day, idx) => {
                        const attObj = emp.attendance[idx];
                        const date = new Date(year, month - 1, day);
                        const isWeekend = date.getDay() === 0;
                        return (
                          <td
                            key={day}
                            style={{
                              padding: 0,
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                              backgroundColor: isWeekend
                                ? 'rgba(241, 245, 249, 0.65)'
                                : 'transparent',
                            }}
                          >
                            <div
                              className="flex items-center justify-center gap-1"
                              style={{ height: '34px' }}
                            >
                              {attObj?.registeredLunch ? (
                                <div
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#e11d48',
                                    border: '1.5px solid #ffffff',
                                  }}
                                  title="Ăn trưa"
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '9999px',
                                    backgroundColor: 'rgba(148, 163, 184, 0.25)',
                                  }}
                                />
                              )}
                              {attObj?.registeredDinner ? (
                                <div
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#175cd3',
                                    border: '1.5px solid #ffffff',
                                  }}
                                  title="Ăn tối"
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '9999px',
                                    backgroundColor: 'rgba(148, 163, 184, 0.25)',
                                  }}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td
                        style={{
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        }}
                      >
                        <Badge variant="danger" style={{ fontWeight: 700 }}>
                          {totalLunch}
                        </Badge>
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        }}
                      >
                        <Badge variant="brand" style={{ fontWeight: 700 }}>
                          {totalDinner}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </FullWidthTable>

        {/* ── PHÂN TRANG CHUẨN DỰ ÁN (Pagination) ── */}
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={allFilteredEmployees.length}
          itemName="nhân sự"
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* ── OFFCANVAS TỔNG HỢP SUẤT ĂN (02-MEAL) ── */}
      {(() => {
        const selectedDay = new Date(summaryDate).getDate();
        const lunchList = allFilteredEmployees
          .filter(
            (emp) =>
              emp.attendance[selectedDay - 1]?.registeredLunch ||
              emp.attendance[selectedDay - 1]?.registeredDinner,
          )
          .map((emp) => ({
            ...emp,
            lunch: emp.attendance[selectedDay - 1]?.registeredLunch,
            dinner: emp.attendance[selectedDay - 1]?.registeredDinner,
          }));
        const totalLunch = lunchList.filter((e) => e.lunch).length;
        const totalDinner = lunchList.filter((e) => e.dinner).length;
        const isEmpty = lunchList.length === 0;

        return (
          <Offcanvas
            isOpen={showLunchModal}
            onClose={() => setShowLunchModal(false)}
            title="Tổng hợp suất ăn hằng ngày"
            description={`Mẫu số: 02-MEAL • Ngày ${new Date(summaryDate).toLocaleDateString('vi-VN')}`}
            width="400px"
            confirmText="Gửi thông tin"
            cancelText="Đóng"
            confirmDisabled={isEmpty}
            footerLeft={
              <Button
                variant="outline"
                size="sm"
                disabled={isEmpty}
                onClick={() => window.print()}
                leftIcon={<Printer size={14} />}
              >
                In
              </Button>
            }
            onConfirm={async () => {
              try {
                const res = await fetch('/api/hr/attendance/lunch-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    summaryDate,
                    totalLunch,
                    totalDinner,
                  }),
                });
                if (res.ok) {
                  showToast(
                    'success',
                    'Đã gửi danh sách suất ăn tới bộ phận Bếp thành công!',
                  );
                }
              } catch {}
              setShowLunchModal(false);
            }}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-600">Ăn trưa</span>
                  <Badge variant="danger" style={{ fontWeight: 700 }}>
                    {totalLunch} suất
                  </Badge>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-600">Ăn tối</span>
                  <Badge variant="brand" style={{ fontWeight: 700 }}>
                    {totalDinner} suất
                  </Badge>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-2.5 text-left">Nhân sự</th>
                      <th className="py-2 px-2 text-center w-16">Trưa</th>
                      <th className="py-2 px-2 text-center w-16">Tối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isEmpty ? (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-slate-400">
                          Không có nhân viên nào đăng ký suất ăn trong ngày này
                        </td>
                      </tr>
                    ) : (
                      lunchList.map((emp) => (
                        <tr key={emp.id}>
                          <td className="py-2 px-2.5">
                            <div className="font-bold text-slate-800 leading-tight">{emp.fullName}</div>
                            <div className="text-[10.5px] text-slate-500">{emp.deptName}</div>
                          </td>
                          <td className="text-center py-2 px-2">
                            {emp.lunch ? <Badge variant="success">Có</Badge> : '—'}
                          </td>
                          <td className="text-center py-2 px-2">
                            {emp.dinner ? <Badge variant="brand">Có</Badge> : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Offcanvas>
        );
      })()}

      {/* ── CONFIRM DIALOG CHUẨN DỰ ÁN ── */}
      <ConfirmDialog
        isOpen={Boolean(confirmModal?.open)}
        title={confirmModal?.title}
        message={confirmModal?.message}
        confirmText={confirmModal?.confirmLabel || 'Xác nhận'}
        cancelText="Để sau"
        variant={confirmModal?.variant || 'primary'}
        isLoading={loading}
        onConfirm={() => confirmModal?.action()}
        onCancel={() => setConfirmModal(null)}
      />

      {/* ── OFFCANVAS CHI TIẾT PHIẾU CHẤM CÔNG NHÂN VIÊN ── */}
      {(() => {
        const emp = selectedAttendanceEmp?.emp;
        const deptName = selectedAttendanceEmp?.deptName || '';
        const cong = (emp?.attendance || []).reduce((acc, a) => acc + (a?.workday || 0), 0);
        const phep = (emp?.attendance || []).reduce((acc, a) => {
          if (typeof a?.leaveDays === 'number' && a.leaveDays > 0) return acc + a.leaveDays;
          if (['P', 'KL', 'BHXH'].includes(a?.code || '')) return acc + 1;
          return acc;
        }, 0);
        const otHours = (emp?.attendance || []).reduce((acc, a) => acc + (a?.otHours || 0), 0);
        const viPham = (emp?.attendance || []).reduce(
          (acc, a) => acc + (a?.violationMinutes || 0),
          0,
        );
        const comTrua = (emp?.attendance || []).filter((a) => a?.registeredLunch).length;
        const comToi = (emp?.attendance || []).filter((a) => a?.registeredDinner).length;

        return (
          <Offcanvas
            isOpen={Boolean(selectedAttendanceEmp)}
            onClose={() => setSelectedAttendanceEmp(null)}
            title={`Phiếu tổng hợp công tháng ${month}/${year}`}
            description={
              emp ? `${emp.fullName} • ${getPositionName(emp.position)} (${deptName})` : ''
            }
            width="400px"
            confirmText="Gửi thông tin"
            cancelText="Đóng"
            isSubmitting={loading}
            onConfirm={async () => {
              if (!emp) return;
              try {
                await fetch('/api/hr/attendance/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ month, year, employeeId: emp.id }),
                });
                showToast(
                  'success',
                  `Đã gửi thông tin phiếu tổng hợp công tháng ${month}/${year} tới ${emp.fullName}!`,
                );
                await fetchData();
              } catch {
                showToast('error', 'Không thể gửi thông tin phiếu chấm công.');
              }
              setSelectedAttendanceEmp(null);
            }}
          >
            {emp && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[11px] text-slate-500 font-medium">Tổng ngày công</div>
                    <div className="text-[15px] font-bold text-emerald-600">
                      {cong.toFixed(2)} ngày
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[11px] text-slate-500 font-medium">Nghỉ phép / KL</div>
                    <div className="text-[15px] font-bold text-blue-600">
                      {Number.isInteger(phep) ? phep : phep.toFixed(1)} ngày
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[11px] text-slate-500 font-medium">Tăng ca (OT)</div>
                    <div className="text-[15px] font-bold text-sky-600">
                      {otHours.toFixed(1)} giờ
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[11px] text-slate-500 font-medium">Vi phạm muộn/sớm</div>
                    <div className="text-[15px] font-bold text-amber-600">{viPham} phút</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[11px] text-slate-500 font-medium">Suất ăn trưa / tối</div>
                    <div className="text-[15px] font-bold text-rose-600">
                      {comTrua} / {comToi} suất
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="text-[11px] text-slate-500 font-medium">Đơn đã duyệt</div>
                    <div className="text-[15px] font-bold text-indigo-600">
                      {(emp.requestSummary?.approvedLeaveRequests || 0) +
                        (emp.requestSummary?.approvedLateEarlyRequests || 0) +
                        (emp.requestSummary?.approvedOtRequests || 0)}{' '}
                      đơn
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-1.5 px-2.5 text-left w-14">Ngày</th>
                        <th className="py-1.5 px-1.5 text-center w-14">Mã</th>
                        <th className="py-1.5 px-1.5 text-center w-12">Công</th>
                        <th className="py-1.5 px-2.5 text-left">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daysInMonth.map((day, idx) => {
                        const cell = emp.attendance[idx];
                        if (!cell) return null;
                        const st = getStatusStyles(cell.code);
                        return (
                          <tr key={day} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-2.5 font-semibold text-slate-700">
                              {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                            </td>
                            <td className="py-1.5 px-1.5 text-center">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px]"
                                style={{
                                  backgroundColor: st.bgColor,
                                  color: st.color,
                                  border: `1px solid ${st.borderColor}40`,
                                }}
                              >
                                {cell.code}
                              </span>
                            </td>
                            <td className="py-1.5 px-1.5 text-center font-bold text-slate-800">
                              {(cell.workday || 0).toFixed(1)}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600">{cell.label || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Offcanvas>
        );
      })()}

      {/* ── OFFCANVAS CHI TIẾT PHIẾU LƯƠNG NHÂN VIÊN ── */}
      {(() => {
        const emp = selectedPayrollEmp?.emp;
        const deptName = selectedPayrollEmp?.deptName || '';
        const cong = (emp?.attendance || []).reduce((acc, a) => acc + (a?.workday || 0), 0);
        const ot = (emp?.attendance || []).reduce((acc, a) => acc + (a?.otHours || 0), 0);
        const salary = emp?.baseSalary || 0;
        const mealTotal = (emp?.mealAllowance || 0) * cong;
        const fuel = emp?.fuelAllowance || 0;
        const phone = emp?.phoneAllowance || 0;
        const seniority = emp?.seniorityAllowance || 0;
        const allowances = mealTotal + fuel + phone + seniority;
        const standardWorkDays = stats.workDays || 1;
        const salaryTheoCong = (salary / standardWorkDays) * cong;
        const otSalary = ot * (salary / standardWorkDays / 8);
        const khauTruBH = emp?.insuranceDeduction ?? 0;
        const khauTruTamUng = emp?.advanceDeduction ?? 0;
        const net = Math.max(0, salaryTheoCong + allowances + otSalary - khauTruBH - khauTruTamUng);

        return (
          <Offcanvas
            isOpen={Boolean(selectedPayrollEmp)}
            onClose={() => setSelectedPayrollEmp(null)}
            title={`Phiếu lương tháng ${month}/${year}`}
            description={
              emp ? `${emp.fullName} • ${getPositionName(emp.position)} (${deptName})` : ''
            }
            width="400px"
            confirmText="Gửi thông tin"
            cancelText="Đóng"
            isSubmitting={loading}
            onConfirm={async () => {
              if (!emp) return;
              try {
                await fetch('/api/hr/payroll/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ month, year, employeeId: emp.id }),
                });
                showToast(
                  'success',
                  `Đã gửi thông tin phiếu lương tháng ${month}/${year} tới ${emp.fullName}!`,
                );
                await fetchData();
              } catch {
                showToast('error', 'Không thể gửi thông tin phiếu lương.');
              }
              setSelectedPayrollEmp(null);
            }}
          >
            {emp && (
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Lương cơ bản định mức</span>
                  <span className="font-bold text-slate-800">
                    {Math.round(salary).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Ngày công thực tế / Ngày chuẩn</span>
                  <span className="font-bold text-slate-800">
                    {cong.toFixed(2)} / {standardWorkDays} ngày
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Lương theo ngày công</span>
                  <span className="font-bold text-slate-800">
                    {Math.round(salaryTheoCong).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Phụ cấp ăn ca ({cong.toFixed(1)} công)</span>
                  <span className="font-semibold text-slate-700">
                    {Math.round(mealTotal).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Phụ cấp xăng xe, điện thoại, thâm niên</span>
                  <span className="font-semibold text-slate-700">
                    {Math.round(fuel + phone + seniority).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Lương làm thêm giờ ({ot.toFixed(1)}h)</span>
                  <span className="font-bold text-amber-600">
                    {Math.round(otSalary).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Khấu trừ BHXH, BHYT, BHTN</span>
                  <span className="font-bold text-rose-600">
                    -{Math.round(khauTruBH).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {khauTruTamUng > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Khấu trừ tạm ứng đã duyệt</span>
                    <span className="font-bold text-rose-600">
                      -{Math.round(khauTruTamUng).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between mt-4">
                  <span className="font-bold text-emerald-900 text-[14px]">THỰC LĨNH</span>
                  <span className="font-bold text-emerald-700 text-[18px]">
                    {Math.round(net).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            )}
          </Offcanvas>
        );
      })()}
    </StepPage>
  );
};

export default AttendancePayrollPage;
