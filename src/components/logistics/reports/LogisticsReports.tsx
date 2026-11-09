"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Select } from "@/components/common/Select";
import { ItemSuggestionSelect } from "@/components/common/ItemSuggestionSelect";
import { WarehouseCategoryFilter } from "@/components/common/WarehouseCategoryFilter";
import { PrintPreview } from "@/components/common/PrintPreview";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { exportStandardReportExcel } from "@/utils/excelExport";
import { toast } from "react-toastify";

const formatDateVN = (isoDate?: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

interface LogisticsReportsProps {
  currentStep: number;
}

export const LogisticsReports: React.FC<LogisticsReportsProps> = ({ currentStep }) => {
  const company = useCompanyInfo();
  const [dbCompany, setDbCompany] = useState<any>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [onlyWithMovement, setOnlyWithMovement] = useState(false);
  const [printItems, setPrintItems] = useState<any[]>([]);
  const [printLoading, setPrintLoading] = useState(false);

  // ── PrintPreview Thẻ kho (Bước 2) ──
  const [isTkPrintPreviewOpen, setIsTkPrintPreviewOpen] = useState(false);
  const [tkPrintLines, setTkPrintLines] = useState<any[]>([]);
  const [tkPrintCurrentItem, setTkPrintCurrentItem] = useState<any>(null);
  const [tkPrintLoading, setTkPrintLoading] = useState(false);

  // ── PrintPreview Biên bản kiểm kê (Bước 3) ──
  const [isKkPrintPreviewOpen, setIsKkPrintPreviewOpen] = useState(false);
  const [selectedKkDoc, setSelectedKkDoc] = useState<any>(null);
  const [kkPrintDetail, setKkPrintDetail] = useState<any>(null);
  const [kkPrintLoading, setKkPrintLoading] = useState(false);

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
  const [xntServerTotals, setXntServerTotals] = useState<{
    tonDau: number;
    ttTonDau: number;
    nhap: number;
    ttNhap: number;
    xuat: number;
    ttXuat: number;
    tonCuoi: number;
    ttTonCuoi: number;
  } | null>(null);
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

  // ── Load danh sách kho hàng & thông tin công ty từ DB ban đầu ──
  useEffect(() => {
    fetch("/api/logistics/warehouses?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setWarehouses(data.items.map((w: any) => ({ id: w.id, name: w.name })));
        }
      })
      .catch((err) => console.error("Error loading warehouses:", err));

    fetch("/api/company")
      .then((res) => res.json())
      .then((data) => {
        const raw = data?.data || data;
        if (raw && (raw.name || raw.company_name)) {
          setDbCompany(raw);
        }
      })
      .catch((err) => console.error("Error loading company info:", err));
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
        if (data.totals) {
          setXntServerTotals(data.totals);
        }
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

  // ── Tải toàn bộ dữ liệu thực tế từ DB khi mở PrintPreview ──
  const fetchPrintXntData = useCallback(async () => {
    setPrintLoading(true);
    try {
      const params = new URLSearchParams();
      if (xntSearch) params.append("search", xntSearch);
      if (xntWarehouse) params.append("warehouseId", xntWarehouse);
      if (xntCategory) params.append("categoryId", xntCategory);
      if (xntStatus !== "all") params.append("status", xntStatus);
      if (xntFromDate) params.append("fromDate", xntFromDate);
      if (xntToDate) params.append("toDate", xntToDate);
      params.append("nolimit", "true");

      const res = await fetch(`/api/logistics/reports/xnt?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setPrintItems(data.items);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu in báo cáo XNT:", err);
    } finally {
      setPrintLoading(false);
    }
  }, [xntSearch, xntWarehouse, xntCategory, xntStatus, xntFromDate, xntToDate]);

  useEffect(() => {
    if (isPrintPreviewOpen) {
      fetchPrintXntData();
    }
  }, [isPrintPreviewOpen, fetchPrintXntData]);

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

  // ── Tải toàn bộ dữ liệu thực tế của Thẻ kho từ DB khi mở PrintPreview ──
  const fetchPrintTheKhoData = useCallback(async () => {
    setTkPrintLoading(true);
    try {
      const params = new URLSearchParams();
      if (tkItemId) params.append("itemId", tkItemId);
      if (tkWarehouse) params.append("warehouseId", tkWarehouse);
      if (tkSearch) params.append("search", tkSearch);
      if (tkFromDate) params.append("fromDate", tkFromDate);
      if (tkToDate) params.append("toDate", tkToDate);
      params.append("nolimit", "true");

      const res = await fetch(`/api/logistics/reports/the-kho?${params}`);
      const data = await res.json();
      if (data.success) {
        setTkPrintLines(data.items || []);
        setTkPrintCurrentItem(data.currentItem || tkCurrentItem);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu in Thẻ kho:", err);
    } finally {
      setTkPrintLoading(false);
    }
  }, [tkItemId, tkWarehouse, tkSearch, tkFromDate, tkToDate, tkCurrentItem]);

  useEffect(() => {
    if (isTkPrintPreviewOpen) {
      fetchPrintTheKhoData();
    }
  }, [isTkPrintPreviewOpen, fetchPrintTheKhoData]);

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

  // ── Tải chi tiết đợt kiểm kê cho PrintPreview Biên bản kiểm kê ──
  const fetchKkDetail = useCallback(async (docId: string) => {
    setKkPrintLoading(true);
    try {
      const res = await fetch(`/api/logistics/reports/kiem-kho/${encodeURIComponent(docId)}`);
      const data = await res.json();
      if (data.success && data.item) {
        setKkPrintDetail(data.item);
      } else {
        setKkPrintDetail(null);
      }
    } catch (err) {
      console.error("Lỗi nạp chi tiết kiểm kê:", err);
      toast.error("Không thể nạp chi tiết đợt kiểm kê");
    } finally {
      setKkPrintLoading(false);
    }
  }, []);

  const handleOpenKkPrint = (item: any) => {
    setSelectedKkDoc(item);
    setIsKkPrintPreviewOpen(true);
    fetchKkDetail(item.id);
  };

  // Tính tổng hàng cộng dồn cho Báo cáo Xuất Nhập Tồn (ưu tiên tổng toàn bộ từ DB)
  const xntTotals = useMemo(() => {
    if (xntServerTotals) return xntServerTotals;
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
  }, [xntItems, xntServerTotals]);

  // Danh sách hàng hóa hiển thị trong PrintPreview (lọc theo checkbox "Có biến động")
  const displayedPrintItems = useMemo(() => {
    const source = printItems.length > 0 ? printItems : xntItems;
    if (onlyWithMovement) {
      return source.filter(
        (it) => (it.tonDau || 0) > 0 || (it.nhap || 0) > 0 || (it.xuat || 0) > 0 || (it.tonCuoi || 0) > 0
      );
    }
    return source;
  }, [printItems, xntItems, onlyWithMovement]);

  const printTotals = useMemo(() => {
    return displayedPrintItems.reduce(
      (acc, it) => {
        const tonDau = it.tonDau || 0;
        const nhap = it.nhap || 0;
        const xuat = it.xuat || 0;
        const tonCuoi = it.tonCuoi || 0;
        const giaVon = it.giaVon || 0;
        const ttTonDau = it.thanhTienTonDau ?? tonDau * giaVon;
        const ttNhap = it.thanhTienNhap ?? nhap * giaVon;
        const ttXuat = it.thanhTienXuat ?? xuat * giaVon;
        const ttTonCuoi = it.thanhTienTonCuoi ?? tonCuoi * giaVon;

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
  }, [displayedPrintItems]);

  const companyDisplay = useMemo(() => {
    return {
      name: dbCompany?.name || dbCompany?.company_name || company.company_name || "Công ty cổ phần Seajong Việt Nam",
      shortName: dbCompany?.shortName || dbCompany?.short_name || company.short_name || "Seajong VietNam.,JSC",
      logoUrl: dbCompany?.logoUrl || dbCompany?.logo_url || company.logo_url || "/logo.png",
      address: dbCompany?.address ?? company.address ?? "",
      phone: dbCompany?.phone ?? company.phone ?? "",
      email: dbCompany?.email ?? company.email ?? "",
      website: dbCompany?.website ?? company.website ?? "",
      taxCode: dbCompany?.taxCode || dbCompany?.tax_code || company.tax_code || "0111509681",
    };
  }, [dbCompany, company]);

  const today = new Date();
  const defaultDocDate = `${String(today.getDate()).padStart(2, "0")} tháng ${String(today.getMonth() + 1).padStart(2, "0")} năm ${today.getFullYear()}`;
  const defaultXntCode = `BC-XNT-${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}`;

  const selectedWarehouseName = useMemo(() => {
    if (!xntWarehouse || xntWarehouse === "all") return "Tất cả kho hàng hệ thống";
    const found = warehouses.find((w) => w.id === xntWarehouse);
    return found ? found.name : "Tất cả kho hàng hệ thống";
  }, [xntWarehouse, warehouses]);

  const tkSelectedWarehouseName = useMemo(() => {
    if (!tkWarehouse || tkWarehouse === "all") return "Tất cả kho hàng hệ thống";
    const found = warehouses.find((w) => w.id === tkWarehouse);
    return found ? found.name : "Tất cả kho hàng hệ thống";
  }, [tkWarehouse, warehouses]);

  const kkSelectedWarehouseName = useMemo(() => {
    if (!kkWarehouse || kkWarehouse === "all") return "Tất cả kho hàng hệ thống";
    const found = warehouses.find((w) => w.id === kkWarehouse);
    return found ? found.name : "Tất cả kho hàng hệ thống";
  }, [kkWarehouse, warehouses]);

  // ── 1. Xuất Excel Báo cáo Xuất - Nhập - Tồn (Định dạng chuẩn bản in) ──
  const handleExportXntExcel = async () => {
    try {
      toast.info("Đang tạo bảng Excel chuẩn Báo cáo Xuất - Nhập - Tồn...");
      let itemsToExport = printItems;
      if (itemsToExport.length === 0) {
        const params = new URLSearchParams();
        if (xntSearch) params.append("search", xntSearch);
        if (xntWarehouse) params.append("warehouseId", xntWarehouse);
        if (xntCategory) params.append("categoryId", xntCategory);
        if (xntStatus !== "all") params.append("status", xntStatus);
        if (xntFromDate) params.append("fromDate", xntFromDate);
        if (xntToDate) params.append("toDate", xntToDate);
        params.append("nolimit", "true");
        const res = await fetch(`/api/logistics/reports/xnt?${params}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          itemsToExport = data.items;
        }
      }

      if (itemsToExport.length === 0) {
        toast.warning("Không có dữ liệu để xuất Excel");
        return;
      }

      const exportList = onlyWithMovement
        ? itemsToExport.filter((it) => (it.tonDau || 0) > 0 || (it.nhap || 0) > 0 || (it.xuat || 0) > 0 || (it.tonCuoi || 0) > 0)
        : itemsToExport;

      const dataRows = exportList.map((item, idx) => {
        const tonDau = item.tonDau ?? 0;
        const nhap = item.nhap ?? 0;
        const xuat = item.xuat ?? 0;
        const tonCuoi = item.tonCuoi ?? 0;
        const giaVon = item.giaVon ?? 0;
        const ttTonDau = item.thanhTienTonDau ?? tonDau * giaVon;
        const ttNhap = item.thanhTienNhap ?? nhap * giaVon;
        const ttXuat = item.thanhTienXuat ?? xuat * giaVon;
        const ttTonCuoi = item.thanhTienTonCuoi ?? tonCuoi * giaVon;

        return [
          idx + 1,
          item.code,
          item.tenHang,
          item.donVi,
          giaVon,
          tonDau,
          ttTonDau,
          nhap,
          ttNhap,
          xuat,
          ttXuat,
          tonCuoi,
          ttTonCuoi,
        ];
      });

      const totals = exportList.reduce(
        (acc, it) => {
          const tonDau = it.tonDau || 0;
          const nhap = it.nhap || 0;
          const xuat = it.xuat || 0;
          const tonCuoi = it.tonCuoi || 0;
          const giaVon = it.giaVon || 0;
          acc.tonDau += tonDau;
          acc.ttTonDau += it.thanhTienTonDau ?? tonDau * giaVon;
          acc.nhap += nhap;
          acc.ttNhap += it.thanhTienNhap ?? nhap * giaVon;
          acc.xuat += xuat;
          acc.ttXuat += it.thanhTienXuat ?? xuat * giaVon;
          acc.tonCuoi += tonCuoi;
          acc.ttTonCuoi += it.thanhTienTonCuoi ?? tonCuoi * giaVon;
          return acc;
        },
        { tonDau: 0, ttTonDau: 0, nhap: 0, ttNhap: 0, xuat: 0, ttXuat: 0, tonCuoi: 0, ttTonCuoi: 0 }
      );

      exportStandardReportExcel({
        fileName: `Bao_Cao_Xuat_Nhap_Ton_${xntFromDate}_den_${xntToDate}`,
        sheetName: "Xuat_Nhap_Ton",
        company: companyDisplay,
        formCode: "Mẫu số S09-DN",
        title: "BÁO CÁO TỔNG HỢP XUẤT - NHẬP - TỒN KHO",
        subtitle: `Kỳ báo cáo: Từ ngày ${formatDateVN(xntFromDate)} đến ngày ${formatDateVN(xntToDate)}`,
        extraInfo: [
          `Kho hàng áp dụng: ${selectedWarehouseName}`,
          "Đơn vị tính giá trị: Đồng Việt Nam (VNĐ)",
        ],
        headers: [
          ["STT", "Mã hàng", "Tên vật tư, hàng hóa", "ĐVT", "Đơn giá vốn", "Tồn đầu kỳ", "", "Nhập trong kỳ", "", "Xuất trong kỳ", "", "Tồn cuối kỳ", ""],
          ["", "", "", "", "", "Số lượng", "Thành tiền", "Số lượng", "Thành tiền", "Số lượng", "Thành tiền", "Số lượng", "Thành tiền"],
        ],
        merges: [
          { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
          { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },
          { s: { r: 7, c: 2 }, e: { r: 8, c: 2 } },
          { s: { r: 7, c: 3 }, e: { r: 8, c: 3 } },
          { s: { r: 7, c: 4 }, e: { r: 8, c: 4 } },
          { s: { r: 7, c: 5 }, e: { r: 7, c: 6 } },
          { s: { r: 7, c: 7 }, e: { r: 7, c: 8 } },
          { s: { r: 7, c: 9 }, e: { r: 7, c: 10 } },
          { s: { r: 7, c: 11 }, e: { r: 7, c: 12 } },
        ],
        columnsWidths: [6, 14, 36, 8, 14, 12, 16, 12, 16, 12, 16, 12, 16],
        data: dataRows,
        totalsRow: [
          "TỔNG CỘNG", "", "", "", "",
          totals.tonDau, totals.ttTonDau,
          totals.nhap, totals.ttNhap,
          totals.xuat, totals.ttXuat,
          totals.tonCuoi, totals.ttTonCuoi,
        ],
        signatures: ["Người lập biểu", "Thủ kho", "Kế toán trưởng", "Giám đốc"],
      });
      toast.success("Đã xuất file Excel Báo cáo Xuất - Nhập - Tồn thành công!");
    } catch (err) {
      console.error("Lỗi xuất Excel XNT:", err);
      toast.error("Không thể xuất file Excel");
    }
  };

  // ── 2. Xuất Excel Thẻ kho (Định dạng chuẩn Mẫu S12-DN) ──
  const handleExportTheKhoExcel = async () => {
    try {
      toast.info("Đang tạo bảng Excel chuẩn Thẻ kho...");
      let lines = tkLines;
      let item = tkCurrentItem;

      const params = new URLSearchParams();
      if (tkItemId) params.append("itemId", tkItemId);
      if (tkWarehouse) params.append("warehouseId", tkWarehouse);
      if (tkSearch) params.append("search", tkSearch);
      if (tkFromDate) params.append("fromDate", tkFromDate);
      if (tkToDate) params.append("toDate", tkToDate);
      params.append("nolimit", "true");

      const res = await fetch(`/api/logistics/reports/the-kho?${params}`);
      const data = await res.json();
      if (data.success) {
        lines = data.items || [];
        item = data.currentItem || item;
      }

      const tonDauKy = item?.tonDauKy ?? item?.tonHienTai ?? 0;
      const tonCuoiKy = item?.tonHienTai ?? 0;

      let totalNhap = 0;
      let totalXuat = 0;

      const dataRows = [
        ["-", "", "", "", "", "Số dư đầu kỳ", item?.donVi || "cái", "", "", tonDauKy, ""],
        ...lines.map((line, idx) => {
          const nhap = line.nhap || 0;
          const xuat = line.xuat || 0;
          totalNhap += nhap;
          totalXuat += xuat;
          return [
            idx + 1,
            line.ngayChungTu,
            nhap > 0 ? line.soChungTu : "",
            xuat > 0 ? line.soChungTu : "",
            line.ngayChungTu,
            line.dienGiai,
            line.donVi,
            nhap > 0 ? nhap : "",
            xuat > 0 ? xuat : "",
            line.ton,
            line.nguoiThucHien,
          ];
        }),
      ];

      exportStandardReportExcel({
        fileName: `The_Kho_${item?.code || "Chi_Tiet"}_${tkFromDate}_den_${tkToDate}`,
        sheetName: "The_Kho",
        company: companyDisplay,
        formCode: "Mẫu số S12-DN",
        title: "THẺ KHO (SỔ KHO)",
        subtitle: `Từ ngày ${formatDateVN(tkFromDate)} đến ngày ${formatDateVN(tkToDate)}`,
        extraInfo: [
          `Tên, nhãn hiệu, quy cách vật tư, hàng hóa: ${item?.tenHang || ""}`,
          `Mã số: ${item?.code || ""} • Đơn vị tính: ${item?.donVi || "cái"}`,
          `Kho hàng: ${tkSelectedWarehouseName}`,
        ],
        headers: [
          ["STT", "Ngày tháng ghi sổ", "Chứng từ", "", "Ngày chứng từ", "Diễn giải", "ĐVT", "Số lượng", "", "", "Ký xác nhận / Người thực hiện"],
          ["", "", "Số hiệu Nhập", "Số hiệu Xuất", "", "", "", "Nhập", "Xuất", "Tồn", ""],
        ],
        columnsWidths: [6, 16, 18, 18, 14, 36, 8, 12, 12, 14, 22],
        data: dataRows,
        totalsRow: [
          "", "", "", "", "", "CỘNG PHÁT SINH TRONG KỲ", "", totalNhap, totalXuat, tonCuoiKy, "",
        ],
        signatures: ["Người lập biểu", "Thủ kho", "Kế toán trưởng", "Giám đốc"],
      });
      toast.success(`Đã xuất file Excel Thẻ kho: ${item?.code || ""} thành công!`);
    } catch (err) {
      console.error("Lỗi xuất Excel Thẻ kho:", err);
      toast.error("Không thể xuất file Excel Thẻ kho");
    }
  };

  // ── 3. Xuất Excel Báo cáo kiểm kê kho (Định dạng chuẩn Mẫu 05-VT) ──
  const handleExportKiemKhoExcel = async () => {
    try {
      toast.info("Đang tạo bảng Excel chuẩn Biên bản kiểm kê kho...");
      let list = kkItems;
      const params = new URLSearchParams();
      if (kkSearch) params.append("search", kkSearch);
      if (kkWarehouse !== "all") params.append("warehouseId", kkWarehouse);
      if (kkStatus !== "all") params.append("status", kkStatus);
      params.append("page", "1");
      params.append("limit", "1000");

      const res = await fetch(`/api/logistics/reports/kiem-kho?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        list = data.items;
      }

      if (list.length === 0) {
        toast.warning("Không có dữ liệu kiểm kê để xuất Excel");
        return;
      }

      let totSoSach = 0;
      let totThucTe = 0;
      let totThua = 0;
      let totThieu = 0;

      const dataRows = list.map((it, idx) => {
        const soSach = Number(it.soLuongSoSach ?? it.soLuong ?? 0);
        const thucTe = Number(it.soLuongThucTe ?? soSach);
        const diff = thucTe - soSach;
        const thua = diff > 0 ? diff : 0;
        const thieu = diff < 0 ? Math.abs(diff) : 0;
        totSoSach += soSach;
        totThucTe += thucTe;
        totThua += thua;
        totThieu += thieu;

        return [
          idx + 1,
          it.code || `VT-${idx + 1}`,
          it.tenHang || it.name || "",
          it.donVi || "cái",
          soSach,
          thucTe,
          thua > 0 ? thua : "",
          thieu > 0 ? thieu : "",
          thucTe,
          0,
          it.ghiChu || (diff === 0 ? "Khớp số sách" : diff > 0 ? "Thừa thực tế" : "Thiếu thực tế"),
        ];
      });

      exportStandardReportExcel({
        fileName: `Bien_Ban_Kiem_Ke_Kho_${today.getFullYear()}_${today.getMonth() + 1}`,
        sheetName: "Kiem_Ke_Kho",
        company: companyDisplay,
        formCode: "Mẫu số 05-VT",
        title: "BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA",
        subtitle: `Thời điểm kiểm kê: ${defaultDocDate}`,
        extraInfo: [
          `Kho hàng kiểm kê: ${kkSelectedWarehouseName}`,
          "Trưởng ban kiểm kê: Lưu Xuân Trung • Thủ kho: Nguyễn Văn Hùng",
        ],
        headers: [
          ["STT", "Mã hàng", "Tên vật tư, hàng hóa", "ĐVT", "Số lượng sổ sách", "Kiểm kê thực tế", "Chênh lệch thừa (+)", "Chênh lệch thiếu (-)", "Phẩm chất tốt", "Kém phẩm chất", "Ghi chú"],
        ],
        columnsWidths: [6, 14, 34, 8, 16, 16, 16, 16, 14, 14, 22],
        data: dataRows,
        totalsRow: [
          "TỔNG CỘNG", "", "", "", totSoSach, totThucTe, totThua, totThieu, totThucTe, 0, "",
        ],
        signatures: ["Trưởng ban kiểm kê", "Thủ kho", "Kế toán trưởng", "Đại diện Ban Giám đốc"],
      });
      toast.success("Đã xuất file Excel Biên bản kiểm kê kho thành công!");
    } catch (err) {
      console.error("Lỗi xuất Excel kiểm kê:", err);
      toast.error("Không thể xuất file Excel");
    }
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
          onImportExcel={(file) => {
            toast.success(`Đã tiếp nhận tệp dữ liệu: ${file.name}`);
            fetchXnt();
          }}
          menuItems={[
            {
              id: "export-excel",
              label: "Xuất ra bảng Excel",
              icon: <i className="bi bi-file-earmark-excel text-emerald-600 text-sm" />,
              onClick: handleExportXntExcel,
            },
            {
              id: "import-excel",
              label: "Nhập từ bảng Excel",
              icon: <i className="bi bi-file-earmark-arrow-up text-blue-600 text-sm" />,
              onClick: () => toast.info("Đã mở trình nhập dữ liệu từ bảng Excel"),
            },
            {
              id: "print-report",
              label: "In báo cáo",
              icon: <i className="bi bi-printer text-indigo-600 text-sm" />,
              onClick: () => setIsPrintPreviewOpen(true),
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
              icon: <i className="bi bi-arrow-repeat text-purple-600 text-sm" />,
              onClick: fetchXnt,
            },
          ]}
        />

        {/* FullWidthTable */}
        <FullWidthTable loading={xntLoading}>
          <table className="w-full text-left border-collapse logistics-overview-compact-table md:min-w-[1050px]" style={{ width: "100%", fontSize: "13px" }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="text-slate-600 text-[11px] uppercase tracking-[0.05em] font-bold">
                <th rowSpan={2} className="py-2.5 px-2 sm:px-3 w-9 sm:w-12 text-center align-middle">STT</th>
                <th rowSpan={2} className="py-2.5 px-2.5 sm:px-4 md:w-[260px] md:max-w-[260px] align-middle">HÀNG HÓA</th>
                <th rowSpan={2} className="py-2.5 px-2 sm:px-3 w-12 sm:w-16 text-center align-middle">ĐVT</th>
                <th rowSpan={2} className="hidden md:table-cell py-2.5 px-3 w-28 text-right text-purple-700 align-middle whitespace-nowrap">GIÁ VỐN (Đ)</th>
                <th colSpan={2} className="hidden md:table-cell py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">TỒN ĐẦU KỲ</th>
                <th colSpan={2} className="hidden md:table-cell py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">NHẬP TRONG KỲ</th>
                <th colSpan={2} className="hidden md:table-cell py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">XUẤT TRONG KỲ</th>
                <th colSpan={2} className="hidden md:table-cell py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">TỒN CUỐI KỲ</th>
              </tr>
              <tr className="hidden md:table-row text-slate-500 text-[10px] uppercase tracking-wider font-bold bg-slate-50">
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
                      <td className="py-2.5 px-2 sm:px-3 text-center text-slate-400 text-xs font-mono align-top md:align-middle">
                        {(xntPage - 1) * xntPageSize + idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5 sm:px-4 md:max-w-[260px] max-w-0 overflow-hidden">
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
                        {/* Chi tiết Xuất-Nhập-Tồn rút gọn trên Mobile */}
                        <div className="block md:hidden mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] space-y-0.5">
                          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-slate-600">
                            <span>Đầu: <b className="font-mono text-slate-800">{tonDau.toLocaleString("vi-VN")}</b></span>
                            <span>Nhập: <b className="font-mono text-emerald-700">+{nhap.toLocaleString("vi-VN")}</b></span>
                            <span>Xuất: <b className="font-mono text-amber-700">-{xuat.toLocaleString("vi-VN")}</b></span>
                            <span>Cuối: <b className="font-mono text-blue-700">{tonCuoi.toLocaleString("vi-VN")}</b></span>
                          </div>
                          <div className="flex items-center flex-wrap gap-x-2.5 text-slate-500">
                            <span>Giá vốn: <b className="font-mono text-purple-700">{giaVon.toLocaleString("vi-VN")}đ</b></span>
                            <span>•</span>
                            <span>Giá trị tồn: <b className="font-mono text-slate-800">{ttTonCuoi.toLocaleString("vi-VN")}đ</b></span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 text-center text-slate-600 text-xs align-top md:align-middle">
                        {item.donVi}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-purple-700">
                        {giaVon.toLocaleString("vi-VN")}
                      </td>
                      {/* TỒN ĐẦU KỲ */}
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {tonDau.toLocaleString("vi-VN")}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {ttTonDau.toLocaleString("vi-VN")}
                      </td>
                      {/* NHẬP TRONG KỲ */}
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {nhap.toLocaleString("vi-VN")}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {ttNhap.toLocaleString("vi-VN")}
                      </td>
                      {/* XUẤT TRONG KỲ */}
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-amber-700">
                        {xuat.toLocaleString("vi-VN")}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-medium text-amber-700">
                        {ttXuat.toLocaleString("vi-VN")}
                      </td>
                      {/* TỒN CUỐI KỲ */}
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {tonCuoi.toLocaleString("vi-VN")}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {ttTonCuoi.toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {xntItems.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 backdrop-blur-xs font-bold text-slate-900 text-xs border-t-2 border-slate-200">
                <tr className="table-row md:hidden">
                  <td colSpan={3} className="py-2 px-3">
                    <div className="flex items-center justify-between flex-wrap gap-1.5 text-[11px]">
                      <span className="uppercase tracking-wider text-slate-700">TỔNG CỘNG:</span>
                      <div className="flex items-center flex-wrap gap-x-2.5">
                        <span>Đầu: <b className="font-mono">{xntTotals.tonDau.toLocaleString("vi-VN")}</b></span>
                        <span className="text-emerald-800">Nhập: <b className="font-mono">+{xntTotals.nhap.toLocaleString("vi-VN")}</b></span>
                        <span className="text-amber-800">Xuất: <b className="font-mono">-{xntTotals.xuat.toLocaleString("vi-VN")}</b></span>
                        <span className="text-blue-900">Cuối: <b className="font-mono">{xntTotals.tonCuoi.toLocaleString("vi-VN")}</b> ({xntTotals.ttTonCuoi.toLocaleString("vi-VN")}đ)</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="hidden md:table-row">
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

        {/* PrintPreview: Báo cáo tổng hợp Xuất - Nhập - Tồn */}
        <PrintPreview
          isOpen={isPrintPreviewOpen}
          onClose={() => setIsPrintPreviewOpen(false)}
          documentTitle="BÁO CÁO TỔNG HỢP XUẤT - NHẬP - TỒN KHO"
          documentCode={defaultXntCode}
          date={defaultDocDate}
          department="Bộ phận Kho vận"
          defaultPaperSize="A4"
          defaultOrientation="landscape"
          hideSidebar={true}
          headerCenterExtra={
            <div className="print-toolbar-group" style={{ marginLeft: "4px" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: onlyWithMovement ? "#1d4ed8" : "#475569",
                  backgroundColor: onlyWithMovement ? "#eff6ff" : "transparent",
                  border: `1px solid ${onlyWithMovement ? "#93c5fd" : "transparent"}`,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  userSelect: "none",
                  transition: "all 0.15s ease",
                }}
                title="Lọc các mặt hàng có số dư tồn kho hoặc có biến động trong kỳ báo cáo"
              >
                <input
                  type="checkbox"
                  checked={onlyWithMovement}
                  onChange={(e) => setOnlyWithMovement(e.target.checked)}
                  style={{ cursor: "pointer", accentColor: "#2563eb" }}
                />
                <span>Có biến động</span>
              </label>
            </div>
          }
        >
          {(meta) => (
            <div style={{ fontFamily: "'Roboto Condensed', Arial, sans-serif", color: "#0f172a" }}>
              {/* 1. HEADER DOANH NGHIỆP TỪ BẢNG CompanyInfo TRONG DB */}
              <div
                className="print-doc-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "12px",
                  borderBottom: "2px solid #003087",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <img
                    src={companyDisplay.logoUrl || "/logo.png"}
                    alt={companyDisplay.shortName || "SEAJONG"}
                    style={{
                      height: "48px",
                      maxHeight: "48px",
                      maxWidth: "115px",
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.86rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "#003087",
                        lineHeight: 1.25,
                      }}
                    >
                      {companyDisplay.name}
                    </div>
                    {companyDisplay.address && (
                      <div style={{ fontSize: "0.72rem", color: "#334155", marginTop: "2px", lineHeight: 1.3 }}>
                        Địa chỉ: {companyDisplay.address}
                      </div>
                    )}
                    <div style={{ fontSize: "0.71rem", color: "#475569", marginTop: "1px" }}>
                      MST: <strong>{companyDisplay.taxCode}</strong>
                      {companyDisplay.phone && <> • ĐT: {companyDisplay.phone}</>}
                      {companyDisplay.email && <> • Email: {companyDisplay.email}</>}
                      {companyDisplay.website && <> • Website: {companyDisplay.website}</>}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    flexShrink: 0,
                    marginLeft: "16px",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.76rem", textTransform: "uppercase", color: "#0f172a" }}>
                    Mẫu số S09-DN
                  </div>
                  <div style={{ fontSize: "0.68rem", fontStyle: "italic", color: "#475569", marginTop: "1px" }}>
                    (Ban hành theo Thông tư 200/2014/TT-BTC)
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#003087", marginTop: "3px" }}>
                    Số hiệu: {meta.code}
                  </div>
                </div>
              </div>

              {/* 2. TIÊU ĐỀ BÁO CÁO & KỲ LỌC */}
              <div style={{ textAlign: "center", margin: "14px 0 12px" }}>
                <h1
                  style={{
                    fontWeight: 900,
                    margin: "0 0 4px 0",
                    fontSize: "1.2rem",
                    color: "#003087",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                  }}
                >
                  {meta.title}
                </h1>
                <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: "#334155", fontWeight: 600 }}>
                  Kỳ báo cáo: Từ ngày {formatDateVN(xntFromDate)} đến ngày {formatDateVN(xntToDate)}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "6px",
                    fontSize: "0.74rem",
                    color: "#1e293b",
                  }}
                >
                  <div>
                    Kho hàng áp dụng: <strong>{selectedWarehouseName}</strong>
                    {onlyWithMovement && (
                      <span style={{ marginLeft: "8px", color: "#1d4ed8", fontWeight: 700 }}>
                        (Chỉ lọc các mặt hàng có biến động trong kỳ)
                      </span>
                    )}
                  </div>
                  <div style={{ fontStyle: "italic", color: "#475569" }}>
                    Đơn vị tính giá trị: Đồng Việt Nam (VNĐ)
                  </div>
                </div>
              </div>

              {/* 3. BẢNG TỔNG HỢP XUẤT - NHẬP - TỒN TỪ TOÀN BỘ CƠ SỞ DỮ LIỆU */}
              <table
                className="print-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.72rem",
                  lineHeight: 1.35,
                  marginBottom: "14px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9" }}>
                    <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "center", width: "28px", fontWeight: 800 }}>STT</th>
                    <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 5px", textAlign: "center", width: "74px", fontWeight: 800 }}>MÃ HÀNG</th>
                    <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 6px", textAlign: "left", fontWeight: 800 }}>TÊN VẬT TƯ, HÀNG HÓA</th>
                    <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "center", width: "36px", fontWeight: 800 }}>ĐVT</th>
                    <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 5px", textAlign: "right", width: "68px", fontWeight: 800 }}>ĐƠN GIÁ VỐN</th>
                    <th colSpan={2} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 800 }}>TỒN ĐẦU KỲ</th>
                    <th colSpan={2} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 800 }}>NHẬP TRONG KỲ</th>
                    <th colSpan={2} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 800 }}>XUẤT TRONG KỲ</th>
                    <th colSpan={2} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 800 }}>TỒN CUỐI KỲ</th>
                  </tr>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "48px", fontWeight: 700 }}>SL</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "78px", fontWeight: 700 }}>Thành tiền</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "48px", fontWeight: 700 }}>SL</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "78px", fontWeight: 700 }}>Thành tiền</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "48px", fontWeight: 700 }}>SL</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "78px", fontWeight: 700 }}>Thành tiền</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "48px", fontWeight: 800 }}>SL</th>
                    <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "82px", fontWeight: 800 }}>Thành tiền</th>
                  </tr>
                  <tr style={{ fontStyle: "italic", backgroundColor: "#f8fafc", fontSize: "0.65rem", color: "#475569" }}>
                    {["A", "B", "C", "D", "E", "(1)", "(2)", "(3)", "(4)", "(5)", "(6)", "(7)", "(8)"].map((colCode) => (
                      <td key={colCode} style={{ border: "1px solid #334155", padding: "2px", textAlign: "center" }}>
                        {colCode}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printLoading ? (
                    <tr>
                      <td colSpan={13} style={{ border: "1px solid #334155", padding: "24px", textAlign: "center", color: "#2563eb" }}>
                        <i className="bi bi-arrow-repeat spin inline-block mr-2" />
                        Đang nạp toàn bộ dữ liệu thực tế từ cơ sở dữ liệu kho...
                      </td>
                    </tr>
                  ) : displayedPrintItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ border: "1px solid #334155", padding: "20px", textAlign: "center", color: "#64748b" }}>
                        {onlyWithMovement
                          ? "Không có mặt hàng nào có số dư tồn kho hoặc biến động trong kỳ báo cáo"
                          : "Không tìm thấy dữ liệu xuất nhập tồn phù hợp"}
                      </td>
                    </tr>
                  ) : (
                    displayedPrintItems.map((item, idx) => {
                      const tonDau = item.tonDau ?? 0;
                      const nhap = item.nhap ?? 0;
                      const xuat = item.xuat ?? 0;
                      const tonCuoi = item.tonCuoi ?? 0;
                      const giaVon = item.giaVon ?? 0;
                      const ttTonDau = item.thanhTienTonDau ?? tonDau * giaVon;
                      const ttNhap = item.thanhTienNhap ?? nhap * giaVon;
                      const ttXuat = item.thanhTienXuat ?? xuat * giaVon;
                      const ttTonCuoi = item.thanhTienTonCuoi ?? tonCuoi * giaVon;

                      return (
                        <tr key={item.id || idx}>
                          <td style={{ border: "1px solid #334155", padding: "4px", textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 700, color: "#003087" }}>
                            {item.code}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 6px", fontWeight: 600 }}>
                            {item.tenHang}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px", textAlign: "center" }}>{item.donVi}</td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right" }}>
                            {giaVon.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right" }}>
                            {tonDau.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right" }}>
                            {ttTonDau.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: nhap > 0 ? "#047857" : undefined, fontWeight: nhap > 0 ? 700 : 400 }}>
                            {nhap.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: nhap > 0 ? "#047857" : undefined }}>
                            {ttNhap.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: xuat > 0 ? "#b45309" : undefined, fontWeight: xuat > 0 ? 700 : 400 }}>
                            {xuat.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: xuat > 0 ? "#b45309" : undefined }}>
                            {ttXuat.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", fontWeight: 700, color: "#003087" }}>
                            {tonCuoi.toLocaleString("vi-VN")}
                          </td>
                          <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", fontWeight: 700, color: "#003087" }}>
                            {ttTonCuoi.toLocaleString("vi-VN")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 800 }}>
                    <td colSpan={5} style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "center", textTransform: "uppercase" }}>
                      TỔNG CỘNG ({displayedPrintItems.length} MẶT HÀNG)
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right" }}>
                      {printTotals.tonDau.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right" }}>
                      {printTotals.ttTonDau.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#047857" }}>
                      {printTotals.nhap.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#047857" }}>
                      {printTotals.ttNhap.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#b45309" }}>
                      {printTotals.xuat.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#b45309" }}>
                      {printTotals.ttXuat.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#003087" }}>
                      {printTotals.tonCuoi.toLocaleString("vi-VN")}
                    </td>
                    <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#003087" }}>
                      {printTotals.ttTonCuoi.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </PrintPreview>
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
          menuItems={[
            {
              id: "export-excel",
              label: "Xuất ra bảng Excel",
              icon: <i className="bi bi-file-earmark-excel text-emerald-600 text-sm" />,
              onClick: handleExportTheKhoExcel,
            },
            {
              id: "print-the-kho",
              label: "In thẻ kho",
              icon: <i className="bi bi-printer text-indigo-600 text-sm" />,
              onClick: () => setIsTkPrintPreviewOpen(true),
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
              icon: <i className="bi bi-arrow-repeat text-purple-600 text-sm" />,
              onClick: fetchTheKho,
            },
          ]}
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
          <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ width: "100%", fontSize: "13px" }}>
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="text-slate-600 text-[11px] uppercase tracking-[0.05em] font-bold">
                <th rowSpan={2} className="py-2.5 px-2 sm:px-3 w-9 sm:w-12 text-center align-middle">STT</th>
                <th rowSpan={2} className="py-2.5 px-2.5 sm:px-3.5 md:w-36 align-middle whitespace-nowrap">CHỨNG TỪ</th>
                <th rowSpan={2} className="hidden md:table-cell py-2.5 px-3.5 min-w-[260px] align-middle">DIỄN GIẢI NGHIỆP VỤ</th>
                <th rowSpan={2} className="hidden md:table-cell py-2.5 px-3 w-16 text-center align-middle">ĐVT</th>
                <th colSpan={2} className="hidden md:table-cell py-2 px-3 text-center border-b border-slate-200/80 whitespace-nowrap">SỐ LƯỢNG</th>
                <th rowSpan={2} className="hidden md:table-cell py-2.5 px-3.5 w-28 text-right font-bold text-slate-800 align-middle whitespace-nowrap">TỒN KHO</th>
                <th rowSpan={2} className="hidden md:table-cell py-2.5 px-3.5 w-40 align-middle whitespace-nowrap">NGƯỜI LẬP / GIAO NHẬN</th>
              </tr>
              <tr className="hidden md:table-row text-slate-500 text-[10px] uppercase tracking-wider font-bold bg-slate-50">
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
                    <td className="py-2.5 px-2 sm:px-3 text-center text-slate-400 text-xs font-mono align-top md:align-middle">
                      {(tkPage - 1) * tkPageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3.5">
                      <div className="flex items-center justify-between md:block gap-2">
                        <div className="font-mono font-semibold text-xs text-blue-600 whitespace-nowrap">
                          {line.soChungTu}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono md:mt-0.5 whitespace-nowrap">
                          {line.ngayChungTu}
                        </div>
                      </div>
                      <div className="block md:hidden mt-1 space-y-1 text-xs">
                        <div className="text-slate-800 font-medium">{line.dienGiai}</div>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                          {line.nhap > 0 && (
                            <span>Nhập: <b className="font-mono text-emerald-700">+{line.nhap.toLocaleString("vi-VN")} {line.donVi}</b></span>
                          )}
                          {line.xuat > 0 && (
                            <span>Xuất: <b className="font-mono text-amber-700">-{line.xuat.toLocaleString("vi-VN")} {line.donVi}</b></span>
                          )}
                          <span>Tồn: <b className="font-mono text-slate-900">{line.ton.toLocaleString("vi-VN")} {line.donVi}</b></span>
                          <span className="text-slate-500">• <i className="bi bi-person" /> {line.nguoiThucHien}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3.5 text-slate-800 font-medium">
                      {line.dienGiai}
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3 text-center text-slate-600 text-xs">
                      {line.donVi}
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {line.nhap > 0 ? `+${line.nhap.toLocaleString("vi-VN")}` : "-"}
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                      {line.xuat > 0 ? `-${line.xuat.toLocaleString("vi-VN")}` : "-"}
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                      {line.ton.toLocaleString("vi-VN")}
                    </td>
                    <td className="hidden md:table-cell py-2.5 px-3.5 text-slate-700 text-xs font-medium whitespace-nowrap">
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

        {/* PrintPreview: THẺ KHO CHI TIẾT (Mẫu S12-DN) */}
        <PrintPreview
          isOpen={isTkPrintPreviewOpen}
          onClose={() => setIsTkPrintPreviewOpen(false)}
          documentTitle="THẺ KHO (SỔ KHO)"
          documentCode={`TK-${tkCurrentItem?.code || "CHI-TIET"}`}
          date={defaultDocDate}
          department="Bộ phận Kho vận"
          defaultPaperSize="A4"
          defaultOrientation="portrait"
          hideSidebar={true}
        >
          {(meta) => {
            const currentItem = tkPrintCurrentItem || tkCurrentItem;
            const lines = tkPrintLines.length > 0 ? tkPrintLines : tkLines;
            const tonDauKy = currentItem?.tonDauKy ?? currentItem?.tonHienTai ?? 0;
            const tonCuoiKy = currentItem?.tonHienTai ?? 0;

            let totalNhap = 0;
            let totalXuat = 0;
            lines.forEach((l) => {
              totalNhap += Number(l.nhap) || 0;
              totalXuat += Number(l.xuat) || 0;
            });

            return (
              <div style={{ fontFamily: "'Roboto Condensed', Arial, sans-serif", color: "#0f172a" }}>
                {/* 1. Header công ty Seajong từ DB */}
                <div
                  className="print-doc-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    paddingBottom: "12px",
                    borderBottom: "2px solid #003087",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                    <img
                      src={companyDisplay.logoUrl || "/logo.png"}
                      alt={companyDisplay.shortName || "SEAJONG"}
                      style={{ height: "46px", maxHeight: "46px", maxWidth: "110px", objectFit: "contain", flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", color: "#003087", lineHeight: 1.25 }}>
                        {companyDisplay.name}
                      </div>
                      {companyDisplay.address && (
                        <div style={{ fontSize: "0.71rem", color: "#334155", marginTop: "2px", lineHeight: 1.3 }}>
                          Địa chỉ: {companyDisplay.address}
                        </div>
                      )}
                      <div style={{ fontSize: "0.70rem", color: "#475569", marginTop: "1px" }}>
                        MST: <strong>{companyDisplay.taxCode}</strong>
                        {companyDisplay.phone && <> • ĐT: {companyDisplay.phone}</>}
                        {companyDisplay.email && <> • Email: {companyDisplay.email}</>}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, marginLeft: "16px" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.76rem", textTransform: "uppercase", color: "#0f172a" }}>
                      Mẫu số S12-DN
                    </div>
                    <div style={{ fontSize: "0.68rem", fontStyle: "italic", color: "#475569", marginTop: "1px" }}>
                      (Ban hành theo TT 200/2014/TT-BTC)
                    </div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#003087", marginTop: "3px" }}>
                      Số hiệu: {meta.code}
                    </div>
                  </div>
                </div>

                {/* 2. Tiêu đề Thẻ kho */}
                <div style={{ textAlign: "center", margin: "14px 0 10px" }}>
                  <h1 style={{ fontWeight: 900, margin: "0 0 4px 0", fontSize: "1.25rem", color: "#003087", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    THẺ KHO (SỔ KHO)
                  </h1>
                  <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: "#334155", fontWeight: 600 }}>
                    Từ ngày {formatDateVN(tkFromDate)} đến ngày {formatDateVN(tkToDate)}
                  </div>
                </div>

                {/* 3. Thông tin vật tư hàng hóa */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    marginBottom: "12px",
                    fontSize: "0.75rem",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "6px 16px",
                  }}
                >
                  <div>
                    Tên, quy cách vật tư, hàng hóa: <strong style={{ color: "#003087", fontSize: "0.82rem" }}>{currentItem?.tenHang}</strong>
                  </div>
                  <div>
                    Mã số hàng hóa: <strong style={{ color: "#003087", fontFamily: "monospace" }}>{currentItem?.code}</strong>
                  </div>
                  <div>
                    Kho hàng lưu trữ: <strong>{tkSelectedWarehouseName}</strong>
                  </div>
                  <div>
                    Đơn vị tính: <strong>{currentItem?.donVi || "cái"}</strong>
                  </div>
                </div>

                {/* 4. Bảng chi tiết Thẻ kho chuẩn Mẫu S12-DN */}
                <table className="print-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem", lineHeight: 1.35, marginBottom: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "center", width: "28px", fontWeight: 800 }}>STT</th>
                      <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 5px", textAlign: "center", width: "75px", fontWeight: 800 }}>NGÀY GHI SỔ</th>
                      <th colSpan={2} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 800 }}>CHỨNG TỪ</th>
                      <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 5px", textAlign: "center", width: "75px", fontWeight: 800 }}>NGÀY CT</th>
                      <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 6px", textAlign: "left", fontWeight: 800 }}>DIỄN GIẢI NGHIỆP VỤ</th>
                      <th colSpan={3} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: 800 }}>SỐ LƯỢNG</th>
                      <th rowSpan={2} style={{ border: "1px solid #334155", padding: "5px 6px", textAlign: "left", width: "95px", fontWeight: 800 }}>KÝ XÁC NHẬN</th>
                    </tr>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "center", width: "75px", fontWeight: 700 }}>Số hiệu Nhập</th>
                      <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "center", width: "75px", fontWeight: 700 }}>Số hiệu Xuất</th>
                      <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "45px", fontWeight: 700, color: "#047857" }}>Nhập</th>
                      <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "45px", fontWeight: 700, color: "#b45309" }}>Xuất</th>
                      <th style={{ border: "1px solid #334155", padding: "4px", textAlign: "right", width: "50px", fontWeight: 800, color: "#003087" }}>Tồn</th>
                    </tr>
                    <tr style={{ fontStyle: "italic", backgroundColor: "#f8fafc", fontSize: "0.65rem", color: "#475569" }}>
                      {["A", "B", "C", "D", "E", "F", "(1)", "(2)", "(3)", "G"].map((code) => (
                        <td key={code} style={{ border: "1px solid #334155", padding: "2px", textAlign: "center" }}>
                          {code}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Dòng Số dư đầu kỳ */}
                    <tr style={{ backgroundColor: "#f8fafc", fontWeight: 700 }}>
                      <td style={{ border: "1px solid #334155", padding: "4px", textAlign: "center" }}>-</td>
                      <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center" }}>{formatDateVN(tkFromDate)}</td>
                      <td style={{ border: "1px solid #334155", padding: "4px" }}></td>
                      <td style={{ border: "1px solid #334155", padding: "4px" }}></td>
                      <td style={{ border: "1px solid #334155", padding: "4px" }}></td>
                      <td style={{ border: "1px solid #334155", padding: "4px 6px", color: "#003087" }}>Số dư đầu kỳ</td>
                      <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right" }}>-</td>
                      <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right" }}>-</td>
                      <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: "#003087" }}>
                        {tonDauKy.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ border: "1px solid #334155", padding: "4px 6px" }}></td>
                    </tr>

                    {/* Các dòng phát sinh */}
                    {tkPrintLoading ? (
                      <tr>
                        <td colSpan={10} style={{ border: "1px solid #334155", padding: "20px", textAlign: "center", color: "#2563eb" }}>
                          <i className="bi bi-arrow-repeat spin inline-block mr-2" />
                          Đang tải toàn bộ dữ liệu giao dịch Thẻ kho...
                        </td>
                      </tr>
                    ) : lines.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ border: "1px solid #334155", padding: "16px", textAlign: "center", color: "#64748b" }}>
                          Không có phát sinh giao dịch nhập xuất nào trong kỳ báo cáo
                        </td>
                      </tr>
                    ) : (
                      lines.map((line, idx) => {
                        const isNhap = (line.nhap || 0) > 0;
                        const isXuat = (line.xuat || 0) > 0;
                        return (
                          <tr key={line.id || idx}>
                            <td style={{ border: "1px solid #334155", padding: "4px", textAlign: "center" }}>{idx + 1}</td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center" }}>{line.ngayChungTu}</td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: isNhap ? 700 : 400, color: isNhap ? "#047857" : undefined }}>
                              {isNhap ? line.soChungTu : ""}
                            </td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center", fontWeight: isXuat ? 700 : 400, color: isXuat ? "#b45309" : undefined }}>
                              {isXuat ? line.soChungTu : ""}
                            </td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "center" }}>{line.ngayChungTu}</td>
                            <td style={{ border: "1px solid #334155", padding: "4px 6px" }}>{line.dienGiai}</td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: isNhap ? "#047857" : undefined, fontWeight: isNhap ? 700 : 400 }}>
                              {isNhap ? line.nhap.toLocaleString("vi-VN") : "-"}
                            </td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", color: isXuat ? "#b45309" : undefined, fontWeight: isXuat ? 700 : 400 }}>
                              {isXuat ? line.xuat.toLocaleString("vi-VN") : "-"}
                            </td>
                            <td style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", fontWeight: 700, color: "#003087" }}>
                              {line.ton.toLocaleString("vi-VN")}
                            </td>
                            <td style={{ border: "1px solid #334155", padding: "4px 6px", fontSize: "0.68rem", color: "#334155" }}>
                              {line.nguoiThucHien}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 800 }}>
                      <td colSpan={6} style={{ border: "1px solid #334155", padding: "6px 8px", textAlign: "center", textTransform: "uppercase" }}>
                        CỘNG PHÁT SINH TRONG KỲ
                      </td>
                      <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#047857" }}>
                        {totalNhap.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#b45309" }}>
                        {totalXuat.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ border: "1px solid #334155", padding: "6px 5px", textAlign: "right", color: "#003087" }}>
                        {tonCuoiKy.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ border: "1px solid #334155", padding: "6px" }}></td>
                    </tr>
                  </tfoot>
                </table>

                {/* 5. Chữ ký chuẩn Mẫu S12-DN */}
                <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", fontSize: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Người lập thẻ</div>
                    <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, ghi rõ họ tên)</div>
                    <div style={{ height: "45px" }} />
                    <div style={{ fontWeight: 600 }}>Lưu Xuân Trung</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Thủ kho</div>
                    <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, ghi rõ họ tên)</div>
                    <div style={{ height: "45px" }} />
                    <div style={{ fontWeight: 600 }}>Nguyễn Văn Hùng</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Kế toán trưởng</div>
                    <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, ghi rõ họ tên)</div>
                    <div style={{ height: "45px" }} />
                    <div style={{ fontWeight: 600 }}>Đặng Thị Lan</div>
                  </div>
                </div>
              </div>
            );
          }}
        </PrintPreview>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // RENDER BƯỚC 3: BÁO CÁO KIỂM KHO
  // ══════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* TableToolbar - Đã ẩn drop menu theo yêu cầu */}
      <TableToolbar
        searchValue={kkSearch}
        onSearchChange={(val) => { setKkSearch(val); setKkPage(1); }}
        searchPlaceholder="Tìm số phiếu kiểm kê, đợt kiểm, người kiểm tra..."
        searchMinWidth="230px"
        showMenu={false}
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
      />

      {/* FullWidthTable */}
      <FullWidthTable loading={kkLoading}>
        <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ width: "100%", fontSize: "13px" }}>
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
              <th className="py-2.5 px-2 sm:px-3 w-9 sm:w-12 text-center border-0 align-middle">STT</th>
              <th className="py-2.5 px-2.5 sm:px-3.5 md:min-w-[280px] border-0 align-middle">MÃ PHIẾU KIỂM</th>
              <th className="hidden md:table-cell py-2.5 px-3 w-28 text-center border-0 align-middle whitespace-nowrap">NGÀY KIỂM</th>
              <th className="hidden md:table-cell py-2.5 px-3.5 w-44 border-0 align-middle whitespace-nowrap">HỘI ĐỒNG KIỂM KÊ</th>
              <th className="hidden md:table-cell py-2.5 px-3 w-24 text-center border-0 align-middle whitespace-nowrap">SỐ MẶT HÀNG</th>
              <th className="hidden md:table-cell py-2.5 px-3 w-24 text-center border-0 align-middle text-emerald-700 whitespace-nowrap">SỐ KHỚP</th>
              <th className="hidden md:table-cell py-2.5 px-3 min-w-[100px] w-28 text-center border-0 align-middle text-rose-700 whitespace-nowrap">SỐ LỆCH</th>
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
                <tr
                  key={item.id}
                  onClick={() => handleOpenKkPrint(item)}
                  title="Nhấp chuột vào dòng để in Biên bản kiểm kê kho (Mẫu 05-VT)"
                  className="border-b border-slate-100 hover:bg-blue-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-2 sm:px-3 text-center text-slate-400 text-xs font-mono align-top md:align-middle">
                    {(kkPage - 1) * kkPageSize + idx + 1}
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-blue-600 group-hover:text-blue-800 transition-colors inline-flex items-center gap-1.5">
                        <i className="bi bi-printer text-blue-500 text-[11px]" />
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
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                      <i className="bi bi-building text-slate-400 text-[10px]" />
                      <span>{item.khoTen}</span>
                      <span className="md:hidden text-slate-300">•</span>
                      <span className="md:hidden font-mono">{item.ngayKiem}</span>
                    </div>
                    {/* Chi tiết kiểm kê rút gọn trên Mobile */}
                    <div className="block md:hidden mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] space-y-0.5">
                      <div className="text-slate-600">
                        Hội đồng: <b className="text-slate-800">{item.nguoiKiem}</b> ({item.thanhVien})
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 text-slate-600">
                        <span>Mặt hàng: <b className="font-mono text-slate-900">{item.tongMatHang}</b></span>
                        <span>Khớp: <b className="font-mono text-emerald-700">{item.soKhop}</b></span>
                        <span>
                          Lệch:{' '}
                          {item.lechThua + item.lechThieu > 0 ? (
                            <b className="font-mono text-rose-600">
                              {item.lechThua + item.lechThieu} ({item.giaTriLech})
                            </b>
                          ) : (
                            <b className="font-mono text-slate-500">0</b>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell py-2.5 px-3 text-center text-slate-700 text-xs font-mono whitespace-nowrap">
                    {item.ngayKiem}
                  </td>
                  <td className="hidden md:table-cell py-2.5 px-3.5 text-xs">
                    <div className="font-medium text-slate-800">{item.nguoiKiem}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]" title={item.thanhVien}>
                      {item.thanhVien}
                    </div>
                  </td>
                  <td className="hidden md:table-cell py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                    {item.tongMatHang}
                  </td>
                  <td className="hidden md:table-cell py-2.5 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                    {item.soKhop}
                  </td>
                  <td className="hidden md:table-cell py-2 px-3 text-center align-middle whitespace-nowrap bg-rose-50/20">
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

      {/* PrintPreview: BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA (Mẫu 05-VT) */}
      <PrintPreview
        isOpen={isKkPrintPreviewOpen}
        onClose={() => {
          setIsKkPrintPreviewOpen(false);
          setSelectedKkDoc(null);
          setKkPrintDetail(null);
        }}
        documentTitle="BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA"
        documentCode={selectedKkDoc?.soChungTu || kkPrintDetail?.soChungTu || "PKK-2026"}
        date={selectedKkDoc?.ngayKiem || kkPrintDetail?.ngayKiem || defaultDocDate}
        department="Bộ phận Kho vận"
        defaultPaperSize="A4"
        defaultOrientation="landscape"
      >
        {() => {
          const doc = kkPrintDetail || selectedKkDoc || {};
          const lines: any[] = kkPrintDetail?.lines || [];

          return (
            <div
              className="print-preview-container"
              style={{
                padding: "16px",
                fontFamily: "'Times New Roman', Times, serif",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                minHeight: "100%",
                boxSizing: "border-box",
                fontSize: "12px",
                lineHeight: "1.4",
              }}
            >
              {/* 1. Header công ty Seajong từ DB và Mẫu số 05-VT */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid #003087",
                  paddingBottom: "10px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <img
                    src={companyDisplay.logoUrl || "/logo.png"}
                    alt={companyDisplay.shortName || "SEAJONG"}
                    style={{
                      height: "48px",
                      maxHeight: "48px",
                      maxWidth: "115px",
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.86rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "#003087",
                        lineHeight: 1.25,
                      }}
                    >
                      {companyDisplay.name}
                    </div>
                    {companyDisplay.address && (
                      <div style={{ fontSize: "0.72rem", color: "#334155", marginTop: "2px", lineHeight: 1.3 }}>
                        Địa chỉ: {companyDisplay.address}
                      </div>
                    )}
                    <div style={{ fontSize: "0.71rem", color: "#475569", marginTop: "1px" }}>
                      MST: <strong>{companyDisplay.taxCode}</strong>
                      {companyDisplay.phone && <> • ĐT: {companyDisplay.phone}</>}
                      {companyDisplay.email && <> • Email: {companyDisplay.email}</>}
                      {companyDisplay.website && <> • Website: {companyDisplay.website}</>}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    flexShrink: 0,
                    marginLeft: "16px",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.76rem", textTransform: "uppercase", color: "#0f172a" }}>
                    Mẫu số 05 - VT
                  </div>
                  <div style={{ fontSize: "0.68rem", fontStyle: "italic", color: "#475569", marginTop: "1px" }}>
                    (Ban hành theo Thông tư 200/2014/TT-BTC)
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#003087", marginTop: "3px" }}>
                    Số: {doc.soChungTu || "PKK-2026"}
                  </div>
                </div>
              </div>

              {/* 2. Tiêu đề Biên bản kiểm kê */}
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", margin: "0 0 4px 0", color: "#003087" }}>
                  BIÊN BẢN KIỂM KÊ VẬT TƯ, CÔNG CỤ, SẢN PHẨM, HÀNG HÓA
                </h2>
                <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: "#334155" }}>
                  Thời điểm kiểm kê: 17 giờ 30 phút, ngày {doc.ngayKiem || defaultDocDate}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#334155", marginTop: "2px" }}>
                  Địa điểm kiểm kê: <strong>{doc.khoTen || "Toàn hệ thống kho"}</strong> {doc.khoDiaChi ? `(${doc.khoDiaChi})` : ""}
                </div>
              </div>

              {/* 3. Thành phần ban kiểm kê */}
              <div style={{ marginBottom: "12px", fontSize: "0.76rem", lineHeight: "1.45", backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, marginBottom: "3px" }}>Ban kiểm kê gồm:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                  <div>
                    1. Ông/Bà: <strong>{doc.nguoiKiem || "Lê Công Vụ"}</strong>
                    <div style={{ color: "#475569", fontSize: "0.7rem" }}>Chức vụ: Trưởng ban kiểm kê - Đại diện: Ban Giám đốc</div>
                  </div>
                  <div>
                    2. Ông/Bà: <strong>Nguyễn Văn Hùng</strong>
                    <div style={{ color: "#475569", fontSize: "0.7rem" }}>Chức vụ: Thủ kho trưởng - Đại diện: Bộ phận Kho vận</div>
                  </div>
                  <div>
                    3. Ông/Bà: <strong>Đặng Thị Lan</strong>
                    <div style={{ color: "#475569", fontSize: "0.7rem" }}>Chức vụ: Kế toán trưởng - Đại diện: Phòng Kế toán</div>
                  </div>
                </div>
              </div>

              {/* 4. Bảng kiểm kê chi tiết theo chuẩn Mẫu số 05 - VT */}
              {kkPrintLoading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  <i className="bi bi-arrow-repeat spin" style={{ fontSize: "1.5rem", display: "inline-block", marginRight: "8px" }} />
                  Đang nạp toàn bộ danh sách mặt hàng kiểm kê từ cơ sở dữ liệu...
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="print-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.68rem",
                      lineHeight: "1.25",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                        <th rowSpan={2} style={{ border: "1px solid #334155", padding: "4px", textAlign: "center", width: "24px" }}>STT</th>
                        <th rowSpan={2} style={{ border: "1px solid #334155", padding: "4px 6px", textAlign: "left", minWidth: "160px" }}>TÊN, QUY CÁCH VẬT TƯ, HÀNG HÓA</th>
                        <th rowSpan={2} style={{ border: "1px solid #334155", padding: "4px", textAlign: "center", width: "75px" }}>MÃ SỐ</th>
                        <th rowSpan={2} style={{ border: "1px solid #334155", padding: "4px", textAlign: "center", width: "35px" }}>ĐVT</th>
                        <th rowSpan={2} style={{ border: "1px solid #334155", padding: "4px 5px", textAlign: "right", width: "65px" }}>ĐƠN GIÁ</th>
                        <th colSpan={2} style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "center" }}>THEO SỔ SÁCH</th>
                        <th colSpan={2} style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "center" }}>THEO KIỂM KÊ</th>
                        <th colSpan={2} style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "center" }}>CHÊNH LỆCH THỪA</th>
                        <th colSpan={2} style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "center" }}>CHÊNH LỆCH THIẾU</th>
                        <th colSpan={3} style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "center" }}>PHẨM CHẤT</th>
                      </tr>
                      <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700, fontSize: "0.64rem" }}>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "40px" }}>SL</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "65px" }}>THÀNH TIỀN</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "40px" }}>SL</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "65px" }}>THÀNH TIỀN</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "35px" }}>SL</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "55px" }}>THÀNH TIỀN</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "35px" }}>SL</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", width: "55px" }}>THÀNH TIỀN</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center", width: "35px" }}>TỐT</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center", width: "35px" }}>KÉM</th>
                        <th style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center", width: "35px" }}>MẤT</th>
                      </tr>
                      <tr style={{ backgroundColor: "#e2e8f0", fontSize: "0.62rem", textAlign: "center", fontStyle: "italic" }}>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>A</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>B</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>C</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>D</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>E</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>1</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>2</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>3</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>4</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>5</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>6</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>7</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>8</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>9</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>10</td>
                        <td style={{ border: "1px solid #334155", padding: "2px" }}>11</td>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={16} style={{ border: "1px solid #334155", padding: "16px", textAlign: "center", color: "#64748b" }}>
                            Không có mặt hàng nào trong đợt kiểm kê này
                          </td>
                        </tr>
                      ) : (
                        lines.map((line, idx) => {
                          const hasExcess = (line.lechThuaQty || 0) > 0;
                          const hasShortage = (line.lechThieuQty || 0) > 0;
                          return (
                            <tr key={line.id || idx} style={{ backgroundColor: (hasExcess || hasShortage) ? "#fffbeb" : undefined }}>
                              <td style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center" }}>{idx + 1}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 5px" }}>{line.tenHang}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "center", fontFamily: "monospace", fontSize: "0.65rem" }}>{line.code}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center" }}>{line.donVi}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right" }}>{(line.donGia || 0).toLocaleString("vi-VN")}</td>
                              {/* Sổ sách */}
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right" }}>{(line.soLuongSoSach || 0).toLocaleString("vi-VN")}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right" }}>{Math.round(line.thanhTienSoSach || 0).toLocaleString("vi-VN")}</td>
                              {/* Kiểm kê */}
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", fontWeight: 600 }}>{(line.soLuongThucTe || 0).toLocaleString("vi-VN")}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", fontWeight: 600 }}>{Math.round(line.thanhTienThucTe || 0).toLocaleString("vi-VN")}</td>
                              {/* Chênh lệch Thừa */}
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", color: hasExcess ? "#047857" : undefined, fontWeight: hasExcess ? 700 : 400 }}>
                                {hasExcess ? (line.lechThuaQty || 0).toLocaleString("vi-VN") : "-"}
                              </td>
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", color: hasExcess ? "#047857" : undefined, fontWeight: hasExcess ? 700 : 400 }}>
                                {hasExcess ? Math.round(line.lechThuaTien || 0).toLocaleString("vi-VN") : "-"}
                              </td>
                              {/* Chênh lệch Thiếu */}
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", color: hasShortage ? "#b91c1c" : undefined, fontWeight: hasShortage ? 700 : 400 }}>
                                {hasShortage ? (line.lechThieuQty || 0).toLocaleString("vi-VN") : "-"}
                              </td>
                              <td style={{ border: "1px solid #334155", padding: "3px 4px", textAlign: "right", color: hasShortage ? "#b91c1c" : undefined, fontWeight: hasShortage ? 700 : 400 }}>
                                {hasShortage ? Math.round(line.lechThieuTien || 0).toLocaleString("vi-VN") : "-"}
                              </td>
                              {/* Phẩm chất */}
                              <td style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center" }}>{(line.phamChatTot || 0).toLocaleString("vi-VN")}</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center" }}>-</td>
                              <td style={{ border: "1px solid #334155", padding: "3px 2px", textAlign: "center" }}>-</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 800 }}>
                        <td colSpan={5} style={{ border: "1px solid #334155", padding: "5px 6px", textAlign: "center", textTransform: "uppercase" }}>
                          TỔNG CỘNG ({lines.length} MẶT HÀNG)
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right" }}>
                          {(doc.tongSoLuongSoSach || 0).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right" }}>
                          {Math.round(doc.tongTienSoSach || 0).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right", color: "#003087" }}>
                          {(doc.tongSoLuongThucTe || 0).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right", color: "#003087" }}>
                          {Math.round(doc.tongTienThucTe || 0).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right", color: "#047857" }}>
                          {(doc.tongLechThuaQty || 0) > 0 ? (doc.tongLechThuaQty || 0).toLocaleString("vi-VN") : "-"}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right", color: "#047857" }}>
                          {(doc.tongLechThuaTien || 0) > 0 ? Math.round(doc.tongLechThuaTien || 0).toLocaleString("vi-VN") : "-"}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right", color: "#b91c1c" }}>
                          {(doc.tongLechThieuQty || 0) > 0 ? (doc.tongLechThieuQty || 0).toLocaleString("vi-VN") : "-"}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 4px", textAlign: "right", color: "#b91c1c" }}>
                          {(doc.tongLechThieuTien || 0) > 0 ? Math.round(doc.tongLechThieuTien || 0).toLocaleString("vi-VN") : "-"}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 2px", textAlign: "center" }}>
                          {(doc.tongSoLuongThucTe || 0).toLocaleString("vi-VN")}
                        </td>
                        <td style={{ border: "1px solid #334155", padding: "5px 2px", textAlign: "center" }}>-</td>
                        <td style={{ border: "1px solid #334155", padding: "5px 2px", textAlign: "center" }}>-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* 5. Nhận xét và kết luận của ban kiểm kê */}
              <div style={{ marginTop: "14px", fontSize: "0.75rem", lineHeight: "1.5" }}>
                <div style={{ fontWeight: 700, marginBottom: "3px" }}>Ý kiến nhận xét & kiến nghị của Ban kiểm kê:</div>
                <div style={{ fontStyle: "italic", color: "#334155", paddingLeft: "8px" }}>
                  - Biên bản kiểm kê lập xong hồi 17 giờ 30 cùng ngày, đã được các thành viên trong ban kiểm kê thông qua và nhất trí ký tên.<br />
                  - Toàn bộ số liệu thực tế được lập thành 03 bản có giá trị pháp lý như nhau (lưu Ban Giám đốc, Kế toán và Thủ kho).<br />
                  - Đề nghị Phòng Kế toán phối hợp Thủ kho hạch toán điều chỉnh số liệu theo đúng chế độ quản lý tài chính hiện hành.
                </div>
              </div>

              {/* 6. Chữ ký 4 bên chuẩn Mẫu số 05 - VT */}
              <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", textAlign: "center", fontSize: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Trưởng ban kiểm kê</div>
                  <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: "45px" }} />
                  <div style={{ fontWeight: 600 }}>{doc.nguoiKiem || "Lê Công Vụ"}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Thủ kho</div>
                  <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: "45px" }} />
                  <div style={{ fontWeight: 600 }}>Nguyễn Văn Hùng</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Kế toán trưởng</div>
                  <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: "45px" }} />
                  <div style={{ fontWeight: 600 }}>Đặng Thị Lan</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, textTransform: "uppercase" }}>Giám đốc</div>
                  <div style={{ fontStyle: "italic", fontSize: "0.68rem", color: "#64748b" }}>(Ký, họ tên, đóng dấu)</div>
                  <div style={{ height: "45px" }} />
                  <div style={{ fontWeight: 600 }}>Lê Công Vụ</div>
                </div>
              </div>
            </div>
          );
        }}
      </PrintPreview>
    </div>
  );
};
