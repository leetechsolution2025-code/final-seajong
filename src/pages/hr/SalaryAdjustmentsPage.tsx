import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sliders,
  EnvelopeCheck,
  FileEarmarkPerson,
  Check2All,
  Search,
  PlusLg,
  ArrowRight,
  SendCheck,
  ArrowCounterclockwise,
  CheckLg,
  XLg,
  CheckCircleFill,
  XCircleFill,
  ExclamationCircleFill,
  ClockFill,
  FileEarmarkText,
  PersonCheck,
  Building,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select, type SelectOption } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuggestionInput, type SuggestionItem } from '../../components/common/SuggestionInput';
import type { ModernStepItem } from '../../types';

// ─── STEP CONFIGURATION ────────────────────────────────────────────────────────

const SALARY_STEPS: ModernStepItem[] = [
  { num: 1, id: 'RECEIVING', title: 'Tiếp nhận', desc: 'Rà soát chỉ tiêu', icon: 'bi-envelope-check' },
  { num: 2, id: 'APPROVAL', title: 'Xét duyệt', desc: 'Tờ trình & Phê duyệt', icon: 'bi-file-earmark-person' },
  { num: 3, id: 'COMPLETION', title: 'Hoàn tất', desc: 'Quyết định & Cập nhật', icon: 'bi-check2-all' },
];

// ─── DATA INTERFACES ──────────────────────────────────────────────────────────

export interface SalaryAdjustmentRequest {
  id: string;
  employeeId: string;
  status: string; // PENDING, REVIEWING, SUBMITTED, WAITING_APPROVAL, APPROVED, DECIDED, COMPLETED, REJECTED
  adjustmentType: 'INCREASE' | 'DECREASE' | 'RESTRUCTURE' | string;
  currentBaseSalary: number | null;
  proposedBaseSalary: number | null;
  currentAllowances: string | null;
  proposedAllowances: string | null;
  reason: string;
  effectiveDate: string | null;
  hrNote?: string | null;
  createdAt: string;
  employee?: {
    id: string;
    fullName: string;
    code: string;
    avatarUrl?: string | null;
    departmentName: string;
    positionName?: string;
    baseSalary?: number | null;
  } | null;
  requester?: {
    id: string;
    fullName: string;
    code?: string;
  } | null;
}

interface EmployeeItem {
  id: string;
  fullName: string;
  code: string;
  avatarUrl?: string | null;
  departmentName?: string;
  departmentCode?: string;
  position?: string;
  baseSalary?: number | null;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

const formatVND = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return '0 ₫';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
};

const parseAllowances = (jsonStr: string | null | undefined): Record<string, number> => {
  if (!jsonStr) return {};
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const calcTotalIncome = (baseSalary: number | null | undefined, allowancesStr: string | null | undefined): number => {
  const base = Number(baseSalary || 0);
  const allowances = parseAllowances(allowancesStr);
  const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + Number(val || 0), 0);
  return base + totalAllowances;
};

// ─── STATUS BADGE COMPONENT ───────────────────────────────────────────────────

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          Mới tiếp nhận
        </span>
      );
    case 'REVIEWING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Đã tiếp nhận
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Chờ trình duyệt
        </span>
      );
    case 'WAITING_APPROVAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Đang trình duyệt
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Đã phê duyệt
        </span>
      );
    case 'DECIDED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Đã ra quyết định
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
          Đã cập nhật hồ sơ
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
};

// ─── ADJUSTMENT TYPE BADGE ────────────────────────────────────────────────────

const AdjustmentTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'INCREASE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        Tăng thu nhập
      </span>
    );
  }
  if (type === 'DECREASE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
        Giảm thu nhập
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
      Tái cơ cấu
    </span>
  );
};

// ─── MAIN COMPONENT: SALARY ADJUSTMENTS PAGE ──────────────────────────────────

