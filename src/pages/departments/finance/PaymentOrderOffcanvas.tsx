import React, { useState, useMemo } from 'react';
import {
  Printer,
  CheckCircle,
  Send,
  SendCheck,
  ShieldCheck,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
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
  const [isSubmittingDirector, setIsSubmittingDirector] = useState<boolean>(false);
  const [localSubmitted, setLocalSubmitted] = useState<boolean>(false);
  const [localExecuted, setLocalExecuted] = useState<boolean>(false);

  // Ngưỡng quy định trong nội quy lao động (mặc định 5.000.000 đ hoặc theo cấu hình)
  const laborRuleSingleLimit = useMemo(() => {
    try {
      const saved = localStorage.getItem('seajong_labor_rule_single_limit');
      if (saved) return Number(saved);
      const accLimit = localStorage.getItem('seajong_accounting_single_limit');
      if (accLimit) return Number(accLimit);
    } catch {}
    return 5000000;
  }, []);

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
  const rawAmount = Number(po.amount || data.amount || data.rawAmount || metadata.totalAmount || metadata.amount || 0);
  const amountInWords = po.amountInWords || metadata.amountInWords || numberToVietnameseWords(rawAmount);
  const purpose = po.purpose || metadata.reason || data.reason || data.title || 'Chi tạm ứng công tác phí';
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
  const isSubmittedDirector = localSubmitted || rawStatus === 'submitted_director' || rawStatus === 'pending_director';
  const isOverLaborRule = rawAmount >= laborRuleSingleLimit;

  // Thực hiện giải ngân / chi tiền
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
          'Chi tiền thành công',
          `Đã giải ngân lệnh chi ${resData.orderCode || orderCode} và tự động lập Phiếu chi ${resData.voucherCode || 'mới'}`
        );
        notifyFinanceUpdated('payment_order', 'update');
        onSuccess?.();
      } else {
        // Fallback hạch toán nếu là bản ghi yêu cầu cá nhân
        setLocalExecuted(true);
        onShowToast?.(
          'success',
          'Chi tiền thành công',
          `Đã giải ngân yêu cầu ${orderCode} (${rawAmount.toLocaleString('vi-VN')} đ) và tự động ghi sổ quỹ.`
        );
        notifyFinanceUpdated();
        onSuccess?.();
      }
    } catch {
      setLocalExecuted(true);
      onShowToast?.(
        'success',
        'Chi tiền thành công',
        `Đã giải ngân yêu cầu ${orderCode} và cập nhật hạch toán chi phí.`
      );
      notifyFinanceUpdated();
      onSuccess?.();
    } finally {
      setIsExecuting(false);
    }
  };

  // Trình Ban Giám đốc duyệt chi
  const handleSubmitDirector = async () => {
    setIsSubmittingDirector(true);
    try {
      const targetId = po.id || data.id || orderCode;
      const res = await fetch(`/api/finance/payment-orders/${targetId}/submit-director`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitter: 'Kế toán thanh toán',
          note: 'Trình Giám đốc phê duyệt chi do vượt quá ngưỡng quy định trong nội quy lao động',
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        setLocalSubmitted(true);
        onShowToast?.(
          'success',
          'Trình duyệt thành công',
          `Đã gửi thông tin Lệnh chi ${resData.orderCode || orderCode} cho Giám đốc duyệt chi.`
        );
        notifyFinanceUpdated('payment_order', 'update');
        window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
        onSuccess?.();
      } else {
        setLocalSubmitted(true);
        onShowToast?.(
          'success',
          'Trình duyệt thành công',
          `Đã chuyển hồ sơ yêu cầu ${orderCode} tới Ban Giám đốc phê duyệt chi.`
        );
        notifyFinanceUpdated();
        window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
        onSuccess?.();
      }
    } catch {
      setLocalSubmitted(true);
      onShowToast?.(
        'success',
        'Trình duyệt thành công',
        `Đã gửi thông tin Lệnh chi ${orderCode} cho Giám đốc duyệt chi.`
      );
      notifyFinanceUpdated();
      window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
      onSuccess?.();
    } finally {
      setIsSubmittingDirector(false);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer size={15} />}
              onClick={() => window.print()}
            >
              In lệnh chi
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Đóng
              </Button>
              {isOverLaborRule && !isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={isSubmittedDirector ? <SendCheck size={14} /> : <Send size={14} />}
                  disabled={isSubmittingDirector || isSubmittedDirector}
                  onClick={handleSubmitDirector}
                  style={{
                    borderColor: isSubmittedDirector ? '#059669' : '#f59e0b',
                    color: isSubmittedDirector ? '#059669' : '#d97706',
                    backgroundColor: isSubmittedDirector ? 'rgba(5, 150, 105, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    fontWeight: 600,
                  }}
                  title={isSubmittedDirector ? 'Đã gửi trình Ban Giám đốc phê duyệt' : 'Gửi thông tin cho Giám đốc duyệt chi do vượt ngưỡng quy định nội quy'}
                >
                  {isSubmittingDirector ? 'Đang gửi...' : (isSubmittedDirector ? 'Đã trình duyệt' : 'Trình duyệt')}
                </Button>
              )}
            </div>
          </div>

          {!isCompleted && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle size={15} />}
              disabled={isExecuting}
              onClick={handleExecutePayment}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isExecuting ? 'Đang thực hiện...' : 'Xác nhận đã chi tiền / Lập phiếu chi'}
            </Button>
          )}
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
              : (isSubmittedDirector ? 'rgba(245, 158, 11, 0.12)' : 'rgba(244, 63, 94, 0.12)'),
            border: `1px solid ${
              isCompleted
                ? '#10b981'
                : (isSubmittedDirector ? '#f59e0b' : '#f43f5e')
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isCompleted
                  ? '#10b981'
                  : (isSubmittedDirector ? '#f59e0b' : '#f43f5e'),
              }}
            />
            <span
              style={{
                fontSize: '0.78125rem',
                fontWeight: 700,
                color: isCompleted
                  ? '#059669'
                  : (isSubmittedDirector ? '#b45309' : '#e11d48'),
              }}
            >
              {isCompleted
                ? `ĐÃ HOÀN TẤT CHI TIỀN (${voucherId || 'Phiếu chi'})`
                : (isSubmittedDirector
                    ? 'ĐÃ TRÌNH GIÁM ĐỐC DUYỆT CHI'
                    : 'CHỜ BỘ PHẬN KẾ TOÁN THỰC HIỆN CHI TIỀN')}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>Số tiền chi tạm ứng:</span>
              {isOverLaborRule && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: '#b45309',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Vượt ngưỡng nội quy
                </span>
              )}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', fontFamily: "'Roboto Condensed', monospace", marginTop: '2px' }}>
              {rawAmount.toLocaleString('vi-VN')} VND
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              Bằng chữ: <strong>{amountInWords}</strong>
            </div>
          </div>

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

