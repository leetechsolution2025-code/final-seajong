import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  CartPlus,
  Send,
  XLg,
  PlusLg,
  Trash3,
  CheckCircleFill,
  ExclamationTriangleFill,
  BoxSeam,
} from "react-bootstrap-icons";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { SuggestionInput, type SuggestionItem } from "@/components/common/SuggestionInput";
import { DatePicker } from "@/components/common/DatePicker";
import { NumberInput } from "@/components/common/NumberInput";
import { FullWidthTable } from "@/components/common/FullWidthTable";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ItemSuggestion {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  giaNhap: number;
}
interface OrderLine {
  id: string;
  item: ItemSuggestion | null;
  itemSearch: string;
  soLuong: number;
  donGiaDK: number;
  ghiChu: string;
  isSupplementary?: boolean;
  isReplacement?: boolean;
  supplementaryItemId?: string;
}
interface Supplier {
  id: string;
  name: string;
  code: string | null;
  phone?: string | null;
  address?: string | null;
}

interface PendingSupplementaryItem {
  id: string;
  supplierId: string;
  supplierName: string;
  inspectionCode: string;
  sourcePoCode: string | null;
  inventoryItemId: string | null;
  productCode: string | null;
  productName: string;
  unit: string | null;
  quantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
  receivedAt?: string | null;
}

export interface DirectPoPrefillItem {
  inventoryItemId?: string | null;
  code?: string | null;
  tenHang: string;
  donVi?: string | null;
  soLuong: number;
  donGiaDK?: number;
  ghiChu?: string;
  isReplacement?: boolean;
  isSupplementary?: boolean;
  supplementaryItemId?: string;
}

interface TaoDonMuaHangTrucTiepModalProps {
  onClose: () => void;
  onSaved?: (createdOrder?: { id: string; code: string | null }) => void;
  initialSupplierId?: string | null;
  initialGhiChu?: string;
  initialNgayNhan?: string;
  initialItems?: DirectPoPrefillItem[];
  isReplacementPo?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): OrderLine => ({
  id: uid(),
  item: null,
  itemSearch: "",
  soLuong: 1,
  donGiaDK: 0,
  ghiChu: "",
});

