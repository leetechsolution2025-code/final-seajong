"use client";
import React from "react";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PhieuNhapLine {
  tenHang:       string;
  maSku?:        string | null;
  thongSoKT?:    string | null;   // thông số kỹ thuật
  donVi?:        string | null;
  soLuongCT:     number;
  soLuong:       number;
  donGia:        number;
  viTriHang?:    string;
  viTriCot?:     string;
  viTriTang?:    string;
  ghiChu?:       string;
  bomCode?:      string | null;
  dinhMucTen?:   string | null;
}

interface CompanyInfo {
  name: string;
  shortName?: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  logoUrl: string | null;
  legalRep: string | null;
}

export interface PhieuNhapKhoPreviewProps {
  soChungTu:      string;
  ngayNhap:       string;   // YYYY-MM-DD
  khoName:        string;
  lyDo?:          string;
  nguoiThucHien?: string;
  lines:          PhieuNhapLine[];
  onClose:        () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtVnd(n: number) { return n.toLocaleString("vi-VN"); }

function soThanhChu(n: number): string {
  if (n === 0) return "Không đồng";
  const CS = ["không","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"];
  function doc3(num: number, leading: boolean): string {
    if (num === 0) return "";
    const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), u = num % 10;
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

// Label style nhỏ trong sidebar
const SLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
    {children}
  </p>
);

// ── Component ─────────────────────────────────────────────────────────────────
export function PhieuNhapKhoPreview({
  soChungTu, ngayNhap, khoName, lyDo, nguoiThucHien, lines, onClose,
}: PhieuNhapKhoPreviewProps) {
  const [company, setCompany]               = React.useState<CompanyInfo | null>(null);
  const [nguoiGiaoHang, setNguoiGiaoHang]   = React.useState("");
  const [donViGiaoHang, setDonViGiaoHang]   = React.useState("");
  const [bienBanSo, setBienBanSo]           = React.useState("");
  const [ngayBienBan, setNgayBienBan]       = React.useState(ngayNhap);
  const [chungTuGoc, setChungTuGoc]         = React.useState("");
  const [nguoiLap, setNguoiLap]             = React.useState(nguoiThucHien ?? "");
  const [thuKho, setThuKho]                 = React.useState("");
  const [nguoiKT, setNguoiKT]               = React.useState("");

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => setCompany(d)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tongSL   = lines.reduce((s, l) => s + l.soLuong, 0);
  const tongSLCT = lines.reduce((s, l) => s + l.soLuongCT, 0);
  const tongTien = lines.reduce((s, l) => s + l.soLuong * l.donGia, 0);
  const [yyyy, mm, dd] = ngayNhap.split("-");
  const [bbYyyy, bbMm, bbDd] = (ngayBienBan || ngayNhap || "").split("-");

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <>
      <div><SLabel>Người giao hàng</SLabel>
        <input value={nguoiGiaoHang} onChange={e => setNguoiGiaoHang(e.target.value)} placeholder="Họ tên người giao..." style={inp} />
      </div>
      <div><SLabel>Đơn vị giao hàng</SLabel>
        <input value={donViGiaoHang} onChange={e => setDonViGiaoHang(e.target.value)} placeholder="Tên đơn vị/công ty..." style={inp} />
      </div>
      <div><SLabel>Biên bản số</SLabel>
        <input value={bienBanSo} onChange={e => setBienBanSo(e.target.value)} placeholder="Số biên bản..." style={inp} />
      </div>
      <div><SLabel>Ngày biên bản</SLabel>
        <input type="date" value={ngayBienBan} onChange={e => setNgayBienBan(e.target.value)} style={inp} />
      </div>
      <div><SLabel>Chứng từ gốc kèm theo</SLabel>
        <textarea value={chungTuGoc} onChange={e => setChungTuGoc(e.target.value)} placeholder="Vd: Hóa đơn GTGT, Phiếu xuất kho NCC..." rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
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

  // ─── Full-width underline row helper ─────────────────────────────────────
  // Mỗi dòng form là flex, phần gạch chân tự kéo dài ra hết dòng
  const FormRow = ({ label, value }: { label: React.ReactNode; value?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, minWidth: 0 }}>
        {value ?? <>&nbsp;</>}
      </span>
    </div>
  );

