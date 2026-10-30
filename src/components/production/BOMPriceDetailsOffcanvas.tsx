import React from 'react';
import { Offcanvas } from '@/components/common/Offcanvas';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Button } from '@/components/common/Button';

export default function BOMPriceDetailsOffcanvas({
  show,
  onClose,
  bomData,
  selectedProduct,
  initialCost,
}: {
  show: boolean;
  onClose: () => void;
  bomData: any;
  selectedProduct: any;
  initialCost: number;
}) {
  const marginPct = selectedProduct?.loiNhuanKyVong || 0;
  const marginType = selectedProduct?.phuongPhapTinhLoiNhuan || 'revenue';
  const giaBan = selectedProduct?.giaBan || 0;

  let calculatedPrice = 0;
  if (marginType === 'revenue' && marginPct < 100) {
    calculatedPrice = initialCost / (1 - marginPct / 100);
  } else if (marginType === 'cost') {
    calculatedPrice = initialCost * (1 + marginPct / 100);
  }
  calculatedPrice = Math.round(calculatedPrice / 1000) * 1000;

  return (
    <Offcanvas
      isOpen={show}
      onClose={onClose}
      title="Chi tiết cấu thành giá bán"
      description={selectedProduct?.tenHang || selectedProduct?.name || 'Thành phẩm'}
      icon={<i className="bi bi-calculator text-lg" />}
      width="400px"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-[13px]">
        {/* Phần 1: Chi phí nguyên vật liệu */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50">
            <h6 className="font-bold text-xs uppercase tracking-wider text-sky-700 m-0">
              1. Chi phí nguyên vật liệu (Giá vốn)
            </h6>
          </div>
          <FullWidthTable className="max-h-[280px]">
            <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
              <thead className="sticky top-0 z-10 bg-white border-b-2 border-slate-200">
                <tr className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-2 px-3">Tên vật tư</th>
                  <th className="py-2 px-2 text-center w-14">SL</th>
                  <th className="py-2 px-2 text-right w-24">Đơn giá</th>
                  <th className="py-2 px-3 text-right w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(bomData?.vatTu || []).map((item: any, idx: number) => {
                  const price = item.material?.price || item.material?.giaNhap || 0;
                  const qty = Number(item.soLuong) || 0;
                  const total = price * qty;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800">
                          {item.material?.tenHang || item.tenVatTu || 'Chưa rõ'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.material?.code || item.maVatTu}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-medium text-slate-700">{qty}</td>
                      <td className="py-2 px-2 text-right text-slate-600">
                        {price.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-800">
                        {total.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 font-bold text-slate-700 text-right">
                    Tổng giá vốn vật tư:
                  </td>
                  <td className="py-2.5 px-3 font-bold text-rose-600 text-right text-sm">
                    {initialCost.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </FullWidthTable>
        </div>

        {/* Phần 2: Cấu hình lợi nhuận */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
          <h6 className="font-bold text-xs uppercase tracking-wider text-sky-700 mb-2.5">
            2. Cấu hình lợi nhuận
          </h6>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <div className="text-[11px] text-slate-400">Tỷ suất kỳ vọng</div>
              <div className="font-bold text-base text-slate-900 mt-0.5">{marginPct}%</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <div className="text-[11px] text-slate-400">Phương pháp tính</div>
              <div className="font-semibold text-xs text-slate-800 mt-1">
                {marginType === 'revenue' ? 'Trên doanh thu' : 'Trên giá vốn'}
              </div>
            </div>
          </div>
        </div>

        {/* Phần 3: Công thức và Giá tính toán */}
        <div className="rounded-xl p-4 bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-sm text-center">
          <div className="text-xs font-semibold opacity-85 mb-1">
            3. Giá bán tính toán (Đề xuất)
          </div>
          <div className="text-2xl font-extrabold mb-2.5">
            {calculatedPrice.toLocaleString('vi-VN')} đ
          </div>
          <div className="bg-white/15 rounded-lg p-2.5 text-left text-xs font-mono">
            <div className="opacity-80 mb-0.5 text-[11px]">Công thức áp dụng:</div>
            {marginType === 'revenue'
              ? `${initialCost.toLocaleString('vi-VN')} đ / (1 - ${marginPct}%) = ${calculatedPrice.toLocaleString('vi-VN')} đ`
              : `${initialCost.toLocaleString('vi-VN')} đ × (1 + ${marginPct}%) = ${calculatedPrice.toLocaleString('vi-VN')} đ`}
          </div>
        </div>

        {/* Phần 4: Giá bán chính thức */}
        <div className="bg-white rounded-xl border border-emerald-200 border-l-4 border-l-emerald-500 p-3.5 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 mb-1">
            Giá bán chính thức đang áp dụng
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-extrabold text-emerald-600">
              {giaBan.toLocaleString('vi-VN')} đ
            </div>
            {giaBan !== calculatedPrice && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                <i className="bi bi-exclamation-triangle mr-1"></i>Có chênh lệch
              </span>
            )}
          </div>
          {giaBan !== calculatedPrice && (
            <div className="text-xs text-slate-500 mt-1.5">
              Giá bán chính thức hiện tại khác với Giá bán tính toán theo định mức. Bạn có thể bấm
              nút sửa giá để cập nhật lại.
            </div>
          )}
        </div>
      </div>
    </Offcanvas>
  );
}
