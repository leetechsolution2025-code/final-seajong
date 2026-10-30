import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash,
  Pencil,
  Building,
  Truck,
  Telephone,
  Envelope,
  GeoAlt,
  Globe,
  StarFill,
  Star,
  PersonBadge,
  CreditCard2Front,
  BoxSeam,
  FileEarmarkText,
  CheckCircleFill,
  PauseCircleFill,
  SignpostSplit,
} from 'react-bootstrap-icons';
import { StepPage } from '@/components/common/StepPage';
import { TableToolbar } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { Offcanvas } from '@/components/common/Offcanvas';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { EventOffcanvas } from '@/components/common/EventOffcanvas';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import type { ModernStepItem } from '@/types';

interface CategoryItem {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
}

interface SupplierCategoryRelation {
  id: string;
  supplierId: string;
  categoryId: string;
  category?: CategoryItem;
}

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  contactName?: string | null;
  xungHo?: string | null;
  phone?: string | null;
  email?: string | null;
  taxCode?: string | null;
  website?: string | null;
  hanMucNo: number;
  congNoHienTai?: number;
  danhGia: number;
  trangThai: string;
  ghiChu?: string | null;
  categories?: SupplierCategoryRelation[];
  createdAt?: string;
}

interface SupplierOrderSummary {
  id: string;
  code: string;
  ngayDat: string;
  trangThai: string;
  tongTien: number;
  daThanhToan: number;
}

interface CarrierItem {
  id: string;
  code?: string | null;
  name: string;
  serviceType: string;
  contactName?: string | null;
  contactRole?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  transactionAddress?: string | null;
  address?: string | null;
  routes?: string | null;
  hanMucNo: number;
  danhGia: number;
  trangThai: string;
  ghiChu?: string | null;
  createdAt?: string;
}

const SERVICE_TYPES = [
  'Chuyển phát nhanh',
  'Vận tải đường bộ',
  'Vận tải đường biển',
  'Vận tải hàng không',
  'Vận tải quốc tế',
  'Giao hàng nội thành',
  'Logistics tổng hợp',
];

const PO_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Bản nháp', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  sent: { label: 'Đã gửi NCC', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  confirmed: { label: 'NCC xác nhận', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  shipping: { label: 'Đang giao', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  received: { label: 'Đã nhận hàng', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { label: 'Tạm dừng', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const formatCurrency = (val?: number | null) => {
  const num = Number(val || 0);
  return num.toLocaleString('vi-VN') + ' đ';
};

