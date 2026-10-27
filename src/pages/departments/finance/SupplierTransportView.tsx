import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash,
  Truck,
  Telephone,
  Envelope,
  GeoAlt,
  Person,
  CheckCircle,
  ClockHistory,
  SlashCircle,
  Tag,
  Compass,
  StarFill,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { TableToolbar } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

// ==========================================
// 1. DATA TYPES CHO NHÀ CUNG CẤP VÀ VẬN CHUYỂN
// ==========================================
export type CommonStatusType = 'active' | 'paused' | 'stopped';

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  categories: string[];
  salutation?: string; // 'Anh' | 'Chị' | 'Ông' | 'Bà'
  representative: string;
  representativeRole?: string;
  phone: string;
  email: string;
  address: string;
  taxCode?: string;
  creditLimit?: string; // Hạn mức công nợ
  rating: number; // 1 -> 5 sao
  status: CommonStatusType;
  statusLabel: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransporterItem {
  id: string;
  code: string;
  name: string;
  serviceType: string;
  vehicleFleet: string;
  coordinator: string;
  coordinatorRole?: string;
  phone: string;
  hubAddress: string;
  routes: string;
  status: CommonStatusType;
  statusLabel: string;
  createdAt?: string;
  updatedAt?: string;
}

export const AVAILABLE_CATEGORIES = [
  'Gỗ nguyên liệu',
  'Khóa và Kim khí',
  'Vật liệu chống cháy',
  'Sơn và Keo dán',
  'Kính cường lực',
  'Phụ kiện cửa và Gioăng',
];

interface SupplierTransportViewProps {
  currentStep: number;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SupplierTransportView: React.FC<SupplierTransportViewProps> = ({
  currentStep,
  onShowToast,
}) => {
  // ==========================================
  // STATE BƯỚC 1: NHÀ CUNG CẤP (CSDL THỰC TẾ)
  // ==========================================
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(false);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('all');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [supplierCurrentPage, setSupplierCurrentPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(10);
  const [isSupplierOffcanvasOpen, setIsSupplierOffcanvasOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [isDeleteSupplierDialogOpen, setIsDeleteSupplierDialogOpen] = useState(false);

  // Form NCC (Dùng cho cả Thêm mới và Chỉnh sửa)
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    categories: ['Gỗ nguyên liệu'] as string[],
    salutation: 'Anh',
    representative: '',
    representativeRole: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
    rating: 5,
    status: 'active' as CommonStatusType,
  });

  // ==========================================
  // STATE BƯỚC 2: ĐƠN VỊ VẬN CHUYỂN (CSDL THỰC TẾ)
  // ==========================================
  const [transporters, setTransporters] = useState<TransporterItem[]>([]);
  const [isTransportersLoading, setIsTransportersLoading] = useState(false);
  const [selectedTransporterIds, setSelectedTransporterIds] = useState<string[]>([]);
  const [transporterServiceFilter, setTransporterServiceFilter] = useState('all');
  const [transporterStatusFilter, setTransporterStatusFilter] = useState('all');
  const [transporterSearchQuery, setTransporterSearchQuery] = useState('');
  const [transporterCurrentPage, setTransporterCurrentPage] = useState(1);
  const [transporterPageSize, setTransporterPageSize] = useState(10);
  const [isTransporterOffcanvasOpen, setIsTransporterOffcanvasOpen] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState<TransporterItem | null>(null);
  const [isDeleteTransporterDialogOpen, setIsDeleteTransporterDialogOpen] = useState(false);

  // Form ĐVVC (Dùng cho cả Thêm mới và Chỉnh sửa)
  const [transporterForm, setTransporterForm] = useState({
    name: '',
    serviceType: 'Vận tải đường bộ xe tải thùng',
    coordinator: '',
    coordinatorRole: '',
    phone: '',
    hubAddress: '',
    routes: '',
    status: 'active' as CommonStatusType,
  });

  // ==========================================
  // ĐỒNG BỘ CSDL THỰC TẾ (/api/suppliers và /api/transporters)
  // ==========================================
  const fetchSuppliers = useCallback(async () => {
    setIsSuppliersLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhà cung cấp từ CSDL:', err);
    } finally {
      setIsSuppliersLoading(false);
    }
  }, []);

