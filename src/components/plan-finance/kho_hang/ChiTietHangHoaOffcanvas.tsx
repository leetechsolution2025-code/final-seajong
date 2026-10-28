"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface InventoryItemDetail {
  id: string;
  code?: string | null;
  tenHang: string;
  loai?: string | null;
  donVi: string | null;
  soLuong: number;
  soLuongMin?: number;
  giaNhap?: number;
  giaVon?: number;
  giaBan?: number;
  nhaCungCap?: string | null;
  thongSoKyThuat?: string | null;
  viTri?: string | null;
  trangThai: string;
  ghiChu?: string | null;
  createdAt?: string;
  updatedAt?: string;
  category?: { id?: string; name: string } | null;
  dinhMuc?: {
    id: string;
    code?: string | null;
    tenDinhMuc?: string | null;
    vatTu: { id: string; tenVatTu: string; soLuong: number; donViTinh?: string | null; ghiChu?: string | null }[];
  } | null;
}

interface StockByWh {
  id: string;
  soLuong: number;
  soLuongMin: number;
  viTriHang?: string | null;
  viTriCot?: string | null;
  viTriTang?: string | null;
  warehouse: { id: string; code: string | null; name: string; isActive: boolean };
}

interface VatTuRow { _id: number; tenVatTu: string; soLuong: number; donViTinh: string; ghiChu: string }

const DVT = ["Cái","Chiếc","Bộ","Cuộn","Tấm","Thanh","Kg","Tấn","m","m²","m³","Hộp","Thùng","Lít"];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "con-hang": { label: "Còn hàng", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "bi-check-circle-fill" },
  "sap-het":  { label: "Sắp hết",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "bi-exclamation-triangle-fill" },
  "het-hang": { label: "Đã hết",   color: "#f43f5e", bg: "rgba(244,63,94,0.12)",   icon: "bi-x-circle-fill" },
};

