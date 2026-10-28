"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { CurrencyInput }             from "@/components/ui/CurrencyInput";
import { useToast }                  from "@/components/ui/Toast";
import { ConfirmDialog }             from "@/components/ui/ConfirmDialog";
import { TaoYeuCauMuaHangModal }     from "@/components/plan-finance/mua_hang/TaoYeuCauMuaHangModal";
import { genDocCode }                from "@/lib/genDocCode";
import { isLogisticsAdmin }           from "@/lib/logistics-permissions";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse     { id: string; code: string | null; name: string; isActive: boolean; }
interface ItemSuggestion {
  id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number;
  soLuongTon?: number; // tồn tại kho nguồn (inject khi fetch)
}
interface TransferLine {
  id:           string;
  item:         ItemSuggestion | null;
  itemSearch:   string;
  suggestions:  ItemSuggestion[];
  showSugg:     boolean;
  soLuongYC:    number;   // SL yêu cầu
  soLuong:      number;   // SL thực chuyển
  donGia:       number;
  // vị trí kho nguồn (auto-fill từ InventoryStock)
  viTriHangXuat: string;
  viTriCotXuat:  string;
  viTriTangXuat: string;
  // vị trí kho đích (auto-fill nếu đã có, không thì để trống)
  viTriHangNhap: string;
  viTriCotNhap:  string;
  viTriTangNhap: string;
  destExists:   boolean | undefined; // item đã có trong kho đích chưa
  soLuongTon:   number | undefined;  // tồn kho nguồn
  ghiChu:       string;
  error?:       string;
}
interface LuanChuyenKhoModalProps {
  onClose:  () => void;
  onSaved:  () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): TransferLine => ({
  id: uid(), item: null, itemSearch: "", suggestions: [], showSugg: false,
  soLuongYC: 0, soLuong: 0, donGia: 0,
  viTriHangXuat: "", viTriCotXuat: "", viTriTangXuat: "",
  viTriHangNhap: "", viTriCotNhap: "", viTriTangNhap: "",
  destExists: undefined, soLuongTon: undefined, ghiChu: "",
});
const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";

// Tạo số phiếu tự động
const genSoPhieu = () => genDocCode("LC");

// ── CSS helpers (đồng bộ với NhapKho / XuatKho) ──────────────────────────────
const CSS = {
  label: {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: "var(--muted-foreground)", marginBottom: 5,
  } as React.CSSProperties,
  input: {
    width: "100%", padding: "8px 11px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box" as const,
  } as React.CSSProperties,
};

