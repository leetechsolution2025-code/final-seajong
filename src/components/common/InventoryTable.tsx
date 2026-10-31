import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BoxSeam,
  FileEarmarkExcel,
  ChevronLeft,
  ChevronRight,
} from 'react-bootstrap-icons';
import { TableToolbar, type TableToolbarFilter } from './TableToolbar';
import { FullWidthTable } from './FullWidthTable';
import { Pagination } from './Pagination';
import { Button } from './Button';
import { Offcanvas } from './Offcanvas';

export interface InventoryWarehouseOption {
  id: string;
  code?: string;
  name: string;
}

export interface InventoryCategoryOption {
  id: string;
  name: string;
}

export interface InventoryStockItem {
  id: string;
  code?: string;
  tenHang: string;
  maThayThe?: string | null;
  model?: string | null;
  chatLieu?: string | null;
  donVi?: string | null;
  soLuong?: number;
  soLuongGiu?: number;
  thucTon?: number;
  soLuongMin?: number;
  giaBanLe?: number | null;
  trangThai?: 'con-hang' | 'sap-het' | 'het-hang' | string;
  imageUrl?: string | null;
  images?: string[];
  categoryId?: string | null;
  categoryName?: string | null;
  brand?: string | null;
  ghiChu?: string | null;
  stocks?: Array<{
    id: string;
    soLuong: number;
    viTriHang?: string | null;
    viTriCot?: string | null;
    viTriTang?: string | null;
    warehouse?: {
      id?: string;
      code?: string;
      name?: string;
    };
  }>;
  [key: string]: any;
}

/* ============================================================================
 * 1. COMPONENT THANH CÔNG CỤ DANH SÁCH HÀNG HOÁ (InventoryToolbar)
 * ============================================================================ */
export interface InventoryToolbarProps {
  warehouses: InventoryWarehouseOption[];
  filterWarehouse: string;
  onWarehouseChange: (warehouseId: string) => void;
  filterStatus: string;
  onStatusChange: (status: string) => void;
  categories: InventoryCategoryOption[];
  filterCategory: string;
  onCategoryChange: (categoryId: string) => void;
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  onExportExcel?: () => void;
  extraRightActions?: React.ReactNode;
}

export const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  warehouses,
  filterWarehouse,
  onWarehouseChange,
  filterStatus,
  onStatusChange,
  categories,
  filterCategory,
  onCategoryChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm theo mã SKU, tên hàng hoá, model, quy cách, chất liệu...',
  onExportExcel,
  extraRightActions,
}) => {
  const filters = useMemo<TableToolbarFilter[]>(
    () => [
      {
        key: 'warehouse',
        label: 'Kho hàng',
        value: filterWarehouse,
        onChange: onWarehouseChange,
        options: [
          { label: 'Tất cả kho hàng', value: 'all' },
          ...warehouses.map((w) => ({ label: w.name, value: w.id })),
        ],
      },
      {
        key: 'status',
        label: 'Trạng thái tồn kho',
        value: filterStatus,
        onChange: onStatusChange,
        options: [
          { label: 'Tất cả trạng thái', value: 'all' },
          { label: 'Còn hàng', value: 'con-hang' },
          { label: 'Sắp hết hàng', value: 'sap-het' },
          { label: 'Hết hàng', value: 'het-hang' },
        ],
      },
      {
        key: 'category',
        label: 'Danh mục',
        value: filterCategory,
        onChange: onCategoryChange,
        options: [
          { label: 'Tất cả danh mục', value: 'all' },
          ...categories.map((c) => ({ label: c.name, value: c.id })),
        ],
      },
    ],
    [warehouses, filterWarehouse, onWarehouseChange, filterStatus, onStatusChange, categories, filterCategory, onCategoryChange]
  );

  return (
    <TableToolbar
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      filters={filters}
      rightActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {extraRightActions}
          {onExportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              leftIcon={<FileEarmarkExcel size={14} color="#16a34a" />}
            >
              Xuất Excel
            </Button>
          )}
        </div>
      }
      showMenu={false}
      menuItems={[]}
    />
  );
};

