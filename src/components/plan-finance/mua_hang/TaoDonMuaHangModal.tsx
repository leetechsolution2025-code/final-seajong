"use client";
import React from "react";
import {
  CartPlus,
  CartCheck,
  Building,
  Check2All,
  CheckLg,
  CheckCircleFill,
  LockFill,
  StarFill,
  XLg,
  ExclamationCircle,
  InfoCircle,
  PlusLg,
  Trash3,
} from "react-bootstrap-icons";
import XemTruocDonMuaHangModal from "./XemTruocDonMuaHangModal";
import { Button } from "../../common/Button";
import { Badge } from "../../common/Badge";
import { Select } from "../../common/Select";
import { SuggestionInput, type SuggestionItem } from "../../common/SuggestionInput";
import { NumberInput } from "../../common/NumberInput";
import { DatePicker } from "../../common/DatePicker";
import { TableToolbar } from "../../common/TableToolbar";
import { FullWidthTable } from "../../common/FullWidthTable";

// ── Types ──────────────────────────────────────────────────────────────────────
interface InventorySearchResult {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  categoryId?: string | null;
  thongSoKyThuat?: string | null;
  imageUrl?: string | null;
  giaNhap?: number;
}

interface ReqItem {
  id: string;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  donGiaDK: number;
  inventoryItemId: string | null;
  trangThaiXuLy?: string;   // cho-xu-ly | da-tao-don | bo-qua
  ghiChu?: string | null;
  ngayGiao?: string | null;
  isAdded?: boolean;
  inventoryItem: {
    code: string | null;
    tenHang: string;
    donVi: string | null;
    categoryId: string | null;
    thongSoKyThuat: string | null;
    imageUrl: string | null;
    giaNhap?: number;
  } | null;
}

interface Supplier {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  categories: { category: { id: string; name: string } }[];
}

interface Assignment {
  itemId: string;
  supplierId: string | null;
  donGia: number;
  ngayGiao: string;   // ISO date string
  skip: boolean;
}

interface Props {
  reqId?: string;
  reqCode?: string | null;
  items: ReqItem[];
  onClose: () => void;
  onCreated: () => void;
  // Edit mode props
  editOrderId?: string;
  editSupplierId?: string | null;
  editNgayNhan?: string | null;
  editGhiChu?: string | null;
}

