"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Select } from "@/components/common/Select";
import { ItemSuggestionSelect } from "@/components/common/ItemSuggestionSelect";
import { WarehouseCategoryFilter } from "@/components/common/WarehouseCategoryFilter";
import { toast } from "react-toastify";

interface LogisticsReportsProps {
  currentStep: number;
}

export const LogisticsReports: React.FC<LogisticsReportsProps> = ({ currentStep }) => {
  // ── Dữ liệu chung: Kho & Danh mục ──
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  // ══════════════════════════════════════════════════════════
  // TAB 1: BÁO CÁO XUẤT - NHẬP - TỒN
  // ══════════════════════════════════════════════════════════
  // Mặc định từ ngày 01 đầu tháng hiện hành đến ngày hiện hành
  const defaultDates = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return {
      from: `${y}-${m}-01`,
      to: `${y}-${m}-${d}`,
    };
  }, []);

  const [xntFromDate, setXntFromDate] = useState(defaultDates.from);
  const [xntToDate, setXntToDate] = useState(defaultDates.to);
  const [xntSearch, setXntSearch] = useState("");
  const [xntWarehouse, setXntWarehouse] = useState("");
  const [xntCategory, setXntCategory] = useState("");
  const [xntStatus, setXntStatus] = useState("all");
  const [xntPage, setXntPage] = useState(1);
  const [xntPageSize, setXntPageSize] = useState(15);
  const [xntItems, setXntItems] = useState<any[]>([]);
  const [xntTotal, setXntTotal] = useState(0);
  const [xntLoading, setXntLoading] = useState(false);

  // ══════════════════════════════════════════════════════════
  // TAB 2: THẺ KHO CHI TIẾT
  // ══════════════════════════════════════════════════════════
  const [tkFromDate, setTkFromDate] = useState(defaultDates.from);
  const [tkToDate, setTkToDate] = useState(defaultDates.to);
  const [tkSearch, setTkSearch] = useState("");
  const [tkWarehouse, setTkWarehouse] = useState("");
  const [tkItemId, setTkItemId] = useState("");
  const [tkPage, setTkPage] = useState(1);
  const [tkPageSize, setTkPageSize] = useState(15);
  const [tkLines, setTkLines] = useState<any[]>([]);
  const [tkTotal, setTkTotal] = useState(0);
  const [tkCurrentItem, setTkCurrentItem] = useState<any>(null);
  const [tkLoading, setTkLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<
    { id: string; name: string; code?: string; donVi?: string; soLuong?: number; categoryName?: string }[]
  >([]);

  // ══════════════════════════════════════════════════════════
  // TAB 3: BÁO CÁO KIỂM KHO
  // ══════════════════════════════════════════════════════════
  const [kkSearch, setKkSearch] = useState("");
  const [kkWarehouse, setKkWarehouse] = useState("all");
  const [kkStatus, setKkStatus] = useState("all");
  const [kkPage, setKkPage] = useState(1);
  const [kkPageSize, setKkPageSize] = useState(10);
  const [kkItems, setKkItems] = useState<any[]>([]);
  const [kkTotal, setKkTotal] = useState(0);
  const [kkLoading, setKkLoading] = useState(false);

  // ── Load danh sách kho hàng ban đầu ──
  useEffect(() => {
    fetch("/api/logistics/warehouses?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setWarehouses(data.items.map((w: any) => ({ id: w.id, name: w.name })));
        }
      })
      .catch((err) => console.error("Error loading warehouses:", err));
  }, []);

  // ── Load danh sách mặt hàng cho Thẻ kho theo kho được chọn ──
  useEffect(() => {
    const url = tkWarehouse && tkWarehouse !== "all"
      ? `/api/logistics/inventory?warehouseId=${encodeURIComponent(tkWarehouse)}&limit=150`
      : `/api/logistics/inventory?limit=150`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          const mapped = data.items.map((it: any) => ({
            id: it.id,
            name: it.tenHang,
            code: it.code || "",
            donVi: it.donVi || "cái",
            soLuong: it.soLuong ?? 0,
            categoryName: it.categoryName || it.category?.name || "",
          }));
          setAvailableItems(mapped);
          if (mapped.length > 0 && (!tkItemId || !mapped.some((m: any) => m.id === tkItemId))) {
            setTkItemId(mapped[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading items for stock card:", err));
  }, [tkWarehouse]);

  // ── Fetch Tab 1: Xuất nhập tồn ──
  const fetchXnt = useCallback(async () => {
    setXntLoading(true);
    try {
      const params = new URLSearchParams();
      if (xntSearch) params.append("search", xntSearch);
      if (xntWarehouse) params.append("warehouseId", xntWarehouse);
      if (xntCategory) params.append("categoryId", xntCategory);
      if (xntStatus !== "all") params.append("status", xntStatus);
      if (xntFromDate) params.append("fromDate", xntFromDate);
      if (xntToDate) params.append("toDate", xntToDate);
      params.append("page", xntPage.toString());
      params.append("limit", xntPageSize.toString());

      const res = await fetch(`/api/logistics/reports/xnt?${params}`);
      const data = await res.json();
      if (data.success) {
        setXntItems(data.items || []);
        setXntTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Lỗi tải báo cáo XNT:", err);
    } finally {
      setXntLoading(false);
    }
  }, [xntSearch, xntWarehouse, xntCategory, xntStatus, xntFromDate, xntToDate, xntPage, xntPageSize]);

  useEffect(() => {
    if (currentStep === 1) fetchXnt();
  }, [currentStep, fetchXnt]);

  // ── Fetch Tab 2: Thẻ kho ──
  const fetchTheKho = useCallback(async () => {
    setTkLoading(true);
    try {
      const params = new URLSearchParams();
      if (tkItemId) params.append("itemId", tkItemId);
      if (tkWarehouse) params.append("warehouseId", tkWarehouse);
      if (tkSearch) params.append("search", tkSearch);
      if (tkFromDate) params.append("fromDate", tkFromDate);
      if (tkToDate) params.append("toDate", tkToDate);
      params.append("page", tkPage.toString());
      params.append("limit", tkPageSize.toString());

      const res = await fetch(`/api/logistics/reports/the-kho?${params}`);
      const data = await res.json();
      if (data.success) {
        setTkLines(data.items || []);
        setTkTotal(data.total || 0);
        setTkCurrentItem(data.currentItem);
      }
    } catch (err) {
      console.error("Lỗi tải Thẻ kho:", err);
    } finally {
      setTkLoading(false);
    }
  }, [tkItemId, tkWarehouse, tkSearch, tkFromDate, tkToDate, tkPage, tkPageSize]);

  useEffect(() => {
    if (currentStep === 2) fetchTheKho();
  }, [currentStep, fetchTheKho]);

  // ── Fetch Tab 3: Báo cáo kiểm kho ──
  const fetchKiemKho = useCallback(async () => {
    setKkLoading(true);
    try {
      const params = new URLSearchParams();
      if (kkSearch) params.append("search", kkSearch);
      if (kkWarehouse !== "all") params.append("warehouseId", kkWarehouse);
      if (kkStatus !== "all") params.append("status", kkStatus);
      params.append("page", kkPage.toString());
      params.append("limit", kkPageSize.toString());

      const res = await fetch(`/api/logistics/reports/kiem-kho?${params}`);
      const data = await res.json();
      if (data.success) {
        setKkItems(data.items || []);
        setKkTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Lỗi tải Báo cáo kiểm kho:", err);
    } finally {
      setKkLoading(false);
    }
  }, [kkSearch, kkWarehouse, kkStatus, kkPage, kkPageSize]);

  useEffect(() => {
    if (currentStep === 3) fetchKiemKho();
  }, [currentStep, fetchKiemKho]);

  // Tính tổng hàng cộng dồn cho Báo cáo Xuất Nhập Tồn
  const xntTotals = useMemo(() => {
    return xntItems.reduce(
      (acc, it) => {
        const tonDau = it.tonDau || 0;
        const nhap = it.nhap || 0;
        const xuat = it.xuat || 0;
        const tonCuoi = it.tonCuoi || 0;
        const giaVon = it.giaVon || 0;
        const ttTonDau = it.thanhTienTonDau ?? (tonDau * giaVon);
        const ttNhap = it.thanhTienNhap ?? (nhap * giaVon);
        const ttXuat = it.thanhTienXuat ?? (xuat * giaVon);
        const ttTonCuoi = it.thanhTienTonCuoi ?? (tonCuoi * giaVon);

        acc.tonDau += tonDau;
        acc.ttTonDau += ttTonDau;
        acc.nhap += nhap;
        acc.ttNhap += ttNhap;
        acc.xuat += xuat;
        acc.ttXuat += ttXuat;
        acc.tonCuoi += tonCuoi;
        acc.ttTonCuoi += ttTonCuoi;
        return acc;
      },
      { tonDau: 0, ttTonDau: 0, nhap: 0, ttNhap: 0, xuat: 0, ttXuat: 0, tonCuoi: 0, ttTonCuoi: 0 }
    );
  }, [xntItems]);

  // Xuất Excel nhanh
  const handleExportExcel = (reportName: string) => {
    toast.success(`Đã chuẩn bị tệp Excel: ${reportName}.xlsx`, { autoClose: 2500 });
  };

  // ══════════════════════════════════════════════════════════
  // RENDER BƯỚC 1: XUẤT - NHẬP - TỒN
  // ══════════════════════════════════════════════════════════
  if (currentStep === 1) {
    return (
      <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* TableToolbar */}
        <TableToolbar
          searchValue={xntSearch}
          onSearchChange={(val) => { setXntSearch(val); setXntPage(1); }}
          searchPlaceholder="Tìm mã hàng, tên vật tư, hàng hoá..."
          searchMinWidth="230px"
          customFilters={
            <div className="flex items-center gap-2">
              <WarehouseCategoryFilter
                warehouse={xntWarehouse}
                onWarehouseChange={(val) => {
                  setXntWarehouse(val);
                  setXntPage(1);
                }}
                category={xntCategory}
                onCategoryChange={(val) => {
                  setXntCategory(val);
                  setXntPage(1);
                }}
              />

              {/* Hai ô chọn thời gian kỳ báo cáo: Từ ngày - Đến ngày */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs h-[38px]">
                <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Từ:</span>
                <input
                  type="date"
                  value={xntFromDate}
                  onChange={(e) => {
                    setXntFromDate(e.target.value);
                    setXntPage(1);
                  }}
                  className="border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden p-0 cursor-pointer"
                  style={{ width: "115px" }}
                />
                <span className="text-slate-300 mx-0.5">•</span>
                <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Đến:</span>
                <input
                  type="date"
                  value={xntToDate}
                  onChange={(e) => {
                    setXntToDate(e.target.value);
                    setXntPage(1);
                  }}
                  className="border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden p-0 cursor-pointer"
                  style={{ width: "115px" }}
                />
              </div>
            </div>
          }
          filters={[]}
          printLabel="In báo cáo"
        />

        {/* FullWidthTable */}
        <FullWidthTable loading={xntLoading}>
          <table className="w-full text-left border-collapse" style={{ width: "100%", minWidth: "1050px", fontSize: "13px" }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="text-slate-600 text-[11px] uppercase tracking-[0.05em] font-bold">
                <th rowSpan={2} className="py-2.5 px-3 w-12 text-center align-middle">STT</th>
                <th rowSpan={2} className="py-2.5 px-4 w-[260px] max-w-[260px] align-middle">HÀNG HÓA</th>
                <th rowSpan={2} className="py-2.5 px-3 w-16 text-center align-middle">ĐVT</th>
                <th rowSpan={2} className="py-2.5 px-3 w-28 text-right text-purple-700 align-middle whitespace-nowrap">GIÁ VỐN (Đ)</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">TỒN ĐẦU KỲ</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">NHẬP TRONG KỲ</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">XUẤT TRONG KỲ</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">TỒN CUỐI KỲ</th>
              </tr>
              <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-bold bg-slate-50">
                <th className="py-1.5 px-3 w-22 text-right whitespace-nowrap">SỐ LƯỢNG</th>
                <th className="py-1.5 px-3 w-28 text-right whitespace-nowrap">THÀNH TIỀN</th>
                <th className="py-1.5 px-3 w-22 text-right whitespace-nowrap">SỐ LƯỢNG</th>
                <th className="py-1.5 px-3 w-28 text-right whitespace-nowrap">THÀNH TIỀN</th>
                <th className="py-1.5 px-3 w-22 text-right whitespace-nowrap">SỐ LƯỢNG</th>
                <th className="py-1.5 px-3 w-28 text-right whitespace-nowrap">THÀNH TIỀN</th>
                <th className="py-1.5 px-3 w-22 text-right whitespace-nowrap font-bold text-slate-800">SỐ LƯỢNG</th>
                <th className="py-1.5 px-3 w-28 text-right whitespace-nowrap font-bold text-slate-800">THÀNH TIỀN</th>
              </tr>
            </thead>
            <tbody>
              {xntItems.length === 0 && !xntLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <i className="bi bi-inbox text-3xl block mb-2 opacity-50" />
                    Không tìm thấy dữ liệu xuất nhập tồn phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                xntItems.map((item, idx) => {
                  const tonDau = item.tonDau ?? 0;
                  const nhap = item.nhap ?? 0;
                  const xuat = item.xuat ?? 0;
                  const tonCuoi = item.tonCuoi ?? 0;
                  const giaVon = item.giaVon ?? 0;
                  const ttTonDau = item.thanhTienTonDau ?? (tonDau * giaVon);
                  const ttNhap = item.thanhTienNhap ?? (nhap * giaVon);
                  const ttXuat = item.thanhTienXuat ?? (xuat * giaVon);
                  const ttTonCuoi = item.thanhTienTonCuoi ?? (tonCuoi * giaVon);

                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 text-xs font-mono">
                        {(xntPage - 1) * xntPageSize + idx + 1}
                      </td>
                      <td className="py-2.5 px-4 max-w-[260px]">
                        <div
                          className="font-semibold text-slate-900 text-[13px] truncate"
                          title={item.tenHang}
                        >
                          {item.tenHang}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate">
                          <span className="font-mono text-blue-600 font-medium shrink-0">{item.code}</span>
                          {item.categoryName && (
                            <>
                              <span className="shrink-0">•</span>
                              <span className="text-slate-500 truncate">{item.categoryName}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 text-xs">
                        {item.donVi}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-purple-700">
                        {giaVon.toLocaleString("vi-VN")}
                      </td>
                      {/* TỒN ĐẦU KỲ */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {tonDau.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {ttTonDau.toLocaleString("vi-VN")}
                      </td>
                      {/* NHẬP TRONG KỲ */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {nhap.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {ttNhap.toLocaleString("vi-VN")}
                      </td>
                      {/* XUẤT TRONG KỲ */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-700">
                        {xuat.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-700">
                        {ttXuat.toLocaleString("vi-VN")}
                      </td>
                      {/* TỒN CUỐI KỲ */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {tonCuoi.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {ttTonCuoi.toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {xntItems.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 backdrop-blur-xs font-bold text-slate-900 text-xs border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="py-2.5 px-4 text-center tracking-wider uppercase">
                    TỔNG CỘNG
                  </td>
                  {/* TỒN ĐẦU KỲ */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    {xntTotals.tonDau.toLocaleString("vi-VN")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {xntTotals.ttTonDau.toLocaleString("vi-VN")}
                  </td>
                  {/* NHẬP TRONG KỲ */}
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    {xntTotals.nhap.toLocaleString("vi-VN")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    {xntTotals.ttNhap.toLocaleString("vi-VN")}
                  </td>
                  {/* XUẤT TRONG KỲ */}
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {xntTotals.xuat.toLocaleString("vi-VN")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {xntTotals.ttXuat.toLocaleString("vi-VN")}
                  </td>
                  {/* TỒN CUỐI KỲ */}
                  <td className="py-2.5 px-3 text-right font-mono text-blue-900">
                    {xntTotals.tonCuoi.toLocaleString("vi-VN")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-900">
                    {xntTotals.ttTonCuoi.toLocaleString("vi-VN")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </FullWidthTable>

        {/* Pagination */}
        <Pagination
          currentPage={xntPage}
          totalItems={xntTotal}
          pageSize={xntPageSize}
          onPageChange={setXntPage}
          onPageSizeChange={(newSize) => { setXntPageSize(newSize); setXntPage(1); }}
          pageSizeOptions={[10, 15, 30, 50]}
          itemName="mặt hàng"
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RENDER BƯỚC 2: THẺ KHO
  // ══════════════════════════════════════════════════════════
  if (currentStep === 2) {
    return (
      <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* TableToolbar */}
        <TableToolbar
          searchValue={tkSearch}
          onSearchChange={(val) => { setTkSearch(val); setTkPage(1); }}
          searchPlaceholder="Tìm số chứng từ, diễn giải nghiệp vụ, người giao nhận..."
          searchMinWidth="230px"
          customFilters={
            <div className="flex items-center gap-2">
              {/* 1. Bộ lọc theo kho chuyển ra đầu thanh công cụ */}
              <div style={{ minWidth: "165px", flex: "0 0 auto" }}>
                <Select
                  value={tkWarehouse}
                  onChange={(e) => {
                    setTkWarehouse(e.target.value);
                    setTkPage(1);
                  }}
                  options={[
                    { label: "Tất cả kho", value: "" },
                    ...warehouses.map((w) => ({ label: w.name, value: w.id })),
                  ]}
                  aria-label="Chọn kho lưu trữ"
                  style={{ marginBottom: 0 }}
                />
              </div>

              {/* 2. Component gợi ý chọn hàng hoá lọc theo ký tự nhập & có icon xoá nhanh ở cuối */}
              <ItemSuggestionSelect
                items={availableItems}
                selectedId={tkItemId}
                onSelect={(it) => {
                  setTkItemId(it?.id || "");
                  setTkPage(1);
                }}
                minWidth="320px"
                placeholder="Gõ mã hoặc tên hàng để chọn..."
              />

              {/* 3. Hai ô chọn thời gian kỳ báo cáo: Từ ngày - Đến ngày */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs h-[38px]">
                <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Từ:</span>
                <input
                  type="date"
                  value={tkFromDate}
                  onChange={(e) => {
                    setTkFromDate(e.target.value);
                    setTkPage(1);
                  }}
                  className="border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden p-0 cursor-pointer"
                  style={{ width: "115px" }}
                />
                <span className="text-slate-300 mx-0.5">•</span>
                <span className="text-slate-400 font-medium text-xs whitespace-nowrap">Đến:</span>
                <input
                  type="date"
                  value={tkToDate}
                  onChange={(e) => {
                    setTkToDate(e.target.value);
                    setTkPage(1);
                  }}
                  className="border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden p-0 cursor-pointer"
                  style={{ width: "115px" }}
                />
              </div>
            </div>
          }
          filters={[]}
          printLabel="In thẻ kho"
          onPrint={() => window.print()}
          onExportExcel={() => handleExportExcel(`The_Kho_${tkCurrentItem?.code || "Chi_Tiet"}`)}
          onRefresh={fetchTheKho}
        />

        {/* Thông tin thẻ kho tóm tắt */}
        {tkCurrentItem && (
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Thẻ kho mặt hàng:</span>
              <span className="font-bold text-slate-800">{tkCurrentItem.tenHang}</span>
              <span className="font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 font-bold">
                {tkCurrentItem.code}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">Đơn vị: <b>{tkCurrentItem.donVi}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Số tồn hiện hành sổ sách:</span>
              <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {tkCurrentItem.tonHienTai?.toLocaleString("vi-VN")} {tkCurrentItem.donVi}
              </span>
            </div>
          </div>
        )}

        {/* FullWidthTable */}
        <FullWidthTable loading={tkLoading}>
          <table className="w-full text-left border-collapse" style={{ width: "100%", minWidth: "100%", fontSize: "13px" }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="text-slate-600 text-[11px] uppercase tracking-[0.05em] font-bold">
                <th rowSpan={2} className="py-2.5 px-3 w-12 text-center align-middle">STT</th>
                <th rowSpan={2} className="py-2.5 px-3.5 w-36 align-middle whitespace-nowrap">CHỨNG TỪ</th>
                <th rowSpan={2} className="py-2.5 px-3.5 min-w-[260px] align-middle">DIỄN GIẢI NGHIỆP VỤ</th>
                <th rowSpan={2} className="py-2.5 px-3 w-16 text-center align-middle">ĐVT</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">SỐ LƯỢNG</th>
                <th rowSpan={2} className="py-2.5 px-3.5 w-28 text-right font-bold text-slate-800 align-middle whitespace-nowrap">TỒN KHO</th>
                <th rowSpan={2} className="py-2.5 px-3.5 w-40 align-middle whitespace-nowrap">NGƯỜI LẬP / GIAO NHẬN</th>
              </tr>
              <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-bold bg-slate-50">
                <th className="py-1.5 px-3 w-24 text-right text-emerald-700 whitespace-nowrap">NHẬP</th>
                <th className="py-1.5 px-3 w-24 text-right text-amber-700 whitespace-nowrap">XUẤT</th>
              </tr>
            </thead>
            <tbody>
              {tkLines.length === 0 && !tkLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <i className="bi bi-clock-history text-3xl block mb-2 opacity-50" />
                    Chưa có phát sinh giao dịch nhập xuất nào trong kỳ của mặt hàng này
                  </td>
                </tr>
              ) : (
                tkLines.map((line, idx) => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 text-xs font-mono">
                      {(tkPage - 1) * tkPageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-mono font-semibold text-xs text-blue-600 whitespace-nowrap">
                        {line.soChungTu}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                        {line.ngayChungTu}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-800 font-medium">
                      {line.dienGiai}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 text-xs">
                      {line.donVi}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {line.nhap > 0 ? `+${line.nhap.toLocaleString("vi-VN")}` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                      {line.xuat > 0 ? `-${line.xuat.toLocaleString("vi-VN")}` : "-"}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                      {line.ton.toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700 text-xs font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <i className="bi bi-person text-slate-400" />
                        <span>{line.nguoiThucHien}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FullWidthTable>

        {/* Pagination */}
        <Pagination
          currentPage={tkPage}
          totalItems={tkTotal}
          pageSize={tkPageSize}
          onPageChange={setTkPage}
          onPageSizeChange={(newSize) => { setTkPageSize(newSize); setTkPage(1); }}
          pageSizeOptions={[10, 15, 30, 50]}
          itemName="giao dịch"
        />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RENDER BƯỚC 3: BÁO CÁO KIỂM KHO
  // ══════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* TableToolbar */}
      <TableToolbar
        searchValue={kkSearch}
        onSearchChange={(val) => { setKkSearch(val); setKkPage(1); }}
        searchPlaceholder="Tìm số phiếu kiểm kê, đợt kiểm, người kiểm tra..."
        searchMinWidth="230px"
        filters={[
          {
            id: "warehouse",
            label: "Kho kiểm kê",
            value: kkWarehouse,
            onChange: (val) => { setKkWarehouse(val); setKkPage(1); },
            minWidth: "170px",
            options: [
              { label: "Tất cả kho kiểm", value: "all" },
              ...warehouses.map((w) => ({ label: w.name, value: w.id })),
            ],
          },
          {
            id: "status",
            label: "Kết quả kiểm kê",
            value: kkStatus,
            onChange: (val) => { setKkStatus(val); setKkPage(1); },
            minWidth: "165px",
            options: [
              { label: "Tất cả kết quả", value: "all" },
              { label: "Đã cân bằng sổ", value: "da_can_bang" },
              { label: "Khớp tuyệt đối 100%", value: "khop_tuyet_doi" },
              { label: "Chờ đối soát", value: "cho_xu_ly" },
            ],
          },
        ]}
        menuItems={[
          {
            id: "create-kiem-kho",
            label: "Tạo đợt kiểm kê mới",
            icon: <i className="bi bi-plus-circle text-blue-600" />,
            onClick: () => toast.info("Đã mở biểu mẫu khởi tạo đợt kiểm kê đối soát mới"),
          },
          {
            id: "export-excel",
            label: "Xuất ra bảng Excel",
            icon: <i className="bi bi-file-earmark-excel text-emerald-600" />,
            onClick: () => handleExportExcel("Bien_Ban_Kiem_Ke_Kho"),
          },
          {
            id: "print-report",
            label: "In biên bản",
            icon: <i className="bi bi-printer text-blue-600" />,
            onClick: () => window.print(),
          },
          {
            id: "divider",
            label: "",
            divider: true,
            onClick: () => {},
          },
          {
            id: "refresh-data",
            label: "Làm mới dữ liệu",
            icon: <i className="bi bi-arrow-repeat text-purple-600" />,
            onClick: fetchKiemKho,
          },
        ]}
      />

      {/* FullWidthTable */}
      <FullWidthTable loading={kkLoading}>
        <table className="w-full text-left border-collapse" style={{ width: "100%", minWidth: "100%", fontSize: "13px" }}>
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
              <th className="py-2.5 px-3 w-12 text-center border-0 align-middle">STT</th>
              <th className="py-2.5 px-3.5 min-w-[280px] border-0 align-middle">MÃ PHIẾU KIỂM</th>
              <th className="py-2.5 px-3 w-28 text-center border-0 align-middle whitespace-nowrap">NGÀY KIỂM</th>
              <th className="py-2.5 px-3.5 w-44 border-0 align-middle whitespace-nowrap">HỘI ĐỒNG KIỂM KÊ</th>
              <th className="py-2.5 px-3 w-24 text-center border-0 align-middle whitespace-nowrap">SỐ MẶT HÀNG</th>
              <th className="py-2.5 px-3 w-24 text-center border-0 align-middle text-emerald-700 whitespace-nowrap">SỐ KHỚP</th>
              <th className="py-2.5 px-3 min-w-[100px] w-28 text-center border-0 align-middle text-rose-700 whitespace-nowrap">SỐ LỆCH</th>
            </tr>
          </thead>
          <tbody>
            {kkItems.length === 0 && !kkLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <i className="bi bi-clipboard2-check text-3xl block mb-2 opacity-50" />
                  Không có biên bản kiểm kê nào trong kỳ đối soát hiện tại
                </td>
              </tr>
            ) : (
              kkItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 text-xs font-mono">
                    {(kkPage - 1) * kkPageSize + idx + 1}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-blue-600 hover:text-blue-800 transition-colors">
                        {item.soChungTu}
                      </span>
                      {item.trangThai === "da_can_bang" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i className="bi bi-check-circle-fill text-[9px]" /> {item.trangThaiLabel}
                        </span>
                      ) : item.trangThai === "khop_tuyet_doi" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <i className="bi bi-shield-check text-[9px]" /> {item.trangThaiLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <i className="bi bi-exclamation-triangle-fill text-[9px]" /> {item.trangThaiLabel}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-800 text-xs mt-1">
                      {item.tenDot}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                      <i className="bi bi-building text-slate-400 text-[10px]" />
                      <span>{item.khoTen}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-700 text-xs font-mono whitespace-nowrap">
                    {item.ngayKiem}
                  </td>
                  <td className="py-2.5 px-3.5 text-xs">
                    <div className="font-medium text-slate-800">{item.nguoiKiem}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]" title={item.thanhVien}>
                      {item.thanhVien}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                    {item.tongMatHang}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                    {item.soKhop}
                  </td>
                  <td className="py-2 px-3 text-center align-middle whitespace-nowrap bg-rose-50/20">
                    {item.lechThua + item.lechThieu > 0 ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-mono font-bold text-rose-600 text-xs leading-none whitespace-nowrap">
                          {item.lechThua + item.lechThieu}
                        </span>
                        <span className="text-[11px] font-mono text-rose-700 font-semibold whitespace-nowrap mt-1 inline-block">
                          ({item.giaTriLech})
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-slate-400 text-xs">0</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FullWidthTable>

      {/* Pagination */}
      <Pagination
        currentPage={kkPage}
        totalItems={kkTotal}
        pageSize={kkPageSize}
        onPageChange={setKkPage}
        onPageSizeChange={(newSize) => { setKkPageSize(newSize); setKkPage(1); }}
        pageSizeOptions={[10, 20, 30]}
        itemName="đợt kiểm kê"
      />
    </div>
  );
};