// ── Component ─────────────────────────────────────────────────────────────────
export function LuanChuyenKhoModal({ onClose, onSaved }: LuanChuyenKhoModalProps) {
  const { data: session } = useSession();
  const isThuKho = isLogisticsAdmin(session?.user);
  const toast = useToast();

  // ── Header state ────────────────────────────────────────────────────────────
  const [soChungTu]      = React.useState(genSoPhieu);
  const [ngayThucHien, setNgayThucHien] = React.useState(() => new Date().toISOString().slice(0,10));
  const [lockDate, setLockDate]         = React.useState(true);
  const [nguoiThucHien, setNguoiThucHien] = React.useState("");

  React.useEffect(() => {
    if (session?.user?.name && !nguoiThucHien) {
      setNguoiThucHien(session.user.name);
    }
  }, [session, nguoiThucHien]);
  const [lyDo,   setLyDo]               = React.useState("");
  const [ghiChu, setGhiChu]             = React.useState("");

  // ── Warehouses ──────────────────────────────────────────────────────────────
  const [warehouses, setWarehouses]     = React.useState<Warehouse[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = React.useState("");
  const [toWarehouseId,   setToWarehouseId]   = React.useState("");

  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses")
      .then(r => r.json())
      .then((d: unknown) => {
        const arr: Warehouse[] = Array.isArray(d) ? d : (d as { items?: Warehouse[] }).items ?? [];
        setWarehouses(arr.filter(w => w.isActive));
      })
      .catch(() => {});
  }, []);

  // Kho đích = tất cả kho trừ kho nguồn
  const destWarehouses = warehouses.filter(w => w.id !== fromWarehouseId);

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
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, itemSearch: q, showSugg: q.length > 0, item: null } : l));
    clearTimeout(timers.current[lineId]);
    if (!q.trim()) return;
    timers.current[lineId] = setTimeout(async () => {
      try {
        const url = `/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=10`
          + (fromWarehouseId ? `&warehouseId=${fromWarehouseId}` : "");
        const data: ItemSuggestion[] = await fetch(url).then(r => r.json());
        setLines(ls => ls.map(l => l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l));
      } catch { /* ignore */ }
    }, 250);
  };

  // ── Chọn item — auto fetch vị trí src + dest ──────────────────────────────
  const selectItem = async (lineId: string, item: ItemSuggestion) => {
    // Cập nhật tức thì tên hàng
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, item, itemSearch: item.tenHang, suggestions: [], showSugg: false,
          donGia: item.giaNhap, soLuongTon: item.soLuongTon }
      : l));

    // Fetch vị trí tại kho nguồn
    if (fromWarehouseId) {
      try {
        const src = await fetch(`/api/plan-finance/inventory/location?itemId=${item.id}&warehouseId=${fromWarehouseId}`)
          .then(r => r.json()) as { viTriHang?: string; viTriCot?: string; viTriTang?: string; soLuong?: number; exists?: boolean };
        setLines(ls => ls.map(l => l.id === lineId ? {
          ...l,
          viTriHangXuat: src.viTriHang ?? "",
          viTriCotXuat:  src.viTriCot  ?? "",
          viTriTangXuat: src.viTriTang ?? "",
          soLuongTon:    src.soLuong   ?? 0,
        } : l));
      } catch { /* ignore */ }
    }

    // Fetch vị trí tại kho đích (nếu đã có)
    if (toWarehouseId) {
      try {
        const dst = await fetch(`/api/plan-finance/inventory/location?itemId=${item.id}&warehouseId=${toWarehouseId}`)
          .then(r => r.json()) as { viTriHang?: string; viTriCot?: string; viTriTang?: string; soLuong?: number; exists?: boolean };
        setLines(ls => ls.map(l => l.id === lineId ? {
          ...l,
          destExists:    dst.exists ?? false,
          viTriHangNhap: dst.viTriHang ?? "",
          viTriCotNhap:  dst.viTriCot  ?? "",
          viTriTangNhap: dst.viTriTang ?? "",
        } : l));
      } catch { /* ignore */ }
    }
  };

  const updateLine = <K extends keyof TransferLine>(lineId: string, key: K, val: TransferLine[K]) =>
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, [key]: val } : l));

  const addLine    = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (id: string) => setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== id) : ls);

  // Khi đổi kho nguồn → reset tồn + vị trí nguồn
  React.useEffect(() => {
    if (!fromWarehouseId) return;
    setLines(ls => ls.map(l => ({ ...l, soLuongTon: undefined, viTriHangXuat: "", viTriCotXuat: "", viTriTangXuat: "" })));
    const cur = lines.filter(l => l.item);
    cur.forEach(l => {
      if (!l.item) return;
      fetch(`/api/plan-finance/inventory/location?itemId=${l.item.id}&warehouseId=${fromWarehouseId}`)
        .then(r => r.json())
        .then((d: { soLuong?: number; viTriHang?: string; viTriCot?: string; viTriTang?: string }) => {
          setLines(prev => prev.map(pl => pl.id === l.id ? {
            ...pl, soLuongTon: d.soLuong ?? 0,
            viTriHangXuat: d.viTriHang ?? "", viTriCotXuat: d.viTriCot ?? "", viTriTangXuat: d.viTriTang ?? "",
          } : pl));
        }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouseId]);

  // Khi đổi kho đích → reset vị trí đích
  React.useEffect(() => {
    if (!toWarehouseId) return;
    setLines(ls => ls.map(l => ({ ...l, destExists: undefined, viTriHangNhap: "", viTriCotNhap: "", viTriTangNhap: "" })));
    const cur = lines.filter(l => l.item);
    cur.forEach(l => {
      if (!l.item) return;
      fetch(`/api/plan-finance/inventory/location?itemId=${l.item.id}&warehouseId=${toWarehouseId}`)
        .then(r => r.json())
        .then((d: { exists?: boolean; viTriHang?: string; viTriCot?: string; viTriTang?: string }) => {
          setLines(prev => prev.map(pl => pl.id === l.id ? {
            ...pl, destExists: d.exists ?? false,
            viTriHangNhap: d.viTriHang ?? "", viTriCotNhap: d.viTriCot ?? "", viTriTangNhap: d.viTriTang ?? "",
          } : pl));
        }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toWarehouseId]);

  // ── Totals + realtime stock check ────────────────────────────────────────────
  const validLines     = lines.filter(l => l.item && l.soLuong > 0);
  const tongSL         = validLines.reduce((s, l) => s + l.soLuong, 0);
  const tongTien       = validLines.reduce((s, l) => s + l.soLuong * l.donGia, 0);
  const deficientLines = validLines.filter(l => {
    const ton = l.soLuongTon ?? (fromWarehouseId ? 0 : undefined);
    return ton !== undefined && l.soLuong > ton;
  });
  const stockStatus: "ok" | "insufficient" | "unknown" =
    validLines.length === 0 || !fromWarehouseId ? "unknown" :
    deficientLines.length > 0 ? "insufficient" : "ok";

  // ── Save ─────────────────────────────────────────────────────────────────────
  const [saving, setSaving]             = React.useState(false);
  const [success, setSuccess]           = React.useState(false);
  const [confirmOpen, setConfirmOpen]   = React.useState(false);  // thiếu một phần
  const [confirmAllOpen, setConfirmAllOpen] = React.useState(false); // thiếu toàn bộ
  const [showPRModal, setShowPRModal]   = React.useState(false);
  const locked = success;

  const openPurchaseRequestModal = () => {
    setShowPRModal(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/plan-finance/stock-movements/batch-luan-chuyen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
          toWarehouseId,
          soChungTu:    soChungTu    || undefined,
          lyDo:         lyDo         || undefined,
          nguoiThucHien: nguoiThucHien || undefined,
          lines: validLines.map(l => ({
            inventoryItemId:  l.item!.id,
            soLuong:          l.soLuong,
            soLuongYC:        l.soLuongYC || undefined,
            donGia:           l.donGia    || undefined,
            viTriHangXuat:    l.viTriHangXuat || undefined,
            viTriCotXuat:     l.viTriCotXuat  || undefined,
            viTriTangXuat:    l.viTriTangXuat || undefined,
            viTriHangNhap:    l.viTriHangNhap || undefined,
            viTriCotNhap:     l.viTriCotNhap  || undefined,
            viTriTangNhap:    l.viTriTangNhap || undefined,
            ghiChu:           l.ghiChu || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi lưu");
      toast.success("✅ Luân chuyển kho thành công!", `Phiếu ${soChungTu} đã được xác nhận`, 5000);
      setSuccess(true);
      onSaved();
    } catch (e) {
      toast.error("Luân chuyển thất bại", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  const handleSave = () => {
    if (!isThuKho) {
      toast.error("Không có quyền", "Chỉ tài khoản Thủ kho mới có quyền luân chuyển kho.");
      return;
    }
    if (!fromWarehouseId) { toast.error("Thiếu thông tin", "Vui lòng chọn kho nguồn"); return; }
    if (!toWarehouseId)   { toast.error("Thiếu thông tin", "Vui lòng chọn kho đích");  return; }
    if (fromWarehouseId === toWarehouseId) { toast.error("Lỗi", "Kho nguồn và kho đích phải khác nhau"); return; }
    if (!validLines.length) { toast.error("Chưa có hàng hoá", "Cần ít nhất 1 dòng hợp lệ"); return; }
    // Tất cả đều thiếu tồn → hiện ConfirmDialog cảnh báo + đóng
    if (deficientLines.length === validLines.length && deficientLines.length > 0) {
      setConfirmAllOpen(true); return;
    }
    // Thiếu một phần → hỏi xuất thiếu hay đợi
    if (stockStatus === "insufficient") { setConfirmOpen(true); return; }
    doSave();
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const rightPanelLocked = !fromWarehouseId || !toWarehouseId;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, height: 56, borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, background: "var(--card)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-arrow-left-right" style={{ fontSize: 18, color: "#6366f1" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Luân chuyển kho nội bộ</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{soChungTu}</p>
        </div>

        {/* Chọn kho: NGUỒN → ĐÍCH (top bar cho tiện quan sát) */}
        <div style={{ marginLeft: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <select value={fromWarehouseId} onChange={e => handleFromChange(e.target.value)} disabled={locked}
            style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${fromWarehouseId ? "rgba(99,102,241,0.5)" : "var(--border)"}`, background: "var(--card)", color: "var(--foreground)", fontSize: 13, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.7 : 1 }}>
            <option value="">Chọn kho nguồn</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <i className="bi bi-arrow-right" style={{ color: "#6366f1", fontSize: 16 }} />
          <select value={toWarehouseId} onChange={e => !locked && setToWarehouseId(e.target.value)} disabled={locked || !fromWarehouseId}
            style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${toWarehouseId ? "rgba(99,102,241,0.5)" : "var(--border)"}`, background: "var(--card)", color: "var(--foreground)", fontSize: 13, cursor: (locked || !fromWarehouseId) ? "not-allowed" : "pointer", opacity: (locked || !fromWarehouseId) ? 0.7 : 1 }}>
            <option value="">{fromWarehouseId ? "Chọn kho đích" : "Chọn kho nguồn trước"}</option>
            {destWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {success ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", background: "rgba(99,102,241,0.1)", borderRadius: 8, color: "#6366f1", fontSize: 13, fontWeight: 700 }}>
              <i className="bi bi-check-circle-fill" /> Đã chuyển kho thành công!
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving || locked || !isThuKho}
              title={!isThuKho ? "Chỉ tài khoản Thủ kho mới có quyền luân chuyển kho" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 20px", border: "none", background: (saving || locked || !isThuKho) ? "var(--muted)" : "#6366f1", color: (saving || locked || !isThuKho) ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: (saving || locked || !isThuKho) ? "not-allowed" : "pointer" }}>
              {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-arrow-left-right" />}
              {saving ? "Đang xử lý…" : "Xác nhận chuyển kho"}
            </button>
          )}
          <button onClick={onClose} disabled={saving}
            style={{ width: 34, height: 34, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <div style={{ width: 272, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--card)", overflowY: "auto" }}>
          <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>Thông tin phiếu</p>
          </div>
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Số phiếu */}
            <div>
              <label style={CSS.label}>Số phiếu chuyển</label>
              <input value={soChungTu} readOnly style={{ ...CSS.input, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "default", fontFamily: "monospace", fontSize: 12 }} />
            </div>

            {/* Ngày + lock */}
            <div>
              <label style={CSS.label}>Ngày thực hiện</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date"
                  value={ngayThucHien}
                  min={lockDate ? new Date().toISOString().slice(0,10) : undefined}
                  max={lockDate ? new Date().toISOString().slice(0,10) : undefined}
                  onChange={e => !lockDate && !locked && setNgayThucHien(e.target.value)}
                  readOnly={lockDate || locked}
                  style={{ ...CSS.input, flex: 1, cursor: (lockDate || locked) ? "not-allowed" : "text", opacity: (lockDate || locked) ? 0.7 : 1, background: (lockDate || locked) ? "var(--muted)" : CSS.input.background }}
                />
                {!locked && (
                  <span onClick={() => setLockDate(v => !v)} title={lockDate ? "Khoá ngày hôm nay" : "Đang mở — nhấn để khoá"}
                    style={{ position: "relative", display: "inline-block", width: 34, height: 18, borderRadius: 9, flexShrink: 0, background: lockDate ? "#6366f1" : "var(--border)", transition: "background 0.2s", cursor: "pointer" }}>
                    <span style={{ position: "absolute", top: 2, left: lockDate ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
                  </span>
                )}
              </div>
            </div>

            {/* Người thực hiện */}
            <div>
              <label style={CSS.label}>Người thực hiện</label>
              <input value={nguoiThucHien} onChange={e => !locked && setNguoiThucHien(e.target.value)}
                readOnly={locked} placeholder="Họ tên người chuyển kho" style={{ ...CSS.input, opacity: locked ? 0.7 : 1 }} />
            </div>

            {/* Lý do */}
            <div>
              <label style={CSS.label}>Lý do chuyển kho</label>
              <textarea value={lyDo} onChange={e => !locked && setLyDo(e.target.value)}
                readOnly={locked} rows={3} placeholder="VD: Điều phối hàng, bổ sung kho chi nhánh..."
                style={{ ...CSS.input, resize: "vertical", minHeight: 72, opacity: locked ? 0.7 : 1 }} />
            </div>

            {/* Ghi chú */}
            <div>
              <label style={CSS.label}>Ghi chú</label>
              <textarea value={ghiChu} onChange={e => !locked && setGhiChu(e.target.value)}
                readOnly={locked} rows={2} placeholder="Ghi chú thêm..."
                style={{ ...CSS.input, resize: "vertical", minHeight: 56, opacity: locked ? 0.7 : 1 }} />
            </div>
          </div>
        </div>

        {/* ── TABLE AREA ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: rightPanelLocked ? "hidden" : "auto", padding: "16px 20px 24px", position: "relative" }}>

          {/* Overlay khi chưa chọn đủ kho */}
          {rightPanelLocked && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, backdropFilter: "blur(3px)", background: "color-mix(in srgb, var(--background) 60%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 24, color: "#6366f1" }} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>
                {!fromWarehouseId && !toWarehouseId ? "Chưa chọn kho nguồn và kho đích"
                  : !fromWarehouseId ? "Chưa chọn kho nguồn"
                  : "Chưa chọn kho đích"}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
                Vui lòng chọn cả kho nguồn và kho đích<br />ở thanh trên để mở khu vực nhập hàng hoá.
              </p>
            </div>
          )}

          {/* Tiêu đề bảng + badge tồn */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Danh sách hàng hoá chuyển kho</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>
              {lines.length} dòng
            </span>

            {/* Badge trạng thái tồn kho nguồn */}
            {validLines.length > 0 && stockStatus !== "unknown" && (
              stockStatus === "ok" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 20, padding: "3px 10px", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} /> Đủ hàng để chuyển
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: "#f43f5e", background: "rgba(244,63,94,0.08)", borderRadius: 20, padding: "3px 10px", border: "1px solid rgba(244,63,94,0.25)" }}>
                  <i className="bi bi-exclamation-circle-fill" style={{ fontSize: 11 }} /> Không đủ hàng
                  <span style={{ fontWeight: 400, fontSize: 10.5, marginLeft: 2 }}>({deficientLines.length} mặt hàng)</span>
                </span>
              )
            )}

            {/* Nút tạo yêu cầu mua hàng khi thiếu tồn (chỉ Thủ kho) */}
            {stockStatus === "insufficient" && !locked && isThuKho && (
              <button onClick={openPurchaseRequestModal}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.12)"; e.currentTarget.style.borderColor = "#f43f5e"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,63,94,0.06)"; e.currentTarget.style.borderColor = "rgba(244,63,94,0.35)"; }}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "#f43f5e", background: "rgba(244,63,94,0.06)", borderRadius: 20, padding: "3px 12px", border: "1px solid rgba(244,63,94,0.35)", cursor: "pointer", transition: "all 0.15s" }}>
                <i className="bi bi-cart-plus" style={{ fontSize: 11 }} /> Tạo yêu cầu mua hàng
              </button>
            )}

            {/* Totals */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tổng SL</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#6366f1", lineHeight: 1.2 }}>{tongSL.toLocaleString("vi-VN")}</div>
              </div>
              <div style={{ width: 1, height: 28, background: "var(--border)" }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá trị</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#6366f1", lineHeight: 1.2 }}>{fmtVnd(tongTien)}</div>
              </div>
            </div>
          </div>

          {/* Table header — 2 dòng */}
          <div style={{ background: "var(--muted)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
            {/* Dòng 1 — group labels */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 55px 70px 70px 165px 90px 165px 32px", gap: 4, padding: "6px 10px 0", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div>#</div>
              <div>Hàng hoá</div>
              <div style={{ textAlign: "center" }}>ĐVT</div>
              <div style={{ textAlign: "center" }}>SL YC</div>
              <div style={{ textAlign: "center" }}>SL thực</div>
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>Vị trí kho nguồn</div>
              <div style={{ textAlign: "center", fontSize: 10.5 }}>Tồn nguồn</div>
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>Vị trí kho đích</div>
              <div />
            </div>
            {/* Dòng 2 — sub-labels */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 55px 70px 70px 165px 90px 165px 32px", gap: 4, padding: "3px 10px 6px", fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)" }}>
              <div /><div /><div /><div /><div />
              {/* Vị trí nguồn: 3 sub cols */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                <div style={{ textAlign: "center" }}>Hàng</div>
                <div style={{ textAlign: "center" }}>Cột</div>
                <div style={{ textAlign: "center" }}>Tầng</div>
              </div>
              <div />
              {/* Vị trí đích: 3 sub cols */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                <div style={{ textAlign: "center" }}>Hàng</div>
                <div style={{ textAlign: "center" }}>Cột</div>
                <div style={{ textAlign: "center" }}>Tầng</div>
              </div>
              <div />
            </div>
          </div>

          {/* Lines */}
          <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "visible" }}>
            {lines.map((line, idx) => (
              <LineRow key={line.id} line={line} idx={idx} locked={locked}
                onItemSearch={q => onItemSearch(line.id, q)}
                onSelectItem={item => selectItem(line.id, item)}
                onUpdate={(k, v) => updateLine(line.id, k, v)}
                onRemove={() => removeLine(line.id)}
                canRemove={lines.length > 1}
              />
            ))}
          </div>

          {/* Add line */}
          <div style={{ marginTop: 10 }}>
            {!locked ? (
              <button onClick={addLine}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderWidth: "1.5px", borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
                <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm dòng hàng hoá
              </button>
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, padding: "4px 4px" }}>
                <i className="bi bi-lock-fill" style={{ fontSize: 11, color: "#6366f1" }} />
                Danh sách đã khoá sau khi xác nhận chuyển kho
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm khi thiếu hàng một phần */}
      <ConfirmDialog
        open={confirmOpen}
        variant="warning"
        title="Kho nguồn không đủ hàng"
        message={
          <div>
            <p style={{ margin: "0 0 10px" }}>
              Có <strong style={{ color: "#f43f5e" }}>{deficientLines.length} mặt hàng</strong> không đủ tồn kho để chuyển:
            </p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 13 }}>
              {deficientLines.map(l => (
                <li key={l.id}>
                  <strong>{l.item?.tenHang}</strong>: cần {l.soLuong}, tồn&nbsp;
                  <span style={{ color: "#f43f5e", fontWeight: 700 }}>{l.soLuongTon ?? 0}</span>
                  {l.item?.donVi ? ` ${l.item.donVi}` : ""}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 12.5 }}>
              Bạn có muốn chuyển số lượng hiện có hoặc đợi bổ sung hàng?
            </p>
          </div>
        }
        confirmLabel="Chuyển kho ngay"
        cancelLabel="Đợi đủ hàng"
        loading={saving}
        onConfirm={() => { setConfirmOpen(false); doSave(); }}
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
              Tất cả <strong style={{ color: "#f43f5e" }}>{deficientLines.length} mặt hàng</strong> trong phiếu đều không đủ tồn kho để chuyển:
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
              {deficientLines.map(l => (
                <li key={l.id}>
                  <strong>{l.item?.tenHang}</strong> — cần {l.soLuong}, tồn&nbsp;
                  <span style={{ color: "#f43f5e", fontWeight: 700 }}>0</span>{l.item?.donVi ? ` ${l.item.donVi}` : ""}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted-foreground)" }}>
              Vui lòng bổ sung hàng vào kho nguồn trước khi thực hiện chuyển kho.
            </p>
          </div>
        }
        confirmLabel="Đóng phiếu"
        cancelLabel="Quay lại chỉnh sửa"
        onConfirm={() => { setConfirmAllOpen(false); onClose(); }}
        onCancel={() => setConfirmAllOpen(false)}
      />

      {/* Tạo yêu cầu mua hàng — pre-filled với hàng thiếu tồn */}
      {showPRModal && (
        <TaoYeuCauMuaHangModal
          onClose={() => setShowPRModal(false)}
          onSaved={() => {
            setShowPRModal(false);
            toast.success("✅ Đã tạo yêu cầu mua hàng!", "Yêu cầu đã được gửi cho bộ phận mua hàng", 5000);
          }}
          initialData={{
            nguoiYeuCau: nguoiThucHien || "",
            lyDo: `Bổ sung hàng thiếu khi chuyển kho ${soChungTu}`,
            lines: deficientLines.map(l => ({
              tenHang: l.item!.tenHang,
              soLuong: Math.max(1, l.soLuong - (l.soLuongTon ?? 0)),
              donVi:   l.item!.donVi ?? undefined,
              ghiChu:  `Chuyển ${soChungTu}: thiếu ${l.soLuong - (l.soLuongTon ?? 0)} ${l.item!.donVi ?? ""}`,
            })),
          }}
        />
      )}
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────
function LineRow({ line, idx, locked, onItemSearch, onSelectItem, onUpdate, onRemove, canRemove }: {
  line: TransferLine; idx: number; locked?: boolean;
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate:     <K extends keyof TransferLine>(key: K, val: TransferLine[K]) => void;
  onRemove:     () => void;
  canRemove:    boolean;
}) {
  const hasError = !!line.error || (line.soLuongTon !== undefined && line.soLuong > line.soLuongTon);
  const cellInput: React.CSSProperties = {
    width: "100%", padding: "5px 7px", borderWidth: 1, borderStyle: "solid",
    borderColor: "var(--border)", borderRadius: 6, fontSize: 12,
    background: locked ? "var(--muted)" : "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1fr 55px 70px 70px 165px 90px 165px 32px",
      gap: 4, padding: "7px 10px",
      borderBottom: "1px solid var(--border)", alignItems: "center",
      background: hasError ? "rgba(244,63,94,0.04)"
        : idx % 2 !== 0 ? "color-mix(in srgb, var(--muted) 25%, transparent)"
        : "transparent",
    }}>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx + 1}</div>

      {/* Item search */}
      <div style={{ position: "relative" }}>
        <input value={line.itemSearch}
          onChange={e => !locked && onItemSearch(e.target.value)}
          onFocus={() => { if (line.itemSearch && !line.item) onUpdate("showSugg", true as never); }}
          onBlur={() => setTimeout(() => onUpdate("showSugg", false as never), 150)}
          readOnly={locked} placeholder="Tìm hàng hoá..."
          style={{ ...cellInput, paddingRight: line.item ? 26 : 8,
            borderColor: hasError ? "rgba(244,63,94,0.5)" : line.item ? "rgba(99,102,241,0.4)" : "var(--border)" }} />
        {line.item && <i className="bi bi-check-circle-fill" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6366f1", pointerEvents: "none" }} />}
        {line.showSugg && line.suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto" }}>
            {line.suggestions.map(s => (
              <div key={s.id}
                onMouseDown={e => e.preventDefault()} // ngăn blur trước khi onClick
                onClick={() => !locked && onSelectItem(s)}
                style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.tenHang}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8 }}>
                  <span>{s.code ?? ""}</span>
                  {s.soLuongTon !== undefined && (
                    <span style={{ color: s.soLuongTon > 0 ? "#10b981" : "#f43f5e", fontWeight: 700 }}>
                      Tồn: {s.soLuongTon} {s.donVi ?? ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ĐVT */}
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{line.item?.donVi ?? "—"}</div>

      {/* SL yêu cầu */}
      <input type="number" min={0} value={line.soLuongYC}
        onChange={e => !locked && onUpdate("soLuongYC", Math.max(0, parseFloat(e.target.value) || 0))}
        readOnly={locked} title="Số lượng yêu cầu"
        style={{ ...cellInput, textAlign: "center", background: locked ? "var(--muted)" : "color-mix(in srgb, var(--muted) 60%, var(--background))", color: "var(--muted-foreground)" }} />

      {/* SL thực chuyển */}
      <input type="number" min={0} value={line.soLuong}
        onChange={e => !locked && onUpdate("soLuong", Math.max(0, parseFloat(e.target.value) || 0))}
        readOnly={locked} title="Số lượng thực tế chuyển kho"
        style={{
          ...cellInput, textAlign: "center",
          borderColor: hasError ? "rgba(244,63,94,0.5)"
            : (!locked && line.soLuong !== line.soLuongYC && line.soLuongYC > 0) ? "#6366f1"
            : "var(--border)",
          fontWeight: !locked && line.soLuong !== line.soLuongYC && line.soLuongYC > 0 ? 700 : 400,
          color: hasError ? "#f43f5e" : "var(--foreground)",
        }} />

      {/* Vị trí kho nguồn (3 cột sub) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
        <input placeholder="Hàng" value={line.viTriHangXuat} onChange={e => !locked && onUpdate("viTriHangXuat", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Hàng (nguồn)" />
        <input placeholder="Cột"  value={line.viTriCotXuat}  onChange={e => !locked && onUpdate("viTriCotXuat",  e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Cột (nguồn)"  />
        <input placeholder="Tầng" value={line.viTriTangXuat} onChange={e => !locked && onUpdate("viTriTangXuat", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Tầng (nguồn)" />
      </div>

      {/* Tồn kho nguồn */}
      <div style={{ textAlign: "center" }}>
        {line.soLuongTon !== undefined ? (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 12,
            background: line.soLuongTon === 0 ? "rgba(244,63,94,0.1)"
              : line.soLuong > 0 && line.soLuong > line.soLuongTon ? "rgba(244,63,94,0.1)"
              : "rgba(16,185,129,0.1)",
            color: line.soLuongTon === 0 || (line.soLuong > 0 && line.soLuong > line.soLuongTon) ? "#f43f5e" : "#10b981",
          }}>
            {line.soLuongTon} {line.item?.donVi ?? ""}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>—</span>
        )}
      </div>

      {/* Vị trí kho đích (3 cột sub + icon trạng thái) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, position: "relative" }}>
        {line.destExists === false && (
          <div title="Hàng chưa có trong kho đích — vị trí mới sẽ được tạo"
            style={{ position: "absolute", top: -8, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
            <i className="bi bi-plus" style={{ fontSize: 9, color: "#fff" }} />
          </div>
        )}
        <input placeholder="Hàng" value={line.viTriHangNhap} onChange={e => !locked && onUpdate("viTriHangNhap", e.target.value)} readOnly={locked}
          style={{ ...cellInput, textAlign: "center", borderColor: !line.viTriHangNhap && !locked ? "rgba(245,158,11,0.4)" : "var(--border)" }} title="Hàng (đích)" />
        <input placeholder="Cột"  value={line.viTriCotNhap}  onChange={e => !locked && onUpdate("viTriCotNhap",  e.target.value)} readOnly={locked}
          style={{ ...cellInput, textAlign: "center", borderColor: !line.viTriCotNhap  && !locked ? "rgba(245,158,11,0.4)" : "var(--border)" }} title="Cột (đích)"  />
        <input placeholder="Tầng" value={line.viTriTangNhap} onChange={e => !locked && onUpdate("viTriTangNhap", e.target.value)} readOnly={locked}
          style={{ ...cellInput, textAlign: "center", borderColor: !line.viTriTangNhap && !locked ? "rgba(245,158,11,0.4)" : "var(--border)" }} title="Tầng (đích)" />
      </div>

      {/* Remove */}
      <button onClick={onRemove} disabled={!canRemove || locked}
        onMouseEnter={e => { if (canRemove && !locked) e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        style={{ width: 26, height: 26, border: "none", background: "transparent", color: (canRemove && !locked) ? "#f43f5e" : "var(--border)", cursor: (canRemove && !locked) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, transition: "background 0.15s" }}>
        <i className="bi bi-trash3" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}