  const fetchTransporters = useCallback(async () => {
    setIsTransportersLoading(true);
    try {
      const res = await fetch('/api/transporters');
      if (res.ok) {
        const data = await res.json();
        setTransporters(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn vị vận chuyển từ CSDL:', err);
    } finally {
      setIsTransportersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchTransporters();
  }, [fetchSuppliers, fetchTransporters]);

  // ==========================================
  // HÀM ĐÁNH GIÁ 5 SAO CHO NHÀ CUNG CẤP (LƯU DB)
  // ==========================================
  const handleRateSupplier = async (id: string, stars: number) => {
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars }),
      });
      if (res.ok) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, rating: stars } : s))
        );
        if (onShowToast) {
          const item = suppliers.find((s) => s.id === id);
          onShowToast('success', 'Đã lưu đánh giá', `Đã cập nhật đánh giá ${stars} sao cho nhà cung cấp ${item?.name || ''}.`);
        }
      }
    } catch (err) {
      console.error('Lỗi lưu đánh giá nhà cung cấp:', err);
    }
  };

  // Helper render 5 sao cho Nhà cung cấp
  const renderStarRating = (
    rating: number,
    onRate: (stars: number) => void
  ) => {
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onRate(star)}
              title={`Đánh giá ${star} sao`}
              style={{
                background: 'none',
                border: 'none',
                padding: '1px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: filled ? '#f59e0b' : 'rgba(148, 163, 184, 0.4)',
                transition: 'transform 0.1s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <StarFill size={11} />
            </button>
          );
        })}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#f59e0b',
            marginLeft: '3px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Number(rating).toFixed(1)}
        </span>
      </div>
    );
  };

  // ==========================================
  // XỬ LÝ NHÀ CUNG CẤP (THÊM / SỬA / XOÁ)
  // ==========================================
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      categories: ['Gỗ nguyên liệu'],
      salutation: 'Anh',
      representative: '',
      representativeRole: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: '',
      rating: 5,
      status: 'active',
    });
    setIsSupplierOffcanvasOpen(true);
  };

  const handleOpenEditSupplier = (item: SupplierItem) => {
    setEditingSupplier(item);
    setSupplierForm({
      name: item.name,
      categories: [...item.categories],
      salutation: item.salutation || 'Anh',
      representative: item.representative,
      representativeRole: item.representativeRole || '',
      phone: item.phone,
      email: item.email,
      address: item.address,
      creditLimit: item.creditLimit || '',
      rating: item.rating,
      status: item.status,
    });
    setIsSupplierOffcanvasOpen(true);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((item) => {
      if (supplierCategoryFilter !== 'all' && !item.categories.includes(supplierCategoryFilter)) {
        return false;
      }
      if (supplierStatusFilter !== 'all' && item.status !== supplierStatusFilter) {
        return false;
      }
      if (supplierSearchQuery.trim()) {
        const q = supplierSearchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchRep = item.representative.toLowerCase().includes(q);
        const matchRole = (item.representativeRole || '').toLowerCase().includes(q);
        const matchPhone = item.phone.toLowerCase().includes(q);
        const matchEmail = item.email.toLowerCase().includes(q);
        const matchAddress = item.address.toLowerCase().includes(q);
        const matchCat = item.categories.some((c) => c.toLowerCase().includes(q));
        if (!matchName && !matchRep && !matchRole && !matchPhone && !matchEmail && !matchAddress && !matchCat) {
          return false;
        }
      }
      return true;
    });
  }, [suppliers, supplierCategoryFilter, supplierStatusFilter, supplierSearchQuery]);

  const paginatedSuppliers = useMemo(() => {
    const start = (supplierCurrentPage - 1) * supplierPageSize;
    return filteredSuppliers.slice(start, start + supplierPageSize);
  }, [filteredSuppliers, supplierCurrentPage, supplierPageSize]);

  const toggleSelectAllSuppliers = () => {
    if (selectedSupplierIds.length === paginatedSuppliers.length && paginatedSuppliers.length > 0) {
      setSelectedSupplierIds([]);
    } else {
      setSelectedSupplierIds(paginatedSuppliers.map((s) => s.id));
    }
  };

  const toggleSelectSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSuppliersConfirm = async () => {
    try {
      const res = await fetch('/api/suppliers/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedSupplierIds }),
      });
      if (res.ok) {
        const deletedCount = selectedSupplierIds.length;
        setSuppliers((prev) => prev.filter((s) => !selectedSupplierIds.includes(s.id)));
        setSelectedSupplierIds([]);
        setIsDeleteSupplierDialogOpen(false);
        if (onShowToast) {
          onShowToast('success', 'Xoá thành công', `Đã xoá ${deletedCount} nhà cung cấp khỏi CSDL.`);
        }
      } else {
        throw new Error('Xóa không thành công');
      }
    } catch (err) {
      console.error('Lỗi xoá nhà cung cấp:', err);
      if (onShowToast) onShowToast('error', 'Lỗi', 'Không thể xoá nhà cung cấp. Vui lòng thử lại.');
    }
  };

  const toggleSupplierCategory = (cat: string) => {
    setSupplierForm((prev) => {
      const exists = prev.categories.includes(cat);
      if (exists) {
        return { ...prev, categories: prev.categories.filter((c) => c !== cat) };
      } else {
        return { ...prev, categories: [...prev.categories, cat] };
      }
    });
  };

  const handleSupplierFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên nhà cung cấp và số điện thoại.');
      return;
    }
    if (supplierForm.categories.length === 0) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng chọn ít nhất 1 danh mục hàng hoá cung ứng.');
      return;
    }

    const statusMap: Record<CommonStatusType, string> = {
      active: 'Đang hoạt động',
      paused: 'Tạm ngừng',
      stopped: 'Dừng hợp tác',
    };

    const payload = {
      name: supplierForm.name.trim(),
      categories: supplierForm.categories,
      salutation: supplierForm.salutation,
      representative: supplierForm.representative.trim() || 'Người đại diện',
      representativeRole: supplierForm.representativeRole.trim() || undefined,
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim() || 'lienhe@nhacungcap.vn',
      address: supplierForm.address.trim() || 'Việt Nam',
      creditLimit: supplierForm.creditLimit.trim() || undefined,
      rating: supplierForm.rating || 5,
      status: supplierForm.status,
      statusLabel: statusMap[supplierForm.status] || 'Đang hoạt động',
    };

    try {
      if (editingSupplier) {
        // Chế độ Edit: Cập nhật thông tin vào CSDL
        const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setSuppliers((prev) => prev.map((s) => (s.id === editingSupplier.id ? updated : s)));
          setIsSupplierOffcanvasOpen(false);
          setEditingSupplier(null);
          if (onShowToast) {
            onShowToast('success', 'Cập nhật thành công', `Đã lưu cập nhật thông tin nhà cung cấp ${payload.name} vào CSDL.`);
          }
        } else {
          throw new Error('Lỗi cập nhật CSDL');
        }
      } else {
        // Chế độ Add: Tạo mới trong CSDL
        const nextIdx = suppliers.length + 1;
        const newCode = `NCC-2026-${String(nextIdx).padStart(3, '0')}`;
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, code: newCode }),
        });
        if (res.ok) {
          const created = await res.json();
          setSuppliers((prev) => [created, ...prev]);
          setIsSupplierOffcanvasOpen(false);
          if (onShowToast) {
            onShowToast('success', 'Thêm mới thành công', `Đã thêm nhà cung cấp ${created.name} vào CSDL.`);
          }
        } else {
          throw new Error('Lỗi thêm mới CSDL');
        }
      }
    } catch (err) {
      console.error('Lỗi lưu nhà cung cấp:', err);
      if (onShowToast) onShowToast('error', 'Lỗi lưu dữ liệu', 'Không thể lưu thông tin vào CSDL.');
    }
  };

  // ==========================================
  // XỬ LÝ ĐƠN VỊ VẬN CHUYỂN (THÊM / SỬA / XOÁ)
  // ==========================================
  const handleOpenAddTransporter = () => {
    setEditingTransporter(null);
    setTransporterForm({
      name: '',
      serviceType: 'Vận tải đường bộ xe tải thùng',
      coordinator: '',
      coordinatorRole: '',
      phone: '',
      hubAddress: '',
      routes: '',
      status: 'active',
    });
    setIsTransporterOffcanvasOpen(true);
  };

  const handleOpenEditTransporter = (item: TransporterItem) => {
    setEditingTransporter(item);
    setTransporterForm({
      name: item.name,
      serviceType: item.serviceType,
      coordinator: item.coordinator,
      coordinatorRole: item.coordinatorRole || '',
      phone: item.phone,
      hubAddress: item.hubAddress,
      routes: item.routes,
      status: item.status,
    });
    setIsTransporterOffcanvasOpen(true);
  };

  const filteredTransporters = useMemo(() => {
    return transporters.filter((item) => {
      if (transporterServiceFilter !== 'all' && item.serviceType !== transporterServiceFilter) {
        return false;
      }
      if (transporterStatusFilter !== 'all' && item.status !== transporterStatusFilter) {
        return false;
      }
      if (transporterSearchQuery.trim()) {
        const q = transporterSearchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCoord = item.coordinator.toLowerCase().includes(q);
        const matchRole = (item.coordinatorRole || '').toLowerCase().includes(q);
        const matchPhone = item.phone.toLowerCase().includes(q);
        const matchHub = item.hubAddress.toLowerCase().includes(q);
        const matchRoute = item.routes.toLowerCase().includes(q);
        if (!matchName && !matchCoord && !matchRole && !matchPhone && !matchHub && !matchRoute) {
          return false;
        }
      }
      return true;
    });
  }, [transporters, transporterServiceFilter, transporterStatusFilter, transporterSearchQuery]);

  const paginatedTransporters = useMemo(() => {
    const start = (transporterCurrentPage - 1) * transporterPageSize;
    return filteredTransporters.slice(start, start + transporterPageSize);
  }, [filteredTransporters, transporterCurrentPage, transporterPageSize]);

  const toggleSelectAllTransporters = () => {
    if (selectedTransporterIds.length === paginatedTransporters.length && paginatedTransporters.length > 0) {
      setSelectedTransporterIds([]);
    } else {
      setSelectedTransporterIds(paginatedTransporters.map((t) => t.id));
    }
  };

  const toggleSelectTransporter = (id: string) => {
    setSelectedTransporterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteTransportersConfirm = async () => {
    try {
      const res = await fetch('/api/transporters/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTransporterIds }),
      });
      if (res.ok) {
        const deletedCount = selectedTransporterIds.length;
        setTransporters((prev) => prev.filter((t) => !selectedTransporterIds.includes(t.id)));
        setSelectedTransporterIds([]);
        setIsDeleteTransporterDialogOpen(false);
        if (onShowToast) {
          onShowToast('success', 'Xoá thành công', `Đã xoá ${deletedCount} đơn vị vận chuyển khỏi CSDL.`);
        }
      } else {
        throw new Error('Xóa không thành công');
      }
    } catch (err) {
      console.error('Lỗi xoá đơn vị vận chuyển:', err);
      if (onShowToast) onShowToast('error', 'Lỗi', 'Không thể xoá đơn vị vận chuyển. Vui lòng thử lại.');
    }
  };

  const handleTransporterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transporterForm.name.trim() || !transporterForm.phone.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên đơn vị vận chuyển và hotline/SĐT điều phối.');
      return;
    }

    const statusMap: Record<CommonStatusType, string> = {
      active: 'Đang hoạt động',
      paused: 'Tạm ngừng',
      stopped: 'Dừng hợp tác',
    };

    const payload = {
      name: transporterForm.name.trim(),
      serviceType: transporterForm.serviceType,
      vehicleFleet: editingTransporter?.vehicleFleet || 'Đội xe vận tải theo hợp đồng',
      coordinator: transporterForm.coordinator.trim() || 'Ban điều vận',
      coordinatorRole: transporterForm.coordinatorRole.trim() || undefined,
      phone: transporterForm.phone.trim(),
      hubAddress: transporterForm.hubAddress.trim() || 'Hà Nội / Hưng Yên',
      routes: transporterForm.routes.trim() || 'Tuyến vận tải dự án',
      status: transporterForm.status,
      statusLabel: statusMap[transporterForm.status] || 'Đang hoạt động',
    };

    try {
      if (editingTransporter) {
        // Chế độ Edit: Cập nhật thông tin vào CSDL
        const res = await fetch(`/api/transporters/${editingTransporter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setTransporters((prev) => prev.map((t) => (t.id === editingTransporter.id ? updated : t)));
          setIsTransporterOffcanvasOpen(false);
          setEditingTransporter(null);
          if (onShowToast) {
            onShowToast('success', 'Cập nhật thành công', `Đã lưu cập nhật đơn vị vận chuyển ${payload.name} vào CSDL.`);
          }
        } else {
          throw new Error('Lỗi cập nhật CSDL');
        }
      } else {
        // Chế độ Add: Tạo mới trong CSDL
        const nextIdx = transporters.length + 1;
        const newCode = `VC-2026-${String(nextIdx).padStart(3, '0')}`;
        const res = await fetch('/api/transporters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, code: newCode }),
        });
        if (res.ok) {
          const created = await res.json();
          setTransporters((prev) => [created, ...prev]);
          setIsTransporterOffcanvasOpen(false);
          if (onShowToast) {
            onShowToast('success', 'Thêm mới thành công', `Đã thêm đơn vị vận chuyển ${created.name} vào CSDL.`);
          }
        } else {
          throw new Error('Lỗi thêm mới CSDL');
        }
      }
    } catch (err) {
      console.error('Lỗi lưu đơn vị vận chuyển:', err);
      if (onShowToast) onShowToast('error', 'Lỗi lưu dữ liệu', 'Không thể lưu thông tin vào CSDL.');
    }
  };

  // Helper Badge trạng thái chuẩn 3 mức: Đang hoạt động, Tạm ngừng, Dừng hợp tác
  const renderStatusBadge = (status: CommonStatusType, label: string) => {
    switch (status) {
      case 'active':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle size={11} />
            {label}
          </span>
        );
      case 'paused':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <ClockHistory size={11} />
            {label}
          </span>
        );
      case 'stopped':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.6875rem',
              fontWeight: 600,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <SlashCircle size={11} />
            {label}
          </span>
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ========================================================= */}
      {/* BƯỚC 1: TAB NHÀ CUNG CẤP                                   */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <>
          {/* Thanh công cụ: Lọc danh mục hàng hoá + Lọc trạng thái + Tìm kiếm + Nút Thêm mới, Xoá */}
          <TableToolbar
            searchValue={supplierSearchQuery}
            onSearchChange={(val) => {
              setSupplierSearchQuery(val);
              setSupplierCurrentPage(1);
            }}
            searchPlaceholder="Tìm kiếm theo tên nhà cung cấp, liên hệ, SĐT, danh mục..."
            searchMinWidth="230px"
            filters={[
              {
                id: 'supplier-category',
                value: supplierCategoryFilter,
                onChange: (val) => {
                  setSupplierCategoryFilter(val);
                  setSupplierCurrentPage(1);
                },
                minWidth: '200px',
                options: [
                  { value: 'all', label: 'Tất cả danh mục hàng hoá' },
                  ...AVAILABLE_CATEGORIES.map((c) => ({ value: c, label: c })),
                ],
              },
              {
                id: 'supplier-status',
                value: supplierStatusFilter,
                onChange: (val) => {
                  setSupplierStatusFilter(val);
                  setSupplierCurrentPage(1);
                },
                minWidth: '160px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'paused', label: 'Tạm ngừng' },
                  { value: 'stopped', label: 'Dừng hợp tác' },
                ],
              },
            ]}
            actionsAfterSearch={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={handleOpenAddSupplier}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Thêm mới
                </Button>

                <div
                  title={
                    selectedSupplierIds.length === 0
                      ? 'Chọn ít nhất một dòng trong bảng để xoá'
                      : `Xoá ${selectedSupplierIds.length} nhà cung cấp đã chọn`
                  }
                >
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={selectedSupplierIds.length === 0}
                    leftIcon={<Trash size={15} />}
                    onClick={() => setIsDeleteSupplierDialogOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Xoá</span>
                    {selectedSupplierIds.length > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '18px',
                          height: '18px',
                          padding: selectedSupplierIds.length >= 10 ? '0 5px' : '0',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          color: '#e11d48',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          lineHeight: 1,
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                        }}
                      >
                        {selectedSupplierIds.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            }
            style={{
              marginBottom: 0,
              padding: '10px 20px',
              flexShrink: 0,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          />

          {/* Bảng danh sách Nhà cung cấp */}
          <div
            className="table-container"
            style={{
              flex: '1 1 0%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              border: 'none',
              borderRadius: 0,
            }}
          >
            <div
              className="table-responsive custom-scrollbar"
              style={{
                flex: '1 1 0%',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'auto',
              }}
            >
              <table className="custom-table">
                <thead>
                  <tr className="text-uppercase" style={{ textTransform: 'uppercase' }}>
                    <th style={{ width: '44px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                      <input
                        type="checkbox"
                        className="decodoor-checkbox"
                        checked={
                          paginatedSuppliers.length > 0 &&
                          selectedSupplierIds.length === paginatedSuppliers.length
                        }
                        onChange={toggleSelectAllSuppliers}
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="text-uppercase" style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '320px', fontSize: '0.71875rem' }}>
                      Tên nhà cung cấp
                    </th>
                    <th className="text-uppercase" style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '320px', fontSize: '0.71875rem' }}>
                      Thông tin liên hệ
                    </th>
                    <th
                      className="text-uppercase"
                      style={{ position: 'sticky', top: 0, zIndex: 10, textAlign: 'center', width: '160px', fontSize: '0.71875rem' }}
                    >
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSuppliers.map((item) => {
                    const isSelected = selectedSupplierIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'is-selected' : ''}
                        onClick={() => handleOpenEditSupplier(item)}
                        style={{ cursor: 'pointer' }}
                        title="Nhấn để xem chi tiết và chỉnh sửa nhà cung cấp"
                      >
                        {/* 1. Checkbox */}
                        <td
                          style={{ textAlign: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="decodoor-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectSupplier(item.id)}
                          />
                        </td>

                        {/* 2. Cột Tên nhà cung cấp (Có 5 sao đánh giá, danh mục nhiều tag) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                                {item.name}
                              </span>
                              {/* Đánh giá 5 sao */}
                              {renderStarRating(item.rating, (stars) => handleRateSupplier(item.id, stars))}
                            </div>

                            {/* Danh mục hàng hoá */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              {item.categories.map((cat, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '0.6875rem',
                                    color: 'var(--text-secondary)',
                                    backgroundColor: 'var(--bg-surface-3)',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  <Tag size={10} />
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* 3. Cột Thông tin liên hệ (Chức vụ phân cách bằng |) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                              <Person size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.salutation ? `${item.salutation} ` : ''}{item.representative}
                              </span>
                              {item.representativeRole && (
                                <>
                                  <span style={{ color: 'var(--border-strong, #94a3b8)', margin: '0 2px' }}>|</span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem', fontWeight: 500 }}>
                                    {item.representativeRole}
                                  </span>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.6875rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                                <Telephone size={10} style={{ color: 'var(--color-primary)' }} />
                                {item.phone}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                                <Envelope size={10} style={{ color: 'var(--text-muted)' }} />
                                {item.email}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              <GeoAlt size={10} style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                                {item.address}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Cột Trạng thái */}
                        <td style={{ textAlign: 'center' }}>
                          {renderStatusBadge(item.status, item.statusLabel)}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedSuppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: 'center',
                          padding: '40px 20px',
                          color: 'var(--text-muted)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {isSuppliersLoading
                          ? 'Đang tải dữ liệu nhà cung cấp từ CSDL...'
                          : 'Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc tìm kiếm.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang cho bảng Nhà cung cấp */}
            <div
              className="pagination-container"
              style={{
                marginTop: 'auto',
                flexShrink: 0,
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-1)',
                padding: 0,
                borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
              }}
            >
              <Pagination
                currentPage={supplierCurrentPage}
                totalItems={filteredSuppliers.length}
                pageSize={supplierPageSize}
                onPageChange={setSupplierCurrentPage}
                onPageSizeChange={(newSize) => {
                  setSupplierPageSize(newSize);
                  setSupplierCurrentPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* BƯỚC 2: TAB ĐƠN VỊ VẬN CHUYỂN                              */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <>
          {/* Thanh công cụ: Loại hình dịch vụ + Trạng thái hoạt động + Hộp tìm kiếm + Nút thêm mới, Xoá */}
          <TableToolbar
            searchValue={transporterSearchQuery}
            onSearchChange={(val) => {
              setTransporterSearchQuery(val);
              setTransporterCurrentPage(1);
            }}
            searchPlaceholder="Tìm kiếm theo tên đơn vị VC, điều phối, bến bãi, tuyến đường..."
            searchMinWidth="230px"
            filters={[
              {
                id: 'transporter-service',
                value: transporterServiceFilter,
                onChange: (val) => {
                  setTransporterServiceFilter(val);
                  setTransporterCurrentPage(1);
                },
                minWidth: '200px',
                options: [
                  { value: 'all', label: 'Tất cả loại hình dịch vụ' },
                  { value: 'Vận tải đường bộ xe tải thùng', label: 'Vận tải đường bộ xe tải thùng' },
                  { value: 'Vận tải container và Rơ-moóc chuyên dụng', label: 'Vận tải container chuyên dụng' },
                  { value: 'Vận tải xe cẩu tự hành hàng cồng kềnh', label: 'Xe cẩu tự hành chở hàng cồng kềnh' },
                  { value: 'Giao hàng hỏa tốc phụ kiện và tài liệu', label: 'Giao hàng hỏa tốc phụ kiện' },
                  { value: 'Vận chuyển nội bộ nhà máy và dự án', label: 'Vận chuyển nội bộ nhà máy' },
                  { value: 'Vận chuyển hàng liên tỉnh theo chuyến', label: 'Vận chuyển liên tỉnh theo chuyến' },
                ],
              },
              {
                id: 'transporter-status',
                value: transporterStatusFilter,
                onChange: (val) => {
                  setTransporterStatusFilter(val);
                  setTransporterCurrentPage(1);
                },
                minWidth: '160px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'paused', label: 'Tạm ngừng' },
                  { value: 'stopped', label: 'Dừng hợp tác' },
                ],
              },
            ]}
            actionsAfterSearch={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={handleOpenAddTransporter}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Thêm mới
                </Button>

                <div
                  title={
                    selectedTransporterIds.length === 0
                      ? 'Chọn ít nhất một dòng trong bảng để xoá'
                      : `Xoá ${selectedTransporterIds.length} đơn vị vận chuyển đã chọn`
                  }
                >
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={selectedTransporterIds.length === 0}
                    leftIcon={<Trash size={15} />}
                    onClick={() => setIsDeleteTransporterDialogOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Xoá</span>
                    {selectedTransporterIds.length > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '18px',
                          height: '18px',
                          padding: selectedTransporterIds.length >= 10 ? '0 5px' : '0',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          color: '#e11d48',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          lineHeight: 1,
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                        }}
                      >
                        {selectedTransporterIds.length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            }
            style={{
              marginBottom: 0,
              padding: '10px 20px',
              flexShrink: 0,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          />

          {/* Bảng danh sách Đơn vị vận chuyển */}
          <div
            className="table-container"
            style={{
              flex: '1 1 0%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              border: 'none',
              borderRadius: 0,
            }}
          >
            <div
              className="table-responsive custom-scrollbar"
              style={{
                flex: '1 1 0%',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'auto',
              }}
            >
              <table className="custom-table">
                <thead>
                  <tr className="text-uppercase" style={{ textTransform: 'uppercase' }}>
                    <th style={{ width: '44px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                      <input
                        type="checkbox"
                        className="decodoor-checkbox"
                        checked={
                          paginatedTransporters.length > 0 &&
                          selectedTransporterIds.length === paginatedTransporters.length
                        }
                        onChange={toggleSelectAllTransporters}
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="text-uppercase" style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '300px', fontSize: '0.71875rem' }}>
                      Tên đơn vị vận chuyển
                    </th>
                    <th className="text-uppercase" style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '240px', fontSize: '0.71875rem' }}>
                      Điều phối
                    </th>
                    <th className="text-uppercase" style={{ position: 'sticky', top: 0, zIndex: 10, minWidth: '320px', fontSize: '0.71875rem' }}>
                      Bến bãi và tuyến đường
                    </th>
                    <th
                      className="text-uppercase"
                      style={{ position: 'sticky', top: 0, zIndex: 10, textAlign: 'center', width: '160px', fontSize: '0.71875rem' }}
                    >
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransporters.map((item) => {
                    const isSelected = selectedTransporterIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'is-selected' : ''}
                        onClick={() => handleOpenEditTransporter(item)}
                        style={{ cursor: 'pointer' }}
                        title="Nhấn để xem chi tiết và chỉnh sửa đơn vị vận chuyển"
                      >
                        {/* 1. Checkbox */}
                        <td
                          style={{ textAlign: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="decodoor-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTransporter(item.id)}
                          />
                        </td>

                        {/* 2. Cột Tên đơn vị vận chuyển (Đã bỏ đánh giá sao và bỏ mã số) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                                {item.name}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.6875rem',
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'var(--bg-surface-3)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                <Truck size={10} />
                                {item.serviceType}
                              </span>
                            </div>
                            {item.vehicleFleet && (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                {item.vehicleFleet}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Cột Điều phối (Chức vụ xuống dưới tên người điều phối) */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                              <Person size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.coordinator}
                              </span>
                            </div>
                            {item.coordinatorRole && (
                              <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {item.coordinatorRole}
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                              <Telephone size={10} style={{ color: 'var(--color-primary)' }} />
                              <span>Hotline: {item.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Cột Bến bãi và tuyến đường */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                              <GeoAlt size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 500 }}>
                                {item.hubAddress}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              <Compass size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              <span>{item.routes}</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Cột Trạng thái */}
                        <td style={{ textAlign: 'center' }}>
                          {renderStatusBadge(item.status, item.statusLabel)}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedTransporters.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: 'center',
                          padding: '40px 20px',
                          color: 'var(--text-muted)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {isTransportersLoading
                          ? 'Đang tải dữ liệu đơn vị vận chuyển từ CSDL...'
                          : 'Không tìm thấy đơn vị vận chuyển nào phù hợp với bộ lọc tìm kiếm.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang cho bảng Đơn vị vận chuyển */}
            <div
              className="pagination-container"
              style={{
                marginTop: 'auto',
                flexShrink: 0,
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-1)',
                padding: 0,
                borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
              }}
            >
              <Pagination
                currentPage={transporterCurrentPage}
                totalItems={filteredTransporters.length}
                pageSize={transporterPageSize}
                onPageChange={setTransporterCurrentPage}
                onPageSizeChange={(newSize) => {
                  setTransporterPageSize(newSize);
                  setTransporterCurrentPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* OFFCANVAS THÊM MỚI / CHỈNH SỬA NHÀ CUNG CẤP                */}
      {/* ========================================================= */}
      <Offcanvas
        isOpen={isSupplierOffcanvasOpen}
        onClose={() => {
          setIsSupplierOffcanvasOpen(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Thông tin chi tiết nhà cung cấp' : 'Thêm mới nhà cung cấp'}
        width="400px"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsSupplierOffcanvasOpen(false);
                setEditingSupplier(null);
              }}
            >
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" form="supplier-form">
              {editingSupplier ? 'Cập nhật' : 'Lưu nhà cung cấp'}
            </Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSupplierFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Tên nhà cung cấp <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="VD: Công ty Cổ phần Gỗ An Cường..."
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              required
            />
          </div>

          {/* Checkbox danh mục hàng hoá (có thể chọn nhiều danh mục) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>
              Danh mục hàng hoá cung cấp <span style={{ color: 'red' }}>*</span>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {AVAILABLE_CATEGORIES.map((cat) => {
                const checked = supplierForm.categories.includes(cat);
                return (
                  <label
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="decodoor-checkbox"
                      checked={checked}
                      onChange={() => toggleSupplierCategory(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Đánh giá chất lượng
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSupplierForm({ ...supplierForm, rating: s })}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: s <= supplierForm.rating ? '#f59e0b' : 'var(--text-muted, #94a3b8)',
                  }}
                >
                  <StarFill size={18} />
                </button>
              ))}
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f59e0b', marginLeft: '6px' }}>
                {supplierForm.rating} sao
              </span>
            </div>
          </div>

          {/* Trạng thái hợp tác và Hạn mức công nợ cùng dòng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Trạng thái hợp tác
              </label>
              <Select
                value={supplierForm.status}
                onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value as CommonStatusType })}
                options={[
                  { value: 'active', label: 'Đang hoạt động' },
                  { value: 'paused', label: 'Tạm ngừng' },
                  { value: 'stopped', label: 'Dừng hợp tác' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Hạn mức công nợ
              </label>
              <Input
                placeholder="VD: 500.000.000 đ"
                value={supplierForm.creditLimit}
                onChange={(e) => setSupplierForm({ ...supplierForm, creditLimit: e.target.value })}
              />
            </div>
          </div>

          {/* Xưng hô và Người đại diện cùng dòng */}
          <div style={{ display: 'grid', gridTemplateColumns: '105px 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Xưng hô
              </label>
              <Select
                value={supplierForm.salutation}
                onChange={(e) => setSupplierForm({ ...supplierForm, salutation: e.target.value })}
                options={[
                  { value: 'Anh', label: 'Anh' },
                  { value: 'Chị', label: 'Chị' },
                  { value: 'Ông', label: 'Ông' },
                  { value: 'Bà', label: 'Bà' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Người đại diện
              </label>
              <Input
                placeholder="VD: Nguyễn Hữu Nam..."
                value={supplierForm.representative}
                onChange={(e) => setSupplierForm({ ...supplierForm, representative: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Chức vụ người đại diện
            </label>
            <Input
              placeholder="VD: Giám đốc kinh doanh dự án..."
              value={supplierForm.representativeRole}
              onChange={(e) => setSupplierForm({ ...supplierForm, representativeRole: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Số điện thoại liên hệ <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="VD: 0988.xxx.xxx..."
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Email liên hệ
            </label>
            <Input
              type="email"
              placeholder="VD: contact@company.vn..."
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Địa chỉ liên hệ
            </label>
            <Input
              placeholder="VD: Cụm CN Tân Uyên, Bình Dương..."
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
            />
          </div>
        </form>
      </Offcanvas>

      {/* ========================================================= */}
      {/* OFFCANVAS THÊM MỚI / CHỈNH SỬA ĐƠN VỊ VẬN CHUYỂN           */}
      {/* ========================================================= */}
      <Offcanvas
        isOpen={isTransporterOffcanvasOpen}
        onClose={() => {
          setIsTransporterOffcanvasOpen(false);
          setEditingTransporter(null);
        }}
        title={editingTransporter ? 'Chi tiết và Cập nhật đơn vị vận chuyển' : 'Thêm mới đơn vị vận chuyển'}
        width="400px"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsTransporterOffcanvasOpen(false);
                setEditingTransporter(null);
              }}
            >
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" form="transporter-form">
              {editingTransporter ? 'Cập nhật' : 'Lưu đơn vị vận chuyển'}
            </Button>
          </>
        }
      >
        <form id="transporter-form" onSubmit={handleTransporterFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Tên đơn vị vận chuyển <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="VD: Công ty TNHH Vận tải LogiFast Miền Bắc..."
              value={transporterForm.name}
              onChange={(e) => setTransporterForm({ ...transporterForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Loại hình dịch vụ
            </label>
            <Select
              value={transporterForm.serviceType}
              onChange={(e) => setTransporterForm({ ...transporterForm, serviceType: e.target.value })}
              options={[
                { value: 'Vận tải đường bộ xe tải thùng', label: 'Vận tải đường bộ xe tải thùng' },
                { value: 'Vận tải container và Rơ-moóc chuyên dụng', label: 'Vận tải container chuyên dụng' },
                { value: 'Vận tải xe cẩu tự hành hàng cồng kềnh', label: 'Xe cẩu tự hành hàng cồng kềnh' },
                { value: 'Giao hàng hỏa tốc phụ kiện và tài liệu', label: 'Giao hàng hỏa tốc phụ kiện' },
                { value: 'Vận chuyển nội bộ nhà máy và dự án', label: 'Vận chuyển nội bộ nhà máy' },
                { value: 'Vận chuyển hàng liên tỉnh theo chuyến', label: 'Vận chuyển liên tỉnh theo chuyến' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Trạng thái hoạt động
            </label>
            <Select
              value={transporterForm.status}
              onChange={(e) => setTransporterForm({ ...transporterForm, status: e.target.value as CommonStatusType })}
              options={[
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'paused', label: 'Tạm ngừng' },
                { value: 'stopped', label: 'Dừng hợp tác' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Số điện thoại liên hệ <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="VD: 0989.xxx.xxx..."
              value={transporterForm.phone}
              onChange={(e) => setTransporterForm({ ...transporterForm, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Người phụ trách điều phối
            </label>
            <Input
              placeholder="VD: Nguyễn Văn Hưng..."
              value={transporterForm.coordinator}
              onChange={(e) => setTransporterForm({ ...transporterForm, coordinator: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Chức vụ điều phối viên
            </label>
            <Input
              placeholder="VD: Tổ trưởng điều vận xe nhà máy..."
              value={transporterForm.coordinatorRole}
              onChange={(e) => setTransporterForm({ ...transporterForm, coordinatorRole: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Điểm tập kết xe
            </label>
            <Input
              placeholder="VD: Bãi xe KCN Phố Nối A, Hưng Yên..."
              value={transporterForm.hubAddress}
              onChange={(e) => setTransporterForm({ ...transporterForm, hubAddress: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Tuyến đường chính
            </label>
            <Input
              placeholder="VD: Hưng Yên ⇄ Hà Nội ⇄ Hải Phòng..."
              value={transporterForm.routes}
              onChange={(e) => setTransporterForm({ ...transporterForm, routes: e.target.value })}
            />
          </div>
        </form>
      </Offcanvas>

      {/* ========================================================= */}
      {/* DIALOG XÁC NHẬN XOÁ                                       */}
      {/* ========================================================= */}
      <ConfirmDialog
        isOpen={isDeleteSupplierDialogOpen}
        onClose={() => setIsDeleteSupplierDialogOpen(false)}
        onConfirm={handleDeleteSuppliersConfirm}
        title="Xác nhận xoá nhà cung cấp"
        message={`Bạn có chắc chắn muốn xoá ${selectedSupplierIds.length} nhà cung cấp đã chọn? Hành động này sẽ loại bỏ đối tác khỏi danh mục theo dõi.`}
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        type="danger"
        itemCount={selectedSupplierIds.length}
      />

      <ConfirmDialog
        isOpen={isDeleteTransporterDialogOpen}
        onClose={() => setIsDeleteTransporterDialogOpen(false)}
        onConfirm={handleDeleteTransportersConfirm}
        title="Xác nhận xoá đơn vị vận chuyển"
        message={`Bạn có chắc chắn muốn xoá ${selectedTransporterIds.length} đơn vị vận chuyển đã chọn? Hành động này sẽ không thể hoàn tác.`}
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        type="danger"
        itemCount={selectedTransporterIds.length}
      />
    </div>
  );
};
