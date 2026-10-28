"use client";
import React from "react";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { AddSupplierModal } from "@/components/plan-finance/mua_hang/AddSupplierModal";
import { genDocCode } from "@/lib/genDocCode";

// ── Constants ─────────────────────────────────────────────────────────────────
export const DVT_OPTIONS = ["Cái","Chiếc","Bộ","Cuộn","Tấm","Thanh","Kg","Tấn","m","m²","m³","Hộp","Thùng","Lít"];

type MaterialRow = { id: number; ten: string; sl: number; dvt: string };

const DEFAULT_FORM = {
  code: "", tenHang: "", categoryId: "", donVi: "",
  soLuong: 0, soLuongMin: 0, giaNhap: 0, giaVon: 0, giaBan: 0,
  thongSoKyThuat: "", ghiChu: "", trangThai: "con-hang", nhaCungCapId: "",
};

// ── Helper ────────────────────────────────────────────────────────────────────
function soTiengViet(n: number): string {
  if (n <= 0) return "Không đồng";
  n = Math.round(n);
  const parts: string[] = [];
  const ty = Math.floor(n / 1_000_000_000);
  const tr = Math.floor((n % 1_000_000_000) / 1_000_000);
  const ng = Math.floor((n % 1_000_000) / 1_000);
  const dv = n % 1_000;
  if (ty > 0) parts.push(`${ty.toLocaleString("vi-VN")} tỷ`);
  if (tr > 0) parts.push(`${tr} triệu`);
  if (ng > 0) parts.push(`${ng} nghìn`);
  if (dv > 0) parts.push(`${dv}`);
  return parts.join(" ") + " đồng";
}

