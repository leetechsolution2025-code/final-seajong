"use client";
import React, { useState, useEffect, useRef } from "react";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { HoverImage } from "@/components/ui/HoverImage";

// Import existing modals from plan-finance
import { NhapKhoModal } from "@/components/plan-finance/kho_hang/NhapKhoModal";
import { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { KiemKhoModal } from "@/components/plan-finance/kho_hang/KiemKhoModal";
import { LuanChuyenKhoModal } from "@/components/plan-finance/kho_hang/LuanChuyenKhoModal";
import { ConfirmDialogModal } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { isLogisticsAdmin } from "@/lib/logistics-permissions";

interface Warehouse {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  level?: number;
  isHeader?: boolean;
}

interface InventoryItem {
  id: string;
  code: string | null;
  tenHang: string;
  donVi: string | null;
  soLuong: number;
  soLuongGiu?: number;
  daGiu?: number;
  thucTon?: number;
  trangThai: string;
  imageUrl?: string | null;
  images?: string[];
  categoryName?: string;
  category?: {
    name: string;
  };
  model?: string | null;
  color?: string | null;
}

export function LogisticsInbound({ onStatsChange }: { onStatsChange?: (stats: any) => void }) {
  const { data: session } = useSession();
  const isThuKho = !session?.user || isLogisticsAdmin(session?.user);

  const [activeModal, setActiveModal] = useState<"nhap" | "xuat" | "luan-chuyen" | "kiem" | null>(null);
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingHold, setIsClearingHold] = useState(false);
  const [showClearHoldModal, setShowClearHoldModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleConfirmClearHold = async () => {
    if (isClearingHold) return;
    const hasSelection = selectedIds.length > 0;

    setIsClearingHold(true);
    try {
      const params = new URLSearchParams();
      if (filterWarehouse) params.append("warehouseId", filterWarehouse);

      const res = await fetch(`/api/logistics/inventory/clear-holds?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasSelection ? { itemIds: selectedIds } : {}),
      });

      const data = await res.json();
      if (res.ok) {
        setShowClearHoldModal(false);
        toast.success(
          "Huỷ đã giữ thành công",
          `Đã chuyển toàn bộ hàng giữ của ${data.updatedCount || 0} kho/mặt hàng về thực tồn.`
        );
        fetchItems();
      } else {
        toast.error("Không thể huỷ giữ", data.error || "Không thể huỷ giữ hàng hoá");
      }
    } catch (err) {
      console.error("Error clearing hold:", err);
      toast.error("Lỗi", "Đã xảy ra lỗi khi huỷ giữ hàng hoá");
    } finally {
      setIsClearingHold(false);
    }
  };

  // Load warehouses once on mount
  useEffect(() => {
    fetch("/api/logistics/warehouses")
      .then((res) => res.json())
      .then((data) => setWarehouses(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching warehouses:", err));
  }, []);

  // Fetch categories dynamically when filterWarehouse changes
  const fetchCategories = async () => {
    try {
      const url = filterWarehouse
        ? `/api/logistics/categories?warehouseId=${filterWarehouse}`
        : "/api/logistics/categories";
      const res = await fetch(url);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [filterWarehouse]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterWarehouse, filterStatus]);

  // Fetch inventory items dynamically
  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategory) params.append("categoryId", filterCategory);
      if (filterWarehouse) params.append("warehouseId", filterWarehouse);
      params.append("page", page.toString());
      params.append("limit", "50");

      const res = await fetch(`/api/logistics/inventory?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setFilteredCount(data.total || 0);
      if (data.stats && onStatsChange) {
        onStatsChange(data.stats);
      }
    } catch (error) {
      console.error("Fetch items error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, filterCategory, filterWarehouse, page]);

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const templateData = [
        {
          "STT": 1,
          "Mã hàng": "SKU-001",
          "Tên vật tư, hàng hoá": "Vòi rửa bát nóng lạnh SUS 304",
          "Đơn vị tính": "Bộ",
          "Số lượng": 100,
          "Giá nhập": 350000,
          "Ghi chú": "Mẫu nhập liệu",
        },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Kho");
      XLSX.writeFile(wb, "Mau_Nhap_Lieu_Kho_Hang.xlsx");
    } catch (e) {
      console.error(e);
      alert("Không thể tải file mẫu");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info("Đang xử lý file", `Đã tiếp nhận file: ${file.name}`);
      e.target.value = "";
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategory) params.append("categoryId", filterCategory);
      if (filterWarehouse) params.append("warehouseId", filterWarehouse);
      params.append("limit", "999999");

      const res = await fetch(`/api/logistics/inventory?${params}`);
      const data = await res.json();

      const exportItems = data.items || [];
      if (!exportItems.length) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      const exportData = exportItems.map((item: any, index: number) => ({
        "STT": index + 1,
        "Tên vật tư, hàng hoá": item.tenHang || "",
        "Mã hàng": item.code || "",
        "Danh mục": item.categoryName || item.category?.name || "",
        "Đơn vị tính": item.donVi || "",
        "Giá nhập": item.giaNhap || 0,
        "Giá bán": item.giaBan || 0,
        "Tồn kho": item.soLuong || 0,
        "Đã giữ": item.soLuongGiu ?? item.daGiu ?? 0,
        "Thực tồn": item.thucTon ?? ((item.soLuong || 0) - (item.soLuongGiu ?? item.daGiu ?? 0)),
        "Trạng thái": item.trangThai === "con-hang" ? "Còn hàng" : item.trangThai === "sap-het" ? "Sắp hết" : "Hết hàng",
      }));

      const XLSX = await import("xlsx");

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Kho_Hang");
      XLSX.writeFile(wb, `Danh_Sach_Hang_Hoa_Trong_Kho_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Lỗi khi xuất file Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const menuItems = [
    {
      id: "nhap",
      label: "Nhập hàng",
      icon: <i className="bi bi-arrow-down-left-square" style={{ color: "#3b82f6", fontSize: 15 }} />,
      disabled: !isThuKho,
      onClick: () => {
        if (!isThuKho) {
          toast.error("Không có quyền", "Chỉ tài khoản Thủ kho hoặc Quản trị viên mới có quyền thực hiện nghiệp vụ này.");
          return;
        }
        setActiveModal("nhap");
      },
    },
    {
      id: "xuat",
      label: "Xuất hàng",
      icon: <i className="bi bi-arrow-up-right-square" style={{ color: "#ef4444", fontSize: 15 }} />,
      disabled: !isThuKho,
      onClick: () => {
        if (!isThuKho) {
          toast.error("Không có quyền", "Chỉ tài khoản Thủ kho hoặc Quản trị viên mới có quyền thực hiện nghiệp vụ này.");
          return;
        }
        setActiveModal("xuat");
      },
    },
    {
      id: "luan-chuyen",
      label: "Luân chuyển",
      icon: <i className="bi bi-arrow-left-right" style={{ color: "#f59e0b", fontSize: 15 }} />,
      disabled: !isThuKho,
      onClick: () => {
        if (!isThuKho) {
          toast.error("Không có quyền", "Chỉ tài khoản Thủ kho hoặc Quản trị viên mới có quyền thực hiện nghiệp vụ này.");
          return;
        }
        setActiveModal("luan-chuyen");
      },
    },
    {
      id: "kiem",
      label: "Kiểm kho",
      icon: <i className="bi bi-clipboard2-check" style={{ color: "#8b5cf6", fontSize: 15 }} />,
      onClick: () => {
        setActiveModal("kiem");
      },
    },
  ];

  const filteredItems = items.filter((item) => {
    if (!filterStatus) return true;
    return item.trangThai === filterStatus;
  });

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* ── TableToolbar chuẩn Enterprise ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên, mã hàng hóa..."
        searchMinWidth="220px"
        filters={[
          {
            id: "warehouse",
            label: "Kho hàng",
            value: filterWarehouse,
            onChange: (val) => {
              setFilterWarehouse(val);
              setFilterCategory("");
            },
            minWidth: "170px",
            options: [
              { label: "Tất cả kho hàng", value: "" },
              ...warehouses.map((w) => ({ label: w.name, value: w.id })),
            ],
          },
          {
            id: "category",
            label: "Danh mục",
            value: filterCategory,
            onChange: setFilterCategory,
            minWidth: "170px",
            options: [
              { label: "Tất cả danh mục", value: "" },
              ...categories.map((c) => ({ label: c.name, value: c.id })),
            ],
          },
          {
            id: "status",
            label: "Trạng thái",
            value: filterStatus,
            onChange: setFilterStatus,
            minWidth: "150px",
            options: [
              { label: "Tất cả trạng thái", value: "" },
              { label: "Còn hàng", value: "con-hang" },
              { label: "Sắp hết hàng", value: "sap-het" },
              { label: "Đã hết hàng", value: "het-hang" },
            ],
          },
        ]}
        actionsAfterSearch={
          <div className="flex items-center gap-1.5">
            {/* Tải excel mẫu */}
            <button
              type="button"
              title="Tải file Excel mẫu"
              onClick={handleDownloadTemplate}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-emerald-600 transition-colors cursor-pointer"
            >
              <i className="bi bi-file-earmark-arrow-down text-sm" />
            </button>

            {/* Nhập excel */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              style={{ display: "none" }}
            />
            <button
              type="button"
              title="Nhập dữ liệu (Import Excel)"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-blue-600 transition-colors cursor-pointer"
            >
              <i className="bi bi-file-earmark-plus text-sm" />
            </button>

            {/* Xuất excel */}
            <button
              type="button"
              title="Xuất dữ liệu (Export Excel)"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-purple-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <i className="bi bi-file-earmark-arrow-up text-sm" />
              )}
            </button>

            {/* Huỷ đã giữ */}
            <button
              type="button"
              title="Huỷ hàng đang giữ (Chuyển về thực tồn)"
              onClick={() => setShowClearHoldModal(true)}
              disabled={isClearingHold}
              className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isClearingHold ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <i className="bi bi-arrow-counterclockwise text-xs" />
              )}
              <span>Huỷ đã giữ</span>
            </button>
          </div>
        }
        showMenu={true}
        menuItems={menuItems}
      />

      {/* ── FullWidthTable chuẩn Enterprise ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <FullWidthTable loading={loading} emptyText="Không có hàng hoá nào trong kho">
          <table className="w-full text-left border-collapse" style={{ fontSize: "13px" }}>
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200">
              <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    disabled={!isThuKho}
                    title={!isThuKho ? "Chỉ tài khoản Thủ kho mới có quyền chọn hàng hoá" : undefined}
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={(e) => {
                      if (!isThuKho) return;
                      if (e.target.checked) {
                        setSelectedIds(filteredItems.map((item) => item.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="py-2.5 px-3.5">Vật tư, hàng hoá</th>
                <th className="py-2.5 px-3.5 w-32 text-center">Đơn vị tính</th>
                <th className="py-2.5 px-3.5 w-36 text-right">Tồn kho</th>
                <th className="py-2.5 px-3.5 w-36 text-right">Đã giữ</th>
                <th className="py-2.5 px-3.5 w-36 text-right">Thực tồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.map((row) => {
                const reserved = row.soLuongGiu ?? row.daGiu ?? 0;
                const actual = row.thucTon ?? (row.soLuong - reserved);
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-blue-50/40" : ""}`}
                  >
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        disabled={!isThuKho}
                        checked={isSelected}
                        onChange={(e) => {
                          if (!isThuKho) return;
                          if (e.target.checked) {
                            setSelectedIds((prev) => [...prev, row.id]);
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== row.id));
                          }
                        }}
                      />
                    </td>
                    <td className="py-2 px-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 shadow-2xs flex items-center justify-center"
                        >
                          {(row.imageUrl || (row.images && row.images.length > 0)) ? (
                            <HoverImage
                              src={row.imageUrl || (row.images && row.images[0])}
                              images={row.images}
                              alt={row.tenHang}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <i className="bi bi-box-seam text-slate-400 text-base" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 leading-tight text-[13px] truncate">
                            {row.tenHang}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-blue-600 font-mono font-medium text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {row.code || "SKU-AUTO"}
                            </span>
                            <span className="text-slate-400 text-[10px]">•</span>
                            <span className="text-slate-500 text-[11px] truncate">
                              {row.categoryName || row.category?.name || "Chưa phân loại"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3.5 text-center text-slate-600 text-[13px]">
                      {row.donVi || "Cái"}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold text-slate-900 font-mono text-[13px]">
                      {row.soLuong.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold font-mono text-[13px] text-rose-700">
                      {reserved.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold font-mono text-[13px] text-emerald-600">
                      {actual.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </FullWidthTable>
      </div>

      {/* ── Pagination chuẩn Enterprise ── */}
      <Pagination
        currentPage={page}
        totalItems={filteredCount}
        pageSize={50}
        onPageChange={setPage}
        itemName="mặt hàng"
      />

      {/* ── Các Modal Nghiệp vụ Kho ── */}
      {activeModal === "nhap" && (
        <NhapKhoModal
          onClose={() => setActiveModal(null)}
          onSaved={() => {
            fetchItems();
          }}
        />
      )}
      {activeModal === "xuat" && (
        <XuatKhoModal
          onClose={() => setActiveModal(null)}
          onSaved={() => {
            fetchItems();
          }}
        />
      )}
      {activeModal === "kiem" && (
        <KiemKhoModal
          onClose={() => setActiveModal(null)}
          onSaved={() => {
            setActiveModal(null);
            fetchItems();
          }}
        />
      )}
      {activeModal === "luan-chuyen" && (
        <LuanChuyenKhoModal
          onClose={() => setActiveModal(null)}
          onSaved={() => {
            setActiveModal(null);
            fetchItems();
          }}
        />
      )}

      <ConfirmDialogModal
        open={showClearHoldModal}
        title="Xác nhận huỷ đã giữ"
        message={
          selectedIds.length > 0
            ? `Bạn có chắc chắn muốn huỷ số lượng đang giữ cho ${selectedIds.length} mặt hàng đã chọn và chuyển về thực tồn không?`
            : filterWarehouse
              ? "Bạn có chắc chắn muốn huỷ toàn bộ số lượng hàng hoá đang giữ trong kho đã chọn và chuyển về thực tồn không?"
              : "Bạn có chắc chắn muốn huỷ toàn bộ số lượng hàng hoá đang giữ của tất cả các kho và chuyển về thực tồn không?"
        }
        variant="warning"
        confirmLabel="Đồng ý"
        cancelLabel="Huỷ"
        loading={isClearingHold}
        onConfirm={handleConfirmClearHold}
        onCancel={() => {
          if (!isClearingHold) setShowClearHoldModal(false);
        }}
      />
    </div>
  );
}

export default LogisticsInbound;
