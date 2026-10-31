import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Offcanvas } from '@/components/common/Offcanvas';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { DatePicker } from '@/components/common/DatePicker';
import { useToast } from '@/components/ui/Toast';
import { canManageProdOrders } from '@/lib/production-permissions';
import {
  SendPlus,
  PlusCircleFill,
  Trash3,
  BoxSeam,
  XLg,
  InfoCircleFill,
} from 'react-bootstrap-icons';

interface ProductSuggestion {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  loai: string;
  hasBom: boolean;
  bomId: string | null;
  bomCode: string | null;
  bomName: string | null;
  warehouses?: string[];
  totalStock?: number;
}

interface RequestItemRow {
  rowId: string;
  productName: string;
  productCode: string;
  inventoryItemId: string;
  dinhMucId: string;
  bomCode: string;
  quantity: string;
  unit: string;
}

interface CreateProductionRequestOffcanvasProps {
  show: boolean;
  onClose?: () => void;
  onHide?: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

const createEmptyRow = (): RequestItemRow => ({
  rowId: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  productName: '',
  productCode: '',
  inventoryItemId: '',
  dinhMucId: '',
  bomCode: '',
  quantity: '10',
  unit: 'bộ',
});

export function CreateProductionRequestOffcanvas({
  show,
  onClose,
  onHide,
  onCreated,
  onSuccess,
}: CreateProductionRequestOffcanvasProps) {
  const handleClose = onClose || onHide || (() => {});
  const handleCreated = onCreated || onSuccess;

  const { data: session } = useSession();
  const isProdAdmin = canManageProdOrders(session?.user);
  const { success: toastSuccess, error: toastError } = useToast();

  const [items, setItems] = useState<RequestItemRow[]>([createEmptyRow()]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [products, setProducts] = useState<ProductSuggestion[]>([]);
  const [activeRowDropdown, setActiveRowDropdown] = useState<string | null>(null);
  const [activeRowSearch, setActiveRowSearch] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      fetch('/api/production/products')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setProducts(data);
        })
        .catch(() => {});
    }
  }, [show]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveRowDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFilteredProducts = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
      )
      .slice(0, 12);
  };

  const handleSelectProductForRow = (rowId: string, p: ProductSuggestion) => {
    setItems((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              productName: p.name,
              productCode: p.code || '',
              inventoryItemId: p.id,
              dinhMucId: p.bomId || '',
              bomCode: p.bomCode || '',
              unit: p.unit || 'bộ',
            }
          : row
      )
    );
    setActiveRowDropdown(null);
  };

  const handleUpdateRow = (rowId: string, field: keyof RequestItemRow, value: string) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        if (field === 'productName') {
          return {
            ...row,
            productName: value,
            productCode: '',
            inventoryItemId: '',
            dinhMucId: '',
            bomCode: '',
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleAddRow = () => {
    setItems((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.rowId !== rowId) : prev));
  };

  const resetForm = () => {
    setItems([createEmptyRow()]);
    setPriority('normal');
    setNotes('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isProdAdmin) {
      toastError(
        'Không có quyền',
        'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền tạo yêu cầu sản xuất'
      );
      return;
    }

    const validItems = items.filter((i) => i.productName.trim() !== '');
    if (validItems.length === 0) {
      toastError('Thiếu thông tin', 'Vui lòng nhập hoặc chọn ít nhất 1 sản phẩm cần sản xuất');
      return;
    }

    for (let idx = 0; idx < validItems.length; idx++) {
      const row = validItems[idx];
      if (!row.quantity || Number(row.quantity) <= 0) {
        toastError(
          'Số lượng không hợp lệ',
          `Sản phẩm thứ ${idx + 1} (${row.productName}) cần có số lượng lớn hơn 0`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/production/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map((i) => ({
            productName: i.productName.trim(),
            productCode: i.productCode || null,
            inventoryItemId: i.inventoryItemId || null,
            dinhMucId: i.dinhMucId || null,
            quantity: Number(i.quantity),
            unit: i.unit || 'bộ',
          })),
          startDate,
          dueDate,
          priority,
          notes: notes.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toastSuccess(
          'Đã gửi yêu cầu sản xuất',
          `Mã lệnh ${json.data?.order?.code || ''} (${validItems.length} mặt hàng) đã được trình Giám đốc phê duyệt`
        );
        resetForm();
        handleClose();
        if (handleCreated) handleCreated();
      } else {
        toastError('Không thể tạo yêu cầu', json.error || 'Vui lòng thử lại sau');
      }
    } catch (error) {
      console.error(error);
      toastError('Lỗi kết nối', 'Không thể kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const totalQty = items.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <Offcanvas
      isOpen={show}
      onClose={handleClose}
      icon={<SendPlus size={20} />}
      title="Tạo Yêu Cầu Sản Xuất"
      description="Lập phiếu đề xuất lệnh sản xuất (LSX) trình Giám đốc phê duyệt"
      width="400px"
      confirmText={`Trình Giám Đốc Duyệt (${items.length} SP)`}
      cancelText="Hủy bỏ"
      onConfirm={() => handleSubmit()}
      onCancel={handleClose}
      isSubmitting={submitting}
      confirmDisabled={!isProdAdmin}
    >
      <div className="space-y-3.5" ref={containerRef}>
        {/* Banner thông báo quy trình */}
        <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200/80 flex items-start gap-2 text-xs text-slate-700">
          <InfoCircleFill size={14} className="text-sky-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900">Quy trình phê duyệt:</strong> Yêu cầu sẽ tự động tạo
            mã <span className="font-mono font-bold text-sky-700">LSX</span> và gửi thông báo trình{' '}
            <strong className="text-slate-900">Giám đốc</strong> phê duyệt.
          </div>
        </div>

        {/* Header danh sách sản phẩm + Nút thêm dòng */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>
              Thành phẩm cần SX <span className="text-rose-500">*</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {items.length} SP • SL: {totalQty}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<PlusCircleFill size={13} />}
            onClick={handleAddRow}
          >
            Thêm SP
          </Button>
        </div>

        {/* Danh sách từng dòng sản phẩm */}
        <div className="space-y-2.5">
          {items.map((row, index) => {
            const isDropdownOpen = activeRowDropdown === row.rowId;
            const filteredList = isDropdownOpen ? getFilteredProducts(activeRowSearch) : [];

            return (
              <div
                key={row.rowId}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-slate-700">
                    #{index + 1} Mặt hàng sản xuất
                  </span>
                  <div className="flex items-center gap-1.5">
                    {row.productCode && (
                      <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono text-[10.5px] font-semibold">
                        {row.productCode}
                      </span>
                    )}
                    {row.bomCode && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10.5px] font-semibold">
                        ✓ {row.bomCode}
                      </span>
                    )}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.rowId)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Xoá dòng này"
                      >
                        <Trash3 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Ô chọn/nhập sản phẩm */}
                <div className="relative">
                  <div className="relative">
                    <Input
                      placeholder="Tìm hoặc nhập tên thành phẩm..."
                      value={row.productName}
                      leftIcon={<BoxSeam size={14} />}
                      onFocus={() => {
                        setActiveRowDropdown(row.rowId);
                        setActiveRowSearch(row.productName);
                      }}
                      onChange={(e) => {
                        handleUpdateRow(row.rowId, 'productName', e.target.value);
                        setActiveRowDropdown(row.rowId);
                        setActiveRowSearch(e.target.value);
                      }}
                      style={{ marginBottom: 0 }}
                    />
                    {row.productName && (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateRow(row.rowId, 'productName', '');
                          setActiveRowSearch('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <XLg size={11} />
                      </button>
                    )}
                  </div>

                  {isDropdownOpen && filteredList.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                      {filteredList.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProductForRow(row.rowId, p)}
                          className="px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{p.name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {p.code && <span className="font-mono">Mã: {p.code}</span>}
                              <span>• ĐVT: {p.unit}</span>
                              {typeof p.totalStock === 'number' && (
                                <span className="text-sky-700 font-semibold">
                                  • Tồn: {p.totalStock}
                                </span>
                              )}
                            </div>
                          </div>
                          {p.hasBom ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                              {p.bomCode || 'Có BOM'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                              Chưa có BOM
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Số lượng & Đơn vị tính */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => handleUpdateRow(row.rowId, 'quantity', e.target.value)}
                    prefix="SL"
                    style={{ marginBottom: 0 }}
                  />
                  <Select
                    value={row.unit}
                    onChange={(e) => handleUpdateRow(row.rowId, 'unit', e.target.value)}
                    options={[
                      { value: 'bộ', label: 'ĐVT: Bộ' },
                      { value: 'cái', label: 'ĐVT: Cái' },
                      { value: 'chiếc', label: 'ĐVT: Chiếc' },
                      { value: 'hộp', label: 'ĐVT: Hộp' },
                      { value: 'thùng', label: 'ĐVT: Thùng' },
                    ]}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ngày bắt đầu & Hạn hoàn thành */}
        <div className="grid grid-cols-2 gap-2.5">
          <DatePicker
            label="Ngày bắt đầu dự kiến"
            value={startDate}
            onChange={(val) => setStartDate(val)}
            style={{ marginBottom: 0 }}
          />
          <DatePicker
            label="Hạn hoàn thành"
            required
            value={dueDate}
            min={startDate}
            onChange={(val) => setDueDate(val)}
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* Mức độ ưu tiên */}
        <div>
          <label className="form-label">Mức độ ưu tiên</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'normal', label: 'Bình thường' },
              { key: 'high', label: 'Ưu tiên cao' },
              { key: 'urgent', label: 'Khẩn cấp' },
            ].map((opt) => {
              const active = priority === opt.key;
              return (
                <Button
                  key={opt.key}
                  type="button"
                  size="sm"
                  variant={active ? 'primary' : 'outline'}
                  onClick={() => setPriority(opt.key as any)}
                  className="w-full"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Lý do / Ghi chú */}
        <div>
          <label className="form-label">Lý do / Thuyết minh yêu cầu sản xuất</label>
          <textarea
            rows={3}
            className="form-input w-full"
            style={{ height: 'auto', padding: '8px 12px', resize: 'none' }}
            placeholder="Nhập lý do sản xuất (VD: Sản xuất dự trữ tồn kho an toàn, phục vụ đơn hàng đại lý...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Offcanvas>
  );
}

export default CreateProductionRequestOffcanvas;
