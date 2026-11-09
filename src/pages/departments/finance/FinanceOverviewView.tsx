import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Send,
  SendCheck,
  ShieldCheck,
} from 'react-bootstrap-icons';
import { EventOffcanvas } from '../../../components/common/EventOffcanvas';
import { DepartmentActionMenu, type DepartmentActionMenuItem } from '../../../components/common/DepartmentActionMenu';
import { useFinanceRealtimeSync, notifyFinanceUpdated } from '../../../services/financeSyncService';
import { PaymentOrderOffcanvas } from './PaymentOrderOffcanvas';
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

// Dữ liệu dòng tiền 6 tháng gần nhất (khởi tạo động theo tháng hiện hành)
const INITIAL_CASHFLOW_DATA: CashflowMonthData[] = (() => {
  const d = new Date();
  const curM = d.getMonth() + 1;
  const curY = d.getFullYear() % 100;
  const cxList = [84.6, 183.8, 282.9, 382.1, 481.3, 580.4];
  return Array.from({ length: 6 }, (_, idx) => {
    let m = curM - (5 - idx);
    let y = curY;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    const mStr = String(m).padStart(2, '0');
    const isCurrent = idx === 5;
    return {
      month: isCurrent ? `T${mStr}/${y} (HT)` : `T${mStr}/${y}`,
      inFlow: 0,
      outFlow: 0,
      inFlowRaw: 0,
      outFlowRaw: 0,
      netBalance: 0,
      cx: cxList[idx],
      cy: 175,
      val: '0 đ',
    };
  });
})();

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
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString('vi-VN'));
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState<boolean>(false);
  const [noticeTab, setNoticeTab] = useState<'all' | 'inflow' | 'outflow'>('all');

  // Responsive state cho màn hình điện thoại (<= 768px)
  const [isMobileView, setIsMobileView] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [mobileSlide, setMobileSlide] = useState<1 | 2>(1);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMobileTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileView) return;
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleMobileTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileView || touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && mobileSlide === 1) setMobileSlide(2);
      else if (deltaX > 0 && mobileSlide === 2) setMobileSlide(1);
    }
    touchStartXRef.current = null;
  };

  const [cashBalance, setCashBalance] = useState<number>(() => {
    try {
      const c = localStorage.getItem('seajong_cached_cash_balance') || localStorage.getItem('decodoor_cached_cash_balance');
      if (c) return Number(c) || 0;
    } catch { }
    return 0;
  });
  const [receivablesTotal, setReceivablesTotal] = useState<number>(() => {
    try {
      const c = localStorage.getItem('seajong_cached_receivables_total') || localStorage.getItem('decodoor_cached_receivables_total');
      if (c) return Number(c) || 0;
    } catch { }
    return 0;
  });
  const [expensesTotal, setExpensesTotal] = useState<number>(() => {
    try {
      const c = localStorage.getItem('seajong_cached_expenses_total') || localStorage.getItem('decodoor_cached_expenses_total');
      if (c) return Number(c) || 0;
    } catch { }
    return 0;
  });
  const [revenueTotal, setRevenueTotal] = useState<number>(() => {
    try {
      const c = localStorage.getItem('seajong_cached_revenue_total') || localStorage.getItem('decodoor_cached_revenue_total');
      if (c) return Number(c) || 0;
    } catch { }
    return 0;
  });
  const [periodStats, setPeriodStats] = useState<{
    openingCashBalance: number;
    receivablesCumulative: number;
    receivablesInvoiced: number;
    receivablesCollected: number;
  }>({
    openingCashBalance: 0,
    receivablesCumulative: 0,
    receivablesInvoiced: 0,
    receivablesCollected: 0,
  });
  const [cashflowChartData, setCashflowChartData] = useState<CashflowMonthData[]>(INITIAL_CASHFLOW_DATA);
  const [cashflowNotices, setCashflowNotices] = useState<CashflowNotice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<CashflowNotice | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Chỉ hiển thị các nội dung đã được giám đốc phê duyệt, đợi chi tiền (và công nợ chưa thu đủ)
  const activeNotices = useMemo(() => {
    return cashflowNotices.filter((n) => {
      if (n.status === 'completed' || n.paymentOrder?.status === 'completed' || n.status === 'Đã chi tiền') return false;
      if (n.type === 'outflow') {
        const po = n.paymentOrder;
        if (!po) return false;
        // Chỉ hiển thị các nội dung đã được giám đốc phê duyệt, đợi chi tiền
        if (po.status === 'submitted_director' || po.status === 'pending_director') return false;
        if (!po.approvedBy || po.approvedBy.trim() === '') return false;
      }
      return true;
    });
  }, [cashflowNotices]);

  const loadRealStats = (
    periodParam: 'month' | 'quarter' | 'year' = selectedPeriod,
    monthParam: number = selectedMonth
  ) => {
    const yearParam = new Date().getFullYear();
    Promise.all([
      fetch(`/api/finance/cashflow-chart?period=${periodParam}&month=${monthParam}&year=${yearParam}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/debts/receivables').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([d, recList]) => {
        if (d && Array.isArray(d.months)) {
          setCashflowChartData(d.months);

          if (d.periodStats) {
            const cb = Number(d.currentBalance) || 0;
            const rev = Number(d.currentInflow) || 0;
            const exp = Number(d.currentOutflow) || 0;
            const rec = Number(d.currentReceivables) || 0;
            setCashBalance(cb);
            setRevenueTotal(rev);
            setExpensesTotal(exp);
            setReceivablesTotal(rec);
            setPeriodStats({
              openingCashBalance: Number(d.periodStats.openingCashBalance) || 0,
              receivablesCumulative: Number(d.periodStats.receivablesCumulative) || 0,
              receivablesInvoiced: Number(d.periodStats.receivablesInvoiced) || 0,
              receivablesCollected: Number(d.periodStats.receivablesCollected) || 0,
            });
            try {
              localStorage.setItem('seajong_cached_cash_balance', String(cb));
              localStorage.setItem('seajong_cached_revenue_total', String(rev));
              localStorage.setItem('seajong_cached_expenses_total', String(exp));
              localStorage.setItem('seajong_cached_receivables_total', String(rec));
            } catch { }
          } else {
            // Tính toán trực tiếp từ dữ liệu CSDL trả về khi server chưa khởi động lại
            const monthsArr: any[] = d.months || [];
            const totalYearIn = monthsArr.reduce((s, m) => s + (Number(m.inFlowRaw) || 0), 0);
            const totalYearOut = monthsArr.reduce((s, m) => s + (Number(m.outFlowRaw) || 0), 0);
            const latestBal = Number(d.currentBalance) || 1453506720;
            const yearOpeningBal = Math.max(0, Math.round(latestBal - totalYearIn + totalYearOut));

            let runBal = yearOpeningBal;
            const enrichedMonths = monthsArr.map((m, idx) => {
              const mNum = Number(m.monthNum) || (idx + 5);
              const openB = runBal;
              const inR = Number(m.inFlowRaw) || 0;
              const outR = Number(m.outFlowRaw) || 0;
              if (inR > 0 || outR > 0 || mNum >= 7) {
                runBal = Math.max(0, Math.round(runBal + inR - outR));
              }
              return { ...m, monthNum: mNum, openingBal: openB, closingBal: (inR > 0 || outR > 0 || mNum >= 7) ? runBal : 0, inR, outR };
            });

            // Reconstruct صحیح line points on chart
            const yMax = Number(d.yScaleMax) || 2;
            const fixedChartMonths = enrichedMonths.map((em) => {
              const netB = +(em.closingBal / 1e9).toFixed(3);
              const cy = netB > 0 ? +(175 - Math.min(yMax, netB) * (150 / yMax)).toFixed(2) : 175;
              const val =
                em.closingBal > 0
                  ? em.closingBal >= 1e9
                    ? `${(em.closingBal / 1e9).toFixed(2)} tỷ`
                    : `${(em.closingBal / 1e6).toFixed(1)} tr`
                  : '0 đ';
              return {
                ...em,
                netBalance: netB,
                cy,
                val,
              };
            });
            setCashflowChartData(fixedChartMonths);

            let targetMonths = enrichedMonths.filter((m) => m.monthNum === monthParam);
            if (periodParam === 'quarter') {
              targetMonths = enrichedMonths.filter((m) => [8, 9, 10].includes(m.monthNum));
            } else if (periodParam === 'year') {
              targetMonths = enrichedMonths;
            }

            const calcInflow = targetMonths.reduce((s, m) => s + m.inR, 0);
            const calcOutflow = targetMonths.reduce((s, m) => s + m.outR, 0);
            const lastActive = [...targetMonths].reverse().find((m) => m.closingBal > 0);
            const calcCashBal =
              periodParam === 'month' && monthParam <= 10
                ? lastActive?.closingBal || 0
                : latestBal;
            const calcOpenBal =
              targetMonths.find((m) => m.inR > 0 || m.outR > 0)?.openingBal || yearOpeningBal;

            // Tính Công nợ phải thu theo kỳ từ danh sách /api/debts/receivables
            const recs = Array.isArray(recList) ? recList : [];
            const cumulativeRec = recs.reduce(
              (acc, item) => acc + (Number(item.remainingAmount ?? item.remaining_amount) || 0),
              0
            );

            let periodInv = 0;
            let periodPaid = 0;
            const matchDateInPeriod = (dateStr: string) => {
              if (!dateStr) return false;
              const parts = String(dateStr).split('/');
              if (parts.length === 3) {
                const m = Number(parts[1]);
                const y = Number(parts[2]);
                if (y !== yearParam) return false;
                if (periodParam === 'month') return m === monthParam;
                if (periodParam === 'quarter') return [8, 9, 10].includes(m);
                return true;
              }
              return false;
            };

            recs.forEach((r: any) => {
              (r.entries || []).forEach((e: any) => {
                if (matchDateInPeriod(e.date)) {
                  periodInv += Number(e.contractValue ?? e.amount) || 0;
                }
              });
              (r.paymentRecords || []).forEach((p: any) => {
                if (matchDateInPeriod(p.date)) {
                  periodPaid += Number(p.amount) || 0;
                }
              });
            });

            const calcRec =
              periodParam === 'year'
                ? cumulativeRec
                : Math.max(0, Math.round(periodInv - periodPaid));

            setCashBalance(calcCashBal);
            setRevenueTotal(calcInflow);
            setExpensesTotal(calcOutflow);
            setReceivablesTotal(calcRec);
            setPeriodStats({
              openingCashBalance: calcOpenBal,
              receivablesCumulative: cumulativeRec,
              receivablesInvoiced: Math.round(periodInv),
              receivablesCollected: Math.round(periodPaid),
            });
          }
        }
      })
      .catch(() => { });

    fetch('/api/finance/cashflow-notices')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) {
          setCashflowNotices(d);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    loadRealStats(selectedPeriod, selectedMonth);
    const interval = setInterval(() => loadRealStats(selectedPeriod, selectedMonth), 6000);
    return () => clearInterval(interval);
  }, [selectedPeriod, selectedMonth]);

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
        loadRealStats(selectedPeriod, selectedMonth);
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

  // Ngưỡng quy định trong nội quy lao động / thẩm quyền chi tiêu công ty
  const laborRuleSingleLimit = useMemo(() => {
    try {
      const saved = localStorage.getItem('seajong_labor_rule_single_limit');
      if (saved) return Number(saved);
      const accLimit = localStorage.getItem('seajong_accounting_single_limit');
      if (accLimit) return Number(accLimit);
    } catch { }
    return 5000000; // Mặc định 5.000.000 đ theo định mức tạm ứng nội quy lao động
  }, []);

  const [isSubmittingDirector, setIsSubmittingDirector] = useState<boolean>(false);

  const handleSubmitDirector = async (orderId: string) => {
    setIsSubmittingDirector(true);
    try {
      const res = await fetch(`/api/finance/payment-orders/${orderId}/submit-director`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitter: 'Kế toán thanh toán',
          note: 'Trình Giám đốc phê duyệt chi do vượt quá ngưỡng quy định trong nội quy lao động',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onShowToast?.(
          'success',
          'Trình duyệt thành công',
          `Đã gửi thông tin Lệnh chi ${data.orderCode || selectedNotice?.code || ''} cho Giám đốc duyệt chi.`
        );
        notifyFinanceUpdated('payment_order', 'update');
        window.dispatchEvent(new CustomEvent('seajong_approval_documents_updated'));
        window.dispatchEvent(new CustomEvent('decodoor_approval_documents_updated'));
        loadRealStats(selectedPeriod, selectedMonth);
        if (selectedNotice && selectedNotice.paymentOrder) {
          setSelectedNotice({
            ...selectedNotice,
            status: 'Chờ Giám đốc duyệt',
            statusVariant: 'warning',
            paymentOrder: {
              ...selectedNotice.paymentOrder,
              status: 'submitted_director',
              statusLabel: 'Chờ Giám đốc duyệt',
              approvalNote: 'Đã trình Ban Giám đốc phê duyệt chi do vượt quá ngưỡng quy định trong nội quy lao động',
            },
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        onShowToast?.('error', 'Lỗi trình duyệt', err.error || 'Không thể gửi trình duyệt lệnh chi này');
      }
    } catch {
      onShowToast?.('error', 'Lỗi kết nối', 'Không thể kết nối tới máy chủ');
    } finally {
      setIsSubmittingDirector(false);
    }
  };

  const currentPeriodLabels = useMemo(() => {
    const now = new Date();
    const m = String(selectedMonth).padStart(2, '0');
    const y = now.getFullYear();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return {
      month: `Tháng ${m}/${y}`,
      quarter: `Quý ${q}/${y}`,
      year: `Năm ${y}`,
    };
  }, [selectedMonth]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Lắng nghe cập nhật tài chính thời gian thực từ các tab khác
  useFinanceRealtimeSync(() => {
    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    loadRealStats(selectedPeriod, selectedMonth);
  });


  return (
    <div
      className="custom-scrollbar"
      onTouchStart={handleMobileTouchStart}
      onTouchEnd={handleMobileTouchEnd}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobileView ? '10px' : '14px',
        padding: isMobileView ? '10px 10px 16px 10px' : '16px 20px 24px 20px',
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
          gap: isMobileView ? '6px' : '10px',
          paddingBottom: isMobileView ? '8px' : '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {!isMobileView && (
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
        )}

        {/* Nút lọc kỳ và Thao tác */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobileView ? '100%' : 'auto' }}>
          <div
            style={{
              display: isMobileView ? 'flex' : 'inline-flex',
              alignItems: 'center',
              justifyContent: isMobileView ? 'space-between' : undefined,
              width: isMobileView ? '100%' : 'auto',
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
              title="Lịch sự kiện"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: isMobileView ? '5px 8px' : '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: isEventDrawerOpen ? 700 : 500,
                backgroundColor: isEventDrawerOpen ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                color: isEventDrawerOpen ? 'var(--color-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <CalendarEvent size={13} color="var(--color-primary)" />
              {!isMobileView && 'Lịch sự kiện'}
            </button>

            <span style={{ color: 'var(--border-subtle)', margin: isMobileView ? '0 2px' : '0 4px', userSelect: 'none', opacity: 0.8 }}>|</span>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: isMobileView ? 1 : undefined,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: selectedPeriod === 'month' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'month' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <button
                type="button"
                title="Tháng trước"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPeriod('month');
                  setSelectedMonth((prev) => (prev > 1 ? prev - 1 : 12));
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobileView ? '4px 4px' : '4px 5px 4px 7px',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
              >
                <ChevronLeft size={11} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('month')}
                style={{
                  padding: '4px 4px',
                  fontSize: isMobileView ? '0.72rem' : '0.75rem',
                  fontWeight: selectedPeriod === 'month' ? 700 : 500,
                  background: 'transparent',
                  color: 'inherit',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentPeriodLabels.month}
              </button>
              <button
                type="button"
                title="Tháng sau"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPeriod('month');
                  setSelectedMonth((prev) => (prev < 12 ? prev + 1 : 1));
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobileView ? '4px 4px' : '4px 7px 4px 5px',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
              >
                <ChevronRight size={11} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPeriod('quarter')}
              style={{
                padding: isMobileView ? '4px 8px' : '4px 12px',
                flex: isMobileView ? 1 : undefined,
                borderRadius: 'var(--radius-sm)',
                fontSize: isMobileView ? '0.72rem' : '0.75rem',
                fontWeight: selectedPeriod === 'quarter' ? 700 : 500,
                backgroundColor: selectedPeriod === 'quarter' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'quarter' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {currentPeriodLabels.quarter}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('year')}
              style={{
                padding: isMobileView ? '4px 8px' : '4px 12px',
                flex: isMobileView ? 1 : undefined,
                borderRadius: 'var(--radius-sm)',
                fontSize: isMobileView ? '0.72rem' : '0.75rem',
                fontWeight: selectedPeriod === 'year' ? 700 : 500,
                backgroundColor: selectedPeriod === 'year' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'year' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {currentPeriodLabels.year}
            </button>
          </div>

          {/* Nút Ba Chấm ở cuối thanh công cụ (chỉ hiển thị trên Desktop) */}
          {!isMobileView && (
            <DepartmentActionMenu
              noBorder={true}
              extraItems={[
                {
                  id: 'refresh-data',
                  icon: <ArrowRepeat className="text-emerald-600 text-[15px] shrink-0" />,
                  title: 'Làm mới dữ liệu',
                  description: 'Đồng bộ sổ quỹ và công nợ thực tế',
                  onClick: () => {
                    loadRealStats(selectedPeriod, selectedMonth);
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
          )}
        </div>
      </div>

      {/* ── 2. HÀNG 4 THẺ CHỈ SỐ KPI TÀI CHÍNH THEN CHỐT ── */}
      {(!isMobileView || mobileSlide === 1) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobileView ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: isMobileView ? '8px' : '12px',
          }}
        >
          {/* KPI 1: Số dư khả dụng */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-2)',
              padding: isMobileView ? '10px' : '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobileView ? '4px' : '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: isMobileView ? '0.72rem' : '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Bank size={isMobileView ? 12 : 14} color="#0284c7" className="shrink-0" /> Số dư tồn quỹ
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: isMobileView ? '0.6rem' : '0.6875rem',
                  fontWeight: 700,
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: isMobileView ? '1px 4px' : '1px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Thực tế
              </span>
            </div>

            <div style={{ fontSize: isMobileView ? '0.95rem' : '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatVND(cashBalance)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedPeriod === 'month'
                    ? `Đầu tháng: ${formatVND(periodStats.openingCashBalance)}`
                    : selectedPeriod === 'quarter'
                      ? `Đầu quý: ${formatVND(periodStats.openingCashBalance)}`
                      : `Đầu năm: ${formatVND(periodStats.openingCashBalance)}`}
                </span>
              </div>
            </div>

            <div style={{ fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobileView ? 'Sổ quỹ TM (1111) & NH (1121)' : 'Đồng bộ từ sổ quỹ TM (1111) và tiền gửi NH (1121)'}
            </div>
          </div>

          {/* KPI 2: Dòng tiền thực thu */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-2)',
              padding: isMobileView ? '10px' : '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobileView ? '4px' : '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: isMobileView ? '0.72rem' : '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <CashCoin size={isMobileView ? 12 : 14} color="#10b981" className="shrink-0" /> Tổng thực thu
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: isMobileView ? '0.6rem' : '0.6875rem',
                  fontWeight: 700,
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: isMobileView ? '1px 4px' : '1px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {selectedPeriod === 'month' ? currentPeriodLabels.month : selectedPeriod === 'quarter' ? currentPeriodLabels.quarter : currentPeriodLabels.year}
              </span>
            </div>

            <div style={{ fontSize: isMobileView ? '0.95rem' : '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatVND(revenueTotal)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedPeriod === 'month'
                    ? `Thu hồi nợ & bán hàng ${currentPeriodLabels.month}`
                    : selectedPeriod === 'quarter'
                      ? 'Lũy kế 3 tháng trong Quý'
                      : `Lũy kế cả ${currentPeriodLabels.year}`}
                </span>
              </div>
            </div>

            <div style={{ fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobileView ? 'Từ HĐ bán hàng & phiếu thu' : 'Đồng bộ từ hợp đồng bán hàng và phiếu thu thực tế'}
            </div>
          </div>

          {/* KPI 3: Tổng giải ngân và Chi phí */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-2)',
              padding: isMobileView ? '10px' : '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobileView ? '4px' : '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: isMobileView ? '0.72rem' : '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <CashStack size={isMobileView ? 12 : 14} color="#f43f5e" className="shrink-0" /> Tổng thực chi
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: isMobileView ? '0.6rem' : '0.6875rem',
                  fontWeight: 700,
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: isMobileView ? '1px 4px' : '1px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {selectedPeriod === 'month' ? currentPeriodLabels.month : selectedPeriod === 'quarter' ? currentPeriodLabels.quarter : currentPeriodLabels.year}
              </span>
            </div>

            <div style={{ fontSize: isMobileView ? '0.95rem' : '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatVND(expensesTotal)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedPeriod === 'month'
                    ? `Chi phí QL, BH, SX ${currentPeriodLabels.month}`
                    : selectedPeriod === 'quarter'
                      ? 'Lũy kế 3 tháng trong Quý'
                      : `Lũy kế cả ${currentPeriodLabels.year}`}
                </span>
              </div>
            </div>

            <div style={{ fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobileView ? 'Từ Quản lý chi phí & phiếu chi' : 'Đồng bộ từ phân hệ Quản lý chi phí và phiếu chi'}
            </div>
          </div>

          {/* KPI 4: Công nợ phải thu */}
          <div
            onClick={() => onNavigate?.('debt-cost-mgmt')}
            style={{
              backgroundColor: 'var(--bg-surface-2)',
              padding: isMobileView ? '10px' : '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: isMobileView ? '4px' : '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: onNavigate ? 'pointer' : 'default',
              minWidth: 0,
            }}
            title={onNavigate ? 'Nhấp để xem chi tiết Quản lý Công nợ' : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: isMobileView ? '0.72rem' : '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <CreditCard size={isMobileView ? 12 : 14} color="#8b5cf6" className="shrink-0" /> Công nợ phải thu
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: isMobileView ? '0.6rem' : '0.6875rem',
                  fontWeight: 700,
                  color: '#0284c7',
                  backgroundColor: 'rgba(2, 132, 199, 0.12)',
                  padding: isMobileView ? '1px 4px' : '1px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {selectedPeriod === 'month' ? currentPeriodLabels.month : selectedPeriod === 'quarter' ? currentPeriodLabels.quarter : currentPeriodLabels.year}
              </span>
            </div>

            <div style={{ fontSize: isMobileView ? '0.95rem' : '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatVND(receivablesTotal)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedPeriod === 'month'
                    ? `Phát sinh: ${formatVND(periodStats.receivablesInvoiced)}`
                    : selectedPeriod === 'quarter'
                      ? `Phát sinh quý: ${formatVND(periodStats.receivablesInvoiced)}`
                      : `Phát sinh năm: ${formatVND(periodStats.receivablesInvoiced)}`}
                </span>
              </div>
            </div>

            <div style={{ fontSize: isMobileView ? '0.625rem' : '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedPeriod === 'year'
                ? `Đã thu hồi: ${formatVND(periodStats.receivablesCollected)}`
                : `Dư nợ lũy kế: ${formatVND(periodStats.receivablesCumulative)}`}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. KHỐI BIỂU ĐỒ TRỰC QUAN (DÒNG TIỀN VÀO - RA VÀ TUỔI NỢ PHẢI THU) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileView ? 'minmax(0, 1fr)' : 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: isMobileView ? '10px' : '14px',
          flex: 1,
          minHeight: isMobileView ? 'auto' : '320px',
        }}
      >
        {/* Biểu đồ Dòng tiền Thu - Chi theo tháng */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: isMobileView ? '12px 12px' : '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: !isMobileView || mobileSlide === 1 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: isMobileView ? '8px' : '10px',
            boxSizing: 'border-box',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: isMobileView ? '0.8125rem' : '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                Diễn biến dòng tiền thu - chi 6 tháng gần nhất
              </h3>
              {!isMobileView && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  So sánh Dòng tiền vào, Dòng tiền ra và Số dư quỹ tích lũy
                </p>
              )}
            </div>

            {/* Chú giải Legend (trên Desktop hiển thị ở header) */}
            {!isMobileView && (
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
            )}
          </div>

          {/* Vùng vẽ biểu đồ Bar Chart + Trendline Line Số dư quỹ bằng SVG thống nhất */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              minHeight: isMobileView ? '205px' : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: isMobileView ? '2px' : '8px',
            }}
          >
            <svg
              viewBox={isMobileView ? '52 10 560 198' : '0 0 650 230'}
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: isMobileView ? '205px' : '100%', overflow: 'visible' }}
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
              {(() => {
                const maxDataBillions = Math.max(
                  2,
                  ...cashflowChartData.flatMap((m) => [m.inFlow || 0, m.outFlow || 0, m.netBalance || 0])
                );
                const yMax = maxDataBillions <= 2 ? 2 : maxDataBillions <= 5 ? 5 : maxDataBillions <= 10 ? 10 : 20;
                const gridSteps = [
                  { val: yMax, y: 25 },
                  { val: +(yMax * 0.75).toFixed(2), y: 62.5 },
                  { val: +(yMax * 0.5).toFixed(2), y: 100 },
                  { val: +(yMax * 0.25).toFixed(2), y: 137.5 },
                  { val: 0, y: 175 },
                ];

                return (
                  <>
                    {gridSteps.map((grid, gIdx) => (
                      <g key={`grid-${gIdx}`}>
                        {!isMobileView && (
                          <text
                            x="30"
                            y={grid.y + 4}
                            textAnchor="end"
                            fill="var(--text-muted)"
                            fontSize="10.5"
                            fontWeight="500"
                          >
                            {grid.val > 0 ? `${grid.val}tỷ` : '0'}
                          </text>
                        )}
                        <line
                          x1={isMobileView ? '55' : '38'}
                          y1={grid.y}
                          x2={isMobileView ? '608' : '630'}
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
                        ? Math.max(6, Math.min(150, (bar.inFlow / yMax) * 150))
                        : 0;
                      const inY = 175 - inHeight;
                      const outHeight = bar.outFlow > 0
                        ? Math.max(6, Math.min(150, (bar.outFlow / yMax) * 150))
                        : 0;
                      const outY = 175 - outHeight;

                      const inLabel = bar.inFlow >= 1
                        ? `${bar.inFlow.toFixed(2)}tỷ`
                        : (bar.inFlowRaw ? `${Math.round(bar.inFlowRaw / 1e6)}tr` : (bar.inFlow > 0 ? `${(bar.inFlow * 1000).toFixed(0)}tr` : '0'));
                      const outLabel = bar.outFlow >= 1
                        ? `${bar.outFlow.toFixed(2)}tỷ`
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
                            {isMobileView ? bar.month.replace(' (HT)', '') : bar.month}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}

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

          {/* Chú giải Legend ở chân thẻ biểu đồ trên Mobile */}
          {isMobileView && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '0.72rem', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#10b981' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Tiền vào</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', backgroundColor: '#f43f5e' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Tiền ra</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '14px', height: '2px', backgroundColor: '#0284c7', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '-2.5px', left: '3.5px', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '2px' }}>Số dư quỹ</span>
              </div>
            </div>
          )}
        </div>

        {/* Phân tích Tuổi nợ phải thu / Thông báo dòng tiền */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: isMobileView ? '12px 12px' : '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: !isMobileView || mobileSlide === 2 ? 'flex' : 'none',
            flexDirection: 'column',
            gap: '12px',
            boxSizing: 'border-box',
            height: '100%',
            maxHeight: '100%',
            minHeight: isMobileView ? '380px' : 0,
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

      {/* ── OFFCANVAS CHI TIẾT LỆNH CHI TIỀN (RỘNG 400PX - COMPONENT TÁCH DÙNG CHUNG) ── */}
      <PaymentOrderOffcanvas
        isOpen={Boolean(selectedNotice && selectedNotice.type === 'outflow')}
        onClose={() => setSelectedNotice(null)}
        data={selectedNotice}
        onShowToast={onShowToast}
        onSuccess={() => loadRealStats(selectedPeriod, selectedMonth)}
      />

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

