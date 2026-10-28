"use client";
import React from "react";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface XNTLine {
  maSku:      string | null;
  tenHang:    string;
  donVi:      string | null;
  tonDauSL:   number;
  tonDauTT:   number;
  nhapSL:     number;
  nhapTT:     number;
  xuatSL:     number;
  xuatTT:     number;
  tonCuoiSL:  number;
  tonCuoiTT:  number;
}

interface CompanyInfo {
  name: string; address: string | null; phone: string | null;
  email: string | null; logoUrl: string | null;
}

interface Props {
  warehouseId:   string;
  warehouseName: string;
  onClose:       () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN = (n: number) => n !== 0 ? n.toLocaleString("vi-VN") : "0,00";
const fmtVnd = (n: number) => n !== 0 ? n.toLocaleString("vi-VN") : "0,00";
const fmtDate = (iso: string) => { const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };
const B1  = "1px solid #000";
const B05 = "1px solid #999";

// ── Component ─────────────────────────────────────────────────────────────────
export function BangKeXuatNhapTonModal({ warehouseId, warehouseName, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [company, setCompany] = React.useState<CompanyInfo | null>(null);
  const [from,    setFrom]    = React.useState(firstOfMonth);
  const [to,      setTo]      = React.useState(today);
  const [lines,   setLines]   = React.useState<XNTLine[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [warehouseAddr, setWarehouseAddr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => setCompany(d)).catch(() => {});
    fetch(`/api/plan-finance/warehouses/${warehouseId}`)
      .then(r => r.json()).then(d => setWarehouseAddr(d?.address ?? null)).catch(() => {});
  }, [warehouseId]);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/plan-finance/reports/bang-ke-xnt?warehouseId=${warehouseId}&from=${from}&to=${to}`)
      .then(r => r.json()).then(d => setLines(Array.isArray(d) ? d : []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [warehouseId, from, to]);

  React.useEffect(() => { load(); }, [load]);

  // Totals
  const tot = React.useMemo(() => ({
    tonDauSL:  lines.reduce((s, l) => s + l.tonDauSL,  0),
    tonDauTT:  lines.reduce((s, l) => s + l.tonDauTT,  0),
    nhapSL:    lines.reduce((s, l) => s + l.nhapSL,    0),
    nhapTT:    lines.reduce((s, l) => s + l.nhapTT,    0),
    xuatSL:    lines.reduce((s, l) => s + l.xuatSL,    0),
    xuatTT:    lines.reduce((s, l) => s + l.xuatTT,    0),
    tonCuoiSL: lines.reduce((s, l) => s + l.tonCuoiSL, 0),
    tonCuoiTT: lines.reduce((s, l) => s + l.tonCuoiTT, 0),
  }), [lines]);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", padding: "7px 9px", border: "1px solid #e2e8f0",
    borderRadius: 6, background: "#f8fafc", color: "#0f172a",
    fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit",
  };
  const SLabel = ({ children }: { children: React.ReactNode }) => (
    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</p>
  );

  const sidebar = (
    <>
      <div><SLabel>Từ ngày</SLabel>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
      </div>
      <div><SLabel>Đến ngày</SLabel>
        <input type="date" value={to}   onChange={e => setTo(e.target.value)}   style={inp} />
      </div>
      <button onClick={load} disabled={loading}
        style={{ padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
        <i className="bi bi-arrow-clockwise" /> {loading ? "Đang tải..." : "Tải lại"}
      </button>
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 12, color: "#475569" }}>
        <p style={{ margin: 0 }}><b>{lines.length}</b> mặt hàng</p>
      </div>
    </>
  );

  // ── Document ───────────────────────────────────────────────────────────────
  const thCss = (w?: number): React.CSSProperties => ({
    border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700,
    fontSize: 11.5, verticalAlign: "middle", ...(w ? { width: w } : {}),
  });
  const tdCss = (align: "left" | "center" | "right" = "left"): React.CSSProperties => ({
    border: B1, padding: "4px 5px", fontSize: 12, textAlign: align, verticalAlign: "middle",
  });

  const doc = (
    <div className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed','Arial Narrow',Arial,sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={company.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ width: 56, height: 56, border: "1px solid #ccc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>LOGO</div>
          }
          <div style={{ fontSize: 11 }}>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", lineHeight: 1.3 }}>{company?.name ?? "—"}</p>
            {company?.address && <p style={{ margin: "0 0 1px" }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0 }}>SĐT: {company?.phone ?? "—"}{company?.email ? ` - Email: ${company.email}` : ""}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu số S09-DN</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Theo TT 133/2016/TT-BTC)</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Bảng kê nhập - xuất - tồn hàng hoá
        </p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>
          Từ ngày {fmtDate(from)} đến ngày {fmtDate(to)}
        </p>
        <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 12 }}>
          Kho hàng: {warehouseName}
          {warehouseAddr ? <span style={{ fontWeight: 400 }}> &nbsp;|&nbsp; Địa điểm: {warehouseAddr}</span> : ""}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, textAlign: "right" }}>Tiền tệ: VND</p>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={thCss(70)}>Mã vật tư</th>
            <th rowSpan={2} style={thCss()}>Sản phẩm</th>
            <th rowSpan={2} style={thCss(38)}>ĐVT</th>
            <th colSpan={2} style={thCss()}>Số dư đầu kỳ</th>
            <th colSpan={2} style={thCss()}>Nhập trong kỳ</th>
            <th colSpan={2} style={thCss()}>Xuất trong kỳ</th>
            <th colSpan={2} style={thCss()}>Tồn cuối kỳ</th>
          </tr>
          <tr>
            {["Số lượng","Thành tiền","Số lượng","Thành tiền","Số lượng","Thành tiền","Số lượng","Thành tiền"].map((h, i) => (
              <th key={i} style={thCss(72)}>{h}</th>
            ))}
          </tr>
          <tr style={{ fontStyle: "italic" }}>
            {["A","B","C","(1)","(2)","(3)","(4)","(5)","(6)","(7)","(8)"].map(c => (
              <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 11 }}>{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={11} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Đang tải...</td></tr>
          ) : lines.length === 0 ? (
            <tr><td colSpan={11} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Không có dữ liệu trong kỳ</td></tr>
          ) : lines.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
              <td style={tdCss("center")}>{l.maSku ?? ""}</td>
              <td style={tdCss()}><span style={{ fontWeight: 600 }}>{l.tenHang}</span></td>
              <td style={tdCss("center")}>{l.donVi ?? "—"}</td>
              <td style={tdCss("right")}>{fmtN(l.tonDauSL)}</td>
              <td style={tdCss("right")}>{fmtVnd(l.tonDauTT)}</td>
              <td style={tdCss("right")}>{fmtN(l.nhapSL)}</td>
              <td style={tdCss("right")}>{fmtVnd(l.nhapTT)}</td>
              <td style={tdCss("right")}>{fmtN(l.xuatSL)}</td>
              <td style={tdCss("right")}>{fmtVnd(l.xuatTT)}</td>
              <td style={tdCss("right")}><b>{fmtN(l.tonCuoiSL)}</b></td>
              <td style={tdCss("right")}><b>{fmtVnd(l.tonCuoiTT)}</b></td>
            </tr>
          ))}
          {/* Tổng cộng */}
          <tr style={{ fontWeight: 700, background: "#f1f5f9" }}>
            <td colSpan={3} style={{ border: B1, padding: "5px", textAlign: "center" }}>Tổng cộng</td>
            <td style={tdCss("right")}>{fmtN(tot.tonDauSL)}</td>
            <td style={tdCss("right")}>{fmtVnd(tot.tonDauTT)}</td>
            <td style={tdCss("right")}>{fmtN(tot.nhapSL)}</td>
            <td style={tdCss("right")}>{fmtVnd(tot.nhapTT)}</td>
            <td style={tdCss("right")}>{fmtN(tot.xuatSL)}</td>
            <td style={tdCss("right")}>{fmtVnd(tot.xuatTT)}</td>
            <td style={tdCss("right")}>{fmtN(tot.tonCuoiSL)}</td>
            <td style={tdCss("right")}>{fmtVnd(tot.tonCuoiTT)}</td>
          </tr>
        </tbody>
      </table>

      {/* Ghi chú */}
      <p style={{ fontSize: 11, fontStyle: "italic", color: "#64748b", margin: "4px 0" }}>
        * Thành tiền = Số lượng × Đơn giá nhập kho
      </p>

      {/* Ký tên */}
      <p style={{ textAlign: "right", fontStyle: "italic", fontSize: 12, margin: "16px 0 12px" }}>
        Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
      </p>
      <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {["Người lập biểu", "Kế toán trưởng", "Giám đốc"].map(r => (
          <div key={r} style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{r}</p>
            <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const actions = (
    <button
      onClick={() => printDocumentById("bk-xnt-doc", "landscape", `Bảng kê XNT - ${warehouseName}`)}
      style={{ padding: "8px 22px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
      <i className="bi bi-printer" /> In báo cáo
    </button>
  );

  return (
    <PrintPreviewModal
      title="Bảng kê Xuất - Nhập - Tồn"
      subtitle={<>Kho: <strong style={{ color: "#fcd34d" }}>{warehouseName}</strong></>}
      actions={actions}
      sidebar={sidebar}
      document={doc}
      onClose={onClose}
      documentId="bk-xnt-doc"
      printOrientation="landscape"
    />
  );
}
