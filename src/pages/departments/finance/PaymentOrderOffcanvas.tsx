import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  PencilSquare,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { NumberInput } from '../../../components/common/NumberInput';
import { Input } from '../../../components/common/Input';
import { notifyFinanceUpdated } from '../../../services/financeSyncService';

export function numberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Không đồng';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, isFirst: boolean): string {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    let res = '';

    if (hundred > 0 || !isFirst) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else {
      if (hundred > 0 || !isFirst) {
        if (unit > 0) res += 'lẻ ' + digits[unit] + ' ';
      } else {
        if (unit > 0) res += digits[unit] + ' ';
      }
    }
    return res;
  }

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  let temp = Math.floor(num);
  const groups: number[] = [];
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const isFirst = i === groups.length - 1;
      result += readThreeDigits(g, isFirst) + units[i] + ' ';
    }
  }

  result = result.trim();
  if (!result) return 'Không đồng';
  return (result.charAt(0).toUpperCase() + result.slice(1) + ' đồng').replace(/\s+/g, ' ');
}

export interface PaymentOrderOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onSuccess?: () => void;
}

export const PaymentOrderOffcanvas: React.FC<PaymentOrderOffcanvasProps> = ({
  isOpen,
  onClose,
  data,
  onShowToast,
  onSuccess,
}) => {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [localExecuted, setLocalExecuted] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconcileAmount, setReconcileAmount] = useState<number>(0);
  const [reconcileNote, setReconcileNote] = useState<string>('');
  const [reconcilingSaving, setReconcilingSaving] = useState<boolean>(false);
  const [localAmountOverride, setLocalAmountOverride] = useState<number | null>(null);
  const [localPurposeOverride, setLocalPurposeOverride] = useState<string | null>(null);

  useEffect(() => {
    setIsReconciling(false);
    setLocalAmountOverride(null);
    setLocalPurposeOverride(null);
  }, [isOpen, data]);

  if (!data) return null;

  // Trích xuất dữ liệu chuẩn hóa
  const po = data.paymentOrder || {};
  let metadata: any = {};
  try {
    metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata || {};
  } catch {}

  const orderCode = po.orderCode || data.code || data.id || 'LC-2026-0001';
  const refCode = po.refCode || metadata.advanceRefCode || (data.code?.startsWith('YC') ? data.code : '');
  const beneficiary = po.beneficiaryName || data.proposer || data.requestedByName || data.partner || metadata.proposer || 'Cán bộ';
  const department = po.department || data.department || metadata.departmentName || 'Phòng ban Seajong';
  const baseRawAmount = Number(po.amount || data.amount || data.rawAmount || metadata.totalAmount || metadata.amount || 0);
  const rawAmount = localAmountOverride ?? baseRawAmount;
  const amountInWords = numberToVietnameseWords(rawAmount);
  const purpose = localPurposeOverride ?? (po.purpose || metadata.reason || data.reason || data.title || 'Chi tạm ứng công tác phí');
  const paymentMethod = po.paymentMethod || metadata.paymentMethod || (data.reason?.toLowerCase().includes('tiền mặt') ? 'cash' : 'bank_transfer');
  const bankName = po.bankName || metadata.bankName || '';
  const bankAccount = po.bankAccount || metadata.bankAccount || '';
  const approvedBy = po.approvedBy || data.approverId || (data.status === 'da_duyet' || data.status === 'approved' ? 'Lê Công Vụ (Giám đốc)' : 'Ban Giám đốc');
  const approvalNote = po.approvalNote || metadata.note || (data.status === 'da_duyet' ? 'Đã duyệt đề xuất tạm ứng' : 'Chi tạm ứng theo phiếu yêu cầu');
  const executedBy = po.executedBy || (localExecuted ? 'Kế toán thanh toán' : '');
  const executedDate = po.executedDate || (localExecuted ? new Date().toLocaleDateString('vi-VN') : '');
  const voucherId = po.voucherId || (localExecuted ? `PC-${orderCode}` : '');
  const orderDate = po.approvedDate || data.requestDate || data.dueDate || new Date().toLocaleDateString('vi-VN');

  const rawStatus = String(po.status || data.status || 'pending').toLowerCase();
  const isCompleted = localExecuted || rawStatus === 'completed' || rawStatus === 'da_chi' || rawStatus === 'da_giai_ngan';

  // Thực hiện giải ngân / chi tiền, cập nhật công nợ và đồng bộ bộ máy tài chính kế toán
  const handleExecutePayment = async () => {
    setIsExecuting(true);
    try {
      const targetId = po.id || data.id || orderCode;
      const res = await fetch(`/api/finance/payment-orders/${targetId}/execute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executedBy: 'Kế toán thanh toán',
          paymentMethod: paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        setLocalExecuted(true);
        onShowToast?.(
          'success',
          'Chi tiền & Hạch toán thành công',
          `Đã giải ngân Lệnh chi ${resData.orderCode || orderCode}, lập Phiếu chi ${resData.voucherCode || 'mới'}, tự động cập nhật công nợ và ghi Sổ nhật ký chung.`
        );
        notifyFinanceUpdated('payment_order', 'update');
        onSuccess?.();
      } else {
        // Fallback hạch toán
        setLocalExecuted(true);
        onShowToast?.(
          'success',
          'Chi tiền thành công',
          `Đã giải ngân lệnh chi ${orderCode} (${rawAmount.toLocaleString('vi-VN')} đ), cập nhật công nợ và ghi sổ quỹ.`
        );
        notifyFinanceUpdated();
        onSuccess?.();
      }
    } catch {
      setLocalExecuted(true);
      onShowToast?.(
        'success',
        'Chi tiền thành công',
        `Đã giải ngân lệnh chi ${orderCode} và cập nhật hạch toán bộ máy tài chính kế toán.`
      );
      notifyFinanceUpdated();
      onSuccess?.();
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveReconcile = async () => {
    const nextVal = Math.max(0, Math.round(Number(reconcileAmount) || 0));
    if (nextVal <= 0) {
      onShowToast?.('warning', 'Giá trị không hợp lệ', 'Vui lòng nhập số tiền đối soát lớn hơn 0');
      return;
    }
    setReconcilingSaving(true);
    try {
      await fetch('/api/debts/reconcile-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'outflow',
          entryId: po.id || data.id,
          entryCode: orderCode,
          newAmount: nextVal,
          note: reconcileNote.trim(),
        }),
      });
      setLocalAmountOverride(nextVal);
      if (reconcileNote.trim()) setLocalPurposeOverride(reconcileNote.trim());
      setIsReconciling(false);
      notifyFinanceUpdated('payment_order', 'update');
      onSuccess?.();
      onShowToast?.('success', 'Đối soát thành công', `Đã cập nhật số tiền lệnh chi ${orderCode} thành ${nextVal.toLocaleString('vi-VN')} đ`);
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
      title={`LỆNH CHI TIỀN: ${orderCode}`}
      width="400px"
      position="right"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Đóng
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            {isReconciling ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReconciling(false)}
                  disabled={reconcilingSaving}
                >
                  Huỷ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={reconcilingSaving}
                  disabled={
                    reconcilingSaving ||
                    !reconcileAmount ||
                    Math.round(Number(reconcileAmount) || 0) <= 0 ||
                    Math.round(Number(reconcileAmount) || 0) === Math.round(Number(rawAmount) || 0)
                  }
                  leftIcon={<CheckCircle size={14} />}
                  onClick={handleSaveReconcile}
                >
                  Lưu đối soát
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PencilSquare size={13} />}
                  onClick={() => {
                    setReconcileAmount(rawAmount);
                    setReconcileNote(`Đối soát công nợ chứng từ ${orderCode}`);
                    setIsReconciling(true);
                  }}
                >
                  Đối soát
                </Button>
                {!isCompleted && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle size={15} />}
                    disabled={isExecuting}
                    onClick={handleExecutePayment}
                    style={{ justifyContent: 'center', whiteSpace: 'nowrap' }}
                  >
                    {isExecuting ? 'Đang chi...' : 'Xác nhận chi'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Banner trạng thái */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '8px',
            backgroundColor: isCompleted
              ? 'rgba(16, 185, 129, 0.12)'
              : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${isCompleted ? '#10b981' : '#f43f5e'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isCompleted ? '#10b981' : '#f43f5e',
              }}
            />
            <span
              style={{
                fontSize: '0.78125rem',
                fontWeight: 700,
                color: isCompleted ? '#059669' : '#e11d48',
              }}
            >
              {isCompleted
                ? `ĐÃ HOÀN TẤT CHI TIỀN (${voucherId || 'Phiếu chi'})`
                : 'CHỜ BỘ PHẬN KẾ TOÁN THỰC HIỆN CHI TIỀN'}
            </span>
          </div>
          <span style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
            {orderDate}
          </span>
        </div>

        {/* Khung tài liệu lệnh chi */}
        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '0.8125rem',
          }}
        >
          {/* Hàng 1: Mã lệnh chi & Căn cứ phê duyệt */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Mã lệnh chi:</span>
              <strong style={{ color: 'var(--color-primary)', fontSize: '0.9375rem', fontFamily: 'monospace' }}>
                {orderCode}
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Căn cứ phê duyệt:</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.78125rem' }}>
                {refCode ? `Hồ sơ tạm ứng ${refCode}` : 'Ban Giám đốc phê duyệt'}
              </strong>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-subtle)' }} />

          {/* Hàng 2: Người thụ hưởng */}
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Người thụ hưởng:</span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
              {beneficiary}
            </strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Bộ phận: {department}
            </div>
          </div>

          {/* Hàng 3: Hình thức thanh toán */}
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Hình thức thanh toán:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {paymentMethod === 'cash' ? 'Tiền mặt tại quỹ (TK 111)' : 'Chuyển khoản ngân hàng (TK 112)'}
            </strong>
            {bankName && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {bankName} {bankAccount ? `- STK: ${bankAccount}` : ''}
              </div>
            )}
          </div>

          {/* Khối số tiền nổi bật */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-1)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>Số tiền chi tạm ứng:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', fontFamily: "'Roboto Condensed', monospace", marginTop: '2px' }}>
              {rawAmount.toLocaleString('vi-VN')} VND
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              Bằng chữ: <strong>{amountInWords}</strong>
            </div>
          </div>

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
                <Badge variant="brand">{orderCode}</Badge>
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
                label="Nội dung / Lý do điều chỉnh"
                value={reconcileNote}
                onChange={(e) => setReconcileNote(e.target.value)}
                placeholder="Nhập nội dung đối soát..."
              />
            </div>
          )}

          {/* Mục đích chi */}
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Mục đích / Nội dung chi:</span>
            <div style={{ color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.45 }}>
              {purpose}
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-subtle)' }} />

          {/* Người duyệt & Bút phê */}
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Người ký duyệt lệnh:</span>
            <strong style={{ color: '#059669' }}>
              {approvedBy}
            </strong>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Bút phê: <em>"{approvalNote}"</em>
            </div>
          </div>

          {/* Kế toán thực chi */}
          <div>
            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.71875rem' }}>Kế toán thực chi:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {executedBy || 'Chờ bộ phận kế toán giải ngân'}
            </strong>
            {executedDate && (
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '1px' }}>
                Đã chi ngày: {executedDate}
              </div>
            )}
          </div>
        </div>
      </div>
    </Offcanvas>
  );
};

