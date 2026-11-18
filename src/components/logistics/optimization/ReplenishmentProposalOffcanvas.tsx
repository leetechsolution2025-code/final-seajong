import React, { useState, useEffect, useMemo } from 'react';
import { Offcanvas } from '@/components/common/Offcanvas';
import { Button } from '@/components/common/Button';
import { toast } from 'react-toastify';
import { GearWideConnected, CartCheck, Check2Square, Square } from 'react-bootstrap-icons';

export interface ReplenishmentItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  physicalStock: number;
  availableStock: number;
  reorderPoint: number;
  safetyStock: number;
  eoq: number;
  replenishmentSource: 'LSX' | 'PO';
  status: 'critical' | 'reorder' | 'safe' | 'excess' | 'pending_approval';
  estimatedCost: number;
  hasBom?: boolean;
  bomCode?: string | null;
}

interface ReplenishmentProposalOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'LSX' | 'PO' | null;
  items: ReplenishmentItem[];
  onSuccess: (updatedIds: string[]) => void;
}

interface ItemRowState {
  item: ReplenishmentItem;
  selected: boolean;
  targetQty: number;
  unitPrice: number;
}

export const ReplenishmentProposalOffcanvas: React.FC<ReplenishmentProposalOffcanvasProps> = ({
  isOpen,
  onClose,
  orderType,
  items,
  onSuccess,
}) => {
  const [rows, setRows] = useState<ItemRowState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Khởi tạo danh sách hàng hoá mỗi khi mở Offcanvas hoặc thay đổi items/orderType
  useEffect(() => {
    if (!isOpen || !orderType) return;

    // Lọc các mặt hàng thuộc diện cần bù của nguồn cấp này
    // Ưu tiên các mặt hàng đang nguy cấp hoặc chạm ngưỡng
    let targets = items.filter(
      (it) =>
        it.replenishmentSource === orderType &&
        (it.status === 'critical' || it.status === 'reorder' || it.status === 'pending_approval')
    );

    // Nếu không có mặt hàng chạm ngưỡng, hiển thị các mặt hàng thuộc nguồn cấp này để người dùng chủ động chọn bù
    if (targets.length === 0) {
      targets = items.filter((it) => it.replenishmentSource === orderType);
    }

    setRows(
      targets.map((it) => {
        const defaultQty = it.eoq > 0 ? it.eoq : 10;
        const unitPrice = it.eoq > 0 ? Math.round(it.estimatedCost / it.eoq) : 0;
        return {
          item: it,
          selected: it.status === 'critical' || it.status === 'reorder' || targets.length <= 5, // Tự động chọn hàng chạm ngưỡng
          targetQty: defaultQty,
          unitPrice,
        };
      })
    );
  }, [isOpen, orderType, items]);

  // Toggle chọn 1 mặt hàng
  const toggleSelect = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.item.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  // Toggle chọn tất cả
  const isAllSelected = rows.length > 0 && rows.every((r) => r.selected);
  const toggleSelectAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: !isAllSelected })));
  };

  // Cập nhật số lượng bù của 1 mặt hàng
  const updateQty = (id: string, qty: number) => {
    const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
    setRows((prev) =>
      prev.map((r) => (r.item.id === id ? { ...r, targetQty: validQty } : r))
    );
  };

  // Tổng hợp dữ liệu
  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const totalCount = rows.length;
  const selectedCount = selectedRows.length;
  const totalQty = selectedRows.reduce((sum, r) => sum + r.targetQty, 0);
  const totalEstimatedCost = selectedRows.reduce(
    (sum, r) => sum + r.targetQty * r.unitPrice,
    0
  );

  // Xử lý trình Giám đốc duyệt
  const handleSubmit = async () => {
    if (selectedRows.length === 0) {
      toast.warn('Vui lòng chọn ít nhất một mặt hàng để lập đề xuất!');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('seajong_token') || sessionStorage.getItem('seajong_token');
      const payload = {
        orderType,
        items: selectedRows.map((r) => ({
          id: r.item.id,
          sku: r.item.sku,
          name: r.item.name,
          unit: r.item.unit,
          targetQty: r.targetQty,
          unitPrice: r.unitPrice,
          hasBom: r.item.hasBom,
          bomCode: r.item.bomCode,
          status: r.item.status,
        })),
        notes: `Đề xuất bù tồn kho tự động theo ngưỡng ROP (${selectedRows.length} mặt hàng).`,
      };

      const res = await fetch('/api/logistics/optimization/submit-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      const code = json.orderCode || (orderType === 'LSX' ? `LSX-${Date.now().toString().slice(-6)}` : `PR-${Date.now().toString().slice(-6)}`);

      if (res.ok && json.success) {
        toast.success(
          `Đã trình Ban Giám đốc duyệt thành công ${orderType === 'LSX' ? 'Lệnh sản xuất' : 'Yêu cầu mua hàng'} ${code} (${selectedRows.length} mặt hàng, ${totalEstimatedCost.toLocaleString()} đ)! Thông báo đã gửi tới Giám đốc và hiển thị tại Trung tâm phê duyệt.`
        );

        // Kích hoạt cập nhật thông báo thời gian thực trên quả chuông Topbar
        try {
          window.dispatchEvent(new CustomEvent('decodoor_notifications_updated'));
          window.dispatchEvent(new CustomEvent('seajong_notifications_updated'));
          window.dispatchEvent(new CustomEvent('decodoor_notification_created'));
          localStorage.setItem('decodoor_request_last_created', Date.now().toString());
        } catch {
          // ignore
        }

        onSuccess(selectedRows.map((r) => r.item.id));
        onClose();
      } else {
        toast.error(
          json.error || json.message || 'Lỗi khi gửi đề xuất trình duyệt lên máy chủ!'
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Lỗi khi gửi đề xuất duyệt, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLsx = orderType === 'LSX';

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      icon={isLsx ? <GearWideConnected size={20} className="text-blue-600" /> : <CartCheck size={20} className="text-emerald-600" />}
      title={isLsx ? 'Lập Lệnh Sản Xuất & Lắp Ráp' : 'Lập Yêu Cầu Mua Hàng'}
      description="Trình Giám đốc phê duyệt bổ sung tồn kho"
      footer={
        <div className="w-full space-y-2.5">
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500">Đã chọn:</span>{' '}
              <strong className="text-slate-800">{selectedCount} mã</strong>{' '}
              <span className="text-slate-400">({totalQty.toLocaleString()} SP)</span>
            </div>
            <div>
              <span className="text-slate-500">Dự toán:</span>{' '}
              <strong className="text-emerald-700 font-mono">
                {totalEstimatedCost.toLocaleString()} đ
              </strong>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </Button>
            <Button
              variant={isLsx ? 'primary' : 'success'}
              size="md"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={selectedCount === 0 || isSubmitting}
            >
              Trình Giám đốc duyệt
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {/* Thanh chọn nhanh */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 transition-colors"
          >
            {isAllSelected ? (
              <Check2Square size={16} className="text-blue-600" />
            ) : (
              <Square size={16} className="text-slate-400" />
            )}
            <span>Chọn tất cả ({totalCount})</span>
          </button>
          <span className="text-[11px] text-slate-500">
            {selectedCount}/{totalCount} mặt hàng
          </span>
        </div>

        {/* Danh sách hàng hoá */}
        <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
          {rows.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Không có mặt hàng nào cần bù tồn cho nguồn cấp này.
            </div>
          ) : (
            rows.map((row) => {
              const { item, selected, targetQty, unitPrice } = row;
              const subtotal = targetQty * unitPrice;

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    selected
                      ? 'border-blue-300 bg-blue-50/30'
                      : 'border-slate-200 bg-white opacity-60'
                  }`}
                >
                  {/* Hàng 1: Checkbox + Tên sản phẩm + Badge trạng thái */}
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 flex-shrink-0"
                    >
                      {selected ? (
                        <Check2Square size={15} className="text-blue-600" />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5 truncate">
                        <span className="text-blue-700 font-bold">{item.sku}</span>
                        <span>•</span>
                        <span>ĐVT: {item.unit}</span>
                        {item.hasBom && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">
                              BOM: {item.bomCode || 'Định mức'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {item.status === 'critical' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 flex-shrink-0">
                        Nguy cấp
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                        Chạm ngưỡng
                      </span>
                    )}
                  </div>

                  {/* Hàng 2: Chỉ số tồn & Ngưỡng ROP */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded mt-2">
                    <div>
                      Tồn khả dụng:{' '}
                      <strong className="text-slate-900 font-mono">
                        {item.availableStock}
                      </strong>{' '}
                      {item.unit}
                    </div>
                    <div className="text-right">
                      Ngưỡng ROP:{' '}
                      <strong className="text-rose-600 font-mono">
                        {item.reorderPoint}
                      </strong>{' '}
                      {item.unit}
                    </div>
                  </div>

                  {/* Hàng 3: Ô nhập số lượng cần bù & Dự toán */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600 font-medium">SL bù:</span>
                      <input
                        type="number"
                        min="1"
                        disabled={!selected}
                        value={targetQty}
                        onChange={(e) => updateQty(item.id, parseInt(e.target.value, 10))}
                        className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <span className="text-slate-500 font-sans">{item.unit}</span>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="text-slate-400">Thành tiền: </span>
                      <span className="font-bold text-emerald-700">
                        {subtotal.toLocaleString()} đ
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Offcanvas>
  );
};

export default ReplenishmentProposalOffcanvas;
