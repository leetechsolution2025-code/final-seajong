import React from 'react';
import { BUDGET_CATEGORIES } from '../../pages/marketing/MarketingPlanPage';

export interface PlanPrintDocumentProps {
  id?: string;
  selectedYear: string;
  planDate?: string;
  valAgent: number;
  valAgentDev: number;
  valTraditional: number;
  valEcommerce: number;
  valQuota: number;
  valBranding: number;
  valSalary: number;
  valTravel: number;
  contentPillars: any[];
  adPlans: any[];
  monthlyBudgets: Record<number, number>;
  monthlyAllocations: Record<number, Record<string, { budget: number; note: string }>>;
  categoryBudgets?: Record<string, number>;
  rowPadding?: number;
  proposerSig?: string | null;
  approverSig?: string | null;
  proposerName?: string;
  approverName?: string;
  planStatus?: string;
}

export const PlanPrintDocument: React.FC<PlanPrintDocumentProps> = ({
  id = 'plan-print-doc',
  selectedYear,
  planDate = '2026-06-23',
  valAgent,
  valAgentDev,
  valTraditional,
  valEcommerce,
  valQuota,
  valBranding,
  valSalary,
  valTravel,
  contentPillars,
  adPlans,
  monthlyBudgets,
  monthlyAllocations,
  categoryBudgets = {},
  rowPadding = 4,
  proposerSig,
  approverSig,
  proposerName = 'Nguyễn Thu Huyền',
  approverName = 'Lê Anh Văn',
  planStatus = 'draft',
}) => {
  const totalRevenue = valAgent + valAgentDev + valTraditional + valEcommerce;
  const totalMarketingBudget = valBranding + valSalary + valTravel;
  const totalAllocatedMonthly = Object.values(monthlyBudgets).reduce((sum, v) => sum + (v || 0), 0);

  const agencyCats = BUDGET_CATEGORIES.slice(0, 3);
  const advCats = BUDGET_CATEGORIES.slice(3);

  const getCatTotal = (catId: string) => {
    let sum = 0;
    for (let m = 1; m <= 12; m++) {
      sum += (monthlyAllocations[m]?.[catId]?.budget || 0);
    }
    return sum || categoryBudgets[catId] || 0;
  };

  return (
    <div
      id={id}
      className="bg-white text-slate-900 font-sans shadow-lg print:shadow-none"
      style={{
        fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif",
        lineHeight: 1.35,
        fontSize: '12px',
      }}
    >
      {/* ════════════════════ PAGE 1: TRANG BÌA & TỔNG QUAN ════════════════════ */}
      <section className="pdf-content-page p-10 bg-white border-b border-slate-300 min-h-[1100px] flex flex-col justify-between">
        <div>
          {/* Header công ty */}
          <div className="flex items-start justify-between border-b-2 border-[#003087] pb-4 mb-8">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-lg bg-[#003087] text-white flex items-center justify-center font-black text-2xl tracking-wider shadow-sm">
                SJ
              </div>
              <div>
                <h1 className="text-base font-black tracking-wide text-[#003087] uppercase leading-tight">
                  CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM
                </h1>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Thiết bị sen vòi & Phụ kiện phòng tắm tiêu chuẩn Hàn Quốc
                </p>
                <p className="text-[10px] text-slate-400">
                  Địa chỉ: KCN Tân Quang, Văn Lâm, Hưng Yên · Hotline: 1900 633 896
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                MÃ TÀI LIỆU
              </div>
              <div className="text-xs font-mono font-bold text-[#003087]">
                KH-MKT-{selectedYear}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Ngày lập: {planDate}
              </div>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  planStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : planStatus === 'pending_approval'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {planStatus === 'approved'
                  ? 'ĐÃ PHÊ DUYỆT'
                  : planStatus === 'pending_approval'
                  ? 'CHỜ PHÊ DUYỆT'
                  : 'BẢN THẢO (DRAFT)'}
              </span>
            </div>
          </div>

          {/* Tiêu đề văn bản */}
          <div className="text-center my-8">
            <h2 className="text-2xl font-black text-[#003087] uppercase tracking-wide">
              KẾ HOẠCH MARKETING TOÀN DIỆN NĂM {selectedYear}
            </h2>
            <p className="text-xs text-slate-600 mt-1 italic">
              Chiến lược phủ sóng thương hiệu Seajong & Thúc đẩy phát triển kênh đại lý phân phối 63 tỉnh thành
            </p>
          </div>

          {/* Thẻ tóm tắt chỉ số */}
          <div className="grid grid-cols-4 gap-3 my-6">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Mục tiêu Doanh thu</div>
              <div className="text-base font-bold text-[#003087] mt-0.5 font-mono">
                {totalRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Toàn hệ thống năm {selectedYear}</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Định mức Ngân sách</div>
              <div className="text-base font-bold text-emerald-700 mt-0.5 font-mono">
                {valQuota.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {totalRevenue > 0 ? ((valQuota / totalRevenue) * 100).toFixed(1) : 0}% Doanh thu
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Chi phí Branding & Ads</div>
              <div className="text-base font-bold text-blue-700 mt-0.5 font-mono">
                {valBranding.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Quảng cáo & phát triển thương hiệu</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">Đã phân bổ 12 tháng</div>
              <div className="text-base font-bold text-indigo-700 mt-0.5 font-mono">
                {totalAllocatedMonthly.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {valBranding > 0 ? ((totalAllocatedMonthly / valBranding) * 100).toFixed(1) : 0}% ngân sách
              </div>
            </div>
          </div>

          {/* PHẦN I: CƠ CẤU DOANH THU & CHI PHÍ MARKETING */}
          <div className="mt-8">
            <h3 className="text-xs font-bold text-[#003087] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#003087]" />
              PHẦN I. CƠ CẤU DOANH THU & ĐỊNH MỨC TÀI CHÍNH MARKETING
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Bảng Doanh thu */}
              <table className="w-full text-xs border border-slate-200 rounded-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                    <th className="p-2">Kênh Doanh thu</th>
                    <th className="p-2 text-right">Mục tiêu (VNĐ)</th>
                    <th className="p-2 text-right">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2">1. Doanh thu Đại lý hiện hữu</td>
                    <td className="p-2 text-right font-mono font-medium">{valAgent.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valAgent / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">2. Phát triển Đại lý mới</td>
                    <td className="p-2 text-right font-mono font-medium">{valAgentDev.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valAgentDev / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">3. Doanh thu Kênh truyền thống</td>
                    <td className="p-2 text-right font-mono font-medium">{valTraditional.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valTraditional / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">4. Thương mại điện tử</td>
                    <td className="p-2 text-right font-mono font-medium">{valEcommerce.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valEcommerce / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                  <tr className="bg-blue-50/50 font-bold text-blue-900 border-t border-blue-200">
                    <td className="p-2">TỔNG CỘNG DOANH THU</td>
                    <td className="p-2 text-right font-mono">{totalRevenue.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono">100.0%</td>
                  </tr>
                </tbody>
              </table>

              {/* Bảng Chi phí */}
              <table className="w-full text-xs border border-slate-200 rounded-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                    <th className="p-2">Khoản mục Chi phí</th>
                    <th className="p-2 text-right">Dự toán (VNĐ)</th>
                    <th className="p-2 text-right">% Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2">1. Chi phí Branding & Ads</td>
                    <td className="p-2 text-right font-mono font-medium">{valBranding.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valBranding / totalRevenue) * 100).toFixed(2) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">2. Lương và thưởng Marketing</td>
                    <td className="p-2 text-right font-mono font-medium">{valSalary.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valSalary / totalRevenue) * 100).toFixed(2) : 0}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2">3. Công tác phí & Hội thảo</td>
                    <td className="p-2 text-right font-mono font-medium">{valTravel.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono text-slate-600">
                      {totalRevenue > 0 ? ((valTravel / totalRevenue) * 100).toFixed(2) : 0}%
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 font-bold text-emerald-900 border-t border-emerald-200">
                    <td className="p-2">TỔNG CHI PHÍ MARKETING</td>
                    <td className="p-2 text-right font-mono">{totalMarketingBudget.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-mono">
                      {totalRevenue > 0 ? ((totalMarketingBudget / totalRevenue) * 100).toFixed(2) : 0}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Chân trang 1 */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
          <span>Kế hoạch Marketing năm {selectedYear} · Seajong Faucet Việt Nam</span>
          <span>Trang 1 / 3</span>
        </div>
      </section>

      {/* ════════════════════ PAGE 2: NỘI DUNG & CHIẾN DỊCH QUẢNG CÁO ════════════════════ */}
      <section className="pdf-content-page p-10 bg-white border-b border-slate-300 min-h-[1100px] flex flex-col justify-between">
        <div>
          {/* Header nhỏ trang 2 */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-6">
            <span className="text-xs font-bold text-[#003087] uppercase">
              CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM · KẾ HOẠCH NĂM {selectedYear}
            </span>
            <span className="text-xs font-mono text-slate-500">Mã: KH-MKT-{selectedYear}</span>
          </div>

          {/* PHẦN II: TUYẾN NỘI DUNG (CONTENT PILLARS) */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-[#003087] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#003087]" />
              PHẦN II. CÁC TUYẾN NỘI DUNG TRỌNG TÂM (CONTENT PILLARS)
            </h3>

            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-[#003087] text-white font-bold text-left">
                  <th className="p-2 w-10 text-center">STT</th>
                  <th className="p-2 w-48">Tuyến nội dung</th>
                  <th className="p-2">Mục tiêu & Vai trò</th>
                  <th className="p-2">Chi tiết triển khai</th>
                  <th className="p-2 text-right w-24">Tỷ trọng</th>
                  <th className="p-2 text-right w-28">Ngân sách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contentPillars.map((item, idx) => (
                  <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                    <td className="p-2 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-2 font-bold text-slate-800">{item.pillar}</td>
                    <td className="p-2 text-slate-600">
                      <div className="font-semibold text-slate-800">{item.purpose}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.role}</div>
                    </td>
                    <td className="p-2 text-slate-600">{item.details}</td>
                    <td className="p-2 text-right font-mono text-blue-700 font-semibold">{item.ratioStr}</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-800">
                      {item.budget?.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PHẦN III: KẾ HOẠCH CHIẾN DỊCH QUẢNG CÁO (ADS PLANS) */}
          <div className="mt-8">
            <h3 className="text-xs font-bold text-[#003087] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#003087]" />
              PHẦN III. KẾ HOẠCH CHIẾN DỊCH QUẢNG CÁO TRỌNG ĐIỂM
            </h3>

            <table className="w-full text-xs border border-slate-200">
              <thead>
                <tr className="bg-[#003087] text-white font-bold text-left">
                  <th className="p-2 w-10 text-center">STT</th>
                  <th className="p-2 w-44">Mục tiêu / Chủ đề</th>
                  <th className="p-2 w-32">Kênh quảng cáo</th>
                  <th className="p-2">Khu vực & Đối tượng</th>
                  <th className="p-2 w-28">Thời gian</th>
                  <th className="p-2 text-right w-28">Ngân sách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adPlans.map((ad, idx) => (
                  <tr key={ad.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                    <td className="p-2 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-2">
                      <div className="font-bold text-slate-800">{ad.objective}</div>
                      <div className="text-[11px] text-blue-700 mt-0.5">{ad.topic}</div>
                    </td>
                    <td className="p-2 font-medium text-slate-700">{ad.channel}</td>
                    <td className="p-2 text-slate-600">
                      <div>
                        <strong className="text-slate-700">Khu vực:</strong> {ad.region}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <strong className="text-slate-700">Đối tượng:</strong> {ad.audience}
                      </div>
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-[11px]">
                      {ad.startDate} <br />
                      <span className="text-slate-400">đến</span> {ad.endDate}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                      {ad.budget?.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chân trang 2 */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
          <span>Kế hoạch Marketing năm {selectedYear} · Seajong Faucet Việt Nam</span>
          <span>Trang 2 / 3</span>
        </div>
      </section>

      {/* ════════════════════ PAGE 3: BẢNG NGÂN SÁCH 12 THÁNG & CHỮ KÝ DUYỆT ════════════════════ */}
      <section className="pdf-content-page p-10 bg-white min-h-[1100px] flex flex-col justify-between">
        <div>
          {/* Header nhỏ trang 3 */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-6">
            <span className="text-xs font-bold text-[#003087] uppercase">
              CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM · KẾ HOẠCH NĂM {selectedYear}
            </span>
            <span className="text-xs font-mono text-slate-500">Mã: KH-MKT-{selectedYear}</span>
          </div>

          {/* PHẦN IV: MA TRẬN PHÂN BỔ NGÂN SÁCH 12 THÁNG */}
          <div>
            <h3 className="text-xs font-bold text-[#003087] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#003087]" />
              PHẦN IV. MA TRẬN PHÂN BỔ NGÂN SÁCH 13 HẠNG MỤC THEO 12 THÁNG
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border border-slate-200">
                <thead>
                  <tr className="bg-[#003087] text-white font-bold text-center">
                    <th className="p-1.5 text-left w-44">Hạng mục phân bổ</th>
                    <th className="p-1.5 text-right w-24">Tổng năm</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <th key={m} className="p-1.5 w-12">
                        T{m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Nhóm Đại lý */}
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <td colSpan={14} className="p-1.5 uppercase text-[#003087]">
                      A. Hạng mục hỗ trợ Điểm bán & Đại lý
                    </td>
                  </tr>
                  {agencyCats.map((cat, idx) => {
                    const totalCat = getCatTotal(cat.id);
                    return (
                      <tr key={cat.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        <td className="p-1.5 font-medium text-slate-800">
                          {idx + 1}. {cat.label}
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                          {totalCat > 0 ? totalCat.toLocaleString('vi-VN') : '-'}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                          const val = monthlyAllocations[m]?.[cat.id]?.budget || 0;
                          return (
                            <td key={m} className="p-1.5 text-right font-mono text-slate-600">
                              {val > 0 ? (val / 1000000).toFixed(0) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Nhóm Kỹ thuật số & Thương hiệu */}
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <td colSpan={14} className="p-1.5 uppercase text-[#003087]">
                      B. Hạng mục Quảng cáo & Phát triển thương hiệu
                    </td>
                  </tr>
                  {advCats.map((cat, idx) => {
                    const totalCat = getCatTotal(cat.id);
                    return (
                      <tr key={cat.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        <td className="p-1.5 font-medium text-slate-800">
                          {idx + 4}. {cat.label}
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                          {totalCat > 0 ? totalCat.toLocaleString('vi-VN') : '-'}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                          const val = monthlyAllocations[m]?.[cat.id]?.budget || 0;
                          return (
                            <td key={m} className="p-1.5 text-right font-mono text-slate-600">
                              {val > 0 ? (val / 1000000).toFixed(0) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Hàng tổng cộng tháng */}
                  <tr className="bg-blue-50 font-bold text-blue-900 border-t-2 border-[#003087]">
                    <td className="p-1.5 uppercase">TỔNG CỘNG THEO THÁNG</td>
                    <td className="p-1.5 text-right font-mono">
                      {totalAllocatedMonthly.toLocaleString('vi-VN')} đ
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const mTotal = monthlyBudgets[m] || 0;
                      return (
                        <td key={m} className="p-1.5 text-right font-mono text-[#003087]">
                          {mTotal > 0 ? (mTotal / 1000000).toFixed(0) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
              <div className="text-[9px] text-slate-400 mt-1 italic">
                * Đơn vị các cột T1–T12 thể hiện triệu đồng (tr.đ). Cột Tổng năm thể hiện VNĐ đầy đủ.
              </div>
            </div>
          </div>

          {/* PHẦN V: CHỮ KÝ VÀ PHÊ DUYỆT */}
          <div className="mt-12 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-8 text-center">
              {/* Bên lập kế hoạch */}
              <div className="flex flex-col items-center">
                <div className="text-xs uppercase font-bold text-slate-800">
                  NGƯỜI LẬP KẾ HOẠCH
                </div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">
                  (Ký, ghi rõ họ tên và chức vụ)
                </div>

                <div className="h-28 w-64 flex items-center justify-center my-2">
                  {proposerSig ? (
                    <img
                      src={proposerSig}
                      alt="Chữ ký người lập"
                      className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
                    />
                  ) : (
                    <div className="text-slate-300 text-[11px] italic border border-dashed border-slate-200 rounded p-4 w-full text-center">
                      (Chưa có chữ ký điện tử)
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-[#003087] mt-1">{proposerName}</div>
                <div className="text-[10px] text-slate-500">Trưởng phòng Marketing</div>
              </div>

              {/* Bên phê duyệt */}
              <div className="flex flex-col items-center">
                <div className="text-xs uppercase font-bold text-slate-800">
                  GIÁM ĐỐC PHÊ DUYỆT
                </div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">
                  (Ký tên và đóng dấu)
                </div>

                <div className="h-28 w-64 flex items-center justify-center my-2">
                  {approverSig ? (
                    <img
                      src={approverSig}
                      alt="Chữ ký người duyệt"
                      className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
                    />
                  ) : (
                    <div className="text-slate-300 text-[11px] italic border border-dashed border-slate-200 rounded p-4 w-full text-center">
                      (Chờ phê duyệt từ Ban Giám đốc)
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-[#003087] mt-1">{approverName}</div>
                <div className="text-[10px] text-slate-500">Tổng Giám Đốc</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chân trang 3 */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
          <span>Kế hoạch Marketing năm {selectedYear} · Seajong Faucet Việt Nam</span>
          <span>Trang 3 / 3</span>
        </div>
      </section>
    </div>
  );
};
