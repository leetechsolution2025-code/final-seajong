import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { canManageProdDefects } from '@/lib/production-permissions';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Offcanvas } from '@/components/common/Offcanvas';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

interface CreateDefectOffcanvasProps {
  show: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  defaultSource?: string;
}

function calculateItemRefundPricing(item: any, selectedOrder: any) {
  if (!item) {
    return {
      originalUnitPrice: 0,
      itemNetUnitPrice: 0,
      itemDiscountPct: 0,
      orderDiscountPct: 0,
      effectiveUnitPrice: 0,
      discountInfo: '',
    };
  }

  const originalUnitPrice = Number(item.donGia) || 0;
  const orderQty = Number(item.soLuong) || 1;
  const thanhTien =
    Number(item.thanhTien) !== undefined && !isNaN(Number(item.thanhTien))
      ? Number(item.thanhTien)
      : originalUnitPrice * orderQty;

  const itemNetUnitPrice = orderQty > 0 ? thanhTien / orderQty : originalUnitPrice;

  let itemDiscountPct = 0;
  if (originalUnitPrice > 0 && originalUnitPrice > itemNetUnitPrice) {
    itemDiscountPct =
      Math.round(((originalUnitPrice - itemNetUnitPrice) / originalUnitPrice) * 1000) / 10;
  }

  const orderDiscountPct = Number(selectedOrder?.discount) || 0;
  const effectiveUnitPrice = Math.max(
    0,
    Math.round(itemNetUnitPrice * (1 - orderDiscountPct / 100))
  );

  const parts: string[] = [];
  if (itemDiscountPct > 0) parts.push(`CK sản phẩm -${itemDiscountPct}%`);
  if (orderDiscountPct > 0) parts.push(`CK đơn -${orderDiscountPct}%`);
  const discountInfo =
    parts.length > 0
      ? `${parts.join(', ')} (Đơn giá thực: ${effectiveUnitPrice.toLocaleString('vi-VN')} đ/sp, gốc: ${originalUnitPrice.toLocaleString('vi-VN')} đ)`
      : '';

  return {
    originalUnitPrice,
    itemNetUnitPrice,
    itemDiscountPct,
    orderDiscountPct,
    effectiveUnitPrice,
    discountInfo,
  };
}

