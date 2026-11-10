import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import type { ModernStepItem } from '../../types';
import {
  PieChartFill,
  GraphUpArrow,
} from 'react-bootstrap-icons';

interface MonthlyChartItem {
  month: string;
  monthNum: number;
  quarter: string;
  monthFull: string;
  plan: number;
  actual: number | null;
  planSales: number;
  actualSales: number | null;
  planRevenue: number;
  actualRevenue: number | null;
  seajong: number | null;
  oem: number | null;
  signedSeajong: number | null;
  signedOem: number | null;
  targetSalesVnd: number;
  targetRevenueVnd: number;
  signedVnd: number;
  signedSeajongVnd: number;
  signedOemVnd: number;
  revenueVnd: number;
  revenueSeajongVnd: number;
  revenueOemVnd: number;
  ordersCount: number;
  isCurrent?: boolean;
}

interface ProductLineMixItem {
  id: string;
  name: string;
  share: number;
  revenueVnd: number;
  revenue: string;
  unitsCount: number;
  units: string;
  ordersCount: number;
  color: string;
}

interface DealerRankItem {
  id?: string;
  rank: number;
  name: string;
  code: string;
  area?: string;
  orders: number;
  sales: number;
  revenue: number;
  debt: number;
  paymentRate: number;
  growth: string;
  status: string;
}

const DEFAULT_PRODUCT_LINES: ProductLineMixItem[] = [
  {
    id: 'tbvs',
    name: 'Thiết bị vệ sinh',
    share: 77.8,
    revenueVnd: 2533931180,
    revenue: '2.53 tỷ',
    unitsCount: 4165,
    units: '4.165 SP',
    ordersCount: 198,
    color: '#0284c7',
  },
  {
    id: 'tbnb',
    name: 'Thiết bị nhà bếp',
    share: 13.6,
    revenueVnd: 442730708,
    revenue: '442.7 tr',
    unitsCount: 2011,
    units: '2.011 SP',
    ordersCount: 94,
    color: '#10b981',
  },
  {
    id: 'phukien',
    name: 'Phụ kiện',
    share: 7.6,
    revenueVnd: 249320000,
    revenue: '249.3 tr',
    unitsCount: 3789,
    units: '3.789 SP',
    ordersCount: 82,
    color: '#8b5cf6',
  },
  {
    id: 'khac',
    name: 'Loại khác',
    share: 1.0,
    revenueVnd: 31685000,
    revenue: '31.7 tr',
    unitsCount: 424,
    units: '424 SP',
    ordersCount: 19,
    color: '#f59e0b',
  },
];

