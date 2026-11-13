import React from 'react';
import {
  ArrowLeft,
  BoxSeam,
  Building,
  CalendarDate,
  CreditCard,
  Truck,
} from 'react-bootstrap-icons';
import { Button } from '../../../../components/common/Button';
import { Badge } from '../../../../components/common/Badge';
import type { ApprovalDocument } from '../DocumentApprovalView';

export interface PurchaseOrderDetailSlideProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocument;
}

interface POItemMeta {
  tenHang: string;
  donVi?: string | null;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ngayGiao?: string | null;
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
}) => {
  if (!isOpen) return null;

  const meta = document.metadata || {};
  const poItems: POItemMeta[] = Array.isArray(meta.items) ? meta.items : [];
  const tongTienHang = Number(meta.tongTienHang || 0);
  const thueVAT = Number(meta.thueVAT ?? 0);
  const tienThue = Number(meta.tienThue || 0);
  const tongCong = Number(meta.tongCong || meta.totalAmount || document.value || 0);
  const datCocPct = Number(meta.datCocPct || 0);
  const tienDatCoc = Number(meta.tienDatCoc || (datCocPct > 0 ? Math.round((tongCong * datCocPct) / 100) : 0));

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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
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
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
            Chi tiết đơn mua hàng
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {document.code} {meta.supplierName ? `• ${meta.supplierName}` : ''}
          </div>
        </div>
        <Badge variant="brand">{poItems.length} mặt hàng</Badge>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Thông tin chung */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 600 }}>
            <Building size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
            <span>NCC: {meta.supplierName || 'Chưa cập nhật'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDate size={13} style={{ color: '#64748b', flexShrink: 0 }} />
              <span>Ngày đặt: {fmtDateStr(meta.ngayDat)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={13} style={{ color: '#64748b', flexShrink: 0 }} />
              <span>{meta.hinhThucTT || 'Chuyển khoản'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={13} style={{ color: '#64748b', flexShrink: 0 }} />
              <span>{meta.hinhThucGH || 'Giao hàng tận nơi'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#64748b' }}>Phương tiện:</span>
              <span>{meta.phuongTien || 'Xe tải'}</span>
            </div>
          </div>
          {meta.ghiChu && (
            <div style={{ fontSize: '0.75rem', color: '#334155', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
              Ghi chú: {meta.ghiChu}
            </div>
          )}
        </div>

        {/* Tổng hợp giá trị & đặt cọc */}
        <div
          style={{
            border: '1px solid rgba(2, 132, 199, 0.2)',
            borderRadius: '10px',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.8125rem',
          }}
        >
          {tongTienHang > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Cộng tiền hàng:</span>
              <span style={{ fontWeight: 600 }}>{fmtVnd(tongTienHang)}</span>
            </div>
          )}
          {thueVAT > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Thuế GTGT ({thueVAT}%):</span>
              <span style={{ fontWeight: 600 }}>{fmtVnd(tienThue)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1', fontWeight: 700, borderTop: '1px dashed rgba(2, 132, 199, 0.25)', paddingTop: '6px' }}>
            <span>Tổng giá trị đơn hàng:</span>
            <span>{fmtVnd(tongCong)}</span>
          </div>
          {datCocPct > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 700, backgroundColor: '#fef3c7', padding: '6px 8px', borderRadius: '6px', marginTop: '2px' }}>
              <span>Yêu cầu đặt cọc ({datCocPct}%):</span>
              <span>{fmtVnd(tienDatCoc)}</span>
            </div>
          )}
        </div>

        {/* Danh sách hàng hoá */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            <BoxSeam size={14} style={{ color: '#0284c7' }} />
            <span>Danh sách hàng hoá ({poItems.length})</span>
          </div>

          {poItems.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              Chưa có danh sách hàng hoá chi tiết đính kèm trong hồ sơ.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {poItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.35 }}>
                      {idx + 1}. {item.tenHang}
                    </span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>
                      {fmtVnd(item.thanhTien)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>
                      SL: <strong style={{ color: '#334155' }}>{item.soLuong} {item.donVi || ''}</strong> × {fmtVnd(item.donGia)}
                    </span>
                    {item.ngayGiao && <span>Giao: {fmtDateStr(item.ngayGiao)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          backgroundColor: 'var(--bg-surface-1, #ffffff)',
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0,
        }}
      >
        <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={onClose}>
          Quay lại hồ sơ
        </Button>
      </div>
    </div>
  );
};

