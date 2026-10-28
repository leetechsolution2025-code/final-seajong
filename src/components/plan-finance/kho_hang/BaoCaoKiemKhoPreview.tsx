"use client";
import React from "react";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BaoCaoKiemKhoLine {
  inventoryItemId: string;
  tenHang:         string;
  maSku?:          string | null;
  category?:       string | null;
  donVi?:          string | null;
  soLuongHeTong:   number;
  soLuongThucTe:   number | "";
  chenh:           number;
  giaNhap?:        number;
  ghiChu?:         string;
  chuaPhanKho?:    boolean;
}

interface CompanyInfo {
  name: string; shortName?: string | null;
  address: string | null; phone: string | null;
  email: string | null;   taxCode: string | null;
  logoUrl: string | null; legalRep: string | null;
}

export interface BaoCaoKiemKhoPreviewProps {
  soChungTu:     string;
  ngayKiem:      string;        // YYYY-MM-DD
  warehouseName: string;
  nguoiKiem?:    string;
  ghiChu?:       string;
  lines:         BaoCaoKiemKhoLine[];
  onClose:       () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtN(n: number)  { return n.toLocaleString("vi-VN"); }
function fmtVnd(n: number){ return n.toLocaleString("vi-VN"); }

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

const B1  = "1px solid #000";
const B05 = "1px solid #999";
const inp = printStyles.sidebarInput;

const SLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
    {children}
  </p>
);

