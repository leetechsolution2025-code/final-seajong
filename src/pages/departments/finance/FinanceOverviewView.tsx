import React, { useState, useEffect, useMemo } from 'react';
import {
  CashCoin,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  CashStack,
  Bank,
  CalendarEvent,
  People,
  BellFill,
  CheckCircle,
  Printer,
  ArrowRepeat,
} from 'react-bootstrap-icons';
import { EventOffcanvas } from '../../../components/common/EventOffcanvas';
import { DepartmentActionMenu, type DepartmentActionMenuItem } from '../../../components/common/DepartmentActionMenu';
import { useFinanceRealtimeSync, notifyFinanceUpdated } from '../../../services/financeSyncService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';

export interface FinanceOverviewViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
}

const formatVND = (val: number): string => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
};

export interface CashflowMonthData {
  month: string;
  inFlow: number;
  outFlow: number;
  inFlowRaw?: number;
  outFlowRaw?: number;
  netBalance: number;
  cx: number;
  cy: number;
  val: string;
}

// Dữ liệu dòng tiền 6 tháng gần nhất (khởi tạo sạch từ CSDL)
const INITIAL_CASHFLOW_DATA: CashflowMonthData[] = [
  { month: 'T05/26', inFlow: 0, outFlow: 0, inFlowRaw: 0, outFlowRaw: 0, netBalance: 0, cx: 84.6, cy: 175, val: '0 đ' },
  { month: 'T06/26', inFlow: 0, outFlow: 0, inFlowRaw: 0, outFlowRaw: 0, netBalance: 0, cx: 183.8, cy: 175, val: '0 đ' },
  { month: 'T07/26', inFlow: 0, outFlow: 0, inFlowRaw: 0, outFlowRaw: 0, netBalance: 0, cx: 282.9, cy: 175, val: '0 đ' },
  { month: 'T08/26', inFlow: 0, outFlow: 0, inFlowRaw: 0, outFlowRaw: 0, netBalance: 0, cx: 382.1, cy: 175, val: '0 đ' },
  { month: 'T09/26', inFlow: 0, outFlow: 0, inFlowRaw: 0, outFlowRaw: 0, netBalance: 0, cx: 481.3, cy: 175, val: '0 đ' },
  { month: 'T10/26 (HT)', inFlow: 0, outFlow: 0, inFlowRaw: 0, outFlowRaw: 0, netBalance: 0, cx: 580.4, cy: 175, val: '0 đ' },
];

export interface CashflowNotice {
  id: string;
  type: 'inflow' | 'outflow'; // inflow: Thu nợ, outflow: Lệnh chi tiền
  title: string;
  partner: string;
  code: string;
  amount: string;
  rawAmount?: number;
  dueDate: string;
  status: string;
  statusVariant: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  paymentOrder?: {
    id: string;
    orderCode: string;
    refCode?: string;
    refType?: string;
    beneficiaryName: string;
    beneficiaryCode?: string;
    department?: string;
    amount: number;
    amountInWords?: string;
    paymentMethod?: string;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
    purpose?: string;
    dueDate?: string;
    approvedBy?: string;
    approvedDate?: string;
    approvalNote?: string;
    status?: string;
    statusLabel?: string;
    executedBy?: string;
    executedDate?: string;
    voucherId?: string;
  };
}

