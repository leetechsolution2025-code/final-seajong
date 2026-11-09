import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { DatePicker } from '../../components/common/DatePicker';

export interface SalesReportPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SalesReportPage: React.FC<SalesReportPageProps> = () => {
  // 1. Thương hiệu: Tất cả, Seajong hoặc OEM
  const [brand, setBrand] = useState<'all' | 'seajong' | 'oem'>('all');

  // 2. Hộp tìm kiếm
  const [searchValue, setSearchValue] = useState('');

  // 3. Lọc theo ngày bằng DatePicker
  const [selectedDate, setSelectedDate] = useState('');

  // 4. Lọc theo Tháng, Quý, Năm dùng nút Next / Prev (Thời điểm hiện tại: 11/2026)
  const now = new Date();
  const CURRENT_YEAR = now.getFullYear(); // 2026
  const CURRENT_MONTH = now.getMonth() + 1; // 11
  const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3); // 4

  const [month, setMonth] = useState<number>(CURRENT_MONTH);
  const [monthYear, setMonthYear] = useState<number>(CURRENT_YEAR);

  const [quarter, setQuarter] = useState<number>(CURRENT_QUARTER);
  const [quarterYear, setQuarterYear] = useState<number>(CURRENT_YEAR);

  const [year, setYear] = useState<number>(CURRENT_YEAR);

  // Điều kiện khoá nút Next khi tới thời điểm hiện tại
  const isCurrentMonth =
    monthYear > CURRENT_YEAR || (monthYear === CURRENT_YEAR && month >= CURRENT_MONTH);

  const isCurrentQuarter =
    quarterYear > CURRENT_YEAR || (quarterYear === CURRENT_YEAR && quarter >= CURRENT_QUARTER);

  const isCurrentYear = year >= CURRENT_YEAR;

  // Xử lý chuyển Tháng
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setMonthYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setMonthYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Xử lý chuyển Quý
  const handlePrevQuarter = () => {
    if (quarter === 1) {
      setQuarter(4);
      setQuarterYear((y) => y - 1);
    } else {
      setQuarter((q) => q - 1);
    }
  };

  const handleNextQuarter = () => {
    if (isCurrentQuarter) return;
    if (quarter === 4) {
      setQuarter(1);
      setQuarterYear((y) => y + 1);
    } else {
      setQuarter((q) => q + 1);
    }
  };

  // Xử lý chuyển Năm
  const handlePrevYear = () => {
    setYear((y) => y - 1);
  };

  const handleNextYear = () => {
    if (isCurrentYear) return;
    setYear((y) => y + 1);
  };

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
          {/* Thanh công cụ TableToolbar trải đều full dòng */}
          <TableToolbar
            actionsBeforeSearch={
              /* Nhóm 3 Radio Button: Tất cả, Seajong, OEM */
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-700 h-[38px] shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="all"
                    checked={brand === 'all'}
                    onChange={() => setBrand('all')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span
                    className={
                      brand === 'all' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }
                  >
                    Tất cả
                  </span>
                </label>
                <div className="w-[1px] h-3.5 bg-slate-300" />
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="seajong"
                    checked={brand === 'seajong'}
                    onChange={() => setBrand('seajong')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span
                    className={
                      brand === 'seajong' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }
                  >
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
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span
                    className={
                      brand === 'oem' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }
                  >
                    OEM
                  </span>
                </label>
              </div>
            }
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Tìm kiếm mã đơn, khách hàng, sản phẩm..."
            searchMinWidth="220px"
            actionsAfterSearch={
              <div className="flex items-center gap-2 shrink-0">
                {/* 1. Lọc theo ngày dùng DatePicker */}
                <div style={{ width: '138px' }} className="shrink-0" title="Lọc theo ngày">
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Chọn ngày..."
                    clearable={true}
                    className="h-[38px] text-[13px]"
                  />
                </div>

                {/* 2. Lọc theo tháng dùng nút Prev / Next */}
                <div
                  className="flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-lg h-[38px] px-1 text-[13px] font-medium text-slate-700 shrink-0 w-[138px]"
                  title="Lọc theo tháng"
                >
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Tháng trước"
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-1 text-center font-semibold text-slate-800 whitespace-nowrap select-none truncate">
                    Tháng {month}/{monthYear}
                  </span>
                  <button
                    type="button"
                    disabled={isCurrentMonth}
                    onClick={handleNextMonth}
                    title={isCurrentMonth ? 'Đã ở tháng hiện tại' : 'Tháng sau'}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border-0 bg-transparent shrink-0 ${
                      isCurrentMonth
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* 3. Lọc theo quý dùng nút Prev / Next */}
                <div
                  className="flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-lg h-[38px] px-1 text-[13px] font-medium text-slate-700 shrink-0 w-[128px]"
                  title="Lọc theo quý"
                >
                  <button
                    type="button"
                    onClick={handlePrevQuarter}
                    title="Quý trước"
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-1 text-center font-semibold text-slate-800 whitespace-nowrap select-none truncate">
                    Quý {quarter}/{quarterYear}
                  </span>
                  <button
                    type="button"
                    disabled={isCurrentQuarter}
                    onClick={handleNextQuarter}
                    title={isCurrentQuarter ? 'Đã ở quý hiện tại' : 'Quý sau'}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border-0 bg-transparent shrink-0 ${
                      isCurrentQuarter
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* 4. Lọc theo năm dùng nút Prev / Next */}
                <div
                  className="flex items-center justify-between bg-slate-50 border border-slate-200/90 rounded-lg h-[38px] px-1 text-[13px] font-medium text-slate-700 shrink-0 w-[116px]"
                  title="Lọc theo năm"
                >
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    title="Năm trước"
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-1 text-center font-semibold text-slate-800 whitespace-nowrap select-none truncate">
                    Năm {year}
                  </span>
                  <button
                    type="button"
                    disabled={isCurrentYear}
                    onClick={handleNextYear}
                    title={isCurrentYear ? 'Đã ở năm hiện tại' : 'Năm sau'}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border-0 bg-transparent shrink-0 ${
                      isCurrentYear
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={13} />
                  </button>
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
