import React, { useState, useEffect, useRef } from 'react';
import {
  CartCheck,
  Cart3,
  Pencil,
  Trash,
  BoxSeam,
  XCircle,
  PauseCircle,
  SlashCircle,
  Printer,
  Building,
  GeoAlt,
  Telephone,
  Envelope,
  Truck,
  Unlock,
  LockFill,
  X,
  PlusLg,
  Check2,
  CalendarCheck,
  CashStack,
  ChevronDown,
  XCircleFill,
  InfoCircleFill,
  ChatDotsFill,
  PeopleFill,
  GearFill,
  FileEarmarkPlusFill,
  TelephoneFill,
  EnvelopeFill,
  PencilSquare,
} from 'react-bootstrap-icons';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import type { PurchaseOrderItem, OrderStatus } from './ProcurementView';

export interface OrderActivity {
  id: string;
  loai: 'call' | 'meeting' | 'message' | 'email' | 'system' | 'update' | 'create';
  ngay: string;
  nguoiThucHien: string;
  ketQua: string;
}

export interface CarrierOption {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
  hanMucNo?: number;
}

const DEFAULT_CARRIERS: CarrierOption[] = [
  {
    id: 'CAR-001',
    code: 'VC-001',
    name: 'Công ty Vận tải và Tiếp vận Á Châu (Asia Logistics)',
    phone: '028 3848 9999',
    address: 'Bãi xe Á Châu, Số 35 Hoàng Minh Giám, Q. Phú Nhuận, TP. HCM',
    hanMucNo: 50000000,
  },
  {
    id: 'CAR-002',
    code: 'VC-002',
    name: 'Công ty TNHH Vận tải Bắc Nam Express',
    phone: '024 3768 1122',
    address: 'Bãi xe Ga Giáp Bát, Đường Giải Phóng, Q. Hoàng Mai, Hà Nội',
    hanMucNo: 30000000,
  },
  {
    id: 'CAR-003',
    code: 'VC-003',
    name: 'Đội xe giao hàng nội địa Hải Phòng Log',
    phone: '0225 382 7788',
    address: 'Kho vận KCN Đình Vũ, Hải An, Hải Phòng',
    hanMucNo: 20000000,
  },
  {
    id: 'CAR-004',
    code: 'VC-004',
    name: 'Hợp tác xã Vận tải Hàng hóa Thành Công',
    phone: '024 3834 5678',
    address: 'Bến xe Mỹ Đình, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội',
    hanMucNo: 0,
  },
];

const SUPPLIER_CONTACT_INFO: Record<string, { address: string; phone: string; email: string }> = {
  'Công ty Cổ phần Gỗ An Cường': {
    address: 'Số 702/1G Đường DT 743, KP. Đông Chiêu, P. Tân Đông Hiệp, Dĩ An, Bình Dương',
    phone: '028 3862 5726',
    email: 'info@ancuong.com',
  },
  'Công ty TNHH Hafele Việt Nam': {
    address: 'Tầng 3 Tòa nhà REE Tower, Số 9 Đoàn Văn Bơ, Phường 12, Quận 4, TP. Hồ Chí Minh',
    phone: '1800 1797',
    email: 'support@hafele.com.vn',
  },
  'Tập đoàn Hóa chất và Sơn Inchem Toa': {
    address: 'Lô B2 Đường số 5, KCN Tân Bình, Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh',
    phone: '028 3816 3333',
    email: 'contact@toagroup.com.vn',
  },
  'Công ty CP Vật liệu Chống cháy IBST Tech': {
    address: 'Khu công nghiệp Khai Sơn, Xã Thanh Khương, Huyện Thuận Thành, Bắc Ninh',
    phone: '024 3858 2450',
    email: 'kinhdoanh@ibsttech.vn',
  },
  'Công ty Kính Nổi Viglacera (VFG)': {
    address: 'Khu công nghiệp Yên Phong, Xã Yên Trung, Huyện Yên Phong, Bắc Ninh',
    phone: '024 3553 6666',
    email: 'sales@viglacera.com.vn',
  },
  'Công ty Phụ kiện Ngũ kim KinLong': {
    address: 'Tầng 3 Tòa nhà Grandeur Palace, 138B Giảng Võ, Ba Đình, Hà Nội',
    phone: '024 3785 8688',
    email: 'vietnam@kinlong.com',
  },
  'Công ty TNHH Keo dán Henkel Titebond': {
    address: 'Đường 10, KCN Biên Hòa 2, Phường An Bình, TP. Biên Hòa, Đồng Nai',
    phone: '028 3930 1122',
    email: 'cskh@henkel-titebond.vn',
  },
  'Công ty TNHH Sơn Jotun Việt Nam': {
    address: 'Số 1 Đường 10, KCN Sóng Thần 1, Dĩ An, Bình Dương',
    phone: '028 3742 2828',
    email: 'vietnam@jotun.com',
  },
  'Công ty CP Cơ khí và Dụng cụ Makita Việt Nam': {
    address: 'Kho 6, Đường số 3, KCN Tân Đông Hiệp B, Dĩ An, Bình Dương',
    phone: '028 3620 5777',
    email: 'cs@makita.com.vn',
  },
};

