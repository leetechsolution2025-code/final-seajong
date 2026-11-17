import React, { useState } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { WarehouseInventoryView } from '../../components/common/InventoryTable';
import { useDepartment } from '../../context/DepartmentContext';

export const SalesInventoryPage: React.FC = () => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { activeDeptCode } = useDepartment();

  const isFinanceDept =
    activeDeptCode === 'finance' ||
    activeDeptCode === 'tai-chinh' ||
    activeDeptCode === 'ke-toan' ||
    (typeof window !== 'undefined' && window.location.pathname.includes('finance'));

  const handleExportExcel = () => {
    setToastMsg('Đang trích xuất dữ liệu kho hàng ra file Excel...');
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <StandardPage
      title="Hàng hoá trong kho"
      description="Tra cứu danh mục mặt hàng tồn kho thực tế, vị trí lưu trữ và trạng thái sẵn sàng xuất kho"
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

      <WarehouseInventoryView
        canEdit={isFinanceDept}
        canAdd={true}
        onExportExcel={handleExportExcel}
        onItemSaved={(savedItem, mode) => {
          setToastMsg(
            mode === 'create'
              ? `Đã thêm mới mặt hàng "${savedItem.tenHang}" (${savedItem.code || 'SKU'}) vào kho thành công!`
              : `Đã cập nhật thông tin mặt hàng "${savedItem.tenHang}" thành công!`
          );
          setTimeout(() => setToastMsg(null), 3500);
        }}
      />
    </StandardPage>
  );
};

export default SalesInventoryPage;
