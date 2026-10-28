"use client";
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface LineDetail {
  id: string;
  inventoryItemId: string;
  tenHang: string;
  maSku: string | null;
  donVi: string | null;
  soLuongHeTong: number;
  soLuongThucTe: number | null;
  chenh: number | null;
  ghiChu: string | null;
}

interface StockCountDetail {
  id: string;
  soChungTu: string | null;
  scope: string;
  warehouseId: string | null;
  warehouseName: string | null;
  nguoiKiem: string | null;
  ngayKiem: string;
  ghiChu: string | null;
  trangThai: string;
  lines: LineDetail[];
}

export interface StockCountDetailsOffcanvasProps {
  stockCountId: string;
  onClose: () => void;
}

const fmtDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  "hoan-thanh": { label: "Hoàn thành", color: "#065f46", bg: "rgba(16, 185, 129, 0.08)" },
  "nhap":       { label: "Chưa hoàn thành", color: "#1d4ed8", bg: "rgba(37, 99, 235, 0.08)" },
  "huy-bo":     { label: "Huỷ bỏ", color: "#b91c1c", bg: "rgba(239, 68, 68, 0.08)" },
};

export function StockCountDetailsOffcanvas({ stockCountId, onClose }: StockCountDetailsOffcanvasProps) {
  const toast = useToast();
  const [data, setData] = useState<StockCountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  useEffect(() => {
    if (!stockCountId) return;
    setLoading(true);
    fetch(`/api/plan-finance/stock-counts/${stockCountId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Không thể tải chi tiết phiếu kiểm kho");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => toast.error("Lỗi", err.message))
      .finally(() => setLoading(false));
  }, [stockCountId, toast]);

  // ESC key to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const statusMeta = data ? (STATUS_META[data.trangThai] ?? { label: data.trangThai, color: "var(--foreground)", bg: "var(--muted)" }) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .audit-detail-oc { transition: transform 0.27s cubic-bezier(.4,0,.2,1); }
      `}} />

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5100,
          background: visible ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
          transition: "background 0.27s",
        }}
      />

      {/* Offcanvas Body */}
      <div
        className="audit-detail-oc app-custom-drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          zIndex: 5200,
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-6px 0 28px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(0,48,135,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="bi bi-clipboard-check" style={{ fontSize: 14, color: "#003087" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Chi tiết kết quả kiểm kho</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
              Chi tiết các dòng đối soát kiểm kê thực tế
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 28,
              height: 28,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              borderRadius: 7,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <i className="bi bi-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--background)", padding: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />
              Đang tải chi tiết...
            </div>
          ) : !data ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
              <i className="bi bi-exclamation-triangle" style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 12.5 }}>Không tìm thấy thông tin phiếu kiểm kho</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Slip Info Card */}
              <div
                style={{
                  background: "var(--card)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                      Số chứng từ
                    </span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#003087", fontFamily: "monospace", marginTop: 2 }}>
                      {data.soChungTu ?? "—"}
                    </div>
                  </div>
                  {statusMeta && (
                    <span
                      style={{
                        fontWeight: 700,
                        color: statusMeta.color,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: statusMeta.bg,
                        fontSize: 11
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    fontSize: 12.5,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <div>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Ngày kiểm: </span>
                    <div style={{ fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>
                      {fmtDate(data.ngayKiem)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Kho kiểm: </span>
                    <div style={{ fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>
                      {data.warehouseName ?? "—"}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Người kiểm kê: </span>
                  <div style={{ fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>
                    {data.nguoiKiem ?? "—"}
                  </div>
                </div>

                {data.ghiChu && (
                  <div style={{ fontSize: 12.5, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Ghi chú: </span>
                    <div style={{ color: "var(--foreground)", marginTop: 1, fontStyle: "italic" }}>
                      {data.ghiChu}
                    </div>
                  </div>
                )}
              </div>

              {/* Items List Label */}
              <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Danh sách mặt hàng kiểm kê ({data.lines.length})
              </p>

              {/* Lines List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.lines.map((line) => {
                  const chenhValue = line.chenh ?? 0;
                  const chenhColor = chenhValue === 0 ? "var(--muted-foreground)" : chenhValue > 0 ? "#10b981" : "#ef4444";
                  const chenhSign = chenhValue > 0 ? "+" : "";

                  return (
                    <div
                      key={line.id}
                      style={{
                        padding: "10px 12px",
                        background: "var(--card)",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        fontSize: 12.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 13 }}>
                        {line.tenHang}
                      </div>
                      {line.maSku && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                          SKU: {line.maSku}
                        </div>
                      )}
                      
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 6,
                          fontSize: 12,
                          marginTop: 6,
                          paddingTop: 6,
                          borderTop: "1px dashed var(--border)",
                          textAlign: "center"
                        }}
                      >
                        <div>
                          <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>Hệ thống:</span>
                          <div style={{ fontWeight: 600, marginTop: 1 }}>
                            {line.soLuongHeTong} {line.donVi ?? ""}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>Thực tế:</span>
                          <div style={{ fontWeight: 700, marginTop: 1, color: line.soLuongThucTe === null ? "var(--muted-foreground)" : "var(--foreground)" }}>
                            {line.soLuongThucTe !== null ? `${line.soLuongThucTe} ${line.donVi ?? ""}` : "—"}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>Lệch:</span>
                          <div style={{ fontWeight: 700, marginTop: 1, color: chenhColor }}>
                            {line.soLuongThucTe !== null ? `${chenhSign}${chenhValue}` : "—"}
                          </div>
                        </div>
                      </div>

                      {line.ghiChu && (
                        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 4, fontStyle: "italic" }}>
                          Ghi chú mặt hàng: {line.ghiChu}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
