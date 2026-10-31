import React, { useState, useEffect, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { DepartmentActionMenu } from '../../components/common/DepartmentActionMenu';
import { EventOffcanvas } from '../../components/common/EventOffcanvas';
import type { TickerItem } from '../../components/layout/DynamicTicker';
import { EmployeesPage } from './EmployeesPage';
import type { ModernStepItem } from '../../types';
import {
  People,
  BarChartLine,
  CalendarEvent,
  CheckCircle,
  XCircle,
  FileEarmarkText,
  ClockHistory,
} from 'react-bootstrap-icons';

interface MonthlyHrPoint {
  monthIndex: number; // 1..12
  monthLabel: string; // 'T1'..'T12'
  fullLabel: string; // 'Tháng 01/2026'
  totalHeadcount: number;
  officialCount: number;
  probationCount: number;
  newHires: number;
  signedContracts: number;
}

interface PersonalRequestItem {
  id: string;
  code: string;
  type: string;
  rawDbType?: string;
  title: string;
  content?: string;
  reason?: string;
  applicantName?: string;
  applicantRole?: string;
  department?: string;
  approver?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  statusLabel?: string;
  createdAt?: string;
  lateEarlyDate?: string;
  lateEarlyTargetTime?: string;
  lateEarlyMinutes?: number;
  leaveFromDate?: string;
  leaveToDate?: string;
  leaveDays?: number;
  tripFromDate?: string;
  tripToDate?: string;
  advanceAmount?: number;
}

interface HrEmployeeRecord {
  id: string;
  code: string;
  fullName: string;
  departmentCode?: string;
  departmentName?: string;
  position?: string;
  positionTitle?: string;
  status?: string;
  employeeType?: string;
  contractType?: string | null;
  contractNumber?: string | null;
  contractSignDate?: string | null;
  contractEndDate?: string | null;
  startDate?: string | null;
  createdAt?: string | null;
  socialInsuranceNumber?: string | null;
  baseSalary?: number;
  workEmail?: string;
  phone?: string;
}

const REQUEST_TYPE_META: Record<string, { label: string; badgeClass: string; icon: string }> = {
  leave: {
    label: 'Nghỉ phép',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'bi-calendar2-check',
  },
  late_early: {
    label: 'Đi muộn về sớm',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'bi-clock-history',
  },
  'late-early': {
    label: 'Đi muộn về sớm',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'bi-clock-history',
  },
  advance: {
    label: 'Tạm ứng',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'bi-cash-coin',
  },
  refund: {
    label: 'Hoàn ứng',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'bi-receipt',
  },
  business_trip: {
    label: 'Công tác',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'bi-briefcase',
  },
  'business-trip': {
    label: 'Công tác',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'bi-briefcase',
  },
  other: {
    label: 'Đề xuất khác',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'bi-file-earmark-text',
  },
};

const formatContractTypeLabel = (rawType?: string | null): string => {
  const val = (rawType || '').trim();
  const lower = val.toLowerCase();
  if (!val || lower === 'unsigned' || lower === 'chưa ký hợp đồng' || lower === 'none') {
    return 'Chưa ký hợp đồng';
  }
  if (lower === 'indefinite' || lower.includes('không xác định')) {
    return 'Không xác định thời hạn';
  }
  if (lower === 'definite' || lower.includes('xác định thời hạn')) {
    return 'Có xác định thời hạn';
  }
  if (lower === 'probation' || lower.includes('thử việc')) {
    return 'Hợp đồng thử việc';
  }
  return val;
};

const isEmployeeProbation = (emp: HrEmployeeRecord): boolean => {
  const st = (emp.status || '').toLowerCase();
  const et = (emp.employeeType || '').toLowerCase();
  const ct = (emp.contractType || '').toLowerCase();
  return st === 'probation' || et === 'probation' || ct === 'probation' || ct.includes('thử việc');
};

const isEmployeeSignedContract = (emp: HrEmployeeRecord): boolean => {
  const label = formatContractTypeLabel(emp.contractType);
  return label !== 'Chưa ký hợp đồng';
};

export const HrOverviewPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeListTab, setActiveListTab] = useState<'pending_requests' | 'labor_contracts'>('pending_requests');
  const [chartRange, setChartRange] = useState<'H1' | 'H2' | 'YEAR'>('YEAR');
  const [hoverMonthIdx, setHoverMonthIdx] = useState<number | null>(null);
  const [activeDeptIndex, setActiveDeptIndex] = useState<number>(-1);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState<boolean>(false);
  const [openAddEmpTrigger, setOpenAddEmpTrigger] = useState<number>(0);

  // Data state linked to SQLite DB
  const [employees, setEmployees] = useState<HrEmployeeRecord[]>([]);
  const [requests, setRequests] = useState<PersonalRequestItem[]>([]);
  const [recruitmentStats, setRecruitmentStats] = useState({
    requests: 0,
    candidates: 0,
    interviews: 0,
    courses: 0,
  });
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);

  // Offcanvas state for Reviewing Request or Viewing Contract
  const [selectedRequest, setSelectedRequest] = useState<PersonalRequestItem | null>(null);
  const [selectedContractEmp, setSelectedContractEmp] = useState<HrEmployeeRecord | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const fetchHrData = async () => {
    try {
      const [empRes, reqRes, recReqRes, recCandRes, recIntRes, trainRes] = await Promise.all([
        fetch('/api/hr/employees?pageSize=200'),
        fetch('/api/personal-requests?scope=all'),
        fetch('/api/recruitment/requests').catch(() => null),
        fetch('/api/recruitment/candidates').catch(() => null),
        fetch('/api/recruitment/interviews').catch(() => null),
        fetch('/api/training/courses').catch(() => null),
      ]);

      if (empRes.ok) {
        const empJson = await empRes.json();
        const empList = Array.isArray(empJson?.employees)
          ? empJson.employees
          : Array.isArray(empJson?.data)
          ? empJson.data
          : Array.isArray(empJson)
          ? empJson
          : [];
        setEmployees(empList);
      }

      if (reqRes.ok) {
        const reqJson = await reqRes.json();
        const reqList = Array.isArray(reqJson)
          ? reqJson
          : Array.isArray(reqJson?.data)
          ? reqJson.data
          : [];
        setRequests(reqList);
      }

      const [recReqs, recCands, recInts, trainCourses] = await Promise.all([
        recReqRes && recReqRes.ok ? recReqRes.json().catch(() => []) : [],
        recCandRes && recCandRes.ok ? recCandRes.json().catch(() => []) : [],
        recIntRes && recIntRes.ok ? recIntRes.json().catch(() => []) : [],
        trainRes && trainRes.ok ? trainRes.json().catch(() => []) : [],
      ]);

      setRecruitmentStats({
        requests: Array.isArray(recReqs) ? recReqs.length : 0,
        candidates: Array.isArray(recCands) ? recCands.length : 0,
        interviews: Array.isArray(recInts) ? recInts.length : 0,
        courses: Array.isArray(trainCourses) ? trainCourses.length : 0,
      });
    } catch (err) {
      console.error('Lỗi tải dữ liệu tổng quan Nhân sự:', err);
    } finally {
      setLoadingEmployees(false);
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchHrData();
    const timer = setInterval(fetchHrData, 15000);
    return () => clearInterval(timer);
  }, []);

  // Chỉ lọc các yêu cầu của nhân viên có trạng thái "pending" (Chờ duyệt)
  const pendingRequests = useMemo(
    () => requests.filter((r) => String(r.status || '').toLowerCase() === 'pending'),
    [requests]
  );

  // Department summary for the bottom feed bar (from real DB employees)
  const departmentSummaries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; official: number; probation: number; contracted: number }
    >();
    employees.forEach((emp) => {
      if ((emp.status || '').toLowerCase() === 'resigned') return;
      const deptName = emp.departmentName || emp.departmentCode || 'Khối Văn phòng';
      const curr = map.get(deptName) || {
        name: deptName,
        total: 0,
        official: 0,
        probation: 0,
        contracted: 0,
      };
      curr.total += 1;
      if (isEmployeeProbation(emp)) {
        curr.probation += 1;
      } else {
        curr.official += 1;
      }
      if (isEmployeeSignedContract(emp)) {
        curr.contracted += 1;
      }
      map.set(deptName, curr);
    });
    return Array.from(map.values());
  }, [employees]);

  const activeDeptSummary =
    activeDeptIndex >= 0 && activeDeptIndex < departmentSummaries.length
      ? departmentSummaries[activeDeptIndex]
      : null;

  // Build 12-month headcount data for 2026 directly from real DB employees (startDate || createdAt)
  const monthlyChartData: MonthlyHrPoint[] = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const mStr = String(m).padStart(2, '0');
      const endOfMonth = new Date(2026, m, 0, 23, 59, 59, 999);

      const activeInMonth = employees.filter((emp) => {
        if ((emp.status || '').toLowerCase() === 'resigned') return false;
        const rawDate = emp.startDate || emp.createdAt;
        if (!rawDate) return true;
        const d = new Date(rawDate);
        return !isNaN(d.getTime()) ? d <= endOfMonth : true;
      });

      const hiresInMonth = employees.filter((emp) => {
        const rawDate = emp.startDate || emp.createdAt;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        return !isNaN(d.getTime()) && d.getFullYear() === 2026 && d.getMonth() + 1 === m;
      });

      const total = activeInMonth.length;
      const probation = activeInMonth.filter((e) => isEmployeeProbation(e)).length;
      const official = Math.max(0, total - probation);
      const signed = activeInMonth.filter((e) => isEmployeeSignedContract(e)).length;

      return {
        monthIndex: m,
        monthLabel: `T${m}`,
        fullLabel: `Tháng ${mStr}/2026`,
        totalHeadcount: total,
        officialCount: official,
        probationCount: probation,
        newHires: hiresInMonth.length,
        signedContracts: signed,
      };
    });
  }, [employees]);

  const visibleMonths = useMemo(() => {
    if (chartRange === 'H1') return monthlyChartData.slice(0, 6);
    if (chartRange === 'H2') return monthlyChartData.slice(6, 12);
    return monthlyChartData;
  }, [monthlyChartData, chartRange]);

  const handleApproveOrReject = async (
    reqItem: PersonalRequestItem,
    nextStatus: 'approved' | 'rejected'
  ) => {
    try {
      setProcessingRequestId(reqItem.id);
      const res = await fetch(`/api/personal-requests/${reqItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchHrData();
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái yêu cầu:', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  // SVG coordinates for Monthly HR Chart
  const width = 600;
  const height = 180;
  const paddingX = 28;
  const paddingY = 24;
  const maxVal = Math.max(...visibleMonths.map((d) => d.totalHeadcount), 10) * 1.18;
  const minVal = 0;

  const getX = (idx: number) => {
    if (visibleMonths.length <= 1) return width / 2;
    return paddingX + (idx / (visibleMonths.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    return height - paddingY - ratio * (height - paddingY * 2);
  };

  const chartPoints = visibleMonths.map((d, i) => ({
    x: getX(i),
    y: getY(d.totalHeadcount),
    data: d,
    leftPct: (getX(i) / width) * 100,
    topPct: (getY(d.totalHeadcount) / height) * 100,
  }));

  let pathD = chartPoints.length > 0 ? `M ${chartPoints[0].x} ${chartPoints[0].y}` : '';
  for (let i = 0; i < chartPoints.length - 1; i++) {
    const curr = chartPoints[i];
    const next = chartPoints[i + 1];
    const cpX = (curr.x + next.x) / 2;
    pathD += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }

  const areaD =
    chartPoints.length > 0
      ? `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${height - paddingY} L ${chartPoints[0].x} ${height - paddingY} Z`
      : '';

  const activePoint =
    hoverMonthIdx !== null && chartPoints[hoverMonthIdx] ? chartPoints[hoverMonthIdx] : null;
  const isNearTop = activePoint ? activePoint.topPct < 45 : false;
  const tooltipLeftClamped = activePoint ? Math.max(16, Math.min(84, activePoint.leftPct)) : 50;

  // Overall stats from real DB
  const activeEmployees = useMemo(
    () => employees.filter((e) => (e.status || '').toLowerCase() !== 'resigned'),
    [employees]
  );
  const totalEmployeesCount = activeEmployees.length;
  const probationEmployeesCount = activeEmployees.filter((e) => isEmployeeProbation(e)).length;
  const officialEmployeesCount = Math.max(0, totalEmployeesCount - probationEmployeesCount);
  const signedContractsCount = activeEmployees.filter((e) => isEmployeeSignedContract(e)).length;
  const unsignedContractsCount = Math.max(0, totalEmployeesCount - signedContractsCount);
  const indefiniteContractsCount = activeEmployees.filter(
    (e) => formatContractTypeLabel(e.contractType) === 'Không xác định thời hạn'
  ).length;
  const definiteContractsCount = activeEmployees.filter(
    (e) => formatContractTypeLabel(e.contractType) === 'Có xác định thời hạn'
  ).length;

  // Live HR Ticker Items from real DB data
  const hrTickerItems: TickerItem[] = useMemo(() => {
    const pendingLeaveCount = pendingRequests.filter((r) => r.type === 'leave').length;
    const pendingLateCount = pendingRequests.filter(
      (r) => r.type === 'late_early' || r.type === 'late-early'
    ).length;
    const pendingOtherCount = Math.max(
      0,
      pendingRequests.length - pendingLeaveCount - pendingLateCount
    );

    return [
      {
        badge: 'ĐỊNH BIÊN NHÂN SỰ',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
        text: `Tổng số <strong>${totalEmployeesCount} cán bộ nhân viên</strong> đang làm việc tại <strong>${departmentSummaries.length} bộ phận</strong> — Nhân sự chính thức: <strong>${officialEmployeesCount} người</strong> • Thử việc: <strong>${probationEmployeesCount} người</strong>`,
      },
      {
        badge: 'YÊU CẦU CHỜ DUYỆT',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
        text: `Hiện có <strong>${pendingRequests.length} đơn từ &amp; đề xuất</strong> đang chờ phê duyệt — Nghỉ phép: <strong>${pendingLeaveCount} đơn</strong> • Đi muộn/về sớm: <strong>${pendingLateCount} đơn</strong> • Đề xuất khác: <strong>${pendingOtherCount} đơn</strong>`,
      },
      {
        badge: 'HỢP ĐỒNG LAO ĐỘNG',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
        text: `Đã ký kết <strong>${signedContractsCount}/${totalEmployeesCount} hợp đồng lao động</strong> (Không xác định thời hạn: <strong>${indefiniteContractsCount} HĐ</strong> • Có xác định thời hạn: <strong>${definiteContractsCount} HĐ</strong> • Chưa ký HĐ: <strong>${unsignedContractsCount} nhân sự</strong>)`,
      },
      {
        badge: 'TUYỂN DỤNG & ĐÀO TẠO',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
        text: `Đang triển khai <strong>${recruitmentStats.requests} yêu cầu tuyển dụng</strong> với <strong>${recruitmentStats.candidates} hồ sơ ứng viên</strong> • <strong>${recruitmentStats.interviews} lịch phỏng vấn</strong> và <strong>${recruitmentStats.courses} khóa đào tạo nội bộ</strong>`,
      },
    ];
  }, [
    totalEmployeesCount,
    departmentSummaries.length,
    officialEmployeesCount,
    probationEmployeesCount,
    pendingRequests,
    signedContractsCount,
    indefiniteContractsCount,
    definiteContractsCount,
    unsignedContractsCount,
    recruitmentStats,
  ]);

  const steps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'hr-general-data',
        title: 'Dữ liệu tổng quát',
        desc: 'Biến động nhân sự, yêu cầu chờ duyệt và hợp đồng lao động',
        icon: <BarChartLine size={18} />,
        badge: `${pendingRequests.length} chờ duyệt`,
        badgeVariant: 'warning',
        color: '#e11d48',
      },
      {
        num: 2,
        id: 'hr-employee-list',
        title: 'Danh sách nhân sự',
        desc: 'Hồ sơ cán bộ công nhân viên, phòng ban và chức vụ',
        icon: <People size={18} />,
        badge: `${totalEmployeesCount} nhân sự`,
        badgeVariant: 'success',
        color: '#059669',
      },
    ],
    [pendingRequests.length, totalEmployeesCount]
  );

  return (
    <StepPage
      title="Nhân sự"
      description="Quản trị nguồn nhân lực, theo dõi biến động nhân sự, phê duyệt yêu cầu và hợp đồng lao động Seajong."
      icon="bi-people"
      color="rose"
      tickerContext="employees"
      customTickerNews={hrTickerItems}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      stepperExtraRight={
        <div className="flex items-center gap-2 pr-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEventCalendarOpen(true)}
            leftIcon={<CalendarEvent className="text-blue-600 shrink-0" size={15} />}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:border-slate-300 select-none shrink-0"
            title="Mở Lịch sự kiện Seajong"
          >
            <span className="font-bold text-slate-800 tracking-tight">Lịch sự kiện</span>
          </Button>

          <DepartmentActionMenu />
        </div>
      }
    >
      {/* ════════════════════════════════════════════════════════════
          BƯỚC 1: DỮ LIỆU TỔNG QUÁT
          ════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="mkt-live-charts">
          {/* ──── CỘT TRÁI: BIỂU ĐỒ NHÂN SỰ CÁC THÁNG TRONG NĂM ──── */}
          <div className="flex flex-col h-full min-h-0 pr-0 lg:pr-3 overflow-hidden">
            {/* Header Card */}
            <div className="mkt-chart-header">
              <div className="min-w-0 pr-2">
                <h2 className="mkt-chart-title">
                  <i className="bi bi-graph-up-arrow text-emerald-500" />
                  <span className="truncate max-w-[380px]">
                    Biểu đồ nhân sự các tháng trong năm 2026
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 mb-0 truncate hidden sm:block">
                  Quy mô định biên nhân sự, tỷ lệ nhân viên chính thức và biến động tuyển mới theo tháng.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mkt-chart-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHrData}
                  className="w-8 h-8 !p-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Làm mới dữ liệu nhân sự"
                >
                  <i className="bi bi-arrow-clockwise text-slate-500" />
                </Button>

                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setOpenAddEmpTrigger((prev) => prev + 1)}
                  leftIcon={<i className="bi bi-plus-lg" />}
                  className="px-3.5 py-1.5 rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  Thêm nhân sự mới
                </Button>
              </div>
            </div>

            {/* Interactive SVG Area Chart: Biểu đồ nhân sự các tháng trong năm */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex-1 flex flex-col min-h-0 select-none">
                <div className="relative flex-1 min-h-[160px] w-full">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="hrEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                        <stop offset="70%" stopColor="#10b981" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="hrLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <filter id="hrGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow
                          dx="0"
                          dy="3"
                          stdDeviation="3"
                          floodColor="#10b981"
                          floodOpacity="0.25"
                        />
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((ratio) => {
                      const y = height - paddingY - ratio * (height - paddingY * 2);
                      return (
                        <line
                          key={ratio}
                          x1={paddingX}
                          y1={y}
                          x2={width - paddingX}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Area Fill */}
                    {areaD && <path d={areaD} fill="url(#hrEmeraldGrad)" />}

                    {/* Spline Stroke */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="url(#hrLineGrad)"
                        strokeWidth="3"
                        filter="url(#hrGlow)"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Vertical dashed guideline when hovered */}
                    {activePoint && (
                      <line
                        x1={activePoint.x}
                        y1={paddingY}
                        x2={activePoint.x}
                        y2={height - paddingY}
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}
                  </svg>

                  {/* Interactive Columns for hover triggers */}
                  <div
                    className="absolute inset-0 flex"
                    onMouseLeave={() => setHoverMonthIdx(null)}
                  >
                    {chartPoints.map((_, idx) => (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoverMonthIdx(idx)}
                        className="flex-1 h-full cursor-pointer"
                      />
                    ))}
                  </div>

                  {/* Round HTML Data Nodes + Month Labels */}
                  <div className="absolute inset-0 pointer-events-none">
                    {chartPoints.map((pt, idx) => {
                      const isHovered = hoverMonthIdx === idx;
                      return (
                        <React.Fragment key={pt.data.monthIndex}>
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-150"
                            style={{
                              left: `${pt.leftPct}%`,
                              top: `${pt.topPct}%`,
                              width: isHovered ? 16 : 9,
                              height: isHovered ? 16 : 9,
                            }}
                          >
                            <div
                              className={`w-full h-full rounded-full transition-all duration-200 ${
                                isHovered
                                  ? 'bg-emerald-500 ring-4 ring-emerald-500/25 shadow-md scale-110'
                                  : 'bg-white border-2 border-emerald-500 shadow-2xs'
                              }`}
                              style={{ aspectRatio: '1 / 1' }}
                            />
                          </div>

                          {/* Month label along bottom */}
                          <div
                            className={`absolute -translate-x-1/2 bottom-0.5 text-[10px] font-bold transition-colors ${
                              isHovered ? 'text-emerald-700 font-extrabold' : 'text-slate-400'
                            }`}
                            style={{ left: `${pt.leftPct}%` }}
                          >
                            {pt.data.monthLabel}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Tooltip */}
                  {activePoint && (
                    <div
                      className={`absolute z-30 pointer-events-none transition-all duration-150 ease-out ${
                        isNearTop ? 'top-auto' : ''
                      }`}
                      style={{
                        left: `${tooltipLeftClamped}%`,
                        top: isNearTop
                          ? `calc(${activePoint.topPct}% + 18px)`
                          : `calc(${activePoint.topPct}% - 14px)`,
                        transform: isNearTop ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                        minWidth: 215,
                      }}
                    >
                      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3 text-slate-800">
                        <div
                          className={`absolute w-2.5 h-2.5 bg-white border-slate-200 ${
                            isNearTop
                              ? '-top-1.5 left-1/2 -translate-x-1/2 rotate-45 border-t border-l'
                              : '-bottom-1.5 left-1/2 -translate-x-1/2 rotate-45 border-b border-r'
                          }`}
                        />

                        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                          <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                            <i className="bi bi-calendar3 text-slate-400" />
                            {activePoint.data.fullLabel}
                          </span>
                          <span className="text-[11px] font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                            {activePoint.data.totalHeadcount} nhân sự
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-0.5">
                              <i className="bi bi-person-check-fill text-blue-500" />
                              Chính thức
                            </span>
                            <span className="font-bold text-slate-800 font-mono">
                              {activePoint.data.officialCount} người
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-0.5">
                              <i className="bi bi-file-earmark-check-fill text-indigo-500" />
                              Đã ký HĐLĐ
                            </span>
                            <span className="font-bold text-slate-800 font-mono">
                              {activePoint.data.signedContracts} người
                            </span>
                          </div>

                          <div className="col-span-2 pt-1 border-t border-slate-100/80 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <i className="bi bi-person-plus-fill text-emerald-500" />
                              Tuyển mới trong tháng:
                            </span>
                            <span className="font-bold text-emerald-600 font-mono text-[11px]">
                              +{activePoint.data.newHires} nhân sự
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Range filter buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'H1', label: '6 tháng đầu năm' },
                        { id: 'H2', label: '6 tháng cuối năm' },
                        { id: 'YEAR', label: 'Cả năm (12 tháng)' },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setChartRange(r.id);
                          setHoverMonthIdx(null);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer ${
                          chartRange === r.id
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium">
                    Dữ liệu: <span className="font-bold text-slate-700">{visibleMonths.length} tháng (2026)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Realtime Summary Feed */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Cập nhật mới nhất
                </span>

                <div className="flex items-center gap-2">
                  {departmentSummaries.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveDeptIndex((prev) => Math.max(-1, prev - 1))}
                        disabled={activeDeptIndex === -1}
                        className="w-5 h-5 !p-0 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                      >
                        <i className="bi bi-chevron-left text-[10px]" />
                      </Button>
                      <span className="text-[11px] font-bold text-slate-600 w-16 text-center font-mono">
                        {activeDeptIndex === -1
                          ? 'Toàn công ty'
                          : `${activeDeptIndex + 1}/${departmentSummaries.length}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setActiveDeptIndex((prev) =>
                            Math.min(departmentSummaries.length - 1, prev + 1)
                          )
                        }
                        disabled={activeDeptIndex >= departmentSummaries.length - 1}
                        className="w-5 h-5 !p-0 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                      >
                        <i className="bi bi-chevron-right text-[10px]" />
                      </Button>
                    </div>
                  )}

                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <i
                      className="bi bi-lightning-charge-fill text-emerald-500"
                      style={{ animation: 'pulse-lightning 1.5s infinite' }}
                    />
                    KẾT NỐI TỨC THÌ
                  </span>
                </div>
              </div>

              <div className="mkt-campaign-feed-row p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <i className="bi bi-building-fill-check text-rose-600 text-sm" />
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {activeDeptSummary ? activeDeptSummary.name : 'Tổng hợp Nhân sự Công ty Seajong'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <i className="bi bi-people text-emerald-600" />
                      Định biên: {activeDeptSummary ? activeDeptSummary.total : totalEmployeesCount} nhân sự
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="bi bi-file-earmark-check text-blue-600" />
                      Đã ký HĐLĐ: {activeDeptSummary ? activeDeptSummary.contracted : signedContractsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="bi bi-hourglass-split text-amber-600" />
                      Đơn chờ duyệt: {pendingRequests.length}
                    </span>
                  </div>
                </div>

                <div className="mkt-campaign-metrics">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Tổng nhân sự</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {activeDeptSummary ? activeDeptSummary.total : totalEmployeesCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Chính thức</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {activeDeptSummary ? activeDeptSummary.official : officialEmployeesCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Thử việc</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-600 flex items-center justify-end gap-1">
                      <i className="bi bi-person-plus-fill text-xs" />
                      {activeDeptSummary ? activeDeptSummary.probation : probationEmployeesCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── CỘT PHẢI: YÊU CẦU CHỜ DUYỆT & THEO DÕI HỢP ĐỒNG LAO ĐỘNG ──── */}
          <div className="flex flex-col h-full min-h-0 pl-0 lg:pl-3 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <Button
                  variant={activeListTab === 'pending_requests' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveListTab('pending_requests')}
                  leftIcon={<i className="bi bi-clipboard2-check-fill text-amber-600" />}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                    activeListTab === 'pending_requests'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Yêu cầu chờ duyệt
                </Button>

                <Button
                  variant={activeListTab === 'labor_contracts' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveListTab('labor_contracts')}
                  leftIcon={<i className="bi bi-file-earmark-medical-fill text-emerald-600" />}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                    activeListTab === 'labor_contracts'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Theo dõi hợp đồng lao động
                </Button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {activeListTab === 'pending_requests'
                    ? `${pendingRequests.length} chờ duyệt`
                    : `${totalEmployeesCount} hợp đồng`}
                </span>
              </div>
            </div>

            {/* Content List Area */}
            <div className="flex-1 overflow-y-auto min-h-0 pt-2 space-y-1">
              {activeListTab === 'pending_requests' ? (
                loadingRequests ? (
                  <div className="p-8 text-center text-slate-400">
                    <i className="bi bi-arrow-repeat text-2xl animate-spin block mb-2" />
                    <span className="text-xs">Đang tải danh sách yêu cầu chờ duyệt...</span>
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <i className="bi bi-check2-circle text-3xl block mb-2 text-emerald-500 opacity-75" />
                    <span className="text-xs font-semibold">
                      Không có yêu cầu nào đang chờ phê duyệt
                    </span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingRequests.map((req) => {
                      const meta = REQUEST_TYPE_META[req.type] || REQUEST_TYPE_META.other;
                      const displayDate =
                        req.leaveFromDate ||
                        req.lateEarlyDate ||
                        req.tripFromDate ||
                        req.createdAt ||
                        '';
                      return (
                        <div
                          key={req.id}
                          onClick={() => setSelectedRequest(req)}
                          className="p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all bg-amber-50/35 hover:bg-amber-50/75 border border-amber-200/60 mb-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {req.code}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                              >
                                <i className={`bi ${meta.icon}`} />
                                {meta.label}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {req.applicantName || 'Nhân viên'}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {req.title}
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                              <span>{req.department || 'Khối văn phòng'}</span>
                              {displayDate && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{displayDate}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                style={{ animation: 'status-pulse-dot 2s infinite' }}
                              />
                              Chờ duyệt
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : loadingEmployees ? (
                <div className="p-8 text-center text-slate-400">
                  <i className="bi bi-arrow-repeat text-2xl animate-spin block mb-2" />
                  <span className="text-xs">Đang tải dữ liệu hợp đồng lao động...</span>
                </div>
              ) : activeEmployees.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <i className="bi bi-inbox text-3xl block mb-2 opacity-50" />
                  <span className="text-xs font-semibold">Chưa có hồ sơ hợp đồng lao động</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeEmployees.map((emp) => {
                    const contractLabel = formatContractTypeLabel(emp.contractType);
                    const isUncontracted = contractLabel === 'Chưa ký hợp đồng';
                    const isProbation = isEmployeeProbation(emp);
                    const startDisplay = emp.startDate || emp.contractSignDate;

                    return (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedContractEmp(emp)}
                        className="p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(emp.fullName || 'N').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{emp.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({emp.code})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                              <span>{emp.departmentName || emp.departmentCode || 'Nhân sự'}</span>
                              {emp.contractNumber ? (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-600">
                                    Số HĐ: {emp.contractNumber}
                                  </span>
                                </>
                              ) : startDisplay ? (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">
                                    Vào làm: {new Date(startDisplay).toLocaleDateString('vi-VN')}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                              isUncontracted
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isProbation
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isUncontracted
                                  ? 'bg-rose-500'
                                  : isProbation
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            {contractLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Offcanvas: Chi tiết & Phê duyệt Yêu cầu */}
          <Offcanvas
            isOpen={!!selectedRequest}
            onClose={() => setSelectedRequest(null)}
            title="Chi tiết yêu cầu & Phê duyệt"
            description={selectedRequest ? `Mã phiếu: ${selectedRequest.code}` : ''}
            icon={<ClockHistory size={18} />}
            width="lg"
            footer={
              selectedRequest ? (
                <div className="flex items-center justify-between w-full gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-xl px-4 py-2 text-xs font-bold"
                  >
                    Đóng
                  </Button>
                  {selectedRequest.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={processingRequestId === selectedRequest.id}
                        onClick={() => handleApproveOrReject(selectedRequest, 'rejected')}
                        leftIcon={<XCircle size={14} />}
                        className="rounded-xl px-4 py-2 text-xs font-bold"
                      >
                        Từ chối
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        disabled={processingRequestId === selectedRequest.id}
                        onClick={() => handleApproveOrReject(selectedRequest, 'approved')}
                        leftIcon={<CheckCircle size={14} />}
                        className="rounded-xl px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                      >
                        Phê duyệt ngay
                      </Button>
                    </div>
                  )}
                </div>
              ) : undefined
            }
          >
            {selectedRequest && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Người đề xuất</span>
                    <span className="font-bold text-slate-900">
                      {selectedRequest.applicantName || 'Nhân viên'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Bộ phận</span>
                    <span className="font-bold text-slate-900">
                      {selectedRequest.department || 'Khối văn phòng'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Thời gian áp dụng</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedRequest.leaveFromDate ||
                        selectedRequest.lateEarlyDate ||
                        selectedRequest.tripFromDate ||
                        selectedRequest.createdAt ||
                        '—'}
                      {selectedRequest.leaveToDate &&
                      selectedRequest.leaveToDate !== selectedRequest.leaveFromDate
                        ? ` → ${selectedRequest.leaveToDate}`
                        : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Người phê duyệt</span>
                    <span className="font-bold text-slate-900">
                      {selectedRequest.approver || 'Ban Giám đốc'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Tiêu đề yêu cầu</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedRequest.title}</span>
                  </div>
                  {(selectedRequest.content || selectedRequest.reason) && (
                    <div>
                      <span className="text-slate-400 block mb-0.5">Nội dung / Lý do chi tiết</span>
                      <p className="text-slate-700 m-0 leading-relaxed">
                        {selectedRequest.content || selectedRequest.reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Offcanvas>

          {/* Offcanvas: Chi tiết Hợp đồng lao động */}
          <Offcanvas
            isOpen={!!selectedContractEmp}
            onClose={() => setSelectedContractEmp(null)}
            title="Thông tin Hợp đồng lao động"
            description={
              selectedContractEmp ? `${selectedContractEmp.fullName} (${selectedContractEmp.code})` : ''
            }
            icon={<FileEarmarkText size={18} />}
            width="lg"
            footer={
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => setSelectedContractEmp(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold"
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedContractEmp(null);
                    setCurrentStep(2);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border-0"
                >
                  Mở Danh sách nhân sự
                </Button>
              </div>
            }
          >
            {selectedContractEmp && (
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Họ và tên</span>
                  <span className="font-bold text-slate-900">{selectedContractEmp.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Mã nhân viên</span>
                  <span className="font-mono font-bold text-slate-900">{selectedContractEmp.code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Phòng ban</span>
                  <span className="font-bold text-slate-900">
                    {selectedContractEmp.departmentName || selectedContractEmp.departmentCode || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Chức vụ</span>
                  <span className="font-bold text-slate-900">
                    {selectedContractEmp.positionTitle || selectedContractEmp.position || 'Nhân viên'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Loại hợp đồng</span>
                  <span className="font-bold text-emerald-700">
                    {formatContractTypeLabel(selectedContractEmp.contractType)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Số hợp đồng</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedContractEmp.contractNumber || 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Ngày vào làm</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedContractEmp.startDate
                      ? new Date(selectedContractEmp.startDate).toLocaleDateString('vi-VN')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Thời hạn hợp đồng</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedContractEmp.contractSignDate
                      ? new Date(selectedContractEmp.contractSignDate).toLocaleDateString('vi-VN')
                      : '—'}
                    {selectedContractEmp.contractEndDate
                      ? ` → ${new Date(selectedContractEmp.contractEndDate).toLocaleDateString('vi-VN')}`
                      : ''}
                  </span>
                </div>
              </div>
            )}
          </Offcanvas>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          BƯỚC 2: DANH SÁCH NHÂN SỰ (Luôn giữ mount để Offcanvas Thêm nhân sự mới hoạt động ngay cả ở Bước 1)
          ════════════════════════════════════════════════════════════ */}
      <EmployeesPage
        embedded
        tableHidden={currentStep !== 2}
        openAddTrigger={openAddEmpTrigger}
        onDataChanged={fetchHrData}
      />

      {/* ── Offcanvas Lịch Sự Kiện Đa Năng ── */}
      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
};

export default HrOverviewPage;
