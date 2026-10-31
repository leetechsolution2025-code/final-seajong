"use client";

import { HoverImage } from "@/components/ui/HoverImage";
import React, { useState, useEffect, useMemo } from "react";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { TableToolbar } from "@/components/common/TableToolbar";
import { Pagination } from "@/components/common/Pagination";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { isLogisticsAdmin, canPickAndPack } from "@/lib/logistics-permissions";
import { toast } from "react-toastify";

interface BatchItemOrder {
  id: string; // Ticket ID
  ticketCode?: string;
  ticketItemId: string;
  code: string;
  customerName?: string;
  soLuongTrongDon: number;
  daNhatTrongDon?: number;
  ngayGiao?: string;
  createdAt?: string;
  assignedTo?: string;
}

interface BatchItem {
  id: string;
  ticketItemId: string;
  tenHang: string;
  inventoryItemId: string | null;
  code?: string | null;
  imageUrl: string | null;
  images?: string[];
  viTriKho: string | null;
  tongSoLuong: number;
  tongDaNhat: number;
  thucTon: number;
  ngayGiao?: string;
  orders: BatchItemOrder[];
}

interface OrderGroupItem {
  ticketItemId: string;
  inventoryItemId: string | null;
  tenHang: string;
  code?: string | null;
  imageUrl: string | null;
  images?: string[];
  viTriKho: string | null;
  soLuongYeuCau: number;
  thucTon: number;
  daNhat: number;
}

interface OrderGroup {
  id: string; // Ticket ID
  code: string; // SaleOrder Code or Ticket Code
  ticketCode: string;
  customerName?: string;
  ngayGiao?: string;
  createdAt?: string;
  assignedTo?: string;
  items: OrderGroupItem[];
}

interface Employee {
  id: string;
  fullName: string;
}