// ── Document ──────────────────────────────────────────────────────────────────
function Document({
  soChungTu, ngayKiem, warehouseName, nguoiKiem, lines, company,
  thuKho, kiemKho, ketToanTruong, truongPhong,
}: BaoCaoKiemKhoPreviewProps & {
  company: CompanyInfo | null;
  thuKho: string; kiemKho: string; ketToanTruong: string; truongPhong: string;
}) {
  const [yyyy, mm, dd] = ngayKiem.split("-");

  const countedLines = lines.filter(l => !l.chuaPhanKho && l.soLuongThucTe !== "");
  const underLines   = countedLines.filter(l => l.chenh < 0);
  const overLines    = countedLines.filter(l => l.chenh > 0);
  const tongHaoHut   = underLines.reduce((s, l) => s + Math.abs(l.chenh) * (l.giaNhap ?? 0), 0);
  const tongThua     = overLines.reduce((s, l)  => s + Math.abs(l.chenh) * (l.giaNhap ?? 0), 0);
  const haoHutChu    = tongHaoHut > 0 ? soThanhChu(tongHaoHut) : "Không đồng";
  const thuaChu      = tongThua > 0 ? soThanhChu(tongThua) : "Không đồng";

  const FormRow = ({ label, value }: { label: React.ReactNode; value?: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8, fontSize: 13, gap: 4 }}>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, minWidth: 0 }}>
        {value ?? <>&nbsp;</>}
      </span>
    </div>
  );

  return (
    <div className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>

      {/* Header: Logo + Company | Mẫu số */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt="logo"
              style={{ width: 56, height: 56, objectFit: "contain", objectPosition: "top left", flexShrink: 0, marginTop: 1 }} />
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
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu số 07 - VT</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Ban hành theo Thông tư 99/2025/TT-BTC)</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div style={{ textAlign: "center", marginTop: 14, marginBottom: 2 }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Biên bản kiểm kê vật tư</p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>Ngày {dd} tháng {mm} năm {yyyy}</p>
      </div>

      {/* Số phiếu */}
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

      {/* Thời gian, thành phần */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8, fontSize: 13 }}>
          <span style={{ flexShrink: 0 }}>- Thời điểm kiểm kê:</span>
          <span style={{ fontWeight: 700 }}>
            &nbsp;{dd}/{mm}/{yyyy}
          </span>
        </div>
        <FormRow label="- Người kiểm kho:" value={nguoiKiem ? <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{nguoiKiem}</span> : undefined} />
        <div style={{ display: "flex", gap: 4, marginBottom: 8, fontSize: 13 }}>
          <span style={{ flexShrink: 0 }}>- Kho kiểm kê:</span>
          <span style={{ fontWeight: 700 }}>&nbsp;{warehouseName}</span>
        </div>
        {countedLines.length < lines.length && (
          <div style={{ display: "flex", gap: 4, marginBottom: 8, fontSize: 13 }}>
            <span style={{ flexShrink: 0 }}>- Phạm vi kiểm kê:</span>
            <span>&nbsp;{countedLines.length}/{lines.length} mặt hàng (kiểm một phần)</span>
          </div>
        )}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 10 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 28, fontWeight: 700, verticalAlign: "middle" }}>STT</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 6px", textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}>Tên, nhãn hiệu, quy cách vật tư, hàng hoá</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 80, fontWeight: 700, verticalAlign: "middle" }}>Mã số</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 36, fontWeight: 700, verticalAlign: "middle" }}>ĐVT</th>
            <th colSpan={3} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Số lượng</th>
            <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", width: 72, fontWeight: 700, verticalAlign: "middle" }}>Đơn giá (đồng)</th>
            <th colSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Thành tiền (đồng)</th>
          </tr>
          <tr>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 52, fontWeight: 700 }}>Sổ kế toán</th>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 52, fontWeight: 700 }}>Thực kiểm</th>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 52, fontWeight: 700 }}>Chênh lệch</th>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 72, fontWeight: 700 }}>Hao hụt</th>
            <th style={{ border: B1, padding: "4px", textAlign: "center", width: 72, fontWeight: 700 }}>Thừa</th>
          </tr>
          <tr style={{ fontStyle: "italic" }}>
            {["A","B","C","D","1","2","3","4","5","6"].map(c => (
              <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 11 }}>{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => {
            const notCounted = l.soLuongThucTe === "" || l.chuaPhanKho;
            const thucTe     = notCounted ? null : l.soLuongThucTe as number;
            const chenh      = notCounted ? null : l.chenh;
            const haoHut     = (chenh != null && chenh < 0) ? Math.abs(chenh) : null;
            const thua       = (chenh != null && chenh > 0) ? chenh : null;
            const giaTri     = (val: number | null) => val != null && val > 0 && (l.giaNhap ?? 0) > 0
              ? fmtVnd(val * (l.giaNhap ?? 0)) : "";
            return (
              <tr key={l.inventoryItemId}>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{idx + 1}</td>
                <td style={{ border: B1, padding: "5px 6px" }}>
                  <span style={{ fontWeight: 600 }}>{l.tenHang}</span>
                  {l.chuaPhanKho && <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}> (chưa phân kho)</span>}
                </td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontSize: 11 }}>{l.maSku ?? ""}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{l.donVi ?? "—"}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{fmtN(l.soLuongHeTong)}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700, color: notCounted ? "#aaa" : "#000" }}>
                  {notCounted ? "—" : fmtN(thucTe!)}
                </td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 600, color: chenh != null && chenh < 0 ? "#c0392b" : chenh != null && chenh > 0 ? "#d97706" : "#000" }}>
                  {notCounted ? "—" : chenh === 0 ? "0" : (chenh! > 0 ? "+" : "") + fmtN(chenh!)}
                </td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "right" }}>{l.giaNhap && l.giaNhap > 0 ? fmtVnd(l.giaNhap) : ""}</td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "right", color: "#c0392b" }}>{giaTri(haoHut)}</td>
                <td style={{ border: B1, padding: "5px 6px", textAlign: "right", color: "#d97706" }}>{giaTri(thua)}</td>
              </tr>
            );
          })}
          {/* Empty rows */}
          {lines.length < 5 && Array.from({ length: 5 - lines.length }).map((_, i) => (
            <tr key={`e${i}`}>
              <td style={{ border: B1, height: 24 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1, textAlign: "center" }}>—</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
              <td style={{ border: B1 }}>&nbsp;</td>
            </tr>
          ))}
          {/* Cộng */}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={4} style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>Cộng</td>
            <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{fmtN(lines.reduce((s, l) => s + l.soLuongHeTong, 0))}</td>
            <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{fmtN(countedLines.reduce((s, l) => s + (l.soLuongThucTe as number), 0))}</td>
            <td style={{ border: B1, padding: "5px 4px" }}>&nbsp;</td>
            <td style={{ border: B1, padding: "5px 4px" }}>&nbsp;</td>
            <td style={{ border: B1, padding: "5px 6px", textAlign: "right", color: "#c0392b" }}><b>{tongHaoHut > 0 ? fmtVnd(tongHaoHut) : ""}</b></td>
            <td style={{ border: B1, padding: "5px 6px", textAlign: "right", color: "#d97706" }}><b>{tongThua > 0 ? fmtVnd(tongThua) : ""}</b></td>
          </tr>
        </tbody>
      </table>

      {/* Kết luận */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 4, fontSize: 13 }}>
          <span style={{ flexShrink: 0, fontStyle: "italic" }}>- Tổng số chênh lệch thiếu (bằng chữ):</span>
          <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, fontWeight: 700, fontStyle: "italic" }}>{haoHutChu}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 4, fontSize: 13 }}>
          <span style={{ flexShrink: 0, fontStyle: "italic" }}>- Tổng số chênh lệch thừa (bằng chữ):</span>
          <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, fontWeight: 700, fontStyle: "italic" }}>{thuaChu}</span>
        </div>
        <div style={{ display: "flex", gap: 4, fontSize: 13 }}>
          <span style={{ flexShrink: 0 }}>- Nguyên nhân chênh lệch:</span>
          <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1 }}>&nbsp;</span>
        </div>
      </div>

      {/* Chữ ký — 4 cột */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, textAlign: "center" }}>
        {[
          { role: "Người kiểm kho", name: kiemKho || nguoiKiem || "" },
          { role: "Thủ kho",        name: thuKho },
          { role: "Kế toán trưởng", name: ketToanTruong },
          { role: "Trưởng phòng / GĐ", name: truongPhong },
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
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function BaoCaoKiemKhoPreview(props: BaoCaoKiemKhoPreviewProps) {
  const [company,       setCompany]       = React.useState<CompanyInfo | null>(null);
  const [thuKho,        setThuKho]        = React.useState("");
  const [kiemKho,       setKiemKho]       = React.useState(props.nguoiKiem ?? "");
  const [ketToanTruong, setKetToanTruong] = React.useState("");
  const [truongPhong,   setTruongPhong]   = React.useState("");

  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => setCompany(d)).catch(() => {});
  }, []);

  const countedLines = props.lines.filter(l => !l.chuaPhanKho && l.soLuongThucTe !== "");
  const underLines   = countedLines.filter(l => l.chenh < 0);
  const overLines    = countedLines.filter(l => l.chenh > 0);

  const sidebar = (
    <>
      {/* Tổng quan */}
      <div>
        <SLabel>Tổng quan kiểm kê</SLabel>
        {[
          { label: "Đã kiểm",    val: `${countedLines.length}/${props.lines.length} mặt hàng`, c: "#6366f1" },
          { label: "Thiếu",      val: `${underLines.length} mặt hàng`,  c: "#c0392b" },
          { label: "Thừa",       val: `${overLines.length} mặt hàng`,   c: "#d97706" },
          { label: "Khớp",       val: `${countedLines.filter(l => l.chenh === 0).length} mặt hàng`, c: "#10b981" },
        ].map(it => (
          <div key={it.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 12.5, color: "#475569" }}>{it.label}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: it.c }}>{it.val}</span>
          </div>
        ))}
      </div>

      <div><SLabel>Người kiểm kho</SLabel>
        <input value={kiemKho} onChange={e => setKiemKho(e.target.value)} placeholder="Họ tên..." style={inp} /></div>
      <div><SLabel>Thủ kho</SLabel>
        <input value={thuKho} onChange={e => setThuKho(e.target.value)} placeholder="Họ tên..." style={inp} /></div>
      <div><SLabel>Kế toán trưởng</SLabel>
        <input value={ketToanTruong} onChange={e => setKetToanTruong(e.target.value)} placeholder="Họ tên..." style={inp} /></div>
      <div><SLabel>Trưởng phòng / Giám đốc</SLabel>
        <input value={truongPhong} onChange={e => setTruongPhong(e.target.value)} placeholder="Họ tên..." style={inp} /></div>
    </>
  );

  const actions = (
    <button
      onClick={() => printDocumentById("bao-cao-kiem-kho-doc", "landscape", `Biên bản kiểm kê - ${props.soChungTu}`)}
      style={{ padding: "8px 22px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
    >
      <i className="bi bi-printer" /> In biên bản
    </button>
  );

  return (
    <PrintPreviewModal
      title="Xem trước Biên bản kiểm kê vật tư"
      subtitle={<>Số: <strong style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{props.soChungTu}</strong>&nbsp;·&nbsp;Kho: <span style={{ color: "#38bdf8" }}>{props.warehouseName}</span></>}
      actions={actions}
      sidebar={sidebar}
      document={
        <Document
          {...props}
          company={company}
          thuKho={thuKho}
          kiemKho={kiemKho}
          ketToanTruong={ketToanTruong}
          truongPhong={truongPhong}
        />
      }
      onClose={props.onClose}
      documentId="bao-cao-kiem-kho-doc"
      printOrientation="landscape"
    />
  );
}
