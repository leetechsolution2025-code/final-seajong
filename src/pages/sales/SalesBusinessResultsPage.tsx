import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import {
  Building,
  Trophy,
} from 'react-bootstrap-icons';

interface SalesRepRankItem {
  stt: number;
  name: string;
  area: string;
  orders: number;
  revenue: number;
  target: number;
  completion: string;
  bonus: string;
}

interface DealerRankItem {
  rank: number;
  name: string;
  code: string;
  revenue: number;
  growth: string;
  status: string;
}

export const SalesBusinessResultsPage: React.FC = () => {
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [repsPage, setRepsPage] = useState(1);
  const [repsPageSize, setRepsPageSize] = useState(5);
  const [dealersPage, setDealersPage] = useState(1);
  const [dealersPageSize, setDealersPageSize] = useState(10);

  const [summary, setSummary] = useState({
    totalSales: 0,
    totalRevenue: 0,
    targetRevenue: 4500000000,
    totalOrdersCount: 0,
    totalDebt: 0,
    dealersCount: 0,
  });

  const [topSalesReps, setTopSalesReps] = useState<SalesRepRankItem[]>([]);
  const [topDealers, setTopDealers] = useState<DealerRankItem[]>([]);

  const loadBusinessResults = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, overviewRes, custRes] = await Promise.all([
        fetch('/api/sales/dashboard'),
        fetch('/api/sales/overview-stats?period=year&year=2026'),
        fetch('/api/plan-finance/customers?page=1&pageSize=200'),
      ]);

      const dashData = dashRes.ok ? await dashRes.json() : null;
      const overviewData = overviewRes.ok ? await overviewRes.json() : null;
      const custData = custRes.ok ? await custRes.json() : null;

      // 1. Summary: Ưu tiên số thực tế từ overview-stats (Seajong + OEM + DebtPayment)
      const realSales = overviewData?.periodData?.sales?.actual
        ? Math.round(Number(overviewData.periodData.sales.actual) * 1e9)
        : Number(dashData?.summary?.totalSales) || 0;
      const realRevenue = overviewData?.periodData?.revenue?.actual
        ? Math.round(Number(overviewData.periodData.revenue.actual) * 1e9)
        : Number(dashData?.summary?.totalRevenue) || 0;
      const realTarget = overviewData?.periodData?.revenue?.target
        ? Math.round(Number(overviewData.periodData.revenue.target) * 1e9)
        : Number(dashData?.summary?.targetRevenue) || 4500000000;
      const parsedOrders = overviewData?.periodData?.contracts
        ? parseInt(String(overviewData.periodData.contracts).replace(/\D/g, ''), 10) || 0
        : Number(dashData?.summary?.totalOrdersCount) || 0;

      const customerList: any[] = Array.isArray(custData?.customers) ? custData.customers : [];
      const dealersCount =
        customerList.filter((c) => {
          const nhom = String(c.nhom || '').toLowerCase();
          return nhom.includes('dai-ly') || nhom.includes('showroom');
        }).length ||
        customerList.length ||
        Number(dashData?.summary?.dealersCount) ||
        0;

      setSummary({
        totalSales: realSales,
        totalRevenue: realRevenue,
        targetRevenue: realTarget,
        totalOrdersCount: parsedOrders,
        totalDebt: Math.max(0, realSales - realRevenue),
        dealersCount,
      });

      // 2. Xếp hạng NVKD thực tế từ DB
      if (Array.isArray(dashData?.topSalesReps) && dashData.topSalesReps.length > 0) {
        setTopSalesReps(dashData.topSalesReps);
      } else if (customerList.length > 0) {
        const repMap = new Map<string, { name: string; area: string; orders: number; revenue: number }>();
        customerList.forEach((c) => {
          const repName = c.nguoiPhuTrachName || c.employeeName || 'Lê Công Vụ';
          const ordCnt = Number(c.orderCount || (Array.isArray(c.orders) ? c.orders.length : 0)) || 0;
          const rev = Number(c.totalRevenue || c.tongDoanhSo || 0) || 0;
          if (ordCnt === 0 && rev === 0) return;
          const cur = repMap.get(repName) || {
            name: repName,
            area: 'Hà Nội & Toàn quốc',
            orders: 0,
            revenue: 0,
          };
          cur.orders += ordCnt;
          cur.revenue += rev;
          repMap.set(repName, cur);
        });
        const computedReps = Array.from(repMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .map((r, idx) => {
            const target = idx === 0 ? 3000000000 : idx === 1 ? 500000000 : 250000000;
            return {
              stt: idx + 1,
              name: r.name,
              area: r.area,
              orders: r.orders,
              revenue: Math.round(r.revenue),
              target,
              completion: ((r.revenue / target) * 100).toFixed(1) + '%',
              bonus: Math.round(r.revenue * 0.02).toLocaleString('vi-VN') + ' đ',
            };
          });
        setTopSalesReps(computedReps);
      }

      // 3. Top Đại lý / Khách hàng có doanh thu cao nhất từ DB thực tế
      if (Array.isArray(dashData?.topDealers) && dashData.topDealers.length > 0) {
        setTopDealers(dashData.topDealers);
      } else if (customerList.length > 0) {
        const computedDealers: DealerRankItem[] = customerList
          .map((c) => {
            const ordCnt = Number(c.orderCount || (Array.isArray(c.orders) ? c.orders.length : 0)) || 0;
            const rev =
              Number(c.totalRevenue || c.tongDoanhSo || 0) ||
              (Array.isArray(c.orders)
                ? c.orders.reduce((s: number, o: any) => s + (Number(o.tongTien) || 0), 0)
                : 0);
            return {
              name: c.name || 'Khách hàng Seajong',
              code: c.code || `KH-${String(c.id || '').slice(-4).toUpperCase()}`,
              orders: ordCnt,
              revenue: Math.round(rev),
            };
          })
          .filter((d) => d.revenue > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .map((d, idx) => ({
            rank: idx + 1,
            name: d.name,
            code: d.code,
            revenue: d.revenue,
            growth: `${d.orders} đơn hàng`,
            status: d.revenue >= 200000000 ? 'Xuất sắc' : d.revenue >= 100000000 ? 'Tiêu biểu' : 'Đạt chuẩn',
          }));
        setTopDealers(computedDealers);
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

  const filteredReps = useMemo(() => {
    if (!searchTerm.trim()) return topSalesReps;
    const q = searchTerm.toLowerCase();
    return topSalesReps.filter(
      (r) => r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q)
    );
  }, [topSalesReps, searchTerm]);

  const filteredDealers = useMemo(() => {
    if (!searchTerm.trim()) return topDealers;
    const q = searchTerm.toLowerCase();
    return topDealers.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [topDealers, searchTerm]);

  const formatVND = (num: number) => (Number(num) || 0).toLocaleString('vi-VN') + ' đ';

  const topRepName = topSalesReps[0]?.name || 'Lê Công Vụ';
  const topRepComp = topSalesReps[0]?.completion || '96.8%';

  const tickerNews = [
    {
      badge: 'DOANH SỐ LŨY KẾ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Doanh số lũy kế năm 2026: <b>${formatVND(summary.totalSales)}</b> (${summary.totalOrdersCount} đơn hàng)`,
    },
    {
      badge: 'THU HỒI CÔNG NỢ',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: `Tỷ lệ thu hồi tiền hàng đạt <b>${summary.totalSales > 0 ? Math.round((summary.totalRevenue / summary.totalSales) * 100) : 0}%</b> - Đảm bảo an toàn dòng tiền`,
    },
    {
      badge: 'NHÂN SỰ XUẤT SẮC',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: `Top 1 Nhân sự kinh doanh dẫn đầu doanh số: <b>${topRepName}</b> (${topRepComp})`,
    },
  ];

  return (
    <StandardPage
      title="Kết quả kinh doanh theo thời gian thực"
      badge="RESULTS"
      description="Tổng hợp doanh thu, tỷ lệ hoàn thành KPI và xếp hạng thành tích mạng lưới phân phối Seajong"
      icon="bi-graph-up-arrow"
      color="blue"
      customTickerNews={tickerNews}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        <TableToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setRepsPage(1);
            setDealersPage(1);
          }}
          searchPlaceholder="Tìm kiếm nhân sự hoặc đại lý xuất sắc..."
          onRefresh={loadBusinessResults}
          onExportExcel={() => alert('Đang xuất báo cáo kết quả kinh doanh...')}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block">
                Tổng doanh số ký
              </span>
              <span className="text-xl font-black text-blue-900 font-mono mt-1 block">
                {formatVND(summary.totalSales)}
              </span>
              <span className="text-[11px] text-blue-600 mt-1 block">
                Đã xử lý {summary.totalOrdersCount} đơn hàng
              </span>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide block">
                Doanh thu thực thu
              </span>
              <span className="text-xl font-black text-emerald-900 font-mono mt-1 block">
                {formatVND(summary.totalRevenue)}
              </span>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                Tỷ lệ thu tiền: {summary.totalSales > 0 ? Math.round((summary.totalRevenue / summary.totalSales) * 100) : 0}%
              </span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide block">
                Tiến độ chỉ tiêu năm 2026
              </span>
              <span className="text-xl font-black text-amber-900 font-mono mt-1 block">
                {summary.targetRevenue > 0 ? Math.round((summary.totalSales / summary.targetRevenue) * 100) : 0}%
              </span>
              <span className="text-[11px] text-amber-600 mt-1 block">
                Mục tiêu: {formatVND(summary.targetRevenue)}
              </span>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide block">
                Mạng lưới phân phối
              </span>
              <span className="text-xl font-black text-purple-900 font-mono mt-1 block">
                {summary.dealersCount} Đại lý / KH
              </span>
              <span className="text-[11px] text-purple-600 mt-1 block">
                Độ phủ: 63 tỉnh thành Việt Nam
              </span>
            </div>
          </div>

          {/* Bảng xếp hạng NVKD */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                Xếp hạng doanh số nhân sự kinh doanh (Năm 2026)
              </h4>
              <span className="text-[11px] text-slate-500">Đồng bộ từ đơn hàng thực tế</span>
            </div>
            <FullWidthTable>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">Hạng</th>
                    <th className="py-2.5 px-3">Họ và tên nhân sự</th>
                    <th className="py-2.5 px-3">Thị trường phụ trách</th>
                    <th className="py-2.5 px-3 text-center">Số đơn</th>
                    <th className="py-2.5 px-3 text-right">Doanh số thực tế</th>
                    <th className="py-2.5 px-3 text-right">Chỉ tiêu giao</th>
                    <th className="py-2.5 px-3 text-center">Hoàn thành</th>
                    <th className="py-2.5 px-3 text-right">Hoa hồng dự tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReps
                    .slice((repsPage - 1) * repsPageSize, repsPage * repsPageSize)
                    .map((rep) => (
                    <tr key={rep.stt} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                          rep.stt === 1 ? 'bg-amber-100 text-amber-800' : rep.stt === 2 ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {rep.stt}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{rep.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{rep.area}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium">{rep.orders}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                        {formatVND(rep.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatVND(rep.target)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                        {rep.completion}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                        {rep.bonus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
            <div className="border-t border-slate-200">
              <Pagination
                currentPage={repsPage}
                totalItems={filteredReps.length}
                pageSize={repsPageSize}
                onPageChange={setRepsPage}
                onPageSizeChange={(sz) => {
                  setRepsPageSize(sz);
                  setRepsPage(1);
                }}
                pageSizeOptions={[5, 10, 20]}
                itemName="nhân sự"
              />
            </div>
          </div>

          {/* Bảng Top Đại lý xuất sắc */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                Bảng xếp hạng Đại lý & Khách hàng có doanh số cao nhất năm 2026
              </h4>
              <span className="text-[11px] text-slate-500">{filteredDealers.length} đại lý / khách hàng</span>
            </div>
            <FullWidthTable>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">Top</th>
                    <th className="py-2.5 px-3">Tên đại lý / Doanh nghiệp</th>
                    <th className="py-2.5 px-3 w-28">Mã KH</th>
                    <th className="py-2.5 px-3 text-right">Doanh số lũy kế</th>
                    <th className="py-2.5 px-3 text-center">Quy mô đơn</th>
                    <th className="py-2.5 px-3 text-center w-28">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDealers
                    .slice((dealersPage - 1) * dealersPageSize, dealersPage * dealersPageSize)
                    .map((d) => (
                    <tr key={d.rank} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">{d.rank}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 font-semibold">{d.code}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatVND(d.revenue)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">{d.growth}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
            <div className="border-t border-slate-200">
              <Pagination
                currentPage={dealersPage}
                totalItems={filteredDealers.length}
                pageSize={dealersPageSize}
                onPageChange={setDealersPage}
                onPageSizeChange={(sz) => {
                  setDealersPageSize(sz);
                  setDealersPage(1);
                }}
                pageSizeOptions={[5, 10, 20]}
                itemName="đại lý"
              />
            </div>
          </div>
        </div>
      </div>
    </StandardPage>
  );
};

export default SalesBusinessResultsPage;
