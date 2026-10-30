import React, { useMemo } from 'react';
import { Offcanvas } from '@/components/common/Offcanvas';
import { Button } from '@/components/common/Button';

export default function BomDiffOffcanvas({
  show,
  onClose,
  bomData,
  standardBomData,
  productName,
}: {
  show: boolean;
  onClose: () => void;
  bomData: any;
  standardBomData: any;
  productName: string;
}) {
  const diffs = useMemo(() => {
    if (!bomData || !standardBomData) return [];

    const results: any[] = [];
    const standardVatTu = standardBomData.vatTu || [];
    const currentVatTu = bomData.vatTu || [];

    const stdMatched = new Set();
    const curMatched = new Set();

    // 1. First pass: Exact matches or quantity changes
    currentVatTu.forEach((v: any, curIdx: number) => {
      const key = v.material?.code || v.maVatTu;
      const stdIdx = standardVatTu.findIndex(
        (sv: any, i: number) => !stdMatched.has(i) && (sv.material?.code || sv.maVatTu) === key
      );

      if (stdIdx !== -1) {
        stdMatched.add(stdIdx);
        curMatched.add(curIdx);

        const stdV = standardVatTu[stdIdx];
        if (stdV.soLuong !== v.soLuong) {
          results.push({
            type: 'modified',
            key,
            name: v.material?.tenHang || v.material?.name || v.tenVatTu,
            oldQty: stdV.soLuong,
            newQty: v.soLuong,
            unit: v.donViTinh || v.material?.donVi || v.material?.unit,
          });
        }
      }
    });

    // 2. Second pass: Swaps (Thay thế)
    currentVatTu.forEach((v: any, curIdx: number) => {
      if (!curMatched.has(curIdx)) {
        if (!stdMatched.has(curIdx) && curIdx < standardVatTu.length) {
          const stdV = standardVatTu[curIdx];
          stdMatched.add(curIdx);
          curMatched.add(curIdx);

          results.push({
            type: 'swapped',
            oldKey: stdV.material?.code || stdV.maVatTu,
            oldName: stdV.material?.tenHang || stdV.material?.name || stdV.tenVatTu,
            oldQty: stdV.soLuong,
            oldUnit: stdV.donViTinh || stdV.material?.donVi || stdV.material?.unit,
            newKey: v.material?.code || v.maVatTu,
            newName: v.material?.tenHang || v.material?.name || v.tenVatTu,
            newQty: v.soLuong,
            newUnit: v.donViTinh || v.material?.donVi || v.material?.unit,
          });
        }
      }
    });

    // 3. Third pass: Remaining are Added and Removed
    currentVatTu.forEach((v: any, curIdx: number) => {
      if (!curMatched.has(curIdx)) {
        const key = v.material?.code || v.maVatTu;
        results.push({
          type: 'added',
          key,
          name: v.material?.tenHang || v.material?.name || v.tenVatTu,
          newQty: v.soLuong,
          unit: v.donViTinh || v.material?.donVi || v.material?.unit,
        });
      }
    });

    standardVatTu.forEach((stdV: any, stdIdx: number) => {
      if (!stdMatched.has(stdIdx)) {
        const key = stdV.material?.code || stdV.maVatTu;
        results.push({
          type: 'removed',
          key,
          name: stdV.material?.tenHang || stdV.material?.name || stdV.tenVatTu,
          oldQty: stdV.soLuong,
          unit: stdV.donViTinh || stdV.material?.donVi || stdV.material?.unit,
        });
      }
    });

    return results;
  }, [bomData, standardBomData]);

  return (
    <Offcanvas
      isOpen={show}
      onClose={onClose}
      title="Đối soát biến thể định mức"
      description={`So sánh với định mức tiêu chuẩn: ${productName}`}
      icon={<i className="bi bi-arrow-left-right text-lg" />}
      width="400px"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-[13px]">
        {diffs.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            <i className="bi bi-check-circle text-4xl text-emerald-500 mb-2 block"></i>
            <h6 className="font-bold text-slate-800 text-sm">Biến thể giống hệt tiêu chuẩn</h6>
            <p className="text-xs text-slate-400 mt-1">Không có sự thay đổi vật tư nào.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {diffs.map((d, i) => {
              if (d.type === 'swapped') {
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                      <i className="bi bi-arrow-left-right"></i>
                      <span>Thay thế vật tư</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-slate-400 line-through w-[45%]">
                        <div className="text-xs font-medium">{d.oldName}</div>
                        <div className="text-[11px] font-mono">Mã: {d.oldKey}</div>
                        <div className="text-xs mt-0.5">
                          {d.oldQty} {d.oldUnit}
                        </div>
                      </div>
                      <i className="bi bi-arrow-right text-sky-600 text-base"></i>
                      <div className="text-slate-900 text-right w-[45%]">
                        <div className="text-xs font-bold">{d.newName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Mã: {d.newKey}</div>
                        <div className="text-xs font-bold mt-0.5 text-sky-700">
                          {d.newQty} {d.newUnit}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800 text-xs">{d.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">Mã: {d.key}</div>
                  </div>

                  {d.type === 'added' && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex flex-col items-end">
                      <span className="text-[10.5px] font-semibold">
                        <i className="bi bi-plus-circle mr-1"></i>Thêm mới
                      </span>
                      <strong className="text-xs font-bold">
                        {d.newQty} {d.unit}
                      </strong>
                    </div>
                  )}

                  {d.type === 'removed' && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex flex-col items-end">
                      <span className="text-[10.5px] font-semibold">
                        <i className="bi bi-dash-circle mr-1"></i>Bị xoá
                      </span>
                      <strong className="text-xs font-bold line-through">
                        {d.oldQty} {d.unit}
                      </strong>
                    </div>
                  )}

                  {d.type === 'modified' && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex flex-col items-end">
                      <span className="text-[10.5px] font-semibold text-amber-700">
                        <i className="bi bi-arrow-left-right mr-1"></i>Đổi SL
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="line-through text-slate-400">{d.oldQty}</span>
                        <i className="bi bi-arrow-right text-amber-600"></i>
                        <strong className="font-bold">
                          {d.newQty} {d.unit}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Offcanvas>
  );
}
