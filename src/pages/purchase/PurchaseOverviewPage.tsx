import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Trash,
  FileEarmarkPlus,
  CartCheck,
  XCircle,
  Check2All,
  ArrowCounterclockwise,
  Printer,
  Pencil,
  BoxSeam,
  PauseCircle,
  SlashCircle,
  ExclamationCircle,
  Building,
  Truck,
  Telephone,
  Envelope,
  GeoAlt,
  Calendar3,
  ClockHistory,
  CheckCircle,
} from 'react-bootstrap-icons';
import { StepPage } from '@/components/common/StepPage';
import { TableToolbar } from '@/components/common/TableToolbar';
import { FullWidthTable } from '@/components/common/FullWidthTable';
import { Pagination } from '@/components/common/Pagination';
import { Offcanvas } from '@/components/common/Offcanvas';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/common/Button';
import { EventOffcanvas } from '@/components/common/EventOffcanvas';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { TaoYeuCauMuaHangModal } from '@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal';
import TaoDonMuaHangModal from '@/components/plan-finance/mua_hang/TaoDonMuaHangModal';
import { TaoDonMuaHangTrucTiepModal } from '@/components/plan-finance/mua_hang/TaoDonMuaHangTrucTiepModal';
import XemTruocDonMuaHangModal from '@/components/plan-finance/mua_hang/XemTruocDonMuaHangModal';
import type { ModernStepItem } from '@/types';

