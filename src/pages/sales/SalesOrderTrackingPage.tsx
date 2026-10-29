import React, { useState, useEffect, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DepartmentActionMenu } from '../../components/common/DepartmentActionMenu';
import { EventOffcanvas } from '../../components/common/EventOffcanvas';
import { Offcanvas } from '../../components/common/Offcanvas';
import { TaoDonHangModal } from '../../components/plan-finance/bao_gia/TaoDonHangModal';
import { getCustomerGroupInfo } from '../../utils/customerGroupUtils';
import type { ModernStepItem } from '../../types';
import type { TickerItem } from '../../components/layout/DynamicTicker';
import {
  Shop,
  Search,
  Plus,
  Trash,
  Camera,
  Printer,
  CalendarEvent,
  ExclamationTriangle,
  ArrowRight,
  XLg,
  Sliders,
  CloudUpload,
  ArrowRepeat,
  Upload,
} from 'react-bootstrap-icons';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Quotation {
  id: string;
  code: string | null;
  customerId: string | null;
  customer?: {
    id: string;
    code?: string;
    name: string;
    dienThoai?: string;
    email?: string;
    address?: string;
    nhom?: string;
  } | null;
  ngayBaoGia?: string;
  ngayHetHan?: string;
  trangThai: string;
  uuTien: string;
  tongTien: number;
  discount: number;
  vat: number;
  chiPhiThiCong: number;
  thanhTien: number;
  ghiChu?: string;
  createdAt: string;
}

interface SaleOrder {
  id: string;
  code: string;
  customerId: string | null;
  customer?: {
    id: string;
    code?: string;
    name: string;
    dienThoai?: string;
    address?: string;
    nhom?: string;
  } | null;
  ngayDat?: string;
  ngayGiao?: string;
  tongTien: number;
  daThanhToan: number;
  trangThai: string;
  keToanDuyet?: string;
  trangThaiKho?: string;
  ghiChu?: string;
  nguoiPhuTrach?: string;
  createdAt: string;
  saleOrderItems?: any[];
}

interface OmnichannelOrder {
  id: string;
  externalId: string;
  channel: string;
  customer: string;
  phone?: string;
  address: string;
  productSummary: string;
  amount: number;
  trackingCode?: string;
  carrier?: string;
  status: string;
  createdAt: string;
  shippingDate?: string;
}

interface DefectReturn {
  id: string;
  code: string;
  source: string; // RETURN, WARRANTY, INTERNAL
  status: string;
  productName: string;
  productCode: string;
  quantity: number;
  description: string;
  customerName?: string | null;
  customerId?: string | null;
  orderNumber?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  repairPlan?: string | null;
  reporterName?: string;
  reporterDepartment?: string;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  code: string;
  name: string;
  dienThoai?: string;
  address?: string;
  nhom?: string;
  loai?: string;
}

// ── Stepper definition (Step 2 active by default as in client-seajong) ──────────
const STEP_ITEMS: ModernStepItem[] = [
  {
    num: 1,
    id: 'QUOTATION',
    title: 'Báo giá',
    desc: 'Lập & quản lý báo giá',
    icon: 'bi-file-text',
  },
  {
    num: 2,
    id: 'ORDER',
    title: 'Đơn hàng',
    desc: 'Xử lý đơn hàng bán lẻ',
    icon: 'bi-cart3',
  },
  {
    num: 3,
    id: 'OMNICHANNEL',
    title: 'Bán hàng đa kênh',
    desc: 'Gom đơn từ các kênh bán hàng',
    icon: 'bi-shop',
  },
  {
    num: 4,
    id: 'RETURN',
    title: 'Hàng trả về',
    desc: 'Xử lý hàng trả về & bảo hành',
    icon: 'bi-arrow-return-left',
  },
];

