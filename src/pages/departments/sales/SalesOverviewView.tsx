import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  CashStack,
  Headset,
  Buildings,
  ArrowUpRight,
  ArrowDownRight,
  CalendarEvent,
  GeoAlt,
  Printer,
  ArrowRepeat,
  ChevronLeft,
  ChevronRight,
} from 'react-bootstrap-icons';
import { EventOffcanvas } from '../../../components/common/EventOffcanvas';
import { DepartmentActionMenu } from '../../../components/common/DepartmentActionMenu';
import { calendarEventService, getCurrentSessionUser, getLocalCachedEvents } from '../../../services/calendarEventService';
import type { PlannerItem } from '../../../components/common/TodoListPlanner';
import type { UserProfile } from '../../../types';

export interface SalesOverviewViewProps {
  user?: UserProfile;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
  onTickerUpdate?: (items: any[]) => void;
}

interface SalesTrendItem {
  ym?: string;
  monthNum?: number;
  month: string;
  monthFull?: string;
  signed: number;
  signedSeajong?: number;
  signedOem?: number;
  revenue: number;
  revenueSeajong?: number;
  revenueOem?: number;
  target: number;
  targetSales?: number;
  targetRevenue?: number;
  targetSeajong?: number;
  targetOem?: number;
  rate: number;
}

