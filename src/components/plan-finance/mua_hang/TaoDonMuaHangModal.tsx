"use client";
import React from "react";
import XemTruocDonMuaHangModal from "./XemTruocDonMuaHangModal";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ReqItem {
  id: string;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  donGiaDK: number;
  inventoryItemId: string | null;
  trangThaiXuLy?: string;   // cho-xu-ly | da-tao-don | bo-qua
  ghiChu?: string | null;
  ngayGiao?: string | null;
  inventoryItem: {
    code: string | null;
    tenHang: string;
    donVi: string | null;
    categoryId: string | null;
    thongSoKyThuat: string | null;
    imageUrl: string | null;
    giaNhap?: number;
  } | null;
}

interface Supplier {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  categories: { category: { id: string; name: string } }[];
}

interface Assignment {
  itemId: string;
  supplierId: string | null;
  donGia: number;
  ngayGiao: string;   // ISO date string
  skip: boolean;
}

interface Props {
  reqId?: string;
  reqCode?: string | null;
  items: ReqItem[];
  onClose: () => void;
  onCreated: () => void;
  // Edit mode props
  editOrderId?: string;
  editSupplierId?: string | null;
  editNgayNhan?: string | null;
  editGhiChu?: string | null;
}

function fmtVnd(n: number) {
  if (!n) return "—";
  return n.toLocaleString("vi-VN") + " ₫";
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── Component ──────────────────────────────────────────────────────────────────
export default function TaoDonMuaHangModal({
  reqId,
  reqCode,
  items,
  onClose,
  onCreated,
  editOrderId,
  editSupplierId,
  editNgayNhan,
  editGhiChu,
}: Props) {
  const [suppliers, setSuppliers]     = React.useState<Supplier[]>([]);
  const [suppLoading, setSuppLoading] = React.useState(true);
  const [modalItems, setModalItems]   = React.useState<ReqItem[]>(items);
  const [assignments, setAssignments] = React.useState<Assignment[]>(() =>
    items.map(i => ({
      itemId:     i.id,
      supplierId: editSupplierId ?? null,
      donGia:     (i.inventoryItem?.giaNhap && i.inventoryItem.giaNhap > 0) ? i.inventoryItem.giaNhap : (i.donGiaDK > 0 ? i.donGiaDK : 0),
      ngayGiao:   i.ngayGiao ? i.ngayGiao.slice(0, 10) : (editNgayNhan ? editNgayNhan.slice(0, 10) : today),
      // Items đã xử lý: đánh dấu skip ngay từ đầu
      skip: !editOrderId && (i.trangThaiXuLy === "da-tao-don" || i.trangThaiXuLy === "bo-qua"),
    }))
  );
  const [step, setStep]               = React.useState<"assign" | "confirm">("assign");
  const [submitting, setSubmitting]   = React.useState(false);
  const [result, setResult]           = React.useState<null | {
    createdOrders: { code: string | null; supplierName: string; soMatHang: number }[];
  }>(null);
  // NCC đang được chọn để tạo đơn (bắt buộc chọn cụ thể)
  const [activeSupId, setActiveSupId]           = React.useState<string | null>(editSupplierId ?? null);
  const [editGhiChuState, setEditGhiChuState] = React.useState<string | null>(editGhiChu ?? null);
  // NCC đã tạo đơn xong
  const [processedIds, setProcessedIds]         = React.useState<string[]>([]);
  // Tất cả đơn đã tạo (gộp lại qua nhiều lần submit)
  const [allCreatedOrders, setAllCreatedOrders]  = React.useState<{ code: string | null; supplierName: string; soMatHang: number }[]>([]);
  // Hiện preview modal
  const [showPreview, setShowPreview]           = React.useState(false);
  const [isEditPreview, setIsEditPreview]       = React.useState(false);

  // Group items by tenHang for display
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, {
      tenHang: string;
      donVi: string | null;
      soLuong: number;
      donGiaDK: number;
      inventoryItemId: string | null;
      inventoryItem: any;
      originalItems: ReqItem[];
    }> = {};

    modalItems.forEach(item => {
      const key = item.tenHang;
      if (!groups[key]) {
        groups[key] = {
          tenHang: item.tenHang,
          donVi: item.donVi,
          soLuong: 0,
          donGiaDK: item.donGiaDK,
          inventoryItemId: item.inventoryItemId,
          inventoryItem: item.inventoryItem,
          originalItems: [],
        };
      }
      groups[key].soLuong += item.soLuong;
      groups[key].originalItems.push(item);
    });

    return Object.values(groups);
  }, [modalItems]);

  // Esc
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, submitting]);

  // Fetch NCC active
  React.useEffect(() => {
    setSuppLoading(true);
    fetch("/api/plan-finance/suppliers?trangThai=active&limit=200")
      .then(r => r.json())
      .then(d => setSuppliers(d.items ?? []))
      .catch(() => setSuppliers([]))
      .finally(() => setSuppLoading(false));
  }, []);

  const setAssign = (itemId: string, patch: Partial<Assignment>) =>
    setAssignments(prev => prev.map(a => a.itemId === itemId ? { ...a, ...patch } : a));

  const handleQuantityChange = (itemId: string, qty: number) => {
    setModalItems(prev => prev.map(item => item.id === itemId ? { ...item, soLuong: qty } : item));
  };

  // Filter NCC theo danh mục
  const suppliersFor = (item: ReqItem): { matched: Supplier[]; others: Supplier[] } => {
    const catId = item.inventoryItem?.categoryId;
    if (!catId) return { matched: [], others: suppliers };
    const matched    = suppliers.filter(s => s.categories.some(c => c.category.id === catId));
    const matchedIds = new Set(matched.map(s => s.id));
    return { matched, others: suppliers.filter(s => !matchedIds.has(s.id)) };
  };

  // NCC đã được chọn (có ít nhất 1 item)
  const selectedSuppliers = React.useMemo(() => {
    const ids = [...new Set(assignments.filter(a => !a.skip && a.supplierId).map(a => a.supplierId!))];
    return ids.map(id => ({
      supplier: suppliers.find(s => s.id === id),
      id,
      items: assignments.filter(a => a.supplierId === id && !a.skip),
      tongTien: assignments
        .filter(a => a.supplierId === id && !a.skip)
        .reduce((s, a) => s + (modalItems.find(i => i.id === a.itemId)?.soLuong ?? 0) * a.donGia, 0),
    }));
  }, [assignments, suppliers, modalItems]);

  // Stats
  const skippedItems  = assignments.filter(a => a.skip).length;
  const pendingItems  = assignments.filter(a => !a.skip && !a.supplierId).length;
  const assignedItems = assignments.filter(a => !a.skip && a.supplierId).length;

  // NCC chưa xử lý (chưa tạo đơn) = selected - processed
  const pendingSuppliers = selectedSuppliers.filter(s => !processedIds.includes(s.id));

  // Chỉ enable nút khi đã chọn một NCC cụ thể (không phải Tất cả) và NCC đó chưa tạo đơn
  const canConfirm = !!activeSupId && !processedIds.includes(activeSupId);

  const handleSubmit = async () => {
    if (submitting || !activeSupId) return;
    setSubmitting(true);
    try {
      if (editOrderId) {
        const payloadItems = assignments.map(a => {
          const item = modalItems.find(i => i.id === a.itemId)!;
          return {
            inventoryItemId: item.inventoryItemId,
            tenHang: item.tenHang,
            donVi: item.donVi,
            soLuong: item.soLuong,
            donGia: a.donGia,
            ghiChu: item.ghiChu ?? null,
            sortOrder: 0,
            ngayGiao: a.ngayGiao ?? null,
          };
        });

        const res = await fetch(`/api/plan-finance/purchasing/${editOrderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: activeSupId,
            ngayNhan: assignments[0]?.ngayGiao ?? null,
            ghiChu: editGhiChuState,
            items: payloadItems
          })
        });

        const data = await res.json();
        if (res.ok) {
          setIsEditPreview(true);
          setShowPreview(true);
        } else {
          alert(data.error ?? "Lỗi khi cập nhật đơn mua");
        }
      } else {
        // Chỉ gửi assignments của NCC đang active
        const filtered = assignments.filter(a => a.supplierId === activeSupId && !a.skip);
        const res  = await fetch(`/api/plan-finance/purchase-requests/${reqId}/create-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: filtered }),
        });
        const data = await res.json();
        if (res.ok) {
          const newOrders = data.createdOrders ?? [];
          setAllCreatedOrders(prev => [...prev, ...newOrders]);
          setProcessedIds(prev => [...prev, activeSupId]);
          onCreated();

          // Tự chuyển sang NCC tiếp theo chưa xử lý
          const remaining = pendingSuppliers.filter(s => s.id !== activeSupId);
          if (remaining.length > 0) {
            setActiveSupId(remaining[0].id);
          } else {
            // Tất cả NCC đã xong → màn hình kết quả
            setResult({ createdOrders: [...allCreatedOrders, ...newOrders] });
            setStep("confirm");
          }
        } else {
          alert(data.error ?? "Lỗi khi tạo đơn mua");
        }
      }
    } finally { setSubmitting(false); }
  };

  // Mở preview modal khi click nút
  const handleOpenPreview = () => {
    if (!activeSupId || processedIds.includes(activeSupId)) return;
    setShowPreview(true);
  };

  // Callback khi XemTruocDonMuaHangModal xác nhận tạo đơn
  const handlePreviewCreated = (newOrders: { code: string | null; supplierName: string; soMatHang: number }[]) => {
    setShowPreview(false);
    setAllCreatedOrders(prev => [...prev, ...newOrders]);
    const doneId = activeSupId!;
    setProcessedIds(prev => [...prev, doneId]);
    onCreated();

    // Chuyển sang NCC tiếp theo
    const remaining = pendingSuppliers.filter(s => s.id !== doneId);
    if (remaining.length > 0) {
      setActiveSupId(remaining[0].id);
    } else {
      setResult({ createdOrders: [...allCreatedOrders, ...newOrders] });
      setStep("confirm");
    }
  };

  // Nút kết thúc sớm
  const handleFinish = () => {
    setResult({ createdOrders: allCreatedOrders });
    setStep("confirm");
  };

  // ── Render ────────────────────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1060, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 28px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-cart-plus" style={{ fontSize: 18, color: "#6366f1" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14.5 }}>{editOrderId ? "Cập nhật đơn mua hàng" : "Tạo đơn mua hàng"}</p>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
            {editOrderId ? `Mã đơn mua: ${reqCode ?? editOrderId}` : `Từ phiếu yêu cầu: ${reqCode ?? reqId}`}
          </p>
        </div>

        {/* Select NCC — chọn để tạo đơn từng NCC một */}
        {step === "assign" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <i className="bi bi-building" style={{ fontSize: 13, color: "var(--muted-foreground)" }} />
            {editOrderId ? (
              <select
                value={activeSupId ?? ""}
                onChange={e => {
                  const newSupId = e.target.value || null;
                  setActiveSupId(newSupId);
                  setAssignments(prev => prev.map(a => ({ ...a, supplierId: newSupId })));
                }}
                style={{
                  padding: "6px 10px",
                  border: activeSupId ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--background)",
                  color: "var(--foreground)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  minWidth: 200,
                  maxWidth: 300,
                }}
              >
                <option value="">— Chọn nhà cung cấp —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <select
                value={activeSupId ?? ""}
                onChange={e => setActiveSupId(e.target.value || null)}
                style={{
                  padding: "6px 10px",
                  border: activeSupId ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--background)",
                  color: "var(--foreground)",
                  fontSize: 12.5,
                  cursor: "pointer",
                  minWidth: 200,
                  maxWidth: 300,
                }}
              >
                <option value="">— Chọn NCC để tạo đơn —</option>
                {selectedSuppliers.map(({ supplier, id, items: sItems }) => {
                  const isDone = processedIds.includes(id);
                  return (
                    <option key={id} value={id} disabled={isDone}>
                      {isDone ? "✓" : "▶"} {supplier?.name ?? id} · {sItems.length} MH{isDone ? " (đã tạo)" : ""}
                    </option>
                  );
                })}
              </select>
            )}
            {/* Progress badge */}
            {!editOrderId && selectedSuppliers.length > 0 && (
              <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 700, color: "#10b981" }}>{processedIds.length}</span>
                /{selectedSuppliers.length} NCC
              </span>
            )}
          </div>
        )}

        {/* Nút hành động + đóng */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {step === "assign" && !editOrderId && pendingItems > 0 && (
            <span style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontStyle: "italic", marginRight: 4 }}>
              <i className="bi bi-exclamation-circle" style={{ marginRight: 3, color: "#f59e0b" }} />
              {pendingItems} chưa chọn NCC
            </span>
          )}
          {step === "assign" && (
            <>
              {/* Nút hoàn thành sớm — khi đã tạo ít nhất 1 đơn */}
              {!editOrderId && processedIds.length > 0 && pendingSuppliers.length > 0 && (
                <button
                  onClick={handleFinish}
                  style={{ padding: "7px 14px", border: "1px solid var(--border)", background: "var(--muted)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--foreground)" }}>
                  <i className="bi bi-check2-all" style={{ marginRight: 4 }} />
                  Kết thúc ({processedIds.length}/{selectedSuppliers.length})
                </button>
              )}

              {editOrderId ? (
                <button
                  onClick={handleSubmit}
                  disabled={!activeSupId || submitting}
                  style={{ padding: "7px 18px", border: "none", background: "#003087", color: "#fff", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? (
                    <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <i className="bi bi-check-lg" />
                  )}
                  Lưu thay đổi
                </button>
              ) : (
                <button
                  onClick={handleOpenPreview}
                  disabled={!canConfirm || submitting}
                  title={!activeSupId ? "Hãy chọn một nhà cung cấp trước" : ""}
                  style={{ padding: "7px 18px", border: "none", background: canConfirm ? "var(--primary)" : "var(--muted)", color: canConfirm ? "#fff" : "var(--muted-foreground)", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, opacity: submitting ? 0.7 : 1 }}>
                  <i className="bi bi-cart-check" />Tạo đơn mua hàng
                </button>
              )}
            </>
          )}
          <button onClick={onClose} disabled={submitting} style={{ width: 34, height: 34, border: "1px solid var(--border)", background: "transparent", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <i className="bi bi-x" style={{ fontSize: 20 }} />
          </button>
        </div>
      </div>


      {step === "assign" ? (
        <>
          {/* ── Stat bar ─────────────────────────────────────────────────────── */}
          {!editOrderId && (
            <div style={{ padding: "8px 28px", borderBottom: "1px solid var(--border)", background: "var(--muted)", display: "flex", gap: 24, alignItems: "center", flexShrink: 0 }}>
              {[
                { label: "Tổng mặt hàng", value: modalItems.length,  color: "var(--foreground)" },
                { label: "Đã chọn NCC",   value: assignedItems, color: "#10b981" },
                { label: "Bỏ qua",        value: skippedItems,  color: "#f59e0b" },
                { label: "Chưa xử lý",   value: pendingItems,  color: "#ef4444" },
              ].map(x => (
                <div key={x.label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: x.color }}>{x.value}</span>
                  <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{x.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── 2-column layout: table + supplier panel ───────────────────────── */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              {suppLoading ? (
                <div style={{ textAlign: "center", padding: 64, color: "var(--muted-foreground)" }}>
                  <i className="bi bi-arrow-repeat" style={{ fontSize: 28, display: "block", marginBottom: 10 }} />
                  Đang tải danh sách nhà cung cấp...
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "2px solid var(--border)" }}>
                      {[
                        { label: "#",              w: 36,  center: true  },
                        { label: "Mặt hàng",       w: 0,   center: false },
                        { label: "Đơn vị",         w: 70,  center: true  },
                        { label: "SL",             w: editOrderId ? 90 : 60,  center: true  },
                        { label: "Đơn giá (₫)",   w: 120, center: false },
                        { label: "Ngày giao",      w: 140, center: false },
                        { label: "Thành tiền (₫)", w: 120, center: false },
                        ...(!editOrderId ? [
                          { label: "Nhà cung cấp",   w: 230, center: false },
                          { label: "Bỏ qua",         w: 60,  center: true  },
                        ] : [])
                      ].map(h => (
                        <th key={h.label} style={{ padding: "10px 10px", fontWeight: 700, fontSize: 11.5, textAlign: h.center ? "center" : "left", color: "var(--muted-foreground)", whiteSpace: "nowrap", width: h.w || undefined }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems.map((gItem, idx) => {
                      const representative = gItem.originalItems[0];
                      const a = assignments.find(assign => assign.itemId === representative.id)!;
                      const { matched, others } = suppliersFor(representative);
                      const hasFilter = !!gItem.inventoryItem?.categoryId;
                      
                      const thanhTien = gItem.originalItems.reduce((sum, oi) => {
                        const oiAssign = assignments.find(assign => assign.itemId === oi.id);
                        return sum + oi.soLuong * (oiAssign?.donGia ?? (oi.donGiaDK > 0 ? oi.donGiaDK : (oi.inventoryItem?.giaNhap ?? 0)));
                      }, 0);

                      const isHighlighted = activeSupId && a.supplierId === activeSupId;
                      const isLocked = !editOrderId && gItem.originalItems.every(oi => oi.trangThaiXuLy === "da-tao-don");

                      const handlePriceChange = (val: number) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, donGia: val };
                          }
                          return assign;
                        }));
                      };

                      const handleDateChange = (val: string) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, ngayGiao: val };
                          }
                          return assign;
                        }));
                      };

                      const handleSupplierChange = (val: string | null) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, supplierId: val };
                          }
                          return assign;
                        }));
                        setActiveSupId(val);
                      };

                      const handleSkipChange = (val: boolean) => {
                        setAssignments(prev => prev.map(assign => {
                          const originalItem = gItem.originalItems.find(oi => oi.id === assign.itemId);
                          if (originalItem && (editOrderId || originalItem.trangThaiXuLy !== "da-tao-don")) {
                            return { ...assign, skip: val, supplierId: val ? null : assign.supplierId };
                          }
                          return assign;
                        }));
                      };

                      return (
                        <tr key={gItem.tenHang} style={{
                          borderBottom: "1px solid var(--border)",
                          opacity:    (a.skip && !isLocked) ? 0.38 : 1,
                          background: isLocked
                            ? "rgba(16,185,129,0.06)"
                            : isHighlighted
                              ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                              : a.supplierId
                                ? "color-mix(in srgb, #10b981 4%, transparent)"
                                : undefined,
                          transition: "background 0.15s",
                        }}>
                          {/* # */}
                          <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 800, fontSize: 12, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                          {/* Tên hàng */}
                          <td style={{ padding: "10px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{gItem.tenHang}</p>
                                {gItem.inventoryItem?.code && (
                                  <p style={{ margin: 0, fontSize: 10.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{gItem.inventoryItem.code}</p>
                                )}
                              </div>
                              {isLocked && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.15)", padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                                  ✓ Đã đặt hàng
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Đơn vị */}
                          <td style={{ padding: "10px 10px", textAlign: "center", fontSize: 12.5, color: "var(--muted-foreground)" }}>
                            {gItem.donVi ?? "—"}
                          </td>
                          {/* SL */}
                          <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 700 }}>
                            {editOrderId ? (
                              <input
                                type="number"
                                value={gItem.soLuong}
                                onChange={e => handleQuantityChange(representative.id, parseFloat(e.target.value) || 0)}
                                style={{ width: 70, padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", color: "var(--foreground)", fontSize: 12.5, textAlign: "center" }}
                              />
                            ) : (
                              gItem.soLuong
                            )}
                          </td>
                          {/* Đơn giá */}
                          <td style={{ padding: "10px 10px" }}>
                            <input
                              type="text"
                              value={a.donGia ? a.donGia.toLocaleString("vi-VN") : "0"}
                              disabled={a.skip}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, "");
                                handlePriceChange(parseInt(raw, 10) || 0);
                              }}
                              style={{ width: 110, padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", color: "var(--foreground)", fontSize: 12.5, textAlign: "right" }}
                            />
                          </td>
                          {/* Ngày giao */}
                          <td style={{ padding: "10px 10px" }}>
                            <input
                              type="date"
                              value={a.ngayGiao}
                              disabled={a.skip}
                              onChange={e => handleDateChange(e.target.value)}
                              style={{ width: 130, padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--background)", color: "var(--foreground)", fontSize: 12.5 }}
                            />
                          </td>
                          {/* Thành tiền */}
                          <td style={{ padding: "10px 10px", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", color: thanhTien > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
                            {a.skip ? "—" : fmtVnd(thanhTien)}
                          </td>
                          {/* NCC */}
                          {!editOrderId && (
                            <td style={{ padding: "10px 10px" }}>
                              <div style={{ position: "relative" }}>
                                <select
                                  value={a.supplierId ?? ""}
                                  disabled={a.skip}
                                  onChange={e => handleSupplierChange(e.target.value || null)}
                                  style={{
                                    width: "100%", padding: "6px 8px",
                                    border: a.supplierId ? "1.5px solid #10b981" : "1px solid var(--border)",
                                    borderRadius: 6, background: "var(--background)", color: "var(--foreground)",
                                    fontSize: 12.5, cursor: a.skip ? "not-allowed" : "pointer",
                                  }}>
                                  <option value="">— Chọn NCC —</option>
                                  {hasFilter && matched.length > 0 && (
                                    <optgroup label={`✓ Phù hợp danh mục (${matched.length})`}>
                                      {matched.map(s => <option key={s.id} value={s.id}>★ {s.name}{s.code ? ` (${s.code})` : ""}</option>)}
                                    </optgroup>
                                  )}
                                  {others.length > 0 && (
                                    <optgroup label={hasFilter && matched.length > 0 ? "Các NCC khác" : "Tất cả NCC"}>
                                      {others.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
                                    </optgroup>
                                  )}
                                </select>
                                {hasFilter && matched.length > 0 && !a.supplierId && !a.skip && (
                                  <span style={{ position: "absolute", right: 22, top: "50%", transform: "translateY(-50%)", fontSize: 10, background: "#10b981", color: "#fff", borderRadius: 10, padding: "1px 5px", fontWeight: 700, pointerEvents: "none" }}>
                                    {matched.length}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {/* Bỏ qua */}
                          {!editOrderId && (
                            <td style={{ padding: "10px 10px", textAlign: "center" }}>
                              {isLocked ? (
                                <i className="bi bi-lock-fill" style={{ fontSize: 14, color: "#10b981" }} title="Đã được đặt hàng" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={a.skip}
                                  onChange={e => handleSkipChange(e.target.checked)}
                                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#f59e0b" }}
                                />
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Tổng cộng */}
                  {(editOrderId || assignedItems > 0) && (
                    <tfoot>
                      <tr style={{ background: "var(--muted)", borderTop: "2px solid var(--border)" }}>
                        <td colSpan={6} style={{ padding: "10px 10px", fontWeight: 700, fontSize: 12.5, textAlign: "right", color: "var(--muted-foreground)" }}>
                          Tổng cộng
                        </td>
                        <td style={{ padding: "10px 10px", fontWeight: 800, fontSize: 13.5, color: "var(--primary)", whiteSpace: "nowrap" }}>
                          {fmtVnd(assignments
                            .filter(a => !a.skip && (editOrderId || a.supplierId))
                            .reduce((s, a) => s + (modalItems.find(i => i.id === a.itemId)?.soLuong ?? 0) * a.donGia, 0)
                          )}
                        </td>
                        {!editOrderId && <td colSpan={2} />}
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>

            {/* Sidebar for Edit Mode */}
            {editOrderId && (
              <div style={{ width: 280, borderLeft: "1px solid var(--border)", background: "var(--card)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5 }}>Thông tin đơn hàng</p>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Ngày nhận hàng (Áp dụng tất cả)</label>
                  <input
                    type="date"
                    value={assignments[0]?.ngayGiao ?? ""}
                    onChange={e => {
                      const val = e.target.value;
                      setAssignments(prev => prev.map(a => ({ ...a, ngayGiao: val })));
                    }}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, boxSizing: "border-box", outline: "none", marginBottom: 10 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: 6 }}>Ghi chú nội bộ</label>
                  <textarea
                    value={editGhiChuState ?? ""}
                    onChange={e => setEditGhiChuState(e.target.value)}
                    placeholder="Nhập ghi chú cho đơn hàng..."
                    style={{ width: "100%", height: 120, padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              </div>
            )}

          </div>


        </>
      ) : (
        /* ── Kết quả ──────────────────────────────────────────────────────────── */
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 48 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: 32, color: "#10b981" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Tạo đơn mua thành công!</p>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted-foreground)" }}>
              Đã tạo {result?.createdOrders.length ?? 0} đơn mua từ phiếu yêu cầu {reqCode}
            </p>
          </div>

          <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 10 }}>
            {result?.createdOrders.map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-building" style={{ fontSize: 14, color: "var(--primary)" }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{o.supplierName}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>{o.soMatHang} mặt hàng</p>
                  </div>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)", padding: "4px 14px", borderRadius: 20 }}>
                  {o.code}
                </span>
              </div>
            ))}
          </div>

          {(pendingItems > 0 || skippedItems > 0) && (
            <div style={{ width: "100%", maxWidth: 560, padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, fontSize: 13 }}>
              <i className="bi bi-info-circle" style={{ marginRight: 6, color: "#f59e0b" }} />
              {pendingItems > 0 && <span>{pendingItems} mặt hàng chưa được xử lý. </span>}
              {skippedItems > 0 && <span>{skippedItems} mặt hàng đã bỏ qua.</span>}
            </div>
          )}

          <button onClick={onClose} style={{ padding: "11px 36px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Đóng
          </button>
        </div>
      )}

      {/* Preview đơn mua hàng cho NCC đang chọn */}
      {showPreview && activeSupId && (
        <XemTruocDonMuaHangModal
          reqId={reqId ?? ""}
          reqCode={reqCode ?? null}
          supplierId={activeSupId}
          supplierName={selectedSuppliers.find(s => s.id === activeSupId)?.supplier?.name ?? activeSupId}
          assignments={assignments.filter(a => a.supplierId === activeSupId && !a.skip)}
          items={modalItems}
          onClose={() => {
            if (isEditPreview) {
              onCreated();
            } else {
              setShowPreview(false);
            }
          }}
          onCreated={(orders) => {
            if (isEditPreview) {
              onCreated();
            } else {
              handlePreviewCreated(orders);
            }
          }}
          isEdit={isEditPreview}
          editOrderId={editOrderId}
          editOrderCode={reqCode}
        />
      )}
    </div>
  );
}