const ACT_TYPES = [
  { key: 'call', label: 'Gọi điện', icon: TelephoneFill, color: '#10b981' },
  { key: 'meeting', label: 'Gặp mặt', icon: PeopleFill, color: '#6366f1' },
  { key: 'email', label: 'Gửi email', icon: EnvelopeFill, color: '#f59e0b' },
  { key: 'message', label: 'Nhắn tin', icon: ChatDotsFill, color: '#3b82f6' },
  { key: 'system', label: 'Hệ thống', icon: GearFill, color: '#6b7280' },
  { key: 'create', label: 'Khởi tạo', icon: FileEarmarkPlusFill, color: '#10b981' },
  { key: 'update', label: 'Cập nhật', icon: PencilSquare, color: '#f59e0b' },
];

const MANUAL_ACT_TYPES = [
  { key: 'call', label: 'Gọi điện', icon: TelephoneFill, color: '#10b981' },
  { key: 'meeting', label: 'Gặp mặt', icon: PeopleFill, color: '#6366f1' },
  { key: 'message', label: 'Nhắn tin', icon: ChatDotsFill, color: '#3b82f6' },
  { key: 'email', label: 'Gửi email', icon: EnvelopeFill, color: '#f59e0b' },
];

export interface OrderDetailOffcanvasProps {
  isOpen: boolean;
  order: PurchaseOrderItem | null;
  onClose: () => void;
  onUpdateOrder?: (updatedOrder: PurchaseOrderItem) => void;
  onDeleteOrder?: (orderId: string) => void;
  onPrintOrder?: (order: PurchaseOrderItem) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const OrderDetailOffcanvas: React.FC<OrderDetailOffcanvasProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onPrintOrder,
  onShowToast,
}) => {
  // Local state for order editing
  const [isEditing, setIsEditing] = useState(false);
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  // Shipping state
  const [carrierList] = useState<CarrierOption[]>(DEFAULT_CARRIERS);
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [carrierSearch, setCarrierSearch] = useState<string>('');
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [shippingDepot, setShippingDepot] = useState<string>('');
  const [carrierDebt, setCarrierDebt] = useState<number>(0);
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const carrierDropdownRef = useRef<HTMLDivElement>(null);

  // Activities state
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [actType, setActType] = useState('call');
  const [actDate, setActDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [actPerson, setActPerson] = useState('Bộ phận Mua sắm');
  const [actNote, setActNote] = useState('');

  // Confirm delete dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Reset or load initial data when order changes
  useEffect(() => {
    if (order) {
      setEditDeliveryDate(order.deliveryDate || '');
      setEditTotalAmount(order.totalAmount || '');
      setEditNote(order.note || '');
      setIsEditing(false);

      // Default carrier sample if any
      const defCarrier = DEFAULT_CARRIERS[0];
      setCarrierId(defCarrier.id);
      setCarrierSearch(defCarrier.name);
      setShippingDepot(defCarrier.address || 'Kho nhận hàng Decodoor');
      setShippingFee(2500000);
      setCarrierDebt(defCarrier.hanMucNo || 0);

      // Sample activity logs for realism
      setActivities([
        {
          id: `act-${Date.now()}-1`,
          loai: 'call',
          ngay: new Date(Date.now() - 3600000 * 4).toISOString(),
          nguoiThucHien: order.requester || 'Bộ phận Mua sắm',
          ketQua: `Đã liên hệ với đại diện kinh doanh của ${order.supplierName}, xác nhận đơn giá và lịch dự kiến giao hàng ngày ${order.deliveryDate}.`,
        },
        {
          id: `act-${Date.now()}-2`,
          loai: 'message',
          ngay: new Date(Date.now() - 3600000 * 24).toISOString(),
          nguoiThucHien: 'Hệ thống',
          ketQua: `Gửi thông báo tiến độ đơn hàng ${order.code} tới phòng vật tư và kế toán.`,
        },
      ]);
    }
  }, [order]);

  // Click outside to close carrier dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (carrierDropdownRef.current && !carrierDropdownRef.current.contains(e.target as Node)) {
        setShowCarrierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showActivityModal && !confirmDeleteOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, showActivityModal, confirmDeleteOpen, onClose]);

  if (!isOpen || !order) return null;

  const supplierContact = SUPPLIER_CONTACT_INFO[order.supplierName] || {
    address: 'Khu công nghiệp Quang Minh, Mê Linh, Hà Nội',
    phone: '024 3886 5555',
    email: 'sales@decodoor-supplier.vn',
  };

  const isOrderPlaced = ['shipping', 'partial', 'inspecting'].includes(order.status);

  // Status mapping and styling
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'waiting_delivery':
        return { label: 'Chờ giao hàng', color: '#b45309', bg: '#fef3c7' };
      case 'shipping':
        return { label: 'Đang vận chuyển', color: '#0369a1', bg: '#e0f2fe' };
      case 'partial':
        return { label: 'Đã giao một phần', color: '#6d28d9', bg: '#ede9fe' };
      case 'inspecting':
        return { label: 'Đang kiểm tra', color: '#0f766e', bg: '#ccfbf1' };
      default:
        return { label: order.statusLabel || status, color: '#475569', bg: '#f1f5f9' };
    }
  };

  const statusBadge = getStatusBadge(order.status);

  // Status change handlers
  const handleUpdateStatus = (newStatus: OrderStatus, label: string) => {
    const updated: PurchaseOrderItem = {
      ...order,
      status: newStatus,
      statusLabel: label,
    };
    if (onUpdateOrder) onUpdateOrder(updated);

    // Add activity log
    const newAct: OrderActivity = {
      id: `act-${Date.now()}`,
      loai: 'update',
      ngay: new Date().toISOString(),
      nguoiThucHien: 'Bộ phận Mua sắm',
      ketQua: `Trạng thái đơn hàng thay đổi thành [${label}].`,
    };
    setActivities((prev) => [newAct, ...prev]);

    if (onShowToast) {
      onShowToast('success', 'Cập nhật trạng thái', `Đơn hàng ${order.code} chuyển sang "${label}".`);
    }
  };

  // Save manual activity
  const handleSaveActivity = () => {
    if (!actNote.trim()) {
      alert('Vui lòng nhập nội dung hoạt động!');
      return;
    }
    const newAct: OrderActivity = {
      id: `act-${Date.now()}`,
      loai: actType as any,
      ngay: new Date().toISOString(),
      nguoiThucHien: actPerson.trim() || 'Người thực hiện',
      ketQua: actNote.trim(),
    };
    setActivities((prev) => [newAct, ...prev]);
    setActNote('');
    setShowActivityModal(false);
    if (onShowToast) {
      onShowToast('success', 'Ghi nhận thành công', 'Đã lưu hoạt động mới vào lịch sử đơn hàng.');
    }
  };

  // Save edit order
  const handleSaveEdit = () => {
    const updated: PurchaseOrderItem = {
      ...order,
      deliveryDate: editDeliveryDate.trim() || order.deliveryDate,
      totalAmount: editTotalAmount.trim() || order.totalAmount,
      note: editNote.trim(),
    };
    if (onUpdateOrder) onUpdateOrder(updated);
    setIsEditing(false);

    const newAct: OrderActivity = {
      id: `act-${Date.now()}`,
      loai: 'update',
      ngay: new Date().toISOString(),
      nguoiThucHien: 'Bộ phận Mua sắm',
      ketQua: `Cập nhật thông tin đơn hàng: Ngày nhận hàng: ${editDeliveryDate}; Ghi chú: ${editNote}.`,
    };
    setActivities((prev) => [newAct, ...prev]);

    if (onShowToast) {
      onShowToast('success', 'Cập nhật thành công', `Đã lưu thay đổi cho đơn hàng ${order.code}.`);
    }
  };

  const filteredCarriers = carrierList.filter((c) => {
    if (!carrierSearch.trim()) return true;
    const s = carrierSearch.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || (c.phone && c.phone.includes(s));
  });

  const selType = ACT_TYPES.find((t) => t.key === actType) ?? ACT_TYPES[0];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1400,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: "400px",
          maxWidth: '100vw',
          zIndex: 1401,
          backgroundColor: '#ffffff',
          borderLeft: '1px solid var(--border-default, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CartCheck size={18} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    fontFamily: "'Roboto Condensed', monospace",
                    color: '#1d4ed8',
                  }}
                >
                  {order.code}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.65625rem',
                    fontWeight: 700,
                    color: statusBadge.color,
                    backgroundColor: statusBadge.bg,
                  }}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                Chi tiết đơn mua hàng
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: 7,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                flexShrink: 0,
              }}
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sub-header info bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: '0.75rem',
              border: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CalendarCheck size={13} style={{ color: '#64748b' }} />
              <span style={{ color: '#64748b' }}>Giao:</span>
              <strong style={{ color: '#0f172a' }}>{order.deliveryDate || '—'}</strong>
            </div>
            <div style={{ width: 1, height: 14, backgroundColor: '#cbd5e1' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CashStack size={13} style={{ color: '#64748b' }} />
              <span style={{ color: '#64748b' }}>Giá trị:</span>
              <strong style={{ color: '#1d4ed8', fontFamily: "'Roboto Condensed', sans-serif" }}>
                {order.totalAmount || '0 đ'}
              </strong>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTAINER */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px 8px' }}>
            {/* ACTION BUTTONS PANEL */}
            <div style={{ marginBottom: '16px' }}>
              {/* Row 1: Sửa, Xoá, Đặt hàng, Nhận hàng */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '62px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: isEditing ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    color: isEditing ? '#2563eb' : '#334155',
                  }}
                  title="Chỉnh sửa đơn hàng"
                >
                  <Pencil size={15} style={{ color: isEditing ? '#2563eb' : '#64748b' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>{isEditing ? 'Đang sửa' : 'Sửa'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '62px',
                    borderRadius: '10px',
                    border: '1px solid #fee2e2',
                    backgroundColor: '#fff5f5',
                    cursor: 'pointer',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    color: '#ef4444',
                  }}
                  title="Xoá đơn hàng"
                >
                  <Trash size={15} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>Xoá</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('shipping', 'Đang vận chuyển')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '62px',
                    borderRadius: '10px',
                    border: '1px solid #e0e7ff',
                    backgroundColor: '#f5f3ff',
                    cursor: 'pointer',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    color: '#6366f1',
                  }}
                  title="Chuyển trạng thái sang Đã đặt hàng / Vận chuyển"
                >
                  <Cart3 size={15} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>Đặt hàng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('inspecting', 'Đang kiểm tra')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '62px',
                    borderRadius: '10px',
                    border: '1px solid #bae6fd',
                    backgroundColor: '#f0f9ff',
                    cursor: 'pointer',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    color: '#0284c7',
                  }}
                  title="Xác nhận nhận hàng và kiểm tra"
                >
                  <BoxSeam size={15} style={{ color: '#0284c7' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700 }}>Nhận hàng</span>
                </button>
              </div>

              {/* Row 2: Khiếu nại, Tạm dừng, Huỷ bỏ, In đơn */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('waiting_delivery', 'Khiếu nại')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #fecdd3',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#f43f5e',
                  }}
                  title="Ghi nhận khiếu nại"
                >
                  <XCircle size={12} />
                  <span>Khiếu nại</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('waiting_delivery', 'Tạm dừng')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #fef3c7',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#d97706',
                  }}
                  title="Tạm dừng đơn hàng"
                >
                  <PauseCircle size={12} />
                  <span>Tạm dừng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('waiting_delivery', 'Huỷ bỏ')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#64748b',
                  }}
                  title="Huỷ bỏ đơn hàng"
                >
                  <SlashCircle size={12} />
                  <span>Huỷ bỏ</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintOrder && onPrintOrder(order)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#1d4ed8',
                  }}
                  title="In đơn đặt hàng (PO)"
                >
                  <Printer size={12} />
                  <span>In đơn</span>
                </button>
              </div>
            </div>

            {/* INLINE EDIT FORM WHEN "SỬA" IS ACTIVE */}
            {isEditing && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                    Chỉnh sửa thông tin đơn hàng
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>
                      Ngày nhận hàng
                    </label>
                    <input
                      type="text"
                      value={editDeliveryDate}
                      onChange={(e) => setEditDeliveryDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>
                      Tổng giá trị
                    </label>
                    <input
                      type="text"
                      value={editTotalAmount}
                      onChange={(e) => setEditTotalAmount(e.target.value)}
                      placeholder="VD: 150.000.000 đ"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '3px' }}>
                    Ghi chú / Điều khoản
                  </label>
                  <textarea
                    rows={2}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Ghi chú điều khoản giao nhận..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    style={{
                      padding: '4px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* SUPPLIER INFORMATION */}
            <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Building size={13} style={{ color: '#2563eb' }} />
                <span
                  style={{
                    fontSize: '0.65625rem',
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Nhà cung cấp
                </span>
              </div>
              <p style={{ margin: '2px 0 4px', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                {order.supplierName}
              </p>

              {supplierContact.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  <GeoAlt size={12} style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ lineHeight: '1.35' }}>{supplierContact.address}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                {supplierContact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Telephone size={11} style={{ color: '#2563eb' }} />
                    <span>{supplierContact.phone}</span>
                  </div>
                )}
                {supplierContact.phone && supplierContact.email && <span style={{ color: '#cbd5e1' }}>|</span>}
                {supplierContact.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Envelope size={11} style={{ color: '#2563eb' }} />
                    <span>{supplierContact.email}</span>
                  </div>
                )}
              </div>

              {order.note && (
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 600 }}>Ghi chú nội bộ</span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {order.note}
                  </p>
                </div>
              )}
            </div>

            {/* CARRIER / ĐƠN VỊ VẬN CHUYỂN SECTION */}
            <div
              style={{
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={13} style={{ color: '#2563eb' }} />
                  <span
                    style={{
                      fontSize: '0.65625rem',
                      color: '#64748b',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    Đơn vị vận chuyển
                  </span>
                </div>
                {isOrderPlaced ? (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '1px 7px',
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Unlock size={9} />
                    Mở khoá
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(100, 116, 139, 0.1)',
                      color: '#64748b',
                      border: '1px solid rgba(100, 116, 139, 0.25)',
                      padding: '1px 7px',
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <LockFill size={9} />
                    Đã khoá
                  </span>
                )}
              </div>

              {/* 1. Tên đơn vị vận chuyển */}
              <div ref={carrierDropdownRef} style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Tên đơn vị vận chuyển
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Chọn hoặc tìm đơn vị vận chuyển..."
                    value={carrierSearch}
                    onChange={(e) => {
                      setCarrierSearch(e.target.value);
                      if (!showCarrierDropdown) setShowCarrierDropdown(true);
                    }}
                    onFocus={() => setShowCarrierDropdown(true)}
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 9px',
                      borderRadius: 7,
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {carrierId && (
                      <button
                        type="button"
                        onClick={() => {
                          setCarrierId(null);
                          setCarrierSearch('');
                          setCarrierDebt(0);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                        }}
                        title="Bỏ chọn đơn vị"
                      >
                        <XCircleFill size={12} />
                      </button>
                    )}
                    <ChevronDown size={9} style={{ color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Dropdown options */}
                {showCarrierDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      maxHeight: 200,
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      zIndex: 1050,
                    }}
                  >
                    {filteredCarriers.length === 0 ? (
                      <div style={{ padding: '10px', color: '#64748b', textAlign: 'center', fontSize: '0.75rem' }}>
                        Không tìm thấy đơn vị vận chuyển phù hợp
                      </div>
                    ) : (
                      filteredCarriers.map((c) => {
                        const isSelected = c.id === carrierId;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCarrierId(c.id);
                              setCarrierSearch(c.name);
                              setShippingDepot(c.address || '');
                              setCarrierDebt(c.hanMucNo ?? 0);
                              setShowCarrierDropdown(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                              borderBottom: '1px solid #f1f5f9',
                              fontSize: '0.75rem',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontWeight: 600, color: isSelected ? '#2563eb' : '#0f172a' }}>
                                {c.name}
                              </span>
                              {c.address && (
                                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                  <GeoAlt size={9} style={{ color: '#ef4444', marginRight: 3 }} />
                                  {c.address}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 2. Bến bãi */}
              <div>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Bến bãi
                </label>
                <input
                  type="text"
                  placeholder="Tự động lấy theo ĐVVC hoặc nhập..."
                  value={shippingDepot}
                  onChange={(e) => setShippingDepot(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 3. Chi phí vận chuyển và Công nợ hiện tại */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Chi phí vận chuyển
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={shippingFee ? shippingFee.toLocaleString('vi-VN') : '0'}
                      onChange={(e) => {
                        const num = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0;
                        setShippingFee(num);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 28px 6px 8px',
                        borderRadius: 7,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textAlign: 'right',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ position: 'absolute', right: 8, fontSize: '0.6875rem', color: '#64748b', pointerEvents: 'none' }}>
                      đ
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Công nợ hiện tại
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={carrierDebt ? carrierDebt.toLocaleString('vi-VN') : '0'}
                      onChange={(e) => {
                        const num = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0;
                        setCarrierDebt(num);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 28px 6px 8px',
                        borderRadius: 7,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textAlign: 'right',
                        color: carrierDebt > 0 ? '#dc2626' : '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ position: 'absolute', right: 8, fontSize: '0.6875rem', color: '#64748b', pointerEvents: 'none' }}>
                      đ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TIMELINE / LỊCH SỬ ĐƠN HÀNG */}
            <div style={{ paddingBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Lịch sử đơn hàng
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActType('call');
                    setActDate(new Date().toISOString().slice(0, 10));
                    setActPerson('Bộ phận Mua sắm');
                    setActNote('');
                    setShowActivityModal(true);
                  }}
                  style={{
                    height: 26,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '0 8px',
                    color: '#1e293b',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                  }}
                >
                  <PlusLg size={10} />
                  <span>Hoạt động</span>
                </button>
              </div>

              {/* Timeline container */}
              <div style={{ position: 'relative', paddingLeft: 34 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 6,
                    bottom: 6,
                    width: 2,
                    background: 'linear-gradient(to bottom, #cbd5e1, rgba(226, 232, 240, 0))',
                    borderRadius: 4,
                  }}
                />

                {/* Activity list */}
                {activities.map((act) => {
                  const t = ACT_TYPES.find((x) => x.key === act.loai) ?? ACT_TYPES[0];
                  const IconComp = t.icon;
                  return (
                    <div key={act.id} style={{ position: 'relative', marginBottom: 12 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: -27,
                          top: 2,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 0 1px #cbd5e1',
                        }}
                      >
                        <IconComp size={10} style={{ color: t.color }} />
                      </div>
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: 10,
                          padding: '8px 12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: t.color,
                              padding: '1px 6px',
                              backgroundColor: `color-mix(in srgb, ${t.color} 10%, transparent)`,
                              borderRadius: 4,
                            }}
                          >
                            {t.label}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            •{' '}
                            {new Date(act.ngay).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          style={{
                            margin: '0 0 5px',
                            fontSize: '0.75rem',
                            color: '#1e293b',
                            whiteSpace: 'pre-line',
                            lineHeight: 1.4,
                          }}
                        >
                          {act.ketQua}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: '#e0e7ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.5625rem',
                              fontWeight: 800,
                              color: '#3730a3',
                            }}
                          >
                            {act.nguoiThucHien.trim().split(' ').pop()?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            {act.nguoiThucHien} thực hiện
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Initial Node */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -27,
                      top: 2,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 0 1px #cbd5e1',
                    }}
                  >
                    <FileEarmarkPlusFill size={10} style={{ color: '#10b981' }} />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: '#10b981',
                          padding: '1px 6px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: 4,
                        }}
                      >
                        Khởi tạo
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                        • {order.orderDate}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#334155' }}>
                      Đơn mua hàng <strong>{order.code}</strong> đã được khởi tạo thành công.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.5625rem',
                          fontWeight: 800,
                          color: '#475569',
                        }}
                      >
                        H
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Hệ thống thực hiện</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-default, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <InfoCircleFill size={13} style={{ color: '#64748b', flexShrink: 0 }} />
          <span style={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic' }}>
            Đơn mua hàng quản lý bởi quy trình kế toán - kho Decodoor.
          </span>
        </div>
      </div>

      {/* MODAL GHI NHẬN HOẠT ĐỘNG */}
      {showActivityModal && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1500,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setShowActivityModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1501,
              width: "400px",
              maxWidth: '90vw',
              backgroundColor: '#ffffff',
              borderRadius: 14,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Header modal */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: `color-mix(in srgb, ${selType.color} 12%, transparent)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <selType.icon size={14} style={{ color: selType.color }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  Ghi nhận hoạt động
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body modal */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Loại hoạt động
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {MANUAL_ACT_TYPES.map((t) => {
                    const IconC = t.icon;
                    const isActive = actType === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActType(t.key)}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: 8,
                          border: `1.5px solid ${isActive ? t.color : '#e2e8f0'}`,
                          backgroundColor: isActive ? `color-mix(in srgb, ${t.color} 10%, transparent)` : '#f8fafc',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3,
                          transition: 'all 0.15s',
                        }}
                      >
                        <IconC size={14} style={{ color: isActive ? t.color : '#64748b' }} />
                        <span style={{ fontSize: '0.65625rem', fontWeight: 700, color: isActive ? t.color : '#64748b' }}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    Ngày ghi nhận
                  </label>
                  <input
                    type="date"
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    Người thực hiện
                  </label>
                  <input
                    value={actPerson}
                    onChange={(e) => setActPerson(e.target.value)}
                    placeholder="Tên người thực hiện..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  Nội dung hoạt động
                </label>
                <textarea
                  value={actNote}
                  onChange={(e) => setActNote(e.target.value)}
                  placeholder="Mô tả nội dung, phản hồi của nhà cung cấp hoặc tiến độ..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.75rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Footer modal */}
            <div
              style={{
                padding: '10px 18px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleSaveActivity}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: selType.color,
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Check2 size={13} />
                Lưu hoạt động
              </button>
            </div>
          </div>
        </>
      )}

      {/* CONFIRM DIALOG XOÁ ĐƠN HÀNG */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Xoá đơn mua hàng"
        message={
          <>
            Bạn có chắc chắn muốn xoá đơn hàng <strong>{order.code}</strong>?<br />
            Thao tác này sẽ xoá đơn hàng khỏi hệ thống và không thể hoàn tác.
          </>
        }
        confirmText="Xoá đơn"
        cancelText="Huỷ"
        type="danger"
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          if (onDeleteOrder) onDeleteOrder(order.id);
          onClose();
        }}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
};