// ── Component ─────────────────────────────────────────────────────────────────
export function TaoDonMuaHangTrucTiepModal({
  onClose,
  onSaved,
  initialSupplierId,
  initialGhiChu,
  initialNgayNhan,
  initialItems,
  isReplacementPo = false,
}: TaoDonMuaHangTrucTiepModalProps) {
  const [soDonHang, setSoDonHang] = useState("");
  const [ngayDat, setNgayDat] = useState(() => new Date().toISOString().slice(0, 10));
  const [ngayNhan, setNgayNhan] = useState(() => initialNgayNhan || "");
  const [ghiChu, setGhiChu] = useState(() => initialGhiChu || "");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState(() => initialSupplierId || "");
  const [supplierInput, setSupplierInput] = useState("");

  const [defaultInvItems, setDefaultInvItems] = useState<ItemSuggestion[]>([]);
  const [rowInvItems, setRowInvItems] = useState<Record<string, ItemSuggestion[]>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [lines, setLines] = useState<OrderLine[]>(() => {
    if (Array.isArray(initialItems) && initialItems.length > 0) {
      return initialItems.map((it) => ({
        id: uid(),
        item: it.inventoryItemId
          ? {
              id: it.inventoryItemId,
              code: it.code ?? null,
              tenHang: it.tenHang,
              donVi: it.donVi ?? null,
              giaNhap: isReplacementPo ? 0 : (it.donGiaDK ?? 0),
            }
          : null,
        itemSearch: it.tenHang,
        soLuong: Number(it.soLuong) || 1,
        donGiaDK: isReplacementPo ? 0 : (Number(it.donGiaDK) || 0),
        ghiChu: it.ghiChu || "",
        isReplacement: Boolean(isReplacementPo || it.isReplacement),
        isSupplementary: Boolean(it.isSupplementary),
        supplementaryItemId: it.supplementaryItemId,
      }));
    }
    return [emptyLine()];
  });

  // Toàn bộ hàng NCC cần gửi bù (Phương án 2) đang PENDING/PARTIAL
  const [allPendingSuppItems, setAllPendingSuppItems] = useState<PendingSupplementaryItem[]>([]);
  const [suppQtyMap, setSuppQtyMap] = useState<Record<string, number>>({});
  const [selectedSuppIds, setSelectedSuppIds] = useState<Record<string, boolean>>({});
  const [activeLeftTab, setActiveLeftTab] = useState<"note" | "supplementary">("note");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Tải mã đơn, danh sách NCC, vật tư mặc định và danh sách hàng gửi bù
  useEffect(() => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    fetch("/api/plan-finance/purchasing/next-code")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSoDonHang(data?.nextCode || `DH-${dateStr}-0001`))
      .catch(() => setSoDonHang(`DH-${dateStr}-0001`));

    fetch("/api/plan-finance/suppliers?trangThai=active&limit=200")
      .then((r) => r.json())
      .then((data) => {
        const list: Supplier[] = data?.items || [];
        setSuppliers(list);
        if (initialSupplierId) {
          const found = list.find((s) => s.id === initialSupplierId);
          if (found) setSupplierInput(found.name);
        }
      })
      .catch(() => {});

    fetch("/api/plan-finance/inventory/search?limit=30")
      .then((r) => r.json())
      .then((data) => setDefaultInvItems(Array.isArray(data) ? data : []))
      .catch(() => {});

    if (!isReplacementPo) {
      fetch("/api/purchase/supplementary-items?status=PENDING,PARTIAL")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const list: PendingSupplementaryItem[] = data?.items || [];
          setAllPendingSuppItems(list);
        })
        .catch(() => setAllPendingSuppItems([]));
    }
  }, [initialSupplierId, isReplacementPo]);

  // Đóng bằng Esc
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId) || null,
    [suppliers, supplierId]
  );

  // Lọc hàng cần gửi bù thuộc NCC đang chọn (khớp theo supplierId hoặc supplierName)
  const pendingSuppItems = useMemo(() => {
    if (!supplierId || isReplacementPo) return [];
    const supNameLower = (selectedSupplier?.name || "").trim().toLowerCase();
    return allPendingSuppItems.filter(
      (it) =>
        it.supplierId === supplierId ||
        (supNameLower && (it.supplierName || "").trim().toLowerCase() === supNameLower)
    );
  }, [allPendingSuppItems, supplierId, selectedSupplier, isReplacementPo]);

  // Khởi tạo checkbox & số lượng mặc định khi danh sách hàng bù của NCC thay đổi
  useEffect(() => {
    const qtyInit: Record<string, number> = {};
    const selInit: Record<string, boolean> = {};
    pendingSuppItems.forEach((it) => {
      qtyInit[it.id] = it.remainingQuantity;
      selInit[it.id] = true;
    });
    setSuppQtyMap(qtyInit);
    setSelectedSuppIds(selInit);
    if (!isReplacementPo && pendingSuppItems.length > 0) {
      setActiveLeftTab("supplementary");
    } else if (pendingSuppItems.length === 0) {
      setActiveLeftTab("note");
    }
  }, [pendingSuppItems, isReplacementPo]);

  // Đếm số lượng hàng bù theo NCC để hiện badge ngay trên SuggestionInput nhà cung cấp
  const suppCountBySupplier = useMemo(() => {
    const counts = new Map<string, number>();
    allPendingSuppItems.forEach((it) => {
      counts.set(it.supplierId, (counts.get(it.supplierId) || 0) + 1);
      const nameKey = `name:${(it.supplierName || "").trim().toLowerCase()}`;
      counts.set(nameKey, (counts.get(nameKey) || 0) + 1);
    });
    return counts;
  }, [allPendingSuppItems]);

  const supplierSuggestions = useMemo<SuggestionItem[]>(() => {
    return suppliers.map((s) => {
      const cnt =
        suppCountBySupplier.get(s.id) ||
        suppCountBySupplier.get(`name:${s.name.trim().toLowerCase()}`) ||
        0;
      return {
        id: s.id,
        value: s.name,
        label: s.name,
        subText: [s.code, s.phone].filter(Boolean).join(" • ") || undefined,
        badge: cnt > 0 ? `Cần bù ${cnt}` : undefined,
      };
    });
  }, [suppliers, suppCountBySupplier]);

  const onItemSearch = (lineId: string, q: string) => {
    setLines((ls) =>
      ls.map((l) => (l.id === lineId ? { ...l, itemSearch: q, item: l.item?.tenHang === q ? l.item : null } : l))
    );
    clearTimeout(timers.current[lineId]);
    if (!q.trim()) {
      setRowInvItems((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      return;
    }
    timers.current[lineId] = setTimeout(async () => {
      try {
        const data: ItemSuggestion[] = await fetch(
          `/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=15`
        ).then((r) => r.json());
        setRowInvItems((prev) => ({ ...prev, [lineId]: Array.isArray(data) ? data : [] }));
      } catch {}
    }, 200);
  };

  const selectItem = (lineId: string, item: ItemSuggestion) =>
    setLines((ls) =>
      ls.map((l) =>
        l.id === lineId
          ? {
              ...l,
              item,
              itemSearch: item.tenHang,
              donGiaDK: isReplacementPo || l.isSupplementary || l.isReplacement ? 0 : (item.giaNhap || 0),
            }
          : l
      )
    );

  const updateLine = <K extends keyof OrderLine>(lineId: string, key: K, val: OrderLine[K]) =>
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, [key]: val } : l)));

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (id: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));

  const handleAttachSupplementaryItems = () => {
    const existingIds = new Set(lines.map((l) => l.supplementaryItemId).filter(Boolean));
    const toAdd = pendingSuppItems.filter(
      (it) => selectedSuppIds[it.id] && !existingIds.has(it.id) && (suppQtyMap[it.id] ?? it.remainingQuantity) > 0
    );
    if (toAdd.length === 0) return;
    const newLines: OrderLine[] = toAdd.map((it) => ({
      id: uid(),
      item: it.inventoryItemId
        ? {
            id: it.inventoryItemId,
            code: it.productCode,
            tenHang: it.productName,
            donVi: it.unit,
            giaNhap: 0,
          }
        : null,
      itemSearch: it.productName,
      soLuong: Math.min(it.remainingQuantity, Math.max(1, Number(suppQtyMap[it.id] ?? it.remainingQuantity))),
      donGiaDK: 0,
      ghiChu: `Hàng gửi bù lỗi (${it.inspectionCode}${it.sourcePoCode ? ` - PO gốc: ${it.sourcePoCode}` : ""})`,
      isSupplementary: true,
      supplementaryItemId: it.id,
    }));
    setLines((prev) => {
      const hasOnlyEmpty = prev.length === 1 && !prev[0].item && !prev[0].itemSearch.trim();
      return hasOnlyEmpty ? newLines : [...prev, ...newLines];
    });
  };

  const validLines = lines.filter((l) => (l.item || l.itemSearch.trim()) && l.soLuong > 0);
  const tongTien = validLines.reduce(
    (s, l) => s + (isReplacementPo || l.isSupplementary || l.isReplacement ? 0 : l.soLuong * l.donGiaDK),
    0
  );

  const handleSave = async () => {
    setError("");
    if (!supplierId) {
      setError("Vui lòng chọn nhà cung cấp");
      return;
    }
    if (!validLines.length) {
      setError("Cần ít nhất 1 mặt hàng hợp lệ");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/plan-finance/purchasing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: soDonHang,
          supplierId,
          ngayDat,
          ngayNhan: ngayNhan || null,
          trangThai: isReplacementPo ? "ordered" : "draft",
          tongTien: isReplacementPo ? 0 : tongTien,
          daThanhToan: 0,
          ghiChu,
          isReplacementPo,
          items: validLines.map((l) => ({
            inventoryItemId: l.item?.id ?? null,
            tenHang: l.item?.tenHang ?? l.itemSearch,
            donVi: l.item?.donVi ?? null,
            soLuong: l.soLuong,
            donGia: isReplacementPo || l.isSupplementary || l.isReplacement ? 0 : l.donGiaDK,
            thanhTien: isReplacementPo || l.isSupplementary || l.isReplacement ? 0 : l.soLuong * l.donGiaDK,
            ghiChu: l.ghiChu || null,
            isSupplementary: Boolean(l.isSupplementary),
            isReplacement: Boolean(isReplacementPo || l.isReplacement),
            supplementaryItemId: l.supplementaryItemId || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Lỗi khi tạo đơn hàng, thử lại sau");
        return;
      }

      const createdOrder = await res.json().catch(() => null);
      setSuccess(true);
      onSaved?.(createdOrder ? { id: createdOrder.id, code: createdOrder.code } : undefined);
    } catch {
      setError("Không kết nối được server, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5100,
        display: "flex",
        flexDirection: "column",
        background: "#f1f5f9",
        padding: "8px",
        gap: "8px",
        overflow: "hidden",
      }}
    >
      {/* ══ HEADER CARD CHUẨN ENTERPRISE ══ */}
      <div
        style={{
          padding: "12px 18px",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: isReplacementPo ? "#fffbeb" : "#eff6ff",
              border: `1px solid ${isReplacementPo ? "#fde68a" : "#bfdbfe"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: isReplacementPo ? "#d97706" : "#1d4ed8",
            }}
          >
            <CartPlus size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                {isReplacementPo ? "Tạo đơn bù hàng lỗi (0 ₫)" : "Tạo đơn mua hàng trực tiếp"}
              </h2>
              <Badge variant={isReplacementPo ? "warning" : "info"}>{soDonHang || "Đang tạo mã..."}</Badge>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              {isReplacementPo
                ? "Đơn bù hàng lỗi không cần phê duyệt, tự động chuyển trạng thái đã đặt hàng"
                : "Chọn nhà cung cấp, mặt hàng cần nhập và ghép hàng gửi bù (nếu có)"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {success ? (
            <Badge variant="success">
              <CheckCircleFill size={12} style={{ marginRight: 5 }} />
              Đã tạo thành công!
            </Badge>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send size={13} />}
              isLoading={saving}
              disabled={saving}
              onClick={handleSave}
            >
              {isReplacementPo ? "Tạo đơn bù hàng lỗi" : "Tạo đơn & Trình duyệt"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} disabled={saving} aria-label="Đóng" title="Đóng">
            <XLg size={16} />
          </Button>
        </div>
      </div>

      {/* ══ BODY (Left Info Card + Right Items Table Card) ══ */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: "8px", overflow: "hidden" }}>
        {/* ── LEFT PANEL: Thông tin đơn hàng ── */}
        <div
          style={{
            width: 350,
            flexShrink: 0,
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a" }}>Thông tin đơn hàng</p>
          </div>

          <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
            <SuggestionInput
              label="Nhà cung cấp"
              required
              value={supplierInput}
              onChange={(val) => {
                setSupplierInput(val);
                if (!val.trim()) setSupplierId("");
              }}
              onSelectSuggestion={(item) => {
                setSupplierId(item.id || "");
                setSupplierInput(item.label || item.value);
              }}
              suggestions={supplierSuggestions}
              placeholder="Gõ tên hoặc mã nhà cung cấp..."
              emptyMessage="Không tìm thấy nhà cung cấp phù hợp"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <DatePicker label="Ngày đặt" value={ngayDat} onChange={(val) => setNgayDat(val)} />
              <DatePicker label="Ngày nhận dự kiến" value={ngayNhan} min={ngayDat} onChange={(val) => setNgayNhan(val)} />
            </div>

            {/* Khu vực Tab: Ghi chú & Hàng gửi bù chiếm hết chiều cao khả dụng */}
            <div style={{ flex: 1, minHeight: 160, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Thanh Tab */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  borderBottom: "1px solid #e2e8f0",
                  marginBottom: 10,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveLeftTab("note")}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: "transparent",
                    border: "none",
                    borderBottom: activeLeftTab === "note" ? "2px solid #0284c7" : "2px solid transparent",
                    color: activeLeftTab === "note" ? "#0369a1" : "#64748b",
                    cursor: "pointer",
                    marginBottom: -1,
                    transition: "all 0.15s ease",
                  }}
                >
                  Ghi chú
                </button>
                {!isReplacementPo && (
                  <button
                    type="button"
                    onClick={() => setActiveLeftTab("supplementary")}
                    style={{
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "transparent",
                      border: "none",
                      borderBottom: activeLeftTab === "supplementary" ? "2px solid #d97706" : "2px solid transparent",
                      color: activeLeftTab === "supplementary" ? "#b45309" : "#64748b",
                      cursor: "pointer",
                      marginBottom: -1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <BoxSeam size={12} />
                    <span>Hàng gửi bù</span>
                    {pendingSuppItems.length > 0 && (
                      <span
                        style={{
                          padding: "0 6px",
                          borderRadius: 999,
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          background: "#fef3c7",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                        }}
                      >
                        {pendingSuppItems.length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Nội dung Tab 1: Ghi chú */}
              {activeLeftTab === "note" && (
                <textarea
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  placeholder="Ghi chú thêm về đơn hàng..."
                  style={{
                    width: "100%",
                    flex: 1,
                    minHeight: 80,
                    padding: "8px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: "0.8125rem",
                    color: "#0f172a",
                    background: "#ffffff",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              )}

              {/* Nội dung Tab 2: Hàng NCC cần gửi bù */}
              {!isReplacementPo && activeLeftTab === "supplementary" && (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflow: "hidden",
                  }}
                >
                  {!supplierId ? (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      Chọn nhà cung cấp để kiểm tra hàng cần gửi bù
                    </div>
                  ) : pendingSuppItems.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 8,
                        padding: 12,
                      }}
                    >
                      Nhà cung cấp này không có hàng cần gửi bù
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#b45309" }}>
                          Chọn mặt hàng & số lượng gửi bù:
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAttachSupplementaryItems}
                          style={{
                            borderColor: "#f59e0b",
                            background: "#f59e0b",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            padding: "3px 8px",
                            height: "auto",
                          }}
                        >
                          + Thêm vào đơn (0 ₫)
                        </Button>
                      </div>

                      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
                        {pendingSuppItems.map((it) => {
                          const alreadyAdded = lines.some((l) => l.supplementaryItemId === it.id);
                          return (
                            <div
                              key={it.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: "0.75rem",
                                background: alreadyAdded ? "#f8fafc" : "#fffbeb",
                                padding: "7px 8px",
                                borderRadius: 8,
                                border: `1px solid ${alreadyAdded ? "#e2e8f0" : "#fde68a"}`,
                              }}
                            >
                              <input
                                type="checkbox"
                                disabled={alreadyAdded}
                                checked={alreadyAdded || Boolean(selectedSuppIds[it.id])}
                                onChange={(e) => setSelectedSuppIds((p) => ({ ...p, [it.id]: e.target.checked }))}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: "#0f172a",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={it.productName}
                                >
                                  {it.productName}
                                </div>
                                <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                                  {it.sourcePoCode || it.inspectionCode} • Còn bù: {it.remainingQuantity} {it.unit || ""}
                                </div>
                              </div>
                              <input
                                type="number"
                                min={1}
                                max={it.remainingQuantity}
                                disabled={alreadyAdded}
                                value={suppQtyMap[it.id] ?? it.remainingQuantity}
                                onChange={(e) => {
                                  const v = Math.min(it.remainingQuantity, Math.max(1, Number(e.target.value) || 1));
                                  setSuppQtyMap((p) => ({ ...p, [it.id]: v }));
                                }}
                                style={{
                                  width: 52,
                                  padding: "2px 5px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 5,
                                  fontSize: "0.75rem",
                                  textAlign: "center",
                                  background: "#ffffff",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tổng giá trị đơn hàng */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Tổng giá trị đơn hàng</span>
              <Badge variant="neutral">{validLines.length} mặt hàng</Badge>
            </div>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "1.25rem",
                fontWeight: 800,
                color: isReplacementPo ? "#d97706" : "#0284c7",
              }}
            >
              {tongTien.toLocaleString("vi-VN")} ₫
            </p>
          </div>

          {error && (
            <div
              style={{
                margin: "0 12px 12px",
                padding: "8px 10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: "0.75rem",
                color: "#dc2626",
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <ExclamationTriangleFill size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Danh sách mặt hàng ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: "10px 16px",
              borderBottom: "1px solid #f1f5f9",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a" }}>Danh sách mặt hàng</p>
              <Badge variant="neutral">{lines.length} dòng</Badge>
            </div>
            <Button variant="outline" size="sm" leftIcon={<PlusLg size={13} />} onClick={addLine} disabled={saving}>
              Thêm mặt hàng
            </Button>
          </div>

          <FullWidthTable loading={false}>
            <table className="w-full text-left border-collapse" style={{ fontSize: "0.8125rem" }}>
              <thead>
                <tr>
                  <th style={{ width: 42, textAlign: "center" }}>#</th>
                  <th>Mặt hàng</th>
                  <th style={{ width: 76, textAlign: "center" }}>ĐVT</th>
                  <th style={{ width: 100, textAlign: "center" }}>Số lượng</th>
                  <th style={{ width: 150, textAlign: "right" }}>Đơn giá (₫)</th>
                  <th style={{ width: 140, textAlign: "right" }}>Thành tiền (₫)</th>
                  <th style={{ width: 44, textAlign: "center" }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const isZeroPrice = Boolean(isReplacementPo || line.isSupplementary || line.isReplacement);
                  const thanhTien = isZeroPrice ? 0 : line.soLuong * line.donGiaDK;
                  const invPool = rowInvItems[line.id] || defaultInvItems;
                  const itemSuggestions: SuggestionItem[] = invPool.map((it) => ({
                    id: it.id,
                    value: it.tenHang,
                    label: it.tenHang,
                    subText: [it.code, it.donVi, it.giaNhap > 0 ? `${it.giaNhap.toLocaleString("vi-VN")} ₫` : ""]
                      .filter(Boolean)
                      .join(" • "),
                  }));

                  return (
                    <tr key={line.id}>
                      <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <SuggestionInput
                                value={line.itemSearch}
                                onChange={(val) => !isZeroPrice && onItemSearch(line.id, val)}
                                onSelectSuggestion={(s) => {
                                  if (isZeroPrice) return;
                                  const found = invPool.find((x) => x.id === s.id);
                                  if (found) selectItem(line.id, found);
                                }}
                                suggestions={isZeroPrice ? [] : itemSuggestions}
                                disabled={isZeroPrice}
                                placeholder="Tìm tên hoặc mã vật tư..."
                                emptyMessage="Không tìm thấy vật tư"
                              />
                            </div>
                            {isZeroPrice && (
                              <Badge variant="warning">Hàng gửi bù</Badge>
                            )}
                          </div>
                          {line.ghiChu && (
                            <span style={{ fontSize: "0.7rem", color: isZeroPrice ? "#b45309" : "#64748b", fontStyle: "italic" }}>
                              {line.ghiChu}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "center", color: "#475569" }}>{line.item?.donVi || "Cái"}</td>
                      <td>
                        <NumberInput
                          min={1}
                          value={line.soLuong}
                          hideZero={false}
                          onValueChange={(v) => updateLine(line.id, "soLuong", Math.max(1, v || 1))}
                          style={{ textAlign: "center" }}
                        />
                      </td>
                      <td>
                        <NumberInput
                          min={0}
                          value={isZeroPrice ? 0 : line.donGiaDK}
                          hideZero={false}
                          disabled={isZeroPrice}
                          onValueChange={(v) => updateLine(line.id, "donGiaDK", isZeroPrice ? 0 : Math.max(0, v || 0))}
                          style={{ textAlign: "right" }}
                        />
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color: isZeroPrice ? "#d97706" : "#0f172a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {thanhTien.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {lines.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.id)}
                            title="Xóa dòng"
                            aria-label="Xóa dòng"
                          >
                            <Trash3 size={13} className="text-red-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>
        </div>
      </div>
    </div>
  );
}