  // ── Document (Mẫu 01-VT) ──────────────────────────────────────────────────
  const doc = (
    <div className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>

      {/* Header: Logo + Company | Mẫu số */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>

        {/* Logo + thông tin công ty — căn chiều cao logo theo dòng text đầu tiên */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt="logo"
              style={{
                width: 56, height: 56,
                objectFit: "contain",
                objectPosition: "top left",
                flexShrink: 0,
                marginTop: 1,        // căn với dòng text đầu tiên
              }}
            />
          ) : (
            <div style={{
              width: 56, height: 56,
              border: "1px solid #ccc",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, color: "#999",
            }}>LOGO</div>
          )}
          <div style={{ fontSize: 11 }}>
            <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", lineHeight: 1.3 }}>{company?.name ?? "—"}</p>
            {company?.address && <p style={{ margin: "0 0 1px" }}>Địa chỉ: {company.address}</p>}
            <p style={{ margin: 0 }}>
              SĐT: {company?.phone ?? "—"}
              {company?.email ? ` - Email: ${company.email}` : ""}
            </p>
          </div>
        </div>

        {/* Mẫu số góc phải */}
        <div style={{ textAlign: "right", fontSize: 11, flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu số 01 - VT</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Ban hành theo Thông tư 99/2025/TT-BTC)</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", marginTop: 14, marginBottom: 2 }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Phiếu nhập kho</p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>Ngày {dd} tháng {mm} năm {yyyy}</p>
      </div>

      {/* Số phiếu — right aligned */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <p style={{ margin: 0 }}>
            Số:&nbsp;
            <span style={{ borderBottom: B1, paddingBottom: 1, fontWeight: 700, minWidth: 180, display: "inline-block", textAlign: "center", letterSpacing: "0.03em" }}>
              {soChungTu}
            </span>
          </p>
        </div>
      </div>

      {/* Form fields — gạch chân kéo dài ra hết dòng */}
      <div style={{ marginBottom: 14 }}>
        <FormRow
          label="- Họ và tên người giao hàng:"
          value={nguoiGiaoHang
            ? <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{nguoiGiaoHang}</span>
            : undefined}
        />
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
          <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Theo Biên bản bán giao hàng hoá số</span>
          <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, minWidth: 80 }}>{bienBanSo || <>&nbsp;</>}</span>
          <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
            , ngày&nbsp;
            <span style={{ borderBottom: B05, display: "inline-block", minWidth: 26, textAlign: "center" }}>{bbDd || "..."}</span>
            &nbsp;tháng&nbsp;
            <span style={{ borderBottom: B05, display: "inline-block", minWidth: 22, textAlign: "center" }}>{bbMm || "..."}</span>
            &nbsp;năm {bbYyyy || "...."}
          </span>
        </div>
        <FormRow label="- Của:" value={donViGiaoHang || undefined} />
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
          <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Nhập tại kho:</span>
          <span style={{ fontWeight: 700 }}>&nbsp;{khoName}</span>
        </div>
        {company?.address && (
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Địa điểm:</span>
            <span style={{ marginLeft: 4 }}>{company.address}</span>
          </div>
        )}
        {lyDo && (
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Lý do nhập:</span>
            <span style={{ marginLeft: 4 }}>{lyDo}</span>
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
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 52, fontWeight: 700 }}>Thực nhập</th>
          </tr>
          {/* Column index row — italic */}
          <tr style={{ fontStyle: "italic" }}>
            {["A","B","C","D","1","2","3","4"].map(c => (
              <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 11 }}>{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => {
            const tt   = l.soLuong * l.donGia;
            const diff = l.soLuong - l.soLuongCT;
            return (
              <tr key={idx}>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{idx + 1}</td>
                <td style={{ border: B1, padding: "5px 6px" }}>
                  {/* Tên hàng + thông số kỹ thuật — KHÔNG hiện mã SKU ở đây */}
                  <span style={{ fontWeight: 600 }}>{l.tenHang}</span>
                  {(l.bomCode || l.dinhMucTen) && (
                    <div style={{ margin: "2px 0 0", fontSize: 10.5, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      {l.bomCode && (
                        <span style={{ fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0 4px", borderRadius: 3 }}>
                          {l.bomCode}
                        </span>
                      )}
                      {l.dinhMucTen && <span style={{ color: "#4b5563", fontStyle: "italic" }}>{l.dinhMucTen}</span>}
                    </div>
                  )}
                  {l.thongSoKT && (
                    <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#444", fontStyle: "italic" }}>
                      {l.thongSoKT}
                    </p>
                  )}
                </td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontSize: 11 }}>{l.maSku ?? ""}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{l.donVi ?? "—"}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{l.soLuongCT.toLocaleString()}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700, color: diff !== 0 ? "#b45309" : "#000" }}>
                  {l.soLuong.toLocaleString()}
                </td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "right" }}>{l.donGia > 0 ? fmtVnd(l.donGia) : ""}</td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{fmtVnd(tt)}</td>
              </tr>
            );
          })}
          {/* Empty rows — luôn đủ ít nhất 5 dòng */}
          {lines.length < 5 && Array.from({ length: 5 - lines.length }).map((_, i) => (
            <tr key={`empty-${i}`}>
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
          {/* Cộng */}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4} style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>Cộng</td>
            <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{tongSLCT > 0 ? tongSLCT.toLocaleString() : <b>0</b>}</td>
            <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{tongSL > 0 ? tongSL.toLocaleString() : <b>0</b>}</td>
            <td style={{ border: B1, padding: "5px 4px" }}>&nbsp;</td>
            <td style={{ border: B1, padding: "5px 6px", textAlign: "right" }}><b>{fmtVnd(tongTien)}</b></td>
          </tr>
        </tbody>
      </table>

      {/* Tổng tiền bằng chữ */}
      <p style={{ margin: "6px 0", fontSize: 13 }}>
        - Tổng số tiền (viết bằng chữ):&nbsp;
        <strong style={{ fontStyle: "italic" }}>{soThanhChu(tongTien)}</strong>
      </p>

      {/* Số chứng từ gốc — kéo dài hết dòng */}
      <div style={{ display: "flex", alignItems: "baseline", marginBottom: 6, fontSize: 13, gap: 4 }}>
        <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Số chứng từ gốc kèm theo:</span>
        <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1 }}>{chungTuGoc || <>&nbsp;</>}</span>
      </div>

      {/* Chữ ký — 4 cột */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, textAlign: "center" }}>
        {[
          { role: "Người lập phiếu", name: nguoiLap },
          { role: "Người giao hàng", name: nguoiGiaoHang },
          { role: "Thủ kho",         name: thuKho },
          { role: "Kế toán trưởng",  name: nguoiKT },
        ].map(s => (
          <div key={s.role} style={{ flex: 1, padding: "0 6px" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{s.role}</p>
            <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
            {s.name && <p style={{ margin: 0, fontWeight: 700, fontSize: 11.5 }}>{s.name}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions = (
    <button
      onClick={() => printDocumentById("phieu-nhap-doc", "portrait", `Phiếu nhập kho - ${soChungTu}`)}
      style={{ padding: "8px 22px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
    >
      <i className="bi bi-printer" /> In phiếu nhập kho
    </button>
  );

  return (
    <PrintPreviewModal
      title="Xem trước Phiếu nhập kho"
      subtitle={<>Số: <strong style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{soChungTu}</strong>&nbsp;·&nbsp;Kho: <span style={{ color: "#38bdf8" }}>{khoName}</span></>}
      actions={actions}
      sidebar={sidebar}
      document={doc}
      onClose={onClose}
      documentId="phieu-nhap-doc"
    />
  );
}
