import React, { useState, useEffect, useRef } from 'react';
import {
  PencilSquare,
  PlusCircle,
  CheckCircleFill,
  XLg,
  InfoCircle,
  Printer,
  Layers,
  CurrencyDollar,
  CardText,
  Image as ImageIcon,
  Link45deg,
  CloudArrowUp,
  ListUl,
} from 'react-bootstrap-icons';
import { Button } from './Button';
import { Badge } from './Badge';
import { Input } from './Input';
import { Select } from './Select';
import { NumberInput } from './NumberInput';
import { SuggestionInput, type SuggestionItem } from './SuggestionInput';
import type {
  InventoryStockItem,
  InventoryWarehouseOption,
  InventoryCategoryOption,
} from './InventoryTable';

const DVT_SUGGESTIONS: string[] = [
  'Cái',
  'Bộ',
  'Chiếc',
  'Hộp',
  'Thùng',
  'Cuộn',
  'Thanh',
  'Tấm',
  'Kg',
  'Lít',
  'm',
  'm²',
];

const MATERIAL_SUGGESTIONS: string[] = [
  'Đồng',
  'Đồng thau mạ Crom',
  'Inox 304',
  'Sứ Ceramic phủ men Nano',
  'Nhựa ABS nguyên sinh',
  'Hợp kim kẽm',
  'Kính cường lực',
];

const BRAND_SUGGESTIONS: string[] = ['Seajong', 'OEM', 'Kossi', 'Flux'];

export interface InventoryItemFormModalProps {
  /** Mở modal ở chế độ thêm mới khi isOpen = true và item = null */
  isOpen?: boolean;
  /** Chế độ hoạt động: 'create' (thêm mới) hoặc 'edit' (chỉnh sửa) */
  mode?: 'create' | 'edit';
  /** Mặt hàng cần chỉnh sửa (nếu có) */
  item?: InventoryStockItem | null;
  warehouses?: InventoryWarehouseOption[];
  categories?: InventoryCategoryOption[];
  defaultWarehouseId?: string;
  defaultCategoryId?: string;
  onClose: () => void;
  onSaved: (savedItem: InventoryStockItem, mode: 'create' | 'edit') => void;
}

