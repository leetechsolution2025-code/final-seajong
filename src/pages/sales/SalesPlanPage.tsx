import React, { useState, useEffect } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import type { ModernStepItem } from '../../types';
import {
  CalendarRange,
  Calendar3,
  DatabaseFillCheck,
  CheckCircle,
  Save,
  Pencil,
  GraphUp,
  People,
  CashStack,
} from 'react-bootstrap-icons';

const PLAN_STEPS: ModernStepItem[] = [
  { num: 1, id: 'yearly', title: 'Kế hoạch năm', desc: 'Chỉ tiêu doanh thu năm 2026', icon: 'bi-calendar-range' },
  { num: 2, id: 'monthly', title: 'Kế hoạch tháng', desc: 'Phân bổ 12 tháng', icon: 'bi-calendar3' },
  { num: 3, id: 'data', title: 'Dữ liệu & Kịch bản', desc: 'Tổng hợp & Dự báo', icon: 'bi-database-fill-check' },
];

export const SalesPlanPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'seajong' | 'oem'>('seajong');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [monthlyPage, setMonthlyPage] = useState<number>(1);
  const [monthlyPageSize, setMonthlyPageSize] = useState<number>(6);

  // Kế hoạch năm
  const [yearlyTargets, setYearlyTargets] = useState([
    { stt: '1', item: 'Doanh thu từ đại lý lắp kệ mới', target: 2100000000, share: '46.7%', note: '20 showroom mới x 105 triệu' },
    { stt: '2', item: 'Doanh thu từ đại lý chính thức (gối đầu)', target: 1600000000, share: '35.6%', note: 'Duy trì đơn hàng định kỳ hàng tháng' },
    { stt: '3', item: 'Doanh thu từ kênh Shopee Mall & Ecom', target: 300000000, share: '6.7%', note: 'Kênh bán lẻ thương hiệu trực tiếp' },
    { stt: '4', item: 'Doanh thu từ dự án & nhà thầu B2B', target: 500000000, share: '11.0%', note: 'Cung cấp công trình biệt thự, khách sạn' },
  ]);

  // Quỹ lương phòng kinh doanh
  const staffSalaryRows = [
    { stt: '1', role: 'Phó trưởng phòng Kinh doanh', salary: 21000000, qty: 1, total: 252000000 },
    { stt: '2', role: 'NVKD Ecom + CSKH', salary: 10000000, qty: 1, total: 120000000 },
    { stt: '3', role: 'NVKD Thị trường Miền Bắc (Seajong)', salary: 9000000, qty: 2, total: 216000000 },
    { stt: '4', role: 'NVKD Thị trường Miền Trung & Nam', salary: 9000000, qty: 1, total: 108000000 },
  ];

  // Kế hoạch tháng (12 tháng)
  const [monthlyTargets, setMonthlyTargets] = useState([
    { month: 'Tháng 1', lapKe: 1, chinhThuc: 0, target: 714000000, ecom: 10000000, b2b: 50000000 },
    { month: 'Tháng 2', lapKe: 0, chinhThuc: 0, target: 84000000, ecom: 5000000, b2b: 20000000 },
    { month: 'Tháng 3', lapKe: 1, chinhThuc: 0, target: 1070000000, ecom: 15000000, b2b: 100000000 },
    { month: 'Tháng 4', lapKe: 0, chinhThuc: 0, target: 800000000, ecom: 20000000, b2b: 80000000 },
    { month: 'Tháng 5', lapKe: 0, chinhThuc: 0, target: 181000000, ecom: 15000000, b2b: 30000000 },
    { month: 'Tháng 6', lapKe: 0, chinhThuc: 0, target: 51000000, ecom: 10000000, b2b: 20000000 },
    { month: 'Tháng 7', lapKe: 2, chinhThuc: 0, target: 430000000, ecom: 15000000, b2b: 50000000 },
    { month: 'Tháng 8', lapKe: 2, chinhThuc: 0, target: 555000000, ecom: 20000000, b2b: 70000000 },
    { month: 'Tháng 9', lapKe: 2, chinhThuc: 8, target: 1600000000, ecom: 20000000, b2b: 380000000 },
    { month: 'Tháng 10', lapKe: 1, chinhThuc: 10, target: 1550000000, ecom: 25000000, b2b: 380000000 },
    { month: 'Tháng 11', lapKe: 1, chinhThuc: 11, target: 1630000000, ecom: 30000000, b2b: 400000000 },
    { month: 'Tháng 12', lapKe: 1, chinhThuc: 12, target: 1610000000, ecom: 30000000, b2b: 380000000 },
  ]);

  useEffect(() => {
    fetch('/api/sales/plan')
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) {
          // Parse if present
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatVND = (num: number) => num.toLocaleString('vi-VN') + ' đ';

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      await fetch('/api/sales/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: 2026,
          planRows: yearlyTargets,
          monthlyTargets,
        }),
      });
      alert('Đã lưu thành công Kế hoạch Kinh doanh 2026!');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const totalYearTarget = yearlyTargets.reduce((s, r) => s + r.target, 0);

  const tickerNews = [
    {
      badge: 'CHỈ TIÊU NĂM',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: 'Tổng chỉ tiêu doanh thu năm 2026: <b>4.500.000.000 đ</b> (4.5 Tỷ VNĐ) trên toàn quốc',
    },
    {
      badge: 'MỞ MỚI SHOWROOM',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Kế hoạch mở mới 20 đại lý showroom lắp quầy kệ trưng bày đạt chuẩn Seajong',
    },
    {
      badge: 'CHIẾN LƯỢC QUÝ IV',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'Đẩy mạnh doanh thu Quý IV phục vụ mùa cao điểm hoàn thiện nhà công trình cuối năm',
    },
  ];

  return (
    <StepPage
      title="Lập kế hoạch sale"
      badge="SALES PLAN"
      description="Quản lý và thiết lập chỉ tiêu doanh số năm, phân bổ tháng và dự báo tăng trưởng"
      icon="bi-calendar-check"
      color="blue"
      steps={PLAN_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      customTickerNews={tickerNews}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar chuẩn theo AGENTS.MD ── */}
        <TableToolbar
          searchPlaceholder="Tìm kiếm dòng chỉ tiêu kế hoạch..."
          customFilters={
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('seajong')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'seajong'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SEAJONG FAUCET
              </button>
              <button
                onClick={() => setActiveTab('oem')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'oem'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GIA CÔNG OEM
              </button>
            </div>
          }
          rightActions={
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSavePlan}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu kế hoạch'}
            </Button>
          }
          onRefresh={() => setLoading(true)}
          onExportExcel={() => alert('Xuất kế hoạch kinh doanh ra Excel')}
        />

        {/* ── Nội dung từng bước ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* BƯỚC 1: KẾ HOẠCH NĂM */}
          {currentStep === 1 && (
            <div className="space-y-3">
              {/* Thống kê nhanh */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block">
                    Tổng mục tiêu doanh số 2026
                  </span>
                  <span className="text-xl font-black text-blue-900 font-mono mt-1 block">
                    {formatVND(totalYearTarget)}
                  </span>
                  <span className="text-[11px] text-blue-600 mt-1 block">
                    Tăng trưởng 35% so với cùng kỳ năm 2025
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide block">
                    Chỉ tiêu đại lý lắp kệ mới
                  </span>
                  <span className="text-xl font-black text-emerald-900 font-mono mt-1 block">
                    20 Showroom
                  </span>
                  <span className="text-[11px] text-emerald-600 mt-1 block">
                    Doanh thu dự kiến: 2.100.000.000 đ
                  </span>
                </div>

                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide block">
                    Tổng ngân sách lương NVKD
                  </span>
                  <span className="text-xl font-black text-purple-900 font-mono mt-1 block">
                    696.000.000 đ
                  </span>
                  <span className="text-[11px] text-purple-600 mt-1 block">
                    Định biên 5 nhân sự kinh doanh thị trường
                  </span>
                </div>
              </div>

              {/* Bảng mục tiêu doanh số năm */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wide">
                    I. Phân bổ mục tiêu doanh số theo nhóm kênh bán hàng (Năm 2026)
                  </h4>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Hạng mục chỉ tiêu kinh doanh</th>
                      <th className="py-2.5 px-3 text-right">Doanh số mục tiêu</th>
                      <th className="py-2.5 px-3 text-center w-24">Tỷ trọng</th>
                      <th className="py-2.5 px-3">Ghi chú & Thuyết minh kế hoạch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearlyTargets.map((row) => (
                      <tr key={row.stt} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{row.stt}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.item}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                          {formatVND(row.target)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {row.share}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{row.note}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50/40 font-bold border-t-2 border-blue-200">
                      <td colSpan={2} className="py-2.5 px-3 text-blue-900 text-right uppercase">
                        Tổng cộng kế hoạch năm 2026:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-900 text-sm">
                        {formatVND(totalYearTarget)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-900">100%</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <div className="border-t border-slate-200">
                  <Pagination
                    currentPage={1}
                    totalItems={yearlyTargets.length}
                    pageSize={10}
                    itemName="kênh"
                  />
                </div>
              </div>

              {/* Bảng quỹ lương nhân sự */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wide">
                    II. Quỹ lương định biên nhân sự phòng kinh doanh
                  </h4>
                </div>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Vị trí nhân sự</th>
                      <th className="py-2.5 px-3 text-right">Lương cơ bản / tháng</th>
                      <th className="py-2.5 px-3 text-center w-24">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Tổng ngân sách năm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffSalaryRows.map((s) => (
                      <tr key={s.stt} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">{s.stt}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{s.role}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatVND(s.salary)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                          {s.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {formatVND(s.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-200">
                  <Pagination
                    currentPage={1}
                    totalItems={staffSalaryRows.length}
                    pageSize={10}
                    itemName="vị trí"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 2: KẾ HOẠCH THÁNG */}
          {currentStep === 2 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wide">
                  Phân bổ chỉ tiêu doanh thu & đại lý mới theo 12 tháng (Năm 2026)
                </h4>
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                    <th className="py-2.5 px-3 w-28">Tháng</th>
                    <th className="py-2.5 px-3 text-center">ĐL lắp kệ mới</th>
                    <th className="py-2.5 px-3 text-center">ĐL chính thức</th>
                    <th className="py-2.5 px-3 text-right">Chỉ tiêu tổng (VNĐ)</th>
                    <th className="py-2.5 px-3 text-right">Kênh Shopee</th>
                    <th className="py-2.5 px-3 text-right">Kênh Dự án B2B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyTargets
                    .slice((monthlyPage - 1) * monthlyPageSize, monthlyPage * monthlyPageSize)
                    .map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-blue-700">{m.month}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {m.lapKe > 0 ? `+${m.lapKe} ĐL` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                          {m.chinhThuc > 0 ? `${m.chinhThuc} ĐL` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {formatVND(m.target)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatVND(m.ecom)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatVND(m.b2b)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="border-t border-slate-200">
                <Pagination
                  currentPage={monthlyPage}
                  totalItems={monthlyTargets.length}
                  pageSize={monthlyPageSize}
                  onPageChange={setMonthlyPage}
                  onPageSizeChange={(sz) => {
                    setMonthlyPageSize(sz);
                    setMonthlyPage(1);
                  }}
                  pageSizeOptions={[6, 12]}
                  itemName="tháng"
                />
              </div>
            </div>
          )}

          {/* BƯỚC 3: DỮ LIỆU & KỊCH BẢN */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <h4 className="font-bold text-xs uppercase text-blue-900 tracking-wide flex items-center gap-1.5">
                  <GraphUp className="w-4 h-4 text-blue-600" />
                  Kịch bản tăng trưởng cơ bản (Base Case)
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  - Đạt doanh thu 4.5 tỷ đồng với 20 đại lý showroom mới tại các đô thị trọng điểm: Hà Nội, Hải Phòng, Bắc Ninh, Quảng Ninh, Thanh Hoá, Đà Nẵng, Bình Dương và TP.HCM.
                  <br />
                  - Tỷ lệ giữ chân và tái đặt hàng của đại lý cũ đạt trên 85%.
                  <br />
                  - Sản phẩm sen cây phím đàn mạ PVD tiếp tục là đầu tàu kéo doanh số các dòng phụ kiện.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                <h4 className="font-bold text-xs uppercase text-emerald-900 tracking-wide flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Kịch bản bứt phá (Best Case)
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  - Vượt kế hoạch 20%, đạt doanh thu 5.4 tỷ đồng nếu chốt thành công 2 gói dự án căn hộ cao cấp tại Hà Nội và TP.HCM trong Quý 4.
                  <br />
                  - Kênh TikTok Shop & Shopee Mall phát triển mạnh mảng vòi lavabo cảm ứng và phụ kiện phòng tắm thông minh.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </StepPage>
  );
};

export default SalesPlanPage;
