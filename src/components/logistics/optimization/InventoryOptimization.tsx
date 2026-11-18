"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Select } from "@/components/common/Select";
import { Button } from "@/components/common/Button";
import { Offcanvas } from "@/components/common/Offcanvas";
import { ReplenishmentProposalOffcanvas } from "./ReplenishmentProposalOffcanvas";
import { RopDetailOffcanvas } from "./RopDetailOffcanvas";
import { exportStandardReportExcel } from "@/utils/excelExport";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  QrCode,
  PlusCircle,
  Package,
  Search,
} from "lucide-react";

export interface InventoryOptimizationProps {
  currentStep: number;
}

interface AbcItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  outQty: number;
  totalValue: number;
  valueShare: number;
  cumulativeShare: number;
  abc: "A" | "B" | "C";
  cv: number;
  xyz: "X" | "Y" | "Z";
  matrixGroup: "AX" | "AY" | "AZ" | "BX" | "BY" | "BZ" | "CX" | "CY" | "CZ";
  slottingRecommendation: string;
  warehouseLocation: string;
  slottingInstruction?: string;
}

const getMatrixLabel = (matrixGroup: string) => {
  switch (matrixGroup) {
    case "AX":
      return "Giá trị cao • Bán đều";
    case "AY":
      return "Giá trị cao • Biến động";
    case "AZ":
      return "Giá trị cao • Ít biến động";
    case "BX":
      return "Giá trị vừa • Bán đều";
    case "BY":
      return "Giá trị vừa • Biến động";
    case "BZ":
      return "Giá trị vừa • Ít biến động";
    case "CX":
      return "Giá trị thấp • Bán đều";
    case "CY":
      return "Giá trị thấp • Biến động";
    case "CZ":
      return "Giá trị thấp • Ít biến động";
    default:
      return matrixGroup;
  }
};

const getSlottingInstruction = (item: AbcItem) => {
  if (item.slottingInstruction) {
    return item.slottingInstruction;
  }
  if (
    item.warehouseLocation &&
    !item.warehouseLocation.includes("KHO_A-") &&
    !item.warehouseLocation.includes("Kho Tổng •") &&
    !item.warehouseLocation.includes("Kho Nhà máy •") &&
    !item.warehouseLocation.includes("Kho Vật tư •")
  ) {
    return item.warehouseLocation;
  }
  const lowerName = (item.name + " " + (item.category || "")).toLowerCase();
  if (/bồn cầu|bàn cầu|bệt|lavabo|chậu|sứ/i.test(lowerName)) {
    return "Pallet trệt lối đi chính xe nâng, chèn lót mút chống va mẻ sứ";
  }
  if (/sen|vòi|củ sen|thân vòi|chia nước/i.test(lowerName)) {
    return "Bọc màng xốp chống trầy xước xi mạ, thuận tiện soạn đơn lẻ";
  }
  if (/gương|kính|led/i.test(lowerName)) {
    return "Dựng nghiêng 15 độ, khu vực khô ráo riêng biệt tránh va chạm";
  }
  if (/keo|silicon|pin|hóa chất/i.test(lowerName)) {
    return "Xếp lô cận Date ra trước để xuất FEFO, tránh nắng trực tiếp";
  }
  if (/phụ kiện|ốc|vít|gioăng|dây cấp|ren/i.test(lowerName)) {
    return "Dán nhãn mã SKU lớn, nhập sỉ theo thùng, xuất lẻ theo túi";
  }
  if (/bồn tắm|tiểu|jacuzzi|massage/i.test(lowerName)) {
    return "Lưu trữ sâu trong kho, bọc màng co PE, xuất theo đơn dự án";
  }
  if (item.matrixGroup.endsWith("X")) {
    return "Hàng bán đều chạy nhất, bố trí lối đi rộng để lấy hàng nhanh";
  }
  if (item.matrixGroup.endsWith("Z")) {
    return "Hàng dự án ít bán, nhường vị trí thuận tiện cho hàng luân chuyển";
  }
  return "Bố trí ngang tầm mắt (0.8m - 1.4m), kiểm kê định kỳ theo lô";
};

interface BatchSerialItem {
  id: string;
  batchNo: string;
  serialRange: string;
  sku: string;
  name: string;
  unit: string;
  warehouse: string;
  locationBin: string;
  qty: number;
  importDate: string;
  agingDays: number;
  expDate?: string;
  daysToExp?: number;
  strategy: "FIFO" | "FEFO";
  agingStatus: "fresh" | "standard" | "slow" | "dead" | "near_exp";
  qcStatus: "Đạt chuẩn" | "Chờ kiểm" | "Cần xử lý";
  supplierOrWorker: string;
}

interface RopItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  physicalStock: number;
  allocatedStock: number;
  availableStock: number;
  dailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  eoq: number;
  replenishmentSource: "LSX" | "PO";
  status: "critical" | "reorder" | "safe" | "excess" | "pending_approval";
  estimatedCost: number;
  hasBom?: boolean;
  bomCode?: string | null;
}

