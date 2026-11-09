import React from 'react';
import { StandardPage } from '@/components/layout/StandardPage';
import { WarehouseAuditLogsView } from '@/components/logistics/audit/WarehouseAuditLogsView';

export interface LogisticsAuditLogsPageProps {
  onShowToast?: (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => void;
}

export const LogisticsAuditLogsPage: React.FC<LogisticsAuditLogsPageProps> = ({ onShowToast }) => {
  return (
    <StandardPage
      className="logistics-mobile-page"
      title="Nhật ký hoạt động kho"
      description="Biên bản đối soát nhập xuất, kiểm kê định kỳ và đối chiếu số dư sổ sách"
      icon="bi-journal-text"
      color="emerald"
      badge="NHẬT KÝ HOẠT ĐỘNG KHO"
      hideTicker={true}
    >
      <WarehouseAuditLogsView onShowToast={onShowToast} />
    </StandardPage>
  );
};

export default LogisticsAuditLogsPage;
