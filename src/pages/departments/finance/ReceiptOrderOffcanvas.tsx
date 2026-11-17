import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  CashCoin,
  CreditCard,
  CalendarDate,
  Person,
  FileEarmarkText,
  Bank,
  Check2All,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
import { NumberInput } from '../../../components/common/NumberInput';
import { Input } from '../../../components/common/Input';
import { notifyFinanceUpdated } from '../../../services/financeSyncService';
import { numberToVietnameseWords } from './PaymentOrderOffcanvas';

export interface ReceiptOrderOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onSuccess?: () => void;
}

const BANK_ACCOUNTS = [
  { value: '1121-BIDV', label: 'BIDV - 12010000123456 (VND)' },
  { value: '1121-TCB', label: 'Techcombank - 190367890123 (VND)' },
  { value: '1121-VCB', label: 'Vietcombank - 0011004567890 (VND)' },
  { value: '1121-MB', label: 'MB Bank - 0888123456789 (VND)' },
];

export const ReceiptOrderOffcanvas: React.FC<ReceiptOrderOffcanvasProps> = ({
  isOpen,
  onClose,
  data,
  onShowToast,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [bankAccount, setBankAccount] = useState<string>(BANK_ACCOUNTS[0].value);
  const [bankRef, setBankRef] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [payerAddress, setPayerAddress] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !data) return;

    const remaining = Number(data.remainingAmount ?? data.rawAmount ?? 0);
    setPayAmount(remaining > 0 ? remaining : 0);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setPaymentDate(`${yyyy}-${mm}-${dd}`);

    const customer = data.customerName || data.partner?.split('(')[0]?.trim() || 'Khách hàng';
    const code = data.code || `PT-${data.id || '2026'}`;
    setPayerName(customer);
    setPayerAddress(data.customerAddress || '');
    setPaymentNote(`Thu hồi công nợ khách hàng ${customer} - ${code}`);
    setBankRef(`FT${Date.now().toString().slice(-6)}`);
    setPaymentMethod('transfer');
    setBankAccount(BANK_ACCOUNTS[0].value);
    setIsSubmitting(false);
  }, [isOpen, data]);

  if (!data) return null;

  const code = data.code || `PT-${data.id || '2026'}`;
  const customerName = data.customerName || data.partner?.split('(')[0]?.trim() || 'Khách hàng';
  const projectName = data.projectName || data.partner?.match(/\((.*?)\)/)?.[1] || 'Dự án / Hợp đồng';
  const totalContract = Number(data.contractValue || (Number(data.paidAmount || 0) + Number(data.rawAmount || 0)) || data.rawAmount || 0);
  const paidTotal = Number(data.paidAmount || 0);
  const remainingTotal = Number(data.remainingAmount ?? data.rawAmount ?? 0);
  const dueDate = data.dueDate || 'Theo hợp đồng';
  const amountInWords = numberToVietnameseWords(payAmount);

  const handleSubmit = async () => {
    if (payAmount <= 0) {
      onShowToast?.('warning', 'Số tiền không hợp lệ', 'Vui lòng nhập số tiền thực thu lớn hơn 0 đ');
      return;
    }

    const rawId = data.receivableId ?? data.id;
    const targetId = typeof rawId === 'string' && rawId.startsWith('rec-') ? rawId.replace('rec-', '') : rawId;

    if (!targetId) {
      onShowToast?.('error', 'Lỗi dữ liệu', 'Không xác định được mã công nợ cần thu');
      return;
    }

    setIsSubmitting(true);
    const isBank = paymentMethod === 'transfer';
    const formattedDate = paymentDate ? paymentDate.split('-').reverse().join('/') : new Date().toLocaleDateString('vi-VN');
    const receiptCode = `PT-${Date.now().toString().slice(-6)}`;

    try {
      const res = await fetch(`/api/debts/receivables/${targetId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payAmount,
          receiptCode,
          paymentDate: formattedDate,
          paymentMethod: isBank ? 'Chuyển khoản' : 'Tiền mặt',
          paymentNote: paymentNote.trim(),
          debitAccount: isBank ? '1121' : '1111',
          creditAccount: '131',
          bankAccount: isBank ? bankAccount : '',
          bankRef: isBank ? bankRef : '',
          payerName: payerName.trim(),
          payerAddress: payerAddress.trim(),
        }),
      });

      if (res.ok) {
        onShowToast?.(
          'success',
          'Xác nhận thu nợ thành công',
          `Đã ghi nhận thu ${payAmount.toLocaleString('vi-VN')} đ từ ${customerName}, lập Phiếu thu ${receiptCode} và tự động cập nhật sổ quỹ.`
        );
        notifyFinanceUpdated('receivable', 'update');
        onSuccess?.();
        onClose();
      } else {
        const errJson = await res.json().catch(() => ({}));
        onShowToast?.(
          'error',
          'Không thể thu nợ',
          errJson.error || 'Có lỗi xảy ra trong quá trình ghi nhận thanh toán, vui lòng thử lại.'
        );
      }
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi kết nối', err?.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      title={`XÁC NHẬN THU NỢ: ${code}`}
      width="400px"
      position="right"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle size={15} />}
            isLoading={isSubmitting}
            onClick={handleSubmit}
            style={{ justifyContent: 'center', whiteSpace: 'nowrap' }}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thu nợ'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Banner thông tin khách hàng */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Khách hàng / Đối tác
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
              }}
            >
              Hạn: {dueDate}
            </span>
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {customerName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {projectName} {data.customerAddress ? `• ${data.customerAddress}` : ''}
          </div>
        </div>

        {/* 3 chỉ số kiểm soát ngắn gọn */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-1)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Nợ gốc</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalContract > 0 ? totalContract.toLocaleString('vi-VN') : '—'}
            </div>
          </div>
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-1)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Đã thu</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
              {paidTotal > 0 ? paidTotal.toLocaleString('vi-VN') : '0'}
            </div>
          </div>
          <div
            style={{
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.6875rem', color: '#dc2626', fontWeight: 600 }}>Còn nợ</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {remainingTotal.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Form nhập liệu thu tiền */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Số tiền thu */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Số tiền thực thu (đ) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              {remainingTotal > 0 && payAmount !== remainingTotal && (
                <button
                  type="button"
                  onClick={() => setPayAmount(remainingTotal)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#2563eb',
                    fontSize: '0.6875rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  Thu hết nợ
                </button>
              )}
            </div>
            <NumberInput
              value={payAmount}
              onChange={(val) => setPayAmount(Number(val) || 0)}
              min={0}
              placeholder="Nhập số tiền thu"
            />
            {payAmount > 0 && (
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                  fontStyle: 'italic',
                  lineHeight: 1.3,
                }}
              >
                Bằng chữ: <strong>{amountInWords}</strong>
              </div>
            )}
          </div>

          {/* Ngày thu & Hình thức */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.71875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <CalendarDate size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Ngày thu tiền
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.71875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <CashCoin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Hình thức
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'transfer' | 'cash')}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-1)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                }}
              >
                <option value="transfer">Chuyển khoản NH</option>
                <option value="cash">Tiền mặt</option>
              </select>
            </div>
          </div>

          {/* Tài khoản ngân hàng nếu chọn chuyển khoản */}
          {paymentMethod === 'transfer' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.71875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <Bank size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Tài khoản ngân hàng nhận tiền
              </label>
              <select
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-1)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  marginBottom: '8px',
                }}
              >
                {BANK_ACCOUNTS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Mã giao dịch / Số tham chiếu ngân hàng"
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
              />
            </div>
          )}

          {/* Hạch toán Nợ / Có ngắn gọn */}
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.71875rem',
            }}
          >
            <span>
              Định khoản: <strong>Nợ {paymentMethod === 'transfer' ? '1121' : '1111'}</strong> / <strong>Có 131</strong>
            </span>
            <span style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Check2All size={13} /> Tự động ghi Sổ quỹ
            </span>
          </div>

          {/* Người nộp tiền */}
          <div>
            <label style={{ display: 'block', fontSize: '0.71875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <Person size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Người nộp tiền
            </label>
            <Input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="Họ tên người nộp"
            />
          </div>

          {/* Diễn giải / Lý do thu */}
          <div>
            <label style={{ display: 'block', fontSize: '0.71875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <FileEarmarkText size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Nội dung / Diễn giải thu tiền
            </label>
            <Input
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Diễn giải nghiệp vụ thu"
            />
          </div>
        </div>
      </div>
    </Offcanvas>
  );
};
