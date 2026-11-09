import React, { useState } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { Select } from '../../components/common/Select';

export interface SalesReportPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SalesReportPage: React.FC<SalesReportPageProps> = () => {
  // Thương hiệu / Kênh: Seajong hoặc OEM
  const [brand, setBrand] = useState<'seajong' | 'oem'>('seajong');

  // Hộp tìm kiếm
  const [searchValue, setSearchValue] = useState('');

  // Các bộ lọc: Ngày, Tháng, Quý, Năm
  const [dayFilter, setDayFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('11');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('2026');

  return (
    <div className="sales-report-page h-full">
      <StandardPage
        title="Báo cáo bán hàng"
        description="Tổng hợp dữ liệu doanh số, doanh thu và sản lượng bán hàng theo kỳ"
        icon="bi-bar-chart-line"
        color="blue"
        badge="BÁO CÁO"
        tickerContext="sales"
        cardPadding="p-0"
        useCard={true}
      >
        <div className="flex flex-col h-full flex-1 overflow-hidden">
          {/* Thanh công cụ TableToolbar: Radio Seajong & OEM, Hộp tìm kiếm, Lọc Ngày/Tháng/Quý/Năm, Ẩn nút Gear */}
          <TableToolbar
            actionsBeforeSearch={
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-700 h-[38px] shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="seajong"
                    checked={brand === 'seajong'}
                    onChange={() => setBrand('seajong')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span className={brand === 'seajong' ? 'text-blue-600 font-semibold' : 'text-slate-600'}>
                    Seajong
                  </span>
                </label>
                <div className="w-[1px] h-3.5 bg-slate-300" />
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="oem"
                    checked={brand === 'oem'}
                    onChange={() => setBrand('oem')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span className={brand === 'oem' ? 'text-blue-600 font-semibold' : 'text-slate-600'}>
                    OEM
                  </span>
                </label>
              </div>
            }
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Tìm kiếm mã đơn, khách hàng, sản phẩm..."
            searchWidth="240px"
            actionsAfterSearch={
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Lọc theo Ngày */}
                <div style={{ minWidth: '135px' }}>
                  <Select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    options={[
                      { label: 'Tất cả ngày', value: 'all' },
                      { label: 'Hôm nay (09/11)', value: 'today' },
                      { label: 'Hôm qua (08/11)', value: 'yesterday' },
                      { label: '7 ngày qua', value: '7days' },
                      { label: '30 ngày qua', value: '30days' },
                    ]}
                    aria-label="Lọc theo ngày"
                    style={{ marginBottom: 0 }}
                  />
                </div>

                {/* 2. Lọc theo Tháng */}
                <div style={{ minWidth: '140px' }}>
                  <Select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    options={[
                      { label: 'Tất cả tháng', value: 'all' },
                      { label: 'Tháng 11 (Hiện tại)', value: '11' },
                      { label: 'Tháng 10', value: '10' },
                      { label: 'Tháng 9', value: '9' },
                      { label: 'Tháng 8', value: '8' },
                      { label: 'Tháng 7', value: '7' },
                      { label: 'Tháng 6', value: '6' },
                      { label: 'Tháng 5', value: '5' },
                      { label: 'Tháng 4', value: '4' },
                      { label: 'Tháng 3', value: '3' },
                      { label: 'Tháng 2', value: '2' },
                      { label: 'Tháng 1', value: '1' },
                    ]}
                    aria-label="Lọc theo tháng"
                    style={{ marginBottom: 0 }}
                  />
                </div>

                {/* 3. Lọc theo Quý */}
                <div style={{ minWidth: '130px' }}>
                  <Select
                    value={quarterFilter}
                    onChange={(e) => setQuarterFilter(e.target.value)}
                    options={[
                      { label: 'Tất cả các quý', value: 'all' },
                      { label: 'Quý 4 (T10-T12)', value: 'Q4' },
                      { label: 'Quý 3 (T07-T09)', value: 'Q3' },
                      { label: 'Quý 2 (T04-T06)', value: 'Q2' },
                      { label: 'Quý 1 (T01-T03)', value: 'Q1' },
                    ]}
                    aria-label="Lọc theo quý"
                    style={{ marginBottom: 0 }}
                  />
                </div>

                {/* 4. Lọc theo Năm */}
                <div style={{ minWidth: '115px' }}>
                  <Select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    options={[
                      { label: 'Năm 2026', value: '2026' },
                      { label: 'Năm 2025', value: '2025' },
                      { label: 'Năm 2024', value: '2024' },
                      { label: 'Năm 2023', value: '2023' },
                    ]}
                    aria-label="Lọc theo năm"
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>
            }
            showMenu={false}
          />

          {/* Thẻ card chính để trống */}
          <div className="flex-1 bg-white" />
        </div>
      </StandardPage>
    </div>
  );
};

export default SalesReportPage;
