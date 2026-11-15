import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StepPage } from '@/components/common/StepPage';
import { TableToolbar } from '@/components/common/TableToolbar';
import { FullWidthTable, SwipeableTableRow } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/common/Button';
import { Offcanvas } from '@/components/common/Offcanvas';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { NumberInput } from '@/components/common/NumberInput';
import { SuggestionInput, type SuggestionItem } from '@/components/common/SuggestionInput';
import { DataRetentionOffcanvas } from '@/components/common/DataRetentionOffcanvas';
import type { ModernStepItem } from '@/types';
import {
  Truck,
  CheckCircleFill,
  Building,
  Plus,
  Trash,
  ChevronRight,
  ChevronDown,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';

interface ShipmentRecord {
  id: string;
  trackingCode: string;
  isByOrder: boolean;
  saleOrderId: string | null;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  carrierId: string | null;
  carrierName: string;
  serviceType: string;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  shippingFee: number;
  codAmount: number;
  orderAmount: number;
  packageCount: number;
  weightKg: number;
  status: 'waiting_pickup' | 'in_transit' | 'delivered' | 'returned' | string;
  note: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: any[];
}

interface CarrierItem {
  id: string;
  code?: string;
  name: string;
  transactionAddress?: string;
  serviceType?: string;
  contactName?: string;
  contactRole?: string;
  phone?: string;
  website?: string;
  address?: string;
  routes?: string;
  trangThai?: string;
}

interface AvailableOrderOption {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  tongTien: number;
  daThanhToan: number;
  itemCount: number;
}

const SHIPMENT_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'active',
    title: 'Đang vận chuyển',
    mobileTitle: 'Đang giao',
    desc: 'Vận đơn chờ lấy hàng & đang trên tuyến giao',
    badge: 'ĐANG GIAO',
    icon: <Truck size={16} />,
  },
  {
    num: 2,
    id: 'completed',
    title: 'Đã giao thành công',
    mobileTitle: 'Hoàn tất',
    desc: 'Lịch sử vận đơn đã giao hàng & đối soát COD',
    badge: 'HOÀN TẤT',
    badgeVariant: 'success',
    icon: <CheckCircleFill size={16} />,
  },
  {
    num: 3,
    id: 'carriers',
    title: 'Đơn vị vận chuyển',
    mobileTitle: 'Nhà xe',
    desc: 'Đối tác vận tải, chành xe & đội xe trong hệ thống',
    badge: 'ĐỐI TÁC',
    icon: <Building size={16} />,
  },
];

function ShipmentStatusBadge({ status }: { status: string }) {
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        Đã giao hàng
      </span>
    );
  }
  if (status === 'in_transit') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
        Đang vận chuyển
      </span>
    );
  }
  if (status === 'returned') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        Hoàn trả
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      Chờ lấy hàng
    </span>
  );
}

export const LogisticsShipmentTrackingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [carriers, setCarriers] = useState<CarrierItem[]>([]);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrderOption[]>([]);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'by-time' | 'by-customer'>('by-time');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [showCreateOffcanvas, setShowCreateOffcanvas] = useState<boolean>(false);
  const [showRetentionOffcanvas, setShowRetentionOffcanvas] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [orderSearchText, setOrderSearchText] = useState<string>('');
  const [formState, setFormState] = useState({
    isByOrder: true,
    trackingCode: '',
    saleOrderId: '',
    orderCode: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    carrierId: '',
    carrierName: '',
    serviceType: '',
    driverName: '',
    driverPhone: '',
    licensePlate: '',
    shippingFee: 0,
    codAmount: 0,
    orderAmount: 0,
    packageCount: 1,
    weightKg: 0,
    status: 'waiting_pickup',
    note: '',
  });

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      let loadedCarriers: CarrierItem[] = [];
      let loadedOrders: AvailableOrderOption[] = [];

      try {
        const res = await fetch('/api/logistics/shipments');
        if (res.ok) {
          const data = await res.json();
          setShipments(data.items || []);
          loadedCarriers = data.carriers || [];
          loadedOrders = data.availableOrders || [];
        }
      } catch (e) {
        console.error('Lỗi tải /api/logistics/shipments:', e);
      }

      if (loadedCarriers.length === 0) {
        try {
          const cRes = await fetch('/api/plan-finance/carriers?limit=200');
          if (cRes.ok) {
            const cData = await cRes.json();
            loadedCarriers = cData.items || [];
          }
        } catch (e) {
          console.error('Lỗi tải danh sách đơn vị vận chuyển:', e);
        }
      }

      if (loadedOrders.length === 0) {
        try {
          const oRes = await fetch('/api/plan-finance/sales?pageSize=100');
          if (oRes.ok) {
            const oData = await oRes.json();
            const rawOrders = oData.items || [];
            loadedOrders = rawOrders
              .filter((o: any) => !(o.code || '').startsWith('LSX'))
              .map((o: any) => ({
                id: o.id,
                code: o.code || '',
                customerName: o.customer?.name || o.nguoiNhan || 'Khách vãng lai',
                customerPhone: o.soDienThoai || o.customer?.dienThoai || '',
                customerAddress: o.diaChiGiaoHang || o.customer?.address || '',
                tongTien: Number(o.tongTien || 0),
                daThanhToan: Number(o.daThanhToan || 0),
                itemCount: (o.saleOrderItems || []).length,
              }));
          }
        } catch (e) {
          console.error('Lỗi tải danh sách đơn bán hàng:', e);
        }
      }

      setCarriers(loadedCarriers);
      setAvailableOrders(loadedOrders);
    } catch (err) {
      console.error('Lỗi tải danh sách vận đơn:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const orderSuggestions = useMemo<SuggestionItem[]>(() => {
    return availableOrders.map((o) => ({
      id: o.id,
      value: `${o.code} - ${o.customerName}`,
      label: `${o.code} — ${o.customerName}`,
      subText: [o.customerPhone, o.customerAddress].filter(Boolean).join(' • ') || undefined,
    }));
  }, [availableOrders]);

  const carrierSuggestions = useMemo<SuggestionItem[]>(() => {
    return carriers.map((c) => ({
      id: c.id,
      value: c.name,
      label: c.phone ? `${c.name} - ${c.phone}` : c.name,
      subText: [c.serviceType, c.routes].filter(Boolean).join(' • ') || undefined,
    }));
  }, [carriers]);

  const stepShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (currentStep === 1) {
        if (s.status !== 'waiting_pickup' && s.status !== 'in_transit') return false;
      } else if (currentStep === 2) {
        if (s.status !== 'delivered' && s.status !== 'returned') return false;
      }
      if (statusFilter && s.status !== statusFilter) return false;
      if (carrierFilter && s.carrierName !== carrierFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const match =
          (s.trackingCode || '').toLowerCase().includes(q) ||
          (s.orderCode || '').toLowerCase().includes(q) ||
          (s.customerName || '').toLowerCase().includes(q) ||
          (s.customerPhone || '').toLowerCase().includes(q) ||
          (s.carrierName || '').toLowerCase().includes(q) ||
          (s.licensePlate || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [shipments, currentStep, statusFilter, carrierFilter, search]);

  const groupedByCustomer = useMemo(() => {
    const map = new Map<
      string,
      {
        groupKey: string;
        customerName: string;
        customerAddress: string;
        items: ShipmentRecord[];
        totalCod: number;
        totalFee: number;
      }
    >();
    for (const s of stepShipments) {
      const cName = (s.customerName || 'Khách nhận').trim();
      const cAddr = (s.customerAddress || 'Chưa cập nhật địa chỉ').trim();
      const key = `${cName.toLowerCase()}__${cAddr.toLowerCase()}`;
      let g = map.get(key);
      if (!g) {
        g = {
          groupKey: key,
          customerName: cName,
          customerAddress: cAddr,
          items: [],
          totalCod: 0,
          totalFee: 0,
        };
        map.set(key, g);
      }
      g.items.push(s);
      g.totalCod += Number(s.codAmount || 0);
      g.totalFee += Number(s.shippingFee || 0);
    }
    return Array.from(map.values());
  }, [stepShipments]);

  const paginatedShipments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return stepShipments.slice(start, start + pageSize);
  }, [stepShipments, page, pageSize]);

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return groupedByCustomer.slice(start, start + pageSize);
  }, [groupedByCustomer, page, pageSize]);

  const filteredCarriers = useMemo(() => {
    if (!search.trim()) return carriers;
    const q = search.trim().toLowerCase();
    return carriers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.routes || '').toLowerCase().includes(q)
    );
  }, [carriers, search]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleOpenCreate = () => {
    setOrderSearchText('');
    setFormState({
      isByOrder: true,
      trackingCode: '',
      saleOrderId: '',
      orderCode: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      carrierId: '',
      carrierName: '',
      serviceType: '',
      driverName: '',
      driverPhone: '',
      licensePlate: '',
      shippingFee: 0,
      codAmount: 0,
      orderAmount: 0,
      packageCount: 1,
      weightKg: 0,
      status: 'waiting_pickup',
      note: '',
    });
    setShowCreateOffcanvas(true);
  };

  const handleOpenDetail = (s: ShipmentRecord) => {
    setSelectedShipment(s);
    setOrderSearchText(
      s.orderCode ? `${s.orderCode}${s.customerName ? ` - ${s.customerName}` : ''}` : ''
    );
    setFormState({
      isByOrder: Boolean(s.isByOrder ?? Boolean(s.saleOrderId || s.orderCode)),
      trackingCode: s.trackingCode || '',
      saleOrderId: s.saleOrderId || '',
      orderCode: s.orderCode || '',
      customerName: s.customerName || '',
      customerPhone: s.customerPhone || '',
      customerAddress: s.customerAddress || '',
      carrierId: s.carrierId || '',
      carrierName: s.carrierName || '',
      serviceType: s.serviceType || '',
      driverName: s.driverName || '',
      driverPhone: s.driverPhone || '',
      licensePlate: s.licensePlate || '',
      shippingFee: Number(s.shippingFee || 0),
      codAmount: Number(s.codAmount || 0),
      orderAmount: Number(s.orderAmount || 0),
      packageCount: Number(s.packageCount || 1),
      weightKg: Number(s.weightKg || 0),
      status: s.status || 'waiting_pickup',
      note: s.note || '',
    });
  };

  const handleSelectOrderSuggestion = (item: SuggestionItem) => {
    const ord = availableOrders.find((o) => o.id === item.id);
    if (ord) {
      setOrderSearchText(`${ord.code} - ${ord.customerName}`);
      setFormState((prev) => ({
        ...prev,
        isByOrder: true,
        saleOrderId: ord.id,
        orderCode: ord.code,
        customerName: ord.customerName,
        customerPhone: ord.customerPhone,
        customerAddress: ord.customerAddress,
        orderAmount: ord.tongTien,
        codAmount: Math.max(0, ord.tongTien - ord.daThanhToan),
        packageCount: Math.max(1, ord.itemCount),
      }));
    }
  };

  const handleSelectCarrierSuggestion = (item: SuggestionItem) => {
    const found = carriers.find((c) => c.id === item.id || c.name === item.value);
    if (found) {
      setFormState((prev) => ({
        ...prev,
        carrierId: found.id,
        carrierName: found.name,
        serviceType: found.serviceType || prev.serviceType,
        driverName: found.contactName || prev.driverName,
        driverPhone: found.phone || prev.driverPhone,
      }));
    }
  };

  const handleSaveCreate = async () => {
    if (formState.isByOrder && !formState.saleOrderId && !formState.orderCode) {
      toast.warning('Vui lòng chọn đơn bán hàng hoặc bỏ tích "Theo đơn hàng".');
      return;
    }
    if (!formState.customerName.trim()) {
      toast.warning('Vui lòng nhập tên người nhận hàng.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/logistics/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (res.ok) {
        toast.success('Đã tạo vận đơn mới thành công!');
        setShowCreateOffcanvas(false);
        fetchShipments();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Không thể tạo vận đơn.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tạo vận đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUpdate = async () => {
    if (!selectedShipment) return;
    if (!formState.customerName.trim()) {
      toast.warning('Vui lòng nhập tên người nhận hàng.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/logistics/shipments/${selectedShipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      if (res.ok) {
        toast.success(`Đã cập nhật vận đơn ${selectedShipment.trackingCode}!`);
        setSelectedShipment(null);
        fetchShipments();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Không thể cập nhật vận đơn.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật vận đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShipment = async (id: string) => {
    try {
      await fetch(`/api/logistics/shipments/${id}`, { method: 'DELETE' });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchShipments();
    } catch {
      toast.error('Không thể xoá vận đơn.');
    }
  };

  const handleBatchDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await fetch(`/api/logistics/shipments/${id}`, { method: 'DELETE' });
    }
    setSelectedIds(new Set());
    toast.success('Đã xoá các vận đơn đã chọn.');
    fetchShipments();
  };

  const carrierOptions = useMemo(() => {
    const names = Array.from(
      new Set([
        ...carriers.map((c) => c.name),
        ...shipments.map((s) => s.carrierName),
      ].filter(Boolean))
    );
    return [
      { value: '', label: 'Tất cả đơn vị vận chuyển' },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [carriers, shipments]);

  const renderShipmentFormFields = () => (
    <div
      className="flex flex-col gap-3 [&_.form-group]:!mb-0 [&_.form-label]:!mb-1 text-slate-800"
      style={{ fontSize: '0.875rem' }}
    >
      {/* Chọn đơn hàng + Checkbox Theo đơn hàng */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <label
            className="form-label !mb-0"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-primary, #0f172a)',
            }}
          >
            Chọn từ đơn bán hàng
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[13px] font-semibold text-blue-700">
            <input
              type="checkbox"
              checked={formState.isByOrder}
              onChange={(e) => {
                const checked = e.target.checked;
                if (!checked) {
                  setOrderSearchText('');
                  setFormState((prev) => ({
                    ...prev,
                    isByOrder: false,
                    saleOrderId: '',
                    orderCode: '',
                  }));
                } else {
                  setFormState((prev) => ({
                    ...prev,
                    isByOrder: true,
                  }));
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Theo đơn hàng</span>
          </label>
        </div>

        <SuggestionInput
          className="!mb-0"
          value={orderSearchText}
          onChange={(val) => {
            setOrderSearchText(val);
            if (!val.trim()) {
              setFormState((prev) => ({ ...prev, saleOrderId: '', orderCode: '' }));
            }
          }}
          onSelectSuggestion={handleSelectOrderSuggestion}
          suggestions={orderSuggestions}
          disabled={!formState.isByOrder}
          placeholder={
            formState.isByOrder
              ? 'Nhập mã đơn hoặc tên khách hàng để tìm...'
              : 'Vận chuyển hàng hoá không theo đơn hàng'
          }
          emptyMessage="Không tìm thấy đơn bán hàng phù hợp"
        />
      </div>

      {/* Mã vận đơn & Trạng thái */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          className="!mb-0"
          label="Mã vận đơn"
          value={formState.trackingCode}
          onChange={(e) => setFormState({ ...formState, trackingCode: e.target.value })}
          placeholder="Tự động tạo"
        />
        <Select
          className="!mb-0"
          label="Trạng thái"
          value={formState.status}
          onChange={(e) => setFormState({ ...formState, status: e.target.value })}
          options={[
            { value: 'waiting_pickup', label: 'Chờ lấy hàng' },
            { value: 'in_transit', label: 'Đang vận chuyển' },
            { value: 'delivered', label: 'Đã giao hàng' },
            { value: 'returned', label: 'Hoàn trả' },
          ]}
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Đơn vị vận chuyển (SuggestionInput lấy từ DB Carrier) */}
      <SuggestionInput
        className="!mb-0"
        label="Đơn vị vận chuyển"
        value={formState.carrierName}
        onChange={(val) => {
          const matched = carriers.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
          setFormState((prev) => ({
            ...prev,
            carrierId: matched ? matched.id : '',
            carrierName: val,
          }));
        }}
        onSelectSuggestion={handleSelectCarrierSuggestion}
        suggestions={carrierSuggestions}
        placeholder="Nhập hoặc chọn đơn vị vận chuyển..."
        emptyMessage="Chưa có đơn vị vận chuyển khớp từ khoá"
      />

      {/* Tài xế / Điều phối & Biển số xe */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          className="!mb-0"
          label="Tài xế / Điều phối"
          value={formState.driverName}
          onChange={(e) => setFormState({ ...formState, driverName: e.target.value })}
          placeholder="Họ tên tài xế..."
        />
        <Input
          className="!mb-0"
          label="Biển số xe / Phương tiện"
          value={formState.licensePlate}
          onChange={(e) => setFormState({ ...formState, licensePlate: e.target.value })}
          placeholder="VD: 29H-123.45"
        />
      </div>

      {/* Người nhận hàng & Số điện thoại */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          className="!mb-0"
          label="Người nhận hàng"
          required
          value={formState.customerName}
          onChange={(e) => setFormState({ ...formState, customerName: e.target.value })}
          placeholder="Tên người nhận..."
        />
        <Input
          className="!mb-0"
          label="Số điện thoại"
          value={formState.customerPhone}
          onChange={(e) => setFormState({ ...formState, customerPhone: e.target.value })}
          placeholder="SĐT người nhận..."
        />
      </div>

      {/* Địa chỉ giao hàng */}
      <Input
        className="!mb-0"
        label="Địa chỉ giao hàng"
        value={formState.customerAddress}
        onChange={(e) => setFormState({ ...formState, customerAddress: e.target.value })}
        placeholder="Nhập địa chỉ nhận hàng..."
      />

      {/* Số kiện & Khối lượng */}
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          className="!mb-0"
          label="Số kiện hàng"
          value={formState.packageCount}
          hideZero={false}
          allowDecimal={false}
          suffix="kiện"
          onValueChange={(num) => setFormState((prev) => ({ ...prev, packageCount: Math.max(1, num) }))}
        />
        <NumberInput
          className="!mb-0"
          label="Khối lượng"
          value={formState.weightKg}
          suffix="kg"
          placeholder="0"
          onValueChange={(num) => setFormState((prev) => ({ ...prev, weightKg: num }))}
        />
      </div>

      {/* Thu hộ COD & Cước vận chuyển */}
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          className="!mb-0"
          label="Thu hộ COD"
          value={formState.codAmount}
          suffix="đ"
          placeholder="0"
          onValueChange={(num) => setFormState((prev) => ({ ...prev, codAmount: num }))}
        />
        <NumberInput
          className="!mb-0"
          label="Cước vận chuyển"
          value={formState.shippingFee}
          suffix="đ"
          placeholder="0"
          onValueChange={(num) => setFormState((prev) => ({ ...prev, shippingFee: num }))}
        />
      </div>

      {/* Ghi chú */}
      <Input
        className="!mb-0"
        label="Nội dung hàng hoá / Ghi chú giao hàng"
        value={formState.note}
        onChange={(e) => setFormState({ ...formState, note: e.target.value })}
        placeholder="Ghi chú hàng gửi hoặc lưu ý khi giao..."
      />
    </div>
  );

  const renderShipmentRow = (s: ShipmentRecord) => (
    <SwipeableTableRow
      key={s.id}
      rowId={s.id}
      onRowClick={() => handleOpenDetail(s)}
      onEdit={() => handleOpenDetail(s)}
      onDelete={() => handleDeleteShipment(s.id)}
      deleteConfirmTitle="Xác nhận xoá vận đơn"
      deleteConfirmMessage={`Bạn có chắc chắn muốn xoá vận đơn "${s.trackingCode}" không?`}
      deleteConfirmText="Xoá vận đơn"
      className="hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
    >
      <td className="py-2.5 px-2.5 sm:px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedIds.has(s.id)}
          onChange={(e) => {
            const next = new Set(selectedIds);
            if (e.target.checked) next.add(s.id);
            else next.delete(s.id);
            setSelectedIds(next);
          }}
          className="rounded border-slate-300 text-sky-600 cursor-pointer"
        />
      </td>
      <td className="py-2.5 px-2.5 sm:px-3.5 min-w-0">
        <div className="font-bold text-[#003087] hover:underline text-[13px] truncate">
          {s.trackingCode}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          {s.isByOrder && s.orderCode ? (
            <>
              Đơn hàng: <strong className="text-slate-600">{s.orderCode}</strong>
            </>
          ) : (
            <span>Chuyển hàng ngoài đơn</span>
          )}
          {' • '}
          {s.packageCount} kiện{s.weightKg > 0 ? ` (${s.weightKg} kg)` : ''}
        </div>
      </td>
      <td className="hidden sm:table-cell py-2.5 px-3.5">
        <div className="font-semibold text-slate-900 text-[13px] truncate max-w-xs">
          {s.customerName}
        </div>
        <div className="text-slate-400 text-[11px] mt-0.5 truncate max-w-xs">
          {s.customerAddress || (s.customerPhone ? `SĐT: ${s.customerPhone}` : '—')}
        </div>
      </td>
      <td className="hidden md:table-cell py-2.5 px-3.5">
        <div className="font-semibold text-slate-800 text-[13px] truncate max-w-xs">
          {s.carrierName || '—'}
        </div>
        <div className="text-slate-400 text-[11px] mt-0.5 truncate">
          {[s.driverName, s.licensePlate ? `Xe: ${s.licensePlate}` : ''].filter(Boolean).join(' • ') || '—'}
        </div>
      </td>
      <td className="hidden lg:table-cell py-2.5 px-3.5 text-slate-600 text-[13px]">
        {s.shippedAt
          ? new Date(s.shippedAt).toLocaleDateString('vi-VN')
          : s.createdAt
            ? new Date(s.createdAt).toLocaleDateString('vi-VN')
            : '—'}
      </td>
      <td className="hidden sm:table-cell py-2.5 px-3.5 text-right">
        <div className="font-bold text-slate-900 text-[13px] font-mono">
          {Number(s.codAmount || 0).toLocaleString('vi-VN')}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Cước: {Number(s.shippingFee || 0).toLocaleString('vi-VN')} đ
        </div>
      </td>
      <td className="py-2.5 px-2.5 sm:px-3.5 text-center">
        <ShipmentStatusBadge status={s.status} />
      </td>
    </SwipeableTableRow>
  );

  return (
    <StepPage
      className="logistics-mobile-page"
      title="Theo dõi vận đơn"
      description="Theo dõi tiến độ vận chuyển hàng hoá, điều phối nhà xe và đối soát giao nhận"
      icon="bi-truck"
      color="blue"
      badge="VẬN CHUYỂN"
      steps={SHIPMENT_STEPS}
      currentStep={currentStep}
      onStepChange={(step) => {
        setCurrentStep(step);
        setStatusFilter('');
        setPage(1);
      }}
      hideTicker={true}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {(currentStep === 1 || currentStep === 2) && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TableToolbar
              showMenu={true}
              searchPlaceholder="Tìm mã vận đơn, mã đơn hàng, tên KH, biển số xe..."
              searchValue={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              filters={[
                {
                  id: 'status',
                  ariaLabel: 'Trạng thái vận đơn',
                  value: statusFilter,
                  onChange: (val) => {
                    setStatusFilter(val);
                    setPage(1);
                  },
                  options:
                    currentStep === 1
                      ? [
                          { value: '', label: 'Tất cả trạng thái' },
                          { value: 'waiting_pickup', label: 'Chờ lấy hàng' },
                          { value: 'in_transit', label: 'Đang vận chuyển' },
                        ]
                      : [
                          { value: '', label: 'Tất cả trạng thái' },
                          { value: 'delivered', label: 'Đã giao hàng' },
                          { value: 'returned', label: 'Hoàn trả' },
                        ],
                },
                {
                  id: 'carrier',
                  ariaLabel: 'Đơn vị vận chuyển',
                  value: carrierFilter,
                  onChange: (val) => {
                    setCarrierFilter(val);
                    setPage(1);
                  },
                  options: carrierOptions,
                },
              ]}
              menuItems={[
                {
                  id: 'cleanup-settings',
                  label: (
                    <span className="flex items-center gap-2 text-slate-700 py-0.5">
                      <i className="bi bi-clock-history text-amber-600 text-sm" />
                      <span>Thiết lập xoá</span>
                    </span>
                  ),
                  onClick: () => setShowRetentionOffcanvas(true),
                },
                {
                  id: 'group-by-customer',
                  label: (
                    <div className="flex items-center justify-between w-full py-0.5">
                      <span className="flex items-center gap-2 text-slate-700">
                        <i className="bi bi-people text-blue-600 text-sm" />
                        <span>Nhóm theo khách hàng</span>
                      </span>
                      {viewMode === 'by-customer' && (
                        <i className="bi bi-check2 text-blue-600 font-bold ml-3" />
                      )}
                    </div>
                  ),
                  onClick: () => {
                    setExpandedGroups(new Set());
                    setViewMode('by-customer');
                    setPage(1);
                  },
                },
                {
                  id: 'sort-by-time',
                  label: (
                    <div className="flex items-center justify-between w-full py-0.5">
                      <span className="flex items-center gap-2 text-slate-700">
                        <i className="bi bi-clock text-indigo-600 text-sm" />
                        <span>Theo thời gian tạo đơn</span>
                      </span>
                      {viewMode === 'by-time' && (
                        <i className="bi bi-check2 text-blue-600 font-bold ml-3" />
                      )}
                    </div>
                  ),
                  onClick: () => {
                    setViewMode('by-time');
                    setPage(1);
                  },
                },
              ]}
              rightActions={
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {selectedIds.size > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBatchDelete}
                      title={`Xoá (${selectedIds.size})`}
                    >
                      <Trash className="w-3.5 h-3.5 md:mr-1" />
                      <span className="hidden md:inline">Xoá ({selectedIds.size})</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#003087] hover:bg-[#00256c] text-white border-[#003087]"
                    onClick={handleOpenCreate}
                    title="Tạo vận đơn mới"
                  >
                    <Plus className="w-4 h-4 md:mr-1" />
                    <span className="hidden md:inline">Thêm vận đơn</span>
                  </Button>
                </div>
              }
            />

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={loading}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-2.5 sm:px-3.5 w-8 sm:w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            stepShipments.length > 0 &&
                            stepShipments.every((s) => selectedIds.has(s.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(stepShipments.map((s) => s.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          className="rounded border-slate-300 text-sky-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2.5 sm:px-3.5 sm:w-48">Mã vận đơn</th>
                      <th className="hidden sm:table-cell py-2.5 px-3.5">Người nhận hàng</th>
                      <th className="hidden md:table-cell py-2.5 px-3.5">Đơn vị vận chuyển</th>
                      <th className="hidden lg:table-cell py-2.5 px-3.5 w-32">Ngày gửi</th>
                      <th className="hidden sm:table-cell py-2.5 px-3.5 text-right w-40">Thu hộ COD (đ)</th>
                      <th className="py-2.5 px-2.5 sm:px-3.5 text-center w-36">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stepShipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <i className="bi bi-truck text-2xl block mb-2 opacity-30" />
                          Chưa có vận đơn nào trong danh sách
                        </td>
                      </tr>
                    ) : viewMode === 'by-customer' ? (
                      paginatedGroups.map((group) => {
                        const isCollapsed = !expandedGroups.has(group.groupKey);
                        const allSelected =
                          group.items.length > 0 &&
                          group.items.every((it) => selectedIds.has(it.id));

                        return (
                          <React.Fragment key={group.groupKey}>
                            <tr
                              className="bg-slate-100/90 hover:bg-slate-200/60 transition-colors border-t border-b border-slate-200 cursor-pointer"
                              onClick={() => toggleGroup(group.groupKey)}
                            >
                              <td
                                className="py-2.5 px-2.5 sm:px-3.5 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  onChange={(e) => {
                                    const next = new Set(selectedIds);
                                    if (e.target.checked) {
                                      group.items.forEach((it) => next.add(it.id));
                                    } else {
                                      group.items.forEach((it) => next.delete(it.id));
                                    }
                                    setSelectedIds(next);
                                  }}
                                  className="rounded border-slate-300 text-sky-600 cursor-pointer"
                                />
                              </td>
                              <td colSpan={6} className="py-2.5 px-2.5 sm:px-3.5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(group.groupKey);
                                      }}
                                      className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-600 shadow-2xs shrink-0 cursor-pointer"
                                    >
                                      {isCollapsed ? (
                                        <ChevronRight className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>
                                    <div className="min-w-0">
                                      <div className="flex items-center flex-wrap gap-2">
                                        <span className="font-bold text-slate-900 text-[13px] truncate">
                                          {group.customerName}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                          {group.items.length} vận đơn
                                        </span>
                                      </div>
                                      <div className="text-slate-500 text-[11.5px] mt-0.5 flex items-center gap-1 truncate">
                                        <i className="bi bi-geo-alt text-slate-400 text-[11px]" />
                                        <span className="truncate">{group.customerAddress}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                      <span className="hidden sm:inline text-slate-500 text-xs mr-1.5">
                                        Tổng COD:
                                      </span>
                                      <span className="font-mono font-bold text-[#003087] text-[13px]">
                                        {group.totalCod.toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroup(group.groupKey);
                                      }}
                                      className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer"
                                    >
                                      <span>{isCollapsed ? 'Hiện đơn' : 'Ẩn đơn'}</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {!isCollapsed && group.items.map((s) => renderShipmentRow(s))}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      paginatedShipments.map((s) => renderShipmentRow(s))
                    )}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            <Pagination
              currentPage={page}
              totalPages={Math.max(
                1,
                Math.ceil(
                  (viewMode === 'by-customer'
                    ? groupedByCustomer.length
                    : stepShipments.length) / pageSize
                )
              )}
              totalItems={
                viewMode === 'by-customer' ? groupedByCustomer.length : stepShipments.length
              }
              pageSize={pageSize}
              itemName={viewMode === 'by-customer' ? 'khách hàng' : 'vận đơn'}
              onPageChange={setPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm tên đơn vị vận chuyển, tuyến đường, SĐT..."
              searchValue={search}
              onSearchChange={setSearch}
            />
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={loading}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-3.5 w-40">Mã ĐVVC</th>
                      <th className="py-2.5 px-3.5">Đơn vị vận chuyển</th>
                      <th className="hidden md:table-cell py-2.5 px-3.5">Loại dịch vụ & Tuyến đường</th>
                      <th className="hidden sm:table-cell py-2.5 px-3.5">Người liên hệ / SĐT</th>
                      <th className="py-2.5 px-3.5 text-center w-32">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCarriers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Chưa có dữ liệu đơn vị vận chuyển trong cơ sở dữ liệu
                        </td>
                      </tr>
                    ) : (
                      filteredCarriers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 border-b border-slate-100">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-[#003087]">
                            {c.code || '—'}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-semibold text-slate-900">{c.name}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-sm">
                              {c.transactionAddress || c.address || '—'}
                            </div>
                          </td>
                          <td className="hidden md:table-cell py-2.5 px-3.5">
                            <div className="font-medium text-slate-800">
                              {c.serviceType || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {c.routes || '—'}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-3.5">
                            <div className="font-medium text-slate-800">
                              {c.contactName || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500">{c.phone || '—'}</div>
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {c.trangThai === 'paused' ? 'Tạm dừng' : 'Hoạt động'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>
          </div>
        )}

        {/* Offcanvas Tạo vận đơn mới (width="400px" chuẩn dự án) */}
        <Offcanvas
          isOpen={showCreateOffcanvas}
          onClose={() => setShowCreateOffcanvas(false)}
          title="Tạo vận đơn mới"
          description="Lập phiếu gửi hàng và điều phối đơn vị vận chuyển"
          icon={<i className="bi bi-truck text-blue-600 text-lg" />}
          width="400px"
          closeOnBackdropClick={false}
          closeOnEscape={false}
          confirmText="Tạo vận đơn"
          cancelText="Đóng"
          onConfirm={handleSaveCreate}
          isSubmitting={submitting}
        >
          {renderShipmentFormFields()}
        </Offcanvas>

        {/* Offcanvas Chi tiết & Cập nhật vận đơn (width="400px" chuẩn dự án) */}
        <Offcanvas
          isOpen={Boolean(selectedShipment)}
          onClose={() => setSelectedShipment(null)}
          title={selectedShipment ? `Vận đơn ${selectedShipment.trackingCode}` : 'Chi tiết vận đơn'}
          description={
            selectedShipment?.orderCode
              ? `Theo đơn bán hàng: ${selectedShipment.orderCode}`
              : 'Cập nhật tiến độ giao nhận hàng hoá'
          }
          icon={<i className="bi bi-truck text-blue-600 text-lg" />}
          width="400px"
          closeOnBackdropClick={false}
          closeOnEscape={false}
          confirmText="Lưu cập nhật"
          cancelText="Đóng"
          onConfirm={handleSaveUpdate}
          isSubmitting={submitting}
        >
          {selectedShipment && renderShipmentFormFields()}
        </Offcanvas>

        {/* Offcanvas Thiết lập xoá dữ liệu lưu trữ */}
        <DataRetentionOffcanvas
          isOpen={showRetentionOffcanvas}
          onClose={() => setShowRetentionOffcanvas(false)}
          ticketType="ALL"
          title="Thiết lập thời gian lưu trữ"
          description="Cấu hình tự động dọn dẹp dữ liệu vận đơn quá thời hạn lưu trữ"
          entityLabel="vận đơn"
          onCleanedUp={fetchShipments}
        />
      </div>
    </StepPage>
  );
};

export default LogisticsShipmentTrackingPage;
