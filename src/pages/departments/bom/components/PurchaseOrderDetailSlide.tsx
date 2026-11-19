import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BoxSeam,
  Building,
  CalendarDate,
  CreditCard,
  Truck,
  Dash,
  Plus,
  Trash,
  ArrowCounterclockwise,
  Check2,
  CheckCircle,
  ExclamationCircle,
} from 'react-bootstrap-icons';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import type { ApprovalDocument } from '../DocumentApprovalView';

export interface PurchaseOrderDetailSlideProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocument;
  onUpdateDocument?: (doc: ApprovalDocument) => void;
}

function fmtVnd(n: number) {
  return `${Math.round(n || 0).toLocaleString('vi-VN')} đ`;
}

function fmtDateStr(s?: string | null) {
  if (!s) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

export const PurchaseOrderDetailSlide: React.FC<PurchaseOrderDetailSlideProps> = ({
  isOpen,
  onClose,
  document,
  onUpdateDocument,
}) => {
  if (!isOpen) return null;

  const meta = document.metadata || {};
  const rawItems: any[] = Array.isArray(meta.items) ? meta.items : [];

  const isProduction =
    String(document.entityType || '').toUpperCase() === 'PRODUCTION_REQUEST' ||
    document.docType === 'technical' ||
    String(document.code || '').startsWith('LSX-') ||
    String(document.title || '').includes('Lệnh sản xuất');

  const isPurchaseRequest =
    String(document.entityType || '').toUpperCase() === 'PURCHASE_REQUEST' ||
    String(document.code || '').startsWith('PR-') ||
    String(document.title || '').includes('mua hàng');

  const titleText = isProduction
    ? 'Điều chỉnh số lượng sản xuất & lắp ráp'
    : isPurchaseRequest
    ? 'Điều chỉnh số lượng mua ngoài'
    : 'Chi tiết & Điều chỉnh đơn hàng';

  // Khởi tạo state danh sách hàng hoá
  const [items, setItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (rawItems.length > 0) {
      const initialList = rawItems.map((it) => {
        const q = Number(it.soLuong ?? it.targetQty ?? it.quantity ?? 1);
        const p = Number(it.donGia ?? it.unitPrice ?? it.donGiaDK ?? 0);
        return {
          ...it,
          tenHang: it.tenHang || it.name || it.productName || 'Mặt hàng',
          soLuong: q,
          originalQty: q,
          donVi: it.donVi || it.unit || it.donViTinh || 'Cái',
          donGia: p,
          thanhTien: q * p,
          sku: it.sku || it.productCode || '',
          bomCode: it.bomCode || it.dinhMucId || '',
        };
      });
      setItems(initialList);
    } else if (document.id) {
      // Tự động tải danh mục mặt hàng từ CSDL nếu chưa có sẵn trong metadata
      fetch(`/api/approval-requests/${document.id}/items`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          const fetchedItems = Array.isArray(json?.items) ? json.items : [];
          if (fetchedItems.length > 0) {
            const mapped = fetchedItems.map((it: any) => {
              const q = Number(it.soLuong ?? it.targetQty ?? it.quantity ?? 1);
              const p = Number(it.donGia ?? it.unitPrice ?? it.donGiaDK ?? 0);
              return {
                ...it,
                tenHang: it.tenHang || it.name || it.productName || 'Mặt hàng',
                soLuong: q,
                originalQty: q,
                donVi: it.donVi || it.unit || it.donViTinh || 'Cái',
                donGia: p,
                thanhTien: q * p,
                sku: it.sku || it.productCode || '',
                bomCode: it.bomCode || it.dinhMucId || '',
              };
            });
            setItems(mapped);
          }
        })
        .catch(() => {});
    }
  }, [document.id, rawItems.length]);

  // Xử lý thay đổi số lượng trực tiếp
  const handleQtyChange = (index: number, newQty: number) => {
    const safeQty = Math.max(0, isNaN(newQty) ? 0 : Math.round(newQty));
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          soLuong: safeQty,
          targetQty: safeQty,
          thanhTien: safeQty * item.donGia,
        };
      })
    );
  };

  // Tăng / giảm theo bước (+1, -1, hoặc +5, -5)
  const handleStepQty = (index: number, step: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const current = Number(item.soLuong) || 0;
        const next = Math.max(0, current + step);
        return {
          ...item,
          soLuong: next,
          targetQty: next,
          thanhTien: next * item.donGia,
        };
      })
    );
  };

  // Khôi phục số lượng ban đầu của tất cả sản phẩm
  const handleResetAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        soLuong: item.originalQty,
        targetQty: item.originalQty,
        thanhTien: item.originalQty * item.donGia,
      }))
    );
  };

  // Tính toán tổng số lượng và dự toán thời gian thực
  const activeItems = items.filter((i) => i.soLuong > 0);
  const totalQty = items.reduce((sum, i) => sum + (Number(i.soLuong) || 0), 0);
  const originalTotalQty = items.reduce((sum, i) => sum + (Number(i.originalQty) || 0), 0);
  const totalAmount = items.reduce((sum, i) => sum + (Number(i.thanhTien) || 0), 0);
  const originalTotalAmount = items.reduce(
    (sum, i) => sum + (Number(i.originalQty) || 0) * (Number(i.donGia) || 0),
    0
  );
  const isModified = items.some((i) => i.soLuong !== i.originalQty);
  const diffAmount = totalAmount - originalTotalAmount;
  const diffQty = totalQty - originalTotalQty;

  // Lưu số lượng điều chỉnh về backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        items: items.map((i) => ({
          ...i,
          soLuong: i.soLuong,
          targetQty: i.soLuong,
          donGia: i.donGia,
          unitPrice: i.donGia,
          thanhTien: i.soLuong * i.donGia,
          subtotal: i.soLuong * i.donGia,
        })),
        notes: `Giám đốc đã điều chỉnh số lượng phê duyệt (${activeItems.length} mặt hàng, tổng ${totalQty.toLocaleString()} SP).`,
      };

      const res = await fetch(`/api/approval-requests/${document.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        const updatedDoc = json.data || {
          ...document,
          value: totalAmount,
          metadata: {
            ...meta,
            items: payload.items,
            itemCount: activeItems.length,
            totalQty,
            totalAmount,
            soTien: totalAmount,
            amount: totalAmount,
          },
        };
        onUpdateDocument?.(updatedDoc);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 500);
      } else {
        alert(json.error || 'Không thể cập nhật số lượng, vui lòng thử lại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi cập nhật số lượng.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-surface-1, #ffffff)',
        boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.18)',
        overflow: 'hidden',
      }}
    >
      {/* Header Slide */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-1, #ffffff)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          title="Quay lại hồ sơ"
          style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            border: '1px solid var(--border-default, #cbd5e1)',
            background: '#ffffff',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
            {titleText}
          </div>
          <div style={{ fontSize: '0.71875rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {document.code} • {isProduction ? 'Sản xuất Seajong' : 'Mua hàng Seajong'}
          </div>
        </div>
        <Badge variant={isProduction ? 'brand' : 'success'}>
          {activeItems.length}/{items.length} MH
        </Badge>
      </div>

      {/* Thanh tổng hợp & trạng thái điều chỉnh */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: isModified ? '#fffbeb' : '#f0f9ff',
          borderBottom: isModified ? '1px solid #fde68a' : '1px solid rgba(2, 132, 199, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: isModified ? '#92400e' : '#0369a1', fontWeight: 600 }}>
            {isModified ? '⚡ Dự toán sau khi điều chỉnh:' : '📊 Tổng dự toán phê duyệt:'}
          </span>
          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: isModified ? '#b45309' : '#0284c7' }}>
            {fmtVnd(totalAmount)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.71875rem' }}>
          <span style={{ color: '#64748b' }}>
            Tổng số lượng: <strong style={{ color: '#0f172a' }}>{totalQty.toLocaleString()} SP</strong>
            {diffQty !== 0 && (
              <span style={{ marginLeft: '4px', fontWeight: 700, color: diffQty > 0 ? '#16a34a' : '#dc2626' }}>
                ({diffQty > 0 ? `+${diffQty}` : diffQty} SP)
              </span>
            )}
          </span>

          {isModified && (
            <button
              type="button"
              onClick={handleResetAll}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              <ArrowCounterclockwise size={12} />
              Khôi phục gốc
            </button>
          )}
        </div>
      </div>

      {/* Body: Danh sách hàng hoá với bộ tăng / giảm số lượng */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            Không có hàng hoá nào trong đề xuất.
          </div>
        ) : (
          items.map((item, idx) => {
            const isZero = item.soLuong === 0;
            const isRowModified = item.soLuong !== item.originalQty;

            return (
              <div
                key={idx}
                style={{
                  border: isRowModified ? '1.5px solid #f59e0b' : isZero ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  backgroundColor: isZero ? '#f8fafc' : '#ffffff',
                  opacity: isZero ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: isRowModified ? '0 2px 8px rgba(245, 158, 11, 0.1)' : 'none',
                }}
              >
                {/* Tên hàng & nút xóa */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isZero ? '#94a3b8' : '#0f172a', lineHeight: 1.35 }}>
                    <span style={{ color: '#64748b', marginRight: '4px' }}>{idx + 1}.</span>
                    {item.tenHang}
                  </div>
                  {isZero ? (
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.originalQty)}
                      title="Khôi phục lại mặt hàng này"
                      style={{
                        background: 'none',
                        border: '1px solid #94a3b8',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontSize: '0.6875rem',
                        color: '#475569',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Bỏ qua (Bấm để lấy lại)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, 0)}
                      title="Không phê duyệt sản xuất/mua mặt hàng này"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        padding: '2px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>

                {/* Badges SKU / BOM / Đơn giá */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                  {item.sku && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#475569', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                      SKU: {item.sku}
                    </span>
                  )}
                  {item.bomCode && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                      BOM: {item.bomCode}
                    </span>
                  )}
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Đơn giá: {fmtVnd(item.donGia)}
                  </span>
                </div>

                {/* Bộ điều khiển tăng / giảm số lượng */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '2px',
                    paddingTop: '6px',
                    borderTop: '1px dashed #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Nút giảm 1 */}
                    <button
                      type="button"
                      disabled={item.soLuong <= 0}
                      onClick={() => handleStepQty(idx, -1)}
                      title="Giảm 1"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: item.soLuong <= 0 ? '#f1f5f9' : '#ffffff',
                        color: item.soLuong <= 0 ? '#cbd5e1' : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: item.soLuong <= 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      <Dash size={14} />
                    </button>

                    {/* Ô nhập số lượng trực tiếp */}
                    <input
                      type="number"
                      min={0}
                      value={item.soLuong}
                      onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                      style={{
                        width: 56,
                        height: 28,
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        color: isZero ? '#94a3b8' : '#0f172a',
                        border: isRowModified ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                      }}
                    />

                    {/* Nút tăng 1 */}
                    <button
                      type="button"
                      onClick={() => handleStepQty(idx, 1)}
                      title="Tăng 1"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      <Plus size={14} />
                    </button>

                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '2px' }}>
                      {item.donVi}
                    </span>
                  </div>

                  {/* Thành tiền dòng */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: isZero ? '#94a3b8' : '#0284c7' }}>
                      {fmtVnd(item.thanhTien)}
                    </div>
                    {isRowModified && (
                      <div style={{ fontSize: '0.6875rem', color: '#b45309' }}>
                        Gốc: {item.originalQty} {item.donVi}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Slide */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-1, #ffffff)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={onClose}>
          Đóng
        </Button>

        <Button
          variant={saveSuccess ? 'success' : isModified ? 'primary' : 'primary'}
          size="sm"
          leftIcon={saveSuccess ? <CheckCircle size={14} /> : <Check2 size={15} />}
          isLoading={isSaving}
          onClick={handleSave}
        >
          {saveSuccess ? 'Đã lưu thay đổi!' : isModified ? 'Lưu số lượng mới' : 'Lưu & Áp dụng'}
        </Button>
      </div>
    </div>
  );
};
