import React, { useState, useEffect } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import {
  GraphUpArrow,
  Receipt,
  BagCheck,
  Building,
  Trophy,
  ArrowUpRight,
  PieChart,
} from 'react-bootstrap-icons';

export const SalesBusinessResultsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [repsPage, setRepsPage] = useState(1);
  const [repsPageSize, setRepsPageSize] = useState(5);
  const [dealersPage, setDealersPage] = useState(1);
  const [dealersPageSize, setDealersPageSize] = useState(5);
  const [summary, setSummary] = useState({
    totalSales: 3824500000,
    totalRevenue: 3518000000,
    targetRevenue: 4500000000,
    totalOrdersCount: 142,
    totalDebt: 306500000,
    dealersCount: 128,
  });

  const [topSalesReps, setTopSalesReps] = useState([
    { stt: 1, name: 'Phạm Quang Việt', area: 'Hà Nội & Miền Bắc', orders: 48, revenue: 1450000000, target: 1500000000, completion: '96.7%', bonus: '58.000.000 đ' },
    { stt: 2, name: 'Lê Công Vụ', area: 'Bắc Ninh & Hải Phòng', orders: 36, revenue: 1120000000, target: 1200000000, completion: '93.3%', bonus: '44.800.000 đ' },
    { stt: 3, name: 'Nguyễn Văn Hoàn', area: 'Miền Trung & Tây Nguyên', orders: 32, revenue: 780000000, target: 900000000, completion: '86.7%', bonus: '31.200.000 đ' },
    { stt: 4, name: 'Trần Thị Thuỷ (Ecom)', area: 'Toàn quốc (Shopee Mall)', orders: 26, revenue: 474500000, target: 500000000, completion: '94.9%', bonus: '18.980.000 đ' },
  ]);

  const [topDealers, setTopDealers] = useState([
    { rank: 1, name: 'Tổng Đại lý Minh Long Khánh (Hải Phòng)', code: 'DL-0012', revenue: 620000000, growth: '+28%', status: 'Xuất sắc' },
    { rank: 2, name: 'Showroom Thiết Bị Vệ Sinh An Gia Phát (Hà Nội)', code: 'DL-0045', revenue: 540000000, growth: '+35%', status: 'Xuất sắc' },
    { rank: 3, name: 'Đại lý Thiết Bị Sen Vòi Nam Hà (Hà Nam)', code: 'DL-0089', revenue: 380000000, growth: '+15%', status: 'Đạt chuẩn' },
    { rank: 4, name: 'Tổng Kho Vật Tư Xây Dựng Miền Trung (Đà Nẵng)', code: 'DL-0112', revenue: 310000000, growth: '+22%', status: 'Đạt chuẩn' },
  ]);

  useEffect(() => {
    fetch('/api/sales/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) setSummary(data.summary);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatVND = (num: number) => num.toLocaleString('vi-VN') + ' đ';

  const tickerNews = [
    {
      badge: 'DOANH SỐ LŨY KẾ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Doanh số lũy kế 10 tháng đầu năm 2026: <b>${formatVND(summary.totalSales)}</b> / Mục tiêu 4.5 Tỷ`,
    },
    {
      badge: 'THU HỒI CÔNG NỢ',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: `Tỷ lệ thu hồi công nợ đạt <b>${Math.round((summary.totalRevenue / (summary.totalSales || 1)) * 100)}%</b> - Đảm bảo an toàn dòng tiền`,
    },
    {
      badge: 'NHÂN SỰ XUẤT SẮC',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'Top 1 Nhân viên kinh doanh xuất sắc: Phạm Quang Việt (Đạt 96.7% kế hoạch năm)',
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
          searchPlaceholder="Tìm kiếm nhân sự hoặc đại lý xuất sắc..."
          onRefresh={() => setLoading(true)}
          onExportExcel={() => alert('Đang xuất báo cáo kết quả kinh doanh...')}
        />

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block">
                Tổng doanh số xuất kho
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
                Tỷ lệ thu tiền: {Math.round((summary.totalRevenue / summary.totalSales) * 100)}%
              </span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide block">
                Tiến độ chỉ tiêu năm 2026
              </span>
              <span className="text-xl font-black text-amber-900 font-mono mt-1 block">
                {Math.round((summary.totalRevenue / summary.targetRevenue) * 100)}%
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
                {summary.dealersCount} Đại lý
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
              <span className="text-[11px] text-slate-500">Cập nhật đến ngày hôm nay</span>
            </div>
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
                {topSalesReps
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
            <div className="border-t border-slate-200">
              <Pagination
                currentPage={repsPage}
                totalItems={topSalesReps.length}
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
                Top 4 Đại lý phân phối có doanh thu cao nhất năm 2026
              </h4>
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">Top</th>
                  <th className="py-2.5 px-3">Tên đại lý / Doanh nghiệp</th>
                  <th className="py-2.5 px-3 w-28">Mã đại lý</th>
                  <th className="py-2.5 px-3 text-right">Doanh số lũy kế</th>
                  <th className="py-2.5 px-3 text-center">Tăng trưởng</th>
                  <th className="py-2.5 px-3 text-center w-28">Xếp hạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDealers
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
            <div className="border-t border-slate-200">
              <Pagination
                currentPage={dealersPage}
                totalItems={topDealers.length}
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
