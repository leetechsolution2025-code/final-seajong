import React, { useState, useEffect } from 'react';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { NumberInput } from '../../../components/common/NumberInput';
import { Input } from '../../../components/common/Input';
import {
  CheckCircle,
  Printer,
  BoxSeam,
  FileText,
  PencilSquare,
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
  onReconcileSuccess?: (updatedParent: any, newAmount: number, targetCode: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
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
  onReconcileSuccess,
  onShowToast,
  userName = 'Lê Công Vụ',
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'items'>('info');
  const [items, setItems] = useState<DebtSubEntryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  // State cho chức năng Đối soát sửa giá trị tiền đã nhập
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconcileTargetId, setReconcileTargetId] = useState<string>('');
  const [reconcileTargetCode, setReconcileTargetCode] = useState<string>('');
  const [reconcileOriginalAmount, setReconcileOriginalAmount] = useState<number>(0);
  const [reconcileAmount, setReconcileAmount] = useState<number>(0);
  const [reconcileNote, setReconcileNote] = useState<string>('');
  const [reconcilingSaving, setReconcilingSaving] = useState<boolean>(false);
  const [localReconciliationEntries, setLocalReconciliationEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !selectedSubEntry) {
      setActiveTab('info');
      setItems([]);
      setIsReconciling(false);
      setLocalReconciliationEntries([]);
      return;
    }

    setIsReconciling(false);
    setLocalReconciliationEntries([]);

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

  const isReconciliationVoucher =
    entry.isReconciliation ||
    entry.type === 'reconciliation' ||
    entry.voucherType === 'reconciliation' ||
    String(entry.code || '').startsWith('DS-');

  const isPaymentVoucher =
    !isReconciliationVoucher &&
    (entry.isReceipt ||
      entry.type === 'payment' ||
      entry.type === 'receipt' ||
      entry.voucherType === 'payment' ||
      entry.voucherType === 'receipt' ||
      entry.statusLabel === 'Đã chi tiền' ||
      String(entry.code || '').startsWith('PT-') ||
      String(entry.code || '').startsWith('PC-') ||
      String(entry.code || '').startsWith('UNC-') ||
      String(entry.code || '').startsWith('CHI-'));

  const origAmount = Number(
    isRec ? (entry.contractValue ?? entry.amount ?? 0) : (entry.totalAmount ?? entry.amount ?? 0)
  );
  const paidAmount = Number(
    entry.paidAmount ?? (isReturn || isPaymentVoucher || isReconciliationVoucher ? origAmount : 0)
  );
  const remainingAmount = Number(
    entry.remainingAmount !== undefined
      ? entry.remainingAmount
      : isReturn || isPaymentVoucher || isReconciliationVoucher
      ? 0
      : Math.max(0, origAmount - paidAmount)
  );

  const partnerTitle = isRec ? 'Khách hàng đối tác' : 'Nhà cung cấp';
  const partnerName =
    parent.customerName || parent.supplierName || parent.name || entry.customerName || 'Khách hàng';
  const partnerAddress =
    parent.customerAddress || parent.supplierAddress || parent.address || entry.customerAddress || '';
  const docParentCode = parent.code
    ? isRec
      ? `Hợp đồng số ${parent.code}`
      : `Đơn mua hàng PO ${parent.poCode || parent.code}`
    : entry.code || '---';

  const cleanTitle = (entry.title || entry.note || '')
    .replace(new RegExp(`\\s*[-–—]\\s*${partnerName}.*$`, 'i'), '')
    .trim();

  const openReconcileForEntry = () => {
    const codeStr = String(entry.code || '');
    setActiveTab('info');
    setReconcileTargetId(String(entry.id || ''));
    setReconcileTargetCode(codeStr);
    const defaultAmt = Math.abs(
      isPaymentVoucher || isReturn || isReconciliationVoucher ? (paidAmount || origAmount) : (paidAmount > 0 ? paidAmount : origAmount)
    );
    setReconcileOriginalAmount(defaultAmt);
    setReconcileAmount(defaultAmt);
    setReconcileNote(`Đối soát công nợ chứng từ ${codeStr}`.trim());
    setIsReconciling(true);
  };

  const openReconcileForSubPayment = (p: any) => {
    const pCode = String(p.code || p.receiptCode || '');
    const currentAmt = Math.abs(Number(p.amount) || 0);
    setActiveTab('info');
    setReconcileTargetId(String(p.id || ''));
    setReconcileTargetCode(pCode);
    setReconcileOriginalAmount(currentAmt);
    setReconcileAmount(currentAmt);
    setReconcileNote(`Đối soát công nợ chứng từ ${pCode}`.trim());
    setIsReconciling(true);
  };

  const isReconcileSaveDisabled =
    reconcilingSaving ||
    !reconcileAmount ||
    Math.round(Number(reconcileAmount) || 0) <= 0 ||
    Math.round(Number(reconcileAmount) || 0) === Math.round(Number(reconcileOriginalAmount) || 0);

  const handleSaveReconcile = async () => {
    const nextVal = Math.max(0, Math.round(Number(reconcileAmount) || 0));
    const origVal = Math.max(0, Math.round(Number(reconcileOriginalAmount) || 0));
    if (nextVal <= 0 || nextVal === origVal) {
      return;
    }

    setReconcilingSaving(true);
    try {
      const isSubPayment = reconcileTargetCode && reconcileTargetCode !== String(entry.code || '');
      const res = await fetch('/api/debts/reconcile-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isRec ? 'receivable' : 'payable',
          parentId: parent.id,
          parentCode: parent.code,
          entryId: reconcileTargetId || entry.id,
          entryCode: entry.code,
          paymentCode: isSubPayment ? reconcileTargetCode : undefined,
          originalAmount: origVal,
          newAmount: nextVal,
          note: reconcileNote.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        onShowToast?.('warning', 'Không thể lưu đối soát', data?.error || 'Số tiền đối soát không hợp lệ');
        return;
      }

      const deltaVal = nextVal - origVal;
      const targetVoucherCode = reconcileTargetCode || entry.code;
      const createdVoucher = data?.reconciliationEntry || {
        id: `DS-LOCAL-${Date.now()}`,
        code: `DS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
        title:
          reconcileNote.trim() ||
          `Đối soát công nợ chứng từ ${targetVoucherCode}`,
        date: new Date().toLocaleDateString('vi-VN'),
        time: new Date().toTimeString().slice(0, 5),
        amount: deltaVal,
        paidAmount: deltaVal,
        originalAmount: origVal,
        reconciledAmount: nextVal,
        refVoucherCode: reconcileTargetCode || entry.code,
        method: 'Đối soát công nợ',
        type: 'reconciliation',
        typeLabel: 'Đối soát',
        isReconciliation: true,
      };

      setLocalReconciliationEntries((prev) => [...prev, createdVoucher]);
      setIsReconciling(false);
      onReconcileSuccess?.(data?.updatedParent || null, nextVal, reconcileTargetCode || entry.code);
      onShowToast?.(
        'success',
        'Đã tạo chứng từ đối soát',
        `Đã lập chứng từ ${createdVoucher.code} (${deltaVal > 0 ? '+' : ''}${formatNumberGroup(deltaVal)} đ) cho ${reconcileTargetCode || entry.code}`
      );
      window.dispatchEvent(new CustomEvent('seajong_finance_updated'));
    } catch {
      onShowToast?.('error', 'Lỗi đối soát', 'Không thể lưu dữ liệu đối soát, vui lòng thử lại');
    } finally {
      setReconcilingSaving(false);
    }
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={false}
      title={
        isReconciliationVoucher
          ? 'Chi tiết chứng từ đối soát'
          : isReturn
          ? 'Chi tiết giảm trừ công nợ'
          : isPaymentVoucher
          ? isRec
            ? 'Chi tiết phiếu thu'
            : 'Chi tiết phiếu chi'
          : 'Chi tiết khoản nợ'
      }
      description={`Phiếu phát sinh mã ${entry.code || '---'}`}
      width="400px"
      position="right"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isReconciling ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReconciling(false)}
                  disabled={reconcilingSaving}
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={reconcilingSaving}
                  disabled={isReconcileSaveDisabled}
                  onClick={handleSaveReconcile}
                  leftIcon={<CheckCircle size={14} />}
                >
                  Lưu đối soát
                </Button>
              </>
            ) : (
              <>
                {!isReconciliationVoucher && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openReconcileForEntry}
                    leftIcon={<PencilSquare size={13} />}
                  >
                    Đối soát
                  </Button>
                )}
                {!isReturn && !isPaymentVoucher && !isReconciliationVoucher && remainingAmount > 0 && onConfirmPayment && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
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
              </>
            )}
          </div>
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

            {/* Tổng tiền hàng đặt ngay dưới Mã đơn hàng */}
            {!loadingItems && items.length > 0 && (
              <div
                style={{
                  padding: '10px 14px',
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
                <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: isReturn ? '#b45309' : '#15803d' }}>
                  {formatNumberGroup(
                    items.reduce((acc: number, item: any) => acc + (Number(item.thanhTien || item.total) || ((Number(item.soLuong || item.quantity) || 1) * (Number(item.donGia || item.price) || 0))), 0)
                  )} đ
                </div>
              </div>
            )}

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
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.625rem' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Hàng hoá</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
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
                          <tr
                            key={prod.id || pIdx}
                            style={{
                              borderBottom: pIdx === items.length - 1 ? 'none' : '1px solid #f1f5f9',
                            }}
                          >
                            <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: '1.35' }}>
                                {prod.tenHang || prod.productName}
                              </div>
                              {(displayCode || displayBom) && (
                                <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                                  {displayCode && <span>Mã: {displayCode}</span>}
                                  {displayBom && <span>{displayCode ? ' • ' : ''}ĐM: {displayBom}</span>}
                                </div>
                              )}
                              <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>SL: <strong style={{ color: '#334155' }}>{qty} {unit}</strong></span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span>Đơn giá: <strong style={{ color: '#334155' }}>{formatNumberGroup(price)} đ</strong></span>
                              </div>
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', fontWeight: 700, color: isReturn ? '#d97706' : '#0369a1' }}>
                              {formatNumberGroup(total)} đ
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

            {/* Khung Đối soát điều chỉnh giá trị tiền đã nhập */}
            {isReconciling && (
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.8125rem' }}>
                    Đối soát giá trị tiền
                  </span>
                  <Badge variant="brand">{reconcileTargetCode || entry.code}</Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Số tiền gốc: </span>
                    <strong style={{ color: '#0f172a' }}>{formatNumberGroup(reconcileOriginalAmount)} đ</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Chênh lệch: </span>
                    <strong
                      style={{
                        color:
                          Math.round(Number(reconcileAmount) || 0) - Math.round(Number(reconcileOriginalAmount) || 0) > 0
                            ? '#059669'
                            : Math.round(Number(reconcileAmount) || 0) - Math.round(Number(reconcileOriginalAmount) || 0) < 0
                            ? '#dc2626'
                            : '#64748b',
                      }}
                    >
                      {(() => {
                        const diff = Math.round(Number(reconcileAmount) || 0) - Math.round(Number(reconcileOriginalAmount) || 0);
                        return `${diff > 0 ? '+' : ''}${formatNumberGroup(diff)} đ`;
                      })()}
                    </strong>
                  </div>
                </div>

                <NumberInput
                  label="Số tiền sau đối soát"
                  required
                  hideZero={false}
                  suffix="₫"
                  value={reconcileAmount}
                  onValueChange={(val) => setReconcileAmount(val)}
                />

                <Input
                  label="Nội dung chi tiết / Lý do điều chỉnh"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  placeholder="Nhập nội dung đối soát..."
                />
              </div>
            )}

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
                    backgroundColor: isReconciliationVoucher
                      ? '#f5f3ff'
                      : isReturn
                      ? '#fef3c7'
                      : remainingAmount <= 0
                      ? '#dcfce7'
                      : '#eff6ff',
                    color: isReconciliationVoucher
                      ? '#6d28d9'
                      : isReturn
                      ? '#b45309'
                      : remainingAmount <= 0
                      ? '#15803d'
                      : '#1d4ed8',
                    border: `1px solid ${
                      isReconciliationVoucher
                        ? '#ddd6fe'
                        : isReturn
                        ? '#fde68a'
                        : remainingAmount <= 0
                        ? '#86efac'
                        : '#bfdbfe'
                    }`,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.7188rem',
                  }}
                >
                  {isReconciliationVoucher
                    ? paidAmount >= 0
                      ? 'Đối soát bổ sung'
                      : 'Đối soát giảm trừ'
                    : isReturn
                    ? 'Đã giảm trừ'
                    : isPaymentVoucher
                    ? isRec
                      ? 'Đã thu tiền'
                      : 'Đã chi tiền'
                    : remainingAmount <= 0
                    ? isRec
                      ? 'Đã thu đủ'
                      : 'Đã thanh toán'
                    : 'Đang theo dõi'}
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

            {/* Lịch sử các phiếu thu / Giảm trừ / Đối soát của chứng từ này */}
            {((entry.payments && entry.payments.length > 0) || localReconciliationEntries.length > 0) && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Chứng từ thanh toán & Đối soát</span>
                  <Badge variant="brand">{(entry.payments?.length || 0) + localReconciliationEntries.length} chứng từ</Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[...(entry.payments || []), ...localReconciliationEntries].map((p: any, idx: number) => {
                    const pCode = String(p.code || p.receiptCode || '');
                    const rawPayAmount = Number(p.amount ?? p.paidAmount) || 0;
                    const displayPayAmount = Math.abs(rawPayAmount);
                    const isRecon =
                      p.isReconciliation ||
                      p.type === 'reconciliation' ||
                      pCode.startsWith('DS-');
                    const isRet =
                      !isRecon &&
                      (p.isReturn ||
                        p.type === 'return_deduction' ||
                        pCode.startsWith('ERR-') ||
                        String(p.title || '').toLowerCase().includes('trả lại') ||
                        String(p.note || '').toLowerCase().includes('trả lại') ||
                        String(p.title || '').toLowerCase().includes('hàng lỗi'));

                    return (
                      <div key={p.id || idx} style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                backgroundColor: isRecon ? '#f5f3ff' : isRet ? '#fef3c7' : '#eff6ff',
                                color: isRecon ? '#6d28d9' : isRet ? '#b45309' : '#1d4ed8',
                                border: `1px solid ${isRecon ? '#ddd6fe' : isRet ? '#fde68a' : '#bfdbfe'}`,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                              }}
                            >
                              {isRecon ? 'Đối soát' : isRet ? 'Giảm trừ công nợ' : 'Phiếu thu'}
                            </span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{pCode}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                color: isRecon
                                  ? rawPayAmount >= 0
                                    ? '#059669'
                                    : '#dc2626'
                                  : isRet
                                  ? '#d97706'
                                  : '#059669',
                              }}
                            >
                              {isRecon ? (rawPayAmount >= 0 ? '+' : '-') : isRet ? '-' : '+'}
                              {formatNumberGroup(displayPayAmount)} đ
                            </span>
                            {!isRecon && (
                              <button
                                type="button"
                                title="Đối soát chứng từ này"
                                onClick={() => openReconcileForSubPayment(p)}
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#475569',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                <PencilSquare size={11} />
                              </button>
                            )}
                            {onPrintReceipt && !isRecon && (
                              <button
                                type="button"
                                title={isRet ? 'Xem chứng từ giảm trừ công nợ A4' : 'Xem và in phiếu thu A4'}
                                onClick={() => {
                                  const isBankTransfer = !isRet && ((p.method || '').toLowerCase().includes('khoản') || (p.method || '').toLowerCase().includes('ngân hàng'));
                                  onPrintReceipt({
                                    code: pCode || (isRet ? 'BBGT-20261109' : 'PT-20261004'),
                                    date: p.date || '23/10/2026',
                                    customerName: partnerName,
                                    customerAddress: partnerAddress,
                                    amount: displayPayAmount,
                                    reason: p.title || p.note || (isRet ? `Giảm trừ công nợ do trả lại hàng - ${cleanTitle}` : `Thu tiền khách hàng - ${cleanTitle}`),
                                    contractCode: parent.code,
                                    stageTitle: cleanTitle,
                                    paymentMethod: isRet ? (p.method || 'Cấn trừ hàng trả lại') : (p.method || 'Chuyển khoản'),
                                    debitAccount: isRet ? '5212' : isBankTransfer ? '1121' : '1111',
                                    creditAccount: '131',
                                    notes: isRet ? 'Hồ sơ hàng trả lại (ERR)' : isBankTransfer ? 'Giấy báo Có ngân hàng' : '01 Chứng từ gốc',
                                    creator: userName,
                                    accountant: '',
                                    cashier: '',
                                    director: 'Lê Công Vụ',
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
                          {p.time || '08:30'} • {p.date} • <span style={{ fontStyle: 'italic' }}>({isRecon ? (p.title || 'Đối soát công nợ') : isRet ? (p.method || 'Cấn trừ hàng trả lại') : (p.method || 'Chuyển khoản')})</span>
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
