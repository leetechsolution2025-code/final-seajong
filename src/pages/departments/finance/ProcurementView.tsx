import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash,
  CheckCircle,
  ClockHistory,
  SlashCircle,
  ExclamationCircle,
  Truck,
  Building,
  Calendar3,
  Person,
  CurrencyDollar,
  Check2All,
  Cart3,
  BoxSeam,
  ChevronDown,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import {
  DepartmentSelect,
  useDepartmentOptions,
  matchDepartment,
} from '../../../components/common/DepartmentSelect';
import { TableToolbar } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import { PrintPreviewModal, type POOrderGroup } from './PrintPreviewModal';
import { OrderDetailOffcanvas } from './OrderDetailOffcanvas';

// ==========================================
// 1. DATA TYPES
// ==========================================
export type RequisitionStatus = 'pending' | 'approved' | 'processing' | 'rejected';
export type OrderStatus = 'waiting_delivery' | 'shipping' | 'partial' | 'inspecting';

export interface RequisitionProductItem {
  id: string;
  name: string;
  spec?: string;
  unit: string;
  quantity: number;
  estimatedPrice: string;
  totalPrice: string;
}

export interface PurchaseRequisitionItem {
  id: string;
  code: string;
  orderCode?: string;
  orderName?: string;
  reason: string;
  department: string;
  departmentKey: string;
  requester: string;
  createdAt: string;
  createdDateKey: string; // '2026-10-01'
  requiredDate: string; // Ngày cần hàng: '08/10/2026'
  estimatedCost: string;
  status: RequisitionStatus;
  statusLabel: string;
  items?: RequisitionProductItem[];
}

export const AVAILABLE_ORDERS = [
  { code: 'ĐH-2026-001', name: 'Dự án Biệt thự Starlake Tây Hồ Tây' },
  { code: 'ĐH-2026-002', name: 'Dự án Khu đô thị sinh thái Aqua City' },
  { code: 'ĐH-2026-003', name: 'Dự án Tòa nhà văn phòng Lancaster Luminaire' },
  { code: 'ĐH-2026-004', name: 'Dự án Chung cư cao cấp Masteri Centre Point' },
  { code: 'ĐH-2026-005', name: 'Dự án Khách sạn và Nghỉ dưỡng Flamingo Hải Tiến' },
  { code: 'ĐH-2026-006', name: 'Đơn hàng nội bộ - Trang thiết bị Xưởng sản xuất' },
];

export interface PurchaseOrderItem {
  id: string;
  code: string;
  supplierName: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: string;
  status: OrderStatus;
  statusLabel: string;
  requester?: string;
  note?: string;
}

export interface CompletedOrderItem {
  id: string;
  code: string;
  supplierName: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: string;
  completedDate: string;
  note?: string;
}

// ==========================================
// 2. INITIAL DATA
// ==========================================
const INITIAL_REQUISITIONS: PurchaseRequisitionItem[] = [];
const INITIAL_ORDERS: PurchaseOrderItem[] = [];
const SUPPLIER_ADDRESS_MAP: Record<string, string> = {
  'Công ty Cổ phần Gỗ An Cường': 'Số 702/1G Đường DT 743, KP. Đông Chiêu, P. Tân Đông Hiệp, Dĩ An, Bình Dương',
  'Công ty TNHH Hafele Việt Nam': 'Tầng 3 Tòa nhà REE Tower, Số 9 Đoàn Văn Bơ, Phường 12, Quận 4, TP. Hồ Chí Minh',
  'Tập đoàn Hóa chất và Sơn Inchem Toa': 'Lô B2 Đường số 5, KCN Tân Bình, Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh',
  'Công ty CP Vật liệu Chống cháy IBST Tech': 'Khu công nghiệp Khai Sơn, Xã Thanh Khương, Huyện Thuận Thành, Bắc Ninh',
  'Công ty Kính Nổi Viglacera (VFG)': 'Khu công nghiệp Yên Phong, Xã Yên Trung, Huyện Yên Phong, Bắc Ninh',
  'Công ty Phụ kiện Ngũ kim KinLong': 'Tầng 3 Tòa nhà Grandeur Palace, 138B Giảng Võ, Ba Đình, Hà Nội',
  'Công ty TNHH Keo dán Henkel Titebond': 'Đường 10, KCN Biên Hòa 2, Phường An Bình, TP. Biên Hòa, Đồng Nai',
  'Công ty TNHH Sơn Jotun Việt Nam': 'Số 1 Đường 10, KCN Sóng Thần 1, Dĩ An, Bình Dương',
  'Công ty CP Cơ khí và Dụng cụ Makita Việt Nam': 'Kho 6, Đường số 3, KCN Tân Đông Hiệp B, Dĩ An, Bình Dương',
};

const getSupplierAddress = (name: string): string => {
  return SUPPLIER_ADDRESS_MAP[name] || 'Khu công nghiệp Quang Minh, Mê Linh, Hà Nội';
};
const INITIAL_COMPLETED_ORDERS: CompletedOrderItem[] = [];

