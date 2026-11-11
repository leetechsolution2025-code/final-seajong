import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUpRightCircle,
  EnvelopeCheck,
  ChatQuote,
  FileEarmarkCheck,
  Search,
  PlusLg,
  ArrowRight,
  CheckCircleFill,
  XCircleFill,
  ClockFill,
  FileEarmarkText,
  Sliders,
  CalendarCheck,
  Award,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select, type SelectOption } from '../../components/common/Select';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SuggestionInput, type SuggestionItem } from '../../components/common/SuggestionInput';
import type { ModernStepItem } from '../../types';

// ─── STEP CONFIGURATION ────────────────────────────────────────────────────────

const PROMOTION_STEPS: ModernStepItem[] = [
  { num: 1, id: 'RECEIVING', title: 'Tiếp nhận', desc: 'Phòng nhân sự phê duyệt', icon: 'bi-envelope-check' },
  { num: 2, id: 'INTERVIEWING', title: 'Phỏng vấn', desc: 'Đánh giá & Trình giám đốc', icon: 'bi-chat-quote' },
  { num: 3, id: 'CONCLUSION', title: 'Kết luận', desc: 'Ban hành & Cập nhật dữ liệu', icon: 'bi-file-earmark-check' },
];

// ─── DATA INTERFACES ──────────────────────────────────────────────────────────

export interface PromotionRequestItem {
  id: string;
  employeeId: string;
  type: 'PROMOTION' | 'TRANSFER' | 'DEMOTION' | string;
  currentDept: string;
  currentPos: string;
  targetDept: string;
  targetPos: string;
  reason?: string | null;
  status: 'RECEIVING' | 'INTERVIEWING' | 'CONCLUSION' | string;
  hrApproved: boolean;
  hrNote?: string | null;
  interviewDate?: string | null;
  interviewLocation?: string | null;
  interviewerId?: string | null;
  interviewNote?: string | null;
  competencyScore?: number | null;
  suitabilityScore?: number | null;
  interviewResult?: 'PASS' | 'FAIL' | string | null;
  directorApproved: boolean;
  directorNote?: string | null;
  decisionNumber?: string | null;
  effectiveDate?: string | null;
  createdAt: string;
  employeeName?: string;
  employeeCode?: string;
  avatar?: string | null;
  requesterName?: string;
  requesterPos?: string;
  interviewerName?: string;
  currentPosName?: string;
  targetPosName?: string;
  currentDeptName?: string;
  targetDeptName?: string;
}

interface EmployeeItem {
  id: string;
  fullName: string;
  code: string;
  departmentName?: string;
  departmentCode?: string;
  position?: string;
  baseSalary?: number | null;
}

interface CategoryItem {
  code: string;
  name: string;
}

interface DepartmentItem {
  code: string;
  nameVi: string;
}

// ─── BADGES ───────────────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'PROMOTION') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
        Đề bạt
      </span>
    );
  }
  if (type === 'DEMOTION') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
        Miễn nhiệm
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
      Điều chuyển
    </span>
  );
};

