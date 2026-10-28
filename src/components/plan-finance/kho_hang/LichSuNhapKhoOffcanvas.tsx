"use client";
import React from "react";

interface MovementItem {
  id: string;
  type: string;
  soChungTu?: string | null;
  createdAt: string;
  soLuong: number;
  donGia?: number | null;
  lyDo?: string | null;
  nguoiThucHien?: string | null;
  inventoryItem?: {
    id: string;
    code?: string | null;
    tenHang: string;
    donVi?: string | null;
  } | null;
  toWarehouse?: {
    id: string;
    code?: string | null;
    name: string;
  } | null;
}

interface PhieuNhapGroup {
  soChungTu: string;
  createdAt: string;
  warehouseName: string;
  nguoiThucHien: string;
  lyDo: string;
  tongSoLuong: number;
  tongTien: number;
  movements: MovementItem[];
}

export interface LichSuNhapKhoOffcanvasProps {
  onClose: () => void;
}

const fmtDateTime = (s: string) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + " ₫";

export function LichSuNhapKhoOffcanvas({ onClose }: LichSuNhapKhoOffcanvasProps) {
  const [movements, setMovements] = React.useState<MovementItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [visible, setVisible] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<PhieuNhapGroup | null>(null);

  // Animate in
  React.useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  // Fetch stock movements
  React.useEffect(() => {
    fetch("/api/plan-finance/stock-movements?limit=100")
      .then((r) => r.json())
      .then((d) => setMovements(Array.isArray(d) ? d : []))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, []);

  // ESC key to close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group movements by soChungTu
  const groupList = React.useMemo(() => {
    const groups: Record<string, PhieuNhapGroup> = {};
    movements.forEach((m) => {
      if (m.type !== "nhap") return;
      const key = m.soChungTu || "Không số";
      if (!groups[key]) {
        groups[key] = {
          soChungTu: key,
          createdAt: m.createdAt,
          warehouseName: m.toWarehouse?.name || "—",
          nguoiThucHien: m.nguoiThucHien || "—",
          lyDo: m.lyDo || "—",
          tongSoLuong: 0,
          tongTien: 0,
          movements: [],
        };
      }
      groups[key].tongSoLuong += m.soLuong;
      groups[key].tongTien += m.soLuong * (m.donGia || 0);
      groups[key].movements.push(m);
    });
    return Object.values(groups).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [movements]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .nhap-history-oc { transition: transform 0.27s cubic-bezier(.4,0,.2,1); }
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
        className="nhap-history-oc app-custom-drawer"
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
          {selectedGroup ? (
            <button
              onClick={() => setSelectedGroup(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px 4px 0",
                display: "flex",
                alignItems: "center",
                gap: 5,
                color: "var(--foreground)",
                fontWeight: 700,
                fontSize: 13.5,
                outline: "none",
              }}
            >
              <i className="bi bi-chevron-left" style={{ fontSize: 14 }} />
              Quay lại
            </button>
          ) : (
            <>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-clock-history" style={{ fontSize: 14, color: "#10b981" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Lịch sử nhập hàng</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
                  Danh sách phiếu nhập kho đã thực hiện
                </p>
              </div>
            </>
          )}

          {selectedGroup && <div style={{ flex: 1 }} />}

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

        {/* 2-Slide container */}
        <div
          style={{
            flex: 1,
            display: "flex",
            width: "200%",
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: selectedGroup ? "translateX(-50%)" : "translateX(0)",
            minHeight: 0,
          }}
        >
          {/* Slide 1: List (width: 50%) */}
          <div
            style={{
              width: "50%",
              height: "100%",
              overflowY: "auto",
              background: "var(--background)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", marginRight: 6 }} />
                Đang tải danh sách...
              </div>
            ) : groupList.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox" style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 12.5 }}>Chưa có phiếu nhập kho nào</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
                {groupList.map((group) => (
                  <div
                    key={group.soChungTu}
                    onClick={() => setSelectedGroup(group)}
                    style={{
                      background: "var(--card)",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      padding: "12px 14px",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#10b981", fontFamily: "monospace" }}>
                        {group.soChungTu}
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>
                        {fmtDateTime(group.createdAt)}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Kho nhận: </span>
                        <strong style={{ color: "var(--foreground)" }}>{group.warehouseName}</strong>
                      </div>
                      {group.nguoiThucHien !== "—" && (
                        <div>
                          <span style={{ color: "var(--muted-foreground)" }}>Người thực hiện: </span>
                          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{group.nguoiThucHien}</span>
                        </div>
                      )}
                    </div>

                    {/* Summary stats */}
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", padding: "1px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                        {group.movements.length} mặt hàng ({group.tongSoLuong.toLocaleString("vi-VN")})
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <strong style={{ color: "var(--foreground)" }}>
                          {fmtVnd(group.tongTien)}
                        </strong>
                        <i className="bi bi-chevron-right" style={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slide 2: Details (width: 50%) */}
          <div
            style={{
              width: "50%",
              height: "100%",
              overflowY: "auto",
              background: "var(--background)",
            }}
          >
            {selectedGroup && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
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
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                      Mã phiếu
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981", fontFamily: "monospace", marginTop: 2 }}>
                      {selectedGroup.soChungTu}
                    </div>
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
                      <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Thời gian: </span>
                      <div style={{ fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>
                        {fmtDateTime(selectedGroup.createdAt)}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Kho nhận: </span>
                      <div style={{ fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>
                        {selectedGroup.warehouseName}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Người thực hiện: </span>
                    <div style={{ fontWeight: 600, color: "var(--foreground)", marginTop: 1 }}>
                      {selectedGroup.nguoiThucHien}
                    </div>
                  </div>

                  {selectedGroup.lyDo !== "—" && (
                    <div style={{ fontSize: 12.5, borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                      <span style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>Lý do nhập: </span>
                      <div style={{ color: "var(--foreground)", marginTop: 1, fontStyle: "italic" }}>
                        {selectedGroup.lyDo}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List Label */}
                <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Danh sách sản phẩm ({selectedGroup.movements.length})
                </p>

                {/* Items list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedGroup.movements.map((mv) => (
                    <div
                      key={mv.id}
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
                        {mv.inventoryItem?.tenHang}
                      </div>
                      {mv.inventoryItem?.code && (
                        <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                          SKU: {mv.inventoryItem.code}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 12,
                          marginTop: 4,
                          paddingTop: 4,
                          borderTop: "1px dashed var(--border)",
                        }}
                      >
                        <span>
                          SL nhập: <strong style={{ color: "var(--foreground)" }}>{mv.soLuong.toLocaleString("vi-VN")}</strong> {mv.inventoryItem?.donVi || ""}
                        </span>
                        <strong style={{ color: "#10b981" }}>
                          {mv.donGia ? fmtVnd(mv.soLuong * mv.donGia) : "—"}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand Total */}
                <div
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#10b981" }}>TỔNG CỘNG PHIẾU</span>
                  <strong style={{ fontSize: 16, color: "#10b981" }}>{fmtVnd(selectedGroup.tongTien)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
