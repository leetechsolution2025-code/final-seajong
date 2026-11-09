import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/common/Modal";
import { Offcanvas } from "@/components/common/Offcanvas";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { canManageProdDefects } from "@/lib/production-permissions";
import { Check2Circle, ArrowRightCircle, LockFill, ArrowClockwise } from "react-bootstrap-icons";

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  TECH_EVALUATING: 'Đang chẩn đoán',
  WAITING_APPROVAL: 'Chờ duyệt',
  WAITING_INVENTORY: 'Chờ kho',
  PROCESSING: 'Đang xử lý',
  WAITING_QC: 'Chờ QC kiểm tra',
  COMPLETED: 'Hoàn tất'
};

interface DefectProcessModalProps {
  defectId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export function DefectProcessModal({ defectId, onClose, onRefresh }: DefectProcessModalProps) {
  const { data: session } = useSession();
  const isProdAdmin = canManageProdDefects(session?.user);
  const [defect, setDefect] = useState<any>(null);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('Sửa chữa tại chỗ');
  const [requireQc, setRequireQc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [selectedBomItemIds, setSelectedBomItemIds] = useState<Set<string>>(new Set());
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [returnQty, setReturnQty] = useState<number>(1);
  const isBomLocked = defect?.status !== 'NEW' && defect?.status !== 'TECH_EVALUATING';
  const toast = useToast();

  const mutate = useCallback(() => {
    if (!defectId) {
      setDefect(null);
      return;
    }
    fetch(`/api/production/defects/${defectId}`)
      .then(r => r.json())
      .then(data => setDefect(data))
      .catch(console.error);
  }, [defectId]);

  useEffect(() => {
    mutate();
  }, [mutate]);

  const prevDefectId = React.useRef<string | null>(null);

  useEffect(() => {
    if (defect && defect.id && defect.id !== prevDefectId.current) {
      prevDefectId.current = defect.id;
      setNote(defect.repairPlan || '');
      if (defect.resolution) {
        setResolution(defect.resolution);
      }
      if (Array.isArray(defect.selectedBomItemIds) && defect.selectedBomItemIds.length > 0) {
        setSelectedBomItemIds(new Set(defect.selectedBomItemIds));
      } else {
        setSelectedBomItemIds(new Set());
      }
      if (defect.editedQuantities && Object.keys(defect.editedQuantities).length > 0) {
        setEditedQuantities(defect.editedQuantities);
      } else {
        setEditedQuantities({});
      }
    }
  }, [defect]);

  useEffect(() => {
    if (defect?.quantity) {
      setReturnQty(Number(defect.quantity) || 1);
    }
  }, [defect?.quantity]);

  if (!defectId) return null;

  const handleProcess = async (
    action: string,
    nextStatus: string,
    bomUpdates?: any[],
    customReturnQty?: number
  ) => {
    if (!isProdAdmin) {
      toast.error(
        'Không có quyền',
        'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xử lý hàng lỗi!'
      );
      return;
    }
    const finalNote =
      note ||
      defect?.repairPlan ||
      (action === 'TIẾP TỤC XỬ LÝ' || action === 'NHẬN LINH KIỆN & XỬ LÝ'
        ? 'Tiếp tục xử lý sau khi kho xuất vật tư'
        : action === 'HOÀN THÀNH'
        ? 'Hoàn tất xử lý và chuyển QC kiểm tra'
        : '');
    if (!finalNote && action !== 'ĐÓNG HỒ SƠ' && action !== 'HOÀN THÀNH') {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập báo cáo nội dung xử lý!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/production/defects/${defectId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          nextStatus,
          note: finalNote,
          performedBy: session?.user?.name || 'Hệ thống',
          bomUpdates,
          returnQty: customReturnQty ?? returnQty,
          requireQc,
        }),
      });

      if (res.ok) {
        toast.success('Thành công', 'Đã lưu quyết định xử lý!');
        mutate();
        if (onRefresh) onRefresh();
      } else {
        toast.error('Thất bại', 'Có lỗi xảy ra trong quá trình xử lý!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQcReview = async (isPassed: boolean) => {
    if (!defect?.qcInspection?.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/qa/inspections/${defect.qcInspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: isPassed ? 'Đạt' : 'Không đạt',
          notes: isPassed
            ? 'Đã kiểm tra đạt tiêu chuẩn chất lượng xuất xưởng OQC'
            : 'Không đạt tiêu chuẩn kiểm tra OQC. Yêu cầu xưởng khắc phục lại.',
          inspectorName: session?.user?.name || 'Bộ phận QA/QC',
          passedQuantity: isPassed ? (defect.quantity || 1) : 0,
          failedQuantity: isPassed ? 0 : (defect.quantity || 1),
        }),
      });
      if (res.ok) {
        toast.success(
          isPassed ? 'Nghiệm thu ĐẠT' : 'QC không đạt',
          isPassed
            ? 'Đã nghiệm thu đạt chuẩn OQC. Hồ sơ đã hoàn tất!'
            : 'Đã trả hồ sơ về xưởng để kỹ thuật viên xử lý lại!'
        );
        mutate();
        if (onRefresh) onRefresh();
      } else {
        toast.error('Lỗi', 'Không thể cập nhật kết quả kiểm định!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối', 'Không thể kết nối đến máy chủ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmClick = () => {
    if (!isProdAdmin) return;
    if (!note) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập báo cáo nội dung xử lý!');
      return;
    }
    if (resolution === 'Thay linh kiện' && selectedBomItemIds.size === 0) {
      toast.warning(
        'Chưa chọn linh kiện',
        'Vui lòng tích chọn ít nhất 1 linh kiện bị lỗi cần cấp thay thế trong bảng phân rã BOM!'
      );
      return;
    }
    if (
      resolution === 'Thay linh kiện' ||
      resolution === 'Phân rã thu hồi vật tư linh kiện'
    ) {
      const targetIds =
        resolution === 'Phân rã thu hồi vật tư linh kiện' && selectedBomItemIds.size === 0 && defect?.bomItems
          ? new Set<string>(defect.bomItems.map((i: any) => i.id))
          : selectedBomItemIds;

      if (resolution === 'Phân rã thu hồi vật tư linh kiện' && selectedBomItemIds.size === 0) {
        setSelectedBomItemIds(targetIds);
      }

      const initial: Record<string, number> = {};
      if (defect?.bomItems) {
        defect.bomItems.forEach((i: any) => {
          if (targetIds.has(i.id)) {
            initial[i.id] = i.qty;
          }
        });
      }
      setEditedQuantities(initial);
      setShowOffcanvas(true);
    } else {
      setShowConfirm(true);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setNote((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed}; ${tag}`;
    });
  };

  return (
    <>
      <Modal
        isOpen={!!defectId}
        onClose={onClose}
        isFullscreen={true}
        padding="12px 18px"
        zIndex={1100}
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-900 text-base">Xử lý hồ sơ:</span>
            <span className="font-mono text-[#003087] bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-200/80 font-bold text-sm tracking-wide">
              {defect?.code || 'Đang tải...'}
            </span>
            {defect?.source && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {defect.source === 'RETURN' ? 'Hàng trả về' : defect.source === 'WARRANTY' ? 'Bảo hành' : 'Nội bộ'}
              </span>
            )}
            {defect?.status && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  defect.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : defect.status === 'WAITING_QC'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : defect.status === 'WAITING_INVENTORY'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {STATUS_LABELS[defect.status] || defect.status}
              </span>
            )}
          </div>
        }
        description="Chẩn đoán kỹ thuật, bóc tách linh kiện định mức BOM và quyết định phương án khắc phục"
        headerIcon={
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#003087] flex items-center justify-center border border-blue-100 shadow-2xs">
            <i className="bi bi-tools text-base" />
          </div>
        }
        headerActions={
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            title="Làm mới dữ liệu hồ sơ"
            onClick={mutate}
          >
            <ArrowClockwise size={16} />
          </button>
        }
        footer={
          defect && !defect.error ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Phương án đã chọn:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-[#003087] border border-blue-200">
                  {resolution}
                </span>
                {requireQc && (defect.status === 'NEW' || defect.status === 'TECH_EVALUATING') && (
                  <span className="px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Qua QA/QC
                  </span>
                )}
                {(resolution === 'Thay linh kiện' ||
                  resolution === 'Phân rã thu hồi vật tư linh kiện') && (
                  <span className="text-slate-500">
                    • <strong className="text-slate-800">{selectedBomItemIds.size}</strong> linh kiện được chọn
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Đóng
                </Button>
                {(defect.status === 'NEW' || defect.status === 'TECH_EVALUATING') && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Check2Circle size={15} />}
                    disabled={isSubmitting || !isProdAdmin}
                    isLoading={isSubmitting}
                    onClick={handleConfirmClick}
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác nhận xử lý lỗi'}
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="flex-1 min-h-0 flex flex-col gap-3 text-[13px]">
          {!defect ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
              <ArrowClockwise className="animate-spin" size={18} />
              Đang tải dữ liệu hồ sơ lỗi...
            </div>
          ) : defect.error ? (
            <div className="flex items-center justify-center py-20 text-rose-600 font-semibold">
              Không tìm thấy hồ sơ lỗi!
            </div>
          ) : (
            <>
              {/* ── 1. THANH 4 THẺ TỔNG QUAN MINI (KEY METRICS BAR) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
                {/* Thẻ 1: Sản phẩm */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#003087] flex items-center justify-center shrink-0">
                    <i className="bi bi-box-seam text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Sản phẩm báo lỗi
                    </div>
                    <div className="font-bold text-slate-900 text-xs truncate" title={defect.productName}>
                      {defect.productName || 'Chưa xác định'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Mã: <b>{defect.productCode || '—'}</b> • SL:{' '}
                      <b className="text-rose-600 font-bold">{defect.quantity || 1}</b>
                    </div>
                  </div>
                </div>

                {/* Thẻ 2: Khách hàng */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                    <i className="bi bi-person text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Khách hàng
                    </div>
                    <div className="font-bold text-slate-900 text-xs truncate" title={defect.customerName}>
                      {defect.customerName || 'Khách vãng lai'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {defect.customerPhone ? (
                        <span className="font-mono">{defect.customerPhone}</span>
                      ) : (
                        'Chưa có SĐT'
                      )}
                    </div>
                  </div>
                </div>

                {/* Thẻ 3: Đơn hàng gốc */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0">
                    <i className="bi bi-receipt text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Đơn hàng gốc
                    </div>
                    <div className="font-bold text-blue-700 font-mono text-xs truncate">
                      {defect.orderNumber || 'Không có đơn'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {defect.purchaseDate
                        ? new Date(defect.purchaseDate).toLocaleDateString('vi-VN')
                        : 'Chưa rõ ngày mua'}
                    </div>
                  </div>
                </div>

                {/* Thẻ 4: Định mức kỹ thuật BOM */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100/70 text-purple-800 flex items-center justify-center shrink-0">
                    <i className="bi bi-diagram-3 text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Định mức kỹ thuật
                    </div>
                    <div className="font-bold text-purple-700 font-mono text-xs truncate">
                      {defect.bomCode || 'Không có BOM'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {defect.bomItems?.length || 0} linh kiện cấu thành
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. KHỐI NỘI DUNG CHÍNH (2 CỘT CÂN ĐỐI, TỰ CO GIÃN THEO FULL SCREEN) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
                {/* ── CỘT TRÁI (5 CỘT): HIỆN TRẠNG & BẢNG LINH KIỆN BOM ── */}
                <div className="lg:col-span-5 flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
                  {/* Hiện trạng báo lỗi */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs shrink-0">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <i className="bi bi-chat-left-text text-blue-600" />
                      <span>Hiện trạng báo lỗi:</span>
                    </div>
                    <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 leading-relaxed">
                      {defect.description || 'Không có mô tả chi tiết hiện trạng lỗi'}
                    </div>

                    {defect.mediaUrls && defect.mediaUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100">
                        {defect.mediaUrls.map((url: string, i: number) => {
                          const isVideo = url.endsWith('.mp4');
                          return (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="border border-slate-200 rounded-lg overflow-hidden relative w-12 h-12 block hover:opacity-90 transition-opacity"
                            >
                              {isVideo ? (
                                <video src={url} className="w-full h-full object-cover" />
                              ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bảng linh kiện BOM phân rã từ hàng lỗi */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                        <i className="bi bi-box-seam text-blue-600" />
                        <span>Vật tư linh kiện phân rã (BOM)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Đã chọn: <b className="text-[#003087]">{selectedBomItemIds.size}</b>/
                          {defect.bomItems?.length || 0}
                        </span>
                        {!isBomLocked && defect?.bomItems?.length > 0 && (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                              onClick={() => setSelectedBomItemIds(new Set(defect.bomItems.map((i: any) => i.id)))}
                            >
                              Tất cả
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              className="text-[11px] text-slate-500 hover:text-slate-700 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                              onClick={() => setSelectedBomItemIds(new Set())}
                            >
                              Bỏ chọn
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <table className="w-full text-left border-collapse" style={{ fontSize: '12px' }}>
                        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                          <tr className="text-slate-500 text-[10.5px] uppercase tracking-[0.06em] font-bold">
                            <th className="py-2 px-2 text-center w-8">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                checked={
                                  defect?.bomItems?.length > 0 &&
                                  selectedBomItemIds.size === defect.bomItems.length
                                }
                                disabled={isBomLocked}
                                onChange={(e) => {
                                  if (isBomLocked) return;
                                  if (e.target.checked && defect?.bomItems) {
                                    setSelectedBomItemIds(
                                      new Set(defect.bomItems.map((i: any) => i.id))
                                    );
                                  } else {
                                    setSelectedBomItemIds(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="py-2 px-2 text-left">Tên linh kiện</th>
                            <th className="py-2 px-1 text-center w-11">ĐVT</th>
                            <th className="py-2 px-1 text-center w-11" title="Định mức trên 1 sản phẩm">ĐM</th>
                            <th className="py-2 px-2 text-center w-16" title="Số lượng phân rã bóc tách từ hàng lỗi">SL phân rã</th>
                            <th className="py-2 px-2 text-right w-16" title="Tồn kho vật tư linh kiện (KVP) để tham khảo">Tồn KVP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {defect.bomItems && defect.bomItems.length > 0 ? (
                            defect.bomItems.map((item: any) => {
                              const isSelected = selectedBomItemIds.has(item.id);
                              const defectQty = Number(defect?.quantity) > 0 ? Number(defect.quantity) : 1;
                              const normQty = item.normQty || item.qty || 1;
                              const decomposedQty = item.qty || (normQty * defectQty);

                              return (
                                <tr
                                  key={item.id}
                                  className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${
                                    isBomLocked ? '' : 'cursor-pointer'
                                  } ${isSelected ? 'bg-blue-50/60' : ''}`}
                                  onClick={() => {
                                    if (isBomLocked) return;
                                    const next = new Set(selectedBomItemIds);
                                    if (next.has(item.id)) next.delete(item.id);
                                    else next.add(item.id);
                                    setSelectedBomItemIds(next);
                                  }}
                                >
                                  <td
                                    className="py-2 px-2 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                      checked={isSelected}
                                      disabled={isBomLocked}
                                      onChange={(e) => {
                                        if (isBomLocked) return;
                                        const next = new Set(selectedBomItemIds);
                                        if (e.target.checked) next.add(item.id);
                                        else next.delete(item.id);
                                        setSelectedBomItemIds(next);
                                      }}
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-middle">
                                    <div className="font-semibold text-slate-800 leading-tight">
                                      {item.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {item.id}
                                    </div>
                                  </td>
                                  <td className="py-2 px-1 text-center align-middle text-slate-500 text-xs">
                                    {item.unit}
                                  </td>
                                  <td className="py-2 px-1 text-center align-middle font-medium text-slate-600 text-xs">
                                    {normQty}
                                  </td>
                                  <td className="py-2 px-2 text-center align-middle">
                                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                                      {decomposedQty}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-right align-middle">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold ${
                                        item.stock > 20
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : item.stock > 0
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                    >
                                      {item.stock}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                                Không có dữ liệu định mức cho sản phẩm này
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
                      <span>
                        Phân rã từ <strong>{defect.quantity || 1}</strong> bộ {defect.productName || 'hàng lỗi'} theo định mức <strong>{defect.bomCode || 'BOM'}</strong>
                      </span>
                      <span className="font-semibold text-blue-700">
                        {defect.bomItems?.length || 0} linh kiện
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── CỘT PHẢI (7 CỘT): PHƯƠNG ÁN XỬ LÝ & BÁO CÁO ── */}
                <div className="lg:col-span-7 flex flex-col h-full min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <i className="bi bi-gear-wide-connected text-blue-600" />
                      <span>Quyết định phương án xử lý</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Quyền hạn: <strong className="text-slate-800">{isProdAdmin ? 'Quản đốc / Phê duyệt' : 'Xem thông tin'}</strong>
                    </span>
                  </div>

                  <div className="p-4 flex-1 min-h-0 flex flex-col overflow-y-auto">
                    {defect.status === 'COMPLETED' ? (
                      <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3.5 text-emerald-800 my-auto">
                        <i className="bi bi-check-circle-fill text-3xl text-emerald-600" />
                        <div>
                          <h6 className="font-bold text-sm">Hồ sơ đã xử lý hoàn tất</h6>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Quy trình xử lý hàng lỗi đã được hoàn thành đầy đủ và lưu vết lịch sử.
                          </p>
                        </div>
                      </div>
                    ) : defect.status === 'NEW' || defect.status === 'TECH_EVALUATING' ? (
                      <div className="flex-1 min-h-0 flex flex-col gap-3">
                        {/* 5 Cấp độ xử lý */}
                        <div className="shrink-0">
                          <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                            Chọn phương án (Cấp độ xử lý) <span className="text-rose-600">*</span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              {
                                level: 'Mức 1',
                                badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                title: 'Sửa chữa tại chỗ',
                                description: 'Khắc phục tại chỗ, không phát sinh vật tư',
                              },
                              {
                                level: 'Mức 2',
                                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                                title: 'Thay linh kiện',
                                description: 'Cấp phát linh kiện từ kho KVP',
                              },
                              {
                                level: 'Mức 3',
                                badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
                                title: 'Phân rã thu hồi vật tư linh kiện',
                                description: 'Nhập kho thu hồi vật tư vào kho KVP',
                              },
                              {
                                level: 'Mức 4',
                                badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
                                title: 'Huỷ bỏ thay thế bằng hàng hoá mới',
                                description: 'Nhập Kho Lỗi & cấp mới thành phẩm',
                              },
                              {
                                level: 'Mức 5',
                                badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
                                title: 'Nhập lại kho',
                                description: 'Nhập hàng trả lại vào Kho Hàng Lỗi',
                              },
                            ].map((opt) => {
                              const isSelected = resolution === opt.title;

                              return (
                                <button
                                  key={opt.title}
                                  type="button"
                                  onClick={() => {
                                    setResolution(opt.title);
                                    if (opt.title === 'Phân rã thu hồi vật tư linh kiện' && defect?.bomItems) {
                                      setSelectedBomItemIds(new Set(defect.bomItems.map((i: any) => i.id)));
                                    }
                                    if (opt.title === 'Nhập lại kho') {
                                      setRequireQc(false);
                                    } else {
                                      setRequireQc(true);
                                    }
                                  }}
                                  className={`text-left p-2.5 rounded-xl border transition-all relative ${
                                    isSelected
                                      ? 'border-[#003087] bg-blue-50/70 text-slate-900 shadow-2xs ring-1 ring-[#003087]'
                                      : 'border-slate-200 bg-white hover:border-blue-300 text-slate-700 hover:bg-slate-50/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 text-xs">
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${opt.badgeColor}`}
                                    >
                                      {opt.level}
                                    </span>
                                    <span className="font-semibold text-slate-800 truncate flex-1 ml-1.5">
                                      {opt.title}
                                    </span>
                                    {isSelected && (
                                      <i className="bi bi-check-circle-fill text-[#003087] text-sm shrink-0" />
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-1">
                                    {opt.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {resolution === 'Nhập lại kho' && (
                            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl mt-2 flex items-center justify-between text-xs">
                              <span className="text-slate-700 font-medium">
                                Số lượng nhập kho hàng trả lại:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  className="w-16 h-7 rounded border border-blue-300 bg-white text-center font-bold text-blue-700 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  min={1}
                                  max={defect?.quantity || 1}
                                  value={returnQty}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    const max = defect?.quantity ? Number(defect.quantity) : 1;
                                    setReturnQty(Math.min(max, Math.max(1, val)));
                                  }}
                                />
                                <span className="text-xs text-slate-500">Bộ</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Báo cáo nội dung xử lý */}
                        <div className="flex-1 min-h-0 flex flex-col">
                          <div className="flex items-center justify-between mb-1.5 shrink-0">
                            <label className="text-xs font-bold text-slate-700">
                              Báo cáo nội dung xử lý <span className="text-rose-600">*</span>
                            </label>
                            <span className="text-[11px] text-slate-400">Gợi ý nhanh:</span>
                          </div>

                          {/* Quick Tags gợi ý */}
                          <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
                            {[
                              'Đã kiểm tra hoạt động tốt',
                              'Hỏng linh kiện cơ khí',
                              'Lỗi mạch điện tử',
                              'Xước vỡ do vận chuyển',
                              'Cần thay thế linh kiện mới',
                            ].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleQuickTagClick(tag)}
                                className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 transition-colors"
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>

                          <textarea
                            className="w-full flex-1 min-h-[120px] rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all resize-none"
                            placeholder="Nhập chi tiết về tình trạng hư hỏng, nguyên nhân và hướng khắc phục..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />

                          {/* Quy trình kiểm định chất lượng QA/QC */}
                          <div className="mt-2.5 p-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs">
                                <i className="bi bi-shield-check text-sm" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>Chuyển Bộ phận Quản lý chất lượng (QA/QC)</span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    OQC
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Tự động sinh phiếu OQC để KTV QC nghiệm thu chất lượng trước khi hoàn tất
                                </div>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={requireQc}
                                onChange={(e) => setRequireQc(e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Tiến trình các trạng thái tiếp theo */
                      <div className="flex flex-col gap-3 my-auto max-w-md mx-auto w-full">
                        {defect.status === 'WAITING_INVENTORY' &&
                          (() => {
                            const currentRes = resolution || defect.resolution;
                            const isReturnResolution = currentRes === 'Nhập lại kho';
                            const isRecallResolution =
                              currentRes === 'Phân rã thu hồi vật tư linh kiện';
                            const isScrapResolution =
                              currentRes === 'Huỷ bỏ thay thế bằng hàng hoá mới';
                            const isImportResolution =
                              isReturnResolution || isRecallResolution || isScrapResolution;

                            if (isImportResolution) {
                              const isImportCompleted =
                                defect.warehouseTask?.status === 'done' ||
                                defect.warehouseTask?.status === 'completed';
                              const importTypeName = isReturnResolution
                                ? 'Nhập kho hàng trả lại'
                                : isRecallResolution
                                ? 'Nhập kho thu hồi'
                                : 'Nhập kho hàng lỗi';

                              return (
                                <div className="space-y-3">
                                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">Phương án xử lý:</span>
                                      <span className="px-2.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {currentRes}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">
                                        Lệnh {importTypeName.toLowerCase()}:
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                          isImportCompleted
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}
                                      >
                                        {isImportCompleted ? 'Đã nhập kho' : 'Chờ kho nhập'}
                                      </span>
                                    </div>
                                    {defect.qcInspection && (
                                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                                        <span className="text-slate-500">Phiếu kiểm định QC:</span>
                                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                                          {defect.qcInspection.code} • {defect.qcInspection.status || 'Chờ kiểm định'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Button
                                      variant={
                                        isImportCompleted
                                          ? isReturnResolution
                                            ? 'success'
                                            : 'primary'
                                          : 'secondary'
                                      }
                                      className="w-full"
                                      disabled={!isImportCompleted || isSubmitting || !isProdAdmin}
                                      leftIcon={
                                        !isImportCompleted ? (
                                          <LockFill size={14} />
                                        ) : (
                                          <Check2Circle size={15} />
                                        )
                                      }
                                      onClick={() =>
                                        isReturnResolution
                                          ? handleProcess('HOÀN THÀNH & CHUYỂN QC', 'WAITING_QC')
                                          : handleProcess('TIẾP TỤC XỬ LÝ', 'PROCESSING')
                                      }
                                    >
                                      {isReturnResolution ? 'Hoàn tất nhập kho & Chuyển QC' : 'Tiếp tục xử lý'}
                                    </Button>
                                    {!defect.qcInspection && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                        disabled={isSubmitting || !isProdAdmin}
                                        leftIcon={<i className="bi bi-shield-check" />}
                                        onClick={() => handleProcess('CHUYỂN QC KIỂM ĐỊNH', 'WAITING_QC')}
                                      >
                                        Chuyển sang Bộ phận QC kiểm định ngay
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            const materialTickets = (defect.logisticsTickets || []).filter(
                              (t: any) => t.type === 'WARRANTY_MATERIAL'
                            );
                            const ticketsToCheck =
                              materialTickets.length > 0
                                ? materialTickets
                                : defect.logisticsTickets || [];
                            const mainTicket = ticketsToCheck[0];
                            const hasTicket = ticketsToCheck.length > 0;
                            const isExportCompleted =
                              hasTicket &&
                              ticketsToCheck.every((t: any) => t.status === 'COMPLETED');

                            return (
                              <div className="space-y-3">
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Phương án xử lý:</span>
                                    <span className="px-2.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {resolution || defect.resolution || 'Thay linh kiện'}
                                    </span>
                                  </div>
                                  {mainTicket && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500">Lệnh xuất linh kiện:</span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                          isExportCompleted
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}
                                      >
                                        {mainTicket.code} •{' '}
                                        {isExportCompleted ? 'Đã cấp phát' : 'Chờ kho cấp phát'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant={isExportCompleted ? 'primary' : 'secondary'}
                                  className="w-full"
                                  disabled={!isExportCompleted || isSubmitting || !isProdAdmin}
                                  leftIcon={
                                    !isExportCompleted ? (
                                      <LockFill size={14} />
                                    ) : (
                                      <ArrowRightCircle size={15} />
                                    )
                                  }
                                  onClick={() => handleProcess('TIẾP TỤC XỬ LÝ', 'PROCESSING')}
                                >
                                  Tiếp tục xử lý
                                </Button>
                              </div>
                            );
                          })()}

                        {defect.status === 'PROCESSING' && (
                          <div className="space-y-3">
                            {/* Cảnh báo nếu trước đó QC không đạt */}
                            {defect.activities?.some((a: any) => a.action?.includes('KHÔNG ĐẠT')) && (
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                                  <i className="bi bi-exclamation-triangle-fill" />
                                  QC kết luận: KHÔNG ĐẠT tiêu chuẩn OQC
                                </div>
                                <div className="text-[11.5px] text-rose-600">
                                  {defect.activities.find((a: any) => a.action?.includes('KHÔNG ĐẠT'))?.description ||
                                    'Yêu cầu kỹ thuật viên kiểm tra và khắc phục lại.'}
                                </div>
                              </div>
                            )}

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Phương án xử lý:</span>
                                <span className="px-2.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {resolution || defect.resolution || 'Thay linh kiện'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Bước tiếp theo:</span>
                                <span className="font-semibold text-slate-800">
                                  Nghiệm thu chất lượng xuất xưởng (OQC)
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Button
                                variant="primary"
                                className="w-full"
                                disabled={isSubmitting || !isProdAdmin}
                                leftIcon={<Check2Circle size={16} />}
                                onClick={() => handleProcess('HOÀN THÀNH & CHUYỂN QC', 'WAITING_QC')}
                              >
                                Hoàn thành & Chuyển QC nghiệm thu
                              </Button>
                              <Button
                                variant="outline"
                                className="w-full text-slate-600"
                                disabled={isSubmitting || !isProdAdmin}
                                onClick={() => handleProcess('HOÀN THÀNH TRỰC TIẾP', 'COMPLETED')}
                              >
                                Hoàn tất trực tiếp (Không qua QC)
                              </Button>
                            </div>
                          </div>
                        )}

                        {defect.status === 'WAITING_QC' && (
                          <div className="space-y-3">
                            <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Trạng thái:</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11.5px] flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                  Chờ QC kiểm tra OQC
                                </span>
                              </div>
                              {defect.qcInspection && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Mã phiếu kiểm định:</span>
                                  <span className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                    {defect.qcInspection.code}
                                  </span>
                                </div>
                              )}
                              <div className="text-slate-600 text-[11.5px] leading-relaxed pt-1 border-t border-indigo-100">
                                Bộ phận Quản lý chất lượng (QA/QC) đang tiến hành đo kiểm áp lực, độ kín và ngoại quan xuất xưởng.
                              </div>
                            </div>

                            {/* Nghiệm thu nhanh */}
                            <div className="space-y-2 pt-1">
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  variant="success"
                                  className="w-full"
                                  disabled={isSubmitting || !defect.qcInspection}
                                  leftIcon={<Check2Circle size={15} />}
                                  onClick={() => handleQcReview(true)}
                                >
                                  QC: ĐẠT chuẩn
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                                  disabled={isSubmitting || !defect.qcInspection}
                                  leftIcon={<i className="bi bi-x-circle" />}
                                  onClick={() => handleQcReview(false)}
                                >
                                  QC: KHÔNG ĐẠT
                                </Button>
                              </div>
                              <Button variant="ghost" className="w-full text-slate-500" onClick={onClose}>
                                Đóng cửa sổ
                              </Button>
                            </div>
                          </div>
                        )}

                        {defect.status === 'COMPLETED' && (
                          <div className="space-y-3">
                            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Kết quả xử lý:</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11.5px]">
                                  Đã hoàn tất
                                </span>
                              </div>
                              {defect.qcInspection && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Kiểm định chất lượng:</span>
                                  <span className="font-semibold text-emerald-700">
                                    Đạt chuẩn OQC ({defect.qcInspection.code})
                                  </span>
                                </div>
                              )}
                            </div>
                            <Button variant="outline" className="w-full" onClick={onClose}>
                              Đóng
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Offcanvas
        isOpen={showOffcanvas}
        onClose={() => setShowOffcanvas(false)}
        title={
          resolution === 'Thay linh kiện' ? 'Vật tư cấp phát thay thế' : 'Vật tư thu hồi'
        }
        description={`Danh sách vật tư được chọn để ${
          resolution === 'Thay linh kiện' ? 'cấp phát mới' : 'thu hồi về kho'
        }`}
        icon={<i className="bi bi-box-seam text-lg" />}
        width="400px"
        zIndex={1300}
        footer={
          <Button
            variant="primary"
            className="w-full"
            disabled={isSubmitting || !isProdAdmin}
            isLoading={isSubmitting}
            onClick={() => {
              setShowOffcanvas(false);
              const nextStatus = 'WAITING_INVENTORY';
              const bomPayload = defect?.bomItems
                ?.filter((item: any) => selectedBomItemIds.has(item.id))
                .map((item: any) => ({
                  id: item.id,
                  inventoryItemId: item.realInventoryItemId,
                  name: item.name,
                  code: item.id,
                  unit: item.unit,
                  quantity: editedQuantities[item.id] || 0,
                }));
              handleProcess(`QUYẾT ĐỊNH: ${resolution.toUpperCase()}`, nextStatus, bomPayload);
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Tạo yêu cầu kho'}
          </Button>
        }
      >
        <FullWidthTable className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Tên vật tư</th>
                <th className="py-2.5 px-3 text-right w-24">Số lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defect?.bomItems
                ?.filter((item: any) => selectedBomItemIds.has(item.id))
                .map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.id} - Tồn:{' '}
                        <strong
                          className={item.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}
                        >
                          {item.stock}
                        </strong>{' '}
                        {item.unit}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        className="w-20 h-8 rounded-lg border border-slate-300 text-center font-bold text-sky-700 text-xs outline-none focus:border-sky-500"
                        value={editedQuantities[item.id] || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditedQuantities((prev) => ({ ...prev, [item.id]: val }));
                        }}
                        min={1}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </FullWidthTable>
      </Offcanvas>

      <ConfirmDialog
        open={showConfirm}
        title="Xác nhận xử lý lỗi"
        message={
          <div>
            <p className="mb-2">
              Bạn có chắc chắn muốn thực hiện xử lý lỗi với phương án{' '}
              <strong>{resolution}</strong>?
            </p>
            {resolution === 'Sửa chữa tại chỗ' && (
              <p className="mb-0 text-indigo-700 text-xs font-semibold">
                <i className="bi bi-shield-check mr-1" />
                {requireQc
                  ? 'Quy trình: Chuyển sang bộ phận QA/QC kiểm định chất lượng (OQC)'
                  : 'Quy trình: Hoàn thành xử lý trực tiếp tại chỗ'}
              </p>
            )}
            {resolution === 'Nhập lại kho' && (
              <p className="mb-0 text-sky-700 text-xs font-semibold">
                <i className="bi bi-box-arrow-in-down mr-1"></i> Số lượng nhập kho hàng trả lại:{' '}
                <strong>{returnQty}</strong> bộ
              </p>
            )}
          </div>
        }
        confirmLabel="Xác nhận xử lý"
        cancelLabel="Đóng"
        variant="warning"
        loading={isSubmitting}
        onConfirm={() => {
          setShowConfirm(false);
          const nextStatus =
            resolution === 'Thay linh kiện' ||
            resolution === 'Huỷ bỏ thay thế bằng hàng hoá mới' ||
            resolution === 'Nhập lại kho'
              ? 'WAITING_INVENTORY'
              : resolution === 'Sửa chữa tại chỗ'
              ? (requireQc ? 'WAITING_QC' : 'COMPLETED')
              : 'PROCESSING';
          handleProcess(
            `QUYẾT ĐỊNH: ${resolution.toUpperCase()}${requireQc && resolution === 'Sửa chữa tại chỗ' ? ' & CHUYỂN QC' : ''}`,
            nextStatus,
            undefined,
            returnQty
          );
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
