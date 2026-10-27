"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type StockCheckItem = {
  /** Tên hàng — dùng để lọc dòng hợp lệ */
  ten: string;
  /** Số lượng cần (báo giá / xuất kho) */
  soLuong: number;
  /** Số lượng tồn kho thực tế. null = chưa có tồn (không kiểm tra) */
  soLuongTon: number | null | undefined;
};

export interface TrangThaiTonKhoBadgeProps {
  items: StockCheckItem[];
  /**
   * Hiển thị nút "Tạo yêu cầu mua hàng" khi thiếu hàng.
   * @default true
   */
  showPurchaseRequest?: boolean;
  /** Callback khi nhấn nút tạo yêu cầu mua hàng */
  onCreatePR?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function TrangThaiTonKhoBadge({
  items,
  showPurchaseRequest = true,
  onCreatePR,
}: TrangThaiTonKhoBadgeProps) {
  // Chỉ xét các dòng có tên hàng và đã biết số lượng tồn
  const checkedItems = items.filter(
    (it) =>
      it.ten.trim() &&
      it.soLuong > 0 &&
      it.soLuongTon !== null &&
      it.soLuongTon !== undefined
  );

  // Chưa có dữ liệu đủ để kiểm tra → không hiển thị gì
  if (checkedItems.length === 0) return null;

  // Các mặt hàng bị thiếu (bao gồm hết hàng và không đủ số lượng)
  const deficientItems = checkedItems.filter(
    (it) => it.soLuong > (it.soLuongTon as number)
  );

  if (deficientItems.length === 0) {
    // Đủ hàng
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 700,
          color: "#10b981",
          background: "rgba(16,185,129,0.1)",
          borderRadius: 20,
          padding: "3px 10px",
          border: "1px solid rgba(16,185,129,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        <i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} />
        Đủ hàng
      </span>
    );
  }

  // Không đủ hàng
  return (
    <>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 700,
          color: "#f43f5e",
          background: "rgba(244,63,94,0.08)",
          borderRadius: 20,
          padding: "3px 10px",
          border: "1px solid rgba(244,63,94,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: 11 }} />
        Không đủ hàng
        <span style={{ fontWeight: 400, fontSize: 10.5, marginLeft: 2 }}>
          ({deficientItems.length} mặt hàng)
        </span>
      </span>

      {showPurchaseRequest && onCreatePR && (
        <button
          onClick={onCreatePR}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(245,158,11,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(245,158,11,0.1)";
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 12px",
            border: "1.5px solid #f59e0b",
            background: "rgba(245,158,11,0.1)",
            color: "#f59e0b",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 20,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background 0.15s",
          }}
        >
          <i className="bi bi-megaphone" style={{ fontSize: 11 }} />
          Báo cáo thiếu hàng
        </button>
      )}
    </>
  );
}

export default TrangThaiTonKhoBadge;