const REQ_STATUS: Record<string, { label: string; badgeClass: string }> = {
  'chua-xu-ly': {
    label: 'Chưa xử lý',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'dang-xu-ly': {
    label: 'Đang xử lý',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'da-xu-ly': {
    label: 'Đã xử lý',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'tu-choi': {
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  'huy-bo': {
    label: 'Đã huỷ',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const ORD_STATUS: Record<string, { label: string; badgeClass: string }> = {
  draft: {
    label: 'Đang tạo đơn',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  ordered: {
    label: 'Đã đặt hàng',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  received: {
    label: 'Đã nhận hàng',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  disputed: {
    label: 'Đang khiếu nại',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  completed: {
    label: 'Hoàn thành',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  paused: {
    label: 'Tạm dừng',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  cancelled: {
    label: 'Đã huỷ bỏ',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
  },
};

const fmtVnd = (n: number | null | undefined) =>
  n && Number(n) > 0 ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—';

export const PurchaseOverviewPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);

  // ── STEP 1: YÊU CẦU MUA HÀNG ──────────────────────────────────────────────
  const [requests, setRequests] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('all');
  const [reqDeptFilter, setReqDeptFilter] = useState('all');
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set());
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [taoYeuCauOpen, setTaoYeuCauOpen] = useState(false);
  const [bulkDeleteReqConfirmOpen, setBulkDeleteReqConfirmOpen] = useState(false);
  const [bulkDeletingReq, setBulkDeletingReq] = useState(false);

  // ── STEP 2: ĐƠN MUA HÀNG ──────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [ordLoading, setOrdLoading] = useState(true);
  const [ordSearch, setOrdSearch] = useState('');
  const [ordStatusFilter, setOrdStatusFilter] = useState('all');
  const [ordPage, setOrdPage] = useState(1);
  const [ordPageSize, setOrdPageSize] = useState(10);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [taoDonTrucTiepOpen, setTaoDonTrucTiepOpen] = useState(false);
  const [bulkDeleteOrdConfirmOpen, setBulkDeleteOrdConfirmOpen] = useState(false);
  const [bulkDeletingOrd, setBulkDeletingOrd] = useState(false);

  // ── STEP 3: ĐÃ HUỶ BỎ ─────────────────────────────────────────────────────
  const [cancelSearch, setCancelSearch] = useState('');
  const [cancelTypeFilter, setCancelTypeFilter] = useState('all');
  const [cancelPage, setCancelPage] = useState(1);
  const [cancelPageSize, setCancelPageSize] = useState(10);
  const [confirmDeleteCancelledItem, setConfirmDeleteCancelledItem] = useState<any | null>(null);
  const [deletingCancelledItem, setDeletingCancelledItem] = useState(false);

  // ── MODALS TẠO / SỬA / IN ĐƠN HÀNG ────────────────────────────────────────
  const [createOrderData, setCreateOrderData] = useState<{
    reqId: string;
    reqCode: string | null;
    items: any[];
  } | null>(null);

  const [editOrderData, setEditOrderData] = useState<{
    orderId: string;
    orderCode: string | null;
    supplierId: string | null;
    ngayNhan: string | null;
    ghiChu: string | null;
    items: any[];
  } | null>(null);

  const [printOrderData, setPrintOrderData] = useState<{
    orderId: string;
    orderCode: string | null;
    supplierId: string;
    supplierName: string;
    items: any[];
    assignments: any[];
  } | null>(null);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await fetch('/api/plan-finance/purchase-requests?page=1&limit=200');
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      console.error('Lỗi tải yêu cầu mua hàng:', e);
    } finally {
      setReqLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdLoading(true);
    try {
      const res = await fetch('/api/plan-finance/purchasing?page=1&limit=200');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      console.error('Lỗi tải đơn mua hàng:', e);
    } finally {
      setOrdLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchOrders();
  }, [fetchRequests, fetchOrders]);

  // ── LỌC DỮ LIỆU BƯỚC 1 (YÊU CẦU MUA HÀNG ĐANG HOẠT ĐỘNG) ──
  const activeRequests = useMemo(
    () => requests.filter((r) => r.trangThai !== 'huy-bo' && r.trangThai !== 'tu-choi'),
    [requests]
  );

  const deptOptions = useMemo(() => {
    const depts = Array.from(new Set(activeRequests.map((r) => r.donVi).filter(Boolean)));
    return [
      { value: 'all', label: 'Tất cả bộ phận' },
      ...depts.map((d) => ({ value: d, label: d })),
    ];
  }, [activeRequests]);

  const filteredRequests = useMemo(() => {
    return activeRequests.filter((r) => {
      if (reqStatusFilter !== 'all' && r.trangThai !== reqStatusFilter) return false;
      if (reqDeptFilter !== 'all' && r.donVi !== reqDeptFilter) return false;
      if (reqSearch.trim()) {
        const q = reqSearch.toLowerCase().trim();
        const matchCode = (r.code || '').toLowerCase().includes(q);
        const matchUser = (r.nguoiYeuCau || '').toLowerCase().includes(q);
        const matchDept = (r.donVi || '').toLowerCase().includes(q);
        const matchReason = (r.lyDo || '').toLowerCase().includes(q);
        if (!matchCode && !matchUser && !matchDept && !matchReason) return false;
      }
      return true;
    });
  }, [activeRequests, reqStatusFilter, reqDeptFilter, reqSearch]);

  const paginatedRequests = useMemo(() => {
    const start = (reqPage - 1) * reqPageSize;
    return filteredRequests.slice(start, start + reqPageSize);
  }, [filteredRequests, reqPage, reqPageSize]);

  // ── LỌC DỮ LIỆU BƯỚC 2 (ĐƠN HÀNG ĐANG HOẠT ĐỘNG) ──
  const activeOrders = useMemo(
    () => orders.filter((o) => o.trangThai !== 'cancelled'),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      if (ordStatusFilter !== 'all' && o.trangThai !== ordStatusFilter) return false;
      if (ordSearch.trim()) {
        const q = ordSearch.toLowerCase().trim();
        const matchCode = (o.code || '').toLowerCase().includes(q);
        const matchSup = (o.supplier?.name || '').toLowerCase().includes(q);
        const matchCarrier = (o.carrier?.name || '').toLowerCase().includes(q);
        if (!matchCode && !matchSup && !matchCarrier) return false;
      }
      return true;
    });
  }, [activeOrders, ordStatusFilter, ordSearch]);

  const paginatedOrders = useMemo(() => {
    const start = (ordPage - 1) * ordPageSize;
    return filteredOrders.slice(start, start + ordPageSize);
  }, [filteredOrders, ordPage, ordPageSize]);

  // ── LỌC DỮ LIỆU BƯỚC 3 (ĐÃ HUỶ BỎ / TỪ CHỐI) ──
  const cancelledItems = useMemo(() => {
    const cancelledReqs = requests
      .filter((r) => r.trangThai === 'tu-choi' || r.trangThai === 'huy-bo')
      .map((r) => ({
        id: r.id,
        itemType: 'request' as const,
        code: r.code || r.id,
        title: r.lyDo || 'Yêu cầu mua hàng',
        partnerOrDept: `${r.nguoiYeuCau} · ${r.donVi}`,
        date: r.ngayTao,
        amount: r.tongDuKien || 0,
        status: r.trangThai,
        raw: r,
      }));

    const cancelledOrds = orders
      .filter((o) => o.trangThai === 'cancelled')
      .map((o) => ({
        id: o.id,
        itemType: 'order' as const,
        code: o.code || o.id,
        title: `Đơn mua hàng (${o.items?.length || 0} mặt hàng)`,
        partnerOrDept: o.supplier?.name || 'Chưa chọn nhà cung cấp',
        date: o.ngayDat || o.createdAt,
        amount: o.tongTien || 0,
        status: o.trangThai,
        raw: o,
      }));

    return [...cancelledOrds, ...cancelledReqs].sort(
      (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );
  }, [requests, orders]);

  const filteredCancelled = useMemo(() => {
    return cancelledItems.filter((it) => {
      if (cancelTypeFilter !== 'all' && it.itemType !== cancelTypeFilter) return false;
      if (cancelSearch.trim()) {
        const q = cancelSearch.toLowerCase().trim();
        if (
          !it.code.toLowerCase().includes(q) &&
          !it.title.toLowerCase().includes(q) &&
          !it.partnerOrDept.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [cancelledItems, cancelTypeFilter, cancelSearch]);

  const paginatedCancelled = useMemo(() => {
    const start = (cancelPage - 1) * cancelPageSize;
    return filteredCancelled.slice(start, start + cancelPageSize);
  }, [filteredCancelled, cancelPage, cancelPageSize]);

  // ── STEPS ──
  const steps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: 'requests',
        title: 'Yêu cầu mua hàng',
        desc: 'Khởi tạo & duyệt nhu cầu vật tư',
        icon: <FileEarmarkPlus size={16} />,
        badge: `${activeRequests.length} phiếu`,
      },
      {
        num: 2,
        id: 'orders',
        title: 'Đơn hàng',
        desc: 'Đặt hàng & theo dõi giao nhận',
        icon: <CartCheck size={16} />,
        badge: `${activeOrders.length} đơn`,
      },
      {
        num: 3,
        id: 'cancelled',
        title: 'Đã huỷ bỏ',
        desc: 'Các yêu cầu & đơn mua đã huỷ',
        icon: <XCircle size={16} />,
        badge: `${cancelledItems.length} mục`,
      },
    ],
    [activeRequests.length, activeOrders.length, cancelledItems.length]
  );

  // ── HANDLERS BƯỚC 1 ──
  const handleMergeCreateOrder = async () => {
    if (selectedReqIds.size === 0) return;
    const ids = Array.from(selectedReqIds);
    try {
      const details = await Promise.all(
        ids.map((id) => fetch(`/api/plan-finance/purchase-requests/${id}`).then((r) => r.json()))
      );
      const validDetails = details.filter((d) => d && Array.isArray(d.items));
      const allItems = validDetails.flatMap((d) => d.items);
      const codes = validDetails
        .map((d) => d.code)
        .filter(Boolean)
        .join(', ');
      setCreateOrderData({
        reqId: ids.join(','),
        reqCode: codes || `${ids.length} phiếu gộp`,
        items: allItems,
      });
    } catch (e) {
      console.error('Lỗi gộp yêu cầu mua hàng:', e);
    }
  };

  const handleBulkDeleteRequests = async () => {
    if (selectedReqIds.size === 0) return;
    setBulkDeletingReq(true);
    try {
      await Promise.all(
        Array.from(selectedReqIds).map((id) =>
          fetch(`/api/plan-finance/purchase-requests/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedReqIds(new Set());
      setBulkDeleteReqConfirmOpen(false);
      fetchRequests();
    } finally {
      setBulkDeletingReq(false);
    }
  };

  // ── HANDLERS BƯỚC 2 ──
  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.size === 0) return;
    setBulkDeletingOrd(true);
    try {
      await Promise.all(
        Array.from(selectedOrderIds).map((id) =>
          fetch(`/api/plan-finance/purchasing/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedOrderIds(new Set());
      setBulkDeleteOrdConfirmOpen(false);
      fetchOrders();
    } finally {
      setBulkDeletingOrd(false);
    }
  };

  // ── HANDLERS BƯỚC 3 ──
  const handleRestoreCancelled = async (item: any) => {
    try {
      if (item.itemType === 'request') {
        await fetch(`/api/plan-finance/purchase-requests/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trangThai: 'chua-xu-ly' }),
        });
        fetchRequests();
      } else {
        await fetch(`/api/plan-finance/purchasing/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trangThai: 'draft' }),
        });
        fetchOrders();
      }
    } catch (e) {
      console.error('Lỗi khôi phục:', e);
    }
  };

  const handleConfirmDeleteCancelled = async () => {
    if (!confirmDeleteCancelledItem) return;
    setDeletingCancelledItem(true);
    try {
      if (confirmDeleteCancelledItem.itemType === 'request') {
        await fetch(`/api/plan-finance/purchase-requests/${confirmDeleteCancelledItem.id}`, {
          method: 'DELETE',
        });
        fetchRequests();
      } else {
        await fetch(`/api/plan-finance/purchasing/${confirmDeleteCancelledItem.id}`, {
          method: 'DELETE',
        });
        fetchOrders();
      }
      setConfirmDeleteCancelledItem(null);
    } finally {
      setDeletingCancelledItem(false);
    }
  };

  return (
    <StepPage
      title="Mua hàng"
      description="Quản lý yêu cầu vật tư, đơn đặt hàng nhà cung cấp và tiến độ giao nhận"
      icon="bi-cart3"
      color="blue"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      tickerContext="suppliers"
    >
      {/* ════════════════════════════════════════════════════════════════════
          BƯỚC 1: YÊU CẦU MUA HÀNG
          ════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TableToolbar
            searchValue={reqSearch}
            onSearchChange={(val) => {
              setReqSearch(val);
              setReqPage(1);
            }}
            searchPlaceholder="Tìm mã phiếu, người yêu cầu, lý do..."
            filters={[
              {
                id: 'dept',
                value: reqDeptFilter,
                onChange: (val) => {
                  setReqDeptFilter(val);
                  setReqPage(1);
                },
                options: deptOptions,
                minWidth: '165px',
              },
              {
                id: 'status',
                value: reqStatusFilter,
                onChange: (val) => {
                  setReqStatusFilter(val);
                  setReqPage(1);
                },
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'chua-xu-ly', label: 'Chưa xử lý' },
                  { value: 'dang-xu-ly', label: 'Đang xử lý' },
                  { value: 'da-xu-ly', label: 'Đã xử lý' },
                ],
                minWidth: '155px',
              },
            ]}
            rightActions={
              <div className="flex items-center gap-2">
                {selectedReqIds.size > 0 && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check2All size={15} />}
                      onClick={handleMergeCreateOrder}
                    >
                      Tạo đơn ({selectedReqIds.size})
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash size={14} />}
                      onClick={() => setBulkDeleteReqConfirmOpen(true)}
                    >
                      Xoá ({selectedReqIds.size})
                    </Button>
                  </>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setTaoYeuCauOpen(true)}
                >
                  Tạo yêu cầu
                </Button>
              </div>
            }
            menuItems={[
              {
                id: 'event-calendar',
                label: 'Lịch sự kiện',
                icon: <Calendar3 size={14} />,
                onClick: () => setIsEventCalendarOpen(true),
              },
            ]}
            onRefresh={fetchRequests}
          />

          <FullWidthTable loading={reqLoading}>
            <table className="custom-table w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/95 border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 w-11 text-center">
                    <input
                      type="checkbox"
                      className="form-check-input cursor-pointer"
                      checked={
                        paginatedRequests.length > 0 &&
                        paginatedRequests.every((r) => selectedReqIds.has(r.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedReqIds);
                        if (e.target.checked) {
                          paginatedRequests.forEach((r) => next.add(r.id));
                        } else {
                          paginatedRequests.forEach((r) => next.delete(r.id));
                        }
                        setSelectedReqIds(next);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">Mã phiếu / Nội dung yêu cầu</th>
                  <th className="py-3 px-4">Người yêu cầu</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Dự kiến chi phí</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedRequests.length === 0 && !reqLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-[13px]">
                      Không có phiếu yêu cầu mua hàng nào phù hợp.
                    </td>
                  </tr>
                ) : null}
                {paginatedRequests.map((req) => {
                  const st = REQ_STATUS[req.trangThai] || {
                    label: req.trangThai,
                    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  const isChecked = selectedReqIds.has(req.id);
                  return (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className={`cursor-pointer transition-colors hover:bg-sky-50/40 group ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td
                        className="py-3 px-4 w-11 text-center align-middle"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input cursor-pointer"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedReqIds);
                            if (e.target.checked) next.add(req.id);
                            else next.delete(req.id);
                            setSelectedReqIds(next);
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 group-hover:text-sky-700 transition-colors text-[13px]">
                            {req.code || req.id.slice(0, 10).toUpperCase()}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {req.soMatHang ?? req.items?.length ?? 0} mặt hàng
                          </span>
                        </div>
                        <div className="text-[11.5px] text-slate-500 mt-0.5 line-clamp-1">
                          {req.lyDo || 'Yêu cầu bổ sung vật tư mua hàng'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="font-semibold text-slate-800 text-[12.5px]">
                          {req.nguoiYeuCau || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500">{req.donVi || '—'}</div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="text-[12px] text-slate-700">
                          Ngày tạo:{' '}
                          <span className="font-medium">
                            {req.ngayTao ? new Date(req.ngayTao).toLocaleDateString('vi-VN') : '—'}
                          </span>
                        </div>
                        {req.ngayCanCo && (
                          <div className="text-[11px] text-amber-700 font-medium">
                            Cần có: {new Date(req.ngayCanCo).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle text-right font-bold text-slate-800 text-[12.5px]">
                        {fmtVnd(req.tongDuKien)}
                      </td>
                      <td className="py-3 px-4 align-middle text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={reqPage}
            totalItems={filteredRequests.length}
            pageSize={reqPageSize}
            onPageChange={setReqPage}
            onPageSizeChange={(size) => {
              setReqPageSize(size);
              setReqPage(1);
            }}
            itemName="phiếu yêu cầu"
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          BƯỚC 2: ĐƠN MUA HÀNG (PO)
          ════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TableToolbar
            searchValue={ordSearch}
            onSearchChange={(val) => {
              setOrdSearch(val);
              setOrdPage(1);
            }}
            searchPlaceholder="Tìm mã đơn hàng, nhà cung cấp, đơn vị vận chuyển..."
            filters={[
              {
                id: 'ord-status',
                value: ordStatusFilter,
                onChange: (val) => {
                  setOrdStatusFilter(val);
                  setOrdPage(1);
                },
                options: [
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'draft', label: 'Đang tạo đơn' },
                  { value: 'ordered', label: 'Đã đặt hàng' },
                  { value: 'received', label: 'Đã nhận hàng' },
                  { value: 'disputed', label: 'Đang khiếu nại' },
                  { value: 'completed', label: 'Hoàn thành' },
                  { value: 'paused', label: 'Tạm dừng' },
                ],
                minWidth: '165px',
              },
            ]}
            rightActions={
              <div className="flex items-center gap-2">
                {selectedOrderIds.size > 0 && (
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash size={14} />}
                    onClick={() => setBulkDeleteOrdConfirmOpen(true)}
                  >
                    Xoá ({selectedOrderIds.size})
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setTaoDonTrucTiepOpen(true)}
                >
                  Tạo đơn mua hàng
                </Button>
              </div>
            }
            menuItems={[
              {
                id: 'event-calendar',
                label: 'Lịch sự kiện',
                icon: <Calendar3 size={14} />,
                onClick: () => setIsEventCalendarOpen(true),
              },
            ]}
            onRefresh={fetchOrders}
          />

          <FullWidthTable loading={ordLoading}>
            <table className="custom-table w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/95 border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 w-11 text-center">
                    <input
                      type="checkbox"
                      className="form-check-input cursor-pointer"
                      checked={
                        paginatedOrders.length > 0 &&
                        paginatedOrders.every((o) => selectedOrderIds.has(o.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedOrderIds);
                        if (e.target.checked) {
                          paginatedOrders.forEach((o) => next.add(o.id));
                        } else {
                          paginatedOrders.forEach((o) => next.delete(o.id));
                        }
                        setSelectedOrderIds(next);
                      }}
                    />
                  </th>
                  <th className="py-3 px-4">Mã đơn hàng</th>
                  <th className="py-3 px-4">Nhà cung cấp</th>
                  <th className="py-3 px-4">Đơn vị vận chuyển</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Tổng giá trị</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedOrders.length === 0 && !ordLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-[13px]">
                      Chưa có đơn mua hàng nào phù hợp.
                    </td>
                  </tr>
                ) : null}
                {paginatedOrders.map((ord) => {
                  const st = ORD_STATUS[ord.trangThai] || {
                    label: ord.trangThai,
                    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  const isChecked = selectedOrderIds.has(ord.id);
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`cursor-pointer transition-colors hover:bg-sky-50/40 group ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td
                        className="py-3 px-4 w-11 text-center align-middle"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input cursor-pointer"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedOrderIds);
                            if (e.target.checked) next.add(ord.id);
                            else next.delete(ord.id);
                            setSelectedOrderIds(next);
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#1e5470] bg-sky-50/80 border border-sky-200/70 px-2 py-0.5 rounded-md text-[12.5px]">
                            {ord.code || ord.id.slice(0, 10).toUpperCase()}
                          </span>
                          {ord.items?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {ord.items.length} SP
                            </span>
                          )}
                        </div>
                        {ord.ghiChu && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {ord.ghiChu}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="font-semibold text-slate-800 text-[12.5px]">
                          {ord.supplier?.name || 'Chưa chọn NCC'}
                        </div>
                        {ord.supplier?.address && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {ord.supplier.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle">
                        {ord.carrier ? (
                          <div>
                            <div className="font-medium text-slate-800 text-[12px]">
                              {ord.carrier.name}
                            </div>
                            {ord.shippingDepot && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                Bến bãi: {ord.shippingDepot}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-slate-400 italic">
                            Chưa gán vận chuyển
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="text-[12px] text-slate-700">
                          Đặt:{' '}
                          <span className="font-medium">
                            {ord.ngayDat
                              ? new Date(ord.ngayDat).toLocaleDateString('vi-VN')
                              : new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {ord.ngayNhan && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            Giao: {new Date(ord.ngayNhan).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="font-bold text-slate-900 text-[13px]">
                          {fmtVnd(ord.tongTien)}
                        </div>
                        {ord.shippingFee > 0 && (
                          <div className="text-[10.5px] text-slate-500">
                            + Cước VC: {fmtVnd(ord.shippingFee)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-middle text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={ordPage}
            totalItems={filteredOrders.length}
            pageSize={ordPageSize}
            onPageChange={setOrdPage}
            onPageSizeChange={(size) => {
              setOrdPageSize(size);
              setOrdPage(1);
            }}
            itemName="đơn mua hàng"
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          BƯỚC 3: ĐÃ HUỶ BỎ
          ════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TableToolbar
            searchValue={cancelSearch}
            onSearchChange={(val) => {
              setCancelSearch(val);
              setCancelPage(1);
            }}
            searchPlaceholder="Tìm mã phiếu, đơn hàng hoặc đối tác đã huỷ..."
            filters={[
              {
                id: 'cancel-type',
                value: cancelTypeFilter,
                onChange: (val) => {
                  setCancelTypeFilter(val);
                  setCancelPage(1);
                },
                options: [
                  { value: 'all', label: 'Tất cả phân loại' },
                  { value: 'order', label: 'Đơn mua hàng đã huỷ' },
                  { value: 'request', label: 'Yêu cầu bị từ chối' },
                ],
                minWidth: '175px',
              },
            ]}
            menuItems={[
              {
                id: 'event-calendar',
                label: 'Lịch sự kiện',
                icon: <Calendar3 size={14} />,
                onClick: () => setIsEventCalendarOpen(true),
              },
            ]}
            onRefresh={() => {
              fetchRequests();
              fetchOrders();
            }}
          />

          <FullWidthTable loading={reqLoading || ordLoading}>
            <table className="custom-table w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50/95 border-b border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Mã chứng từ</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Nội dung / Đối tác</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Giá trị</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedCancelled.length === 0 && !reqLoading && !ordLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-[13px]">
                      Không có yêu cầu hoặc đơn mua hàng nào đã huỷ.
                    </td>
                  </tr>
                ) : null}
                {paginatedCancelled.map((it) => (
                  <tr
                    key={`${it.itemType}-${it.id}`}
                    onClick={() => {
                      if (it.itemType === 'request') setSelectedReq(it.raw);
                      else setSelectedOrder(it.raw);
                    }}
                    className="cursor-pointer transition-colors hover:bg-sky-50/40"
                  >
                    <td className="py-3 px-4 align-middle">
                      <span className="font-mono font-bold text-slate-700 text-[13px]">
                        {it.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          it.itemType === 'order'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {it.itemType === 'order' ? 'Đơn mua hàng' : 'Yêu cầu mua hàng'}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-semibold text-slate-800 text-[12.5px]">
                        {it.partnerOrDept}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{it.title}</div>
                    </td>
                    <td className="py-3 px-4 align-middle text-[12px] text-slate-600">
                      {it.date ? new Date(it.date).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="py-3 px-4 align-middle text-right font-bold text-slate-700 text-[12.5px]">
                      {fmtVnd(it.amount)}
                    </td>
                    <td
                      className="py-3 px-4 align-middle text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ArrowCounterclockwise size={12} />}
                          onClick={() => handleRestoreCancelled(it)}
                        >
                          Khôi phục
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteCancelledItem(it)}
                          title="Xoá vĩnh viễn"
                          className="!px-2"
                        >
                          <Trash size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={cancelPage}
            totalItems={filteredCancelled.length}
            pageSize={cancelPageSize}
            onPageChange={setCancelPage}
            onPageSizeChange={(size) => {
              setCancelPageSize(size);
              setCancelPage(1);
            }}
            itemName="chứng từ đã huỷ"
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          OFFCANVAS CHI TIẾT YÊU CẦU MUA HÀNG (400px)
          ════════════════════════════════════════════════════════════════════ */}
      <PurchaseReqDetailOffcanvas
        req={selectedReq}
        onClose={() => setSelectedReq(null)}
        onChanged={fetchRequests}
        onCreateOrder={(reqId, reqCode, items) => {
          setSelectedReq(null);
          setCreateOrderData({ reqId, reqCode, items });
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════
          OFFCANVAS CHI TIẾT ĐƠN MUA HÀNG (400px)
          ════════════════════════════════════════════════════════════════════ */}
      <PurchaseOrderDetailOffcanvas
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onChanged={fetchOrders}
        onEditOrder={(orderId, orderCode, supplierId, ngayNhan, ghiChu, items) => {
          setSelectedOrder(null);
          const mappedItems = items.map((it: any) => ({
            id: it.id,
            tenHang: it.tenHang,
            donVi: it.donVi,
            soLuong: it.soLuong,
            donGiaDK: it.donGia,
            inventoryItemId: it.inventoryItemId,
            inventoryItem: it.inventoryItem ?? null,
          }));
          setEditOrderData({
            orderId,
            orderCode,
            supplierId,
            ngayNhan,
            ghiChu,
            items: mappedItems,
          });
        }}
        onPrintOrder={(orderId, orderCode, supplierId, supplierName, items) => {
          const mappedItems = items.map((it: any) => ({
            id: it.id,
            tenHang: it.tenHang,
            donVi: it.donVi,
            soLuong: it.soLuong,
            donGiaDK: it.donGia,
            inventoryItemId: it.inventoryItemId,
            inventoryItem: it.inventoryItem ?? null,
          }));
          const assignments = items.map((it: any) => ({
            itemId: it.id,
            supplierId,
            donGia: it.donGia,
            ngayGiao: it.ngayGiao
              ? new Date(it.ngayGiao).toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
            skip: false,
          }));
          setPrintOrderData({
            orderId,
            orderCode,
            supplierId,
            supplierName,
            items: mappedItems,
            assignments,
          });
        }}
      />

      {/* ── MODALS ── */}
      {taoYeuCauOpen && (
        <TaoYeuCauMuaHangModal
          onClose={() => setTaoYeuCauOpen(false)}
          onSaved={() => {
            setTaoYeuCauOpen(false);
            fetchRequests();
          }}
        />
      )}

      {taoDonTrucTiepOpen && (
        <TaoDonMuaHangTrucTiepModal
          onClose={() => setTaoDonTrucTiepOpen(false)}
          onSaved={() => {
            setTaoDonTrucTiepOpen(false);
            setOrdPage(1);
            fetchOrders();
          }}
        />
      )}

      {createOrderData && (
        <TaoDonMuaHangModal
          reqId={createOrderData.reqId}
          reqCode={createOrderData.reqCode}
          items={createOrderData.items}
          onClose={() => setCreateOrderData(null)}
          onCreated={() => {
            setCreateOrderData(null);
            setSelectedReqIds(new Set());
            fetchRequests();
            setCurrentStep(2);
            setOrdPage(1);
            fetchOrders();
          }}
        />
      )}

      {editOrderData && (
        <TaoDonMuaHangModal
          editOrderId={editOrderData.orderId}
          reqCode={editOrderData.orderCode}
          editSupplierId={editOrderData.supplierId}
          editNgayNhan={editOrderData.ngayNhan}
          editGhiChu={editOrderData.ghiChu}
          items={editOrderData.items}
          onClose={() => setEditOrderData(null)}
          onCreated={() => {
            setEditOrderData(null);
            fetchOrders();
          }}
        />
      )}

      {printOrderData && (
        <XemTruocDonMuaHangModal
          supplierId={printOrderData.supplierId}
          supplierName={printOrderData.supplierName}
          assignments={printOrderData.assignments}
          items={printOrderData.items}
          onClose={() => setPrintOrderData(null)}
          onCreated={() => setPrintOrderData(null)}
          isEdit={true}
          editOrderId={printOrderData.orderId}
          editOrderCode={printOrderData.orderCode}
        />
      )}

      {/* ── CONFIRM DIALOGS ── */}
      <ConfirmDialog
        isOpen={bulkDeleteReqConfirmOpen}
        title="Xoá phiếu yêu cầu mua hàng"
        message={`Bạn có chắc chắn muốn xoá ${selectedReqIds.size} phiếu yêu cầu đã chọn? Thao tác này không thể hoàn tác.`}
        confirmText="Xoá tất cả"
        cancelText="Huỷ"
        type="danger"
        isLoading={bulkDeletingReq}
        onConfirm={handleBulkDeleteRequests}
        onCancel={() => setBulkDeleteReqConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOrdConfirmOpen}
        title="Xoá đơn mua hàng"
        message={`Bạn có chắc chắn muốn xoá ${selectedOrderIds.size} đơn mua hàng đã chọn? Thao tác này không thể hoàn tác.`}
        confirmText="Xoá tất cả"
        cancelText="Huỷ"
        type="danger"
        isLoading={bulkDeletingOrd}
        onConfirm={handleBulkDeleteOrders}
        onCancel={() => setBulkDeleteOrdConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteCancelledItem}
        title="Xoá vĩnh viễn chứng từ"
        message={`Bạn có chắc chắn muốn xoá vĩnh viễn "${confirmDeleteCancelledItem?.code}" khỏi hệ thống?`}
        confirmText="Xoá vĩnh viễn"
        cancelText="Huỷ"
        type="danger"
        isLoading={deletingCancelledItem}
        onConfirm={handleConfirmDeleteCancelled}
        onCancel={() => setConfirmDeleteCancelledItem(null)}
      />

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
};

// ============================================================================
// OFFCANVAS CHI TIẾT YÊU CẦU MUA HÀNG (CHUẨN OFFCANVAS.TSX 400PX)
// ============================================================================
function PurchaseReqDetailOffcanvas({
  req,
  onClose,
  onChanged,
  onCreateOrder,
}: {
  req: any | null;
  onClose: () => void;
  onChanged?: () => void;
  onCreateOrder?: (reqId: string, reqCode: string | null, items: any[]) => void;
}) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!req) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetch(`/api/plan-finance/purchase-requests/${req.id}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [req]);

  if (!req) return null;

  const currentStatus = detail?.trangThai ?? req.trangThai;
  const st = REQ_STATUS[currentStatus] || {
    label: currentStatus,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const items = detail?.items || req.items || [];
  const totalDK = items.reduce(
    (s: number, i: any) => s + (Number(i.soLuong) || 0) * (Number(i.donGiaDK) || 0),
    0
  );

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === 'tu-choi') setRejecting(true);
    else setReactivating(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trangThai: newStatus }),
      });
      if (res.ok) {
        setDetail((prev: any) => (prev ? { ...prev, trangThai: newStatus } : prev));
        onChanged?.();
      }
    } finally {
      setRejecting(false);
      setReactivating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${req.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmDel(false);
        onChanged?.();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Offcanvas
        isOpen={!!req}
        onClose={onClose}
        width="400px"
        title="Chi tiết yêu cầu mua hàng"
        description={req.code || req.id}
        icon={<FileEarmarkPlus size={18} />}
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDel(true)}
              disabled={deleting}
              title="Xoá yêu cầu"
              className="!px-2.5 shrink-0"
            >
              <Trash size={15} />
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              {currentStatus === 'tu-choi' || currentStatus === 'huy-bo' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowCounterclockwise size={14} />}
                  onClick={() => handleStatusUpdate('chua-xu-ly')}
                  isLoading={reactivating}
                >
                  Kích hoạt lại
                </Button>
              ) : currentStatus !== 'da-xu-ly' ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<XCircle size={14} />}
                    onClick={() => handleStatusUpdate('tu-choi')}
                    isLoading={rejecting}
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Check2All size={15} />}
                    disabled={loading || !items.length}
                    onClick={() => onCreateOrder?.(req.id, req.code, items)}
                  >
                    Tạo đơn mua hàng
                  </Button>
                </>
              ) : (
                <span className="text-xs text-emerald-700 font-semibold italic">
                  ✓ Đã tạo đơn mua hàng
                </span>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Card mã phiếu & trạng thái */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200/80">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  MÃ PHIẾU YÊU CẦU
                </div>
                <div className="font-mono font-extrabold text-[15px] text-blue-700">
                  {req.code || req.id}
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.badgeClass}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {st.label}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Người yêu cầu:</span>
                <span className="font-bold text-slate-800">{req.nguoiYeuCau || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đơn vị / Bộ phận:</span>
                <span className="font-semibold text-slate-700">{req.donVi || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày tạo phiếu:</span>
                <span className="font-medium text-slate-700">
                  {req.ngayTao ? new Date(req.ngayTao).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày cần có hàng:</span>
                <span className="font-semibold text-amber-700">
                  {req.ngayCanCo ? new Date(req.ngayCanCo).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
              {req.lyDo && (
                <div className="pt-2 border-t border-slate-200/70">
                  <div className="text-slate-500 mb-1">Lý do yêu cầu:</div>
                  <div className="font-medium text-slate-800 bg-white rounded-lg p-2 border border-slate-200/80">
                    {req.lyDo}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Danh sách sản phẩm / vật tư ở dưới cùng */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BoxSeam size={14} className="text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Danh sách mặt hàng ({items.length})
                </span>
              </div>
              {totalDK > 0 && (
                <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {fmtVnd(totalDK)}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Đang tải danh sách mặt hàng...
              </div>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Không có mặt hàng nào trong phiếu này.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item: any, idx: number) => {
                  const isDone = item.trangThaiXuLy === 'da-tao-don';
                  return (
                    <div
                      key={item.id || idx}
                      className={`p-2.5 rounded-lg border ${
                        isDone
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-slate-800">
                          {idx + 1}. {item.tenHang}
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          SL: {item.soLuong} {item.donVi || ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                        <span>
                          Đơn giá DK:{' '}
                          <strong className="text-slate-700">{fmtVnd(item.donGiaDK)}</strong>
                        </span>
                        {isDone && (
                          <span className="text-emerald-700 font-bold">✓ Đã lên đơn</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Offcanvas>

      <ConfirmDialog
        isOpen={confirmDel}
        title="Xoá yêu cầu mua hàng"
        message={`Bạn có chắc chắn muốn xoá yêu cầu mua hàng "${req.code || req.id}"? Hành động này không thể hoàn tác.`}
        confirmText="Xoá"
        cancelText="Huỷ"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </>
  );
}

// ============================================================================
// OFFCANVAS CHI TIẾT ĐƠN MUA HÀNG (CHUẨN OFFCANVAS.TSX 400PX)
// ============================================================================
function PurchaseOrderDetailOffcanvas({
  order,
  onClose,
  onChanged,
  onEditOrder,
  onPrintOrder,
}: {
  order: any | null;
  onClose: () => void;
  onChanged?: () => void;
  onEditOrder?: (
    orderId: string,
    orderCode: string | null,
    supplierId: string | null,
    ngayNhan: string | null,
    ghiChu: string | null,
    items: any[]
  ) => void;
  onPrintOrder?: (
    orderId: string,
    orderCode: string | null,
    supplierId: string,
    supplierName: string,
    items: any[]
  ) => void;
}) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [carrierList, setCarrierList] = useState<any[]>([]);

  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [shippingDepot, setShippingDepot] = useState('');
  const [carrierDebt, setCarrierDebt] = useState<number>(0);
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const carrierDropdownRef = useRef<HTMLDivElement>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetch('/api/plan-finance/carriers?limit=100')
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.items)) setCarrierList(d.items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (carrierDropdownRef.current && !carrierDropdownRef.current.contains(e.target as Node)) {
        setShowCarrierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrderDetail = useCallback(
    (orderId: string) => {
      setLoading(true);
      fetch(`/api/plan-finance/purchasing/${orderId}`)
        .then((r) => r.json())
        .then((d) => {
          setDetail(d);
          setCarrierId(d.carrierId ?? null);
          setCarrierSearch(d.carrier?.name ?? '');
          setShippingFee(Number(d.shippingFee) || 0);
          setShippingDepot(d.shippingDepot ?? d.carrier?.address ?? '');
          setCarrierDebt(Number(d.carrierDebt ?? d.carrier?.hanMucNo) || 0);
        })
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));

      fetch(`/api/plan-finance/purchasing/${orderId}/activities`)
        .then((r) => r.json())
        .then((acts) => setActivities(Array.isArray(acts) ? acts : []))
        .catch(() => setActivities([]));
    },
    []
  );

  useEffect(() => {
    if (!order) {
      setDetail(null);
      return;
    }
    loadOrderDetail(order.id);
  }, [order, loadOrderDetail]);

  if (!order) return null;

  const activeOrder = detail || order;
  const currentStatus = activeOrder.trangThai || 'draft';
  const isOrdered = currentStatus === 'ordered';
  const st = ORD_STATUS[currentStatus] || {
    label: currentStatus,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const saveShippingInfo = async (
    newCarrierId: string | null,
    newFee: number,
    newDepot: string,
    newDebt: number,
    newName: string
  ) => {
    if (!isOrdered) return;
    try {
      const res = await fetch(`/api/plan-finance/purchasing/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId: newCarrierId,
          carrierName: newName,
          shippingFee: newFee,
          shippingDepot: newDepot,
          carrierDebt: newDebt,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail(updated);
        onChanged?.();
      }
    } catch (e) {
      console.error('Lỗi lưu vận chuyển:', e);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/plan-finance/purchasing/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trangThai: status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail(updated);
        onChanged?.();
        loadOrderDetail(order.id);
        if (status === 'received') {
          onClose();
        }
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteOrder = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/purchasing/${order.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmDeleteOpen(false);
        onChanged?.();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  const items = activeOrder.items || [];
  const supplier = activeOrder.supplier;
  const canReceive =
    isOrdered &&
    Boolean(carrierId || carrierSearch.trim()) &&
    Boolean(shippingDepot.trim()) &&
    shippingFee >= 0;

  return (
    <>
      <Offcanvas
        isOpen={!!order}
        onClose={onClose}
        width="400px"
        title="Chi tiết đơn mua hàng"
        description={activeOrder.code || order.id}
        icon={<CartCheck size={18} />}
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={deleting}
              title="Xoá đơn hàng"
              className="!px-2.5 shrink-0"
            >
              <Trash size={15} />
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Printer size={14} />}
                onClick={() =>
                  onPrintOrder?.(
                    order.id,
                    activeOrder.code,
                    activeOrder.supplierId || '',
                    supplier?.name || 'Nhà cung cấp',
                    items
                  )
                }
              >
                In đơn
              </Button>
              {currentStatus === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CartCheck size={14} />}
                  onClick={() => handleUpdateStatus('ordered')}
                  isLoading={updatingStatus}
                >
                  Đặt hàng
                </Button>
              )}
              {isOrdered && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<BoxSeam size={14} />}
                  disabled={!canReceive}
                  title={
                    !canReceive
                      ? 'Vui lòng điền Đơn vị vận chuyển và Bến bãi trước khi Nhận hàng'
                      : 'Xác nhận nhận hàng & gửi yêu cầu IQC'
                  }
                  onClick={() => handleUpdateStatus('received')}
                  isLoading={updatingStatus}
                >
                  Nhận hàng
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Tóm tắt trạng thái & giá trị */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200/80">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  MÃ ĐƠN MUA HÀNG
                </div>
                <div className="font-mono font-extrabold text-[15px] text-blue-700">
                  {activeOrder.code || order.id}
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.badgeClass}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {st.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <div className="text-slate-400 text-[10.5px] font-semibold">NGÀY GIAO DỰ KIẾN</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {activeOrder.ngayNhan
                    ? new Date(activeOrder.ngayNhan).toLocaleDateString('vi-VN')
                    : '—'}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-slate-200/80">
                <div className="text-slate-400 text-[10.5px] font-semibold">TỔNG GIÁ TRỊ ĐƠN</div>
                <div className="font-extrabold text-blue-700 mt-0.5">
                  {fmtVnd(activeOrder.tongTien)}
                </div>
              </div>
            </div>

            {/* Thanh nút điều khiển trạng thái nhanh */}
            <div className="grid grid-cols-4 gap-1.5 mt-3">
              <button
                type="button"
                disabled={currentStatus !== 'draft'}
                onClick={() =>
                  onEditOrder?.(
                    order.id,
                    activeOrder.code,
                    activeOrder.supplierId,
                    activeOrder.ngayNhan,
                    activeOrder.ghiChu,
                    items
                  )
                }
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <Pencil size={11} /> Sửa
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('disputed')}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-rose-200 bg-rose-50/50 text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <ExclamationCircle size={11} /> Khiếu nại
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('paused')}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-amber-200 bg-amber-50/50 text-[11px] font-bold text-amber-700 hover:bg-amber-50 cursor-pointer"
              >
                <PauseCircle size={11} /> Tạm dừng
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('cancelled')}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <SlashCircle size={11} /> Huỷ bỏ
              </button>
            </div>
          </div>

          {/* Thông tin Nhà cung cấp */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Building size={13} className="text-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Nhà cung cấp
              </span>
            </div>
            <div className="font-bold text-slate-900 text-sm">{supplier?.name || '—'}</div>
            {supplier?.address && (
              <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1">
                <GeoAlt size={12} className="text-rose-500 shrink-0 mt-0.5" />
                <span>{supplier.address}</span>
              </div>
            )}
            {(supplier?.phone || supplier?.email) && (
              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600 mt-1.5">
                {supplier?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Telephone size={11} className="text-blue-600" /> {supplier.phone}
                  </span>
                )}
                {supplier?.email && (
                  <span className="inline-flex items-center gap-1">
                    <Envelope size={11} className="text-blue-600" /> {supplier.email}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Thông tin Đơn vị vận chuyển */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-blue-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Đơn vị vận chuyển
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isOrdered
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isOrdered ? 'Mở khoá nhập liệu' : 'Chỉ mở khi Đã đặt hàng'}
              </span>
            </div>

            <div ref={carrierDropdownRef} className="relative">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tên đơn vị vận chuyển
              </label>
              <input
                type="text"
                disabled={!isOrdered}
                value={carrierSearch}
                placeholder={isOrdered ? 'Chọn hoặc nhập tên ĐVVC...' : 'Chưa chọn ĐVVC'}
                onFocus={() => isOrdered && setShowCarrierDropdown(true)}
                onChange={(e) => {
                  setCarrierSearch(e.target.value);
                  setShowCarrierDropdown(true);
                }}
                onBlur={() =>
                  saveShippingInfo(carrierId, shippingFee, shippingDepot, carrierDebt, carrierSearch)
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none disabled:opacity-60"
              />
              {showCarrierDropdown && isOrdered && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-30">
                  {carrierList
                    .filter(
                      (c) =>
                        !carrierSearch.trim() ||
                        c.name.toLowerCase().includes(carrierSearch.toLowerCase())
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCarrierId(c.id);
                          setCarrierSearch(c.name);
                          const depot = c.address || shippingDepot;
                          const debt = c.hanMucNo ?? 0;
                          setShippingDepot(depot);
                          setCarrierDebt(debt);
                          setShowCarrierDropdown(false);
                          saveShippingInfo(c.id, shippingFee, depot, debt, c.name);
                        }}
                        className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <div className="font-bold text-slate-800">{c.name}</div>
                        {c.address && <div className="text-[11px] text-slate-500">{c.address}</div>}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Bến bãi / Kho nhận hàng
              </label>
              <input
                type="text"
                disabled={!isOrdered}
                value={shippingDepot}
                onChange={(e) => setShippingDepot(e.target.value)}
                onBlur={() =>
                  saveShippingInfo(carrierId, shippingFee, shippingDepot, carrierDebt, carrierSearch)
                }
                placeholder="Nhập bến bãi giao nhận..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chi phí vận chuyển (₫)
                </label>
                <CurrencyInput
                  value={shippingFee}
                  onChange={setShippingFee}
                  onBlur={() =>
                    saveShippingInfo(
                      carrierId,
                      shippingFee,
                      shippingDepot,
                      carrierDebt,
                      carrierSearch
                    )
                  }
                  disabled={!isOrdered}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Công nợ ĐVVC (₫)
                </label>
                <CurrencyInput
                  value={carrierDebt}
                  onChange={setCarrierDebt}
                  onBlur={() =>
                    saveShippingInfo(
                      carrierId,
                      shippingFee,
                      shippingDepot,
                      carrierDebt,
                      carrierSearch
                    )
                  }
                  disabled={!isOrdered}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Danh sách mặt hàng đặt mua (đặt ở phía dưới) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <BoxSeam size={14} className="text-blue-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Danh sách mặt hàng ({items.length})
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400">Đang tải mặt hàng...</div>
            ) : (
              <div className="space-y-2">
                {items.map((it: any, idx: number) => (
                  <div
                    key={it.id || idx}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-slate-800">
                        {idx + 1}. {it.tenHang}
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        SL: {it.soLuong} {it.donVi || ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>Đơn giá: {fmtVnd(it.donGia)}</span>
                      <span className="font-bold text-blue-700">
                        = {fmtVnd(it.thanhTien || it.soLuong * it.donGia)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử hoạt động đơn hàng */}
          {activities.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <ClockHistory size={13} className="text-slate-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Lịch sử đơn hàng
                </span>
              </div>
              <div className="space-y-2">
                {activities.slice(-5).reverse().map((act: any) => (
                  <div
                    key={act.id}
                    className="text-xs border-l-2 border-blue-500 pl-2.5 py-0.5"
                  >
                    <div className="text-[11px] text-slate-400">
                      {new Date(act.ngay || act.createdAt).toLocaleString('vi-VN')} ·{' '}
                      <strong className="text-slate-600">{act.nguoiThucHien}</strong>
                    </div>
                    <div className="text-slate-700 font-medium mt-0.5">{act.ketQua}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Offcanvas>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Xoá đơn mua hàng"
        message={`Bạn có chắc chắn muốn xoá đơn mua hàng "${activeOrder.code || order.id}"?`}
        confirmText="Xoá đơn"
        cancelText="Huỷ"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}

export default PurchaseOverviewPage;
