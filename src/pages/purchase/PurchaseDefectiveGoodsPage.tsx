import React, { useState, useEffect, useMemo } from 'react';
import {
  ExclamationTriangle,
  Check2Circle,
  HourglassSplit,
  Truck,
  BoxSeam,
  CashCoin,
  ArrowRepeat,
  ArrowCounterclockwise,
  Printer,
  ChevronRight,
  ChevronDown,
  CalendarCheck,
  FileEarmarkText,
  Building,
  Telephone,
  GeoAlt,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useAuth } from '../../context/AuthContext';
import type { ModernStepItem } from '../../types';

const formatCurrency = (val: number | null | undefined) =>
  val && Number(val) > 0 ? Number(val).toLocaleString('vi-VN') + ' ₫' : '0 ₫';

const formatEpochToVNDate = (val: any) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('vi-VN');
  } catch {
    return String(val);
  }
};

interface DefectiveItem {
  productName: string;
  model: string;
  quantity: number;
  passQuantity: number;
  failQuantity: number;
  unit: string;
  unitPrice: number;
  failedAmount: number;
  comment: string;
}

interface DefectiveGoodsRecord {
  id: string;
  code: string;
  qcResult: string;
  executionTime: string;
  inspectorName: string;
  purchaseOrderId: string;
  purchaseOrderCode: string;
  supplierId: string | null;
  supplierName: string;
  supplierPhone: string;
  supplierAddress: string;
  status: 'PENDING' | 'RESOLVED';
  totalFailedQty: number;
  totalFailedAmount: number;
  defectiveItems: DefectiveItem[];
  resolution?: {
    status: 'PENDING' | 'RESOLVED';
    action: 'DEBT_DEDUCTION' | 'SUPPLEMENTARY_GOODS' | 'REFUND' | 'RETURN_TO_SUPPLIER' | null;
    actionLabel: string;
    amount?: number;
    note?: string;
    commitmentDate?: string | null;
    resolvedAt?: string;
    resolvedBy?: string;
  };
  notes: string;
}

