import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Boxes,
  ListTask,
  Check2Circle,
  BoxSeam,
  Printer,
  FileEarmarkText,
  CalendarEvent,
  ClockHistory,
  ArrowRepeat,
} from 'react-bootstrap-icons';
import { useSession } from 'next-auth/react';
import {
  isLogisticsAdmin,
  canExecuteInOut,
  canPrintLogistics,
} from '@/lib/logistics-permissions';
import { StepPage } from '../../components/common/StepPage';
import { DepartmentActionMenu } from '../../components/common/DepartmentActionMenu';
import { EventOffcanvas } from '../../components/common/EventOffcanvas';
import { DataRetentionOffcanvas } from '../../components/common/DataRetentionOffcanvas';
import { TableToolbar, type TableToolbarFilter } from '../../components/common/TableToolbar';
import { FullWidthTable, SwipeableTableRow } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import {
  InventoryToolbar,
  InventoryTable,
  InventoryPagination,
  InventoryDetailOffcanvas,
  InventoryItemFormModal,
  type InventoryStockItem,
} from '../../components/common/InventoryTable';
import { Button } from '../../components/common/Button';
import { NewBadge } from '../../components/common/NewBadge';
import { DeleteButton } from '../../components/common/DeleteButton';
import { EmployeeSelect, type EmployeeItem } from '../../components/common/EmployeeSelect';
import { Offcanvas } from '../../components/common/Offcanvas';
import { PrintLabelModal } from '../../components/common/PrintLabelModal';
import { NhapKhoModal } from '@/components/plan-finance/kho_hang/NhapKhoModal';
import { XuatKhoModal } from '@/components/plan-finance/kho_hang/XuatKhoModal';
import { PhieuNhapKhoPreview } from '@/components/plan-finance/kho_hang/PhieuNhapKhoPreview';
import { PhieuXuatKhoPreview } from '@/components/plan-finance/kho_hang/PhieuXuatKhoPreview';
import { exportStandardReportExcel } from '@/utils/excelExport';
import type { ModernStepItem } from '../../types';

// Cấu hình 3 bước chuẩn
const LOGISTICS_STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'tasks',
    title: 'Danh sách công việc',
    mobileTitle: 'Công việc',
    desc: 'Quản lý các lệnh xuất/nhập kho',
    badge: 'ĐANG XỬ LÝ',
    icon: <ListTask size={16} />,
  },
  {
    num: 2,
    id: 'inventory',
    title: 'Danh sách hàng hoá',
    mobileTitle: 'Hàng hoá',
    desc: 'Tồn kho thực tế & vị trí lưu trữ',
    badge: 'KHO THỰC TẾ',
    icon: <Boxes size={16} />,
  },
  {
    num: 3,
    id: 'completed',
    title: 'Đã hoàn thành',
    mobileTitle: 'Hoàn thành',
    desc: 'Lịch sử phiếu kho & nhật ký hoàn tất',
    badge: 'HOÀN TẤT',
    icon: <Check2Circle size={16} />,
  },
];

interface GroupedOrder {
  orderCode: string;
  items: any[];
  completedCount: number;
  totalTickets: number;
  groupStatusText: string;
  groupStatusBadgeClass: string;
  priority: number;
  latestDate: number;
  customerName: string | null;
  customerAddress: string | null;
  supplierName: string | null;
  purchaseOrderCode: string | null;
  purchaseOrderId: string | null;
  isPurchaseOrderGroup: boolean;
  ghiChu: string | null;
  isGroupImport: boolean;
  needsProduction: boolean;
}