export const SalesBusinessResultsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'sales'>('revenue');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Bộ lọc Bước 2 (Nguồn vào - Bảng chi tiết doanh thu & doanh số các tháng)
  const [monthSearch, setMonthSearch] = useState('');
  const [quarterFilter, setQuarterFilter] = useState('all');

  // Bộ lọc Bước 3 (Đại lý - Bảng xếp hạng các đại lý theo doanh thu và doanh số)
  const [dealerSortBy, setDealerSortBy] = useState<'revenue' | 'sales'>('revenue');
  const [dealerStatusFilter, setDealerStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dealersPage, setDealersPage] = useState(1);
  const [dealersPageSize, setDealersPageSize] = useState(10);

  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobileViewport(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [summary, setSummary] = useState({
    totalSales: 4202833228,
    totalRevenue: 2928928432,
    targetSales: 5000000000,
    targetRevenue: 4250000000,
    totalOrdersCount: 255,
    totalDebt: 1273904796,
    dealersCount: 98,
  });

  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartItem[]>([]);
  const [productLineMix, setProductLineMix] = useState<ProductLineMixItem[]>(DEFAULT_PRODUCT_LINES);
  const [topDealers, setTopDealers] = useState<DealerRankItem[]>([]);

  const loadBusinessResults = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, bomRes] = await Promise.all([
        fetch('/api/sales/dashboard'),
        fetch('/api/bom/overview-stats?period=year&year=2026'),
      ]);

      const dashData = dashRes.ok ? await dashRes.json() : null;
      const bomData = bomRes.ok ? await bomRes.json() : null;

      if (dashData?.summary) {
        setSummary({
          totalSales: Number(dashData.summary.totalSales) || 0,
          totalRevenue: Number(dashData.summary.totalRevenue) || 0,
          targetSales: Number(dashData.summary.targetSales) || 5000000000,
          targetRevenue: Number(dashData.summary.targetRevenue) || 4250000000,
          totalOrdersCount: Number(dashData.summary.totalOrdersCount) || 0,
          totalDebt: Number(dashData.summary.totalDebt) || 0,
          dealersCount: Number(dashData.summary.dealersCount) || 0,
        });
      }

      if (Array.isArray(dashData?.monthlyChartData) && dashData.monthlyChartData.length > 0) {
        setMonthlyChartData(dashData.monthlyChartData);
      } else if (Array.isArray(bomData?.monthlyChartData) && bomData.monthlyChartData.length > 0) {
        const quarters = ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q3', 'Q3', 'Q3', 'Q4', 'Q4', 'Q4'];
        setMonthlyChartData(
          bomData.monthlyChartData.map((m: any, idx: number) => ({
            ...m,
            monthNum: idx + 1,
            quarter: quarters[idx],
            targetSalesVnd: Math.round((Number(m.planSales || m.plan) || 0) * 1e9),
            targetRevenueVnd: Math.round((Number(m.planRevenue || m.plan) || 0) * 1e9),
            signedVnd: Math.round((Number(m.actualSales) || 0) * 1e9),
            signedSeajongVnd: Math.round((Number(m.signedSeajong) || 0) * 1e9),
            signedOemVnd: Math.round((Number(m.signedOem) || 0) * 1e9),
            revenueVnd: Math.round((Number(m.actualRevenue ?? m.actual) || 0) * 1e9),
            revenueSeajongVnd: Math.round((Number(m.seajong) || 0) * 1e9),
            revenueOemVnd: Math.round((Number(m.oem) || 0) * 1e9),
            ordersCount: Number(m.ordersCount) || 0,
          }))
        );
      }

      if (Array.isArray(dashData?.productLineMix) && dashData.productLineMix.length > 0) {
        setProductLineMix(dashData.productLineMix);
      }

      if (Array.isArray(dashData?.topDealers) && dashData.topDealers.length > 0) {
        setTopDealers(
          dashData.topDealers.map((d: any, idx: number) => {
            const sales = Number(d.sales ?? d.revenue) || 0;
            const revenue = Number(d.revenue) || 0;
            const debt = Number(d.debt ?? Math.max(0, sales - revenue)) || 0;
            const paymentRate =
              sales > 0 ? Math.min(100, Math.round((revenue / sales) * 100)) : 0;
            return {
              id: d.id || `dealer-${idx}`,
              rank: idx + 1,
              name: d.name || 'Đại lý Seajong',
              code: d.code || `KH-${idx + 1}`,
              area: d.area || 'Toàn quốc',
              orders: Number(d.orders) || 1,
              sales,
              revenue,
              debt,
              paymentRate,
              growth: d.growth || `${d.orders || 1} đơn hàng`,
              status:
                sales >= 200000000 ? 'Xuất sắc' : sales >= 100000000 ? 'Tiêu biểu' : 'Đạt chuẩn',
            };
          })
        );
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu kết quả kinh doanh:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusinessResults();
  }, [loadBusinessResults]);

  const formatVND = (num: number) => (Number(num) || 0).toLocaleString('vi-VN') + ' đ';
  const formatCompactVND = (num: number) => {
    const v = Number(num) || 0;
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} tỷ`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)} tr`;
    if (v > 0) return v.toLocaleString('vi-VN') + ' đ';
    return '0 đ';
  };

  // Danh sách 3 bước của StepPage: Tổng quan, Nguồn vào, Đại lý
  const resultSteps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'overview',
        title: 'Tổng quan',
        desc: 'Biểu đồ doanh thu, doanh số & cơ cấu SP',
        icon: 'bi-graph-up-arrow',
      },
      {
        num: 2,
        id: 'inflow-monthly',
        title: 'Nguồn vào',
        desc: 'Chi tiết doanh thu các tháng trong năm',
        icon: 'bi-calendar3',
        badge: '12 tháng',
        badgeVariant: 'brand',
      },
      {
        num: 3,
        id: 'dealer-ranking',
        title: 'Đại lý',
        desc: 'Xếp hạng đại lý theo doanh thu & doanh số',
        icon: 'bi-building',
        badge: topDealers.length > 0 ? `${topDealers.length}` : undefined,
        badgeVariant: 'success',
      },
    ],
    [topDealers.length]
  );

  // Lọc dữ liệu các tháng cho Bước 2 (Nguồn vào) - Sắp xếp từ Tháng 12 xuống Tháng 01
  const filteredMonthlyRows = useMemo(() => {
    return [...monthlyChartData]
      .filter((m) => {
        if (quarterFilter !== 'all' && m.quarter !== quarterFilter) return false;
        if (monthSearch.trim()) {
          const q = monthSearch.trim().toLowerCase();
          const label = `tháng ${String(m.monthNum).padStart(2, '0')}/2026 tháng ${m.monthNum} ${m.quarter.toLowerCase()}`;
          if (!label.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.monthNum - a.monthNum);
  }, [monthlyChartData, quarterFilter, monthSearch]);

  // Tổng hợp các cột cho dòng Footer của Bảng chi tiết các tháng (Bước 2)
  const yearlyTotals = useMemo(() => {
    return filteredMonthlyRows.reduce(
      (acc, m) => {
        acc.targetSalesVnd += m.targetSalesVnd || 0;
        acc.targetRevenueVnd += m.targetRevenueVnd || 0;
        acc.signedSeajongVnd += m.signedSeajongVnd || 0;
        acc.signedOemVnd += m.signedOemVnd || 0;
        acc.signedVnd += m.signedVnd || 0;
        acc.revenueSeajongVnd += m.revenueSeajongVnd || 0;
        acc.revenueOemVnd += m.revenueOemVnd || 0;
        acc.revenueVnd += m.revenueVnd || 0;
        acc.ordersCount += m.ordersCount || 0;
        return acc;
      },
      {
        targetSalesVnd: 0,
        targetRevenueVnd: 0,
        signedSeajongVnd: 0,
        signedOemVnd: 0,
        signedVnd: 0,
        revenueSeajongVnd: 0,
        revenueOemVnd: 0,
        revenueVnd: 0,
        ordersCount: 0,
      }
    );
  }, [filteredMonthlyRows]);

  // Sắp xếp và lọc bảng xếp hạng đại lý cho Bước 3 (Đại lý)
  const rankedAndFilteredDealers = useMemo(() => {
    const sorted = [...topDealers]
      .sort((a, b) => {
        if (dealerSortBy === 'revenue') {
          return b.revenue - a.revenue || b.sales - a.sales;
        }
        return b.sales - a.sales || b.revenue - a.revenue;
      })
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

    return sorted.filter((d) => {
      if (dealerStatusFilter !== 'all' && d.status !== dealerStatusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          String(d.area || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [topDealers, dealerSortBy, dealerStatusFilter, searchTerm]);

  const totalProductMixVnd = useMemo(
    () => productLineMix.reduce((s, item) => s + (item.revenueVnd || 0), 0),
    [productLineMix]
  );
  const totalProductMixUnits = useMemo(
    () => productLineMix.reduce((s, item) => s + (item.unitsCount || 0), 0),
    [productLineMix]
  );

  const topDealerByRevenue = useMemo(() => {
    if (topDealers.length === 0) return null;
    return [...topDealers].sort((a, b) => b.revenue - a.revenue)[0];
  }, [topDealers]);

  const tickerNews = [
    {
      badge: 'DOANH SỐ LŨY KẾ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Doanh số lũy kế năm 2026: <b>${formatVND(summary.totalSales)}</b> (${summary.totalOrdersCount} đơn hàng)`,
    },
    {
      badge: 'DOANH THU THỰC THU',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: `Doanh thu thực thu đạt <b>${formatVND(summary.totalRevenue)}</b> (${summary.totalSales > 0 ? Math.round((summary.totalRevenue / summary.totalSales) * 100) : 0}% doanh số)`,
    },
    {
      badge: 'ĐẠI LÝ DẪN ĐẦU',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: topDealerByRevenue
        ? `Top 1 Đại lý dẫn đầu doanh thu: <b>${topDealerByRevenue.name}</b> (${formatVND(topDealerByRevenue.revenue)})`
        : 'Đang đồng bộ bảng xếp hạng đại lý toàn quốc',
    },
  ];

  // Chuẩn bị cung tròn SVG Donut cho Biểu đồ cơ cấu dòng sản phẩm
  const donutSegments = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;
    return productLineMix.map((seg) => {
      const pct = Math.max(0, Number(seg.share) || 0);
      const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += pct;
      return {
        ...seg,
        radius,
        circumference,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [productLineMix]);

  const activeDonutItem = useMemo(
    () => productLineMix.find((p) => p.id === hoveredSegment) || null,
    [productLineMix, hoveredSegment]
  );

  return (
    <div className="sales-results-page h-full w-full flex flex-col min-h-0">
      <StepPage
        title="Kết quả kinh doanh theo thời gian thực"
        badge="RESULTS"
        description="Tổng hợp doanh thu, tỷ lệ hoàn thành KPI và xếp hạng thành tích mạng lưới phân phối Seajong"
        icon="bi-graph-up-arrow"
        color="blue"
        steps={resultSteps}
        currentStep={currentStep}
        onStepChange={(stepNum) => setCurrentStep(stepNum)}
        customTickerNews={tickerNews}
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            BƯỚC 1: TỔNG QUAN (2 Biểu đồ Doanh thu/Doanh số Seajong-OEM & Cơ cấu SP)
           ═══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 custom-scrollbar bg-slate-50/40 flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch flex-1 min-h-0">
              {/* BIỂU ĐỒ 1: Diễn biến Doanh thu & Doanh số theo kênh (Seajong & OEM + Đường mục tiêu + Đường tổng thực tế) */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col justify-between min-h-[340px]">
                <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <GraphUpArrow className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>
                        Diễn biến {chartMetric === 'revenue' ? 'doanh thu' : 'doanh số'} theo kênh năm 2026
                      </span>
                    </h3>
                    <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                      Phân tách Thương hiệu Seajong & Gia công OEM, đối chiếu Đường mục tiêu và Đường tổng thực tế
                    </p>
                  </div>

                  {/* Toggle Doanh thu / Doanh số giống trang Ban Giám Đốc */}
                  <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setChartMetric('revenue')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        chartMetric === 'revenue'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Doanh thu
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('sales')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        chartMetric === 'sales'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Doanh số
                    </button>
                  </div>
                </div>

                {/* Khu vực SVG Biểu đồ cột đôi (Seajong & OEM) + Đường Mục tiêu + Đường Tổng thực tế */}
                <div className="relative w-full flex-1 flex flex-col justify-center min-h-[230px]">
                  {(() => {
                    const fallbackMonths: MonthlyChartItem[] =
                      monthlyChartData.length > 0
                        ? monthlyChartData
                        : Array.from({ length: 12 }, (_, idx) => ({
                            month: `T${idx + 1}`,
                            monthNum: idx + 1,
                            quarter: ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q3', 'Q3', 'Q3', 'Q4', 'Q4', 'Q4'][idx],
                            monthFull: `Tháng ${String(idx + 1).padStart(2, '0')}/2026`,
                            plan: 0.42,
                            actual: 0,
                            planSales: 0.42,
                            actualSales: 0,
                            planRevenue: 0.35,
                            actualRevenue: 0,
                            seajong: 0,
                            oem: 0,
                            signedSeajong: 0,
                            signedOem: 0,
                            targetSalesVnd: 420000000,
                            targetRevenueVnd: 350000000,
                            signedVnd: 0,
                            signedSeajongVnd: 0,
                            signedOemVnd: 0,
                            revenueVnd: 0,
                            revenueSeajongVnd: 0,
                            revenueOemVnd: 0,
                            ordersCount: 0,
                            isCurrent: idx + 1 === new Date().getMonth() + 1,
                          }));

                    const allWithIdx = fallbackMonths.map((item, originalIdx) => ({
                      ...item,
                      originalIdx,
                    }));
                    const currentIdx = allWithIdx.findIndex((m) => m.isCurrent);
                    const mobileEndSlice = currentIdx >= 5 ? currentIdx + 1 : 6;
                    const displayedChartData = isMobileViewport
                      ? allWithIdx.slice(Math.max(0, mobileEndSlice - 6), mobileEndSlice)
                      : allWithIdx;

                    const svgWidth = isMobileViewport ? 360 : 680;
                    const svgHeight = isMobileViewport ? 220 : 250;
                    const maxVal = isMobileViewport ? 2.08 : 2.2;
                    const chartHeight = isMobileViewport ? 175 : 176;
                    const baselineY = isMobileViewport ? 192 : 214;
                    const startX = isMobileViewport ? 22 : 42;
                    const endX = isMobileViewport ? 338 : 650;
                    const stepX =
                      (endX - startX) / Math.max(1, displayedChartData.length - 1);
                    const barWidth = isMobileViewport ? 14 : 10;
                    const barGap = isMobileViewport ? 4 : 3;

                    const planPoints = displayedChartData.map((item, idx) => {
                      const val =
                        chartMetric === 'revenue'
                          ? (item.planRevenue ?? item.plan)
                          : (item.planSales ?? item.plan);
                      const x = startX + idx * stepX;
                      const y = baselineY - (Math.min(val, maxVal) / maxVal) * chartHeight;
                      return { x, y, val, month: item.month, raw: item };
                    });

                    const getSmoothCurve = (pts: Array<{ x: number; y: number }>) => {
                      if (pts.length === 0) return '';
                      let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                      for (let i = 0; i < pts.length - 1; i++) {
                        const p0 = pts[i === 0 ? 0 : i - 1];
                        const p1 = pts[i];
                        const p2 = pts[i + 1];
                        const p3 = pts[i + 2] || p2;

                        const cp1x = p1.x + (p2.x - p0.x) / 6;
                        const cp1y = Math.min(baselineY, Math.max(12, p1.y + (p2.y - p0.y) / 6));
                        const cp2x = p2.x - (p3.x - p1.x) / 6;
                        const cp2y = Math.min(baselineY, Math.max(12, p2.y - (p3.y - p1.y) / 6));

                        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
                      }
                      return d;
                    };

                    const planCurve = getSmoothCurve(planPoints);

                    const revenuePoints: Array<{
                      x: number;
                      y: number;
                      val: number;
                      month: string;
                      idx: number;
                    }> = [];
                    const salesPoints: Array<{
                      x: number;
                      y: number;
                      val: number;
                      month: string;
                      idx: number;
                    }> = [];

                    displayedChartData.forEach((item, idx) => {
                      const x = startX + idx * stepX;
                      const revVal =
                        item.actualRevenue !== null && item.actualRevenue !== undefined
                          ? item.actualRevenue
                          : item.actual;
                      if (revVal !== null && revVal !== undefined) {
                        const y =
                          baselineY - (Math.min(revVal, maxVal) / maxVal) * chartHeight;
                        revenuePoints.push({ x, y, val: revVal, month: item.month, idx });
                      }

                      const salesVal =
                        item.actualSales !== null && item.actualSales !== undefined
                          ? item.actualSales
                          : item.actual;
                      if (salesVal !== null && salesVal !== undefined) {
                        const y =
                          baselineY - (Math.min(salesVal, maxVal) / maxVal) * chartHeight;
                        salesPoints.push({ x, y, val: salesVal, month: item.month, idx });
                      }
                    });

                    const revenueCurve = getSmoothCurve(revenuePoints);
                    const salesCurve = getSmoothCurve(salesPoints);
                    const revenueAreaPath =
                      revenuePoints.length > 0
                        ? `${revenueCurve} L ${revenuePoints[revenuePoints.length - 1].x.toFixed(1)},${baselineY} L ${revenuePoints[0].x.toFixed(1)},${baselineY} Z`
                        : '';
                    const salesAreaPath =
                      salesPoints.length > 0
                        ? `${salesCurve} L ${salesPoints[salesPoints.length - 1].x.toFixed(1)},${baselineY} L ${salesPoints[0].x.toFixed(1)},${baselineY} Z`
                        : '';

                    const hoveredItem =
                      hoveredMonth !== null ? displayedChartData[hoveredMonth] : null;
                    const hoveredPlanPt =
                      hoveredMonth !== null ? planPoints[hoveredMonth] : null;

                    const gridLevels = [
                      { label: '2.0 tỷ', val: 2.0 },
                      { label: '1.5 tỷ', val: 1.5 },
                      { label: '1.0 tỷ', val: 1.0 },
                      { label: '0.5 tỷ', val: 0.5 },
                    ];

                    return (
                      <div className="relative w-full flex-1 flex items-center">
                        <svg
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          preserveAspectRatio="xMidYMid meet"
                          className="w-full h-auto block overflow-visible"
                        >
                          <defs>
                            <linearGradient id="salesResSeajongGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0284c7" />
                              <stop offset="100%" stopColor="#38bdf8" />
                            </linearGradient>
                            <linearGradient id="salesResOemGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#fbbf24" />
                            </linearGradient>
                            <linearGradient id="salesResRevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                              <stop offset="65%" stopColor="#10b981" stopOpacity="0.10" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                            </linearGradient>
                            <linearGradient id="salesResSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                              <stop offset="65%" stopColor="#8b5cf6" stopOpacity="0.10" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
                            </linearGradient>
                            <filter id="salesResBarShadow" x="-10%" y="-10%" width="120%" height="130%">
                              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.12" />
                            </filter>
                            <filter id="salesResRedShadow" x="-10%" y="-10%" width="120%" height="130%">
                              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.25" />
                            </filter>
                            <filter id="salesResRevShadow" x="-10%" y="-10%" width="120%" height="130%">
                              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10b981" floodOpacity="0.3" />
                            </filter>
                            <filter id="salesResSalesShadow" x="-10%" y="-10%" width="120%" height="130%">
                              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#8b5cf6" floodOpacity="0.3" />
                            </filter>
                          </defs>

                          {/* Lưới ngang */}
                          {gridLevels.map((grid, gIdx) => {
                            const y = baselineY - (grid.val / maxVal) * chartHeight;
                            return (
                              <g key={`grid-${gIdx}`}>
                                <line
                                  x1={isMobileViewport ? 4 : startX - 10}
                                  y1={y}
                                  x2={isMobileViewport ? svgWidth - 4 : endX + 10}
                                  y2={y}
                                  stroke="#e2e8f0"
                                  strokeDasharray="3 3"
                                  strokeWidth="1"
                                />
                                {!isMobileViewport && (
                                  <text
                                    x={startX - 14}
                                    y={y + 3}
                                    textAnchor="end"
                                    fontSize="9"
                                    fill="#64748b"
                                    fontWeight="500"
                                  >
                                    {grid.label}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Trục hoành */}
                          <line
                            x1={isMobileViewport ? 4 : startX - 10}
                            y1={baselineY}
                            x2={isMobileViewport ? svgWidth - 4 : endX + 10}
                            y2={baselineY}
                            stroke="#cbd5e1"
                            strokeWidth="1"
                          />

                          {/* Cột đôi Seajong & OEM */}
                          {displayedChartData.map((item, idx) => {
                            const x = startX + idx * stepX;
                            const isHovered = hoveredMonth === idx;
                            const seajongVal =
                              chartMetric === 'sales'
                                ? (item.signedSeajong ?? item.seajong ?? null)
                                : (item.seajong ?? null);
                            const oemVal =
                              chartMetric === 'sales'
                                ? (item.signedOem ?? item.oem ?? null)
                                : (item.oem ?? null);

                            const seajongH =
                              seajongVal !== null && seajongVal > 0
                                ? Math.max(3, (Math.min(seajongVal, maxVal) / maxVal) * chartHeight)
                                : 0;
                            const oemH =
                              oemVal !== null && oemVal > 0
                                ? Math.max(3, (Math.min(oemVal, maxVal) / maxVal) * chartHeight)
                                : 0;

                            const seajongX = x - barWidth - barGap / 2;
                            const oemX = x + barGap / 2;

                            return (
                              <g key={`bars-${idx}`}>
                                {!isMobileViewport && item.isCurrent && (
                                  <rect
                                    x={x - barWidth - 4}
                                    y={22}
                                    width={barWidth * 2 + barGap + 8}
                                    height={baselineY - 22}
                                    fill="rgba(2, 132, 199, 0.06)"
                                    rx="6"
                                  />
                                )}
                                {seajongH > 0 && (
                                  <rect
                                    x={seajongX}
                                    y={baselineY - seajongH}
                                    width={barWidth}
                                    height={seajongH}
                                    rx="3"
                                    fill="url(#salesResSeajongGrad)"
                                    filter="url(#salesResBarShadow)"
                                    opacity={isHovered ? 1 : 0.9}
                                  />
                                )}
                                {oemH > 0 && (
                                  <rect
                                    x={oemX}
                                    y={baselineY - oemH}
                                    width={barWidth}
                                    height={oemH}
                                    rx="3"
                                    fill="url(#salesResOemGrad)"
                                    filter="url(#salesResBarShadow)"
                                    opacity={isHovered ? 1 : 0.9}
                                  />
                                )}
                              </g>
                            );
                          })}

                          {/* Đường Mục tiêu (Đỏ nét đứt) */}
                          <path
                            d={planCurve}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2.2"
                            strokeDasharray="5 4"
                            filter="url(#salesResRedShadow)"
                          />
                          {planPoints.map((pt, pIdx) => (
                            <circle
                              key={`plan-pt-${pIdx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredMonth === pIdx ? 4 : 2.5}
                              fill="#ffffff"
                              stroke="#ef4444"
                              strokeWidth="1.8"
                            />
                          ))}

                          {/* Đường Tổng thực tế (Doanh thu: Xanh ngọc #10b981 | Doanh số: Tím #8b5cf6) */}
                          {chartMetric === 'revenue' ? (
                            <>
                              {revenueAreaPath && (
                                <path
                                  d={revenueAreaPath}
                                  fill="url(#salesResRevAreaGrad)"
                                  style={{ pointerEvents: 'none' }}
                                />
                              )}
                              <path
                                d={revenueCurve}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.8"
                                filter="url(#salesResRevShadow)"
                              />
                              {revenuePoints.map((pt) => (
                                <circle
                                  key={`rev-pt-${pt.idx}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={hoveredMonth === pt.idx ? 5.5 : 3.5}
                                  fill="#ffffff"
                                  stroke="#10b981"
                                  strokeWidth="2.2"
                                />
                              ))}
                            </>
                          ) : (
                            <>
                              {salesAreaPath && (
                                <path
                                  d={salesAreaPath}
                                  fill="url(#salesResSalesAreaGrad)"
                                  style={{ pointerEvents: 'none' }}
                                />
                              )}
                              <path
                                d={salesCurve}
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="2.8"
                                filter="url(#salesResSalesShadow)"
                              />
                              {salesPoints.map((pt) => (
                                <circle
                                  key={`sales-pt-${pt.idx}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={hoveredMonth === pt.idx ? 5.5 : 3.5}
                                  fill="#ffffff"
                                  stroke="#8b5cf6"
                                  strokeWidth="2.2"
                                />
                              ))}
                            </>
                          )}

                          {/* Đường gióng dọc khi hover */}
                          {hoveredMonth !== null && hoveredPlanPt && (
                            <line
                              x1={hoveredPlanPt.x}
                              y1={20}
                              x2={hoveredPlanPt.x}
                              y2={baselineY}
                              stroke="#64748b"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                              strokeOpacity="0.6"
                            />
                          )}

                          {/* Nhãn các tháng */}
                          {displayedChartData.map((item, idx) => {
                            const x = startX + idx * stepX;
                            const isFuture =
                              item.actual === null && item.actualSales === null;
                            return (
                              <g key={`m-lbl-${idx}`}>
                                <text
                                  x={x}
                                  y={baselineY + 19}
                                  textAnchor="middle"
                                  fontSize="10.5"
                                  fontWeight={item.isCurrent ? 800 : isFuture ? 500 : 600}
                                  fill={
                                    item.isCurrent
                                      ? '#0284c7'
                                      : isFuture
                                      ? '#94a3b8'
                                      : '#475569'
                                  }
                                >
                                  {item.month}
                                </text>
                                {!isMobileViewport && item.isCurrent && (
                                  <circle cx={x} cy={baselineY + 27} r="2.5" fill="#0284c7" />
                                )}
                              </g>
                            );
                          })}

                          {/* Hitboxes nhận diện hover */}
                          {displayedChartData.map((_item, idx) => {
                            const x = startX + idx * stepX;
                            return (
                              <rect
                                key={`hit-${idx}`}
                                x={x - stepX / 2}
                                y={15}
                                width={stepX}
                                height={baselineY - 10}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredMonth(idx)}
                                onMouseLeave={() => setHoveredMonth(null)}
                              />
                            );
                          })}
                        </svg>

                        {/* Tooltip chi tiết khi di chuột */}
                        {hoveredItem &&
                          hoveredPlanPt &&
                          (() => {
                            const isRightEdge =
                              (hoveredMonth ?? 0) >= displayedChartData.length - 2;
                            const isLeftEdge = (hoveredMonth ?? 0) <= 1;
                            const transformX = isRightEdge
                              ? '-85%'
                              : isLeftEdge
                              ? '-15%'
                              : '-50%';
                            const hPlan =
                              chartMetric === 'revenue'
                                ? (hoveredItem.planRevenue ?? hoveredItem.plan)
                                : (hoveredItem.planSales ?? hoveredItem.plan);
                            const hActualRev =
                              hoveredItem.actualRevenue ?? hoveredItem.actual ?? null;
                            const hActualSales =
                              hoveredItem.actualSales ?? hoveredItem.actual ?? null;
                            const hSeajong =
                              chartMetric === 'sales'
                                ? (hoveredItem.signedSeajong ?? hoveredItem.seajong ?? null)
                                : (hoveredItem.seajong ?? null);
                            const hOem =
                              chartMetric === 'sales'
                                ? (hoveredItem.signedOem ?? hoveredItem.oem ?? null)
                                : (hoveredItem.oem ?? null);
                            const revRate =
                              hActualRev !== null && hPlan > 0
                                ? ((hActualRev / hPlan) * 100).toFixed(1)
                                : null;
                            const salesRate =
                              hActualSales !== null && hPlan > 0
                                ? ((hActualSales / hPlan) * 100).toFixed(1)
                                : null;

                            return (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${(hoveredPlanPt.x / svgWidth) * 100}%`,
                                  top: '10%',
                                  transform: `translate(${transformX}, -100%)`,
                                }}
                                className="bg-white text-slate-900 p-2.5 sm:p-3 rounded-xl text-xs shadow-xl border border-slate-200 pointer-events-none z-50 whitespace-nowrap min-w-[225px]"
                              >
                                <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-slate-100">
                                  <span className="font-extrabold text-slate-900">
                                    {hoveredItem.monthFull}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                    {hoveredItem.quarter}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className="text-slate-600 inline-flex items-center gap-1.5 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                    Đường mục tiêu:
                                  </span>
                                  <strong className="text-red-600 font-bold">
                                    {hPlan.toFixed(2)} tỷ
                                  </strong>
                                </div>
                                {chartMetric === 'revenue' ? (
                                  <div className="flex items-center justify-between gap-4 mb-1.5">
                                    <span className="text-emerald-700 inline-flex items-center gap-1.5 font-bold">
                                      <span className="w-3 h-0.5 rounded bg-emerald-500 inline-block" />
                                      Tổng thực tế (Thu):
                                    </span>
                                    <span className="font-extrabold text-emerald-600">
                                      {hActualRev !== null
                                        ? `${hActualRev.toFixed(2)} tỷ${revRate ? ` (${revRate}%)` : ''}`
                                        : 'Chưa phát sinh'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-4 mb-1.5">
                                    <span className="text-purple-700 inline-flex items-center gap-1.5 font-bold">
                                      <span className="w-3 h-0.5 rounded bg-purple-500 inline-block" />
                                      Tổng thực tế (Số):
                                    </span>
                                    <span className="font-extrabold text-purple-600">
                                      {hActualSales !== null
                                        ? `${hActualSales.toFixed(2)} tỷ${salesRate ? ` (${salesRate}%)` : ''}`
                                        : 'Chưa phát sinh'}
                                    </span>
                                  </div>
                                )}
                                <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1 space-y-1 text-[11px]">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500 inline-flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-xs bg-sky-600 inline-block" />
                                      Thương hiệu Seajong:
                                    </span>
                                    <span className="font-bold text-sky-700">
                                      {hSeajong !== null ? `${hSeajong.toFixed(2)} tỷ` : '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-500 inline-flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" />
                                      Gia công OEM:
                                    </span>
                                    <span className="font-bold text-amber-600">
                                      {hOem !== null ? `${hOem.toFixed(2)} tỷ` : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    );
                  })()}
                </div>

                {/* Chú thích (Legend) dưới biểu đồ */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-600 flex-wrap pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
                    Seajong (Thương hiệu)
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                    OEM (Gia công)
                  </span>
                  {chartMetric === 'revenue' ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <span className="w-4 h-0.5 bg-emerald-500 relative inline-flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                      Đường tổng thực tế (Doanh thu)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-purple-700">
                      <span className="w-4 h-0.5 bg-purple-500 relative inline-flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      </span>
                      Đường tổng thực tế (Doanh số)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                    <span className="w-4 border-t-2 border-dashed border-red-500 relative inline-flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 -mt-0.5" />
                    </span>
                    Đường mục tiêu
                  </span>
                </div>
              </div>

              {/* BIỂU ĐỒ 2: Cơ cấu doanh thu theo các dòng sản phẩm (Thiết bị vệ sinh, Thiết bị nhà bếp, Phụ kiện, Loại khác) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <PieChartFill className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cơ cấu doanh thu theo dòng sản phẩm</span>
                    </h3>
                    <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                      Tỷ trọng đóng góp của 4 nhóm hàng chủ lực năm 2026
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {totalProductMixUnits.toLocaleString('vi-VN')} SP
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 my-auto py-1">
                  {/* Vòng Donut SVG trực quan */}
                  <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
                      <circle
                        cx="75"
                        cy="75"
                        r="58"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="18"
                      />
                      {donutSegments.map((seg) => {
                        const isHovered = hoveredSegment === seg.id;
                        return (
                          <circle
                            key={seg.id}
                            cx="75"
                            cy="75"
                            r={seg.radius}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={isHovered ? 22 : 18}
                            strokeDasharray={seg.strokeDasharray}
                            strokeDashoffset={seg.strokeDashoffset}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredSegment(seg.id)}
                            onMouseLeave={() => setHoveredSegment(null)}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                      <span className="text-[10px] font-bold uppercase text-slate-400 truncate max-w-[95px]">
                        {activeDonutItem ? activeDonutItem.name : 'Tổng giá trị'}
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-800 font-mono mt-0.5">
                        {activeDonutItem
                          ? `${activeDonutItem.share}%`
                          : formatCompactVND(totalProductMixVnd)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {activeDonutItem
                          ? activeDonutItem.revenue
                          : `${productLineMix.length} dòng SP`}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách chi tiết 4 dòng sản phẩm */}
                  <div className="flex-1 w-full space-y-2.5">
                    {productLineMix.map((line) => {
                      const isHovered = hoveredSegment === line.id;
                      return (
                        <div
                          key={line.id}
                          onMouseEnter={() => setHoveredSegment(line.id)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            isHovered
                              ? 'bg-slate-50 border-slate-300 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-slate-800 inline-flex items-center gap-2 min-w-0 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: line.color }}
                              />
                              <span className="truncate">{line.name}</span>
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-slate-800">
                                {formatVND(line.revenueVnd)}
                              </span>
                              <span
                                className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded font-mono"
                                style={{
                                  backgroundColor: `${line.color}15`,
                                  color: line.color,
                                }}
                              >
                                {line.share}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(3, Math.min(100, line.share))}%`,
                                  backgroundColor: line.color,
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 font-mono shrink-0">
                              {line.units} • {line.ordersCount} đơn
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chú thích 4 dòng sản phẩm dưới chân card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-[10.5px]">
                  {productLineMix.map((line) => (
                    <div
                      key={`foot-${line.id}`}
                      className="flex items-center gap-1.5 text-slate-600 truncate"
                    >
                      <span
                        className="w-2 h-2 rounded-xs shrink-0"
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="truncate font-medium">{line.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BƯỚC 2: NGUỒN VÀO (Bảng chi tiết doanh thu các tháng trong năm 2026)
           ═══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="flex flex-col h-full flex-1 overflow-hidden bg-white">
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm kiếm tháng (VD: Tháng 10, Tháng 11)..."
              searchValue={monthSearch}
              onSearchChange={setMonthSearch}
              filters={[
                {
                  id: 'quarter-filter',
                  value: quarterFilter,
                  onChange: setQuarterFilter,
                  minWidth: '175px',
                  options: [
                    { value: 'all', label: 'Tất cả các quý (2026)' },
                    { value: 'Q1', label: 'Quý 1 (Tháng 01 - 03)' },
                    { value: 'Q2', label: 'Quý 2 (Tháng 04 - 06)' },
                    { value: 'Q3', label: 'Quý 3 (Tháng 07 - 09)' },
                    { value: 'Q4', label: 'Quý 4 (Tháng 10 - 12)' },
                  ],
                },
              ]}
              onRefresh={loadBusinessResults}
            />

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={loading} emptyText="Không có dữ liệu tháng phù hợp.">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10.5px] sm:text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-2 sm:px-3 w-[36%] sm:w-auto">Tháng</th>
                      <th className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right">
                        Mục tiêu doanh thu
                      </th>
                      <th className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right text-sky-700">
                        Kênh Seajong
                      </th>
                      <th className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right text-amber-700">
                        Kênh OEM
                      </th>
                      <th className="py-2.5 px-2 sm:px-3 text-right text-emerald-700 w-[36%] sm:w-auto">
                        Tổng doanh thu
                      </th>
                      <th className="py-2.5 px-2 sm:px-4 text-center w-[28%] sm:w-52 sm:min-w-[190px]">
                        Tỷ lệ đạt
                      </th>
                    </tr>
                    {/* Dòng Tổng cộng cố định ở dòng trên cùng của bảng */}
                    {(() => {
                      const totalRate =
                        yearlyTotals.targetSalesVnd > 0
                          ? Number(
                              ((yearlyTotals.revenueVnd / yearlyTotals.targetSalesVnd) * 100).toFixed(1)
                            )
                          : 0;
                      const totalBarColor =
                        totalRate >= 100
                          ? 'bg-emerald-500'
                          : totalRate >= 70
                          ? 'bg-sky-500'
                          : totalRate > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-300';

                      return (
                        <tr className="bg-slate-100 border-b-2 border-slate-200 font-extrabold text-slate-900">
                          <td
                            style={{ position: 'sticky', top: '37px', zIndex: 15, backgroundColor: '#f1f5f9' }}
                            className="py-2 sm:py-2.5 px-2 sm:px-3 uppercase text-[10.5px] sm:text-[11px] border-b-2 border-slate-200 align-top sm:align-middle"
                          >
                            <div className="whitespace-nowrap">
                              <span className="sm:hidden">Tổng cộng 2026</span>
                              <span className="hidden sm:inline">Tổng cộng năm 2026</span>
                            </div>
                            <div className="sm:hidden text-[10px] font-mono font-semibold text-slate-500 normal-case mt-0.5">
                              MT: {formatVND(yearlyTotals.targetSalesVnd)}
                            </div>
                          </td>
                          <td
                            style={{ position: 'sticky', top: '37px', zIndex: 15, backgroundColor: '#f1f5f9' }}
                            className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right font-mono text-slate-800 whitespace-nowrap border-b-2 border-slate-200"
                          >
                            {formatVND(yearlyTotals.targetSalesVnd)}
                          </td>
                          <td
                            style={{ position: 'sticky', top: '37px', zIndex: 15, backgroundColor: '#f1f5f9' }}
                            className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right font-mono text-sky-700 whitespace-nowrap border-b-2 border-slate-200"
                          >
                            {formatVND(yearlyTotals.revenueSeajongVnd)}
                          </td>
                          <td
                            style={{ position: 'sticky', top: '37px', zIndex: 15, backgroundColor: '#f1f5f9' }}
                            className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right font-mono text-amber-600 whitespace-nowrap border-b-2 border-slate-200"
                          >
                            {formatVND(yearlyTotals.revenueOemVnd)}
                          </td>
                          <td
                            style={{ position: 'sticky', top: '37px', zIndex: 15, backgroundColor: '#f1f5f9' }}
                            className="py-2 sm:py-2.5 px-2 sm:px-3 text-right font-mono text-emerald-700 whitespace-nowrap border-b-2 border-slate-200 align-top sm:align-middle"
                          >
                            <div>{formatVND(yearlyTotals.revenueVnd)}</div>
                            <div className="sm:hidden text-[9.5px] font-semibold text-slate-500 mt-0.5">
                              <span className="text-sky-700">
                                SJ: {formatCompactVND(yearlyTotals.revenueSeajongVnd)}
                              </span>{' '}
                              •{' '}
                              <span className="text-amber-600">
                                OEM: {formatCompactVND(yearlyTotals.revenueOemVnd)}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{ position: 'sticky', top: '37px', zIndex: 15, backgroundColor: '#f1f5f9' }}
                            className="py-2 px-2 sm:px-4 text-center font-mono whitespace-nowrap border-b-2 border-slate-200 w-[28%] sm:w-52 sm:min-w-[190px] align-middle"
                          >
                            <div className="flex flex-col items-center gap-1 w-full">
                              <span className="text-[10.5px] sm:text-[11px] font-extrabold text-emerald-700">
                                {totalRate.toFixed(1)}%
                              </span>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${totalBarColor}`}
                                  style={{ width: `${Math.min(100, totalRate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMonthlyRows.map((m) => {
                      const targetVnd = m.targetSalesVnd || m.targetRevenueVnd || 0;
                      const displayRate =
                        targetVnd > 0
                          ? Number(((m.revenueVnd / targetVnd) * 100).toFixed(1))
                          : 0;
                      const barColor =
                        displayRate >= 100
                          ? 'bg-emerald-500'
                          : displayRate >= 70
                          ? 'bg-sky-500'
                          : displayRate > 0
                          ? 'bg-amber-500'
                          : 'bg-slate-200';
                      const textColor =
                        displayRate >= 100
                          ? 'text-emerald-700 font-bold'
                          : displayRate >= 70
                          ? 'text-sky-700 font-bold'
                          : displayRate > 0
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-400';

                      return (
                        <tr
                          key={m.monthNum}
                          className={`hover:bg-slate-50/70 ${
                            m.isCurrent ? 'bg-sky-50/40 font-medium' : ''
                          }`}
                        >
                          <td className="py-2 px-2 sm:px-3 font-semibold text-slate-800 whitespace-nowrap align-top sm:align-middle">
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                              <span>Tháng {String(m.monthNum).padStart(2, '0')}/2026</span>
                              {m.isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[9.5px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                  Hiện tại
                                </span>
                              )}
                            </div>
                            <div className="sm:hidden text-[10px] font-mono font-normal text-slate-500 mt-0.5">
                              MT: {formatVND(targetVnd)}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-2 px-2.5 sm:px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {formatVND(targetVnd)}
                          </td>
                          <td className="hidden sm:table-cell py-2 px-2.5 sm:px-3 text-right font-mono text-sky-700 whitespace-nowrap">
                            {m.revenueSeajongVnd > 0 ? formatVND(m.revenueSeajongVnd) : '—'}
                          </td>
                          <td className="hidden sm:table-cell py-2 px-2.5 sm:px-3 text-right font-mono text-amber-600 whitespace-nowrap">
                            {m.revenueOemVnd > 0 ? formatVND(m.revenueOemVnd) : '—'}
                          </td>
                          <td className="py-2 px-2 sm:px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap align-top sm:align-middle">
                            <div>{m.revenueVnd > 0 ? formatVND(m.revenueVnd) : '0 đ'}</div>
                            {(m.revenueSeajongVnd > 0 || m.revenueOemVnd > 0) && (
                              <div className="sm:hidden text-[9.5px] font-normal text-slate-500 mt-0.5">
                                <span className="text-sky-700">
                                  SJ: {formatCompactVND(m.revenueSeajongVnd)}
                                </span>
                                {m.revenueOemVnd > 0 && (
                                  <>
                                    {' '}
                                    •{' '}
                                    <span className="text-amber-600">
                                      OEM: {formatCompactVND(m.revenueOemVnd)}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 sm:px-4 text-center whitespace-nowrap w-[28%] sm:w-52 sm:min-w-[190px] align-middle">
                            <div className="flex flex-col items-center gap-1 w-full">
                              <span className={`text-[10.5px] font-mono ${textColor}`}>
                                {displayRate > 0 ? `${displayRate}%` : '0.0%'}
                              </span>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${Math.min(100, displayRate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BƯỚC 3: ĐẠI LÝ (Bảng xếp hạng các đại lý theo doanh thu và doanh số 2026)
           ═══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="flex flex-col h-full flex-1 overflow-hidden bg-white">
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm tên đại lý, mã khách hàng, khu vực..."
              searchValue={searchTerm}
              onSearchChange={(val) => {
                setSearchTerm(val);
                setDealersPage(1);
              }}
              filters={[
                {
                  id: 'dealer-sort-by',
                  value: dealerSortBy,
                  onChange: (val) => {
                    setDealerSortBy(val as 'revenue' | 'sales');
                    setDealersPage(1);
                  },
                  minWidth: '190px',
                  options: [
                    { value: 'revenue', label: 'Xếp hạng theo Doanh thu' },
                    { value: 'sales', label: 'Xếp hạng theo Doanh số' },
                  ],
                },
                {
                  id: 'dealer-status-filter',
                  value: dealerStatusFilter,
                  onChange: (val) => {
                    setDealerStatusFilter(val);
                    setDealersPage(1);
                  },
                  minWidth: '165px',
                  options: [
                    { value: 'all', label: 'Tất cả phân hạng' },
                    { value: 'Xuất sắc', label: 'Đại lý Xuất sắc' },
                    { value: 'Tiêu biểu', label: 'Đại lý Tiêu biểu' },
                    { value: 'Đạt chuẩn', label: 'Đại lý Đạt chuẩn' },
                  ],
                },
              ]}
              onRefresh={loadBusinessResults}
            />

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable
                loading={loading}
                emptyText="Không tìm thấy đại lý nào phù hợp với bộ lọc."
              >
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[10.5px] sm:text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-1.5 sm:px-3 w-10 sm:w-12 text-center">Hạng</th>
                      <th className="py-2.5 px-2 sm:px-3">Tên đại lý / Doanh nghiệp</th>
                      <th className="hidden md:table-cell py-2.5 px-3 text-center">Số đơn</th>
                      <th
                        onClick={() => setDealerSortBy('sales')}
                        className={`hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right cursor-pointer select-none ${
                          dealerSortBy === 'sales'
                            ? 'text-purple-700 font-extrabold bg-purple-50/40'
                            : ''
                        }`}
                      >
                        Doanh số lũy kế {dealerSortBy === 'sales' ? '↓' : ''}
                      </th>
                      <th
                        onClick={() => setDealerSortBy('revenue')}
                        className={`py-2.5 px-2 sm:px-3 text-right cursor-pointer select-none w-[138px] sm:w-auto ${
                          dealerSortBy === 'revenue'
                            ? 'text-emerald-700 font-extrabold bg-emerald-50/40'
                            : ''
                        }`}
                      >
                        <span className="sm:hidden">Doanh thu</span>
                        <span className="hidden sm:inline">
                          Doanh thu thực thu {dealerSortBy === 'revenue' ? '↓' : ''}
                        </span>
                      </th>
                      <th className="hidden lg:table-cell py-2.5 px-3 text-right">
                        Công nợ còn lại
                      </th>
                      <th className="hidden md:table-cell py-2.5 px-3 text-center w-28">
                        Tỷ lệ thu tiền
                      </th>
                      <th className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-center w-24 sm:w-28">
                        Xếp hạng
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedAndFilteredDealers
                      .slice((dealersPage - 1) * dealersPageSize, dealersPage * dealersPageSize)
                      .map((d) => (
                        <tr key={d.code + '-' + d.rank} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-1.5 sm:px-3 text-center align-top sm:align-middle">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono font-bold text-xs ${
                                d.rank === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : d.rank === 2
                                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                  : d.rank === 3
                                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {d.rank}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 font-semibold text-slate-800 min-w-0 align-top sm:align-middle">
                            <div className="break-words sm:truncate sm:max-w-none leading-snug">
                              {d.name}
                            </div>
                            {d.area && (
                              <div className="text-[11px] font-normal text-slate-500 mt-0.5 line-clamp-1 sm:truncate sm:max-w-[360px]">
                                {d.area}
                              </div>
                            )}
                            {/* Dòng phụ chỉ hiển thị trên điện thoại */}
                            <div className="sm:hidden flex items-center gap-1.5 flex-wrap text-[10px] font-normal text-slate-500 mt-1">
                              <span className="font-mono font-semibold text-slate-700">
                                {d.orders} đơn
                              </span>
                              <span>•</span>
                              <span className="font-mono text-rose-600">
                                Nợ: {d.debt > 0 ? formatCompactVND(d.debt) : '0 đ'}
                              </span>
                              <span className="font-mono text-emerald-700 font-semibold">
                                ({d.paymentRate}%)
                              </span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                            {d.orders}
                          </td>
                          <td
                            className={`hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-right font-mono font-bold whitespace-nowrap ${
                              dealerSortBy === 'sales'
                                ? 'text-purple-700 bg-purple-50/20'
                                : 'text-slate-700'
                            }`}
                          >
                            {formatVND(d.sales)}
                          </td>
                          <td
                            className={`py-2.5 px-2 sm:px-3 text-right font-mono font-bold whitespace-nowrap align-top sm:align-middle ${
                              dealerSortBy === 'revenue'
                                ? 'text-emerald-700 sm:bg-emerald-50/20'
                                : 'text-emerald-600'
                            }`}
                          >
                            <div>{formatVND(d.revenue)}</div>
                            {/* Doanh số & Badge xếp hạng gộp gọn trên điện thoại */}
                            <div className="sm:hidden text-[10px] font-normal text-slate-500 mt-0.5">
                              DS: <span className="font-semibold text-purple-700">{formatVND(d.sales)}</span>
                            </div>
                            <div className="sm:hidden mt-1">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded-full text-[9.5px] font-sans font-bold border whitespace-nowrap ${
                                  d.status === 'Xuất sắc'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : d.status === 'Tiêu biểu'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {d.status}
                              </span>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                            {d.debt > 0 ? formatVND(d.debt) : '0 đ'}
                          </td>
                          <td className="hidden md:table-cell py-2.5 px-3 text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, d.paymentRate)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10.5px] font-bold text-slate-600">
                                {d.paymentRate}%
                              </span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2.5 sm:px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-bold border whitespace-nowrap ${
                                d.status === 'Xuất sắc'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : d.status === 'Tiêu biểu'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </FullWidthTable>

              <div className="border-t border-slate-200 shrink-0">
                <Pagination
                  currentPage={dealersPage}
                  totalItems={rankedAndFilteredDealers.length}
                  pageSize={dealersPageSize}
                  onPageChange={setDealersPage}
                  onPageSizeChange={(sz) => {
                    setDealersPageSize(sz);
                    setDealersPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemName="đại lý"
                />
              </div>
            </div>
          </div>
        )}
      </StepPage>
    </div>
  );
};

export default SalesBusinessResultsPage;
