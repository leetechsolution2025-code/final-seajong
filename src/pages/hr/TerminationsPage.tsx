import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PersonXFill,
  Envelope,
  FileEarmarkText,
  CheckCircle,
  PlusLg,
  Sliders,
  CalendarCheck,
  ShieldLock,
  BoxSeam,
  Check2Circle,
  ClockFill,
  XCircleFill,
  CheckCircleFill,
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

const TERMINATION_STEPS: ModernStepItem[] = [
  { num: 1, id: 'TIEP_NHAN', title: 'Tiếp nhận', desc: 'Rà soát & Tiếp nhận', icon: 'bi-envelope' },
  { num: 2, id: 'XET_DUYET', title: 'Xét duyệt', desc: 'Tờ trình & Phê duyệt', icon: 'bi-file-earmark-text' },
  { num: 3, id: 'HOAN_TAT', title: 'Hoàn tất', desc: 'Quyết định & Cập nhật', icon: 'bi-check-circle' },
];

// ─── DATA INTERFACES ──────────────────────────────────────────────────────────

export interface TerminationRequestItem {
  id: string;
  employeeId: string;
  type: 'RESIGNATION' | 'DISMISSAL' | string;
  reason: string;
  requestDate: string;
  lastWorkingDay?: string | null;
  exitInterviewNotes?: string | null;
  isStayNegotiated?: boolean;
  violationEvidence?: string | null;
  disciplinaryMinutes?: string | null;
  status: 'Draft' | 'Pending' | 'Approved' | 'Handover' | 'Finalizing' | 'Completed' | string;
  step: number;
  directorNote?: string | null;
  handoverChecklist?: string | null;
  isAccountLocked?: boolean;
  createdAt: string;
  employee?: {
    id: string;
    fullName: string;
    code: string;
    avatarUrl?: string | null;
    departmentName?: string;
    positionName?: string;
    departmentCode?: string;
  } | null;
}

interface EmployeeItem {
  id: string;
  fullName: string;
  code: string;
  departmentName?: string;
  departmentCode?: string;
  position?: string;
}

// ─── BADGES ───────────────────────────────────────────────────────────────────

const TermTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'DISMISSAL') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
        Sa thải
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
      Thôi việc
    </span>
  );
};

const TermStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'Draft':
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          Tiếp nhận đơn
        </span>
      );
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Đã phê duyệt
        </span>
      );
    case 'Handover':
    case 'Finalizing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
          Đang bàn giao
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Đã hoàn tất
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const TerminationsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [data, setData] = useState<TerminationRequestItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Offcanvas
  const [selectedItem, setSelectedItem] = useState<TerminationRequestItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // ─── FETCH DATA ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTerms, resEmps] = await Promise.all([
        fetch('/api/hr/terminations'),
        fetch('/api/hr/employees?pageSize=500'),
      ]);

      if (resTerms.ok) {
        const termsData = await resTerms.json();
        if (Array.isArray(termsData)) setData(termsData);
      }

      if (resEmps.ok) {
        const empData = await resEmps.json();
        const list = Array.isArray(empData) ? empData : empData.employees || empData.data || [];
        setEmployees(list);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thôi việc:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── FILTER DATA ────────────────────────────────────────────────────────────

  const filteredByStep = useMemo(() => {
    return data.filter((item) => {
      if (currentStep === 1) return item.status === 'Draft' || item.status === 'Pending';
      if (currentStep === 2) return item.status === 'Approved';
      if (currentStep === 3) return ['Handover', 'Finalizing', 'Completed'].includes(item.status);
      return true;
    });
  }, [data, currentStep]);

  const filteredData = useMemo(() => {
    return filteredByStep.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = item.employee?.fullName?.toLowerCase() || '';
        const dept = item.employee?.departmentName?.toLowerCase() || '';
        const reason = item.reason?.toLowerCase() || '';
        if (!name.includes(q) && !dept.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [filteredByStep, selectedType, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const typeOptions: SelectOption[] = [
    { value: 'all', label: 'Tất cả hình thức' },
    { value: 'RESIGNATION', label: 'Thôi việc tự nguyện' },
    { value: 'DISMISSAL', label: 'Sa thải / Chấm dứt' },
  ];

  // Actions
  const handleUpdate = async (id: string, updates: Partial<TerminationRequestItem>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/terminations/${id}`, {
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
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ thôi việc này?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/terminations/${id}`, { method: 'DELETE' });
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

  return (
    <StepPage
      title="Sa thải và thôi việc"
      description="Quản lý quy trình chấm dứt hợp đồng, bàn giao và quyết toán"
      icon="bi-person-x-fill"
      color="rose"
      badge="THÔI VIỆC"
      hideTicker={true}
      steps={TERMINATION_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      <div className="flex flex-col h-full" style={{ minHeight: 0, flex: '1 1 0%' }}>
        {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
        <TableToolbar
          searchPlaceholder="Tìm theo tên nhân sự, lý do..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={
            <div className="flex items-center gap-2">
              <div style={{ width: 180 }}>
                <Select
                  options={typeOptions}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
              </div>
            </div>
          }
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusLg size={13} className="mr-1.5" />
              Tạo yêu cầu
            </Button>
          }
        />

        {/* ── TABLE ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          <FullWidthTable className="terminations-table" loading={loading} loadingText="Đang tải danh sách hồ sơ thôi việc...">
            <table style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Nhân sự</th>
                  <th style={{ width: '28%' }}>Lý do chấm dứt</th>
                  <th style={{ width: '14%', whiteSpace: 'nowrap' }}>Ngày đề xuất</th>
                  <th style={{ width: '16%', whiteSpace: 'nowrap' }}>Ngày làm việc cuối</th>
                  <th style={{ width: '14%', textAlign: 'right', whiteSpace: 'nowrap' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Sliders size={32} className="text-slate-300" />
                        <span className="text-sm">
                          Không có hồ sơ nào ở bước{' '}
                          <strong>{TERMINATION_STEPS.find((s) => s.num === currentStep)?.title}</strong>
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setIsDetailOpen(true);
                      }}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Nhân sự: Tên + Badge cạnh tên, phòng ban dưới */}
                      <td className="overflow-hidden">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700 font-bold text-xs shrink-0">
                            {item.employee?.fullName
                              ? item.employee.fullName
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
                                {item.employee?.fullName || 'Chưa cập nhật'}
                              </span>
                              <TermTypeBadge type={item.type} />
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.employee?.departmentName || 'Chung'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lý do */}
                      <td className="overflow-hidden">
                        <div className="text-[12px] text-slate-600 truncate block w-full" title={item.reason}>
                          {item.reason || '—'}
                        </div>
                      </td>

                      {/* Ngày đề xuất */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="text-xs text-slate-600">
                          {new Date(item.requestDate).toLocaleDateString('vi-VN')}
                        </span>
                      </td>

                      {/* Ngày làm việc cuối */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="text-xs font-medium text-slate-900">
                          {item.lastWorkingDay ? new Date(item.lastWorkingDay).toLocaleDateString('vi-VN') : 'Chưa chốt'}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <TermStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
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
          .terminations-table th,
          .terminations-table td {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
          .terminations-table .table-responsive {
            overflow-x: hidden !important;
          }
        `}</style>
      </div>

      {/* ── OFFCANVAS 1: CHI TIẾT (width="400px") ──────────────────────────── */}
      <TerminationDetailOffcanvas
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedItem(null);
        }}
        data={selectedItem}
        loading={actionLoading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* ── OFFCANVAS 2: TẠO MỚI (width="400px") ────────────────────────────── */}
      <CreateTerminationOffcanvas
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        employees={employees}
        onSuccess={async () => {
          setIsCreateOpen(false);
          await fetchData();
        }}
      />
    </StepPage>
  );
};

// ─── OFFCANVAS CHI TIẾT THÔI VIỆC (width="400px") ─────────────────────────────

interface DetailProps {
  isOpen: boolean;
  onClose: () => void;
  data: TerminationRequestItem | null;
  loading: boolean;
  onUpdate: (id: string, updates: Partial<TerminationRequestItem>) => void;
  onDelete: (id: string) => void;
}

const TerminationDetailOffcanvas: React.FC<DetailProps> = ({
  isOpen,
  onClose,
  data,
  loading,
  onUpdate,
  onDelete,
}) => {
  const [lastWorkingDay, setLastWorkingDay] = useState<string>('');
  const [exitInterviewNotes, setExitInterviewNotes] = useState<string>('');
  const [isStayNegotiated, setIsStayNegotiated] = useState<boolean>(false);
  const [directorNote, setDirectorNote] = useState<string>('');
  const [isAccountLocked, setIsAccountLocked] = useState<boolean>(false);

  useEffect(() => {
    if (data) {
      setLastWorkingDay(data.lastWorkingDay ? data.lastWorkingDay.split('T')[0] : '');
      setExitInterviewNotes(data.exitInterviewNotes || '');
      setIsStayNegotiated(data.isStayNegotiated || false);
      setDirectorNote(data.directorNote || '');
      setIsAccountLocked(data.isAccountLocked || false);
    }
  }, [data]);

  if (!data) return null;

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
        {(data.status === 'Draft' || data.status === 'Pending') && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onUpdate(data.id, {
                status: 'Approved',
                step: 2,
                lastWorkingDay: lastWorkingDay ? (lastWorkingDay as any) : null,
                exitInterviewNotes,
                isStayNegotiated,
              })
            }
            isLoading={loading}
          >
            Phê duyệt thôi việc
          </Button>
        )}

        {data.status === 'Approved' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onUpdate(data.id, {
                status: 'Handover',
                step: 3,
                directorNote,
              })
            }
            isLoading={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Bắt đầu bàn giao
          </Button>
        )}

        {data.status === 'Handover' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              onUpdate(data.id, {
                status: 'Completed',
                isAccountLocked: true,
              })
            }
            isLoading={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Hoàn tất & Khóa hồ sơ
          </Button>
        )}

        {data.status === 'Completed' && (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Đóng
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
      title="Chi tiết thôi việc & Sa thải"
      description="Quản lý phỏng vấn, bàn giao tài sản và quyết toán"
      icon={<PersonXFill size={18} />}
      footer={footer}
    >
      <div className="flex flex-col gap-3.5 text-xs">
        {/* Nhân sự card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm shrink-0">
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
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm truncate">{data.employee?.fullName}</span>
              <TermTypeBadge type={data.type} />
            </div>
            <div className="text-slate-500 text-[11px] truncate mt-0.5">{data.employee?.departmentName || 'Chung'}</div>
            <div className="mt-1">
              <TermStatusBadge status={data.status} />
            </div>
          </div>
        </div>

        {/* Lý do & Ngày làm việc */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">Lý do chấm dứt</span>
            <span className="text-slate-800 font-medium text-xs block mt-0.5">{data.reason || '—'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div>
              <span className="text-slate-400 block text-[11px]">Ngày đề xuất</span>
              <span className="text-slate-700 font-semibold text-xs">
                {new Date(data.requestDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Ngày làm việc cuối</span>
              <input
                type="date"
                value={lastWorkingDay}
                onChange={(e) => setLastWorkingDay(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-medium mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* Phỏng vấn thôi việc (Exit Interview) */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 flex flex-col gap-2">
          <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
            Phỏng vấn thôi việc & Đàm phán
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={isStayNegotiated}
              onChange={(e) => setIsStayNegotiated(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span>Đã đàm phán giữ chân nhưng nhân viên giữ nguyện vọng thôi việc</span>
          </label>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Ghi chú phỏng vấn thôi việc</label>
            <textarea
              rows={2}
              value={exitInterviewNotes}
              onChange={(e) => setExitInterviewNotes(e.target.value)}
              placeholder="Nguyện vọng cá nhân, định hướng nghề nghiệp, phản hồi công ty..."
              className="w-full p-2 text-xs rounded border border-slate-300"
            />
          </div>
        </div>

        {/* Ý kiến giám đốc */}
        <div>
          <label className="block text-slate-500 font-medium mb-1">Ý kiến Ban Giám đốc</label>
          <textarea
            rows={2}
            value={directorNote}
            onChange={(e) => setDirectorNote(e.target.value)}
            placeholder="Ý kiến phê duyệt hoặc chỉ đạo bàn giao..."
            className="w-full p-2 text-xs rounded border border-slate-300"
          />
        </div>

        {/* Trạng thái khóa tài khoản */}
        {data.status === 'Completed' && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2 font-medium">
            <CheckCircleFill size={16} className="text-emerald-600 shrink-0" />
            <span>Đã hoàn tất thủ tục bàn giao và khóa tài khoản nhân sự trong hệ thống.</span>
          </div>
        )}
      </div>
    </Offcanvas>
  );
};

// ─── OFFCANVAS TẠO MỚI THÔI VIỆC (width="400px") ──────────────────────────────

interface CreateTermProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeItem[];
  onSuccess: () => Promise<void>;
}

const CreateTerminationOffcanvas: React.FC<CreateTermProps> = ({
  isOpen,
  onClose,
  employees,
  onSuccess,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedEmpName, setSelectedEmpName] = useState<string>('');
  const [type, setType] = useState<string>('RESIGNATION');
  const [lastWorkingDay, setLastWorkingDay] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
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
  };

  const handleSubmit = async () => {
    if (!selectedEmpId) return alert('Vui lòng chọn nhân sự');
    if (!reason.trim()) return alert('Vui lòng nhập lý do chấm dứt');

    setLoading(true);
    try {
      const res = await fetch('/api/hr/terminations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          type,
          lastWorkingDay: lastWorkingDay ? new Date(lastWorkingDay) : null,
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
      title="Tạo yêu cầu thôi việc / Sa thải"
      description="Lập tờ trình chấm dứt hợp đồng lao động"
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

        {/* Hình thức */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Hình thức chấm dứt <span className="text-rose-500">*</span>
          </label>
          <Select
            options={[
              { value: 'RESIGNATION', label: 'Thôi việc tự nguyện' },
              { value: 'DISMISSAL', label: 'Sa thải / Chấm dứt kỷ luật' },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        {/* Ngày làm việc cuối */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Dự kiến ngày làm việc cuối
          </label>
          <input
            type="date"
            value={lastWorkingDay}
            onChange={(e) => setLastWorkingDay(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Lý do: tự động chiếm hết chiều cao khả dụng */}
        <div className="flex-1 flex flex-col min-h-0" style={{ flex: '1 1 0%' }}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lý do chấm dứt <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nêu rõ nguyện vọng cá nhân, lý do thôi việc hoặc căn cứ kỷ luật vi phạm..."
            className="flex-1 w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
          />
        </div>
      </div>
    </Offcanvas>
  );
};

export default TerminationsPage;