export const LogisticsOverviewPage: React.FC = () => {
  const { data: session } = useSession();
  const isThuKho = isLogisticsAdmin(session?.user);
  const canInOut = canExecuteInOut(session?.user);
  const canPrint = canPrintLogistics(session?.user);

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Search & Filter chung
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);

  // ── STATE BƯỚC 1 & 3: CHUẨN CLIENT-SEAJONG (GOM NHÓM THEO ĐƠN HÀNG / QC / HỒ SƠ LỖI) ──
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  const [deletedOrders, setDeletedOrders] = useState<Set<string>>(new Set());

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedStaffName, setSelectedStaffName] = useState<string>('');
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<Set<string>>(new Set());

  const staffEmployeeItems = useMemo<EmployeeItem[]>(
    () =>
      staffList.map((s: any) => ({
        id: s.id,
        name: s.fullName || s.name || '',
        department: s.departmentName || 'Kho vận',
        position: s.position && !String(s.position).startsWith('vtr-') ? s.position : 'Kho vận',
      })),
    [staffList]
  );

  // Offcanvas chi tiết lệnh & Modals Xuất/Nhập kho & In nhãn (Step 1)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState<boolean>(false);

  const [showXuatKhoModal, setShowXuatKhoModal] = useState<boolean>(false);
  const [xuatKhoOrderType, setXuatKhoOrderType] = useState<'so' | 'wo' | 'defect' | 'manual'>('manual');
  const [xuatKhoSoId, setXuatKhoSoId] = useState<string | undefined>(undefined);
  const [xuatKhoWoId, setXuatKhoWoId] = useState<string | undefined>(undefined);
  const [xuatKhoDefectId, setXuatKhoDefectId] = useState<string | undefined>(undefined);
  const [xuatKhoTicketId, setXuatKhoTicketId] = useState<string | undefined>(undefined);

  const [showNhapKhoModal, setShowNhapKhoModal] = useState<boolean>(false);
  const [nhapKhoTaskId, setNhapKhoTaskId] = useState<string | undefined>();
  const [nhapKhoMode, setNhapKhoMode] = useState<'manual' | 'po' | 'production' | 'return' | undefined>();
  const [nhapKhoSoBienBanQC, setNhapKhoSoBienBanQC] = useState<string>('');
  const [nhapKhoPurchaseOrderId, setNhapKhoPurchaseOrderId] = useState<string | null>(null);
  const [nhapKhoPurchaseOrderCode, setNhapKhoPurchaseOrderCode] = useState<string | null>(null);
  const [nhapKhoShippingFee, setNhapKhoShippingFee] = useState<number>(0);

  const [showPrintLabelModal, setShowPrintLabelModal] = useState<boolean>(false);
  const [printVoucherItem, setPrintVoucherItem] = useState<any | null>(null);

  const prevOrderIds = useRef<Set<string>>(new Set());

  // ── STATE BƯỚC 2 ──
  const [inventory, setInventory] = useState<any[]>([]);
  const [totalInventory, setTotalInventory] = useState<number>(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');

  // Modals & Dialogs bổ trợ
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryStockItem | null>(null);
  const [isCreatingInventoryItem, setIsCreatingInventoryItem] = useState<boolean>(false);

  const [showToastMsg, setShowToastMsg] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState<boolean>(false);
  const [showCleanupOffcanvas, setShowCleanupOffcanvas] = useState<boolean>(false);

  const showToast = useCallback((type: 'success' | 'info' | 'error', message: string) => {
    setShowToastMsg({ type, message });
    setTimeout(() => setShowToastMsg(null), 3500);
  }, []);

  // Hàm chuẩn hoá exportCode giống hệt client-seajong
  const mapOverviewOrders = useCallback((data: any[]) => {
    if (!Array.isArray(data)) return [];
    return data.map((d: any, index: number) => {
      const rawId = d.code || d.id || '';
      const parts = String(rawId).split('-');
      const suffix = parts[parts.length - 1] || `${index}`;
      let exportCode = `LXK-202607-${suffix}`;
      let typeLabel = d.typeLabel;
      const isLsx = Boolean(
        d.code?.startsWith('LSX-') ||
        d.typeLabel?.includes('sản xuất') ||
        d.ticketType === 'MATERIAL_PICKING' ||
        d.hasProduction
      );
      if (d.type === 'material-export' || isLsx) {
        exportCode = `LXK-VT-${suffix}`;
        if (d.code?.startsWith('LSX-')) {
          typeLabel = 'Xuất kho vật tư sản xuất';
        }
      }
      if (d.type === 'material-import') {
        const text = `${d.title || ''} ${d.code || ''} ${d.typeLabel || ''}`.toLowerCase();
        const isPurchaseOrder = !!d.purchaseOrderId || !!d.purchaseOrderCode || !!d.isPurchaseOrder;
        const isDefect = text.includes('hàng lỗi') || text.includes('kho-loi') || text.includes('lỗi');
        const isIQC = isPurchaseOrder || text.includes('iqc') || text.includes('vật tư');
        const prefix = isDefect ? 'LNK-LOI' : isIQC ? 'LNK-IQC' : 'LNK-OQC';
        exportCode = `${prefix}-${suffix}`;
      }
      if (d.type === 'logistics-ticket') exportCode = d.code;
      return { ...d, exportCode, typeLabel: typeLabel || d.typeLabel };
    });
  }, []);

  // Tải danh sách lệnh xuất/nhập kho (Step 1) + Polling 5s chuẩn client-seajong
  const fetchOverviewOrders = useCallback(
    async (isPolling = false) => {
      if (!isPolling) setLoading(true);
      try {
        const res = await fetch('/api/logistics/overview-orders');
        if (res.ok) {
          const data = await res.json();
          const mapped = mapOverviewOrders(data);

          if (isPolling) {
            const newIds = new Set<string>(mapped.map((m: any) => m.id as string));
            if (prevOrderIds.current.size > 0) {
              const addedOrders = mapped.filter((m: any) => !prevOrderIds.current.has(m.id));
              if (addedOrders.length > 0) {
                showToast('info', `Kế toán vừa phê duyệt thêm ${addedOrders.length} lệnh xuất/nhập kho mới.`);
              }
            }
            prevOrderIds.current = newIds;
            setRawOrders(mapped);
          } else {
            prevOrderIds.current = new Set<string>(mapped.map((m: any) => m.id as string));
            setReadOrderIds(new Set<string>(mapped.map((m: any) => m.id as string)));
            setRawOrders(mapped);
          }
        }
      } catch (err) {
        if (!isPolling) console.error('Fetch overview orders error:', err);
      } finally {
        if (!isPolling) setLoading(false);
      }
    },
    [mapOverviewOrders, showToast]
  );

  // Tải danh sách nhân sự kho để giao việc
  useEffect(() => {
    fetch('/api/logistics/staff')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setStaffList(data);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchOverviewOrders(false);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOverviewOrders(true);
      }
    }, 5000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchOverviewOrders(true);
    };
    const handleExternalUpdate = () => fetchOverviewOrders(true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('logistics-orders-updated', handleExternalUpdate);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('logistics-orders-updated', handleExternalUpdate);
    };
  }, [fetchOverviewOrders]);

  // Reset page & search khi chuyển step
  useEffect(() => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterWarehouse('all');
    setCurrentPage(1);
    setSelectedBatchOrders(new Set());
  }, [currentStep]);

  // 1. Tải Categories & Warehouses
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
      .catch(() => { });
  }, []);

  const fetchWarehouses = useCallback(() => {
    fetch('/api/logistics/warehouses?limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.items)) {
          setWarehouses(json.items.map((w: any) => ({ id: w.id, code: w.code, name: w.name })));
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchCategories(filterWarehouse);
  }, [fetchCategories, filterWarehouse]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // 2. Tải dữ liệu cho Step 1, Step 2 & Step 3
  const loadStepData = useCallback(() => {
    if (currentStep === 1 || currentStep === 3) {
      fetchOverviewOrders(false);
      return;
    }

    setLoading(true);
    if (currentStep === 2) {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : '',
        categoryId: filterType !== 'all' ? filterType : '',
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
    }
  }, [currentStep, currentPage, pageSize, searchTerm, filterType, filterStatus, filterWarehouse, fetchOverviewOrders]);

  useEffect(() => {
    if (currentStep === 2) {
      loadStepData();
    }
  }, [currentStep, loadStepData]);

  // Kiểm tra 1 lệnh con đã thực hiện hoàn tất hay chưa
  const isRowCompleted = useCallback((it: any) => {
    const tStatus = String(it?.trangThai || '').toLowerCase();
    const tkStatus = String(it?.trangThaiKho || it?.saleOrderTrangThaiKho || '').toLowerCase();
    return (
      tStatus === 'completed' ||
      tStatus === 'done' ||
      tStatus === 'delivered' ||
      (it?.type === 'sale-order' && tkStatus === 'exported')
    );
  }, []);

  // ── GOM NHÓM DỮ LIỆU BƯỚC 1 & BƯỚC 3 CHUẨN CLIENT-SEAJONG ──
  const sortedGroups = useMemo(() => {
    const grouped: Record<string, any[]> = rawOrders.reduce((acc: Record<string, any[]>, curr: any) => {
      const isImport = curr.type === 'material-import';
      if (filterType === 'IMPORT' && !isImport) return acc;
      if (filterType === 'EXPORT' && isImport) return acc;

      const isQc = (curr.code && String(curr.code).startsWith('QC-')) || (curr.title && String(curr.title).includes('QC-'));
      const code = isQc ? curr.code : curr.saleOrderCode || curr.code || 'Khác';
      if (!acc[code]) acc[code] = [];
      acc[code].push(curr);
      return acc;
    }, {});

    const groupArray: GroupedOrder[] = Object.keys(grouped)
      .filter((code) => code !== 'Khác')
      .map((orderCode): GroupedOrder | null => {
        const allGroupItems = grouped[orderCode];
        if (!allGroupItems || allGroupItems.length === 0) return null;

        let completedCount = 0;
        const totalTickets = allGroupItems.length;
        let latestDate = 0;
        let customerName: string | null = null;
        let customerAddress: string | null = null;
        let supplierName: string | null = null;
        let purchaseOrderCode: string | null = null;
        let purchaseOrderId: string | null = null;
        let ghiChu: string | null = null;

        let hasMaterialCompleted = false;
        let hasMaterialPacked = false;
        let hasPackingPacked = false;
        let allExported = totalTickets > 0;

        allGroupItems.forEach((it: any) => {
          if (!customerName && it.customer && !String(it.customer).includes('Từ hồ sơ') && !String(it.customer).startsWith('ERR-')) {
            customerName = it.customer;
          }
          if (!customerAddress && it.customerAddress) customerAddress = it.customerAddress;
          if (!ghiChu && it.ghiChu) ghiChu = it.ghiChu;
          if (!supplierName && (it.supplierName || (it.isPurchaseOrder ? it.customer : null))) {
            supplierName = it.supplierName || it.customer;
          }
          if (!purchaseOrderCode && it.purchaseOrderCode) purchaseOrderCode = it.purchaseOrderCode;
          if (!purchaseOrderId && it.purchaseOrderId) purchaseOrderId = it.purchaseOrderId;

          const tStatus = String(it.trangThai || '').toLowerCase();
          const isExported = isRowCompleted(it);
          if (isExported) {
            completedCount++;
            if (it.ticketType === 'MATERIAL_ALLOCATION' || it.ticketType === 'MATERIAL_PICKING' || it.type === 'material-export') {
              hasMaterialCompleted = true;
            }
          } else {
            allExported = false;
              if (tStatus === 'packed' || tStatus === 'picked') {
                if (
                  it.ticketType === 'MATERIAL_ALLOCATION' ||
                  it.ticketType === 'MATERIAL_PICKING' ||
                  it.type === 'material-export'
                ) {
                  hasMaterialPacked = true;
                }
                if (it.ticketType === 'BATCH_PACKING') {
                  hasPackingPacked = true;
                }
              }
            }
            const time = new Date(it.ngayGiao || it.requestedDate || it.createdAt || 0).getTime();
            if (time > latestDate) latestDate = time;
          });

        const isGroupImport =
          allGroupItems.length > 0 &&
          allGroupItems.every(
            (it: any) =>
              it.type === 'material-import' ||
              it.ticketType === 'MATERIAL_IMPORT' ||
              orderCode.startsWith('QC-')
          );

        const isDefectGroup = orderCode.startsWith('ERR-') || orderCode.startsWith('WR-');
        const isSaleOrderGroup = !isDefectGroup && !isGroupImport && !orderCode.startsWith('QC-');

        // Nếu đơn bán hàng mới chỉ có lệnh cấp phát vật tư (chưa có lệnh gom hàng/xuất kho thành phẩm hoàn tất)
        // thì trạng thái vẫn là "Đã xuất vật tư" (chưa hoàn tất xuất kho đơn hàng) -> thuộc Bước 1
        const hasOnlyMaterialTickets =
          isSaleOrderGroup &&
          allGroupItems.every(
            (it: any) =>
              it.ticketType === 'MATERIAL_ALLOCATION' ||
              it.ticketType === 'MATERIAL_PICKING' ||
              it.type === 'material-export'
          );
        if (hasOnlyMaterialTickets) {
          allExported = false;
        }

        // Bước 1 (Danh sách công việc): Chỉ hiển thị các đơn/nhóm lệnh chưa hoàn tất toàn bộ (!allExported, gồm cả "Đã xuất vật tư")
        // Bước 3 (Đã hoàn thành): Chỉ hiển thị các đơn/nhóm lệnh đã hoàn tất toàn bộ (allExported === true, ví dụ "Đã xuất kho" / "Đã nhập kho")
        if (currentStep === 3 && !allExported) return null;
        if (currentStep === 1 && allExported) return null;

        const stepItems = allGroupItems;

        const isPurchaseOrderGroup =
          isGroupImport &&
          (!!purchaseOrderCode ||
            !!purchaseOrderId ||
            orderCode.includes('-DH-') ||
            orderCode.startsWith('DH-') ||
            allGroupItems.some(
              (it: any) =>
                it.isPurchaseOrder ||
                !!it.purchaseOrderCode ||
                !!it.purchaseOrderId ||
                it.supplierName ||
                it.items?.some((p: any) => p.purchaseOrderId || p.purchaseOrderCode)
            ));

        if (isPurchaseOrderGroup) {
          if (!supplierName && customerName) supplierName = customerName;
          if (!purchaseOrderCode) {
            if (orderCode.includes('-DH-') || orderCode.startsWith('DH-')) {
              purchaseOrderCode = orderCode.match(/(DH-\d+(-\d+)?)/)?.[0] || orderCode;
            } else {
              for (const it of allGroupItems) {
                if (it.items && Array.isArray(it.items)) {
                  for (const p of it.items) {
                    if (p.purchaseOrderCode) {
                      purchaseOrderCode = p.purchaseOrderCode;
                      break;
                    }
                  }
                }
                if (purchaseOrderCode) break;
              }
            }
          }
        }

        let defectImportType = 'hàng lỗi';
        if (isDefectGroup && isGroupImport) {
          const firstItem = allGroupItems[0];
          const tLabel = String(firstItem?.typeLabel || '').toLowerCase();
          const itTitle = String(firstItem?.title || firstItem?.code || '').toLowerCase();
          if (tLabel.includes('hàng trả lại') || itTitle.includes('hàng trả lại') || itTitle.includes('trả lại')) {
            defectImportType = 'hàng trả lại';
          } else if (tLabel.includes('thu hồi') || itTitle.includes('thu hồi')) {
            defectImportType = 'thu hồi';
          } else {
            defectImportType = 'hàng lỗi';
          }
        }

        let groupStatusText = isGroupImport
          ? isDefectGroup
            ? `Chưa nhập kho ${defectImportType}`
            : 'Chưa nhập kho'
          : isDefectGroup
            ? 'Chưa cấp phát linh kiện'
            : 'Chưa xuất kho';
        let groupStatusBadgeClass = 'bg-slate-500 text-white';

        if (totalTickets > 0) {
          if (allExported) {
            groupStatusText = isGroupImport
              ? isDefectGroup
                ? `Đã nhập kho ${defectImportType}`
                : 'Đã nhập kho'
              : isDefectGroup
                ? 'Đã cấp phát linh kiện'
                : 'Đã xuất kho';
            groupStatusBadgeClass = 'bg-emerald-600 text-white';
          } else if (isDefectGroup) {
            if (completedCount > 0) {
              groupStatusText = isGroupImport ? `Đang nhập kho ${defectImportType}` : 'Đang cấp phát linh kiện';
              groupStatusBadgeClass = 'bg-amber-400 text-slate-900';
            }
          } else if (!isGroupImport) {
            if (hasMaterialCompleted && hasPackingPacked) {
              groupStatusText = 'Đã xuất VT & Gom đủ hàng';
              groupStatusBadgeClass = 'bg-amber-400 text-slate-900';
            } else if (hasMaterialCompleted) {
              groupStatusText = 'Đã xuất vật tư';
              groupStatusBadgeClass = 'bg-amber-400 text-slate-900';
            } else if (hasMaterialPacked && hasPackingPacked) {
              groupStatusText = 'Đã gom đủ VT & Đơn hàng';
              groupStatusBadgeClass = 'bg-sky-500 text-white';
            } else if (hasMaterialPacked) {
              groupStatusText = 'Đã gom đủ vật tư';
              groupStatusBadgeClass = 'bg-sky-500 text-white';
            } else if (hasPackingPacked) {
              groupStatusText = 'Đã gom đủ hàng';
              groupStatusBadgeClass = 'bg-amber-400 text-slate-900';
            } else if (completedCount > 0) {
              groupStatusText = 'Đã xuất một phần';
              groupStatusBadgeClass = 'bg-amber-400 text-slate-900';
            }
          } else if (completedCount > 0) {
            groupStatusText = 'Đã nhập một phần';
            groupStatusBadgeClass = 'bg-amber-400 text-slate-900';
          }
        }

        let priority = 1;
        if (groupStatusText.startsWith('Chưa')) {
          priority = 0;
        } else if (
          groupStatusText.startsWith('Đã') &&
          !groupStatusText.includes('một phần') &&
          !groupStatusText.includes('VT & Gom')
        ) {
          priority = 2;
        }

        const needsProduction =
          isSaleOrderGroup &&
          allGroupItems.some(
            (it: any) =>
              it.hasProduction === true ||
              it.ticketType === 'MATERIAL_PICKING' ||
              it.type === 'material-export' ||
              (it.code && String(it.code).startsWith('CP-')) ||
              (it.typeLabel &&
                (String(it.typeLabel).toLowerCase().includes('sản xuất') ||
                  String(it.typeLabel).toLowerCase().includes('cấp phát vật tư'))) ||
              it.trangThai === 'in_production' ||
              it.saleOrderTrangThai === 'in_production' ||
              it.saleOrderTrangThaiKho === 'out_of_stock' ||
              (it.items && Array.isArray(it.items) && it.items.some((i: any) => i.bomCode)) ||
              (it.title &&
                (String(it.title).toLowerCase().includes('sản xuất') ||
                  String(it.title).toLowerCase().includes('xuất kho kvp')))
          );

        return {
          orderCode,
          items: stepItems,
          completedCount,
          totalTickets,
          groupStatusText,
          groupStatusBadgeClass,
          priority,
          latestDate,
          customerName,
          customerAddress,
          supplierName,
          purchaseOrderCode,
          purchaseOrderId,
          isPurchaseOrderGroup,
          ghiChu,
          isGroupImport,
          needsProduction,
        };
      })
      .filter((group): group is GroupedOrder => {
        if (!group) return false;
        if (deletedOrders.has(group.orderCode)) return false;

        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        const matchGroup =
          (group.customerName || '').toLowerCase().includes(q) ||
          (group.customerAddress || '').toLowerCase().includes(q) ||
          (group.supplierName || '').toLowerCase().includes(q) ||
          (group.purchaseOrderCode || '').toLowerCase().includes(q) ||
          group.orderCode.toLowerCase().includes(q);
        const matchChild = group.items.some(
          (it: any) =>
            String(it.exportCode || '').toLowerCase().includes(q) ||
            String(it.code || '').toLowerCase().includes(q) ||
            String(it.typeLabel || '').toLowerCase().includes(q) ||
            String(it.assigneeName || '').toLowerCase().includes(q)
        );
        return matchGroup || matchChild;
      });

    groupArray.sort((a, b) => {
      if (currentStep === 1 && a.priority !== b.priority) return a.priority - b.priority;
      return b.latestDate - a.latestDate;
    });

    return { groupArray, grouped };
  }, [rawOrders, filterType, deletedOrders, searchTerm, currentStep, isRowCompleted]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedGroups.groupArray.slice(startIndex, startIndex + pageSize);
  }, [sortedGroups.groupArray, currentPage, pageSize]);

  // Danh sách toàn bộ các dòng lệnh thuộc các nhóm trên trang hiện tại (hỗ trợ chọn tất cả để xoá / giao việc)
  const visiblePageOrders = useMemo(() => {
    const list: any[] = [];
    paginatedGroups.forEach((group) => {
      group.items.forEach((it) => {
        list.push(it);
      });
    });
    return list;
  }, [paginatedGroups]);

  // Khi bấm vào 1 dòng lệnh con -> Mở Offcanvas 400px chuẩn client-seajong
  const handleRowClick = async (row: any) => {
    setReadOrderIds((prev) => new Set(prev).add(row.id));
    setSelectedOrder(row);
    setFetchingDetails(true);
    setOrderDetails([]);

    try {
      let items: any[] = [];
      if (row.type === 'contract') {
        const res = await fetch(`/api/plan-finance/contracts/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.quotation?.items ?? []).map((it: any) => ({
            name: it.tenHang,
            qty: it.soLuong,
            unit: it.donVi,
          }));
        }
      } else if (row.type === 'retail-invoice') {
        const res = await fetch(`/api/plan-finance/retail-invoices/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.items ?? []).map((it: any) => ({
            name: it.tenHang,
            qty: it.soLuong,
            unit: it.dvt || it.donVi,
          }));
        }
      } else if (row.type === 'sale-order') {
        const res = await fetch(`/api/plan-finance/sales/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail.logisticsItems) {
            items = detail.logisticsItems.map((it: any) => ({
              name: it.tenHang,
              qty: it.soLuong,
              unit: it.donVi,
              type: it.type,
              isShortage: it.isShortage,
              code: it.code || it.inventoryItem?.code,
              color: it.color || it.inventoryItem?.color,
              giaBan: it.giaBan || it.inventoryItem?.giaBan,
              imageUrl: it.imageUrl || it.inventoryItem?.imageUrl,
              ghiChu: it.ghiChu,
              isMaterial: true,
            }));
          } else {
            items = (detail.saleOrderItems ?? detail.items ?? []).map((it: any) => ({
              name: it.tenHang,
              qty: it.soLuong,
              unit: it.inventoryItem?.donVi || it.donVi,
              code: it.inventoryItem?.code || it.code,
              color: it.inventoryItem?.color,
              giaBan: it.inventoryItem?.giaBan,
              imageUrl: it.inventoryItem?.imageUrl,
            }));
          }
        }
      } else if (
        row.type === 'material-export' ||
        row.type === 'material-import' ||
        row.type === 'logistics-ticket'
      ) {
        items = (row.items ?? []).map((it: any) => {
          return {
            name: it.tenHang || it.inventoryItem?.tenHang,
            qty: it.soLuong || it.requestedQty,
            pickedQty: it.pickedQty,
            stockQty: it.stockQty,
            unit: it.donVi || it.inventoryItem?.donVi,
            type: it.type,
            isShortage: Boolean(it.isShortage),
            bomCode: it.bomCode,
            dinhMucTen: it.dinhMucTen,
            code: it.code || it.inventoryItem?.code,
            color: it.color || it.inventoryItem?.color,
            giaBan: it.giaBan || it.inventoryItem?.giaBan,
            imageUrl: it.imageUrl || it.inventoryItem?.imageUrl,
            inventoryItemId: it.inventoryItemId || it.inventoryItem?.id || null,
            purchaseOrderId: it.purchaseOrderId || row.purchaseOrderId || null,
            purchaseOrderCode: it.purchaseOrderCode || row.purchaseOrderCode || null,
            shippingFee: it.shippingFee !== undefined ? it.shippingFee : row.shippingFee ?? 0,
          };
        });

        if (items.length === 0 && row.type === 'logistics-ticket' && row.saleOrderId) {
          const res = await fetch(`/api/plan-finance/sales/${row.saleOrderId}`);
          if (res.ok) {
            const detail = await res.json();
            if (detail.logisticsItems) {
              const filterWhType =
                row.ticketType === 'MATERIAL_PICKING'
                  ? 'Kho Vật Tư Phụ Kiện (KVP)'
                  : 'Kho Hàng Hoá (KHO-CHINH)';
              items = detail.logisticsItems
                .filter((it: any) => !it.type || it.type === filterWhType)
                .map((it: any) => ({
                  name: it.tenHang,
                  qty: it.soLuong,
                  unit: it.donVi,
                  type: it.type,
                  isShortage: it.isShortage,
                  code: it.code || it.inventoryItem?.code,
                  color: it.color || it.inventoryItem?.color,
                  giaBan: it.giaBan || it.inventoryItem?.giaBan,
                  imageUrl: it.imageUrl || it.inventoryItem?.imageUrl,
                  inventoryItemId: it.inventoryItemId || it.inventoryItem?.id || null,
                  ghiChu: it.ghiChu,
                  isMaterial: true,
                }));
            } else if (detail.items || detail.saleOrderItems) {
              items = (detail.items || detail.saleOrderItems).map((it: any) => ({
                name: it.tenHang,
                qty: it.soLuong,
                unit: it.donVi || it.inventoryItem?.donVi,
                code: it.code || it.inventoryItem?.code,
                imageUrl: it.imageUrl || it.inventoryItem?.imageUrl,
                inventoryItemId: it.inventoryItemId || it.inventoryItem?.id || null,
              }));
            }
          }
        }
      }
      setOrderDetails(items);
    } catch (err) {
      console.error('Lỗi tải chi tiết lệnh:', err);
    } finally {
      setFetchingDetails(false);
    }
  };

  // Xoá 1 lệnh từ Offcanvas (thông qua DeleteButton chuẩn)
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    try {
      await fetch('/api/logistics/overview-orders/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: selectedOrder.id, type: selectedOrder.type }] }),
      });
      showToast('success', 'Đã xóa lệnh thành công');
      setSelectedOrder(null);
      fetchOverviewOrders(false);
    } catch {
      showToast('error', 'Xóa lệnh thất bại');
    }
  };

  // Xoá hàng loạt các lệnh đã chọn bằng Checkbox (có ConfirmDialog xác nhận qua DeleteButton)
  const handleBatchDeleteOrders = async () => {
    if (selectedBatchOrders.size === 0) return;
    try {
      const itemsToDelete = rawOrders
        .filter((o: any) => selectedBatchOrders.has(o.id))
        .map((o: any) => ({ id: o.id, type: o.type }));
      if (itemsToDelete.length === 0) return;

      const res = await fetch('/api/logistics/overview-orders/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToDelete }),
      });
      if (res.ok) {
        showToast('success', `Đã xóa ${itemsToDelete.length} lệnh khỏi hệ thống.`);
        setSelectedBatchOrders(new Set());
        await fetchOverviewOrders(false);
      } else {
        showToast('error', 'Không thể xóa các lệnh đã chọn.');
      }
    } catch {
      showToast('error', 'Có lỗi xảy ra khi xóa dữ liệu.');
    }
  };

  const staffSelectWrapRef = useRef<HTMLDivElement>(null);

  // Giao việc hàng loạt (gom hàng & dán nhãn) cho nhân viên kho
  const handleAssignBatchOrders = async () => {
    if (selectedBatchOrders.size === 0 || !isThuKho) return;
    if (!selectedStaff) {
      showToast('info', 'Vui lòng chọn nhân viên kho để giao việc gom hàng và dán nhãn.');
      const inputEl = staffSelectWrapRef.current?.querySelector('input');
      if (inputEl) {
        inputEl.focus();
        inputEl.click();
      }
      return;
    }
    try {
      const res = await fetch('/api/logistics/batch-packing/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff,
          orderIds: Array.from(selectedBatchOrders),
        }),
      });
      if (res.ok) {
        showToast('success', `Đã giao ${selectedBatchOrders.size} việc gom hàng & dán nhãn cho ${selectedStaffName || 'nhân viên kho'}.`);
        setSelectedBatchOrders(new Set());
        fetchOverviewOrders(false);
      } else {
        showToast('error', 'Không thể giao việc.');
      }
    } catch {
      showToast('error', 'Có lỗi khi giao việc.');
    }
  };



  // Xác nhận gom đủ 100% vật tư để mở khoá xuất kho
  const handleQuickPack = async () => {
    if (!selectedOrder) return;
    try {
      const targetId = selectedOrder.id || selectedOrder.code || selectedOrder.exportCode;
      const res = await fetch(`/api/logistics/tickets/${targetId}/quick-pack`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('success', 'Đã xác nhận gom đủ 100% vật tư. Nút Xuất kho đã được mở khoá!');
        setOrderDetails((prev) =>
          prev.map((it: any) => ({
            ...it,
            pickedQty: it.qty ?? it.requestedQty,
          }))
        );
        setSelectedOrder((prev: any) => ({
          ...prev,
          trangThai: 'PACKED',
        }));
        fetchOverviewOrders(false);
      } else {
        showToast('error', 'Không thể hoàn thành gom hàng.');
      }
    } catch {
      showToast('error', 'Lỗi khi cập nhật trạng thái gom hàng.');
    }
  };

  // Xuất danh sách hàng hoá ra file Excel
  const handleExportInventoryExcel = async () => {
    try {
      showToast('info', 'Đang trích xuất dữ liệu kho hàng ra file Excel...');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType && filterType !== 'all') params.append('categoryId', filterType);
      if (filterWarehouse && filterWarehouse !== 'all') params.append('warehouseId', filterWarehouse);
      params.append('limit', '999999');

      const res = await fetch(`/api/logistics/inventory?${params.toString()}`);
      const data = await res.json();
      let exportItems = data.items || [];
      if (filterStatus && filterStatus !== 'all') {
        exportItems = exportItems.filter((it: any) => it.trangThai === filterStatus);
      }

      if (!exportItems.length) {
        showToast('error', 'Không có dữ liệu hàng hoá để xuất Excel.');
        return;
      }

      let totHeThong = 0;
      let totDaGiu = 0;
      let totThucTon = 0;

      const dataRows = exportItems.map((item: any, index: number) => {
        const soLuong = item.soLuong || 0;
        const daGiu = item.soLuongGiu ?? 0;
        const thucTon = item.thucTon ?? Math.max(0, soLuong - daGiu);
        totHeThong += soLuong;
        totDaGiu += daGiu;
        totThucTon += thucTon;

        return [
          index + 1,
          item.code || '',
          item.maThayThe || '',
          item.tenHang || '',
          item.model || '',
          item.chatLieu || '',
          item.categoryName || item.category?.name || 'Thiết bị & Phụ kiện',
          item.donVi || 'cái',
          soLuong,
          daGiu,
          thucTon,
          item.trangThai === 'con-hang' ? 'Còn hàng' : item.trangThai === 'sap-het' ? 'Sắp hết' : 'Hết hàng',
        ];
      });

      const today = new Date();
      const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const selectedWhName = filterWarehouse && filterWarehouse !== 'all'
        ? warehouses.find((w) => w.id === filterWarehouse)?.name || 'Kho hàng đã chọn'
        : 'Tất cả kho hàng hệ thống';

      exportStandardReportExcel({
        fileName: `Danh_Sach_Hang_Hoa_Ton_Kho_${today.toISOString().split('T')[0]}`,
        sheetName: 'Ton_Kho_Thuc_Te',
        formCode: 'Mẫu số S08-DN',
        title: 'BÁO CÁO TỒN KHO THỰC TẾ & VỊ TRÍ LƯU TRỮ',
        subtitle: `Thời điểm kết xuất: Ngày ${dateFormatted}`,
        extraInfo: [
          `Kho hàng áp dụng: ${selectedWhName}`,
          `Bộ phận phụ trách: Khối Vận hành Kho & Chuỗi cung ứng Seajong`,
        ],
        headers: [
          ['STT', 'Mã hàng', 'Mã phụ', 'Tên vật tư, hàng hoá', 'Model / Quy cách', 'Chất liệu', 'Danh mục', 'ĐVT', 'Tồn hệ thống', 'Đã giữ', 'Tồn thực tế', 'Trạng thái'],
        ],
        columnsWidths: [6, 15, 15, 36, 20, 16, 22, 10, 14, 12, 14, 14],
        data: dataRows,
        totalsRow: [
          'TỔNG CỘNG', '', '', '', '', '', '', '', totHeThong, totDaGiu, totThucTon, '',
        ],
        signatures: ['Người lập biểu', 'Thủ kho', 'Kế toán kho', 'Giám đốc'],
      });

      showToast('success', `Đã xuất ${exportItems.length} mặt hàng ra file Excel thành công.`);
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('error', 'Lỗi khi xuất file Excel.');
    }
  };

  // Nhập dữ liệu hàng hoá từ file Excel
  const handleImportInventoryExcel = async (file: File) => {
    try {
      showToast('info', `Đang đọc dữ liệu từ file "${file.name}"...`);
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        showToast('error', 'File Excel không hợp lệ hoặc không có sheet dữ liệu.');
        return;
      }
      const ws = wb.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      if (!rows.length) {
        showToast('error', 'File Excel không có dòng dữ liệu nào.');
        return;
      }

      let importedCount = 0;
      for (const row of rows) {
        const tenHang = String(
          row['Tên vật tư, hàng hoá'] ||
          row['Tên hàng hoá'] ||
          row['Tên hàng'] ||
          row['tenHang'] ||
          row['Name'] ||
          ''
        ).trim();
        const code = String(
          row['Mã hàng'] ||
          row['Mã SKU'] ||
          row['code'] ||
          row['Code'] ||
          ''
        ).trim();
        const donVi = String(
          row['Đơn vị tính'] ||
          row['ĐVT'] ||
          row['donVi'] ||
          'cái'
        ).trim();

        if (!tenHang) continue;
        try {
          const res = await fetch('/api/logistics/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenHang,
              code: code || undefined,
              donVi,
            }),
          });
          if (res.ok) importedCount++;
        } catch {
          // Bỏ qua dòng lỗi hoặc trùng mã
        }
      }

      loadStepData();
      showToast(
        'success',
        importedCount > 0
          ? `Đã nhập thành công ${importedCount}/${rows.length} mặt hàng từ "${file.name}".`
          : `Đã đọc ${rows.length} dòng từ "${file.name}" (các mã hàng đã tồn tại được giữ nguyên).`
      );
    } catch (err) {
      console.error('Import Excel error:', err);
      showToast('error', 'Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
    }
  };

  // Cấu hình Toolbar Filters cho Step 1 & Step 3 (dùng chung cấu trúc lọc theo loại lệnh)
  const toolbarFilters = useMemo<TableToolbarFilter[]>(() => {
    return [
      {
        id: 'logistics-order-type',
        label: 'Loại',
        value: filterType,
        minWidth: '170px',
        onChange: (val) => {
          setFilterType(val);
          setCurrentPage(1);
        },
        options: [
          { label: 'Tất cả loại lệnh', value: 'all' },
          { label: 'Nhập kho', value: 'IMPORT' },
          { label: 'Xuất kho', value: 'EXPORT' },
        ],
      },
    ];
  }, [filterType]);

  // Xử lý hành động Xuất kho / Nhập kho / In phiếu từ Offcanvas chi tiết lệnh
  const handleProcessOrderAction = () => {
    if (!selectedOrder) return;

    if (isRowCompleted(selectedOrder)) {
      setPrintVoucherItem({
        code: selectedOrder.exportCode || selectedOrder.code,
        type: selectedOrder.type === 'material-import' ? 'INBOUND' : 'OUTBOUND',
        warehouseName:
          selectedOrder.ticketType === 'MATERIAL_PICKING' ||
            selectedOrder.type === 'material-export'
            ? 'Kho Vật Tư Phụ Kiện (KVP)'
            : 'Kho Chính Seajong',
        note: selectedOrder.typeLabel,
        executor: selectedOrder.assigneeName || 'Lương Xuân Trung',
        items: orderDetails.map((it: any) => ({
          itemName: it.name,
          itemCode: it.code || '',
          unit: it.unit || 'cái',
          quantity: Number(it.pickedQty ?? it.qty) || 0,
          unitPrice: Number(it.giaBan) || 0,
        })),
      });
      return;
    }

    if (selectedOrder.type === 'material-import') {
      setNhapKhoTaskId(selectedOrder.id);
      const isReturn =
        selectedOrder.typeLabel?.includes('trả lại') ||
        selectedOrder.typeLabel?.includes('hàng lỗi') ||
        selectedOrder.code?.startsWith('ERR-');
      setNhapKhoMode(
        isReturn
          ? 'return'
          : selectedOrder.typeLabel?.toLowerCase().includes('vật tư')
            ? 'po'
            : 'production'
      );
      setNhapKhoSoBienBanQC(selectedOrder.code?.startsWith('QC-') ? selectedOrder.code : '');
      setNhapKhoPurchaseOrderId(selectedOrder.purchaseOrderId || null);
      setNhapKhoPurchaseOrderCode(selectedOrder.purchaseOrderCode || null);
      setNhapKhoShippingFee(selectedOrder.shippingFee || 0);
      setShowNhapKhoModal(true);
      setSelectedOrder(null);
      return;
    }

    const isDefect =
      selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
      !!selectedOrder.defectRecordId ||
      (typeof selectedOrder.saleOrderCode === 'string' &&
        selectedOrder.saleOrderCode.startsWith('ERR-')) ||
      (typeof selectedOrder.code === 'string' && selectedOrder.code.startsWith('ERR-'));

    if (isDefect) {
      setXuatKhoOrderType('defect');
      setXuatKhoDefectId(
        selectedOrder.defectRecordId ||
        selectedOrder.saleOrderCode ||
        selectedOrder.code ||
        selectedOrder.id
      );
      setXuatKhoTicketId(
        selectedOrder.type === 'logistics-ticket' ? selectedOrder.id : undefined
      );
      setShowXuatKhoModal(true);
      setSelectedOrder(null);
      return;
    }

    const isBatchPacking = selectedOrder.ticketType === 'BATCH_PACKING';

    const isProduction =
      !isBatchPacking &&
      Boolean(
        selectedOrder.code?.startsWith('LSX-') ||
        selectedOrder.typeLabel?.includes('sản xuất') ||
        selectedOrder.ticketType === 'MATERIAL_PICKING' ||
        selectedOrder.hasProduction ||
        orderDetails.some((it: any) => it.isMaterial)
      );

    if (isProduction) {
      setXuatKhoOrderType('wo');
      const resolvedWoId =
        (selectedOrder.code?.startsWith('LSX-') ? selectedOrder.code : null) ||
        (selectedOrder.saleOrderCode
          ? selectedOrder.saleOrderCode
            .replace('DBH', 'LSX')
            .replace('DHBL', 'LSX')
            .replace('DH', 'LSX')
          : null) ||
        selectedOrder.code ||
        selectedOrder.id;
      setXuatKhoWoId(resolvedWoId);
      setXuatKhoSoId(
        selectedOrder.saleOrderId ||
        (selectedOrder.type === 'sale-order' ? selectedOrder.id : undefined)
      );
      setXuatKhoTicketId(
        selectedOrder.type === 'logistics-ticket' ? selectedOrder.id : undefined
      );
      setShowXuatKhoModal(true);
      setSelectedOrder(null);
      return;
    }

    let isSo = false;
    if (selectedOrder.type === 'sale-order') {
      isSo = true;
    } else if (selectedOrder.type === 'logistics-ticket') {
      isSo = selectedOrder.ticketType === 'BATCH_PACKING';
    }

    setXuatKhoOrderType(isSo ? 'so' : 'wo');
    setXuatKhoSoId(
      selectedOrder.saleOrderId ||
      (selectedOrder.type === 'sale-order' ? selectedOrder.id : undefined)
    );
    setXuatKhoWoId(
      selectedOrder.saleOrderCode
        ? selectedOrder.saleOrderCode
          .replace('DBH', 'LSX')
          .replace('DHBL', 'LSX')
          .replace('DH', 'LSX')
        : selectedOrder.type === 'sale-order' && selectedOrder.code
          ? selectedOrder.code
            .replace('DBH', 'LSX')
            .replace('DHBL', 'LSX')
            .replace('DH', 'LSX')
          : selectedOrder.id
    );
    setXuatKhoTicketId(
      selectedOrder.type === 'logistics-ticket' ? selectedOrder.id : undefined
    );
    setShowXuatKhoModal(true);
    setSelectedOrder(null);
  };

  return (
    <StepPage
      className="logistics-mobile-page"
      title="Bộ phận kho vận"
      description="Quản lý dòng chảy hàng hóa, điều phối lệnh xuất nhập kho & cảnh báo an toàn kho thời gian thực"
      icon="bi-box-seam"
      color="emerald"
      badge="BỘ PHẬN KHO VẬN"
      steps={LOGISTICS_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={true}
      stepperExtraRight={
        <div className="flex items-center gap-2 pr-0.5 sm:pr-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEventCalendarOpen(true)}
            leftIcon={<CalendarEvent className="text-blue-600 shrink-0" size={15} />}
            className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:border-slate-300 select-none shrink-0"
            title="Mở Lịch sự kiện Seajong"
          >
            <span className="hidden sm:inline font-bold text-slate-800 tracking-tight">Lịch sự kiện</span>
          </Button>
          <DepartmentActionMenu />
        </div>
      }
    >
      {/* Toast thông báo */}
      {showToastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${showToastMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : showToastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-sky-50 border-sky-300 text-sky-800'
            }`}
        >
          <span>{showToastMsg.message}</span>
        </div>
      )}

      {currentStep === 2 ? (
        <>
          {/* ── BƯỚC 2: THANH CÔNG CỤ, BẢNG DANH SÁCH HÀNG HOÁ & PAGINATION RIÊNG ── */}
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
            filterCategory={filterType}
            onCategoryChange={(val) => {
              setFilterType(val);
              setCurrentPage(1);
            }}
            searchValue={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            onAdd={() => {
              setEditingInventoryItem(null);
              setIsCreatingInventoryItem(true);
            }}
            onExportExcel={handleExportInventoryExcel}
            onImportExcel={handleImportInventoryExcel}
            onRefresh={() => loadStepData()}
            showMenu={true}
          />

          <InventoryTable
            items={inventory}
            loading={loading}
            onSelectItem={(item) => setSelectedDetailItem({ ...item, itemCategory: 'inventory' })}
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
        </>
      ) : (
        <>
          {/* ── THANH CÔNG CỤ TABLETOOLBAR CHUẨN DOANH NGHIỆP (BƯỚC 1 & 3) ── */}
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            searchPlaceholder={
              currentStep === 1
                ? 'Tìm khách hàng, mã đơn hàng, số biên bản QC, mã lệnh...'
                : 'Tìm mã chứng từ, tên hàng, kho hàng, người thực hiện...'
            }
            filters={toolbarFilters}
            rightActions={
              <div className={`flex items-center gap-2 ${currentStep === 1 ? 'logistics-toolbar-assign-group flex-1 sm:flex-initial min-w-0' : ''}`}>
                {currentStep === 1 && (
                  <>
                    <div
                      ref={staffSelectWrapRef}
                      className="flex-1 sm:flex-initial sm:w-[205px] min-w-[120px]"
                      title={!isThuKho ? 'Chỉ tài khoản Thủ kho mới có quyền giao việc' : undefined}
                    >
                      <EmployeeSelect
                        multiple={false}
                        value={selectedStaffName}
                        employees={staffEmployeeItems}
                        departmentFilter="Kho"
                        onChange={(val, selectedObjs) => {
                          setSelectedStaffName(val);
                          const emp = selectedObjs?.[0];
                          setSelectedStaff(emp ? String(emp.id) : '');
                        }}
                        placeholder="Chọn nhân viên..."
                        searchPlaceholder="Tìm tên nhân viên kho..."
                        disabled={!isThuKho}
                        allowManualInput={false}
                        hidePositionBadge={true}
                        clearable={true}
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedBatchOrders.size === 0 || !isThuKho}
                      onClick={handleAssignBatchOrders}
                      title="Giao việc gom hàng và dán nhãn cho nhân viên kho"
                      style={{
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Giao việc</span>
                      {selectedBatchOrders.size > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '18px',
                            height: '18px',
                            padding: selectedBatchOrders.size >= 10 ? '0 5px' : '0 2px',
                            borderRadius: '9999px',
                            backgroundColor: '#ffffff',
                            color: 'var(--color-primary, #0284c7)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            lineHeight: 1,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                            marginLeft: '2px',
                          }}
                        >
                          {selectedBatchOrders.size}
                        </span>
                      )}
                    </Button>
                  </>
                )}
                {currentStep === 3 && (
                  <DeleteButton
                    size="sm"
                    label="Xóa"
                    itemCount={selectedBatchOrders.size}
                    disabled={selectedBatchOrders.size === 0 || !isThuKho}
                    title={!isThuKho ? 'Chỉ tài khoản Thủ kho mới có quyền xóa dữ liệu' : 'Xóa các lệnh đã chọn'}
                    dialogTitle="Xác nhận xoá dữ liệu"
                    dialogMessage={`Bạn có chắc chắn muốn xóa ${selectedBatchOrders.size} lệnh đã chọn khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.`}
                    confirmText="Xác nhận xoá"
                    cancelText="Hủy bỏ"
                    onConfirm={handleBatchDeleteOrders}
                  />
                )}
              </div>
            }
            onRefresh={() => loadStepData()}
            showMenu={currentStep !== 1}
            menuItems={
              currentStep === 3
                ? [
                  {
                    id: 'cleanup-settings',
                    label: 'Thiết lập xoá',
                    icon: <ClockHistory size={15} style={{ color: '#d97706', flexShrink: 0 }} />,
                    onClick: () => setShowCleanupOffcanvas(true),
                  },
                  {
                    id: 'divider',
                    label: '',
                    divider: true,
                    onClick: () => { },
                  },
                  {
                    id: 'refresh-data',
                    label: 'Làm mới dữ liệu',
                    icon: <ArrowRepeat size={15} style={{ color: '#8b5cf6', flexShrink: 0 }} />,
                    onClick: () => loadStepData(),
                  },
                ]
                : undefined
            }
          />

          {/* ── BẢNG FULLWIDTHTABLE CHO BƯỚC 1 & 3 (CẤU TẠO NHÓM LỆNH ĐỒNG NHẤT) ── */}
          <FullWidthTable loading={loading}>
            {(currentStep === 1 || currentStep === 3) && (
              <table
                className={`w-full text-left border-collapse logistics-overview-compact-table ${currentStep === 3 ? 'swipeable-delete-table' : 'keep-mobile-checkbox'
                  }`}
                style={{ fontSize: '13px' }}
              >
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] sm:text-[11.5px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-1.5 sm:px-3 w-7 md:w-10 text-center"></th>
                    <th className="py-2.5 px-2 sm:px-3.5 w-auto md:w-[50%]">Mã lệnh</th>
                    <th className="hidden md:table-cell py-2.5 px-2.5 sm:px-3.5 w-[25%] whitespace-nowrap">Loại</th>
                    <th className="hidden md:table-cell py-2.5 px-3.5 w-[25%] text-center whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 px-4 text-slate-400">
                        <i className="bi bi-inbox text-2xl block mb-1.5 opacity-50" />
                        {currentStep === 1
                          ? 'Chưa có lệnh xuất/nhập kho nào đang chờ xử lý'
                          : 'Chưa có lệnh xuất/nhập kho nào đã hoàn thành khớp điều kiện tìm kiếm'}
                      </td>
                    </tr>
                  ) : (
                    paginatedGroups.map((group, groupIdx) => {
                      const {
                        orderCode,
                        items,
                        groupStatusText,
                        groupStatusBadgeClass,
                        customerName,
                        customerAddress,
                        supplierName,
                        purchaseOrderCode,
                        isPurchaseOrderGroup,
                        ghiChu,
                        isGroupImport,
                        latestDate,
                        needsProduction,
                      } = group;

                      const isToggled = collapsedGroups.has(orderCode);
                      const isCollapsed = groupIdx === 0 ? isToggled : !isToggled;

                      const groupHeaderInner = (
                        <div className="flex flex-col justify-center w-full min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                            <span className="font-bold text-slate-800 text-[12px]">
                              <span className="hidden md:inline">
                                {orderCode.startsWith('QC-')
                                  ? 'SỐ HIỆU BIÊN BẢN QC: '
                                  : orderCode.startsWith('ERR-')
                                    ? 'SỐ HIỆU HỒ SƠ LỖI: '
                                    : 'SỐ HIỆU ĐƠN HÀNG: '}
                              </span>
                              <span className="inline md:hidden">
                                {orderCode.startsWith('QC-')
                                  ? 'BIÊN BẢN QC: '
                                  : orderCode.startsWith('ERR-')
                                    ? 'HỒ SƠ LỖI: '
                                    : 'ĐƠN HÀNG: '}
                              </span>
                              <span className="text-blue-600 font-mono">{orderCode}</span>
                            </span>

                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${groupStatusBadgeClass}`}
                            >
                              {groupStatusText}
                            </span>

                            {needsProduction && currentStep !== 3 && (
                              <span
                                className="inline-flex items-center justify-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#b45309',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                }}
                                title="Cần sản xuất"
                              >
                                <i className="bi bi-gear-wide-connected text-[11px] md:text-[10px]" />
                                <span className="hidden md:inline">Cần sản xuất</span>
                              </span>
                            )}

                            {latestDate > 0 && (
                              <span className="hidden md:flex text-slate-500 text-[11px] items-center gap-1">
                                <i className="bi bi-clock" />
                                {new Date(latestDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>

                          {/* Dòng thông tin phụ: Nhà cung cấp / Đơn mua hàng / Lệnh sản xuất / Khách hàng */}
                          {isPurchaseOrderGroup ? (
                            <div className="mt-0.5 flex items-center flex-wrap gap-1 text-slate-500 font-semibold text-[11px]">
                              {(supplierName || customerName) && (
                                <>
                                  <i className="bi bi-person" />
                                  <span>
                                    Nhà cung cấp:{' '}
                                    <strong className="text-slate-800">{supplierName || customerName}</strong>
                                  </span>
                                  <span className="mx-1 text-slate-300">|</span>
                                </>
                              )}
                              <i className="bi bi-file-earmark-text" />
                              <span>
                                Theo đơn mua hàng:{' '}
                                <strong className="text-slate-800">{purchaseOrderCode || 'Đang xử lý'}</strong>
                              </span>
                              {customerAddress && (
                                <>
                                  <span className="mx-1 text-slate-300">|</span>
                                  <i className="bi bi-geo-alt" />
                                  <span>{customerAddress}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <>
                              {isGroupImport && (orderCode.includes('-DH-') || orderCode.startsWith('QC-')) && (
                                <div className="mt-0.5 text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                                  <i className="bi bi-file-earmark-text" />
                                  <span>
                                    {orderCode.includes('-DH-')
                                      ? `Theo đơn mua hàng số: ${orderCode.match(/(DH-\d+(-\d+)?)/)?.[0] || orderCode}`
                                      : (() => {
                                        const prodOrders = Array.from(
                                          new Set(items.map((it) => it.productionOrder).filter(Boolean))
                                        );
                                        if (prodOrders.length > 0) {
                                          return `Theo lệnh sản xuất: ${prodOrders.join(', ')}`;
                                        }
                                        return `Theo lệnh sản xuất: ${orderCode.replace('QC-', 'LSX-')}`;
                                      })()}
                                  </span>
                                </div>
                              )}

                              {(() => {
                                const validCustomer =
                                  customerName &&
                                  !customerName.includes('Từ hồ sơ') &&
                                  !customerName.startsWith('ERR-');
                                if (!validCustomer && !customerAddress) return null;
                                return (
                                  <div className="mt-0.5 flex items-center flex-wrap gap-1 text-slate-500 font-semibold text-[11px]">
                                    {validCustomer && (
                                      <>
                                        <i className="bi bi-person" />
                                        <span>
                                          Khách hàng: <strong className="text-slate-800">{customerName}</strong>
                                        </span>
                                        {customerAddress && <span className="mx-1 text-slate-300">|</span>}
                                      </>
                                    )}
                                    {!validCustomer && customerAddress && <i className="bi bi-geo-alt" />}
                                    {customerAddress && <span>{customerAddress}</span>}
                                  </div>
                                );
                              })()}
                            </>
                          )}

                          {ghiChu && (
                            <div className="mt-0.5 text-rose-600 text-[11px] flex items-center gap-1 font-medium">
                              <i className="bi bi-exclamation-triangle-fill" />
                              <span>{ghiChu}</span>
                            </div>
                          )}
                        </div>
                      );

                      return (
                        <React.Fragment key={`group-${orderCode}`}>
                          {/* ── DÒNG HEADER PHÂN NHÓM ĐƠN HÀNG / QC / HỒ SƠ LỖI (CHUẨN CLIENT-SEAJONG) ── */}
                          <tr
                            className="bg-slate-50/95 hover:bg-slate-100/80 transition-colors cursor-pointer select-none border-t border-b border-slate-200/90"
                            onClick={() => {
                              setCollapsedGroups((prev) => {
                                const next = new Set(prev);
                                if (next.has(orderCode)) next.delete(orderCode);
                                else next.add(orderCode);
                                return next;
                              });
                            }}
                          >
                            {/* Cột 1: Mũi tên mở/đóng thay cho checkbox */}
                            <td
                              className="py-2 px-1.5 sm:px-3 w-7 sm:w-10 text-center align-middle"
                            >
                              <i
                                className={`bi ${isCollapsed ? 'bi-caret-right-fill' : 'bi-caret-down-fill'
                                  } text-slate-500 text-xs`}
                              />
                            </td>

                            <td colSpan={1} className="table-cell md:hidden py-2 px-2 sm:px-3.5">
                              {groupHeaderInner}
                            </td>
                            <td colSpan={3} className="hidden md:table-cell py-2 px-2 sm:px-3.5">
                              {groupHeaderInner}
                            </td>
                          </tr>

                          {/* ── CÁC DÒNG LỆNH CON TRONG NHÓM (HIỂN THỊ KHI MỞ) ── */}
                          {!isCollapsed &&
                            items.map((row: any) => {
                              const isImport = row.type === 'material-import';
                              const isMaterial =
                                row.ticketType === 'WARRANTY_MATERIAL' ||
                                row.ticketType === 'MATERIAL_PICKING' ||
                                row.type === 'material-export';

                              let typeTextClass = 'text-blue-600';
                              let typeLabel = 'Xuất kho';
                              let mobileCodeBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200/90';
                              if (isImport) {
                                typeTextClass = 'text-emerald-600';
                                typeLabel = row.typeLabel?.includes('hàng lỗi') ? 'Nhập hàng lỗi' : 'Nhập kho';
                                mobileCodeBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/90';
                              } else if (isMaterial) {
                                typeTextClass = 'text-amber-600';
                                typeLabel = 'Cấp phát vật tư';
                                mobileCodeBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200/90';
                              }

                              const lowerStatus = String(row.trangThai || '').toLowerCase();
                              const tkStatus = String(row.trangThaiKho || row.saleOrderTrangThaiKho || '').toLowerCase();
                              let statusTextClass = 'text-slate-600';
                              let statusText = row.trangThai || 'Chờ xử lý';

                              if (
                                lowerStatus === 'active' ||
                                lowerStatus === 'processing' ||
                                lowerStatus === 'partial' ||
                                lowerStatus === 'picking' ||
                                lowerStatus === 'packing' ||
                                lowerStatus === 'in_progress'
                              ) {
                                statusTextClass = 'text-amber-600';
                                statusText = 'Đang xử lý';
                              } else if (lowerStatus === 'confirmed' || lowerStatus === 'approved') {
                                statusTextClass = 'text-sky-600';
                                statusText = 'Đã xác nhận';
                              } else if (lowerStatus === 'pending' || lowerStatus === 'unpaid') {
                                statusTextClass = 'text-rose-600';
                                statusText = 'Chờ xử lý';
                              } else if (lowerStatus === 'in_production') {
                                statusTextClass = 'text-slate-600';
                                statusText = 'Đang sản xuất';
                              } else if (
                                lowerStatus === 'completed' ||
                                lowerStatus === 'done' ||
                                lowerStatus === 'delivered' ||
                                (row.type === 'sale-order' && tkStatus === 'exported')
                              ) {
                                statusTextClass = 'text-emerald-600';
                                if (row.type === 'material-import') {
                                  statusText = row.typeLabel?.includes('hàng lỗi')
                                    ? 'Đã nhập hàng lỗi'
                                    : 'Đã nhập kho';
                                } else if (row.ticketType === 'MATERIAL_PICKING') {
                                  statusText = 'Đã xuất vật tư';
                                } else if (row.ticketType === 'WARRANTY_MATERIAL') {
                                  statusText = 'Đã cấp phát';
                                } else {
                                  statusText = 'Đã xuất kho';
                                }
                              } else if (lowerStatus === 'packed' || lowerStatus === 'picked') {
                                statusTextClass = 'text-emerald-600 font-semibold';
                                statusText = row.ticketType === 'BATCH_PACKING' ? 'Đã đủ hàng' : 'Đã gom đủ hàng';
                              }

                              return (
                                <SwipeableTableRow
                                  key={row.id}
                                  rowId={`log-${row.id}`}
                                  onEdit={() => handleRowClick(row)}
                                  onDelete={async () => {
                                    await fetch('/api/logistics/overview-orders/batch-delete', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ items: [{ id: row.id, type: row.type }] }),
                                    });
                                    showToast('success', 'Đã xóa lệnh thành công');
                                    fetchOverviewOrders(false);
                                  }}
                                  deleteConfirmTitle="Xác nhận xóa lệnh"
                                  deleteConfirmMessage="Bạn có chắc chắn muốn xóa lệnh xuất/nhập kho này? Thao tác này không thể hoàn tác."
                                  onClick={() => handleRowClick(row)}
                                  className="hover:bg-sky-50/40 transition-colors border-b border-slate-100 cursor-pointer bg-white"
                                >
                                  {/* Cột 1: Checkbox chọn dòng lệnh (hỗ trợ cả Bước 1 & Bước 3) */}
                                  <td
                                    className="py-2 px-1.5 sm:px-3 w-7 sm:w-10 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      disabled={!isThuKho}
                                      checked={selectedBatchOrders.has(row.id)}
                                      onChange={(e) => {
                                        if (!isThuKho) return;
                                        const next = new Set(selectedBatchOrders);
                                        if (e.target.checked) next.add(row.id);
                                        else next.delete(row.id);
                                        setSelectedBatchOrders(next);
                                      }}
                                    />
                                  </td>

                                  {/* Cột 2: Mã lệnh & Chứng từ / Người phụ trách */}
                                  <td className="py-2 px-2 sm:px-3.5 align-middle max-w-0 md:max-w-none w-full overflow-hidden">
                                    <div className="flex items-center flex-nowrap md:flex-wrap gap-1.5 sm:gap-2">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11.5px] font-bold font-mono shrink-0 whitespace-nowrap ${mobileCodeBadgeClass} md:p-0 md:border-0 md:bg-transparent md:rounded-none md:text-blue-600 md:text-[13px]`}
                                        title={typeLabel}
                                      >
                                        {row.exportCode}
                                      </span>
                                      {row.requestedDate && (
                                        <span className="text-slate-500 text-[10.5px] sm:text-[11px] inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                                          <i className="bi bi-calendar-event" />
                                          {new Date(row.requestedDate).toLocaleDateString('vi-VN')}
                                        </span>
                                      )}
                                      {row.assigneeName && (
                                        <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-700 truncate max-w-[80px] sm:max-w-none">
                                          | {row.assigneeName}
                                        </span>
                                      )}
                                      <NewBadge show={!readOrderIds.has(row.id)} />
                                    </div>
                                    <div className="text-slate-500 text-[11.5px] sm:text-[12px] truncate sm:max-w-md mt-0.5">
                                      {row.typeLabel}{' '}
                                      {row.code?.startsWith('QC-') ? row.code : row.saleOrderCode || row.code}{' '}
                                      {row.customer &&
                                        !String(row.customer).includes('Từ hồ sơ') &&
                                        !String(row.customer).startsWith('ERR-')
                                        ? `- ${row.customer}`
                                        : ''}
                                    </div>
                                  </td>

                                  {/* Cột 3: Loại công việc (Không tô màu nền) */}
                                  <td className="hidden md:table-cell py-2 px-2.5 sm:px-3.5 align-middle whitespace-nowrap">
                                    <span className={`text-[11.5px] sm:text-[12.5px] font-semibold ${typeTextClass}`}>
                                      {typeLabel}
                                    </span>
                                  </td>

                                  {/* Cột 4: Trạng thái (Không tô màu nền) */}
                                  <td className="hidden md:table-cell py-2 px-3.5 align-middle text-center whitespace-nowrap">
                                    <span className={`text-[11.5px] sm:text-[12.5px] font-semibold ${statusTextClass}`}>
                                      {statusText}
                                    </span>
                                  </td>
                                </SwipeableTableRow>
                              );
                            })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </FullWidthTable>

          {/* ── PHÂN TRANG PAGINATION CHUẨN ENTERPRISE (BƯỚC 1 & 3) ── */}
          <Pagination
            currentPage={currentPage}
            totalItems={sortedGroups.groupArray.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      {/* ── OFFCANVAS CHI TIẾT LỆNH KHO BƯỚC 1 (CHUẨN CLIENT-SEAJONG 400PX) ── */}
      {selectedOrder && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          icon={<BoxSeam size={20} />}
          title="Chi tiết lệnh kho"
          description={
            <div className="text-slate-500 flex items-center flex-wrap gap-1.5 mt-0.5 text-xs font-normal">
              {selectedOrder.ticketType === 'WARRANTY_MATERIAL' ? (
                <>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                    <i className="bi bi-tools mr-1 text-amber-500" />
                    {selectedOrder.saleOrderCode || 'Hồ sơ lỗi'}
                  </span>
                  {selectedOrder.customer && !String(selectedOrder.customer).includes('Từ hồ sơ') && (
                    <span>• {selectedOrder.customer}</span>
                  )}
                </>
              ) : selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                selectedOrder.type === 'material-export' ||
                selectedOrder.code?.startsWith('LSX-') ||
                selectedOrder.typeLabel?.includes('sản xuất') ||
                selectedOrder.hasProduction ? (
                <>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                    <i className="bi bi-gear mr-1 text-amber-600" />
                    Lệnh SX: {selectedOrder.code || selectedOrder.saleOrderCode}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200"
                  >
                    <i className="bi bi-diagram-3 text-[9.5px]" />
                    Xuất kho vật tư (BOM)
                  </span>
                  {selectedOrder.customer && <span>• {selectedOrder.customer}</span>}
                </>
              ) : (
                <>
                  {selectedOrder.saleOrderCode ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                      <i className="bi bi-receipt mr-1 text-sky-600" />
                      Đơn: {selectedOrder.saleOrderCode}
                    </span>
                  ) : selectedOrder.code?.startsWith('QC-') ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                      <i className="bi bi-shield-check mr-1 text-emerald-600" />
                      {selectedOrder.code}
                    </span>
                  ) : (
                    <span>{selectedOrder.typeLabel}</span>
                  )}
                  {selectedOrder.customer &&
                    !String(selectedOrder.customer).includes('Từ hồ sơ') &&
                    !String(selectedOrder.customer).startsWith('ERR-') && (
                      <span>• {selectedOrder.customer}</span>
                    )}
                </>
              )}
            </div>
          }
          width="400px"
          position="right"
          footer={
            <div className="flex items-center justify-between gap-2 w-full">
              <DeleteButton
                size="sm"
                label="Xóa"
                disabled={!isThuKho}
                title="Xóa lệnh này"
                dialogTitle="Xác nhận xóa lệnh"
                dialogMessage="Bạn có chắc chắn muốn xóa lệnh xuất/nhập kho này? Thao tác này không thể hoàn tác."
                confirmText="Xóa lệnh"
                cancelText="Hủy bỏ"
                onConfirm={handleDeleteOrder}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer size={14} />}
                  disabled={!canPrint}
                  className="!hidden md:!inline-flex"
                  onClick={() => {
                    if (!canPrint) return;
                    setShowPrintLabelModal(true);
                  }}
                  title={
                    !canPrint
                      ? 'Chưa được cấp quyền In phiếu kho & in tem nhiệt'
                      : 'In nhãn'
                  }
                >
                  In nhãn
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  title={
                    isRowCompleted(selectedOrder)
                      ? !canPrint
                        ? 'Chưa được cấp quyền In phiếu kho & in tem nhiệt'
                        : undefined
                      : (Boolean(
                        selectedOrder.type === 'logistics-ticket' ||
                        selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                        selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                        selectedOrder.ticketType === 'BATCH_PACKING' ||
                        selectedOrder.code?.startsWith('LSX-') ||
                        selectedOrder.exportCode?.startsWith('LXK-VT-') ||
                        selectedOrder.typeLabel?.includes('sản xuất') ||
                        orderDetails.some((it: any) => it.isMaterial)
                      ) &&
                        !(
                          selectedOrder.trangThai === 'PACKED' ||
                          selectedOrder.trangThai === 'COMPLETED' ||
                          selectedOrder.trangThai === 'PICKED' ||
                          selectedOrder.trangThai === 'da_cap_phat' ||
                          (orderDetails.length > 0 &&
                            orderDetails.every((it: any) => (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)))
                        ))
                        ? 'Chưa thể xuất kho: Cần phân công gom hàng và gom đủ 100% vật tư theo định mức trước khi mở khoá xuất kho.'
                        : !canInOut
                          ? 'Chưa được cấp quyền Thực hiện xuất / nhập & kiểm kho'
                          : undefined
                  }
                  disabled={
                    isRowCompleted(selectedOrder)
                      ? !canPrint
                      : (Boolean(
                        selectedOrder.type === 'logistics-ticket' ||
                        selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                        selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                        selectedOrder.ticketType === 'BATCH_PACKING' ||
                        selectedOrder.code?.startsWith('LSX-') ||
                        selectedOrder.exportCode?.startsWith('LXK-VT-') ||
                        selectedOrder.typeLabel?.includes('sản xuất') ||
                        orderDetails.some((it: any) => it.isMaterial)
                      ) &&
                        !(
                          selectedOrder.trangThai === 'PACKED' ||
                          selectedOrder.trangThai === 'COMPLETED' ||
                          selectedOrder.trangThai === 'PICKED' ||
                          selectedOrder.trangThai === 'da_cap_phat' ||
                          (orderDetails.length > 0 &&
                            orderDetails.every((it: any) => (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)))
                        )) ||
                      !canInOut
                  }
                  onClick={handleProcessOrderAction}
                >
                  {(() => {
                    if (isRowCompleted(selectedOrder)) {
                      return selectedOrder.type === 'material-import' ? 'In phiếu nhập kho' : 'In phiếu xuất kho';
                    }
                    if (selectedOrder.type === 'material-import') {
                      return 'Nhập kho';
                    }
                    const isPicking = Boolean(
                      selectedOrder.type === 'logistics-ticket' ||
                      selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                      selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                      selectedOrder.ticketType === 'BATCH_PACKING' ||
                      selectedOrder.code?.startsWith('LSX-') ||
                      selectedOrder.exportCode?.startsWith('LXK-VT-') ||
                      selectedOrder.typeLabel?.includes('sản xuất') ||
                      orderDetails.some((it: any) => it.isMaterial)
                    );
                    const isPacked =
                      selectedOrder.trangThai === 'PACKED' ||
                      selectedOrder.trangThai === 'COMPLETED' ||
                      selectedOrder.trangThai === 'PICKED' ||
                      selectedOrder.trangThai === 'da_cap_phat' ||
                      (orderDetails.length > 0 &&
                        orderDetails.every((it: any) => (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)));

                    if (isPicking && !isPacked) {
                      return selectedOrder.ticketType === 'BATCH_PACKING'
                        ? 'Chưa gom đủ hàng'
                        : 'Chưa gom đủ vật tư';
                    }
                    return 'Xuất kho';
                  })()}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-xs sm:text-[13px] text-slate-700">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                {selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                  selectedOrder.ticketType === 'MATERIAL_PICKING'
                  ? 'Mã lệnh cấp phát vật tư:'
                  : `Mã lệnh ${selectedOrder.type === 'material-import' ? 'nhập' : 'xuất'} kho:`}
              </span>
              <span className="font-mono font-bold text-sky-700 text-xs bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {selectedOrder.exportCode}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <h6 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <i className="bi bi-box-seam text-sky-600" />
                <span>
                  {selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                    selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                    selectedOrder.code?.startsWith('LSX-') ||
                    selectedOrder.typeLabel?.includes('sản xuất') ||
                    orderDetails.some((it: any) => it.isMaterial)
                    ? 'Danh sách vật tư xuất kho (BOM)'
                    : 'Danh sách hàng hoá'}
                </span>
              </h6>
            </div>

            {fetchingDetails ? (
              <div className="py-8 text-center text-slate-400">Đang tải dữ liệu...</div>
            ) : orderDetails.length > 0 ? (
              <div className="space-y-3">
                {/* ── TIẾN ĐỘ GOM HÀNG CẤP PHÁT VẬT TƯ (QUY TRÌNH CHUẨN) ── */}
                {Boolean(
                  selectedOrder.type === 'logistics-ticket' ||
                  selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                  selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                  selectedOrder.ticketType === 'BATCH_PACKING' ||
                  selectedOrder.code?.startsWith('LSX-') ||
                  selectedOrder.exportCode?.startsWith('LXK-VT-') ||
                  selectedOrder.typeLabel?.includes('sản xuất') ||
                  orderDetails.some((it: any) => it.isMaterial)
                ) && !isRowCompleted(selectedOrder) && (
                    <div
                      className={`p-3 rounded-xl border space-y-2.5 ${selectedOrder.trangThai === 'PACKED' ||
                        selectedOrder.trangThai === 'COMPLETED' ||
                        (orderDetails.length > 0 &&
                          orderDetails.every(
                            (it: any) => (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                          ))
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50/70 border-amber-200'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-800">
                          <i
                            className={`bi ${selectedOrder.trangThai === 'PACKED' ||
                              selectedOrder.trangThai === 'COMPLETED' ||
                              (orderDetails.length > 0 &&
                                orderDetails.every(
                                  (it: any) =>
                                    (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                                ))
                              ? 'bi-check-circle-fill text-emerald-600'
                              : 'bi-boxes text-amber-600'
                              }`}
                          />
                          Tiến độ gom hàng cấp phát:
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${selectedOrder.trangThai === 'PACKED' ||
                            selectedOrder.trangThai === 'COMPLETED' ||
                            (orderDetails.length > 0 &&
                              orderDetails.every(
                                (it: any) =>
                                  (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                              ))
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                        >
                          {selectedOrder.trangThai === 'PACKED' ||
                            selectedOrder.trangThai === 'COMPLETED' ||
                            (orderDetails.length > 0 &&
                              orderDetails.every(
                                (it: any) =>
                                  (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                              ))
                            ? 'Đã gom đủ 100%'
                            : `${orderDetails.filter(
                              (it: any) =>
                                (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                            ).length
                            }/${orderDetails.length} loại (${orderDetails.length > 0
                              ? Math.round(
                                (orderDetails.filter(
                                  (it: any) =>
                                    (Number(it.pickedQty) || 0) >=
                                    (Number(it.qty ?? it.requestedQty) || 1)
                                ).length /
                                  orderDetails.length) *
                                100
                              )
                              : 0
                            }%)`}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${selectedOrder.trangThai === 'PACKED' ||
                            selectedOrder.trangThai === 'COMPLETED' ||
                            (orderDetails.length > 0 &&
                              orderDetails.every(
                                (it: any) =>
                                  (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                              ))
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                            }`}
                          style={{
                            width: `${orderDetails.length > 0
                              ? Math.round(
                                (orderDetails.filter(
                                  (it: any) =>
                                    (Number(it.pickedQty) || 0) >=
                                    (Number(it.qty ?? it.requestedQty) || 1)
                                ).length /
                                  orderDetails.length) *
                                100
                              )
                              : 0
                              }%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <span className="text-slate-500">Phụ trách:</span>
                          <strong className="text-slate-800 font-semibold">
                            {selectedOrder.assigneeName || 'Chưa giao việc'}
                          </strong>
                        </div>

                        {!(
                          selectedOrder.trangThai === 'PACKED' ||
                          selectedOrder.trangThai === 'COMPLETED' ||
                          (orderDetails.length > 0 &&
                            orderDetails.every(
                              (it: any) =>
                                (Number(it.pickedQty) || 0) >= (Number(it.qty ?? it.requestedQty) || 1)
                            ))
                        ) &&
                          isThuKho && (
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 hover:underline flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-sky-200 shadow-sm cursor-pointer"
                              onClick={handleQuickPack}
                              title="Xác nhận đã gom đủ toàn bộ vật tư theo định mức để mở khoá xuất kho"
                            >
                              <i className="bi bi-check2-all text-sky-600" />
                              <span>Xác nhận gom đủ</span>
                            </button>
                          )}
                      </div>

                      {/* Nếu chưa giao việc thì hiển thị thanh giao việc cho nhân viên kho */}
                    </div>
                  )}

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold">
                      <tr>
                        <th className="py-2 px-3 w-[65%]">
                          {selectedOrder.code?.startsWith('LSX-') ||
                            selectedOrder.typeLabel?.includes('sản xuất') ||
                            orderDetails.some((it: any) => it.isMaterial)
                            ? 'Vật tư / Linh kiện (BOM)'
                            : 'Sản phẩm'}
                        </th>
                        <th className="py-2 px-3 w-[35%] text-right">
                          {Boolean(
                            selectedOrder.type === 'logistics-ticket' ||
                            selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                            selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                            selectedOrder.code?.startsWith('LSX-') ||
                            selectedOrder.typeLabel?.includes('sản xuất') ||
                            orderDetails.some((it: any) => it.isMaterial)
                          )
                            ? 'Đã gom / Cần xuất'
                            : 'SL cần xuất'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderDetails.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 align-top">
                            <div className="font-semibold text-slate-900">
                              {row.name}
                              {row.isShortage && (
                                <span
                                  className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold"
                                  title={`Thiếu hàng trong kho (Tồn: ${row.stockQty ?? 0} ${row.unit || 'cái'})`}
                                >
                                  Thiếu kho
                                </span>
                              )}
                            </div>
                            {row.ghiChu && (
                              <div className="text-slate-500 text-[11px] mt-0.5 italic flex items-center gap-1">
                                <i className="bi bi-diagram-3 text-sky-600" />
                                <span>{row.ghiChu}</span>
                              </div>
                            )}
                            {row.bomCode && (
                              <div className="flex items-center flex-wrap gap-1 mt-1">
                                <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold">
                                  <i className="bi bi-diagram-3 mr-1" />
                                  {row.bomCode}
                                </span>
                                {row.dinhMucTen && (
                                  <span className="text-slate-400 italic text-[10.5px]">
                                    {row.dinhMucTen}
                                  </span>
                                )}
                              </div>
                            )}
                            {row.type && (
                              <div className="text-slate-400 text-[11px] mt-0.5">
                                <i className="bi bi-box-seam mr-1" />
                                {row.type}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                            {Boolean(
                              selectedOrder.type === 'logistics-ticket' ||
                              selectedOrder.ticketType === 'MATERIAL_PICKING' ||
                              selectedOrder.ticketType === 'WARRANTY_MATERIAL' ||
                              selectedOrder.code?.startsWith('LSX-') ||
                              selectedOrder.typeLabel?.includes('sản xuất') ||
                              orderDetails.some((it: any) => it.isMaterial)
                            ) ? (
                              <div className="flex flex-col items-end">
                                <span
                                  className={`font-bold ${(Number(row.pickedQty) || 0) < Number(row.qty || 1)
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                    }`}
                                >
                                  {row.pickedQty || 0} / {row.qty}
                                  <span className="font-normal text-slate-400 ml-1 text-[11px]">
                                    {row.unit || 'cái'}
                                  </span>
                                </span>
                                <span
                                  className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded mt-0.5 border ${(Number(row.pickedQty) || 0) >= Number(row.qty || 1)
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                >
                                  {(Number(row.pickedQty) || 0) >= Number(row.qty || 1)
                                    ? 'Đã gom đủ'
                                    : 'Chưa gom'}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-sky-700">
                                {row.qty}{' '}
                                <span className="font-normal text-slate-400 text-[11px]">
                                  {row.unit || 'cái'}
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Không tìm thấy hàng hoá nào
              </div>
            )}
          </div>
        </Offcanvas>
      )}

      {/* ── MODALS XUẤT KHO / NHẬP KHO / IN NHÃN CHUẨN CLIENT-SEAJONG ── */}
      {showXuatKhoModal && (
        <XuatKhoModal
          initialMode={xuatKhoOrderType}
          initialSoId={xuatKhoSoId}
          initialWoId={xuatKhoWoId}
          initialDefectId={xuatKhoDefectId}
          initialTicketId={xuatKhoTicketId}
          onClose={() => setShowXuatKhoModal(false)}
          onSaved={() => {
            fetchOverviewOrders(false);
          }}
        />
      )}

      {showNhapKhoModal && (
        <NhapKhoModal
          initialItems={orderDetails}
          initialTaskId={nhapKhoTaskId}
          initialMode={nhapKhoMode}
          initialSoBienBanQC={nhapKhoSoBienBanQC}
          initialPurchaseOrderId={nhapKhoPurchaseOrderId}
          initialPurchaseOrderCode={nhapKhoPurchaseOrderCode}
          initialShippingFee={nhapKhoShippingFee}
          onClose={() => setShowNhapKhoModal(false)}
          onSaved={() => {
            fetchOverviewOrders(false);
          }}
        />
      )}

      <PrintLabelModal
        open={showPrintLabelModal}
        onClose={() => setShowPrintLabelModal(false)}
        items={orderDetails as any[]}
      />

      {/* ── OFFCANVAS XEM CHI TIẾT HÀNG HOÁ KHO (STEP 2) ── */}
      <InventoryDetailOffcanvas
        item={selectedDetailItem?.itemCategory === 'inventory' ? selectedDetailItem : null}
        onClose={() => setSelectedDetailItem(null)}
        onEdit={(it) => {
          setSelectedDetailItem(null);
          setIsCreatingInventoryItem(false);
          setEditingInventoryItem(it);
        }}
        onUpdated={() => {
          loadStepData();
        }}
      />

      <InventoryItemFormModal
        isOpen={isCreatingInventoryItem || Boolean(editingInventoryItem)}
        mode={editingInventoryItem ? 'edit' : 'create'}
        item={editingInventoryItem}
        warehouses={warehouses}
        categories={categories}
        defaultWarehouseId={filterWarehouse !== 'all' ? filterWarehouse : undefined}
        defaultCategoryId={filterType !== 'all' ? filterType : undefined}
        onClose={() => {
          setIsCreatingInventoryItem(false);
          setEditingInventoryItem(null);
        }}
        onSaved={(savedItem, savedMode) => {
          loadStepData();
          showToast(
            'success',
            savedMode === 'create'
              ? `Đã thêm mới mặt hàng "${savedItem.tenHang}" (${savedItem.code || 'SKU'}) vào kho thành công!`
              : `Đã cập nhật mặt hàng "${savedItem.tenHang}" thành công!`
          );
        }}
      />

      {/* ── OFFCANVAS HIỂN THỊ DANH SÁCH HÀNG HOÁ ĐÃ XỬ LÝ (STEP 3) ── */}
      {selectedDetailItem && selectedDetailItem.itemCategory === 'completed' && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedDetailItem(null)}
          icon={<FileEarmarkText size={20} />}
          title="Chi tiết chứng từ kho"
          description={`Mã chứng từ: ${selectedDetailItem.code}`}
          width="400px"
          position="right"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-slate-500">
                Tổng đã xử lý:{' '}
                <strong className="text-slate-800 font-bold">
                  {selectedDetailItem.totalQuantity || 0}
                </strong>{' '}
                {selectedDetailItem.items?.[0]?.unit || 'sản phẩm'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrintVoucherItem(selectedDetailItem)}
                  className="flex items-center gap-1.5 !text-slate-700 hover:!bg-slate-100 hover:!border-slate-300"
                >
                  <Printer size={13} className="text-slate-600" />
                  <span>In phiếu</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDetailItem(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-700">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sky-800 text-sm bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {selectedDetailItem.code}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${selectedDetailItem.type === 'INBOUND'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                >
                  {selectedDetailItem.typeLabel ||
                    (selectedDetailItem.type === 'INBOUND' ? 'Nhập kho' : 'Xuất kho')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Kho thực hiện:</span>
                  <span className="font-semibold text-slate-800 line-clamp-1">
                    {selectedDetailItem.warehouseName || 'Kho chính'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Người thực hiện:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDetailItem.executor || 'Lê Công Vụ'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400 block">Thời gian hoàn thành:</span>
                  <span className="font-medium text-slate-700">{selectedDetailItem.completedAt}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Danh sách hàng hoá đã xử lý
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {selectedDetailItem.items?.length || 0} mặt hàng
                </span>
              </div>

              <div className="space-y-2">
                {selectedDetailItem.items && selectedDetailItem.items.length > 0 ? (
                  selectedDetailItem.items.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-shadow flex items-start gap-3 shadow-xs"
                    >
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.itemName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <BoxSeam size={20} className="text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
                          {it.itemName}
                        </div>
                        {it.itemCode && (
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                            SKU: <span className="text-slate-700 font-semibold">{it.itemCode}</span>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Số lượng:</span>
                          <span
                            className={`font-bold text-xs px-2 py-0.5 rounded border ${selectedDetailItem.type === 'INBOUND'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                          >
                            {selectedDetailItem.type === 'INBOUND' ? '+' : '-'}
                            {it.quantity} {it.unit || 'cái'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Chưa có danh sách mặt hàng
                  </div>
                )}
              </div>
            </div>
          </div>
        </Offcanvas>
      )}

      {/* ── MODAL XEM TRƯỚC & IN PHIẾU NHẬP / XUẤT KHO CHUẨN BIỂU MẪU (STEP 3) ── */}
      {printVoucherItem && printVoucherItem.type === 'INBOUND' && (
        <PhieuNhapKhoPreview
          soChungTu={printVoucherItem.code}
          ngayNhap={new Date().toISOString().split('T')[0]}
          khoName={printVoucherItem.warehouseName || 'Kho chính'}
          lyDo={printVoucherItem.note || printVoucherItem.typeLabel || 'Nhập kho'}
          nguoiThucHien={printVoucherItem.executor || ''}
          lines={(printVoucherItem.items || []).map((it: any) => ({
            tenHang: it.itemName || '',
            maSku: it.itemCode || '',
            donVi: it.unit || 'cái',
            soLuongCT: Number(it.quantity) || 0,
            soLuong: Number(it.quantity) || 0,
            donGia: Number(it.unitPrice) || 0,
          }))}
          onClose={() => setPrintVoucherItem(null)}
        />
      )}

      {printVoucherItem && printVoucherItem.type !== 'INBOUND' && (
        <PhieuXuatKhoPreview
          soChungTu={printVoucherItem.code}
          ngayXuat={new Date().toISOString().split('T')[0]}
          khoName={printVoucherItem.warehouseName || 'Kho chính'}
          lyDo={printVoucherItem.note || printVoucherItem.typeLabel || 'Xuất kho'}
          nguoiThucHien={printVoucherItem.executor || ''}
          lines={(printVoucherItem.items || []).map((it: any) => ({
            tenHang: it.itemName || '',
            maSku: it.itemCode || '',
            donVi: it.unit || 'cái',
            soLuongYC: Number(it.quantity) || 0,
            soLuong: Number(it.quantity) || 0,
            donGia: Number(it.unitPrice) || 0,
          }))}
          onClose={() => setPrintVoucherItem(null)}
        />
      )}

      {/* ── OFFCANVAS LỊCH SỰ KIỆN ĐA NĂNG ── */}
      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />

      {/* ── OFFCANVAS THIẾT LẬP XOÁ DỮ LIỆU LƯU TRỮ (BƯỚC 3: ĐÃ HOÀN THÀNH) ── */}
      <DataRetentionOffcanvas
        isOpen={showCleanupOffcanvas}
        onClose={() => setShowCleanupOffcanvas(false)}
        ticketType="ALL"
        title="Thiết lập thời gian lưu trữ"
        description="Cấu hình tự động dọn dẹp các phiếu và lệnh kho đã lưu trữ"
        entityLabel="lệnh"
        onCleanedUp={() => loadStepData()}
      />
    </StepPage>
  );
};

export default LogisticsOverviewPage;
