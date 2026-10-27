import React, { useState, useEffect } from 'react';
import {
  GearFill,
  ClockHistory,
  ExclamationTriangleFill,
  ShieldCheck,
  CheckCircleFill,
  ExclamationCircleFill,
  ArrowCounterclockwise,
  Save,
  InfoCircle,
} from 'react-bootstrap-icons';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Badge } from '../../../components/common/Badge';

export interface DebtAgingConfig {
  dueSoonDays: number; // Số ngày trước hạn coi là Sắp đến hạn (Mặc định 7)
  overdueWarningDays: number; // Mốc quá hạn ngắn hạn (Mặc định 30)
  badDebtDays: number; // Mốc nợ khó đòi (Mặc định 90)
  autoUpdateStatus: boolean; // Tự động áp dụng trạng thái theo ngày
}

export const DEFAULT_DEBT_AGING_CONFIG: DebtAgingConfig = {
  dueSoonDays: 7,
  overdueWarningDays: 30,
  badDebtDays: 90,
  autoUpdateStatus: true,
};

export interface DebtAgingConfigOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  config: DebtAgingConfig;
  onSave: (newConfig: DebtAgingConfig) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  step?: number;
}

export const DebtAgingConfigOffcanvas: React.FC<DebtAgingConfigOffcanvasProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onShowToast,
  step = 1,
}) => {
  const [form, setForm] = useState<DebtAgingConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  const stepTitle = React.useMemo(() => {
    switch (step) {
      case 2:
        return 'Thiết lập cảnh báo công nợ phải trả';
      case 3:
        return 'Thiết lập cảnh báo nợ vay ngân hàng';
      default:
        return 'Thiết lập cảnh báo tuổi nợ phải thu';
    }
  }, [step]);

  const stepDesc = React.useMemo(() => {
    switch (step) {
      case 2:
        return 'Cấu hình mốc số ngày cảnh báo hạn thanh toán cho nhà cung cấp (Sắp đến hạn, Quá hạn trả)';
      case 3:
        return 'Cấu hình mốc số ngày cảnh báo lịch đáo hạn khế ước, trả nợ gốc và lãi vay ngân hàng';
      default:
        return 'Cấu hình số ngày làm căn cứ phân loại và xác định trạng thái các khoản công nợ (Đến hạn, Quá hạn)';
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      setForm(config);
    }
  }, [isOpen, config]);

  const handleApplyPreset = (dueSoon: number, overdueWarn: number, badDebt: number) => {
    setForm((prev) => ({
      ...prev,
      dueSoonDays: dueSoon,
      overdueWarningDays: overdueWarn,
      badDebtDays: badDebt,
    }));
  };

  const handleResetDefault = () => {
    setForm(DEFAULT_DEBT_AGING_CONFIG);
    if (onShowToast) {
      onShowToast('info', 'Khôi phục mặc định', 'Đã đặt lại các tham số tuổi nợ tiêu chuẩn');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/debts/aging-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onSave(form);
        try {
          localStorage.setItem('decodoor_debt_aging_config', JSON.stringify(form));
        } catch {}
        if (onShowToast) {
          onShowToast('success', 'Đã lưu cấu hình', 'Đã cập nhật quy tắc phân loại tuổi nợ');
        }
        onClose();
      } else {
        if (onShowToast) {
          onShowToast('error', 'Lỗi lưu cấu hình', 'Không thể ghi nhận dữ liệu vào máy chủ');
        }
      }
    } catch (e) {
      // Fallback lưu local nếu mất mạng
      onSave(form);
      try {
        localStorage.setItem('decodoor_debt_aging_config', JSON.stringify(form));
      } catch {}
      if (onShowToast) {
        onShowToast('success', 'Đã lưu cục bộ', 'Đã lưu cấu hình tuổi nợ trên trình duyệt');
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      onClose={onClose}
      width="400px"
      icon={<GearFill size={20} color="var(--color-primary)" />}
      title={stepTitle}
      description={stepDesc}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefault}
            leftIcon={<ArrowCounterclockwise size={14} />}
            style={{ fontSize: '0.8125rem' }}
          >
            Mặc định
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="button" variant="outline" onClick={onClose} style={{ fontSize: '0.8125rem' }}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<Save size={14} />}
              style={{ fontWeight: 700, fontSize: '0.8125rem' }}
            >
              Lưu cấu hình
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0' }}>
        {/* Hướng dẫn tóm tắt */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.78125rem',
            color: '#0369a1',
            lineHeight: 1.45,
          }}
        >
          <InfoCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Các thông số dưới đây được áp dụng tự động để phân loại tuổi nợ, gắn nhãn trạng thái và lọc dữ liệu trong sổ theo dõi công nợ phải thu.
          </div>
        </div>

        {/* 1. Mốc sắp đến hạn */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClockHistory size={14} color="#d97706" />
            <span>Mốc sắp đến hạn (Ngày trước hạn)</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              type="number"
              min={1}
              max={60}
              value={form.dueSoonDays}
              onChange={(e) => setForm({ ...form, dueSoonDays: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              style={{ width: '100px', fontWeight: 700, textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>ngày trước ngày đến hạn</span>
          </div>
          <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
            Khoản nợ có hạn thanh toán trong vòng <strong>{form.dueSoonDays} ngày tới</strong> sẽ hiển thị trạng thái <strong>Sắp đến hạn</strong>.
          </span>
        </div>

        {/* 2. Mốc quá hạn ngắn hạn */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ExclamationTriangleFill size={14} color="#dc2626" />
            <span>Mốc nợ quá hạn thông thường</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              type="number"
              min={5}
              max={180}
              value={form.overdueWarningDays}
              onChange={(e) => setForm({ ...form, overdueWarningDays: Math.max(5, parseInt(e.target.value, 10) || 5) })}
              style={{ width: '100px', fontWeight: 700, textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>ngày kể từ ngày quá hạn</span>
          </div>
          <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
            Quá hạn từ 1 đến <strong>{form.overdueWarningDays} ngày</strong> sẽ được đánh dấu <strong>Quá hạn thanh toán</strong>.
          </span>
        </div>

        {/* 3. Mốc nợ khó đòi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ExclamationCircleFill size={14} color="#7c3aed" />
            <span>Mốc nợ xấu / Khó đòi</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              type="number"
              min={30}
              max={365}
              value={form.badDebtDays}
              onChange={(e) => setForm({ ...form, badDebtDays: Math.max(30, parseInt(e.target.value, 10) || 30) })}
              style={{ width: '100px', fontWeight: 700, textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>ngày quá hạn trở lên</span>
          </div>
          <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
            Khoản nợ quá hạn trên <strong>{form.badDebtDays} ngày</strong> sẽ cảnh báo mức độ <strong>Nợ khó đòi</strong>.
          </span>
        </div>

        {/* 4. Bộ mẫu thiết lập nhanh (Presets) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Mẫu thiết lập nhanh:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleApplyPreset(7, 30, 90)}
              style={{
                fontSize: '0.71875rem',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                backgroundColor: form.dueSoonDays === 7 && form.overdueWarningDays === 30 && form.badDebtDays === 90 ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                color: form.dueSoonDays === 7 && form.overdueWarningDays === 30 && form.badDebtDays === 90 ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Chuẩn (7 / 30 / 90 ngày)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(3, 15, 60)}
              style={{
                fontSize: '0.71875rem',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                backgroundColor: form.dueSoonDays === 3 && form.overdueWarningDays === 15 && form.badDebtDays === 60 ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                color: form.dueSoonDays === 3 && form.overdueWarningDays === 15 && form.badDebtDays === 60 ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Chặt chẽ (3 / 15 / 60 ngày)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(15, 45, 120)}
              style={{
                fontSize: '0.71875rem',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                backgroundColor: form.dueSoonDays === 15 && form.overdueWarningDays === 45 && form.badDebtDays === 120 ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                color: form.dueSoonDays === 15 && form.overdueWarningDays === 45 && form.badDebtDays === 120 ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Linh hoạt (15 / 45 / 120 ngày)
            </button>
          </div>
        </div>

        {/* 5. Khung xem trước thang tuổi nợ trực quan */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2, #f8fafc)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '0.78125rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} color="#0284c7" />
            <span>Thang phân loại tuổi nợ áp dụng:</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircleFill size={13} color="#10b981" />
                <span style={{ color: 'var(--text-primary)' }}>Trong hạn thanh toán:</span>
              </div>
              <Badge variant="success">Còn &gt; {form.dueSoonDays} ngày</Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClockHistory size={13} color="#f59e0b" />
                <span style={{ color: 'var(--text-primary)' }}>Sắp đến hạn:</span>
              </div>
              <Badge variant="warning">Trong vòng {form.dueSoonDays} ngày tới</Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExclamationTriangleFill size={13} color="#ef4444" />
                <span style={{ color: 'var(--text-primary)' }}>Quá hạn thanh toán:</span>
              </div>
              <Badge variant="danger">Quá hạn 1 - {form.overdueWarningDays} ngày</Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExclamationCircleFill size={13} color="#8b5cf6" />
                <span style={{ color: 'var(--text-primary)' }}>Nợ khó đòi (Nợ xấu):</span>
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  color: '#7c3aed',
                }}
              >
                Quá hạn &gt; {form.badDebtDays} ngày
              </span>
            </div>
          </div>
        </div>
      </div>
    </Offcanvas>
  );
};
