import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ItemSuggestion {
  id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number;
}
interface OrderLine {
  id: string; item: ItemSuggestion | null; itemSearch: string;
  suggestions: ItemSuggestion[]; showSugg: boolean;
  soLuong: number; donGiaDK: number; ghiChu: string;
}
interface Supplier {
  id: string;
  name: string;
  code: string | null;
}

interface TaoDonMuaHangTrucTiepModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): OrderLine => ({
  id: uid(), item: null, itemSearch: "", suggestions: [], showSugg: false,
  soLuong: 1, donGiaDK: 0, ghiChu: "",
});

const CSS_INPUT: React.CSSProperties = {
  width: "100%", padding: "8px 11px", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 13, background: "var(--background)",
  color: "var(--foreground)", outline: "none", boxSizing: "border-box",
};
const CSS_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 700,
  color: "var(--muted-foreground)", marginBottom: 5,
};

// ── Component ─────────────────────────────────────────────────────────────────
export function TaoDonMuaHangTrucTiepModal({ onClose, onSaved }: TaoDonMuaHangTrucTiepModalProps) {
  const { data: session } = useSession();
  
  const [soDonHang, setSoDonHang] = useState("");
  const [ngayDat, setNgayDat] = useState(() => new Date().toISOString().slice(0,10));
  const [ngayNhan, setNgayNhan] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Generate Order code
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    fetch("/api/plan-finance/purchasing/next-code")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.nextCode) {
          setSoDonHang(data.nextCode);
        } else {
          setSoDonHang(`DH-${dateStr}-0001`);
        }
      })
      .catch(() => {
        setSoDonHang(`DH-${dateStr}-0001`);
      });
      
    // Fetch suppliers
    fetch("/api/plan-finance/suppliers?trangThai=active&limit=200")
      .then(r => r.json())
      .then(data => {
        if (data && data.items) {
          setSuppliers(data.items);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onItemSearch = (lineId: string, q: string) => {
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, itemSearch: q, showSugg: q.length > 0 } : l));
    clearTimeout(timers.current[lineId]);
    if (!q.trim()) return;
    timers.current[lineId] = setTimeout(async () => {
      try {
        const data: ItemSuggestion[] = await fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8`).then(r => r.json());
        setLines(ls => ls.map(l => l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l));
      } catch { /* ignore */ }
    }, 250);
  };
  
  const selectItem = (lineId: string, item: ItemSuggestion) =>
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, item, itemSearch: item.tenHang, suggestions: [], showSugg: false, donGiaDK: item.giaNhap } : l));
      
  const updateLine = <K extends keyof OrderLine>(lineId: string, key: K, val: OrderLine[K]) =>
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, [key]: val } : l));
    
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (id: string) => setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== id) : ls);

  const validLines = lines.filter(l => (l.item || l.itemSearch.trim()) && l.soLuong > 0);
  const tongTien = validLines.reduce((s, l) => s + l.soLuong * l.donGiaDK, 0);

  const handleSave = async () => {
    setError("");
    if (!supplierId) { setError("Vui lòng chọn nhà cung cấp"); return; }
    if (!validLines.length) { setError("Cần ít nhất 1 mặt hàng hợp lệ"); return; }

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
          trangThai: "draft",
          tongTien,
          daThanhToan: 0,
          ghiChu,
          items: validLines.map((l) => ({
            inventoryItemId: l.item?.id ?? null,
            tenHang: l.item?.tenHang ?? l.itemSearch,
            donVi: l.item?.donVi ?? null,
            soLuong: l.soLuong,
            donGia: l.donGiaDK,
            thanhTien: l.soLuong * l.donGiaDK,
            ghiChu: l.ghiChu || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Lỗi khi tạo đơn hàng, thử lại sau");
        return;
      }

      setSuccess(true);
      onSaved?.();
    } catch {
      setError("Không kết nối được server, vui lòng thử lại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 5100, display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>
      {/* ══ TOPBAR ══ */}
      <div style={{ flexShrink: 0, height: 56, borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, background: "var(--card)" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="bi bi-cart-plus" style={{ fontSize: 18, color: "#10b981" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>Tạo đơn mua hàng trực tiếp</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{soDonHang}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {success ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", background: "rgba(16,185,129,0.1)", borderRadius: 8, color: "#10b981", fontSize: 13, fontWeight: 700 }}>
              <i className="bi bi-check-circle-fill" /> Đã tạo thành công!
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 20px", border: "none", background: saving ? "var(--muted)" : "#10b981", color: saving ? "var(--muted-foreground)" : "#fff", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-send" />}
              Tạo đơn & Trình duyệt
            </button>
          )}
          <button onClick={onClose} style={{ width: 34, height: 34, borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* ══ CONTENT (Left + Right) ══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ── LEFT PANEL: Thông tin chung ────────────────────────────────── */}
        <div style={{ width: 340, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--card)", overflowY: "auto" }}>
          <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "var(--foreground)" }}>Thông tin đơn hàng</p>
          </div>
          
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={CSS_LABEL}>Nhà cung cấp <span style={{ color: "#f43f5e" }}>*</span></label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={CSS_INPUT}>
                <option value="">— Chọn Nhà cung cấp —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ""}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={CSS_LABEL}>Ngày đặt</label>
                <input type="date" value={ngayDat} onChange={e => setNgayDat(e.target.value)} style={CSS_INPUT} />
              </div>
              <div>
                <label style={CSS_LABEL}>Ngày nhận dự kiến</label>
                <input type="date" min={ngayDat} value={ngayNhan} onChange={e => setNgayNhan(e.target.value)} style={CSS_INPUT} />
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label style={CSS_LABEL}>Ghi chú</label>
              <textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="Ghi chú thêm về đơn hàng..." style={{ ...CSS_INPUT, resize: "none", flex: 1 }} />
            </div>
          </div>

          {tongTien > 0 && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", background: "rgba(16,185,129,0.06)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500 }}>Tổng giá trị đơn hàng</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#10b981" }}>
                {tongTien.toLocaleString("vi-VN")} ₫
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>{validLines.length} mặt hàng</p>
            </div>
          )}

          {error && (
            <div style={{ margin: "0 16px 14px", padding: "9px 12px", background: "rgba(244,63,94,0.08)", borderWidth: 1, borderStyle: "solid", borderColor: "rgba(244,63,94,0.25)", borderRadius: 8, fontSize: 12.5, color: "#f43f5e", display: "flex", alignItems: "flex-start", gap: 7 }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Danh sách mặt hàng ───────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flexShrink: 0, padding: "14px 24px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Danh sách mặt hàng</p>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>{lines.length} dòng</span>
          </div>

          <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "28px 1fr 70px 100px 160px 180px 32px", gap: 5, padding: "7px 20px", background: "var(--muted)", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>#</div>
            <div>Mặt hàng</div>
            <div style={{ textAlign: "center" }}>ĐVT</div>
            <div style={{ textAlign: "center" }}>Số lượng</div>
            <div style={{ textAlign: "right" }}>Đơn giá (₫)</div>
            <div style={{ textAlign: "right" }}>Thành tiền (₫)</div>
            <div />
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {lines.map((line, idx) => (
              <LineRow key={line.id} line={line} idx={idx}
                onItemSearch={q => onItemSearch(line.id, q)}
                onSelectItem={item => selectItem(line.id, item)}
                onUpdate={(k, v) => updateLine(line.id, k, v)}
                onRemove={() => removeLine(line.id)}
                canRemove={lines.length > 1}
              />
            ))}
          </div>

          <div style={{ flexShrink: 0, padding: "10px 20px", borderTop: "1px dashed var(--border)" }}>
            <button onClick={addLine}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#10b981"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderWidth: "1.5px", borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
              <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm mặt hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineRow({ line, idx, onItemSearch, onSelectItem, onUpdate, onRemove, canRemove }: {
  line: OrderLine; idx: number;
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate: <K extends keyof OrderLine>(key: K, val: OrderLine[K]) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const inp: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderWidth: 1, borderStyle: "solid",
    borderColor: "var(--border)", borderRadius: 6, fontSize: 12.5,
    background: "var(--background)", color: "var(--foreground)",
    outline: "none", boxSizing: "border-box",
  };

  const thanhTien = line.soLuong * line.donGiaDK;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1fr 70px 100px 160px 180px 32px",
      gap: 5, padding: "7px 20px",
      borderBottom: "1px solid var(--border)", alignItems: "center",
      background: idx % 2 !== 0 ? "color-mix(in srgb, var(--muted) 25%, transparent)" : "transparent",
    }}>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx+1}</div>

      <div style={{ position: "relative" }}>
        <input value={line.itemSearch} onChange={e => onItemSearch(e.target.value)}
          onFocus={() => { if (line.itemSearch) onUpdate("showSugg", true); }}
          placeholder="Tìm hàng hoá..."
          style={{ ...inp, paddingRight: line.item ? 26 : 8, borderColor: line.item ? "rgba(16,185,129,0.45)" : "var(--border)" }} />
        {line.item && <i className="bi bi-check-circle-fill" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#10b981", pointerEvents: "none" }} />}
        {line.showSugg && line.suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100%+3px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto" }}>
            {line.suggestions.map(s => (
              <div key={s.id} onClick={() => onSelectItem(s)}
                style={{ padding: "7px 11px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.tenHang}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.code ?? ""} · {s.donVi ?? ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{line.item?.donVi ?? "—"}</div>
      <input type="number" min={1} value={line.soLuong} onChange={e => onUpdate("soLuong", Math.max(1, parseFloat(e.target.value)||1))} style={{ ...inp, textAlign: "center" }} />
      <CurrencyInput value={line.donGiaDK} onChange={v => onUpdate("donGiaDK", v)} placeholder="Nhập giá" style={{ ...inp, textAlign: "right" }} />
      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: thanhTien > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
        {thanhTien > 0 ? thanhTien.toLocaleString("vi-VN") : "0"}
      </div>

      <button onClick={onRemove} disabled={!canRemove}
        onMouseEnter={e => { if (canRemove) e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        style={{ width: 26, height: 26, border: "none", background: "transparent", color: canRemove ? "#f43f5e" : "var(--border)", cursor: canRemove ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, transition: "background 0.15s" }}>
        <i className="bi bi-trash3" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}