export function LogisticsBatchPacking() {
  const { user, loading: authLoading } = useAuth();
  const isThuKho = isLogisticsAdmin(user);
  const canPick = canPickAndPack(user);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [, setTotalOrders] = useState(0);

  // Chế độ xem: 'by-material' (Gom theo hàng hoá) hoặc 'by-order' (Tách theo đơn hàng)
  const [viewMode, setViewMode] = useState<"by-material" | "by-order">("by-material");

  const [isManager, setIsManager] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [ticketIdsToAssign, setTicketIdsToAssign] = useState<string[] | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Trạng thái thu gọn cho chế độ xem tổng hợp (theo ngày)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Trạng thái thu gọn cho chế độ xem tách theo đơn hàng (theo order id)
  const [collapsedOrders, setCollapsedOrders] = useState<Set<string>>(new Set());

  // Trạng thái xác nhận hoàn thành
  const [completingDate, setCompletingDate] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<OrderGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const toggleOrder = (orderId: string) => {
    setCollapsedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAllOrders = (collapse: boolean) => {
    if (collapse) {
      setCollapsedOrders(new Set(allOrderGroups.map(o => o.id)));
    } else {
      setCollapsedOrders(new Set());
    }
  };

  const fetchEmployees = async () => {
    try {
      const staffRes = await fetch("/api/logistics/staff");
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        if (Array.isArray(staffData) && staffData.length > 0) {
          setEmployees(staffData.map((e: any) => ({ id: e.id, fullName: e.fullName || e.name })));
          return;
        }
      }
      const res = await fetch("/api/hr/employees?department=logistics&pageSize=100");
      const data = await res.json();
      if (data && Array.isArray(data.employees)) {
        setEmployees(data.employees.map((e: any) => ({ id: e.id, fullName: e.fullName })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("seajong_token") : null;
      const userQuery = user?.id ? `&userId=${encodeURIComponent(user.id)}` : "";
      const res = await fetch(`/api/logistics/batch-packing?t=${Date.now()}${userQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotalOrders(data.totalOrders || 0);
        setIsManager(Boolean(data.isManager && isThuKho));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, user?.id, isThuKho]);

  useEffect(() => {
    if (isManager && employees.length === 0) {
      fetchEmployees();
    }
  }, [isManager]);

  const openAssignModal = (ticketIds: string | string[]) => {
    setTicketIdsToAssign(Array.isArray(ticketIds) ? ticketIds : [ticketIds]);
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!ticketIdsToAssign || ticketIdsToAssign.length === 0 || !selectedEmployeeId) {
      alert("Vui lòng chọn nhân viên");
      return;
    }
    try {
      const res = await fetch("/api/logistics/batch-packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "assign_ticket", 
          ticketIds: ticketIdsToAssign, 
          employeeId: selectedEmployeeId 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Phân công thành công!");
        setAssignModalOpen(false);
        setTicketIdsToAssign(null);
        fetchData();
      } else {
        toast.error(data.error || "Phân công thất bại");
      }
    } catch (e) {
      toast.error("Đã xảy ra lỗi");
    }
  };

  const handleUpdateDeadline = async (dateStr: string, newDate: string) => {
    if (!newDate) return;
    const ticketIds = Array.from(new Set((groupedItems[dateStr] || []).flatMap(item => item.orders.map((o: any) => o.id))));
    try {
      const res = await fetch("/api/logistics/tickets/update-deadline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds, newDate })
      });
      if (res.ok) {
        toast.success("Đã cập nhật Hạn hoàn thành thành công!");
        fetchData();
      } else {
        toast.error("Cập nhật thất bại.");
      }
    } catch (e) {
      toast.error("Đã xảy ra lỗi khi cập nhật.");
    }
  };

  // Helper: Lấy số lượng đã nhặt hiện tại của một BatchItem (tổng từ các đơn hoặc giá trị nhập trực tiếp)
  const getBatchItemCurrentQty = (batchItem: BatchItem) => {
    if (pickedQuantities[batchItem.id] !== undefined) {
      return pickedQuantities[batchItem.id];
    }
    let hasOrderEdit = false;
    let sum = 0;
    batchItem.orders.forEach(o => {
      if (pickedQuantities[o.ticketItemId] !== undefined) {
        hasOrderEdit = true;
        sum += pickedQuantities[o.ticketItemId];
      } else {
        sum += (o.daNhatTrongDon || 0);
      }
    });
    return hasOrderEdit ? sum : (batchItem.tongDaNhat || 0);
  };

  const isBatchItemEdited = (batchItem: BatchItem) => {
    if (pickedQuantities[batchItem.id] !== undefined) return true;
    return batchItem.orders.some(o => pickedQuantities[o.ticketItemId] !== undefined);
  };

  // --- Handlers cho chế độ Gom theo hàng hoá ---
  const handleTogglePick = (batchItem: BatchItem) => {
    const current = getBatchItemCurrentQty(batchItem);
    const maxAllowed = Math.min(batchItem.tongSoLuong, batchItem.thucTon !== undefined ? batchItem.thucTon : batchItem.tongSoLuong);
    const target = current >= maxAllowed ? 0 : maxAllowed;
    setPickedQuantities(prev => {
      const next = { ...prev };
      if (target === 0) {
        delete next[batchItem.id];
        batchItem.orders.forEach(o => delete next[o.ticketItemId]);
      } else {
        next[batchItem.id] = target;
        let remaining = target;
        batchItem.orders.forEach(o => {
          const alloc = Math.min(remaining, o.soLuongTrongDon);
          next[o.ticketItemId] = alloc;
          remaining -= alloc;
        });
      }
      return next;
    });
  };

  const handleQuantityChange = (batchItem: BatchItem, val: string) => {
    if (val === "") {
      setPickedQuantities(prev => {
        const next = { ...prev };
        delete next[batchItem.id];
        batchItem.orders.forEach(o => delete next[o.ticketItemId]);
        return next;
      });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      const maxAllowed = Math.min(batchItem.tongSoLuong, batchItem.thucTon !== undefined ? batchItem.thucTon : batchItem.tongSoLuong);
      const clamped = Math.max(0, Math.min(num, maxAllowed));
      setPickedQuantities(prev => {
        const next = { ...prev };
        next[batchItem.id] = clamped;
        let remaining = clamped;
        batchItem.orders.forEach(o => {
          const alloc = Math.min(remaining, o.soLuongTrongDon);
          next[o.ticketItemId] = alloc;
          remaining -= alloc;
        });
        return next;
      });
    }
  };

  // --- Handlers cho chế độ Tách theo đơn hàng ---
  const handleToggleOrderItemPick = (ticketItemId: string, maxQty: number) => {
    setPickedQuantities(prev => {
      const next = { ...prev };
      const current = next[ticketItemId] !== undefined ? next[ticketItemId] : 0;
      if (current >= maxQty) {
        delete next[ticketItemId];
      } else {
        next[ticketItemId] = maxQty;
      }
      items.forEach(b => {
        if (b.orders.some(o => o.ticketItemId === ticketItemId)) {
          delete next[b.id];
        }
      });
      return next;
    });
  };

  const handleOrderItemQuantityChange = (ticketItemId: string, val: string, maxQty: number) => {
    if (val === "") {
      setPickedQuantities(prev => {
        const next = { ...prev };
        delete next[ticketItemId];
        items.forEach(b => {
          if (b.orders.some(o => o.ticketItemId === ticketItemId)) {
            delete next[b.id];
          }
        });
        return next;
      });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setPickedQuantities(prev => {
        const next = { ...prev };
        next[ticketItemId] = Math.max(0, Math.min(num, maxQty));
        items.forEach(b => {
          if (b.orders.some(o => o.ticketItemId === ticketItemId)) {
            delete next[b.id];
          }
        });
        return next;
      });
    }
  };

  // --- Handlers hoàn thành báo cáo ---
  const handleCompleteClick = (dateStr: string) => {
    const groupItems = groupedItems[dateStr] || [];
    const pickedItemsForDate = groupItems.filter(item => isBatchItemEdited(item));
    
    if (pickedItemsForDate.length === 0) {
      toast.warning("Vui lòng nhập số lượng cho ít nhất 1 mặt hàng trong ngày này.");
      return;
    }
    setCompletingDate(dateStr);
  };

  const executeComplete = async (dateStr: string) => {
    setIsSubmitting(true);
    try {
      const groupItems = groupedItems[dateStr] || [];
      const pickedItemsForDate = groupItems.filter(item => isBatchItemEdited(item));
      
      const payloadPickedQuantities: Record<string, number> = {};
      pickedItemsForDate.forEach(batchItem => {
        let remainingQty = getBatchItemCurrentQty(batchItem);
        batchItem.orders.forEach((order: any) => {
          if (pickedQuantities[order.ticketItemId] !== undefined) {
            payloadPickedQuantities[order.ticketItemId] = pickedQuantities[order.ticketItemId];
            remainingQty -= pickedQuantities[order.ticketItemId];
          } else {
            if (remainingQty <= 0) return;
            const fulfillQty = Math.min(remainingQty, order.soLuongTrongDon);
            payloadPickedQuantities[order.ticketItemId] = fulfillQty;
            remainingQty -= fulfillQty;
          }
        });
      });

      const res = await fetch("/api/logistics/batch-packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking", date: dateStr, pickedQuantities: payloadPickedQuantities })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Báo cáo gom hàng thành công!");
        setPickedQuantities(prev => {
          const next = { ...prev };
          pickedItemsForDate.forEach(item => {
            delete next[item.id];
            item.orders.forEach(o => delete next[o.ticketItemId]);
          });
          return next;
        });
        fetchData();
      } else {
        toast.error(data.error || "Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
      setCompletingDate(null);
    }
  };

  const handleOrderCompleteClick = (order: OrderGroup) => {
    const hasAnyChange = order.items.some(it => pickedQuantities[it.ticketItemId] !== undefined);
    if (!hasAnyChange) {
      toast.warning("Vui lòng tick chọn hoặc nhập số lượng đã gom cho ít nhất 1 mặt hàng trong đơn.");
      return;
    }
    setCompletingOrder(order);
  };

  const executeOrderComplete = async (order: OrderGroup) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, number> = {};
      order.items.forEach(it => {
        if (pickedQuantities[it.ticketItemId] !== undefined) {
          payload[it.ticketItemId] = pickedQuantities[it.ticketItemId];
        }
      });

      const res = await fetch("/api/logistics/batch-packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking", pickedQuantities: payload })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã cập nhật đơn hàng ${order.code} thành công!`);
        setPickedQuantities(prev => {
          const next = { ...prev };
          order.items.forEach(it => delete next[it.ticketItemId]);
          items.forEach(b => {
            if (b.orders.some(o => o.id === order.id)) {
              delete next[b.id];
            }
          });
          return next;
        });
        fetchData();
      } else {
        toast.error(data.error || "Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
      setCompletingOrder(null);
    }
  };

  const getRelativeDateText = (dateString: string) => {
    if (dateString === "Ngay lập tức" || dateString === "Không hẹn ngày") return dateString;
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const targetDate = new Date(Number(y), Number(m) - 1, Number(d));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Hôm nay";
      if (diffDays === 1) return "Ngày mai";
      if (diffDays > 1) return `${diffDays} ngày nữa`;
      if (diffDays < 0) return `Trễ ${Math.abs(diffDays)} ngày`;
    }
    return dateString;
  };

  // --- Chuyển đổi dữ liệu sang Danh sách Đơn hàng (Order Groups) ---
  const allOrderGroups = useMemo(() => {
    const orderMap = new Map<string, OrderGroup>();

    items.forEach(batchItem => {
      (batchItem.orders || []).forEach(order => {
        const orderId = order.id;
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            id: orderId,
            code: order.code,
            ticketCode: order.ticketCode || order.code,
            customerName: order.customerName,
            ngayGiao: order.ngayGiao,
            createdAt: order.createdAt,
            assignedTo: order.assignedTo,
            items: []
          });
        }
        const group = orderMap.get(orderId)!;
        group.items.push({
          ticketItemId: order.ticketItemId,
          inventoryItemId: batchItem.inventoryItemId,
          tenHang: batchItem.tenHang,
          code: batchItem.code,
          imageUrl: batchItem.imageUrl,
          images: batchItem.images,
          viTriKho: batchItem.viTriKho,
          soLuongYeuCau: order.soLuongTrongDon,
          thucTon: batchItem.thucTon || 0,
          daNhat: order.daNhatTrongDon || 0
        });
      });
    });

    return Array.from(orderMap.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [items]);

  // --- Lọc dữ liệu ---
  // 1. Lọc mặt hàng (cho chế độ Gom theo hàng hoá)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search || 
        item.tenHang.toLowerCase().includes(search.toLowerCase()) || 
        (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
        (item.inventoryItemId && item.inventoryItemId.toLowerCase().includes(search.toLowerCase())) ||
        item.orders.some(o => o.code.toLowerCase().includes(search.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase())));

      let matchDate = true;
      if (filterDate) {
        if (item.ngayGiao) {
          const itemDate = new Date(item.ngayGiao).toISOString().split('T')[0];
          matchDate = itemDate === filterDate;
        } else {
          matchDate = false;
        }
      }

      let matchStatus = true;
      if (filterStatus === "pending") {
        matchStatus = item.tongDaNhat < item.tongSoLuong;
      } else if (filterStatus === "done") {
        matchStatus = item.tongDaNhat >= item.tongSoLuong;
      }

      return matchSearch && matchDate && matchStatus;
    });
  }, [items, search, filterDate, filterStatus]);

  // 2. Lọc đơn hàng (cho chế độ Tách theo đơn hàng)
  const filteredOrderGroups = useMemo(() => {
    return allOrderGroups.filter(order => {
      const matchSearch = !search ||
        order.code.toLowerCase().includes(search.toLowerCase()) ||
        order.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(search.toLowerCase())) ||
        order.items.some(it => it.tenHang.toLowerCase().includes(search.toLowerCase()) || (it.code && it.code.toLowerCase().includes(search.toLowerCase())));

      let matchDate = true;
      if (filterDate) {
        if (order.ngayGiao) {
          const orderDate = new Date(order.ngayGiao).toISOString().split('T')[0];
          matchDate = orderDate === filterDate;
        } else if (order.createdAt) {
          const createdDate = new Date(order.createdAt).toISOString().split('T')[0];
          matchDate = createdDate === filterDate;
        } else {
          matchDate = false;
        }
      }

      let matchStatus = true;
      const isOrderFullyPicked = order.items.length > 0 && order.items.every(it => it.daNhat >= it.soLuongYeuCau);
      if (filterStatus === "pending") {
        matchStatus = !isOrderFullyPicked;
      } else if (filterStatus === "done") {
        matchStatus = isOrderFullyPicked;
      }

      return matchSearch && matchDate && matchStatus;
    });
  }, [allOrderGroups, search, filterDate, filterStatus]);

  // --- Phân trang cho từng chế độ ---
  const totalCount = viewMode === "by-order" ? filteredOrderGroups.length : filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Đảm bảo activePage hợp lệ
  const activePage = Math.min(currentPage, totalPages);

  const paginatedOrderGroups = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredOrderGroups.slice(start, start + pageSize);
  }, [filteredOrderGroups, activePage, pageSize]);

  const paginatedItems = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, activePage, pageSize]);

  // Gom nhóm theo ngày cho danh sách hàng hoá đã phân trang
  const groupedItems = useMemo(() => {
    return paginatedItems.reduce((acc, item) => {
      const dateStr = item.ngayGiao ? new Date(item.ngayGiao).toLocaleDateString('vi-VN') : "Không hẹn ngày";
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(item);
      return acc;
    }, {} as Record<string, BatchItem[]>);
  }, [paginatedItems]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      if (a === "Không hẹn ngày") return 1;
      if (b === "Không hẹn ngày") return -1;
      const partsA = a.split('/');
      const partsB = b.split('/');
      if (partsA.length === 3 && partsB.length === 3) {
        const [d1, m1, y1] = partsA;
        const [d2, m2, y2] = partsB;
        return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
      }
      return 0;
    });
  }, [groupedItems]);

  const allOrdersCollapsed = useMemo(() => {
    if (paginatedOrderGroups.length === 0) return false;
    return paginatedOrderGroups.every(o => collapsedOrders.has(o.id));
  }, [paginatedOrderGroups, collapsedOrders]);

  // --- Toolbar Component ---
  const headerContent = (
    <TableToolbar
      searchValue={search}
      onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
      searchPlaceholder="Tìm tên hàng hoá, mã hàng, số đơn..."
      searchWidth={280}
      filters={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc ngày nâng cấp đẹp chuẩn Enterprise */}
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-2xs">
            <i className="bi bi-calendar3 text-slate-400 text-xs" />
            <input 
              type="date"
              className="h-full bg-transparent border-none text-slate-700 text-xs font-medium outline-none cursor-pointer"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
            />
            {filterDate && (
              <button
                type="button"
                className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-0.5"
                onClick={() => { setFilterDate(""); setCurrentPage(1); }}
                title="Xoá lọc ngày"
              >
                <i className="bi bi-x-circle-fill text-xs" />
              </button>
            )}
          </div>

          {/* Lọc trạng thái nâng cấp */}
          <select
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium outline-none hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs cursor-pointer"
            style={{ width: 155 }}
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chưa nhặt xong</option>
            <option value="done">Đã hoàn thành</option>
          </select>
        </div>
      }
      menuItems={[
        {
          label: (
            <div className="flex items-center justify-between w-full py-0.5">
              <span className="flex items-center gap-2 text-slate-700">
                <i className="bi bi-box-seam text-blue-600 text-sm" />
                <span>Tổng hợp hàng hoá</span>
              </span>
              {viewMode === "by-material" && (
                <i className="bi bi-check2 text-blue-600 font-bold ml-3" />
              )}
            </div>
          ),
          onClick: () => { setViewMode("by-material"); setCurrentPage(1); },
        },
        {
          label: (
            <div className="flex items-center justify-between w-full py-0.5">
              <span className="flex items-center gap-2 text-slate-700">
                <i className="bi bi-receipt text-indigo-600 text-sm" />
                <span>Theo đơn hàng</span>
              </span>
              {viewMode === "by-order" && (
                <i className="bi bi-check2 text-blue-600 font-bold ml-3" />
              )}
            </div>
          ),
          onClick: () => { setViewMode("by-order"); setCurrentPage(1); },
        },
        ...(viewMode === "by-order" ? [{
          divider: true,
          label: (
            <span className="flex items-center gap-2 text-slate-600 py-0.5">
              <i className={`bi bi-${allOrdersCollapsed ? "arrows-expand" : "arrows-collapse"} text-slate-400 text-sm`} />
              <span>{allOrdersCollapsed ? "Hiện tất cả hàng hoá" : "Ẩn tất cả hàng hoá"}</span>
            </span>
          ),
          onClick: () => toggleAllOrders(!allOrdersCollapsed),
        }] : [])
      ]}
    />
  );

  // --- Table Content ---
  const tableContent = (
    <FullWidthTable loading={loading}>
      {totalCount === 0 && !loading ? (
        <div className="text-center p-5 mt-4">
          <div className="mx-auto mb-4 d-flex align-items-center justify-content-center position-relative" style={{ width: 90, height: 90 }}>
            <div className="position-absolute w-100 h-100" style={{ background: "#10b981", opacity: 0.1, borderRadius: "50%" }}></div>
            <div className="position-absolute" style={{ width: 64, height: 64, background: "#10b981", opacity: 0.15, borderRadius: "50%" }}></div>
            <i className="bi bi-box-seam position-relative" style={{ fontSize: 38, color: "#10b981" }} />
          </div>
          <h5 className="fw-bold" style={{ color: "#1e293b" }}>Tuyệt vời!</h5>
          <p className="text-muted">
            {isManager
              ? "Không có hàng hoá hay lệnh gom hàng nào cần xử lý với bộ lọc hiện tại."
              : "Hiện tại bạn chưa có công việc gom hàng và dán nhãn nào được giao."}
          </p>
        </div>
      ) : (
        <table className="w-full text-left border-collapse" style={{ width: "100%", minWidth: "100%", fontSize: "13px" }}>
          {/* Header duy nhất 1 dòng */}
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
              <th className="py-2.5 px-3 w-10 text-center border-0 align-middle">
                <i className="bi bi-check-all text-sm" />
              </th>
              <th className="py-2.5 px-3.5 min-w-[280px] border-0 align-middle">
                Mặt hàng
              </th>
              <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[150px] text-center border-0 align-middle">
                {isManager ? "Yêu cầu | Thực tồn" : "Số lượng yêu cầu"}
              </th>
              <th className="py-2.5 px-3.5 w-28 text-center border-0 align-middle">
                Đã nhặt
              </th>
              <th className="py-2.5 px-3.5 border-0 align-middle">
                {viewMode === "by-order" ? "Trạng thái" : "Chi tiết theo phiếu"}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* CHẾ ĐỘ 1: TÁCH THEO ĐƠN HÀNG */}
            {viewMode === "by-order" ? (
              paginatedOrderGroups.map(order => {
                const isCollapsed = collapsedOrders.has(order.id);
                let fullyPickedCount = 0;
                let partiallyPickedCount = 0;

                order.items.forEach(it => {
                  const qty = pickedQuantities[it.ticketItemId] !== undefined ? pickedQuantities[it.ticketItemId] : it.daNhat;
                  if (qty > 0) {
                    partiallyPickedCount++;
                    if (qty >= it.soLuongYeuCau) fullyPickedCount++;
                  }
                });

                const isOrderDone = fullyPickedCount === order.items.length && order.items.length > 0;
                const isOrderPicking = partiallyPickedCount > 0 && !isOrderDone;
                const hasPendingInput = order.items.some(it => pickedQuantities[it.ticketItemId] !== undefined);

                return (
                  <React.Fragment key={order.id}>
                    {/* Header phân nhóm cho từng Đơn hàng */}
                    <tr 
                      className="bg-slate-100/90 hover:bg-slate-200/70 cursor-pointer border-t border-b border-slate-200 transition-colors"
                      onClick={() => toggleOrder(order.id)}
                    >
                      <td colSpan={5} className="py-2.5 px-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 w-full">
                          <div className="flex items-center flex-wrap gap-2">
                            {/* Nút mũi tên ẩn/hiện hàng hoá trong đơn */}
                            <button
                              type="button"
                              className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all shadow-2xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOrder(order.id);
                              }}
                              title={isCollapsed ? "Hiện hàng hoá trong đơn" : "Ẩn hàng hoá trong đơn"}
                            >
                              <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'down'} text-[11px] font-bold`} />
                            </button>

                            <span className="text-slate-800 font-bold text-xs uppercase tracking-wide">
                              ĐƠN: <span className="text-blue-600 font-mono font-bold text-xs">{order.code}</span>
                            </span>

                            {order.ticketCode && order.ticketCode !== order.code && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                                {order.ticketCode}
                              </span>
                            )}

                            {isManager && order.customerName && (
                              <span className="text-slate-500 text-xs font-normal">
                                Khách hàng: <b className="text-slate-800 font-medium">{order.customerName}</b>
                              </span>
                            )}

                            {order.ngayGiao && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                <span>{getRelativeDateText(new Date(order.ngayGiao).toLocaleDateString('vi-VN'))}</span>
                              </span>
                            )}

                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
                              {order.items.length} mặt hàng
                            </span>

                            {/* Badge trạng thái */}
                            {isOrderDone ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <i className="bi bi-check-circle-fill text-[11px]" /> Đã gom đủ
                              </span>
                            ) : isOrderPicking ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <i className="bi bi-exclamation-triangle-fill text-[11px]" /> Đang gom / Thiếu
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <i className="bi bi-circle text-[10px]" /> Chưa thực hiện
                              </span>
                            )}

                            {/* Phân công (chỉ hiển thị cho Thủ kho) */}
                            {isManager && (
                              order.assignedTo ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(order.id);
                                  }}
                                  title="Nhấn để phân công lại"
                                >
                                  <i className="bi bi-person-fill text-[11px]" />
                                  {order.assignedTo}
                                </span>
                              ) : (
                                <button 
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(order.id);
                                  }}
                                >
                                  <i className="bi bi-person-plus text-[11px]" />
                                  Phân công
                                </button>
                              )
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Nút ẩn/hiện nhanh hàng hoá */}
                            <span className="text-slate-400 text-xs font-normal">
                              {isCollapsed ? "(Đang ẩn hàng hoá)" : "(Đang hiển thị hàng hoá)"}
                            </span>

                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (canPick) handleOrderCompleteClick(order); }} 
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                                hasPendingInput && canPick
                                  ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 cursor-pointer shadow-blue-500/20" 
                                  : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                              }`}
                              disabled={!hasPendingInput || !canPick}
                              title={!canPick ? "Chưa được cấp quyền Cấp phát vật tư & gom hàng" : hasPendingInput ? "Báo cáo hoàn tất gom hàng cho đơn này" : "Chưa có thay đổi số lượng để báo cáo"}
                            >
                              <i className="bi bi-send text-[11px]" /> Báo cáo
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Danh sách hàng hoá của đơn (khi mở) */}
                    {!isCollapsed && order.items.map(it => {
                      const currentInputQty = pickedQuantities[it.ticketItemId] !== undefined ? pickedQuantities[it.ticketItemId] : it.daNhat;
                      const isPicked = currentInputQty > 0;
                      const isFullyPicked = currentInputQty >= it.soLuongYeuCau;
                      const isEdited = pickedQuantities[it.ticketItemId] !== undefined;

                      return (
                        <tr 
                          key={it.ticketItemId}
                          className={`border-b border-slate-100 transition-colors ${
                            isFullyPicked ? "bg-emerald-50/40 hover:bg-emerald-50/70" : isPicked ? "bg-amber-50/40 hover:bg-amber-50/70" : "bg-white hover:bg-slate-50/80"
                          }`}
                        >
                          {/* Nút tick nhanh */}
                          <td 
                            className="text-center py-2.5 px-2.5 align-middle"
                            onClick={() => handleToggleOrderItemPick(it.ticketItemId, it.soLuongYeuCau)}
                          >
                            <div 
                              className={`w-3.5 h-3.5 mx-auto rounded-[3px] border flex items-center justify-center cursor-pointer transition-all ${
                                isFullyPicked 
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                                  : isPicked 
                                  ? "bg-amber-500 border-amber-500 text-white shadow-xs" 
                                  : "border-slate-300 hover:border-blue-400 bg-white text-transparent"
                              }`}
                              title={isFullyPicked ? "Bỏ chọn nhặt" : "Nhặt đủ số lượng"}
                            >
                              <i className="bi bi-check text-[10px] font-bold" />
                            </div>
                          </td>

                          {/* Thông tin mặt hàng */}
                          <td className="py-2.5 px-3.5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center overflow-hidden shrink-0">
                                {(it.imageUrl || (it.images && it.images.length > 0)) ? (
                                  <HoverImage 
                                    src={it.imageUrl || (it.images && it.images[0]) || ""} 
                                    alt={it.tenHang} 
                                    images={it.images?.length ? it.images : (it.imageUrl ? [it.imageUrl] : [])}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                                  />
                                ) : (
                                  <i className="bi bi-box-seam text-slate-400 text-base" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold text-[13px] truncate ${isFullyPicked ? "text-emerald-800" : isPicked ? "text-amber-800" : "text-slate-900"}`}>
                                  {it.tenHang}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {it.code && (
                                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                      {it.code}
                                    </span>
                                  )}
                                  {it.viTriKho ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                      <i className="bi bi-geo-alt text-[10px]" />
                                      {it.viTriKho}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-100 border border-slate-200/60">
                                      <i className="bi bi-geo text-[10px]" />
                                      Chưa gán vị trí
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Số lượng yêu cầu (và Thực tồn nếu là Thủ kho) */}
                          <td className="text-center py-2.5 px-3.5 align-middle">
                            <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-sm">
                              {it.soLuongYeuCau}
                            </span>
                            {isManager && (
                              <>
                                <span className="text-slate-300 mx-1.5">/</span>
                                <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-xs" title="Số lượng thực tồn kho">
                                  {it.thucTon ?? 0}
                                </span>
                              </>
                            )}
                          </td>

                          {/* Ô nhập số lượng Đã nhặt */}
                          <td className="text-center py-2.5 px-3.5 align-middle">
                            <input 
                              type="number"
                              className={`w-20 h-8 text-center font-mono font-bold text-sm rounded-lg border outline-none transition-all ${
                                isFullyPicked 
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 focus:ring-1 focus:ring-emerald-500" 
                                  : isPicked 
                                  ? "border-amber-500 bg-amber-50 text-amber-800 focus:ring-1 focus:ring-amber-500" 
                                  : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              } ${isEdited ? "ring-2 ring-amber-300" : ""}`}
                              value={currentInputQty > 0 || isEdited ? currentInputQty : 0}
                              onChange={e => handleOrderItemQuantityChange(it.ticketItemId, e.target.value, it.soLuongYeuCau)}
                              min={0}
                              max={it.soLuongYeuCau}
                            />
                          </td>

                          {/* Trạng thái mặt hàng */}
                          <td className="py-2.5 px-3.5 align-middle">
                            {isFullyPicked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <i className="bi bi-check-circle-fill text-[11px]" /> Đủ hàng ({currentInputQty}/{it.soLuongYeuCau})
                              </span>
                            ) : isPicked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <i className="bi bi-exclamation-triangle-fill text-[11px]" /> Thiếu hàng ({currentInputQty}/{it.soLuongYeuCau})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                <i className="bi bi-clock text-[10px]" /> Chờ nhặt
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : (
              /* CHẾ ĐỘ 2: TỔNG HỢP HÀNG HOÁ (GOM THEO HÀNG HOÁ) */
              sortedDates.map(dateStr => (
                <React.Fragment key={dateStr}>
                  {(() => {
                    const ticketIdsForDate = Array.from(new Set((groupedItems[dateStr] || []).flatMap(item => item.orders.map((o: any) => o.id))));
                    const dateAssignees = Array.from(new Set((groupedItems[dateStr] || []).flatMap(item => item.orders.map((o: any) => o.assignedTo).filter(Boolean))));
                    return (
                      <tr className="bg-slate-100/80 cursor-pointer border-t border-slate-200" onClick={() => toggleDate(dateStr)}>
                        <td colSpan={5} className="py-2.5 px-3.5 font-bold text-slate-800 border-b border-slate-200">
                          <div className="flex items-center justify-between flex-wrap gap-2 w-full">
                            <div className="flex items-center flex-wrap gap-2">
                              <i className={`bi bi-chevron-${collapsedDates.has(dateStr) ? 'right' : 'down'} text-secondary me-2`} style={{ fontSize: 12 }} />
                              
                              {(() => {
                                const dates = (groupedItems[dateStr] || []).flatMap(i => i.orders.map(o => o.createdAt)).filter((d): d is string => !!d);
                                dates.sort();
                                const groupCreatedAtStr = dates.length > 0 ? new Date(dates[0]).toLocaleDateString('vi-VN') : "Không rõ";
                                return (
                                  <span className="text-slate-600 text-xs font-medium">Ngày giao: <b className="text-slate-900">{groupCreatedAtStr}</b></span>
                                );
                              })()}

                              <span className="text-slate-300">|</span>

                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 transition-colors ${isManager ? "cursor-pointer hover:bg-rose-100" : ""}`} 
                                title={isManager ? "Nhấn để thay đổi Hạn hoàn thành" : undefined}
                                onClick={(e) => {
                                  if (!isManager) return;
                                  e.stopPropagation();
                                  const picker = document.getElementById(`date-picker-${dateStr}`) as HTMLInputElement;
                                  if (picker) {
                                    try { picker.showPicker(); } catch (err) { picker.click(); }
                                  }
                                }}
                              >
                                <span>{getRelativeDateText(dateStr)}</span>
                                {isManager && (
                                  <input 
                                    type="date" 
                                    id={`date-picker-${dateStr}`}
                                    style={{ opacity: 0, position: 'absolute', width: 0, height: 0, left: 0, top: 0 }}
                                    onChange={(e) => handleUpdateDeadline(dateStr, e.target.value)}
                                  />
                                )}
                              </span>

                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                                {groupedItems[dateStr].length} mặt hàng
                              </span>

                              {(() => {
                                const groupItems = groupedItems[dateStr];
                                let pickedCount = 0;
                                let fullyPickedCount = 0;
                                groupItems.forEach(item => {
                                  const qty = pickedQuantities[item.id] !== undefined ? pickedQuantities[item.id] : (item.tongDaNhat || 0);
                                  if (qty > 0) {
                                    pickedCount++;
                                    if (qty >= item.tongSoLuong) {
                                      fullyPickedCount++;
                                    }
                                  }
                                });
                                const isGroupFullyPicked = fullyPickedCount === groupItems.length;
                                const isGroupPicked = pickedCount > 0;
                                return isGroupFullyPicked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <i className="bi bi-check-circle-fill" /> Đã thực hiện | Đủ hàng
                                  </span>
                                ) : isGroupPicked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    <i className="bi bi-exclamation-triangle-fill" /> Đã thực hiện | Thiếu hàng
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                                    <i className="bi bi-circle" /> Chưa thực hiện
                                  </span>
                                );
                              })()}

                              {isManager && (
                                dateAssignees.length > 0 ? (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAssignModal(ticketIdsForDate);
                                    }}
                                    title="Nhấn để phân công lại"
                                  >
                                    <i className="bi bi-person-fill" />
                                    {dateAssignees.join(", ")}
                                  </span>
                                ) : (
                                  <button 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAssignModal(ticketIdsForDate);
                                    }}
                                  >
                                    <i className="bi bi-person-plus" />
                                    Phân công
                                  </button>
                                )
                              )}
                            </div>
                            <div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); if (canPick) handleCompleteClick(dateStr); }} 
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                                disabled={!canPick || !groupedItems[dateStr]?.some(item => isBatchItemEdited(item))}
                                title={!canPick ? "Chưa được cấp quyền Cấp phát vật tư & gom hàng" : undefined}
                              >
                                <i className="bi bi-send" /> Báo cáo
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                  {!collapsedDates.has(dateStr) && groupedItems[dateStr].map(item => {
                    const currentInputQty = getBatchItemCurrentQty(item);
                    const isPicked = currentInputQty > 0;
                    const isFullyPicked = currentInputQty >= item.tongSoLuong;
                    const isEdited = isBatchItemEdited(item);
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`border-b border-slate-100 transition-colors ${
                          isFullyPicked ? "bg-emerald-50/40 hover:bg-emerald-50/70" : isPicked ? "bg-amber-50/40 hover:bg-amber-50/70" : "bg-white hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Checkbox nhặt nhanh */}
                        <td 
                          className="text-center py-2.5 px-3 align-middle" 
                          onClick={() => handleTogglePick(item)}
                        >
                          <div 
                            className={`w-3.5 h-3.5 mx-auto rounded-[3px] border flex items-center justify-center cursor-pointer transition-all ${
                              isFullyPicked 
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                                : isPicked 
                                ? "bg-amber-500 border-amber-500 text-white shadow-xs" 
                                : "border-slate-300 hover:border-blue-400 bg-white text-transparent"
                            }`}
                            title={isFullyPicked ? "Bỏ chọn nhặt" : "Nhặt đủ toàn bộ"}
                          >
                            <i className="bi bi-check text-[10px] font-bold" />
                          </div>
                        </td>

                        {/* Mặt hàng */}
                        <td className="py-2.5 px-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center overflow-hidden shrink-0">
                              {(item.imageUrl || (item.images && item.images.length > 0)) ? (
                                <HoverImage 
                                  src={item.imageUrl || (item.images && item.images[0]) || ""} 
                                  alt={item.tenHang} 
                                  images={item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : [])}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                                />
                              ) : (
                                <i className="bi bi-box-seam text-slate-400 text-base" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={`font-semibold text-[13px] truncate ${isFullyPicked ? "text-emerald-800" : isPicked ? "text-amber-800" : "text-slate-900"}`}>
                                {item.tenHang}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {item.viTriKho ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    <i className="bi bi-geo-alt text-[10px]" />
                                    {item.viTriKho}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-100 border border-slate-200/60">
                                    <i className="bi bi-geo text-[10px]" />
                                    Chưa gán vị trí
                                  </span>
                                )}
                                {isFullyPicked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <i className="bi bi-check-circle-fill text-[10px]" /> Đủ hàng ({currentInputQty}/{item.tongSoLuong})
                                  </span>
                                ) : isPicked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    <i className="bi bi-exclamation-triangle-fill text-[10px]" /> Thiếu hàng ({currentInputQty}/{item.tongSoLuong})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                    <i className="bi bi-clock text-[10px]" /> Chờ nhặt
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Yêu cầu (và Thực tồn nếu là Thủ kho) */}
                        <td className="text-center py-2.5 px-3.5 align-middle">
                          <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-sm">
                            {item.tongSoLuong}
                          </span>
                          {isManager && (
                            <>
                              <span className="text-slate-300 mx-1.5">/</span>
                              <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-xs" title="Số lượng thực tồn kho">
                                {item.thucTon || 0}
                              </span>
                            </>
                          )}
                        </td>

                        {/* Đã nhặt */}
                        <td className="text-center py-2.5 px-3.5 align-middle">
                          <input 
                            type="number"
                            className={`w-20 h-8 text-center font-mono font-bold text-sm rounded-lg border outline-none transition-all ${
                              isFullyPicked 
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 focus:ring-1 focus:ring-emerald-500" 
                                : isPicked 
                                ? "border-amber-500 bg-amber-50 text-amber-800 focus:ring-1 focus:ring-amber-500" 
                                : "border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            } ${isEdited ? "ring-2 ring-amber-300" : ""}`}
                            value={currentInputQty > 0 || isEdited ? currentInputQty : 0}
                            onChange={e => handleQuantityChange(item, e.target.value)}
                            min={0}
                            max={item.thucTon !== undefined ? Math.min(item.tongSoLuong, item.thucTon || 0) : item.tongSoLuong}
                          />
                        </td>

                        {/* Chi tiết theo phiếu */}
                        <td className="py-2.5 px-3.5 align-middle">
                          <div className="flex flex-wrap gap-1.5">
                            {item.orders.map((o, idx) => {
                              const oQty = pickedQuantities[o.ticketItemId] !== undefined ? pickedQuantities[o.ticketItemId] : (o.daNhatTrongDon || 0);
                              const isODone = oQty >= o.soLuongTrongDon && o.soLuongTrongDon > 0;
                              const isOPicked = oQty > 0;
                              return (
                                <span 
                                  key={idx} 
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-mono border transition-all ${
                                    isODone 
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold" 
                                      : isOPicked 
                                      ? "bg-amber-50 text-amber-800 border-amber-200 font-semibold" 
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }`} 
                                  title={`${o.code}: đã gom ${oQty}/${o.soLuongTrongDon}`}
                                >
                                  <span className="font-semibold text-slate-900">{o.code}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                                    isODone 
                                      ? "bg-emerald-200/80 text-emerald-900" 
                                      : isOPicked 
                                      ? "bg-amber-200/80 text-amber-900" 
                                      : "bg-slate-200 text-slate-800"
                                  }`}>
                                    {oQty > 0 ? `${oQty}/${o.soLuongTrongDon}` : o.soLuongTrongDon}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      )}
    </FullWidthTable>
  );

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {headerContent}
      
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tableContent}
      </div>

      <Pagination
        currentPage={activePage}
        totalItems={totalCount}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        itemName={viewMode === "by-order" ? "đơn hàng" : "mặt hàng"}
      />
      
      {/* Modal Phân công */}
      {assignModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title">Phân công Phiếu điều phối</h6>
                <button type="button" className="btn-close" onClick={() => setAssignModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label fs-6">Chọn nhân viên kho:</label>
                <select className="form-select" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer py-2">
                <button type="button" className="btn btn-light btn-sm" onClick={() => setAssignModalOpen(false)}>Hủy</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAssignSubmit}>Phân công</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog xác nhận hoàn thành theo Ngày (chế độ gom theo hàng hoá) */}
      <ConfirmDialog 
        open={!!completingDate}
        title="Xác nhận báo cáo"
        message={completingDate ? `Bạn có chắc chắn đã hoàn tất gom ${groupedItems[completingDate]?.filter(item => pickedQuantities[item.id] !== undefined).length || 0} mặt hàng của Hạn hoàn thành: ${getRelativeDateText(completingDate)}?` : ""}
        confirmLabel="OK"
        cancelLabel="Huỷ"
        loading={isSubmitting}
        onConfirm={() => {
          if (completingDate) executeComplete(completingDate);
        }}
        onCancel={() => setCompletingDate(null)}
      />

      {/* Dialog xác nhận hoàn thành theo Đơn (chế độ tách theo đơn hàng) */}
      <ConfirmDialog 
        open={!!completingOrder}
        title="Xác nhận báo cáo đơn"
        message={completingOrder ? `Bạn có chắc chắn muốn cập nhật trạng thái gom hàng cho đơn ${completingOrder.code} (${completingOrder.items.filter(it => pickedQuantities[it.ticketItemId] !== undefined).length} mặt hàng đã cập nhật)?` : ""}
        confirmLabel="Xác nhận"
        cancelLabel="Huỷ"
        loading={isSubmitting}
        onConfirm={() => {
          if (completingOrder) executeOrderComplete(completingOrder);
        }}
        onCancel={() => setCompletingOrder(null)}
      />
    </div>
  );
}
