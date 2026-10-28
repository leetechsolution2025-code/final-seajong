"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

export const CARRIER_SERVICE_TYPES = [
  { label: "Chuyển phát nhanh", value: "Chuyển phát nhanh", color: "indigo" },
  { label: "Chành xe Bắc Nam", value: "Chành xe Bắc Nam", color: "blue" },
  { label: "Vận tải đường bộ", value: "Vận tải đường bộ", color: "emerald" },
  { label: "Xe tải nội bộ", value: "Xe tải nội bộ", color: "cyan" },
  { label: "Vận tải Container", value: "Vận tải Container", color: "purple" },
  { label: "Hỏa tốc nội thành", value: "Hỏa tốc nội thành", color: "orange" },
];

interface AddCarrierModalProps {
  onClose: () => void;
  onSaved: (carrier: { id: string; name: string }) => void;
  carrierId?: string | null;
  onDelete?: (id: string, name: string) => void;
}

export function AddCarrierModal({ onClose, onSaved, carrierId, onDelete }: AddCarrierModalProps) {
  const inputSt: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 13,
    background: "var(--background)",
    color: "var(--foreground)",
    outline: "none",
    boxSizing: "border-box",
  };

  const [form, setForm] = useState({
    code: "",
    name: "",
    transactionAddress: "",
    serviceType: "Chuyển phát nhanh",
    contactName: "",
    contactRole: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    routes: "",
    hanMucNo: 0,
    danhGia: 5,
    trangThai: "active",
    ghiChu: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(!!carrierId);

  // Lắng nghe phím ESC để đóng offcanvas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch carrier data thực tế từ DB nếu editing
  useEffect(() => {
    if (!carrierId) return;
    setLoadingData(true);
    fetch(`/api/plan-finance/carriers/${carrierId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.carrier) {
          const c = data.carrier;
          setForm({
            code: c.code || "",
            name: c.name || "",
            transactionAddress: c.transactionAddress || "",
            serviceType: c.serviceType || "Chuyển phát nhanh",
            contactName: c.contactName || "",
            contactRole: c.contactRole || "",
            phone: c.phone || "",
            email: c.email || "",
            website: c.website || "",
            address: c.address || "",
            routes: c.routes || "",
            hanMucNo: c.hanMucNo || 0,
            danhGia: c.danhGia || 5,
            trangThai: c.trangThai || "active",
            ghiChu: c.ghiChu || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [carrierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên đơn vị vận chuyển");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const endpoint = carrierId
        ? `/api/plan-finance/carriers/${carrierId}`
        : `/api/plan-finance/carriers`;
      const method = carrierId ? "PATCH" : "POST";

      const payload = {
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        transactionAddress: form.transactionAddress.trim() || null,
        serviceType: form.serviceType,
        contactName: form.contactName.trim() || null,
        contactRole: form.contactRole.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        routes: form.routes.trim() || null,
        hanMucNo: form.hanMucNo || 0,
        danhGia: form.danhGia || 5,
        trangThai: form.trangThai,
        ghiChu: form.ghiChu.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể lưu thông tin đơn vị vận chuyển");
      }

      const result = await res.json();
      onSaved(result);
    } catch (err: any) {
      setError(err.message || "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

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
          zIndex: 5300,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Offcanvas Drawer rộng 400px */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: "92vw",
          zIndex: 5400,
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 28px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, rgba(0, 48, 135, 0.05), transparent)",
            flexShrink: 0,
          }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 34, height: 34, background: "rgba(0, 48, 135, 0.1)", color: "#003087" }}
            >
              <i className="bi bi-truck fs-6" />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h6 className="mb-0 fw-bold" style={{ fontSize: "15px", color: "var(--foreground)" }}>
                  {carrierId ? "Chỉnh sửa đơn vị vận chuyển" : "Thêm mới đơn vị vận chuyển"}
                </h6>
                {carrierId && form.code && (
                  <span
                    className="badge rounded-pill fw-semibold"
                    style={{
                      fontSize: "11px",
                      background: "rgba(0, 48, 135, 0.08)",
                      color: "#003087",
                      border: "1px solid rgba(0, 48, 135, 0.2)",
                      padding: "2px 8px",
                    }}
                  >
                    {form.code}
                  </span>
                )}
              </div>
              <div className="text-muted small" style={{ fontSize: "11px" }}>
                {carrierId ? "Cập nhật thông tin đối tác vận chuyển" : "Đối tác vận tải & giao nhận hàng hóa"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-link text-muted p-0"
            style={{ fontSize: 18, textDecoration: "none" }}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1 overflow-hidden">
          <div
            className="p-3.5 flex-grow-1 overflow-auto custom-scrollbar d-flex flex-column gap-3"
            style={{ fontSize: 13, padding: "18px 20px" }}
          >
            {loadingData ? (
              <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5 my-auto text-muted">
                <div className="spinner-border text-primary mb-2.5" role="status" style={{ width: 28, height: 28 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Đang tải thông tin đơn vị vận chuyển...</span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="alert alert-danger py-2 px-3 mb-1 small d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

            {/* Tên đơn vị vận chuyển */}
            <div>
              <label className="form-label fw-bold mb-1">
                Tên đơn vị vận chuyển <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                style={inputSt}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Viettel Post, Giao Hàng Nhanh (GHN)..."
                required
              />
            </div>

            {/* Địa chỉ giao dịch */}
            <div>
              <label className="form-label fw-bold mb-1">Địa chỉ giao dịch</label>
              <input
                type="text"
                style={inputSt}
                value={form.transactionAddress}
                onChange={(e) => setForm((f) => ({ ...f, transactionAddress: e.target.value }))}
                placeholder="Số nhà, đường, văn phòng trụ sở..."
              />
            </div>

            {/* Loại hình dịch vụ & Trạng thái cùng dòng */}
            <div className="row g-2">
              <div className="col-7">
                <label className="form-label fw-bold mb-1">Loại hình dịch vụ</label>
                <select
                  style={inputSt}
                  value={form.serviceType}
                  onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
                >
                  {CARRIER_SERVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-5">
                <label className="form-label fw-bold mb-1">Trạng thái</label>
                <select
                  style={inputSt}
                  value={form.trangThai}
                  onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
                >
                  <option value="active">Đang hợp tác</option>
                  <option value="paused">Tạm ngưng</option>
                  <option value="inactive">Dừng hợp tác</option>
                </select>
              </div>
            </div>

            {/* Người điều phối / liên hệ */}
            <div className="row g-2">
              <div className="col-7">
                <label className="form-label fw-bold mb-1">Người điều phối / Liên hệ</label>
                <input
                  type="text"
                  style={inputSt}
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  placeholder="VD: Nguyễn Văn Thắng"
                />
              </div>
              <div className="col-5">
                <label className="form-label fw-bold mb-1">Chức vụ / Vị trí</label>
                <input
                  type="text"
                  style={inputSt}
                  value={form.contactRole}
                  onChange={(e) => setForm((f) => ({ ...f, contactRole: e.target.value }))}
                  placeholder="VD: Quản lý"
                />
              </div>
            </div>

            {/* Số điện thoại & Email cùng dòng (SĐT col-5 nhỏ hơn Email col-7) */}
            <div className="row g-2">
              <div className="col-5">
                <label className="form-label fw-bold mb-1">Số điện thoại / Hotline</label>
                <input
                  type="text"
                  style={inputSt}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="0988 123 456..."
                />
              </div>
              <div className="col-7">
                <label className="form-label fw-bold mb-1">Email liên hệ</label>
                <input
                  type="email"
                  style={inputSt}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="logistics@doitac.com"
                />
              </div>
            </div>

            {/* Website / Cổng tra cứu */}
            <div>
              <label className="form-label fw-bold mb-1">Website / Cổng tra mã vận đơn</label>
              <input
                type="text"
                style={inputSt}
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Địa chỉ bến bãi / kho tiếp nhận */}
            <div>
              <label className="form-label fw-bold mb-1">
                Địa chỉ bến bãi / Kho tiếp nhận hàng
              </label>
              <input
                type="text"
                style={inputSt}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="VD: KCN Yên Nghĩa, Bãi xe Giải Phóng, Tổng kho..."
              />
            </div>

            {/* Tuyến đường vận chuyển */}
            <div>
              <label className="form-label fw-bold mb-1">Tuyến đường phục vụ</label>
              <input
                type="text"
                style={inputSt}
                value={form.routes}
                onChange={(e) => setForm((f) => ({ ...f, routes: e.target.value }))}
                placeholder="VD: Hà Nội - Đà Nẵng - TP.HCM, nội thành bán kính 100km..."
              />
            </div>

            {/* Hạn mức công nợ cước */}
            <div>
              <label className="form-label fw-bold mb-1">Hạn mức công nợ cước (đồng)</label>
              <CurrencyInput
                style={inputSt}
                value={form.hanMucNo}
                onChange={(val) => setForm((f) => ({ ...f, hanMucNo: val }))}
                placeholder="0"
              />
            </div>


                {/* Ghi chú thêm */}
                <div>
                  <label className="form-label fw-bold mb-1">Ghi chú thêm</label>
                  <textarea
                    style={{ ...inputSt, resize: "vertical", minHeight: 68 }}
                    value={form.ghiChu}
                    onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                    placeholder="Thời hạn đối soát cước, bảng giá hợp đồng, loại xe..."
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer ghim dưới cùng */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: carrierId && onDelete ? "space-between" : "flex-end",
              alignItems: "center",
              gap: 10,
              background: "var(--card)",
              flexShrink: 0,
            }}
          >
            {carrierId && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(carrierId, form.name)}
                className="btn btn-outline-danger btn-sm rounded-pill px-3 d-flex align-items-center gap-1.5"
                style={{ fontWeight: 600 }}
                disabled={saving || loadingData}
              >
                <i className="bi bi-trash" />
                <span>Xoá</span>
              </button>
            )}
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-light btn-sm rounded-pill px-3"
                style={{ fontWeight: 600, border: "1px solid var(--border)" }}
                disabled={saving}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm rounded-pill px-3.5 d-flex align-items-center gap-1.5"
                style={{
                  fontWeight: 700,
                  background: "#003087",
                  borderColor: "#003087",
                }}
                disabled={saving || loadingData}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2" />
                    <span>{carrierId ? "Cập nhật" : "Lưu đơn vị vận chuyển"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </>
  );
}
