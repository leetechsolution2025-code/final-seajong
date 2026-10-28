"use client";
import React from "react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StockCountHeader {
  id:            string;
  soChungTu:     string | null;
  scope:         string;
  warehouseName: string | null;
  nguoiKiem:     string | null;
  ngayKiem:      string | null;
  ghiChu:        string | null;
  soLuongDong:   number;
  updatedAt:     string;
}

interface StockCountLine {
  id:              string;
  inventoryItemId: string;
  tenHang:         string;
  maSku?:          string | null;
  donVi?:          string | null;
  warehouseId:     string | null;
  soLuongHeTong:   number;
  soLuongThucTe:   number | null;
  chenh:           number | null;
  ghiChu:          string | null;
}

interface StockCountDetail extends StockCountHeader { lines: StockCountLine[]; }

export interface LichSuKiemKhoModalProps {
  warehouseId?:   string;
  warehouseName?: string;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
};
const fmtN = (n: number | null) => n != null ? n.toLocaleString("vi-VN") : "—";

// ── Component ─────────────────────────────────────────────────────────────────
export function LichSuKiemKhoModal({ warehouseId, warehouseName, onClose }: LichSuKiemKhoModalProps) {
  const [list,          setList]          = React.useState<StockCountHeader[]>([]);
  const [loading,       setLoading]       = React.useState(true);
  const [selectedId,    setSelectedId]    = React.useState("");
  const [detail,        setDetail]        = React.useState<StockCountDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [visible,       setVisible]       = React.useState(false);
  const [deleting,      setDeleting]      = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const toast = useToast();

  const executeDelete = async () => {
    if (!selectedId) return;
    setDeleting(true);
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/plan-finance/stock-counts/${selectedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi xoá phiếu");
      toast.success("Đã xoá phiếu kiểm kho", "");
      setDetail(null);
      setSelectedId("");
      
      // Reload list
      const params = new URLSearchParams({ trangThai: "hoan-thanh" });
      if (warehouseId) params.set("warehouseId", warehouseId);
      const listRes = await fetch(`/api/plan-finance/stock-counts?${params}`);
      const listData = await listRes.json();
      setList(Array.isArray(listData) ? listData : []);
    } catch (e) {
      toast.error("Lỗi", "Không thể xoá phiếu kiểm kho này");
    } finally {
      setDeleting(false);
    }
  };

  // Animate in
  React.useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  // Load list — chỉ lấy phiếu của kho đang chọn
  React.useEffect(() => {
    const params = new URLSearchParams({ trangThai: "hoan-thanh" });
    if (warehouseId) params.set("warehouseId", warehouseId);
    fetch(`/api/plan-finance/stock-counts?${params}`)
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [warehouseId]);

  // Load detail when selection changes
  React.useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setLoadingDetail(true);
    fetch(`/api/plan-finance/stock-counts/${selectedId}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  // ESC
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = React.useMemo(() => {
    if (!detail) return null;
    const counted = detail.lines.filter(l => l.soLuongThucTe != null);
    return {
      total:   detail.lines.length,
      counted: counted.length,
      match:   counted.filter(l => l.chenh === 0).length,
      under:   counted.filter(l => (l.chenh ?? 0) < 0).length,
      over:    counted.filter(l => (l.chenh ?? 0) > 0).length,
    };
  }, [detail]);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .lich-su-oc { transition: transform 0.27s cubic-bezier(.4,0,.2,1); }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0, zIndex: 5100,
        background: visible ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
        transition: "background 0.27s",
      }} />

      {/* Offcanvas */}
      <div className="app-custom-drawer" style={{
        position: "fixed", top: 0, right: 0, bottom: 0, minWidth: 400, maxWidth: 400,
        zIndex: 5200,
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-6px 0 28px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "13px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-clock-history" style={{ fontSize: 14, color: "#6366f1" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5 }}>Lịch sử kiểm kho</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
              {warehouseName ?? (warehouseId ? warehouseId : "Toàn bộ")} · {list.length} phiếu hoàn thành
            </p>
          </div>
          <button onClick={handleClose} style={{
            width: 28, height: 28, border: "1px solid var(--border)", background: "var(--muted)",
            borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", color: "var(--muted-foreground)",
          }}>
            <i className="bi bi-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ── Select phiếu ── */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--background)" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            Chọn phiếu kiểm kho
          </label>
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>
              <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", marginRight: 5 }} />Đang tải...
            </div>
          ) : list.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>Chưa có phiếu nào</div>
          ) : (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                width: "100%", padding: "8px 10px",
                border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--card)", color: "var(--foreground)",
                fontSize: 13, outline: "none", cursor: "pointer",
              }}
            >
              <option value="">— Chưa chọn —</option>
              {list.map(item => (
                <option key={item.id} value={item.id}>
                  {item.soChungTu ?? item.id} · {fmtDate(item.ngayKiem)} · {item.scope === "warehouse" ? (item.warehouseName ?? "Kho") : "Toàn HT"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Detail area ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!selectedId ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
              <i className="bi bi-arrow-up" style={{ fontSize: 20, display: "block", marginBottom: 8, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 12 }}>Chọn phiếu ở trên để xem kết quả</p>
            </div>
          ) : loadingDetail ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", marginRight: 5 }} />Đang tải...
            </div>
          ) : !detail ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Không tìm thấy dữ liệu</div>
          ) : (
            <>
              {/* KPI */}
              {stats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--background)" }}>
                  {[
                    { label: "Tổng",  val: stats.total,   color: "#6366f1" },
                    { label: "Kiểm",  val: stats.counted, color: "#0ea5e9" },
                    { label: "Khớp",  val: stats.match,   color: "#10b981" },
                    { label: "Thiếu", val: stats.under,   color: "#f43f5e" },
                    { label: "Thừa",  val: stats.over,    color: "#f59e0b" },
                  ].map(k => (
                    <div key={k.label} style={{ textAlign: "center", padding: "6px 3px", border: `1px solid ${k.color}22`, borderRadius: 7, background: `${k.color}08` }}>
                      <div style={{ fontSize: 9.5, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{k.label}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)", fontSize: 12, display: "flex", flexDirection: "column", gap: 3, background: "var(--card)" }}>
                <div><span style={{ color: "var(--muted-foreground)" }}>Kho: </span><strong>{detail.warehouseName ?? "Toàn hệ thống"}</strong></div>
                {detail.nguoiKiem && <div><span style={{ color: "var(--muted-foreground)" }}>Người kiểm: </span><strong>{detail.nguoiKiem}</strong></div>}
                {detail.ghiChu && <div><span style={{ color: "var(--muted-foreground)" }}>Ghi chú: </span>{detail.ghiChu}</div>}
              </div>

              {/* Lines */}
              {detail.lines.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Không có dữ liệu dòng</div>
              ) : detail.lines.map((line, idx) => {
                const notCounted = line.soLuongThucTe == null;
                const chenh      = line.chenh ?? 0;
                const st = notCounted ? { text: "Chưa kiểm", color: "#94a3b8" }
                         : chenh === 0 ? { text: "✅ Khớp",   color: "#10b981" }
                         : chenh <  0  ? { text: "📉 Thiếu",  color: "#f43f5e" }
                         :               { text: "📈 Thừa",   color: "#f59e0b" };
                return (
                  <div key={line.id} style={{
                    padding: "9px 16px", borderBottom: "1px solid var(--border)",
                    background: idx % 2 === 0 ? "var(--background)" : "var(--card)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {line.tenHang}
                        </div>
                        {line.maSku && <div style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>{line.maSku}</div>}
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: st.color, flexShrink: 0, marginLeft: 8 }}>{st.text}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                      <span>HT: <strong style={{ color: "var(--foreground)" }}>{fmtN(line.soLuongHeTong)}</strong>{line.donVi ? ` ${line.donVi}` : ""}</span>
                      <span>TK: <strong style={{ color: "var(--foreground)" }}>{notCounted ? "—" : fmtN(line.soLuongThucTe)}</strong></span>
                      {!notCounted && chenh !== 0 && (
                        <span style={{ color: st.color, fontWeight: 700 }}>{chenh > 0 ? "+" : ""}{fmtN(chenh)}</span>
                      )}
                    </div>
                    {line.ghiChu && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, fontStyle: "italic" }}>{line.ghiChu}</div>}
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        {/* Footer */}
        {selectedId && detail && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setConfirmDelete(true)} disabled={deleting} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", 
              border: "none", background: "#fef2f2", color: "#f43f5e", 
              fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: deleting ? "not-allowed" : "pointer",
              transition: "all 0.15s"
            }}>
              {deleting ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-trash3" />}
              Xoá phiếu
            </button>
          </div>
        )}
      </div>
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        variant="danger"
        title="Xoá phiếu kiểm kho"
        message={<p>Bạn có chắc chắn muốn xoá phiếu kiểm kho này không? Hành động này không thể hoàn tác.</p>}
        confirmLabel="Xoá phiếu"
        cancelLabel="Hủy"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
