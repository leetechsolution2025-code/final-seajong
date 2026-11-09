import React, { useState, useEffect } from 'react';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import {
  CheckCircle,
  Printer,
  BoxSeam,
  FileText,
} from 'react-bootstrap-icons';

export interface DebtSubEntryItem {
  id?: string;
  tenHang?: string;
  productName?: string;
  soLuong?: number;
  quantity?: number;
  donGia?: number;
  price?: number;
  thanhTien?: number;
  total?: number;
  donViTinh?: string;
  donVi?: string;
  inventoryCode?: string;
  productCode?: string;
  dinhMucId?: string;
  ghiChu?: string;
}

export interface DebtSubEntryDetailOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSubEntry: {
    entry: any;
    parent?: any;
    type?: 'receivable' | 'payable';
  } | null;
  onConfirmPayment?: (parent: any, entry: any) => void;
  onPrintReceipt?: (receiptData: any) => void;
  userName?: string;
}

function formatNumberGroup(num?: number | string): string {
  if (num === undefined || num === null || num === '') return '0';
  const val = Math.round(Number(num) || 0);
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const DebtSubEntryDetailOffcanvas: React.FC<DebtSubEntryDetailOffcanvasProps> = ({
  isOpen,
  onClose,
  selectedSubEntry,
  onConfirmPayment,
  onPrintReceipt,
  userName = 'Lê Công Vụ',
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'items'>('info');
  const [items, setItems] = useState<DebtSubEntryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !selectedSubEntry) {
      setActiveTab('info');
      setItems([]);
      return;
    }

    const entry = selectedSubEntry.entry;
    if (entry?.items && Array.isArray(entry.items) && entry.items.length > 0) {
      setItems(entry.items);
    } else if (entry?.code) {
      setLoadingItems(true);
      fetch(`/api/debts/order-items/${encodeURIComponent(entry.code)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
          } else {
            setItems([]);
          }
        })
        .catch(() => setItems([]))
        .finally(() => setLoadingItems(false));
    } else {
      setItems([]);
    }
  }, [isOpen, selectedSubEntry]);

  if (!selectedSubEntry) return null;

  const isRec = selectedSubEntry.type !== 'payable';
  const entry = selectedSubEntry.entry;
  const parent = selectedSubEntry.parent || {};

  const isReturn =
    entry.isReturn ||
    entry.type === 'return_deduction' ||
    String(entry.code || '').startsWith('ERR-') ||
    String(entry.title || '').toLowerCase().includes('trả lại') ||
    String(entry.title || '').toLowerCase().includes('hàng lỗi');

  const origAmount = Number(isRec ? (entry.contractValue || entry.amount || 0) : (entry.totalAmount || entry.amount || 0));
  const paidAmount = Number(entry.paidAmount || (isReturn ? origAmount : 0));
  const remainingAmount = Number(entry.remainingAmount !== undefined ? entry.remainingAmount : (isReturn ? 0 : Math.max(0, origAmount - paidAmount)));

  const partnerTitle = isRec ? 'Khách hàng đối tác' : 'Nhà cung cấp';
  const partnerName = parent.customerName || parent.supplierName || parent.name || entry.customerName || 'Khách hàng';
  const partnerAddress = parent.customerAddress || parent.supplierAddress || parent.address || entry.customerAddress || '';
  const docParentCode = parent.code ? (isRec ? `Hợp đồng số ${parent.code}` : `Đơn mua hàng PO ${parent.poCode || parent.code}`) : (entry.code || '---');

  const cleanTitle = (entry.title || entry.note || '')
    .replace(new RegExp(`\\s*[-–—]\\s*${partnerName}.*$`, 'i'), '')
    .trim();

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      title={isReturn ? 'Chi tiết giảm trừ công nợ' : 'Chi tiết khoản nợ'}
      description={`Phiếu phát sinh mã ${entry.code || '---'}`}
      width="400px"
      position="right"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          {!isReturn && remainingAmount > 0 && onConfirmPayment && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onClose();
                onConfirmPayment(parent, entry);
              }}
              leftIcon={<CheckCircle size={14} />}
              style={{ fontWeight: 700 }}
            >
              Xác nhận thanh toán
            </Button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8125rem' }}>
        {/* Bộ chuyển Slide: Thông tin khoản nợ vs Danh sách hàng hoá */}
        <div
          style={{
            display: 'flex',
            padding: '3px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '0.7813rem',
              fontWeight: activeTab === 'info' ? 700 : 500,
              color: activeTab === 'info' ? '#0f172a' : '#64748b',
              backgroundColor: activeTab === 'info' ? '#ffffff' : 'transparent',
              borderRadius: '6px',
              border: 'none',
              boxShadow: activeTab === 'info' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={13} style={{ color: activeTab === 'info' ? '#2563eb' : '#94a3b8' }} />
            <span>Thông tin khoản nợ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '0.7813rem',
              fontWeight: activeTab === 'items' ? 700 : 500,
              color: activeTab === 'items' ? '#0f172a' : '#64748b',
              backgroundColor: activeTab === 'items' ? '#ffffff' : 'transparent',
              borderRadius: '6px',
              border: 'none',
              boxShadow: activeTab === 'items' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <BoxSeam size={13} style={{ color: activeTab === 'items' ? '#2563eb' : '#94a3b8' }} />
            <span>Danh sách hàng hoá</span>
            {items.length > 0 && (
              <span
                style={{
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  backgroundColor: activeTab === 'items' ? '#eff6ff' : '#e2e8f0',
                  color: activeTab === 'items' ? '#1d4ed8' : '#475569',
                }}
              >
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* ── NỘI DUNG SLIDE 2: DANH SÁCH HÀNG HOÁ TRONG ĐƠN HÀNG / HÀNG TRẢ VỀ ── */}
        {activeTab === 'items' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header tóm tắt đơn hàng */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: isReturn ? '#fffbeb' : '#f8fafc',
                border: `1px solid ${isReturn ? '#fde68a' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: isReturn ? '#b45309' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  {isReturn ? 'Hồ sơ hàng trả về' : 'Mã đơn hàng'}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{entry.code}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tổng sản phẩm</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isReturn ? '#d97706' : '#2563eb' }}>
                  {items.length} mặt hàng
                </div>
              </div>
            </div>

            {loadingItems ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
                <div style={{ fontSize: '0.7813rem', marginTop: '10px' }}>Đang nạp danh sách hàng hoá...</div>
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                <BoxSeam size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#334155' }}>Chưa có danh sách mặt hàng</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Khoản nợ này không chứa chi tiết bóc tách từng mặt hàng.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((prod: any, pIdx: number) => {
                  const qty = Number(prod.soLuong || prod.quantity) || 1;
                  const price = Number(prod.donGia || prod.price) || 0;
                  const total = Number(prod.thanhTien || prod.total) || (qty * price);
                  const unit = prod.donViTinh || prod.donVi || 'Bộ';
                  let parsedNote: any = {};
                  if (prod.ghiChu && typeof prod.ghiChu === 'string' && prod.ghiChu.trim().startsWith('{')) {
                    try {
                      parsedNote = JSON.parse(prod.ghiChu);
                    } catch {}
                  }
                  const displayCode = prod.inventoryCode || prod.productCode || parsedNote.code || '';
                  const displayBom = parsedNote.bomCode || (prod.dinhMucId && !String(prod.dinhMucId).startsWith('cm') ? prod.dinhMucId : '');

                  return (
                    <div
                      key={prod.id || pIdx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', lineHeight: '1.3' }}>
                            {prod.tenHang || prod.productName}
                          </div>
                          {(displayCode || displayBom) && (
                            <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '3px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {displayCode && <span>Mã: <strong>{displayCode}</strong></span>}
                              {displayBom && <span>{displayCode ? '• ' : ''}Định mức: <strong>{displayBom}</strong></span>}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            backgroundColor: isReturn ? '#fef3c7' : '#eff6ff',
                            color: isReturn ? '#b45309' : '#1d4ed8',
                            border: `1px solid ${isReturn ? '#fde68a' : '#bfdbfe'}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          SL: {qty} {unit}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '8px',
                          borderTop: '1px dashed #f1f5f9',
                          fontSize: '0.7813rem',
                        }}
                      >
                        <div style={{ color: '#64748b' }}>
                          Đơn giá: <strong style={{ color: '#334155' }}>{formatNumberGroup(price)} đ</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#64748b', marginRight: '6px' }}>Thành tiền:</span>
                          <strong style={{ color: isReturn ? '#d97706' : '#0369a1', fontSize: '0.875rem' }}>
                            {formatNumberGroup(total)} đ
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Tổng kết tiền hàng */}
                <div
                  style={{
                    marginTop: '4px',
                    padding: '12px 14px',
                    backgroundColor: isReturn ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${isReturn ? '#fde68a' : '#bbf7d0'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7188rem', fontWeight: 600, color: isReturn ? '#b45309' : '#166534' }}>
                      {isReturn ? 'Tổng tiền hàng trả về' : 'Tổng tiền hàng'}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: isReturn ? '#d97706' : '#15803d' }}>
                      ({items.reduce((acc: number, item: any) => acc + (Number(item.soLuong || item.quantity) || 1), 0)} sản phẩm)
                    </div>
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: isReturn ? '#b45309' : '#15803d' }}>
                    {formatNumberGroup(
                      items.reduce((acc: number, item: any) => acc + (Number(item.thanhTien || item.total) || ((Number(item.soLuong || item.quantity) || 1) * (Number(item.donGia || item.price) || 0))), 0)
                    )} đ
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NỘI DUNG SLIDE 1: THÔNG TIN KHOẢN NỢ ── */}
        {activeTab === 'info' && (
          <>
            {/* Thẻ hiển thị số tiền còn lại nổi bật */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: isReturn ? '#fffbeb' : (remainingAmount > 0 ? '#fef2f2' : '#f0fdf4'),
                border: `1px solid ${isReturn ? '#fde68a' : (remainingAmount > 0 ? '#fecaca' : '#bbf7d0')}`,
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isReturn ? '#b45309' : (remainingAmount > 0 ? '#991b1b' : '#166534') }}>
                {isReturn ? 'Số tiền giảm trừ công nợ' : (isRec ? 'Số tiền còn phải thu' : 'Số tiền còn phải trả')}
              </div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: isReturn ? '#b45309' : (remainingAmount > 0 ? '#dc2626' : '#16a34a'),
                  marginTop: '2px',
                }}
              >
                {isReturn ? `-${formatNumberGroup(origAmount)} đ` : `${formatNumberGroup(remainingAmount)} đ`}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px dashed ${isReturn ? '#fde68a' : (remainingAmount > 0 ? '#fca5a5' : '#86efac')}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Giá trị phát sinh</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                    {formatNumberGroup(origAmount)} đ
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{isReturn ? 'Đã giảm trừ' : 'Đã thanh toán'}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isReturn ? '#d97706' : '#059669' }}>
                    {formatNumberGroup(paidAmount)} đ
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin chứng từ phát sinh */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Thông tin chứng từ
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Mã chứng từ:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{entry.code}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Thời gian lập phiếu:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {entry.time || '08:30'} • Ngày {entry.date}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Hạn thanh toán:</span>
                <span style={{ fontWeight: 700, color: isReturn ? '#b45309' : '#b91c1c' }}>
                  {entry.dueDate || entry.date || '---'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Trạng thái:</span>
                <span
                  style={{
                    backgroundColor: isReturn ? '#fef3c7' : (remainingAmount <= 0 ? '#dcfce7' : '#eff6ff'),
                    color: isReturn ? '#b45309' : (remainingAmount <= 0 ? '#15803d' : '#1d4ed8'),
                    border: `1px solid ${isReturn ? '#fde68a' : (remainingAmount <= 0 ? '#86efac' : '#bfdbfe')}`,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.7188rem',
                  }}
                >
                  {isReturn ? 'Đã giảm trừ' : (remainingAmount <= 0 ? 'Đã thu đủ' : 'Đang theo dõi')}
                </span>
              </div>
            </div>

            {/* Nội dung diễn giải */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                Nội dung chi tiết
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: '1.45', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                {cleanTitle || 'Khoản phát sinh công nợ'}
              </div>
            </div>

            {/* Thông tin đối tác liên quan */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                {partnerTitle}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    color: isRec ? '#0284c7' : '#b91c1c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {partnerName}
                </div>
                {partnerAddress && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                    {partnerAddress}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#475569', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                Căn cứ theo: <strong>{docParentCode}</strong>
              </div>
            </div>

            {/* Lịch sử các phiếu thu / Giảm trừ công nợ của đợt thanh toán này */}
            {entry.payments && entry.payments.length > 0 && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Chứng từ thanh toán & Giảm trừ</span>
                  <Badge variant="brand">{entry.payments.length} chứng từ</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {entry.payments.map((p: any, idx: number) => {
                    const isRet =
                      p.isReturn ||
                      p.type === 'return_deduction' ||
                      String(p.code || p.receiptCode || '').startsWith('ERR-') ||
                      String(p.title || '').toLowerCase().includes('trả lại') ||
                      String(p.note || '').toLowerCase().includes('trả lại') ||
                      String(p.title || '').toLowerCase().includes('hàng lỗi');

                    return (
                      <div key={p.id || idx} style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                backgroundColor: isRet ? '#fef3c7' : '#eff6ff',
                                color: isRet ? '#b45309' : '#1d4ed8',
                                border: `1px solid ${isRet ? '#fde68a' : '#bfdbfe'}`,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                              }}
                            >
                              {isRet ? 'Giảm trừ công nợ' : 'Phiếu thu'}
                            </span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.code || p.receiptCode}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: isRet ? '#d97706' : '#059669' }}>
                              {isRet ? '-' : '+'}{formatNumberGroup(p.amount)} đ
                            </span>
                            {onPrintReceipt && (
                              <button
                                type="button"
                                title={isRet ? 'Xem chứng từ giảm trừ công nợ A4' : 'Xem và in phiếu thu A4'}
                                onClick={() => {
                                  const isBankTransfer = !isRet && ((p.method || '').toLowerCase().includes('khoản') || (p.method || '').toLowerCase().includes('ngân hàng'));
                                  onPrintReceipt({
                                    code: p.code || p.receiptCode || (isRet ? 'BBGT-20261109' : 'PT-20261004'),
                                    date: p.date || '23/10/2026',
                                    customerName: partnerName,
                                    customerAddress: partnerAddress,
                                    amount: p.amount,
                                    reason: p.title || p.note || (isRet ? `Giảm trừ công nợ do trả lại hàng - ${cleanTitle}` : `Thu tiền khách hàng - ${cleanTitle}`),
                                    contractCode: parent.code,
                                    stageTitle: cleanTitle,
                                    paymentMethod: isRet ? (p.method || 'Cấn trừ hàng trả lại') : (p.method || 'Chuyển khoản'),
                                    debitAccount: isRet ? '5212' : isBankTransfer ? '1121' : '1111',
                                    creditAccount: '131',
                                    notes: isRet ? 'Hồ sơ hàng trả lại (ERR)' : isBankTransfer ? 'Giấy báo Có ngân hàng' : '01 Chứng từ gốc',
                                    creator: userName,
                                    accountant: 'Mai Thị Ngọc',
                                    cashier: '',
                                    director: 'Hà Hải Lâm',
                                  });
                                }}
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isRet ? '#fde68a' : '#bfdbfe'}`,
                                  backgroundColor: isRet ? '#fffbeb' : '#eff6ff',
                                  color: isRet ? '#d97706' : '#2563eb',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <Printer size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '3px' }}>
                          {p.time || '08:30'} • {p.date} • <span style={{ fontStyle: 'italic' }}>({isRet ? (p.method || 'Cấn trừ hàng trả lại') : (p.method || 'Chuyển khoản')})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Offcanvas>
  );
};
export default DebtSubEntryDetailOffcanvas;