export const FinanceOverviewView: React.FC<FinanceOverviewViewProps> = ({
  onShowToast,
  onNavigate,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString('vi-VN'));
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState<boolean>(false);
  const [noticeTab, setNoticeTab] = useState<'all' | 'inflow' | 'outflow'>('all');

  const [cashBalance, setCashBalance] = useState<number>(() => {
    try {
      const c = localStorage.getItem('decodoor_cached_cash_balance');
      if (c) return Number(c) || 0;
    } catch {}
    return 0;
  });
  const [receivablesTotal, setReceivablesTotal] = useState<number>(() => {
    try {
      const c = localStorage.getItem('decodoor_cached_receivables_total');
      if (c) return Number(c) || 0;
    } catch {}
    return 0;
  });
  const [expensesTotal, setExpensesTotal] = useState<number>(() => {
    try {
      const c = localStorage.getItem('decodoor_cached_expenses_total');
      if (c) return Number(c) || 0;
    } catch {}
    return 0;
  });
  const [revenueTotal, setRevenueTotal] = useState<number>(() => {
    try {
      const c = localStorage.getItem('decodoor_cached_revenue_total');
      if (c) return Number(c) || 0;
    } catch {}
    return 0;
  });
  const [cashflowChartData, setCashflowChartData] = useState<CashflowMonthData[]>(INITIAL_CASHFLOW_DATA);
  const [cashflowNotices, setCashflowNotices] = useState<CashflowNotice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<CashflowNotice | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Chỉ hiển thị các nội dung chưa thực hiện (chưa chi tiền, chưa thu nợ)
  const activeNotices = useMemo(() => {
    return cashflowNotices.filter((n) => {
      if (n.status === 'completed' || n.paymentOrder?.status === 'completed' || n.status === 'Đã chi tiền') return false;
      return true;
    });
  }, [cashflowNotices]);

  const loadRealStats = () => {
    fetch('/api/finance/cash-assets')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const sum = d.reduce((acc: number, item: any) => acc + (Number(item.balance) || 0), 0);
          setCashBalance(sum);
          try { localStorage.setItem('decodoor_cached_cash_balance', String(sum)); } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/debts/receivables')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const sum = d.reduce((acc: number, item: any) => acc + (Number(item.remainingAmount ?? item.remaining_amount) || 0), 0);
          setReceivablesTotal(sum);
          try { localStorage.setItem('decodoor_cached_receivables_total', String(sum)); } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/debts/expenses')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const sum = d.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
          setExpensesTotal(sum);
          try { localStorage.setItem('decodoor_cached_expenses_total', String(sum)); } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/finance/cashflow-chart')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.months)) {
          setCashflowChartData(d.months);
          if (typeof d.currentInflow === 'number') {
            setRevenueTotal(d.currentInflow);
            try { localStorage.setItem('decodoor_cached_revenue_total', String(d.currentInflow)); } catch {}
          }
          if (typeof d.currentOutflow === 'number') {
            setExpensesTotal(d.currentOutflow);
            try { localStorage.setItem('decodoor_cached_expenses_total', String(d.currentOutflow)); } catch {}
          }
        }
      })
      .catch(() => {});

    fetch('/api/finance/cashflow-notices')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) {
          setCashflowNotices(d);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadRealStats();
    const interval = setInterval(loadRealStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleExecutePayment = async (orderId: string) => {
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/finance/payment-orders/${orderId}/execute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executedBy: 'Kế toán thanh toán',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onShowToast?.(
          'success',
          'Chi tiền thành công',
          `Đã giải ngân lệnh chi ${data.orderCode} và tự động lập Phiếu chi ${data.voucherCode}`
        );
        notifyFinanceUpdated('payment_order', 'update');
        loadRealStats();
        setSelectedNotice(null);
      } else {
        onShowToast?.('error', 'Lỗi chi tiền', 'Không thể hoàn tất giải ngân lệnh chi');
      }
    } catch (e) {
      onShowToast?.('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu chi tiền');
    } finally {
      setIsExecuting(false);
    }
  };

  const currentPeriodLabels = useMemo(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return {
      month: `Tháng ${m}/${y}`,
      quarter: `Quý ${q}/${y}`,
      year: `Năm ${y}`,
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Lắng nghe cập nhật tài chính thời gian thực từ các tab khác
  useFinanceRealtimeSync(() => {
    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    loadRealStats();
  });


  return (
    <div
      className="custom-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 20px 24px 20px',
        backgroundColor: 'var(--bg-surface-1)',
        height: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. THANH ĐIỀU KHIỂN VÀ BỘ LỌC KỲ BÁO CÁO ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }}
            />
            Dữ liệu thời gian thực
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Cập nhật tự động lúc <strong>{lastUpdated}</strong>
          </span>
        </div>

        {/* Nút lọc kỳ và Thao tác */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-2)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Nút Lịch sự kiện */}
            <button
              type="button"
              onClick={() => setIsEventDrawerOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: isEventDrawerOpen ? 700 : 500,
                backgroundColor: isEventDrawerOpen ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                color: isEventDrawerOpen ? 'var(--color-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <CalendarEvent size={13} color="var(--color-primary)" />
              Lịch sự kiện
            </button>

            <span style={{ color: 'var(--border-subtle)', margin: '0 4px', userSelect: 'none', opacity: 0.8 }}>|</span>

            <button
              type="button"
              onClick={() => setSelectedPeriod('month')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === 'month' ? 700 : 500,
                backgroundColor: selectedPeriod === 'month' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'month' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {currentPeriodLabels.month}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('quarter')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === 'quarter' ? 700 : 500,
                backgroundColor: selectedPeriod === 'quarter' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'quarter' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {currentPeriodLabels.quarter}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('year')}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === 'year' ? 700 : 500,
                backgroundColor: selectedPeriod === 'year' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'year' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {currentPeriodLabels.year}
            </button>
          </div>

          {/* Nút Ba Chấm ở cuối thanh công cụ (không dùng border) */}
          <DepartmentActionMenu
            noBorder={true}
            extraItems={[
              {
                id: 'refresh-data',
                icon: <ArrowRepeat className="text-emerald-600 text-[15px] shrink-0" />,
                title: 'Làm mới dữ liệu',
                description: 'Đồng bộ sổ quỹ và công nợ thực tế',
                onClick: () => {
                  loadRealStats();
                  setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
                  onShowToast?.('success', 'Đã đồng bộ', 'Số liệu dòng tiền và công nợ đã được làm mới');
                },
              },
              {
                id: 'print-overview',
                icon: <Printer className="text-blue-600 text-[15px] shrink-0" />,
                title: 'In báo cáo tổng quan',
                description: 'Xuất bản in tổng quan tài chính',
                onClick: () => {
                  window.print();
                },
              },
            ]}
          />
        </div>
      </div>

      {/* ── 2. HÀNG 4 THẺ CHỈ SỐ KPI TÀI CHÍNH THEN CHỐT ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {/* KPI 1: Số dư khả dụng */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bank size={14} color="#0284c7" /> Số dư tồn quỹ
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              Thực tế
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {formatVND(cashBalance)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Tiền mặt & Tiền gửi ngân hàng</span>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Đồng bộ từ sổ quỹ và tài khoản ngân hàng
          </div>
        </div>

        {/* KPI 2: Dòng tiền thực thu */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CashCoin size={14} color="#10b981" /> Tổng thực thu
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              Thực tế
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {formatVND(revenueTotal)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Thu hồi nợ và bán hàng trong kỳ</span>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Đồng bộ từ hợp đồng bán hàng thực tế
          </div>
        </div>

        {/* KPI 3: Tổng giải ngân và Chi phí */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CashStack size={14} color="#f43f5e" /> Tổng thực chi
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              Thực tế
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {formatVND(expensesTotal)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Chi phí quản lý, bán hàng, sản xuất</span>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Đồng bộ từ phân hệ Quản lý chi phí
          </div>
        </div>

        {/* KPI 4: Công nợ phải thu */}
        <div
          onClick={() => onNavigate?.('debt-cost-mgmt')}
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: onNavigate ? 'pointer' : 'default',
          }}
          title={onNavigate ? 'Nhấp để xem chi tiết Quản lý Công nợ' : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={14} color="#8b5cf6" /> Công nợ phải thu
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              Thực tế
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {formatVND(receivablesTotal)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Dư nợ khách hàng hiện tại</span>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Đồng bộ từ sổ chi tiết công nợ phải thu
          </div>
        </div>
      </div>

      {/* ── 3. KHỐI BIỂU ĐỒ TRỰC QUAN (DÒNG TIỀN VÀO - RA VÀ TUỔI NỢ PHẢI THU) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '14px',
          flex: 1,
          minHeight: '320px',
        }}
      >
        {/* Biểu đồ Dòng tiền Thu - Chi theo tháng */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                Diễn biến dòng tiền thu - chi 6 tháng gần nhất
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                So sánh Dòng tiền vào, Dòng tiền ra và Số dư quỹ tích lũy
              </p>
            </div>

            {/* Chú giải Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Tiền vào</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f43f5e' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Tiền ra</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '16px', height: '2px', backgroundColor: '#0284c7', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '-3px', left: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>Số dư quỹ</span>
              </div>
            </div>
          </div>

          {/* Vùng vẽ biểu đồ Bar Chart + Trendline Line Số dư quỹ bằng SVG thống nhất */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '8px',
            }}
          >
            <svg
              viewBox="0 0 650 230"
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="fundBalanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
                </linearGradient>
                <filter id="fundLineShadow" x="-10%" y="-10%" width="120%" height="130%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0284c7" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Lưới ngang tham chiếu và nhãn trục tung */}
              {[
                { val: 20, y: 25 },
                { val: 15, y: 62.5 },
                { val: 10, y: 100 },
                { val: 5, y: 137.5 },
                { val: 0, y: 175 },
              ].map((grid, gIdx) => (
                <g key={`grid-${gIdx}`}>
                  <text
                    x="28"
                    y={grid.y + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {grid.val}
                  </text>
                  <line
                    x1="38"
                    y1={grid.y}
                    x2="630"
                    y2={grid.y}
                    stroke="var(--border-subtle)"
                    strokeDasharray={grid.val === 0 ? undefined : '3 3'}
                    strokeWidth={grid.val === 0 ? '1.5' : '1'}
                  />
                </g>
              ))}

              {/* Các cặp cột Thu (Xanh) - Chi (Đỏ) */}
              {cashflowChartData.map((bar, bIdx) => {
                const inHeight = bar.inFlow > 0
                  ? (bar.inFlow >= 1 ? bar.inFlow * 7.5 : Math.max(16, bar.inFlow * 250))
                  : 0;
                const inY = 175 - inHeight;
                const outHeight = bar.outFlow > 0
                  ? (bar.outFlow >= 1 ? bar.outFlow * 7.5 : Math.max(16, bar.outFlow * 250))
                  : 0;
                const outY = 175 - outHeight;

                const inLabel = bar.inFlow >= 1
                  ? bar.inFlow
                  : (bar.inFlowRaw ? `${Math.round(bar.inFlowRaw / 1e6)}tr` : (bar.inFlow > 0 ? `${(bar.inFlow * 1000).toFixed(0)}tr` : '0'));
                const outLabel = bar.outFlow >= 1
                  ? bar.outFlow
                  : (bar.outFlowRaw ? `${Math.round(bar.outFlowRaw / 1e6)}tr` : (bar.outFlow > 0 ? `${(bar.outFlow * 1000).toFixed(0)}tr` : '0'));

                return (
                  <g key={`bar-${bIdx}`}>
                    {/* Cột Tiền vào (Thu) */}
                    <rect
                      x={bar.cx - 20}
                      y={inY}
                      width="18"
                      height={inHeight}
                      fill="#10b981"
                      rx="3"
                      ry="3"
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{`Thu ${bar.month}: ${formatVND(bar.inFlowRaw || bar.inFlow * 1e9)}`}</title>
                    </rect>
                    {/* Giá trị Tiền vào (Thu) hiển thị trên đỉnh cột */}
                    <text
                      x={bar.cx - 11}
                      y={inY - 5}
                      textAnchor="middle"
                      fill="#10b981"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {inLabel}
                    </text>

                    {/* Cột Tiền ra (Chi) */}
                    <rect
                      x={bar.cx + 2}
                      y={outY}
                      width="18"
                      height={outHeight}
                      fill="#f43f5e"
                      rx="3"
                      ry="3"
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{`Chi ${bar.month}: ${formatVND(bar.outFlowRaw || bar.outFlow * 1e9)}`}</title>
                    </rect>
                    {/* Giá trị Tiền ra (Chi) hiển thị trên đỉnh cột */}
                    <text
                      x={bar.cx + 11}
                      y={outY - 5}
                      textAnchor="middle"
                      fill="#f43f5e"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {outLabel}
                    </text>

                    {/* Nhãn tháng dưới trục hoành */}
                    <text
                      x={bar.cx}
                      y="198"
                      textAnchor="middle"
                      fill={bIdx === cashflowChartData.length - 1 ? '#0284c7' : 'var(--text-secondary)'}
                      fontSize="11"
                      fontWeight={bIdx === cashflowChartData.length - 1 ? '700' : '500'}
                    >
                      {bar.month}
                    </text>
                  </g>
                );
              })}

              {/* Vùng bóng mờ gradient dưới đồ thị line Số dư quỹ */}
              {(() => {
                const linePoints = cashflowChartData.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.cx},${pt.cy}`).join(' ');
                const firstX = cashflowChartData[0]?.cx || 84.6;
                const lastX = cashflowChartData[cashflowChartData.length - 1]?.cx || 580.4;
                const areaPath = `${linePoints} L ${lastX},175 L ${firstX},175 Z`;

                return (
                  <>
                    <path
                      d={areaPath}
                      fill="url(#fundBalanceAreaGrad)"
                    />

                    {/* ĐƯỜNG ĐỒ THỊ LINE SỐ DƯ TỒN QUỸ */}
                    <path
                      d={linePoints}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#fundLineShadow)"
                    />
                  </>
                );
              })()}

              {/* Các điểm nút tròn trên đường Line Số dư quỹ */}
              {cashflowChartData.map((pt, pIdx) => (
                <circle
                  key={`pt-${pIdx}`}
                  cx={pt.cx}
                  cy={pt.cy}
                  r="5"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`Số dư tồn quỹ (${pt.month}): ${pt.val}`}</title>
                </circle>
              ))}
            </svg>
          </div>
        </div>

        {/* Phân tích Tuổi nợ phải thu */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxSizing: 'border-box',
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Header Thông báo Dòng tiền vào & ra */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <BellFill size={14} color="var(--color-primary)" />
              Thông báo dòng tiền
            </h3>

            {/* Bộ chọn tab lọc loại thông báo */}
            <div style={{ display: 'inline-flex', padding: '2px', backgroundColor: 'var(--bg-surface-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setNoticeTab('all')}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: noticeTab === 'all' ? 'var(--bg-surface-1)' : 'transparent',
                  color: noticeTab === 'all' ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: noticeTab === 'all' ? 700 : 500,
                  fontSize: '0.6875rem',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: noticeTab === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>Tất cả</span>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    backgroundColor: noticeTab === 'all' ? 'var(--color-primary)' : 'rgba(0,0,0,0.08)',
                    color: noticeTab === 'all' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {activeNotices.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setNoticeTab('inflow')}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: noticeTab === 'inflow' ? 'var(--bg-surface-1)' : 'transparent',
                  color: noticeTab === 'inflow' ? '#10b981' : 'var(--text-secondary)',
                  fontWeight: noticeTab === 'inflow' ? 700 : 500,
                  fontSize: '0.6875rem',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: noticeTab === 'inflow' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>Thu nợ</span>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    backgroundColor: noticeTab === 'inflow' ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                    color: noticeTab === 'inflow' ? '#fff' : '#059669',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {activeNotices.filter(n => n.type === 'inflow').length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setNoticeTab('outflow')}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: noticeTab === 'outflow' ? 'var(--bg-surface-1)' : 'transparent',
                  color: noticeTab === 'outflow' ? '#f43f5e' : 'var(--text-secondary)',
                  fontWeight: noticeTab === 'outflow' ? 700 : 500,
                  fontSize: '0.6875rem',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: noticeTab === 'outflow' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>Lệnh chi</span>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    backgroundColor: noticeTab === 'outflow' ? '#f43f5e' : 'rgba(244, 63, 94, 0.15)',
                    color: noticeTab === 'outflow' ? '#fff' : '#e11d48',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {activeNotices.filter(n => n.type === 'outflow').length}
                </span>
              </button>
            </div>
          </div>

          {/* Danh sách thông báo dòng tiền vào & dòng tiền ra */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: '2px',
            }}
          >
            {activeNotices.filter(item => noticeTab === 'all' || item.type === noticeTab).length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px 16px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '8px', opacity: 0.6 }}>📋</div>
                <div>Chưa có thông báo dòng tiền cần thực hiện trong kỳ</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>
                  Các lệnh chi tiền và khoản thu nợ chờ xử lý sẽ hiển thị tại đây
                </div>
              </div>
            ) : (
              activeNotices.filter(item => noticeTab === 'all' || item.type === noticeTab).map((item) => {
              const isInflow = item.type === 'inflow';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedNotice(item)}
                  title={item.type === 'outflow' ? 'Nhấn để xem chi tiết Lệnh chi tiền và thực hiện giải ngân' : 'Nhấn để xem chi tiết khoản thu nợ'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-1)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isInflow ? '#10b981' : '#f43f5e';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: isInflow ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                        color: isInflow ? '#10b981' : '#f43f5e',
                      }}
                    >
                      {isInflow ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.78125rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.71875rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px',
                        }}
                      >
                        {item.partner} <span style={{ color: 'var(--text-muted)' }}>• {item.code}</span>
                      </div>
                      <div style={{ marginTop: '3px' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          Hạn: <strong style={{ color: 'var(--text-secondary)' }}>{item.dueDate}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '0.84375rem',
                        fontWeight: 800,
                        color: isInflow ? '#10b981' : '#f43f5e',
                        fontFamily: "'Roboto Condensed', monospace",
                      }}
                    >
                      {item.amount}
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: isInflow ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          color: isInflow ? '#059669' : '#e11d48',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      </div>

      {/* ── MODAL CHI TIẾT LỆNH CHI TIỀN (HÌNH 2) ── */}
      {selectedNotice && selectedNotice.type === 'outflow' && (
        <Modal
          isOpen={Boolean(selectedNotice)}
          onClose={() => setSelectedNotice(null)}
          title={`LỆNH CHI TIỀN: ${selectedNotice.code}`}
          maxWidth="750px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
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
                  onClick={() => setSelectedNotice(null)}
                >
                  Đóng
                </Button>
                {selectedNotice.paymentOrder?.status !== 'completed' && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle size={15} />}
                    disabled={isExecuting}
                    onClick={() => handleExecutePayment(selectedNotice.paymentOrder?.id || selectedNotice.id)}
                  >
                    {isExecuting ? 'Đang thực hiện...' : 'Xác nhận đã chi tiền / Lập phiếu chi'}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner trạng thái */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: selectedNotice.paymentOrder?.status === 'completed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                border: `1px solid ${selectedNotice.paymentOrder?.status === 'completed' ? '#10b981' : '#f43f5e'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: selectedNotice.paymentOrder?.status === 'completed' ? '#10b981' : '#f43f5e',
                  }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: selectedNotice.paymentOrder?.status === 'completed' ? '#059669' : '#e11d48' }}>
                  {selectedNotice.paymentOrder?.status === 'completed'
                    ? `ĐÃ HOÀN TẤT CHI TIỀN (Chứng từ: ${selectedNotice.paymentOrder?.voucherId || 'Phiếu chi'})`
                    : 'CHỜ BỘ PHẬN KẾ TOÁN THỰC HIỆN CHI TIỀN (GIẢI NGÂN)'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ngày lập lệnh: <strong>{selectedNotice.paymentOrder?.approvedDate || selectedNotice.dueDate}</strong>
              </span>
            </div>

            {/* Khung tài liệu lệnh chi */}
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'var(--bg-surface-2)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 20px', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Mã lệnh chi:</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '0.9375rem', fontFamily: 'monospace' }}>
                    {selectedNotice.code}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Căn cứ phê duyệt:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedNotice.paymentOrder?.refCode ? `Hồ sơ tạm ứng ${selectedNotice.paymentOrder.refCode}` : 'Ban Giám đốc phê duyệt'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Người thụ hưởng:</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {selectedNotice.paymentOrder?.beneficiaryName || selectedNotice.partner}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Bộ phận: {selectedNotice.paymentOrder?.department || 'Khối văn phòng'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Hình thức thanh toán:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedNotice.paymentOrder?.paymentMethod === 'cash' ? 'Tiền mặt tại quỹ (TK 111)' : 'Chuyển khoản ngân hàng (TK 112)'}
                  </strong>
                  {selectedNotice.paymentOrder?.bankName && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {selectedNotice.paymentOrder.bankName} - STK: <strong>{selectedNotice.paymentOrder.bankAccount}</strong>
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2', padding: '10px 14px', backgroundColor: 'var(--bg-surface-1)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block' }}>Số tiền chi tạm ứng:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', fontFamily: "'Roboto Condensed', monospace" }}>
                        {(selectedNotice.paymentOrder?.amount || selectedNotice.rawAmount || 0).toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Bằng chữ:</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                        {selectedNotice.paymentOrder?.amountInWords || 'Đồng chẵn'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Mục đích / Nội dung chi:</span>
                  <div style={{ color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.5 }}>
                    {selectedNotice.paymentOrder?.purpose || selectedNotice.title}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Người ký duyệt lệnh:</span>
                  <strong style={{ color: '#059669' }}>
                    {selectedNotice.paymentOrder?.approvedBy || 'Ban Giám Đốc'}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Bút phê: <em>"{selectedNotice.paymentOrder?.approvalNote || 'Đồng ý phê duyệt'}"</em>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Kế toán thực chi:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {selectedNotice.paymentOrder?.executedBy || 'Chờ bộ phận kế toán giải ngân'}
                  </strong>
                  {selectedNotice.paymentOrder?.executedDate && (
                    <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                      Đã chi ngày: {selectedNotice.paymentOrder.executedDate}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 5. OFFCANVAS LỊCH SỰ KIỆN ĐẦY ĐỦ (THÁNG, TUẦN, NGÀY, LỊCH BIỂU) ── */}
      <EventOffcanvas
        isOpen={isEventDrawerOpen}
        onClose={() => setIsEventDrawerOpen(false)}
        defaultView="month"
        onShowToast={onShowToast}
      />
    </div>
  );
};

