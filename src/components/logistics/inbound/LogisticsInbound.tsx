"use client";
import { useState, useEffect } from "react";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { HoverImage } from "@/components/ui/HoverImage";
import { WarehouseCategoryFilter } from "@/components/common/WarehouseCategoryFilter";

// Import existing modals from plan-finance
import { NhapKhoModal } from "@/components/plan-finance/kho_hang/NhapKhoModal";
import { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { KiemKhoModal } from "@/components/plan-finance/kho_hang/KiemKhoModal";
import { LuanChuyenKhoModal } from "@/components/plan-finance/kho_hang/LuanChuyenKhoModal";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { canExecuteInOut } from "@/lib/logistics-permissions";

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
  const isThuKho = canExecuteInOut(session?.user);

  const [activeModal, setActiveModal] = useState<"nhap" | "xuat" | "luan-chuyen" | "kiem" | null>(null);
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toast = useToast();

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

  const handleOpenInOutModal = (modal: "nhap" | "xuat" | "luan-chuyen") => {
    if (!isThuKho) {
      toast.error("Không có quyền", "Chỉ tài khoản Thủ kho hoặc Quản trị viên mới có quyền thực hiện nghiệp vụ này.");
      return;
    }
    setActiveModal(modal);
  };

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
        customFilters={
          <WarehouseCategoryFilter
            warehouse={filterWarehouse}
            onWarehouseChange={setFilterWarehouse}
            category={filterCategory}
            onCategoryChange={setFilterCategory}
          />
        }
        filters={[
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              title="Nhập kho"
              onClick={() => handleOpenInOutModal("nhap")}
              disabled={!isThuKho}
              className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <i className="bi bi-arrow-down-left-square text-xs" />
              <span>Nhập</span>
            </button>

            <button
              type="button"
              title="Xuất kho"
              onClick={() => handleOpenInOutModal("xuat")}
              disabled={!isThuKho}
              className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <i className="bi bi-arrow-up-right-square text-xs" />
              <span>Xuất</span>
            </button>

            <button
              type="button"
              title="Kiểm kho"
              onClick={() => setActiveModal("kiem")}
              className="h-8 px-2.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="bi bi-clipboard2-check text-xs" />
              <span>Kiểm</span>
            </button>

            <button
              type="button"
              title="Luân chuyển kho"
              onClick={() => handleOpenInOutModal("luan-chuyen")}
              disabled={!isThuKho}
              className="h-8 px-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <i className="bi bi-arrow-left-right text-xs" />
              <span>Chuyển</span>
            </button>
          </div>
        }
        showMenu={false}
      />

      {/* ── FullWidthTable chuẩn Enterprise ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <FullWidthTable loading={loading} emptyText="Không có hàng hoá nào trong kho">
          <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: "13px" }}>
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200">
              <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-2.5 sm:px-3 w-9 sm:w-10 text-center">
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
                <th className="py-2.5 px-2.5 sm:px-3.5">Vật tư, hàng hoá</th>
                <th className="py-2.5 px-2 sm:px-3.5 w-14 md:w-32 text-center whitespace-nowrap">
                  <span className="hidden md:inline">Đơn vị tính</span>
                  <span className="inline md:hidden">ĐVT</span>
                </th>
                <th className="hidden md:table-cell py-2.5 px-3.5 w-36 text-right">Tồn kho</th>
                <th className="hidden md:table-cell py-2.5 px-3.5 w-36 text-right">Đã giữ</th>
                <th className="hidden md:table-cell py-2.5 px-3.5 w-36 text-right">Thực tồn</th>
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
                    <td className="py-2 px-2.5 sm:px-3 text-center">
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
                    <td className="py-2 px-2.5 sm:px-3.5 max-w-0 md:max-w-none w-full">
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                        <div
                          className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 shadow-2xs flex items-center justify-center mt-0.5 sm:mt-0"
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
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-slate-900 leading-tight text-[13px] truncate">
                            {row.tenHang}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-blue-600 font-mono font-medium text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">
                              {row.code || "SKU-AUTO"}
                            </span>
                            <span className="text-slate-400 text-[10px]">•</span>
                            <span className="text-slate-500 text-[11px] truncate">
                              {row.categoryName || row.category?.name || "Chưa phân loại"}
                            </span>
                          </div>
                          {/* Thông tin tồn kho hiển thị dưới mã hàng hoá trên màn hình điện thoại */}
                          <div className="flex md:hidden items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px]">
                            <span className="text-slate-500">
                              Tồn: <strong className="font-mono text-slate-900">{row.soLuong.toLocaleString("vi-VN")}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">
                              Giữ: <strong className="font-mono text-rose-700">{reserved.toLocaleString("vi-VN")}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">
                              Thực tồn: <strong className="font-mono text-emerald-600">{actual.toLocaleString("vi-VN")}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 sm:px-3.5 text-center text-slate-600 text-xs sm:text-[13px] whitespace-nowrap">
                      {row.donVi || "Cái"}
                    </td>
                    <td className="hidden md:table-cell py-2 px-3.5 text-right font-bold text-slate-900 font-mono text-[13px]">
                      {row.soLuong.toLocaleString("vi-VN")}
                    </td>
                    <td className="hidden md:table-cell py-2 px-3.5 text-right font-bold font-mono text-[13px] text-rose-700">
                      {reserved.toLocaleString("vi-VN")}
                    </td>
                    <td className="hidden md:table-cell py-2 px-3.5 text-right font-bold font-mono text-[13px] text-emerald-600">
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
    </div>
  );
}

export default LogisticsInbound;
