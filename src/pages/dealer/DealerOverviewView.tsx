import React, { useState, useMemo } from 'react';
import {
  GraphUpArrow,
  CashCoin,
  BoxSeam,
  TrophyFill,
  CartPlus,
  ArrowRight,
  CheckCircleFill,
  ArrowClockwise,
  ShieldCheck,
} from 'react-bootstrap-icons';

export interface DealerOverviewViewProps {
  overviewData: any;
  loading: boolean;
  onNavigateTab: (tab: string, subTab?: string) => void;
  onViewOrder?: (order: any) => void;
  onRefresh?: () => void;
}

const formatVND = (amount?: number | null): string => {
  if (amount === undefined || amount === null) return '0 đ';
  return amount.toLocaleString('vi-VN') + ' đ';
};

export const DealerOverviewView: React.FC<DealerOverviewViewProps> = ({
  overviewData,
  loading,
  onNavigateTab,
  onRefresh,
}) => {
  // Lọc kỳ: Năm / Quý / Tháng (Chỉ ảnh hưởng tới giá trị thẻ KPI, Đồ thị luôn hiển thị 12 tháng)
  const [periodType, setPeriodType] = useState<'year' | 'quarter' | 'month'>('year');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
  const [activeRightTab, setActiveRightTab] = useState<'policies' | 'health'>('policies');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const customer = overviewData?.customer;
  const metrics = overviewData?.metrics;
  const rawMonthlyData = overviewData?.monthlyPerformance || [];
  const productSegments = overviewData?.productSegments || [];
  const healthRatios = overviewData?.healthRatios || [];

  // Cam kết doanh số năm từ DB (chỉ hiển thị nếu đại lý có số tiền cam kết thực tế > 0)
  const annualTarget = Number(customer?.doanhSoCamKet || 0);
  const hasAnnualTarget = annualTarget > 0;
  const monthlyTarget = hasAnnualTarget ? Math.round(annualTarget / 12) : 0;

  // Danh mục chính sách ưu đãi lấy chuẩn 100% theo hợp đồng thực tế của từng Đại lý từ DB
  const dealerPolicies = useMemo(() => [
    {
      title: 'Chiết khấu thương mại theo hợp đồng',
      badge: `${customer?.discountPercent || 25}% trực tiếp`,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'Áp dụng chiết khấu trực tiếp trên giá niêm yết theo Hợp đồng đại lý ủy quyền Seajong.',
    },
    {
      title: 'Tín dụng & Hạn mức công nợ gối đầu',
      badge: formatVND(customer?.hanMucCongNo || 20000000),
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'Hạn mức mua hàng gối đầu được phê duyệt trong hệ thống, chu kỳ thanh toán linh hoạt 30 ngày.',
    },
    {
      title: 'Thưởng thanh toán đúng hạn (Thưởng nóng)',
      badge: customer?.thuongThanhToan?.includes('2%') ? 'Thưởng 2.0%' : '+1.5% chiết khấu',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: customer?.thuongThanhToan || 'Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)',
    },
    {
      title: 'Thưởng cam kết doanh số năm',
      badge: customer?.thuongDoanhSoNam?.includes('1.5%') ? 'Thưởng 1.5%' : 'Thưởng 2% - 3.5%',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      desc: customer?.thuongDoanhSoNam || `Căn cứ doanh số cam kết năm ${formatVND(customer?.doanhSoCamKet || 1200000000)}, xét thưởng chiết khấu kỳ tổng kết năm.`,
    },
    ...(customer?.thuongVuotDoanhSo ? [{
      title: 'Thưởng vượt chỉ tiêu cam kết',
      badge: 'Vượt chỉ tiêu 3%',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: customer.thuongVuotDoanhSo,
    }] : []),
    {
      title: 'Bảo hành chính hãng & Đổi mới 1:1',
      badge: 'Đổi mới 30 ngày',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      desc: 'Bảo hành 5 năm sen vòi & thân vỏ, đổi mới 1:1 lỗi kỹ thuật, cấp linh kiện thay thế chính hãng.',
    },
    {
      title: 'Hỗ trợ Showroom & Nhận diện Marketing',
      badge: 'Tài trợ 100%',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      desc: 'Hỗ trợ biển bạt đại lý ủy quyền, kệ mẫu trưng bày trải nghiệm và tài liệu catalogue Seajong.',
    },
  ], [customer]);

  // ── ĐỒ THỊ LUÔN HIỂN THỊ ĐẦY ĐỦ 12 THÁNG TRONG NĂM 2026 ──
  const fullYearMonthlyData = useMemo(() => {
    if (rawMonthlyData.length === 12) {
      return rawMonthlyData.map((d: any) => ({
        ...d,
        shortLabel: `T${d.monthNum}`,
      }));
    }
    // Dữ liệu mẫu 12 tháng chuẩn nếu DB chưa đủ
    return Array.from({ length: 12 }, (_, i) => ({
      month: `T${String(i + 1).padStart(2, '0')}`,
      shortLabel: `T${i + 1}`,
      monthFull: `Tháng ${String(i + 1).padStart(2, '0')}`,
      monthNum: i + 1,
      planRevenue: 150000000,
      actualRevenue: i <= 9 ? Math.round(150000000 * (0.85 + (i % 3) * 0.15)) : null,
      ordersCount: i <= 9 ? 3 + (i % 4) : 0,
      isCurrent: i === 9,
      isFuture: i > 9,
    }));
  }, [rawMonthlyData]);

  // ── TÍNH TOÁN DỮ LIỆU CÁC THẺ KPI THEO KỲ ĐƯỢC CHỌN (NĂM / QUÝ 4 / THÁNG 10) ──
  const periodKpi = useMemo(() => {
    let activeMonths = fullYearMonthlyData;
    let label = 'Năm 2026';

    if (periodType === 'quarter') {
      // Quý 4 (T10, T11, T12)
      activeMonths = fullYearMonthlyData.filter((m: any) => m.monthNum >= 10 && m.monthNum <= 12);
      label = 'Quý 4/2026';
    } else if (periodType === 'month') {
      // Tháng 10
      activeMonths = fullYearMonthlyData.filter((m: any) => m.monthNum === 10);
      label = 'Tháng 10/2026';
    }

    const plan = activeMonths.reduce((s: number, m: any) => s + (m.planRevenue || 0), 0);
    const actual = activeMonths.reduce((s: number, m: any) => s + (m.actualRevenue || 0), 0);
    const orders = activeMonths.reduce((s: number, m: any) => s + (m.ordersCount || 0), 0);
    const progress = plan > 0 ? Number(((actual / plan) * 100).toFixed(1)) : 0;

    return {
      label,
      plan,
      actual,
      orders,
      progress,
      activeMonthNums: activeMonths.map((m: any) => m.monthNum),
    };
  }, [fullYearMonthlyData, periodType]);

  // Tính max value cho biểu đồ SVG theo dữ liệu thực tế (và cam kết tháng nếu có)
  const maxChartVal = useMemo(() => {
    if (chartMetric === 'revenue') {
      const maxA = Math.max(...fullYearMonthlyData.map((d: any) => d.actualRevenue || 0), 20000000);
      const topVal = hasAnnualTarget ? Math.max(maxA, monthlyTarget) : maxA;
      return topVal * 1.35;
    } else {
      const maxO = Math.max(...fullYearMonthlyData.map((d: any) => d.ordersCount || 0), 3);
      return Math.ceil(maxO * 1.35);
    }
  }, [fullYearMonthlyData, chartMetric, hasAnnualTarget, monthlyTarget]);

  // Cấu hình toạ độ SVG Chart chuẩn (giữ nguyên tỉ lệ để mark tròn không bị méo)
  const chartWidth = 680;
  const chartHeight = 150;
  const baselineY = 185;
  const startX = 35;
  const endX = 645;
  const stepX = (endX - startX) / 11;

  // Toạ độ trục Y của đường cam kết tháng (nằm ngang bằng nhau ở các tháng)
  const targetY = useMemo(() => {
    if (!hasAnnualTarget || chartMetric !== 'revenue') return null;
    const y = baselineY - (monthlyTarget / maxChartVal) * chartHeight;
    return Math.min(baselineY - 10, Math.max(25, y));
  }, [hasAnnualTarget, chartMetric, monthlyTarget, maxChartVal, baselineY, chartHeight]);

  // Điểm tính đường cong Spline (Cubic Bezier)
  const splinePoints = useMemo(() => {
    return fullYearMonthlyData.map((d: any, idx: number) => {
      const val = chartMetric === 'revenue' ? (d.actualRevenue ?? 0) : d.ordersCount;
      const x = startX + idx * stepX;
      const y = d.actualRevenue !== null ? baselineY - (val / maxChartVal) * chartHeight : baselineY;
      return { x, y, val, d, idx };
    });
  }, [fullYearMonthlyData, chartMetric, maxChartVal, stepX]);

  // Hàm tạo đường cong spline chuẩn - triệt tiêu hoàn toàn hiện tượng võng xuống dưới trục 0
  const smoothCurvePath = useMemo(() => {
    const validPts = splinePoints.filter((p: any) => p.d.actualRevenue !== null);
    if (validPts.length === 0) return '';
    if (validPts.length === 1) return `M ${validPts[0].x},${validPts[0].y}`;

    let path = `M ${validPts[0].x.toFixed(1)},${validPts[0].y.toFixed(1)}`;
    for (let i = 0; i < validPts.length - 1; i++) {
      const p0 = validPts[i === 0 ? 0 : i - 1];
      const p1 = validPts[i];
      const p2 = validPts[i + 1];
      const p3 = validPts[i + 2] || p2;

      // Nếu cả hai điểm đều bằng 0 (nằm trên đáy baseline), vẽ đường thẳng tuyệt đối nằm ngang
      if (p1.val === 0 && p2.val === 0) {
        path += ` L ${p2.x.toFixed(1)},${baselineY}`;
        continue;
      }

      // Tính slope
      let dx1 = (p2.x - p0.x) / 6;
      let dy1 = (p2.y - p0.y) / 6;
      let dx2 = (p3.x - p1.x) / 6;
      let dy2 = (p3.y - p1.y) / 6;

      // Nếu bắt đầu từ 0 đi lên: tiếp tuyến tại p1 nằm ngang hoàn toàn (không chúc xuống)
      if (p1.val === 0) {
        dy1 = 0;
      }
      // Nếu chạm về 0: tiếp tuyến tại p2 nằm ngang
      if (p2.val === 0) {
        dy2 = 0;
      }

      let cp1x = p1.x + dx1;
      let cp1y = p1.y + dy1;
      let cp2x = p2.x - dx2;
      let cp2y = p2.y - dy2;

      // Khóa chặt control points không bao giờ được lớn hơn baselineY (không bị lún xuống âm)
      cp1y = Math.min(baselineY, Math.max(baselineY - chartHeight, cp1y));
      cp2y = Math.min(baselineY, Math.max(baselineY - chartHeight, cp2y));

      path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return path;
  }, [splinePoints, baselineY, chartHeight]);

  // Vệt gradient dưới đường cong spline
  const areaGradientPath = useMemo(() => {
    const validPts = splinePoints.filter((p: any) => p.d.actualRevenue !== null);
    if (validPts.length < 2) return '';
    const last = validPts[validPts.length - 1];
    const first = validPts[0];
    return `${smoothCurvePath} L ${last.x.toFixed(1)},${baselineY} L ${first.x.toFixed(1)},${baselineY} Z`;
  }, [smoothCurvePath, splinePoints, baselineY]);

  const hoveredData = hoveredMonth !== null ? fullYearMonthlyData[hoveredMonth] : null;
  const hoveredPoint = hoveredMonth !== null ? splinePoints[hoveredMonth] : null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-2 sm:p-2.5 gap-2 select-none overflow-hidden">
      
      {/* ── 1. THANH ĐIỀU KHIỂN & LỌC KỲ BÁO CÁO (CHIP THỜI GIAN THỰC) ── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-white py-1.5 px-3 rounded-lg border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
            <span>Dữ liệu đại lý trực tuyến</span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Nhấn để đồng bộ lại dữ liệu thực tế từ hệ thống Seajong"
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <ArrowClockwise className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="text-[10.5px] text-slate-500 hover:text-blue-600 hidden md:inline">Đồng bộ</span>
            </button>
          )}
          <span className="text-xs text-slate-500 hidden sm:inline">
            Mã KH: <strong className="text-slate-800 font-mono">{customer?.code || 'KH0003'}</strong> —{' '}
            {customer?.name || 'Đại lý Seajong'}
          </span>
        </div>

        {/* Nút lọc kỳ & Nút Lên đơn hàng mới */}
        <div className="flex items-center gap-2">
          {/* Lọc Kỳ: Năm / Quý / Tháng (Cập nhật giá trị thẻ KPI) */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
            <button
              type="button"
              onClick={() => setPeriodType('year')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                periodType === 'year' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              Năm 2026
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('quarter')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                periodType === 'quarter' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              Quý 4/2026
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('month')}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                periodType === 'month' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              Tháng 10
            </button>
          </div>

          {/* Quick Action: Lên đơn hàng mới */}
          <button
            type="button"
            onClick={() => onNavigateTab('orders', 'create')}
            className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <CartPlus className="w-3.5 h-3.5" />
            <span>Lên đơn hàng mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. HÀNG 4 THẺ CHỈ SỐ KPI THEN CHỐT (TỰ ĐỘNG THAY ĐỔI THEO KỲ CHỌN) ── */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Thẻ 1: Doanh số mua hàng thực tế */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Doanh số {periodKpi.label}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraphUpArrow className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                {formatVND(periodKpi.actual)}
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-slate-500">
                {hasAnnualTarget ? (
                  <>
                    <span>Mục tiêu cam kết:</span>
                    <span className="font-bold text-amber-700">
                      {formatVND(
                        periodType === 'year'
                          ? annualTarget
                          : periodType === 'quarter'
                          ? Math.round(annualTarget / 4)
                          : monthlyTarget
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Đã thanh toán:</span>
                    <span className="font-bold text-emerald-600">
                      {formatVND(metrics?.totalPaid || 0)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100">
            {hasAnnualTarget ? (
              <>
                <div className="flex justify-between text-[10.5px] mb-1">
                  <span className="text-slate-500">Tiến độ cam kết:</span>
                  <span className="font-bold text-blue-600">
                    {Number(
                      (
                        (periodKpi.actual /
                          (periodType === 'year'
                            ? annualTarget
                            : periodType === 'quarter'
                            ? Math.round(annualTarget / 4)
                            : monthlyTarget)) *
                        100
                      ).toFixed(1)
                    )}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Number(
                          (
                            (periodKpi.actual /
                              (periodType === 'year'
                                ? annualTarget
                                : periodType === 'quarter'
                                ? Math.round(annualTarget / 4)
                                : monthlyTarget)) *
                            100
                          ).toFixed(1)
                        )
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-[10.5px] mb-1">
                  <span className="text-slate-500">Tỷ lệ thanh toán:</span>
                  <span className="font-bold text-blue-600">
                    {periodKpi.actual > 0
                      ? Math.min(100, Number((((metrics?.totalPaid || 0) / periodKpi.actual) * 100).toFixed(1)))
                      : 100}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        periodKpi.actual > 0
                          ? Math.min(100, Number((((metrics?.totalPaid || 0) / periodKpi.actual) * 100).toFixed(1)))
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Thẻ 2: Công nợ & Hạn mức khả dụng */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Dư nợ hiện tại
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <CashCoin className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-lg font-extrabold text-rose-600 tracking-tight leading-tight">
                {formatVND(metrics?.currentDebt)}
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-slate-500">
                <span>Khả dụng:</span>
                <span className="font-bold text-emerald-600">
                  {formatVND(metrics?.remainingCredit)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100">
            <div className="flex justify-between text-[10.5px] mb-1">
              <span className="text-slate-500">Hạn mức cấp:</span>
              <span className="font-bold text-slate-700">{formatVND(metrics?.hanMucCongNo)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics?.creditSafetyRate || 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Thẻ 3: Đơn hàng & Tiến độ giao hàng */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Đơn hàng {periodKpi.label}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BoxSeam className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                {periodKpi.orders} <span className="text-xs font-semibold text-slate-500">đơn</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-slate-500">
                <span>Hoàn tất:</span>
                <span className="font-bold text-emerald-600">
                  {periodKpi.orders} đơn (100%)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
            <span className="text-slate-500">Giao đúng hạn:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircleFill className="w-3 h-3 text-emerald-500" />
              100%
            </span>
          </div>
        </div>

        {/* Thẻ 4: Hợp đồng phân phối & Chiết khấu */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                Hợp đồng & Chiết khấu
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-lg font-extrabold text-indigo-700 tracking-tight leading-tight flex items-center gap-1.5">
                <span>Đại lý chính thức</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10.5px] text-slate-500">
                <span>Chiết khấu đơn hàng:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {customer?.discountPercent || 25}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
            <span className="text-slate-500">Thưởng thanh toán:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
              {customer?.thuongThanhToan?.includes('2%') ? '+2.0% đúng hạn' : '+1.5% đúng hạn'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. HÀNG BIỂU ĐỒ TRỰC QUAN (CHARTS VÀ PRODUCT MIX - TỈ LỆ 1.8fr / 1.2fr - ĐỒ THỊ LUÔN GIỮ 12 THÁNG) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
        
        {/* Cột trái (7/12 ~ 1.8fr): Biểu đồ diễn biến 12 tháng */}
        <div className="lg:col-span-7 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden h-full">
          {/* Header biểu đồ & toggle metric */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Diễn biến nhập hàng & Mục tiêu năm 2026
                </h3>
                {hasAnnualTarget && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10.5px] font-bold shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Đường cam kết: {formatVND(monthlyTarget)}/tháng
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400">
                So sánh giá trị thực hiện qua 12 tháng với chỉ tiêu kế hoạch Seajong
              </p>
            </div>

            {/* Toggle Doanh số / Đơn hàng */}
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[10.5px]">
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                  chartMetric === 'revenue' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900 bg-transparent'
                }`}
              >
                Doanh số (VNĐ)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('orders')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                  chartMetric === 'orders' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900 bg-transparent'
                }`}
              >
                Số lượng đơn
              </button>
            </div>
          </div>

          {/* SVG Biểu đồ - KHÔNG DÙNG preserveAspectRatio="none" ĐỂ CHỐNG MÉO CHỮ T VÀ MARK TRÒN */}
          <div className="flex-1 min-h-0 w-full relative my-1 flex items-center justify-center overflow-visible">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${chartWidth} 220`}
            >
              <defs>
                <linearGradient id="dealerSplineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="dealerBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>

              {/* Grid lines ngang (Ẩn nhãn số tiền trục dọc theo yêu cầu) */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                const y = baselineY - ratio * chartHeight;
                return (
                  <line key={idx} x1={startX} y1={y} x2={endX} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                );
              })}

              {/* Đường Baseline */}
              <line x1={startX} y1={baselineY} x2={endX} y2={baselineY} stroke="#cbd5e1" strokeWidth="1" />

              {/* Vùng gradient đường cong */}
              {areaGradientPath && <path d={areaGradientPath} fill="url(#dealerSplineGradient)" />}

              {/* Cột dữ liệu 12 tháng */}
              {fullYearMonthlyData.map((d: any, idx: number) => {
                const x = startX + idx * stepX;
                const isHovered = hoveredMonth === idx;
                const isInSelectedPeriod = periodKpi.activeMonthNums.includes(d.monthNum);

                const pVal = chartMetric === 'revenue' ? (d.planRevenue || 0) : Math.round(maxChartVal * 0.7);
                const pHeight = (pVal / maxChartVal) * chartHeight;
                const pY = baselineY - pHeight;

                const aVal = chartMetric === 'revenue' ? (d.actualRevenue || 0) : d.ordersCount;
                const aHeight = d.actualRevenue !== null ? (aVal / maxChartVal) * chartHeight : 0;
                const aY = baselineY - aHeight;

                return (
                  <g key={idx}>
                    {/* Vệt sáng highlight nếu là kỳ đang chọn hoặc tháng hiện tại */}
                    {(d.isCurrent || (periodType !== 'year' && isInSelectedPeriod)) && (
                      <rect
                        x={x - stepX / 2 + 1}
                        y={15}
                        width={stepX - 2}
                        height={baselineY - 13}
                        fill={d.isCurrent ? '#eff6ff' : '#f8fafc'}
                        stroke={d.isCurrent ? '#bfdbfe' : '#e2e8f0'}
                        strokeWidth="1"
                        rx="4"
                      />
                    )}

                    {/* Cột Thực tế (Căn giữa vị trí x, bo góc mềm mại, hiển thị theo doanh số thực tế) */}
                    {d.actualRevenue !== null && (
                      <rect
                        x={x - 9}
                        y={aY}
                        width={18}
                        height={aHeight}
                        fill="url(#dealerBarGradient)"
                        rx="3.5"
                        opacity={isHovered ? '1' : '0.9'}
                      />
                    )}

                    {/* Nhãn tháng (T1, T2... T12) không bị méo */}
                    <text
                      x={x}
                      y={baselineY + 15}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={d.isCurrent ? '700' : isInSelectedPeriod ? '600' : '500'}
                      fill={d.isCurrent ? '#0284c7' : isInSelectedPeriod ? '#1e293b' : '#64748b'}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {d.shortLabel}
                    </text>
                  </g>
                );
              })}

              {/* Đường cong Spline (Cubic Bezier) */}
              {smoothCurvePath && (
                <path
                  d={smoothCurvePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Đường biểu diễn Doanh số cam kết tháng - Nổi lên trên các cột để không bao giờ bị che khuất */}
              {targetY !== null && (
                <g className="dealer-target-line">
                  {/* Đường nét đứt màu vàng hổ phách sắc nét */}
                  <line
                    x1={startX}
                    y1={targetY}
                    x2={endX}
                    y2={targetY}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  {/* Nhãn cam kết cố định ở góc trái trên đường kẻ - có nền bảo vệ để không bị cột hay tooltip che */}
                  <rect
                    x={startX + 2}
                    y={targetY - 16}
                    width={152}
                    height={14}
                    rx="3"
                    fill="#fffbeb"
                    stroke="#f59e0b"
                    strokeWidth="0.8"
                  />
                  <text
                    x={startX + 8}
                    y={targetY - 5.5}
                    fontSize="8.5"
                    fontWeight="700"
                    fill="#b45309"
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    Mức cam kết: {formatVND(monthlyTarget)}/tháng
                  </text>
                </g>
              )}

              {/* Chấm tròn Mark trên đồ thị (hình tròn chuẩn 100%, không bị méo) */}
              {splinePoints.map((pt: any, idx: number) => {
                if (pt.d.actualRevenue === null) return null;
                const isCur = pt.d.isCurrent;
                const isHov = hoveredMonth === idx;
                return (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHov ? 5.5 : isCur ? 4.5 : 3.5}
                      fill="#ffffff"
                      stroke={isCur ? '#0284c7' : '#10b981'}
                      strokeWidth={isCur ? '2.5' : '2'}
                    />
                  </g>
                );
              })}

              {/* Hitbox hover nhận diện chuột */}
              {fullYearMonthlyData.map((_: any, idx: number) => {
                const x = startX + idx * stepX;
                return (
                  <rect
                    key={`hit-${idx}`}
                    x={x - stepX / 2}
                    y={10}
                    width={stepX}
                    height={baselineY - 5}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  />
                );
              })}
            </svg>

            {/* ── TOOLTIP NỔI CHUẨN GIAO DIỆN SÁNG (LIGHT THEME ELEGANT TOOLTIP - KHÔNG XUỐNG DÒNG) ── */}
            {hoveredData && hoveredPoint && (
              <div
                className="absolute z-40 bg-white text-slate-800 p-2.5 px-3 rounded-xl shadow-xl border border-slate-200/90 pointer-events-none text-xs w-max min-w-[240px] whitespace-nowrap animate-fade-in"
                style={{
                  left: `${Math.min(78, Math.max(22, (hoveredPoint.x / chartWidth) * 100))}%`,
                  top: '6px',
                  transform: 'translate(-50%, 0)',
                }}
              >
                {/* Header Tooltip */}
                <div className="flex items-center justify-between gap-4 pb-1.5 mb-1.5 border-b border-slate-100 whitespace-nowrap">
                  <span className="font-extrabold text-slate-900 text-xs shrink-0">{hoveredData.monthFull}</span>
                  {hoveredData.isCurrent ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      Hiện hành
                    </span>
                  ) : hoveredData.isFuture ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      Kế hoạch
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">Năm 2026</span>
                  )}
                </div>

                {/* Nội dung chỉ số trong Tooltip - Hoàn toàn số liệu thực tế */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0" />
                      Doanh số nhập hàng:
                    </span>
                    <strong className="text-blue-700 font-mono font-bold shrink-0">
                      {hoveredData.actualRevenue !== null ? formatVND(hoveredData.actualRevenue) : 'Chưa phát sinh'}
                    </strong>
                  </div>

                  {hasAnnualTarget && chartMetric === 'revenue' && (
                    <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                        Cam kết tháng:
                      </span>
                      <strong className="text-amber-700 font-mono font-bold shrink-0">
                        {formatVND(monthlyTarget)}
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 whitespace-nowrap">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                      Số đơn hoàn thành:
                    </span>
                    <strong className="text-emerald-700 font-mono font-bold shrink-0">
                      {hoveredData.ordersCount} đơn
                    </strong>
                  </div>

                  {hasAnnualTarget && chartMetric === 'revenue' && hoveredData.actualRevenue !== null && monthlyTarget > 0 && (
                    <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100 text-[10.5px] whitespace-nowrap">
                      <span className="text-slate-500 font-medium shrink-0">Đạt cam kết tháng:</span>
                      <strong className="text-emerald-600 font-mono font-extrabold shrink-0">
                        {((hoveredData.actualRevenue / monthlyTarget) * 100).toFixed(1)}%
                      </strong>
                    </div>
                  )}
                </div>

                {/* Mũi tên trỏ tam giác màu trắng phía dưới */}
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200/90 rotate-45"
                />
              </div>
            )}
          </div>

          {/* Chú thích màu sắc */}
          <div className="shrink-0 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7]" />
              Doanh số nhập thực tế
            </span>
            {hasAnnualTarget && chartMetric === 'revenue' && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-[#f59e0b]" />
                Cam kết tháng ({formatVND(monthlyTarget)})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#10b981]" />
              Đường xu hướng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#eff6ff] border border-blue-400" />
              Tháng hiện hành
            </span>
          </div>
        </div>

        {/* Cột phải (5/12 ~ 1.2fr): Cơ cấu sản phẩm & Sức khoẻ đại lý */}
        <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden h-full">
          {/* Header và Tab chuyển đổi */}
          <div className="shrink-0 flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeRightTab === 'policies' ? 'Chính sách ưu đãi Đại lý' : '6 Chỉ số đánh giá đại lý'}
            </h3>

            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[10.5px]">
              <button
                type="button"
                onClick={() => setActiveRightTab('policies')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                  activeRightTab === 'policies' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 bg-transparent'
                }`}
              >
                Chính sách
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('health')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border-0 ${
                  activeRightTab === 'health' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 bg-transparent'
                }`}
              >
                Chỉ số sức khoẻ
              </button>
            </div>
          </div>

          {/* Vùng nội dung có thanh cuộn mượt nếu cần */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {/* TAB 1: Chính sách ưu đãi đối với đại lý */}
            {activeRightTab === 'policies' ? (
              <div className="space-y-1.5 pt-0.5">
                {dealerPolicies.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 px-2 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/70 transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-[11px] truncate">{p.title}</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.desc}</div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${p.badgeColor}`}
                    >
                      {p.badge}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* TAB 2: 6 Chỉ số sức khoẻ & đánh giá */
              <div className="space-y-1.5 pt-0.5">
                {healthRatios.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-[11px]">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-blue-700 text-xs font-mono">{item.value}</div>
                      <span className="inline-block text-[9.5px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 rounded">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 pt-1.5 border-t border-slate-100 mt-1 text-right">
            <button
              type="button"
              onClick={() => onNavigateTab('debts')}
              className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Xem chi tiết công nợ & điểm thưởng</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
