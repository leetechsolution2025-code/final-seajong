"use client";
import React from "react";
import { useToast } from "@/components/ui/Toast";
import { PrintPreviewModal, printStyles, printDocumentById } from "@/components/ui/PrintPreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CardLine {
  id: string;
  ngay: string;
  type: string;
  soChungTu: string | null;
  lyDo: string | null;
  nguoiThucHien: string | null;
  fromKho: string | null;
  toKho: string | null;
  nhap: number | null;
  xuat: number | null;
  tonCuoi: number;
  chenh: number | null;
}

interface CardData {
  item: {
    id: string;
    tenHang: string;
    code?: string | null;
    donVi?: string | null;
    giaNhap?: number | null;
    soLuongMin?: number | null;
    category?: string | null;
  };
  tonDauKy: number;
  tonHienTai: number;
  lines: CardLine[];
}

interface CompanyInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  logoUrl: string | null;
}

export interface TheKhoModalProps {
  inventoryItemId: string;
  warehouseId?: string;
  warehouseName?: string;
  initFrom?: string;
  initTo?: string;
  onClose: () => void;
}

interface ItemOption { id: string; tenHang: string; code: string | null; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN    = (n: number | null | undefined) => n != null ? n.toLocaleString("vi-VN") : "--";
const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const TYPE_META: Record<string, { label: string; color: string }> = {
  "nhap":        { label: "Nhập kho",          color: "#15803d" },
  "xuat":        { label: "Xuất kho",           color: "#b91c1c" },
  "luan-chuyen": { label: "Luân chuyển kho",    color: "#4338ca" },
  "chuyen":      { label: "Luân chuyển kho",    color: "#4338ca" },
  "dieu-chinh":  { label: "Điều chỉnh tồn kho", color: "#b45309" },
};

// ── Border constants (đồng bộ PhieuNhapKhoPreview) ──────────────────────────
const B1  = "1px solid #000";
const B05 = "1px solid #999";

// ── Sidebar label helper ─────────────────────────────────────────────────────
const inp    = printStyles.sidebarInput;
const SLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
    {children}
  </p>
);