export const SalaryAdjustmentsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [requests, setRequests] = useState<SalaryAdjustmentRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Multi-select for Step 2 (Trình phê duyệt)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Offcanvas States
  const [selectedItem, setSelectedItem] = useState<SalaryAdjustmentRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isProposalOpen, setIsProposalOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // Action Loading
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Confirm Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'primary' | 'success';
    confirmText: string;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'primary',
    confirmText: 'Xác nhận',
    onConfirm: async () => {},
  });

  // ─── FETCH DATA ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRequests, resEmps] = await Promise.all([
        fetch('/api/hr/salary-adjustment'),
        fetch('/api/hr/employees'),
      ]);

      if (resRequests.ok) {
        const data = await resRequests.json();
        if (Array.isArray(data)) {
          setRequests(data);
        }
      }

      if (resEmps.ok) {
        const empData = await resEmps.json();
        if (Array.isArray(empData)) {
          setEmployees(empData);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu điều chỉnh thu nhập:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset selected checkboxes on step change
  useEffect(() => {
    setSelectedIds([]);
  }, [currentStep]);

  // ─── FILTER DATA PER STEP ───────────────────────────────────────────────────

  const filteredByStep = useMemo(() => {
    return requests.filter((item) => {
      if (currentStep === 1) {
        // Step 1: Tiếp nhận (PENDING, REVIEWING, REJECTED)
        return ['PENDING', 'REVIEWING', 'REJECTED'].includes(item.status);
      }
      if (currentStep === 2) {
        // Step 2: Xét duyệt (SUBMITTED, WAITING_APPROVAL)
        return ['SUBMITTED', 'WAITING_APPROVAL'].includes(item.status);
      }
      if (currentStep === 3) {
        // Step 3: Hoàn tất (APPROVED, DECIDED, COMPLETED)
        return ['APPROVED', 'DECIDED', 'COMPLETED'].includes(item.status);
      }
      return true;
    });
  }, [requests, currentStep]);

  // Apply search & toolbar filters
  const filteredData = useMemo(() => {
    return filteredByStep.filter((item) => {
      // Dept filter
      if (selectedDepartment !== 'all' && item.employee?.departmentName !== selectedDepartment) {
        return false;
      }
      // Type filter
      if (selectedType !== 'all' && item.adjustmentType !== selectedType) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const empName = item.employee?.fullName?.toLowerCase() || '';
        const empCode = item.employee?.code?.toLowerCase() || '';
        const dept = item.employee?.departmentName?.toLowerCase() || '';
        const reason = item.reason?.toLowerCase() || '';
        if (!empName.includes(query) && !empCode.includes(query) && !dept.includes(query) && !reason.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [filteredByStep, selectedDepartment, selectedType, searchTerm]);

  // Paginated items
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Department options for filter
  const departmentOptions: SelectOption[] = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.employee?.departmentName) set.add(r.employee.departmentName);
    });
    const opts: SelectOption[] = [{ value: 'all', label: 'Tất cả phòng ban' }];
    Array.from(set).forEach((d) => opts.push({ value: d, label: d }));
    return opts;
  }, [requests]);

  const typeOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả phân loại' },
    { value: 'INCREASE', label: 'Tăng thu nhập' },
    { value: 'DECREASE', label: 'Giảm thu nhập' },
    { value: 'RESTRUCTURE', label: 'Tái cơ cấu' },
  ];

  // Selected items in Step 2
  const selectedItems = useMemo(() => {
    return requests.filter((r) => selectedIds.includes(r.id));
  }, [requests, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredData.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ─── ACTION HANDLERS ────────────────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, newStatus: string, note?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/salary-adjustment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, hrNote: note }),
      });
      if (!res.ok) throw new Error('Cập nhật trạng thái thất bại');
      await fetchData();
      setIsDetailOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/salary-adjustment/${id}/finalize`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Cập nhật hồ sơ thất bại');
      }
      await fetchData();
      setIsDetailOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật hồ sơ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/salary-adjustment/${id}/recall`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Thu hồi thất bại');
      await fetchData();
      setIsDetailOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thu hồi tờ trình');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSubmitToDirector = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/salary-adjustment/submit-to-director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Trình phê duyệt thất bại');
      await fetchData();
      setIsProposalOpen(false);
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi trình phê duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <StepPage
      title="Điều chỉnh thu nhập & Thưởng KPI"
      description="Xét tăng lương niên hạn định kỳ và mức thưởng hoàn thành mục tiêu kinh doanh"
      icon="bi-sliders"
      color="rose"
      badge="THU NHẬP"
      hideTicker={true}
      steps={SALARY_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      <div className="flex flex-col h-full" style={{ minHeight: 0, flex: '1 1 0%' }}>
        {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
        <TableToolbar
          searchPlaceholder="Tìm kiếm mã NV, họ tên, phòng ban..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={
            <div className="flex items-center gap-2">
              <div style={{ width: 180 }}>
                <Select
                  options={departmentOptions}
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                />
              </div>
              <div style={{ width: 160 }}>
                <Select
                  options={typeOptions}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              {currentStep === 2 && selectedIds.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsProposalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  <FileEarmarkText size={14} className="mr-1.5" />
                  Trình phê duyệt ({selectedIds.length})
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <PlusLg size={13} className="mr-1.5" />
                Tạo đề xuất
              </Button>
            </div>
          }
        />

        {/* ── TABLE ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          <FullWidthTable loading={loading} loadingText="Đang tải danh sách hồ sơ điều chỉnh...">
            <table>
              <thead>
                <tr>
                  {currentStep === 2 && (
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={
                          filteredData.length > 0 &&
                          selectedIds.length === filteredData.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th style={{ minWidth: 220 }}>Nhân sự</th>
                  <th style={{ minWidth: 120 }}>Phân loại</th>
                  <th style={{ minWidth: 230 }}>Thu nhập (Trước → Sau)</th>
                  <th style={{ minWidth: 200 }}>Lý do điều chỉnh</th>
                  <th style={{ minWidth: 130 }}>Người gửi</th>
                  <th style={{ minWidth: 110 }}>Ngày gửi</th>
                  <th style={{ minWidth: 140, textAlign: 'right' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentStep === 2 ? 8 : 7}
                      className="text-center py-12 text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Sliders size={32} className="text-slate-300" />
                        <span className="text-sm">
                          Không có hồ sơ nào ở bước{' '}
                          <strong>{SALARY_STEPS.find((s) => s.num === currentStep)?.title}</strong>
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const curTotal = calcTotalIncome(item.currentBaseSalary, item.currentAllowances);
                    const propTotal = calcTotalIncome(item.proposedBaseSalary, item.proposedAllowances);
                    const diff = propTotal - curTotal;
                    const diffPercent = curTotal > 0 ? Math.round((diff / curTotal) * 100) : 0;
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsDetailOpen(true);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {currentStep === 2 && (
                          <td
                            style={{ textAlign: 'center' }}
                            onClick={(e) => handleToggleSelect(item.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Nhân sự */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                              {item.employee?.fullName
                                ? item.employee.fullName
                                    .split(' ')
                                    .slice(-2)
                                    .map((w) => w[0])
                                    .join('')
                                    .toUpperCase()
                                : 'NV'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 text-[13px] truncate">
                                {item.employee?.fullName || 'Chưa cập nhật'}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                <span className="font-medium text-slate-600">
                                  {item.employee?.code || 'EMP-N/A'}
                                </span>
                                <span>•</span>
                                <span>{item.employee?.departmentName || 'Chung'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Phân loại */}
                        <td>
                          <AdjustmentTypeBadge type={item.adjustmentType} />
                        </td>

                        {/* Thu nhập trước -> sau */}
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 text-[12px]">
                              <span className="text-slate-500 font-medium">
                                {formatVND(curTotal)}
                              </span>
                              <ArrowRight size={12} className="text-slate-400 shrink-0" />
                              <span className="font-bold text-slate-900">
                                {formatVND(propTotal)}
                              </span>
                            </div>
                            <div className="text-[10px]">
                              {diff > 0 ? (
                                <span className="text-emerald-600 font-semibold">
                                  +{formatVND(diff)} (+{diffPercent}%)
                                </span>
                              ) : diff < 0 ? (
                                <span className="text-rose-600 font-semibold">
                                  {formatVND(diff)} ({diffPercent}%)
                                </span>
                              ) : (
                                <span className="text-slate-400">Không đổi</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Lý do */}
                        <td>
                          <div className="text-[12px] text-slate-600 truncate max-w-xs" title={item.reason}>
                            {item.reason}
                          </div>
                        </td>

                        {/* Người gửi */}
                        <td>
                          <span className="text-[12px] text-slate-700 font-medium">
                            {item.requester?.fullName || 'Hệ thống'}
                          </span>
                        </td>

                        {/* Ngày gửi */}
                        <td>
                          <span className="text-[11px] text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </td>

                        {/* Trạng thái */}
                        <td style={{ textAlign: 'right' }}>
                          <StatusIndicator status={item.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </FullWidthTable>
        </div>

        {/* ── PAGINATION ────────────────────────────────────────────────────── */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredData.length / pageSize) || 1}
          totalItems={filteredData.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* ── OFFCANVAS 1: CHI TIẾT ĐIỀU CHỈNH THU NHẬP (width="400px") ───────── */}
      <SalaryAdjustmentDetailOffcanvas
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedItem(null);
        }}
        data={selectedItem}
        loading={actionLoading}
        onUpdateStatus={(status, note) => {
          if (selectedItem) handleUpdateStatus(selectedItem.id, status, note);
        }}
        onFinalize={() => {
          if (selectedItem) {
            setConfirmDialog({
              open: true,
              title: 'Cập nhật vào hồ sơ nhân sự',
              message: `Hệ thống sẽ cập nhật mức lương mới (${formatVND(selectedItem.proposedBaseSalary)}) cho nhân sự ${selectedItem.employee?.fullName} và tự động lưu vào Quá trình công tác.`,
              variant: 'primary',
              confirmText: 'Cập nhật ngay',
              onConfirm: async () => {
                await handleFinalize(selectedItem.id);
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              },
            });
          }
        }}
        onRecall={() => {
          if (selectedItem) {
            setConfirmDialog({
              open: true,
              title: 'Thu hồi tờ trình',
              message: 'Bạn có chắc chắn muốn thu hồi tờ trình phê duyệt này để chỉnh sửa lại?',
              variant: 'warning',
              confirmText: 'Thu hồi ngay',
              onConfirm: async () => {
                await handleRecall(selectedItem.id);
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              },
            });
          }
        }}
      />

      {/* ── OFFCANVAS 2: HỖ TRỢ TRÌNH PHÊ DUYỆT (width="400px") ──────────────── */}
      <ProposalSupportOffcanvas
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
        selectedItems={selectedItems}
        loading={actionLoading}
        onSubmit={handleBulkSubmitToDirector}
      />

      {/* ── OFFCANVAS 3: TẠO ĐỀ XUẤT ĐIỀU CHỈNH (width="400px") ──────────────── */}
      <CreateAdjustmentOffcanvas
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        employees={employees}
        onSuccess={async () => {
          setIsCreateOpen(false);
          await fetchData();
        }}
      />

      {/* ── CONFIRM DIALOG ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText="Hủy"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </StepPage>
  );
};

// ─── OFFCANVAS CHI TIẾT (width="400px") ────────────────────────────────────────

interface DetailProps {
  isOpen: boolean;
  onClose: () => void;
  data: SalaryAdjustmentRequest | null;
  loading: boolean;
  onUpdateStatus: (status: string, note?: string) => void;
  onFinalize: () => void;
  onRecall: () => void;
}

const SalaryAdjustmentDetailOffcanvas: React.FC<DetailProps> = ({
  isOpen,
  onClose,
  data,
  loading,
  onUpdateStatus,
  onFinalize,
  onRecall,
}) => {
  if (!data) return null;

  const curAllowances = parseAllowances(data.currentAllowances);
  const propAllowances = parseAllowances(data.proposedAllowances);

  const curBase = Number(data.currentBaseSalary || 0);
  const propBase = Number(data.proposedBaseSalary || 0);

  const curTotal = calcTotalIncome(data.currentBaseSalary, data.currentAllowances);
  const propTotal = calcTotalIncome(data.proposedBaseSalary, data.proposedAllowances);

  const isApprovedOrDecided = ['APPROVED', 'DECIDED'].includes(data.status);
  const isCompleted = data.status === 'COMPLETED';
  const isRejected = data.status === 'REJECTED';
  const isPendingOrReviewing = ['PENDING', 'REVIEWING'].includes(data.status);
  const isSubmitted = data.status === 'SUBMITTED';
  const isWaitingApproval = data.status === 'WAITING_APPROVAL';

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      {isPendingOrReviewing && (
        <>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              const reason = window.prompt('Nhập lý do từ chối:');
              if (reason !== null && reason.trim()) {
                onUpdateStatus('REJECTED', reason.trim());
              }
            }}
            isLoading={loading}
          >
            Từ chối
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onUpdateStatus('SUBMITTED')}
            isLoading={loading}
          >
            Chấp nhận
          </Button>
        </>
      )}

      {isSubmitted && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => onUpdateStatus('WAITING_APPROVAL')}
          isLoading={loading}
        >
          Trình phê duyệt
        </Button>
      )}

      {isWaitingApproval && (
        <Button
          variant="secondary"
          size="sm"
          className="text-amber-600 border-amber-300 hover:bg-amber-50"
          onClick={onRecall}
          isLoading={loading}
        >
          Thu hồi tờ trình
        </Button>
      )}

      {isApprovedOrDecided && (
        <Button
          variant="primary"
          size="sm"
          onClick={onFinalize}
          isLoading={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Cập nhật vào hồ sơ
        </Button>
      )}

      {(isCompleted || isRejected) && (
        <Button variant="secondary" size="sm" onClick={onClose}>
          Đóng
        </Button>
      )}
    </div>
  );

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title={isApprovedOrDecided || isCompleted ? 'Cập nhật dữ liệu' : 'Chi tiết điều chỉnh'}
      description="Xem xét cơ cấu thu nhập và quyết định điều chỉnh"
      icon={<Sliders size={18} />}
      footer={footer}
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Nhân sự card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
            {data.employee?.fullName
              ? data.employee.fullName
                  .split(' ')
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
              : 'NV'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 text-sm truncate">
              {data.employee?.fullName}
            </div>
            <div className="text-slate-500 text-[11px] truncate">
              {data.employee?.code} • {data.employee?.departmentName}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <AdjustmentTypeBadge type={data.adjustmentType} />
              <StatusIndicator status={data.status} />
            </div>
          </div>
        </div>

        {/* Bảng so sánh thu nhập */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100/80 px-3 py-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
            Bảng so sánh thu nhập
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="py-2 px-3 text-left font-medium">Khoản mục</th>
                <th className="py-2 px-3 text-right font-medium">Hiện tại</th>
                <th className="py-2 px-3 text-right font-medium">Đề xuất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 px-3 text-slate-700 font-medium">Lương cơ bản</td>
                <td className="py-2 px-3 text-right text-slate-500">{formatVND(curBase)}</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">{formatVND(propBase)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 text-slate-600">Phụ cấp ăn trưa</td>
                <td className="py-1.5 px-3 text-right text-slate-400">{formatVND(curAllowances.meal)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatVND(propAllowances.meal)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 text-slate-600">Phụ cấp xăng xe</td>
                <td className="py-1.5 px-3 text-right text-slate-400">{formatVND(curAllowances.fuel)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatVND(propAllowances.fuel)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 text-slate-600">Phụ cấp điện thoại</td>
                <td className="py-1.5 px-3 text-right text-slate-400">{formatVND(curAllowances.phone)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatVND(propAllowances.phone)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-3 text-slate-600">Phụ cấp thâm niên</td>
                <td className="py-1.5 px-3 text-right text-slate-400">{formatVND(curAllowances.seniority)}</td>
                <td className="py-1.5 px-3 text-right text-slate-700">{formatVND(propAllowances.seniority)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="py-2 px-3 text-slate-800">TỔNG THU NHẬP</td>
                <td className="py-2 px-3 text-right text-slate-600">{formatVND(curTotal)}</td>
                <td className="py-2 px-3 text-right text-primary-700">{formatVND(propTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Thông tin bổ sung */}
        <div className="flex flex-col gap-2 p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Ngày hiệu lực:</span>
            <span className="font-semibold text-slate-800">
              {data.effectiveDate
                ? new Date(data.effectiveDate).toLocaleDateString('vi-VN')
                : 'Ngay khi phê duyệt'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Người đề xuất:</span>
            <span className="font-semibold text-slate-800">
              {data.requester?.fullName || 'Hệ thống'}
            </span>
          </div>
          <div className="mt-1">
            <div className="text-slate-500 mb-0.5">Lý do điều chỉnh:</div>
            <div className="p-2 bg-white rounded border border-slate-200 text-slate-700 font-normal">
              {data.reason}
            </div>
          </div>
          {data.hrNote && (
            <div className="mt-1">
              <div className="text-slate-500 mb-0.5">Ý kiến nhân sự / Ghi chú:</div>
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-medium">
                {data.hrNote}
              </div>
            </div>
          )}
        </div>
      </div>
    </Offcanvas>
  );
};

// ─── OFFCANVAS HỖ TRỢ TRÌNH PHÊ DUYỆT (width="400px") ────────────────────────

interface ProposalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: SalaryAdjustmentRequest[];
  loading: boolean;
  onSubmit: () => void;
}

const ProposalSupportOffcanvas: React.FC<ProposalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  loading,
  onSubmit,
}) => {
  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
        Hủy bỏ
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onSubmit}
        isLoading={loading}
        disabled={selectedItems.length === 0}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        Xác nhận & Trình phê duyệt
      </Button>
    </div>
  );

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title="Hỗ trợ trình phê duyệt"
      description="Tập hợp hồ sơ gửi Ban Giám đốc xét duyệt"
      icon={<FileEarmarkText size={18} />}
      footer={footer}
    >
      <div className="flex flex-col gap-3 text-xs">
        <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 flex items-center gap-2 font-medium">
          <FileEarmarkText size={16} className="text-indigo-600 shrink-0" />
          <span>
            Đang chọn <strong>{selectedItems.length}</strong> hồ sơ nhân sự để trình duyệt.
          </span>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {selectedItems.map((item) => (
            <div key={item.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                  {item.employee?.fullName ? item.employee.fullName.charAt(0) : 'NV'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 text-[12px] truncate">
                    {item.employee?.fullName}
                  </div>
                  <div className="text-slate-400 text-[11px] truncate">
                    {item.employee?.code} • {item.adjustmentType === 'INCREASE' ? 'Tăng lương' : 'Điều chỉnh'}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900 text-[12px]">
                  {formatVND(item.proposedBaseSalary)}
                </div>
                <div className="text-slate-400 text-[10px]">Đề xuất mới</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Offcanvas>
  );
};

// ─── OFFCANVAS TẠO ĐỀ XUẤT ĐIỀU CHỈNH (width="400px") ────────────────────────

interface CreateProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeItem[];
  onSuccess: () => Promise<void>;
}

const CreateAdjustmentOffcanvas: React.FC<CreateProps> = ({
  isOpen,
  onClose,
  employees,
  onSuccess,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<string>('INCREASE');
  const [currentBaseSalary, setCurrentBaseSalary] = useState<number>(0);
  const [proposedBaseSalary, setProposedBaseSalary] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Allowances
  const [mealAllowance, setMealAllowance] = useState<number>(730000);
  const [fuelAllowance, setFuelAllowance] = useState<number>(500000);
  const [phoneAllowance, setPhoneAllowance] = useState<number>(300000);
  const [seniorityAllowance, setSeniorityAllowance] = useState<number>(0);

  const employeeOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: '-- Chọn nhân sự --' },
      ...employees.map((e) => ({
        value: e.id,
        label: `${e.fullName} (${e.code} - ${e.departmentName || 'Chung'})`,
      })),
    ];
  }, [employees]);

  // When selecting employee, auto-fill base salary
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      const curSalary = Number(emp.baseSalary || 10000000);
      setCurrentBaseSalary(curSalary);
      setProposedBaseSalary(Math.round(curSalary * 1.15)); // default suggest +15%
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmpId) {
      alert('Vui lòng chọn nhân sự');
      return;
    }
    if (!proposedBaseSalary || proposedBaseSalary <= 0) {
      alert('Vui lòng nhập mức lương đề xuất hợp lệ');
      return;
    }
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do điều chỉnh');
      return;
    }

    setLoading(true);
    try {
      const curAllowances = { meal: 730000, fuel: 500000 };
      const propAllowances = {
        meal: mealAllowance,
        fuel: fuelAllowance,
        phone: phoneAllowance,
        seniority: seniorityAllowance,
      };

      const res = await fetch('/api/hr/salary-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          adjustmentType,
          currentBaseSalary,
          proposedBaseSalary,
          currentAllowances: curAllowances,
          proposedAllowances: propAllowances,
          effectiveDate,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Tạo đề xuất thất bại');
      }

      await onSuccess();
      // Reset form
      setSelectedEmpId('');
      setReason('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi đề xuất');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
        Hủy bỏ
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        isLoading={loading}
      >
        Gửi đề xuất
      </Button>
    </div>
  );

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title="Tạo đề xuất điều chỉnh thu nhập"
      description="Lập tờ trình tăng/giảm lương và phụ cấp nhân sự"
      icon={<PlusLg size={18} />}
      footer={footer}
    >
      <div className="flex flex-col gap-3.5 text-xs">
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Nhân viên <span className="text-rose-500">*</span>
          </label>
          <Select
            options={employeeOptions}
            value={selectedEmpId}
            onChange={(e) => handleSelectEmployee(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Loại điều chỉnh <span className="text-rose-500">*</span>
          </label>
          <Select
            options={[
              { value: 'INCREASE', label: 'Tăng thu nhập' },
              { value: 'DECREASE', label: 'Giảm thu nhập' },
              { value: 'RESTRUCTURE', label: 'Tái cơ cấu dải lương' },
            ]}
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Lương hiện tại (₫)
            </label>
            <input
              type="number"
              value={currentBaseSalary}
              onChange={(e) => setCurrentBaseSalary(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Lương đề xuất (₫) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={proposedBaseSalary}
              onChange={(e) => setProposedBaseSalary(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold text-slate-900"
            />
          </div>
        </div>

        {/* Allowances */}
        <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
          <div className="font-semibold text-slate-700 mb-2">Phụ cấp đề xuất (₫/tháng)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Ăn trưa</label>
              <input
                type="number"
                value={mealAllowance}
                onChange={(e) => setMealAllowance(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Xăng xe</label>
              <input
                type="number"
                value={fuelAllowance}
                onChange={(e) => setFuelAllowance(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Điện thoại</label>
              <input
                type="number"
                value={phoneAllowance}
                onChange={(e) => setPhoneAllowance(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-0.5">Thâm niên</label>
              <input
                type="number"
                value={seniorityAllowance}
                onChange={(e) => setSeniorityAllowance(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Ngày hiệu lực
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Lý do điều chỉnh <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nêu rõ lý do tăng lương, thành tích KPI, thời gian niên hạn..."
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>
    </Offcanvas>
  );
};

export default SalaryAdjustmentsPage;