export interface ProcurementViewProps {
  currentStep: number;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({ currentStep, onShowToast }) => {
  // ==========================================
  // STATE BƯỚC 1: YÊU CẦU MUA HÀNG
  // ==========================================
  const [requisitions, setRequisitions] = useState<PurchaseRequisitionItem[]>(INITIAL_REQUISITIONS);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [collapsedOrders, setCollapsedOrders] = useState<Record<string, boolean>>({});
  const [reqStatusFilter, setReqStatusFilter] = useState('all');
  const [reqDepartmentFilter, setReqDepartmentFilter] = useState('all');
  const { options: reqDeptOptions } = useDepartmentOptions({
    includeAll: true,
    allLabel: 'Tất cả bộ phận',
  });
  const [reqTimeFilter, setReqTimeFilter] = useState('all');
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [reqCurrentPage, setReqCurrentPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);
  const [isReqOffcanvasOpen, setIsReqOffcanvasOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<PurchaseRequisitionItem | null>(null);
  const [viewingReq, setViewingReq] = useState<PurchaseRequisitionItem | null>(null);
  const [isReqDetailOpen, setIsReqDetailOpen] = useState(false);
  const [isDeleteReqDialogOpen, setIsDeleteReqDialogOpen] = useState(false);
  const [isDeleteSingleReqDialogOpen, setIsDeleteSingleReqDialogOpen] = useState(false);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [poTargetRequisitions, setPoTargetRequisitions] = useState<PurchaseRequisitionItem[]>([]);

  const [reqForm, setReqForm] = useState({
    code: '',
    orderCode: 'ĐH-2026-001',
    orderName: 'Dự án Biệt thự Starlake Tây Hồ Tây',
    reason: '',
    department: 'Xưởng Sản xuất gỗ',
    requester: '',
    requiredDate: '08/10/2026',
    estimatedCost: '',
    status: 'pending' as RequisitionStatus,
  });

  // ==========================================
  // STATE BƯỚC 2: ĐƠN HÀNG (PO)
  // ==========================================
  const [orders, setOrders] = useState<PurchaseOrderItem[]>(INITIAL_ORDERS);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(10);
  const [isOrderOffcanvasOpen, setIsOrderOffcanvasOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderItem | null>(null);
  const [isCreateBlankOrderOpen, setIsCreateBlankOrderOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<PurchaseOrderItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);

  const [orderForm, setOrderForm] = useState({
    code: '',
    supplierName: '',
    orderDate: '',
    deliveryDate: '',
    totalAmount: '',
    status: 'waiting_delivery' as OrderStatus,
    requester: '',
    note: '',
  });

  // ==========================================
  // STATE BƯỚC 3: ĐÃ HOÀN THÀNH
  // ==========================================
  const [completedOrders, setCompletedOrders] = useState<CompletedOrderItem[]>(INITIAL_COMPLETED_ORDERS);
  const [selectedCompletedIds, setSelectedCompletedIds] = useState<string[]>([]);
  const [completedSearchQuery, setCompletedSearchQuery] = useState('');
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const [completedPageSize, setCompletedPageSize] = useState(10);
  const [isCompletedOffcanvasOpen, setIsCompletedOffcanvasOpen] = useState(false);
  const [viewingCompletedOrder, setViewingCompletedOrder] = useState<CompletedOrderItem | null>(null);
  const [isDeleteCompletedDialogOpen, setIsDeleteCompletedDialogOpen] = useState(false);
  const [, setIsLoading] = useState(false);

  const fetchRequisitions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/procurement/requisitions');
      if (res.ok) {
        const data = await res.json();
        setRequisitions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu mua hàng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/procurement/orders');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const active = data.filter((o: any) => o.status !== 'completed');
          const completed = data
            .filter((o: any) => o.status === 'completed')
            .map((o: any) => ({
              id: o.id,
              code: o.code,
              supplierName: o.supplierName,
              orderDate: o.orderDate,
              deliveryDate: o.deliveryDate,
              totalAmount: o.totalAmount,
              completedDate: o.completedDate || o.deliveryDate,
              note: o.note,
            }));
          setOrders(active);
          setCompletedOrders(completed);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn đặt hàng PO:', err);
    }
  };

  React.useEffect(() => {
    fetchRequisitions();
    fetchOrders();

    const handleSync = () => {
      fetchRequisitions();
      fetchOrders();
    };

    window.addEventListener('decodoor_procurement_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('decodoor_procurement_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleDeleteCompletedOrdersConfirm = async () => {
    try {
      await Promise.all(selectedCompletedIds.map(id => fetch(`/api/procurement/orders/${id}`, { method: 'DELETE' })));
      await fetchOrders();
    } catch (e) {
      console.error(e);
    }
    if (onShowToast) onShowToast('success', 'Đã xoá', `Đã xoá ${selectedCompletedIds.length} đơn hàng hoàn thành.`);
    setSelectedCompletedIds([]);
    setIsDeleteCompletedDialogOpen(false);
  };

  // ==========================================
  // HANDLERS BƯỚC 1: YÊU CẦU MUA HÀNG
  // ==========================================
  const handleOpenAddReq = () => {
    setEditingReq(null);
    const nextIdx = requisitions.length + 1;
    setReqForm({
      code: `YCMH-2026-${String(nextIdx).padStart(3, '0')}`,
      orderCode: 'ĐH-2026-001',
      orderName: 'Dự án Biệt thự Starlake Tây Hồ Tây',
      reason: '',
      department: 'Xưởng Sản xuất gỗ',
      requester: 'Hà Hải Lâm (CEO)',
      requiredDate: '08/10/2026',
      estimatedCost: '',
      status: 'pending',
    });
    setIsReqOffcanvasOpen(true);
  };

  const handlePurchaseSingleReq = (item: PurchaseRequisitionItem | null) => {
    if (!item) return;
    setIsReqDetailOpen(false);
    setPoTargetRequisitions([item]);
    setIsCreatePOModalOpen(true);
  };

  const handleOpenDetailReq = (item: PurchaseRequisitionItem) => {
    setViewingReq(item);
    setIsReqDetailOpen(true);
  };

  const handleRejectReq = (item: PurchaseRequisitionItem | null) => {
    if (!item) return;
    setRequisitions((prev) =>
      prev.map((r) =>
        r.id === item.id ? { ...r, status: 'rejected', statusLabel: 'Từ chối' } : r
      )
    );
    setViewingReq((prev) => (prev ? { ...prev, status: 'rejected', statusLabel: 'Từ chối' } : null));
    if (onShowToast) {
      onShowToast('warning', 'Từ chối yêu cầu', `Đã chuyển yêu cầu ${item.code} sang trạng thái Từ chối.`);
    }
  };

  const handleDeleteSingleReqConfirm = async () => {
    if (!viewingReq) return;
    const reqCode = viewingReq.code;
    try {
      await fetch(`/api/procurement/requisitions/${viewingReq.id}`, { method: 'DELETE' });
      await fetchRequisitions();
    } catch (e) {
      console.error(e);
    }
    setSelectedReqIds((prev) => prev.filter((id) => id !== viewingReq.id));
    setIsDeleteSingleReqDialogOpen(false);
    setIsReqDetailOpen(false);
    setViewingReq(null);
    if (onShowToast) {
      onShowToast('success', 'Xoá thành công', `Đã xoá yêu cầu mua hàng ${reqCode}.`);
    }
  };

  const handleReqFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqForm.reason.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập lý do / mục đích mua hàng.');
      return;
    }

    const statusMap: Record<RequisitionStatus, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      processing: 'Đang xử lý',
      rejected: 'Từ chối',
    };

    if (editingReq) {
      setRequisitions((prev) =>
        prev.map((r) =>
          r.id === editingReq.id
            ? {
                ...r,
                orderCode: reqForm.orderCode,
                orderName: reqForm.orderName,
                reason: reqForm.reason.trim(),
                department: reqForm.department,
                requester: reqForm.requester.trim() || 'Người yêu cầu',
                requiredDate: reqForm.requiredDate.trim() || r.requiredDate,
                estimatedCost: reqForm.estimatedCost.trim() || '0 đ',
                status: reqForm.status,
                statusLabel: statusMap[reqForm.status],
              }
            : r
        )
      );
      setIsReqOffcanvasOpen(false);
      setEditingReq(null);
      if (onShowToast) onShowToast('success', 'Cập nhật thành công', `Đã cập nhật yêu cầu ${reqForm.code}.`);
    } else {
      const newReq: PurchaseRequisitionItem = {
        id: `PR-${Date.now()}`,
        code: reqForm.code || `YCMH-2026-${String(requisitions.length + 1).padStart(3, '0')}`,
        orderCode: reqForm.orderCode,
        orderName: reqForm.orderName,
        reason: reqForm.reason.trim(),
        department: reqForm.department,
        departmentKey: 'production',
        requester: reqForm.requester.trim() || 'Người yêu cầu',
        createdAt: new Date().toLocaleDateString('vi-VN'),
        createdDateKey: new Date().toISOString().split('T')[0],
        requiredDate: reqForm.requiredDate.trim() || '08/10/2026',
        estimatedCost: reqForm.estimatedCost.trim() || '0 đ',
        status: reqForm.status,
        statusLabel: statusMap[reqForm.status],
      };
      setRequisitions([newReq, ...requisitions]);
      setIsReqOffcanvasOpen(false);
      if (onShowToast) onShowToast('success', 'Thêm mới thành công', `Đã tạo yêu cầu mua hàng ${newReq.code}.`);
    }
  };

  const handleDeleteReqsConfirm = () => {
    setRequisitions((prev) => prev.filter((r) => !selectedReqIds.includes(r.id)));
    if (onShowToast) onShowToast('success', 'Đã xoá', `Đã xoá ${selectedReqIds.length} yêu cầu mua hàng.`);
    setSelectedReqIds([]);
    setIsDeleteReqDialogOpen(false);
  };

  const toggleSelectReq = (id: string) => {
    setSelectedReqIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Filter và Pagination Bước 1
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((item) => {
      if (reqStatusFilter !== 'all' && item.status !== reqStatusFilter) return false;
      if (reqDepartmentFilter !== 'all' && !matchDepartment(item.department || item.departmentKey, reqDepartmentFilter)) return false;
      if (reqSearchQuery.trim()) {
        const q = reqSearchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchReason = item.reason.toLowerCase().includes(q);
        const matchDept = item.department.toLowerCase().includes(q);
        const matchReq = item.requester.toLowerCase().includes(q);
        const matchOrder =
          (item.orderCode || '').toLowerCase().includes(q) ||
          (item.orderName || '').toLowerCase().includes(q);
        if (!matchCode && !matchReason && !matchDept && !matchReq && !matchOrder) return false;
      }
      return true;
    });
  }, [requisitions, reqStatusFilter, reqDepartmentFilter, reqSearchQuery]);

  // Grouping by Order Code for Step 1
  const groupedRequisitions = useMemo(() => {
    const map = new Map<
      string,
      {
        orderCode: string;
        orderName: string;
        requisitions: PurchaseRequisitionItem[];
        totalCost: number;
      }
    >();

    filteredRequisitions.forEach((req) => {
      const code = req.orderCode || 'ĐH-KHAC';
      const name = req.orderName || (code === 'ĐH-KHAC' ? 'Đơn hàng và Nhu cầu khác' : `Đơn hàng ${code}`);
      if (!map.has(code)) {
        map.set(code, {
          orderCode: code,
          orderName: name,
          requisitions: [],
          totalCost: 0,
        });
      }
      const grp = map.get(code)!;
      grp.requisitions.push(req);

      const rawCost = parseInt((req.estimatedCost || '').replace(/[^\d]/g, ''), 10) || 0;
      grp.totalCost += rawCost;
    });

    return Array.from(map.values()).map((grp) => ({
      ...grp,
      totalCostText: grp.totalCost > 0 ? `${grp.totalCost.toLocaleString('vi-VN')} đ` : '',
    }));
  }, [filteredRequisitions]);

  // Pagination for Order Groups
  const paginatedOrderGroups = useMemo(() => {
    const start = (reqCurrentPage - 1) * reqPageSize;
    return groupedRequisitions.slice(start, start + reqPageSize);
  }, [groupedRequisitions, reqCurrentPage, reqPageSize]);

  const toggleOrderCollapse = (orderCode: string) => {
    setCollapsedOrders((prev) => ({
      ...prev,
      [orderCode]: !prev[orderCode],
    }));
  };

  const handleProceedToPurchase = () => {
    if (selectedReqIds.length === 0) return;
    const selectedReqs = requisitions.filter((r) => selectedReqIds.includes(r.id));
    setPoTargetRequisitions(selectedReqs);
    setIsCreatePOModalOpen(true);
  };

  const handleConfirmCreateOrders = async (newOrders: PurchaseOrderItem[], processedReqIds: string[]) => {
    try {
      for (const order of newOrders) {
        await fetch('/api/procurement/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: order.code,
            supplierName: order.supplierName,
            supplierAddress: getSupplierAddress(order.supplierName),
            orderDate: order.orderDate,
            deliveryDate: order.deliveryDate,
            totalAmount: order.totalAmount,
            status: order.status,
            statusLabel: order.statusLabel,
            requester: order.requester,
            note: order.note,
          }),
        });
      }