export function CreateDefectOffcanvas({
  show,
  onClose,
  onRefresh,
  defaultSource = 'INTERNAL',
}: CreateDefectOffcanvasProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: defaultSource,
    status: 'NEW',
    productName: '',
    productCode: '',
    quantity: 1,
    refundAmount: 0,
    unitPrice: 0,
    effectiveUnitPrice: 0,
    itemDiscountPct: 0,
    orderDiscountPct: 0,
    discountInfo: '',
    description: '',
    customerId: '',
    customerName: '',
    customerAddress: '',
    orderNumber: '',
    reporterName: '',
    reporterDepartment: '',
    assignedTo: '',
    completionDate: '',
  });
  const [useDiscountedPrice, setUseDiscountedPrice] = useState(true);
  const [files, setFiles] = useState<File[]>([]);

  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  const { data: session } = useSession();
  const isProdAdmin = canManageProdDefects(session?.user);

  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        reporterName: session.user.name || '',
        reporterDepartment: (session.user as any).departmentName || 'Phòng ban khác',
      }));
    }
  }, [session]);

  useEffect(() => {
    if (show) {
      setFormData((prev) => ({ ...prev, source: defaultSource }));
      fetch('/api/plan-finance/customers?pageSize=200')
        .then((res) => res.json())
        .then((data) => {
          if (data.customers) setCustomers(data.customers);
        })
        .catch(console.error);

      fetch('/api/hr/employees?department=production&pageSize=100')
        .then((res) => res.json())
        .then((data) => {
          if (data.employees) {
            setEmployees(data.employees);
            const manager = data.employees.find(
              (e: any) => e.level === 'Trưởng phòng' || e.level === 'Trưởng bộ phận'
            );
            if (manager) {
              setFormData((prev) => ({ ...prev, assignedTo: manager.fullName }));
            } else if (data.employees.length > 0) {
              setFormData((prev) => ({ ...prev, assignedTo: data.employees[0].fullName }));
            }
          }
        })
        .catch(console.error);
    }
  }, [show, defaultSource]);

  useEffect(() => {
    if (formData.customerId) {
      fetch(`/api/sales/customer-orders?customerId=${formData.customerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.orders) setOrders(data.orders);
        })
        .catch(console.error);
    } else {
      setOrders([]);
    }
  }, [formData.customerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 5) {
        alert('Chỉ được phép đính kèm tối đa 5 tệp.');
        return;
      }
      setFiles([...files, ...newFiles]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleProductCodeBlur = async () => {
    if (!formData.productCode) return;
    try {
      const res = await fetch(
        `/api/plan-finance/inventory/search?q=${formData.productCode}&limit=5`
      );
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const item =
          data.items.find(
            (i: any) => (i.code ? i.code.toLowerCase() : '') === formData.productCode.toLowerCase()
          ) || data.items[0];
        setFormData((prev) => ({ ...prev, productName: item?.tenHang || '' }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fileToBase64 = (file: File): Promise<{ fileName: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ fileName: file.name, dataUrl: String(reader.result || '') });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isProdAdmin) {
      alert(
        'Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền tạo hồ sơ lỗi!'
      );
      return;
    }
    setLoading(true);
    try {
      const filesData = await Promise.all(files.map(fileToBase64));

      const res = await fetch('/api/production/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          filesData,
        }),
      });
      if (res.ok) {
        onRefresh?.();
        onClose();
        setFormData({
          source: defaultSource,
          status: 'NEW',
          productName: '',
          productCode: '',
          quantity: 1,
          refundAmount: 0,
          unitPrice: 0,
          effectiveUnitPrice: 0,
          itemDiscountPct: 0,
          orderDiscountPct: 0,
          discountInfo: '',
          description: '',
          customerId: '',
          customerName: '',
          customerAddress: '',
          orderNumber: '',
          reporterName: session?.user?.name || '',
          reporterDepartment: (session?.user as any)?.departmentName || 'Phòng ban khác',
          assignedTo:
            employees.find((e) => e.level === 'Trưởng phòng' || e.level === 'Trưởng bộ phận')
              ?.fullName ||
            employees[0]?.fullName ||
            '',
          completionDate: '',
        });
        setUseDiscountedPrice(true);
        setFiles([]);
      } else {
        alert('Có lỗi xảy ra khi tạo hồ sơ!');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo hồ sơ!');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    (c.name || '').toLowerCase().includes(formData.customerName.toLowerCase())
  );

  const selectedOrder = orders.find((o) => (o.code || o.id) === formData.orderNumber);

  return (
    <Offcanvas
      isOpen={show}
      onClose={onClose}
      title="Tạo hồ sơ lỗi mới"
      description="Ghi nhận sản phẩm lỗi nội bộ, bảo hành hoặc hàng trả về"
      icon={<i className="bi bi-tools text-lg" />}
      width="400px"
      confirmText="Lưu hồ sơ"
      cancelText="Hủy bỏ"
      onConfirm={() => handleSubmit()}
      onCancel={onClose}
      isSubmitting={loading}
      confirmDisabled={!isProdAdmin}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-[13px]">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-7">
            <Input
              label="Người tạo"
              value={formData.reporterName}
              readOnly
              disabled
            />
          </div>
          <div className="col-span-5">
            <Input
              label="Ngày tạo"
              value={new Date().toLocaleDateString('vi-VN')}
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-7">
            <Select
              label="Người xử lý"
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              options={[
                { label: 'Chọn người xử lý...', value: '' },
                ...employees.map((emp) => ({ label: emp.fullName, value: emp.fullName })),
              ]}
            />
          </div>
          <div className="col-span-5">
            <Input
              label="Ngày hoàn thành"
              type="date"
              value={formData.completionDate}
              onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-5">
            <Select
              label="Trạng thái *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { label: 'Chưa xử lý', value: 'NEW' },
                { label: 'Đã xử lý', value: 'COMPLETED' },
              ]}
            />
          </div>

          <div className="col-span-7 relative">
            <Input
              label="Tên khách hàng"
              placeholder="Nhập để tìm khách hàng..."
              value={formData.customerName}
              onChange={(e) => {
                setFormData({ ...formData, customerName: e.target.value, customerId: '' });
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
            />
            {showCustomerDropdown && (
              <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="px-3 py-2 border-b border-slate-100 hover:bg-sky-50 text-xs text-slate-700 cursor-pointer"
                      onMouseDown={() => {
                        setFormData({
                          ...formData,
                          customerId: c.id,
                          customerName: c.name,
                          customerAddress: c.address || '',
                          orderNumber: '',
                        });
                        setShowCustomerDropdown(false);
                      }}
                    >
                      {c.name}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">Không tìm thấy...</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8">
            <Select
              label="Số hiệu đơn hàng"
              value={formData.orderNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  orderNumber: e.target.value,
                  productCode: '',
                  productName: '',
                  unitPrice: 0,
                  effectiveUnitPrice: 0,
                  itemDiscountPct: 0,
                  orderDiscountPct: 0,
                  discountInfo: '',
                  refundAmount: 0,
                }))
              }
              options={[
                { label: 'Chọn đơn hàng...', value: '' },
                ...orders.map((o) => ({
                  label: `${o.code || o.id}${o.discount > 0 ? ` (CK đơn: -${o.discount}%)` : ''}`,
                  value: o.code || o.id,
                })),
              ]}
            />
          </div>
          <div className="col-span-4">
            <Input
              label="Số lượng *"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => {
                const qty = parseInt(e.target.value) || 1;
                const priceToUse =
                  useDiscountedPrice && formData.effectiveUnitPrice > 0
                    ? formData.effectiveUnitPrice
                    : formData.unitPrice > 0
                    ? formData.unitPrice
                    : 0;
                setFormData((prev) => ({
                  ...prev,
                  quantity: qty,
                  refundAmount: priceToUse > 0 ? priceToUse * qty : prev.refundAmount,
                }));
              }}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-5">
            <Select
              label="Nguồn lỗi *"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              options={[
                { label: 'Nội bộ', value: 'INTERNAL' },
                { label: 'Bảo hành', value: 'WARRANTY' },
                { label: 'Trả về', value: 'RETURN' },
              ]}
            />
          </div>
          <div className="col-span-7">
            {selectedOrder?.saleOrderItems?.length > 0 ? (
              <Select
                label="Mã sản phẩm *"
                value={formData.productCode}
                onChange={(e) => {
                  const val = e.target.value;
                  const item = selectedOrder?.saleOrderItems?.find(
                    (i: any) =>
                      (i.inventoryItem?.code && i.inventoryItem.code === val) ||
                      i.id === val ||
                      (i.code && i.code === val)
                  );

                  if (item) {
                    const pricing = calculateItemRefundPricing(item, selectedOrder);
                    const priceToUse =
                      useDiscountedPrice && pricing.effectiveUnitPrice > 0
                        ? pricing.effectiveUnitPrice
                        : pricing.originalUnitPrice;
                    const currentQty = formData.quantity || 1;

                    setFormData((prev) => ({
                      ...prev,
                      productCode: item.inventoryItem?.code || item.code || val,
                      productName: item.inventoryItem?.tenHang || item.tenHang || '',
                      unitPrice: pricing.originalUnitPrice,
                      effectiveUnitPrice: pricing.effectiveUnitPrice,
                      itemDiscountPct: pricing.itemDiscountPct,
                      orderDiscountPct: pricing.orderDiscountPct,
                      discountInfo: pricing.discountInfo,
                      refundAmount: priceToUse > 0 ? priceToUse * currentQty : 0,
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      productCode: val,
                      productName: '',
                      unitPrice: 0,
                      effectiveUnitPrice: 0,
                      itemDiscountPct: 0,
                      orderDiscountPct: 0,
                      discountInfo: '',
                      refundAmount: 0,
                    }));
                  }
                }}
                options={[
                  { label: 'Chọn sản phẩm trong đơn...', value: '' },
                  ...(selectedOrder?.saleOrderItems || []).map((item: any) => {
                    const pricing = calculateItemRefundPricing(item, selectedOrder);
                    const hasDiscount =
                      pricing.itemDiscountPct > 0 || pricing.orderDiscountPct > 0;
                    const codeVal = item.inventoryItem?.code || item.code || item.id;
                    return {
                      value: codeVal,
                      label: `${codeVal} - ${item.inventoryItem?.tenHang || item.tenHang}${
                        hasDiscount
                          ? ` (SL: ${item.soLuong} | Thực: ${pricing.effectiveUnitPrice.toLocaleString('vi-VN')} đ)`
                          : ` (SL: ${item.soLuong} | ${pricing.originalUnitPrice.toLocaleString('vi-VN')} đ)`
                      }`,
                    };
                  }),
                ]}
              />
            ) : (
              <Input
                label="Mã sản phẩm *"
                placeholder="VD: SJ-8012"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                onBlur={handleProductCodeBlur}
                required
              />
            )}
          </div>
        </div>

        <div>
          <Input
            label="Tên sản phẩm *"
            placeholder="Nhập tên sản phẩm..."
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Giá trị hoàn trả / Giảm công nợ (VNĐ){' '}
              {formData.source === 'RETURN' && <span className="text-rose-600">*</span>}
            </label>
            {formData.unitPrice > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[11px]">
                Đơn giá:{' '}
                {(
                  (useDiscountedPrice && formData.effectiveUnitPrice > 0
                    ? formData.effectiveUnitPrice
                    : formData.unitPrice) || 0
                ).toLocaleString('vi-VN')}{' '}
                đ
              </span>
            )}
          </div>

          {formData.unitPrice > 0 &&
            (formData.itemDiscountPct > 0 || formData.orderDiscountPct > 0) && (
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 mb-2 text-[11.5px]">
                <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-200/80">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <i className="bi bi-percent text-amber-500"></i>
                    Chiết khấu theo đơn hàng:
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={useDiscountedPrice}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDiscountedPrice(checked);
                        const p =
                          checked && formData.effectiveUnitPrice > 0
                            ? formData.effectiveUnitPrice
                            : formData.unitPrice;
                        setFormData((prev) => ({
                          ...prev,
                          refundAmount: p * (prev.quantity || 1),
                        }));
                      }}
                    />
                    <span className="text-[11px] text-slate-600">
                      {useDiscountedPrice ? 'Áp dụng giá sau CK' : 'Áp dụng giá gốc'}
                    </span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-slate-500">
                  <div>
                    Đơn giá gốc:{' '}
                    <strong className="text-slate-800">
                      {formData.unitPrice.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  {formData.itemDiscountPct > 0 && (
                    <div>
                      CK sản phẩm:{' '}
                      <strong className="text-rose-600 font-mono">
                        -{formData.itemDiscountPct}%
                      </strong>
                    </div>
                  )}
                  {formData.orderDiscountPct > 0 && (
                    <div>
                      CK tổng đơn:{' '}
                      <strong className="text-rose-600 font-mono">
                        -{formData.orderDiscountPct}%
                      </strong>
                    </div>
                  )}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex justify-between items-center">
                  <span className="text-slate-500">
                    Đơn giá thực tế {useDiscountedPrice ? '(sau chiết khấu)' : '(giá gốc)'}:
                  </span>
                  <strong className="text-sky-600 font-mono text-xs">
                    {(useDiscountedPrice && formData.effectiveUnitPrice > 0
                      ? formData.effectiveUnitPrice
                      : formData.unitPrice
                    ).toLocaleString('vi-VN')}{' '}
                    đ / sp
                  </strong>
                </div>
              </div>
            )}

          <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/15">
            <CurrencyInput
              className="w-full h-9 px-3 text-xs font-bold text-sky-700 bg-transparent border-0 outline-none"
              placeholder="0"
              min={0}
              value={formData.refundAmount || 0}
              onChange={(val: number) =>
                setFormData((prev) => ({ ...prev, refundAmount: val }))
              }
            />
            <span className="px-3 h-9 flex items-center bg-slate-50 border-l border-slate-200 text-xs text-slate-500 font-semibold">
              đ
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {formData.source === 'RETURN'
              ? 'Số tiền này sẽ được tự động cấn trừ vào công nợ của khách hàng trên hệ thống.'
              : 'Giá trị hàng hóa hoặc hoàn tiền liên quan (nếu có).'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mô tả hiện trạng <span className="text-rose-600">*</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 outline-none transition-all"
            rows={3}
            placeholder="Mô tả chi tiết tình trạng lỗi..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Đính kèm tệp ảnh / video
          </label>
          <div
            className="border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-xl p-4 text-center bg-slate-50/70 hover:bg-sky-50/30 transition-colors cursor-pointer"
            onClick={() => document.getElementById('defect-file-upload')?.click()}
          >
            <i className="bi bi-cloud-arrow-up text-xl text-sky-600"></i>
            <div className="text-xs font-semibold text-slate-700 mt-1">
              Nhấn để tải lên tệp ảnh/video
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tối đa 5 tệp (JPG, PNG, MP4...)
            </div>
          </div>
          <input
            id="defect-file-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
          />

          {files.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-2xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <i
                      className={`bi ${
                        file.type.startsWith('video')
                          ? 'bi-file-play-fill text-rose-500'
                          : 'bi-image-fill text-sky-600'
                      } text-sm`}
                    ></i>
                    <span className="truncate text-xs text-slate-700 max-w-[240px]" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    onClick={() => removeFile(idx)}
                  >
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Offcanvas>
  );
}
