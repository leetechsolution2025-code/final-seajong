"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Đang hợp tác", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  paused: { label: "Tạm ngưng", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  inactive: { label: "Dừng hợp tác", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

function parseContactNameAndRole(raw?: string | null): { name: string; role: string } {
  if (!raw) return { name: "", role: "" };
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*[\(\（\[]([^\)\）\]]+)[\)\）\]]\s*$/);
  if (match && match[1]) {
    return { name: match[1].trim(), role: match[2].trim() };
  }
  return { name: trimmed, role: "" };
}

interface CarrierDetailOffcanvasProps {
  carrier: any;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onChanged?: () => void;
}

export function CarrierDetailOffcanvas({
  carrier,
  onClose,
  onEdit,
  onDelete,
  onChanged,
}: CarrierDetailOffcanvasProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    fetch(`/api/plan-finance/carriers/${carrier.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.carrier) {
          setDetail(data.carrier);
        } else {
          setDetail(carrier);
        }
      })
      .catch(() => setDetail(carrier))
      .finally(() => setLoading(false));
  }, [carrier]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/plan-finance/carriers/${carrier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail((prev: any) => (prev ? { ...prev, trangThai: updated.trangThai } : null));
        onChanged?.();
      }
    } catch {}
  };

  const handleRate = async (rating: number) => {
    try {
      const res = await fetch(`/api/plan-finance/carriers/${carrier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ danhGia: rating }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail((prev: any) => (prev ? { ...prev, danhGia: updated.danhGia } : null));
        onChanged?.();
      }
    } catch {}
  };

  const currentItem = detail || carrier;
  const statusInfo = STATUS_MAP[currentItem.trangThai] || {
    label: currentItem.trangThai,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
  };

  let cleanNote = currentItem.ghiChu || "";
  cleanNote = cleanNote.replace(/\[CARRIER\]\s*/g, "").trim();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5100,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          maxWidth: "92vw",
          zIndex: 5200,
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-6px 0 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            background: "linear-gradient(to right, rgba(0, 48, 135, 0.05), transparent)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 18,
              width: 32,
              height: 32,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
          </button>

          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="badge rounded-pill fw-bold"
              style={{
                background: "rgba(0, 48, 135, 0.1)",
                color: "#003087",
                fontSize: 11,
                padding: "3px 8px",
              }}
            >
              {currentItem.code || "VCH"}
            </span>
            {currentItem.xungHo && (
              <span
                className="badge bg-secondary-subtle text-secondary rounded-pill"
                style={{ fontSize: 11, padding: "3px 8px" }}
              >
                {currentItem.xungHo}
              </span>
            )}
          </div>

          <h3
            style={{
              margin: "4px 36px 0 0",
              fontWeight: 800,
              fontSize: "17px",
              color: "var(--foreground)",
              lineHeight: 1.3,
            }}
          >
            {currentItem.name}
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: 700,
                color: statusInfo.color,
                background: statusInfo.bg,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusInfo.color }} />
              {statusInfo.label}
            </span>

            {/* Stars */}
            <div className="d-flex align-items-center" title="Click để chấm điểm dịch vụ">
              {[1, 2, 3, 4, 5].map((star) => (
                <i
                  key={star}
                  onClick={() => handleRate(star)}
                  className={`bi ${
                    star <= (currentItem.danhGia || 5) ? "bi-star-fill text-warning" : "bi-star text-muted"
                  }`}
                  style={{ fontSize: 14, marginLeft: 2, cursor: "pointer" }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-grow-1 overflow-auto custom-scrollbar p-3 d-flex flex-column gap-3"
          style={{ fontSize: 13 }}
        >
          {/* Thông tin liên hệ & điều phối */}
          <div className="bg-light rounded-3 p-3 border">
            <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-person-lines-fill" /> Liên hệ & Điều phối
            </h6>
            <div className="d-flex flex-column gap-2">
              {(() => {
                const { name: cName, role: cRole } = parseContactNameAndRole(currentItem.contactName);
                return (
                  <div className="d-flex justify-content-between align-items-start">
                    <span className="text-muted">Người điều phối:</span>
                    <div className="text-end">
                      <div className="fw-semibold text-dark">{cName || "Chưa cập nhật"}</div>
                      {cRole && (
                        <span
                          className="badge rounded-pill fw-medium mt-0.5"
                          style={{
                            fontSize: "10.5px",
                            color: "#4b5563",
                            background: "rgba(107, 114, 128, 0.12)",
                            border: "1px solid rgba(107, 114, 128, 0.2)",
                            padding: "1px 7px"
                          }}
                        >
                          {cRole}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="d-flex justify-content-between">
                <span className="text-muted">Số điện thoại:</span>
                <span className="fw-bold text-dark">{currentItem.phone || "Chưa có"}</span>
              </div>
              {currentItem.email && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Email:</span>
                  <span>{currentItem.email}</span>
                </div>
              )}
              {currentItem.website && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Cổng tra cứu:</span>
                  <a href={currentItem.website} target="_blank" rel="noreferrer" className="text-primary text-decoration-none">
                    Tra mã vận đơn <i className="bi bi-box-arrow-up-right small" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Địa chỉ bến bãi / kho tiếp nhận */}
          <div className="bg-light rounded-3 p-3 border">
            <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-geo-alt" /> Địa chỉ kho bãi & Bưu cục
            </h6>
            <div className="text-secondary" style={{ lineHeight: 1.4 }}>
              {currentItem.address || "Chưa cập nhật địa chỉ tiếp nhận hàng"}
            </div>
          </div>

          {/* Dịch vụ & Công nợ cước */}
          <div className="bg-light rounded-3 p-3 border">
            <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-cash-stack" /> Cước phí & Hạn mức
            </h6>
            <div className="d-flex flex-column gap-2">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Loại hình vận tải:</span>
                <span className="fw-bold">{currentItem.xungHo || "Chuyển phát tiêu chuẩn"}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Hạn mức nợ cước:</span>
                <span className="fw-bold text-success">
                  {currentItem.hanMucNo ? currentItem.hanMucNo.toLocaleString("vi-VN") + " ₫" : "Theo từng đơn"}
                </span>
              </div>
            </div>
          </div>

          {/* Ghi chú tuyến đường */}
          {cleanNote && (
            <div className="bg-light rounded-3 p-3 border">
              <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                <i className="bi bi-map" /> Tuyến đường & Ghi chú
              </h6>
              <div className="text-muted" style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {cleanNote}
              </div>
            </div>
          )}

          {/* Chuyển đổi trạng thái nhanh */}
          <div className="bg-light rounded-3 p-3 border">
            <h6 className="fw-bold mb-2 text-primary d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
              <i className="bi bi-arrow-repeat" /> Trạng thái hợp tác
            </h6>
            <div className="d-flex gap-2">
              {["active", "paused", "inactive"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`btn btn-sm flex-grow-1 rounded-pill ${
                    currentItem.trangThai === st ? "btn-dark fw-bold" : "btn-outline-secondary"
                  }`}
                  style={{ fontSize: 11.5 }}
                >
                  {STATUS_MAP[st]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--background)",
          }}
        >
          <button
            onClick={() => onDelete(currentItem.id, currentItem.name)}
            className="btn btn-outline-danger btn-sm rounded-pill px-3 d-flex align-items-center gap-1.5"
            style={{ fontSize: 12.5 }}
          >
            <i className="bi bi-trash" /> Xóa
          </button>

          <button
            onClick={() => onEdit(currentItem.id)}
            className="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-1.5"
            style={{ fontSize: 12.5, fontWeight: 700, background: "#003087", borderColor: "#003087" }}
          >
            <i className="bi bi-pencil-square" /> Chỉnh sửa
          </button>
        </div>
      </motion.div>
    </>
  );
}