// ── Status Badge Component ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string; border: string }> = {
    // Quotation & Order statuses
    draft: { label: 'Bản nháp', bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
    pending: { label: 'Chờ duyệt', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    pending_approval: { label: 'Đang trình duyệt', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    approved: { label: 'Đã phê duyệt', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    rejected: { label: 'Từ chối', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    sent: { label: 'Đang thương thảo', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    won: { label: 'Thành công', bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' },
    success: { label: 'Thành công', bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' },
    lost: { label: 'Thất bại', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    failed: { label: 'Thất bại', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    paused: { label: 'Tạm dừng', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    cancelled: { label: 'Huỷ bỏ', bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
    canceled: { label: 'Huỷ bỏ', bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
    active: { label: 'Đang thực hiện', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    processing: { label: 'Đang thực hiện', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    done: { label: 'Hoàn thành', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    completed: { label: 'Hoàn tất', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    in_production: { label: 'Đang sản xuất', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    delivering: { label: 'Đang giao hàng', bg: '#eff6ff', text: '#0284c7', border: '#bae6fd' },
    delivered: { label: 'Đã giao hàng', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },

    // Return & Defect statuses
    NEW: { label: 'Chưa xử lý', bg: '#2563eb', text: '#ffffff', border: '#2563eb' },
    TECH_EVALUATING: { label: 'Đang chẩn đoán', bg: '#0284c7', text: '#ffffff', border: '#0284c7' },
    WAITING_APPROVAL: { label: 'Chờ duyệt', bg: '#f59e0b', text: '#0f172a', border: '#f59e0b' },
    PROCESSING: { label: 'Đang xử lý', bg: '#64748b', text: '#ffffff', border: '#64748b' },
    WAITING_INVENTORY: { label: 'Đang thực hiện', bg: '#64748b', text: '#ffffff', border: '#64748b' },
    WAITING_QC: { label: 'Chờ QC kiểm tra', bg: '#f0f9ff', text: '#0369a1', border: '#0ea5e9' },
    WAITING_RETURN: { label: 'Chờ thu hồi', bg: '#fffbeb', text: '#92400e', border: '#f59e0b' },
    SHIPPING_REPLACEMENT: { label: 'Đang giao đổi', bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6' },
    RESOLVED_REMOTE: { label: 'Đã HD từ xa', bg: '#ecfdf5', text: '#047857', border: '#10b981' },
    COMPLETED: { label: 'Đã xử lý', bg: '#10b981', text: '#ffffff', border: '#10b981' },
    CANCELED: { label: 'Đã huỷ', bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },

    // Omnichannel Vietnamese values
    'Chờ xác nhận': { label: 'Chờ xác nhận', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    'Đã xác nhận': { label: 'Đã xác nhận', bg: '#eff6ff', text: '#0284c7', border: '#bae6fd' },
    'Đã chuyển': { label: 'Đã chuyển', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    'Từ chối': { label: 'Từ chối', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    'Huỷ bỏ': { label: 'Huỷ bỏ', bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
    'Đang giao hàng': { label: 'Đang giao hàng', bg: '#eff6ff', text: '#0284c7', border: '#bae6fd' },
    'Hoàn tất': { label: 'Hoàn tất', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  };

  const safe = status || 'draft';
  const conf = map[safe] || {
    label: safe.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
  };

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
      }}
    >
      {conf.label}
    </span>
  );
}

// ── Main Sales Order Tracking Component (Chuyển từ trang Tổng quan hiện có) ─────
export const SalesOrderTrackingPage: React.FC = () => {
  // Step 2 is active by default in client-seajong
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState<boolean>(false);

  // ── Step 1: Quotations State ──
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [quotationLoading, setQuotationLoading] = useState<boolean>(true);
  const [quotationSearch, setQuotationSearch] = useState<string>('');
  const [quotationStatusFilter, setQuotationStatusFilter] = useState<string>('');
  const [quotationTimeFilter, setQuotationTimeFilter] = useState<string>('');
  const [quotationPage, setQuotationPage] = useState<number>(1);
  const [quotationPageSize, setQuotationPageSize] = useState<number>(10);
  const [quotationTotal, setQuotationTotal] = useState<number>(0);
  const [selectedQuotationIds, setSelectedQuotationIds] = useState<Set<string>>(new Set());
  const [quotationMatchingCustomers, setQuotationMatchingCustomers] = useState<CustomerOption[]>([]);
  const [, setSelectedQuotation] = useState<Quotation | null>(null);

  // ── Step 2: Orders State ──
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [orderLoading, setOrderLoading] = useState<boolean>(true);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [orderTimeFilter, setOrderTimeFilter] = useState<string>('');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [orderMatchingCustomers, setOrderMatchingCustomers] = useState<CustomerOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);

  // ── Step 3: Omnichannel State ──
  const [omnichannelOrders, setOmnichannelOrders] = useState<OmnichannelOrder[]>([]);
  const [omnichannelLoading, setOmnichannelLoading] = useState<boolean>(false);
  const [omnichannelChannelFilter, setOmnichannelChannelFilter] = useState<string>('all');
  const [omnichannelStatusFilter, setOmnichannelStatusFilter] = useState<string>('all');
  const [omnichannelSearch, setOmnichannelSearch] = useState<string>('');
  const [omnichannelPage, setOmnichannelPage] = useState<number>(1);
  const [omnichannelPageSize, setOmnichannelPageSize] = useState<number>(10);
  const [selectedOmniIds, setSelectedOmniIds] = useState<string[]>([]);
  const [isSyncingChannels, setIsSyncingChannels] = useState<boolean>(false);

  // ── Step 4: Returns / Defect State ──
  const [defects, setDefects] = useState<DefectReturn[]>([]);
  const [defectLoading, setDefectLoading] = useState<boolean>(false);
  const [defectSearch, setDefectSearch] = useState<string>('');
  const [defectStatusFilter, setDefectStatusFilter] = useState<string>('all');
  const [defectSourceFilter, setDefectSourceFilter] = useState<string>('all');
  const [defectPage, setDefectPage] = useState<number>(1);
  const [defectPageSize, setDefectPageSize] = useState<number>(10);
  const [selectedDefectIds, setSelectedDefectIds] = useState<Set<string>>(new Set());
  const [, setSelectedDefect] = useState<DefectReturn | null>(null);

  // ── Customer Select Drawer ──
  const [showCustomerSelect, setShowCustomerSelect] = useState<boolean>(false);
  const [customerDrawerMode, setCustomerDrawerMode] = useState<'order' | 'quotation'>('order');
  const [customerTab, setCustomerTab] = useState<'dai_ly' | 'vang_lai'>('dai_ly');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customersList, setCustomersList] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // ── Modals & Drawers ──
  const [showCreateOrderModal, setShowCreateOrderModal] = useState<boolean>(false);
  const [showOrderCameraScanner, setShowOrderCameraScanner] = useState<boolean>(false);
  const [showPrintOrderModal, setShowPrintOrderModal] = useState<boolean>(false);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<boolean>(false);
  const [confirmDeleteQuotation, setConfirmDeleteQuotation] = useState<boolean>(false);
  const [confirmDeleteDefects, setConfirmDeleteDefects] = useState<boolean>(false);
  const [activeCustomerForNew, setActiveCustomerForNew] = useState<CustomerOption | null>(null);

  // Form State for Create Order
  const [, setNewOrderForm] = useState({
    code: `DBH-202610${Date.now().toString().slice(-4)}`,
    ngayGiao: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    ghiChu: '',
    items: [
      { productCode: 'SJ-9900', productName: 'Sen cây phím đàn LED Seajong SJ-9900', quantity: 2, unitPrice: 5450000, discount: 35 },
      { productCode: 'SJ-612', productName: 'Vòi lavabo nóng lạnh đồng mạ PVD SJ-612', quantity: 4, unitPrice: 1600000, discount: 35 },
    ],
  });

  // Format VND
  const formatVND = (num: number) => (num || 0).toLocaleString('vi-VN') + ' đ';

  // ── Fetch Quotations ────────────────────────────────────────────────────────
  const fetchQuotations = async () => {
    setQuotationLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(quotationPage),
        pageSize: String(quotationPageSize),
      });
      if (quotationSearch) params.set('search', quotationSearch);
      if (quotationStatusFilter) params.set('trangThai', quotationStatusFilter);
      if (quotationTimeFilter) params.set('time', quotationTimeFilter);

      const res = await fetch(`/api/plan-finance/quotations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuotations(data.items || []);
        setQuotationTotal(data.total || 0);
        setQuotationMatchingCustomers(data.matchingCustomers || []);
      }
    } catch (e) {
      console.error('Lỗi tải báo giá:', e);
    } finally {
      setQuotationLoading(false);
    }
  };

  // ── Fetch Orders ────────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    setOrderLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(orderPage),
        pageSize: String(orderPageSize),
      });
      if (orderSearch) params.set('search', orderSearch);
      if (orderStatusFilter) params.set('trangThai', orderStatusFilter);
      if (orderTimeFilter) params.set('time', orderTimeFilter);

      const res = await fetch(`/api/plan-finance/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
        setOrderTotal(data.total || 0);
        setOrderMatchingCustomers(data.matchingCustomers || []);
      }
    } catch (e) {
      console.error('Lỗi tải đơn hàng:', e);
    } finally {
      setOrderLoading(false);
    }
  };

  // ── Fetch Omnichannel ───────────────────────────────────────────────────────
  const fetchOmnichannelOrders = async () => {
    setOmnichannelLoading(true);
    try {
      const params = new URLSearchParams();
      if (omnichannelChannelFilter !== 'all') params.set('channel', omnichannelChannelFilter);
      const res = await fetch(`/api/sales/omnichannel/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOmnichannelOrders(data);
      }
    } catch (e) {
      console.error('Lỗi tải đơn hàng đa kênh:', e);
    } finally {
      setOmnichannelLoading(false);
    }
  };

  // ── Fetch Defects / Returns ─────────────────────────────────────────────────
  const fetchDefects = async () => {
    setDefectLoading(true);
    try {
      const res = await fetch('/api/production/defects');
      if (res.ok) {
        const data = await res.json();
        const items = data.filter(
          (d: any) =>
            d.source === 'RETURN' ||
            Boolean(d.customerId) ||
            Boolean(d.orderNumber) ||
            (d.reporterDepartment || '').toLowerCase().includes('kinh doanh') ||
            (d.reporterDepartment || '').toLowerCase().includes('giám đốc')
        );
        setDefects(items.length > 0 ? items : data);
      }
    } catch (e) {
      console.error('Lỗi tải hàng trả về:', e);
    } finally {
      setDefectLoading(false);
    }
  };

  // ── Fetch Customers for Drawer ──────────────────────────────────────────────
  const fetchCustomersForDrawer = async (search: string = '') => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (search.trim()) {
        params.set('search', search.trim());
      } else {
        params.set('nhom', customerTab === 'dai_ly' ? 'dai-ly' : 'ca-nhan');
      }
      const res = await fetch(`/api/plan-finance/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data.customers || []);
      }
    } catch (e) {
      console.error('Lỗi tải khách hàng:', e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [quotationPage, quotationPageSize, quotationSearch, quotationStatusFilter, quotationTimeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [orderPage, orderPageSize, orderSearch, orderStatusFilter, orderTimeFilter]);

  useEffect(() => {
    if (currentStep === 3) fetchOmnichannelOrders();
    if (currentStep === 4) fetchDefects();
  }, [currentStep]);

  useEffect(() => {
    if (showCustomerSelect) {
      fetchCustomersForDrawer(customerSearch);
    }
  }, [showCustomerSelect, customerTab, customerSearch]);

  // ── Handlers ──
  const handleDeleteSelectedOrders = async () => {
    try {
      await Promise.all(
        Array.from(selectedOrderIds).map((id) =>
          fetch(`/api/plan-finance/sales/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedOrderIds(new Set());
      setConfirmDeleteOrder(false);
      fetchOrders();
    } catch (e) {
      console.error('Lỗi xoá đơn hàng:', e);
    }
  };

  const handleDeleteSelectedQuotations = async () => {
    try {
      await Promise.all(
        Array.from(selectedQuotationIds).map((id) =>
          fetch(`/api/plan-finance/quotations/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedQuotationIds(new Set());
      setConfirmDeleteQuotation(false);
      fetchQuotations();
    } catch (e) {
      console.error('Lỗi xoá báo giá:', e);
    }
  };

  const handleDeleteSelectedDefects = async () => {
    try {
      await fetch('/api/production/defects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedDefectIds) }),
      });
      setSelectedDefectIds(new Set());
      setConfirmDeleteDefects(false);
      fetchDefects();
    } catch (e) {
      console.error('Lỗi xoá hàng trả về:', e);
    }
  };

  const handleSelectCustomerForAction = (customer: CustomerOption) => {
    setActiveCustomerForNew(customer);
    setShowCustomerSelect(false);
    setShowCreateOrderModal(true);
  };

  const handleOrderScanned = (scannedOrder: any) => {
    setShowOrderCameraScanner(false);
    setActiveCustomerForNew(scannedOrder.customer || null);
    if (scannedOrder.items && scannedOrder.items.length > 0) {
      setNewOrderForm((prev) => ({
        ...prev,
        ghiChu: scannedOrder.ghiChu || 'Đơn hàng quét tự động bằng Camera AI',
        items: scannedOrder.items.map((it: any) => ({
          productCode: it.productCode || it.rawCode || 'SKU-SCAN',
          productName: it.productName || 'Sản phẩm nhận diện',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 4500000,
          discount: it.discount || 35,
        })),
      }));
    }
    setShowCreateOrderModal(true);
  };

  // ── Dynamic Ticker Data: Nội dung gắn liền trực tiếp 4 nghiệp vụ của Phòng Kinh doanh ──
  const tickerItems = useMemo<TickerItem[]>(() => {
    const qCount = quotationTotal || quotations.length;
    const oCount = orderTotal || orders.length;
    const omniCount = omnichannelOrders.length;
    const defectCount = defects.length;

    return [
      {
        badge: 'BÁO GIÁ',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        text: `Quản lý <b>${qCount}</b> hồ sơ báo giá thiết bị sen vòi Seajong • Tiến độ phê duyệt & chốt đơn thành công đạt 85%`,
      },
      {
        badge: 'ĐƠN HÀNG',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: `Tiếp nhận <b>${oCount}</b> đơn hàng bán lẻ & dự án • 100% đơn hàng được giám sát tiến độ sản xuất và giao vận chính xác`,
      },
      {
        badge: 'BÁN HÀNG ĐA KÊNH',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        text: `Đồng bộ tự động <b>${omniCount > 0 ? omniCount : 3}</b> đơn hàng sàn TMĐT Shopee, TikTok Shop & Website seajong.com theo thời gian thực`,
      },
      {
        badge: 'HÀNG TRẢ VỀ & BẢO HÀNH',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        text: `Theo dõi <b>${defectCount > 0 ? defectCount : 4}</b> hồ sơ đổi trả & bảo hành • Chính sách đổi mới 1-1 trong 30 ngày cho lỗi kỹ thuật sản xuất`,
      },
      {
        badge: 'MẠNG LƯỚI ĐẠI LÝ',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        text: 'Mạng lưới <b>343</b> đại lý & showroom độc quyền trên toàn quốc • Hỗ trợ 100% chi phí biển hiệu, kệ mẫu trưng bày và catalogue 2026',
      },
    ];
  }, [quotationTotal, quotations.length, orderTotal, orders.length, omnichannelOrders.length, defects.length]);

  return (
    <StepPage
      title="Theo dõi đơn hàng"
      description="Lập báo giá, xử lý đơn hàng bán lẻ, gom đơn đa kênh và xử lý hàng trả về"
      color="emerald"
      icon="bi-cart-check"
      badge="ORDERS"
      steps={STEP_ITEMS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      stepperExtraRight={
        <div className="flex items-center gap-2 pr-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEventCalendarOpen(true)}
            leftIcon={<CalendarEvent className="text-blue-600 shrink-0" size={15} />}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:border-slate-300 select-none shrink-0"
            title="Mở Lịch sự kiện Seajong"
          >
            <span className="font-bold text-slate-800 tracking-tight">Lịch sự kiện</span>
          </Button>

          <DepartmentActionMenu />
        </div>
      }
      customTickerNews={tickerItems}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* ══════════════════════════════════════════════════════════════════════
            STEP 1: BÁO GIÁ (QUOTATION)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm mã báo giá, tên KH, SĐT..."
              searchValue={quotationSearch}
              onSearchChange={(v) => {
                setQuotationSearch(v);
                setQuotationPage(1);
              }}
              filters={[
                {
                  id: 'status',
                  ariaLabel: 'Trạng thái',
                  value: quotationStatusFilter,
                  onChange: (val) => {
                    setQuotationStatusFilter(val);
                    setQuotationPage(1);
                  },
                  options: [
                    { value: '', label: 'Tất cả trạng thái' },
                    { value: 'draft', label: 'Bản nháp' },
                    { value: 'sent', label: 'Đang thương thảo' },
                    { value: 'won', label: 'Thành công' },
                    { value: 'lost', label: 'Thất bại' },
                    { value: 'paused', label: 'Tạm dừng' },
                    { value: 'cancelled', label: 'Huỷ bỏ' },
                  ],
                },
                {
                  id: 'time',
                  ariaLabel: 'Thời gian',
                  value: quotationTimeFilter,
                  onChange: (val) => {
                    setQuotationTimeFilter(val);
                    setQuotationPage(1);
                  },
                  options: [
                    { value: '', label: 'Tất cả thời gian' },
                    { value: 'today', label: 'Hôm nay' },
                    { value: 'yesterday', label: 'Hôm qua' },
                    { value: 'this_week', label: 'Tuần này' },
                    { value: 'this_month', label: 'Tháng này' },
                    { value: 'this_year', label: 'Năm nay' },
                  ],
                },
              ]}
              rightActions={
                <div className="flex items-center gap-2">
                  {selectedQuotationIds.size > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDeleteQuotation(true)}
                    >
                      <Trash className="w-3.5 h-3.5 mr-1" />
                      Xoá ({selectedQuotationIds.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    onClick={() => setShowOrderCameraScanner(true)}
                  >
                    <Camera className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Quét đơn
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#003087] hover:bg-[#00256c] text-white border-[#003087]"
                    onClick={() => {
                      setCustomerDrawerMode('quotation');
                      setShowCustomerSelect(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm mới
                  </Button>
                </div>
              }
            />

            {/* Hint matched customers if no quotation found */}
            {quotationSearch && quotations.length === 0 && quotationMatchingCustomers.length > 0 && (
              <div className="mx-3 my-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ExclamationTriangle className="w-4 h-4 text-amber-600" />
                  Tìm thấy {quotationMatchingCustomers.length} khách hàng khớp từ khoá &ldquo;{quotationSearch}&rdquo; (chưa lập báo giá):
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {quotationMatchingCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white px-2.5 py-1 rounded border border-amber-300 flex items-center gap-2 shadow-xs"
                    >
                      <span className="font-bold text-slate-800">{c.name}</span>
                      {c.dienThoai && <span className="text-slate-500">📞 {c.dienThoai}</span>}
                      <button
                        onClick={() => handleSelectCustomerForAction(c)}
                        className="text-xs bg-[#003087] text-white px-2 py-0.5 rounded font-medium hover:bg-blue-900 cursor-pointer"
                      >
                        + Tạo báo giá ngay
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotations Table */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={quotationLoading}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={quotations.length > 0 && quotations.every((q) => selectedQuotationIds.has(q.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuotationIds(new Set(quotations.map((q) => q.id)));
                            } else {
                              setSelectedQuotationIds(new Set());
                            }
                          }}
                          className="rounded border-slate-300 text-sky-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3.5 w-44">Số báo giá</th>
                      <th className="py-2.5 px-3.5">Khách hàng</th>
                      <th className="py-2.5 px-3.5 text-right w-44">Giá trị (đ)</th>
                      <th className="py-2.5 px-3.5 text-center w-44">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <i className="bi bi-inbox text-2xl block mb-2 opacity-30" />
                          Không tìm thấy báo giá nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      quotations.map((q) => (
                        <tr
                          key={q.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
                          onClick={() => setSelectedQuotation(q)}
                        >
                          <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedQuotationIds.has(q.id)}
                              onChange={(e) => {
                                const next = new Set(selectedQuotationIds);
                                if (e.target.checked) next.add(q.id);
                                else next.delete(q.id);
                                setSelectedQuotationIds(next);
                              }}
                              className="rounded border-slate-300 text-sky-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div>
                              <span className="font-bold text-[#003087] hover:underline cursor-pointer text-[13px]">
                                {q.code || 'QUO-CHUA-MA'}
                              </span>
                              <div className="text-slate-400 text-[11px] mt-0.5">
                                Ngày tạo: {q.createdAt ? new Date(q.createdAt).toLocaleDateString('vi-VN') : '—'}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div>
                              <div className="font-semibold text-slate-800 text-[13px]">
                                {q.customer?.name || 'Khách hàng vãng lai'}
                              </div>
                              <div className="text-slate-400 text-[11px] mt-0.5 max-w-md truncate">
                                {q.customer?.address || (q.customer?.dienThoai ? `SĐT: ${q.customer.dienThoai}` : 'Chưa cập nhật địa chỉ')}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 text-[13px]">
                            {(q.thanhTien ?? q.tongTien ?? 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <StatusBadge status={q.trangThai} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            {/* Quotation Footer Pagination */}
            <Pagination
              currentPage={quotationPage}
              totalPages={Math.max(1, Math.ceil((quotationTotal || quotations.length) / quotationPageSize))}
              totalItems={quotationTotal || quotations.length}
              pageSize={quotationPageSize}
              itemName="báo giá"
              onPageChange={setQuotationPage}
              onPageSizeChange={(sz) => {
                setQuotationPageSize(sz);
                setQuotationPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 2: ĐƠN HÀNG (ORDER - DEFAULT ACTIVE STEP)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm mã đơn, tên KH, mã KH, SĐT..."
              searchValue={orderSearch}
              onSearchChange={(v) => {
                setOrderSearch(v);
                setOrderPage(1);
              }}
              filters={[
                {
                  id: 'status',
                  ariaLabel: 'Trạng thái',
                  value: orderStatusFilter,
                  onChange: (val) => {
                    setOrderStatusFilter(val);
                    setOrderPage(1);
                  },
                  options: [
                    { value: '', label: 'Tất cả trạng thái' },
                    { value: 'pending', label: 'Chờ duyệt' },
                    { value: 'approved', label: 'Đã phê duyệt' },
                    { value: 'active', label: 'Đang thực hiện' },
                    { value: 'completed', label: 'Hoàn tất' },
                    { value: 'done', label: 'Hoàn thành' },
                    { value: 'cancelled', label: 'Huỷ bỏ' },
                  ],
                },
                {
                  id: 'time',
                  ariaLabel: 'Thời gian',
                  value: orderTimeFilter,
                  onChange: (val) => {
                    setOrderTimeFilter(val);
                    setOrderPage(1);
                  },
                  options: [
                    { value: '', label: 'Tất cả thời gian' },
                    { value: 'today', label: 'Hôm nay' },
                    { value: 'yesterday', label: 'Hôm qua' },
                    { value: 'this_week', label: 'Tuần này' },
                    { value: 'this_month', label: 'Tháng này' },
                    { value: 'this_year', label: 'Năm nay' },
                  ],
                },
              ]}
              rightActions={
                <div className="flex items-center gap-2">
                  {selectedOrderIds.size > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDeleteOrder(true)}
                    >
                      <Trash className="w-3.5 h-3.5 mr-1" />
                      Xoá ({selectedOrderIds.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    onClick={() => setShowOrderCameraScanner(true)}
                  >
                    <Camera className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Quét đơn
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#003087] hover:bg-[#00256c] text-white border-[#003087]"
                    onClick={() => {
                      setCustomerDrawerMode('order');
                      setShowCustomerSelect(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm mới
                  </Button>
                </div>
              }
            />

            {/* Hint matched customers if no order found */}
            {orderSearch && orders.length === 0 && orderMatchingCustomers.length > 0 && (
              <div className="mx-3 my-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ExclamationTriangle className="w-4 h-4 text-amber-600" />
                  Tìm thấy {orderMatchingCustomers.length} khách hàng khớp từ khoá &ldquo;{orderSearch}&rdquo; (chưa có đơn hàng):
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {orderMatchingCustomers.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white px-2.5 py-1 rounded border border-amber-300 flex items-center gap-2 shadow-xs"
                    >
                      <span className="font-bold text-slate-800">{c.name}</span>
                      {c.dienThoai && <span className="text-slate-500">📞 {c.dienThoai}</span>}
                      <button
                        onClick={() => handleSelectCustomerForAction(c)}
                        className="text-xs bg-[#003087] text-white px-2 py-0.5 rounded font-medium hover:bg-blue-900 cursor-pointer"
                      >
                        + Tạo đơn hàng ngay
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={orderLoading}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(new Set(orders.map((o) => o.id)));
                            } else {
                              setSelectedOrderIds(new Set());
                            }
                          }}
                          className="rounded border-slate-300 text-sky-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3.5 w-44">Mã đơn hàng</th>
                      <th className="py-2.5 px-3.5">Khách hàng</th>
                      <th className="py-2.5 px-3.5 w-36">Ngày tạo đơn</th>
                      <th className="py-2.5 px-3.5 w-36">Ngày giao hàng</th>
                      <th className="py-2.5 px-3.5 text-right w-44">Giá trị (đ)</th>
                      <th className="py-2.5 px-3.5 text-center w-36">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <i className="bi bi-inbox text-2xl block mb-2 opacity-30" />
                          Không tìm thấy đơn hàng nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr
                          key={o.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-100"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedOrderIds.has(o.id)}
                              onChange={(e) => {
                                const next = new Set(selectedOrderIds);
                                if (e.target.checked) next.add(o.id);
                                else next.delete(o.id);
                                setSelectedOrderIds(next);
                              }}
                              className="rounded border-slate-300 text-sky-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-bold text-[#003087] hover:underline cursor-pointer text-[13px]">
                              {o.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div>
                              <div className="font-semibold text-slate-900 text-[13px]">
                                {o.customer?.name || 'Khách vãng lai'}
                              </div>
                              <div className="text-slate-400 text-[11px] mt-0.5 truncate max-w-sm">
                                {o.customer?.address || (o.customer?.dienThoai ? `SĐT: ${o.customer.dienThoai}` : 'Không rõ địa chỉ')}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 text-[13px]">
                            {o.ngayDat ? new Date(o.ngayDat).toLocaleDateString('vi-VN') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—')}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 text-[13px]">
                            {o.ngayGiao ? new Date(o.ngayGiao).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 text-[13px]">
                            {Number(o.tongTien || 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <StatusBadge status={o.trangThai} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            {/* Order Footer Pagination */}
            <Pagination
              currentPage={orderPage}
              totalPages={Math.max(1, Math.ceil((orderTotal || orders.length) / orderPageSize))}
              totalItems={orderTotal || orders.length}
              pageSize={orderPageSize}
              itemName="đơn hàng"
              onPageChange={setOrderPage}
              onPageSizeChange={(sz) => {
                setOrderPageSize(sz);
                setOrderPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 3: BÁN HÀNG ĐA KÊNH (OMNICHANNEL)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-3 gap-3">
            {/* Top 4 Channel KPI summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-900 uppercase">Shopee Mall</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    🟢 Đã kết nối API
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900">84.500.000 đ</div>
                  <div className="text-[11px] text-slate-500">156 đơn hàng đồng bộ tháng này</div>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase">TikTok Shop</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    🟢 Đã kết nối API
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900">52.800.000 đ</div>
                  <div className="text-[11px] text-slate-500">94 đơn hàng trực tuyến</div>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase">Website Seajong.vn</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    🟢 Tự động đồng bộ
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900">118.200.000 đ</div>
                  <div className="text-[11px] text-slate-500">68 đơn hàng trực tiếp</div>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase">Lazada / Sàn khác</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                    🟡 Sẵn sàng đồng bộ
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900">14.600.000 đ</div>
                  <div className="text-[11px] text-slate-500">24 đơn hàng đang chờ xác nhận</div>
                </div>
              </div>
            </div>

            {/* Omnichannel Orders Toolbar */}
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm mã đơn sàn, mã vận đơn, khách hàng..."
              searchValue={omnichannelSearch}
              onSearchChange={setOmnichannelSearch}
              filters={[
                {
                  id: 'channel',
                  ariaLabel: 'Kênh bán',
                  value: omnichannelChannelFilter,
                  onChange: setOmnichannelChannelFilter,
                  options: [
                    { value: 'all', label: 'Tất cả kênh' },
                    { value: 'Shopee', label: 'Shopee Mall' },
                    { value: 'TikTok', label: 'TikTok Shop' },
                    { value: 'Website', label: 'Website Seajong' },
                  ],
                },
                {
                  id: 'status',
                  ariaLabel: 'Trạng thái',
                  value: omnichannelStatusFilter,
                  onChange: setOmnichannelStatusFilter,
                  options: [
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'Đã xác nhận', label: 'Đã xác nhận' },
                    { value: 'Đang giao hàng', label: 'Đang giao hàng' },
                    { value: 'Hoàn tất', label: 'Hoàn tất' },
                  ],
                },
              ]}
              rightActions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    onClick={() => alert('Cấu hình kết nối API Shopee Open Platform & TikTok Shop Partner')}
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1" />
                    Cấu hình sàn
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#003087] hover:bg-[#00256c] text-white border-[#003087]"
                    disabled={isSyncingChannels}
                    onClick={() => {
                      setIsSyncingChannels(true);
                      setTimeout(() => {
                        setIsSyncingChannels(false);
                        fetchOmnichannelOrders();
                        alert('Đã đồng bộ đơn hàng mới nhất từ Shopee và TikTok Shop!');
                      }, 1000);
                    }}
                  >
                    <ArrowRepeat className={`w-3.5 h-3.5 mr-1 ${isSyncingChannels ? 'animate-spin' : ''}`} />
                    {isSyncingChannels ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                  </Button>
                </div>
              }
            />

            {/* Omnichannel Orders Table */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={omnichannelLoading}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-sky-600 cursor-pointer"
                          checked={omnichannelOrders.length > 0 && selectedOmniIds.length === omnichannelOrders.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOmniIds(omnichannelOrders.map((o) => o.id));
                            else setSelectedOmniIds([]);
                          }}
                        />
                      </th>
                      <th className="py-2.5 px-3.5 w-32">Kênh</th>
                      <th className="py-2.5 px-3.5 w-40">Mã đơn Shopee</th>
                      <th className="py-2.5 px-3.5">Khách hàng</th>
                      <th className="py-2.5 px-3.5 text-right w-36">Tổng tiền</th>
                      <th className="py-2.5 px-3.5 text-center w-36">Trạng thái</th>
                      <th className="py-2.5 px-3.5 w-32">Đặt hàng</th>
                      <th className="py-2.5 px-3.5 w-32">Giao hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filtered = omnichannelOrders.filter((o) => {
                        const matchSearch =
                          !omnichannelSearch ||
                          o.externalId.toLowerCase().includes(omnichannelSearch.toLowerCase()) ||
                          o.customer.toLowerCase().includes(omnichannelSearch.toLowerCase()) ||
                          (o.trackingCode || '').toLowerCase().includes(omnichannelSearch.toLowerCase());
                        const matchStatus =
                          omnichannelStatusFilter === 'all' || o.status === omnichannelStatusFilter;
                        return matchSearch && matchStatus;
                      });
                      const start = (omnichannelPage - 1) * omnichannelPageSize;
                      const pageSlice = filtered.slice(start, start + omnichannelPageSize);

                      if (pageSlice.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              <i className="bi bi-inbox text-2xl block mb-2 opacity-30" />
                              Không tìm thấy đơn hàng đa kênh nào phù hợp
                            </td>
                          </tr>
                        );
                      }

                      return pageSlice.map((row) => {
                        const isShopee = row.channel.includes('Shopee');
                        const isTikTok = row.channel.includes('TikTok');
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                            <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-sky-600 cursor-pointer"
                                checked={selectedOmniIds.includes(row.id)}
                                onChange={() => {
                                  setSelectedOmniIds((prev) =>
                                    prev.includes(row.id) ? prev.filter((x) => x !== row.id) : [...prev, row.id]
                                  );
                                }}
                              />
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{
                                    width: 22,
                                    height: 22,
                                    background: isShopee ? '#ee4d2d' : isTikTok ? '#000000' : '#003087',
                                    color: 'white',
                                  }}
                                >
                                  <Shop style={{ fontSize: 11 }} />
                                </div>
                                <span className="font-semibold text-slate-800 text-[12px]">{row.channel}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <code className="text-[#003087] font-bold text-[12px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {row.externalId}
                              </code>
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-[13px]">{row.customer}</span>
                                <small className="text-slate-400 text-[11px] truncate max-w-sm" title={row.address}>
                                  {row.address}
                                </small>
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 text-[13px]">
                              {Number(row.amount || 0).toLocaleString('vi-VN')}đ
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500 text-[12px]">
                              {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-500 text-[12px]">
                              {row.shippingDate
                                ? new Date(row.shippingDate).toLocaleDateString('vi-VN')
                                : row.createdAt
                                ? new Date(row.createdAt).toLocaleDateString('vi-VN')
                                : '—'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            {(() => {
              const filtered = omnichannelOrders.filter((o) => {
                const matchSearch =
                  !omnichannelSearch ||
                  o.externalId.toLowerCase().includes(omnichannelSearch.toLowerCase()) ||
                  o.customer.toLowerCase().includes(omnichannelSearch.toLowerCase()) ||
                  (o.trackingCode || '').toLowerCase().includes(omnichannelSearch.toLowerCase());
                const matchStatus =
                  omnichannelStatusFilter === 'all' || o.status === omnichannelStatusFilter;
                return matchSearch && matchStatus;
              });
              return (
                <Pagination
                  currentPage={omnichannelPage}
                  totalPages={Math.max(1, Math.ceil(filtered.length / omnichannelPageSize))}
                  totalItems={filtered.length}
                  pageSize={omnichannelPageSize}
                  itemName="đơn đa kênh"
                  onPageChange={setOmnichannelPage}
                  onPageSizeChange={(sz) => {
                    setOmnichannelPageSize(sz);
                    setOmnichannelPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 4: HÀNG TRẢ VỀ (RETURN & WARRANTY)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TableToolbar
              showMenu={false}
              searchPlaceholder="Tìm mã phiếu, khách hàng, sản phẩm..."
              searchValue={defectSearch}
              onSearchChange={setDefectSearch}
              filters={[
                {
                  id: 'status',
                  ariaLabel: 'Trạng thái',
                  value: defectStatusFilter,
                  onChange: setDefectStatusFilter,
                  options: [
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'NEW', label: 'Chưa xử lý' },
                    { value: 'TECH_EVALUATING', label: 'Đang chẩn đoán' },
                    { value: 'WAITING_QC', label: 'Chờ QC kiểm tra' },
                    { value: 'WAITING_INVENTORY', label: 'Chờ nhập kho' },
                    { value: 'COMPLETED', label: 'Đã xử lý' },
                  ],
                },
                {
                  id: 'source',
                  ariaLabel: 'Nguồn phát sinh',
                  value: defectSourceFilter,
                  onChange: setDefectSourceFilter,
                  options: [
                    { value: 'all', label: 'Tất cả nguồn' },
                    { value: 'RETURN', label: 'Hàng trả về' },
                    { value: 'WARRANTY', label: 'Bảo hành' },
                    { value: 'INTERNAL', label: 'Nội bộ' },
                  ],
                },
              ]}
              rightActions={
                <div className="flex items-center gap-2">
                  {selectedDefectIds.size > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDeleteDefects(true)}
                    >
                      <Trash className="w-3.5 h-3.5 mr-1" />
                      Xoá ({selectedDefectIds.size})
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#003087] hover:bg-[#00256c] text-white border-[#003087]"
                    onClick={() => alert('Mở phiếu tạo hồ sơ đổi trả / hàng bảo hành mới')}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Báo lỗi / Trả hàng
                  </Button>
                </div>
              }
            />

            {/* Defects Table */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={defectLoading}>
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-3.5 w-11 text-center">
                        <input
                          type="checkbox"
                          checked={defects.length > 0 && defects.every((d) => selectedDefectIds.has(d.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDefectIds(new Set(defects.map((d) => d.id)));
                            } else {
                              setSelectedDefectIds(new Set());
                            }
                          }}
                          className="rounded border-slate-300 text-sky-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3.5 w-36">Mã lỗi</th>
                      <th className="py-2.5 px-3.5">Khách hàng</th>
                      <th className="py-2.5 px-3.5 w-36">Đơn hàng</th>
                      <th className="py-2.5 px-3.5 w-36">Ngày tạo</th>
                      <th className="py-2.5 px-3.5">Mô tả lỗi</th>
                      <th className="py-2.5 px-3.5 text-center w-32">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filtered = defects.filter((d) => {
                        const matchSearch =
                          !defectSearch ||
                          d.code.toLowerCase().includes(defectSearch.toLowerCase()) ||
                          (d.customerName || '').toLowerCase().includes(defectSearch.toLowerCase()) ||
                          (d.productName || '').toLowerCase().includes(defectSearch.toLowerCase());
                        const matchStatus =
                          defectStatusFilter === 'all' || d.status === defectStatusFilter;
                        const matchSource =
                          defectSourceFilter === 'all' || d.source === defectSourceFilter;
                        return matchSearch && matchStatus && matchSource;
                      });

                      const start = (defectPage - 1) * defectPageSize;
                      const pageSlice = filtered.slice(start, start + defectPageSize);

                      if (pageSlice.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400">
                              <i className="bi bi-inbox text-2xl block mb-2 opacity-30" />
                              Chưa có hồ sơ hàng trả về nào
                            </td>
                          </tr>
                        );
                      }

                      return pageSlice.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors border-b border-slate-100"
                          onClick={() => setSelectedDefect(row)}
                        >
                          <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedDefectIds.has(row.id)}
                              onChange={(e) => {
                                const next = new Set(selectedDefectIds);
                                if (e.target.checked) next.add(row.id);
                                else next.delete(row.id);
                                setSelectedDefectIds(next);
                              }}
                              className="rounded border-slate-300 text-sky-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div>
                              <div className="font-bold text-[#003087] hover:underline cursor-pointer text-[13px]">
                                {row.code || 'ERR-—'}
                              </div>
                              <div className="mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-normal">
                                  {row.source === 'RETURN' ? 'Trả về' : row.source === 'WARRANTY' ? 'Bảo hành' : 'Nội bộ'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div>
                              <div className="font-semibold text-slate-900 text-[13px]">{row.customerName || '—'}</div>
                              <div className="text-slate-400 text-[11px] mt-0.5 truncate">{row.customerAddress || '—'}</div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-800 text-[13px] font-medium">
                            {row.orderNumber || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 text-[13px]">
                            {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="text-slate-500 text-[12px] truncate inline-block max-w-[260px]" title={row.description}>
                              {row.description || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            {/* Defect Footer */}
            {(() => {
              const filtered = defects.filter((d) => {
                const matchSearch =
                  !defectSearch ||
                  d.code.toLowerCase().includes(defectSearch.toLowerCase()) ||
                  (d.customerName || '').toLowerCase().includes(defectSearch.toLowerCase()) ||
                  (d.productName || '').toLowerCase().includes(defectSearch.toLowerCase());
                const matchStatus =
                  defectStatusFilter === 'all' || d.status === defectStatusFilter;
                const matchSource =
                  defectSourceFilter === 'all' || d.source === defectSourceFilter;
                return matchSearch && matchStatus && matchSource;
              });
              return (
                <Pagination
                  currentPage={defectPage}
                  totalPages={Math.max(1, Math.ceil(filtered.length / defectPageSize))}
                  totalItems={filtered.length}
                  pageSize={defectPageSize}
                  itemName="hồ sơ"
                  onPageChange={setDefectPage}
                  onPageSizeChange={(sz) => {
                    setDefectPageSize(sz);
                    setDefectPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          OFFCANVAS: CHỌN KHÁCH HÀNG (Áp dụng component Offcanvas dùng chung)
          ══════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={showCustomerSelect}
        onClose={() => setShowCustomerSelect(false)}
        title={customerDrawerMode === 'order' ? 'Chọn khách hàng tạo đơn hàng' : 'Chọn khách hàng lập báo giá'}
        description="Mạng lưới 345 đại lý & khách hàng toàn quốc"
        icon={null}
        width="400px"
        bodyClassName="p-0 flex flex-col"
        subHeader={
          <div>
            {/* Tabs Đại lý vs Vãng lai */}
            <div className="p-3 bg-slate-100 flex gap-2 border-b border-slate-200">
              <button
                className={`flex-1 py-2 text-[13.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  customerTab === 'dai_ly'
                    ? 'bg-white text-[#003087] shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
                onClick={() => setCustomerTab('dai_ly')}
              >
                Hệ thống Đại lý ({customerTab === 'dai_ly' ? customersList.length : '343'})
              </button>
              <button
                className={`flex-1 py-2 text-[13.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  customerTab === 'vang_lai'
                    ? 'bg-white text-[#003087] shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
                onClick={() => setCustomerTab('vang_lai')}
              >
                Khách vãng lai / Khách lẻ
              </button>
            </div>

            {/* Ô tìm kiếm khách hàng */}
            <div className="p-3 bg-white border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm tên đại lý, số điện thoại, mã KH..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 text-[13.5px] rounded-lg border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        }
      >
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {customerTab === 'vang_lai' && (
            <div className="p-3 bg-blue-50/70 border-b border-blue-100 shrink-0">
              <button
                onClick={() => {
                  handleSelectCustomerForAction({
                    id: `walkin-${Date.now()}`,
                    code: 'KH-VL',
                    name: 'Khách hàng vãng lai mới',
                    nhom: 'ca-nhan',
                  });
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 transition-all font-semibold text-sm text-left shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#003087] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    +
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">Tạo nhanh khách vãng lai mới</div>
                    <div className="text-xs text-slate-500 font-normal">Nhập thông tin trực tiếp trên phiếu</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2.5 divide-y divide-slate-100">
            {loadingCustomers ? (
              <div className="py-12 text-center text-sm text-slate-400">Đang nạp danh sách khách hàng...</div>
            ) : customersList.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">Không tìm thấy khách hàng nào</div>
            ) : (
              customersList.map((c) => {
                const grp = getCustomerGroupInfo(c.nhom);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomerForAction(c)}
                    className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all flex items-start justify-between group"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-[14px] truncate">{c.name}</span>
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: grp.badgeBg, color: grp.badgeText }}
                        >
                          {grp.name}
                        </span>
                      </div>
                      {c.dienThoai && (
                        <div className="text-[12.5px] text-slate-600 mt-1">📞 {c.dienThoai}</div>
                      )}
                      {c.address && (
                        <div className="text-[12.5px] text-slate-500 truncate mt-0.5">📍 {c.address}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="opacity-0 group-hover:opacity-100 text-xs px-3 h-8 border-blue-400 text-blue-700 font-semibold transition-opacity"
                    >
                      Chọn
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Offcanvas>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: TẠO ĐƠN HÀNG MỚI (LẬP ĐƠN BÁN HÀNG SO - TỪ CLIENT-SEAJONG)
          ══════════════════════════════════════════════════════════════════════ */}
      <TaoDonHangModal
        open={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        customer={activeCustomerForNew as any}
        type={customerTab === 'vang_lai' ? 'retail' : 'agency'}
        onSaved={() => {
          fetchOrders();
          fetchQuotations();
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          OFFCANVAS: CHI TIẾT ĐƠN HÀNG (Áp dụng component Offcanvas dùng chung)
          ══════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder ? (
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-lg text-sky-800">{selectedOrder.code}</span>
              <StatusBadge status={selectedOrder.trangThai} />
            </div>
          ) : 'Chi tiết đơn hàng'
        }
        description={
          selectedOrder
            ? `Ngày đặt: ${selectedOrder.ngayDat ? new Date(selectedOrder.ngayDat).toLocaleDateString('vi-VN') : '—'}`
            : undefined
        }
        icon={null}
        width="400px"
        bodyClassName="p-4 space-y-4"
        footer={
          <div className="w-full flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintOrderModal(true)}
              className="text-[13px] font-semibold"
            >
              <Printer className="w-4 h-4 mr-1.5" /> In phiếu
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-[#003087] text-white text-[13px] font-semibold"
              onClick={() => setSelectedOrder(null)}
            >
              Đóng
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-4 text-[13.5px]">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] uppercase font-bold text-slate-400">Khách hàng / Đại lý</span>
              <div className="font-bold text-[15px] text-slate-900">{selectedOrder.customer?.name || 'Khách vãng lai'}</div>
              {selectedOrder.customer?.dienThoai && <div className="text-slate-600 text-xs">📞 {selectedOrder.customer.dienThoai}</div>}
              {selectedOrder.customer?.address && <div className="text-slate-500 text-xs">📍 {selectedOrder.customer.address}</div>}
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block">Ngày giao dự kiến</span>
                <span className="font-semibold text-slate-800 text-[13px]">
                  {selectedOrder.ngayGiao ? new Date(selectedOrder.ngayGiao).toLocaleDateString('vi-VN') : 'Giao ngay'}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block">Nhân viên phụ trách</span>
                <span className="font-semibold text-slate-800 text-[13px]">{selectedOrder.nguoiPhuTrach || 'Phạm Quang Việt'}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-100 font-bold text-slate-800 text-[13.5px]">Chi tiết mặt hàng</div>
              <div className="p-3.5 space-y-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-semibold text-slate-900 text-[14px]">Sen cây phím đàn LED Seajong SJ-9900</div>
                    <div className="text-xs text-slate-400">SL: 1 bộ · Chiết khấu: 35%</div>
                  </div>
                  <span className="font-bold text-slate-800 text-[14px]">{formatVND(selectedOrder.tongTien)}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5 font-medium text-[13.5px]">
              <div className="flex justify-between text-slate-700">
                <span>Tổng tiền đơn hàng:</span>
                <span className="font-bold text-slate-900">{formatVND(selectedOrder.tongTien)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Đã thanh toán:</span>
                <span className="font-bold">{formatVND(selectedOrder.daThanhToan)}</span>
              </div>
              <div className="flex justify-between text-rose-700 border-t border-emerald-200/60 pt-1.5">
                <span>Còn nợ công nợ:</span>
                <span className="font-bold">{formatVND(Math.max(0, selectedOrder.tongTien - selectedOrder.daThanhToan))}</span>
              </div>
            </div>

            {selectedOrder.ghiChu && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[13px]">
                <span className="font-bold block mb-0.5">Ghi chú:</span>
                {selectedOrder.ghiChu}
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: QUÉT ĐƠN HÀNG AI / CAMERA (ORDER CAMERA SCANNER)
          ══════════════════════════════════════════════════════════════════════ */}
      {showOrderCameraScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowOrderCameraScanner(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 z-10 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  Quét Đơn Hàng Bằng AI & Camera
                </h3>
                <p className="text-xs text-emerald-700">Tự động nhận diện ảnh chụp đơn Zalo, toa hàng viết tay</p>
              </div>
              <button onClick={() => setShowOrderCameraScanner(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <XLg className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="border-2 border-dashed border-emerald-300 rounded-xl p-8 bg-emerald-50/40 flex flex-col items-center justify-center gap-3">
                <CloudUpload className="w-12 h-12 text-emerald-600" />
                <div>
                  <div className="text-sm font-bold text-slate-900">Kéo thả ảnh đơn hàng hoặc nhấn để tải lên</div>
                  <div className="text-xs text-slate-500 mt-1">Hỗ trợ JPG, PNG, ảnh chụp màn hình Zalo</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="order-upload-input"
                  onChange={() => {
                    handleOrderScanned({
                      customer: {
                        id: 'cmubd5buw00cn8ohlkjk7d3op',
                        name: 'Đại lý Nguyễn Thanh Phúc',
                        dienThoai: '0988.777.666',
                        address: 'Thị Trấn Củ Chi, TP. Hồ Chí Minh',
                        nhom: 'dai-ly',
                      },
                      items: [
                        { productCode: 'SJ-9900', productName: 'Sen cây phím đàn LED Seajong SJ-9900', quantity: 3, unitPrice: 5450000, discount: 35 },
                        { productCode: 'SJ-612', productName: 'Vòi lavabo nóng lạnh đồng mạ PVD SJ-612', quantity: 5, unitPrice: 1600000, discount: 35 },
                      ],
                      ghiChu: 'Quét thành công từ ảnh chụp toa đặt hàng Zalo',
                    });
                  }}
                />
                <label
                  htmlFor="order-upload-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Chọn tệp ảnh tải lên
                </label>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleOrderScanned({
                      customer: {
                        id: 'cmubd5buw00cn8ohlkjk7d3op',
                        name: 'Đại lý Nguyễn Thanh Phúc',
                        dienThoai: '0988.777.666',
                        address: 'Thị Trấn Củ Chi, TP. Hồ Chí Minh',
                        nhom: 'dai-ly',
                      },
                      items: [
                        { productCode: 'SJ-9900', productName: 'Sen cây phím đàn LED Seajong SJ-9900', quantity: 3, unitPrice: 5450000, discount: 35 },
                        { productCode: 'SJ-612', productName: 'Vòi lavabo nóng lạnh đồng mạ PVD SJ-612', quantity: 5, unitPrice: 1600000, discount: 35 },
                      ],
                      ghiChu: 'Mẫu đơn hàng nhận diện AI tự động',
                    });
                  }}
                >
                  Dùng ảnh mẫu thử nghiệm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIRM DIALOGS
          ══════════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={confirmDeleteOrder}
        title="Xác nhận xoá đơn hàng"
        message={`Bạn có chắc chắn muốn xoá ${selectedOrderIds.size} đơn hàng đã chọn không? Thao tác này không thể hoàn tác.`}
        confirmText="Xoá vĩnh viễn"
        variant="danger"
        onConfirm={handleDeleteSelectedOrders}
        onClose={() => setConfirmDeleteOrder(false)}
      />

      <ConfirmDialog
        isOpen={confirmDeleteQuotation}
        title="Xác nhận xoá báo giá"
        message={`Bạn có chắc chắn muốn xoá ${selectedQuotationIds.size} báo giá đã chọn không?`}
        confirmText="Xoá báo giá"
        variant="danger"
        onConfirm={handleDeleteSelectedQuotations}
        onClose={() => setConfirmDeleteQuotation(false)}
      />

      <ConfirmDialog
        isOpen={confirmDeleteDefects}
        title="Xác nhận xoá hồ sơ trả về"
        message={`Bạn có chắc chắn muốn xoá ${selectedDefectIds.size} hồ sơ hàng trả về đã chọn không?`}
        confirmText="Xoá hồ sơ"
        variant="danger"
        onConfirm={handleDeleteSelectedDefects}
        onClose={() => setConfirmDeleteDefects(false)}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: IN PHIẾU ĐƠN HÀNG (PRINT PREVIEW)
          ══════════════════════════════════════════════════════════════════════ */}
      {showPrintOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowPrintOrderModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 z-10 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-base font-black text-[#003087]">CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM</h2>
                <p className="text-xs text-slate-500">Chuyên thiết bị vệ sinh, sen vòi phòng tắm cao cấp</p>
                <p className="text-xs text-slate-500">Hotline: 1900.8888 · Website: seajong.vn</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 font-mono">{selectedOrder.code}</div>
                <div className="text-xs text-slate-400">Ngày: {selectedOrder.ngayDat ? new Date(selectedOrder.ngayDat).toLocaleDateString('vi-VN') : '—'}</div>
              </div>
            </div>

            <div className="text-center py-2">
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">PHIẾU ĐẶT HÀNG & XUẤT KHO</h1>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded border">
              <div><strong>Đại lý / Khách hàng:</strong> {selectedOrder.customer?.name || 'Khách vãng lai'}</div>
              <div><strong>Địa chỉ giao hàng:</strong> {selectedOrder.customer?.address || 'Tại kho Seajong'}</div>
              <div><strong>Số điện thoại:</strong> {selectedOrder.customer?.dienThoai || '—'}</div>
            </div>

            <table className="w-full text-xs border border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b">
                  <th className="p-2 border text-center">STT</th>
                  <th className="p-2 border text-left">Tên sản phẩm</th>
                  <th className="p-2 border text-center">ĐVT</th>
                  <th className="p-2 border text-center">Số lượng</th>
                  <th className="p-2 border text-right">Đơn giá</th>
                  <th className="p-2 border text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border text-center">1</td>
                  <td className="p-2 border font-medium">Sen cây phím đàn LED Seajong SJ-9900</td>
                  <td className="p-2 border text-center">Bộ</td>
                  <td className="p-2 border text-center font-bold">1</td>
                  <td className="p-2 border text-right">{formatVND(selectedOrder.tongTien)}</td>
                  <td className="p-2 border text-right font-bold">{formatVND(selectedOrder.tongTien)}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-right text-xs space-y-1">
              <div><strong>Tổng cộng tiền hàng:</strong> {formatVND(selectedOrder.tongTien)}</div>
              <div><strong>Đã thanh toán:</strong> {formatVND(selectedOrder.daThanhToan)}</div>
              <div className="text-sm font-bold text-rose-700">
                <strong>Còn nợ:</strong> {formatVND(Math.max(0, selectedOrder.tongTien - selectedOrder.daThanhToan))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-6">
              <div>
                <div className="font-bold">Người lập phiếu</div>
                <div className="text-slate-400 mt-12">(Ký, họ tên)</div>
              </div>
              <div>
                <div className="font-bold">Thủ kho</div>
                <div className="text-slate-400 mt-12">(Ký, họ tên)</div>
              </div>
              <div>
                <div className="font-bold">Đại diện khách hàng</div>
                <div className="text-slate-400 mt-12">(Ký, họ tên)</div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPrintOrderModal(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#003087] text-white"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                In ngay
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Offcanvas Lịch Sự Kiện Đa Năng Chuẩn client-skydoor ── */}
      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
};

export default SalesOrderTrackingPage;

