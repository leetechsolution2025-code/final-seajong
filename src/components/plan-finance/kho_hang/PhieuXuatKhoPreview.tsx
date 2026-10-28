"use client";
import React from "react";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PhieuXuatLine {
  tenHang:    string;
  maSku?:     string | null;
  donVi?:     string | null;
  soLuongYC:  number;
  soLuong:    number;
  donGia:     number;
  viTriHang?: string;
  viTriCot?:  string;
  viTriTang?: string;
  ghiChu?:    string;
}

interface CompanyInfo {
  name: string; address: string | null; phone: string | null;
  email: string | null; logoUrl: string | null;
}

export interface PhieuXuatKhoPreviewProps {
  soChungTu:      string;
  ngayXuat:       string;   // YYYY-MM-DD
  khoName:        string;
  lyDo?:          string;
  nguoiThucHien?: string;
  lines:          PhieuXuatLine[];
  onClose:        () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtVnd(n: number) { return n.toLocaleString("vi-VN"); }

function soThanhChu(n: number): string {
  if (n === 0) return "Không đồng";
  const CS = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  function doc3(num: number, leading: boolean): string {
    if (num === 0) return "";
    const h = Math.floor(num/100), t = Math.floor((num%100)/10), u = num%10;
    let s = "";
    if (h > 0) s = CS[h] + " trăm";
    else if (!leading) { if (t === 0) return "lẻ " + CS[u]; s = "không trăm"; }
    if (t === 0) { if (u > 0) s += (s ? " lẻ " : "") + CS[u]; }
    else if (t === 1) { s += (s ? " " : "") + "mười"; if (u === 5) s += " lăm"; else if (u > 0) s += " " + CS[u]; }
    else { s += (s ? " " : "") + CS[t] + " mươi"; if (u === 1) s += " mốt"; else if (u === 5) s += " lăm"; else if (u > 0) s += " " + CS[u]; }
    return s;
  }
  const scales = [{ v: 1_000_000_000, label: "tỷ" }, { v: 1_000_000, label: "triệu" }, { v: 1_000, label: "nghìn" }, { v: 1, label: "" }];
  let result = "", rem = Math.round(n), first = true;
  for (const { v, label } of scales) {
    const q = Math.floor(rem / v); rem %= v; if (q === 0) continue;
    result += (result ? " " : "") + doc3(q, first) + (label ? " " + label : ""); first = false;
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

const inp = printStyles.sidebarInput;
const B1  = "1px solid #000";
const B05 = "1px solid #999";

const SLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
    {children}
  </p>
);

const FormRow = ({ label, value }: { label: React.ReactNode; value?: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
    <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
    <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, minWidth: 0 }}>{value ?? <>&nbsp;</>}</span>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
export function PhieuXuatKhoPreview({
  soChungTu, ngayXuat, khoName, lyDo, nguoiThucHien, lines, onClose,
}: PhieuXuatKhoPreviewProps) {
  const [company, setCompany]             = React.useState<CompanyInfo | null>(null);
  const [nguoiNhanHang, setNguoiNhanHang] = React.useState("");
  const [donViNhan, setDonViNhan]         = React.useState("");
  const [nguoiLap, setNguoiLap]           = React.useState(nguoiThucHien ?? "");
  const [thuKho, setThuKho]               = React.useState("");
  const [nguoiKT, setNguoiKT]             = React.useState("");
  const [chungTuGoc, setChungTuGoc]       = React.useState("");

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => setCompany(d)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tongSL   = lines.reduce((s, l) => s + l.soLuong, 0);
  const tongSLYC = lines.reduce((s, l) => s + l.soLuongYC, 0);
  const tongTien = lines.reduce((s, l) => s + l.soLuong * l.donGia, 0);
  const [yyyy, mm, dd] = ngayXuat.split("-");

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const sidebar = (
    <>
      <div><SLabel>Người nhận hàng</SLabel>
        <input value={nguoiNhanHang} onChange={e => setNguoiNhanHang(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
      <div><SLabel>Đơn vị nhận</SLabel>
        <input value={donViNhan} onChange={e => setDonViNhan(e.target.value)} placeholder="Tên đơn vị/phòng ban..." style={inp} />
      </div>
      <div><SLabel>Chứng từ gốc kèm theo</SLabel>
        <textarea value={chungTuGoc} onChange={e => setChungTuGoc(e.target.value)} placeholder="Vd: Lệnh xuất kho, Hóa đơn..." rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
      </div>
      <div><SLabel>Người lập phiếu</SLabel>
        <input value={nguoiLap} onChange={e => setNguoiLap(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
      <div><SLabel>Thủ kho</SLabel>
        <input value={thuKho} onChange={e => setThuKho(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
      <div><SLabel>Kế toán trưởng</SLabel>
        <input value={nguoiKT} onChange={e => setNguoiKT(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
    </>
  );

  // ── Document (Mẫu 02-VT) ────────────────────────────────────────────────────
  const doc = (
    <div className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", objectPosition: "top left", flexShrink: 0, marginTop: 1 }} />
          ) : (
            <div style={{ width: 56, height: 56, border: "1px solid #ccc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#999" }}>LOGO</div>
          )}
          <div style={{ fontSize: 11 }}>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", lineHeight: 1.3 }}>{company?.name ?? "—"}</p>
            {company?.address && <p style={{ margin: "0 0 1px" }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0 }}>SĐT: {company?.phone ?? "—"}{company?.email ? ` - Email: ${company.email}` : ""}</p>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu số 02 - VT</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Ban hành theo Thông tư 99/2025/TT-BTC)</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", marginTop: 14, marginBottom: 2 }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Phiếu xuất kho</p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>Ngày {dd} tháng {mm} năm {yyyy}</p>
      </div>

      {/* Số phiếu */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <p style={{ margin: 0 }}>Số:&nbsp;
            <span style={{ borderBottom: B1, paddingBottom: 1, fontWeight: 700, minWidth: 180, display: "inline-block", textAlign: "center", letterSpacing: "0.03em" }}>{soChungTu}</span>
          </p>
        </div>
      </div>

      {/* Form fields */}
      <div style={{ marginBottom: 14 }}>
        <FormRow
          label="- Họ và tên người nhận hàng:"
          value={nguoiNhanHang
            ? <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{nguoiNhanHang}</span>
            : undefined}
        />
        <FormRow label="- Đơn vị:" value={donViNhan || undefined} />
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
          <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Lý do xuất kho:</span>
          <span style={{ marginLeft: 4, fontWeight: 600 }}>{lyDo ?? "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
          <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Xuất tại kho:</span>
          <span style={{ marginLeft: 4, fontWeight: 700 }}>{khoName}</span>
        </div>
        {company?.address && (
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Địa điểm:</span>
            <span style={{ marginLeft: 4 }}>{company.address}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 10 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 30, fontWeight: 700, verticalAlign: "middle" }}>STT</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 6px", textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ sản phẩm, hàng hoá</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 90, fontWeight: 700, verticalAlign: "middle" }}>Mã số</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 38, fontWeight: 700, verticalAlign: "middle" }}>ĐVT</th>
            <th colSpan={2}  style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Số lượng</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 80, fontWeight: 700, verticalAlign: "middle" }}>Đơn giá (đồng)</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 88, fontWeight: 700, verticalAlign: "middle" }}>Thành tiền (đồng)</th>
          </tr>
          <tr>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 52, fontWeight: 700 }}>Theo chứng từ</th>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 52, fontWeight: 700 }}>Thực xuất</th>
          </tr>
          <tr style={{ fontStyle: "italic" }}>
            {["A","B","C","D","1","2","3","4"].map(c => (
              <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 11 }}>{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => {
            const tt   = l.soLuong * l.donGia;
            const diff = l.soLuong - l.soLuongYC;
            return (
              <tr key={idx}>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{idx + 1}</td>
                <td style={{ border: B1, padding: "5px 6px" }}>
                  <span style={{ fontWeight: 600 }}>{l.tenHang}</span>
                </td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontSize: 11 }}>{l.maSku ?? ""}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{l.donVi ?? "—"}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{l.soLuongYC.toLocaleString()}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700, color: diff !== 0 ? "#b45309" : "#000" }}>
                  {l.soLuong.toLocaleString()}
                </td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "center" }}>***</td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "center", fontWeight: 600 }}>***</td>
              </tr>
            );
          })}
          {lines.length < 5 && Array.from({ length: 5 - lines.length }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td style={{ border: B1, height: 24 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1, textAlign: "center" }}>—</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1, textAlign: "right" }}>0</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4} style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>Cộng</td>
            <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{tongSLYC > 0 ? tongSLYC.toLocaleString() : <b>0</b>}</td>
            <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{tongSL > 0 ? tongSL.toLocaleString() : <b>0</b>}</td>
            <td style={{ border: B1, padding: "5px 4px" }}>&nbsp;</td>
            <td style={{ border: B1, padding: "5px 6px", textAlign: "center" }}><b>***</b></td>
          </tr>
        </tbody>
      </table>

      {/* Tổng tiền bằng chữ */}
      <p style={{ margin: "6px 0", fontSize: 13 }}>
        - Tổng số tiền (viết bằng chữ):&nbsp;
        <strong style={{ fontStyle: "italic" }}>***</strong>
      </p>

      {/* Số chứng từ gốc */}
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 6, fontSize: 13, gap: 4 }}>
        <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Số chứng từ gốc kèm theo:</span>
        <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1 }}>{chungTuGoc || <>&nbsp;</>}</span>
      </div>

      {/* Chữ ký 4 cột */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, textAlign: "center" }}>
        {[
          { role: "Người lập phiếu",  name: nguoiLap },
          { role: "Người nhận hàng",  name: nguoiNhanHang },
          { role: "Thủ kho",          name: thuKho },
          { role: "Kế toán trưởng",   name: nguoiKT },
        ].map(s => (
          <div key={s.role} style={{ flex: 1, padding: "0 6px" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{s.role}</p>
            <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
            {s.name && <p style={{ margin: 0, fontWeight: 700, fontSize: 11.5, textTransform: s.role === "Người nhận hàng" ? "uppercase" : undefined }}>{s.name}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Actions ──────────────────────────────────────────────────────────────────
  const actions = (
    <button
      onClick={() => printDocumentById("phieu-xuat-doc", "portrait", `Phiếu xuất kho - ${soChungTu}`)}
      style={{ padding: "8px 22px", border: "none", background: "#f59e0b", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
    >
      <i className="bi bi-printer" /> In phiếu xuất kho
    </button>
  );

  return (
    <PrintPreviewModal
      title="Xem trước Phiếu xuất kho"
      subtitle={<>Số: <strong style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{soChungTu}</strong>&nbsp;·&nbsp;Kho: <span style={{ color: "#fcd34d" }}>{khoName}</span></>}
      actions={actions}
      sidebar={sidebar}
      document={doc}
      onClose={onClose}
      documentId="phieu-xuat-doc"
    />
  );
}
