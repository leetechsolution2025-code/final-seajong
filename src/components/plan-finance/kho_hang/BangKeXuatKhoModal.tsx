"use client";
import React from "react";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface XuatLine {
  soChungTu:  string | null;
  ngay:       string;
  type:       string;
  lyDo:       string | null;
  fromKho:    string | null;
  toKho:      string | null;
  maSku:      string | null;
  tenHang:    string;
  donVi:      string | null;
  soLuong:    number;
  donGia:     number;
  thanhTien:  number;
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
const fmtVnd  = (n: number) => n.toLocaleString("vi-VN");
const fmtDate = (iso: string) => {
  try { const [y, m, d] = new Date(iso).toISOString().slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
  catch { return iso; }
};
const B1 = "1px solid #000";

function getMota(l: XuatLine): string {
  if (l.type === "xuat")        return "Xuất kho hàng hoá" + (l.toKho ? ` đến ${l.toKho}` : "");
  if (l.type === "luan-chuyen" || l.type === "chuyen")
    return `Luân chuyển kho${l.toKho ? ` đến ${l.toKho}` : ""}`;
  if (l.type === "dieu-chinh")  return "Điều chỉnh giảm tồn kho";
  return l.lyDo ?? l.type;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BangKeXuatKhoModal({ warehouseId, warehouseName, onClose }: Props) {
  const today        = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [company, setCompany]           = React.useState<CompanyInfo | null>(null);
  const [from,    setFrom]              = React.useState(firstOfMonth);
  const [to,      setTo]                = React.useState(today);
  const [lines,   setLines]             = React.useState<XuatLine[]>([]);
  const [loading, setLoading]           = React.useState(false);
  const [warehouseAddr, setWarehouseAddr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => setCompany(d)).catch(() => {});
    fetch(`/api/plan-finance/warehouses/${warehouseId}`)
      .then(r => r.json()).then(d => setWarehouseAddr(d?.address ?? null)).catch(() => {});
  }, [warehouseId]);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/plan-finance/reports/bang-ke-xuat?warehouseId=${warehouseId}&from=${from}&to=${to}`)
      .then(r => r.json()).then(d => setLines(Array.isArray(d) ? d : []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [warehouseId, from, to]);

  React.useEffect(() => { load(); }, [load]);

  const tongSL   = lines.reduce((s, l) => s + l.soLuong,   0);
  const tongTien = lines.reduce((s, l) => s + l.thanhTien, 0);

  const inp: React.CSSProperties = {
    width: "100%", padding: "7px 9px", border: "1px solid #e2e8f0",
    borderRadius: 6, background: "#f8fafc", fontSize: 12.5, boxSizing: "border-box", fontFamily: "inherit",
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
        style={{ padding: "8px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
        <i className="bi bi-arrow-clockwise" /> {loading ? "Đang tải..." : "Tải lại"}
      </button>
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 12, color: "#475569" }}>
        <p style={{ margin: 0 }}><b>{lines.length}</b> giao dịch</p>
        <p style={{ margin: "4px 0 0" }}>Tổng SL: <b>{tongSL.toLocaleString("vi-VN")}</b></p>
        <p style={{ margin: "4px 0 0" }}>Tổng tiền: <b>{fmtVnd(tongTien)}</b></p>
      </div>
    </>
  );

  // ── Document ───────────────────────────────────────────────────────────────
  const thCss = (w?: number): React.CSSProperties => ({
    border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700,
    fontSize: 11.5, verticalAlign: "middle", ...(w ? { width: w } : {}),
  });
  const tdCss = (align: "left" | "center" | "right" = "left"): React.CSSProperties => ({
    border: B1, padding: "4px 5px", fontSize: 11.5, textAlign: align, verticalAlign: "middle",
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
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu số S11-DN</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Theo TT 133/2016/TT-BTC)</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Bảng kê xuất kho hàng hoá
        </p>
        <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 12 }}>Kho hàng: {warehouseName}</p>
        {warehouseAddr && <p style={{ margin: "1px 0 0", fontSize: 11 }}>Địa điểm Kho: {warehouseAddr}</p>}
        <p style={{ margin: "2px 0 0", fontStyle: "italic", fontSize: 12 }}>
          Từ ngày {fmtDate(from + "T00:00:00")} đến ngày {fmtDate(to + "T00:00:00")}
        </p>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 8 }}>
        <thead>
          <tr>
            <th colSpan={2} style={thCss()}>Chứng từ</th>
            <th rowSpan={2} style={thCss(110)}>Số phiếu xuất</th>
            <th rowSpan={2} style={thCss()}>Miêu tả</th>
            <th rowSpan={2} style={thCss(72)}>Mã sản phẩm</th>
            <th rowSpan={2} style={thCss()}>Tên sản phẩm</th>
            <th rowSpan={2} style={thCss(36)}>ĐVT</th>
            <th rowSpan={2} style={thCss(60)}>Số lượng</th>
            <th rowSpan={2} style={thCss(80)}>Đơn giá xuất kho</th>
            <th rowSpan={2} style={thCss(88)}>Thành tiền</th>
          </tr>
          <tr>
            <th style={thCss(38)}>Số hiệu</th>
            <th style={thCss(64)}>Ngày</th>
          </tr>
          <tr style={{ fontStyle: "italic" }}>
            {["A","B","C","D","E","F","G","(1)","(2)","(3)"].map(c => (
              <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 10.5 }}>{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Đang tải...</td></tr>
          ) : lines.length === 0 ? (
            <tr><td colSpan={10} style={{ border: B1, padding: 20, textAlign: "center", color: "#94a3b8" }}>Không có dữ liệu xuất kho trong kỳ</td></tr>
          ) : lines.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
              <td style={tdCss("center")}>&nbsp;</td>
              <td style={tdCss("center")}>{fmtDate(l.ngay)}</td>
              <td style={tdCss("center")}>{l.soChungTu ?? ""}</td>
              <td style={tdCss()}>{getMota(l)}</td>
              <td style={tdCss("center")}>{l.maSku ?? ""}</td>
              <td style={tdCss()}><span style={{ fontWeight: 600 }}>{l.tenHang}</span></td>
              <td style={tdCss("center")}>{l.donVi ?? "—"}</td>
              <td style={tdCss("right")}>{l.soLuong.toLocaleString("vi-VN")}</td>
              <td style={tdCss("right")}>{l.donGia > 0 ? fmtVnd(l.donGia) : "0,00"}</td>
              <td style={tdCss("right")}><b>{fmtVnd(l.thanhTien)}</b></td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, background: "#f1f5f9" }}>
            <td colSpan={7} style={{ border: B1, padding: "5px", textAlign: "center" }}>Tổng cộng</td>
            <td style={{ border: B1, padding: "5px", textAlign: "right" }}>{tongSL.toLocaleString("vi-VN")}</td>
            <td style={{ border: B1 }}>&nbsp;</td>
            <td style={{ border: B1, padding: "5px", textAlign: "right" }}>{fmtVnd(tongTien)}</td>
          </tr>
        </tbody>
      </table>

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
      onClick={() => printDocumentById("bk-xuat-doc", "landscape", `Bảng kê xuất kho - ${warehouseName}`)}
      style={{ padding: "8px 22px", border: "none", background: "#f59e0b", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
      <i className="bi bi-printer" /> In báo cáo
    </button>
  );

  return (
    <PrintPreviewModal
      title="Bảng kê Xuất kho hàng hoá"
      subtitle={<>Kho: <strong style={{ color: "#fcd34d" }}>{warehouseName}</strong></>}
      actions={actions}
      sidebar={sidebar}
      document={doc}
      onClose={onClose}
      documentId="bk-xuat-doc"
      printOrientation="landscape"
    />
  );
}
