import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/common/Modal";
import { Offcanvas } from "@/components/common/Offcanvas";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Button } from "@/components/common/Button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { isProductionAdmin } from "@/lib/production-permissions";
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
  const isProdAdmin = isProductionAdmin(session?.user);
  const [defect, setDefect] = useState<any>(null);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('Sửa chữa tại chỗ');
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

  useEffect(() => {
    if (
      (defect?.status === 'NEW' || defect?.status === 'TECH_EVALUATING') &&
      selectedBomItemIds.size === 0 &&
      (resolution === 'Thay linh kiện' || resolution === 'Phân rã thu hồi vật tư linh kiện')
    ) {
      setResolution('Sửa chữa tại chỗ');
    }
  }, [selectedBomItemIds.size, resolution, defect?.status]);

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

  return (
    <>
      <Modal
        isOpen={!!defectId}
        onClose={onClose}
        isFullscreen={true}
        zIndex={1100}
        title={`Xử lý hồ sơ lỗi: ${defect?.code || 'Đang tải...'}`}
        description="Chẩn đoán kỹ thuật, phân rã linh kiện BOM và thực hiện phương án xử lý"
        headerIcon={<i className="bi bi-tools text-base" />}
      >
        <div className="flex-1 min-h-0 flex flex-col bg-slate-50/60 p-2 rounded-xl overflow-hidden text-[13px]">
          {!defect ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Đang tải dữ liệu...
            </div>
          ) : defect.error ? (
            <div className="flex items-center justify-center h-full text-rose-600 font-semibold">
              Không tìm thấy hồ sơ lỗi!
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
              {/* Left Column: Info & BOM Table */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                {/* Top Half: Info */}
                <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                    <i className="bi bi-info-circle text-sky-600"></i>
                    <span>Thông tin gốc</span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 mb-3">
                    <div>
                      Sản phẩm: <strong className="text-slate-900">{defect.productName}</strong>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        Mã SP: <strong className="text-slate-900">{defect.productCode}</strong>
                      </div>
                      <div>
                        Số lượng:{' '}
                        <strong className="text-rose-600">
                          {String(defect.quantity || 0).padStart(2, '0')}
                        </strong>
                      </div>
                      <div>
                        Mã ĐM:{' '}
                        <strong className="text-sky-700">{defect.bomCode || 'Không có'}</strong>
                      </div>
                    </div>
                  </div>

                  {defect.mediaUrls && defect.mediaUrls.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-bold text-slate-700 mb-1.5">
                        Hình ảnh thực tế:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {defect.mediaUrls.map((url: string, i: number) => {
                          const isVideo = url.endsWith('.mp4');
                          return (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="border border-slate-200 rounded-lg overflow-hidden relative w-16 h-16 block"
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
                    </div>
                  )}

                  <div className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <i className="bi bi-card-text text-sky-600"></i>
                    <span>Mô tả hiện trạng</span>
                  </div>
                  <div className="text-xs text-slate-600 bg-white border border-slate-200/80 rounded-lg p-2.5">
                    {defect.description || 'Không có mô tả'}
                  </div>
                </div>

                {/* Bottom Half: BOM Table */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <i className="bi bi-box-seam text-sky-600"></i>
                      <span>Vật tư linh kiện phân rã</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        defect.bomCode
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {defect.bomCode || 'Không có định mức'}
                    </span>
                  </div>

                  <FullWidthTable className="flex-1 min-h-0">
                    <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
                      <thead className="sticky top-0 z-10 bg-white border-b-2 border-slate-200">
                        <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                          <th className="py-2 px-3 text-center w-10">
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
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
                          <th className="py-2 px-3 text-left">Tên linh kiện</th>
                          <th className="py-2 px-2 text-center w-16">ĐVT</th>
                          <th className="py-2 px-2 text-center w-16">SL</th>
                          <th className="py-2 px-3 text-right w-20">Tồn kho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {defect.bomItems && defect.bomItems.length > 0 ? (
                          defect.bomItems.map((item: any) => (
                            <tr
                              key={item.id}
                              className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${
                                isBomLocked ? '' : 'cursor-pointer'
                              } ${selectedBomItemIds.has(item.id) ? 'bg-sky-50/40' : ''}`}
                              onClick={() => {
                                if (isBomLocked) return;
                                const next = new Set(selectedBomItemIds);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                setSelectedBomItemIds(next);
                              }}
                            >
                              <td
                                className="py-2.5 px-3 text-center align-middle"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                                  checked={selectedBomItemIds.has(item.id)}
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
                              <td className="py-2.5 px-3 align-middle">
                                <div className="font-semibold text-slate-800">{item.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{item.id}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center align-middle text-slate-500">
                                {item.unit}
                              </td>
                              <td className="py-2.5 px-2 text-center align-middle font-bold text-sky-600">
                                {item.qty}
                              </td>
                              <td className="py-2.5 px-3 text-right align-middle font-bold">
                                <span
                                  className={
                                    item.stock > 20
                                      ? 'text-emerald-600'
                                      : item.stock > 0
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                                  }
                                >
                                  {item.stock}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                              Không có dữ liệu định mức cho sản phẩm này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </FullWidthTable>

                  <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-50 text-[11.5px] text-slate-500 shrink-0">
                    <i className="bi bi-info-circle mr-1 text-sky-600"></i>
                    Trích xuất tự động dựa trên <strong className="text-slate-700">{defect?.productCode}</strong>.
                  </div>
                </div>
              </div>

              {/* Right Column: Action Board */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                {/* Customer Info Header */}
                <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 shrink-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                    <div className="md:border-r md:border-slate-200 md:pr-3 space-y-1">
                      <div>
                        Khách hàng:{' '}
                        <strong className="text-slate-900">
                          {defect.customerName || 'Không có'}
                        </strong>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          SĐT:{' '}
                          <strong className="text-slate-900">
                            {defect.customerPhone || 'Không có'}
                          </strong>
                        </div>
                        <div>
                          Địa chỉ:{' '}
                          <strong className="text-slate-900">
                            {defect.customerAddress || 'Không có'}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div>
                        Đơn hàng:{' '}
                        <strong className="text-slate-900">
                          {defect.orderNumber || 'Không có'}
                        </strong>
                      </div>
                      <div>
                        Ngày giao/mua:{' '}
                        <strong className="text-slate-900">
                          {defect.purchaseDate
                            ? new Date(defect.purchaseDate).toLocaleDateString('vi-VN')
                            : 'Không có'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Board Body */}
                <div className="p-4 flex-1 min-h-0 overflow-y-auto flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <i className="bi bi-gear text-sky-600"></i>
                      <span>Bảng thao tác kỹ thuật</span>
                    </div>
                    {defect.status === 'NEW' || defect.status === 'TECH_EVALUATING' ? (
                      <Button
                        variant="primary"
                        size="md"
                        leftIcon={<Check2Circle size={15} />}
                        disabled={isSubmitting || !isProdAdmin}
                        isLoading={isSubmitting}
                        title={
                          !isProdAdmin
                            ? 'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xử lý hàng lỗi'
                            : undefined
                        }
                        onClick={() => {
                          if (!isProdAdmin) return;
                          if (!note) {
                            toast.warning('Thiếu thông tin', 'Vui lòng nhập báo cáo nội dung xử lý!');
                            return;
                          }
                          if (
                            resolution === 'Thay linh kiện' ||
                            resolution === 'Phân rã thu hồi vật tư linh kiện'
                          ) {
                            const initial: Record<string, number> = {};
                            if (defect?.bomItems) {
                              defect.bomItems.forEach((i: any) => {
                                if (selectedBomItemIds.has(i.id)) {
                                  initial[i.id] = i.qty;
                                }
                              });
                            }
                            setEditedQuantities(initial);
                            setShowOffcanvas(true);
                          } else {
                            setShowConfirm(true);
                          }
                        }}
                      >
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận xử lý lỗi'}
                      </Button>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-white">
                        {STATUS_LABELS[defect.status] || defect.status}
                      </span>
                    )}
                  </div>

                  {defect.status === 'COMPLETED' ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800">
                      <i className="bi bi-check-circle-fill text-2xl text-emerald-600"></i>
                      <div>
                        <h6 className="font-bold text-sm">Đã hoàn tất</h6>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Hồ sơ lỗi này đã được xử lý xong.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                      <div className="md:col-span-6 flex flex-col">
                        <label className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                          <span>
                            Báo cáo nội dung xử lý{' '}
                            {defect.status !== 'WAITING_QC' && defect.status !== 'COMPLETED' && (
                              <span className="text-rose-600">*</span>
                            )}
                          </span>
                          {defect.status === 'WAITING_QC' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <i className="bi bi-send mr-1"></i>Đã chuyển QC
                            </span>
                          )}
                        </label>
                        <textarea
                          className="w-full flex-1 min-h-[220px] rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 outline-none transition-all"
                          placeholder="Nhập chi tiết về tình trạng lỗi và hướng xử lý..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          readOnly={
                            defect.status === 'WAITING_QC' || defect.status === 'COMPLETED'
                          }
                        />
                      </div>

                      <div className="md:col-span-6 flex flex-col">
                        {(defect.status === 'NEW' || defect.status === 'TECH_EVALUATING') && (
                          <div className="flex flex-col h-full">
                            <label className="text-xs font-bold text-slate-700 mb-2">
                              Chọn phương án (Cấp độ xử lý) <span className="text-rose-600">*</span>
                            </label>

                            <div className="flex flex-col gap-2">
                              {[
                                {
                                  title: 'Sửa chữa tại chỗ',
                                  description:
                                    'Không cần thông báo thông tin (Kỹ thuật xử lý tại chỗ)',
                                },
                                {
                                  title: 'Thay linh kiện',
                                  description: 'Cấp phát linh kiện thay thế từ kho KVP',
                                },
                                {
                                  title: 'Phân rã thu hồi vật tư linh kiện',
                                  description: 'Nhập kho thu hồi vật tư linh kiện vào kho KVP',
                                },
                                {
                                  title: 'Huỷ bỏ thay thế bằng hàng hoá mới',
                                  description:
                                    'Nhập kho hàng lỗi (KHO-LOI) & Cấp mới thành phẩm',
                                },
                                {
                                  title: 'Nhập lại kho',
                                  description:
                                    'Nhập kho hàng trả lại vào Kho hàng lỗi (KHO-LOI)',
                                },
                              ].map((opt, idx) => {
                                const isDisabled =
                                  selectedBomItemIds.size === 0 &&
                                  (opt.title === 'Thay linh kiện' ||
                                    opt.title === 'Phân rã thu hồi vật tư linh kiện');
                                const isSelected = resolution === opt.title;
                                return (
                                  <button
                                    key={opt.title}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && setResolution(opt.title)}
                                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                                      isDisabled
                                        ? 'opacity-45 cursor-not-allowed border-slate-200 bg-slate-50'
                                        : isSelected
                                        ? 'border-sky-600 bg-sky-50/80 text-sky-900 shadow-2xs cursor-pointer'
                                        : 'border-slate-200 bg-white hover:border-sky-300 text-slate-700 cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-bold mr-1 text-sky-700">
                                          Mức {idx + 1}:
                                        </span>
                                        <span className="font-semibold">{opt.title}</span>
                                      </div>
                                      {isSelected && (
                                        <i className="bi bi-check-circle-fill text-sky-600"></i>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                      {opt.description}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {resolution === 'Nhập lại kho' && (
                              <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl mt-2.5 flex items-center justify-between">
                                <div>
                                  <div className="font-semibold text-slate-800 text-xs">
                                    <i className="bi bi-box-arrow-in-down text-sky-600 mr-1"></i>
                                    Số lượng nhập kho hàng trả lại:
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Khách trả: {defect?.quantity || 1} bộ sản phẩm
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    className="w-16 h-8 rounded-lg border border-sky-300 bg-white text-center font-bold text-sky-700 text-xs outline-none focus:ring-2 focus:ring-sky-500/20"
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
                        )}

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
                              const whName = isRecallResolution
                                ? 'Kho Vật tư Phụ kiện (KVP)'
                                : 'Kho hàng lỗi (KHO-LOI)';

                              return (
                                <div className="flex flex-col h-full justify-center gap-3">
                                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-slate-500">Phương án xử lý:</span>
                                      <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                                        {currentRes} ({importTypeName})
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      <span>Lệnh {importTypeName.toLowerCase()}:</span>
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                            isImportCompleted
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}
                                        >
                                          {defect.warehouseTask?.title ||
                                            `Yêu cầu ${importTypeName.toLowerCase()} (${defect.code})`}{' '}
                                          {isImportCompleted ? '• Đã nhập kho' : '• Chờ kho nhập'}
                                        </span>
                                        <button
                                          type="button"
                                          className="text-slate-400 hover:text-sky-600 cursor-pointer"
                                          title="Kiểm tra lại trạng thái nhập kho"
                                          onClick={() => mutate()}
                                        >
                                          <ArrowClockwise size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    {!isImportCompleted ? (
                                      <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                                        <LockFill className="text-amber-500 shrink-0" size={14} />
                                        <span>
                                          Nút{' '}
                                          <strong>
                                            {isReturnResolution ? 'Hoàn thành' : 'Tiếp tục xử lý'}
                                          </strong>{' '}
                                          chỉ mở khoá khi bộ phận kho hoàn tất lập phiếu{' '}
                                          {importTypeName.toLowerCase()} ({whName}).
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="pt-2 border-t border-slate-200 text-xs text-emerald-700 flex items-center gap-2">
                                        <Check2Circle className="text-emerald-600 shrink-0" size={14} />
                                        <span>
                                          Đã hoàn tất {importTypeName.toLowerCase()} vào {whName}. Bạn có
                                          thể tiếp tục.
                                        </span>
                                      </div>
                                    )}
                                  </div>

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
                                      ) : isReturnResolution ? (
                                        <Check2Circle size={15} />
                                      ) : (
                                        <ArrowRightCircle size={15} />
                                      )
                                    }
                                    onClick={() =>
                                      isReturnResolution
                                        ? handleProcess('HOÀN THÀNH', 'COMPLETED')
                                        : handleProcess('TIẾP TỤC XỬ LÝ', 'PROCESSING')
                                    }
                                  >
                                    {isReturnResolution ? 'Hoàn thành hồ sơ' : 'Tiếp tục xử lý'}
                                  </Button>
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
                              <div className="flex flex-col h-full justify-center gap-3">
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">Phương án xử lý:</span>
                                    <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                                      {resolution || defect.resolution || 'Thay linh kiện'}
                                    </span>
                                  </div>
                                  {mainTicket ? (
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      <span>Lệnh cấp phát linh kiện:</span>
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                            isExportCompleted
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}
                                        >
                                          {mainTicket.code}{' '}
                                          {isExportCompleted ? '• Đã cấp phát' : '• Chờ kho cấp phát'}
                                        </span>
                                        <button
                                          type="button"
                                          className="text-slate-400 hover:text-sky-600 cursor-pointer"
                                          onClick={() => mutate()}
                                        >
                                          <ArrowClockwise size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-rose-600 font-medium">
                                      Chưa có lệnh cấp phát vật tư
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
                          <div className="flex flex-col h-full justify-center gap-3">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Phương án xử lý:</span>
                                <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                                  {resolution || defect.resolution || 'Thay linh kiện'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Bước tiếp theo:</span>
                                <span className="font-semibold text-slate-800">
                                  Chuyển thông tin sang bộ phận QC
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                                <i className="bi bi-info-circle text-sky-600"></i>
                                <span>
                                  Sau khi hoàn tất sửa chữa, nhấn <strong>Hoàn thành</strong> để
                                  chuyển thông tin sang bộ phận QC kiểm tra chất lượng xuất xưởng
                                  (OQC).
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              className="w-full"
                              disabled={isSubmitting || !isProdAdmin}
                              leftIcon={<Check2Circle size={16} />}
                              onClick={() => handleProcess('HOÀN THÀNH', 'WAITING_QC')}
                            >
                              Hoàn thành
                            </Button>
                          </div>
                        )}

                        {defect.status === 'WAITING_QC' && (
                          <div className="flex flex-col h-full justify-center gap-3">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Trạng thái kiểm định:</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                                  <i className="bi bi-hourglass-split mr-1"></i> Chờ QC kiểm tra
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                                Bộ phận QC sẽ tiến hành kiểm định tại{' '}
                                <strong>Phân hệ Quản lý chất lượng</strong>. Khi QC kết luận ĐẠT, hệ
                                thống sẽ tự động phát sinh lệnh nhập kho thành phẩm (KHO-CHINH).
                              </div>
                            </div>
                            <Button variant="outline" className="w-full" onClick={onClose}>
                              Đóng
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
              ? 'COMPLETED'
              : 'PROCESSING';
          handleProcess(`QUYẾT ĐỊNH: ${resolution.toUpperCase()}`, nextStatus, undefined, returnQty);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
