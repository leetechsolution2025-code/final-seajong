"use client";
import React from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

type CatOption = { label: string; value: string };

interface AddSupplierModalProps {
  /** Danh sách danh mục để chọn; nếu không truyền sẽ tự fetch */
  categories?: CatOption[];
  /** Danh mục được chọn sẵn khi mở modal (categoryId) */
  defaultCategoryId?: string;
  onClose: () => void;
  /** Callback nhận về { id, name } của NCC vừa tạo hoặc cập nhật */
  onSaved: (supplier: { id: string; name: string }) => void;
  /** ID nhà cung cấp cần chỉnh sửa (nếu có sẽ kích hoạt chế độ sửa) */
  supplierId?: string;
}

export function AddSupplierModal({
  categories: categoriesProp,
  defaultCategoryId,
  onClose,
  onSaved,
  supplierId,
}: AddSupplierModalProps) {
  const today = new Date().toLocaleDateString("vi-VN");

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  };

  const [categories, setCategories] = React.useState<CatOption[]>(categoriesProp ?? []);
  const [form, setForm] = React.useState({
    name: "", address: "", contactName: "", xungHo: "Anh",
    phone: "", email: "", hanMucNo: 0, ghiChu: "", trangThai: "active",
  });
  const [selectedCats, setSelectedCats] = React.useState<string[]>(
    defaultCategoryId ? [defaultCategoryId] : []
  );
  const [catOpen, setCatOpen] = React.useState(false);
  const [saving, setSaving]   = React.useState(false);
  const [error, setError]     = React.useState("");

  // Nếu không được truyền categories thì tự fetch từ API
  React.useEffect(() => {
    if (categoriesProp) return;
    fetch("/api/plan-finance/inventory/categories")
      .then(r => r.json())
      .then((cats: { id: string; name: string }[]) =>
        setCategories(cats.map(c => ({ label: c.name, value: c.id })))
      )
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch dữ liệu nhà cung cấp nếu ở chế độ Sửa
  React.useEffect(() => {
    if (!supplierId) return;
    fetch(`/api/plan-finance/suppliers/${supplierId}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.supplier) {
          const s = data.supplier;
          setForm({
            name: s.name || "",
            address: s.address || "",
            contactName: s.contactName || "",
            xungHo: s.xungHo || "Anh",
            phone: s.phone || "",
            email: s.email || "",
            hanMucNo: s.hanMucNo || 0,
            ghiChu: s.ghiChu || "",
            trangThai: s.trangThai || "active",
          });
          if (s.categories) {
            setSelectedCats(s.categories.map((c: any) => c.categoryId));
          }
        }
      })
      .catch(() => {});
  }, [supplierId]);

  // Đóng dropdown category khi click ngoài
  React.useEffect(() => {
    if (!catOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cat-dropdown]")) setCatOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [catOpen]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleCat = (val: string) =>
    setSelectedCats(cs => cs.includes(val) ? cs.filter(c => c !== val) : [...cs, val]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Tên nhà cung cấp không được để trống"); return; }
    setSaving(true); setError("");
    try {
      const url = supplierId ? `/api/plan-finance/suppliers/${supplierId}` : "/api/plan-finance/suppliers";
      const method = supplierId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), address: form.address || "",
          contactName: form.contactName || "", xungHo: form.xungHo || "Anh",
          phone: form.phone || "", email: form.email || "",
          hanMucNo: Number(form.hanMucNo) || 0,
          ghiChu: form.ghiChu || "", trangThai: form.trangThai || "active",
          categoryIds: selectedCats,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
      const created = await res.json();
      onSaved({ id: created.id, name: created.name });
    } catch(e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  // Đóng khi nhấn Escape
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 3000, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 3001, width: "min(540px, calc(100vw - 32px))",
        background: "var(--card)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "color-mix(in srgb, var(--primary) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={supplierId ? "bi bi-pencil-square" : "bi bi-person-plus-fill"} style={{ fontSize: 15, color: "var(--primary)" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>
            {supplierId ? "Cập nhật thông tin nhà cung cấp" : "Thêm nhà cung cấp mới"}
          </span>
          <button onClick={onClose} style={{ marginLeft: "auto", width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 17 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "calc(100vh - 180px)" }}>
          {error && <div style={{ padding: "8px 12px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8, fontSize: 13, color: "#f43f5e" }}>{error}</div>}

          {/* Danh mục */}
          <div data-cat-dropdown>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Danh mục cung cấp</label>
            <div style={{ position: "relative" }}>
              <div onClick={() => setCatOpen(v => !v)}
                style={{ ...inputSt, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 4, minHeight: 36, alignItems: "center" }}>
                {selectedCats.length === 0
                  ? <span style={{ color: "var(--muted-foreground)" }}>Chọn danh mục...</span>
                  : selectedCats.map(v => {
                      const lbl = categories.find(c => c.value === v)?.label ?? v;
                      return (
                        <span key={v} style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)", borderRadius: 6, padding: "1px 8px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                          {lbl}
                          <span onClick={e => { e.stopPropagation(); toggleCat(v); }} style={{ cursor: "pointer", opacity: 0.7, fontSize: 13 }}>×</span>
                        </span>
                      );
                    })
                }
                <i className="bi bi-chevron-down" style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }} />
              </div>
              {catOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 10, maxHeight: 180, overflowY: "auto" }}>
                  {categories.length === 0
                    ? <p style={{ padding: "10px 12px", margin: 0, color: "var(--muted-foreground)", fontSize: 13 }}>Chưa có danh mục nào</p>
                    : categories.map(c => (
                        <div key={c.value} onClick={() => toggleCat(c.value)}
                          style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, background: selectedCats.includes(c.value) ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent" }}>
                          <i className={`bi ${selectedCats.includes(c.value) ? "bi-check-square-fill" : "bi-square"}`} style={{ color: selectedCats.includes(c.value) ? "var(--primary)" : "var(--muted-foreground)", fontSize: 13 }} />
                          {c.label}
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Tên + Ngày tạo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Tên nhà cung cấp <span style={{ color: "#f43f5e" }}>*</span></label>
              <input value={form.name} onChange={set("name")} placeholder="Nhập tên đầy đủ"
                style={{ ...inputSt, borderColor: error && !form.name.trim() ? "#f43f5e" : "var(--border)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Ngày tạo</label>
              <input readOnly value={today} style={{ ...inputSt, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }} />
            </div>
          </div>

          {/* Địa chỉ */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Địa chỉ giao dịch</label>
            <input value={form.address} onChange={set("address")} placeholder="Nhập địa chỉ" style={inputSt} />
          </div>

          {/* Người liên hệ + Xưng hô + SĐT */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Người liên hệ</label>
              <input value={form.contactName} onChange={set("contactName")} placeholder="Tên người liên hệ" style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Xưng hô</label>
              <select value={form.xungHo} onChange={e => setForm(f => ({ ...f, xungHo: e.target.value }))} style={inputSt}>
                {["Anh","Chị","Ông","Bà","Anh/Chị"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Điện thoại</label>
              <input value={form.phone} onChange={set("phone")} placeholder="Nhập số điện thoại" style={inputSt} />
            </div>
          </div>

          {/* Email + Hạn mức nợ + Trạng thái */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="example@email.com" style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Hạn mức nợ (đ)</label>
              <CurrencyInput
                value={form.hanMucNo}
                onChange={v => setForm(f => ({ ...f, hanMucNo: v }))}
                placeholder="0"
                style={inputSt}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 5 }}>Trạng thái</label>
              <select value={form.trangThai} onChange={e => setForm(f => ({ ...f, trangThai: e.target.value }))} style={inputSt}>
                <option value="active">Đang hoạt động</option>
                <option value="paused">Tạm ngừng</option>
                <option value="inactive">Dừng hợp tác</option>
              </select>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", display: "block", marginBottom: 5 }}>Ghi chú</label>
            <textarea value={form.ghiChu} onChange={set("ghiChu")} placeholder="Thông tin thêm..." rows={3}
              style={{ ...inputSt, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "8px 22px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer" }}>Huỷ</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 22px", border: "none", background: saving ? "var(--muted)" : "var(--primary)", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            {saving && <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />}
            {supplierId ? "Cập nhật nhà cung cấp" : "Lưu nhà cung cấp"}
          </button>
        </div>
      </div>
    </>
  );
}
