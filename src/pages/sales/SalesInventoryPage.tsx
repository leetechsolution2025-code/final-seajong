import React, { useState } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { WarehouseInventoryView } from '../../components/common/InventoryTable';

export const SalesInventoryPage: React.FC = () => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleExportExcel = () => {
    setToastMsg('Đang trích xuất dữ liệu kho hàng ra file Excel...');
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <StandardPage
      title="Hàng hoá trong kho"
      description="Tra cứu 989 mặt hàng tồn kho thực tế, vị trí lưu trữ và trạng thái sẵn sàng xuất kho"
      icon="bi-box-seam"
      color="emerald"
      badge="KHO HÀNG"
      hideTicker={true}
      cardPadding="p-0"
      useCard={true}
    >
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border bg-sky-50 border-sky-300 text-sky-800 text-xs font-semibold flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      <WarehouseInventoryView onExportExcel={handleExportExcel} />
    </StandardPage>
  );
};

export default SalesInventoryPage;