// ── BỘ DỮ LIỆU BAN ĐẦU CHUẨN DOANH NGHIỆP SEAJONG ──
const INITIAL_ABC_DATA: AbcItem[] = [
  {
    id: "abc-1",
    sku: "SJ-B101",
    name: "Bồn cầu 1 khối Seajong Platinum Men Nano chống dính",
    category: "Bàn cầu",
    unit: "Bộ",
    costPrice: 2850000,
    outQty: 420,
    totalValue: 1197000000,
    valueShare: 24.8,
    cumulativeShare: 24.8,
    abc: "A",
    cv: 0.12,
    xyz: "X",
    matrixGroup: "AX",
    slottingRecommendation: "Tầng 1-2 gần cửa xuất hàng (Fast-pick)",
    warehouseLocation: "Kho Tổng • K01-T1-O02",
  },
  {
    id: "abc-2",
    sku: "SJ-S501",
    name: "Bộ sen cây nhiệt độ mạ PVD Titanium xám bóng",
    category: "Sen vòi",
    unit: "Bộ",
    costPrice: 3450000,
    outQty: 290,
    totalValue: 1000500000,
    valueShare: 20.7,
    cumulativeShare: 45.5,
    abc: "A",
    cv: 0.28,
    xyz: "Y",
    matrixGroup: "AY",
    slottingRecommendation: "Khu vực tầm trung, lối đi chính A2",
    warehouseLocation: "Kho Tổng • K02-T2-O08",
  },
  {
    id: "abc-3",
    sku: "SJ-NR88",
    name: "Nắp bàn cầu thông minh sưởi ấm & khử mùi điện tử",
    category: "Thiết bị thông minh",
    unit: "Chiếc",
    costPrice: 4200000,
    outQty: 180,
    totalValue: 756000000,
    valueShare: 15.6,
    cumulativeShare: 61.1,
    abc: "A",
    cv: 0.35,
    xyz: "Y",
    matrixGroup: "AY",
    slottingRecommendation: "Kệ tầm trung, khu vực kiểm soát độ ẩm",
    warehouseLocation: "Kho Tổng • K03-T2-O01",
  },
  {
    id: "abc-4",
    sku: "SJ-BT99",
    name: "Bồn tắm massage góc ngọc trai Jacuzzi cao cấp",
    category: "Bồn tắm",
    unit: "Bộ",
    costPrice: 16500000,
    outQty: 35,
    totalValue: 577500000,
    valueShare: 12.0,
    cumulativeShare: 73.1,
    abc: "A",
    cv: 0.65,
    xyz: "Z",
    matrixGroup: "AZ",
    slottingRecommendation: "Khu vực cuối kho tầng 1, sản xuất theo đơn",
    warehouseLocation: "Kho Nhà máy • K08-T1-O01",
  },
  {
    id: "abc-5",
    sku: "SJ-V202",
    name: "Vòi lavabo đồng mạ Chrome 3 lớp chống bám bẩn",
    category: "Sen vòi",
    unit: "Chiếc",
    costPrice: 780000,
    outQty: 450,
    totalValue: 351000000,
    valueShare: 7.3,
    cumulativeShare: 80.4,
    abc: "B",
    cv: 0.14,
    xyz: "X",
    matrixGroup: "BX",
    slottingRecommendation: "Kệ tầng 2 lối đi trung tâm",
    warehouseLocation: "Kho Tổng • K04-T2-O05",
  },
  {
    id: "abc-6",
    sku: "SJ-G305",
    name: "Gương LED cảm ứng tràn viền chống sương mù 60x80cm",
    category: "Phụ kiện phòng tắm",
    unit: "Tấm",
    costPrice: 950000,
    outQty: 260,
    totalValue: 247000000,
    valueShare: 5.1,
    cumulativeShare: 85.5,
    abc: "B",
    cv: 0.31,
    xyz: "Y",
    matrixGroup: "BY",
    slottingRecommendation: "Kệ có xốp đệm bảo vệ góc kính",
    warehouseLocation: "Kho Tổng • K05-T3-O02",
  },
  {
    id: "abc-7",
    sku: "VAN-C35",
    name: "Lõi chia nước van Ceramic cartridge Sedal nhập khẩu",
    category: "Linh kiện lắp ráp",
    unit: "Cái",
    costPrice: 125000,
    outQty: 1800,
    totalValue: 225000000,
    valueShare: 4.7,
    cumulativeShare: 90.2,
    abc: "B",
    cv: 0.18,
    xyz: "X",
    matrixGroup: "BX",
    slottingRecommendation: "Khay linh kiện lắp ráp xưởng sản xuất",
    warehouseLocation: "Kho Vật tư • K01-T2-O04",
  },
  {
    id: "abc-8",
    sku: "SJ-T401",
    name: "Tiểu nam cảm ứng xả tự động âm tường",
    category: "Thiết bị sứ",
    unit: "Bộ",
    costPrice: 2150000,
    outQty: 85,
    totalValue: 182750000,
    valueShare: 3.8,
    cumulativeShare: 94.0,
    abc: "B",
    cv: 0.58,
    xyz: "Z",
    matrixGroup: "BZ",
    slottingRecommendation: "Kệ tầng cao lưu trữ hàng dự án",
    warehouseLocation: "Kho Nhà máy • K07-T3-O01",
  },
  {
    id: "abc-9",
    sku: "SJ-X01",
    name: "Bộ vòi xịt vệ sinh tăng áp inox 304 kèm dây xoắn",
    category: "Phụ kiện phòng tắm",
    unit: "Bộ",
    costPrice: 145000,
    outQty: 850,
    totalValue: 123250000,
    valueShare: 2.5,
    cumulativeShare: 96.5,
    abc: "C",
    cv: 0.11,
    xyz: "X",
    matrixGroup: "CX",
    slottingRecommendation: "Kệ phụ kiện rời, nhập sỉ số lượng lớn",
    warehouseLocation: "Kho Tổng • K06-T2-O09",
  },
  {
    id: "abc-10",
    sku: "SJ-D02",
    name: "Dây cấp nước inox 304 chịu nhiệt ren đồng 40cm",
    category: "Phụ kiện phòng tắm",
    unit: "Sợi",
    costPrice: 38000,
    outQty: 2200,
    totalValue: 83600000,
    valueShare: 1.7,
    cumulativeShare: 98.2,
    abc: "C",
    cv: 0.13,
    xyz: "X",
    matrixGroup: "CX",
    slottingRecommendation: "Kệ phụ kiện rời, xuất theo bao/thùng",
    warehouseLocation: "Kho Tổng • K06-T1-O04",
  },
  {
    id: "abc-11",
    sku: "KEO-SL01",
    name: "Keo silicon trung tính chống mốc chuyên dụng phòng tắm",
    category: "Vật tư phụ trợ",
    unit: "Chai",
    costPrice: 65000,
    outQty: 920,
    totalValue: 59800000,
    valueShare: 1.2,
    cumulativeShare: 99.4,
    abc: "C",
    cv: 0.25,
    xyz: "Y",
    matrixGroup: "CY",
    slottingRecommendation: "Khu vực kiểm soát nhiệt độ, quản lý FEFO",
    warehouseLocation: "Kho Vật tư • K03-T1-O01",
  },
  {
    id: "abc-12",
    sku: "OC-VIT-01",
    name: "Bộ ốc vít lở chân bồn cầu và tắc kê nở sàn inox",
    category: "Vật tư phụ trợ",
    unit: "Túi",
    costPrice: 18000,
    outQty: 1600,
    totalValue: 28800000,
    valueShare: 0.6,
    cumulativeShare: 100.0,
    abc: "C",
    cv: 0.15,
    xyz: "X",
    matrixGroup: "CX",
    slottingRecommendation: "Khay ốc vít nhỏ, kiểm kê theo cân/túi",
    warehouseLocation: "Kho Vật tư • K02-T1-O03",
  },
];