// ── Component ─────────────────────────────────────────────────────────────────
export function TheKhoModal({ inventoryItemId: initItemId, warehouseId, warehouseName, initFrom, initTo, onClose }: TheKhoModalProps) {
  const toast = useToast();
  const [company,         setCompany]         = React.useState<CompanyInfo | null>(null);
  const [warehouseAddr,   setWarehouseAddr]   = React.useState<string | null>(null);
  const [itemId,          setItemId]           = React.useState(initItemId);
  const [items,    setItems]    = React.useState<ItemOption[]>([]);
  const [data,     setData]     = React.useState<CardData | null>(null);
  const [loading,  setLoading]  = React.useState(!!initItemId);
  const [from,     setFrom]     = React.useState(() => {
    if (initFrom) return initFrom;
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo]   = React.useState(() => {
    if (initTo) return initTo;
    return new Date().toISOString().slice(0, 10);
  });
  const [nguoiGhiSo,  setNguoiGhiSo]  = React.useState("");
  const [ketoanTruong, setKetoanTruong] = React.useState("");
  const [giamdoc,     setGiamdoc]      = React.useState("");

  // Load company info
  React.useEffect(() => {
    fetch("/api/company").then(r => r.json()).then(d => setCompany(d)).catch(() => {});
  }, []);

  // Load warehouse address
  React.useEffect(() => {
    if (!warehouseId) return;
    fetch(`/api/plan-finance/warehouses/${warehouseId}`)
      .then(r => r.json())
      .then(d => setWarehouseAddr(d?.address ?? null))
      .catch(() => {});
  }, [warehouseId]);

  // Load item list (khi mở từ topbar không có itemId)
  React.useEffect(() => {
    if (initItemId || !warehouseId) return;
    fetch(`/api/plan-finance/stock-card/items?warehouseId=${warehouseId}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [initItemId, warehouseId]);

  const load = React.useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ inventoryItemId: itemId });
      if (warehouseId) params.set("warehouseId", warehouseId);
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      const res  = await fetch(`/api/plan-finance/stock-card?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Lỗi");
      setData(json);
    } catch (e) {
      toast.error("Lỗi tải thẻ kho", e instanceof Error ? e.message : "Lỗi");
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, warehouseId, from, to]);

  React.useEffect(() => { if (itemId) load(); }, [load, itemId]);

  const tonBan     = data?.tonDauKy ?? null;   // tồn TRƯỚC giao dịch đầu tiên trong kỳ
  const donGia     = data?.item.giaNhap ?? 0;
  const tongNhap   = data?.lines.reduce((s, l) => s + (l.nhap ?? 0), 0) ?? 0;
  const tongXuat   = data?.lines.reduce((s, l) => s + (l.xuat ?? 0), 0) ?? 0;
  const tonCuoi    = data?.lines[data.lines.length - 1]?.tonCuoi ?? 0;

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const sidebar = (
    <>
      {!initItemId && (
        <div>
          <SLabel>Mặt hàng</SLabel>
          <select value={itemId} onChange={e => { setItemId(e.target.value); setData(null); }} style={inp}>
            <option value="">-- Chọn mặt hàng --</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>{i.tenHang}{i.code ? ` (${i.code})` : ""}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <SLabel>Từ ngày</SLabel>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
      </div>
      <div>
        <SLabel>Đến ngày</SLabel>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
      </div>
      <button onClick={load}
        style={{ width: "100%", padding: "7px 0", border: "1px solid #e2e8f0", borderRadius: 7, background: "#f8fafc", color: "#334155", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
        <i className="bi bi-arrow-clockwise" style={{ marginRight: 5 }} />Tải lại
      </button>
      <div>
        <SLabel>Người ghi sổ</SLabel>
        <input value={nguoiGhiSo} onChange={e => setNguoiGhiSo(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
      <div>
        <SLabel>Kế toán trưởng</SLabel>
        <input value={ketoanTruong} onChange={e => setKetoanTruong(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
      <div>
        <SLabel>Giám đốc</SLabel>
        <input value={giamdoc} onChange={e => setGiamdoc(e.target.value)} placeholder="Họ tên..." style={inp} />
      </div>
    </>
  );

  // ── Actions (nút In) ─────────────────────────────────────────────────────────
  const actions = (
    <button
      onClick={() => printDocumentById("the-kho-doc", "landscape", `Thẻ kho - ${data?.item.tenHang ?? ""}`)}
      style={{ padding: "8px 22px", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
    >
      <i className="bi bi-printer" /> In thẻ kho
    </button>
  );

  // ── Document ─────────────────────────────────────────────────────────────────
  const doc = (
    <div className="pdf-content-page" style={{ fontFamily: "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif", fontSize: 13, color: "#000", lineHeight: 1.4 }}>

      {/* ── Header: Logo + Công ty | Mẫu số ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: "65%" }}>
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
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
          <p style={{ margin: 0, fontWeight: 700 }}>Mẫu sổ S12-DN</p>
          <p style={{ margin: 0, fontStyle: "italic" }}>(Theo TT 133/2016/TT-BTC)</p>
        </div>
      </div>

      {/* ── Tiêu đề ── */}
      <div style={{ textAlign: "center", marginTop: 10, marginBottom: 4 }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: 20, letterSpacing: "0.04em", textTransform: "uppercase" }}>Thẻ kho</p>
        <p style={{ margin: "3px 0 0", fontStyle: "italic", fontSize: 12 }}>
          Từ ngày {fmtDate(from)} đến ngày {fmtDate(to)}
        </p>
      </div>

      {/* ── Thông tin mặt hàng ── */}
      {data ? (
        <div style={{ marginBottom: 10, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4, gap: 4 }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Tên hàng hoá:</span>
            <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, marginLeft: 4 }}><strong>{data.item.tenHang}</strong>&nbsp;</span>
          </div>
          {data.item.code && (
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4, gap: 4 }}>
              <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Mã số:</span>
              <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, marginLeft: 4 }}>{data.item.code}&nbsp;</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4, gap: 4 }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Đơn vị tính:</span>
            <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, marginLeft: 4 }}>{data.item.donVi ?? ""}&nbsp;</span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: 24 }}>Kho hàng:</span>
            <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, marginLeft: 4 }}><strong>{warehouseName ?? "—"}</strong>&nbsp;</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4, gap: 4 }}>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>- Địa chỉ kho:</span>
            <span style={{ flex: 1, borderBottom: B05, paddingBottom: 1, marginLeft: 4 }}>{warehouseAddr ?? ""}&nbsp;</span>
          </div>
        </div>
      ) : !itemId ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Chọn mặt hàng ở sidebar để xem thẻ kho
        </div>
      ) : loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Đang tải...</div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Không có dữ liệu</div>
      )}

      {/* ── Bảng thẻ kho ── */}
      {data && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 10 }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Chứng từ</th>
                <th rowSpan={2} style={{ border: B1, padding: "5px 6px", textAlign: "center", fontWeight: 700, verticalAlign: "middle", minWidth: 180 }}>Diễn giải</th>
                <th rowSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700, verticalAlign: "middle", width: 70 }}>Đơn giá</th>
                <th colSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Nhập</th>
                <th colSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Xuất</th>
                <th colSpan={2} style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>Tồn</th>
              </tr>
              <tr>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 110, fontWeight: 700 }}>Số hiệu</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 78, fontWeight: 700 }}>Ngày</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 58, fontWeight: 700 }}>Số lượng</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 76, fontWeight: 700 }}>Thành tiền</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 58, fontWeight: 700 }}>Số lượng</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 76, fontWeight: 700 }}>Thành tiền</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 58, fontWeight: 700 }}>Số lượng</th>
                <th style={{ border: B1, padding: "4px", textAlign: "center", width: 76, fontWeight: 700 }}>Thành tiền</th>
              </tr>
              {/* Index row */}
              <tr style={{ fontStyle: "italic" }}>
                {["A","B","C","1","2","3=1×2","4","5=1×4","6","7"].map(c => (
                  <td key={c} style={{ border: B1, padding: "3px", textAlign: "center", fontSize: 11 }}>{c}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Số dư đầu kỳ */}
              <tr style={{ fontStyle: "italic", background: "#f8fafc" }}>
                <td style={{ border: B1, padding: "5px 4px" }}></td>
                <td style={{ border: B1, padding: "5px 4px" }}></td>
                <td style={{ border: B1, padding: "5px 6px", fontWeight: 700 }}>Số dư đầu kỳ</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{donGia ? fmtN(donGia) : ""}</td>
                <td style={{ border: B1 }}></td>
                <td style={{ border: B1 }}></td>
                <td style={{ border: B1 }}></td>
                <td style={{ border: B1 }}></td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "right", fontWeight: 700 }}>{fmtN(tonBan)}</td>
                <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>
                  {tonBan != null && donGia ? fmtN(tonBan * donGia) : ""}
                </td>
              </tr>

              {/* Phát sinh */}
              {data.lines.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ border: B1, padding: "20px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
                    Không có phát sinh trong kỳ
                  </td>
                </tr>
              ) : data.lines.map((line, idx) => {
                const nhapTT = line.nhap != null && donGia ? line.nhap * donGia : null;
                const xuatTT = line.xuat != null && donGia ? line.xuat * donGia : null;
                const tonTT  = donGia ? line.tonCuoi * donGia : null;
                const meta   = TYPE_META[line.type] ?? { label: line.type, color: "#555" };
                return (
                  <tr key={line.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ border: B1, padding: "5px 4px", fontFamily: "monospace", fontSize: 11, color: "#1d4ed8", whiteSpace: "nowrap" }}>{line.soChungTu ?? "—"}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(line.ngay)}</td>
                    <td style={{ border: B1, padding: "5px 6px", fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: meta.color }}>{meta.label}</span>
                      {line.lyDo && <span> — {line.lyDo}</span>}
                      {(line.fromKho || line.toKho) && (
                        <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#555", fontStyle: "italic" }}>
                          {line.fromKho ? `Từ: ${line.fromKho}` : ""}
                          {line.fromKho && line.toKho ? " → " : ""}
                          {line.toKho ?? ""}
                        </p>
                      )}
                      {line.nguoiThucHien && (
                        <p style={{ margin: "1px 0 0", fontSize: 10, color: "#777", fontStyle: "italic" }}>Người TH: {line.nguoiThucHien}</p>
                      )}
                    </td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "right", fontSize: 11.5 }}>{donGia ? fmtN(donGia) : ""}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 600 }}>{line.nhap != null ? fmtN(line.nhap) : ""}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{nhapTT != null ? fmtN(nhapTT) : ""}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 600 }}>{line.xuat != null ? fmtN(line.xuat) : ""}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{xuatTT != null ? fmtN(xuatTT) : ""}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "center", fontWeight: 700 }}>{fmtN(line.tonCuoi)}</td>
                    <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{tonTT != null ? fmtN(tonTT) : ""}</td>
                  </tr>
                );
              })}

              {/* Cộng */}
              {data.lines.length > 0 && (
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={3} style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>Cộng</td>
                  <td style={{ border: B1 }}></td>
                  <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{fmtN(tongNhap)}</td>
                  <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{donGia ? fmtN(tongNhap * donGia) : ""}</td>
                  <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{fmtN(tongXuat)}</td>
                  <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{donGia ? fmtN(tongXuat * donGia) : ""}</td>
                  <td style={{ border: B1, padding: "5px 4px", textAlign: "center" }}>{fmtN(tonCuoi)}</td>
                  <td style={{ border: B1, padding: "5px 4px", textAlign: "right" }}>{donGia ? fmtN(tonCuoi * donGia) : ""}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Ngày mở/khoá sổ */}
          <div style={{ display: "flex", gap: 40, fontSize: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ whiteSpace: "nowrap" }}>- Ngày Mở Số:</span>
              <span style={{ borderBottom: B05, flex: 1, minWidth: 80, paddingBottom: 1 }}>&nbsp;</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ whiteSpace: "nowrap" }}>- Ngày Khoá Sổ:</span>
              <span style={{ borderBottom: B05, flex: 1, minWidth: 80, paddingBottom: 1 }}>&nbsp;</span>
            </div>
          </div>

          {/* Chữ ký */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 0, marginTop: 8 }}>
            <div style={{ textAlign: "center", fontStyle: "italic", fontSize: 12 }}>
              Ngày &nbsp;....... &nbsp;tháng &nbsp;....... &nbsp;năm &nbsp;.......
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, textAlign: "center" }}>
            {[
              { role: "Người ghi sổ",    name: nguoiGhiSo },
              { role: "Kế toán trưởng",  name: ketoanTruong },
              { role: "Giám đốc",        name: giamdoc },
            ].map(s => (
              <div key={s.role} style={{ flex: 1, padding: "0 8px" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12 }}>{s.role}</p>
                <p style={{ margin: "1px 0 56px", fontSize: 11, fontStyle: "italic", color: "#555" }}>(Ký, họ tên)</p>
                {s.name && <p style={{ margin: 0, fontWeight: 700, fontSize: 11.5 }}>{s.name}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <PrintPreviewModal
      title="Thẻ kho"
      subtitle={
        data?.item.tenHang
          ? <><strong style={{ color: "#e2e8f0" }}>{data.item.tenHang}</strong>{warehouseName ? <> &nbsp;·&nbsp; Kho: <span style={{ color: "#38bdf8" }}>{warehouseName}</span></> : ""}</>
          : warehouseName ?? "Xem trước thẻ kho"
      }
      actions={actions}
      sidebar={sidebar}
      document={doc}
      documentId="the-kho-doc"
      printOrientation="landscape"
      onClose={onClose}
    />
  );
}
