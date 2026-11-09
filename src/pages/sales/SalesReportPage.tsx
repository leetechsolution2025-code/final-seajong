import React, { useState } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';

export interface SalesReportPageProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SalesReportPage: React.FC<SalesReportPageProps> = () => {
  const [searchValue, setSearchValue] = useState('');
  const [periodFilter, setPeriodFilter] = useState('2026-11');
  const [channelFilter, setChannelFilter] = useState('all');

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
          {/* TableToolbar chuẩn theo quy tắc AGENTS.MD bên trong thẻ card chính */}
          <TableToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Tìm kiếm mã đơn, khách hàng, đại lý, sản phẩm..."
            filters={[
              {
                id: 'period-filter',
                value: periodFilter,
                onChange: setPeriodFilter,
                minWidth: '160px',
                ariaLabel: 'Kỳ báo cáo',
                options: [
                  { label: 'Tháng 11/2026 (Hiện tại)', value: '2026-11' },
                  { label: 'Tháng 10/2026', value: '2026-10' },
                  { label: 'Tháng 09/2026', value: '2026-09' },
                  { label: 'Quý 4/2026', value: '2026-Q4' },
                  { label: 'Năm 2026', value: '2026-FY' },
                ],
              },
              {
                id: 'channel-filter',
                value: channelFilter,
                onChange: setChannelFilter,
                minWidth: '160px',
                ariaLabel: 'Kênh bán hàng',
                options: [
                  { label: 'Tất cả kênh', value: 'all' },
                  { label: 'Kênh đại lý (Showroom)', value: 'dealer' },
                  { label: 'Kênh dự án & công trình', value: 'project' },
                  { label: 'Kênh bán buôn / NPP', value: 'distributor' },
                  { label: 'Kênh OEM / Gia công', value: 'oem' },
                ],
              },
            ]}
          />

          {/* Phần thân bên trong thẻ card chính để trống */}
          <div className="flex-1 bg-white" />
        </div>
      </StandardPage>
    </div>
  );
};

export default SalesReportPage;