function fmtVnd(n: number) {
  if (!n) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── Component ──────────────────────────────────────────────────────────────────
export default function TaoDonMuaHangModal({
  reqId,
  reqCode,
  items,
  onClose,
  onCreated,
  editOrderId,
  editSupplierId,
  editNgayNhan,
  editGhiChu,
}: Props) {
  const [suppliers, setSuppliers]     = React.useState<Supplier[]>([]);
  const [suppLoading, setSuppLoading] = React.useState(true);
  const [modalItems, setModalItems]   = React.useState<ReqItem[]>(items);
  const [assignments, setAssignments] = React.useState<Assignment[]>(() =>
    items.map(i => ({
      itemId:     i.id,
      supplierId: editSupplierId ?? null,
      donGia:     (i.inventoryItem?.giaNhap && i.inventoryItem.giaNhap > 0) ? i.inventoryItem.giaNhap : (i.donGiaDK > 0 ? i.donGiaDK : 0),
      ngayGiao:   i.ngayGiao ? i.ngayGiao.slice(0, 10) : (editNgayNhan ? editNgayNhan.slice(0, 10) : today),
      // Items đã xử lý: đánh dấu skip ngay từ đầu
      skip: !editOrderId && (i.trangThaiXuLy === "da-tao-don" || i.trangThaiXuLy === "bo-qua"),
    }))
  );
  const [step, setStep]               = React.useState<"assign" | "confirm">("assign");
  const [submitting, setSubmitting]   = React.useState(false);
  const [result, setResult]           = React.useState<null | {
    createdOrders: { code: string | null; supplierName: string; soMatHang: number }[];
  }>(null);
  // NCC đang được chọn để tạo đơn (bắt buộc chọn cụ thể)
  const [activeSupId, setActiveSupId]           = React.useState<string | null>(editSupplierId ?? null);
  const [editGhiChuState, setEditGhiChuState] = React.useState<string | null>(editGhiChu ?? null);
  // NCC đã tạo đơn xong
  const [processedIds, setProcessedIds]         = React.useState<string[]>([]);
  // Tất cả đơn đã tạo (gộp lại qua nhiều lần submit)
  const [allCreatedOrders, setAllCreatedOrders]  = React.useState<{ code: string | null; supplierName: string; soMatHang: number }[]>([]);
  // Hiện preview modal
  const [showPreview, setShowPreview]           = React.useState(false);
  const [isEditPreview, setIsEditPreview]       = React.useState(false);
  const [searchQuery, setSearchQuery]           = React.useState("");
  const [supplierInputs, setSupplierInputs]     = React.useState<Record<string, string>>({});
  const [defaultInvItems, setDefaultInvItems]   = React.useState<InventorySearchResult[]>([]);
  const [rowInvItems, setRowInvItems]           = React.useState<Record<string, InventorySearchResult[]>>({});
  const invSearchTimers                         = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Preload default inventory items for quick adding
  React.useEffect(() => {
    fetch("/api/plan-finance/inventory/search?limit=30")
      .then(r => r.json())
      .then(d => setDefaultInvItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const searchInventoryForRow = (rowId: string, q: string) => {
    clearTimeout(invSearchTimers.current[rowId]);
    if (!q.trim()) {
      setRowInvItems(prev => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      return;
    }
    invSearchTimers.current[rowId] = setTimeout(() => {
      fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=20`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) {
            setRowInvItems(prev => ({ ...prev, [rowId]: d }));
          }
        })
        .catch(() => {});
    }, 180);
  };

  // Group items by tenHang for display (keep newly added items distinct by id)
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, {
      groupKey: string;
      tenHang: string;
      donVi: string | null;
      soLuong: number;
      donGiaDK: number;
      inventoryItemId: string | null;
      inventoryItem: any;
      originalItems: ReqItem[];
    }> = {};

    modalItems.forEach(item => {
      const key = item.isAdded ? `__added_${item.id}` : item.tenHang;
      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          tenHang: item.tenHang,
          donVi: item.donVi,
          soLuong: 0,
          donGiaDK: item.donGiaDK,
          inventoryItemId: item.inventoryItemId,
          inventoryItem: item.inventoryItem,
          originalItems: [],
        };
      }
      groups[key].soLuong += item.soLuong;
      groups[key].originalItems.push(item);
    });

    return Object.values(groups);
  }, [modalItems]);

  // Esc
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, submitting]);

  // Fetch NCC active
  React.useEffect(() => {
    setSuppLoading(true);
    fetch("/api/plan-finance/suppliers?trangThai=active&limit=200")
      .then(r => r.json())
      .then(d => setSuppliers(d.items ?? []))
      .catch(() => setSuppliers([]))
      .finally(() => setSuppLoading(false));
  }, []);

  const setAssign = (itemId: string, patch: Partial<Assignment>) =>
    setAssignments(prev => prev.map(a => a.itemId === itemId ? { ...a, ...patch } : a));

  const handleQuantityChange = (itemId: string, qty: number, groupOriginalItems?: ReqItem[]) => {
    if (groupOriginalItems && groupOriginalItems.length > 1) {
      const firstId = groupOriginalItems[0].id;
      const otherIds = new Set(groupOriginalItems.slice(1).map(i => i.id));
      setModalItems(prev =>
        prev.map(item => {
          if (item.id === firstId) return { ...item, soLuong: qty };
          if (otherIds.has(item.id)) return { ...item, soLuong: 0 };
          return item;
        })
      );
    } else {
      setModalItems(prev => prev.map(item => item.id === itemId ? { ...item, soLuong: qty } : item));
    }
  };

  const handleAddItem = () => {
    const newId = `added-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const defaultSupId = editOrderId
      ? activeSupId
      : activeSupId && !processedIds.includes(activeSupId)
      ? activeSupId
      : null;
    const defaultNgayGiao =
      assignments[0]?.ngayGiao || (editNgayNhan ? editNgayNhan.slice(0, 10) : today);

    const newItem: ReqItem = {
      id: newId,
      tenHang: "",
      donVi: "Cái",
      soLuong: 1,
      donGiaDK: 0,
      inventoryItemId: null,
      trangThaiXuLy: "cho-xu-ly",
      ngayGiao: defaultNgayGiao,
      isAdded: true,
      inventoryItem: null,
    };

    setModalItems(prev => [...prev, newItem]);
    setAssignments(prev => [
      ...prev,
      {
        itemId: newId,
        supplierId: defaultSupId,
        donGia: 0,
        ngayGiao: defaultNgayGiao,
        skip: false,
      },
    ]);
    if (defaultSupId) {
      const sup = suppliers.find(s => s.id === defaultSupId);
      if (sup) {
        setSupplierInputs(prev => ({ ...prev, [newId]: sup.name }));
      }
    }
    if (searchQuery) {
      setSearchQuery("");
    }
  };

  const handleRemoveAddedItem = (itemId: string) => {
    setModalItems(prev => prev.filter(i => i.id !== itemId));
    setAssignments(prev => prev.filter(a => a.itemId !== itemId));
    setSupplierInputs(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setRowInvItems(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  // Filter NCC theo danh mục
  const suppliersFor = (item: ReqItem): { matched: Supplier[]; others: Supplier[] } => {
    const catId = item.inventoryItem?.categoryId;
    if (!catId) return { matched: [], others: suppliers };
    const matched    = suppliers.filter(s => s.categories.some(c => c.category.id === catId));
    const matchedIds = new Set(matched.map(s => s.id));
    return { matched, others: suppliers.filter(s => !matchedIds.has(s.id)) };
  };

  // NCC đã được chọn (có ít nhất 1 item)
  const selectedSuppliers = React.useMemo(() => {
    const ids = [...new Set(assignments.filter(a => !a.skip && a.supplierId).map(a => a.supplierId!))];
    return ids.map(id => ({
      supplier: suppliers.find(s => s.id === id),
      id,
      items: assignments.filter(a => a.supplierId === id && !a.skip),
      tongTien: assignments
        .filter(a => a.supplierId === id && !a.skip)
        .reduce((s, a) => s + (modalItems.find(i => i.id === a.itemId)?.soLuong ?? 0) * a.donGia, 0),
    }));
  }, [assignments, suppliers, modalItems]);

  // Stats
  const skippedItems  = assignments.filter(a => a.skip).length;
  const pendingItems  = assignments.filter(a => !a.skip && !a.supplierId).length;
  const assignedItems = assignments.filter(a => !a.skip && a.supplierId).length;

  // NCC chưa xử lý (chưa tạo đơn) = selected - processed
  const pendingSuppliers = selectedSuppliers.filter(s => !processedIds.includes(s.id));

  // Chỉ enable nút khi đã chọn một NCC cụ thể (không phải Tất cả) và NCC đó chưa tạo đơn
  const canConfirm = !!activeSupId && !processedIds.includes(activeSupId);

  const validateActiveItems = (): boolean => {
    const activeAssigns = editOrderId
      ? assignments.filter(a => !a.skip)
      : assignments.filter(a => a.supplierId === activeSupId && !a.skip);
    const hasEmptyName = activeAssigns.some(a => {
      const it = modalItems.find(i => i.id === a.itemId);
      return !it || !it.tenHang.trim();
    });
    if (hasEmptyName) {
      alert("Vui lòng chọn hoặc nhập tên cho các dòng hàng hoá vừa thêm trước khi tạo đơn.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (submitting || !activeSupId) return;
    if (!validateActiveItems()) return;
    setSubmitting(true);
    try {
      if (editOrderId) {
        const payloadItems = assignments.map(a => {
          const item = modalItems.find(i => i.id === a.itemId)!;
          return {
            inventoryItemId: item.inventoryItemId,
            tenHang: item.tenHang,
            donVi: item.donVi,
            soLuong: item.soLuong,
            donGia: a.donGia,
            ghiChu: item.ghiChu ?? null,
            sortOrder: 0,
            ngayGiao: a.ngayGiao ?? null,
          };
        });

        const res = await fetch(`/api/plan-finance/purchasing/${editOrderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: activeSupId,
            ngayNhan: assignments[0]?.ngayGiao ?? null,
            ghiChu: editGhiChuState,
            items: payloadItems
          })
        });

        const data = await res.json();
        if (res.ok) {
          setIsEditPreview(true);
          setShowPreview(true);
        } else {
          alert(data.error ?? "Lỗi khi cập nhật đơn mua");
        }
      } else {
        // Chỉ gửi assignments của NCC đang active (kèm thông tin mặt hàng thêm mới / cập nhật SL)
        const filtered = assignments
          .filter(a => a.supplierId === activeSupId && !a.skip)
          .map(a => {
            const it = modalItems.find(i => i.id === a.itemId);
            return {
              ...a,
              tenHang: it?.tenHang,
              donVi: it?.donVi,
              soLuong: it?.soLuong,
              inventoryItemId: it?.inventoryItemId,
            };
          });
        const res  = await fetch(`/api/plan-finance/purchase-requests/${reqId}/create-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: filtered }),
        });
        const data = await res.json();
        if (res.ok) {
          const newOrders = data.createdOrders ?? [];
          setAllCreatedOrders(prev => [...prev, ...newOrders]);
          setProcessedIds(prev => [...prev, activeSupId]);
          onCreated();

          // Tự chuyển sang NCC tiếp theo chưa xử lý
          const remaining = pendingSuppliers.filter(s => s.id !== activeSupId);
          if (remaining.length > 0) {
            setActiveSupId(remaining[0].id);
          } else {
            // Tất cả NCC đã xong → màn hình kết quả
            setResult({ createdOrders: [...allCreatedOrders, ...newOrders] });
            setStep("confirm");
          }
        } else {
          alert(data.error ?? "Lỗi khi tạo đơn mua");
        }
      }
    } finally { setSubmitting(false); }
  };

  // Mở preview modal khi click nút
  const handleOpenPreview = () => {
    if (!activeSupId || processedIds.includes(activeSupId)) return;
    if (!validateActiveItems()) return;
    setShowPreview(true);
  };

  // Callback khi XemTruocDonMuaHangModal xác nhận tạo đơn
  const handlePreviewCreated = (newOrders: { code: string | null; supplierName: string; soMatHang: number }[]) => {
    setShowPreview(false);
    setAllCreatedOrders(prev => [...prev, ...newOrders]);
    const doneId = activeSupId!;
    setProcessedIds(prev => [...prev, doneId]);
    onCreated();

    // Chuyển sang NCC tiếp theo
    const remaining = pendingSuppliers.filter(s => s.id !== doneId);
    if (remaining.length > 0) {
      setActiveSupId(remaining[0].id);
    } else {
      setResult({ createdOrders: [...allCreatedOrders, ...newOrders] });
      setStep("confirm");
    }
  };

  // Nút kết thúc sớm
  const handleFinish = () => {
    setResult({ createdOrders: allCreatedOrders });
    setStep("confirm");
  };

  const filteredGroupedItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedItems;
    return groupedItems.filter(
      (g) =>
        g.tenHang.toLowerCase().includes(q) ||
        String(g.inventoryItem?.code || "").toLowerCase().includes(q)
    );
  }, [groupedItems, searchQuery]);

  // ── Render ────────────────────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1060, background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden", padding: "8px", gap: "8px" }}>

      {/* ── Header gọn chuẩn Enterprise ───────────────────────────────────────── */}
      <div style={{ padding: "12px 18px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexShrink: 0, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#1d4ed8" }}>
            <CartPlus size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                {editOrderId ? "Cập nhật đơn mua hàng" : "Tạo đơn mua hàng"}
              </h2>
              <Badge variant="info">
                {editOrderId ? `Đơn hàng: ${reqCode ?? editOrderId}` : `Phiếu YC: ${reqCode ?? reqId}`}
              </Badge>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              {editOrderId
                ? "Điều chỉnh số lượng, đơn giá, ngày giao dự kiến và nhà cung cấp cho đơn mua hàng"
                : "Phân bổ nhà cung cấp, đơn giá nhập và ngày giao dự kiến theo từng mặt hàng"}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={submitting}
          aria-label="Đóng"
          title="Đóng"
        >
          <XLg size={16} />
        </Button>
      </div>


      {step === "assign" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15,23,42,0.05)", overflow: "hidden" }}>
          {/* ── TableToolbar chuẩn hệ thống ───────────────────────────────────── */}
          <TableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Tìm theo tên hàng hoá, mã vật tư..."
            showMenu={false}
            actionsBeforeSearch={
              !editOrderId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingRight: 4 }}>
                  <Badge variant="neutral">Tổng: {modalItems.length}</Badge>
                  <Badge variant="success">Đã chọn NCC: {assignedItems}</Badge>
                  {skippedItems > 0 && <Badge variant="warning">Bỏ qua: {skippedItems}</Badge>}
                  {pendingItems > 0 && (
                    <Badge variant="danger">
                      <ExclamationCircle size={11} style={{ marginRight: 4 }} />
                      Chưa chọn NCC: {pendingItems}
                    </Badge>
                  )}
                </div>
              ) : undefined
            }
            rightActions={
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusLg size={13} />}
                  disabled={submitting}
                  onClick={handleAddItem}
                >
                  Thêm hàng hoá
                </Button>

                <div style={{ minWidth: 220, maxWidth: 300 }}>
                  {editOrderId ? (
                    <Select
                      value={activeSupId ?? ""}
                      onChange={e => {
                        const newSupId = e.target.value || null;
                        setActiveSupId(newSupId);
                        setAssignments(prev => prev.map(a => ({ ...a, supplierId: newSupId })));
                      }}
                    >
                      <option value="">Chọn nhà cung cấp</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      value={activeSupId ?? ""}
                      onChange={e => setActiveSupId(e.target.value || null)}
                    >
                      <option value="">Chọn NCC để tạo đơn</option>
                      {selectedSuppliers.map(({ supplier, id, items: sItems }) => {
                        const isDone = processedIds.includes(id);
                        return (
                          <option key={id} value={id} disabled={isDone}>
                            {isDone ? "✓" : "▶"} {supplier?.name ?? id} · {sItems.length} MH{isDone ? " (đã tạo)" : ""}
                          </option>
                        );
                      })}
                    </Select>
                  )}
                </div>

                {!editOrderId && selectedSuppliers.length > 0 && (
                  <Badge variant={processedIds.length === selectedSuppliers.length ? "success" : "brand"}>
                    {processedIds.length}/{selectedSuppliers.length} NCC
                  </Badge>
                )}

                {!editOrderId && processedIds.length > 0 && pendingSuppliers.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Check2All size={14} />}
                    onClick={handleFinish}
                  >
                    Kết thúc ({processedIds.length}/{selectedSuppliers.length})
                  </Button>
                )}

                {editOrderId ? (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckLg size={14} />}
                    isLoading={submitting}
                    disabled={!activeSupId || submitting}
                    onClick={handleSubmit}
                  >
                    Lưu thay đổi
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CartCheck size={14} />}
                    isLoading={submitting}
                    disabled={!canConfirm || submitting}
                    title={!activeSupId ? "Hãy chọn một nhà cung cấp trước" : ""}
                    onClick={handleOpenPreview}
                  >
                    Tạo đơn mua hàng
                  </Button>
                )}
              </div>
            }
          />

          {/* ── 2-column layout: FullWidthTable + supplier sidebar ───────────── */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
            <FullWidthTable loading={suppLoading} loadingText="Đang tải danh sách nhà cung cấp...">
              <table className="w-full text-left border-collapse" style={{ fontSize: "0.8125rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: "center" }}>#</th>
                    <th>Mặt hàng</th>
                    <th style={{ width: 76, textAlign: "center" }}>Đơn vị</th>
                    <th style={{ width: editOrderId ? 96 : 68, textAlign: "center" }}>SL</th>
                    <th style={{ width: 145, textAlign: "right" }}>Đơn giá (₫)</th>
                    <th style={{ width: 155 }}>Ngày giao</th>
                    <th style={{ width: 135, textAlign: "right" }}>Thành tiền (₫)</th>
                    {!editOrderId && <th style={{ width: 270 }}>Nhà cung cấp</th>}
                    {!editOrderId && <th style={{ width: 72, textAlign: "center" }}>Bỏ qua</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupedItems.length === 0 ? (
                    <tr>
                      <td colSpan={editOrderId ? 7 : 9} style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                        Không tìm thấy mặt hàng phù hợp với từ khoá "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredGroupedItems.map((gItem, idx) => {
                      const representative = gItem.originalItems[0];
                      const a = assignments.find(assign => assign.itemId === representative.id)!;
                      const { matched, others } = suppliersFor(representative);
                      const hasFilter = !!gItem.inventoryItem?.categoryId;

                      const thanhTien = gItem.originalItems.reduce((sum, oi) => {
                        const oiAssign = assignments.find(assign => assign.itemId === oi.id);
                        return sum + oi.soLuong * (oiAssign?.donGia ?? (oi.donGiaDK > 0 ? oi.donGiaDK : (oi.inventoryItem?.giaNhap ?? 0)));
                      }, 0);

                      const isHighlighted = activeSupId && a.supplierId === activeSupId;
                      const isLocked = !editOrderId && gItem.originalItems.every(oi => oi.trangThaiXuLy === "da-tao-don");

                      const handlePriceChange = (val: number) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, donGia: val };
                          }
                          return assign;
                        }));
                      };

                      const handleDateChange = (val: string) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, ngayGiao: val };
                          }
                          return assign;
                        }));
                      };

                      const handleSupplierChange = (val: string | null) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, supplierId: val };
                          }
                          return assign;
                        }));
                        setActiveSupId(val);
                      };

                      const handleSkipChange = (val: boolean) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, skip: val, supplierId: val ? null : assign.supplierId };
                          }
                          return assign;
                        }));
                      };

                      return (
                        <tr
                          key={gItem.groupKey}
                          style={{
                            opacity: (a.skip && !isLocked) ? 0.45 : 1,
                            backgroundColor: isLocked
                              ? "rgba(16, 185, 129, 0.05)"
                              : isHighlighted
                              ? "#eff6ff"
                              : a.supplierId
                              ? "rgba(16, 185, 129, 0.03)"
                              : undefined,
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                          <td>
                            {representative.isAdded ? (
                              (() => {
                                const rawInv = rowInvItems[representative.id] ?? defaultInvItems;
                                const invSuggestions: SuggestionItem[] = rawInv.map(inv => ({
                                  id: inv.id,
                                  value: inv.tenHang,
                                  label: inv.tenHang,
                                  subText: [
                                    inv.code ? `Mã: ${inv.code}` : null,
                                    inv.donVi ? `ĐVT: ${inv.donVi}` : null,
                                    inv.giaNhap ? `Giá nhập: ${fmtVnd(inv.giaNhap)}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · "),
                                }));
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <SuggestionInput
                                      value={gItem.tenHang}
                                      placeholder="Tìm hoặc nhập tên hàng hoá, vật tư..."
                                      emptyMessage="Không tìm thấy hàng hoá trong kho (có thể nhập tên tự do)"
                                      suggestions={invSuggestions}
                                      inputStyle={{ height: 32, fontSize: "0.8125rem", fontWeight: 600 }}
                                      onChange={(text) => {
                                        setModalItems(prev =>
                                          prev.map(it =>
                                            it.id === representative.id
                                              ? {
                                                  ...it,
                                                  tenHang: text,
                                                  inventoryItemId: null,
                                                  inventoryItem: null,
                                                }
                                              : it
                                          )
                                        );
                                        searchInventoryForRow(representative.id, text);
                                      }}
                                      onSelectSuggestion={(sugg) => {
                                        const picked = rawInv.find(inv => inv.id === sugg.id);
                                        if (picked) {
                                          setModalItems(prev =>
                                            prev.map(it =>
                                              it.id === representative.id
                                                ? {
                                                    ...it,
                                                    tenHang: picked.tenHang,
                                                    donVi: picked.donVi || it.donVi || "Cái",
                                                    donGiaDK: picked.giaNhap || 0,
                                                    inventoryItemId: picked.id,
                                                    inventoryItem: {
                                                      code: picked.code,
                                                      tenHang: picked.tenHang,
                                                      donVi: picked.donVi,
                                                      categoryId: picked.categoryId || null,
                                                      thongSoKyThuat: picked.thongSoKyThuat || null,
                                                      imageUrl: picked.imageUrl || null,
                                                      giaNhap: picked.giaNhap || 0,
                                                    },
                                                  }
                                                : it
                                            )
                                          );
                                          if (picked.giaNhap && picked.giaNhap > 0) {
                                            handlePriceChange(picked.giaNhap);
                                          }
                                        }
                                      }}
                                    />
                                    {gItem.inventoryItem?.code && (
                                      <div style={{ fontSize: "0.7188rem", color: "#64748b", fontFamily: "monospace", paddingLeft: 2 }}>
                                        {gItem.inventoryItem.code}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{gItem.tenHang}</div>
                                  {gItem.inventoryItem?.code && (
                                    <div style={{ fontSize: "0.7188rem", color: "#64748b", fontFamily: "monospace", marginTop: 1 }}>
                                      {gItem.inventoryItem.code}
                                    </div>
                                  )}
                                </div>
                                {isLocked && (
                                  <Badge variant="success">✓ Đã đặt hàng</Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "center", color: "#475569" }}>
                            {representative.isAdded ? (
                              <input
                                type="text"
                                value={gItem.donVi ?? ""}
                                placeholder="ĐVT"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setModalItems(prev =>
                                    prev.map(it => (it.id === representative.id ? { ...it, donVi: val } : it))
                                  );
                                }}
                                style={{
                                  width: "100%",
                                  height: 32,
                                  textAlign: "center",
                                  border: "1px solid var(--border-default, #cbd5e1)",
                                  borderRadius: "var(--radius-md, 6px)",
                                  fontSize: "0.8125rem",
                                  color: "#0f172a",
                                  background: "#ffffff",
                                  outline: "none",
                                  padding: "0 6px",
                                }}
                              />
                            ) : (
                              gItem.donVi ?? "—"
                            )}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#0f172a", width: 96 }}>
                            {!isLocked && !a.skip ? (
                              <NumberInput
                                value={gItem.soLuong}
                                min={1}
                                hideZero={false}
                                onValueChange={(num) => handleQuantityChange(representative.id, Math.max(1, num), gItem.originalItems)}
                                style={{ textAlign: "center", height: 32, padding: "4px 8px" }}
                              />
                            ) : (
                              gItem.soLuong
                            )}
                          </td>
                          <td>
                            <NumberInput
                              value={a.donGia}
                              min={0}
                              hideZero={false}
                              disabled={a.skip}
                              onValueChange={(num) => handlePriceChange(num)}
                              style={{ textAlign: "right", height: 32, padding: "4px 8px" }}
                            />
                          </td>
                          <td>
                            <DatePicker
                              value={a.ngayGiao}
                              disabled={a.skip}
                              onChange={(val) => handleDateChange(val)}
                              style={{ height: 32 }}
                            />
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: thanhTien > 0 ? "#0369a1" : "#94a3b8" }}>
                            {a.skip ? "—" : fmtVnd(thanhTien)}
                          </td>
                          {!editOrderId && (
                            <td>
                              {(() => {
                                const selectedSup = a.supplierId ? suppliers.find(s => s.id === a.supplierId) : null;
                                const inputVal = supplierInputs[representative.id] ?? (selectedSup?.name || "");
                                const hasMatchedGroup = hasFilter && matched.length > 0;
                                const buildSupItem = (s: Supplier, isMatched: boolean): SuggestionItem => ({
                                  id: s.id,
                                  value: s.name,
                                  label: s.name,
                                  subText: s.address || undefined,
                                  category: hasMatchedGroup
                                    ? (isMatched ? `Phù hợp danh mục (${matched.length})` : "Các nhà cung cấp khác")
                                    : undefined,
                                  rightIcon: isMatched ? (
                                    <StarFill size={12} style={{ color: "#f59e0b" }} title="NCC phù hợp danh mục hàng hoá" />
                                  ) : undefined,
                                });
                                const supplierSuggestions: SuggestionItem[] = [
                                  ...matched.map(s => buildSupItem(s, true)),
                                  ...others.map(s => buildSupItem(s, false)),
                                ];
                                return (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <SuggestionInput
                                        value={inputVal}
                                        disabled={a.skip}
                                        placeholder="Chọn nhà cung cấp"
                                        emptyMessage="Không tìm thấy nhà cung cấp"
                                        suggestions={supplierSuggestions}
                                        inputStyle={{ height: 32, fontSize: "0.8125rem" }}
                                        onChange={(text) => {
                                          setSupplierInputs(prev => ({ ...prev, [representative.id]: text }));
                                          if (!text.trim()) {
                                            handleSupplierChange(null);
                                          } else {
                                            const exact = suppliers.find(s => s.name === text);
                                            if (exact) {
                                              handleSupplierChange(exact.id);
                                            } else if (a.supplierId) {
                                              handleSupplierChange(null);
                                            }
                                          }
                                        }}
                                        onSelectSuggestion={(item) => {
                                          if (item.id) {
                                            handleSupplierChange(item.id);
                                            setSupplierInputs(prev => ({ ...prev, [representative.id]: item.value }));
                                          }
                                        }}
                                      />
                                    </div>
                                    {hasMatchedGroup && !a.supplierId && !a.skip && (
                                      <span title="Số NCC phù hợp danh mục">
                                        <Badge variant="success">{matched.length}</Badge>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                          {!editOrderId && (
                            <td style={{ textAlign: "center" }}>
                              {representative.isAdded ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAddedItem(representative.id)}
                                  title="Xoá mặt hàng vừa thêm"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: "1px solid transparent",
                                    background: "transparent",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Trash3 size={14} />
                                </button>
                              ) : isLocked ? (
                                <LockFill size={14} style={{ color: "#10b981", margin: "0 auto" }} title="Đã được đặt hàng" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={a.skip}
                                  onChange={e => handleSkipChange(e.target.checked)}
                                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f59e0b" }}
                                />
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {(editOrderId || assignedItems > 0) && (
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                      <td colSpan={6} style={{ padding: "10px 12px", fontWeight: 700, fontSize: "0.8125rem", textAlign: "right", color: "#475569" }}>
                        Tổng cộng giá trị đơn
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.9375rem", textAlign: "right", color: "#1d4ed8", whiteSpace: "nowrap" }}>
                        {fmtVnd(
                          assignments
                            .filter(a => !a.skip && (editOrderId || a.supplierId))
                            .reduce((s, a) => s + (modalItems.find(i => i.id === a.itemId)?.soLuong ?? 0) * a.donGia, 0)
                        )}
                      </td>
                      {!editOrderId && <td colSpan={2} />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </FullWidthTable>

            {/* Sidebar for Edit Mode */}
            {editOrderId && (
              <div style={{ width: 280, borderLeft: "1px solid #e2e8f0", background: "#f8fafc", padding: 18, display: "flex", flexDirection: "column", gap: 14, flexShrink: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>Thông tin đơn hàng</p>
                <div>
                  <DatePicker
                    label="Ngày nhận hàng (Áp dụng tất cả)"
                    value={assignments[0]?.ngayGiao ?? ""}
                    onChange={(val) => {
                      setAssignments(prev => prev.map(a => ({ ...a, ngayGiao: val })));
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.7188rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Ghi chú nội bộ</label>
                  <textarea
                    value={editGhiChuState ?? ""}
                    onChange={e => setEditGhiChuState(e.target.value)}
                    placeholder="Nhập ghi chú cho đơn hàng..."
                    style={{ width: "100%", height: 120, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.8125rem", resize: "none", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Kết quả ──────────────────────────────────────────────────────────── */
        <div style={{ flex: 1, overflowY: "auto", background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#15803d" }}>
            <CheckCircleFill size={32} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.125rem", color: "#0f172a" }}>Tạo đơn mua thành công!</h3>
            <p style={{ margin: "6px 0 0", fontSize: "0.875rem", color: "#64748b" }}>
              Đã tạo {result?.createdOrders.length ?? 0} đơn mua từ phiếu yêu cầu {reqCode}
            </p>
          </div>

          <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 10 }}>
            {result?.createdOrders.map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building size={16} style={{ color: "#1d4ed8" }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>{o.supplierName}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>{o.soMatHang} mặt hàng</p>
                  </div>
                </div>
                <Badge variant="info">{o.code}</Badge>
              </div>
            ))}
          </div>

          {(pendingItems > 0 || skippedItems > 0) && (
            <div style={{ width: "100%", maxWidth: 560, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: "0.8125rem", color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
              <InfoCircle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>
                {pendingItems > 0 && `${pendingItems} mặt hàng chưa được xử lý. `}
                {skippedItems > 0 && `${skippedItems} mặt hàng đã bỏ qua.`}
              </span>
            </div>
          )}

          <Button variant="primary" size="md" onClick={onClose}>
            Đóng
          </Button>
        </div>
      )}

      {/* Preview đơn mua hàng cho NCC đang chọn */}
      {showPreview && activeSupId && (
        <XemTruocDonMuaHangModal
          reqId={reqId ?? ""}
          reqCode={reqCode ?? null}
          supplierId={activeSupId}
          supplierName={selectedSuppliers.find(s => s.id === activeSupId)?.supplier?.name ?? activeSupId}
          assignments={assignments.filter(a => a.supplierId === activeSupId && !a.skip)}
          items={modalItems}
          onClose={() => {
            if (isEditPreview) {
              onCreated();
            } else {
              setShowPreview(false);
            }
          }}
          onCreated={(orders) => {
            if (isEditPreview) {
              onCreated();
            } else {
              handlePreviewCreated(orders);
            }
          }}
          isEdit={isEditPreview}
          editOrderId={editOrderId}
          editOrderCode={reqCode}
        />
      )}
    </div>
  );
}
