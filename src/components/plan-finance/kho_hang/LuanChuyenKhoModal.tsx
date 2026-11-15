"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaoYeuCauMuaHangModal } from "@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";
import { canExecuteInOut } from "@/lib/logistics-permissions";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { DatePicker } from "@/components/common/DatePicker";
import { Toggle } from "@/components/common/Toggle";
import { EmployeeSelect } from "@/components/common/EmployeeSelect";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { SuggestionInput, type SuggestionItem } from "@/components/common/SuggestionInput";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
}
interface ItemSuggestion {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  giaNhap: number;
  soLuongTon?: number; // tồn tại kho nguồn (inject khi fetch)
}
interface TransferLine {
  id: string;
  item: ItemSuggestion | null;
  itemSearch: string;
  suggestions: ItemSuggestion[];
  showSugg: boolean;
  soLuongYC: number; // SL yêu cầu
  soLuong: number; // SL thực chuyển
  donGia: number;
  // vị trí kho nguồn (auto-fill từ InventoryStock)
  viTriHangXuat: string;
  viTriCotXuat: string;
  viTriTangXuat: string;
  // vị trí kho đích (auto-fill nếu đã có, không thì để trống)
  viTriHangNhap: string;
  viTriCotNhap: string;
  viTriTangNhap: string;
  destExists: boolean | undefined; // item đã có trong kho đích chưa
  soLuongTon: number | undefined; // tồn kho nguồn
  ghiChu: string;
  error?: string;
}
interface LuanChuyenKhoModalProps {
  onClose: () => void;
  onSaved: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): TransferLine => ({
  id: uid(),
  item: null,
  itemSearch: "",
  suggestions: [],
  showSugg: false,
  soLuongYC: 0,
  soLuong: 0,
  donGia: 0,
  viTriHangXuat: "",
  viTriCotXuat: "",
  viTriTangXuat: "",
  viTriHangNhap: "",
  viTriCotNhap: "",
  viTriTangNhap: "",
  destExists: undefined,
  soLuongTon: undefined,
  ghiChu: "",
});
const fmtVnd = (n: number) => (n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—");

// Tạo số phiếu tự động
const genSoPhieu = () => genDocCode("LC");

const GRID = "28px 1fr 56px 72px 72px 56px 56px 56px 92px 56px 56px 56px 32px";

// ── Component ─────────────────────────────────────────────────────────────────
export function LuanChuyenKhoModal({ onClose, onSaved }: LuanChuyenKhoModalProps) {
  const { data: session } = useSession();
  const isThuKho = canExecuteInOut(session?.user);
  const toast = useToast();

  // ── Header & Sidebar state ──────────────────────────────────────────────────
  const [soChungTu] = React.useState(genSoPhieu);
  const [ngayThucHien, setNgayThucHien] = React.useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [lockDate, setLockDate] = React.useState(true);
  const [nguoiThucHien, setNguoiThucHien] = React.useState("");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    if (session?.user?.name && !nguoiThucHien) {
      setNguoiThucHien(session.user.name);
    }
  }, [session, nguoiThucHien]);

  const [lyDo, setLyDo] = React.useState("");
  const [ghiChu, setGhiChu] = React.useState("");

  // ── Warehouses ──────────────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [defaultItems, setDefaultItems] = React.useState<ItemSuggestion[]>([]);

  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses")
      .then((r) => r.json())
      .then((d: unknown) => {
        const arr: Warehouse[] = Array.isArray(d)
          ? d
          : ((d as { items?: Warehouse[] }).items ?? []);
        setWarehouses(arr.filter((w) => w.isActive));
      })
      .catch(() => {});
  }, []);

  // Tải sẵn danh sách hàng hoá tại kho nguồn để gợi ý tức thì khi click vào ô tìm kiếm
  React.useEffect(() => {
    if (!fromWarehouseId) {
      setDefaultItems([]);
      return;
    }
    fetch(
      `/api/plan-finance/inventory/search?q=&limit=30&warehouseId=${encodeURIComponent(
        fromWarehouseId
      )}`
    )
      .then((r) => r.json())
      .then((data: ItemSuggestion[]) => {
        setDefaultItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setDefaultItems([]));
  }, [fromWarehouseId]);

  // Kho đích = tất cả kho trừ kho nguồn
  const destWarehouses = warehouses.filter((w) => w.id !== fromWarehouseId);

  // ── Save state ───────────────────────────────────────────────────────────────
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false); // thiếu một phần
  const [confirmAllOpen, setConfirmAllOpen] = React.useState(false); // thiếu toàn bộ
  const [showPRModal, setShowPRModal] = React.useState(false);
  const locked = success;

  // Khi đổi kho nguồn → nếu kho đích đang là kho nguồn mới thì reset
  const handleFromChange = (id: string) => {
    if (locked) return;
    setFromWarehouseId(id);
    if (id && toWarehouseId === id) setToWarehouseId("");
  };

  // ── Lines ───────────────────────────────────────────────────────────────────
  const [lines, setLines] = React.useState<TransferLine[]>([emptyLine()]);
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Search hàng hoá (bao gồm tồn kho nguồn) ─────────────────────────────────
  const onItemSearch = (lineId: string, q: string) => {
    setLines((ls) =>
      ls.map((l) =>
        l.id === lineId
          ? { ...l, itemSearch: q, showSugg: q.length > 0, item: null }
          : l
      )
    );
    clearTimeout(timers.current[lineId]);
    if (!q.trim()) return;
    timers.current[lineId] = setTimeout(async () => {
      try {
        const url =
          `/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=15` +
          (fromWarehouseId ? `&warehouseId=${fromWarehouseId}` : "");
        const data: ItemSuggestion[] = await fetch(url).then((r) => r.json());
        setLines((ls) =>
          ls.map((l) =>
            l.id === lineId
              ? { ...l, suggestions: Array.isArray(data) ? data : [] }
              : l
          )
        );
      } catch {
        /* ignore */
      }
    }, 220);
  };

  // ── Chọn item — auto fetch vị trí src + dest ──────────────────────────────
  const selectItem = async (lineId: string, item: ItemSuggestion) => {
    setLines((ls) =>
      ls.map((l) =>
        l.id === lineId
          ? {
              ...l,
              item,
              itemSearch: item.tenHang,
              suggestions: [],
              showSugg: false,
              donGia: item.giaNhap,
              soLuongTon: item.soLuongTon,
            }
          : l
      )
    );

    // Fetch vị trí tại kho nguồn
    if (fromWarehouseId) {
      try {
        const src = (await fetch(
          `/api/plan-finance/inventory/location?itemId=${item.id}&warehouseId=${fromWarehouseId}`
        ).then((r) => r.json())) as {
          viTriHang?: string;
          viTriCot?: string;
          viTriTang?: string;
          soLuong?: number;
          exists?: boolean;
        };
        setLines((ls) =>
          ls.map((l) =>
            l.id === lineId
              ? {
                  ...l,
                  viTriHangXuat: src.viTriHang ?? "",
                  viTriCotXuat: src.viTriCot ?? "",
                  viTriTangXuat: src.viTriTang ?? "",
                  soLuongTon: src.soLuong ?? 0,
                }
              : l
          )
        );
      } catch {
        /* ignore */
      }
    }

    // Fetch vị trí tại kho đích (nếu đã có)
    if (toWarehouseId) {
      try {
        const dst = (await fetch(
          `/api/plan-finance/inventory/location?itemId=${item.id}&warehouseId=${toWarehouseId}`
        ).then((r) => r.json())) as {
          viTriHang?: string;
          viTriCot?: string;
          viTriTang?: string;
          soLuong?: number;
          exists?: boolean;
        };
        setLines((ls) =>
          ls.map((l) =>
            l.id === lineId
              ? {
                  ...l,
                  destExists: dst.exists ?? false,
                  viTriHangNhap: dst.viTriHang ?? "",
                  viTriCotNhap: dst.viTriCot ?? "",
                  viTriTangNhap: dst.viTriTang ?? "",
                }
              : l
          )
        );
      } catch {
        /* ignore */
      }
    }
  };

  const updateLine = <K extends keyof TransferLine>(
    lineId: string,
    key: K,
    val: TransferLine[K]
  ) =>
    setLines((ls) =>
      ls.map((l) => (l.id === lineId ? { ...l, [key]: val } : l))
    );

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (id: string) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));

  // Khi đổi kho nguồn → reset tồn + vị trí nguồn
  React.useEffect(() => {
    if (!fromWarehouseId) return;
    setLines((ls) =>
      ls.map((l) => ({
        ...l,
        soLuongTon: undefined,
        viTriHangXuat: "",
        viTriCotXuat: "",
        viTriTangXuat: "",
      }))
    );
    const cur = lines.filter((l) => l.item);
    cur.forEach((l) => {
      if (!l.item) return;
      fetch(
        `/api/plan-finance/inventory/location?itemId=${l.item.id}&warehouseId=${fromWarehouseId}`
      )
        .then((r) => r.json())
        .then(
          (d: {
            soLuong?: number;
            viTriHang?: string;
            viTriCot?: string;
            viTriTang?: string;
          }) => {
            setLines((prev) =>
              prev.map((pl) =>
                pl.id === l.id
                  ? {
                      ...pl,
                      soLuongTon: d.soLuong ?? 0,
                      viTriHangXuat: d.viTriHang ?? "",
                      viTriCotXuat: d.viTriCot ?? "",
                      viTriTangXuat: d.viTriTang ?? "",
                    }
                  : pl
              )
            );
          }
        )
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouseId]);

  // Khi đổi kho đích → reset vị trí đích
  React.useEffect(() => {
    if (!toWarehouseId) return;
    setLines((ls) =>
      ls.map((l) => ({
        ...l,
        destExists: undefined,
        viTriHangNhap: "",
        viTriCotNhap: "",
        viTriTangNhap: "",
      }))
    );
    const cur = lines.filter((l) => l.item);
    cur.forEach((l) => {
      if (!l.item) return;
      fetch(
        `/api/plan-finance/inventory/location?itemId=${l.item.id}&warehouseId=${toWarehouseId}`
      )
        .then((r) => r.json())
        .then(
          (d: {
            exists?: boolean;
            viTriHang?: string;
            viTriCot?: string;
            viTriTang?: string;
          }) => {
            setLines((prev) =>
              prev.map((pl) =>
                pl.id === l.id
                  ? {
                      ...pl,
                      destExists: d.exists ?? false,
                      viTriHangNhap: d.viTriHang ?? "",
                      viTriCotNhap: d.viTriCot ?? "",
                      viTriTangNhap: d.viTriTang ?? "",
                    }
                  : pl
              )
            );
          }
        )
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toWarehouseId]);

  // ── Totals + realtime stock check ────────────────────────────────────────────
  const validLines = lines.filter((l) => l.item && l.soLuong > 0);
  const tongSL = validLines.reduce((s, l) => s + l.soLuong, 0);
  const tongTien = validLines.reduce((s, l) => s + l.soLuong * l.donGia, 0);
  const deficientLines = validLines.filter((l) => {
    const ton = l.soLuongTon ?? (fromWarehouseId ? 0 : undefined);
    return ton !== undefined && l.soLuong > ton;
  });
  const stockStatus: "ok" | "insufficient" | "unknown" =
    validLines.length === 0 || !fromWarehouseId
      ? "unknown"
      : deficientLines.length > 0
      ? "insufficient"
      : "ok";

  const openPurchaseRequestModal = () => {
    setShowPRModal(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        "/api/plan-finance/stock-movements/batch-luan-chuyen",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromWarehouseId,
            toWarehouseId,
            soChungTu: soChungTu || undefined,
            lyDo: lyDo || undefined,
            nguoiThucHien: nguoiThucHien || undefined,
            lines: validLines.map((l) => ({
              inventoryItemId: l.item!.id,
              soLuong: l.soLuong,
              soLuongYC: l.soLuongYC || undefined,
              donGia: l.donGia || undefined,
              viTriHangXuat: l.viTriHangXuat || undefined,
              viTriCotXuat: l.viTriCotXuat || undefined,
              viTriTangXuat: l.viTriTangXuat || undefined,
              viTriHangNhap: l.viTriHangNhap || undefined,
              viTriCotNhap: l.viTriCotNhap || undefined,
              viTriTangNhap: l.viTriTangNhap || undefined,
              ghiChu: l.ghiChu || undefined,
            })),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi lưu");
      toast.success(
        "✅ Luân chuyển kho thành công!",
        `Phiếu ${soChungTu} đã được xác nhận`,
        5000
      );
      setSuccess(true);
      onSaved();
    } catch (e) {
      toast.error(
        "Luân chuyển thất bại",
        e instanceof Error ? e.message : "Lỗi không xác định"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!isThuKho) {
      toast.error(
        "Không có quyền",
        "Chỉ tài khoản Thủ kho mới có quyền luân chuyển kho."
      );
      return;
    }
    if (!fromWarehouseId) {
      toast.error("Thiếu thông tin", "Vui lòng chọn kho nguồn");
      return;
    }
    if (!toWarehouseId) {
      toast.error("Thiếu thông tin", "Vui lòng chọn kho đích");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("Lỗi", "Kho nguồn và kho đích phải khác nhau");
      return;
    }
    if (!validLines.length) {
      toast.error("Chưa có hàng hoá", "Cần ít nhất 1 dòng hợp lệ");
      return;
    }
    if (
      deficientLines.length === validLines.length &&
      deficientLines.length > 0
    ) {
      setConfirmAllOpen(true);
      return;
    }
    if (stockStatus === "insufficient") {
      setConfirmOpen(true);
      return;
    }
    doSave();
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const rightPanelLocked = !fromWarehouseId || !toWarehouseId;
  const canConfirmSave =
    !saving &&
    !locked &&
    isThuKho &&
    Boolean(fromWarehouseId) &&
    Boolean(toWarehouseId) &&
    validLines.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        @media (max-width: 1024px) {
          .lc-top-bar {
            flex-wrap: wrap !important;
            padding: 10px 16px !important;
            gap: 10px !important;
          }
          .lc-warehouse-pair {
            order: 3;
            width: 100% !important;
            margin-left: 0 !important;
          }
          .lc-warehouse-select {
            flex: 1 !important;
            min-width: 0 !important;
          }
          .lc-body {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .lc-sidebar {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border) !important;
            flex-shrink: 0 !important;
          }
          .lc-sidebar-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .lc-table-wrapper {
            overflow-y: visible !important;
            flex: none !important;
            min-height: 400px;
          }
          .lc-table-inner {
            overflow-x: auto !important;
            padding-bottom: 8px;
          }
          .lc-table-inner > div {
            min-width: 980px;
          }
        }
        @media (max-width: 768px) {
          .lc-top-actions-desktop {
            display: none !important;
          }
          .lc-bottom-toolbar {
            display: flex !important;
          }
          .lc-sidebar {
            max-height: 44vh !important;
            overflow-y: auto !important;
          }
          .lc-sidebar-inner {
            padding: 10px 12px !important;
            gap: 10px !important;
          }
          .lc-sidebar-header-toggle.is-collapsed {
            padding-bottom: 0 !important;
            border-bottom: none !important;
          }
          .lc-sidebar-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .lc-sidebar-collapsed {
            display: none !important;
          }
          .lc-table-wrapper {
            padding: 12px !important;
          }
          .lc-table-inner {
            overflow-x: visible !important;
          }
          .lc-table-inner > div {
            min-width: 0 !important;
            width: 100% !important;
          }
          .lc-table-header {
            display: none !important;
          }
          .lc-lines-container {
            border-top: 1px solid var(--border) !important;
            border-radius: 8px !important;
          }
          .lc-line-row-desktop {
            display: none !important;
          }
          .lc-line-row-mobile {
            display: flex !important;
          }
          .lc-add-line-wrapper {
            padding-left: 40px !important;
          }
        }
      `}</style>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div
        className="lc-top-bar"
        style={{
          flexShrink: 0,
          minHeight: 64,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--card)",
        }}
      >
        {/* Left: Icon & Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: "fit-content",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className="bi bi-arrow-left-right"
              style={{ fontSize: 19, color: "#6366f1" }}
            />
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: 16,
                color: "var(--foreground)",
                letterSpacing: "-0.01em",
              }}
            >
              Luân chuyển kho nội bộ
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--muted-foreground)",
                fontFamily: "monospace",
                opacity: 0.85,
              }}
            >
              {soChungTu}
            </p>
          </div>
        </div>

        {/* Chọn kho: NGUỒN → ĐÍCH bằng component Select chuẩn */}
        <div
          className="lc-warehouse-pair"
          style={{
            marginLeft: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div className="lc-warehouse-select" style={{ width: 230 }}>
            <Select
              value={fromWarehouseId}
              onChange={(e) => handleFromChange(e.target.value)}
              disabled={locked}
              options={[
                { value: "", label: "Chọn kho nguồn" },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
              style={{
                height: 38,
                borderColor: fromWarehouseId
                  ? "rgba(99,102,241,0.45)"
                  : "var(--border)",
                background: fromWarehouseId
                  ? "rgba(99,102,241,0.05)"
                  : "var(--background)",
                color: fromWarehouseId ? "#4f46e5" : "var(--foreground)",
                fontWeight: fromWarehouseId ? 600 : 500,
              }}
            />
          </div>

          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(99,102,241,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className="bi bi-arrow-right"
              style={{ color: "#6366f1", fontSize: 14 }}
            />
          </div>

          <div className="lc-warehouse-select" style={{ width: 230 }}>
            <Select
              value={toWarehouseId}
              onChange={(e) => !locked && setToWarehouseId(e.target.value)}
              disabled={locked || !fromWarehouseId}
              options={[
                {
                  value: "",
                  label: fromWarehouseId
                    ? "Chọn kho đích"
                    : "Chọn kho nguồn trước",
                },
                ...destWarehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
              style={{
                height: 38,
                borderColor: toWarehouseId
                  ? "rgba(99,102,241,0.45)"
                  : "var(--border)",
                background: toWarehouseId
                  ? "rgba(99,102,241,0.05)"
                  : "var(--background)",
                color: toWarehouseId ? "#4f46e5" : "var(--foreground)",
                fontWeight: toWarehouseId ? 600 : 500,
              }}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            className="lc-top-actions-desktop"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            {success ? (
              <Badge variant="success">
                <i
                  className="bi bi-check-circle-fill"
                  style={{ marginRight: 5 }}
                />
                Đã chuyển kho thành công!
              </Badge>
            ) : (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!canConfirmSave}
                isLoading={saving}
                title={
                  !isThuKho
                    ? "Chỉ tài khoản Thủ kho mới có quyền luân chuyển kho"
                    : !fromWarehouseId
                    ? "Vui lòng chọn kho nguồn"
                    : !toWarehouseId
                    ? "Vui lòng chọn kho đích"
                    : validLines.length === 0
                    ? "Chưa có dòng hàng hoá hợp lệ"
                    : undefined
                }
                leftIcon={
                  <i
                    className="bi bi-arrow-left-right"
                    style={{ fontSize: 14 }}
                  />
                }
                style={{
                  background: canConfirmSave ? "#6366f1" : "var(--muted)",
                  color: canConfirmSave ? "#fff" : "var(--muted-foreground)",
                  borderColor: canConfirmSave ? "#6366f1" : "var(--border)",
                }}
              >
                Xác nhận chuyển kho
              </Button>
            )}
          </div>

          <div
            style={{
              width: 1,
              height: 24,
              background: "var(--border)",
              margin: "0 2px",
            }}
            className="d-none d-lg-block"
          />

          <button
            onClick={onClose}
            disabled={saving}
            style={{
              width: 36,
              height: 36,
              border: "none",
              background: "var(--muted)",
              borderRadius: "50%",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted-foreground)",
              transition: "all 0.2s",
            }}
            title="Đóng (Esc)"
          >
            <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY: Sidebar trái + Bảng phải ═══════════════════════════════════ */}
      <div
        className="lc-body"
        style={{ flex: 1, display: "flex", overflow: "hidden" }}
      >
        {/* ── SIDEBAR TRÁI: Thông tin phiếu ─────────────────────────────────── */}
        <div
          className="lc-sidebar"
          style={{
            width: 272,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "var(--card)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <div
            className="lc-sidebar-inner"
            style={{
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Header nhóm */}
            <div
              className={`lc-sidebar-header-toggle ${
                !isSidebarOpen ? "is-collapsed" : ""
              }`}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 10,
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(99,102,241,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i
                    className="bi bi-receipt"
                    style={{ fontSize: 13, color: "#6366f1" }}
                  />
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 13,
                    color: "var(--foreground)",
                  }}
                >
                  Thông tin phiếu
                </span>
              </div>
              <i
                className={`bi bi-chevron-${
                  isSidebarOpen ? "up" : "down"
                } d-md-none`}
                style={{ fontSize: 14, color: "var(--muted-foreground)" }}
              />
            </div>

            <div
              className={`lc-sidebar-content ${
                !isSidebarOpen ? "lc-sidebar-collapsed" : ""
              }`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                className="lc-sidebar-grid"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {/* Số phiếu chuyển */}
                <Input
                  label="Số phiếu chuyển"
                  value={soChungTu}
                  readOnly
                  disabled
                  style={{
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                    cursor: "default",
                    fontFamily: "monospace",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                />

                {/* Ngày thực hiện — DatePicker + Toggle chuẩn */}
                <div className="form-group">
                  <label className="form-label">Ngày thực hiện</label>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <DatePicker
                      value={ngayThucHien}
                      min={
                        lockDate
                          ? new Date().toISOString().slice(0, 10)
                          : undefined
                      }
                      max={
                        lockDate
                          ? new Date().toISOString().slice(0, 10)
                          : undefined
                      }
                      onChange={(val) =>
                        !lockDate && !locked && setNgayThucHien(val)
                      }
                      disabled={lockDate || locked}
                      clearable={false}
                      className="flex-1"
                    />
                    {!locked && (
                      <div
                        style={{ flexShrink: 0 }}
                        title={
                          lockDate
                            ? "Khoá ngày hôm nay — nhấn để mở"
                            : "Đang mở — nhấn để khoá"
                        }
                      >
                        <Toggle
                          checked={lockDate}
                          onChange={(checked) => {
                            setLockDate(checked);
                            if (checked) {
                              setNgayThucHien(
                                new Date().toISOString().slice(0, 10)
                              );
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Người thực hiện — EmployeeSelect chuẩn */}
                <EmployeeSelect
                  label="Người thực hiện"
                  multiple={false}
                  departmentFilter="Kho vận"
                  hidePositionBadge={true}
                  value={nguoiThucHien}
                  onChange={(val) => !locked && setNguoiThucHien(val)}
                  disabled={locked}
                  placeholder="Chọn hoặc tìm nhân sự kho vận..."
                  searchPlaceholder="Tìm tên nhân viên kho vận..."
                />
              </div>

              {/* Lý do chuyển kho */}
              <div className="form-group">
                <label className="form-label">Lý do chuyển kho</label>
                <textarea
                  className="form-input"
                  value={lyDo}
                  onChange={(e) => !locked && setLyDo(e.target.value)}
                  readOnly={locked}
                  rows={2}
                  placeholder="VD: Điều phối hàng, bổ sung kho chi nhánh..."
                  style={{
                    height: "auto",
                    padding: "8px 12px",
                    resize: locked ? "none" : "vertical",
                    lineHeight: 1.5,
                    opacity: locked ? 0.65 : 1,
                    cursor: locked ? "default" : "text",
                  }}
                />
              </div>

              {/* Ghi chú — chiếm hết không gian còn lại của sidebar */}
              <div
                className="form-group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 76,
                }}
              >
                <label className="form-label">Ghi chú</label>
                <textarea
                  className="form-input"
                  value={ghiChu}
                  onChange={(e) => !locked && setGhiChu(e.target.value)}
                  readOnly={locked}
                  placeholder="Ghi chú thêm..."
                  style={{
                    flex: 1,
                    height: "auto",
                    minHeight: 64,
                    padding: "8px 12px",
                    resize: "none",
                    lineHeight: 1.5,
                    opacity: locked ? 0.65 : 1,
                    cursor: locked ? "default" : "text",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC BẢNG BÊN PHẢI ─────────────────────────────────────────── */}
        <div
          className="lc-table-wrapper"
          style={{
            flex: 1,
            overflowY: rightPanelLocked ? "hidden" : "auto",
            padding: "16px 20px 24px",
            position: "relative",
          }}
        >
          {/* Overlay khi chưa chọn đủ kho */}
          {rightPanelLocked && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                backdropFilter: "blur(3px)",
                background:
                  "color-mix(in srgb, var(--background) 60%, transparent)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "rgba(99,102,241,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className="bi bi-lock-fill"
                  style={{ fontSize: 24, color: "#6366f1" }}
                />
              </div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 15,
                  color: "var(--foreground)",
                }}
              >
                {!fromWarehouseId && !toWarehouseId
                  ? "Chưa chọn kho nguồn và kho đích"
                  : !fromWarehouseId
                  ? "Chưa chọn kho nguồn"
                  : "Chưa chọn kho đích"}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  textAlign: "center",
                }}
              >
                Vui lòng chọn cả <b>Kho nguồn</b> và <b>Kho đích</b>
                <br />ở thanh trên để mở khu vực nhập hàng hoá.
              </p>
            </div>
          )}

          {/* Tiêu đề bảng + badge trạng thái tồn + tổng */}
          <div
            className="lc-pane-header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14 }}>
              Danh sách hàng hoá chuyển kho
            </span>
            <Badge variant="neutral">{lines.length} dòng</Badge>

            {/* Badge trạng thái tồn kho nguồn chuẩn + nút tạo yêu cầu mua hàng */}
            {validLines.length > 0 && stockStatus !== "unknown" && (
              <TrangThaiTonKhoBadge
                items={validLines.map((l) => ({
                  ten: l.item?.tenHang ?? l.itemSearch,
                  soLuong: l.soLuong,
                  soLuongTon: l.item ? (l.soLuongTon ?? 0) : 0,
                }))}
                showPurchaseRequest={!locked && isThuKho}
                onCreatePR={openPurchaseRequestModal}
              />
            )}

            {/* Totals */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Tổng SL
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#6366f1",
                    lineHeight: 1.2,
                  }}
                >
                  {tongSL.toLocaleString("vi-VN")}
                </div>
              </div>
              <div
                style={{ width: 1, height: 28, background: "var(--border)" }}
              />
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Giá trị
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#6366f1",
                    lineHeight: 1.2,
                  }}
                >
                  {fmtVnd(tongTien)}
                </div>
              </div>
            </div>
          </div>

          <div className="lc-table-inner">
            {/* Table header — 2 dòng đồng bộ với Nhập kho / Xuất kho */}
            <div
              className="lc-table-header"
              style={{
                background: "var(--muted)",
                borderRadius: "8px 8px 0 0",
                overflow: "hidden",
              }}
            >
              {/* Dòng 1 — group labels */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "28px 1fr 56px 149px 178px 92px 178px 32px",
                  gap: 5,
                  padding: "6px 10px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <div>#</div>
                <div>Hàng hoá</div>
                <div style={{ textAlign: "center" }}>ĐVT</div>
                <div
                  style={{
                    textAlign: "center",
                    borderBottom: "2px solid var(--border)",
                    paddingBottom: 3,
                    fontSize: 10.5,
                  }}
                >
                  Số lượng chuyển
                </div>
                <div
                  style={{
                    textAlign: "center",
                    borderBottom: "2px solid var(--border)",
                    paddingBottom: 3,
                    fontSize: 10.5,
                  }}
                >
                  Vị trí kho nguồn
                </div>
                <div style={{ textAlign: "center", fontSize: 10.5 }}>
                  Tồn nguồn
                </div>
                <div
                  style={{
                    textAlign: "center",
                    borderBottom: "2px solid var(--border)",
                    paddingBottom: 3,
                    fontSize: 10.5,
                  }}
                >
                  Vị trí kho đích
                </div>
                <div />
              </div>

              {/* Dòng 2 — sub-labels */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 5,
                  padding: "2px 10px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <div />
                <div />
                <div />
                <div style={{ textAlign: "center", opacity: 0.75 }}>SL YC</div>
                <div style={{ textAlign: "center", opacity: 0.9 }}>SL thực</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Hàng</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Cột</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Tầng</div>
                <div />
                <div style={{ textAlign: "center", opacity: 0.75 }}>Hàng</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Cột</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Tầng</div>
                <div />
              </div>
            </div>

            {/* Lines container */}
            <div
              className="lc-lines-container"
              style={{
                border: "1px solid var(--border)",
                borderTop: "none",
                borderRadius: "0 0 8px 8px",
              }}
            >
              {lines.map((line, idx) => (
                <LineRow
                  key={line.id}
                  line={line}
                  idx={idx}
                  locked={locked}
                  defaultItems={defaultItems}
                  onItemSearch={(q) => onItemSearch(line.id, q)}
                  onSelectItem={(item) => selectItem(line.id, item)}
                  onUpdate={(k, v) => updateLine(line.id, k, v)}
                  onRemove={() => removeLine(line.id)}
                  canRemove={lines.length > 1}
                />
              ))}

              {/* Add line footer */}
              <div
                className="lc-add-line-wrapper"
                style={{
                  padding: "8px 10px",
                  borderTop: "1px dashed var(--border)",
                }}
              >
                {!locked ? (
                  <button
                    onClick={addLine}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#6366f1";
                      e.currentTarget.style.color = "#6366f1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderWidth: "1.5px",
                      borderStyle: "dashed",
                      borderColor: "var(--border)",
                      background: "transparent",
                      color: "var(--muted-foreground)",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 7,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <i className="bi bi-plus-lg" style={{ fontSize: 13 }} />{" "}
                    Thêm dòng hàng hoá
                  </button>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 4px",
                    }}
                  >
                    <i
                      className="bi bi-lock-fill"
                      style={{ fontSize: 11, color: "#6366f1" }}
                    />
                    Danh sách đã khoá sau khi xác nhận chuyển kho
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM TOOLBAR (MOBILE ONLY) ════════════════════════════════════ */}
      <div
        className="lc-bottom-toolbar"
        style={{
          display: "none",
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {success ? (
          <Badge variant="success" className="w-full justify-center py-2">
            <i
              className="bi bi-check-circle-fill"
              style={{ marginRight: 5 }}
            />
            Đã chuyển kho thành công!
          </Badge>
        ) : (
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!canConfirmSave}
            isLoading={saving}
            leftIcon={
              <i
                className="bi bi-arrow-left-right"
                style={{ fontSize: 14 }}
              />
            }
            style={{
              flex: 1,
              background: canConfirmSave ? "#6366f1" : "var(--muted)",
              color: canConfirmSave ? "#fff" : "var(--muted-foreground)",
              borderColor: canConfirmSave ? "#6366f1" : "var(--border)",
            }}
          >
            Xác nhận chuyển kho
          </Button>
        )}
      </div>

      {/* Confirm khi thiếu hàng một phần */}
      <ConfirmDialog
        open={confirmOpen}
        variant="warning"
        title="Kho nguồn không đủ hàng"
        message={
          <div>
            <p style={{ margin: "0 0 10px" }}>
              Có{" "}
              <strong style={{ color: "#f43f5e" }}>
                {deficientLines.length} mặt hàng
              </strong>{" "}
              không đủ tồn kho để chuyển:
            </p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 13 }}>
              {deficientLines.map((l) => (
                <li key={l.id}>
                  <strong>{l.item?.tenHang}</strong>: cần {l.soLuong}, tồn&nbsp;
                  <span style={{ color: "#f43f5e", fontWeight: 700 }}>
                    {l.soLuongTon ?? 0}
                  </span>
                  {l.item?.donVi ? ` ${l.item.donVi}` : ""}
                </li>
              ))}
            </ul>
            <p
              style={{
                margin: 0,
                color: "var(--muted-foreground)",
                fontSize: 12.5,
              }}
            >
              Bạn có muốn chuyển số lượng hiện có hoặc đợi bổ sung hàng?
            </p>
          </div>
        }
        confirmLabel="Chuyển kho ngay"
        cancelLabel="Đợi đủ hàng"
        loading={saving}
        onConfirm={() => {
          setConfirmOpen(false);
          doSave();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ConfirmDialog khi tất cả mặt hàng đều thiếu tồn */}
      <ConfirmDialog
        open={confirmAllOpen}
        variant="danger"
        title="Không có hàng nào để chuyển"
        message={
          <div>
            <p style={{ margin: "0 0 10px" }}>
              Tất cả{" "}
              <strong style={{ color: "#f43f5e" }}>
                {deficientLines.length} mặt hàng
              </strong>{" "}
              trong phiếu đều không đủ tồn kho để chuyển:
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
              {deficientLines.map((l) => (
                <li key={l.id}>
                  <strong>{l.item?.tenHang}</strong> — cần {l.soLuong},
                  tồn&nbsp;
                  <span style={{ color: "#f43f5e", fontWeight: 700 }}>0</span>
                  {l.item?.donVi ? ` ${l.item.donVi}` : ""}
                </li>
              ))}
            </ul>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                color: "var(--muted-foreground)",
              }}
            >
              Vui lòng bổ sung hàng vào kho nguồn trước khi thực hiện chuyển
              kho.
            </p>
          </div>
        }
        confirmLabel="Đóng phiếu"
        cancelLabel="Quay lại chỉnh sửa"
        onConfirm={() => {
          setConfirmAllOpen(false);
          onClose();
        }}
        onCancel={() => setConfirmAllOpen(false)}
      />

      {/* Tạo yêu cầu mua hàng — pre-filled với hàng thiếu tồn */}
      {showPRModal && (
        <TaoYeuCauMuaHangModal
          onClose={() => setShowPRModal(false)}
          onSaved={() => {
            setShowPRModal(false);
            toast.success(
              "✅ Đã tạo yêu cầu mua hàng!",
              "Yêu cầu đã được gửi cho bộ phận mua hàng",
              5000
            );
          }}
          initialData={{
            nguoiYeuCau: nguoiThucHien || "",
            lyDo: `Bổ sung hàng thiếu khi chuyển kho ${soChungTu}`,
            lines: deficientLines.map((l) => ({
              tenHang: l.item!.tenHang,
              soLuong: Math.max(1, l.soLuong - (l.soLuongTon ?? 0)),
              donVi: l.item!.donVi ?? undefined,
              ghiChu: `Chuyển ${soChungTu}: thiếu ${
                l.soLuong - (l.soLuongTon ?? 0)
              } ${l.item!.donVi ?? ""}`,
            })),
          }}
        />
      )}
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────
function LineRow({
  line,
  idx,
  locked,
  defaultItems,
  onItemSearch,
  onSelectItem,
  onUpdate,
  onRemove,
  canRemove,
}: {
  line: TransferLine;
  idx: number;
  locked?: boolean;
  defaultItems: ItemSuggestion[];
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate: <K extends keyof TransferLine>(
    key: K,
    val: TransferLine[K]
  ) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const hasError =
    !!line.error ||
    (line.soLuongTon !== undefined &&
      line.soLuong > 0 &&
      line.soLuong > line.soLuongTon);

  const cellInput: React.CSSProperties = {
    width: "100%",
    height: 32,
    padding: "0 8px",
    fontSize: 12.5,
    background: locked ? "var(--muted)" : "var(--background)",
    color: locked ? "var(--muted-foreground)" : "var(--foreground)",
    cursor: locked ? "default" : "text",
  };

  const activeList =
    line.suggestions.length > 0 ? line.suggestions : defaultItems;
  const suggestionItems: SuggestionItem[] = React.useMemo(
    () =>
      activeList.map((s) => ({
        id: s.id,
        value: s.tenHang,
        label: s.tenHang,
        subText: [
          s.code ? `Mã: ${s.code}` : null,
          s.donVi ? `ĐVT: ${s.donVi}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        badge:
          s.soLuongTon !== undefined
            ? `Tồn: ${s.soLuongTon} ${s.donVi ?? ""}`.trim()
            : undefined,
      })),
    [activeList]
  );

  const handleSelectSuggestion = (sugg: SuggestionItem) => {
    const picked = activeList.find(
      (it) => it.id === sugg.id || it.tenHang === sugg.value
    );
    if (picked) {
      onSelectItem(picked);
    }
  };

  return (
    <>
      {/* Desktop grid row */}
      <div
        className="lc-line-row-desktop"
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 5,
          padding: "7px 10px",
          borderTop: idx === 0 ? "none" : "1px solid var(--border)",
          alignItems: "center",
          background: hasError
            ? "rgba(244,63,94,0.04)"
            : line.item
            ? "var(--background)"
            : "color-mix(in srgb, var(--muted) 20%, var(--background))",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: "var(--muted-foreground)",
            fontWeight: 600,
          }}
        >
          {idx + 1}
        </div>

        {/* Item search — SuggestionInput chuẩn */}
        <div style={{ minWidth: 0 }}>
          <SuggestionInput
            value={line.itemSearch}
            onChange={(val) => !locked && onItemSearch(val)}
            onSelectSuggestion={handleSelectSuggestion}
            suggestions={suggestionItems}
            disabled={locked}
            readOnly={locked}
            placeholder="Tìm hoặc chọn hàng hoá..."
            emptyMessage="Không tìm thấy hàng hoá phù hợp"
            inputStyle={{
              height: 32,
              fontSize: 12.5,
              borderColor: hasError
                ? "rgba(244,63,94,0.5)"
                : line.item
                ? "rgba(99,102,241,0.4)"
                : "var(--border)",
            }}
          />
        </div>

        {/* ĐVT */}
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--muted-foreground)",
            fontWeight: 600,
          }}
        >
          {line.item?.donVi ?? "—"}
        </div>

        {/* SL yêu cầu */}
        <Input
          type="number"
          min={0}
          hideZero={false}
          numberGroup={false}
          value={line.soLuongYC}
          onChange={(e) =>
            !locked &&
            onUpdate("soLuongYC", Math.max(0, parseFloat(e.target.value) || 0))
          }
          readOnly={locked}
          title="Số lượng yêu cầu"
          style={{
            ...cellInput,
            textAlign: "center",
            background: locked
              ? "var(--muted)"
              : "color-mix(in srgb, var(--muted) 60%, var(--background))",
            color: "var(--muted-foreground)",
          }}
        />

        {/* SL thực chuyển */}
        <Input
          type="number"
          min={0}
          hideZero={false}
          numberGroup={false}
          value={line.soLuong}
          onChange={(e) =>
            !locked &&
            onUpdate("soLuong", Math.max(0, parseFloat(e.target.value) || 0))
          }
          readOnly={locked}
          title="Số lượng thực tế chuyển kho"
          style={{
            ...cellInput,
            textAlign: "center",
            borderColor: hasError
              ? "rgba(244,63,94,0.5)"
              : !locked && line.soLuong !== line.soLuongYC && line.soLuongYC > 0
              ? "#6366f1"
              : "var(--border)",
            fontWeight:
              !locked && line.soLuong !== line.soLuongYC && line.soLuongYC > 0
                ? 700
                : 400,
            color: hasError ? "#f43f5e" : "var(--foreground)",
          }}
        />

        {/* Vị trí kho nguồn (3 cột: Hàng, Cột, Tầng) */}
        <Input
          placeholder="Hàng"
          value={line.viTriHangXuat}
          onChange={(e) => !locked && onUpdate("viTriHangXuat", e.target.value)}
          readOnly={locked}
          style={{ ...cellInput, textAlign: "center" }}
          title="Hàng (kho nguồn)"
        />
        <Input
          placeholder="Cột"
          value={line.viTriCotXuat}
          onChange={(e) => !locked && onUpdate("viTriCotXuat", e.target.value)}
          readOnly={locked}
          style={{ ...cellInput, textAlign: "center" }}
          title="Cột (kho nguồn)"
        />
        <Input
          placeholder="Tầng"
          value={line.viTriTangXuat}
          onChange={(e) => !locked && onUpdate("viTriTangXuat", e.target.value)}
          readOnly={locked}
          style={{ ...cellInput, textAlign: "center" }}
          title="Tầng (kho nguồn)"
        />

        {/* Tồn kho nguồn — Badge chuẩn */}
        <div style={{ textAlign: "center" }}>
          {line.soLuongTon !== undefined ? (
            <Badge
              variant={
                line.soLuongTon === 0 ||
                (line.soLuong > 0 && line.soLuong > line.soLuongTon)
                  ? "danger"
                  : "success"
              }
            >
              {line.soLuongTon} {line.item?.donVi ?? ""}
            </Badge>
          ) : (
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              —
            </span>
          )}
        </div>

        {/* Vị trí kho đích (3 cột: Hàng, Cột, Tầng) */}
        <div style={{ position: "relative" }}>
          <Input
            placeholder="Hàng"
            value={line.viTriHangNhap}
            onChange={(e) =>
              !locked && onUpdate("viTriHangNhap", e.target.value)
            }
            readOnly={locked}
            style={{
              ...cellInput,
              textAlign: "center",
              borderColor:
                !line.viTriHangNhap && !locked
                  ? "rgba(245,158,11,0.4)"
                  : "var(--border)",
            }}
            title="Hàng (kho đích)"
          />
        </div>
        <Input
          placeholder="Cột"
          value={line.viTriCotNhap}
          onChange={(e) => !locked && onUpdate("viTriCotNhap", e.target.value)}
          readOnly={locked}
          style={{
            ...cellInput,
            textAlign: "center",
            borderColor:
              !line.viTriCotNhap && !locked
                ? "rgba(245,158,11,0.4)"
                : "var(--border)",
          }}
          title="Cột (kho đích)"
        />
        <div style={{ position: "relative" }}>
          {line.destExists === false && (
            <div
              title="Hàng chưa có trong kho đích — vị trí mới sẽ được tạo"
              style={{
                position: "absolute",
                top: -6,
                right: -4,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
              }}
            >
              <i className="bi bi-plus" style={{ fontSize: 9, color: "#fff" }} />
            </div>
          )}
          <Input
            placeholder="Tầng"
            value={line.viTriTangNhap}
            onChange={(e) =>
              !locked && onUpdate("viTriTangNhap", e.target.value)
            }
            readOnly={locked}
            style={{
              ...cellInput,
              textAlign: "center",
              borderColor:
                !line.viTriTangNhap && !locked
                  ? "rgba(245,158,11,0.4)"
                  : "var(--border)",
            }}
            title="Tầng (kho đích)"
          />
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          disabled={!canRemove || locked}
          onMouseEnter={(e) => {
            if (canRemove && !locked) {
              e.currentTarget.style.background = "rgba(244,63,94,0.1)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          style={{
            width: 26,
            height: 26,
            border: "none",
            background: "transparent",
            color: canRemove && !locked ? "#f43f5e" : "var(--border)",
            cursor: canRemove && !locked ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            transition: "background 0.15s",
          }}
          title="Xoá dòng"
        >
          <i className="bi bi-trash3" style={{ fontSize: 12 }} />
        </button>
      </div>

      {/* Mobile card layout (<= 768px only) */}
      <div
        className="lc-line-row-mobile"
        style={{
          display: "none",
          flexDirection: "column",
          gap: 8,
          padding: "10px",
          borderTop: idx === 0 ? "none" : "1px solid var(--border)",
          background: hasError
            ? "rgba(244,63,94,0.04)"
            : line.item
            ? "var(--background)"
            : "color-mix(in srgb, var(--muted) 20%, var(--background))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted-foreground)",
              flexShrink: 0,
            }}
          >
            {idx + 1}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SuggestionInput
              value={line.itemSearch}
              onChange={(val) => !locked && onItemSearch(val)}
              onSelectSuggestion={handleSelectSuggestion}
              suggestions={suggestionItems}
              disabled={locked}
              readOnly={locked}
              placeholder="Tìm hoặc chọn hàng hoá..."
              inputStyle={{ height: 32, fontSize: 12.5 }}
            />
          </div>

          <button
            onClick={onRemove}
            disabled={!canRemove || locked}
            style={{
              width: 28,
              height: 28,
              border: "none",
              background: "transparent",
              color: canRemove && !locked ? "#f43f5e" : "var(--border)",
              cursor: canRemove && !locked ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            <i className="bi bi-trash3" style={{ fontSize: 13 }} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "64px 1fr 1fr",
            gap: 8,
            paddingLeft: 30,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              ĐVT
            </div>
            <Input
              value={line.item?.donVi ?? "—"}
              readOnly
              style={{
                ...cellInput,
                textAlign: "center",
                background: "var(--muted)",
                color: "var(--muted-foreground)",
                fontWeight: 600,
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              SL YC
            </div>
            <Input
              type="number"
              min={0}
              hideZero={false}
              numberGroup={false}
              value={line.soLuongYC}
              onChange={(e) =>
                !locked &&
                onUpdate(
                  "soLuongYC",
                  Math.max(0, parseFloat(e.target.value) || 0)
                )
              }
              readOnly={locked}
              style={{ ...cellInput, textAlign: "center" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              SL Thực
            </div>
            <Input
              type="number"
              min={0}
              hideZero={false}
              numberGroup={false}
              value={line.soLuong}
              onChange={(e) =>
                !locked &&
                onUpdate(
                  "soLuong",
                  Math.max(0, parseFloat(e.target.value) || 0)
                )
              }
              readOnly={locked}
              style={{ ...cellInput, textAlign: "center" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