const formatDateShort = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const PurchaseSuppliersPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);

  // ── CATEGORIES ──
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // ── STEP 1: SUPPLIERS STATE ──
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(10);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

  // Supplier Detail Offcanvas
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [supplierDetailOrders, setSupplierDetailOrders] = useState<SupplierOrderSummary[]>([]);
  const [supplierDetailDebt, setSupplierDetailDebt] = useState<number>(0);
  const [loadingSupplierDetail, setLoadingSupplierDetail] = useState(false);

  // Supplier Add/Edit Offcanvas
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    taxCode: '',
    xungHo: 'Anh',
    contactName: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    hanMucNo: 0,
    danhGia: 5,
    trangThai: 'active',
    ghiChu: '',
    categoryIds: [] as string[],
  });

  // ── STEP 2: CARRIERS STATE ──
  const [carriers, setCarriers] = useState<CarrierItem[]>([]);
  const [totalCarriers, setTotalCarriers] = useState(0);
  const [loadingCarriers, setLoadingCarriers] = useState(true);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [carrierStatusFilter, setCarrierStatusFilter] = useState('');
  const [carrierServiceFilter, setCarrierServiceFilter] = useState('');
  const [carrierPage, setCarrierPage] = useState(1);
  const [carrierPageSize, setCarrierPageSize] = useState(10);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<string[]>([]);

  // Carrier Detail Offcanvas
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierItem | null>(null);

  // Carrier Add/Edit Offcanvas
  const [isCarrierFormOpen, setIsCarrierFormOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<CarrierItem | null>(null);
  const [savingCarrier, setSavingCarrier] = useState(false);
  const [carrierForm, setCarrierForm] = useState({
    code: '',
    name: '',
    serviceType: 'Chuyển phát nhanh',
    contactName: '',
    contactRole: '',
    phone: '',
    email: '',
    website: '',
    transactionAddress: '',
    address: '',
    routes: '',
    hanMucNo: 0,
    danhGia: 5,
    trangThai: 'active',
    ghiChu: '',
  });

  // ── CONFIRM DIALOG STATE ──
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── FETCH CATEGORIES ──
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/plan-finance/inventory/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // ── FETCH SUPPLIERS ──
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const params = new URLSearchParams({
        page: String(supplierPage),
        limit: String(supplierPageSize),
      });
      if (supplierSearch.trim()) params.set('search', supplierSearch.trim());
      if (supplierStatusFilter) params.set('trangThai', supplierStatusFilter);
      if (supplierCategoryFilter) params.set('categoryId', supplierCategoryFilter);

      const res = await fetch(`/api/plan-finance/suppliers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data.items) ? data.items : []);
        setTotalSuppliers(Number(data.total || 0));
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierPage, supplierPageSize, supplierSearch, supplierStatusFilter, supplierCategoryFilter]);

  // ── FETCH CARRIERS ──
  const fetchCarriers = useCallback(async () => {
    setLoadingCarriers(true);
    try {
      const params = new URLSearchParams({
        page: String(carrierPage),
        limit: String(carrierPageSize),
      });
      if (carrierSearch.trim()) params.set('search', carrierSearch.trim());
      if (carrierStatusFilter) params.set('trangThai', carrierStatusFilter);
      if (carrierServiceFilter) params.set('serviceType', carrierServiceFilter);

      const res = await fetch(`/api/plan-finance/carriers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCarriers(Array.isArray(data.items) ? data.items : []);
        setTotalCarriers(Number(data.total || 0));
      }
    } catch (err) {
      console.error('Error fetching carriers:', err);
    } finally {
      setLoadingCarriers(false);
    }
  }, [carrierPage, carrierPageSize, carrierSearch, carrierStatusFilter, carrierServiceFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  // ── FETCH SUPPLIER DETAIL ──
  const handleSelectSupplier = async (supplier: SupplierItem) => {
    setSelectedSupplier(supplier);
    setSupplierDetailDebt(supplier.congNoHienTai || 0);
    setSupplierDetailOrders([]);
    setLoadingSupplierDetail(true);
    try {
      const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.supplier) {
          setSelectedSupplier((prev) => (prev ? { ...prev, ...data.supplier } : data.supplier));
        }
        if (Array.isArray(data.orders)) {
          setSupplierDetailOrders(data.orders);
        }
        if (typeof data.congNoHienTai === 'number') {
          setSupplierDetailDebt(data.congNoHienTai);
        }
      }
    } catch (err) {
      console.error('Error fetching supplier detail:', err);
    } finally {
      setLoadingSupplierDetail(false);
    }
  };

  // ── SUPPLIER ADD / EDIT HANDLERS ──
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      taxCode: '',
      xungHo: 'Anh',
      contactName: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      hanMucNo: 0,
      danhGia: 5,
      trangThai: 'active',
      ghiChu: '',
      categoryIds: [],
    });
    setIsSupplierFormOpen(true);
  };

  const handleOpenEditSupplier = (supplier: SupplierItem) => {
    setEditingSupplier(supplier);
    const catIds = (supplier.categories || []).map((c) => c.categoryId || c.category?.id || '').filter(Boolean);
    setSupplierForm({
      name: supplier.name || '',
      taxCode: supplier.taxCode || '',
      xungHo: supplier.xungHo || 'Anh',
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      website: supplier.website || '',
      address: supplier.address || '',
      hanMucNo: Number(supplier.hanMucNo || 0),
      danhGia: Number(supplier.danhGia || 5),
      trangThai: supplier.trangThai || 'active',
      ghiChu: supplier.ghiChu || '',
      categoryIds: catIds,
    });
    setIsSupplierFormOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      alert('Vui lòng nhập tên nhà cung cấp!');
      return;
    }
    setSavingSupplier(true);
    try {
      const url = editingSupplier
        ? `/api/plan-finance/suppliers/${editingSupplier.id}`
        : '/api/plan-finance/suppliers';
      const method = editingSupplier ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể lưu thông tin nhà cung cấp');
      }
      const saved = await res.json();
      setIsSupplierFormOpen(false);
      await fetchSuppliers();
      if (selectedSupplier && editingSupplier && selectedSupplier.id === editingSupplier.id) {
        setSelectedSupplier((prev) => (prev ? { ...prev, ...saved } : saved));
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu nhà cung cấp');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleDeleteSupplier = (supplier: SupplierItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá nhà cung cấp',
      message: `Bạn có chắc chắn muốn xoá nhà cung cấp "${supplier.name}" (${supplier.code})? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/plan-finance/suppliers/${supplier.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            throw new Error('Không thể xoá nhà cung cấp này');
          }
          setSelectedSupplier(null);
          setSelectedSupplierIds((prev) => prev.filter((id) => id !== supplier.id));
          await fetchSuppliers();
        } catch (err: any) {
          alert(err.message || 'Lỗi khi xoá nhà cung cấp');
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleBulkDeleteSuppliers = () => {
    if (selectedSupplierIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá nhà cung cấp đã chọn',
      message: `Bạn có chắc chắn muốn xoá ${selectedSupplierIds.length} nhà cung cấp đã chọn?`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await Promise.all(
            selectedSupplierIds.map((id) =>
              fetch(`/api/plan-finance/suppliers/${id}`, { method: 'DELETE' }),
            ),
          );
          setSelectedSupplierIds([]);
          setSelectedSupplier(null);
          await fetchSuppliers();
        } catch (err) {
          console.error('Error bulk deleting suppliers:', err);
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // ── CARRIER ADD / EDIT HANDLERS ──
  const handleOpenAddCarrier = () => {
    setEditingCarrier(null);
    setCarrierForm({
      code: '',
      name: '',
      serviceType: 'Chuyển phát nhanh',
      contactName: '',
      contactRole: '',
      phone: '',
      email: '',
      website: '',
      transactionAddress: '',
      address: '',
      routes: '',
      hanMucNo: 0,
      danhGia: 5,
      trangThai: 'active',
      ghiChu: '',
    });
    setIsCarrierFormOpen(true);
  };

  const handleOpenEditCarrier = (carrier: CarrierItem) => {
    setEditingCarrier(carrier);
    setCarrierForm({
      code: carrier.code || '',
      name: carrier.name || '',
      serviceType: carrier.serviceType || 'Chuyển phát nhanh',
      contactName: carrier.contactName || '',
      contactRole: carrier.contactRole || '',
      phone: carrier.phone || '',
      email: carrier.email || '',
      website: carrier.website || '',
      transactionAddress: carrier.transactionAddress || '',
      address: carrier.address || '',
      routes: carrier.routes || '',
      hanMucNo: Number(carrier.hanMucNo || 0),
      danhGia: Number(carrier.danhGia || 5),
      trangThai: carrier.trangThai || 'active',
      ghiChu: carrier.ghiChu || '',
    });
    setIsCarrierFormOpen(true);
  };

  const handleSaveCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrierForm.name.trim()) {
      alert('Vui lòng nhập tên đơn vị vận chuyển!');
      return;
    }
    setSavingCarrier(true);
    try {
      const url = editingCarrier
        ? `/api/plan-finance/carriers/${editingCarrier.id}`
        : '/api/plan-finance/carriers';
      const method = editingCarrier ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carrierForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể lưu đơn vị vận chuyển');
      }
      const saved = await res.json();
      setIsCarrierFormOpen(false);
      await fetchCarriers();
      if (selectedCarrier && editingCarrier && selectedCarrier.id === editingCarrier.id) {
        setSelectedCarrier(saved);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu đơn vị vận chuyển');
    } finally {
      setSavingCarrier(false);
    }
  };

  const handleDeleteCarrier = (carrier: CarrierItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá đơn vị vận chuyển',
      message: `Bạn có chắc chắn muốn xoá đơn vị vận chuyển "${carrier.name}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/plan-finance/carriers/${carrier.id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            throw new Error('Không thể xoá đơn vị vận chuyển này');
          }
          setSelectedCarrier(null);
          setSelectedCarrierIds((prev) => prev.filter((id) => id !== carrier.id));
          await fetchCarriers();
        } catch (err: any) {
          alert(err.message || 'Lỗi khi xoá đơn vị vận chuyển');
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleBulkDeleteCarriers = () => {
    if (selectedCarrierIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xoá đơn vị vận chuyển đã chọn',
      message: `Bạn có chắc chắn muốn xoá ${selectedCarrierIds.length} đơn vị vận chuyển đã chọn?`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await Promise.all(
            selectedCarrierIds.map((id) =>
              fetch(`/api/plan-finance/carriers/${id}`, { method: 'DELETE' }),
            ),
          );
          setSelectedCarrierIds([]);
          setSelectedCarrier(null);
          await fetchCarriers();
        } catch (err) {
          console.error('Error bulk deleting carriers:', err);
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // ── TOGGLE CATEGORY IN SUPPLIER FORM ──
  const toggleSupplierCategory = (categoryId: string) => {
    setSupplierForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  };

  // ── RENDER STARS ──
  const renderStars = (rating: number) => {
    const safeRating = Math.min(5, Math.max(0, Math.round(rating || 0)));
    return (
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= safeRating ? (
            <StarFill key={star} size={12} className="text-amber-400" />
          ) : (
            <Star key={star} size={12} className="text-slate-300" />
          ),
        )}
      </div>
    );
  };

  // ── STEPS CONFIG ──
  const steps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'suppliers',
        title: 'Nhà cung cấp',
        desc: 'Đối tác cung ứng vật tư & linh kiện',
        icon: <Building size={15} />,
        badge: `${totalSuppliers} NCC`,
      },
      {
        num: 2,
        id: 'carriers',
        title: 'Đơn vị vận chuyển',
        desc: 'Đối tác vận tải & giao nhận hàng hóa',
        icon: <Truck size={15} />,
        badge: `${totalCarriers} ĐVVC`,
      },
    ],
    [totalSuppliers, totalCarriers],
  );

  // ── CHECKBOX HELPERS ──
  const allSuppliersSelected =
    suppliers.length > 0 && suppliers.every((s) => selectedSupplierIds.includes(s.id));
  const toggleSelectAllSuppliers = () => {
    if (allSuppliersSelected) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(suppliers.map((s) => s.id));
    }
  };

  const allCarriersSelected =
    carriers.length > 0 && carriers.every((c) => selectedCarrierIds.includes(c.id));
  const toggleSelectAllCarriers = () => {
    if (allCarriersSelected) {
      setSelectedCarrierIds([]);
    } else {
      setSelectedCarrierIds(carriers.map((c) => c.id));
    }
  };

  return (
    <>
      <StepPage
        title="Nhà cung cấp và vận chuyển"
        description="Quản lý danh sách nhà cung cấp vật tư, linh kiện và các đơn vị vận chuyển đối tác"
        icon="bi-truck"
        color="indigo"
        steps={steps}
        currentStep={currentStep}
        onStepChange={(stepId) => setCurrentStep(stepId)}
      >
        {currentStep === 1 ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <TableToolbar
              searchPlaceholder="Tìm kiếm mã NCC, tên công ty, MST, SĐT, người liên hệ..."
              searchValue={supplierSearch}
              onSearchChange={(val) => {
                setSupplierSearch(val);
                setSupplierPage(1);
              }}
              filters={[
                {
                  id: 'supplier-category',
                  value: supplierCategoryFilter || 'all',
                  onChange: (val) => {
                    setSupplierCategoryFilter(val === 'all' ? '' : val);
                    setSupplierPage(1);
                  },
                  options: [
                    { value: 'all', label: 'Tất cả danh mục' },
                    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                  ],
                  minWidth: '185px',
                },
                {
                  id: 'supplier-status',
                  value: supplierStatusFilter || 'all',
                  onChange: (val) => {
                    setSupplierStatusFilter(val === 'all' ? '' : val);
                    setSupplierPage(1);
                  },
                  options: [
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'active', label: 'Đang hợp tác' },
                    { value: 'inactive', label: 'Tạm ngưng' },
                  ],
                  minWidth: '160px',
                },
              ]}
              rightActions={
                <div className="flex items-center gap-2">
                  {selectedSupplierIds.length > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash size={14} />}
                      onClick={handleBulkDeleteSuppliers}
                    >
                      Xoá ({selectedSupplierIds.length})
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={handleOpenAddSupplier}
                  >
                    Thêm mới
                  </Button>
                </div>
              }
              showMenu={false}
            />

            <FullWidthTable loading={loadingSuppliers}>
              <table className="custom-table w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/95 border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 w-11 text-center">
                      <input
                        type="checkbox"
                        checked={allSuppliersSelected}
                        onChange={toggleSelectAllSuppliers}
                        className="form-check-input cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Nhà cung cấp</th>
                    <th className="py-3 px-4">Danh mục cung ứng</th>
                    <th className="py-3 px-4">Người liên hệ</th>
                    <th className="py-3 px-4 text-right">Công nợ / Hạn mức</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {suppliers.length === 0 && !loadingSuppliers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-[13px]">
                        Chưa có nhà cung cấp nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : null}
                  {suppliers.map((sup) => {
                    const isChecked = selectedSupplierIds.includes(sup.id);
                    const supCats = (sup.categories || [])
                      .map((c) => c.category?.name)
                      .filter(Boolean) as string[];
                    const isActive = sup.trangThai !== 'inactive';

                    return (
                      <tr
                        key={sup.id}
                        onClick={() => handleSelectSupplier(sup)}
                        className="cursor-pointer hover:bg-sky-50/40 transition-colors group"
                      >
                        <td
                          className="py-3 px-4 w-11 text-center align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSupplierIds((prev) => [...prev, sup.id]);
                              } else {
                                setSelectedSupplierIds((prev) =>
                                  prev.filter((id) => id !== sup.id),
                                );
                              }
                            }}
                            className="form-check-input cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors text-[13px] line-clamp-1">
                              {sup.name}
                            </span>
                            {sup.code && (
                              <span className="font-mono text-[11px] font-semibold text-[#1e5470] bg-sky-50/80 border border-sky-200/70 px-1.5 py-0.5 rounded shrink-0">
                                {sup.code}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {sup.taxCode && <span>MST: {sup.taxCode}</span>}
                            {sup.address && (
                              <span className="truncate max-w-[280px]" title={sup.address}>
                                {sup.taxCode ? '• ' : ''}
                                {sup.address}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          {supCats.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {supCats.slice(0, 2).map((cName, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {cName}
                                </span>
                              ))}
                              {supCats.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  +{supCats.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400 italic">
                              Chưa phân loại
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          {sup.contactName || sup.phone ? (
                            <div>
                              <div className="text-[13px] font-medium text-slate-800">
                                {sup.xungHo ? `${sup.xungHo} ` : ''}
                                {sup.contactName || '—'}
                              </div>
                              {sup.phone && (
                                <div className="text-[11.5px] text-slate-500 font-mono">
                                  {sup.phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                          <div className="text-[13px] font-semibold text-slate-800">
                            {formatCurrency(sup.congNoHienTai || 0)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Hạn mức: {formatCurrency(sup.hanMucNo || 0)}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                          {renderStars(sup.danhGia)}
                        </td>
                        <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang hợp tác
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Tạm ngưng
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </FullWidthTable>

            <Pagination
              currentPage={supplierPage}
              totalPages={Math.max(1, Math.ceil(totalSuppliers / supplierPageSize))}
              totalItems={totalSuppliers}
              pageSize={supplierPageSize}
              onPageChange={setSupplierPage}
              onPageSizeChange={(size) => {
                setSupplierPageSize(size);
                setSupplierPage(1);
              }}
              itemName="nhà cung cấp"
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <TableToolbar
              searchPlaceholder="Tìm kiếm mã ĐVVC, tên đơn vị, người liên hệ, SĐT, tuyến đường..."
              searchValue={carrierSearch}
              onSearchChange={(val) => {
                setCarrierSearch(val);
                setCarrierPage(1);
              }}
              filters={[
                {
                  id: 'carrier-service',
                  value: carrierServiceFilter || 'all',
                  onChange: (val) => {
                    setCarrierServiceFilter(val === 'all' ? '' : val);
                    setCarrierPage(1);
                  },
                  options: [
                    { value: 'all', label: 'Tất cả loại dịch vụ' },
                    ...SERVICE_TYPES.map((st) => ({ value: st, label: st })),
                  ],
                  minWidth: '185px',
                },
                {
                  id: 'carrier-status',
                  value: carrierStatusFilter || 'all',
                  onChange: (val) => {
                    setCarrierStatusFilter(val === 'all' ? '' : val);
                    setCarrierPage(1);
                  },
                  options: [
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'active', label: 'Đang hợp tác' },
                    { value: 'inactive', label: 'Tạm ngưng' },
                  ],
                  minWidth: '160px',
                },
              ]}
              rightActions={
                <div className="flex items-center gap-2">
                  {selectedCarrierIds.length > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash size={14} />}
                      onClick={handleBulkDeleteCarriers}
                    >
                      Xoá ({selectedCarrierIds.length})
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={handleOpenAddCarrier}
                  >
                    Thêm mới
                  </Button>
                </div>
              }
              showMenu={false}
            />

            <FullWidthTable loading={loadingCarriers}>
              <table className="custom-table w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/95 border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 w-11 text-center">
                      <input
                        type="checkbox"
                        checked={allCarriersSelected}
                        onChange={toggleSelectAllCarriers}
                        className="form-check-input cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Đơn vị vận chuyển</th>
                    <th className="py-3 px-4">Loại dịch vụ & Tuyến</th>
                    <th className="py-3 px-4">Người liên hệ</th>
                    <th className="py-3 px-4 text-right">Hạn mức nợ</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {carriers.length === 0 && !loadingCarriers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-[13px]">
                        Chưa có đơn vị vận chuyển nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : null}
                  {carriers.map((car) => {
                    const isChecked = selectedCarrierIds.includes(car.id);
                    const isActive = car.trangThai !== 'inactive';

                    return (
                      <tr
                        key={car.id}
                        onClick={() => setSelectedCarrier(car)}
                        className="cursor-pointer hover:bg-sky-50/40 transition-colors group"
                      >
                        <td
                          className="py-3 px-4 w-11 text-center align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCarrierIds((prev) => [...prev, car.id]);
                              } else {
                                setSelectedCarrierIds((prev) =>
                                  prev.filter((id) => id !== car.id),
                                );
                              }
                            }}
                            className="form-check-input cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors text-[13px] line-clamp-1">
                              {car.name}
                            </span>
                            {car.code && (
                              <span className="font-mono text-[11px] font-semibold text-[#1e5470] bg-sky-50/80 border border-sky-200/70 px-1.5 py-0.5 rounded shrink-0">
                                {car.code}
                              </span>
                            )}
                          </div>
                          {(car.transactionAddress || car.address) && (
                            <div
                              className="text-[11.5px] text-slate-500 truncate max-w-[280px] mt-0.5"
                              title={car.transactionAddress || car.address || ''}
                            >
                              {car.transactionAddress || car.address}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {car.serviceType || 'Chuyển phát nhanh'}
                          </div>
                          {car.routes && (
                            <div
                              className="text-[11.5px] text-slate-500 truncate max-w-[220px] mt-0.5"
                              title={car.routes}
                            >
                              Tuyến: {car.routes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          {car.contactName || car.phone ? (
                            <div>
                              <div className="text-[13px] font-medium text-slate-800">
                                {car.contactName || '—'}
                                {car.contactRole ? (
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    {' '}
                                    ({car.contactRole})
                                  </span>
                                ) : null}
                              </div>
                              {car.phone && (
                                <div className="text-[11.5px] text-slate-500 font-mono">
                                  {car.phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                          <span className="text-[13px] font-semibold text-slate-800">
                            {formatCurrency(car.hanMucNo || 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                          {renderStars(car.danhGia)}
                        </td>
                        <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang hợp tác
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Tạm ngưng
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </FullWidthTable>

            <Pagination
              currentPage={carrierPage}
              totalPages={Math.max(1, Math.ceil(totalCarriers / carrierPageSize))}
              totalItems={totalCarriers}
              pageSize={carrierPageSize}
              onPageChange={setCarrierPage}
              onPageSizeChange={(size) => {
                setCarrierPageSize(size);
                setCarrierPage(1);
              }}
              itemName="đơn vị vận chuyển"
            />
          </div>
        )}
      </StepPage>

      {/* ── OFFCANVAS CHI TIẾT NHÀ CUNG CẤP (400px) ── */}
      <Offcanvas
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title="Chi tiết nhà cung cấp"
        description={selectedSupplier?.code || ''}
        icon={<Building size={18} />}
        width="400px"
        footer={
          selectedSupplier ? (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                title="Xoá nhà cung cấp"
                onClick={() => handleDeleteSupplier(selectedSupplier)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer shrink-0"
              >
                <Trash size={15} />
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSupplier(null)}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Pencil size={13} />}
                  onClick={() => handleOpenEditSupplier(selectedSupplier)}
                >
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selectedSupplier && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Mã nhà cung cấp
                  </span>
                  <div className="text-[15px] font-bold font-mono text-[#1e5470]">
                    {selectedSupplier.code}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {selectedSupplier.trangThai !== 'inactive' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircleFill size={10} />
                      Đang hợp tác
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      <PauseCircleFill size={10} />
                      Tạm ngưng
                    </span>
                  )}
                  {renderStars(selectedSupplier.danhGia)}
                </div>
              </div>

              <div className="pt-1 border-t border-slate-200/60">
                <div className="text-[14px] font-bold text-slate-800">
                  {selectedSupplier.name}
                </div>
                {selectedSupplier.taxCode && (
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    Mã số thuế: <span className="font-mono font-medium text-slate-700">{selectedSupplier.taxCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <PersonBadge size={13} />
                Thông tin liên hệ
              </div>

              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Người đại diện:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedSupplier.contactName
                      ? `${selectedSupplier.xungHo ? selectedSupplier.xungHo + ' ' : ''}${selectedSupplier.contactName}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Telephone size={12} className="text-slate-400" /> Điện thoại:
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedSupplier.phone || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Envelope size={12} className="text-slate-400" /> Email:
                  </span>
                  <span className="text-slate-700 truncate max-w-[200px]">
                    {selectedSupplier.email || '—'}
                  </span>
                </div>
                {selectedSupplier.website && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Globe size={12} className="text-slate-400" /> Website:
                    </span>
                    <span className="text-[#1e5470] truncate max-w-[200px]">
                      {selectedSupplier.website}
                    </span>
                  </div>
                )}
                <div className="pt-1 border-t border-slate-100">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-0.5">
                    <GeoAlt size={12} className="text-slate-400" /> Địa chỉ:
                  </div>
                  <div className="text-slate-700 text-[12.5px]">
                    {selectedSupplier.address || 'Chưa cập nhật địa chỉ'}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard2Front size={13} />
                Hạn mức & Công nợ
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="text-[11px] text-slate-500">Công nợ hiện tại</div>
                  <div className="text-[14px] font-bold text-rose-600 mt-0.5">
                    {formatCurrency(supplierDetailDebt)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="text-[11px] text-slate-500">Hạn mức công nợ</div>
                  <div className="text-[14px] font-bold text-[#1e5470] mt-0.5">
                    {formatCurrency(selectedSupplier.hanMucNo || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BoxSeam size={13} />
                Danh mục vật tư cung ứng
              </div>
              {selectedSupplier.categories && selectedSupplier.categories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSupplier.categories.map((rel) => (
                    <span
                      key={rel.id || rel.categoryId}
                      className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-indigo-50/70 text-indigo-700 border border-indigo-200/70"
                    >
                      {rel.category?.name || 'Danh mục'}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[12.5px] text-slate-400 italic">
                  Chưa gán danh mục vật tư cung ứng
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedSupplier.ghiChu && (
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-1">
                <div className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-700">
                  Ghi chú
                </div>
                <div className="text-[12.5px] text-slate-700 whitespace-pre-line">
                  {selectedSupplier.ghiChu}
                </div>
              </div>
            )}

            {/* Recent Purchase Orders */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileEarmarkText size={13} />
                  Đơn mua hàng gần đây
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {supplierDetailOrders.length} đơn
                </span>
              </div>

              {loadingSupplierDetail ? (
                <div className="text-[12.5px] text-slate-400 py-3 text-center">
                  Đang tải lịch sử đơn hàng...
                </div>
              ) : supplierDetailOrders.length === 0 ? (
                <div className="text-[12.5px] text-slate-400 italic py-2">
                  Chưa có đơn mua hàng nào với nhà cung cấp này.
                </div>
              ) : (
                <div className="space-y-2">
                  {supplierDetailOrders.map((po) => {
                    const st = PO_STATUS_BADGE[po.trangThai] || {
                      label: po.trangThai,
                      cls: 'bg-slate-100 text-slate-600 border-slate-200',
                    };
                    return (
                      <div
                        key={po.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-mono text-[12.5px] font-bold text-[#1e5470]">
                            {po.code}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Ngày đặt: {formatDateShort(po.ngayDat)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12.5px] font-semibold text-slate-800">
                            {formatCurrency(po.tongTien)}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[10.5px] font-medium border ${st.cls}`}
                          >
                            {st.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS THÊM / SỬA NHÀ CUNG CẤP (400px) ── */}
      <Offcanvas
        isOpen={isSupplierFormOpen}
        onClose={() => setIsSupplierFormOpen(false)}
        title={editingSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        description={editingSupplier ? editingSupplier.code : 'Tạo hồ sơ đối tác cung ứng vật tư'}
        icon={<Building size={18} />}
        width="400px"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSupplierFormOpen(false)}
              disabled={savingSupplier}
            >
              Huỷ bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={savingSupplier}
              onClick={handleSaveSupplier}
            >
              {editingSupplier ? 'Lưu thay đổi' : 'Tạo nhà cung cấp'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3.5">
          <Input
            label="Tên nhà cung cấp *"
            placeholder="VD: Công ty TNHH Thiết bị Vệ sinh Hàn Quốc"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Mã số thuế"
              placeholder="VD: 0108123456"
              value={supplierForm.taxCode}
              onChange={(e) => setSupplierForm({ ...supplierForm, taxCode: e.target.value })}
            />
            <Select
              label="Trạng thái"
              value={supplierForm.trangThai}
              onChange={(e) => setSupplierForm({ ...supplierForm, trangThai: e.target.value })}
              options={[
                { value: 'active', label: 'Đang hợp tác' },
                { value: 'inactive', label: 'Tạm ngưng' },
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select
              label="Xưng hô"
              value={supplierForm.xungHo}
              onChange={(e) => setSupplierForm({ ...supplierForm, xungHo: e.target.value })}
              options={[
                { value: 'Anh', label: 'Anh' },
                { value: 'Chị', label: 'Chị' },
                { value: 'Ông', label: 'Ông' },
                { value: 'Bà', label: 'Bà' },
              ]}
            />
            <div className="col-span-2">
              <Input
                label="Người liên hệ"
                placeholder="Họ và tên người đại diện"
                value={supplierForm.contactName}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, contactName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Số điện thoại"
              placeholder="VD: 0912345678"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="contact@supplier.vn"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
          </div>

          <Input
            label="Website"
            placeholder="https://..."
            value={supplierForm.website}
            onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })}
          />

          <Input
            label="Địa chỉ"
            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố..."
            value={supplierForm.address}
            onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Hạn mức công nợ (VNĐ)
              </label>
              <CurrencyInput
                value={supplierForm.hanMucNo}
                onChange={(val) => setSupplierForm({ ...supplierForm, hanMucNo: val })}
                className="w-full h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <Select
              label="Đánh giá uy tín"
              value={String(supplierForm.danhGia)}
              onChange={(e) =>
                setSupplierForm({ ...supplierForm, danhGia: Number(e.target.value) })
              }
              options={[
                { value: '5', label: '5 sao - Rất tốt' },
                { value: '4', label: '4 sao - Tốt' },
                { value: '3', label: '3 sao - Khá' },
                { value: '2', label: '2 sao - Trung bình' },
                { value: '1', label: '1 sao - Cần lưu ý' },
              ]}
            />
          </div>

          {/* Danh mục cung ứng */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Danh mục vật tư cung ứng ({supplierForm.categoryIds.length} đã chọn)
            </label>
            <div className="max-h-36 overflow-y-auto p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-wrap gap-1.5">
              {categories.length === 0 ? (
                <span className="text-[12px] text-slate-400">Chưa có danh mục kho</span>
              ) : (
                categories.map((cat) => {
                  const active = supplierForm.categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleSupplierCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1e5470] text-white border-[#1e5470]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Ghi chú hợp tác
            </label>
            <textarea
              rows={3}
              value={supplierForm.ghiChu}
              onChange={(e) => setSupplierForm({ ...supplierForm, ghiChu: e.target.value })}
              placeholder="Ghi chú điều khoản thanh toán, chiết khấu, thời gian giao hàng..."
              className="w-full p-2.5 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#2563eb]"
            />
          </div>
        </form>
      </Offcanvas>

      {/* ── OFFCANVAS CHI TIẾT ĐƠN VỊ VẬN CHUYỂN (400px) ── */}
      <Offcanvas
        isOpen={!!selectedCarrier}
        onClose={() => setSelectedCarrier(null)}
        title="Chi tiết đơn vị vận chuyển"
        description={selectedCarrier?.code || ''}
        icon={<Truck size={18} />}
        width="400px"
        footer={
          selectedCarrier ? (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                title="Xoá đơn vị vận chuyển"
                onClick={() => handleDeleteCarrier(selectedCarrier)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer shrink-0"
              >
                <Trash size={15} />
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCarrier(null)}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Pencil size={13} />}
                  onClick={() => handleOpenEditCarrier(selectedCarrier)}
                >
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {selectedCarrier && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Mã ĐVVC
                  </span>
                  <div className="text-[15px] font-bold font-mono text-[#1e5470]">
                    {selectedCarrier.code || '—'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {selectedCarrier.trangThai !== 'inactive' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircleFill size={10} />
                      Đang hợp tác
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      <PauseCircleFill size={10} />
                      Tạm ngưng
                    </span>
                  )}
                  {renderStars(selectedCarrier.danhGia)}
                </div>
              </div>

              <div className="pt-1 border-t border-slate-200/60">
                <div className="text-[14px] font-bold text-slate-800">
                  {selectedCarrier.name}
                </div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedCarrier.serviceType || 'Chuyển phát nhanh'}
                  </span>
                </div>
              </div>
            </div>

            {/* Routes & Addresses */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <SignpostSplit size={13} />
                Tuyến vận chuyển & Địa điểm
              </div>

              <div className="space-y-2 text-[13px]">
                <div>
                  <div className="text-slate-500 text-[12px]">Tuyến hoạt động chính:</div>
                  <div className="font-medium text-slate-800 mt-0.5">
                    {selectedCarrier.routes || 'Toàn quốc'}
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <div className="text-slate-500 text-[12px]">Địa chỉ kho / điểm giao dịch:</div>
                  <div className="text-slate-700 mt-0.5">
                    {selectedCarrier.transactionAddress || '—'}
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <div className="text-slate-500 text-[12px]">Địa chỉ trụ sở:</div>
                  <div className="text-slate-700 mt-0.5">
                    {selectedCarrier.address || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2.5">
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <PersonBadge size={13} />
                Thông tin liên hệ
              </div>

              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Người phụ trách:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCarrier.contactName || '—'}
                    {selectedCarrier.contactRole ? ` (${selectedCarrier.contactRole})` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Telephone size={12} className="text-slate-400" /> Điện thoại:
                  </span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedCarrier.phone || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Envelope size={12} className="text-slate-400" /> Email:
                  </span>
                  <span className="text-slate-700 truncate max-w-[200px]">
                    {selectedCarrier.email || '—'}
                  </span>
                </div>
                {selectedCarrier.website && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Globe size={12} className="text-slate-400" /> Website:
                    </span>
                    <span className="text-[#1e5470] truncate max-w-[200px]">
                      {selectedCarrier.website}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Debt Limit */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
              <span className="text-[13px] text-slate-600 font-medium">Hạn mức công nợ vận chuyển:</span>
              <span className="text-[14px] font-bold text-[#1e5470]">
                {formatCurrency(selectedCarrier.hanMucNo || 0)}
              </span>
            </div>

            {/* Notes */}
            {selectedCarrier.ghiChu && (
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-1">
                <div className="text-[11.5px] font-semibold uppercase tracking-wider text-amber-700">
                  Ghi chú
                </div>
                <div className="text-[12.5px] text-slate-700 whitespace-pre-line">
                  {selectedCarrier.ghiChu}
                </div>
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS THÊM / SỬA ĐƠN VỊ VẬN CHUYỂN (400px) ── */}
      <Offcanvas
        isOpen={isCarrierFormOpen}
        onClose={() => setIsCarrierFormOpen(false)}
        title={editingCarrier ? 'Chỉnh sửa ĐVVC' : 'Thêm đơn vị vận chuyển'}
        description={editingCarrier ? editingCarrier.code || '' : 'Tạo hồ sơ đối tác vận tải & giao nhận'}
        icon={<Truck size={18} />}
        width="400px"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCarrierFormOpen(false)}
              disabled={savingCarrier}
            >
              Huỷ bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={savingCarrier}
              onClick={handleSaveCarrier}
            >
              {editingCarrier ? 'Lưu thay đổi' : 'Tạo ĐVVC'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveCarrier} className="space-y-3.5">
          <Input
            label="Tên đơn vị vận chuyển *"
            placeholder="VD: Viettel Post, Giao Hàng Nhanh, Vận tải Bắc Nam..."
            value={carrierForm.name}
            onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Mã ĐVVC (tự sinh nếu trống)"
              placeholder="VD: VCH-2026..."
              value={carrierForm.code}
              onChange={(e) => setCarrierForm({ ...carrierForm, code: e.target.value })}
            />
            <Select
              label="Trạng thái"
              value={carrierForm.trangThai}
              onChange={(e) => setCarrierForm({ ...carrierForm, trangThai: e.target.value })}
              options={[
                { value: 'active', label: 'Đang hợp tác' },
                { value: 'inactive', label: 'Tạm ngưng' },
              ]}
            />
          </div>

          <Select
            label="Loại hình dịch vụ"
            value={carrierForm.serviceType}
            onChange={(e) => setCarrierForm({ ...carrierForm, serviceType: e.target.value })}
            options={SERVICE_TYPES.map((st) => ({ value: st, label: st }))}
          />

          <Input
            label="Tuyến vận chuyển chính"
            placeholder="VD: Hà Nội - Hải Phòng - Quảng Ninh, Toàn quốc..."
            value={carrierForm.routes}
            onChange={(e) => setCarrierForm({ ...carrierForm, routes: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Người liên hệ"
              placeholder="Họ và tên"
              value={carrierForm.contactName}
              onChange={(e) =>
                setCarrierForm({ ...carrierForm, contactName: e.target.value })
              }
            />
            <Input
              label="Chức vụ / Vai trò"
              placeholder="VD: Điều phối viên"
              value={carrierForm.contactRole}
              onChange={(e) =>
                setCarrierForm({ ...carrierForm, contactRole: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Số điện thoại"
              placeholder="VD: 0988765432"
              value={carrierForm.phone}
              onChange={(e) => setCarrierForm({ ...carrierForm, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="support@carrier.vn"
              value={carrierForm.email}
              onChange={(e) => setCarrierForm({ ...carrierForm, email: e.target.value })}
            />
          </div>

          <Input
            label="Địa chỉ kho / điểm giao nhận"
            placeholder="Địa chỉ gửi/nhận hàng..."
            value={carrierForm.transactionAddress}
            onChange={(e) =>
              setCarrierForm({ ...carrierForm, transactionAddress: e.target.value })
            }
          />

          <Input
            label="Địa chỉ trụ sở"
            placeholder="Địa chỉ công ty..."
            value={carrierForm.address}
            onChange={(e) => setCarrierForm({ ...carrierForm, address: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Hạn mức công nợ (VNĐ)
              </label>
              <CurrencyInput
                value={carrierForm.hanMucNo}
                onChange={(val) => setCarrierForm({ ...carrierForm, hanMucNo: val })}
                className="w-full h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <Select
              label="Đánh giá chất lượng"
              value={String(carrierForm.danhGia)}
              onChange={(e) =>
                setCarrierForm({ ...carrierForm, danhGia: Number(e.target.value) })
              }
              options={[
                { value: '5', label: '5 sao - Rất tốt' },
                { value: '4', label: '4 sao - Tốt' },
                { value: '3', label: '3 sao - Khá' },
                { value: '2', label: '2 sao - Trung bình' },
                { value: '1', label: '1 sao - Cần lưu ý' },
              ]}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={3}
              value={carrierForm.ghiChu}
              onChange={(e) => setCarrierForm({ ...carrierForm, ghiChu: e.target.value })}
              placeholder="Ghi chú biểu phí, thời gian lấy hàng, quy định đóng gói..."
              className="w-full p-2.5 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#2563eb]"
            />
          </div>
        </form>
      </Offcanvas>

      {/* ── CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        isLoading={confirmLoading}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ── LỊCH SỰ KIỆN ── */}
      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </>
  );
};

export default PurchaseSuppliersPage;
