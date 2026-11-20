import React, { useState, useEffect, useMemo } from 'react';
import {
  ExclamationTriangle,
  Check2Circle,
  HourglassSplit,
  Truck,
  BoxSeam,
  CashCoin,
  ArrowRepeat,
  Printer,
  ChevronRight,
  ShieldExclamation,
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

  // Phân trang
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

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
      const res = await fetch(`/api/purchase/defective-goods/${selectedRecord.id}/resolve`, {
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
      const res = await fetch(`/api/purchase/defective-goods/${rec.id}/reopen`, {
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
              <table className="w-full text-left border-collapse" style={{ minWidth: '980px' }}>
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11.5px] font-bold uppercase tracking-wider sticky top-0 z-10 select-none shadow-sm">
                  <tr>
                    <th style={{ padding: '8px 12px', width: '160px' }}>Biên bản QC / Thời gian</th>
                    <th style={{ padding: '8px 12px', width: '220px' }}>Đơn mua hàng / Nhà cung cấp</th>
                    <th style={{ padding: '8px 12px' }}>Mặt hàng & Quy cách lỗi</th>
                    <th style={{ padding: '8px 12px', width: '130px', textAlign: 'right' }}>Giá trị thiệt hại</th>
                    {currentStep === 1 ? (
                      <th style={{ padding: '8px 12px', width: '190px' }}>Hiện trạng / Lý do lỗi</th>
                    ) : (
                      <th style={{ padding: '8px 12px', width: '200px' }}>Phương án xử lý đã chốt</th>
                    )}
                    <th style={{ padding: '8px 12px', width: '120px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
                  {pagedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <BoxSeam className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                        <p className="text-sm font-medium">
                          {currentStep === 1
                            ? 'Không có đợt nhận hàng nào đang chờ xử lý lỗi với nhà cung cấp.'
                            : 'Chưa có hồ sơ hàng lỗi nào được chốt phương án xử lý.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pagedRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-amber-50/40 transition-colors"
                      >
                        {/* Cột 1: Mã QC & Thời gian */}
                        <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                          <div className="font-bold text-amber-800 text-[12.5px] flex items-center gap-1.5">
                            <ShieldExclamation className="text-amber-600 shrink-0" size={14} />
                            <span>{rec.code}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <span>{formatEpochToVNDate(rec.executionTime)}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-medium">{rec.inspectorName}</span>
                          </div>
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              {rec.qcResult}
                            </span>
                          </div>
                        </td>

                        {/* Cột 2: Đơn PO & Nhà cung cấp */}
                        <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                          <div className="font-bold text-sky-800 text-[12.5px] flex items-center gap-1">
                            <Building className="text-sky-600 shrink-0" size={13} />
                            <span>{rec.supplierName}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700 mt-1">
                            PO: <span className="text-sky-700 underline underline-offset-2">{rec.purchaseOrderCode}</span>
                          </div>
                          {rec.supplierPhone && (
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Telephone size={10} className="text-slate-400" />
                              <span>{rec.supplierPhone}</span>
                            </div>
                          )}
                        </td>

                        {/* Cột 3: Danh sách mặt hàng lỗi */}
                        <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                          <div className="space-y-1.5">
                            {rec.defectiveItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-50/80 p-2 rounded border border-slate-200/80 text-[11.5px]"
                              >
                                <div className="flex items-center justify-between font-semibold text-slate-900">
                                  <span>{item.productName} {item.model ? `(${item.model})` : ''}</span>
                                  <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                    Lỗi: {item.failQuantity} {item.unit}
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center justify-between">
                                  <span>Tổng nhận: {item.quantity} • Đạt: {item.passQuantity}</span>
                                  {item.unitPrice > 0 && (
                                    <span>Giá nhập: {formatCurrency(item.unitPrice)}</span>
                                  )}
                                </div>
                                {item.comment && (
                                  <div className="text-[10.5px] text-amber-800 italic mt-1 bg-amber-50/60 p-1 rounded">
                                    Lỗi: {item.comment}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Cột 4: Giá trị thiệt hại */}
                        <td style={{ padding: '9px 12px', verticalAlign: 'top', textAlign: 'right' }}>
                          <div className="font-bold text-red-600 text-[13px]">
                            {rec.totalFailedAmount > 0 ? formatCurrency(rec.totalFailedAmount) : 'Chưa có giá'}
                          </div>
                          <div className="text-[10.5px] text-slate-500 mt-0.5">
                            Tổng {rec.totalFailedQty} sản phẩm lỗi
                          </div>
                        </td>

                        {/* Cột 5: Bước 1 (Ghi chú QC) hoặc Bước 2 (Phương án đã chốt) */}
                        {currentStep === 1 ? (
                          <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                            <div className="text-[11px] text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
                              {rec.notes || 'Biên bản phát hiện sản phẩm không đạt tiêu chuẩn kỹ thuật khi nhận hàng tại cửa kho.'}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <HourglassSplit size={10} /> Chờ Mua hàng xử lý
                              </span>
                            </div>
                          </td>
                        ) : (
                          <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                            {(() => {
                              const action = rec.resolution?.action;
                              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                              if (action === 'DEBT_DEDUCTION') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                              if (action === 'SUPPLEMENTARY_GOODS') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                              if (action === 'REFUND') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                              if (action === 'RETURN_TO_SUPPLIER') badgeColor = 'bg-red-50 text-red-700 border-red-200';

                              return (
                                <div className="space-y-1">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
                                    {rec.resolution?.actionLabel || 'Đã chốt phương án'}
                                  </span>
                                  {rec.resolution?.amount && rec.resolution.amount > 0 ? (
                                    <div className="text-[11px] font-semibold text-slate-800">
                                      Số tiền: <span className="text-emerald-700">{formatCurrency(rec.resolution.amount)}</span>
                                    </div>
                                  ) : null}
                                  {rec.resolution?.commitmentDate && (
                                    <div className="text-[10.5px] text-slate-500">
                                      Hạn cam kết: {formatEpochToVNDate(rec.resolution.commitmentDate)}
                                    </div>
                                  )}
                                  {rec.resolution?.note && (
                                    <div className="text-[10.5px] text-slate-600 italic line-clamp-2">
                                      &quot;{rec.resolution.note}&quot;
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        {/* Cột 6: Thao tác */}
                        <td style={{ padding: '9px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          {currentStep === 1 ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full text-[11px] font-bold shadow-sm"
                              onClick={() => handleOpenResolve(rec)}
                            >
                              Xử lý với NCC
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-[10.5px] font-semibold text-sky-700 border-sky-300"
                                onClick={() => handleOpenResolve(rec)}
                              >
                                Chỉnh sửa
                              </Button>
                              <button
                                type="button"
                                className="text-[10.5px] text-slate-400 hover:text-red-600 underline text-center mt-0.5"
                                onClick={() => handleReopen(rec)}
                              >
                                Hoàn tác
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
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
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nhà cung cấp:</span>
                <span className="font-bold text-slate-900 text-[12.5px]">{selectedRecord.supplierName}</span>
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

            {/* Danh sách mặt hàng lỗi tóm tắt */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Mặt hàng lỗi cần làm việc:</label>
              <div className="max-h-28 overflow-y-auto space-y-1 p-1 bg-white border border-slate-200 rounded">
                {selectedRecord.defectiveItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] p-1 bg-slate-50 rounded">
                    <span className="font-medium text-slate-800 truncate mr-2">{item.productName}</span>
                    <span className="font-bold text-red-600 shrink-0">Lỗi: {item.failQuantity} {item.unit}</span>
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
          </div>
        )}
      </Offcanvas>
    </div>
  );
};

export default PurchaseDefectiveGoodsPage;
