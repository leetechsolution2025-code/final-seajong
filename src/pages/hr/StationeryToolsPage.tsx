import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BoxSeam,
  ClipboardCheck,
  Sliders,
  Tools,
  ArrowLeftRight,
  PlusLg,
  CheckLg,
  XLg,
  Truck,
  ExclamationTriangleFill,
  CheckCircleFill,
  ClockFill,
  PencilSquare,
  Trash,
  CartPlus,
  BoxArrowInDown,
  SendFill,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { Toggle } from '../../components/common/Toggle';
import { Modal } from '../../components/common/Modal';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import type { ModernStepItem } from '../../types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

function EnterpriseDataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = 'Không có dữ liệu.',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <FullWidthTable loading={loading}>
      <table className="data-table w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && !loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-xs text-slate-400 font-medium"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={
                  onRowClick ? 'cursor-pointer hover:bg-slate-50/90 transition-colors' : ''
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      width: col.width,
                      textAlign: col.align || 'left',
                    }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </FullWidthTable>
  );
}

interface SupplyCategory {
  id: string;
  name: string;
  code: string;
}

interface SupplyItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  categoryId: string | null;
  category?: SupplyCategory;
  stockQty: number;
  minStock: number;
  unitPrice: number;
  isAsset: boolean;
  note: string | null;
}

interface SupplyRequestItem {
  id: string;
  itemId: string;
  item: SupplyItem;
  requestQty: number;
  approvedQty: number | null;
  unitPrice: number;
  note: string | null;
}

interface SupplyRequest {
  id: string;
  code: string;
  requesterId: string;
  requesterName: string;
  departmentId: string;
  departmentName: string;
  type: string;
  status: string;
  totalAmount: number;
  note: string | null;
  rejectionNote: string | null;
  requiresDirector: boolean;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierCode?: string | null;
  invoiceNo?: string | null;
  createdAt: string;
  items: SupplyRequestItem[];
}

interface StationeryNorm {
  id: string;
  departmentId: string | null;
  position: string | null;
  itemId: string;
  item: SupplyItem;
  limitQty: number;
  period: string;
  limitAmount: number;
}

interface DepartmentBudget {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  monthlyBudget: number;
  usedAmount: number;
  remainingAmount: number;
}

interface AssetHandover {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    fullName: string;
    code: string;
    departmentName: string;
    position: string;
  };
  itemId: string | null;
  assetId: string | null;
  item: {
    id: string;
    code: string;
    name: string;
    source: 'SUPPLY' | 'FINANCE' | 'UNKNOWN';
  };
  handoverDate: string;
  returnDate: string | null;
  conditionOnHandover: string;
  conditionOnReturn: string | null;
  status: string;
  note: string | null;
}

interface SupplyTransaction {
  id: string;
  itemId: string;
  item: SupplyItem;
  type: 'IN' | 'OUT';
  quantity: number;
  unitPrice: number | null;
  date: string;
  performedBy: string | null;
  note: string | null;
}

interface Department {
  id: string;
  nameVi: string;
  code: string;
}

interface EmployeeSimple {
  id: string;
  fullName: string;
  code: string;
  departmentName: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatVND = (val: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="warning">
          <ClockFill className="mr-1" size={10} /> Chờ duyệt
        </Badge>
      );
    case 'OVER_NORM':
      return (
        <Badge variant="danger">
          <ExclamationTriangleFill className="mr-1" size={10} /> Vượt định mức (Chờ GĐ)
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="info">
          <CheckCircleFill className="mr-1" size={10} /> Đã duyệt (Chờ cấp)
        </Badge>
      );
    case 'DELIVERED':
      return (
        <Badge variant="success">
          <Truck className="mr-1" size={10} /> Đã bàn giao
        </Badge>
      );
    case 'PURCHASING':
      return (
        <Badge variant="warning">
          <CartPlus className="mr-1" size={10} /> Đang mua hàng
        </Badge>
      );
    case 'RECEIVED':
      return (
        <Badge variant="success">
          <BoxArrowInDown className="mr-1" size={10} /> Đã nhập kho
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="danger">
          <XLg className="mr-1" size={10} /> Từ chối
        </Badge>
      );
    case 'USING':
      return <Badge variant="info">Đang sử dụng</Badge>;
    case 'RETURNED':
      return <Badge variant="success">Đã thu hồi</Badge>;
    case 'LOST':
      return <Badge variant="danger">Báo mất</Badge>;
    case 'DAMAGED':
      return <Badge variant="warning">Hư hỏng</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1: YÊU CẦU & CẤP PHÁT
// ══════════════════════════════════════════════════════════════════════════════

const RequestsTab: React.FC<{
  departments: Department[];
  items: SupplyItem[];
  onDataChange: () => void;
}> = ({ departments, items, onDataChange }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean; reqId: string }>({
    open: false,
    reqId: '',
  });
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create Request Offcanvas
  const [showCreateReqPanel, setShowCreateReqPanel] = useState(false);
  const [newReqDeptId, setNewReqDeptId] = useState('');
  const [newReqNote, setNewReqNote] = useState('');
  const [newReqLines, setNewReqLines] = useState<
    Array<{ itemId: string; requestQty: number; unitPrice: number }>
  >([{ itemId: '', requestQty: 1, unitPrice: 0 }]);