export const InventoryOptimization: React.FC<InventoryOptimizationProps> = ({ currentStep }) => {
  const [loading, setLoading] = useState<boolean>(true);

  // ── States cho Bước 1: Hai bộ lọc ABC và XYZ ──
  const [abcData, setAbcData] = useState<AbcItem[]>(INITIAL_ABC_DATA);
  const [abcSearch, setAbcSearch] = useState("");
  const [abcFilter, setAbcFilter] = useState("all");
  const [xyzFilter, setXyzFilter] = useState("all");
  const [abcPage, setAbcPage] = useState(1);
  const [abcPageSize, setAbcPageSize] = useState(10);

  // ── States cho Bước 2: Quản lý Lô/Serial ──
  const [batchData, setBatchData] = useState<BatchSerialItem[]>([]);
  const [batchSearch, setBatchSearch] = useState("");
  const [agingFilter, setAgingFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);
  const [selectedBatch, setSelectedBatch] = useState<BatchSerialItem | null>(null);
  const [isBatchDetailOpen, setIsBatchDetailOpen] = useState(false);

  // ── States cho Bước 3: ROP & Tồn an toàn ──
  const [ropData, setRopData] = useState<RopItem[]>([]);
  const [ropSearch, setRopSearch] = useState("");
  const [ropStatusFilter, setRopStatusFilter] = useState("all");
  const [ropSourceFilter, setRopSourceFilter] = useState("all");
  const [ropPage, setRopPage] = useState(1);
  const [ropPageSize, setRopPageSize] = useState(10);

  // Offcanvas lập đề xuất bù tồn (LSX hoặc PO) trình Giám đốc duyệt
  const [replenishOffcanvasOpen, setReplenishOffcanvasOpen] = useState(false);
  const [replenishOrderType, setReplenishOrderType] = useState<"LSX" | "PO" | null>(null);

  // Offcanvas xem chi tiết công thức toán & đồ thị ROP khi bấm vào hàng hoá
  const [isRopDetailOpen, setIsRopDetailOpen] = useState(false);
  const [selectedRopItem, setSelectedRopItem] = useState<RopItem | null>(null);

  const handleOpenRopDetail = (item: RopItem) => {
    setSelectedRopItem(item);
    setIsRopDetailOpen(true);
  };

  const handleReplenishSuccess = (updatedIds: string[]) => {
    setRopData((prev) =>
      prev.map((it) => (updatedIds.includes(it.id) ? { ...it, status: "pending_approval" as const } : it))
    );
  };

  // ════════════════════════════════════════════════════════════════
  // LIÊN KẾT DATABASE THỰC TẾ: LẤY DỮ LIỆU TỒN KHO TỪ HỆ THỐNG
  // ════════════════════════════════════════════════════════════════
  const fetchDataFromDb = () => {
    setLoading(true);
    fetch("/api/logistics/optimization/data")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && json.success) {
          if (Array.isArray(json.abcData) && json.abcData.length > 0) {
            setAbcData(json.abcData);
          }
          if (Array.isArray(json.batchData) && json.batchData.length > 0) {
            setBatchData(json.batchData);
          }
          if (Array.isArray(json.ropData) && json.ropData.length > 0) {
            setRopData(json.ropData);
          }
        }
      })
      .catch((err) => {
        console.warn("Lỗi tải dữ liệu DB Tối ưu tồn kho:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDataFromDb();
  }, []);

  // ════════════════════════════════════════════════════════════════
  // TÍNH TOÁN BƯỚC 1: HAI BỘ LỌC ĐỘC LẬP ABC & XYZ
  // ════════════════════════════════════════════════════════════════
  const abcFilteredList = useMemo(() => {
    return abcData.filter((item) => {
      if (abcSearch.trim()) {
        const q = abcSearch.toLowerCase();
        const mSku = item.sku.toLowerCase().includes(q);
        const mName = item.name.toLowerCase().includes(q);
        const mCat = item.category.toLowerCase().includes(q);
        if (!mSku && !mName && !mCat) return false;
      }
      if (abcFilter !== "all" && item.abc !== abcFilter) return false;
      if (xyzFilter !== "all" && item.xyz !== xyzFilter) return false;
      return true;
    });
  }, [abcData, abcSearch, abcFilter, xyzFilter]);

  const abcPagedList = useMemo(() => {
    const start = (abcPage - 1) * abcPageSize;
    return abcFilteredList.slice(start, start + abcPageSize);
  }, [abcFilteredList, abcPage, abcPageSize]);

  // Thống kê số lượng theo từng nhóm ma trận, nhóm ABC và XYZ
  const matrixCounts = useMemo(() => {
    const map: Record<string, number> = {
      AX: 0, AY: 0, AZ: 0, BX: 0, BY: 0, BZ: 0, CX: 0, CY: 0, CZ: 0,
      A: 0, B: 0, C: 0,
      X: 0, Y: 0, Z: 0,
    };
    abcData.forEach((it) => {
      map[it.matrixGroup] = (map[it.matrixGroup] || 0) + 1;
      map[it.abc] = (map[it.abc] || 0) + 1;
      map[it.xyz] = (map[it.xyz] || 0) + 1;
    });
    return map;
  }, [abcData]);

  // ════════════════════════════════════════════════════════════════
  // TÍNH TOÁN BƯỚC 2: QUẢN LÝ LÔ / SERIAL & AGING
  // ════════════════════════════════════════════════════════════════
  const batchFilteredList = useMemo(() => {
    return batchData.filter((item) => {
      if (batchSearch.trim()) {
        const q = batchSearch.toLowerCase();
        const mBatch = item.batchNo.toLowerCase().includes(q);
        const mSerial = item.serialRange.toLowerCase().includes(q);
        const mSku = item.sku.toLowerCase().includes(q);
        const mName = item.name.toLowerCase().includes(q);
        if (!mBatch && !mSerial && !mSku && !mName) return false;
      }
      if (agingFilter !== "all" && item.agingStatus !== agingFilter) return false;
      if (strategyFilter !== "all" && item.strategy !== strategyFilter) return false;
      return true;
    });
  }, [batchData, batchSearch, agingFilter, strategyFilter]);

  const batchPagedList = useMemo(() => {
    const start = (batchPage - 1) * batchPageSize;
    return batchFilteredList.slice(start, start + batchPageSize);
  }, [batchFilteredList, batchPage, batchPageSize]);

  // ════════════════════════════════════════════════════════════════
  // TÍNH TOÁN BƯỚC 3: ROP & TỒN AN TOÀN
  // ════════════════════════════════════════════════════════════════
  const ropFilteredList = useMemo(() => {
    return ropData.filter((item) => {
      if (ropSearch.trim()) {
        const q = ropSearch.toLowerCase();
        const mSku = item.sku.toLowerCase().includes(q);
        const mName = item.name.toLowerCase().includes(q);
        if (!mSku && !mName) return false;
      }
      if (ropStatusFilter !== "all" && item.status !== ropStatusFilter) return false;
      if (ropSourceFilter !== "all" && item.replenishmentSource !== ropSourceFilter) return false;
      return true;
    });
  }, [ropData, ropSearch, ropStatusFilter, ropSourceFilter]);

  const ropPagedList = useMemo(() => {
    const start = (ropPage - 1) * ropPageSize;
    return ropFilteredList.slice(start, start + ropPageSize);
  }, [ropFilteredList, ropPage, ropPageSize]);

  // Xuất Excel
  const handleExportExcel = () => {
    if (currentStep === 1) {
      exportStandardReportExcel({
        fileName: `BaoCao_PhanTich_ABC_XYZ_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "PhanTich_ABC_XYZ",
        title: "BÁO CÁO PHÂN TÍCH ABC/XYZ VÀ TỐI ƯU VỊ TRÍ KHO",
        headers: [
          [
            "STT",
            "Mã SKU",
            "Tên sản phẩm",
            "Ngành hàng",
            "ĐVT",
            "Đơn giá vốn",
            "SL xuất",
            "Giá trị xuất (VNĐ)",
            "Tỷ trọng (%)",
            "Lũy kế (%)",
            "Nhóm ABC",
            "Hệ số CV",
            "Nhóm XYZ",
            "Ma trận",
            "Gợi ý vị trí lưu kho",
          ],
        ],
        data: abcFilteredList.map((item, idx) => [
          idx + 1,
          item.sku,
          item.name,
          item.category,
          item.unit,
          item.costPrice,
          item.outQty,
          item.totalValue,
          item.valueShare,
          item.cumulativeShare,
          item.abc,
          item.cv,
          item.xyz,
          item.matrixGroup,
          item.slottingRecommendation,
        ]),
      });
      toast.success("Đã xuất báo cáo Phân tích ABC/XYZ ra tệp Excel thành công!");
    } else if (currentStep === 2) {
      exportStandardReportExcel({
        fileName: `BaoCao_QuanLy_Lo_Serial_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "QuanLy_Lo_Serial_Aging",
        title: "BÁO CÁO QUẢN LÝ LÔ, SERIAL VÀ TUỔI TỒN KHO (FIFO/FEFO)",
        headers: [
          [
            "STT",
            "Số Lô (Lot No.)",
            "Dải Serial",
            "Mã SKU",
            "Tên sản phẩm",
            "Kho bãi",
            "Tọa độ ô kệ",
            "Số lượng",
            "Ngày nhập",
            "Tuổi tồn (ngày)",
            "Hạn dùng",
            "Nguyên tắc xuất",
            "Tình trạng",
            "QC",
          ],
        ],
        data: batchFilteredList.map((b, idx) => [
          idx + 1,
          b.batchNo,
          b.serialRange,
          b.sku,
          b.name,
          b.warehouse,
          b.locationBin,
          b.qty,
          b.importDate,
          b.agingDays,
          b.expDate || "Không áp dụng",
          b.strategy,
          b.agingStatus === "dead"
            ? "Đóng băng (>180d)"
            : b.agingStatus === "near_exp"
              ? "Cận date"
              : b.agingStatus === "slow"
                ? "Chậm luân chuyển"
                : "Bình thường",
          b.qcStatus,
        ]),
      });
      toast.success("Đã xuất báo cáo Lô & Tuổi tồn kho ra tệp Excel thành công!");
    } else {
      exportStandardReportExcel({
        fileName: `BaoCao_TonKho_AnToan_ROP_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "TonKho_AnToan_ROP",
        title: "BÁO CÁO TỒN KHO AN TOÀN VÀ ĐIỂM ĐẶT HÀNG LẠI (ROP)",
        headers: [
          [
            "STT",
            "Mã SKU",
            "Tên sản phẩm",
            "Ngành hàng",
            "ĐVT",
            "Tồn vật lý",
            "Đã giữ đơn",
            "Tồn khả dụng",
            "Nhu cầu TB/ngày (D_avg)",
            "Lead time (ngày)",
            "Tồn an toàn (SS)",
            "Điểm đặt lại (ROP)",
            "SL đề xuất bù (EOQ)",
            "Nguồn bổ sung",
            "Trạng thái",
            "Chi phí dự kiến",
          ],
        ],
        data: ropFilteredList.map((r, idx) => [
          idx + 1,
          r.sku,
          r.name,
          r.category,
          r.unit,
          r.physicalStock,
          r.allocatedStock,
          r.availableStock,
          r.dailyDemand,
          r.leadTimeDays,
          r.safetyStock,
          r.reorderPoint,
          r.eoq,
          r.replenishmentSource === "LSX" ? "Lệnh sản xuất" : "Mua hàng ngoài",
          r.status === "critical"
            ? "Nguy cấp"
            : r.status === "reorder"
              ? "Chạm ngưỡng"
              : r.status === "excess"
                ? "Dư thừa"
                : "An toàn",
          r.estimatedCost,
        ]),
      });
      toast.success("Đã xuất báo cáo Tồn kho an toàn & ROP ra tệp Excel thành công!");
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden bg-slate-50">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 1: PHÂN TÍCH MA TRẬN ABC / XYZ & BỐ TRÍ KHO                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="flex flex-col h-full overflow-hidden p-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            <TableToolbar
              actionsBeforeSearch={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={abcFilter}
                    onChange={(e) => {
                      setAbcFilter(e.target.value);
                      setAbcPage(1);
                    }}
                    options={[
                      { value: "all", label: `Tất cả ABC (${abcData.length} SKU)` },
                      { value: "A", label: `Nhóm A - Giá trị cao (${matrixCounts.A} SKU)` },
                      { value: "B", label: `Nhóm B - Giá trị vừa (${matrixCounts.B} SKU)` },
                      { value: "C", label: `Nhóm C - Giá trị thấp (${matrixCounts.C} SKU)` },
                    ]}
                    className="w-52 text-xs font-semibold text-rose-900 border-rose-200 bg-rose-50/50"
                  />
                  <Select
                    value={xyzFilter}
                    onChange={(e) => {
                      setXyzFilter(e.target.value);
                      setAbcPage(1);
                    }}
                    options={[
                      { value: "all", label: `Tất cả XYZ (${abcData.length} SKU)` },
                      { value: "X", label: `Nhóm X - Bán đều (${matrixCounts.X} SKU)` },
                      { value: "Y", label: `Nhóm Y - Biến động (${matrixCounts.Y} SKU)` },
                      { value: "Z", label: `Nhóm Z - Ít biến động (${matrixCounts.Z} SKU)` },
                    ]}
                    className="w-52 text-xs font-semibold text-blue-900 border-blue-200 bg-blue-50/50"
                  />
                </div>
              }
              searchPlaceholder="Tìm mã SKU, tên sản phẩm thiết bị vệ sinh..."
              searchValue={abcSearch}
              onSearchChange={(v) => {
                setAbcSearch(v);
                setAbcPage(1);
              }}
              onExportExcel={handleExportExcel}
              onRefresh={fetchDataFromDb}
              showMenu={false}
            />

            <FullWidthTable loading={loading}>
              <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">TÊN HÀNG HÓA & PHÂN LOẠI</th>
                    <th className="py-2.5 px-3 text-right w-32">GIÁ VỐN & XUẤT</th>
                    <th className="py-2.5 px-3 text-right w-48">GIÁ TRỊ & TỶ TRỌNG</th>
                    <th className="py-2.5 px-3 text-center w-44">PHÂN HẠNG MA TRẬN</th>
                    <th className="py-2.5 px-3 w-72">HƯỚNG DẪN VỊ TRÍ SẮP XẾP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {abcPagedList.map((item, idx) => {
                    const instruction = getSlottingInstruction(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center text-xs text-slate-500 font-mono">
                          {(abcPage - 1) * abcPageSize + idx + 1}
                        </td>
                        {/* Đưa mã SKU và ĐVT vào dưới tên hàng hóa */}
                        <td className="py-2 px-3">
                          <div className="font-semibold text-xs text-slate-800 line-clamp-1">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="text-blue-700 font-bold">{item.sku}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-700 bg-slate-100 px-1 py-0.2 rounded font-sans">
                              ĐVT: {item.unit}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-sans">{item.category}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-mono">
                          <div className="text-slate-700">{item.costPrice.toLocaleString("vi-VN")} đ</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            SL: <span className="font-semibold text-slate-800">{item.outQty.toLocaleString("vi-VN")}</span> {item.unit}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-xs">
                          <div className="font-bold text-slate-900 font-mono">{item.totalValue.toLocaleString("vi-VN")} đ</div>
                          <div className="text-[11px] mt-0.5 flex items-center justify-end gap-1.5 text-slate-600">
                            <span>Tỷ trọng: <strong className="font-mono text-slate-800">{item.valueShare}%</strong></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-blue-700 font-medium">Lũy kế: <strong className="font-mono">{item.cumulativeShare}%</strong></span>
                          </div>
                        </td>
                        {/* Phân hạng hiển thị: Badge AZ ở trên, diễn giải ở dưới */}
                        <td className="py-2 px-3 text-center">
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-black shadow-xs ${item.matrixGroup.startsWith("A")
                                ? "bg-rose-600 text-white"
                                : item.matrixGroup.startsWith("B")
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-700 text-white"
                                }`}
                            >
                              {item.matrixGroup}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-600 mt-0.5 whitespace-nowrap">
                            {getMatrixLabel(item.matrixGroup)}
                          </div>
                        </td>
                        {/* Hướng dẫn sắp xếp thực tế, có nghiệp vụ căn cứ */}
                        <td className="py-2 px-3 text-xs text-slate-700">
                          <div className="flex items-center gap-1 font-semibold text-slate-800 line-clamp-1" title={item.slottingRecommendation}>
                            <Package size={13} className="text-blue-600 flex-shrink-0" />
                            <span className="truncate">{item.slottingRecommendation}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic" title={instruction}>
                            💡 {instruction}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </FullWidthTable>

            <Pagination
              currentPage={abcPage}
              totalItems={abcFilteredList.length}
              pageSize={abcPageSize}
              onPageChange={setAbcPage}
              onPageSizeChange={(newSize) => {
                setAbcPageSize(newSize);
                setAbcPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 2: QUẢN LÝ LÔ (LOT), SERIAL & TUỔI TỒN KHO (FIFO / FEFO)    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="flex flex-col h-full overflow-hidden p-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            <TableToolbar
              searchPlaceholder="Tìm số lô (Lot No), dải Serial, mã SKU sản phẩm..."
              searchValue={batchSearch}
              onSearchChange={setBatchSearch}
              onExportExcel={handleExportExcel}
              onRefresh={fetchDataFromDb}
              showMenu={false}
              actions={
                <div className="flex items-center gap-2">
                  <Select
                    value={agingFilter}
                    onChange={(e) => setAgingFilter(e.target.value)}
                    options={[
                      { value: "all", label: "Tất cả tuổi tồn" },
                      { value: "fresh", label: "Tươi mới (<30 ngày)" },
                      { value: "standard", label: "Tiêu chuẩn (30-90 ngày)" },
                      { value: "slow", label: "Chậm luân chuyển (90-180d)" },
                      { value: "dead", label: "Đóng băng (>180 ngày)" },
                      { value: "near_exp", label: "Cận hạn dùng (FEFO <60d)" },
                    ]}
                    className="w-48 text-xs"
                  />
                  <Select
                    value={strategyFilter}
                    onChange={(e) => setStrategyFilter(e.target.value)}
                    options={[
                      { value: "all", label: "Tất cả quy tắc" },
                      { value: "FIFO", label: "Xuất FIFO (Nhập trước)" },
                      { value: "FEFO", label: "Xuất FEFO (Hạn dùng trước)" },
                    ]}
                    className="w-40 text-xs"
                  />
                </div>
              }
            />

            <FullWidthTable loading={loading}>
              <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3 w-56">SỐ LÔ & DẢI SERIAL</th>
                    <th className="py-2.5 px-3">HÀNG HÓA & VỊ TRÍ KHO</th>
                    <th className="py-2.5 px-3 text-right w-28">SL TỒN</th>
                    <th className="py-2.5 px-3 text-center w-36">TUỔI TỒN & NGÀY NHẬP</th>
                    <th className="py-2.5 px-3 text-center w-40">QUY TẮC & HSD</th>
                    <th className="py-2.5 px-3 text-center w-28 min-w-[90px]">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchPagedList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-xs text-slate-500 font-mono">
                        {(batchPage - 1) * batchPageSize + idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs font-mono text-slate-900">{item.batchNo}</span>
                          {item.agingStatus === "dead" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Đóng băng
                            </span>
                          )}
                          {item.agingStatus === "near_exp" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Cận Date
                            </span>
                          )}
                          {item.agingStatus === "slow" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              Chậm xuất
                            </span>
                          )}
                          {item.agingStatus === "standard" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              Tiêu chuẩn
                            </span>
                          )}
                          {item.agingStatus === "fresh" && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Tươi mới
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-blue-700 mt-0.5 truncate" title={item.serialRange}>
                          <QrCode size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{item.serialRange}</span>
                        </div>
                      </td>
                      {/* Đưa mã SKU và ĐVT vào dưới tên hàng hóa */}
                      <td className="py-2 px-3">
                        <div className="font-semibold text-xs text-slate-800 line-clamp-1">{item.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-blue-700 font-bold font-mono">{item.sku}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 font-medium">{item.warehouse}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({item.locationBin})</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs font-bold text-slate-900">
                        {item.qty.toLocaleString()} <span className="font-normal text-slate-600 font-sans text-[11px]">{item.unit}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono ${item.agingDays > 180
                              ? "bg-rose-100 text-rose-700"
                              : item.agingDays > 90
                                ? "bg-amber-100 text-amber-800"
                                : item.agingDays < 30
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                          >
                            {item.agingDays} ngày
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">Nhập: {item.importDate}</div>
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[11px] font-black ${item.strategy === "FEFO"
                              ? "bg-teal-100 text-teal-800 border border-teal-300"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                          >
                            {item.strategy}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono mt-0.5">
                          {item.expDate ? (
                            <span className="text-rose-600 font-semibold" title={`Hạn dùng: ${item.expDate}`}>
                              {item.expDate} <span className="text-[10px] text-amber-600 font-bold">({item.daysToExp}d)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">Không Date</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBatch(item);
                            setIsBatchDetailOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center justify-center gap-1 border border-blue-200 whitespace-nowrap"
                        >
                          <Search size={12} className="flex-shrink-0" />
                          <span>Truy vết</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>

            <Pagination
              currentPage={batchPage}
              totalItems={batchFilteredList.length}
              pageSize={batchPageSize}
              onPageChange={setBatchPage}
              onPageSizeChange={(newSize) => {
                setBatchPageSize(newSize);
                setBatchPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* BƯỚC 3: TỒN KHO AN TOÀN & ĐIỂM ĐẶT HÀNG LẠI (ROP)               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="flex flex-col h-full overflow-hidden p-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            <TableToolbar
              searchPlaceholder="Tìm mã SKU, tên hàng hoá thiết bị..."
              searchValue={ropSearch}
              onSearchChange={setRopSearch}
              onExportExcel={handleExportExcel}
              onRefresh={fetchDataFromDb}
              showMenu={false}
              actions={
                <div className="flex items-center gap-2">
                  <Select
                    value={ropStatusFilter}
                    onChange={(e) => setRopStatusFilter(e.target.value)}
                    options={[
                      { value: "all", label: "Tất cả trạng thái" },
                      { value: "critical", label: "Nguy cấp" },
                      { value: "reorder", label: "Chạm ngưỡng" },
                      { value: "pending_approval", label: "Chờ GĐ duyệt" },
                      { value: "safe", label: "An toàn" },
                      { value: "excess", label: "Dư thừa" },
                    ]}
                    className="w-44 text-xs font-semibold"
                  />
                  <Select
                    value={ropSourceFilter}
                    onChange={(e) => {
                      setRopSourceFilter(e.target.value);
                      setRopPage(1);
                    }}
                    options={[
                      { value: "all", label: "Tất cả nguồn cấp" },
                      { value: "LSX", label: "Sản xuất và lắp ráp" },
                      { value: "PO", label: "Mua ngoài nhập khẩu" },
                    ]}
                    className="w-48 text-xs font-semibold text-blue-900 border-blue-200 bg-blue-50/50"
                  />

                  {/* Nút Tạo lệnh sản xuất & Tạo yêu cầu mua hàng chuẩn Component toàn dự án */}
                  {(ropSourceFilter === "all" || ropSourceFilter === "LSX") && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<PlusCircle size={14} />}
                      onClick={() => {
                        setReplenishOrderType("LSX");
                        setReplenishOffcanvasOpen(true);
                      }}
                      title="Lập Lệnh sản xuất cho các mặt hàng có đính kèm mã định mức BOM đang chạm ngưỡng ROP"
                    >
                      Tạo lệnh sản xuất
                    </Button>
                  )}
                  {(ropSourceFilter === "all" || ropSourceFilter === "PO") && (
                    <Button
                      variant="success"
                      size="sm"
                      icon={<PlusCircle size={14} />}
                      onClick={() => {
                        setReplenishOrderType("PO");
                        setReplenishOffcanvasOpen(true);
                      }}
                      title="Lập Yêu cầu mua hàng cho các mặt hàng không có định mức đang chạm ngưỡng ROP"
                    >
                      Tạo yêu cầu mua hàng
                    </Button>
                  )}
                </div>
              }
            />

            <FullWidthTable loading={loading}>
              <table className="w-full text-left border-collapse logistics-overview-compact-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">TÊN SẢN PHẨM & PHÂN LOẠI</th>
                    <th className="py-2.5 px-3 text-right w-36">TỒN THỰC & KHẢ DỤNG</th>
                    <th className="py-2.5 px-3 text-right w-36">NHU CẦU & LEAD TIME</th>
                    <th className="py-2.5 px-3 text-right w-36">ROP & TỒN AN TOÀN</th>
                    <th className="py-2.5 px-3 text-right w-32">ĐỀ XUẤT BÙ (EOQ)</th>
                    <th className="py-2.5 px-3 text-center w-36">TRẠNG THÁI TỒN KHO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ropPagedList.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenRopDetail(item)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                      title="Nhấn để xem chi tiết công thức tính ROP, Safety Stock & Đồ thị mức tồn kho"
                    >
                      <td className="py-2 px-3 text-center text-xs text-slate-500 font-mono">
                        {(ropPage - 1) * ropPageSize + idx + 1}
                      </td>
                      {/* Đưa mã SKU, ĐVT và nhãn định mức vào dưới tên hàng hóa */}
                      <td className="py-2 px-3" onClick={() => handleOpenRopDetail(item)}>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="font-semibold text-xs text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">
                            {item.name}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRopDetail(item);
                            }}
                            className="text-[10px] text-blue-600 hover:text-white hover:bg-blue-600 font-medium whitespace-nowrap bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 transition-colors flex-shrink-0"
                            title="Nhấn để xem chi tiết công thức toán học & đồ thị ROP"
                          >
                            Chi tiết ROP
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-blue-700 font-bold">{item.sku}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 bg-slate-100 px-1 py-0.2 rounded font-sans">
                            ĐVT: {item.unit}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-sans">{item.category}</span>
                          {item.hasBom ? (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.2 rounded text-[10px] font-mono font-bold" title={`Mã định mức BOM: ${item.bomCode || 'BOM'}`}>
                                BOM: {item.bomCode || "Định mức"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[10px] font-sans">
                                Mua ngoài
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-mono" onClick={() => handleOpenRopDetail(item)}>
                        <div>
                          Khả dụng: <span className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded">{item.availableStock.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tồn kho: {item.physicalStock.toLocaleString()} {item.allocatedStock > 0 && <span className="text-amber-600 font-semibold">(Giữ {item.allocatedStock})</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-mono" onClick={() => handleOpenRopDetail(item)}>
                        <div className="text-slate-800 font-medium">
                          {item.dailyDemand} <span className="text-[11px] font-sans text-slate-500">{item.unit}/ngày</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Lead time: <span className="font-semibold text-slate-700">{item.leadTimeDays} ngày</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-mono" onClick={() => handleOpenRopDetail(item)}>
                        <div>
                          ROP: <span className="font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">{item.reorderPoint}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tồn an toàn (SS): <span className="font-semibold text-indigo-600">{item.safetyStock}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-mono" onClick={() => handleOpenRopDetail(item)}>
                        <div className="font-bold text-emerald-600">
                          +{item.eoq.toLocaleString()} <span className="font-normal text-slate-500 font-sans text-[11px]">{item.unit}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                          {item.replenishmentSource === "LSX" ? (
                            <span className="text-blue-700 font-semibold">SX & lắp ráp</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Mua ngoài</span>
                          )}
                        </div>
                      </td>
                      {/* Bỏ nút bấm trong bảng, chỉ hiển thị trạng thái tồn kho */}
                      <td className="py-2 px-3 text-center" onClick={() => handleOpenRopDetail(item)}>
                        {item.status === "critical" && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            Nguy cấp
                          </span>
                        )}
                        {item.status === "reorder" && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Chạm ngưỡng
                          </span>
                        )}
                        {item.status === "pending_approval" && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
                            Chờ GĐ duyệt
                          </span>
                        )}
                        {item.status === "safe" && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            An toàn
                          </span>
                        )}
                        {item.status === "excess" && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700">
                            Dư thừa
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>

            <Pagination
              currentPage={ropPage}
              totalItems={ropFilteredList.length}
              pageSize={ropPageSize}
              onPageChange={setRopPage}
              onPageSizeChange={(newSize) => {
                setRopPageSize(newSize);
                setRopPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ── OFFCANVAS CHI TIẾT LÔ / SERIAL (Rộng đúng 400px theo AGENTS.md) ── */}
      <Offcanvas
        isOpen={isBatchDetailOpen}
        onClose={() => setIsBatchDetailOpen(false)}
        title="Truy vết Lô & Serial"
        width="400px"
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <button
              onClick={() => setIsBatchDetailOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedBatch && (
          <div className="space-y-4 text-xs">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
              <div className="text-[11px] text-blue-600 font-semibold">SỐ LÔ SẢN XUẤT / NHẬP KHẨU</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {selectedBatch.batchNo}
              </div>
              <div className="text-xs text-blue-800 font-mono mt-1">
                Dải Serial: {selectedBatch.serialRange}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Mã SKU:</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedBatch.sku}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Tên sản phẩm:</span>
                <span className="font-medium text-slate-800 text-right max-w-[200px]">
                  {selectedBatch.name}
                </span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Số lượng tồn:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedBatch.qty} {selectedBatch.unit}
                </span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Kho lưu trữ:</span>
                <span className="font-medium text-slate-800">{selectedBatch.warehouse}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Tọa độ ô kệ:</span>
                <span className="font-bold text-blue-700 font-mono">{selectedBatch.locationBin}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Ngày nhập xưởng:</span>
                <span className="font-mono text-slate-800">{selectedBatch.importDate}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Tuổi tồn kho:</span>
                <span className="font-bold font-mono text-rose-600">{selectedBatch.agingDays} ngày</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Quy tắc xuất kho:</span>
                <span className="font-bold text-teal-700">{selectedBatch.strategy}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Nguồn gốc/Thợ QC:</span>
                <span className="text-slate-800">{selectedBatch.supplierOrWorker}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-slate-500">Kiểm định chất lượng:</span>
                <span className="font-bold text-emerald-600">{selectedBatch.qcStatus}</span>
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS LẬP ĐỀ XUẤT BÙ TỒN (LSX / PO) TRÌNH GIÁM ĐỐC DUYỆT (Rộng đúng 400px theo AGENTS.md) ── */}
      <ReplenishmentProposalOffcanvas
        isOpen={replenishOffcanvasOpen}
        onClose={() => {
          setReplenishOffcanvasOpen(false);
          setReplenishOrderType(null);
        }}
        orderType={replenishOrderType}
        items={ropData}
        onSuccess={handleReplenishSuccess}
      />

      {/* ── OFFCANVAS CHI TIẾT TỒN KHO AN TOÀN & ĐIỂM ĐẶT HÀNG LẠI (ROP) (Rộng đúng 400px theo AGENTS.md) ── */}
      <RopDetailOffcanvas
        isOpen={isRopDetailOpen}
        onClose={() => {
          setIsRopDetailOpen(false);
          setSelectedRopItem(null);
        }}
        selectedItem={selectedRopItem}
      />
    </div>
  );
};

export default InventoryOptimization;