      for (const reqId of processedReqIds) {
        await fetch(`/api/procurement/requisitions/${reqId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'processing',
            statusLabel: 'Đang xử lý',
          }),
        });
      }

      await fetchRequisitions();
      await fetchOrders();
    } catch (e) {
      console.error('Lỗi tạo PO từ YCMH:', e);
    }

    setSelectedReqIds((prev) => prev.filter((id) => !processedReqIds.includes(id)));
  };

  // ==========================================
  // HANDLERS BƯỚC 2: ĐƠN HÀNG (PO)
  // ==========================================
  const handleOpenAddOrder = () => {
    setEditingOrder(null);
    const nextIdx = orders.length + 1;
    const now = new Date();
    const after7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setOrderForm({
      code: `PO-2026-${String(nextIdx).padStart(3, '0')}`,
      supplierName: '',
      orderDate: now.toLocaleDateString('vi-VN'),
      deliveryDate: after7Days.toLocaleDateString('vi-VN'),
      totalAmount: '',
      status: 'waiting_delivery',
      requester: 'Bộ phận Mua sắm',
      note: '',
    });
    setIsCreateBlankOrderOpen(true);
  };

  const handleOpenEditOrder = (item: PurchaseOrderItem) => {
    setEditingOrder(item);
    setIsOrderOffcanvasOpen(true);
  };

  const handlePrintSingleOrder = (po: PurchaseOrderItem) => {
    setPrintingOrder(po);
    setIsPrintModalOpen(true);
  };

  const printOrderGroups: POOrderGroup[] = useMemo(() => {
    if (!printingOrder) return [];
    const totalNum = parseInt((printingOrder.totalAmount || '').replace(/[^\d]/g, ''), 10) || 0;
    return [
      {
        supplier: {
          id: `sup-${printingOrder.supplierName}`,
          code: 'NCC-01',
          name: printingOrder.supplierName,
          phone: '024 3553 6666',
          defaultPaymentTerm: 'Chuyển khoản',
          category: 'Vật tư',
        },
        lines: [
          {
            id: `line-${printingOrder.id}`,
            reqId: 'REQ-01',
            reqCode: 'YCMH-01',
            productName: `Vật tư và Phụ kiện đơn ${printingOrder.code}`,
            unit: 'Bộ',
            actualQuantity: 1,
            quantity: 1,
            unitPrice: totalNum,
            totalPrice: totalNum,
            supplierId: `sup-${printingOrder.supplierName}`,
            supplierName: printingOrder.supplierName,
            deliveryDate: printingOrder.deliveryDate,
            note: printingOrder.note,
          },
        ],
        total: totalNum,
      },
    ];
  }, [printingOrder]);

  const handleOrderFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.supplierName.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên nhà cung cấp.');
      return;
    }

    const statusMap: Record<OrderStatus, string> = {
      waiting_delivery: 'Chờ giao hàng',
      shipping: 'Đang vận chuyển',
      partial: 'Đã giao một phần',
      inspecting: 'Đang kiểm tra',
    };

    if (editingOrder) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                supplierName: orderForm.supplierName.trim(),
                orderDate: orderForm.orderDate || o.orderDate,
                deliveryDate: orderForm.deliveryDate || o.deliveryDate,
                totalAmount: orderForm.totalAmount.trim() || '0 đ',
                status: orderForm.status,
                statusLabel: statusMap[orderForm.status],
                note: orderForm.note.trim() || undefined,
              }
            : o
        )
      );
      setIsOrderOffcanvasOpen(false);
      setEditingOrder(null);
      if (onShowToast) onShowToast('success', 'Cập nhật thành công', `Đã cập nhật đơn hàng ${orderForm.code}.`);
    } else {
      const newOrder: PurchaseOrderItem = {
        id: `PO-${Date.now()}`,
        code: orderForm.code || `PO-2026-${String(orders.length + 1).padStart(3, '0')}`,
        supplierName: orderForm.supplierName.trim(),
        orderDate: orderForm.orderDate || new Date().toLocaleDateString('vi-VN'),
        deliveryDate: orderForm.deliveryDate || new Date().toLocaleDateString('vi-VN'),
        totalAmount: orderForm.totalAmount.trim() || '0 đ',
        status: orderForm.status,
        statusLabel: statusMap[orderForm.status],
        requester: orderForm.requester || 'Bộ phận Mua sắm',
        note: orderForm.note.trim() || undefined,
      };
      setOrders([newOrder, ...orders]);
      setIsCreateBlankOrderOpen(false);
      if (onShowToast) onShowToast('success', 'Thêm mới thành công', `Đã lập đơn hàng mua ${newOrder.code}.`);
    }
  };

  const handleDeleteOrdersConfirm = async () => {
    try {
      await Promise.all(selectedOrderIds.map(id => fetch(`/api/procurement/orders/${id}`, { method: 'DELETE' })));
      await fetchOrders();
    } catch (e) {
      console.error(e);
    }
    if (onShowToast) onShowToast('success', 'Đã xoá', `Đã xoá ${selectedOrderIds.length} đơn hàng.`);
    setSelectedOrderIds([]);
    setIsDeleteOrderDialogOpen(false);
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSupplierCollapse = (supplierName: string) => {
    setCollapsedSuppliers((prev) => ({
      ...prev,
      [supplierName]: !prev[supplierName],
    }));
  };

  // Filter và Grouping Bước 2: Gom đơn hàng theo Nhà cung cấp
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      if (orderStatusFilter !== 'all' && item.status !== orderStatusFilter) return false;
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchSupplier = item.supplierName.toLowerCase().includes(q);
        const matchRequester = (item.requester || '').toLowerCase().includes(q);
        const matchVal = item.totalAmount.toLowerCase().includes(q);
        if (!matchCode && !matchSupplier && !matchRequester && !matchVal) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  const groupedOrders = useMemo(() => {
    const map = new Map<
      string,
      {
        supplierName: string;
        supplierAddress: string;
        orders: PurchaseOrderItem[];
        totalAmountNum: number;
      }
    >();

    filteredOrders.forEach((order) => {
      const sup = order.supplierName || 'Nhà cung cấp khác';
      if (!map.has(sup)) {
        map.set(sup, {
          supplierName: sup,
          supplierAddress: getSupplierAddress(sup),
          orders: [],
          totalAmountNum: 0,
        });
      }
      const grp = map.get(sup)!;
      grp.orders.push(order);
      const rawVal = parseInt((order.totalAmount || '').replace(/[^\d]/g, ''), 10) || 0;
      grp.totalAmountNum += rawVal;
    });

    return Array.from(map.values()).map((grp) => ({
      ...grp,
      totalAmountDisplay: grp.totalAmountNum > 0 ? `${grp.totalAmountNum.toLocaleString('vi-VN')} đ` : '0 đ',
    }));
  }, [filteredOrders]);

  const paginatedSupplierGroups = useMemo(() => {
    const start = (orderCurrentPage - 1) * orderPageSize;
    return groupedOrders.slice(start, start + orderPageSize);
  }, [groupedOrders, orderCurrentPage, orderPageSize]);

  const currentPageOrders = useMemo(() => {
    return paginatedSupplierGroups.flatMap((g) => g.orders);
  }, [paginatedSupplierGroups]);

  // ==========================================
  // HANDLERS BƯỚC 3: ĐÃ HOÀN THÀNH
  // ==========================================
  const toggleSelectCompleted = (id: string) => {
    setSelectedCompletedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter((item) => {
      if (completedSearchQuery.trim()) {
        const q = completedSearchQuery.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchSupplier = item.supplierName.toLowerCase().includes(q);
        const matchVal = item.totalAmount.toLowerCase().includes(q);
        if (!matchCode && !matchSupplier && !matchVal) return false;
      }
      return true;
    });
  }, [completedOrders, completedSearchQuery]);

  const paginatedCompletedOrders = useMemo(() => {
    const start = (completedCurrentPage - 1) * completedPageSize;
    return filteredCompletedOrders.slice(start, start + completedPageSize);
  }, [filteredCompletedOrders, completedCurrentPage, completedPageSize]);

  // ==========================================
  // BADGE STATUS RENDERERS
  // ==========================================
  const renderReqStatusBadge = (status: RequisitionStatus, label: string) => {
    const badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.6875rem',
      padding: '2.5px 8px',
      lineHeight: 1.25,
      fontWeight: 600,
    };
    switch (status) {
      case 'approved':
        return (
          <span className="badge badge-success" style={badgeStyle}>
            <CheckCircle size={11} />
            {label}
          </span>
        );
      case 'pending':
        return (
          <span className="badge badge-warning" style={badgeStyle}>
            <ClockHistory size={11} />
            {label}
          </span>
        );
      case 'processing':
        return (
          <span className="badge badge-info" style={badgeStyle}>
            <ClockHistory size={11} />
            {label}
          </span>
        );
      case 'rejected':
      default:
        return (
          <span className="badge badge-danger" style={badgeStyle}>
            <SlashCircle size={11} />
            {label}
          </span>
        );
    }
  };

  const renderOrderStatusBadge = (status: OrderStatus, label: string) => {
    const badgeStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.6875rem',
      padding: '2.5px 8px',
      lineHeight: 1.25,
      fontWeight: 600,
    };
    switch (status) {
      case 'waiting_delivery':
        return (
          <span className="badge badge-warning" style={badgeStyle}>
            <ClockHistory size={11} />
            {label}
          </span>
        );
      case 'shipping':
        return (
          <span className="badge badge-info" style={badgeStyle}>
            <Truck size={11} />
            {label}
          </span>
        );
      case 'partial':
        return (
          <span
            className="badge badge-indigo"
            style={{
              ...badgeStyle,
              backgroundColor: '#818cf820',
              color: '#6366f1',
              border: '1px solid #6366f140',
            }}
          >
            <ExclamationCircle size={11} />
            {label}
          </span>
        );
      case 'inspecting':
      default:
        return (
          <span className="badge badge-secondary" style={badgeStyle}>
            <Check2All size={11} />
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
      {/* BƯỚC 1: YÊU CẦU MUA HÀNG                                   */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <>
          {/* Dòng thanh công cụ: Lọc trạng thái, Lọc bộ phận, Chọn thời gian, Hộp tìm kiếm, Nút thêm mới */}
          <TableToolbar
            showMenu={false}
            searchValue={reqSearchQuery}
            onSearchChange={(val) => {
              setReqSearchQuery(val);
              setReqCurrentPage(1);
            }}
            searchPlaceholder="Tìm kiếm theo mã yêu cầu, lý do, người đề xuất..."
            searchMinWidth="220px"
            filters={[
              {
                id: 'req-status',
                value: reqStatusFilter,
                onChange: (val) => {
                  setReqStatusFilter(val);
                  setReqCurrentPage(1);
                },
                minWidth: '150px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'pending', label: 'Chờ duyệt' },
                  { value: 'approved', label: 'Đã duyệt' },
                  { value: 'processing', label: 'Đang xử lý' },
                  { value: 'rejected', label: 'Từ chối' },
                ],
              },
              {
                id: 'req-department',
                value: reqDepartmentFilter,
                onChange: (val) => {
                  setReqDepartmentFilter(val);
                  setReqCurrentPage(1);
                },
                minWidth: '170px',
                options: reqDeptOptions,
              },
              {
                id: 'req-time',
                value: reqTimeFilter,
                onChange: (val) => {
                  setReqTimeFilter(val);
                  setReqCurrentPage(1);
                },
                minWidth: '150px',
                options: [
                  { value: 'all', label: 'Tất cả thời gian' },
                  { value: 'today', label: 'Hôm nay' },
                  { value: 'this_week', label: 'Tuần này' },
                  { value: 'this_month', label: 'Tháng này' },
                  { value: 'this_quarter', label: 'Quý này' },
                ],
              },
            ]}
            actionsAfterSearch={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={handleOpenAddReq}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Thêm mới
                </Button>

                {selectedReqIds.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Cart3 size={15} />}
                    onClick={handleProceedToPurchase}
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Mua hàng</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        padding: selectedReqIds.length >= 10 ? '0 5px' : '0',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        color: 'var(--color-primary, #2563eb)',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      {selectedReqIds.length}
                    </span>
                  </Button>
                )}
              </div>
            }
            style={{
              marginBottom: '4px',
              padding: '8px 16px 4px 16px',
            }}
          />

          {/* Bảng Yêu cầu mua hàng gom theo Đơn hàng */}
          <div
            className="table-responsive custom-scrollbar"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--bg-surface-1)',
            }}
          >
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <th style={{ width: '38px', textAlign: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border-default)' }}>
                    <input
                      type="checkbox"
                      className="decodoor-checkbox"
                      checked={
                        filteredRequisitions.length > 0 &&
                        filteredRequisitions.every((r) => selectedReqIds.includes(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = filteredRequisitions.map((r) => r.id);
                          setSelectedReqIds(Array.from(new Set([...selectedReqIds, ...allIds])));
                        } else {
                          const allIds = new Set(filteredRequisitions.map((r) => r.id));
                          setSelectedReqIds(selectedReqIds.filter((id) => !allIds.has(id)));
                        }
                      }}
                    />
                  </th>
                  <th style={{ width: '135px', textAlign: 'left', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Mã yêu cầu
                  </th>
                  <th style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Lý do
                  </th>
                  <th style={{ width: '115px', textAlign: 'center', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrderGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Không tìm thấy yêu cầu mua hàng phù hợp điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedOrderGroups.map((group) => {
                    const isCollapsed = !!collapsedOrders[group.orderCode];

                    return (
                      <React.Fragment key={group.orderCode}>
                        {/* HÀNG TIÊU ĐỀ NHÓM ĐƠN HÀNG (Không có checkbox, chevron ở cột đầu) */}
                        <tr
                          onClick={() => toggleOrderCollapse(group.orderCode)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            borderTop: '1px solid #cbd5e1',
                            borderBottom: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                          title={`Nhấn để ${isCollapsed ? 'mở rộng' : 'thu gọn'} đơn hàng ${group.orderCode}`}
                        >
                          {/* Cột 1: Nút mũi tên đóng/mở (Thay thế checkbox) */}
                          <td
                            style={{ textAlign: 'center', padding: '9px 10px', verticalAlign: 'middle' }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                color: '#475569',
                              }}
                            >
                              <ChevronDown size={13} />
                            </span>
                          </td>

                          {/* Cột 2-4: Thông tin đơn hàng và Tổng dự toán */}
                          <td colSpan={3} style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontFamily: "'Roboto Condensed', sans-serif",
                                    fontWeight: 800,
                                    fontSize: '0.78125rem',
                                    color: '#1e40af',
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  ĐƠN HÀNG: {group.orderCode}
                                </span>
                                <span style={{ color: '#475569', fontSize: '0.71875rem', fontWeight: 600 }}>
                                  — {group.orderName}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.6875rem' }}>
                                <span
                                  style={{
                                    backgroundColor: '#e0f2fe',
                                    color: '#0369a1',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    fontSize: '0.65625rem',
                                    border: '1px solid #bae6fd',
                                  }}
                                >
                                  {group.requisitions.length} yêu cầu
                                </span>
                                {group.totalCostText && (
                                  <span style={{ color: '#475569', fontWeight: 600 }}>
                                    Tổng dự toán:{' '}
                                    <strong style={{ color: '#1d4ed8', fontWeight: 800 }}>
                                      {group.totalCostText}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* CÁC DÒNG YÊU CẦU MUA HÀNG THUỘC ĐƠN HÀNG */}
                        {!isCollapsed &&
                          group.requisitions.map((item) => {
                            const isSelected = selectedReqIds.includes(item.id);
                            return (
                              <tr
                                key={item.id}
                                className={isSelected ? 'is-selected' : ''}
                                onClick={() => handleOpenDetailReq(item)}
                                style={{
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border-default)',
                                  backgroundColor: isSelected ? 'var(--bg-surface-2)' : '#ffffff',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                                }}
                                title="Nhấn để xem thông tin chi tiết yêu cầu mua hàng"
                              >
                                {/* 1. Checkbox */}
                                <td
                                  style={{ textAlign: 'center', padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    className="decodoor-checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectReq(item.id)}
                                  />
                                </td>

                                {/* 2. Mã yêu cầu (Tuyệt đối không áp dụng bất kỳ icon nào, hiển thị mã trực tiếp) */}
                                <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  <span
                                    style={{
                                      fontFamily: "'Roboto Condensed', sans-serif",
                                      fontWeight: 700,
                                      color: 'var(--color-primary, #2563eb)',
                                      fontSize: '0.75rem',
                                      letterSpacing: '0.01em',
                                      display: 'block',
                                      lineHeight: 1.25,
                                    }}
                                  >
                                    {item.code}
                                  </span>
                                  <div style={{ fontSize: '0.65625rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.2 }}>
                                    Ngày cần: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.requiredDate}</span>
                                  </div>
                                </td>

                                {/* 3. Lý do (Nội dung yêu cầu mua hàng - giảm cỡ chữ xuống một chút, rút gọn khoảng cách) */}
                                <td style={{ padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem', marginBottom: '2px', lineHeight: 1.3 }}>
                                    {item.reason}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65625rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <Building size={9.5} style={{ color: 'var(--text-muted)' }} />
                                      {item.department}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <Person size={9.5} style={{ color: 'var(--text-muted)' }} />
                                      {item.requester}
                                    </span>
                                    {item.estimatedCost && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-primary)', fontWeight: 600 }}>
                                        <CurrencyDollar size={9.5} />
                                        Dự toán: {item.estimatedCost}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 4. Trạng thái */}
                                <td style={{ textAlign: 'center', padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  {renderReqStatusBadge(item.status, item.statusLabel)}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Component Pagination Bước 1 */}
          <Pagination
            currentPage={reqCurrentPage}
            totalItems={groupedRequisitions.length}
            pageSize={reqPageSize}
            onPageChange={setReqCurrentPage}
            onPageSizeChange={(newSize) => {
              setReqPageSize(newSize);
              setReqCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
          />
        </>
      )}

      {/* ========================================================= */}
      {/* BƯỚC 2: ĐƠN HÀNG (PO)                                      */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <>
          {/* Dòng thanh công cụ: Lọc trạng thái, Hộp tìm kiếm, Nút thêm mới */}
          <TableToolbar
            showMenu={false}
            searchValue={orderSearchQuery}
            onSearchChange={(val) => {
              setOrderSearchQuery(val);
              setOrderCurrentPage(1);
            }}
            searchPlaceholder="Tìm kiếm theo mã đơn hàng, nhà cung cấp, giá trị..."
            searchMinWidth="240px"
            filters={[
              {
                id: 'order-status',
                value: orderStatusFilter,
                onChange: (val) => {
                  setOrderStatusFilter(val);
                  setOrderCurrentPage(1);
                },
                minWidth: '180px',
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'waiting_delivery', label: 'Chờ giao hàng' },
                  { value: 'shipping', label: 'Đang vận chuyển' },
                  { value: 'partial', label: 'Đã giao một phần' },
                  { value: 'inspecting', label: 'Đang kiểm tra' },
                ],
              },
            ]}
            actionsAfterSearch={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={handleOpenAddOrder}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Thêm mới
                </Button>

                {selectedOrderIds.length > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash size={14} />}
                    onClick={() => setIsDeleteOrderDialogOpen(true)}
                    style={{
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Xoá</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        padding: selectedOrderIds.length >= 10 ? '0 5px' : '0',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        color: '#ef4444',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      {selectedOrderIds.length}
                    </span>
                  </Button>
                )}
              </div>
            }
            style={{
              marginBottom: '4px',
              padding: '8px 16px 4px 16px',
            }}
          />

          {/* Bảng Đơn hàng gom nhóm theo Nhà cung cấp */}
          <div
            className="table-responsive custom-scrollbar"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--bg-surface-1)',
            }}
          >
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <th style={{ width: '38px', textAlign: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border-default)' }}>
                    <input
                      type="checkbox"
                      className="decodoor-checkbox"
                      checked={
                        currentPageOrders.length > 0 &&
                        currentPageOrders.every((o) => selectedOrderIds.includes(o.id))
                      }
                      ref={(el) => {
                        if (el) {
                          el.indeterminate =
                            currentPageOrders.some((o) => selectedOrderIds.includes(o.id)) &&
                            !currentPageOrders.every((o) => selectedOrderIds.includes(o.id));
                        }
                      }}
                      onChange={(e) => {
                        const pageIds = currentPageOrders.map((o) => o.id);
                        if (e.target.checked) {
                          setSelectedOrderIds(Array.from(new Set([...selectedOrderIds, ...pageIds])));
                        } else {
                          const pageIdSet = new Set(pageIds);
                          setSelectedOrderIds(selectedOrderIds.filter((id) => !pageIdSet.has(id)));
                        }
                      }}
                    />
                  </th>
                  <th style={{ width: '135px', textAlign: 'left', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Mã đơn hàng
                  </th>
                  <th style={{ width: '150px', textAlign: 'center', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Trạng thái
                  </th>
                  <th style={{ width: '120px', textAlign: 'center', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Ngày tạo đơn
                  </th>
                  <th style={{ width: '120px', textAlign: 'center', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Ngày nhận hàng
                  </th>
                  <th style={{ textAlign: 'right', padding: '7px 16px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Giá trị
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSupplierGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Không có đơn hàng nào phù hợp điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  paginatedSupplierGroups.map((group) => {
                    const isCollapsed = !!collapsedSuppliers[group.supplierName];

                    return (
                      <React.Fragment key={`supplier-group-${group.supplierName}`}>
                        {/* DÒNG TIÊU ĐỀ GOM THEO NHÀ CUNG CẤP */}
                        <tr
                          style={{
                            backgroundColor: '#f1f5f9',
                            borderTop: '1px solid #cbd5e1',
                            borderBottom: '1px solid #cbd5e1',
                            userSelect: 'none',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleSupplierCollapse(group.supplierName)}
                        >
                          {/* Nút thu phóng (Chevron) ở cột đầu tiên, bỏ checkbox */}
                          <td
                            style={{ textAlign: 'center', padding: '8px 10px', verticalAlign: 'middle' }}
                          >
                            <span
                              style={{
                                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#475569',
                              }}
                            >
                              <ChevronDown size={13} />
                            </span>
                          </td>

                          {/* Cột 2-6: Tên nhà cung cấp (không dùng icon), địa chỉ ở dưới, số đơn hàng, tổng giá trị */}
                          <td
                            colSpan={5}
                            style={{ padding: '8px 16px 8px 10px', verticalAlign: 'middle' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      fontFamily: "'Roboto Condensed', sans-serif",
                                      fontWeight: 700,
                                      fontSize: '0.8125rem',
                                      color: '#1e3a8a',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.01em',
                                    }}
                                  >
                                    NHÀ CUNG CẤP: {group.supplierName}
                                  </span>
                                  <span
                                    style={{
                                      backgroundColor: '#e0f2fe',
                                      color: '#0369a1',
                                      padding: '1px 8px',
                                      borderRadius: '12px',
                                      fontWeight: 700,
                                      fontSize: '0.6875rem',
                                      border: '1px solid #bae6fd',
                                    }}
                                  >
                                    {group.orders.length} đơn hàng
                                  </span>
                                </div>
                                {group.supplierAddress && (
                                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '3px', fontWeight: 500, lineHeight: 1.3 }}>
                                    Địa chỉ: {group.supplierAddress}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.71875rem' }}>
                                <span style={{ color: '#64748b', fontWeight: 600 }}>Tổng giá trị:</span>
                                <strong
                                  style={{
                                    color: '#1d4ed8',
                                    fontWeight: 800,
                                    fontFamily: "'Roboto Condensed', sans-serif",
                                    fontSize: '0.8125rem',
                                  }}
                                >
                                  {group.totalAmountDisplay}
                                </strong>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* CÁC ĐƠN HÀNG THUỘC NHÀ CUNG CẤP */}
                        {!isCollapsed &&
                          group.orders.map((item) => {
                            const isSelected = selectedOrderIds.includes(item.id);
                            return (
                              <tr
                                key={item.id}
                                className={isSelected ? 'is-selected' : ''}
                                onClick={() => handleOpenEditOrder(item)}
                                style={{
                                  cursor: 'pointer',
                                  borderBottom: '1px solid var(--border-default)',
                                  backgroundColor: isSelected ? 'var(--bg-surface-2)' : '#ffffff',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                                }}
                                title="Nhấn để xem chi tiết và cập nhật đơn hàng"
                              >
                                {/* 1. Checkbox */}
                                <td
                                  style={{ textAlign: 'center', padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    className="decodoor-checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectOrder(item.id)}
                                  />
                                </td>

                                {/* 2. Mã đơn hàng (Không dùng icon ở số hiệu đơn hàng) */}
                                <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  <span
                                    style={{
                                      fontFamily: "'Roboto Condensed', sans-serif",
                                      fontWeight: 700,
                                      color: 'var(--color-primary, #2563eb)',
                                      fontSize: '0.75rem',
                                      letterSpacing: '0.01em',
                                      lineHeight: 1.25,
                                      display: 'inline-block',
                                    }}
                                  >
                                    {item.code}
                                  </span>
                                </td>

                                {/* 3. Trạng thái (Thay thông tin người phụ trách bằng thông tin trạng thái) */}
                                <td style={{ textAlign: 'center', padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  {renderOrderStatusBadge(item.status, item.statusLabel)}
                                </td>

                                {/* 4. Ngày tạo đơn */}
                                <td style={{ textAlign: 'center', padding: '10px 10px', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Calendar3 size={10} style={{ color: 'var(--text-muted)' }} />
                                    {item.orderDate}
                                  </span>
                                </td>

                                {/* 5. Ngày nhận hàng */}
                                <td style={{ textAlign: 'center', padding: '10px 10px', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Calendar3 size={10} style={{ color: 'var(--color-primary)' }} />
                                    {item.deliveryDate}
                                  </span>
                                </td>

                                {/* 6. Giá trị */}
                                <td style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: "'Roboto Condensed', sans-serif", borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                                  {item.totalAmount}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Component Pagination Bước 2 */}
          <Pagination
            currentPage={orderCurrentPage}
            totalItems={groupedOrders.length}
            pageSize={orderPageSize}
            onPageChange={setOrderCurrentPage}
            onPageSizeChange={(newSize) => {
              setOrderPageSize(newSize);
              setOrderCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
          />
        </>
      )}

      {/* ========================================================= */}
      {/* BƯỚC 3: ĐÃ HOÀN THÀNH                                     */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <>
          {/* Dòng thanh công cụ: Hộp tìm kiếm, nút xoá nếu chọn */}
          <TableToolbar
            showMenu={false}
            searchValue={completedSearchQuery}
            onSearchChange={(val) => {
              setCompletedSearchQuery(val);
              setCompletedCurrentPage(1);
            }}
            searchPlaceholder="Tìm kiếm theo mã đơn hàng đã hoàn tất, nhà cung cấp, giá trị..."
            searchMinWidth="300px"
            actionsAfterSearch={
              selectedCompletedIds.length > 0 ? (
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash size={14} />}
                  onClick={() => setIsDeleteCompletedDialogOpen(true)}
                  style={{
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Xoá</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '18px',
                      height: '18px',
                      padding: selectedCompletedIds.length >= 10 ? '0 5px' : '0',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      color: '#ef4444',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      lineHeight: 1,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    {selectedCompletedIds.length}
                  </span>
                </Button>
              ) : undefined
            }
            style={{
              marginBottom: '4px',
              padding: '8px 16px 4px 16px',
            }}
          />

          {/* Bảng Đã hoàn thành: Giống bước 2 nhưng KHÔNG có cột trạng thái */}
          <div
            className="table-responsive custom-scrollbar"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--bg-surface-1)',
            }}
          >
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface-2)' }}>
                  <th style={{ width: '38px', textAlign: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border-default)' }}>
                    <input
                      type="checkbox"
                      className="decodoor-checkbox"
                      checked={
                        paginatedCompletedOrders.length > 0 &&
                        paginatedCompletedOrders.every((o) => selectedCompletedIds.includes(o.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const pageIds = paginatedCompletedOrders.map((o) => o.id);
                          setSelectedCompletedIds(Array.from(new Set([...selectedCompletedIds, ...pageIds])));
                        } else {
                          const pageIds = new Set(paginatedCompletedOrders.map((o) => o.id));
                          setSelectedCompletedIds(selectedCompletedIds.filter((id) => !pageIds.has(id)));
                        }
                      }}
                    />
                  </th>
                  <th style={{ width: '130px', textAlign: 'left', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Mã đơn hàng
                  </th>
                  <th style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Nhà cung cấp
                  </th>
                  <th style={{ width: '115px', textAlign: 'center', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Ngày tạo đơn
                  </th>
                  <th style={{ width: '115px', textAlign: 'center', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Ngày nhận hàng
                  </th>
                  <th style={{ width: '130px', textAlign: 'right', padding: '7px 10px', fontWeight: 700, fontSize: '0.71875rem', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-default)' }}>
                    Giá trị
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCompletedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Không có đơn hàng hoàn thành nào phù hợp điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  paginatedCompletedOrders.map((item) => {
                    const isSelected = selectedCompletedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'is-selected' : ''}
                        onClick={() => {
                          setViewingCompletedOrder(item);
                          setIsCompletedOffcanvasOpen(true);
                        }}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-default)',
                          backgroundColor: isSelected ? 'var(--bg-surface-2)' : '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                        title="Nhấn để xem thông tin chi tiết đơn hàng đã hoàn tất"
                      >
                        {/* 1. Checkbox */}
                        <td style={{ textAlign: 'center', padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="decodoor-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCompleted(item.id)}
                          />
                        </td>

                        {/* 2. Mã đơn hàng (Không dùng icon ở đầu, cỡ chữ vừa vặn) */}
                        <td style={{ padding: '10px 10px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              fontFamily: "'Roboto Condensed', sans-serif",
                              fontWeight: 700,
                              color: 'var(--color-primary, #2563eb)',
                              fontSize: '0.75rem',
                              letterSpacing: '0.01em',
                              lineHeight: 1.25,
                              display: 'block',
                            }}
                          >
                            {item.code}
                          </span>
                        </td>

                        {/* 3. Nhà cung cấp (Cỡ chữ giảm nhẹ, khoảng cách thu gọn) */}
                        <td style={{ padding: '10px 10px', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem', marginBottom: '2px', lineHeight: 1.3 }}>
                            {item.supplierName}
                          </div>
                          <div style={{ fontSize: '0.65625rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                            Ngày hoàn thành quyết toán: {item.completedDate}
                          </div>
                        </td>

                        {/* 4. Ngày tạo đơn */}
                        <td style={{ textAlign: 'center', padding: '10px 10px', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar3 size={10} style={{ color: 'var(--text-muted)' }} />
                            {item.orderDate}
                          </span>
                        </td>

                        {/* 5. Ngày nhận hàng */}
                        <td style={{ textAlign: 'center', padding: '10px 10px', fontSize: '0.6875rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar3 size={10} style={{ color: 'var(--color-primary)' }} />
                            {item.deliveryDate}
                          </span>
                        </td>

                        {/* 6. Giá trị */}
                        <td style={{ textAlign: 'right', padding: '10px 10px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: "'Roboto Condensed', sans-serif", borderBottom: '1px solid var(--border-default)', verticalAlign: 'middle' }}>
                          {item.totalAmount}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Component Pagination Bước 3 */}
          <Pagination
            currentPage={completedCurrentPage}
            totalItems={filteredCompletedOrders.length}
            pageSize={completedPageSize}
            onPageChange={setCompletedCurrentPage}
            onPageSizeChange={(newSize) => {
              setCompletedPageSize(newSize);
              setCompletedCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        </>
      )}

      {/* ========================================================= */}
      {/* OFFCANVAS CHI TIẾT YÊU CẦU MUA HÀNG (BƯỚC 1)               */}
      {/* ========================================================= */}
      <Offcanvas
        isOpen={isReqDetailOpen}
        onClose={() => {
          setIsReqDetailOpen(false);
          setViewingReq(null);
        }}
        title="Thông tin chi tiết yêu cầu mua hàng"
        width="400px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            {/* Nút Xoá (icon only) ở footer */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteSingleReqDialogOpen(true)}
              title="Xoá yêu cầu này"
              style={{
                color: '#ef4444',
                borderColor: '#fca5a5',
                backgroundColor: '#ffffff',
                padding: '7px 11px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '38px',
              }}
            >
              <Trash size={16} />
            </Button>

            {/* Cụm nút Từ chối và Mua hàng ở footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRejectReq(viewingReq)}
                disabled={viewingReq?.status === 'rejected'}
                style={{
                  borderColor: '#cbd5e1',
                  color: viewingReq?.status === 'rejected' ? 'var(--text-muted)' : '#dc2626',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                {viewingReq?.status === 'rejected' ? 'Đã từ chối' : 'Từ chối'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Cart3 size={15} />}
                onClick={() => handlePurchaseSingleReq(viewingReq)}
                style={{
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                Mua hàng
              </Button>
            </div>
          </div>
        }
      >
        {viewingReq && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Header Card: Mã yêu cầu và Trạng thái */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: 'var(--color-primary, #2563eb)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {viewingReq.code}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Ngày tạo: {viewingReq.createdAt}
                </div>
              </div>
              <div>{renderReqStatusBadge(viewingReq.status, viewingReq.statusLabel)}</div>
            </div>

            {/* 2. Highlight: Ngày cần hàng và Tổng dự toán */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Ngày cần hàng
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#dc2626' }}>
                  {viewingReq.requiredDate}
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 99, 235, 0.05)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: 'var(--radius-md, 8px)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Tổng dự toán
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary, #2563eb)' }}>
                  {viewingReq.estimatedCost || '0 đ'}
                </div>
              </div>
            </div>

            {/* 3. Chi tiết: Bộ phận và Người đề xuất */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-1)',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={13} />
                  Bộ phận đề xuất:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{viewingReq.department}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Person size={13} />
                  Người đề xuất:
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{viewingReq.requester}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <BoxSeam size={13} />
                  Đơn hàng áp dụng:
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>
                  {viewingReq.orderCode ? `${viewingReq.orderCode} - ${viewingReq.orderName}` : 'Đơn hàng chung'}
                </span>
              </div>
            </div>

            {/* 4. Lý do / Mục đích mua sắm */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Lý do / Mục đích mua sắm
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                {viewingReq.reason}
              </div>
            </div>

            {/* 5. DANH SÁCH HÀNG HOÁ YÊU CẦU MUA */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  <BoxSeam size={15} style={{ color: 'var(--color-primary, #2563eb)' }} />
                  <span>Danh sách hàng hoá yêu cầu</span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--bg-surface-2)',
                    color: 'var(--text-secondary)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {viewingReq.items?.length || 0} mặt hàng
                </span>
              </div>

              {/* Danh sách thẻ mặt hàng */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {viewingReq.items && viewingReq.items.length > 0 ? (
                  viewingReq.items.map((prod, idx) => (
                    <div
                      key={prod.id || idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-surface-2)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>#{idx + 1}</span>
                          {prod.name || (prod as any).itemName || 'Vật tư'}
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            color: 'var(--color-primary, #2563eb)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prod.totalPrice || ((prod as any).estimatedAmount ? (prod as any).estimatedAmount.toLocaleString('vi-VN') + ' đ' : '')}
                        </span>
                      </div>

                      {(prod.spec || (prod as any).note) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Quy cách / Ghi chú: {prod.spec || (prod as any).note}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          marginTop: '3px',
                          paddingTop: '5px',
                          borderTop: '1px dashed var(--border-subtle)',
                        }}
                      >
                        <span>
                          Số lượng: <strong style={{ color: 'var(--text-primary)' }}>{Number(prod.quantity !== undefined ? prod.quantity : ((prod as any).requestedQty || 0)).toLocaleString('vi-VN')} {prod.unit || 'bộ'}</strong>
                        </span>
                        <span>
                          Đơn giá: {prod.estimatedPrice || ((prod as any).unitPrice ? (prod as any).unitPrice.toLocaleString('vi-VN') + ' đ' : '')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Chưa có danh mục hàng hoá chi tiết
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ========================================================= */}
      {/* OFFCANVAS THÊM MỚI YÊU CẦU MUA HÀNG (BƯỚC 1)               */}
      {/* ========================================================= */}
      <Offcanvas
        isOpen={isReqOffcanvasOpen}
        onClose={() => {
          setIsReqOffcanvasOpen(false);
          setEditingReq(null);
        }}
        title="Thêm mới yêu cầu mua hàng"
        width="400px"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsReqOffcanvasOpen(false);
                setEditingReq(null);
              }}
            >
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" form="req-form">
              {editingReq ? 'Cập nhật' : 'Gửi yêu cầu'}
            </Button>
          </>
        }
      >
        <form id="req-form" onSubmit={handleReqFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Mã yêu cầu
            </label>
            <Input
              value={reqForm.code}
              readOnly
              style={{ backgroundColor: 'var(--bg-surface-2)', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Đơn hàng áp dụng <span style={{ color: 'red' }}>*</span>
            </label>
            <Select
              value={reqForm.orderCode}
              onChange={(e) => {
                const found = AVAILABLE_ORDERS.find((o) => o.code === e.target.value);
                setReqForm({
                  ...reqForm,
                  orderCode: e.target.value,
                  orderName: found ? found.name : 'Đơn hàng và Dự án',
                });
              }}
              options={AVAILABLE_ORDERS.map((o) => ({
                value: o.code,
                label: `${o.code} - ${o.name}`,
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Lý do / Mục đích mua sắm <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              className="form-control"
              placeholder="VD: Mua 50m³ gỗ sồi đỏ nhập khẩu phục vụ dự án..."
              value={reqForm.reason}
              onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
              rows={3}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-glass-input)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Bộ phận đề xuất
            </label>
            <DepartmentSelect
              value={reqForm.department}
              onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Người lập đề xuất
            </label>
            <Input
              placeholder="VD: Trần Văn Quyết..."
              value={reqForm.requester}
              onChange={(e) => setReqForm({ ...reqForm, requester: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Ngày cần hàng <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="VD: 08/10/2026..."
              value={reqForm.requiredDate}
              onChange={(e) => setReqForm({ ...reqForm, requiredDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Dự toán kinh phí ước tính
            </label>
            <Input
              placeholder="VD: 150.000.000 đ"
              value={reqForm.estimatedCost}
              onChange={(e) => setReqForm({ ...reqForm, estimatedCost: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Trạng thái phê duyệt
            </label>
            <Select
              value={reqForm.status}
              onChange={(e) => setReqForm({ ...reqForm, status: e.target.value as RequisitionStatus })}
              options={[
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'processing', label: 'Đang xử lý' },
                { value: 'rejected', label: 'Từ chối' },
              ]}
            />
          </div>
        </form>
      </Offcanvas>

      {/* ========================================================= */}
      {/* OFFCANVAS CHI TIẾT ĐƠN HÀNG (PO) - CHUẨN CLIENT-SEAJONG    */}
      {/* ========================================================= */}
      <OrderDetailOffcanvas
        isOpen={isOrderOffcanvasOpen && !!editingOrder}
        order={editingOrder}
        onClose={() => {
          setIsOrderOffcanvasOpen(false);
          setEditingOrder(null);
        }}
        onUpdateOrder={(updated) => {
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          setEditingOrder(updated);
        }}
        onDeleteOrder={(orderId) => {
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
          if (onShowToast) onShowToast('success', 'Đã xoá', 'Đã xoá đơn hàng khỏi hệ thống.');
        }}
        onPrintOrder={(targetOrder) => {
          handlePrintSingleOrder(targetOrder);
        }}
        onShowToast={onShowToast}
      />

      {/* MODAL XEM TRƯỚC VÀ IN ĐƠN HÀNG (A4) */}
      {isPrintModalOpen && printingOrder && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintingOrder(null);
          }}
          orderGroups={printOrderGroups}
          selectedSupplierId={printOrderGroups[0]?.supplier.id}
          onConfirmAndSave={() => {
            setIsPrintModalOpen(false);
            setPrintingOrder(null);
            if (onShowToast) onShowToast('success', 'Đã lưu', 'Đơn hàng đã được in / lưu thành công.');
          }}
        />
      )}

      {/* ========================================================= */}
      {/* OFFCANVAS LẬP ĐƠN ĐẶT HÀNG MUA MỚI                        */}
      {/* ========================================================= */}
      <Offcanvas
        isOpen={isCreateBlankOrderOpen}
        onClose={() => setIsCreateBlankOrderOpen(false)}
        title="Lập đơn đặt hàng mua mới"
        width="400px"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsCreateBlankOrderOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" form="create-blank-order-form">
              Tạo đơn hàng
            </Button>
          </>
        }
      >
        <form id="create-blank-order-form" onSubmit={handleOrderFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Mã đơn hàng
            </label>
            <Input
              value={orderForm.code}
              readOnly
              style={{ backgroundColor: 'var(--bg-surface-2)', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Nhà cung cấp <span style={{ color: 'red' }}>*</span>
            </label>
            <Input
              placeholder="VD: Công ty Cổ phần Gỗ An Cường..."
              value={orderForm.supplierName}
              onChange={(e) => setOrderForm({ ...orderForm, supplierName: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Ngày tạo đơn
              </label>
              <Input
                placeholder="DD/MM/YYYY"
                value={orderForm.orderDate}
                onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Ngày nhận hàng
              </label>
              <Input
                placeholder="DD/MM/YYYY"
                value={orderForm.deliveryDate}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Tổng giá trị đơn hàng
            </label>
            <Input
              placeholder="VD: 250.000.000 đ"
              value={orderForm.totalAmount}
              onChange={(e) => setOrderForm({ ...orderForm, totalAmount: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Trạng thái đơn hàng
            </label>
            <Select
              value={orderForm.status}
              onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}
              options={[
                { value: 'waiting_delivery', label: 'Chờ giao hàng' },
                { value: 'shipping', label: 'Đang vận chuyển' },
                { value: 'partial', label: 'Đã giao một phần' },
                { value: 'inspecting', label: 'Đang kiểm tra' },
              ]}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Ghi chú hợp đồng / Điều khoản giao nhận
            </label>
            <textarea
              className="form-control"
              placeholder="Ghi chú điều khoản thanh toán, quy cách đóng gói..."
              value={orderForm.note}
              onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-glass-input)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </form>
      </Offcanvas>

      {/* ========================================================= */}
      {/* OFFCANVAS CHI TIẾT ĐƠN HÀNG ĐÃ HOÀN THÀNH (BƯỚC 3)        */}
      {/* ========================================================= */}
      <Offcanvas
        isOpen={isCompletedOffcanvasOpen}
        onClose={() => {
          setIsCompletedOffcanvasOpen(false);
          setViewingCompletedOrder(null);
        }}
        title="Chi tiết đơn hàng hoàn thành"
        width="400px"
        footer={
          <Button
            variant="primary"
            type="button"
            onClick={() => {
              setIsCompletedOffcanvasOpen(false);
              setViewingCompletedOrder(null);
            }}
          >
            Đóng
          </Button>
        }
      >
        {viewingCompletedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Mã đơn hàng
              </label>
              <div style={{ fontWeight: 700, fontFamily: "'Roboto Condensed', sans-serif", color: 'var(--color-primary)' }}>
                {viewingCompletedOrder.code}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Nhà cung cấp
              </label>
              <div style={{ fontWeight: 600 }}>{viewingCompletedOrder.supplierName}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Ngày tạo đơn
                </label>
                <div>{viewingCompletedOrder.orderDate}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Ngày nhận hàng
                </label>
                <div>{viewingCompletedOrder.deliveryDate}</div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Tổng giá trị quyết toán
              </label>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-success, #10b981)' }}>
                {viewingCompletedOrder.totalAmount}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Ngày hoàn tất chứng từ
              </label>
              <div>{viewingCompletedOrder.completedDate}</div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ========================================================= */}
      {/* DIALOG XÁC NHẬN XOÁ                                       */}
      {/* ========================================================= */}
      <ConfirmDialog
        isOpen={isDeleteSingleReqDialogOpen}
        onClose={() => setIsDeleteSingleReqDialogOpen(false)}
        onConfirm={handleDeleteSingleReqConfirm}
        title="Xác nhận xoá yêu cầu mua hàng"
        message={`Bạn có chắc chắn muốn xoá yêu cầu mua hàng "${viewingReq?.code}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        type="danger"
      />

      <ConfirmDialog
        isOpen={isDeleteReqDialogOpen}
        onClose={() => setIsDeleteReqDialogOpen(false)}
        onConfirm={handleDeleteReqsConfirm}
        title="Xác nhận xoá yêu cầu mua hàng"
        message={`Bạn có chắc chắn muốn xoá ${selectedReqIds.length} yêu cầu mua hàng đã chọn?`}
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        type="danger"
        itemCount={selectedReqIds.length}
      />

      <ConfirmDialog
        isOpen={isDeleteOrderDialogOpen}
        onClose={() => setIsDeleteOrderDialogOpen(false)}
        onConfirm={handleDeleteOrdersConfirm}
        title="Xác nhận xoá đơn hàng"
        message={`Bạn có chắc chắn muốn xoá ${selectedOrderIds.length} đơn hàng đã chọn?`}
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        type="danger"
        itemCount={selectedOrderIds.length}
      />

      <ConfirmDialog
        isOpen={isDeleteCompletedDialogOpen}
        onClose={() => setIsDeleteCompletedDialogOpen(false)}
        onConfirm={handleDeleteCompletedOrdersConfirm}
        title="Xác nhận xoá đơn hàng hoàn thành"
        message={`Bạn có chắc chắn muốn xoá ${selectedCompletedIds.length} đơn hàng hoàn thành đã chọn?`}
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        type="danger"
        itemCount={selectedCompletedIds.length}
      />

      {/* ========================================================= */}
      {/* MODAL FULLSCREEN: LẬP ĐƠN MUA HÀNG TỪ NHÀ CUNG CẤP       */}
      {/* ========================================================= */}
      <CreatePurchaseOrderModal
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        selectedRequisitions={poTargetRequisitions}
        onConfirmOrders={handleConfirmCreateOrders}
        onShowToast={onShowToast}
      />
    </div>
  );
};