export const InventoryItemFormModal: React.FC<InventoryItemFormModalProps> = ({
  isOpen,
  mode,
  item = null,
  warehouses: initialWarehouses = [],
  categories: initialCategories = [],
  defaultWarehouseId = '',
  defaultCategoryId = '',
  onClose,
  onSaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoCodeRef = useRef<string>('');
  const [warehouses, setWarehouses] = useState<InventoryWarehouseOption[]>(initialWarehouses);
  const [categories, setCategories] = useState<InventoryCategoryOption[]>(initialCategories);
  const [supplierSuggestions, setSupplierSuggestions] = useState<SuggestionItem[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveMode: 'create' | 'edit' = mode || (item ? 'edit' : 'create');
  const modalVisible = isOpen !== undefined ? isOpen : Boolean(item);

  const [form, setForm] = useState({
    warehouseId: '',
    categoryId: '',
    tenHang: '',
    code: '',
    maThayThe: '',
    model: '',
    chatLieu: '',
    giaNhap: 0,
    giaVon: 0,
    giaBan: 0,
    donVi: 'Cái',
    soLuongMin: 0,
    ghiChu: '',
    imageUrl: '',
    nhaCungCap: '',
    brand: 'Seajong',
    thongSoKyThuat: '',
  });

  useEffect(() => {
    if (initialWarehouses.length > 0) setWarehouses(initialWarehouses);
  }, [initialWarehouses]);

  useEffect(() => {
    if (initialCategories.length > 0) setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    if (!modalVisible) return;
    if (warehouses.length === 0) {
      fetch('/api/logistics/warehouses?limit=100')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.items)) {
            setWarehouses(json.items.map((w: any) => ({ id: w.id, code: w.code, name: w.name })));
          }
        })
        .catch(() => {});
    }
    if (categories.length === 0) {
      fetch('/api/logistics/categories')
        .then((res) => res.json())
        .then((json) => {
          if (Array.isArray(json)) setCategories(json);
        })
        .catch(() => {});
    }
    fetch('/api/plan-finance/suppliers?pageSize=100')
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
        setSupplierSuggestions(
          list
            .filter((s: any) => s && s.name)
            .map((s: any) => ({
              id: String(s.id || s.name),
              value: String(s.name),
              label: String(s.name),
              subText: [s.phone, s.address].filter(Boolean).join(' • ') || undefined,
            }))
        );
      })
      .catch(() => {});
  }, [modalVisible, warehouses.length, categories.length]);

  useEffect(() => {
    if (!modalVisible) return;
    setErrorMsg(null);

    if (effectiveMode === 'edit' && item) {
      const primaryWarehouseId =
        item.stocks?.[0]?.warehouse?.id ||
        (item.stocks?.[0] as any)?.warehouseId ||
        warehouses[0]?.id ||
        '';
      const primaryImage =
        item.imageUrl ||
        (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '') ||
        '';

      setForm({
        warehouseId: primaryWarehouseId,
        categoryId: item.categoryId || (item as any).erpCategoryId || '',
        tenHang: item.tenHang || '',
        code: item.code || '',
        maThayThe: item.maThayThe || '',
        model: item.model || '',
        chatLieu: item.chatLieu || '',
        giaNhap: Number(item.giaNhap) || 0,
        giaVon: Number(item.giaVon ?? item.giaNhap) || 0,
        giaBan: Number(item.giaBan ?? item.giaBanLe) || 0,
        donVi: item.donVi || 'Cái',
        soLuongMin: Number(item.soLuongMin) || 0,
        ghiChu: item.ghiChu || '',
        imageUrl: primaryImage,
        nhaCungCap: (item as any).nhaCungCap || '',
        brand: item.brand || 'Seajong',
        thongSoKyThuat: (item as any).thongSoKyThuat || '',
      });
    } else {
      autoCodeRef.current = '';
      const initWhId =
        defaultWarehouseId && defaultWarehouseId !== 'all'
          ? defaultWarehouseId
          : warehouses[0]?.id || '';
      const initCatId =
        defaultCategoryId && defaultCategoryId !== 'all' ? defaultCategoryId : '';

      setForm({
        warehouseId: initWhId,
        categoryId: initCatId,
        tenHang: '',
        code: '',
        maThayThe: '',
        model: '',
        chatLieu: '',
        giaNhap: 0,
        giaVon: 0,
        giaBan: 0,
        donVi: 'Cái',
        soLuongMin: 0,
        ghiChu: '',
        imageUrl: '',
        nhaCungCap: '',
        brand: 'Seajong',
        thongSoKyThuat: '',
      });
    }
  }, [modalVisible, effectiveMode, item, defaultWarehouseId, defaultCategoryId, warehouses]);

  // Tự động gợi ý mã định danh khi tạo mới và chọn danh mục
  useEffect(() => {
    if (!modalVisible || effectiveMode !== 'create') return;
    if (!form.categoryId) return;
    // Chỉ tự sinh mã khi ô code đang trống hoặc đang mang mã tự sinh trước đó
    if (form.code && form.code !== autoCodeRef.current) return;

    fetch(`/api/logistics/inventory/generate-code?categoryId=${encodeURIComponent(form.categoryId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.code) {
          autoCodeRef.current = data.code;
          setForm((prev) => ({
            ...prev,
            code: !prev.code || prev.code === autoCodeRef.current ? data.code : prev.code,
          }));
        }
      })
      .catch(() => {});
  }, [modalVisible, effectiveMode, form.categoryId]);

  if (!modalVisible) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrintQr = () => {
    const qrData = encodeURIComponent(form.code || item?.code || item?.id || 'SEAJONG-SKU');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;
    const win = window.open('', '_blank', 'width=420,height=500');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>In mã QR - ${form.code || form.tenHang || 'Hàng hoá Seajong'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 24px; max-width: 300px; }
            img { width: 180px; height: 180px; object-fit: contain; }
            .sku { font-weight: 800; font-size: 16px; margin-top: 12px; color: #0f172a; font-family: monospace; }
            .name { font-size: 13px; color: #475569; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${qrUrl}" onload="window.print();" />
            <div class="sku">${form.code || ''}</div>
            <div class="name">${form.tenHang || ''}</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSave = async () => {
    if (!form.tenHang.trim()) {
      setErrorMsg('Vui lòng nhập tên thành phẩm / hàng hoá.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        ...(effectiveMode === 'edit' && item ? { id: item.id } : {}),
        warehouseId: form.warehouseId || undefined,
        categoryId: form.categoryId || null,
        tenHang: form.tenHang.trim(),
        code: form.code.trim() || undefined,
        maThayThe: form.maThayThe.trim() || null,
        model: form.model.trim() || null,
        chatLieu: form.chatLieu.trim() || null,
        giaNhap: Number(form.giaNhap) || 0,
        giaVon: Number(form.giaVon) || Number(form.giaNhap) || 0,
        giaBan: Number(form.giaBan) || 0,
        donVi: form.donVi.trim() || 'Cái',
        soLuongMin: Number(form.soLuongMin) || 0,
        ghiChu: form.ghiChu,
        imageUrl: form.imageUrl.trim() || null,
        nhaCungCap: form.nhaCungCap.trim() || null,
        brand: form.brand.trim() || 'Seajong',
        thongSoKyThuat: form.thongSoKyThuat.trim() || null,
      };

      const url =
        effectiveMode === 'edit' && item
          ? `/api/logistics/inventory/${item.id}`
          : '/api/logistics/inventory';
      const method = effectiveMode === 'edit' && item ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Không thể lưu thông tin hàng hoá');
      }

      const selectedCat = categories.find((c) => c.id === form.categoryId);
      const savedItem: InventoryStockItem = {
        ...(item || {}),
        ...data,
        id: data.id || item?.id || '',
        tenHang: form.tenHang.trim(),
        code: data.code || form.code.trim() || item?.code,
        maThayThe: form.maThayThe.trim() || null,
        model: form.model.trim() || null,
        chatLieu: form.chatLieu.trim() || null,
        giaNhap: Number(form.giaNhap) || 0,
        giaVon: Number(form.giaVon) || Number(form.giaNhap) || 0,
        giaBan: Number(form.giaBan) || 0,
        giaBanLe: Number(form.giaBan) || 0,
        donVi: form.donVi.trim() || 'Cái',
        soLuong: Number(data.soLuong ?? item?.soLuong) || 0,
        soLuongGiu: Number(data.soLuongGiu ?? item?.soLuongGiu) || 0,
        thucTon: Number(data.thucTon ?? item?.thucTon) || 0,
        soLuongMin: Number(form.soLuongMin) || 0,
        ghiChu: form.ghiChu,
        imageUrl: form.imageUrl.trim() || null,
        images: form.imageUrl.trim() ? [form.imageUrl.trim()] : item?.images || [],
        nhaCungCap: form.nhaCungCap.trim() || null,
        brand: form.brand.trim() || 'Seajong',
        thongSoKyThuat: form.thongSoKyThuat.trim() || null,
        categoryId: form.categoryId || item?.categoryId || null,
        categoryName: selectedCat?.name || data.categoryName || item?.categoryName || '',
        trangThai:
          data.trangThai ||
          item?.trangThai ||
          ((Number(data.soLuong ?? item?.soLuong) || 0) > 0 ? 'con-hang' : 'het-hang'),
      };

      onSaved(savedItem, effectiveMode);
      window.dispatchEvent(
        new CustomEvent('inventory_updated', { detail: { itemId: savedItem.id, mode: effectiveMode } })
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (effectiveMode === 'create'
            ? 'Có lỗi xảy ra khi thêm mới hàng hoá'
            : 'Có lỗi xảy ra khi cập nhật hàng hoá')
      );
    } finally {
      setSaving(false);
    }
  };

  const qrCodeData = encodeURIComponent(form.code || item?.code || item?.id || 'SEAJONG-NEW-SKU');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrCodeData}`;

  const statusBadgeVariant =
    effectiveMode === 'create'
      ? 'info'
      : item?.trangThai === 'con-hang'
      ? 'success'
      : item?.trangThai === 'sap-het'
      ? 'warning'
      : 'danger';
  const statusLabel =
    effectiveMode === 'create'
      ? 'Khởi tạo mới'
      : item?.trangThai === 'con-hang'
      ? 'Còn hàng'
      : item?.trangThai === 'sap-het'
      ? 'Sắp hết'
      : 'Hết hàng';

  return (
    <div
      className="fixed inset-0 z-[1060] flex flex-col overflow-hidden"
      style={{ background: '#EBF0F5', padding: '8px', gap: '8px' }}
    >
      {/* ── Header Card chuẩn Enterprise (khoảng đệm ngoài 8px) ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            {effectiveMode === 'create' ? <PlusCircle size={17} /> : <PencilSquare size={17} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="m-0 font-bold text-[15px] text-slate-900 leading-tight">
                {effectiveMode === 'create' ? 'Thêm mới hàng hoá vào kho' : 'Chỉnh sửa thành phẩm'}
              </h2>
              {form.code && <Badge variant="info">SKU: {form.code}</Badge>}
              <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
            </div>
            <p className="m-0 mt-0.5 text-xs text-slate-500 truncate">
              {effectiveMode === 'create'
                ? 'Khởi tạo thông tin định danh, phân loại kho, đơn giá tài chính và thông số kỹ thuật cho hàng hoá mới'
                : 'Đang cập nhật thông tin định danh, phân loại kho, đơn giá tài chính và thông số kỹ thuật'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircleFill size={13} />}
            isLoading={saving}
            onClick={handleSave}
          >
            Lưu & Hoàn tất
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={saving}
            title="Đóng"
            aria-label="Đóng"
          >
            <XLg size={15} />
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shrink-0">
          {errorMsg}
        </div>
      )}

      {/* ── Main Content Grid (khoảng trống giữa các thẻ card = 8px) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-full [&_.form-group]:!mb-0"
          style={{ gap: '8px' }}
        >
          {/* Left Card (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              {/* Section 1: THÔNG TIN CƠ BẢN */}
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <InfoCircle size={13} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    THÔNG TIN CƠ BẢN
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tồn hệ thống:{' '}
                  <strong className="text-slate-700">
                    {((effectiveMode === 'edit' ? item?.soLuong : 0) || 0).toLocaleString('vi-VN')}
                  </strong>{' '}
                  {form.donVi || 'cái'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-9 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Kho lưu trữ"
                      value={form.warehouseId}
                      onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
                      options={[
                        { label: 'Chọn kho lưu trữ...', value: '' },
                        ...warehouses.map((w) => ({ label: w.name, value: w.id })),
                      ]}
                    />

                    <Select
                      label="Danh mục thành phẩm *"
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                      options={[
                        { label: item?.categoryName || 'Chọn danh mục...', value: '' },
                        ...categories.map((c) => ({ label: c.name, value: c.id })),
                      ]}
                    />
                  </div>

                  <Input
                    label="Tên thành phẩm"
                    required
                    value={form.tenHang}
                    onChange={(e) => setForm((f) => ({ ...f, tenHang: e.target.value }))}
                    placeholder="Nhập tên thành phẩm / hàng hoá..."
                  />
                </div>

                {/* QR Code Box */}
                <div className="md:col-span-3 flex flex-col items-center justify-center bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5">
                  <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Printer size={11} />}
                    onClick={handlePrintQr}
                    className="mt-1 !py-1 !px-2 !text-[11px]"
                  >
                    Nhấn để in QR
                  </Button>
                </div>
              </div>

              {/* Row: Mã định danh, Mã thay thế, Kiểu dáng */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3">
                <div className="sm:col-span-3">
                  <Input
                    label="Mã định danh"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="Mã SKU (Tự sinh nếu để trống)..."
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    label="Mã thay thế"
                    value={form.maThayThe}
                    onChange={(e) => setForm((f) => ({ ...f, maThayThe: e.target.value }))}
                    placeholder="Ví dụ: SJ-..."
                  />
                </div>

                <div className="sm:col-span-6">
                  <Input
                    label="Kiểu dáng"
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="Kiểu dáng / Model sản phẩm..."
                  />
                </div>
              </div>
            </div>

            <hr className="my-4 border-slate-200/80" />

            {/* Bottom 2 columns: Left (Đặc tính vật liệu + Tài chính & Kho vận), Right (Tên gọi khi kê khai) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
              <div className="md:col-span-6 flex flex-col justify-between gap-4">
                {/* ĐẶC TÍNH VẬT LIỆU */}
                <div>
                  <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Layers size={13} />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      ĐẶC TÍNH VẬT LIỆU
                    </span>
                  </div>

                  <SuggestionInput
                    label="Chất liệu"
                    value={form.chatLieu}
                    onChange={(val) => setForm((f) => ({ ...f, chatLieu: val }))}
                    suggestions={MATERIAL_SUGGESTIONS}
                    placeholder="Chọn hoặc nhập chất liệu (Đồng, Inox 304, Sứ...)"
                  />
                </div>

                {/* TÀI CHÍNH & KHO VẬN */}
                <div>
                  <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <CurrencyDollar size={13} />
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      TÀI CHÍNH & KHO VẬN
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <NumberInput
                      label="Giá nhập"
                      value={form.giaNhap}
                      hideZero={false}
                      suffix="VNĐ"
                      onValueChange={(num) =>
                        setForm((f) => ({
                          ...f,
                          giaNhap: num,
                          giaVon: f.giaVon === 0 || f.giaVon === f.giaNhap ? num : f.giaVon,
                        }))
                      }
                    />

                    <NumberInput
                      label="Giá vốn (Bình quân)"
                      value={form.giaVon}
                      hideZero={false}
                      suffix="VNĐ"
                      onValueChange={(num) => setForm((f) => ({ ...f, giaVon: num }))}
                    />

                    <NumberInput
                      label="Giá bán niêm yết"
                      value={form.giaBan}
                      hideZero={false}
                      suffix="VNĐ"
                      onValueChange={(num) => setForm((f) => ({ ...f, giaBan: num }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-3">
                    <SuggestionInput
                      label="Đơn vị tính (ĐVT)"
                      value={form.donVi}
                      onChange={(val) => setForm((f) => ({ ...f, donVi: val }))}
                      suggestions={DVT_SUGGESTIONS}
                      placeholder="Cái, Bộ..."
                    />

                    <NumberInput
                      label="Tồn kho tối thiểu"
                      value={form.soLuongMin}
                      hideZero={false}
                      min={0}
                      suffix={form.donVi || 'cái'}
                      onValueChange={(num) =>
                        setForm((f) => ({ ...f, soLuongMin: Math.max(0, num) }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* TÊN GỌI KÊ KHAI */}
              <div className="md:col-span-6 flex flex-col">
                <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CardText size={13} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    TÊN GỌI KHI KÊ KHAI
                  </span>
                </div>

                <div className="form-group flex-1 flex flex-col !mb-0">
                  <label className="form-label">Chi tiết tên gọi kê khai & ghi chú lưu kho</label>
                  <textarea
                    value={form.ghiChu}
                    onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                    placeholder="Chi tiết tên gọi khi kê khai, ghi chú vật tư..."
                    className="form-input flex-1 min-h-[180px] resize-none py-2.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) - khoảng trống giữa 2 thẻ card = 8px */}
          <div className="lg:col-span-4 flex flex-col" style={{ gap: '8px' }}>
            {/* Card 1: Hình ảnh sản phẩm */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <ImageIcon size={13} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    HÌNH ẢNH SẢN PHẨM
                  </span>
                </div>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                    className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer border-0 bg-transparent"
                  >
                    Xoá ảnh
                  </button>
                )}
              </div>

              <div className="w-full h-48 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center overflow-hidden relative">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt={form.tenHang}
                    className="w-full h-full object-contain p-2 bg-white"
                  />
                ) : (
                  <>
                    <ImageIcon size={30} className="text-slate-300 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-400">Chưa có hình ảnh</span>
                  </>
                )}
              </div>

              <Input
                leftIcon={<Link45deg size={15} />}
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="Dán URL hình ảnh..."
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CloudArrowUp size={14} />}
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-center"
              >
                Tải ảnh từ máy tính
              </Button>
            </div>

            {/* Card 2: THÔNG TIN BỔ SUNG */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ListUl size={13} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  THÔNG TIN BỔ SUNG
                </span>
              </div>

              <SuggestionInput
                label="Nhà cung cấp / Nguồn hàng"
                value={form.nhaCungCap}
                onChange={(val) => setForm((f) => ({ ...f, nhaCungCap: val }))}
                suggestions={supplierSuggestions}
                placeholder="Chọn hoặc nhập tên đối tác cung ứng..."
              />

              <SuggestionInput
                label="Thương hiệu"
                value={form.brand}
                onChange={(val) => setForm((f) => ({ ...f, brand: val }))}
                suggestions={BRAND_SUGGESTIONS}
                placeholder="Seajong, OEM..."
              />

              <div className="form-group flex-1 flex flex-col !mb-0">
                <label className="form-label">Thông số kỹ thuật</label>
                <textarea
                  rows={4}
                  value={form.thongSoKyThuat}
                  onChange={(e) => setForm((f) => ({ ...f, thongSoKyThuat: e.target.value }))}
                  placeholder="Chi tiết thông số kỹ thuật..."
                  className="form-input flex-1 min-h-[96px] resize-none py-2"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemFormModal;
