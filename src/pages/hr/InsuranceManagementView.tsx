import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  ArrowRepeat,
  Download,
  CheckCircleFill,
  ClockFill,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Sliders,
  ShieldCheck,
  ArrowCounterclockwise,
  HeartPulse,
} from 'react-bootstrap-icons';
import { Pagination } from '../../components/common/Pagination';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DatePicker } from '../../components/common/DatePicker';
import { EmployeeSelect } from '../../components/common/EmployeeSelect';
import {
  useDepartmentOptions,
  matchDepartment,
} from '../../components/common/DepartmentSelect';

export interface InsuranceManagementViewProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onCountsChange?: (counts: { participants: number; fluctuations: number; claims: number }) => void;
}

const formatMoney = (val: number | string | undefined | null) => {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) return '0 đ';
  return `${num.toLocaleString('vi-VN')} đ`;
};

const formatNumberGroup = (val: string | number | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};

export const InsuranceManagementView: React.FC<InsuranceManagementViewProps> = ({
  currentStep = 1,
  onStepChange: _onStepChange,
  onCountsChange,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 1. Data nhân viên và phân trang (Bước 1 - Danh sách tham gia thực tế từ DB)
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const { options: deptOptions } = useDepartmentOptions({ includeAll: true });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Step 2 state: Biến động (Model InsuranceChange từ DB)
  const [fluctuations, setFluctuations] = useState<any[]>([]);
  const [isLoadingFluctuations, setIsLoadingFluctuations] = useState<boolean>(true);
  const [searchQueryStep2, setSearchQueryStep2] = useState('');
  const [deptFilterStep2, setDeptFilterStep2] = useState('all');
  const [typeFilterStep2, setTypeFilterStep2] = useState('all');
  const [statusFilterStep2, setStatusFilterStep2] = useState('all');
  const [currentPageStep2, setCurrentPageStep2] = useState<number>(1);
  const [pageSizeStep2, setPageSizeStep2] = useState<number>(10);

  // Step 3 state: Chế độ và trợ cấp (Model InsuranceBenefit từ DB)
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState<boolean>(true);
  const [searchQueryStep3, setSearchQueryStep3] = useState('');
  const [deptFilterStep3, setDeptFilterStep3] = useState('all');
  const [claimTypeFilterStep3, setClaimTypeFilterStep3] = useState('all');
  const [statusFilterStep3, setStatusFilterStep3] = useState('all');
  const [currentPageStep3, setCurrentPageStep3] = useState<number>(1);
  const [pageSizeStep3, setPageSizeStep3] = useState<number>(10);

  // Step 4 state: Cấu hình thiết lập (Model InsuranceConfig từ DB)
  const [config, setConfig] = useState({
    baseSalary: 2340000,
    empBhxhRate: 8.0,
    empBhytRate: 1.5,
    empBhtnRate: 1.0,
    compBhxhRate: 17.5,
    compBhytRate: 3.0,
    compBhtnRate: 1.0,
    authorityName: 'Bảo hiểm xã hội Thành phố Hà Nội',
    agencyCode: 'TZ0123A',
    sicknessRate: 75.0,
    maternityRate: 100.0,
    maternityOneTimeMultiplier: 2.0,
    convalescenceDailyRate: 30.0,
    unemploymentRate: 60.0,
    funeralMultiplier: 10.0,
    survivorRateNormal: 50.0,
  });
  const [isSavedConfig, setIsSavedConfig] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/hr/insurance/participants');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        const fallback = await fetch('/api/users');
        if (fallback.ok) {
          const data = await fallback.json();
          setUsers(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFluctuations = useCallback(async () => {
    try {
      setIsLoadingFluctuations(true);
      const res = await fetch('/api/hr/insurance/changes');
      if (res.ok) {
        const data = await res.json();
        setFluctuations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching insurance changes:', err);
    } finally {
      setIsLoadingFluctuations(false);
    }
  }, []);

  const fetchClaims = useCallback(async () => {
    try {
      setIsLoadingClaims(true);
      const res = await fetch('/api/hr/insurance/benefits');
      if (res.ok) {
        const data = await res.json();
        setClaims(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching insurance benefits:', err);
    } finally {
      setIsLoadingClaims(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/insurance/config');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfig((prev) => ({
            ...prev,
            baseSalary: Number(data.baseReferenceWage ?? prev.baseSalary),
            empBhxhRate: Number(data.employeeBhxh ?? prev.empBhxhRate),
            empBhytRate: Number(data.employeeBhyt ?? prev.empBhytRate),
            empBhtnRate: Number(data.employeeBhtn ?? prev.empBhtnRate),
            compBhxhRate: Number(data.employerBhxh ?? prev.compBhxhRate),
            compBhytRate: Number(data.employerBhyt ?? prev.compBhytRate),
            compBhtnRate: Number(data.employerBhtn ?? prev.compBhtnRate),
            sicknessRate: Number(data.sickLeaveRate ?? prev.sicknessRate),
            maternityRate: Number(data.maternityRate ?? prev.maternityRate),
            maternityOneTimeMultiplier: Number(data.maternityAllowance ?? prev.maternityOneTimeMultiplier),
            convalescenceDailyRate: Number(data.recoveryRate ?? prev.convalescenceDailyRate),
            unemploymentRate: Number(data.unemploymentRate ?? prev.unemploymentRate),
            funeralMultiplier: Number(data.funeralAllowance ?? prev.funeralMultiplier),
            survivorRateNormal: Number(data.survivorRateNormal ?? prev.survivorRateNormal),
            authorityName: data.authorityName || prev.authorityName,
            agencyCode: data.agencyCode || prev.agencyCode,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching insurance config:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchFluctuations();
    fetchClaims();
    fetchConfig();
  }, [fetchUsers, fetchFluctuations, fetchClaims, fetchConfig]);

  // Chỉ lấy nhân sự thực tế đang tham gia đóng BHXH trong DB cho Bước 1
  const enrolledUsers = useMemo(() => {
    return users.filter(
      (u) =>
        Boolean(u.isInsuranceEnrolled) ||
        Boolean(u.hasInsurance) ||
        Boolean(u.socialInsuranceNumber && String(u.socialInsuranceNumber).trim() !== '') ||
        Number(u.insuranceSalary || 0) > 0
    );
  }, [users]);

  // Offcanvas thêm nhân sự đóng BHXH ở Bước 1 (400px)
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    employeeName: '',
    insuranceBookNumber: '',
    insuranceSalary: '5500000',
  });

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.employeeName.trim()) {
      alert('Vui lòng chọn nhân viên tham gia BHXH');
      return;
    }
    const cleanSalary = parseFloat(String(newParticipant.insuranceSalary).replace(/\D/g, '')) || 5500000;
    const bookNo = newParticipant.insuranceBookNumber.trim();

    try {
      const res = await fetch('/api/hr/insurance/employee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: newParticipant.employeeName,
          socialInsuranceNumber: bookNo,
          insuranceSalary: cleanSalary,
          isInsuranceEnrolled: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Không thể lưu thông tin bảo hiểm nhân viên');
        return;
      }
      await fetchUsers();
      setIsAddParticipantOpen(false);
      setNewParticipant({
        employeeName: '',
        insuranceBookNumber: '',
        insuranceSalary: '5500000',
      });
    } catch (err) {
      console.error('Error saving participant:', err);
      alert('Lỗi kết nối máy chủ khi lưu thông tin bảo hiểm');
    }
  };

  // Offcanvas tạo hồ sơ biến động mới (400px)
  const [isAddFluctuationOpen, setIsAddFluctuationOpen] = useState(false);
  const [selectedEmpNames, setSelectedEmpNames] = useState<string>('');

  const [newFluct, setNewFluct] = useState({
    changeType: 'increase' as 'increase' | 'decrease' | 'adjustment',
    createdDate: todayIso,
    effectiveDate: todayIso,
    newSalary: '5500000',
    description: '',
  });

  const handleSaveFluctuation = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = selectedEmpNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length === 0) {
      alert('Vui lòng chọn ít nhất một nhân viên');
      return;
    }

    let defaultDesc = '';
    const formattedSalary = formatNumberGroup(newFluct.newSalary);
    if (newFluct.changeType === 'increase') {
      defaultDesc = 'Báo tăng mới: Ký hợp đồng lao động chính thức sau thử việc';
    } else if (newFluct.changeType === 'decrease') {
      defaultDesc = 'Báo giảm: Chấm dứt hợp đồng lao động theo nguyện vọng';
    } else {
      defaultDesc = `Điều chỉnh mức lương đóng BHXH lên ${formattedSalary ? formattedSalary + ' đ' : '5.500.000 đ'}`;
    }

    try {
      const res = await fetch('/api/hr/insurance/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNames: names,
          changeType: newFluct.changeType,
          effectiveDate: newFluct.effectiveDate || todayIso,
          newSalary: newFluct.newSalary,
          description: newFluct.description.trim() || defaultDesc,
          status: 'approved',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Không thể lưu hồ sơ biến động BHXH');
        return;
      }
      await Promise.all([fetchFluctuations(), fetchUsers()]);
      setIsAddFluctuationOpen(false);
      setSelectedEmpNames('');
      setNewFluct({
        changeType: 'increase',
        createdDate: todayIso,
        effectiveDate: todayIso,
        newSalary: '5500000',
        description: '',
      });
    } catch (err) {
      console.error('Error saving fluctuation:', err);
      alert('Lỗi kết nối máy chủ khi lưu hồ sơ biến động');
    }
  };

  // Offcanvas tạo hồ sơ chế độ mới (400px)
  const [isAddClaimOpen, setIsAddClaimOpen] = useState(false);
  const [newClaim, setNewClaim] = useState({
    employeeName: '',
    claimType: 'Ốm đau ngắn ngày',
    fromDate: todayIso,
    toDate: todayIso,
    days: 1,
    amount: '850000',
    note: '',
  });

  const calcDaysBetween = (from: string, to: string) => {
    if (!from || !to) return 1;
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return isNaN(diff) ? 1 : diff;
  };

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaim.employeeName.trim()) {
      alert('Vui lòng chọn nhân viên thụ hưởng');
      return;
    }

    try {
      const res = await fetch('/api/hr/insurance/benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: newClaim.employeeName,
          claimType: newClaim.claimType,
          fromDate: newClaim.fromDate || todayIso,
          toDate: newClaim.toDate || todayIso,
          amount: newClaim.amount,
          note: newClaim.note,
          status: 'processing',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Không thể lưu hồ sơ chế độ BHXH');
        return;
      }
      await fetchClaims();
      setIsAddClaimOpen(false);
      setNewClaim({
        employeeName: '',
        claimType: 'Ốm đau ngắn ngày',
        fromDate: todayIso,
        toDate: todayIso,
        days: 1,
        amount: '850000',
        note: '',
      });
    } catch (err) {
      console.error('Error saving benefit claim:', err);
      alert('Lỗi kết nối máy chủ khi lưu hồ sơ chế độ');
    }
  };

  useEffect(() => {
    if (onCountsChange) {
      onCountsChange({
        participants: enrolledUsers.length,
        fluctuations: fluctuations.length,
        claims: claims.length,
      });
    }
  }, [enrolledUsers.length, fluctuations.length, claims.length, onCountsChange]);

  // Lọc danh sách hồ sơ chế độ và trợ cấp
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (searchQueryStep3) {
        const q = searchQueryStep3.toLowerCase().trim();
        const matchName = (c.employeeName || '').toLowerCase().includes(q);
        const matchCode = (c.employeeCode || '').toLowerCase().includes(q);
        const matchId = (c.id || '').toLowerCase().includes(q);
        const matchType = (c.claimType || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId && !matchType) return false;
      }
      if (deptFilterStep3 !== 'all' && !matchDepartment(c.department, deptFilterStep3)) {
        return false;
      }
      if (claimTypeFilterStep3 !== 'all' && c.claimType !== claimTypeFilterStep3) {
        return false;
      }
      if (statusFilterStep3 !== 'all' && c.status !== statusFilterStep3) {
        return false;
      }
      return true;
    });
  }, [claims, searchQueryStep3, deptFilterStep3, claimTypeFilterStep3, statusFilterStep3]);

  const totalPagesStep3 = Math.max(1, Math.ceil(filteredClaims.length / pageSizeStep3));
  const safeCurrentPageStep3 = Math.min(currentPageStep3, totalPagesStep3);
  const paginatedClaims = useMemo(() => {
    const start = (safeCurrentPageStep3 - 1) * pageSizeStep3;
    return filteredClaims.slice(start, start + pageSizeStep3);
  }, [filteredClaims, safeCurrentPageStep3, pageSizeStep3]);

  const saveConfigToServer = async (cfgToSave: typeof config) => {
    try {
      await fetch('/api/hr/insurance/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfgToSave),
      });
      setIsSavedConfig(true);
      setTimeout(() => setIsSavedConfig(false), 2500);
    } catch (err) {
      console.error('Error saving insurance config:', err);
    }
  };

  const handleResetConfig = () => {
    const defaultCfg = {
      baseSalary: 2340000,
      empBhxhRate: 8.0,
      empBhytRate: 1.5,
      empBhtnRate: 1.0,
      compBhxhRate: 17.5,
      compBhytRate: 3.0,
      compBhtnRate: 1.0,
      authorityName: 'Bảo hiểm xã hội Thành phố Hà Nội',
      agencyCode: 'TZ0123A',
      sicknessRate: 75.0,
      maternityRate: 100.0,
      maternityOneTimeMultiplier: 2.0,
      convalescenceDailyRate: 30.0,
      unemploymentRate: 60.0,
      funeralMultiplier: 10.0,
      survivorRateNormal: 50.0,
    };
    setConfig(defaultCfg);
    saveConfigToServer(defaultCfg);
  };

  // Lọc danh sách nhân viên tham gia thực tế
  const filteredUsers = useMemo(() => {
    return enrolledUsers.filter((u) => {
      const matchSearch =
        !searchQuery.trim() ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.insuranceBookNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = deptFilter === 'all' || matchDepartment(u.department, deptFilter);

      return matchSearch && matchDept;
    });
  }, [enrolledUsers, searchQuery, deptFilter]);

  // Phân trang an toàn Bước 1
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, safeCurrentPage, pageSize]);

  const empTotalRate = config.empBhxhRate + config.empBhytRate + config.empBhtnRate;
  const compTotalRate = config.compBhxhRate + config.compBhytRate + config.compBhtnRate;

  const handleExportExcel = () => {
    const headers = [
      'STT',
      'Mã NV',
      'Họ và tên',
      'Chức vụ',
      'Phòng ban',
      'Số sổ BHXH',
      'Lương đóng BHXH',
      `NLĐ đóng (${empTotalRate.toFixed(1)}%)`,
      `DN đóng (${compTotalRate.toFixed(1)}%)`,
    ];
    const rows = filteredUsers.map((u, idx) => {
      const insSalary = Number(u.insuranceSalary || 0);
      const empDeduction = Math.round((insSalary * empTotalRate) / 100);
      const corpDeduction = Math.round((insSalary * compTotalRate) / 100);
      return [
        idx + 1,
        u.code || `NV-${u.id}`,
        `"${(u.name || '').replace(/"/g, '""')}"`,
        `"${(u.position || 'Nhân viên').replace(/"/g, '""')}"`,
        `"${(u.department || 'Văn phòng').replace(/"/g, '""')}"`,
        u.insuranceBookNumber || u.socialInsuranceNumber || 'Chưa cập nhật',
        insSalary,
        empDeduction,
        corpDeduction,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_sach_BHXH_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Lọc danh sách biến động Bước 2
  const filteredFluctuations = useMemo(() => {
    return fluctuations.filter((item) => {
      const matchSearch =
        !searchQueryStep2.trim() ||
        item.employeeName?.toLowerCase().includes(searchQueryStep2.toLowerCase()) ||
        item.employeeCode?.toLowerCase().includes(searchQueryStep2.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQueryStep2.toLowerCase()) ||
        item.department?.toLowerCase().includes(searchQueryStep2.toLowerCase());

      const matchDept = deptFilterStep2 === 'all' || matchDepartment(item.department, deptFilterStep2);
      const matchType = typeFilterStep2 === 'all' || item.changeType === typeFilterStep2;
      const matchStatus = statusFilterStep2 === 'all' || item.status === statusFilterStep2;

      return matchSearch && matchDept && matchType && matchStatus;
    });
  }, [fluctuations, searchQueryStep2, deptFilterStep2, typeFilterStep2, statusFilterStep2]);

  // Phân trang an toàn Bước 2
  const totalPagesStep2 = Math.max(1, Math.ceil(filteredFluctuations.length / pageSizeStep2));
  const safeCurrentPageStep2 = Math.min(Math.max(currentPageStep2, 1), totalPagesStep2);

  const paginatedFluctuations = useMemo(() => {
    const startIndex = (safeCurrentPageStep2 - 1) * pageSizeStep2;
    return filteredFluctuations.slice(startIndex, startIndex + pageSizeStep2);
  }, [filteredFluctuations, safeCurrentPageStep2, pageSizeStep2]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        width: '100%',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
      {/* ============================================================== */}
      {/* BƯỚC 1: DANH SÁCH THAM GIA */}
      {/* ============================================================== */}
      {currentStep === 1 && (
        <div
          style={{
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {/* 1. Bộ lọc, Tìm kiếm và Nút Thao tác trên TableToolbar */}
          <TableToolbar
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            searchPlaceholder="Tìm theo tên, mã NV, số sổ BHXH..."
            searchMinWidth="260px"
            filters={[
              {
                id: 'dept-filter',
                value: deptFilter,
                onChange: (val) => {
                  setDeptFilter(val);
                  setCurrentPage(1);
                },
                minWidth: '200px',
                options: deptOptions,
              },
            ]}
            rightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex"
                  leftIcon={<Download size={13} />}
                  onClick={handleExportExcel}
                >
                  Xuất Excel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  title="Thêm nhân sự đóng BHXH"
                  onClick={() => setIsAddParticipantOpen(true)}
                >
                  <span className="recruitment-btn-label hidden md:inline">
                    Thêm nhân sự đóng BHXH
                  </span>
                </Button>
              </div>
            }
          />

          {/* 2. Bảng dữ liệu chính FullWidthTable */}
          <FullWidthTable
            loading={isLoading}
            loadingText="Đang tải danh sách tham gia bảo hiểm..."
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
                  }}
                >
                  <th className="hidden md:table-cell" style={{ padding: '12px 16px', width: '60px' }}>STT</th>
                  <th style={{ padding: '12px 16px' }}>NHÂN VIÊN</th>
                  <th className="hidden md:table-cell" style={{ padding: '12px 16px' }}>CHỨC VỤ / PHÒNG BAN</th>
                  <th className="hidden md:table-cell" style={{ padding: '12px 16px' }}>SỐ SỔ BHXH</th>
                  <th className="hidden md:table-cell" style={{ padding: '12px 16px', textAlign: 'right' }}>LƯƠNG ĐÓNG BHXH</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>
                    NLĐ ĐÓNG ({empTotalRate.toFixed(1)}%)
                  </th>
                  <th className="hidden md:table-cell" style={{ padding: '12px 16px', textAlign: 'right' }}>
                    DN ĐÓNG ({compTotalRate.toFixed(1)}%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      Chưa có nhân sự tham gia bảo hiểm phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, idx) => {
                    const stt = (safeCurrentPage - 1) * pageSize + idx + 1;
                    const insSalary = Number(u.insuranceSalary || 0);
                    const empDeduction = Math.round((insSalary * empTotalRate) / 100);
                    const corpDeduction = Math.round((insSalary * compTotalRate) / 100);

                    return (
                      <tr
                        key={u.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                        }}
                      >
                        <td className="hidden md:table-cell" style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>{stt}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                          <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>{u.code || `NV-${u.id}`}</div>
                          <div className="flex md:hidden flex-col gap-0.5 mt-1 text-[11px] text-slate-500">
                            <div>
                              <span className="font-semibold text-slate-700">{u.position || 'Nhân viên'}</span>
                              {' • '}
                              <span>{u.department || 'Văn phòng'}</span>
                            </div>
                            <div>
                              <span>Sổ: {u.insuranceBookNumber || u.socialInsuranceNumber || 'Chưa cập nhật'}</span>
                              {' • '}
                              <span className="font-semibold text-slate-700">Lương BH: {formatMoney(insSalary)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '12px 16px' }}>
                          <div style={{ color: '#334155', fontWeight: 500 }}>{u.position || 'Nhân viên'}</div>
                          <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>{u.department || 'Văn phòng'}</div>
                        </td>
                        <td
                          className="hidden md:table-cell"
                          style={{
                            padding: '12px 16px',
                            fontFamily: "'Roboto Condensed', sans-serif",
                            fontWeight: 600,
                            color: '#475569',
                          }}
                        >
                          {u.insuranceBookNumber || u.socialInsuranceNumber || 'Chưa cập nhật'}
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {formatMoney(insSalary)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#b45309', whiteSpace: 'nowrap' }}>
                          <div>{formatMoney(empDeduction)}</div>
                          <div className="md:hidden text-[11px] font-semibold text-emerald-700 mt-0.5">
                            DN: {formatMoney(corpDeduction)}
                          </div>
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                          {formatMoney(corpDeduction)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>

          {/* 3. Component Pagination ghim ở chân bảng */}
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 15, 20, 50]}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* BƯỚC 2: BIẾN ĐỘNG */}
      {/* ============================================================== */}
      {currentStep === 2 && (
        <div
          style={{
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {/* 1. Bộ lọc, Tìm kiếm và Nút Thao tác trên TableToolbar */}
          <TableToolbar
            searchValue={searchQueryStep2}
            onSearchChange={(val) => {
              setSearchQueryStep2(val);
              setCurrentPageStep2(1);
            }}
            searchPlaceholder="Tìm theo tên, mã NV, nội dung biến động..."
            searchMinWidth="260px"
            filters={[
              {
                id: 'dept-filter-step2',
                value: deptFilterStep2,
                onChange: (val) => {
                  setDeptFilterStep2(val);
                  setCurrentPageStep2(1);
                },
                minWidth: '200px',
                options: deptOptions,
              },
              {
                id: 'type-filter-step2',
                value: typeFilterStep2,
                onChange: (val) => {
                  setTypeFilterStep2(val);
                  setCurrentPageStep2(1);
                },
                minWidth: '190px',
                options: [
                  { value: 'all', label: 'Tất cả loại biến động' },
                  { value: 'increase', label: 'Biến động tăng' },
                  { value: 'decrease', label: 'Biến động giảm' },
                  { value: 'adjustment', label: 'Điều chỉnh thu nhập' },
                ],
              },
              {
                id: 'status-filter-step2',
                value: statusFilterStep2,
                onChange: (val) => {
                  setStatusFilterStep2(val);
                  setCurrentPageStep2(1);
                },
                minWidth: '180px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'approved', label: 'Cơ quan BHXH đã duyệt' },
                  { value: 'processing', label: 'Đang xử lý hồ sơ' },
                ],
              },
            ]}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                title="Báo biến động mới"
                onClick={() => setIsAddFluctuationOpen(true)}
              >
                <span className="recruitment-btn-label hidden md:inline">Báo biến động mới</span>
              </Button>
            }
          />

          {/* 2. Bảng dữ liệu chính FullWidthTable */}
          <FullWidthTable
            loading={isLoadingFluctuations}
            loadingText="Đang tải danh sách biến động bảo hiểm..."
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
                  }}
                >
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '60px' }}>STT</th>
                  <th style={{ padding: '8px 14px', width: '28%' }}>NHÂN VIÊN</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px' }}>NỘI DUNG BIẾN ĐỘNG</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '140px' }}>NGÀY HIỆU LỰC</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '155px', textAlign: 'center' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFluctuations.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Không tìm thấy hồ sơ biến động phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  paginatedFluctuations.map((item, idx) => {
                    const stt = (safeCurrentPageStep2 - 1) * pageSizeStep2 + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                        }}
                      >
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle', color: '#94a3b8', fontWeight: 600 }}>
                          {stt}
                        </td>
                        <td style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                              {item.employeeName}
                            </span>
                            <span className="md:hidden shrink-0 scale-90 origin-left">
                              <Badge variant={item.status === 'approved' ? 'success' : 'info'}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {item.status === 'approved' ? <CheckCircleFill size={10} /> : <ClockFill size={10} />}
                                  {item.statusText}
                                </span>
                              </Badge>
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                            {item.employeeCode} · {item.department}
                          </div>
                          <div className="flex md:hidden flex-col gap-0.5 mt-1 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-700">{item.changeTypeLabel}</span>
                              {item.effectiveDate && (
                                <>
                                  <span>•</span>
                                  <span>Hiệu lực: {item.effectiveDate}</span>
                                </>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-slate-600 line-clamp-2">{item.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <Badge
                              variant={
                                item.changeType === 'increase'
                                  ? 'success'
                                  : item.changeType === 'decrease'
                                    ? 'danger'
                                    : 'info'
                              }
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {item.changeType === 'increase' && <ArrowUpRight size={11} />}
                                {item.changeType === 'decrease' && <ArrowDownRight size={11} />}
                                {item.changeType === 'adjustment' && <ArrowRepeat size={11} />}
                                {item.changeTypeLabel}
                              </span>
                            </Badge>
                          </div>
                          <div style={{ color: '#475569', fontWeight: 400, fontSize: '0.8125rem', lineHeight: 1.35 }}>
                            {item.description}
                          </div>
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle', color: '#334155', fontWeight: 500 }}>
                          {item.effectiveDate}
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <Badge variant={item.status === 'approved' ? 'success' : 'info'}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {item.status === 'approved' ? <CheckCircleFill size={10} /> : <ClockFill size={10} />}
                              {item.statusText}
                            </span>
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>

          {/* 3. Component Pagination ghim ở chân bảng */}
          <Pagination
            currentPage={safeCurrentPageStep2}
            totalItems={filteredFluctuations.length}
            pageSize={pageSizeStep2}
            onPageChange={setCurrentPageStep2}
            onPageSizeChange={(newSize) => {
              setPageSizeStep2(newSize);
              setCurrentPageStep2(1);
            }}
            pageSizeOptions={[10, 15, 20, 50]}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* BƯỚC 3: CHẾ ĐỘ VÀ TRỢ CẤP */}
      {/* ============================================================== */}
      {currentStep === 3 && (
        <div
          style={{
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            height: '100%',
          }}
        >
          {/* 1. Bộ lọc, Tìm kiếm và Nút Tạo hồ sơ mới trên TableToolbar */}
          <TableToolbar
            searchValue={searchQueryStep3}
            onSearchChange={(val) => {
              setSearchQueryStep3(val);
              setCurrentPageStep3(1);
            }}
            searchPlaceholder="Tìm theo tên, mã NV, mã hồ sơ, chế độ hưởng..."
            searchMinWidth="260px"
            filters={[
              {
                id: 'dept-filter-step3',
                value: deptFilterStep3,
                onChange: (val) => {
                  setDeptFilterStep3(val);
                  setCurrentPageStep3(1);
                },
                minWidth: '200px',
                options: deptOptions,
              },
              {
                id: 'claim-type-filter-step3',
                value: claimTypeFilterStep3,
                onChange: (val) => {
                  setClaimTypeFilterStep3(val);
                  setCurrentPageStep3(1);
                },
                minWidth: '190px',
                options: [
                  { value: 'all', label: 'Tất cả chế độ hưởng' },
                  { value: 'Ốm đau ngắn ngày', label: 'Ốm đau ngắn ngày' },
                  { value: 'Thai sản (Sinh con)', label: 'Thai sản (Sinh con)' },
                  { value: 'Dưỡng sức sau ốm đau', label: 'Dưỡng sức sau ốm đau' },
                ],
              },
              {
                id: 'status-filter-step3',
                value: statusFilterStep3,
                onChange: (val) => {
                  setStatusFilterStep3(val);
                  setCurrentPageStep3(1);
                },
                minWidth: '180px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'approved', label: 'Đã thanh toán / Chi trả' },
                  { value: 'processing', label: 'Đang gửi hồ sơ điện tử' },
                ],
              },
            ]}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={16} />}
                title="Tạo hồ sơ mới"
                onClick={() => setIsAddClaimOpen(true)}
              >
                <span className="recruitment-btn-label hidden md:inline">Tạo hồ sơ mới</span>
              </Button>
            }
          />

          {/* 2. Bảng dữ liệu chính FullWidthTable */}
          <FullWidthTable
            loading={isLoadingClaims}
            loadingText="Đang tải danh sách chế độ và trợ cấp..."
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
                  }}
                >
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '50px' }}>STT</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '130px' }}>MÃ HỒ SƠ</th>
                  <th style={{ padding: '8px 14px', width: '28%' }}>NHÂN VIÊN THỤ HƯỞNG</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px' }}>THÔNG TIN CHI TIẾT</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '100px', textAlign: 'center' }}>SỐ NGÀY</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '160px', textAlign: 'right' }}>TRỢ CẤP PHÊ DUYỆT</th>
                  <th className="hidden md:table-cell" style={{ padding: '8px 14px', width: '160px', textAlign: 'center' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Không tìm thấy hồ sơ chế độ hoặc trợ cấp phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  paginatedClaims.map((c, idx) => {
                    const stt = (safeCurrentPageStep3 - 1) * pageSizeStep3 + idx + 1;
                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                        }}
                      >
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle', color: '#94a3b8', fontWeight: 600 }}>
                          {stt}
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle', fontWeight: 700, color: '#7c3aed' }}>
                          {c.id}
                        </td>
                        <td style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                              {c.employeeName}
                            </span>
                            <span className="md:hidden shrink-0 scale-90 origin-left">
                              <Badge variant={c.status === 'approved' ? 'success' : 'info'}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {c.status === 'approved' ? <CheckCircleFill size={10} /> : <ClockFill size={10} />}
                                  {c.statusText}
                                </span>
                              </Badge>
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                            {c.employeeCode} · {c.department}
                          </div>
                          <div className="flex md:hidden flex-col gap-0.5 mt-1 text-[11px] text-slate-500">
                            <div>
                              <span className="font-mono font-bold text-purple-600">{c.id}</span>
                              {' • '}
                              <span className="font-semibold text-slate-700">{c.claimType}</span>
                              {' '}
                              <span>({c.days} ngày)</span>
                            </div>
                            <div>
                              <span>{c.fromDate} – {c.toDate}</span>
                              {' • '}
                              <strong className="text-emerald-600">{formatMoney(c.amount)}</strong>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.25 }}>{c.claimType}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {c.fromDate} – {c.toDate}
                          </div>
                        </td>
                        <td
                          className="hidden md:table-cell"
                          style={{
                            padding: '7px 14px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          {c.days} ngày
                        </td>
                        <td
                          className="hidden md:table-cell"
                          style={{
                            padding: '7px 14px',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#16a34a',
                          }}
                        >
                          {formatMoney(c.amount)}
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '7px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <Badge variant={c.status === 'approved' ? 'success' : 'info'}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {c.status === 'approved' ? <CheckCircleFill size={10} /> : <ClockFill size={10} />}
                              {c.statusText}
                            </span>
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>

          {/* 3. Phân trang dưới cùng */}
          <Pagination
            currentPage={safeCurrentPageStep3}
            totalItems={filteredClaims.length}
            pageSize={pageSizeStep3}
            onPageChange={setCurrentPageStep3}
            onPageSizeChange={(newSize) => {
              setPageSizeStep3(newSize);
              setCurrentPageStep3(1);
            }}
            pageSizeOptions={[10, 15, 20, 50]}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* BƯỚC 4: THIẾT LẬP */}
      {/* ============================================================== */}
      {currentStep === 4 && (
        <div
          className="custom-scrollbar hr-insurance-settings-step"
          style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            padding: '20px 24px',
            backgroundColor: 'var(--bg-surface-2)',
            fontFamily: "'Roboto Condensed', sans-serif",
          }}
        >
          {/* DUY NHẤT 1 THẺ CARD LỚN CHỨA TOÀN BỘ NỘI DUNG */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 1. Header thẻ card: Tiêu đề và Nút thao tác */}
            <div
              className="hr-insurance-settings-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div className="w-full md:w-auto">
                <div
                  className="hr-insurance-settings-badge-row"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}
                >
                  <Badge variant="success">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <ShieldCheck size={11} /> Hiệu lực từ 01/07/2024
                    </span>
                  </Badge>
                  <span className="truncate" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Nghị định 73/2024/NĐ-CP và Luật BHXH
                  </span>
                </div>
                <h3
                  className="hr-insurance-settings-title"
                  style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}
                >
                  Cấu hình tham số và Tỷ lệ trích nộp bảo hiểm
                </h3>
                <p
                  className="hidden md:block"
                  style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}
                >
                  Thiết lập quy định mức đóng theo văn bản luật hiện hành và thông tin cơ quan bảo hiểm quản lý
                </p>
              </div>

              <div
                className="hr-insurance-settings-actions w-full md:w-auto"
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 md:flex-initial justify-center"
                  leftIcon={<ArrowCounterclockwise size={14} />}
                  onClick={handleResetConfig}
                >
                  Khôi phục chuẩn luật
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 md:flex-initial justify-center"
                  leftIcon={isSavedConfig ? <CheckCircleFill size={15} /> : <Save size={15} />}
                  onClick={() => saveConfigToServer(config)}
                >
                  {isSavedConfig ? 'Đã lưu cấu hình!' : 'Lưu cấu hình thiết lập'}
                </Button>
              </div>
            </div>

            {/* Banner phản hồi khi lưu thành công */}
            {isSavedConfig && (
              <div
                className="hr-insurance-settings-section-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 24px',
                  backgroundColor: '#f0fdf4',
                  borderBottom: '1px solid #86efac',
                  color: '#166534',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircleFill size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>
                  Đã lưu và cập nhật cấu hình tham số bảo hiểm thành công. Mọi quy tắc tính nộp sẽ áp dụng vào kỳ tính
                  bảo hiểm hiện hành.
                </span>
              </div>
            )}

            {/* 2. Mục 1: Bảng cơ cấu tỷ lệ trích nộp bảo hiểm (%) */}
            <div
              className="hr-insurance-settings-section-bar"
              style={{
                padding: '12px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                  1. Bảng cơ cấu tỷ lệ trích nộp bảo hiểm (%)
                </h4>
              </div>
              <div
                className="hr-insurance-summary-pills w-full md:w-auto"
                style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}
              >
                <span
                  className="hr-insurance-summary-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    fontSize: '0.75rem',
                    color: '#166534',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="hidden md:inline" style={{ color: '#475569', fontWeight: 500 }}>Doanh nghiệp đóng:</span>
                  <span className="md:hidden" style={{ color: '#475569', fontWeight: 500 }}>DN:</span>
                  <strong style={{ fontWeight: 800, color: '#15803d' }}>
                    {compTotalRate.toFixed(1)}%
                  </strong>
                </span>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8125rem' }}>+</span>
                <span
                  className="hr-insurance-summary-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    fontSize: '0.75rem',
                    color: '#1e40af',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="hidden md:inline" style={{ color: '#475569', fontWeight: 500 }}>Người lao động đóng:</span>
                  <span className="md:hidden" style={{ color: '#475569', fontWeight: 500 }}>NLĐ:</span>
                  <strong style={{ fontWeight: 800, color: '#1d4ed8' }}>
                    {empTotalRate.toFixed(1)}%
                  </strong>
                </span>
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8125rem' }}>=</span>
                <span
                  className="hr-insurance-summary-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="hidden md:inline">Tổng tỷ lệ trích nộp:</span>
                  <span className="md:hidden">Tổng:</span>
                  <strong style={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                    {(compTotalRate + empTotalRate).toFixed(1)}%
                  </strong>
                </span>
              </div>
            </div>

            {/* Table Matrix */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="hr-insurance-config-table hr-insurance-rate-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <th className="col-ins-item" style={{ padding: '10px 24px', width: '28%' }}>KHOẢN MỤC BẢO HIỂM</th>
                    <th className="col-ins-rate" style={{ padding: '10px 16px', width: '18%' }}>
                      <span className="hidden md:inline">DOANH NGHIỆP ĐÓNG (%)</span>
                      <span className="md:hidden">DN ĐÓNG (%)</span>
                    </th>
                    <th className="col-ins-rate" style={{ padding: '10px 16px', width: '18%' }}>
                      <span className="hidden md:inline">NGƯỜI LAO ĐỘNG ĐÓNG (%)</span>
                      <span className="md:hidden">NLĐ ĐÓNG (%)</span>
                    </th>
                    <th className="hidden md:table-cell" style={{ padding: '10px 16px', width: '16%', textAlign: 'center' }}>TỔNG TỶ LỆ (%)</th>
                    <th className="hidden md:table-cell" style={{ padding: '10px 24px' }}>CĂN CỨ PHÁP LÝ VÀ QUY ĐỊNH</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: BHXH */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="col-ins-item" style={{ padding: '11px 24px' }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Bảo hiểm xã hội (BHXH)</span>
                        <span className="md:hidden shrink-0 scale-90 origin-left">
                          <Badge variant="success">{(config.compBhxhRate + config.empBhxhRate).toFixed(1)}%</Badge>
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Gồm: Hưu trí, tử tuất, ốm đau, thai sản, TNLĐ-BNN
                      </div>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '11px 16px' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '110px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={config.compBhxhRate}
                          onChange={(e) => setConfig({ ...config, compBhxhRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#16a34a',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '11px 16px' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '110px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={config.empBhxhRate}
                          onChange={(e) => setConfig({ ...config, empBhxhRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <Badge variant="success">{(config.compBhxhRate + config.empBhxhRate).toFixed(1)}%</Badge>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#64748b', fontSize: '0.75rem' }}>
                      Luật BHXH 2024 VÀ Nghị định 58/2020/NĐ-CP (DN 14% HT + 3% ÔĐ-TS + 0.5% TNLĐ)
                    </td>
                  </tr>

                  {/* Row 2: BHYT */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfcfd' }}>
                    <td className="col-ins-item" style={{ padding: '11px 24px' }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Bảo hiểm y tế (BHYT)</span>
                        <span className="md:hidden shrink-0 scale-90 origin-left">
                          <Badge variant="info">{(config.compBhytRate + config.empBhytRate).toFixed(1)}%</Badge>
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>Khám chữa bệnh BHYT và dịch vụ y tế</div>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '11px 16px' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '110px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={config.compBhytRate}
                          onChange={(e) => setConfig({ ...config, compBhytRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#16a34a',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '11px 16px' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '110px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={config.empBhytRate}
                          onChange={(e) => setConfig({ ...config, empBhytRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <Badge variant="info">{(config.compBhytRate + config.empBhytRate).toFixed(1)}%</Badge>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#64748b', fontSize: '0.75rem' }}>
                      Luật Bảo hiểm y tế hiện hành (DN trích 3.0%, NLĐ đóng 1.5%)
                    </td>
                  </tr>

                  {/* Row 3: BHTN */}
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td className="col-ins-item" style={{ padding: '11px 24px' }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                          Bảo hiểm thất nghiệp (BHTN)
                        </span>
                        <span className="md:hidden shrink-0 scale-90 origin-left">
                          <Badge variant="brand">{(config.compBhtnRate + config.empBhtnRate).toFixed(1)}%</Badge>
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Trợ cấp thất nghiệp và hỗ trợ học nghề
                      </div>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '11px 16px' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '110px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={config.compBhtnRate}
                          onChange={(e) => setConfig({ ...config, compBhtnRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#16a34a',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '11px 16px' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '110px' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={config.empBhtnRate}
                          onChange={(e) => setConfig({ ...config, empBhtnRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            outline: 'none',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <Badge variant="brand">{(config.compBhtnRate + config.empBhtnRate).toFixed(1)}%</Badge>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#64748b', fontSize: '0.75rem' }}>
                      Luật Việc làm số 38/2013/QH13 (DN trích 1.0%, NLĐ đóng 1.0%)
                    </td>
                  </tr>

                  {/* Total Summary Row */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td className="col-ins-item" style={{ padding: '13px 24px', color: '#0f172a', fontSize: '0.9375rem' }}>
                      <span className="hidden md:inline">TỔNG CỘNG TỶ LỆ TRÍCH NỘP</span>
                      <span className="md:hidden inline-flex items-center gap-1.5 flex-wrap text-xs">
                        <span>TỔNG CỘNG</span>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          {(
                            config.compBhxhRate +
                            config.compBhytRate +
                            config.compBhtnRate +
                            config.empBhxhRate +
                            config.empBhytRate +
                            config.empBhtnRate
                          ).toFixed(1)}%
                        </span>
                      </span>
                    </td>
                    <td className="col-ins-rate" style={{ padding: '13px 16px', color: '#15803d', fontSize: '0.9375rem' }}>
                      {(config.compBhxhRate + config.compBhytRate + config.compBhtnRate).toFixed(1)}%
                    </td>
                    <td className="col-ins-rate" style={{ padding: '13px 16px', color: '#1d4ed8', fontSize: '0.9375rem' }}>
                      {(config.empBhxhRate + config.empBhytRate + config.empBhtnRate).toFixed(1)}%
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '5px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.9375rem',
                        }}
                      >
                        {(
                          config.compBhxhRate +
                          config.compBhytRate +
                          config.compBhtnRate +
                          config.empBhxhRate +
                          config.empBhytRate +
                          config.empBhtnRate
                        ).toFixed(1)}
                        %
                      </span>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '13px 24px', color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>
                      Mức đóng tiêu chuẩn cho HĐLĐ từ 1 tháng trở lên
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Visual Ratio Indicator */}
            {(() => {
              const totalRate = compTotalRate + empTotalRate;
              const compSharePct = totalRate > 0 ? (compTotalRate / totalRate) * 100 : 67.2;
              const empSharePct = totalRate > 0 ? (empTotalRate / totalRate) * 100 : 32.8;
              return (
                <div
                  className="hr-insurance-settings-section-bar"
                  style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fcfcfd' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ color: '#15803d' }}>
                      <span className="hidden md:inline">
                        Doanh nghiệp chi trả: {compTotalRate.toFixed(1)}% (Chiếm {compSharePct.toFixed(1)}% tổng mức trích nộp)
                      </span>
                      <span className="md:hidden">
                        DN chi trả: {compTotalRate.toFixed(1)}% ({compSharePct.toFixed(1)}%)
                      </span>
                    </span>
                    <span style={{ color: '#1d4ed8' }}>
                      <span className="hidden md:inline">
                        Khấu trừ từ lương người lao động: {empTotalRate.toFixed(1)}% (Chiếm {empSharePct.toFixed(1)}% tổng mức trích nộp)
                      </span>
                      <span className="md:hidden">
                        NLĐ đóng: {empTotalRate.toFixed(1)}% ({empSharePct.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: '#e2e8f0',
                      display: 'flex',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{ width: `${compSharePct.toFixed(1)}%`, backgroundColor: '#16a34a', height: '100%' }}
                      title={`Doanh nghiệp đóng ${compTotalRate.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${empSharePct.toFixed(1)}%`, backgroundColor: '#3b82f6', height: '100%' }}
                      title={`Người lao động đóng ${empTotalRate.toFixed(1)}%`}
                    />
                  </div>
                </div>
              );
            })()}

            {/* 3. Mục 2: CẤU HÌNH ĐỊNH MỨC TRỢ CẤP (THEO LUẬT ĐỊNH) */}
            <div
              className="hr-insurance-settings-section-bar"
              style={{
                padding: '12px 24px',
                borderTop: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HeartPulse size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                  2. Cấu hình định mức trợ cấp bảo hiểm xã hội (Theo quy định Luật BHXH)
                </h4>
              </div>

              {/* Lương cơ sở tham chiếu */}
              <div
                className="w-full md:w-auto justify-between md:justify-start"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  <span className="hidden md:inline">Lương cơ sở tham chiếu (Nghị định 73/2024):</span>
                  <span className="md:hidden">Lương cơ sở (NĐ 73/2024):</span>
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', width: '135px' }}>
                  <input
                    type="text"
                    value={formatNumberGroup(config.baseSalary)}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                      setConfig({ ...config, baseSalary: num });
                    }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      borderRadius: '5px 0 0 5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      outline: 'none',
                      textAlign: 'right',
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}
                  />
                  <span
                    style={{
                      padding: '4px 6px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderLeft: 'none',
                      borderRadius: '0 5px 5px 0',
                      fontSize: '0.6875rem',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    đ
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng định mức trợ cấp theo luật định */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table
                className="hr-insurance-config-table hr-insurance-benefit-table"
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.8125rem',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#475569',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <th className="col-benefit-item" style={{ padding: '10px 24px', width: '28%' }}>CHẾ ĐỘ VÀ KHOẢN MỤC TRỢ CẤP</th>
                    <th className="col-benefit-rate" style={{ padding: '10px 16px', width: '12%', textAlign: 'center' }}>TỶ LỆ</th>
                    <th className="hidden md:table-cell" style={{ padding: '10px 20px', width: '32%' }}>MỨC HƯỞNG QUY ĐỔI HIỆN HÀNH</th>
                    <th className="hidden md:table-cell" style={{ padding: '10px 24px', width: '28%' }}>ĐIỀU KIỆN VÀ THỜI HẠN</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Ốm đau */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp Ốm đau thông thường
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Bản thân ốm đau hoặc nghỉ chăm sóc con ốm
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-sky-600">{config.sicknessRate}% lương ngày đóng BHXH</span>
                        <span className="text-slate-500"> • Tối đa 30–60 ngày/năm</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="0.5"
                          value={config.sicknessRate}
                          onChange={(e) => setConfig({ ...config, sicknessRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#0284c7',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.8125rem' }}>
                        {config.sicknessRate}% lương ngày đóng BHXH
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        = (Lương BHXH / 24) × {config.sicknessRate}% × Số ngày
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Tối đa 30 – 60 ngày/năm (theo ĐKLĐ)
                    </td>
                  </tr>

                  {/* Row 2: Thai sản sinh con */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfcfd' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp Thai sản khi sinh con
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Lao động nữ sinh con / Nam nghỉ khi vợ sinh
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-emerald-600">{config.maternityRate}% lương bình quân × 6 tháng</span>
                        <span className="text-slate-500"> • Nghỉ 06 tháng</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="1"
                          value={config.maternityRate}
                          onChange={(e) => setConfig({ ...config, maternityRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#16a34a',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.8125rem' }}>
                        {config.maternityRate}% lương bình quân × 6 tháng
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Tính trên bình quân lương 6 tháng trước sinh
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Nghỉ 06 tháng (thêm 1 tháng/con thứ 2 trở lên)
                    </td>
                  </tr>

                  {/* Row 3: Trợ cấp 1 lần khi sinh con */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp một lần khi sinh con
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Tiền tã lót/nuôi con (mỗi con sinh ra hoặc con nuôi)
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-purple-600">{formatMoney(config.baseSalary * config.maternityOneTimeMultiplier)} / con</span>
                        <span className="text-slate-500"> ({config.maternityOneTimeMultiplier} × Lương cơ sở)</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="0.5"
                          value={config.maternityOneTimeMultiplier}
                          onChange={(e) =>
                            setConfig({ ...config, maternityOneTimeMultiplier: parseFloat(e.target.value) || 0 })
                          }
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#7c3aed',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          lần
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <Badge variant="brand">
                        {formatMoney(config.baseSalary * config.maternityOneTimeMultiplier)} / con
                      </Badge>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px' }}>
                        = {config.maternityOneTimeMultiplier} × {formatMoney(config.baseSalary)} (Lương cơ sở)
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Chi trả 1 lần / mỗi con sinh ra
                    </td>
                  </tr>

                  {/* Row 4: Dưỡng sức phục hồi sức khỏe */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfcfd' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp Dưỡng sức và Phục hồi sức khỏe
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Sau ốm đau, thai sản, điều trị tai nạn lao động
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-amber-700">{formatMoney(config.baseSalary * (config.convalescenceDailyRate / 100))} / ngày</span>
                        <span className="text-slate-500"> • Nghỉ 5–10 ngày/đợt</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="1"
                          value={config.convalescenceDailyRate}
                          onChange={(e) =>
                            setConfig({ ...config, convalescenceDailyRate: parseFloat(e.target.value) || 0 })
                          }
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#b45309',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <Badge variant="warning">
                        {formatMoney(config.baseSalary * (config.convalescenceDailyRate / 100))} / ngày
                      </Badge>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px' }}>
                        = {config.convalescenceDailyRate}% × {formatMoney(config.baseSalary)} (Lương cơ sở)
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Nghỉ từ 05 đến 10 ngày / đợt dưỡng sức
                    </td>
                  </tr>

                  {/* Row 5: Trợ cấp thất nghiệp */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp Thất nghiệp hàng tháng
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Chi trả từ Quỹ BHTN khi chấm dứt hợp đồng lao động
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-blue-600">{config.unemploymentRate}% lương bình quân BHTN</span>
                        <span className="text-slate-500"> • Hưởng 3–12 tháng</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="1"
                          value={config.unemploymentRate}
                          onChange={(e) => setConfig({ ...config, unemploymentRate: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.8125rem' }}>
                        {config.unemploymentRate}% lương bình quân đóng BHTN
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Tối đa 5 lần lương tối thiểu vùng (24.800.000 đ)
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Hưởng từ 03 đến 12 tháng (đóng đủ 12-144 tháng)
                    </td>
                  </tr>

                  {/* Row 6: Mai táng phí */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfcfd' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp Mai táng phí (Chế độ tử tuất)
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Người lo mai táng khi người lao động qua đời
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-red-700">{formatMoney(config.baseSalary * config.funeralMultiplier)}</span>
                        <span className="text-slate-500"> ({config.funeralMultiplier} × Lương cơ sở • 1 lần)</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="1"
                          value={config.funeralMultiplier}
                          onChange={(e) => setConfig({ ...config, funeralMultiplier: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#b91c1c',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          lần
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <Badge variant="danger">{formatMoney(config.baseSalary * config.funeralMultiplier)}</Badge>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px' }}>
                        = {config.funeralMultiplier} × {formatMoney(config.baseSalary)} (Lương cơ sở)
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Chi trả 1 lần cho người lo mai táng
                    </td>
                  </tr>

                  {/* Row 7: Tuất hàng tháng */}
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    <td className="col-benefit-item" style={{ padding: '11px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        Trợ cấp Tuất hàng tháng cho thân nhân
                      </div>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                        Con dưới 18 tuổi, vợ/chồng, cha mẹ hết tuổi lao động
                      </div>
                      <div className="md:hidden mt-1 text-[11px] leading-snug">
                        <span className="font-bold text-purple-700">
                          {formatMoney(config.baseSalary * (config.survivorRateNormal / 100))}/tháng/người
                        </span>
                        <span className="text-slate-500"> • Tối đa 04 thân nhân</span>
                      </div>
                    </td>
                    <td className="col-benefit-rate" style={{ padding: '11px 16px', textAlign: 'center' }}>
                      <div className="hr-insurance-rate-input-group" style={{ display: 'inline-flex', alignItems: 'center', width: '95px' }}>
                        <input
                          type="number"
                          step="1"
                          value={config.survivorRateNormal}
                          onChange={(e) => setConfig({ ...config, survivorRateNormal: parseFloat(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '5px 0 0 5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            color: '#6b21a8',
                            outline: 'none',
                            textAlign: 'right',
                          }}
                        />
                        <span
                          style={{
                            padding: '6px 7px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderLeft: 'none',
                            borderRadius: '0 5px 5px 0',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          %
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 20px' }}>
                      <Badge variant="brand">
                        {formatMoney(config.baseSalary * (config.survivorRateNormal / 100))} / tháng / người
                      </Badge>
                      <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px' }}>
                        Không người trực tiếp nuôi: 70% ({formatMoney(config.baseSalary * 0.7)})
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ padding: '11px 24px', color: '#334155', fontSize: '0.75rem' }}>
                      Tối đa không quá 04 thân nhân đủ điều kiện
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* OFFCANVAS THÊM NHÂN SỰ ĐÓNG BHXH (400px) */}
      {/* ============================================================== */}
      <Offcanvas
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
        title="Thêm nhân sự đóng BHXH"
        description="Cập nhật sổ BHXH và mức lương tham gia bảo hiểm"
        width="400px"
        confirmText="Lưu thông tin"
        cancelText="Hủy bỏ"
        confirmForm="participant-offcanvas-form"
        onCancel={() => setIsAddParticipantOpen(false)}
      >
        <form
          id="participant-offcanvas-form"
          onSubmit={handleSaveParticipant}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <EmployeeSelect
            label="Nhân viên tham gia"
            required
            multiple={false}
            value={newParticipant.employeeName}
            onChange={(val) => setNewParticipant({ ...newParticipant, employeeName: val })}
            placeholder="Chọn nhân viên..."
            searchPlaceholder="Tìm tên nhân viên, phòng ban..."
          />

          <Input
            label="Số sổ BHXH"
            placeholder="Nhập mã số sổ BHXH (10 chữ số)..."
            value={newParticipant.insuranceBookNumber}
            onChange={(e) => setNewParticipant({ ...newParticipant, insuranceBookNumber: e.target.value })}
          />

          <Input
            label="Mức lương đóng BHXH (đồng/tháng)"
            required
            placeholder="5.500.000"
            value={formatNumberGroup(newParticipant.insuranceSalary)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setNewParticipant({ ...newParticipant, insuranceSalary: raw });
            }}
          />
        </form>
      </Offcanvas>

      {/* ============================================================== */}
      {/* OFFCANVAS TẠO HỒ SƠ BIẾN ĐỘNG MỚI (400px) */}
      {/* ============================================================== */}
      <Offcanvas
        isOpen={isAddFluctuationOpen}
        onClose={() => setIsAddFluctuationOpen(false)}
        title="Tạo hồ sơ biến động mới"
        description="Khai báo tăng, giảm lao động hoặc điều chỉnh mức đóng BHXH"
        width="400px"
        confirmText="Lưu hồ sơ"
        cancelText="Hủy bỏ"
        confirmForm="fluctuation-offcanvas-form"
        onCancel={() => setIsAddFluctuationOpen(false)}
      >
        <form
          id="fluctuation-offcanvas-form"
          onSubmit={handleSaveFluctuation}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <EmployeeSelect
            label="Nhân viên áp dụng"
            required
            multiple={true}
            value={selectedEmpNames}
            onChange={(val) => setSelectedEmpNames(val)}
            placeholder="Chọn nhân viên..."
            searchPlaceholder="Tìm tên nhân viên, phòng ban..."
          />

          <Select
            label="Loại biến động"
            required
            value={newFluct.changeType}
            onChange={(e) => setNewFluct({ ...newFluct, changeType: e.target.value as any })}
            options={[
              { value: 'increase', label: 'Biến động tăng' },
              { value: 'decrease', label: 'Biến động giảm' },
              { value: 'adjustment', label: 'Điều chỉnh thu nhập' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <DatePicker
              label="Ngày tạo"
              required
              value={newFluct.createdDate}
              onChange={(val) => setNewFluct({ ...newFluct, createdDate: val })}
              clearable={false}
            />
            <DatePicker
              label="Ngày hiệu lực"
              required
              value={newFluct.effectiveDate}
              onChange={(val) => setNewFluct({ ...newFluct, effectiveDate: val })}
              clearable={false}
            />
          </div>

          {(newFluct.changeType === 'increase' || newFluct.changeType === 'adjustment') && (
            <Input
              label="Mức lương đóng BHXH mới (đồng/tháng)"
              placeholder="5.500.000"
              value={formatNumberGroup(newFluct.newSalary)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setNewFluct({ ...newFluct, newSalary: raw });
              }}
            />
          )}

          <Input
            label="Cơ quan BHXH quản lý"
            readOnly
            value={config.authorityName}
          />

          <div className="form-group">
            <label className="form-label">
              Nội dung chi tiết biến động <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Nhập lý do, căn cứ quyết định hoặc số hiệu HĐLĐ..."
              value={newFluct.description}
              onChange={(e) => setNewFluct({ ...newFluct, description: e.target.value })}
              style={{
                height: 'auto',
                lineHeight: 1.5,
                padding: '8px 12px',
                resize: 'vertical',
                minHeight: '90px',
              }}
            />
          </div>
        </form>
      </Offcanvas>

      {/* ============================================================== */}
      {/* OFFCANVAS TẠO HỒ SƠ CHẾ ĐỘ VÀ TRỢ CẤP MỚI (400px) */}
      {/* ============================================================== */}
      <Offcanvas
        isOpen={isAddClaimOpen}
        onClose={() => setIsAddClaimOpen(false)}
        title="Tạo hồ sơ chế độ mới"
        description="Đề nghị hưởng chế độ ốm đau, thai sản, dưỡng sức (Mẫu 01B-HSB)"
        width="400px"
        confirmText="Lưu hồ sơ"
        cancelText="Hủy bỏ"
        confirmForm="claim-offcanvas-form"
        onCancel={() => setIsAddClaimOpen(false)}
      >
        <form
          id="claim-offcanvas-form"
          onSubmit={handleSaveClaim}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <EmployeeSelect
            label="Nhân viên thụ hưởng"
            required
            multiple={false}
            value={newClaim.employeeName}
            onChange={(val) => setNewClaim({ ...newClaim, employeeName: val })}
            placeholder="Chọn nhân viên..."
            searchPlaceholder="Tìm tên nhân viên, phòng ban..."
          />

          <Select
            label="Chế độ hưởng bảo hiểm"
            required
            value={newClaim.claimType}
            onChange={(e) => setNewClaim({ ...newClaim, claimType: e.target.value })}
            options={[
              { value: 'Ốm đau ngắn ngày', label: 'Ốm đau ngắn ngày' },
              { value: 'Thai sản (Sinh con)', label: 'Thai sản (Sinh con)' },
              { value: 'Dưỡng sức sau ốm đau', label: 'Dưỡng sức sau ốm đau' },
              { value: 'Tai nạn lao động / BNN', label: 'Tai nạn lao động / BNN' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <DatePicker
              label="Từ ngày"
              required
              value={newClaim.fromDate}
              onChange={(val) => {
                const newDays = calcDaysBetween(val, newClaim.toDate);
                setNewClaim({ ...newClaim, fromDate: val, days: newDays });
              }}
              clearable={false}
            />
            <DatePicker
              label="Đến ngày"
              required
              value={newClaim.toDate}
              onChange={(val) => {
                const newDays = calcDaysBetween(newClaim.fromDate, val);
                setNewClaim({ ...newClaim, toDate: val, days: newDays });
              }}
              clearable={false}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
            <Input
              label="Số ngày nghỉ"
              type="number"
              min="1"
              value={String(newClaim.days)}
              onChange={(e) => setNewClaim({ ...newClaim, days: parseInt(e.target.value) || 1 })}
            />
            <Input
              label="Trợ cấp dự kiến (đồng)"
              placeholder="850.000"
              value={formatNumberGroup(newClaim.amount)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setNewClaim({ ...newClaim, amount: raw });
              }}
            />
          </div>

          <Input
            label="Cơ quan BHXH quản lý"
            readOnly
            value={config.authorityName}
          />

          <div className="form-group">
            <label className="form-label">Ghi chú / Chứng từ đính kèm</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Nhập số giấy ra viện, số chứng sinh, tình trạng hồ sơ y tế..."
              value={newClaim.note}
              onChange={(e) => setNewClaim({ ...newClaim, note: e.target.value })}
              style={{
                height: 'auto',
                lineHeight: 1.5,
                padding: '8px 12px',
                resize: 'vertical',
                minHeight: '90px',
              }}
            />
          </div>
        </form>
      </Offcanvas>
    </div>
  );
};

export default InsuranceManagementView;