const IS: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
  fontSize: 12.5, outline: "none", borderRadius: 8, fontFamily: "inherit",
};
const Lbl = ({ t, req }: { t: string; req?: boolean }) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {t}{req && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);
const Sec = ({ title, icon }: { title: string; icon: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "16px 0 8px", paddingBottom: 5, borderBottom: "1px solid var(--border)" }}>
    <i className={`bi ${icon}`} style={{ fontSize: 12, color: "var(--primary)" }} />
    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</span>
  </div>
);
const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12 }}>
    <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--foreground)", textAlign: "right" }}>{value ?? "—"}</span>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export function ChiTietHangHoaOffcanvas({ open, item, onClose, onDeleted, onUpdated }: {
  open: boolean;
  item: InventoryItemDetail | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (updated: InventoryItemDetail) => void;
}) {
  const toast = useToast();
  const uid = useRef(1);

  const [activeTab, setActiveTab] = useState<"info" | "bom">("info");
  const [stocks, setStocks] = useState<StockByWh[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Full item detail (fetched from API to include dinhMuc)
  const [fullItem, setFullItem] = useState<InventoryItemDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit item fields
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editCategories, setEditCategories] = useState<{ id: string; name: string }[]>([]);
  const [editForm, setEditForm] = useState({ tenHang: "", code: "", categoryId: "", donVi: "", soLuong: 0, soLuongMin: 0, giaNhap: 0, giaVon: 0, giaBan: 0, nhaCungCap: "", thongSoKyThuat: "", ghiChu: "" });

  // Nhập hàng
  const [nhapMode, setNhapMode] = useState(false);
  const [nhapWh, setNhapWh] = useState("");
  const [nhapSL, setNhapSL] = useState(1);
  const [nhapSaving, setNhapSaving] = useState(false);
  const [whList, setWhList] = useState<{ id: string; name: string; code: string | null }[]>([]);

  // Định mức (BOM) editing
  const [bomMode, setBomMode] = useState(false);
  const [bomCode, setBomCode] = useState("");
  const [bomName, setBomName] = useState("");
  const [bomVatTu, setBomVatTu] = useState<VatTuRow[]>([]);
  const [bomSaving, setBomSaving] = useState(false);
  const [newVt, setNewVt] = useState({ tenVatTu: "", soLuong: 1, donViTinh: "Cái", ghiChu: "" });
  const [confirmDelBom, setConfirmDelBom] = useState(false);


  // Reset khi đổi item — fetch full detail bao gồm dinhMuc
  useEffect(() => {
    if (!open || !item) {
      setStocks([]); setEditMode(false); setNhapMode(false); setBomMode(false);
      setFullItem(null);
      return;
    }
    setActiveTab("info");
    setEditMode(false); setNhapMode(false); setBomMode(false);
    setNhapSL(1);
    // Fetch full item detail (includes dinhMuc)
    setDetailLoading(true);
    fetch(`/api/plan-finance/inventory/${item.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setFullItem(d ?? item))
      .catch(() => setFullItem(item))
      .finally(() => setDetailLoading(false));
    // Fetch stocks
    setStocksLoading(true);
    fetch(`/api/plan-finance/inventory/${item.id}/stocks`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setStocks(Array.isArray(d) ? d : []))
      .catch(() => setStocks([]))
      .finally(() => setStocksLoading(false));
    fetch("/api/plan-finance/warehouses")
      .then(r => r.json())
      .then((d: { id: string; name: string; code: string | null; isActive: boolean }[]) => {
        const active = Array.isArray(d) ? d.filter(w => w.isActive) : [];
        setWhList(active);
        setNhapWh(active.length === 1 ? active[0].id : "");
      }).catch(() => {});
  }, [open, item?.id]);

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);


  const openEditMode = useCallback(() => {
    const i = fullItem ?? item;
    if (!i) return;
    setEditForm({ tenHang: i.tenHang ?? "", code: i.code ?? "", categoryId: "", donVi: i.donVi ?? "", soLuong: i.soLuong ?? 0, soLuongMin: i.soLuongMin ?? 0, giaNhap: i.giaNhap ?? 0, giaVon: i.giaVon ?? i.giaNhap ?? 0, giaBan: i.giaBan ?? 0, nhaCungCap: i.nhaCungCap ?? "", thongSoKyThuat: i.thongSoKyThuat ?? "", ghiChu: i.ghiChu ?? "" });
    setEditErrors({});
    setEditMode(true);
    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then((d: { id: string; name: string }[]) => {
        setEditCategories(Array.isArray(d) ? d : []);
        const found = d.find((c: { id: string; name: string }) => c.name === i.category?.name);
        if (found) setEditForm(f => ({ ...f, categoryId: found.id }));
      }).catch(() => {});
  }, [fullItem, item]);

  const handleSaveEdit = async () => {
    const i = fullItem ?? item;
    if (!i) return;
    const errs: Record<string, string> = {};
    if (!editForm.tenHang.trim()) errs.tenHang = "Bắt buộc";
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setEditSaving(true); setEditErrors({});
    try {
      const res = await fetch(`/api/plan-finance/inventory/${i.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, tenHang: editForm.tenHang.trim(), soLuong: Number(editForm.soLuong), soLuongMin: Number(editForm.soLuongMin), giaNhap: Number(editForm.giaNhap), giaVon: Number(editForm.giaVon), giaBan: Number(editForm.giaBan) }),
      });
      const data = await res.json();
      if (!res.ok) { setEditErrors({ _: data.error ?? "Lỗi" }); return; }
      toast.success("Cập nhật thành công", `Hàng hoá "${data.tenHang}" đã được lưu.`);
      setEditMode(false);
      const updated = { ...i, ...data } as InventoryItemDetail;
      setFullItem(updated);
      onUpdated(updated);
    } catch { setEditErrors({ _: "Lỗi kết nối" }); }
    finally { setEditSaving(false); }
  };

  const handleNhapHang = async () => {
    const i = fullItem ?? item;
    if (!i || !nhapWh || nhapSL <= 0) return;
    setNhapSaving(true);
    try {
      const res = await fetch("/api/plan-finance/stock-movements/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toWarehouseId: nhapWh, lyDo: "Phân kho từ màn hình hàng hoá", lines: [{ inventoryItemId: i.id, soLuong: nhapSL }] }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi"); }
      toast.success("Phân kho thành công", `Đã nhập ${nhapSL} ${i.donVi ?? ""} vào kho.`);
      setNhapMode(false);
      setStocksLoading(true);
      fetch(`/api/plan-finance/inventory/${i.id}/stocks`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setStocks(Array.isArray(d) ? d : []))
        .catch(() => {}).finally(() => setStocksLoading(false));
    } catch (e) { toast.error("Không thể nhập", e instanceof Error ? e.message : "Lỗi"); }
    finally { setNhapSaving(false); }
  };

  const handleDelete = async () => {
    const i = fullItem ?? item;
    if (!i) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plan-finance/inventory/${i.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error("Không thể xóa", data.error ?? "Lỗi"); setConfirmDel(false); return; }
      toast.success("Xóa thành công", `Hàng hoá "${i.tenHang}" đã bị xóa.`);
      setConfirmDel(false); onClose(); onDeleted();
    } catch { toast.error("Lỗi kết nối", "Không thể kết nối đến server."); }
    finally { setDeleting(false); }
  };

  // ── BOM ──────────────────────────────────────────────────────────────────────
  const openBomEdit = () => {
    const i = fullItem ?? item;
    const dm = i?.dinhMuc;
    setBomCode(dm?.code ?? "");
    setBomName(dm?.tenDinhMuc ?? "");
    setBomVatTu(dm?.vatTu.map((v, i) => ({ _id: i + 1, tenVatTu: v.tenVatTu, soLuong: v.soLuong, donViTinh: v.donViTinh ?? "Cái", ghiChu: v.ghiChu ?? "" })) ?? []);
    uid.current = (dm?.vatTu.length ?? 0) + 1;
    setBomMode(true);
  };

  const addVatTu = () => {
    if (!newVt.tenVatTu.trim()) return;
    setBomVatTu(v => [...v, { _id: uid.current++, ...newVt }]);
    setNewVt({ tenVatTu: "", soLuong: 1, donViTinh: "Cái", ghiChu: "" });
  };

  const saveBom = async () => {
    const i = fullItem ?? item;
    if (!i) return;
    setBomSaving(true);
    try {
      const res = await fetch(`/api/plan-finance/inventory/${i.id}/dinhmuc`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: bomCode, tenDinhMuc: bomName, vatTu: bomVatTu.map(v => ({ tenVatTu: v.tenVatTu, soLuong: v.soLuong, donViTinh: v.donViTinh, ghiChu: v.ghiChu })) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi");
      const dm = await res.json();
      toast.success("Lưu định mức thành công");
      setBomMode(false);
      const updated = { ...i, dinhMuc: dm } as InventoryItemDetail;
      setFullItem(updated);
      onUpdated(updated);
    } catch (e) { toast.error("Lỗi", e instanceof Error ? e.message : "Lỗi"); }
    finally { setBomSaving(false); }
  };

  const deleteBom = async () => {
    const i = fullItem ?? item;
    if (!i) return;
    try {
      await fetch(`/api/plan-finance/inventory/${i.id}/dinhmuc`, { method: "DELETE" });
      toast.success("Đã xoá định mức");
      setConfirmDelBom(false); setBomMode(false);
      const updated = { ...i, dinhMuc: null } as InventoryItemDetail;
      setFullItem(updated);
      onUpdated({ ...i, dinhMuc: null, dinhMucId: undefined } as InventoryItemDetail & { dinhMucId?: string });
    } catch { toast.error("Lỗi", "Không thể xóa định mức"); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  // Dùng fullItem nếu có (có dinhMuc), fallback về item prop
  const displayItem = fullItem ?? item;
  const fmt = (n?: number) => (n ?? 0).toLocaleString("vi-VN");
  const fmtVnd = (n?: number) => {
    if (!n) return "0 đ";
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + " tỷ đ";
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(".", ",") + " triệu đ";
    return n.toLocaleString("vi-VN") + " đ";
  };

  const sc = displayItem ? (STATUS_CFG[displayItem.trangThai] ?? STATUS_CFG["con-hang"]) : STATUS_CFG["con-hang"];
  const stocksTotal = stocks.reduce((s, st) => s + st.soLuong, 0);
  const tongTon = stocksLoading ? (displayItem?.soLuong ?? 0) : stocks.length > 0 ? stocksTotal : (displayItem?.soLuong ?? 0);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 4000, background: open ? "rgba(0,0,0,0.35)" : "transparent", pointerEvents: open ? "auto" : "none", transition: "background 0.25s" }} />

      {/* Panel */}
      <div className="app-custom-drawer" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "var(--card)", boxShadow: "-8px 0 40px rgba(0,0,0,0.18)", zIndex: 4001, display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        {!displayItem ? (
          detailLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
              <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
            </div>
          ) : null
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-box-seam" style={{ fontSize: 19, color: "var(--primary)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14.5, color: "var(--foreground)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayItem.tenHang}</p>
                  {displayItem.code && <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{displayItem.code}</p>}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                      <i className={`bi ${sc.icon}`} style={{ fontSize: 9 }} />{sc.label}
                    </span>
                    {displayItem.category?.name && (
                      <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>{displayItem.category.name}</span>
                    )}
                    {displayItem.dinhMuc && (
                      <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 700, background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
                        <i className="bi bi-diagram-3 me-1" style={{ fontSize: 9 }} />Có định mức
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={onClose} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
                  <i className="bi bi-x" style={{ fontSize: 16 }} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4 }}>
                {([
                  { key: "info", label: "Thông tin", icon: "bi-info-circle" },
                  { key: "bom",  label: "Định mức",  icon: "bi-diagram-3" },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, background: activeTab === t.key ? "var(--primary)" : "var(--muted)", color: activeTab === t.key ? "#fff" : "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}>
                    <i className={`bi ${t.icon}`} style={{ fontSize: 11 }} />{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 18px" }}>

              {/* ── TAB INFO ── */}
              {activeTab === "info" && (
                <>
                  {/* Edit form */}
                  {editMode ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 12 }}>
                      {editErrors._ && <div style={{ padding: "8px 12px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, fontSize: 12.5, color: "#f43f5e" }}>{editErrors._}</div>}
                      <div><Lbl t="Tên hàng hoá" req /><input value={editForm.tenHang} onChange={e => setEditForm(f => ({ ...f, tenHang: e.target.value }))} style={{ ...IS, borderColor: editErrors.tenHang ? "#f43f5e" : "var(--border)" }} /></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div><Lbl t="Mã SKU" /><input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} style={IS} /></div>
                        <div><Lbl t="Danh mục" /><select value={editForm.categoryId} onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))} style={{ ...IS, appearance: "none" }}><option value="">Chọn</option>{editCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div><Lbl t="Đơn vị tính" /><select value={editForm.donVi} onChange={e => setEditForm(f => ({ ...f, donVi: e.target.value }))} style={{ ...IS, appearance: "none" }}><option value="">Chọn</option>{DVT.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><Lbl t="Nhà cung cấp" /><input value={editForm.nhaCungCap} onChange={e => setEditForm(f => ({ ...f, nhaCungCap: e.target.value }))} style={IS} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div><Lbl t="Tồn đầu kỳ" /><input type="number" min={0} value={editForm.soLuong} onChange={e => setEditForm(f => ({ ...f, soLuong: Number(e.target.value) }))} style={IS} /></div>
                        <div><Lbl t="Tồn tối thiểu" /><input type="number" min={0} value={editForm.soLuongMin} onChange={e => setEditForm(f => ({ ...f, soLuongMin: Number(e.target.value) }))} style={IS} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <div><Lbl t="Giá nhập (₫)" /><CurrencyInput value={Number(editForm.giaNhap)} onChange={v => setEditForm(f => ({ ...f, giaNhap: v }))} style={IS} /></div>
                        <div><Lbl t="Giá vốn (₫)" /><CurrencyInput value={Number(editForm.giaVon ?? editForm.giaNhap ?? 0)} onChange={v => setEditForm(f => ({ ...f, giaVon: v }))} style={IS} /></div>
                        <div><Lbl t="Giá bán (₫)" /><CurrencyInput value={Number(editForm.giaBan)} onChange={v => setEditForm(f => ({ ...f, giaBan: v }))} style={IS} /></div>
                      </div>
                      <div><Lbl t="Thông số kỹ thuật" /><textarea rows={2} value={editForm.thongSoKyThuat} onChange={e => setEditForm(f => ({ ...f, thongSoKyThuat: e.target.value }))} style={{ ...IS, resize: "vertical" }} /></div>
                      <div><Lbl t="Ghi chú" /><textarea rows={2} value={editForm.ghiChu} onChange={e => setEditForm(f => ({ ...f, ghiChu: e.target.value }))} style={{ ...IS, resize: "vertical" }} /></div>
                    </div>
                  ) : (
                    <>
                      <Sec title="Thông tin chung" icon="bi-info-circle" />
                      <Row label="Đơn vị tính" value={displayItem.donVi} />
                      {displayItem.dinhMuc && (
                        <Row
                          label="Mã định mức"
                          value={
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <i className="bi bi-diagram-3" style={{ fontSize: 10, color: "#8b5cf6" }} />
                              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                                {displayItem.dinhMuc.code || "—"}
                              </span>
                              {displayItem.dinhMuc.tenDinhMuc && (
                                <span style={{ color: "var(--muted-foreground)", fontWeight: 400, fontSize: 11.5 }}>
                                  ({displayItem.dinhMuc.tenDinhMuc})
                                </span>
                              )}
                            </span>
                          }
                        />
                      )}
                      {displayItem.nhaCungCap && <Row label="Nhà cung cấp" value={displayItem.nhaCungCap} />}
                      {displayItem.loai && <Row label="Loại hàng" value={displayItem.loai} />}

                      <Sec title="Tồn kho theo kho" icon="bi-bar-chart" />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "9px 13px", borderRadius: 9, background: sc.bg }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>Tổng tồn toàn hệ thống</span>
                        <span style={{ fontSize: 17, fontWeight: 800, color: sc.color }}>
                          {stocksLoading ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <>{fmt(tongTon)} <span style={{ fontSize: 11 }}>{displayItem.donVi ?? ""}</span></>}
                        </span>
                      </div>
                      {stocks.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12.5, background: "var(--muted)", borderRadius: 9 }}>
                          <i className="bi bi-building-slash" style={{ fontSize: 20, display: "block", marginBottom: 5, opacity: 0.4 }} />Chưa phân bổ vào kho nào
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {stocks.map(st => {
                            const pct = tongTon > 0 ? (st.soLuong / tongTon) * 100 : 0;
                            const isLow = st.soLuongMin > 0 && st.soLuong <= st.soLuongMin;
                            const barColor = st.soLuong === 0 ? "#f43f5e" : isLow ? "#f59e0b" : "var(--primary)";
                            const viTri = [st.viTriHang && `H${st.viTriHang}`, st.viTriCot && `C${st.viTriCot}`, st.viTriTang && `T${st.viTriTang}`].filter(Boolean).join("-");
                            return (
                              <div key={st.id} style={{ padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <i className="bi bi-building" style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{st.warehouse.name}</span>
                                    {st.warehouse.code && <span style={{ fontSize: 10.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>({st.warehouse.code})</span>}
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: barColor }}>{fmt(st.soLuong)} <span style={{ fontSize: 10.5, fontWeight: 400 }}>{displayItem.donVi ?? ""}</span></span>
                                </div>
                                <div style={{ height: 4, borderRadius: 2, background: "var(--muted)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.4s" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                                  {viTri ? <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>📍 {viTri}</span> : <span />}
                                  <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{pct.toFixed(0)}% tổng tồn</span>
                                </div>
                                {isLow && <div style={{ marginTop: 4, fontSize: 10.5, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}><i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 10 }} />Sắp hết — tối thiểu: {fmt(st.soLuongMin)} {displayItem.donVi}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <Sec title="Giá" icon="bi-tag" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[
                          { label: "Giá nhập", value: fmtVnd(displayItem.giaNhap), color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                          { label: "Giá vốn", value: fmtVnd(displayItem.giaVon ?? displayItem.giaNhap), color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
                          { label: "Giá bán", value: fmtVnd(displayItem.giaBan), color: "#10b981", bg: "rgba(16,185,129,0.08)" }
                        ].map(c => (
                          <div key={c.label} style={{ padding: "9px 11px", borderRadius: 9, background: c.bg, border: `1px solid ${c.color}22` }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.color, textTransform: "uppercase" }}>{c.label}</p>
                            <p style={{ margin: "3px 0 0", fontSize: 13.5, fontWeight: 800, color: c.color }}>{c.value}</p>
                          </div>
                        ))}
                      </div>

                      {displayItem.thongSoKyThuat && (<><Sec title="Thông số kỹ thuật" icon="bi-cpu" /><div style={{ padding: "9px 11px", background: "var(--muted)", borderRadius: 8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{displayItem.thongSoKyThuat}</div></>)}
                      {displayItem.ghiChu && (<><Sec title="Ghi chú" icon="bi-chat-text" /><div style={{ padding: "9px 11px", background: "var(--muted)", borderRadius: 8, fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--muted-foreground)" }}>{displayItem.ghiChu}</div></>)}
                    </>
                  )}

                  {/* Nhập hàng inline */}
                  {!editMode && nhapMode && (
                    <div style={{ marginTop: 14, padding: "13px 14px", borderRadius: 11, border: "1.5px solid #10b98133", background: "rgba(16,185,129,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}><i className="bi bi-box-arrow-in-down" style={{ fontSize: 12, color: "#10b981" }} /><span style={{ fontWeight: 800, fontSize: 12.5, color: "#10b981" }}>Phân hàng vào kho</span></div>
                      <div><Lbl t="Kho nhập *" /><select value={nhapWh} onChange={e => setNhapWh(e.target.value)} style={{ ...IS, appearance: "none" }}><option value="">-- Chọn kho --</option>{whList.map(w => <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</option>)}</select></div>
                      <div><Lbl t={`Số lượng nhập${displayItem.donVi ? ` (${displayItem.donVi})` : ""}`} /><input type="number" min={1} value={nhapSL} onChange={e => setNhapSL(Math.max(1, Number(e.target.value)))} style={IS} /></div>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB BOM ── */}
              {activeTab === "bom" && (
                <div style={{ paddingTop: 12 }}>
                  {!bomMode ? (
                    <>
                      {/* View BOM */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>
                          {displayItem.dinhMuc ? `Định mức: ${displayItem.dinhMuc.tenDinhMuc || displayItem.dinhMuc.code || "Không tên"}` : "Chưa có định mức"}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          {displayItem.dinhMuc && (
                            <button onClick={() => setConfirmDelBom(true)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                              <i className="bi bi-trash3 me-1" />Xoá
                            </button>
                          )}
                          <button onClick={openBomEdit} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "var(--primary)", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                            <i className={`bi ${displayItem.dinhMuc ? "bi-pencil" : "bi-plus-lg"} me-1`} />{displayItem.dinhMuc ? "Sửa" : "Thêm mới"}
                          </button>
                        </div>
                      </div>

                      {displayItem.dinhMuc ? (
                        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                            <thead>
                              <tr style={{ background: "var(--muted)" }}>
                                {["Tên vật tư", "SL/đơn vị", "ĐVT", "Ghi chú"].map(h => (
                                  <th key={h} style={{ padding: "7px 10px", textAlign: h === "Tên vật tư" ? "left" : "center", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {displayItem.dinhMuc.vatTu.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12, fontStyle: "italic" }}>Chưa có vật tư</td></tr>
                              ) : displayItem.dinhMuc.vatTu.map((v, i) => (
                                <tr key={v.id} style={{ borderBottom: i < displayItem.dinhMuc!.vatTu.length - 1 ? "1px solid var(--border)" : undefined }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 600 }}>{v.tenVatTu}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center" }}>{v.soLuong}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--muted-foreground)" }}>{v.donViTinh ?? "—"}</td>
                                  <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 11.5, fontStyle: "italic" }}>{v.ghiChu ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                      ) : (
                        <div style={{ padding: "28px 16px", textAlign: "center", background: "var(--muted)", borderRadius: 10, color: "var(--muted-foreground)" }}>
                          <i className="bi bi-diagram-3" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.35 }} />
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Hàng hoá này chưa có định mức</p>
                          <p style={{ margin: "4px 0 0", fontSize: 12 }}>Nhấn "Thêm mới" để xây dựng định mức vật tư</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Edit BOM */
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div><Lbl t="Mã định mức" /><input value={bomCode} onChange={e => setBomCode(e.target.value)} placeholder="DM-SP-001" style={IS} /></div>
                        <div><Lbl t="Tên định mức" /><input value={bomName} onChange={e => setBomName(e.target.value)} placeholder="Mô tả..." style={IS} /></div>
                      </div>

                      {/* Danh sách vật tư */}
                      <div>
                        <Lbl t="Danh sách vật tư" />
                        <div style={{ border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: "var(--muted)" }}>
                                <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Tên vật tư</th>
                                <th style={{ padding: "6px 8px", textAlign: "center", width: 55, fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>SL</th>
                                <th style={{ padding: "6px 8px", textAlign: "center", width: 65, fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>ĐVT</th>
                                <th style={{ width: 28, borderBottom: "1px solid var(--border)" }} />
                              </tr>
                            </thead>
                            <tbody>
                              {bomVatTu.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: "14px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12, fontStyle: "italic" }}>Chưa có vật tư</td></tr>
                              ) : bomVatTu.map((v, i) => (
                                <tr key={v._id} style={{ borderTop: "1px solid var(--border)" }}>
                                  <td style={{ padding: "5px 8px" }}>
                                    <input value={v.tenVatTu} onChange={e => setBomVatTu(vts => vts.map((x, j) => j === i ? { ...x, tenVatTu: e.target.value } : x))} style={{ ...IS, padding: "4px 7px", fontSize: 12 }} />
                                  </td>
                                  <td style={{ padding: "5px 8px" }}>
                                    <input type="number" min={0.1} step={0.1} value={v.soLuong} onChange={e => setBomVatTu(vts => vts.map((x, j) => j === i ? { ...x, soLuong: Number(e.target.value) } : x))} style={{ ...IS, padding: "4px 7px", fontSize: 12, textAlign: "right" }} />
                                  </td>
                                  <td style={{ padding: "5px 8px" }}>
                                    <select value={v.donViTinh} onChange={e => setBomVatTu(vts => vts.map((x, j) => j === i ? { ...x, donViTinh: e.target.value } : x))} style={{ ...IS, padding: "4px 7px", fontSize: 12, appearance: "none" }}>
                                      {DVT.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                  </td>
                                  <td style={{ padding: "5px 4px", textAlign: "center" }}>
                                    <button onClick={() => setBomVatTu(vts => vts.filter((_, j) => j !== i))} style={{ width: 22, height: 22, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}>
                                      <i className="bi bi-trash" style={{ fontSize: 10 }} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Thêm vật tư mới */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px auto", gap: 6, alignItems: "end" }}>
                        <div><Lbl t="Tên vật tư" /><input value={newVt.tenVatTu} onChange={e => setNewVt(v => ({ ...v, tenVatTu: e.target.value }))} onKeyDown={e => e.key === "Enter" && addVatTu()} placeholder="Nhập tên vật tư..." style={IS} /></div>
                        <div><Lbl t="SL" /><input type="number" min={0.1} step={0.1} value={newVt.soLuong} onChange={e => setNewVt(v => ({ ...v, soLuong: Number(e.target.value) }))} style={IS} /></div>
                        <div><Lbl t="ĐVT" /><select value={newVt.donViTinh} onChange={e => setNewVt(v => ({ ...v, donViTinh: e.target.value }))} style={{ ...IS, appearance: "none" }}>{DVT.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <button onClick={addVatTu} style={{ padding: "7px 10px", border: "none", borderRadius: 8, background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>+ Thêm</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 7, flexShrink: 0 }}>
              {activeTab === "info" && (
                editMode ? (
                  <>
                    <button onClick={() => { setEditMode(false); setEditErrors({}); }} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Huỷ</button>
                    <button onClick={handleSaveEdit} disabled={editSaving} style={{ flex: 2, padding: "8px 0", border: "none", background: editSaving ? "var(--muted)" : "var(--primary)", color: editSaving ? "var(--muted-foreground)" : "#fff", fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: editSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      {editSaving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-check-lg" />}
                      {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </>
                ) : nhapMode ? (
                  <>
                    <button onClick={() => setNhapMode(false)} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Huỷ</button>
                    <button onClick={handleNhapHang} disabled={!nhapWh || nhapSL <= 0 || nhapSaving} style={{ flex: 2, padding: "8px 0", border: "none", background: !nhapWh || nhapSaving ? "var(--muted)" : "#10b981", color: !nhapWh || nhapSaving ? "var(--muted-foreground)" : "#fff", fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: !nhapWh || nhapSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      {nhapSaving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-check2-all" />}
                      {nhapSaving ? "Đang nhập..." : "Xác nhận nhập kho"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmDel(true)} style={{ width: 36, height: 36, border: "1.5px solid #f43f5e22", background: "rgba(244,63,94,0.06)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#f43f5e", flexShrink: 0 }} title="Xóa hàng hoá" onMouseEnter={e => e.currentTarget.style.background = "rgba(244,63,94,0.14)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(244,63,94,0.06)"}>
                      <i className="bi bi-trash" style={{ fontSize: 13 }} />
                    </button>
                    <button onClick={() => setNhapMode(true)} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <i className="bi bi-box-arrow-in-down" style={{ fontSize: 12 }} />Nhập hàng
                    </button>
                    <button onClick={openEditMode} style={{ flex: 1, padding: "8px 0", border: "none", background: "var(--primary)", color: "#fff", fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <i className="bi bi-pencil" style={{ fontSize: 11 }} />Chỉnh sửa
                    </button>
                  </>
                )
              )}

              {activeTab === "bom" && (
                bomMode ? (
                  <>
                    <button onClick={() => setBomMode(false)} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Huỷ</button>
                    <button onClick={saveBom} disabled={bomSaving} style={{ flex: 2, padding: "8px 0", border: "none", background: bomSaving ? "var(--muted)" : "var(--primary)", color: bomSaving ? "var(--muted-foreground)" : "#fff", fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: bomSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      {bomSaving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-check-lg" />}
                      {bomSaving ? "Đang lưu..." : "Lưu định mức"}
                    </button>
                  </>
                ) : (
                  <button onClick={onClose} style={{ flex: 1, padding: "8px 0", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Đóng</button>
                )
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog open={confirmDel} variant="danger" title={`Xóa "${item?.tenHang}"?`} message="Hàng hoá này sẽ bị xóa vĩnh viễn cùng toàn bộ dữ liệu tồn kho liên quan." confirmLabel="Xóa hàng hoá" loading={deleting} onConfirm={handleDelete} onCancel={() => setConfirmDel(false)} />
      <ConfirmDialog open={confirmDelBom} variant="danger" title="Xoá định mức?" message={`Toàn bộ định mức vật tư của "${item?.tenHang}" sẽ bị xóa.`} confirmLabel="Xoá định mức" onConfirm={deleteBom} onCancel={() => setConfirmDelBom(false)} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