  // Purchase & Receive Modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseTab, setPurchaseTab] = useState<'ORDER' | 'RECEIVE'>('ORDER');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNote, setPoNote] = useState('');
  const [poItems, setPoItems] = useState<
    Array<{ itemId: string; requestQty: number; unitPrice: number }>
  >([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [receiveInvoiceNo, setReceiveInvoiceNo] = useState('');
  const [receiveItems, setReceiveItems] = useState<
    Record<string, { receivedQty: number; unitPrice: number }>
  >({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (deptFilter) params.set('departmentId', deptFilter);
      if (monthFilter) params.set('month', monthFilter);
      const res = await fetch(`/api/hr/stationery/requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, monthFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/procurement/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenPurchaseModal = () => {
    fetchSuppliers();
    const lowStock = items.filter((i) => !i.isAsset && i.stockQty <= i.minStock);
    if (lowStock.length > 0) {
      setPoItems(
        lowStock.map((i) => ({
          itemId: i.id,
          requestQty: Math.max(10, i.minStock * 2 - i.stockQty),
          unitPrice: i.unitPrice,
        }))
      );
    } else if (items.length > 0) {
      setPoItems([{ itemId: items[0].id, requestQty: 10, unitPrice: items[0].unitPrice }]);
    } else {
      setPoItems([]);
    }
    setSelectedSupplierId('');
    setPoNote('');
    setSelectedPoId('');
    setReceiveInvoiceNo('');
    setReceiveItems({});
    setPurchaseTab('ORDER');
    setShowPurchaseModal(true);
  };

  const handleCreatePurchaseOrder = async () => {
    const validItems = poItems.filter((i) => i.itemId && i.requestQty > 0);
    if (validItems.length === 0) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/stationery/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user?.id || 'system',
          departmentId: departments[0]?.id || '',
          type: 'PURCHASE',
          supplierId: selectedSupplierId || null,
          note: poNote || 'Đơn đặt mua hàng VPP bổ sung tồn kho',
          items: validItems,
        }),
      });
      if (res.ok) {
        await fetchRequests();
        onDataChange();
        setPurchaseTab('RECEIVE');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectPoToReceive = (poId: string) => {
    setSelectedPoId(poId);
    const po = requests.find((r) => r.id === poId);
    if (po) {
      setReceiveInvoiceNo(po.invoiceNo || '');
      const map: Record<string, { receivedQty: number; unitPrice: number }> = {};
      po.items.forEach((it) => {
        map[it.itemId] = {
          receivedQty: it.approvedQty ?? it.requestQty,
          unitPrice: it.unitPrice,
        };
      });
      setReceiveItems(map);
    } else {
      setReceiveItems({});
    }
  };

  const handleReceivePo = async () => {
    if (!selectedPoId) return;
    const po = requests.find((r) => r.id === selectedPoId);
    if (!po) return;

    setActionLoading(true);
    try {
      const itemsPayload = po.items.map((it) => ({
        itemId: it.itemId,
        receivedQty: receiveItems[it.itemId]?.receivedQty ?? it.requestQty,
        unitPrice: receiveItems[it.itemId]?.unitPrice ?? it.unitPrice,
      }));
      const res = await fetch(`/api/hr/stationery/requests/${selectedPoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE',
          invoiceNo: receiveInvoiceNo,
          items: itemsPayload,
          performedBy: user?.name || 'Phòng HCNS',
        }),
      });
      if (res.ok) {
        setShowPurchaseModal(false);
        fetchRequests();
        onDataChange();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSupplyRequest = async () => {
    const validLines = newReqLines.filter((l) => l.itemId && l.requestQty > 0);
    if (validLines.length === 0) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/hr/stationery/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: user?.id || 'system',
          departmentId: newReqDeptId || departments[0]?.id || '',
          type: 'STATIONERY',
          note: newReqNote || 'Đề xuất cấp phát văn phòng phẩm định kỳ',
          items: validLines,
        }),
      });
      if (res.ok) {
        setShowCreateReqPanel(false);
        setNewReqNote('');
        setNewReqLines([{ itemId: '', requestQty: 1, unitPrice: 0 }]);
        fetchRequests();
        onDataChange();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (reqId: string, action: string, extraData: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hr/stationery/requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          performedBy: user?.name || 'HCNS',
          ...extraData,
        }),
      });
      if (res.ok) {
        fetchRequests();
        onDataChange();
        setRejectModal({ open: false, reqId: '' });
        setRejectionNote('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const purchasingOrders = useMemo(
    () => requests.filter((r) => r.type === 'PURCHASE' && r.status === 'PURCHASING'),
    [requests]
  );

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.code.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q) ||
        r.departmentName.toLowerCase().includes(q)
      );
    });
  }, [requests, search]);

  const paginatedRequests = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [statusFilter, deptFilter, monthFilter, search]);

  const isAllSelected =
    paginatedRequests.length > 0 && paginatedRequests.every((r) => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedRequests.some((r) => r.id === id)));
    } else {
      const newIds = paginatedRequests.map((r) => r.id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...newIds]);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const reqStats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'PENDING' || r.status === 'OVER_NORM').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      delivered: requests.filter((r) => r.status === 'DELIVERED' || r.status === 'RECEIVED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
    }),
    [requests]
  );

  const columns: TableColumn<SupplyRequest>[] = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
          checked={isAllSelected}
          onChange={toggleSelectAll}
        />
      ),
      width: '40px',
      align: 'center',
      render: (r) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
          checked={selectedIds.includes(r.id)}
          onClick={(e) => toggleSelectRow(r.id, e)}
          onChange={() => {}}
        />
      ),
    },
    {
      key: 'code',
      header: 'MÃ YÊU CẦU',
      width: '130px',
      render: (r) => <span className="font-bold text-gray-800 text-xs">{r.code}</span>,
    },
    {
      key: 'requester',
      header: 'NGƯỜI YÊU CẦU',
      width: '180px',
      render: (r) => (
        <div>
          <div className="font-semibold text-gray-900 text-xs">{r.requesterName}</div>
          <div className="text-[11px] text-gray-500">{r.departmentName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'PHÂN LOẠI',
      width: '130px',
      render: (r) => (
        <Badge variant={r.type === 'PURCHASE' ? 'warning' : 'neutral'}>
          {r.type === 'PURCHASE' ? 'Mua sắm VPP' : 'Cấp phát VPP'}
        </Badge>
      ),
    },
    {
      key: 'items',
      header: 'NỘI DUNG YÊU CẦU',
      render: (r) => (
        <div className="space-y-1 max-w-md py-1">
          {r.supplierName && (
            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mb-1 border border-amber-200">
              NCC: {r.supplierName} {r.invoiceNo ? `• HĐ: ${r.invoiceNo}` : ''}
            </div>
          )}
          {r.items.map((it) => (
            <div key={it.id} className="text-xs text-gray-700 flex items-center justify-between gap-2">
              <span className="truncate font-medium">• {it.item?.name}</span>
              <span className="font-semibold text-gray-900 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                {it.approvedQty !== null ? `${it.approvedQty}/` : ''}
                {it.requestQty} {it.item?.unit}
              </span>
            </div>
          ))}
          {r.note && <div className="text-[11px] text-gray-400 italic mt-1">Ghi chú: {r.note}</div>}
          {r.rejectionNote && (
            <div className="text-[11px] text-red-500 font-medium mt-1">
              Lý do từ chối: {r.rejectionNote}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'TỔNG TIỀN',
      align: 'right',
      width: '120px',
      render: (r) => <span className="font-bold text-gray-900 text-xs">{formatVND(r.totalAmount)}</span>,
    },
    {
      key: 'date',
      header: 'NGÀY TẠO',
      width: '100px',
      render: (r) => <span className="text-xs text-gray-600">{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'TRẠNG THÁI',
      width: '170px',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      align: 'right',
      width: '210px',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {(r.status === 'PENDING' || r.status === 'OVER_NORM') && (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleAction(r.id, 'APPROVE')}
                disabled={actionLoading}
                title={r.status === 'OVER_NORM' ? 'Giám đốc phê duyệt vượt định mức' : 'Phê duyệt yêu cầu'}
              >
                <CheckLg size={13} className="mr-1" /> Duyệt
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setRejectModal({ open: true, reqId: r.id })}
                disabled={actionLoading}
              >
                <XLg size={13} />
              </Button>
            </>
          )}
          {r.status === 'APPROVED' && r.type !== 'PURCHASE' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleAction(r.id, 'DELIVER')}
              disabled={actionLoading}
            >
              <Truck size={13} className="mr-1" /> Cấp phát
            </Button>
          )}
          {r.status === 'PURCHASING' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                fetchSuppliers();
                setPurchaseTab('RECEIVE');
                handleSelectPoToReceive(r.id);
                setShowPurchaseModal(true);
              }}
              disabled={actionLoading}
            >
              <BoxArrowInDown size={13} className="mr-1" /> Nhập kho
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã phiếu, tên nhân viên..."
          onRefresh={fetchRequests}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-40">
                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                  <option value="">Phòng ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameVi}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-40">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Trạng thái</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="OVER_NORM">Vượt định mức (Chờ GĐ)</option>
                  <option value="APPROVED">Đã duyệt (Chờ cấp)</option>
                  <option value="DELIVERED">Đã bàn giao</option>
                  <option value="PURCHASING">Đang mua hàng</option>
                  <option value="RECEIVED">Đã nhập kho</option>
                  <option value="REJECTED">Từ chối</option>
                </Select>
              </div>
              <div className="w-36">
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
              </div>
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-1.5 mr-1">
                <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
                  {reqStats.pending} chờ
                </span>
                <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60">
                  {reqStats.approved} duyệt
                </span>
                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                  {reqStats.delivered} cấp
                </span>
                <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200/60">
                  {reqStats.rejected} lỗi
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<PlusLg size={13} />}
                onClick={() => {
                  setNewReqDeptId(departments[0]?.id || '');
                  setNewReqNote('');
                  setNewReqLines([
                    {
                      itemId: items[0]?.id || '',
                      requestQty: 1,
                      unitPrice: items[0]?.unitPrice || 0,
                    },
                  ]);
                  setShowCreateReqPanel(true);
                }}
              >
                Tạo đề xuất
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CartPlus size={14} />}
                onClick={handleOpenPurchaseModal}
              >
                Mua hàng
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EnterpriseDataTable
          columns={columns}
          data={paginatedRequests}
          rowKey={(r) => r.id}
          loading={loading}
          emptyText="Chưa có phiếu yêu cầu văn phòng phẩm nào."
        />
      </div>

      <div className="shrink-0">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {/* Offcanvas Tạo đề xuất cấp phát */}
      <Offcanvas
        isOpen={showCreateReqPanel}
        onClose={() => setShowCreateReqPanel(false)}
        title="Tạo đề xuất cấp phát VPP"
        icon={<ClipboardCheck size={20} />}
        width="520px"
        confirmText="Gửi đề xuất"
        cancelText="Hủy bỏ"
        onConfirm={handleCreateSupplyRequest}
        onCancel={() => setShowCreateReqPanel(false)}
        isSubmitting={actionLoading}
      >
        <div className="space-y-4">
          <Select
            label="Phòng ban yêu cầu *"
            value={newReqDeptId}
            onChange={(e) => setNewReqDeptId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameVi}
              </option>
            ))}
          </Select>

          <Input
            label="Nội dung / Lý do đề xuất"
            placeholder="VD: Cấp phát văn phòng phẩm định kỳ tháng..."
            value={newReqNote}
            onChange={(e) => setNewReqNote(e.target.value)}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Danh sách vật tư đề xuất
              </span>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<PlusLg size={12} />}
                onClick={() =>
                  setNewReqLines((prev) => [
                    ...prev,
                    { itemId: items[0]?.id || '', requestQty: 1, unitPrice: items[0]?.unitPrice || 0 },
                  ])
                }
              >
                Thêm dòng
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left p-2 font-semibold">Vật tư</th>
                    <th className="text-right p-2 font-semibold w-24">Số lượng</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {newReqLines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <Select
                          value={line.itemId}
                          onChange={(e) => {
                            const selected = items.find((i) => i.id === e.target.value);
                            const next = [...newReqLines];
                            next[idx] = {
                              ...next[idx],
                              itemId: e.target.value,
                              unitPrice: selected?.unitPrice || 0,
                            };
                            setNewReqLines(next);
                          }}
                        >
                          <option value="">-- Chọn vật tư --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} - {it.name} (Tồn: {it.stockQty} {it.unit})
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          value={line.requestQty}
                          onChange={(e) => {
                            const next = [...newReqLines];
                            next[idx].requestQty = Math.max(1, Number(e.target.value));
                            setNewReqLines(next);
                          }}
                        />
                      </td>
                      <td className="p-2 text-center">
                        {newReqLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewReqLines(newReqLines.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer border-0 bg-transparent"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* Modal Từ chối yêu cầu */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, reqId: '' })}
        title="Từ chối yêu cầu cấp phát"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setRejectModal({ open: false, reqId: '' })}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => handleAction(rejectModal.reqId, 'REJECT', { rejectionNote })}
              disabled={!rejectionNote.trim() || actionLoading}
            >
              Xác nhận từ chối
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Lý do từ chối *"
            placeholder="Nhập lý do từ chối..."
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* Modal Quản lý Mua sắm & Nhập kho */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="Quản lý Mua sắm & Nhập kho VPP"
        maxWidth="760px"
        footer={
          <div className="flex justify-between items-center w-full">
            <div className="text-xs text-gray-500">
              {purchaseTab === 'ORDER' ? (
                <span>
                  Tổng dự kiến:{' '}
                  <strong className="text-rose-600 text-sm">
                    {formatVND(
                      poItems.reduce((acc, i) => acc + i.requestQty * i.unitPrice, 0)
                    )}
                  </strong>
                </span>
              ) : (
                selectedPoId && (
                  <span>
                    Tổng thực nhập:{' '}
                    <strong className="text-emerald-600 text-sm">
                      {formatVND(
                        Object.values(receiveItems).reduce(
                          (acc, v) => acc + v.receivedQty * v.unitPrice,
                          0
                        )
                      )}
                    </strong>
                  </span>
                )
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowPurchaseModal(false)}>
                Đóng
              </Button>
              {purchaseTab === 'ORDER' ? (
                <Button
                  variant="primary"
                  onClick={handleCreatePurchaseOrder}
                  disabled={actionLoading || poItems.length === 0}
                  leftIcon={<SendFill size={13} />}
                >
                  Phát hành Đơn đặt hàng
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleReceivePo}
                  disabled={actionLoading || !selectedPoId}
                  leftIcon={<BoxArrowInDown size={14} />}
                >
                  Xác nhận Nhập kho
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setPurchaseTab('ORDER')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer bg-transparent ${
                purchaseTab === 'ORDER'
                  ? 'border-rose-600 text-rose-600 bg-rose-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CartPlus size={15} />
              1. Lập đơn mua hàng gửi NCC
            </button>
            <button
              type="button"
              onClick={() => setPurchaseTab('RECEIVE')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer bg-transparent ${
                purchaseTab === 'RECEIVE'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <BoxArrowInDown size={15} />
              2. Nhập kho từ đơn hàng ({purchasingOrders.length})
            </button>
          </div>

          {purchaseTab === 'ORDER' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label="Nhà cung cấp (Từ Phòng Mua hàng)"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">-- Chọn Nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `[${s.code}] ` : ''}
                      {s.name} {s.phone ? `- ${s.phone}` : ''}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Ghi chú đơn đặt hàng"
                  placeholder="VD: Giao hàng trong giờ hành chính..."
                  value={poNote}
                  onChange={(e) => setPoNote(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Danh sách mặt hàng cần mua
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<PlusLg size={12} />}
                    onClick={() =>
                      setPoItems([
                        ...poItems,
                        {
                          itemId: items[0]?.id || '',
                          requestQty: 10,
                          unitPrice: items[0]?.unitPrice || 0,
                        },
                      ])
                    }
                  >
                    Thêm mặt hàng
                  </Button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="text-left p-2 font-semibold">Vật tư / Văn phòng phẩm</th>
                        <th className="text-right p-2 font-semibold w-24">Số lượng</th>
                        <th className="text-right p-2 font-semibold w-32">Đơn giá dự kiến</th>
                        <th className="text-right p-2 font-semibold w-28">Thành tiền</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {poItems.map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <Select
                              value={row.itemId}
                              onChange={(e) => {
                                const it = items.find((x) => x.id === e.target.value);
                                const next = [...poItems];
                                next[idx] = {
                                  ...next[idx],
                                  itemId: e.target.value,
                                  unitPrice: it?.unitPrice || 0,
                                };
                                setPoItems(next);
                              }}
                            >
                              <option value="">-- Chọn vật tư --</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.code} - {it.name} (Tồn: {it.stockQty} {it.unit})
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={1}
                              value={row.requestQty}
                              onChange={(e) => {
                                const next = [...poItems];
                                next[idx].requestQty = Number(e.target.value);
                                setPoItems(next);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              value={row.unitPrice}
                              onChange={(e) => {
                                const next = [...poItems];
                                next[idx].unitPrice = Number(e.target.value);
                                setPoItems(next);
                              }}
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-gray-800">
                            {formatVND(row.requestQty * row.unitPrice)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer bg-transparent border-0"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label="Chọn Đơn mua hàng đang chờ giao *"
                  value={selectedPoId}
                  onChange={(e) => handleSelectPoToReceive(e.target.value)}
                >
                  <option value="">-- Chọn đơn hàng ({purchasingOrders.length} đơn) --</option>
                  {purchasingOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.code} {po.supplierName ? `- NCC: ${po.supplierName}` : ''} (
                      {formatDate(po.createdAt)})
                    </option>
                  ))}
                </Select>
                <Input
                  label="Số hóa đơn / Phiếu giao hàng"
                  placeholder="VD: HD-0012548"
                  value={receiveInvoiceNo}
                  onChange={(e) => setReceiveInvoiceNo(e.target.value)}
                />
              </div>

              {selectedPoId ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="text-left p-2 font-semibold">Mặt hàng</th>
                        <th className="text-center p-2 font-semibold w-24">SL Đặt</th>
                        <th className="text-right p-2 font-semibold w-28">SL Thực nhận</th>
                        <th className="text-right p-2 font-semibold w-32">Đơn giá nhập</th>
                        <th className="text-right p-2 font-semibold w-28">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests
                        .find((r) => r.id === selectedPoId)
                        ?.items.map((it) => {
                          const state = receiveItems[it.itemId] || {
                            receivedQty: it.requestQty,
                            unitPrice: it.unitPrice,
                          };
                          return (
                            <tr key={it.id}>
                              <td className="p-2 font-medium text-gray-800">
                                {it.item?.name}{' '}
                                <span className="text-gray-400">({it.item?.unit})</span>
                              </td>
                              <td className="p-2 text-center font-semibold text-gray-600">
                                {it.requestQty}
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={state.receivedQty}
                                  onChange={(e) =>
                                    setReceiveItems({
                                      ...receiveItems,
                                      [it.itemId]: {
                                        ...state,
                                        receivedQty: Number(e.target.value),
                                      },
                                    })
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={state.unitPrice}
                                  onChange={(e) =>
                                    setReceiveItems({
                                      ...receiveItems,
                                      [it.itemId]: {
                                        ...state,
                                        unitPrice: Number(e.target.value),
                                      },
                                    })
                                  }
                                />
                              </td>
                              <td className="p-2 text-right font-bold text-emerald-700">
                                {formatVND(state.receivedQty * state.unitPrice)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                  Vui lòng chọn một đơn đặt hàng ở trên để kiểm đếm và xác nhận nhập kho.
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2: QUẢN LÝ TỒN KHO
// ══════════════════════════════════════════════════════════════════════════════

const InventoryTab: React.FC<{
  items: SupplyItem[];
  categories: SupplyCategory[];
  loading: boolean;
  onRefresh: () => void;
}> = ({ items, categories, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [showItemPanel, setShowItemPanel] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'cái',
    categoryId: '',
    stockQty: 0,
    minStock: 5,
    unitPrice: 0,
    isAsset: false,
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    type: 'CATEGORY' | 'ITEM';
    id: string;
    name: string;
  }>({ open: false, type: 'ITEM', id: '', name: '' });

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (catFilter && it.categoryId !== catFilter) return false;
      if (stockStatusFilter === 'LOW' && it.stockQty > it.minStock) return false;
      if (stockStatusFilter === 'OK' && it.stockQty <= it.minStock) return false;
      if (search) {
        const q = search.toLowerCase();
        return it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, catFilter, stockStatusFilter, search]);

  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [catFilter, stockStatusFilter, search]);

  const isAllSelected =
    paginatedItems.length > 0 && paginatedItems.every((it) => selectedIds.includes(it.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedItems.some((it) => it.id === id)));
    } else {
      const newIds = paginatedItems.map((it) => it.id).filter((id) => !selectedIds.includes(id));
      setSelectedIds((prev) => [...prev, ...newIds]);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const fetchNextCode = async (catId: string) => {
    try {
      const res = await fetch(`/api/hr/stationery/items/next-code?categoryId=${catId || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.nextCode) {
          setFormData((prev) => ({ ...prev, code: data.nextCode }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openCreatePanel = () => {
    const defaultCatId = categories[0]?.id || '';
    setEditingItem(null);
    setFormData({
      code: 'Đang tạo mã...',
      name: '',
      unit: 'cái',
      categoryId: defaultCatId,
      stockQty: 0,
      minStock: 5,
      unitPrice: 0,
      isAsset: false,
      note: '',
    });
    setShowItemPanel(true);
    fetchNextCode(defaultCatId);
  };

  const openEditPanel = (item: SupplyItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      unit: item.unit,
      categoryId: item.categoryId || '',
      stockQty: item.stockQty,
      minStock: item.minStock,
      unitPrice: item.unitPrice,
      isAsset: item.isAsset,
      note: item.note || '',
    });
    setShowItemPanel(true);
  };

  const handleSaveItem = async () => {
    if (!formData.code || !formData.name) return;
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem ? { id: editingItem.id, ...formData } : formData;
      const res = await fetch('/api/hr/stationery/items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowItemPanel(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/hr/stationery/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName }),
      });
      if (res.ok) {
        setCatName('');
        setShowCatModal(false);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = () => {
    if (!catFilter) return;
    const cat = categories.find((c) => c.id === catFilter);
    if (!cat) return;
    setConfirmDelete({
      open: true,
      type: 'CATEGORY',
      id: catFilter,
      name: cat.name,
    });
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    setConfirmDelete({
      open: true,
      type: 'ITEM',
      id: editingItem.id,
      name: editingItem.name,
    });
  };

  const executeConfirmDelete = async () => {
    const { type, id } = confirmDelete;
    setSaving(true);
    try {
      if (type === 'CATEGORY') {
        const res = await fetch(`/api/hr/stationery/categories/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setCatFilter('');
          onRefresh();
        }
      } else {
        const res = await fetch(`/api/hr/stationery/items?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setShowItemPanel(false);
          onRefresh();
        }
      }
    } finally {
      setSaving(false);
      setConfirmDelete((prev) => ({ ...prev, open: false }));
    }
  };

  const columns: TableColumn<SupplyItem>[] = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
          checked={isAllSelected}
          onChange={toggleSelectAll}
        />
      ),
      width: '40px',
      align: 'center',
      render: (it) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
          checked={selectedIds.includes(it.id)}
          onClick={(e) => toggleSelectRow(it.id, e)}
          onChange={() => {}}
        />
      ),
    },
    {
      key: 'code',
      header: 'MÃ VẬT TƯ',
      width: '110px',
      render: (it) => <span className="font-mono font-bold text-xs text-gray-700">{it.code}</span>,
    },
    {
      key: 'name',
      header: 'TÊN VẬT TƯ / DỤNG CỤ',
      render: (it) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-gray-900 text-xs">{it.name}</div>
            {it.note && <div className="text-[11px] text-gray-400">{it.note}</div>}
          </div>
          {it.isAsset && <Badge variant="info">Dụng cụ</Badge>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'DANH MỤC',
      width: '150px',
      render: (it) => (
        <span className="text-xs text-gray-600">{it.category?.name || 'Chưa phân loại'}</span>
      ),
    },
    {
      key: 'unit',
      header: 'ĐƠN VỊ',
      width: '90px',
      align: 'center',
      render: (it) => <span className="text-xs text-gray-600">{it.unit}</span>,
    },
    {
      key: 'stock',
      header: 'TỒN KHO',
      width: '110px',
      align: 'right',
      render: (it) => {
        const isLow = it.stockQty <= it.minStock;
        return (
          <span className={`font-bold text-xs ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
            {it.stockQty}
          </span>
        );
      },
    },
    {
      key: 'minStock',
      header: 'TỐI THIỂU',
      width: '100px',
      align: 'right',
      render: (it) => <span className="text-xs text-gray-500">{it.minStock}</span>,
    },
    {
      key: 'price',
      header: 'ĐƠN GIÁ',
      width: '120px',
      align: 'right',
      render: (it) => (
        <span className="text-xs font-medium text-gray-800">{formatVND(it.unitPrice)}</span>
      ),
    },
    {
      key: 'status',
      header: 'TÌNH TRẠNG',
      width: '140px',
      align: 'center',
      render: (it) => {
        if (it.stockQty === 0) return <Badge variant="danger">HẾT HÀNG</Badge>;
        if (it.stockQty <= it.minStock) return <Badge variant="warning">SẮP HẾT</Badge>;
        return <Badge variant="success">SẴN SÀNG</Badge>;
      },
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm tên, mã vật tư..."
          onRefresh={onRefresh}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-44">
                  <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                    <option value="">Tất cả nhóm</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCatModal(true)}
                  title="Tạo nhóm danh mục mới"
                  className="px-2.5 shrink-0"
                >
                  <PlusLg size={14} />
                </Button>
                {catFilter && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteCategory}
                    disabled={saving}
                    title="Xóa danh mục đang chọn"
                    className="px-2.5 shrink-0"
                  >
                    <Trash size={14} />
                  </Button>
                )}
              </div>
              <div className="w-40">
                <Select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as 'ALL' | 'LOW' | 'OK')}
                >
                  <option value="ALL">Tất cả tình trạng</option>
                  <option value="LOW">Sắp hết hàng</option>
                  <option value="OK">Còn hàng</option>
                </Select>
              </div>
            </div>
          }
          actions={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusLg size={13} />}
              onClick={openCreatePanel}
            >
              Tạo mới
            </Button>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EnterpriseDataTable
          columns={columns}
          data={paginatedItems}
          rowKey={(it) => it.id}
          loading={loading}
          emptyText="Chưa có dữ liệu vật tư trong kho."
          onRowClick={(it) => openEditPanel(it)}
        />
      </div>

      <div className="shrink-0">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <Offcanvas
        isOpen={showItemPanel}
        onClose={() => setShowItemPanel(false)}
        title={editingItem ? 'Cập nhật vật tư' : 'Thêm vật tư mới'}
        icon={editingItem ? <PencilSquare size={20} /> : <BoxSeam size={20} />}
        width="440px"
        confirmText={editingItem ? 'Lưu cập nhật' : 'Tạo vật tư'}
        cancelText="Hủy bỏ"
        onConfirm={handleSaveItem}
        onCancel={() => setShowItemPanel(false)}
        isSubmitting={saving}
        confirmDisabled={!formData.code || !formData.name}
        footerLeft={
          editingItem ? (
            <Button
              variant="danger"
              onClick={handleDeleteItem}
              disabled={saving}
              leftIcon={<Trash size={14} />}
            >
              Xóa
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Thông tin định danh
            </div>
            <Input
              label="Tên vật tư / Dụng cụ *"
              placeholder="VD: Giấy in Double A A4"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mã vật tư (Tự động)"
                value={formData.code}
                readOnly
                disabled
              />
              <Select
                label="Đơn vị *"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="cái">Cái / Chiếc</option>
                <option value="hộp">Hộp</option>
                <option value="ram">Ram (Giấy)</option>
                <option value="quyển">Quyển / Cuốn</option>
                <option value="tờ">Tờ / Tập</option>
                <option value="bộ">Bộ</option>
                <option value="cuộn">Cuộn</option>
                <option value="gói">Gói</option>
              </Select>
            </div>
          </div>

          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Phân loại & Giá trị
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Thuộc nhóm"
                value={formData.categoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  setFormData({ ...formData, categoryId: newCatId });
                  if (!editingItem) fetchNextCode(newCatId);
                }}
              >
                <option value="">-- Chưa phân loại --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Đơn giá tham khảo (VNĐ)"
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
              />
            </div>

            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Dụng cụ</span>
              <div className="w-auto">
                <Toggle
                  checked={formData.isAsset}
                  onChange={(checked) => setFormData({ ...formData, isAsset: checked })}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-100 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Kiểm soát tồn kho
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tồn kho ban đầu"
                type="number"
                value={formData.stockQty}
                onChange={(e) => setFormData({ ...formData, stockQty: Number(e.target.value) })}
              />
              <Input
                label="Tồn kho tối thiểu"
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
              />
            </div>
            <Input
              label="Ghi chú thêm"
              placeholder="Quy cách, nhãn hiệu, nhà cung cấp..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>
        </div>
      </Offcanvas>

      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title="Tạo nhóm danh mục vật tư"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowCatModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateCategory} disabled={saving || !catName.trim()}>
              Lưu nhóm
            </Button>
          </div>
        }
      >
        <Input
          label="Tên danh mục *"
          placeholder="VD: Thiết bị CNTT, Đồ uống văn phòng..."
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmDelete.open}
        title={
          confirmDelete.type === 'CATEGORY'
            ? 'Xác nhận xóa danh mục'
            : 'Xác nhận xóa vật tư'
        }
        message={
          confirmDelete.type === 'CATEGORY'
            ? `Bạn có chắc chắn muốn xóa danh mục "${confirmDelete.name}" không?`
            : `Bạn có chắc chắn muốn xóa mặt hàng "${confirmDelete.name}" khỏi danh sách tồn kho không?`
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={saving}
        onConfirm={executeConfirmDelete}
        onCancel={() => setConfirmDelete((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3: ĐỊNH MỨC PHÒNG BAN
// ══════════════════════════════════════════════════════════════════════════════

const NormsTab: React.FC<{
  departments: Department[];
  items: SupplyItem[];
}> = ({ departments, items }) => {
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVER' | 'WARNING' | 'SAFE' | 'UNSET'>(
    'ALL'
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const [showNormPanel, setShowNormPanel] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentBudget | null>(null);
  const [norms, setNorms] = useState<StationeryNorm[]>([]);
  const [normsLoading, setNormsLoading] = useState(false);
  const [normSearch, setNormSearch] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/stationery/budgets?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.budgets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSaveBudget = async (deptId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/hr/stationery/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          monthlyBudget: budgetInput,
        }),
      });
      if (res.ok) {
        setEditingDeptId(null);
        fetchBudgets();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDeptNormDetail = async (dept: DepartmentBudget) => {
    setSelectedDept(dept);
    setNormSearch('');
    setEditingItemId(null);
    setShowNormPanel(true);
    setNormsLoading(true);
    try {
      const res = await fetch(`/api/hr/stationery/norms?departmentId=${dept.departmentId}`);
      if (res.ok) {
        const data = await res.json();
        setNorms(data.norms || []);
      }
    } finally {
      setNormsLoading(false);
    }
  };

  const handleSaveItemNorm = async (itemId: string) => {
    if (!selectedDept) return;
    setSaving(true);
    try {
      const res = await fetch('/api/hr/stationery/norms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: selectedDept.departmentId,
          itemId,
          limitQty: editQty,
          period: 'MONTHLY',
        }),
      });
      if (res.ok) {
        setEditingItemId(null);
        const reload = await fetch(
          `/api/hr/stationery/norms?departmentId=${selectedDept.departmentId}`
        );
        if (reload.ok) {
          const d = await reload.json();
          setNorms(d.norms || []);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (deptFilter && b.departmentId !== deptFilter) return false;
      if (statusFilter !== 'ALL') {
        const isOver = b.monthlyBudget > 0 && b.usedAmount > b.monthlyBudget;
        const isWarning = b.monthlyBudget > 0 && !isOver && b.usedAmount >= b.monthlyBudget * 0.8;
        const isSafe = b.monthlyBudget > 0 && !isOver && !isWarning;
        const isUnset = b.monthlyBudget === 0;
        if (statusFilter === 'OVER' && !isOver) return false;
        if (statusFilter === 'WARNING' && !isWarning) return false;
        if (statusFilter === 'SAFE' && !isSafe) return false;
        if (statusFilter === 'UNSET' && !isUnset) return false;
      }
      if (!search) return true;
      return b.departmentName.toLowerCase().includes(search.toLowerCase());
    });
  }, [budgets, deptFilter, statusFilter, search]);

  const paginatedBudgets = useMemo(
    () => filteredBudgets.slice((page - 1) * pageSize, page * pageSize),
    [filteredBudgets, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter, statusFilter, month]);

  const stationeryItems = useMemo(() => {
    return items.filter(
      (i) =>
        !i.isAsset &&
        (!normSearch || i.name.toLowerCase().includes(normSearch.toLowerCase()))
    );
  }, [items, normSearch]);

  const columns: TableColumn<DepartmentBudget>[] = [
    {
      key: 'dept',
      header: 'PHÒNG BAN',
      render: (b) => <div className="font-bold text-gray-900 text-xs">{b.departmentName}</div>,
    },
    {
      key: 'budget',
      header: 'NGÂN SÁCH THÁNG',
      width: '210px',
      align: 'right',
      render: (b) => {
        if (editingDeptId === b.departmentId) {
          return (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="number"
                className="w-28 px-2 py-1 text-xs border border-rose-400 rounded text-right font-bold focus:outline-none"
                value={budgetInput}
                onChange={(e) => setBudgetInput(Number(e.target.value))}
                autoFocus
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleSaveBudget(b.departmentId)}
                disabled={saving}
              >
                <CheckLg size={12} />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditingDeptId(null)}>
                <XLg size={12} />
              </Button>
            </div>
          );
        }
        return (
          <div
            className="flex items-center justify-end gap-2 group"
            onClick={(e) => {
              e.stopPropagation();
              setEditingDeptId(b.departmentId);
              setBudgetInput(b.monthlyBudget);
            }}
          >
            <span
              className={`font-bold text-xs ${
                b.monthlyBudget > 0 ? 'text-gray-900' : 'text-gray-400 italic'
              }`}
            >
              {b.monthlyBudget > 0 ? formatVND(b.monthlyBudget) : 'Chưa đặt hạn mức'}
            </span>
            <PencilSquare
              size={13}
              className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            />
          </div>
        );
      },
    },
    {
      key: 'used',
      header: 'ĐÃ SỬ DỤNG',
      width: '220px',
      render: (b) => {
        const pct =
          b.monthlyBudget > 0
            ? Math.min(100, Math.round((b.usedAmount / b.monthlyBudget) * 100))
            : 0;
        const isOver = b.monthlyBudget > 0 && b.usedAmount > b.monthlyBudget;
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
                {formatVND(b.usedAmount)}
              </span>
              {b.monthlyBudget > 0 && (
                <span className="text-[11px] text-gray-500">
                  {Math.round((b.usedAmount / b.monthlyBudget) * 100)}%
                </span>
              )}
            </div>
            {b.monthlyBudget > 0 && (
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'remaining',
      header: 'CÒN LẠI',
      width: '140px',
      align: 'right',
      render: (b) => {
        if (b.monthlyBudget === 0) return <span className="text-xs text-gray-400">—</span>;
        const isNeg = b.remainingAmount < 0;
        return (
          <span className={`font-bold text-xs ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>
            {formatVND(b.remainingAmount)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'TÌNH TRẠNG',
      width: '150px',
      align: 'center',
      render: (b) => {
        if (b.monthlyBudget === 0) return <Badge variant="neutral">Chưa thiết lập</Badge>;
        if (b.usedAmount > b.monthlyBudget) return <Badge variant="danger">VƯỢT ĐỊNH MỨC</Badge>;
        if (b.usedAmount >= b.monthlyBudget * 0.8) return <Badge variant="warning">SẮP HẾT</Badge>;
        return <Badge variant="success">AN TOÀN</Badge>;
      },
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm tên phòng ban..."
          onRefresh={fetchBudgets}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-40">
                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                  <option value="">Phòng ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameVi}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as 'ALL' | 'OVER' | 'WARNING' | 'SAFE' | 'UNSET'
                    )
                  }
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="OVER">Vượt định mức</option>
                  <option value="WARNING">Sắp hết</option>
                  <option value="SAFE">Trong định mức</option>
                  <option value="UNSET">Chưa thiết lập</option>
                </Select>
              </div>
              <div className="w-36">
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EnterpriseDataTable
          columns={columns}
          data={paginatedBudgets}
          rowKey={(b) => b.departmentId}
          loading={loading}
          emptyText="Chưa có dữ liệu phòng ban."
          onRowClick={(b) => openDeptNormDetail(b)}
        />
      </div>

      <div className="shrink-0">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredBudgets.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <Offcanvas
        isOpen={showNormPanel}
        onClose={() => setShowNormPanel(false)}
        title={
          selectedDept
            ? `Định mức: ${selectedDept.departmentName}`
            : 'Định mức vật tư chi tiết'
        }
        icon={<Sliders size={20} />}
        width="520px"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={() => setShowNormPanel(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            placeholder="Tìm nhanh vật tư trong danh sách..."
            value={normSearch}
            onChange={(e) => setNormSearch(e.target.value)}
          />

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="py-2.5 px-3">Vật tư</th>
                  <th className="py-2.5 px-2 text-center w-16">Đơn vị</th>
                  <th className="py-2.5 px-3 text-right w-36">Định mức/Tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {normsLoading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : stationeryItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      Không tìm thấy vật tư.
                    </td>
                  </tr>
                ) : (
                  stationeryItems.map((it) => {
                    const norm = norms.find((n) => n.itemId === it.id);
                    const isEditing = editingItemId === it.id;
                    return (
                      <tr key={it.id} className="hover:bg-gray-50/80">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-800">{it.name}</div>
                          <div className="text-[10px] text-gray-400">{it.code}</div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-500">{it.unit}</td>
                        <td className="py-2.5 px-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                className="w-16 px-1.5 py-1 text-xs border border-rose-400 rounded text-right font-bold"
                                value={editQty}
                                onChange={(e) => setEditQty(Number(e.target.value))}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveItemNorm(it.id)}
                                disabled={saving}
                              >
                                <CheckLg size={11} />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingItemId(null)}
                              >
                                <XLg size={11} />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-end gap-1.5 cursor-pointer group"
                              onClick={() => {
                                setEditingItemId(it.id);
                                setEditQty(norm ? norm.limitQty : 0);
                              }}
                            >
                              <span
                                className={`font-bold ${
                                  norm && norm.limitQty > 0
                                    ? 'text-rose-600'
                                    : 'text-gray-400 font-normal'
                                }`}
                              >
                                {norm && norm.limitQty > 0 ? norm.limitQty : 'Không giới hạn'}
                              </span>
                              <PencilSquare
                                size={12}
                                className="text-gray-400 opacity-0 group-hover:opacity-100"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Offcanvas>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4: THEO DÕI DỤNG CỤ (BÀN GIAO & THU HỒI)
// ══════════════════════════════════════════════════════════════════════════════

interface AvailableAssetOption {
  id: string;
  rawId: string;
  type: 'SUPPLY' | 'FINANCE';
  code: string;
  name: string;
  sourceLabel: string;
}

interface EmployeeAssetGroup {
  employeeId: string;
  fullName: string;
  code: string;
  departmentName: string;
  activeAssets: AssetHandover[];
  historyAssets: AssetHandover[];
}

const AssetsTab: React.FC<{
  onRefresh: () => void;
}> = ({ onRefresh }) => {
  const [handovers, setHandovers] = useState<AssetHandover[]>([]);
  const [employees, setEmployees] = useState<EmployeeSimple[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AvailableAssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [showHandoverPanel, setShowHandoverPanel] = useState(false);
  const [selectedEmpGroup, setSelectedEmpGroup] = useState<EmployeeAssetGroup | null>(null);
  const [selectedHandoverIds, setSelectedHandoverIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    employeeId: '',
    itemId: '',
    handoverDate: new Date().toISOString().split('T')[0],
    returnDate: '',
    conditionOnHandover: 'Đang sử dụng (Tốt)',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, eRes, aRes] = await Promise.all([
        fetch('/api/hr/stationery/handovers'),
        fetch('/api/hr/employees?limit=200'),
        fetch('/api/hr/stationery/assets/available'),
      ]);
      if (hRes.ok) {
        const hData = await hRes.json();
        setHandovers(hData.handovers || []);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        const empList = Array.isArray(eData) ? eData : eData.employees || eData.data || [];
        setEmployees(empList);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAvailableAssets(aData.assets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const employeeGroups = useMemo(() => {
    const map = new Map<string, EmployeeAssetGroup>();

    employees.forEach((emp) => {
      map.set(emp.id, {
        employeeId: emp.id,
        fullName: emp.fullName,
        code: emp.code,
        departmentName: emp.departmentName || 'Chưa phân phòng',
        activeAssets: [],
        historyAssets: [],
      });
    });

    handovers.forEach((h) => {
      const empId = h.employeeId;
      if (!map.has(empId)) {
        map.set(empId, {
          employeeId: empId,
          fullName: h.employee?.fullName || 'N/A',
          code: h.employee?.code || '',
          departmentName: h.employee?.departmentName || 'Chưa phân phòng',
          activeAssets: [],
          historyAssets: [],
        });
      }
      const group = map.get(empId)!;
      if (h.status === 'USING') {
        group.activeAssets.push(h);
      } else {
        group.historyAssets.push(h);
      }
    });

    const allGroups = Array.from(map.values()).sort(
      (a, b) => b.activeAssets.length - a.activeAssets.length
    );

    return allGroups.filter((g) => {
      if (deptFilter && g.departmentName !== deptFilter) return false;
      if (empSearch) {
        const q = empSearch.toLowerCase();
        const matchEmp =
          g.fullName.toLowerCase().includes(q) || g.code.toLowerCase().includes(q);
        if (!matchEmp) return false;
      }
      if (assetSearch) {
        const aq = assetSearch.toLowerCase();
        const matchAsset = g.activeAssets.some(
          (a) =>
            a.item?.name?.toLowerCase().includes(aq) ||
            a.item?.code?.toLowerCase().includes(aq)
        );
        if (!matchAsset) return false;
      }
      return true;
    });
  }, [employees, handovers, deptFilter, empSearch, assetSearch]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName) set.add(e.departmentName);
    });
    return Array.from(set).sort();
  }, [employees]);

  const paginatedGroups = useMemo(
    () => employeeGroups.slice((page - 1) * pageSize, page * pageSize),
    [employeeGroups, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [deptFilter, empSearch, assetSearch]);

  useEffect(() => {
    if (selectedEmpGroup) {
      const updated = employeeGroups.find(
        (g) => g.employeeId === selectedEmpGroup.employeeId
      );
      if (updated) setSelectedEmpGroup(updated);
    }
  }, [employeeGroups, selectedEmpGroup]);

  const openEmployeeHandoverPanel = (group: EmployeeAssetGroup) => {
    setSelectedEmpGroup(group);
    setSelectedHandoverIds([]);
    setFormData({
      employeeId: group.employeeId,
      itemId: availableAssets[0]?.id || '',
      handoverDate: new Date().toISOString().split('T')[0],
      returnDate: '',
      conditionOnHandover: 'Đang sử dụng (Tốt)',
      note: '',
    });
    setShowHandoverPanel(true);
  };

  const handleCreateHandover = async () => {
    const empId = selectedEmpGroup?.employeeId || formData.employeeId;
    if (!empId || !formData.itemId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/hr/stationery/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, employeeId: empId }),
      });
      if (res.ok) {
        await fetchData();
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBatchReturn = async () => {
    if (selectedHandoverIds.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedHandoverIds.map((id) =>
          fetch('/api/hr/stationery/handovers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              status: 'RETURNED',
              returnDate: formData.returnDate || new Date().toISOString().split('T')[0],
              conditionOnReturn: formData.conditionOnHandover || 'Thu hồi bình thường',
            }),
          })
        )
      );
      setSelectedHandoverIds([]);
      await fetchData();
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumn<EmployeeAssetGroup>[] = [
    {
      key: 'emp',
      header: 'NHÂN VIÊN',
      width: '240px',
      render: (g) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center shrink-0">
            {g.fullName
              .split(' ')
              .slice(-2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-xs">{g.fullName}</div>
            <div className="text-[11px] text-gray-500">{g.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'dept',
      header: 'PHÒNG BAN',
      width: '180px',
      render: (g) => (
        <span className="text-xs font-medium text-gray-700">{g.departmentName}</span>
      ),
    },
    {
      key: 'assets',
      header: 'DỤNG CỤ ĐANG GIỮ',
      render: (g) => {
        if (g.activeAssets.length === 0) {
          return (
            <span className="text-xs text-gray-400 italic">Chưa bàn giao dụng cụ</span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1.5 py-1">
            {g.activeAssets.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/80"
              >
                <Tools size={11} className="text-blue-600 shrink-0" />
                <span>{a.item?.name}</span>
                <span className="text-[10px] text-blue-500 font-mono">({a.item?.code})</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'count',
      header: 'SỐ LƯỢNG',
      width: '120px',
      align: 'center',
      render: (g) => (
        <Badge variant={g.activeAssets.length > 0 ? 'info' : 'neutral'}>
          {g.activeAssets.length} thiết bị
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TableToolbar
          searchValue={empSearch}
          onSearchChange={setEmpSearch}
          searchPlaceholder="Tìm nhân viên..."
          onRefresh={fetchData}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-44">
                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                  <option value="">Tất cả phòng ban</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-48">
                <Input
                  placeholder="Tìm dụng cụ..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                />
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EnterpriseDataTable
          columns={columns}
          data={paginatedGroups}
          rowKey={(g) => g.employeeId}
          loading={loading}
          emptyText="Không tìm thấy nhân sự phù hợp."
          onRowClick={(g) => openEmployeeHandoverPanel(g)}
        />
      </div>

      <div className="shrink-0">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={employeeGroups.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <Offcanvas
        isOpen={showHandoverPanel}
        onClose={() => setShowHandoverPanel(false)}
        title={
          selectedEmpGroup
            ? `Dụng cụ: ${selectedEmpGroup.fullName}`
            : 'Chi tiết dụng cụ bàn giao'
        }
        icon={<Tools size={20} />}
        width="520px"
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowHandoverPanel(false)}>
              Đóng
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                onClick={handleBatchReturn}
                disabled={saving || selectedHandoverIds.length === 0}
              >
                Thu hồi ({selectedHandoverIds.length})
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateHandover}
                disabled={saving || !formData.itemId}
              >
                Bàn giao
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedEmpGroup && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900 text-sm">
                  {selectedEmpGroup.fullName}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedEmpGroup.code} • {selectedEmpGroup.departmentName}
                </div>
              </div>
              <Badge variant="info">
                Đang giữ: {selectedEmpGroup.activeAssets.length}
              </Badge>
            </div>
          )}

          <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Thông tin bàn giao / thu hồi
            </div>

            <Select
              label="Thiết bị bàn giao *"
              value={formData.itemId}
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
            >
              <option value="">-- Chọn dụng cụ khả dụng --</option>
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.code}] {a.name}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ngày bàn giao"
                type="date"
                value={formData.handoverDate}
                onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
              />
              <Input
                label="Ngày thu hồi"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
              />
            </div>

            <Select
              label="Trạng thái & Tình trạng"
              value={formData.conditionOnHandover}
              onChange={(e) =>
                setFormData({ ...formData, conditionOnHandover: e.target.value })
              }
            >
              <option value="Đang sử dụng (Mới 100%)">Đang sử dụng (Mới 100%)</option>
              <option value="Đang sử dụng (Tốt)">Đang sử dụng (Tốt)</option>
              <option value="Thu hồi bình thường">Thu hồi bình thường</option>
              <option value="Hư hỏng cần sửa chữa">Hư hỏng cần sửa chữa</option>
              <option value="Mất tài sản">Mất tài sản</option>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Tài sản đang nắm giữ ({selectedEmpGroup?.activeAssets.length || 0})
              </span>
              {selectedEmpGroup && selectedEmpGroup.activeAssets.length > 0 && (
                <span className="text-[11px] text-gray-400">Tích chọn để thu hồi</span>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
                    <th className="py-2.5 px-3 w-9 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                        checked={
                          (selectedEmpGroup?.activeAssets.length || 0) > 0 &&
                          selectedEmpGroup?.activeAssets.every((a) =>
                            selectedHandoverIds.includes(a.id)
                          )
                        }
                        onChange={() => {
                          const allIds =
                            selectedEmpGroup?.activeAssets.map((a) => a.id) || [];
                          if (selectedHandoverIds.length === allIds.length) {
                            setSelectedHandoverIds([]);
                          } else {
                            setSelectedHandoverIds(allIds);
                          }
                        }}
                      />
                    </th>
                    <th className="py-2.5 px-2">Thiết bị</th>
                    <th className="py-2.5 px-2 text-center w-24">Ngày giao</th>
                    <th className="py-2.5 px-3 text-right w-28">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!selectedEmpGroup || selectedEmpGroup.activeAssets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">
                        Nhân viên hiện không giữ dụng cụ nào.
                      </td>
                    </tr>
                  ) : (
                    selectedEmpGroup.activeAssets.map((a) => {
                      const checked = selectedHandoverIds.includes(a.id);
                      return (
                        <tr
                          key={a.id}
                          className={`cursor-pointer hover:bg-gray-50 ${
                            checked ? 'bg-rose-50/40' : ''
                          }`}
                          onClick={() =>
                            setSelectedHandoverIds((prev) =>
                              prev.includes(a.id)
                                ? prev.filter((x) => x !== a.id)
                                : [...prev, a.id]
                            )
                          }
                        >
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                              checked={checked}
                              onChange={() =>
                                setSelectedHandoverIds((prev) =>
                                  prev.includes(a.id)
                                    ? prev.filter((x) => x !== a.id)
                                    : [...prev, a.id]
                                )
                              }
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="font-semibold text-gray-800">{a.item?.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {a.item?.code}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-600">
                            {formatDate(a.handoverDate)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-600">
                            {a.conditionOnHandover}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Offcanvas>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5: THEO DÕI XUẤT - NHẬP KHO
// ══════════════════════════════════════════════════════════════════════════════

const TransactionsTab: React.FC = () => {
  const [transactions, setTransactions] = useState<SupplyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/hr/stationery/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (fromDate) {
        const txDate = new Date(t.date).toISOString().split('T')[0];
        if (txDate < fromDate) return false;
      }
      if (toDate) {
        const txDate = new Date(t.date).toISOString().split('T')[0];
        if (txDate > toDate) return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.item?.name?.toLowerCase().includes(q) ||
        t.item?.code?.toLowerCase().includes(q) ||
        t.performedBy?.toLowerCase().includes(q) ||
        t.note?.toLowerCase().includes(q)
      );
    });
  }, [transactions, fromDate, toDate, search]);

  const paginatedTransactions = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [typeFilter, fromDate, toDate, search]);

  const handleExportCsv = () => {
    const headers = [
      'Ngày giao dịch',
      'Mã vật tư',
      'Tên vật tư',
      'Loại',
      'Số lượng',
      'Đơn vị',
      'Đơn giá',
      'Người thực hiện',
      'Ghi chú',
    ];
    const rows = filtered.map((t) => [
      formatDate(t.date),
      t.item?.code || '',
      `"${(t.item?.name || '').replace(/"/g, '""')}"`,
      t.type === 'IN' ? 'Nhập kho' : 'Xuất kho',
      t.type === 'IN' ? `+${t.quantity}` : `-${t.quantity}`,
      t.item?.unit || '',
      t.unitPrice || 0,
      `"${(t.performedBy || 'Hệ thống').replace(/"/g, '""')}"`,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xuat-nhap-kho-vpp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: TableColumn<SupplyTransaction>[] = [
    {
      key: 'date',
      header: 'NGÀY GIAO DỊCH',
      width: '140px',
      render: (t) => <span className="text-xs text-gray-600">{formatDate(t.date)}</span>,
    },
    {
      key: 'item',
      header: 'VẬT TƯ',
      render: (t) => (
        <div>
          <div className="font-semibold text-gray-900 text-xs">{t.item?.name}</div>
          <div className="text-[11px] text-gray-400 font-mono">{t.item?.code}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'LOẠI',
      width: '130px',
      align: 'center',
      render: (t) => (
        <Badge variant={t.type === 'IN' ? 'success' : 'warning'}>
          {t.type === 'IN' ? 'NHẬP KHO' : 'XUẤT KHO'}
        </Badge>
      ),
    },
    {
      key: 'qty',
      header: 'SỐ LƯỢNG',
      width: '120px',
      align: 'right',
      render: (t) => (
        <span
          className={`font-bold text-xs ${
            t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {t.type === 'IN' ? '+' : '-'}
          {t.quantity} {t.item?.unit}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'ĐƠN GIÁ',
      width: '130px',
      align: 'right',
      render: (t) => (
        <span className="text-xs text-gray-700">
          {t.unitPrice ? formatVND(t.unitPrice) : '—'}
        </span>
      ),
    },
    {
      key: 'by',
      header: 'NGƯỜI THỰC HIỆN',
      width: '160px',
      render: (t) => (
        <span className="text-xs text-gray-700">{t.performedBy || 'Hệ thống'}</span>
      ),
    },
    {
      key: 'note',
      header: 'GHI CHÚ',
      render: (t) => <span className="text-xs text-gray-500">{t.note || '—'}</span>,
    },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm vật tư / người thực hiện..."
          onRefresh={fetchTransactions}
          onExportExcel={handleExportCsv}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-36">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    title="Từ ngày"
                  />
                </div>
                <span className="text-gray-400 text-xs">..</span>
                <div className="w-36">
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    title="Đến ngày"
                  />
                </div>
              </div>
              <div className="w-36">
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">Tất cả loại</option>
                  <option value="IN">Nhập kho</option>
                  <option value="OUT">Xuất kho</option>
                </Select>
              </div>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EnterpriseDataTable
          columns={columns}
          data={paginatedTransactions}
          rowKey={(t) => t.id}
          loading={loading}
          emptyText="Chưa có lịch sử xuất nhập kho."
        />
      </div>

      <div className="shrink-0">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT: VĂN PHÒNG PHẨM VÀ DỤNG CỤ
// ══════════════════════════════════════════════════════════════════════════════

export const StationeryToolsPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [stats, setStats] = useState({
    lowStockCount: 0,
    pendingRequestsCount: 0,
    totalNormsCount: 0,
    activeAssetsCount: 0,
    recentTransactionsCount: 0,
  });

  const fetchCommonData = useCallback(async () => {
    setLoadingItems(true);
    try {
      const [itemsRes, catsRes, deptsRes, statsRes] = await Promise.all([
        fetch('/api/hr/stationery/items'),
        fetch('/api/hr/stationery/categories'),
        fetch('/api/hr/departments'),
        fetch('/api/hr/stationery/stats'),
      ]);

      if (itemsRes.ok) {
        const d = await itemsRes.json();
        setItems(d.items || []);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.categories || []);
      }
      if (deptsRes.ok) {
        const d = await deptsRes.json();
        setDepartments(d.departments || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchCommonData();
  }, [fetchCommonData]);

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'requests',
      title: 'Yêu cầu & Cấp phát',
      desc: 'Phê duyệt và bàn giao',
      icon: <ClipboardCheck size={18} />,
      badge: stats.pendingRequestsCount > 0 ? `${stats.pendingRequestsCount} chờ` : undefined,
      badgeVariant: 'warning',
    },
    {
      num: 2,
      id: 'inventory',
      title: 'Quản lý tồn kho',
      desc: 'Theo dõi số lượng hàng',
      icon: <BoxSeam size={18} />,
      badge:
        stats.lowStockCount > 0 ? `${stats.lowStockCount} sắp hết` : `${items.length} SP`,
      badgeVariant: stats.lowStockCount > 0 ? 'danger' : 'neutral',
    },
    {
      num: 3,
      id: 'norms',
      title: 'Định mức phòng ban',
      desc: 'Quản lý hạn mức sử dụng',
      icon: <Sliders size={18} />,
      badge: stats.totalNormsCount > 0 ? `${stats.totalNormsCount} định mức` : undefined,
      badgeVariant: 'brand',
    },
    {
      num: 4,
      id: 'assets',
      title: 'Theo dõi dụng cụ',
      desc: 'Quản lý tài sản cá nhân',
      icon: <Tools size={18} />,
      badge: stats.activeAssetsCount > 0 ? `${stats.activeAssetsCount} đang cấp` : undefined,
      badgeVariant: 'brand',
    },
    {
      num: 5,
      id: 'transactions',
      title: 'Theo dõi xuất-nhập',
      desc: 'Lịch sử biến động kho',
      icon: <ArrowLeftRight size={18} />,
    },
  ];

  return (
    <StepPage
      title="Văn phòng phẩm và dụng cụ"
      description="Quản lý định mức, phê duyệt và cấp phát vật tư doanh nghiệp"
      icon="bi-archive"
      color="rose"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
    >
      {currentStep === 1 && (
        <RequestsTab
          departments={departments}
          items={items}
          onDataChange={fetchCommonData}
        />
      )}
      {currentStep === 2 && (
        <InventoryTab
          items={items}
          categories={categories}
          loading={loadingItems}
          onRefresh={fetchCommonData}
        />
      )}
      {currentStep === 3 && (
        <NormsTab departments={departments} items={items} />
      )}
      {currentStep === 4 && <AssetsTab onRefresh={fetchCommonData} />}
      {currentStep === 5 && <TransactionsTab />}
    </StepPage>
  );
};

export default StationeryToolsPage;