export const PurchaseDefectiveGoodsPage: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<DefectiveGoodsRecord[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [resolvedCount, setResolvedCount] = useState<number>(0);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Offcanvas xử lý với NCC
  const [selectedRecord, setSelectedRecord] = useState<DefectiveGoodsRecord | null>(null);
  const [showResolveOffcanvas, setShowResolveOffcanvas] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [resolveAction, setResolveAction] = useState<'DEBT_DEDUCTION' | 'SUPPLEMENTARY_GOODS' | 'REFUND' | 'RETURN_TO_SUPPLIER'>('DEBT_DEDUCTION');
  const [resolveAmount, setResolveAmount] = useState<number>(0);
  const [resolveCommitmentDate, setResolveCommitmentDate] = useState<string>('');
  const [resolveNote, setResolveNote] = useState<string>('');
  const [resolvedByName, setResolvedByName] = useState<string>('');

  // Tải dữ liệu từ backend API
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchase/defective-goods');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.items || []);
        setPendingCount(data.pendingCount || 0);
        setResolvedCount(data.resolvedCount || 0);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hàng lỗi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Danh sách nhà cung cấp duy nhất cho bộ lọc
  const supplierOptions = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.supplierName).filter(Boolean)));
    return [
      { label: 'Tất cả nhà cung cấp', value: 'all' },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [records]);

  // Lọc dữ liệu theo Bước và Bộ lọc
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Lọc theo Bước 1 (PENDING) hoặc Bước 2 (RESOLVED)
      if (currentStep === 1 && r.status !== 'PENDING') return false;
      if (currentStep === 2 && r.status !== 'RESOLVED') return false;

      // Lọc theo nhà cung cấp
      if (supplierFilter !== 'all' && r.supplierName.toLowerCase() !== supplierFilter.toLowerCase()) {
        return false;
      }

      // Lọc theo phương án (chỉ ở Bước 2)
      if (currentStep === 2 && actionFilter !== 'all' && r.resolution?.action !== actionFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = r.code.toLowerCase().includes(q);
        const matchPO = r.purchaseOrderCode.toLowerCase().includes(q);
        const matchSupplier = r.supplierName.toLowerCase().includes(q);
        const matchItem = r.defectiveItems.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchCode && !matchPO && !matchSupplier && !matchItem) return false;
      }

      return true;
    });
  }, [records, currentStep, supplierFilter, actionFilter, searchTerm]);

  // Nhóm các thông tin thuộc cùng nhà cung cấp lại thành nhóm
  interface SupplierGroup {
    supplierKey: string;
    supplierName: string;
    supplierAddress: string;
    supplierPhone: string;
    records: DefectiveGoodsRecord[];
    totalDamage: number;
    totalFailedQty: number;
    uniquePOCodes: string[];
  }

  const supplierGroups = useMemo<SupplierGroup[]>(() => {
    const map = new Map<string, SupplierGroup>();

    filteredRecords.forEach((rec) => {
      const key = rec.supplierName?.trim() || 'Chưa rõ nhà cung cấp';
      if (!map.has(key)) {
        map.set(key, {
          supplierKey: key,
          supplierName: rec.supplierName || 'Chưa rõ nhà cung cấp',
          supplierAddress: rec.supplierAddress || '',
          supplierPhone: rec.supplierPhone || '',
          records: [],
          totalDamage: 0,
          totalFailedQty: 0,
          uniquePOCodes: [],
        });
      }
      const grp = map.get(key)!;
      if (!grp.supplierAddress && rec.supplierAddress) {
        grp.supplierAddress = rec.supplierAddress;
      }
      if (!grp.supplierPhone && rec.supplierPhone) {
        grp.supplierPhone = rec.supplierPhone;
      }
      grp.records.push(rec);
      grp.totalDamage += rec.totalFailedAmount || 0;
      grp.totalFailedQty += rec.totalFailedQty || 0;
      if (rec.purchaseOrderCode && !grp.uniquePOCodes.includes(rec.purchaseOrderCode)) {
        grp.uniquePOCodes.push(rec.purchaseOrderCode);
      }
    });

    return Array.from(map.values());
  }, [filteredRecords]);

  // Trạng thái ẩn / hiện của các nhóm nhà cung cấp (mặc định mở rộng để thấy nội dung)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (supplierGroups.length > 0) {
      setExpandedGroups((prev) => {
        const next = { ...prev };
        supplierGroups.forEach((g) => {
          if (next[g.supplierKey] === undefined) {
            next[g.supplierKey] = true;
          }
        });
        return next;
      });
    }
  }, [supplierGroups]);

  const toggleGroup = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllGroups = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    supplierGroups.forEach((g) => {
      next[g.supplierKey] = expand;
    });
    setExpandedGroups(next);
  };

  // Phân trang theo danh sách nhóm nhà cung cấp
  const totalPages = Math.ceil(supplierGroups.length / pageSize) || 1;
  const pagedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return supplierGroups.slice(start, start + pageSize);
  }, [supplierGroups, currentPage, pageSize]);

  // Mở Offcanvas xử lý
  const handleOpenResolve = (rec: DefectiveGoodsRecord) => {
    setSelectedRecord(rec);
    setResolveAction(rec.resolution?.action || 'DEBT_DEDUCTION');
    setResolveAmount(rec.resolution?.amount !== undefined ? rec.resolution.amount : rec.totalFailedAmount);
    setResolveCommitmentDate(rec.resolution?.commitmentDate ? rec.resolution.commitmentDate.slice(0, 10) : '');
    setResolveNote(rec.resolution?.note || '');
    setResolvedByName(rec.resolution?.resolvedBy || user?.name || 'Lê Công Vụ');
    setShowResolveOffcanvas(true);
  };

  // Xác nhận xử lý với NCC
  const handleConfirmResolve = async () => {
    if (!selectedRecord) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/purchase/defective-goods/${encodeURIComponent(selectedRecord.id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: resolveAction,
          amount: resolveAmount,
          commitmentDate: resolveCommitmentDate,
          note: resolveNote,
          resolvedBy: resolvedByName,
        }),
      });

      if (res.ok) {
        setShowResolveOffcanvas(false);
        await fetchData();
      } else {
        const errData = await res.json();
        alert(`Lỗi: ${errData.error || 'Không thể lưu phương án'}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hoàn tác về chờ xử lý (Reopen)
  const handleReopen = async (rec: DefectiveGoodsRecord) => {
    if (!window.confirm(`Bạn có chắc chắn muốn chuyển biên bản ${rec.code} về trạng thái Chờ xử lý?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/purchase/defective-goods/${encodeURIComponent(rec.id)}/reopen`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  // Danh sách các bước StepPage
  const steps: ModernStepItem[] = [
    {
      id: 'pending',
      num: 1,
      title: 'Danh sách hàng lỗi',
      desc: 'Chờ làm việc & thỏa thuận với nhà cung cấp',
      badge: `${pendingCount} biên bản`,
      badgeVariant: 'warning',
    },
    {
      id: 'resolved',
      num: 2,
      title: 'Đã xử lý',
      desc: 'Đã chốt bù hàng, cấn trừ công nợ hoặc hoàn tiền',
      badge: `${resolvedCount} biên bản`,
      badgeVariant: 'success',
    },
  ];

  return (
    <div className="purchase-defective-goods-page h-full">
      <StepPage
        title="Danh sách hàng lỗi"
        description="Quản lý hàng lỗi từ kiểm tra IQC kho, phối hợp làm việc và cấn trừ công nợ với nhà cung cấp"
        icon="bi-exclamation-triangle"
        color="amber"
        steps={steps}
        currentStep={currentStep}
        onStepChange={(step) => {
          setCurrentStep(step);
          setCurrentPage(1);
        }}
        tickerContext="suppliers"
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* THANH CÔNG CỤ TABLETOOLBAR */}
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            searchPlaceholder="Tìm mã biên bản QC, mã đơn PO, tên NCC, tên mặt hàng..."
            filters={[
              {
                id: 'supplier',
                value: supplierFilter,
                onChange: (val) => {
                  setSupplierFilter(val);
                  setCurrentPage(1);
                },
                options: supplierOptions,
                minWidth: '180px',
              },
              ...(currentStep === 2
                ? [
                    {
                      id: 'action',
                      value: actionFilter,
                      onChange: (val: string) => {
                        setActionFilter(val);
                        setCurrentPage(1);
                      },
                      options: [
                        { label: 'Tất cả phương án', value: 'all' },
                        { label: 'Cấn trừ công nợ (TK 331)', value: 'DEBT_DEDUCTION' },
                        { label: 'NCC gửi bù hàng mới', value: 'SUPPLEMENTARY_GOODS' },
                        { label: 'NCC hoàn lại tiền', value: 'REFUND' },
                        { label: 'Xuất trả lại hàng NCC', value: 'RETURN_TO_SUPPLIER' },
                      ],
                      minWidth: '190px',
                    },
                  ]
                : []),
            ]}
            rightActions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allExpanded = supplierGroups.every((g) => expandedGroups[g.supplierKey]);
                    toggleAllGroups(!allExpanded);
                  }}
                  title="Ẩn / Hiện tất cả nhà cung cấp"
                >
                  <span className="text-xs font-semibold">
                    {supplierGroups.length > 0 && supplierGroups.every((g) => expandedGroups[g.supplierKey])
                      ? 'Thu gọn tất cả'
                      : 'Mở rộng tất cả'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  title="Tải lại dữ liệu"
                >
                  <ArrowRepeat className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline ml-1 text-xs font-semibold">Làm mới</span>
                </Button>
              </div>
            }
          />

          {/* BẢNG DỮ LIỆU CHÍNH */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <FullWidthTable loading={loading} loadingText="Đang tải danh sách hàng lỗi từ QC...">
              <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }}>
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11.5px] font-bold uppercase tracking-wider sticky top-0 z-10 select-none shadow-sm">
                  <tr>
                    <th style={{ padding: '9px 12px', width: '36%' }}>Nhà cung cấp & Đơn mua hàng</th>
                    <th style={{ padding: '9px 12px', width: '26%' }}>Biên bản QC</th>
                    <th style={{ padding: '9px 12px', width: '18%', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: '9px 12px', width: '20%', textAlign: 'right' }}>Tổng thiệt hại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
                  {pagedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-slate-400">
                        <BoxSeam className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="text-sm font-medium">
                          {currentStep === 1
                            ? 'Không có đợt nhận hàng nào đang chờ xử lý lỗi với nhà cung cấp.'
                            : 'Chưa có hồ sơ hàng lỗi nào được chốt phương án xử lý.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pagedGroups.map((group) => {
                      const isExpanded = expandedGroups[group.supplierKey] ?? true;
                      return (
                        <React.Fragment key={group.supplierKey}>
                          {/* ── DÒNG TIÊU ĐỀ NHÓM NHÀ CUNG CẤP (ẨN / HIỆN ĐƯỢC) ── */}
                          <tr
                            onClick={() => toggleGroup(group.supplierKey)}
                            className="bg-slate-100/90 hover:bg-slate-200/70 cursor-pointer select-none transition-colors border-y border-slate-200"
                            title="Nhấn để ẩn/hiện danh sách biên bản của nhà cung cấp này"
                          >
                            {/* Cột 1: Tên nhà cung cấp + Địa chỉ dưới tên + Badge */}
                            <td style={{ padding: '8px 12px' }}>
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  className="p-1 mt-0.5 rounded hover:bg-slate-300/60 text-slate-600 transition-colors"
                                  onClick={(e) => toggleGroup(group.supplierKey, e)}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-[13px]">{group.supplierName}</span>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                      {group.records.length} biên bản
                                    </span>
                                  </div>
                                  {/* Địa chỉ nhà cung cấp dưới tên nhà cung cấp */}
                                  {group.supplierAddress ? (
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-normal">
                                      <GeoAlt size={10} className="text-slate-400 shrink-0" />
                                      <span>{group.supplierAddress}</span>
                                      {group.supplierPhone && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span>{group.supplierPhone}</span>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    group.supplierPhone && (
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-normal">
                                        <Telephone size={10} className="text-slate-400 shrink-0" />
                                        <span>{group.supplierPhone}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Cột 2: Biên bản QC (Tóm tắt số đợt kiểm tra) */}
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                              <span className="text-slate-500 text-[11.5px]">
                                {group.records.length} đợt kiểm tra IQC
                              </span>
                            </td>

                            {/* Cột 3: Trạng thái (Tóm tắt) */}
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <span className="text-slate-500 text-[11px]">
                                {currentStep === 1 ? 'Chờ xử lý' : 'Đã chốt'}
                              </span>
                            </td>

                            {/* Cột 4: Tổng thiệt hại (Tổng của nhóm NCC) */}
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                              <div className="font-extrabold text-red-600 text-[13px]">
                                {group.totalDamage > 0 ? formatCurrency(group.totalDamage) : 'Chưa có giá'}
                              </div>
                              <div className="text-[10.5px] text-slate-500">
                                {group.totalFailedQty} sản phẩm lỗi
                              </div>
                            </td>
                          </tr>

                          {/* ── CÁC DÒNG BIÊN BẢN CON THUỘC NHÀ CUNG CẤP ── */}
                          {isExpanded &&
                            group.records.map((rec) => (
                              <tr
                                key={rec.id}
                                onClick={() => handleOpenResolve(rec)}
                                className="hover:bg-amber-50/50 cursor-pointer transition-colors bg-white border-b border-slate-100 group select-none"
                                title="Nhấn vào dòng để mở chi tiết & Xử lý hàng lỗi với NCC"
                              >
                                {/* Cột 1: Thông tin Đơn mua hàng đưa vào cột 1, bên trong tên nhà cung cấp */}
                                <td style={{ padding: '9px 12px', paddingLeft: '32px', verticalAlign: 'top' }}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-300 font-mono">└─</span>
                                    <div className="font-bold text-sky-700 text-[12.5px] group-hover:underline">
                                      {rec.purchaseOrderCode}
                                    </div>
                                  </div>
                                  <div className="text-[10.5px] text-slate-400 pl-4 mt-0.5">
                                    Đơn mua hàng PO
                                  </div>
                                </td>

                                {/* Cột 2: Biên bản QC (BỎ TẤT CẢ ICON TRƯỚC MÃ THEO YÊU CẦU) */}
                                <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                                  <div className="font-bold text-amber-800 text-[12.5px]">
                                    {rec.code}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                    <span>{formatEpochToVNDate(rec.executionTime)}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600 font-medium">{rec.inspectorName}</span>
                                  </div>
                                </td>

                                {/* Cột 3: Tách trạng thái "Lỗi một phần" thành một cột riêng */}
                                <td style={{ padding: '9px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                                  <div>
                                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                      {rec.qcResult || 'Lỗi một phần'}
                                    </span>
                                  </div>
                                  {currentStep === 2 && rec.resolution?.actionLabel && (
                                    <div className="mt-1">
                                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {rec.resolution.actionLabel}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Cột 4: Tổng thiệt hại */}
                                <td style={{ padding: '9px 12px', verticalAlign: 'top', textAlign: 'right' }}>
                                  <div className="font-bold text-red-600 text-[13px]">
                                    {rec.totalFailedAmount > 0 ? formatCurrency(rec.totalFailedAmount) : 'Chưa có giá'}
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 mt-0.5">
                                    {rec.totalFailedQty} sản phẩm lỗi ({rec.defectiveItems.length} mặt hàng)
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </FullWidthTable>
          </div>

          {/* PHÂN TRANG CHUẨN ENTERPRISE */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </StepPage>

      {/* ════════════════════════════════════════════════════════════════════
          OFFCANVAS XỬ LÝ VỚI NHÀ CUNG CẤP (WIDTH = 400PX CHUẨN AGENTS.MD)
          ════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={showResolveOffcanvas}
        onClose={() => setShowResolveOffcanvas(false)}
        title="Xử lý hàng lỗi với NCC"
        width="400px"
        icon={<ExclamationTriangle size={18} className="text-amber-600" />}
        confirmText="Xác nhận & Cập nhật"
        cancelText="Đóng"
        confirmVariant="primary"
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmResolve}
        onCancel={() => setShowResolveOffcanvas(false)}
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            {/* Thẻ tóm tắt đơn mua & Nhà cung cấp */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-medium shrink-0 mr-2">Nhà cung cấp:</span>
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-[12.5px]">{selectedRecord.supplierName}</div>
                  {selectedRecord.supplierAddress && (
                    <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5 font-normal">
                      <GeoAlt size={10} className="text-slate-400 shrink-0" />
                      <span>{selectedRecord.supplierAddress}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Đơn mua hàng (PO):</span>
                <span className="font-bold text-sky-700">{selectedRecord.purchaseOrderCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Biên bản kiểm QC:</span>
                <span className="font-semibold text-amber-800">{selectedRecord.code}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-bold">Tổng hàng lỗi:</span>
                <span className="font-extrabold text-red-600">
                  {selectedRecord.totalFailedQty} sản phẩm ({formatCurrency(selectedRecord.totalFailedAmount)})
                </span>
              </div>
            </div>

            {/* Danh sách mặt hàng lỗi chi tiết */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs">Mặt hàng & Quy cách lỗi chi tiết:</label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedRecord.defectiveItems.length} mặt hàng
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {selectedRecord.defectiveItems.map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11.5px] space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-bold text-slate-900 leading-tight">
                        {item.productName}{' '}
                        {item.model ? <span className="text-slate-500 font-normal">({item.model})</span> : ''}
                      </span>
                      <span className="shrink-0 font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[11px]">
                        Lỗi: {item.failQuantity} {item.unit}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 flex justify-between pt-1 border-t border-slate-200/60">
                      <span>
                        Tổng nhận: <strong className="text-slate-700">{item.quantity}</strong> • Đạt:{' '}
                        <strong className="text-emerald-700">{item.passQuantity}</strong>
                      </span>
                      {item.unitPrice > 0 && (
                        <span>
                          Đơn giá: <strong className="text-slate-700">{formatCurrency(item.unitPrice)}</strong>
                        </span>
                      )}
                    </div>
                    {item.failedAmount > 0 && (
                      <div className="text-[10.5px] text-right font-semibold text-red-600">
                        Thiệt hại: {formatCurrency(item.failedAmount)}
                      </div>
                    )}
                    {item.comment && (
                      <div className="text-[10.5px] text-amber-800 italic bg-amber-50/70 p-1.5 rounded border border-amber-200/60">
                        Lý do lỗi từ QC: {item.comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chọn phương án xử lý với NCC */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <span>Phương án thỏa thuận với NCC:</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    value: 'DEBT_DEDUCTION',
                    label: 'Cấn trừ vào công nợ phải trả NCC (TK 331)',
                    sub: 'Tự động giảm tiền nợ phải trả NCC trên phần mềm',
                  },
                  {
                    value: 'SUPPLEMENTARY_GOODS',
                    label: 'Nhà cung cấp gửi bù hàng đợt sau',
                    sub: 'Kho sẽ mở lệnh chờ nhận bù hàng mới đạt chuẩn',
                  },
                  {
                    value: 'REFUND',
                    label: 'Nhà cung cấp hoàn lại tiền mặt / chuyển khoản',
                    sub: 'Kế toán ghi nhận thu tiền hoàn trả về tài khoản',
                  },
                  {
                    value: 'RETURN_TO_SUPPLIER',
                    label: 'Xuất trả lại toàn bộ hàng lỗi cho NCC',
                    sub: 'Kho xuất hàng từ Kho lỗi (KHO-LOI) trả về NCC',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      resolveAction === opt.value
                        ? 'border-sky-500 bg-sky-50/60 font-semibold text-sky-900 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolveAction"
                      value={opt.value}
                      checked={resolveAction === opt.value}
                      onChange={() => setResolveAction(opt.value as any)}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-[12px]">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Số tiền cấn trừ / hoàn lại */}
            {(resolveAction === 'DEBT_DEDUCTION' || resolveAction === 'REFUND') && (
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  {resolveAction === 'DEBT_DEDUCTION' ? 'Số tiền cấn trừ công nợ (VNĐ):' : 'Số tiền NCC hoàn lại (VNĐ):'}
                </label>
                <Input
                  type="number"
                  value={resolveAmount}
                  onChange={(e) => setResolveAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="font-bold text-sky-800 text-[13px]"
                />
              </div>
            )}

            {/* Ngày hẹn / cam kết của NCC */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                {resolveAction === 'SUPPLEMENTARY_GOODS'
                  ? 'Hạn NCC cam kết giao bù hàng:'
                  : resolveAction === 'REFUND'
                  ? 'Hạn NCC cam kết chuyển tiền hoàn:'
                  : 'Thời hạn giải quyết cam kết:'}
              </label>
              <Input
                type="date"
                value={resolveCommitmentDate}
                onChange={(e) => setResolveCommitmentDate(e.target.value)}
              />
            </div>

            {/* Ghi chú thỏa thuận với NCC */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nội dung thỏa thuận & biên bản làm việc:</label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Nhập ghi chú chi tiết kết quả làm việc với người đại diện nhà cung cấp..."
                rows={3}
                className="w-full text-xs p-2 rounded border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Người thực hiện làm việc */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nhân viên Mua hàng đại diện làm việc:</label>
              <Input
                type="text"
                value={resolvedByName}
                onChange={(e) => setResolvedByName(e.target.value)}
                placeholder="Tên nhân viên mua hàng..."
              />
            </div>

            {/* Nếu đã chốt phương án trước đó, hỗ trợ hoàn tác về Chờ xử lý */}
            {selectedRecord.status === 'RESOLVED' && (
              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  onClick={async () => {
                    await handleReopen(selectedRecord);
                    setShowResolveOffcanvas(false);
                  }}
                >
                  <ArrowCounterclockwise size={13} />
                  Hoàn tác về Chờ xử lý với NCC
                </button>
              </div>
            )}
          </div>
        )}
      </Offcanvas>
    </div>
  );
};

export default PurchaseDefectiveGoodsPage;