const StatusBadge: React.FC<{ item: PromotionRequestItem }> = ({ item }) => {
  if (item.status === 'CONCLUSION') {
    if (item.directorApproved === true) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Đã phê duyệt
        </span>
      );
    }
    if (item.directorApproved === false && item.directorNote) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Từ chối
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        Đang trình duyệt
      </span>
    );
  }
  if (item.status === 'INTERVIEWING') {
    if (item.interviewResult === 'PASS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Đạt phỏng vấn
        </span>
      );
    }
    if (item.interviewResult === 'FAIL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Không đạt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        Đã tiếp nhận
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
      Mới tiếp nhận
    </span>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const PromotionsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [data, setData] = useState<PromotionRequestItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [positions, setPositions] = useState<CategoryItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Multi-select in Step 2 for submission
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Offcanvas
  const [selectedItem, setSelectedItem] = useState<PromotionRequestItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // ─── FETCH DATA ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resPromos, resEmps, resPos, resDepts] = await Promise.all([
        fetch('/api/hr/promotions'),
        fetch('/api/hr/employees?pageSize=500'),
        fetch('/api/hr/positions'),
        fetch('/api/departments'),
      ]);

      if (resPromos.ok) {
        const promoData = await resPromos.json();
        if (Array.isArray(promoData)) setData(promoData);
      }

      if (resEmps.ok) {
        const empData = await resEmps.json();
        const list = Array.isArray(empData) ? empData : empData.employees || empData.data || [];
        setEmployees(list);
      }

      if (resPos.ok) {
        const posData = await resPos.json();
        if (Array.isArray(posData)) setPositions(posData);
      }

      if (resDepts.ok) {
        const deptData = await resDepts.json();
        if (Array.isArray(deptData)) setDepartments(deptData);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu điều chuyển:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentStep]);

  // ─── FILTER DATA ────────────────────────────────────────────────────────────

  const filteredByStep = useMemo(() => {
    return data.filter((item) => {
      if (currentStep === 1) return item.status === 'RECEIVING';
      if (currentStep === 2) return item.status === 'INTERVIEWING';
      if (currentStep === 3) return item.status === 'CONCLUSION';
      return true;
    });
  }, [data, currentStep]);

  const filteredData = useMemo(() => {
    return filteredByStep.filter((item) => {
      if (selectedDept !== 'all' && item.currentDept !== selectedDept && item.targetDept !== selectedDept) {
        return false;
      }
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = item.employeeName?.toLowerCase() || '';
        const curPos = item.currentPosName?.toLowerCase() || '';
        const tarPos = item.targetPosName?.toLowerCase() || '';
        const reason = item.reason?.toLowerCase() || '';
        if (!name.includes(q) && !curPos.includes(q) && !tarPos.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [filteredByStep, selectedDept, selectedType, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Department options
  const departmentOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'all', label: 'Tất cả phòng ban' },
      ...departments.map((d) => ({ value: d.code, label: d.nameVi })),
    ];
  }, [departments]);

  const typeOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả phân loại' },
    { value: 'PROMOTION', label: 'Đề bạt' },
    { value: 'TRANSFER', label: 'Điều chuyển' },
    { value: 'DEMOTION', label: 'Miễn nhiệm' },
  ];

  // Actions
  const handleUpdate = async (id: string, updates: Partial<PromotionRequestItem>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      await fetchData();
      setIsDetailOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ này?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/promotions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa thất bại');
      await fetchData();
      setIsDetailOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSubmitConclusion = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/hr/promotions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CONCLUSION' }),
          })
        )
      );
      await fetchData();
      setSelectedIds([]);
      setIsApprovalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi trình phê duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <StepPage
      title="Điều chuyển và đề bạt"
      description="Quản lý lộ trình phát triển, thay đổi vị trí và thăng tiến"
      icon="bi-arrow-up-right-circle"
      color="rose"
      badge="ĐIỀU CHUYỂN"
      hideTicker={true}
      steps={PROMOTION_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      <div className="flex flex-col h-full" style={{ minHeight: 0, flex: '1 1 0%' }}>
        {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
        <TableToolbar
          searchPlaceholder="Tìm kiếm tên nhân viên, vị trí..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={
            <div className="flex items-center gap-2">
              <div style={{ width: 180 }}>
                <Select
                  options={departmentOptions}
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
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
                  onClick={() => setIsApprovalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  <FileEarmarkText size={14} className="mr-1.5" />
                  Trình giám đốc ({selectedIds.length})
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <PlusLg size={13} className="mr-1.5" />
                Tạo yêu cầu
              </Button>
            </div>
          }
        />

        {/* ── TABLE ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          <FullWidthTable className="promotions-table" loading={loading} loadingText="Đang tải danh sách điều chuyển...">
            <table style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  {currentStep === 2 && (
                    <th style={{ width: 36, minWidth: 36, maxWidth: 36, textAlign: 'center', padding: '10px 4px' }}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        checked={
                          filteredData.length > 0 &&
                          selectedIds.length === filteredData.filter((r) => r.interviewResult === 'PASS').length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredData.filter((r) => r.interviewResult === 'PASS').map((r) => r.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                  )}
                  <th style={{ width: currentStep === 2 ? '24%' : '26%' }}>Nhân viên</th>
                  <th style={{ width: currentStep === 2 ? '22%' : '24%' }}>Loại yêu cầu & Lộ trình</th>
                  <th style={{ width: currentStep === 2 ? '14%' : '14%', whiteSpace: 'nowrap' }}>
                    {currentStep === 2 ? 'Phỏng vấn' : currentStep === 3 ? 'Quyết định' : 'Người đề xuất'}
                  </th>
                  <th style={{ width: currentStep === 2 ? '14%' : '14%', whiteSpace: 'nowrap' }}>
                    {currentStep === 2 ? 'Đánh giá' : 'Ngày gửi'}
                  </th>
                  <th style={{ width: currentStep === 2 ? '12%' : '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={currentStep === 2 ? 6 : 5} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Sliders size={32} className="text-slate-300" />
                        <span className="text-sm">
                          Không có hồ sơ nào ở bước{' '}
                          <strong>{PROMOTION_STEPS.find((s) => s.num === currentStep)?.title}</strong>
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.interviewResult !== 'PASS') return;
                              setSelectedIds((prev) =>
                                prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                              );
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={item.interviewResult !== 'PASS'}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-40"
                            />
                          </td>
                        )}

                        {/* Nhân viên: tên + badge cạnh tên, bỏ mã */}
                        <td className="overflow-hidden">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                              {item.employeeName
                                ? item.employeeName
                                    .split(' ')
                                    .slice(-2)
                                    .map((w) => w[0])
                                    .join('')
                                    .toUpperCase()
                                : 'NV'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-800 text-[13px] truncate">
                                  {item.employeeName}
                                </span>
                                <TypeBadge type={item.type} />
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.currentDeptName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Lộ trình */}
                        <td className="overflow-hidden">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-[12px]">
                              <span className="text-slate-500 font-medium truncate max-w-[45%]">
                                {item.currentPosName}
                              </span>
                              <ArrowRight size={12} className="text-slate-400 shrink-0" />
                              <span className="font-bold text-slate-900 truncate max-w-[45%]">
                                {item.targetPosName}
                              </span>
                            </div>
                            {item.currentDept !== item.targetDept && (
                              <div className="text-[11px] text-primary-600 font-medium truncate">
                                Sang: {item.targetDeptName}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Cột 3 thay đổi theo Step */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {currentStep === 2 ? (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-medium text-slate-800">
                                {item.interviewerName || 'Chưa xếp'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {item.interviewDate ? new Date(item.interviewDate).toLocaleDateString('vi-VN') : '—'}
                              </span>
                            </div>
                          ) : currentStep === 3 ? (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-semibold text-slate-900 truncate">
                                {item.decisionNumber || 'Chưa ban hành'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString('vi-VN') : '—'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-semibold text-slate-800">{item.requesterName}</span>
                              <span className="text-[11px] text-slate-400">{item.requesterPos}</span>
                            </div>
                          )}
                        </td>

                        {/* Cột 4 thay đổi theo Step */}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {currentStep === 2 ? (
                            item.interviewResult ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    item.interviewResult === 'PASS'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {item.interviewResult === 'PASS' ? 'Đạt' : 'Không đạt'}
                                </span>
                                {(item.competencyScore || item.suitabilityScore) && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    ({item.competencyScore || 0}/{item.suitabilityScore || 0})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Chưa đánh giá</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <StatusBadge item={item} />
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

        <style>{`
          .promotions-table th,
          .promotions-table td {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
          .promotions-table .table-responsive {
            overflow-x: hidden !important;
          }
        `}</style>
      </div>

      {/* ── OFFCANVAS 1: CHI TIẾT (width="400px") ──────────────────────────── */}
      <PromotionDetailOffcanvas
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedItem(null);
        }}
        data={selectedItem}
        loading={actionLoading}
        employees={employees}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* ── OFFCANVAS 2: TẠO MỚI (width="400px") ────────────────────────────── */}
      <CreatePromotionOffcanvas
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        employees={employees}
        positions={positions}
        departments={departments}
        onSuccess={async () => {
          setIsCreateOpen(false);
          await fetchData();
        }}
      />

      {/* ── OFFCANVAS 3: TRÌNH GIÁM ĐỐC (width="400px") ────────────────────── */}
      <PromotionApprovalOffcanvas
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        selectedCount={selectedIds.length}
        loading={actionLoading}
        onSubmit={handleBulkSubmitConclusion}
      />
    </StepPage>
  );
};

// ─── OFFCANVAS CHI TIẾT ĐIỀU CHUYỂN (width="400px") ───────────────────────────

interface DetailProps {
  isOpen: boolean;
  onClose: () => void;
  data: PromotionRequestItem | null;
  loading: boolean;
  employees: EmployeeItem[];
  onUpdate: (id: string, updates: Partial<PromotionRequestItem>) => void;
  onDelete: (id: string) => void;
}

const PromotionDetailOffcanvas: React.FC<DetailProps> = ({
  isOpen,
  onClose,
  data,
  loading,
  employees,
  onUpdate,
  onDelete,
}) => {
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [interviewerId, setInterviewerId] = useState<string>('');
  const [interviewLocation, setInterviewLocation] = useState<string>('');
  const [interviewNote, setInterviewNote] = useState<string>('');
  const [competencyScore, setCompetencyScore] = useState<number>(80);
  const [suitabilityScore, setSuitabilityScore] = useState<number>(80);
  const [interviewResult, setInterviewResult] = useState<'PASS' | 'FAIL'>('PASS');

  // Conclusion fields
  const [decisionNumber, setDecisionNumber] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');

  useEffect(() => {
    if (data) {
      setInterviewDate(data.interviewDate ? data.interviewDate.split('T')[0] : '');
      setInterviewerId(data.interviewerId || '');
      setInterviewLocation(data.interviewLocation || 'Phòng họp Tầng 2');
      setInterviewNote(data.interviewNote || '');
      setCompetencyScore(data.competencyScore || 80);
      setSuitabilityScore(data.suitabilityScore || 80);
      setInterviewResult((data.interviewResult as any) || 'PASS');
      setDecisionNumber(data.decisionNumber || `QĐ-DC-${data.id.slice(-6).toUpperCase()}`);
      setEffectiveDate(data.effectiveDate ? data.effectiveDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [data]);

  if (!data) return null;

  const interviewerOptions: SelectOption[] = [
    { value: '', label: '-- Chọn người phỏng vấn --' },
    ...employees.map((e) => ({
      value: e.id,
      label: `${e.fullName} (${e.departmentName || 'Chung'})`,
    })),
  ];

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full">
      <Button
        variant="danger"
        size="sm"
        onClick={() => onDelete(data.id)}
        disabled={loading}
      >
        Xóa
      </Button>

      <div className="flex items-center gap-2">
        {data.status === 'RECEIVING' && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUpdate(data.id, { hrApproved: false, status: 'CONCLUSION' })}
              isLoading={loading}
            >
              Từ chối
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdate(data.id, { status: 'INTERVIEWING', hrApproved: true })}
              isLoading={loading}
            >
              Tiếp nhận & Lên lịch PV
            </Button>
          </>
        )}

        {data.status === 'INTERVIEWING' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onUpdate(data.id, {
                interviewDate: interviewDate ? (interviewDate as any) : null,
                interviewerId,
                interviewLocation,
                interviewNote,
                competencyScore,
                suitabilityScore,
                interviewResult,
              })
            }
            isLoading={loading}
          >
            Lưu đánh giá PV
          </Button>
        )}

        {data.status === 'CONCLUSION' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onUpdate(data.id, {
                directorApproved: true,
                decisionNumber,
                effectiveDate: effectiveDate ? (effectiveDate as any) : null,
              })
            }
            isLoading={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Phê duyệt & Đồng bộ
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title="Chi tiết điều chuyển & đề bạt"
      description="Xem xét lộ trình và thực hiện các bước quy trình"
      icon={<ArrowUpRightCircle size={18} />}
      footer={footer}
    >
      <div className="flex flex-col gap-3.5 text-xs">
        {/* Nhân sự card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
            {data.employeeName
              ? data.employeeName
                  .split(' ')
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
              : 'NV'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm truncate">{data.employeeName}</span>
              <TypeBadge type={data.type} />
            </div>
            <div className="text-slate-500 text-[11px] truncate mt-0.5">{data.currentDeptName}</div>
            <div className="mt-1">
              <StatusBadge item={data} />
            </div>
          </div>
        </div>

        {/* Lộ trình so sánh */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[11px]">
            Lộ trình thay đổi
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex-1">
              <span className="text-slate-400 block text-[10px]">Hiện tại</span>
              <span className="font-semibold text-slate-800 block truncate">{data.currentPosName}</span>
              <span className="text-[11px] text-slate-500 block truncate">{data.currentDeptName}</span>
            </div>
            <div className="px-2 text-primary-500">
              <ArrowRight size={16} />
            </div>
            <div className="flex-1 text-right">
              <span className="text-primary-600 block text-[10px] font-bold">Mục tiêu</span>
              <span className="font-bold text-slate-900 block truncate">{data.targetPosName}</span>
              <span className="text-[11px] text-slate-500 block truncate">{data.targetDeptName}</span>
            </div>
          </div>
        </div>

        {/* Lý do */}
        <div>
          <label className="block text-slate-500 font-medium mb-1">Lý do đề xuất</label>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700">
            {data.reason || 'Không có ghi chú'}
          </div>
        </div>

        {/* Form phỏng vấn nếu ở bước 2 */}
        {data.status === 'INTERVIEWING' && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 flex flex-col gap-2.5">
            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
              Đánh giá phỏng vấn
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Người phỏng vấn</label>
              <Select
                options={interviewerOptions}
                value={interviewerId}
                onChange={(e) => setInterviewerId(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Ngày phỏng vấn</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Kết quả</label>
                <Select
                  options={[
                    { value: 'PASS', label: 'Đạt yêu cầu' },
                    { value: 'FAIL', label: 'Không đạt' },
                  ]}
                  value={interviewResult}
                  onChange={(e) => setInterviewResult(e.target.value as any)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Điểm năng lực (1-100)</label>
                <input
                  type="number"
                  value={competencyScore}
                  onChange={(e) => setCompetencyScore(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Điểm phù hợp (1-100)</label>
                <input
                  type="number"
                  value={suitabilityScore}
                  onChange={(e) => setSuitabilityScore(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Nhận xét phỏng vấn</label>
              <textarea
                rows={2}
                value={interviewNote}
                onChange={(e) => setInterviewNote(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                placeholder="Nhận xét thái độ, chuyên môn..."
              />
            </div>
          </div>
        )}

        {/* Quyết định nếu ở bước 3 */}
        {data.status === 'CONCLUSION' && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 flex flex-col gap-2.5">
            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
              Ban hành quyết định
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Số quyết định</label>
              <input
                type="text"
                value={decisionNumber}
                onChange={(e) => setDecisionNumber(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Ngày hiệu lực</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
              />
            </div>
          </div>
        )}
      </div>
    </Offcanvas>
  );
};

// ─── OFFCANVAS TẠO MỚI ĐIỀU CHUYỂN (width="400px") ─────────────────────────────

interface CreatePromotionProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeItem[];
  positions: CategoryItem[];
  departments: DepartmentItem[];
  onSuccess: () => Promise<void>;
}

const CreatePromotionOffcanvas: React.FC<CreatePromotionProps> = ({
  isOpen,
  onClose,
  employees,
  positions,
  departments,
  onSuccess,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedEmpName, setSelectedEmpName] = useState<string>('');
  const [type, setType] = useState<string>('PROMOTION');
  const [currentDept, setCurrentDept] = useState<string>('');
  const [currentPos, setCurrentPos] = useState<string>('');
  const [targetDept, setTargetDept] = useState<string>('');
  const [targetPos, setTargetPos] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [internalEmps, setInternalEmps] = useState<EmployeeItem[]>(employees);

  useEffect(() => {
    if (employees && employees.length > 0) {
      setInternalEmps(employees);
    } else {
      fetch('/api/hr/employees?pageSize=500')
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.employees || data.data || [];
          setInternalEmps(list);
        })
        .catch(() => {});
    }
  }, [employees, isOpen]);

  const employeeSuggestions: SuggestionItem[] = useMemo(() => {
    return internalEmps.map((e) => ({
      id: e.id,
      value: e.fullName,
      label: e.fullName,
      subText: e.departmentName || 'Chung',
      category: e.departmentName || 'Phòng ban chung',
    }));
  }, [internalEmps]);

  const handleSelectEmp = (emp: EmployeeItem) => {
    setSelectedEmpId(emp.id);
    setSelectedEmpName(emp.fullName);
    setCurrentDept(emp.departmentCode || 'general');
    setCurrentPos(emp.position || 'Nhân viên');
    setTargetDept(emp.departmentCode || 'general');
  };

  const deptOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: '-- Chọn phòng ban đích --' },
      ...departments.map((d) => ({ value: d.code, label: d.nameVi })),
    ];
  }, [departments]);

  const posOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: '-- Chọn vị trí đích --' },
      ...positions.map((p) => ({ value: p.code, label: p.name })),
    ];
  }, [positions]);

  const handleSubmit = async () => {
    if (!selectedEmpId) return alert('Vui lòng chọn nhân sự');
    if (!targetPos) return alert('Vui lòng chọn vị trí mục tiêu');
    if (!reason.trim()) return alert('Vui lòng nhập lý do điều chuyển');

    setLoading(true);
    try {
      const res = await fetch('/api/hr/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          type,
          currentDept,
          currentPos,
          targetDept: targetDept || currentDept,
          targetPos,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) throw new Error('Tạo yêu cầu thất bại');
      await onSuccess();
      setSelectedEmpId('');
      setSelectedEmpName('');
      setReason('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
        Hủy bỏ
      </Button>
      <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={loading}>
        Gửi yêu cầu
      </Button>
    </div>
  );

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title="Tạo yêu cầu điều chuyển / đề bạt"
      description="Lập tờ trình thay đổi vị trí, chức danh hoặc phòng ban"
      icon={<PlusLg size={18} />}
      footer={footer}
      bodyClassName="h-full flex flex-col"
      bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex flex-col h-full gap-3 text-sm" style={{ flex: '1 1 0%', minHeight: 0 }}>
        {/* Nhân viên */}
        <div>
          <SuggestionInput
            label="Nhân viên"
            required={true}
            placeholder="Tìm theo tên nhân sự hoặc phòng ban..."
            value={selectedEmpName}
            suggestions={employeeSuggestions}
            onChange={(val) => {
              setSelectedEmpName(val);
              const m = internalEmps.find((e) => e.fullName.toLowerCase() === val.toLowerCase());
              if (m) handleSelectEmp(m);
              else setSelectedEmpId('');
            }}
            onSelectSuggestion={(item) => {
              const m = internalEmps.find((e) => e.id === item.id);
              if (m) handleSelectEmp(m);
            }}
          />
        </div>

        {/* Loại yêu cầu */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Loại yêu cầu <span className="text-rose-500">*</span>
          </label>
          <Select
            options={[
              { value: 'PROMOTION', label: 'Đề bạt thăng chức' },
              { value: 'TRANSFER', label: 'Điều chuyển công tác' },
              { value: 'DEMOTION', label: 'Miễn nhiệm / Hạ bậc' },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        {/* Phòng ban đích */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Phòng ban mục tiêu <span className="text-rose-500">*</span>
          </label>
          <Select
            options={deptOptions}
            value={targetDept}
            onChange={(e) => setTargetDept(e.target.value)}
          />
        </div>

        {/* Vị trí đích */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Vị trí chức danh mới <span className="text-rose-500">*</span>
          </label>
          <Select
            options={posOptions}
            value={targetPos}
            onChange={(e) => setTargetPos(e.target.value)}
          />
        </div>

        {/* Lý do: tự động chiếm hết chiều cao khả dụng */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lý do đề xuất <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nêu rõ lý do điều chuyển, căn cứ đánh giá năng lực, nhu cầu nhân sự..."
            className="flex-1 w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
          />
        </div>
      </div>
    </Offcanvas>
  );
};

// ─── OFFCANVAS TRÌNH GIÁM ĐỐC (width="400px") ─────────────────────────────────

interface ApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  loading: boolean;
  onSubmit: () => void;
}

const PromotionApprovalOffcanvas: React.FC<ApprovalProps> = ({
  isOpen,
  onClose,
  selectedCount,
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
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        Xác nhận trình duyệt
      </Button>
    </div>
  );

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      title="Trình phê duyệt lên Giám đốc"
      description="Chuyển danh sách ứng viên đạt phỏng vấn sang bước Kết luận"
      icon={<FileEarmarkText size={18} />}
      footer={footer}
    >
      <div className="flex flex-col gap-3 text-sm">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 flex items-center gap-2 font-medium text-xs">
          <FileEarmarkText size={16} className="text-indigo-600 shrink-0" />
          <span>
            Đang chọn <strong>{selectedCount}</strong> nhân sự đạt phỏng vấn để trình Ban Giám đốc ban hành quyết định.
          </span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Sau khi xác nhận, toàn bộ hồ sơ sẽ chuyển sang bước <strong>Kết luận</strong> để Giám đốc ban hành quyết định và tự động đồng bộ vào quá trình công tác.
        </p>
      </div>
    </Offcanvas>
  );
};

export default PromotionsPage;