// ── Price Calculator Modal ─────────────────────────────────────────────────────
function PriceCalcModal({ open, onClose, giaNhap, tenHang, onApply }: {
  open: boolean; onClose: () => void;
  giaNhap: number; tenHang: string;
  onApply: (price: number) => void;
}) {
  const [method, setMethod] = React.useState<"cost-plus"|"target-margin">("cost-plus");
  const [chiPhiKhac, setChiPhiKhac] = React.useState(0);
  const [bienLoiNhuan, setBienLoiNhuan] = React.useState(20);

  React.useEffect(() => {
    if (open) { setMethod("cost-plus"); setChiPhiKhac(0); setBienLoiNhuan(20); }
  }, [open]);

  const tongChiPhi = giaNhap + chiPhiKhac;
  const giaBanDeXuat = method === "cost-plus"
    ? tongChiPhi * (1 + bienLoiNhuan / 100)
    : bienLoiNhuan >= 100 ? 0 : tongChiPhi / (1 - bienLoiNhuan / 100);

  const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");
  const IS: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
  };

  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 3000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 3001, width: "min(480px, calc(100vw - 32px))", background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-calculator" style={{ fontSize: 15, color: "#3b82f6" }} />
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Công cụ tính toán giá bán</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 16 }} />
          </button>
        </div>
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "9px 13px", background: "var(--muted)", borderRadius: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: "var(--foreground)" }}>Sản phẩm: </span>
            <span style={{ color: "var(--muted-foreground)" }}>{tenHang || "Sản phẩm mới"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {([
              { val: "cost-plus",     label: "Phương pháp cộng chi phí" },
              { val: "target-margin", label: "Phương pháp theo biên lợi nhuận mục tiêu" },
            ] as { val: "cost-plus"|"target-margin"; label: string }[]).map(opt => (
              <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "var(--foreground)" }}>
                <input type="radio" name="calcMethod" value={opt.val} checked={method === opt.val} onChange={() => setMethod(opt.val)} style={{ accentColor: "#3b82f6", width: 15, height: 15, cursor: "pointer" }} />
                {opt.label}
              </label>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Giá nhập hàng (đ)</label>
              <input type="number" value={giaNhap} readOnly style={{ ...IS, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Các chi phí khác (đ)</label>
              <input type="number" min={0} value={chiPhiKhac} onChange={e => setChiPhiKhac(Number(e.target.value))} style={IS} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Biên lợi nhuận (%)</label>
              <input type="number" min={0} max={99} value={bienLoiNhuan} onChange={e => setBienLoiNhuan(Number(e.target.value))} style={IS} />
            </div>
          </div>
          <div style={{ padding: "14px 16px", background: "var(--muted)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Tổng chi phí vốn:</span>
              <span style={{ fontWeight: 700 }}>{fmt(tongChiPhi)} đ</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)" }}>Giá bán đề xuất:</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: "#3b82f6" }}>{fmt(giaBanDeXuat)} đ</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted-foreground)", textAlign: "right", fontStyle: "italic" }}>(Bằng chữ: {soTiengViet(giaBanDeXuat)})</p>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Hủy</button>
          <button onClick={() => { onApply(Math.round(giaBanDeXuat)); onClose(); }} style={{ padding: "8px 22px", border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-check-lg" />Áp dụng giá
          </button>
        </div>
      </div>
    </>
  );
}

// ── TaoMoiHangHoa ─────────────────────────────────────────────────────────────
export function TaoMoiHangHoa({ open, onClose, onSaved, editItem }: {
  open: boolean; onClose: () => void; onSaved: () => void; editItem?: any;
}) {
  const toast = useToast();
  const [tab, setTab]         = React.useState<"info"|"standard">("info");
  const [form, setForm]       = React.useState({ ...DEFAULT_FORM });
  const [saving, setSaving]   = React.useState(false);
  const [errors, setErrors]   = React.useState<Record<string,string>>({});
  const [categories, setCategories] = React.useState<{id:string;name:string;code?:string|null}[]>([]);
  const [maDinhMuc, setMaDinhMuc] = React.useState("");
  const [materials, setMaterials] = React.useState<MaterialRow[]>([]);
  const [newMat, setNewMat] = React.useState({ ten: "", sl: 1, dvt: "Kg" });
  const matId = React.useRef(1);
  const [quickCatName, setQuickCatName] = React.useState("");
  const [addingCat, setAddingCat]       = React.useState(false);
  const [savingCat, setSavingCat]       = React.useState(false);
  const [suppliers, setSuppliers]       = React.useState<{id:string;name:string}[]>([]);
  const [suppliersLoading, setSuppliersLoading] = React.useState(false);
  const [calcOpen, setCalcOpen]                 = React.useState(false);
  const [addSupplierOpen, setAddSupplierOpen]   = React.useState(false);

  // ── Autocomplete vật tư ──────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = React.useState<{id:string;tenHang:string;donVi:string|null}[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const suggestRef = React.useRef<HTMLDivElement>(null);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchInventory = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(() => {
      fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8`)
        .then(r => r.json())
        .then(d => setSuggestions(Array.isArray(d) ? d : (d.items ?? [])))
        .catch(() => setSuggestions([]));
    }, 200);
  };

  // Đóng dropdown khi click ra ngoài
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setForm({ ...DEFAULT_FORM });
    setTab("info");
    setErrors({});
    setMaterials([]);
    setMaDinhMuc("");
    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [open]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.tenHang.trim()) e.tenHang = "Bắt buộc";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { setTab("info"); return; }
    setSaving(true);
    try {
      const isEdit = !!editItem;
      const url = isEdit ? `/api/plan-finance/inventory/${editItem.id}` : "/api/plan-finance/inventory";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code:           form.code          || undefined,
          tenHang:        form.tenHang.trim(),
          categoryId:     form.categoryId    || undefined,
          donVi:          form.donVi         || undefined,
          soLuong:        Number(form.soLuong),
          soLuongMin:     Number(form.soLuongMin),
          giaNhap:        Number(form.giaNhap),
          giaVon:         Number(form.giaVon || form.giaNhap),
          giaBan:         Number(form.giaBan),
          nhaCungCap:     form.ghiChu        || undefined,
          thongSoKyThuat: form.thongSoKyThuat || undefined,
          // Định mức
          ...(materials.length > 0 ? {
            dinhMuc: {
              code: maDinhMuc || undefined,
              vatTu: materials.map(m => ({ tenVatTu: m.ten, soLuong: m.sl, donViTinh: m.dvt })),
            },
          } : {}),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
      toast.success(isEdit ? "Cập nhật thành công" : "Thêm thành công", `Hàng hoá "${form.tenHang}" đã được lưu.`);
      onSaved();
      onClose();
    } catch(e) {
      setErrors({ _: e instanceof Error ? e.message : "Lỗi không xác định" });
    } finally { setSaving(false); }
  };

  const addMaterial = () => {
    if (!newMat.ten.trim()) return;
    setMaterials(m => [...m, { id: matId.current++, ...newMat }]);
    setNewMat({ ten: "", sl: 1, dvt: "Kg" });
  };

  const generateSKU = React.useCallback((catCode?: string) => {
    const prefix = catCode?.trim() || "HH";
    const now    = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const ts4 = String(Date.now()).slice(-4);
    const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand4 = Array.from({ length: 4 }, () => pool[Math.floor(Math.random() * pool.length)]).join("");
    return `${prefix}-${yy}${mm}${dd}-${ts4}-${rand4}`;
  }, []);

  React.useEffect(() => {
    if (editItem) return;
    const cat = categories.find(c => c.id === form.categoryId);
    setForm(f => ({ ...f, code: generateSKU(cat?.code ?? undefined) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId, categories, editItem]);

  React.useEffect(() => {
    if (!open) return;
    setSuppliers([]);
    if (editItem) {
      setForm({
        code: editItem.code || "",
        tenHang: editItem.tenHang || "",
        categoryId: editItem.categoryId || "",
        donVi: editItem.donVi || "",
        soLuong: editItem.soLuong || 0,
        soLuongMin: editItem.soLuongMin || 0,
        giaNhap: editItem.giaNhap || 0,
        giaVon: editItem.giaVon || editItem.giaNhap || 0,
        giaBan: editItem.giaBan || 0,
        thongSoKyThuat: editItem.thongSoKyThuat || editItem.spec || "",
        ghiChu: editItem.ghiChu || editItem.supplier || editItem.nhaCungCap || "",
        trangThai: editItem.trangThai || "con-hang",
        nhaCungCapId: editItem.nhaCungCapId || "",
      });
      setTab("info");
      setErrors({});
      // Note: mapping existing materials would require parsing editItem.dinhMuc
    } else {
      setForm({ ...DEFAULT_FORM, nhaCungCapId: "" });
    }
    if (!form.categoryId && !editItem?.categoryId) return;
    const catIdToFetch = editItem?.categoryId || form.categoryId;
    setSuppliersLoading(true);
    fetch(`/api/plan-finance/suppliers?categoryId=${catIdToFetch}&page=1`)
      .then(r => r.json())
      .then(d => setSuppliers((d.items ?? []).map((s: {id:string;name:string}) => ({ id: s.id, name: s.name }))))
      .catch(() => setSuppliers([]))
      .finally(() => setSuppliersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId, open]);

  const createCategory = async () => {
    if (!quickCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch("/api/plan-finance/inventory/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickCatName.trim() }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories(cs => [...cs, newCat]);
        setForm(f => ({ ...f, categoryId: newCat.id }));
        setQuickCatName("");
        setAddingCat(false);
      }
    } finally { setSavingCat(false); }
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
    transition: "border-color 0.15s",
  };
  const FLabel = ({ text, req }: { text: string; req?: boolean }) => (
    <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
      {text}{req && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
    </label>
  );
  const onFocus = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--primary)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = errors[e.currentTarget.name] ? "#f43f5e" : "var(--border)");

  const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`;

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 2001, width: "min(620px, calc(100vw - 32px))", height: "min(660px, calc(100vh - 40px))", background: "var(--card)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-plus-circle" style={{ fontSize: 15, color: "var(--primary)" }} />
            </div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>{editItem ? "Cập nhật hàng hoá" : "Thêm hàng hoá mới"}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: "12px 20px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 0, flexShrink: 0 }}>
          {(["info","standard"] as const).map((t, i) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: tab === t ? "var(--primary)" : "var(--muted)", color: tab === t ? "#fff" : "var(--muted-foreground)", borderRadius: i === 0 ? "8px 0 0 8px" : "0 8px 8px 0", transition: "all 0.15s" }}>
              {i === 0 ? "Thông tin hàng hoá" : "Xây dựng định mức"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {errors._ && <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, fontSize: 13, color: "#f43f5e" }}>{errors._}</div>}

          {tab === "info" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Mã SKU + Danh mục */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <FLabel text="Mã SKU" />
                  <div style={{ position: "relative" }}>
                    <input name="code" value={form.code} readOnly style={{ ...inputSt, paddingRight: 34, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }} />
                    <i className="bi bi-lock-fill" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--muted-foreground)", pointerEvents: "none" }} />
                  </div>
                </div>
                <div>
                  <FLabel text="Danh mục" req />
                  <div style={{ display: "flex" }}>
                    <select name="categoryId" value={form.categoryId} onChange={set("categoryId")}
                      style={{ ...inputSt, flex: 1, appearance: "none", borderRadius: "8px 0 0 8px", borderRight: "none", backgroundImage: SELECT_ARROW, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                      onFocus={onFocus} onBlur={onBlur}>
                      <option value="">Chọn danh mục</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" title="Thêm danh mục mới" onClick={() => setAddingCat(v => !v)}
                      style={{ flexShrink: 0, width: 34, height: 34, border: "1px solid var(--border)", borderRadius: "0 8px 8px 0", background: addingCat ? "var(--primary)" : "var(--muted)", color: addingCat ? "#fff" : "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                      <i className="bi bi-plus-lg" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                  {addingCat && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <input autoFocus value={quickCatName} onChange={e => setQuickCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") { setAddingCat(false); setQuickCatName(""); } }}
                        placeholder="Tên danh mục mới..." style={{ ...inputSt, flex: 1 }} />
                      <button type="button" onClick={createCategory} disabled={savingCat}
                        style={{ flexShrink: 0, padding: "6px 12px", border: "none", borderRadius: 8, background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: savingCat ? "not-allowed" : "pointer" }}>
                        {savingCat ? "..." : "Lưu"}
                      </button>
                      <button type="button" onClick={() => { setAddingCat(false); setQuickCatName(""); }}
                        style={{ flexShrink: 0, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--muted-foreground)", fontSize: 12, cursor: "pointer" }}>
                        Huỷ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tên + ĐVT */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
                <div>
                  <FLabel text="Tên sản phẩm" req />
                  <input name="tenHang" value={form.tenHang} onChange={set("tenHang")} placeholder="Nhập tên hàng hoá"
                    style={{ ...inputSt, borderColor: errors.tenHang ? "#f43f5e" : "var(--border)" }} onFocus={onFocus} onBlur={onBlur} />
                  {errors.tenHang && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#f43f5e" }}>{errors.tenHang}</p>}
                </div>
                <div>
                  <FLabel text="Đơn vị tính" />
                  <select name="donVi" value={form.donVi} onChange={set("donVi")}
                    style={{ ...inputSt, appearance: "none", backgroundImage: SELECT_ARROW, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                    <option value="">Chọn</option>
                    {DVT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Số lượng + Giá */}
              <div style={{ display: "grid", gridTemplateColumns: "75px 75px 1fr 1fr 1fr 34px", gap: 8, alignItems: "end" }}>
                {([{ k: "soLuong", label: "Tồn đầu" }, { k: "soLuongMin", label: "Tồn tối thiểu" }] as { k: keyof typeof form; label: string }[]).map(({ k, label }) => (
                  <div key={k}>
                    <FLabel text={label} />
                    <input type="number" min={0} name={k} value={form[k] as number} onChange={set(k)} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                ))}
                <div>
                  <FLabel text="Giá nhập (₫)" />
                  <CurrencyInput name="giaNhap" value={Number(form.giaNhap)} onChange={v => setForm(f => ({ ...f, giaNhap: v, ...(!editItem ? { giaVon: v } : {}) }))} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <FLabel text="Giá vốn (₫)" />
                  <CurrencyInput name="giaVon" value={Number(form.giaVon || form.giaNhap)} onChange={v => setForm(f => ({ ...f, giaVon: v }))} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <FLabel text="Giá bán (₫)" />
                  <CurrencyInput name="giaBan" value={Number(form.giaBan)} onChange={v => setForm(f => ({ ...f, giaBan: v }))} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <button type="button" title="Tính giá bán" onClick={() => setCalcOpen(true)}
                  style={{ width: 34, height: 34, flexShrink: 0, border: "1px solid var(--border)", borderRadius: 8, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                  <i className="bi bi-calculator" style={{ fontSize: 14 }} />
                </button>
              </div>

              {/* Thông số kỹ thuật */}
              <div>
                <FLabel text="Thông số kỹ thuật" />
                <textarea rows={3} name="thongSoKyThuat" value={form.thongSoKyThuat} onChange={set("thongSoKyThuat")}
                  placeholder="Nhập các thông số kỹ thuật chính..."
                  style={{ ...inputSt, resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {/* Nhà cung cấp + Nút định mức */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                <div>
                  <FLabel text="Nhà cung cấp" />
                  <div style={{ display: "flex" }}>
                    <select name="nhaCungCapId" value={form.nhaCungCapId} onChange={set("nhaCungCapId")}
                      disabled={!form.categoryId || suppliersLoading}
                      style={{ ...inputSt, flex: 1, appearance: "none", borderRadius: "8px 0 0 8px", borderRight: "none", backgroundImage: SELECT_ARROW, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", opacity: !form.categoryId ? 0.5 : 1 }}
                      onFocus={onFocus} onBlur={onBlur}>
                      <option value="">{suppliersLoading ? "Đang tải..." : !form.categoryId ? "Chọn danh mục trước" : suppliers.length === 0 ? "Không có NCC phù hợp" : "Chọn nhà cung cấp"}</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" title="Thêm nhà cung cấp mới" onClick={() => setAddSupplierOpen(true)}
                      style={{ flexShrink: 0, width: 34, height: 34, border: "1px solid var(--border)", borderRadius: "0 8px 8px 0", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--primary)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                      <i className="bi bi-plus-lg" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </div>
                <button onClick={() => setTab("standard")}
                  style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", padding: "8px 14px", border: "1.5px solid var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", transition: "background 0.15s", alignSelf: "end" }}
                  onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 14%, transparent)"}
                  onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"}>
                  <i className="bi bi-diagram-3" style={{ fontSize: 13 }} />Xây dựng định mức
                </button>
              </div>
            </div>
          ) : (
            /* Định mức tab */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <FLabel text="Mã định mức" />
                <input value={maDinhMuc} onChange={e => setMaDinhMuc(e.target.value)} placeholder="VD: DM-SP-001" style={inputSt} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Tên vật tư</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", width: 70 }}>SL</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 11.5, color: "var(--muted-foreground)", textTransform: "uppercase", width: 80 }}>ĐVT</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {materials.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: "24px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic" }}>Chưa có vật tư nào được thêm</td></tr>
                    ) : materials.map(m => (
                      <tr key={m.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "7px 12px" }}>{m.ten}</td>
                        <td style={{ padding: "7px 12px", textAlign: "center" }}>{m.sl}</td>
                        <td style={{ padding: "7px 12px", textAlign: "center", color: "var(--muted-foreground)" }}>{m.dvt}</td>
                        <td style={{ padding: "7px 6px", textAlign: "center" }}>
                          <button onClick={() => setMaterials(ms => ms.filter(x => x.id !== m.id))}
                            style={{ width: 24, height: 24, border: "none", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#f43f5e"; e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}>
                            <i className="bi bi-trash" style={{ fontSize: 11 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Form thêm vật tư — chỉ hiện tab standard */}
        {tab === "standard" && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 70px 110px auto", gap: 8, alignItems: "end", flexShrink: 0 }}>
            <div ref={suggestRef} style={{ position: "relative" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>Tên vật tư</label>
              <input
                value={newMat.ten}
                onChange={e => {
                  const v = e.target.value;
                  setNewMat(n => ({ ...n, ten: v }));
                  searchInventory(v);
                  setShowSuggestions(true);
                }}
                onFocus={() => { if (newMat.ten) setShowSuggestions(true); }}
                placeholder="Nhập hoặc chọn tên vật tư..."
                onKeyDown={e => {
                  if (e.key === "Enter") { setShowSuggestions(false); addMaterial(); }
                  if (e.key === "Escape") setShowSuggestions(false);
                }}
                style={inputSt}
                autoComplete="off"
              />
              {/* Dropdown suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  maxHeight: 220, overflowY: "auto", marginTop: 4,
                }}>
                  {suggestions.map(s => (
                    <div
                      key={s.id}
                      onMouseDown={e => {
                        e.preventDefault();
                        setNewMat(n => ({ ...n, ten: s.tenHang, dvt: s.donVi ?? n.dvt }));
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      style={{
                        padding: "8px 12px", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <i className="bi bi-box-seam" style={{ fontSize: 11, color: "var(--primary)", opacity: 0.7 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{s.tenHang}</span>
                      </div>
                      {s.donVi && (
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", padding: "2px 7px", borderRadius: 5 }}>{s.donVi}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>SL</label>
              <input type="number" min={1} value={newMat.sl} onChange={e => setNewMat(n => ({ ...n, sl: Number(e.target.value) }))} style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>ĐVT</label>
              <select value={newMat.dvt} onChange={e => setNewMat(n => ({ ...n, dvt: e.target.value }))}
                style={{ ...inputSt, appearance: "none", backgroundImage: SELECT_ARROW, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
                {DVT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button onClick={addMaterial} style={{ padding: "8px 16px", border: "none", background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
              <i className="bi bi-plus-lg" style={{ marginRight: 4 }} />Thêm
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 20px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Huỷ</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 22px", border: "none", background: saving ? "var(--muted)" : "var(--primary)", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, transition: "background 0.15s" }}>
            {saving && <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />}
            Lưu hàng hoá
          </button>
        </div>
      </div>

      <PriceCalcModal open={calcOpen} onClose={() => setCalcOpen(false)} giaNhap={Number(form.giaNhap)} tenHang={form.tenHang} onApply={(price) => setForm(f => ({ ...f, giaBan: price }))} />

      {addSupplierOpen && (
        <AddSupplierModal
          defaultCategoryId={form.categoryId || undefined}
          onClose={() => setAddSupplierOpen(false)}
          onSaved={(newSup) => {
            setSuppliers(ss => [...ss, { id: newSup.id, name: newSup.name }]);
            setForm(f => ({ ...f, nhaCungCapId: newSup.id }));
            setAddSupplierOpen(false);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
