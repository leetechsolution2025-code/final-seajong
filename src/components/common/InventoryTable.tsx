import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BoxSeam,
  Boxes,
  CashStack,
  ExclamationTriangleFill,
  XCircleFill,
  FileEarmarkExcel,
  ChevronLeft,
  ChevronRight,
} from 'react-bootstrap-icons';
import { TableToolbar, type TableToolbarFilter, type TableToolbarMenuItem } from './TableToolbar';
import { FullWidthTable } from './FullWidthTable';
import { Pagination } from './Pagination';
import { Button } from './Button';
import { Offcanvas } from './Offcanvas';
import { HoverImage } from '../ui/HoverImage';

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
  onImportExcel?: (file: File) => void;
  onRefresh?: () => void;
  onPrint?: () => void;
  showMenu?: boolean;
  menuItems?: TableToolbarMenuItem[];
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
  onImportExcel,
  onRefresh,
  onPrint,
  showMenu = true,
  menuItems,
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
          { label: 'Đang giữ hàng', value: 'dang-giu' },
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
        extraRightActions ? (
          <div className="hidden md:flex items-center gap-2">
            {extraRightActions}
          </div>
        ) : undefined
      }
      showMenu={showMenu}
      menuItems={menuItems}
      onExportExcel={onExportExcel}
      onImportExcel={onImportExcel}
      onRefresh={onRefresh}
      onPrint={onPrint}
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
  onTogglePrice?: () => void;
  emptyText?: string;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  loading = false,
  onSelectItem,
  showPrice = false,
  onTogglePrice,
  emptyText = 'Không tìm thấy mặt hàng nào trong kho khớp điều kiện',
}) => {
  return (
    <FullWidthTable loading={loading}>
      <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: '13px' }}>
        <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
          <tr className="text-slate-500 text-[11px] sm:text-[11.5px] uppercase tracking-[0.06em] font-bold">
            <th className="py-2.5 px-2.5 sm:px-3.5 md:min-w-[320px]">Hàng hoá & Quy cách</th>
            <th className="py-2.5 px-2 sm:px-3.5 w-14 sm:w-20 text-center whitespace-nowrap">ĐVT</th>
            <th className="hidden md:table-cell py-2.5 px-3.5 w-32 text-right">Tồn hệ thống</th>
            <th className="hidden md:table-cell py-2.5 px-3.5 w-28 text-right">Đã giữ</th>
            <th className="hidden md:table-cell py-2.5 px-3.5 w-32 text-right">Tồn thực tế</th>
            <th className="hidden md:table-cell py-2.5 px-3.5 w-36 text-right">
              <span className="inline-flex items-center gap-1.5 justify-end">
                <span>Giá niêm yết</span>
                {onTogglePrice && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePrice();
                    }}
                    title={showPrice ? 'Ẩn giá niêm yết' : 'Hiển thị giá niêm yết'}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <i className={`bi ${showPrice ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-xs`} />
                  </button>
                )}
              </span>
            </th>
            <th className="hidden md:table-cell py-2.5 px-3.5 w-28 text-center">Trạng thái</th>
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
                <td className="py-2.5 px-2.5 sm:px-3.5 align-top max-w-0 md:max-w-none w-full">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    {/* Ảnh sản phẩm */}
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 overflow-hidden shadow-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.imageUrl || (item.images && item.images.length > 0) ? (
                        <HoverImage
                          src={item.imageUrl || (item.images && item.images[0]) || ''}
                          images={
                            item.images && item.images.length > 0
                              ? item.images
                              : item.imageUrl
                              ? [item.imageUrl]
                              : []
                          }
                          alt={item.tenHang}
                          className="w-full h-full object-cover bg-white"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer',
                          }}
                          fallback={<BoxSeam size={18} />}
                        />
                      ) : (
                        <BoxSeam size={18} />
                      )}
                    </div>

                    {/* Tên hàng hoá, mã SKU, mã phụ và model */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-semibold text-slate-900 text-[13px] leading-snug truncate md:line-clamp-2 md:whitespace-normal"
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

                      {/* Số lượng tồn hiển thị dưới mã hàng hoá trên màn hình điện thoại */}
                      <div className="flex md:hidden items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px]">
                        <span className="text-slate-500">
                          Tồn: <strong className="font-mono text-slate-800">{(item.soLuong || 0).toLocaleString('vi-VN')}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">
                          Giữ:{' '}
                          <strong className={`font-mono ${(item.soLuongGiu || 0) > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {(item.soLuongGiu || 0).toLocaleString('vi-VN')}
                          </strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">
                          Thực tế:{' '}
                          <strong className="font-mono text-emerald-700">
                            {(item.thucTon ?? item.soLuong ?? 0).toLocaleString('vi-VN')}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-2 sm:px-3.5 align-top text-center text-xs text-slate-600 whitespace-nowrap">
                  {item.donVi || 'Bộ'}
                </td>
                <td className="hidden md:table-cell py-2.5 px-3.5 align-top text-right font-medium text-slate-800 text-xs font-mono">
                  {(item.soLuong || 0).toLocaleString('vi-VN')}
                </td>
                <td className="hidden md:table-cell py-2.5 px-3.5 align-top text-right text-xs font-mono font-medium">
                  {(item.soLuongGiu || 0) > 0 ? (
                    <span className="text-amber-600 font-semibold">
                      {(item.soLuongGiu || 0).toLocaleString('vi-VN')}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="hidden md:table-cell py-2.5 px-3.5 align-top text-right">
                  <div className="font-bold text-slate-900 text-[13.5px] font-mono">
                    {(item.thucTon ?? item.soLuong ?? 0).toLocaleString('vi-VN')}
                  </div>
                </td>
                <td className="hidden md:table-cell py-2.5 px-3.5 align-top text-right font-medium text-slate-400 text-xs font-mono">
                  {showPrice && (item.giaBanLe || item.giaBan) ? (
                    <span className="font-semibold text-slate-800">
                      {Number(item.giaBanLe || item.giaBan).toLocaleString('vi-VN')} ₫
                    </span>
                  ) : (
                    <span className="tracking-widest font-semibold text-slate-400 select-none">
                      ****** ₫
                    </span>
                  )}
                </td>
                <td className="hidden md:table-cell py-2.5 px-3.5 align-top text-center">
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
  showPrice: initialShowPrice = false,
  onExportExcel,
  extraRightActions,
}) => {
  const [showPrice, setShowPrice] = useState<boolean>(initialShowPrice);
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

  // ── States cho 4 thẻ Card KPI hàng hoá trong kho ──
  const [stats, setStats] = useState<{
    totalItems: number;
    totalQty: number;
    reservedQty: number;
    availableQty: number;
    totalValue: number;
    totalCostValue: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalWarehouses: number;
  }>({
    totalItems: 1167,
    totalQty: 160400,
    reservedQty: 459,
    availableQty: 159941,
    totalValue: 18296177000,
    totalCostValue: 10690128000,
    inStockCount: 636,
    lowStockCount: 17,
    outOfStockCount: 514,
    totalWarehouses: 3,
  });

  const fetchStats = useCallback(() => {
    const url =
      filterWarehouse !== 'all'
        ? `/api/logistics/inventory/stats?warehouseId=${encodeURIComponent(filterWarehouse)}`
        : '/api/logistics/inventory/stats';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setStats(data);
        }
      })
      .catch(() => {});
  }, [filterWarehouse]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
      status: filterStatus !== 'all' ? filterStatus : '',
      categoryId: filterCategory !== 'all' ? filterCategory : '',
      warehouseId: filterWarehouse !== 'all' ? filterWarehouse : '',
    });

    fetch(`/api/logistics/inventory?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInventory(data.items || []);
          setTotalInventory(data.total || 0);
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
      {/* ── 4 THẺ CARD KPI THÔNG TIN HÀNG HOÁ TRONG KHO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50/70 border-b border-slate-200">
        {/* Card 1: Tổng mặt hàng tồn kho (SKU) */}
        <div
          onClick={() => {
            setFilterStatus('all');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 shadow-2xs'
          }`}
          title="Bấm để xem tất cả mặt hàng tồn kho"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-lg shadow-2xs">
            <BoxSeam size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Tổng mặt hàng (SKU)
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {stats.totalItems.toLocaleString('vi-VN')}
              </span>
              <span className="text-[11px] font-medium text-slate-500">mã hàng</span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium block truncate mt-0.5">
              {stats.totalWarehouses ? `Lưu tại ${stats.totalWarehouses} kho hàng` : 'Đang quản lý'}
            </span>
          </div>
        </div>

        {/* Card 2: Tổng giá trị hàng hoá trong kho */}
        <div
          onClick={() => {
            setFilterStatus((prev) => (prev === 'con-hang' ? 'all' : 'con-hang'));
            setCurrentPage(1);
          }}
          className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'con-hang'
              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/40 shadow-xs'
              : filterStatus === 'dang-giu'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 shadow-2xs'
          }`}
          title="Bấm để lọc các mặt hàng còn hàng ổn định (hoặc bấm lại để hủy lọc)"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-lg shadow-2xs">
            <CashStack size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Tổng giá trị hàng hoá
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-700 font-mono tracking-tight">
                {(Math.round((stats.totalValue || 0) / 1000) * 1000).toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-bold text-emerald-600">₫</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium block truncate mt-0.5">
              Thực tồn: <strong className="text-slate-700">{(stats.totalQty || 0).toLocaleString('vi-VN')}</strong> sp •{' '}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterStatus((prev) => (prev === 'dang-giu' ? 'all' : 'dang-giu'));
                  setCurrentPage(1);
                }}
                className={`underline decoration-dotted cursor-pointer hover:text-amber-700 font-semibold ${
                  filterStatus === 'dang-giu' ? 'text-amber-700 bg-amber-100/70 px-1 rounded' : ''
                }`}
                title="Bấm để lọc các mặt hàng đang giữ chỗ (cam kết đơn hàng)"
              >
                Đã giữ: {(stats.reservedQty || 0).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Chạm ngưỡng sắp hết */}
        <div
          onClick={() => {
            setFilterStatus((prev) => (prev === 'sap-het' ? 'all' : 'sap-het'));
            setCurrentPage(1);
          }}
          className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'sap-het'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 shadow-2xs'
          }`}
          title="Bấm để lọc các mặt hàng chạm ngưỡng tồn tối thiểu (hoặc bấm lại để hủy lọc)"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-lg shadow-2xs">
            <ExclamationTriangleFill size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Cảnh báo sắp hết
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-amber-600 font-mono tracking-tight">
                {stats.lowStockCount.toLocaleString('vi-VN')}
              </span>
              <span className="text-[11px] font-medium text-slate-500">mặt hàng</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium block truncate mt-0.5">
              Dưới định mức an toàn
            </span>
          </div>
        </div>

        {/* Card 4: Hết hàng cần bổ sung */}
        <div
          onClick={() => {
            setFilterStatus((prev) => (prev === 'het-hang' ? 'all' : 'het-hang'));
            setCurrentPage(1);
          }}
          className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'het-hang'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 shadow-2xs'
          }`}
          title="Bấm để lọc các mặt hàng đã hết hàng (hoặc bấm lại để hủy lọc)"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 text-lg shadow-2xs">
            <XCircleFill size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Hết hàng tồn kho
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-rose-600 font-mono tracking-tight">
                {stats.outOfStockCount.toLocaleString('vi-VN')}
              </span>
              <span className="text-[11px] font-medium text-slate-500">mặt hàng</span>
            </div>
            <span className="text-[11px] text-rose-700 font-medium block truncate mt-0.5">
              Thực tồn = 0 • Cần nhập thêm
            </span>
          </div>
        </div>
      </div>

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
        onTogglePrice={() => setShowPrice((prev) => !prev)}
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