/* ============================================================================
 * 2. COMPONENT BẢNG DANH SÁCH HÀNG HOÁ (InventoryTable)
 * ============================================================================ */
export interface InventoryTableProps {
  items: InventoryStockItem[];
  loading?: boolean;
  onSelectItem?: (item: InventoryStockItem) => void;
  showPrice?: boolean;
  emptyText?: string;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  loading = false,
  onSelectItem,
  showPrice = false,
  emptyText = 'Không tìm thấy mặt hàng nào trong kho khớp điều kiện',
}) => {
  return (
    <FullWidthTable loading={loading}>
      <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
        <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
          <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
            <th className="py-2.5 px-3.5 min-w-[320px]">Hàng hoá & Quy cách</th>
            <th className="py-2.5 px-3.5 w-20 text-center">ĐVT</th>
            <th className="py-2.5 px-3.5 w-32 text-right">Tồn hệ thống</th>
            <th className="py-2.5 px-3.5 w-28 text-right">Đã giữ</th>
            <th className="py-2.5 px-3.5 w-32 text-right">Tồn thực tế</th>
            <th className="py-2.5 px-3.5 w-32 text-right">Giá niêm yết</th>
            <th className="py-2.5 px-3.5 w-28 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-10 px-4 text-slate-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectItem?.(item)}
                className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
              >
                <td className="py-2.5 px-3.5 align-top">
                  <div className="flex items-start gap-3">
                    {/* Ảnh sản phẩm */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.tenHang}
                        className="w-11 h-11 object-cover rounded-lg border border-slate-200 bg-white shrink-0 shadow-xs"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400"
                      style={{ display: item.imageUrl ? 'none' : 'flex' }}
                    >
                      <BoxSeam size={18} />
                    </div>

                    {/* Tên hàng hoá, mã SKU, mã phụ và model */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold text-slate-900 text-[13px] leading-snug line-clamp-2"
                        title={item.tenHang}
                      >
                        {item.tenHang}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        {item.code && (
                          <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded text-[11px] font-mono border border-sky-200 shrink-0">
                            {item.code}
                          </span>
                        )}
                        {item.maThayThe && (
                          <span className="text-[11px] text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            Mã phụ: {item.maThayThe}
                          </span>
                        )}
                        {(item.model || item.chatLieu) && (
                          <span
                            className="text-[11px] text-slate-400 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] truncate"
                            title={[
                              item.model ? `Model: ${item.model}` : '',
                              item.chatLieu ? `Chất liệu: ${item.chatLieu}` : '',
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                          >
                            {item.model ? `Model: ${item.model}` : ''}
                            {item.chatLieu ? (item.model ? ` • ${item.chatLieu}` : item.chatLieu) : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 align-top text-center text-xs text-slate-600">
                  {item.donVi || 'Bộ'}
                </td>
                <td className="py-2.5 px-3.5 align-top text-right font-medium text-slate-800 text-xs font-mono">
                  {(item.soLuong || 0).toLocaleString('vi-VN')}
                </td>
                <td className="py-2.5 px-3.5 align-top text-right text-xs font-mono font-medium">
                  {(item.soLuongGiu || 0) > 0 ? (
                    <span className="text-amber-600 font-semibold">
                      {(item.soLuongGiu || 0).toLocaleString('vi-VN')}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="py-2.5 px-3.5 align-top text-right">
                  <div className="font-bold text-slate-900 text-[13.5px] font-mono">
                    {(item.thucTon ?? item.soLuong ?? 0).toLocaleString('vi-VN')}
                  </div>
                </td>
                <td className="py-2.5 px-3.5 align-top text-right font-medium text-slate-400 text-xs font-mono">
                  {showPrice && item.giaBanLe ? (
                    <span className="font-semibold text-slate-800">
                      {Number(item.giaBanLe).toLocaleString('vi-VN')} ₫
                    </span>
                  ) : (
                    <span className="tracking-widest font-semibold text-slate-400 select-none">
                      ****** ₫
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3.5 align-top text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                      item.trangThai === 'con-hang'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : item.trangThai === 'sap-het'
                        ? 'bg-amber-50 text-amber-700 border border-amber-300'
                        : 'bg-rose-50 text-rose-700 border border-rose-300'
                    }`}
                  >
                    {item.trangThai === 'con-hang'
                      ? 'Còn hàng'
                      : item.trangThai === 'sap-het'
                      ? 'Sắp hết'
                      : 'Hết hàng'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </FullWidthTable>
  );
};

/* ============================================================================
 * 3. COMPONENT PHÂN TRANG DANH SÁCH HÀNG HOÁ (InventoryPagination)
 * ============================================================================ */
export interface InventoryPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export const InventoryPagination: React.FC<InventoryPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <Pagination
      currentPage={currentPage}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
};

/* ============================================================================
 * 4. COMPONENT OFFCANVAS CHI TIẾT HÀNG HOÁ (InventoryDetailOffcanvas)
 * ============================================================================ */
export interface InventoryDetailOffcanvasProps {
  item: InventoryStockItem | null;
  onClose: () => void;
}

export const InventoryDetailOffcanvas: React.FC<InventoryDetailOffcanvasProps> = ({
  item,
  onClose,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isSlidePaused, setIsSlidePaused] = useState<boolean>(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setFailedImages(new Set());
    setIsSlidePaused(false);
  }, [item]);

  useEffect(() => {
    if (!item || isSlidePaused) return;
    const rawImages: string[] =
      Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : item.imageUrl
        ? [item.imageUrl]
        : [];
    const validCount = rawImages.filter((u) => !failedImages.has(u)).length;
    if (validCount <= 1) return;

    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % validCount);
    }, 3500);

    return () => clearInterval(timer);
  }, [item, failedImages, isSlidePaused]);

  if (!item) return null;

  return (
    <Offcanvas
      isOpen={true}
      onClose={onClose}
      icon={<BoxSeam size={20} />}
      title="Thông tin hàng hoá"
      description={`Mã SKU: ${item.code || 'Chưa cập nhật'}`}
      width="400px"
      position="right"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-xs text-slate-400 font-mono">
            {item.brand || 'Seajong'} • Kho vận
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs sm:text-[13px] text-slate-700">
        {/* Header sản phẩm: Tên + Mã hàng hoá + Vùng hiển thị ảnh */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div>
            <div className="font-bold text-slate-900 text-[14px] leading-snug">
              {item.tenHang}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-xs border border-sky-200">
                {item.code}
              </span>
              {item.maThayThe && (
                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded text-xs border border-slate-200">
                  Mã phụ: {item.maThayThe}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  item.trangThai === 'con-hang'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : item.trangThai === 'sap-het'
                    ? 'bg-amber-50 text-amber-700 border border-amber-300'
                    : 'bg-rose-50 text-rose-700 border border-rose-300'
                }`}
              >
                {item.trangThai === 'con-hang'
                  ? 'Còn hàng'
                  : item.trangThai === 'sap-het'
                  ? 'Sắp hết'
                  : 'Hết hàng'}
              </span>
            </div>
          </div>

          {/* Vùng hiển thị ảnh */}
          {(() => {
            const rawImages: string[] =
              Array.isArray(item.images) && item.images.length > 0
                ? item.images
                : item.imageUrl
                ? [item.imageUrl]
                : [];
            const images = rawImages.filter((u: string) => !failedImages.has(u));

            if (images.length === 0) {
              return (
                <div className="w-full h-48 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-300 py-6 shadow-xs">
                  <BoxSeam size={44} className="mb-1 text-slate-300 stroke-[1.2]" />
                  <span className="text-[11px] text-slate-400 font-medium">Chưa có ảnh sản phẩm</span>
                </div>
              );
            }

            if (images.length === 1) {
              return (
                <div className="w-full h-52 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-2 relative shadow-xs">
                  <img
                    src={images[0]}
                    alt={item.tenHang}
                    className="w-full h-full object-contain"
                    onError={() => {
                      setFailedImages((prev) => new Set(prev).add(images[0]));
                    }}
                  />
                </div>
              );
            }

            const safeIndex = Math.min(Math.max(0, activeImageIndex), images.length - 1);
            return (
              <div
                className="space-y-2"
                onMouseEnter={() => setIsSlidePaused(true)}
                onMouseLeave={() => setIsSlidePaused(false)}
              >
                <div className="w-full h-52 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden p-2 relative shadow-xs group">
                  <img
                    src={images[safeIndex]}
                    alt={`${item.tenHang} - ảnh ${safeIndex + 1}`}
                    className="w-full h-full object-contain transition-all duration-300"
                    onError={() => {
                      setFailedImages((prev) => new Set(prev).add(images[safeIndex]));
                    }}
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 hover:bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                    title="Ảnh trước"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/95 hover:bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
                    title="Ảnh tiếp theo"
                  >
                    <ChevronRight size={14} />
                  </button>

                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10.5px] font-mono font-medium backdrop-blur-xs select-none">
                    {safeIndex + 1} / {images.length}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5">
                  {images.map((imgUrl: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-11 h-11 rounded-lg border-2 overflow-hidden shrink-0 transition-all p-0.5 bg-white cursor-pointer ${
                        safeIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-100 shadow-xs'
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                      title={`Xem ảnh ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={() => {
                          setFailedImages((prev) => new Set(prev).add(imgUrl));
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Chỉ số Tồn kho thực tế */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Hiện trạng tồn kho
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] text-slate-500 font-medium">Tồn hệ thống</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-1">
                {(item.soLuong || 0).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{item.donVi || 'đơn vị'}</div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="text-[11px] text-amber-700 font-medium">Đang giữ chỗ</div>
              <div className="text-base font-bold text-amber-700 font-mono mt-1">
                {(item.soLuongGiu || 0).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">cam kết đơn</div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="text-[11px] text-emerald-700 font-medium">Khả dụng (Thực tế)</div>
              <div className="text-base font-bold text-emerald-700 font-mono mt-1">
                {(item.thucTon ?? item.soLuong ?? 0).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">sẵn sàng xuất</div>
            </div>
          </div>
        </div>

        {/* Thông tin quy cách & Phân loại */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Quy cách & Phân loại
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Danh mục hàng:</span>
              <span className="font-semibold text-slate-800">
                {item.categoryName || 'Thiết bị vệ sinh'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Thương hiệu:</span>
              <span className="font-semibold text-slate-800">{item.brand || 'Seajong'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Đơn vị tính (ĐVT):</span>
              <span className="font-semibold text-slate-800">{item.donVi || 'Bộ / Cái'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Định mức an toàn min:</span>
              <span className="font-mono font-semibold text-slate-800">
                {item.soLuongMin || 0} {item.donVi || ''}
              </span>
            </div>
          </div>

          {(item.model || item.chatLieu) && (
            <div className="pt-2 border-t border-slate-200 text-xs">
              {item.model && (
                <div className="mb-1">
                  <span className="text-slate-400 text-[11px]">Model: </span>
                  <span className="font-medium text-slate-800">{item.model}</span>
                </div>
              )}
              {item.chatLieu && (
                <div>
                  <span className="text-slate-400 text-[11px]">Chất liệu: </span>
                  <span className="font-medium text-slate-800">{item.chatLieu}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chi tiết vị trí kho lưu trữ */}
        {item.stocks && item.stocks.length > 0 && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Vị trí kệ & Kho lưu trữ
            </div>
            {item.stocks.map((stk) => (
              <div
                key={stk.id}
                className="p-2.5 bg-white rounded-lg border border-slate-200 flex justify-between items-center text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {stk.warehouse?.name || 'Kho Seajong'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Dãy/Hàng:{' '}
                    <span className="font-mono text-slate-600">
                      {stk.viTriHang || 'Chờ sắp xếp'}
                    </span>
                    {stk.viTriCot && ` • Cột: ${stk.viTriCot}`}
                    {stk.viTriTang && ` • Tầng: ${stk.viTriTang}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 font-mono">
                    {stk.soLuong} {item.donVi || 'cái'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Mã kho: {stk.warehouse?.code || 'KHO'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ghi chú lưu kho */}
        {item.ghiChu && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-400 text-[11px] block font-semibold mb-0.5">
              Ghi chú lưu kho:
            </span>
            <p className="text-slate-700 whitespace-pre-wrap">{item.ghiChu}</p>
          </div>
        )}
      </div>
    </Offcanvas>
  );
};

/* ============================================================================
 * 5. COMPONENT TỔNG HỢP DANH SÁCH HÀNG HOÁ TỒN KHO (WarehouseInventoryView)
 *    Kết hợp: InventoryToolbar + InventoryTable + InventoryPagination + Offcanvas
 * ============================================================================ */
export interface WarehouseInventoryViewProps {
  showPrice?: boolean;
  onExportExcel?: () => void;
  extraRightActions?: React.ReactNode;
}

export const WarehouseInventoryView: React.FC<WarehouseInventoryViewProps> = ({
  showPrice = false,
  onExportExcel,
  extraRightActions,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  const [inventory, setInventory] = useState<InventoryStockItem[]>([]);
  const [totalInventory, setTotalInventory] = useState<number>(0);
  const [categories, setCategories] = useState<InventoryCategoryOption[]>([]);
  const [warehouses, setWarehouses] = useState<InventoryWarehouseOption[]>([]);
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryStockItem | null>(null);

  const fetchCategories = useCallback((whId?: string) => {
    const url =
      whId && whId !== 'all'
        ? `/api/logistics/categories?warehouseId=${encodeURIComponent(whId)}`
        : '/api/logistics/categories';
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) setCategories(json);
      })
      .catch(() => {});
  }, []);

  const fetchWarehouses = useCallback(() => {
    fetch('/api/logistics/warehouses?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.items)) {
          setWarehouses(
            json.items.map((w: any) => ({ id: w.id, code: w.code, name: w.name }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCategories(filterWarehouse);
  }, [fetchCategories, filterWarehouse]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const loadInventory = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize),
      search: searchTerm,
      categoryId: filterCategory !== 'all' ? filterCategory : '',
      warehouseId: filterWarehouse !== 'all' ? filterWarehouse : '',
    });

    fetch(`/api/logistics/inventory?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          let items: InventoryStockItem[] = data.items || [];
          if (filterStatus && filterStatus !== 'all') {
            items = items.filter((it) => it.trangThai === filterStatus);
          }
          setInventory(items);
          setTotalInventory(filterStatus !== 'all' ? items.length : data.total || 0);
        }
      })
      .catch((err) => console.error('Lỗi tải inventory:', err))
      .finally(() => setLoading(false));
  }, [currentPage, pageSize, searchTerm, filterCategory, filterWarehouse, filterStatus]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  return (
    <>
      <InventoryToolbar
        warehouses={warehouses}
        filterWarehouse={filterWarehouse}
        onWarehouseChange={(val) => {
          setFilterWarehouse(val);
          setCurrentPage(1);
        }}
        filterStatus={filterStatus}
        onStatusChange={(val) => {
          setFilterStatus(val);
          setCurrentPage(1);
        }}
        categories={categories}
        filterCategory={filterCategory}
        onCategoryChange={(val) => {
          setFilterCategory(val);
          setCurrentPage(1);
        }}
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        onExportExcel={onExportExcel}
        extraRightActions={extraRightActions}
      />

      <InventoryTable
        items={inventory}
        loading={loading}
        showPrice={showPrice}
        onSelectItem={(item) => setSelectedDetailItem(item)}
      />

      <InventoryPagination
        currentPage={currentPage}
        totalItems={totalInventory}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      <InventoryDetailOffcanvas
        item={selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
      />
    </>
  );
};

export default WarehouseInventoryView;