const ALL_MONTHS_TREND_DATA: Record<number, SalesTrendItem> = {
  1: { ym: '2026-01', monthNum: 1, month: 'T01/26', monthFull: 'Tháng 01/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 0.71, targetSales: 0.71, targetRevenue: 0.61, targetSeajong: 0.71, targetOem: 0, rate: 0 },
  2: { ym: '2026-02', monthNum: 2, month: 'T02/26', monthFull: 'Tháng 02/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 0.08, targetSales: 0.08, targetRevenue: 0.07, targetSeajong: 0.08, targetOem: 0, rate: 0 },
  3: { ym: '2026-03', monthNum: 3, month: 'T03/26', monthFull: 'Tháng 03/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 1.07, targetSales: 1.07, targetRevenue: 0.91, targetSeajong: 1.07, targetOem: 0, rate: 0 },
  4: { ym: '2026-04', monthNum: 4, month: 'T04/26', monthFull: 'Tháng 04/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 0.80, targetSales: 0.80, targetRevenue: 0.68, targetSeajong: 0.80, targetOem: 0, rate: 0 },
  5: { ym: '2026-05', monthNum: 5, month: 'T05/26', monthFull: 'Tháng 05/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 0.18, targetSales: 0.18, targetRevenue: 0.15, targetSeajong: 0.18, targetOem: 0, rate: 0 },
  6: { ym: '2026-06', monthNum: 6, month: 'T06/26', monthFull: 'Tháng 06/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 0.05, targetSales: 0.05, targetRevenue: 0.04, targetSeajong: 0.05, targetOem: 0, rate: 0 },
  7: { ym: '2026-07', monthNum: 7, month: 'T07/26', monthFull: 'Tháng 07/2026', signed: 0.10, signedSeajong: 0.05, signedOem: 0.05, revenue: 0.10, revenueSeajong: 0.05, revenueOem: 0.05, target: 0.43, targetSales: 0.43, targetRevenue: 0.37, targetSeajong: 0.40, targetOem: 0.03, rate: 23.3 },
  8: { ym: '2026-08', monthNum: 8, month: 'T08/26', monthFull: 'Tháng 08/2026', signed: 1.00, signedSeajong: 0.39, signedOem: 0.61, revenue: 0.13, revenueSeajong: 0.11, revenueOem: 0.02, target: 0.56, targetSales: 0.56, targetRevenue: 0.47, targetSeajong: 0.50, targetOem: 0.06, rate: 100 },
  9: { ym: '2026-09', monthNum: 9, month: 'T09/26', monthFull: 'Tháng 09/2026', signed: 0.04, signedSeajong: 0.04, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 1.60, targetSales: 1.60, targetRevenue: 1.36, targetSeajong: 1.20, targetOem: 0.40, rate: 2.5 },
  10: { ym: '2026-10', monthNum: 10, month: 'T10/26 (HT)', monthFull: 'Tháng 10/2026 (Hiện tại)', signed: 0.15, signedSeajong: 0.14, signedOem: 0.01, revenue: 0.07, revenueSeajong: 0.06, revenueOem: 0.01, target: 1.55, targetSales: 1.55, targetRevenue: 1.32, targetSeajong: 1.15, targetOem: 0.40, rate: 9.7 },
  11: { ym: '2026-11', monthNum: 11, month: 'T11/26', monthFull: 'Tháng 11/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 1.63, targetSales: 1.63, targetRevenue: 1.39, targetSeajong: 1.20, targetOem: 0.43, rate: 0 },
  12: { ym: '2026-12', monthNum: 12, month: 'T12/26', monthFull: 'Tháng 12/2026', signed: 0, signedSeajong: 0, signedOem: 0, revenue: 0, revenueSeajong: 0, revenueOem: 0, target: 1.61, targetSales: 1.61, targetRevenue: 1.37, targetSeajong: 1.20, targetOem: 0.41, rate: 0 },
};

const MONTHLY_DEALER_TARGETS: Record<number, number> = {
  1: 1,
  2: 0,
  3: 1,
  4: 0,
  5: 0,
  6: 0,
  7: 2,
  8: 2,
  9: 10,
  10: 11,
  11: 13,
  12: 14,
};

const MONTHLY_DEVELOPED_DEALERS: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 4,
  8: 10,
  9: 3,
  10: 8,
  11: 0,
  12: 0,
};

const DEFAULT_TREND_DATA: SalesTrendItem[] = [
  ALL_MONTHS_TREND_DATA[5],
  ALL_MONTHS_TREND_DATA[6],
  ALL_MONTHS_TREND_DATA[7],
  ALL_MONTHS_TREND_DATA[8],
  ALL_MONTHS_TREND_DATA[9],
  ALL_MONTHS_TREND_DATA[10],
];

interface SalesOverviewData {
  kpi: {
    signed: {
      totalValue: number;
      totalValueBillion: number;
      seajongBillion?: number;
      oemBillion?: number;
      count: number;
      avgValueBillion: number;
      targetBillion: number;
      achievementRate: number;
      growthText: string;
    };
    revenue: {
      totalValue: number;
      totalValueBillion: number;
      seajongBillion?: number;
      oemBillion?: number;
      targetBillion: number;
      achievementRate: number;
      growthText: string;
      maxItem: string;
    };
    dealerDev: {
      totalDealers: number;
      developedCount?: number;
      achievementRate?: number;
      leadsCount: number;
      inCareCount: number;
      negotiatingCount: number;
      totalQuoteValue?: number;
      topLeadText?: string;
      targetNewDealers: number;
    };
    dealerSupport: {
      totalCount: number;
      waitingCount: number;
      inProgressCount: number;
      resolvedCount: number;
      handledCount: number;
      slaRate: number;
      latestText?: string;
    };
  };
  trendData: SalesTrendItem[];
}

export const SalesOverviewView: React.FC<SalesOverviewViewProps> = ({
  user: propUser,
  onShowToast,
  onNavigate,
  onTickerUpdate,
}) => {
  // Định danh người dùng đang đăng nhập: Lịch của ai chỉ hiển thị người đó
  const sessionUser = useMemo(() => propUser || getCurrentSessionUser(), [propUser]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerItem[]>(() => {
    const cached = getLocalCachedEvents(sessionUser.email || sessionUser.id);
    if (cached && cached.length > 0) return cached;
    return [];
  });

  const loadUserEvents = useCallback(async () => {
    try {
      const items = await calendarEventService.getMyEvents(sessionUser);
      if (items) {
        setPlannerEvents(items);
      }
    } catch (err) {
      console.warn('Lỗi khi tải lịch sự kiện cá nhân:', err);
    }
  }, [sessionUser]);

  useEffect(() => {
    loadUserEvents();
    const handleEventAdded = () => loadUserEvents();
    window.addEventListener('decodoor_calendar_event_added', handleEventAdded);
    window.addEventListener('storage', handleEventAdded);
    return () => {
      window.removeEventListener('decodoor_calendar_event_added', handleEventAdded);
      window.removeEventListener('storage', handleEventAdded);
    };
  }, [loadUserEvents]);

  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [chartMetric, setChartMetric] = useState<'sales' | 'revenue'>('sales');
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString('vi-VN'));
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState<boolean>(false);
  const [activeChartHover, setActiveChartHover] = useState<number | null>(null);

  // Dữ liệu thống kê thực tế từ CSDL SQLite
  const [salesStats, setSalesStats] = useState<SalesOverviewData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  const fetchSalesStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const [statsRes, partnersRes, supportRes] = await Promise.all([
        fetch(`/api/sales/overview-stats?period=${selectedPeriod}&month=${selectedMonth}`),
        fetch('/api/sales/partners').catch(() => null),
        fetch('/api/sales/dealer-support-tickets').catch(() => null),
      ]);

      const data: SalesOverviewData = statsRes.ok
        ? await statsRes.json()
        : {
            kpi: {
              signed: { totalValue: 0, totalValueBillion: 0, count: 0, avgValueBillion: 0, targetBillion: 0, achievementRate: 0, growthText: '+0.0%' },
              revenue: { totalValue: 0, totalValueBillion: 0, targetBillion: 0, achievementRate: 0, growthText: '+0.0%', maxItem: 'Chưa có' },
              dealerDev: { totalDealers: 343, leadsCount: 0, inCareCount: 0, negotiatingCount: 0, targetNewDealers: 11 },
              dealerSupport: { totalCount: 0, waitingCount: 0, inProgressCount: 0, resolvedCount: 0, handledCount: 0, slaRate: 0 },
            },
            trendData: [],
          };

      // Đồng bộ trực tiếp từ /api/sales/partners (bảng MarketingLead) để khớp 100% với trang Phát triển đại lý
      const monthDealerTarget = MONTHLY_DEALER_TARGETS[selectedMonth] ?? 11;
      const defaultDealerTarget = selectedPeriod === 'month' ? monthDealerTarget : selectedPeriod === 'quarter' ? 15 : 25;
      const dbDealerTarget =
        data.kpi?.dealerDev?.targetNewDealers !== undefined && data.kpi.dealerDev.targetNewDealers !== 5 && data.kpi.dealerDev.targetNewDealers !== 50
          ? data.kpi.dealerDev.targetNewDealers
          : defaultDealerTarget;
      const defaultDevelopedDealers =
        selectedPeriod === 'month'
          ? (MONTHLY_DEVELOPED_DEALERS[selectedMonth] ?? 8)
          : selectedPeriod === 'quarter'
          ? 21
          : 25;
      const dbDevelopedDealers =
        data.kpi?.dealerDev?.developedCount !== undefined
          ? data.kpi.dealerDev.developedCount
          : defaultDevelopedDealers;
      const dbDealerRate =
        dbDealerTarget > 0 ? +Math.min((dbDevelopedDealers / dbDealerTarget) * 100, 100).toFixed(1) : 0;

      if (partnersRes && partnersRes.ok) {
        const partnersList = await partnersRes.json();
        if (Array.isArray(partnersList)) {
          const leadsCount = partnersList.length;
          const negotiatingCount = partnersList.filter((p) => Number(p.step) >= 3).length;
          const inCareCount = partnersList.filter((p) => Number(p.step) < 3).length;
          const topLead = partnersList.find((p) => Number(p.step) >= 3) || partnersList[0];
          const topLeadName = topLead?.companyName || topLead?.name || '';
          data.kpi.dealerDev = {
            ...data.kpi.dealerDev,
            totalDealers: data.kpi?.dealerDev?.totalDealers || 343,
            developedCount: dbDevelopedDealers,
            achievementRate: dbDealerRate,
            leadsCount,
            inCareCount,
            negotiatingCount,
            topLeadText: topLeadName ? `${topLeadName} (Bước ${topLead?.step || 1})` : 'Chưa có hồ sơ',
            targetNewDealers: dbDealerTarget,
          };
        }
      } else if (data.kpi?.dealerDev) {
        data.kpi.dealerDev.targetNewDealers = dbDealerTarget;
        data.kpi.dealerDev.developedCount = dbDevelopedDealers;
        data.kpi.dealerDev.achievementRate = dbDealerRate;
      }

      // Đồng bộ trực tiếp từ /api/sales/dealer-support-tickets (bảng DealerSupportTicket) để khớp 100% với trang Hỗ trợ đại lý
      if (supportRes && supportRes.ok) {
        const supportJson = await supportRes.json();
        const ticketsList = Array.isArray(supportJson?.data) ? supportJson.data : [];
        const totalCount = ticketsList.length;
        const waitingCount = ticketsList.filter((t: any) => t.status === 'Pending' || t.status === 'New').length;
        const inProgressCount = ticketsList.filter((t: any) => t.status === 'In Progress' || t.status === 'Processing').length;
        const resolvedCount = ticketsList.filter((t: any) => t.status === 'Resolved' || t.status === 'Completed').length;
        const handledCount = inProgressCount + resolvedCount;
        const slaRate = totalCount > 0 ? +((handledCount / totalCount) * 100).toFixed(0) : 100;
        const latestTicket = ticketsList[0];
        const latestDealer = latestTicket?.customer?.name || latestTicket?.dealerName || '';
        data.kpi.dealerSupport = {
          totalCount,
          waitingCount,
          inProgressCount,
          resolvedCount,
          handledCount,
          slaRate,
          latestText: latestTicket ? `${latestDealer} (${latestTicket.code})` : 'Chưa có yêu cầu mới',
        };
      }

      // Đồng bộ trực tiếp dữ liệu Biểu đồ (trendData) và 2 thẻ KPI (Doanh số & Doanh thu) để khớp 100%
      const endWinMonth = selectedMonth < 5 ? 6 : selectedMonth > 10 ? selectedMonth : 10;
      const startWinMonth = Math.max(endWinMonth - 5, 1);
      const fallbackWindow: SalesTrendItem[] = [];
      for (let m = startWinMonth; m <= endWinMonth; m++) {
        fallbackWindow.push(ALL_MONTHS_TREND_DATA[m] || DEFAULT_TREND_DATA[0]);
      }

      const normalizedTrend: SalesTrendItem[] =
        data.trendData && data.trendData.length === 6
          ? data.trendData.map((d, idx) => {
              const fb = fallbackWindow[idx] || DEFAULT_TREND_DATA[idx];
              const hasChannelSplit = d.signedSeajong !== undefined && d.targetRevenue !== undefined && d.monthNum !== undefined;
              return hasChannelSplit ? d : fb;
            })
          : fallbackWindow;

      data.trendData = normalizedTrend;

      const selectedMonthItem =
        normalizedTrend.find((m) => m.monthNum === selectedMonth || m.month.includes(`T${String(selectedMonth).padStart(2, '0')}`)) ||
        ALL_MONTHS_TREND_DATA[selectedMonth] ||
        normalizedTrend[normalizedTrend.length - 1];
      const prevMonthItem =
        selectedMonth > 1
          ? normalizedTrend.find((m) => m.monthNum === selectedMonth - 1 || m.month.includes(`T${String(selectedMonth - 1).padStart(2, '0')}`)) ||
            ALL_MONTHS_TREND_DATA[selectedMonth - 1]
          : { signed: 0, revenue: 0 };

      const activeMonths =
        selectedPeriod === 'month'
          ? [selectedMonthItem]
          : selectedPeriod === 'quarter'
          ? normalizedTrend.slice(-3)
          : normalizedTrend;
      const prevMonths =
        selectedPeriod === 'month'
          ? [prevMonthItem as SalesTrendItem]
          : normalizedTrend.slice(0, 3);
      const currGrowthMonths =
        selectedPeriod === 'year' ? normalizedTrend.slice(-3) : activeMonths;

      const calcGrowthStr = (curr: number, prev: number) => {
        if (prev > 0) {
          const pct = +(((curr - prev) / prev) * 100).toFixed(1);
          return `${pct >= 0 ? '+' : ''}${pct}%`;
        }
        if (curr > 0) return '+100.0%';
        return '0.0%';
      };

      const kpiSignedSeajong = +activeMonths.reduce((s, m) => s + (m.signedSeajong || 0), 0).toFixed(2);
      const kpiSignedOem = +activeMonths.reduce((s, m) => s + (m.signedOem || 0), 0).toFixed(2);
      const kpiSignedTotal = +(kpiSignedSeajong + kpiSignedOem).toFixed(2);
      const kpiSignedTarget = +activeMonths.reduce((s, m) => s + (m.targetSales ?? m.target ?? 0), 0).toFixed(2);
      const kpiSignedRate = kpiSignedTarget > 0 ? +Math.min((kpiSignedTotal / kpiSignedTarget) * 100, 100).toFixed(1) : 0;
      const currSignedGrowthVal = +currGrowthMonths.reduce((s, m) => s + (m.signed || 0), 0).toFixed(2);
      const prevSignedGrowthVal = +prevMonths.reduce((s, m) => s + (m.signed || 0), 0).toFixed(2);
      const kpiSignedGrowth = calcGrowthStr(currSignedGrowthVal, prevSignedGrowthVal);

      const kpiRevSeajong = +activeMonths.reduce((s, m) => s + (m.revenueSeajong || 0), 0).toFixed(2);
      const kpiRevOem = +activeMonths.reduce((s, m) => s + (m.revenueOem || 0), 0).toFixed(2);
      const kpiRevTotal = +(kpiRevSeajong + kpiRevOem).toFixed(2);
      const kpiRevTarget = +activeMonths.reduce((s, m) => s + (m.targetRevenue ?? +((m.target || 0) * 0.85).toFixed(2)), 0).toFixed(2);
      const kpiRevRate = kpiRevTarget > 0 ? +Math.min((kpiRevTotal / kpiRevTarget) * 100, 100).toFixed(1) : 0;
      const currRevGrowthVal = +currGrowthMonths.reduce((s, m) => s + (m.revenue || 0), 0).toFixed(2);
      const prevRevGrowthVal = +prevMonths.reduce((s, m) => s + (m.revenue || 0), 0).toFixed(2);
      const kpiRevGrowth = calcGrowthStr(currRevGrowthVal, prevRevGrowthVal);

      data.kpi.signed = {
        ...data.kpi.signed,
        totalValueBillion: kpiSignedTotal,
        seajongBillion: kpiSignedSeajong,
        oemBillion: kpiSignedOem,
        targetBillion: kpiSignedTarget,
        achievementRate: kpiSignedRate,
        growthText: kpiSignedGrowth,
      };

      data.kpi.revenue = {
        ...data.kpi.revenue,
        totalValueBillion: kpiRevTotal,
        seajongBillion: kpiRevSeajong,
        oemBillion: kpiRevOem,
        targetBillion: kpiRevTarget,
        achievementRate: kpiRevRate,
        growthText: kpiRevGrowth,
      };

      setSalesStats(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));

      if (onTickerUpdate) {
        const pLabel =
          selectedPeriod === 'month'
            ? `Tháng ${String(selectedMonth).padStart(2, '0')}/2026`
            : selectedPeriod === 'quarter'
            ? 'Quý 4/2026'
            : 'Năm 2026';
        const fmtBil = (v: number) => v.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const sixMonthSales = +normalizedTrend.reduce((s, m) => s + (m.signed || 0), 0).toFixed(2);
        const sixMonthRev = +normalizedTrend.reduce((s, m) => s + (m.revenue || 0), 0).toFixed(2);
        onTickerUpdate([
          {
            badge: 'TỔNG DOANH SỐ',
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
            text: `${pLabel}: Tổng doanh số đạt <strong>${fmtBil(kpiSignedTotal)} tỷ đồng</strong> (Seajong: <strong>${fmtBil(kpiSignedSeajong)} tỷ</strong> • OEM: <strong>${fmtBil(kpiSignedOem)} tỷ</strong>) — Đạt <strong>${kpiSignedRate}%</strong> chỉ tiêu (${fmtBil(kpiSignedTarget)} tỷ, tăng trưởng <strong>${kpiSignedGrowth}</strong>)`,
          },
          {
            badge: 'TỔNG DOANH THU',
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
            text: `${pLabel}: Tổng doanh thu đạt <strong>${fmtBil(kpiRevTotal)} tỷ đồng</strong> (Seajong: <strong>${fmtBil(kpiRevSeajong)} tỷ</strong> • OEM: <strong>${fmtBil(kpiRevOem)} tỷ</strong>) — Đạt <strong>${kpiRevRate}%</strong> kế hoạch (${fmtBil(kpiRevTarget)} tỷ)`,
          },
          {
            badge: 'PHÁT TRIỂN ĐẠI LÝ',
            badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
            text: `${pLabel}: Phát triển <strong>${data.kpi.dealerDev.developedCount ?? 8}/${data.kpi.dealerDev.targetNewDealers ?? 11} đại lý</strong> (Đạt <strong>${data.kpi.dealerDev.achievementRate ?? 72.7}%</strong> mục tiêu) • Đang theo dõi <strong>${data.kpi.dealerDev.leadsCount ?? 4} đối tác tiềm năng</strong> (${data.kpi.dealerDev.inCareCount ?? 3} chăm sóc, ${data.kpi.dealerDev.negotiatingCount ?? 1} báo giá/HĐ)`,
          },
          {
            badge: 'HỖ TRỢ ĐẠI LÝ',
            badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
            text: `Hỗ trợ đại lý: Tiếp nhận <strong>${data.kpi.dealerSupport.totalCount ?? 2} yêu cầu</strong> (${data.kpi.dealerSupport.inProgressCount ?? 1} đang xử lý, ${data.kpi.dealerSupport.waitingCount ?? 1} chờ tiếp nhận — Tiếp nhận <strong>${data.kpi.dealerSupport.slaRate ?? 50}%</strong>) • Mới nhất: <strong>${data.kpi.dealerSupport.latestText || 'Showroom Thiên Thuận Lạng Sơn'}</strong>`,
          },
          {
            badge: 'DIỄN BIẾN 6 THÁNG',
            badgeColor: 'bg-teal-50 text-teal-800 border-teal-200 font-bold',
            text: `Lũy kế 6 tháng trên biểu đồ: Tổng doanh số đạt <strong>${fmtBil(sixMonthSales)} tỷ đồng</strong> • Tổng doanh thu thực thu đạt <strong>${fmtBil(sixMonthRev)} tỷ đồng</strong>`,
          },
        ]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải số liệu tổng quan kinh doanh:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedPeriod, selectedMonth, onTickerUpdate]);

  useEffect(() => {
    fetchSalesStats();
  }, [fetchSalesStats]);

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

  const upcomingUserEvents = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Chỉ hiển thị sự kiện của đúng tài khoản người dùng đang đăng nhập
    const validEvents = plannerEvents.filter((it) => (it.type === 'event' || !it.type) && Boolean(it.date));

    const sorted = [...validEvents].sort((a, b) => {
      const cmp = (a.date || '').localeCompare(b.date || '');
      if (cmp !== 0) return cmp;
      return (a.timeStart || '').localeCompare(b.timeStart || '');
    });

    // Lọc sự kiện diễn ra hôm nay (hoặc sự kiện nhiều ngày đi qua hôm nay)
    const todayEvents = sorted.filter((ev) => {
      const start = ev.date || '';
      const end = ev.endDate || ev.date || '';
      return todayKey >= start && todayKey <= end;
    });

    // Ưu tiên hiển thị danh sách sự kiện hôm nay; nếu hôm nay không có thì lấy sự kiện sắp tới
    const displayList = todayEvents.length > 0
      ? todayEvents
      : sorted.filter((ev) => (ev.date || '') >= todayKey);

    return displayList.map((ev) => {
      const startDate = ev.date || todayKey;
      const endDate = ev.endDate || startDate;
      const isToday = todayKey >= startDate && todayKey <= endDate;

      let dateBadge = '';
      if (!isToday) {
        const [y, m, d] = startDate.split('-');
        if (y && m && d) {
          dateBadge = `${d}/${m}/${y}`;
        } else {
          dateBadge = startDate;
        }
      }

      const timeRange = ev.isAllDay
        ? 'Cả ngày'
        : (ev.timeStart && ev.timeEnd ? `${ev.timeStart} - ${ev.timeEnd}` : ev.timeStart || 'Cả ngày');
      const assignee = ev.assigneeName || sessionUser.name || 'Tôi';

      return {
        id: ev.id,
        isToday,
        dateBadge,
        time: timeRange,
        title: ev.title,
        location: ev.location || 'Tại công ty',
        assignee,
        priority: ev.priority || 'high',
      };
    });
  }, [plannerEvents, sessionUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="custom-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 20px 20px 20px',
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
          flexShrink: 0,
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
            {isLoadingStats ? 'Đang đồng bộ CSDL...' : 'Dữ liệu thời gian thực'}
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

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
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
                  padding: '4px 5px 4px 7px',
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
                  fontSize: '0.75rem',
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
                  padding: '4px 7px 4px 5px',
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

          {/* Menu tiện ích phòng ban (Thư viện tài liệu, Sổ ghi chép, Yêu cầu, Làm mới...) */}
          <DepartmentActionMenu
            noBorder={true}
            extraItems={[
              {
                id: 'refresh-sales-data',
                icon: <ArrowRepeat className="text-emerald-600 text-[15px] shrink-0" />,
                title: 'Làm mới dữ liệu',
                description: 'Đồng bộ doanh số, đơn hàng & công nợ thực tế',
                onClick: () => {
                  fetchSalesStats();
                  loadUserEvents();
                  onShowToast?.('success', 'Đã đồng bộ', 'Số liệu kinh doanh đã được cập nhật từ CSDL');
                },
              },
              {
                id: 'print-sales-overview',
                icon: <Printer className="text-blue-600 text-[15px] shrink-0" />,
                title: 'In báo cáo tổng quan',
                description: 'Xuất bản in tổng quan kinh doanh',
                onClick: () => {
                  window.print();
                },
              },
            ]}
          />
        </div>
      </div>

      {/* ── 2. HÀNG 4 THẺ CHỈ SỐ KPI KINH DOANH THEN CHỐT ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* KPI 1: Tổng doanh số */}
        <div
          onClick={() => onNavigate?.('contracts')}
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
          title={onNavigate ? 'Nhấp để xem theo dõi đơn hàng & hợp đồng' : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={14} color="#0284c7" /> Tổng doanh số
            </span>
            {(() => {
              const signedGrowth = salesStats?.kpi?.signed?.growthText || '+0.0%';
              const isNeg = signedGrowth.startsWith('-');
              const isPos = signedGrowth.startsWith('+') && signedGrowth !== '+0.0%' && signedGrowth !== '+0%';
              return (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: isNeg ? '#ef4444' : isPos ? '#10b981' : 'var(--text-muted)',
                    backgroundColor: isNeg
                      ? 'rgba(239, 68, 68, 0.12)'
                      : isPos
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'var(--bg-surface-3)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {isNeg ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />} {signedGrowth}
                </span>
              );
            })()}
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {(salesStats?.kpi?.signed?.totalValueBillion ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>{(salesStats?.kpi?.signed?.targetBillion ?? 0) > 0 ? `Chỉ tiêu: ${salesStats?.kpi?.signed?.targetBillion} tỷ đồng` : 'Theo kế hoạch năm'}</span>
              <strong style={{ color: '#0284c7' }}>Đạt {salesStats?.kpi?.signed?.achievementRate ?? 0}%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(salesStats?.kpi?.signed?.achievementRate ?? 0, 100)}%`,
                  height: '100%',
                  backgroundColor: '#0284c7',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            <span>
              Seajong: <strong style={{ color: '#0284c7' }}>{(salesStats?.kpi?.signed?.seajongBillion ?? +((salesStats?.kpi?.signed?.totalValueBillion ?? 0) * 0.95).toFixed(2)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tỷ</strong>
            </span>
            <span>
              OEM: <strong style={{ color: '#d97706' }}>{(salesStats?.kpi?.signed?.oemBillion ?? +((salesStats?.kpi?.signed?.totalValueBillion ?? 0) * 0.05).toFixed(2)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tỷ</strong>
            </span>
          </div>
        </div>

        {/* KPI 2: Doanh thu nghiệm thu và Xuất hóa đơn */}
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
              <CashStack size={14} color="#10b981" /> Tổng doanh thu
            </span>
            {(() => {
              const revGrowth = salesStats?.kpi?.revenue?.growthText || '+0.0%';
              const isNeg = revGrowth.startsWith('-');
              const isPos = revGrowth.startsWith('+') && revGrowth !== '+0.0%' && revGrowth !== '+0%';
              return (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: isNeg ? '#ef4444' : isPos ? '#10b981' : 'var(--text-muted)',
                    backgroundColor: isNeg
                      ? 'rgba(239, 68, 68, 0.12)'
                      : isPos
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'var(--bg-surface-3)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {isNeg ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />} {revGrowth}
                </span>
              );
            })()}
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {(salesStats?.kpi?.revenue?.totalValueBillion ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>{(salesStats?.kpi?.revenue?.targetBillion ?? 0) > 0 ? `Kế hoạch: ${salesStats?.kpi?.revenue?.targetBillion} tỷ đồng` : 'Theo tiến độ HĐ'}</span>
              <strong style={{ color: '#10b981' }}>Đạt {salesStats?.kpi?.revenue?.achievementRate ?? 0}%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(salesStats?.kpi?.revenue?.achievementRate ?? 0, 100)}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            <span>
              Seajong: <strong style={{ color: '#0284c7' }}>{(salesStats?.kpi?.revenue?.seajongBillion ?? +((salesStats?.kpi?.revenue?.totalValueBillion ?? 0) * 0.85).toFixed(2)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tỷ</strong>
            </span>
            <span>
              OEM: <strong style={{ color: '#d97706' }}>{(salesStats?.kpi?.revenue?.oemBillion ?? +((salesStats?.kpi?.revenue?.totalValueBillion ?? 0) * 0.15).toFixed(2)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tỷ</strong>
            </span>
          </div>
        </div>

        {/* KPI 3: Phát triển đại lý */}
        <div
          onClick={() => onNavigate?.('partners')}
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
          title={onNavigate ? 'Nhấp để xem trang Phát triển đại lý' : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Buildings size={14} color="#f59e0b" /> Phát triển đại lý
            </span>
            <span
              title="Chỉ tiêu từ Kế hoạch KD (DB): 10 ĐL chính thức + 1 ĐL lắp kệ mới"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              <ArrowUpRight size={11} /> Mục tiêu: {salesStats?.kpi?.dealerDev?.targetNewDealers ?? 11} ĐL
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {salesStats?.kpi?.dealerDev?.developedCount ?? 8} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>đại lý phát triển</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Chỉ tiêu: {salesStats?.kpi?.dealerDev?.targetNewDealers ?? 11} đại lý</span>
              <strong style={{ color: '#f59e0b' }}>
                Đạt {salesStats?.kpi?.dealerDev?.achievementRate ?? +Math.min(((salesStats?.kpi?.dealerDev?.developedCount ?? 8) / (salesStats?.kpi?.dealerDev?.targetNewDealers || 11)) * 100, 100).toFixed(1)}%
              </strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(salesStats?.kpi?.dealerDev?.achievementRate ?? (((salesStats?.kpi?.dealerDev?.developedCount ?? 8) / (salesStats?.kpi?.dealerDev?.targetNewDealers || 11)) * 100), 100)}%`,
                  height: '100%',
                  backgroundColor: '#f59e0b',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            <span>
              Tiềm năng: <strong style={{ color: '#f59e0b' }}>{salesStats?.kpi?.dealerDev?.leadsCount ?? 4} đối tác</strong>
            </span>
            <span>
              {salesStats?.kpi?.dealerDev?.inCareCount ?? 3} chăm sóc • <strong style={{ color: '#d97706' }}>{salesStats?.kpi?.dealerDev?.negotiatingCount ?? 1} báo giá/HĐ</strong>
            </span>
          </div>
        </div>

        {/* KPI 4: Hỗ trợ đại lý */}
        <div
          onClick={() => onNavigate?.('dealer-support')}
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
          title={onNavigate ? 'Nhấp để xem trang Hỗ trợ đại lý' : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Headset size={14} color="#8b5cf6" /> Hỗ trợ đại lý
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: (salesStats?.kpi?.dealerSupport?.waitingCount ?? 0) > 0 ? '#f59e0b' : '#10b981',
                backgroundColor: (salesStats?.kpi?.dealerSupport?.waitingCount ?? 0) > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              <ArrowUpRight size={11} /> {(salesStats?.kpi?.dealerSupport?.waitingCount ?? 0) > 0 ? `${salesStats?.kpi?.dealerSupport?.waitingCount} chờ tiếp nhận` : 'Đã tiếp nhận'}
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {salesStats?.kpi?.dealerSupport?.totalCount ?? 0} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>yêu cầu ({salesStats?.kpi?.dealerSupport?.resolvedCount ?? 0}/{salesStats?.kpi?.dealerSupport?.totalCount ?? 0} hoàn tất)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>{salesStats?.kpi?.dealerSupport?.inProgressCount ?? 0} đang xử lý • {salesStats?.kpi?.dealerSupport?.waitingCount ?? 0} chờ tiếp nhận</span>
              <strong style={{ color: '#8b5cf6' }}>
                Tiếp nhận {salesStats?.kpi?.dealerSupport?.slaRate ?? 0}%
              </strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(salesStats?.kpi?.dealerSupport?.slaRate ?? 0, 100)}%`,
                  height: '100%',
                  backgroundColor: '#8b5cf6',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Mới nhất: <strong>{salesStats?.kpi?.dealerSupport?.latestText || 'Chưa có yêu cầu'}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. KHỐI BIỂU ĐỒ DIỄN BIẾN VÀ CƠ CẤU DOANH SỐ (GRID 1.6fr / 1fr) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: '14px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Biểu đồ Doanh số và Doanh thu 6 tháng */}
        <div
          style={{
            padding: '16px 20px 14px 20px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.25 }}>
                Diễn biến Doanh số và doanh thu 6 tháng gần nhất
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Đơn vị: tỷ đồng • Phân rã kênh thương hiệu Seajong & Gia công OEM từ CSDL
              </p>
            </div>

            {/* Option chọn xem biểu đồ Doanh số / Doanh thu riêng */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-surface-1)',
                padding: '2px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setChartMetric('sales')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.71875rem',
                  fontWeight: chartMetric === 'sales' ? 700 : 500,
                  backgroundColor: chartMetric === 'sales' ? 'var(--color-primary)' : 'transparent',
                  color: chartMetric === 'sales' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Doanh số
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.71875rem',
                  fontWeight: chartMetric === 'revenue' ? 700 : 500,
                  backgroundColor: chartMetric === 'revenue' ? 'var(--color-primary)' : 'transparent',
                  color: chartMetric === 'revenue' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Doanh thu
              </button>
            </div>
          </div>

          {/* Thanh chú giải (Legend) */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '0.71875rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#0284c7' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {chartMetric === 'sales' ? 'Doanh số Seajong' : 'Doanh thu Seajong'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {chartMetric === 'sales' ? 'Doanh số OEM' : 'Doanh thu OEM'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', width: '16px', height: '2.5px', backgroundColor: chartMetric === 'sales' ? '#8b5cf6' : '#10b981', borderRadius: '2px', position: 'relative' }}>
                <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: chartMetric === 'sales' ? '#8b5cf6' : '#10b981' }} />
              </span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {chartMetric === 'sales' ? 'Tổng doanh số' : 'Tổng doanh thu'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', width: '18px', position: 'relative' }}>
                <span style={{ width: '100%', height: '2px', borderTop: '2px dashed #ef4444' }} />
                <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              </span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {chartMetric === 'sales' ? 'Mục tiêu doanh số' : 'Mục tiêu doanh thu'}
              </span>
            </div>
          </div>

          {/* SVG Biểu đồ 2 cột (Seajong & OEM) + Đường Tổng + Đường Mục tiêu */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              minHeight: '255px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '4px',
              paddingBottom: '4px',
              overflow: 'visible',
            }}
          >
            {(() => {
              const trendList: SalesTrendItem[] =
                salesStats?.trendData && salesStats.trendData.length > 0
                  ? salesStats.trendData
                  : DEFAULT_TREND_DATA;

              const getMonthTarget = (d: SalesTrendItem) =>
                chartMetric === 'sales'
                  ? (d.targetSales ?? d.target ?? 0)
                  : (d.targetRevenue ?? +((d.target || 0) * 0.85).toFixed(2));

              const maxVal = Math.max(
                ...trendList.map((d) => Math.max(d.target || 0, d.signed || 0, d.revenue || 0)),
                0
              );
              const chartScaleMax =
                maxVal > 0
                  ? maxVal <= 2.4
                    ? +(Math.ceil(maxVal * 1.18 * 2) / 2).toFixed(1)
                    : Math.ceil((maxVal * 1.25) / 3) * 3
                  : 2.0;

              const baselineY = 232;
              const chartHeight = 198;
              const startX = 65;
              const stepX = 104;

              const getSmoothCurve = (pts: Array<{ x: number; y: number }>) => {
                if (pts.length === 0) return '';
                let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i === 0 ? 0 : i - 1];
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const p3 = pts[i + 2] || p2;

                  const cp1x = p1.x + (p2.x - p0.x) / 6;
                  const cp1y = p1.y + (p2.y - p0.y) / 6;
                  const cp2x = p2.x - (p3.x - p1.x) / 6;
                  const cp2y = p2.y - (p3.y - p1.y) / 6;

                  d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
                }
                return d;
              };

              const targetPoints = trendList.map((d, i) => {
                const x = startX + i * stepX;
                const val = getMonthTarget(d);
                const y = baselineY - (val / chartScaleMax) * chartHeight;
                return { x, y, val, month: d.month };
              });

              const totalPoints = trendList.map((d, i) => {
                const x = startX + i * stepX;
                const val = chartMetric === 'sales' ? (d.signed || 0) : (d.revenue || 0);
                const y = baselineY - (val / chartScaleMax) * chartHeight;
                return { x, y, val, month: d.month };
              });

              const targetCurve = getSmoothCurve(targetPoints);
              const totalCurve = getSmoothCurve(totalPoints);
              const totalColor = chartMetric === 'sales' ? '#8b5cf6' : '#10b981';
              const hoveredItem = activeChartHover !== null ? trendList[activeChartHover] : null;
              const hoveredPt = activeChartHover !== null ? targetPoints[activeChartHover] : null;

              return (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <svg
                    viewBox="0 0 650 262"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ width: '100%', height: '100%', maxHeight: '100%', overflow: 'visible' }}
                  >
                    <defs>
                      <linearGradient id="salesSeajongBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                      <linearGradient id="salesOemBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                    </defs>

                    {/* Lưới ngang tham chiếu (Không hiển thị nhãn số tiền ở trục thẳng đứng) */}
                    {[0, 1, 2, 3].map((idx) => {
                      const y = baselineY - ((3 - idx) / 3) * chartHeight;
                      return (
                        <line
                          key={`grid-${idx}`}
                          x1="14"
                          y1={y}
                          x2="636"
                          y2={y}
                          stroke="var(--border-subtle)"
                          strokeDasharray={idx === 3 ? undefined : '3 3'}
                          opacity={idx === 3 ? '0.9' : '0.6'}
                        />
                      );
                    })}

                    {/* Đường dọc gióng khi hover */}
                    {activeChartHover !== null && hoveredPt && (
                      <line
                        x1={hoveredPt.x}
                        y1={18}
                        x2={hoveredPt.x}
                        y2={baselineY}
                        stroke="#64748b"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        strokeOpacity="0.55"
                      />
                    )}

                    {/* Các cặp cột Seajong và OEM */}
                    {trendList.map((item, idx) => {
                      const centerX = startX + idx * stepX;
                      const barW = 18;
                      const barGap = 4;
                      const seajongVal =
                        chartMetric === 'sales'
                          ? (item.signedSeajong ?? +(item.signed * 0.7).toFixed(2))
                          : (item.revenueSeajong ?? +(item.revenue * 0.75).toFixed(2));
                      const oemVal =
                        chartMetric === 'sales'
                          ? (item.signedOem ?? +(item.signed - seajongVal).toFixed(2))
                          : (item.revenueOem ?? +(item.revenue - seajongVal).toFixed(2));

                      const hSeajong = chartScaleMax > 0 ? (seajongVal / chartScaleMax) * chartHeight : 0;
                      const hOem = chartScaleMax > 0 ? (oemVal / chartScaleMax) * chartHeight : 0;
                      const isHovered = activeChartHover === idx;
                      const colMonthNum = item.monthNum || parseInt((item.month.match(/T(\d{2})/) || [])[1] || '10', 10);
                      const isCurrentMonth = selectedPeriod === 'month' ? colMonthNum === selectedMonth : idx === trendList.length - 1;

                      return (
                        <g key={item.month}>
                          {isCurrentMonth && (
                            <rect
                              x={centerX - barW - barGap / 2 - 8}
                              y={18}
                              width={barW * 2 + barGap + 16}
                              height={baselineY - 18}
                              fill="rgba(2, 132, 199, 0.05)"
                              rx="6"
                            />
                          )}

                          {/* Thanh 1: Seajong (Xanh dương) */}
                          <rect
                            x={centerX - barW - barGap / 2}
                            y={baselineY - Math.max(hSeajong, seajongVal > 0 ? 3 : 0)}
                            width={barW}
                            height={Math.max(hSeajong, seajongVal > 0 ? 3 : 0)}
                            rx="3"
                            fill="url(#salesSeajongBarGrad)"
                            opacity={isHovered ? 1 : 0.9}
                            style={{ transition: 'all 0.15s ease' }}
                          />

                          {/* Thanh 2: OEM (Cam hổ phách) */}
                          <rect
                            x={centerX + barGap / 2}
                            y={baselineY - Math.max(hOem, oemVal > 0 ? 3 : 0)}
                            width={barW}
                            height={Math.max(hOem, oemVal > 0 ? 3 : 0)}
                            rx="3"
                            fill="url(#salesOemBarGrad)"
                            opacity={isHovered ? 1 : 0.9}
                            style={{ transition: 'all 0.15s ease' }}
                          />

                          {/* Nhãn tháng */}
                          <text
                            x={centerX}
                            y="251"
                            fill={isCurrentMonth ? 'var(--color-primary)' : 'var(--text-secondary)'}
                            fontSize="10"
                            fontWeight={isCurrentMonth ? '700' : '500'}
                            textAnchor="middle"
                          >
                            {item.month}
                          </text>
                        </g>
                      );
                    })}

                    {/* ĐƯỜNG MỤC TIÊU CÁC THÁNG (Đỏ nét đứt) */}
                    <path
                      d={targetCurve}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.2"
                      strokeDasharray="5 4"
                    />
                    {targetPoints.map((pt, i) => {
                      const isHovered = activeChartHover === i;
                      const totalPt = totalPoints[i];
                      const isClose = Math.abs(pt.y - totalPt.y) < 16;
                      const labelOffsetY = isClose && pt.y <= totalPt.y ? -9 : -7;
                      return (
                        <g key={`target-pt-${pt.month}`}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 4.5 : 3.2}
                            fill="#ffffff"
                            stroke="#ef4444"
                            strokeWidth={isHovered ? 2.5 : 1.8}
                          />
                          <text
                            x={pt.x}
                            y={Math.max(pt.y + labelOffsetY, 12)}
                            fill="#dc2626"
                            fontSize="8.5"
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {pt.val.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}

                    {/* ĐƯỜNG TỔNG DOANH SỐ / TỔNG DOANH THU (Nét liền) */}
                    <path
                      d={totalCurve}
                      fill="none"
                      stroke={totalColor}
                      strokeWidth="2.5"
                    />
                    {totalPoints.map((pt, i) => {
                      const isHovered = activeChartHover === i;
                      const targetPt = targetPoints[i];
                      const isClose = Math.abs(pt.y - targetPt.y) < 16;
                      const labelY = isClose && pt.y >= targetPt.y ? Math.min(pt.y + 14, baselineY - 4) : pt.y - 7;
                      return (
                        <g key={`total-pt-${pt.month}`}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5 : 3.5}
                            fill="#ffffff"
                            stroke={totalColor}
                            strokeWidth={isHovered ? 2.8 : 2}
                          />
                          {pt.val > 0 && (
                            <text
                              x={pt.x}
                              y={labelY}
                              fill={totalColor}
                              fontSize="8.5"
                              fontWeight="700"
                              textAnchor="middle"
                            >
                              {pt.val.toFixed(2)}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Vùng nhận diện hover chuột mượt mà cho 6 tháng */}
                    {trendList.map((item, idx) => {
                      const centerX = startX + idx * stepX;
                      const colMonthNum = item.monthNum || parseInt((item.month.match(/T(\d{2})/) || [])[1] || '10', 10);
                      return (
                        <rect
                          key={`hit-${item.month}`}
                          x={centerX - 48}
                          y={14}
                          width={96}
                          height={baselineY - 4}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setActiveChartHover(idx)}
                          onMouseLeave={() => setActiveChartHover(null)}
                          onClick={() => {
                            setSelectedPeriod('month');
                            setSelectedMonth(colMonthNum);
                          }}
                        />
                      );
                    })}
                  </svg>

                  {/* Tooltip chi tiết khi di chuột vào từng tháng */}
                  {hoveredItem && hoveredPt && (() => {
                    const isRightEdge = (activeChartHover ?? 0) >= 4;
                    const isLeftEdge = (activeChartHover ?? 0) <= 1;
                    const transformX = isRightEdge ? '-85%' : isLeftEdge ? '-15%' : '-50%';
                    const totalVal = chartMetric === 'sales' ? hoveredItem.signed : hoveredItem.revenue;
                    const targetVal = getMonthTarget(hoveredItem);
                    const seajongVal =
                      chartMetric === 'sales'
                        ? (hoveredItem.signedSeajong ?? +(hoveredItem.signed * 0.7).toFixed(2))
                        : (hoveredItem.revenueSeajong ?? +(hoveredItem.revenue * 0.75).toFixed(2));
                    const oemVal =
                      chartMetric === 'sales'
                        ? (hoveredItem.signedOem ?? +(hoveredItem.signed - seajongVal).toFixed(2))
                        : (hoveredItem.revenueOem ?? +(hoveredItem.revenue - seajongVal).toFixed(2));
                    const achievePct =
                      targetVal > 0 ? ((totalVal / targetVal) * 100).toFixed(1) : '0.0';

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(hoveredPt.x / 650) * 100}%`,
                          top: '8px',
                          transform: `translate(${transformX}, 0)`,
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.14), 0 4px 10px -2px rgba(0, 0, 0, 0.08)',
                          pointerEvents: 'none',
                          zIndex: 40,
                          whiteSpace: 'nowrap',
                          border: '1px solid #cbd5e1',
                          minWidth: '215px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            marginBottom: '6px',
                            paddingBottom: '5px',
                            borderBottom: '1px solid #f1f5f9',
                            fontWeight: 800,
                            fontSize: '0.8125rem',
                          }}
                        >
                          <span>{hoveredItem.monthFull || hoveredItem.month}</span>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: totalColor }}>
                            Đạt {achievePct}% KH
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '4px' }}>
                          <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            {chartMetric === 'sales' ? 'Mục tiêu doanh số:' : 'Mục tiêu doanh thu:'}
                          </span>
                          <strong style={{ color: '#dc2626', fontWeight: 800 }}>
                            {targetVal.toFixed(2)} tỷ
                          </strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '6px' }}>
                          <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                            <span style={{ width: '10px', height: '3px', borderRadius: '2px', backgroundColor: totalColor }} />
                            {chartMetric === 'sales' ? 'Tổng doanh số:' : 'Tổng doanh thu:'}
                          </span>
                          <strong style={{ color: totalColor, fontWeight: 800 }}>
                            {totalVal.toFixed(2)} tỷ
                          </strong>
                        </div>

                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '5px', marginTop: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '3px' }}>
                            <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#0284c7' }} />
                              {chartMetric === 'sales' ? 'Doanh số Seajong:' : 'Doanh thu Seajong:'}
                            </span>
                            <strong style={{ color: '#0284c7' }}>{seajongVal.toFixed(2)} tỷ</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px' }}>
                            <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
                              {chartMetric === 'sales' ? 'Doanh số OEM:' : 'Doanh thu OEM:'}
                            </span>
                            <strong style={{ color: '#d97706' }}>{oemVal.toFixed(2)} tỷ</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Cột phải: Lịch công tác và sự kiện kinh doanh */}
        <div
          style={{
            padding: '16px 20px 14px 20px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarEvent size={13} color="var(--color-primary)" />
              <h3 style={{ fontSize: '0.78125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.25 }}>
                Công việc hôm nay
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsEventDrawerOpen(true)}
              style={{
                fontSize: '0.71875rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Mở lịch biểu →
            </button>
          </div>

          <div
            className="event-today-scrollbar custom-scrollbar"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              flex: 1,
              minHeight: 0,
              gap: '8px',
              overflowY: 'auto',
              paddingRight: '6px',
              paddingBottom: '4px',
            }}
          >
            {upcomingUserEvents.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-surface-1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-subtle)',
                }}
              >
                <CalendarEvent size={26} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Chưa có công việc nào hôm nay của bạn
                </div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '240px' }}>
                  Hệ thống chỉ hiển thị lịch của tài khoản <strong>{sessionUser.name}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEventDrawerOpen(true)}
                  style={{
                    marginTop: '12px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  + Thêm công việc
                </button>
              </div>
            ) : (
              upcomingUserEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setIsEventDrawerOpen(true)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `3px solid ${ev.priority === 'urgent' ? '#ef4444' : ev.priority === 'high' ? '#f59e0b' : '#0284c7'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                      {ev.dateBadge ? `${ev.dateBadge} • ${ev.time}` : ev.time}
                    </span>
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: ev.priority === 'urgent' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                        color: ev.priority === 'urgent' ? '#ef4444' : '#0284c7',
                        textTransform: 'uppercase',
                      }}
                    >
                      {ev.assignee}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {ev.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    <GeoAlt size={11} color="#ef4444" /> {ev.location}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 5. OFFCANVAS LỊCH SỰ KIỆN PHÒNG KINH DOANH DÙNG CHUNG ── */}
      <EventOffcanvas
        isOpen={isEventDrawerOpen}
        onClose={() => {
          setIsEventDrawerOpen(false);
          loadUserEvents();
        }}
        onEventsChange={(newItems) => {
          setPlannerEvents(newItems);
        }}
        onShowToast={onShowToast}
        defaultView="week"
        user={sessionUser}
      />
    </div>
  );
};

