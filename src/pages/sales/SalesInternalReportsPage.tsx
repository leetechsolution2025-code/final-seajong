import React, { useState, useEffect } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import type { ModernStepItem } from '../../types';
import {
  PersonLinesFill,
  PersonBadge,
  CashCoin,
  CalendarCheck,
  CheckCircle,
  FileEarmarkBarGraph,
  GeoAlt,
} from 'react-bootstrap-icons';

const INTERNAL_REPORT_STEPS: ModernStepItem[] = [
  { num: 1, id: 'manager', title: 'Lãnh đạo phòng', desc: 'KPI Trưởng / Phó phòng', icon: 'bi-person-badge' },
  { num: 2, id: 'staff', title: 'Nhân viên kinh doanh', desc: 'KPI chuyên viên bán hàng', icon: 'bi-person-lines-fill' },
  { num: 3, id: 'income', title: 'Bảng tính thu nhập', desc: 'Lương & Hoa hồng 4%', icon: 'bi-cash-coin' },
];

export const SalesInternalReportsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedStaff, setSelectedStaff] = useState<string>('Phạm Quang Việt');
  const [managerPage, setManagerPage] = useState<number>(1);
  const [managerPageSize, setManagerPageSize] = useState<number>(5);
  const [staffPage, setStaffPage] = useState<number>(1);
  const [staffPageSize, setStaffPageSize] = useState<number>(5);

  // Manager KPI
  const [managerCriteria, setManagerCriteria] = useState([
    { stt: 'A.1', chiTieu: 'Đại lý Showroom đạt chuẩn mở mới', donVi: 'Đại lý', mucTieu: '3', trongSo: '30%', thucTe: '3', diem: '30', hoanThanh: '100%' },
    { stt: 'A.2', chiTieu: 'Doanh số tối thiểu toàn phòng', donVi: 'VNĐ', mucTieu: '550,000,000', trongSo: '40%', thucTe: '520,000,000', diem: '38', hoanThanh: '94.5%' },
    { stt: 'B.1', chiTieu: 'Tỷ lệ đại lý có đơn trong 30 ngày', donVi: '%', mucTieu: '90%', trongSo: '15%', thucTe: '88%', diem: '14', hoanThanh: '97.8%' },
    { stt: 'C.1', chiTieu: 'Kỷ luật, kế hoạch & Báo cáo insight thị trường', donVi: 'Check list', mucTieu: 'Đúng hạn', trongSo: '15%', thucTe: 'Tốt', diem: '15', hoanThanh: '100%' },
  ]);

  // Staff KPI
  const [staffCriteria, setStaffCriteria] = useState([
    { stt: '1', tieuChi: 'Doanh thu bán hàng cá nhân', donVi: 'VNĐ', chiTieu: '200,000,000', trongSo: '50%', thucTe: '185,000,000', diem: '46', hoanThanh: '92.5%' },
    { stt: '2', tieuChi: 'Doanh thu đại lý mới (10%)', donVi: 'VNĐ', chiTieu: '20,000,000', trongSo: '10%', thucTe: '18,000,000', diem: '9', hoanThanh: '90.0%' },
    { stt: '3', tieuChi: 'Đại lý mới ký hợp đồng trong tháng', donVi: 'Đại lý', chiTieu: '2', trongSo: '15%', thucTe: '2', diem: '15', hoanThanh: '100%' },
    { stt: '4', tieuChi: 'Báo cáo & Checkin thị trường hàng ngày', donVi: 'Checkin', chiTieu: 'Hàng ngày', trongSo: '25%', thucTe: '26/26 ngày', diem: '25', hoanThanh: '100%' },
  ]);

  // Income summary
  const incomeDetails = {
    baseSalary: 9000000,
    workingDays: 26,
    actualSalary: 9000000,
    allowance: 2500000, // Xăng xe, điện thoại, ăn trưa
    kpiBonus: 3500000, // Thưởng hoàn thành KPI 95 điểm
    actualRevenue: 185000000,
    commissionRate: 0.04, // 4%
    salesCommission: 7400000, // 185.000.000 * 4%
    totalIncome: 22400000,
  };

  const formatVND = (num: number) => num.toLocaleString('vi-VN') + ' đ';

  const tickerNews = [
    {
      badge: 'ĐÁNH GIÁ HIỆU QUẢ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Đánh giá hiệu quả công việc tháng ${selectedMonth}/${selectedYear} - Phòng Kinh doanh Seajong`,
    },
    {
      badge: 'ĐIỂM KPI BÌNH QUÂN',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Điểm KPI bình quân toàn phòng: 96 / 100 điểm (Xếp loại A - Đạt chuẩn xuất sắc)',
    },
    {
      badge: 'HOA HỒNG BÁN HÀNG',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'Tự động tính hoa hồng bán hàng 4% trên doanh số thực thu theo quy chế Seajong',
    },
  ];

  return (
    <StepPage
      title="Báo cáo nội bộ & Đánh giá KPI"
      badge="REPORTS"
      description="Theo dõi đánh giá hiệu quả công việc, bảng điểm KPI và tính toán thu nhập hoa hồng nhân sự"
      icon="bi-file-earmark-bar-graph"
      color="blue"
      steps={INTERNAL_REPORT_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      customTickerNews={tickerNews}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar theo đúng chuẩn AGENTS.MD ── */}
        <TableToolbar
          searchPlaceholder="Tìm kiếm tiêu chí đánh giá..."
          filters={[
            {
              value: String(selectedMonth),
              onChange: (v) => setSelectedMonth(Number(v)),
              options: Array.from({ length: 12 }, (_, i) => ({
                label: `Tháng ${i + 1}/${selectedYear}`,
                value: String(i + 1),
              })),
            },
            ...(currentStep >= 2
              ? [
                  {
                    value: selectedStaff,
                    onChange: setSelectedStaff,
                    options: [
                      { label: 'Phạm Quang Việt (Hà Nội)', value: 'Phạm Quang Việt' },
                      { label: 'Lê Công Vụ (Bắc Ninh)', value: 'Lê Công Vụ' },
                      { label: 'Nguyễn Văn Hoàn (Miền Trung)', value: 'Nguyễn Văn Hoàn' },
                    ],
                  },
                ]
              : []),
          ]}
          onRefresh={() => {}}
          onExportExcel={() => alert('Xuất bảng KPI & Lương hoa hồng ra Excel')}
        />

        {/* ── Nội dung từng bước ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* BƯỚC 1: BÁO CÁO LÃNH ĐẠO PHÒNG */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase text-blue-900 tracking-wide">
                    Chỉ tiêu Trưởng phòng / Phó trưởng phòng kinh doanh (Tháng {selectedMonth}/{selectedYear})
                  </h4>
                  <span className="text-[11px] text-blue-700">
                    Phụ trách: Phạm Quang Việt • Điểm KPI đạt: <strong>97 / 100 điểm</strong> (Xếp loại Xuất sắc)
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                  Hoàn thành 97%
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Chỉ tiêu công việc giao</th>
                      <th className="py-2.5 px-3 w-24 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">Mục tiêu</th>
                      <th className="py-2.5 px-3 text-center w-24">Trọng số</th>
                      <th className="py-2.5 px-3 text-right">Thực tế đạt</th>
                      <th className="py-2.5 px-3 text-center w-20">Điểm</th>
                      <th className="py-2.5 px-3 text-center w-28">Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {managerCriteria
                      .slice((managerPage - 1) * managerPageSize, managerPage * managerPageSize)
                      .map((row) => (
                      <tr key={row.stt} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">{row.stt}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.chiTieu}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{row.donVi}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{row.mucTieu}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{row.trongSo}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{row.thucTe}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{row.diem}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{row.hoanThanh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-200">
                  <Pagination
                    currentPage={managerPage}
                    totalItems={managerCriteria.length}
                    pageSize={managerPageSize}
                    onPageChange={setManagerPage}
                    onPageSizeChange={(sz) => {
                      setManagerPageSize(sz);
                      setManagerPage(1);
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    itemName="tiêu chí"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 2: BÁO CÁO NHÂN VIÊN KINH DOANH */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                    Bảng điểm KPI Nhân viên: <span className="text-blue-700">{selectedStaff}</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Kỳ đánh giá: Tháng {selectedMonth}/{selectedYear} • Tổng điểm KPI: <strong>95 / 100 điểm</strong>
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                  Loại A (Đạt KPI)
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Tiêu chí đánh giá</th>
                      <th className="py-2.5 px-3 w-24 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">Chỉ tiêu</th>
                      <th className="py-2.5 px-3 text-center w-24">Trọng số</th>
                      <th className="py-2.5 px-3 text-right">Thực tế</th>
                      <th className="py-2.5 px-3 text-center w-20">Điểm</th>
                      <th className="py-2.5 px-3 text-center w-28">Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffCriteria
                      .slice((staffPage - 1) * staffPageSize, staffPage * staffPageSize)
                      .map((row) => (
                      <tr key={row.stt} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">{row.stt}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.tieuChi}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{row.donVi}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{row.chiTieu}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">{row.trongSo}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{row.thucTe}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{row.diem}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{row.hoanThanh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-200">
                  <Pagination
                    currentPage={staffPage}
                    totalItems={staffCriteria.length}
                    pageSize={staffPageSize}
                    onPageChange={setStaffPage}
                    onPageSizeChange={(sz) => {
                      setStaffPageSize(sz);
                      setStaffPage(1);
                    }}
                    pageSizeOptions={[5, 10, 20]}
                    itemName="tiêu chí"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 3: BẢNG TÍNH THU NHẬP & HOA HỒNG */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-slate-500 block">Lương cơ bản theo ngày công:</span>
                  <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                    {formatVND(incomeDetails.actualSalary)}
                  </span>
                  <span className="text-[10.5px] text-slate-400">26 ngày công chuẩn</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-slate-500 block">Phụ cấp công tác & thị trường:</span>
                  <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">
                    {formatVND(incomeDetails.allowance)}
                  </span>
                  <span className="text-[10.5px] text-slate-400">Xăng xe, điện thoại, ăn trưa</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[11px] text-blue-700 block">Hoa hồng bán hàng (4%):</span>
                  <span className="text-base font-black text-blue-700 font-mono mt-0.5 block">
                    {formatVND(incomeDetails.salesCommission)}
                  </span>
                  <span className="text-[10.5px] text-blue-600">4% x {formatVND(incomeDetails.actualRevenue)}</span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-[11px] text-emerald-700 font-bold block">Tổng thu nhập thực lĩnh:</span>
                  <span className="text-lg font-black text-emerald-800 font-mono mt-0.5 block">
                    {formatVND(incomeDetails.totalIncome)}
                  </span>
                  <span className="text-[10.5px] text-emerald-600">Đã bao gồm thưởng KPI</span>
                </div>
              </div>

              {/* Chi tiết công thức */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-xs uppercase text-slate-800">
                  Quy chế chi trả thu nhập & hoa hồng bán hàng Seajong 2026
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  1. <strong>Hoa hồng bán hàng:</strong> Được tính tự động bằng <strong>4% trên doanh số thực thu</strong> của các đơn hàng xuất kho thành công do nhân viên trực tiếp phụ trách.
                  <br />
                  2. <strong>Thưởng KPI tháng:</strong> Đạt từ 90 đến 100 điểm thưởng 3.500.000 đ; Đạt từ 80 đến 89 điểm thưởng 2.000.000 đ; Dưới 70 điểm không có thưởng KPI.
                  <br />
                  3. <strong>Thời gian chi trả:</strong> Ngày 05 hàng tháng cùng kỳ lương của công ty.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </StepPage>
  );
};

export default SalesInternalReportsPage;
