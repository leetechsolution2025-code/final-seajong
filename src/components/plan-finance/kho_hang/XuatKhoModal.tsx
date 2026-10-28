"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { isLogisticsAdmin } from "@/lib/logistics-permissions";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhieuXuatKhoPreview } from "./PhieuXuatKhoPreview";

import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";
import { LichSuXuatKhoOffcanvas } from "./LichSuXuatKhoOffcanvas";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse { id: string; code: string | null; name: string; isActive: boolean; }
interface ItemSuggestion { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number; soLuongTon?: number; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null; }
interface SaleOrderOption {
  id: string; code: string | null;
  type: "contract" | "sale-order" | "retail-invoice";
  typeLabel: string;
  customer: string | null;
  tongTien: number;
  trangThai: string;
}
interface WorkOrderOption { id: string; code: string | null; tenLenhSX?: string | null; }
interface DefectOption {
  id: string;
  code: string;
  productName: string;
  productCode: string;
  customerName?: string | null;
  status: string;
  logisticsTickets?: Array<{
    id: string;
    code: string;
    type: string;
    status: string;
    items?: Array<{
      id: string;
      requestedQty: number;
      pickedQty: number;
      inventoryItemId: string;
      inventoryItem?: {
        id: string;
        code: string | null;
        tenHang: string;
        donVi: string | null;
        giaNhap: number;
        soLuongTon?: number;
        viTriHang?: string | null;
        viTriCot?: string | null;
        viTriTang?: string | null;
      } | null;
    }>;
  }>;
}

interface StockLine {
  id: string;
  item: ItemSuggestion | null;
  itemSearch: string;
  suggestions: ItemSuggestion[];
  showSugg: boolean;
  soLuongYC: number;   // yêu cầu / chứng từ
  soLuong: number;   // thực xuất
  soLuongTon?: number;   // tồn kho tại kho xuất (lấy từ search API)
  donGia: number;
  viTriHang: string;
  viTriCot: string;
  viTriTang: string;
  ghiChu: string;
  error?: string;
}

interface XuatKhoModalProps {
  onClose: () => void;
  onSaved: () => void;
  initialMode?: "manual" | "so" | "wo" | "defect";
  initialSoId?: string;
  initialWoId?: string;
  initialDefectId?: string;
  initialTicketId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
const emptyLine = (): StockLine => ({
  id: uid(), item: null, itemSearch: "", suggestions: [], showSugg: false,
  soLuongYC: 1, soLuong: 1, donGia: 0,
  viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
});

function genSoPhieu() { return genDocCode("PX"); }

const CSS: Record<string, React.CSSProperties> = {
  input: {
    width: "100%", padding: "8px 11px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  },
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 },
};

const GRID = "28px 1fr 60px 80px 80px 60px 60px 60px 110px 110px 32px";

// ── Main Component ─────────────────────────────────────────────────────────────
export function XuatKhoModal({ onClose, onSaved, initialMode, initialSoId, initialWoId, initialDefectId, initialTicketId }: XuatKhoModalProps) {
  const { data: session } = useSession();
  const isThuKho = isLogisticsAdmin(session?.user);
  const toast = useToast();

  const [mode, setMode] = React.useState<"manual" | "so" | "wo" | "defect">(initialMode || "manual");
  const [fromWarehouseId, setFromWarehouseId] = React.useState<string>("");
  const [suggestedWarehouseType, setSuggestedWarehouseType] = React.useState<"vat-tu" | "hang-hoa" | null>(null);
  const [soChungTu, setSoChungTu] = React.useState(() => {
    const d = new Date();
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `PXH-${yyyymmdd}-001`;
  });
  const [ngayXuat, setNgayXuat] = React.useState(new Date().toISOString().slice(0, 10));
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [lockDate, setLockDate] = React.useState(true);
  const [lyDo, setLyDo] = React.useState("Xuất kho hàng hoá");
  const [loaiXuatKho, setLoaiXuatKho] = React.useState("Xuất bán hàng");
  const [ghiChu, setGhiChu] = React.useState("");
  const [nguoiThucHien, setNguoiThucHien] = React.useState("");

  React.useEffect(() => {
    if (session?.user?.name && !nguoiThucHien) {
      setNguoiThucHien(session.user.name);
    }
  }, [session, nguoiThucHien]);
  const [lines, setLines] = React.useState<StockLine[]>([emptyLine()]);
  const [saving, setSaving] = React.useState(false);
  const [saveWithPrint, setSaveWithPrint] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showLichSu, setShowLichSu] = React.useState(false);
  const [insufficientItems, setInsufficient] = React.useState<{ inventoryItemId: string; tenHang: string; soLuong: number; soLuongTon: number }[]>([]);
  const [allowExportShortage, setAllowExportShortage] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false); // Toggles mobile accordion

  // SO / WO / Defect
  const [saleOrders, setSaleOrders] = React.useState<SaleOrderOption[]>([]);
  const [selectedSo, setSelectedSo] = React.useState<SaleOrderOption | null>(null);
  const [workOrders, setWorkOrders] = React.useState<WorkOrderOption[]>([]);
  const [selectedWo, setSelectedWo] = React.useState<WorkOrderOption | null>(null);
  const [defects, setDefects] = React.useState<DefectOption[]>([]);
  const [selectedDefect, setSelectedDefect] = React.useState<DefectOption | null>(null);
  const [currentTicketId, setCurrentTicketId] = React.useState<string | undefined>(initialTicketId);
  const [listLoading, setListLoading] = React.useState(false);

  // Fetch warehouses
  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses").then(r => r.json())
      .then((d: Warehouse[]) => {
        const active = Array.isArray(d) ? d.filter(w => w.isActive) : [];
        setWarehouses(active);
        if (active.length === 1) setFromWarehouseId(active[0].id);
      }).catch(() => { });

    fetch("/api/plan-finance/stock-movements/next-code?type=xuat")
      .then((r) => r.json())
      .then((d) => {
        if (d.nextCode) setSoChungTu(d.nextCode);
      })
      .catch(() => { });
  }, []);

  // Tự động chọn kho theo mode hoặc theo cấu trúc hàng hoá của đơn
  React.useEffect(() => {
    if (warehouses.length === 0) return;

    if (suggestedWarehouseType === "vat-tu") {
      const kvp = warehouses.find(w => w.code === "KVP" || w.name.toLowerCase().includes("vật tư"));
      if (kvp) setFromWarehouseId(kvp.id);
    } else if (suggestedWarehouseType === "hang-hoa") {
      const khoChinh = warehouses.find(w => w.code === "KHO-CHINH" || w.name.toLowerCase().includes("kho hàng hoá"));
      if (khoChinh) setFromWarehouseId(khoChinh.id);
    } else {
      if (mode === "so") {
        const khoChinh = warehouses.find(w => w.code === "KHO-CHINH" || w.name.toLowerCase().includes("kho hàng hoá"));
        if (khoChinh) setFromWarehouseId(khoChinh.id);
      } else if (mode === "wo" || mode === "defect") {
        const kvp = warehouses.find(w => w.code === "KVP" || w.name.toLowerCase().includes("vật tư"));
        if (kvp) setFromWarehouseId(kvp.id);
      }
    }
  }, [mode, warehouses, suggestedWarehouseType]);

  // Fetch danh sách đơn bán hàng khi chuyển sang mode "so"
  React.useEffect(() => {
    if (mode !== "so") return;
    setListLoading(true); setSelectedSo(null);
    const url = "/api/plan-finance/sales-active" + (initialSoId ? `?includeId=${initialSoId}` : "");
    fetch(url)
      .then(r => r.json())
      .then(d => setSaleOrders(Array.isArray(d) ? d : []))
      .catch(() => setSaleOrders([]))
      .finally(() => setListLoading(false));
  }, [mode, initialSoId]);

  // Fetch danh sách lệnh sản xuất khi chuyển sang mode "wo"
  React.useEffect(() => {
    if (mode !== "wo") return;
    setListLoading(true); setSelectedWo(null);
    const url = "/api/production/dashboard/recent-orders" + (initialWoId ? `?includeId=${initialWoId}` : "");
    fetch(url)
      .then(r => r.json())
      .then((d: any[]) => {
        if (Array.isArray(d)) {
          setWorkOrders(d.map(o => ({ id: o.id, code: o.id, tenLenhSX: o.name })));
        } else {
          setWorkOrders([]);
        }
      })
      .catch(() => setWorkOrders([]))
      .finally(() => setListLoading(false));
  }, [mode, initialWoId]);

  // Fetch danh sách hồ sơ lỗi khi chuyển sang mode "defect"
  React.useEffect(() => {
    if (mode !== "defect") return;
    setListLoading(true); setSelectedDefect(null);
    fetch("/api/production/defects")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) {
          setDefects([]);
          return;
        }
        // Lọc các hồ sơ lỗi chưa được xuất kho
        const unexported = data.filter((d: any) => {
          if (initialDefectId && (d.id === initialDefectId || d.code === initialDefectId)) {
            return true;
          }
          const tickets = d.logisticsTickets || [];
          if (tickets.length > 0) {
            return tickets.some((t: any) => t.status !== "COMPLETED");
          }
          return !["COMPLETED", "RESOLVED", "CLOSED", "HUY"].includes(d.status);
        });
        setDefects(unexported);
      })
      .catch(() => setDefects([]))
      .finally(() => setListLoading(false));
  }, [mode, initialDefectId]);

  const hasAutoSelected = React.useRef<Record<string, boolean>>({});
  React.useEffect(() => {
    if (mode === "so" && initialSoId && saleOrders.length > 0 && !hasAutoSelected.current["so"]) {
      hasAutoSelected.current["so"] = true;
      onSelectSo(initialSoId);
    }
  }, [mode, initialSoId, saleOrders]);

  React.useEffect(() => {
    if (mode === "wo" && initialWoId && workOrders.length > 0 && !hasAutoSelected.current["wo"]) {
      hasAutoSelected.current["wo"] = true;
      onSelectWo(initialWoId);
    }
  }, [mode, initialWoId, workOrders]);

  React.useEffect(() => {
    if (mode === "defect" && initialDefectId && defects.length > 0 && !hasAutoSelected.current["defect"]) {
      hasAutoSelected.current["defect"] = true;
      onSelectDefect(initialDefectId);
    }
  }, [mode, initialDefectId, defects]);

  const onSelectSo = (id: string) => {
    if (!id) { setSelectedSo(null); setLines([emptyLine()]); return; }
    const so = saleOrders.find(s => s.id === id) ?? null;
    setSelectedSo(so);
    if (so) {
      const prefix = so.typeLabel ?? "Đơn bán hàng";
      setLyDo(`Xuất hàng theo ${prefix.toLowerCase()} ${so.code ?? so.id}`);
      loadItemsFromOrder(so);
    }
  };

  // Auto-load items từ đơn/hợp đồng/hoá đơn vào danh sách xuất
  const loadItemsFromOrder = async (so: SaleOrderOption) => {
    try {
      let rawLines: { tenHang: string; donVi: string | null; soLuong: number; donGia: number; inventoryItemId: string | null }[] = [];

      if (so.type === "contract") {
        // Contract → lấy qua quotation.items
        const res = await fetch(`/api/plan-finance/contracts/${so.id}`);
        if (!res.ok) return;
        const detail = await res.json();
        rawLines = (detail.quotation?.items ?? []).map((it: { tenHang: string; donVi: string | null; soLuong: number; donGia: number }) => ({
          tenHang: it.tenHang,
          donVi: it.donVi,
          soLuong: it.soLuong,
          donGia: it.donGia,
          inventoryItemId: null,
        }));
      } else if (so.type === "retail-invoice") {
        // Hoá đơn bán lẻ → lấy items trực tiếp
        const res = await fetch(`/api/plan-finance/retail-invoices/${so.id}`);
        if (!res.ok) return;
        const detail = await res.json();
        rawLines = (detail.items ?? []).map((it: { tenHang: string; dvt: string | null; soLuong: number; donGia: number; inventoryItemId: string | null; inventoryItem?: { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number } | null }) => ({
          tenHang: it.tenHang,
          donVi: it.dvt,
          soLuong: it.soLuong,
          donGia: it.donGia,
          inventoryItemId: it.inventoryItemId,
          inventoryItem: it.inventoryItem ?? null,
        }));
      } else if (so.type === "sale-order") {
        // Đơn bán hàng
        const res = await fetch(`/api/plan-finance/sales/${so.id}`);
        if (!res.ok) return;
        const detail = await res.json();

        // Tự động tìm và gán ticketId nếu đơn có logisticsTickets
        if (detail.logisticsTickets && Array.isArray(detail.logisticsTickets) && detail.logisticsTickets.length > 0) {
          const targetTicket = detail.logisticsTickets.find((t: any) => t.status !== "COMPLETED") || detail.logisticsTickets[0];
          if (targetTicket) {
            setCurrentTicketId(targetTicket.id);
          }
        }

        rawLines = (detail.saleOrderItems ?? []).map((it: { tenHang: string; donGia: number; soLuong: number; inventoryItemId: string | null; inventoryItem?: { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number } | null }) => ({
          tenHang: it.tenHang,
          donVi: null, // we don't have unit directly on SaleOrderItem, wait: inventoryItem has it?
          soLuong: it.soLuong,
          donGia: it.donGia,
          inventoryItemId: it.inventoryItemId || it.inventoryItem?.id || null,
          inventoryItem: it.inventoryItem ?? null,
        }));
      }

      if (rawLines.length === 0) {
        setLines([emptyLine()]);
        return;
      }

      // Đánh giá xem đơn hàng chủ yếu là Vật tư hay Hàng hoá để auto-switch kho
      if (so.type === "sale-order") {
        let vatTuCount = 0;
        let hangHoaCount = 0;
        rawLines.forEach((r: any) => {
          if (r.inventoryItem?.loai === "vat-tu") vatTuCount++;
          else hangHoaCount++;
        });

        if (vatTuCount > 0 && vatTuCount >= hangHoaCount) {
          setSuggestedWarehouseType("vat-tu");
        } else if (hangHoaCount > 0) {
          setSuggestedWarehouseType("hang-hoa");
        }
      }

      // Map thành StockLine, rồi nếu có inventoryItem → tìm tồn kho theo kho đã chọn
      const newLines: StockLine[] = rawLines.map(raw => {
        const l = emptyLine();
        l.itemSearch = raw.tenHang;
        l.soLuongYC = raw.soLuong;
        l.soLuong = raw.soLuong;
        l.donGia = raw.donGia;
        return l;
      });

      setLines(newLines);

      // Fetch tồn kho song song cho các items có tên
      if (fromWarehouseId) {
        rawLines.forEach((raw, idx) => {
          if (!raw.tenHang) return;
          const warehouseParam = `&warehouseId=${fromWarehouseId}`;
          fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(raw.tenHang)}&limit=5${warehouseParam}`)
            .then(r => r.json())
            .then((data: { id: string; tenHang: string; soLuongTon?: number; giaNhap: number; donVi: string | null; code: string | null; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null }[]) => {
              if (!Array.isArray(data) || !data.length) return;
              // Match tốt nhất theo tên
              const found = data.find(d => d.tenHang.toLowerCase() === raw.tenHang.toLowerCase()) ?? data[0];
              setLines(prev => prev.map((l, i) => {
                if (i !== idx) return l;
                return {
                  ...l,
                  item: {
                    id: found.id, code: found.code, tenHang: found.tenHang,
                    donVi: found.donVi, giaNhap: found.giaNhap,
                    soLuongTon: found.soLuongTon,
                    viTriHang: found.viTriHang, viTriCot: found.viTriCot, viTriTang: found.viTriTang,
                  },
                  itemSearch: found.tenHang,
                  soLuongTon: found.soLuongTon,
                  viTriHang: found.viTriHang ?? "",
                  viTriCot: found.viTriCot ?? "",
                  viTriTang: found.viTriTang ?? "",
                };
              }));
            })
            .catch(() => { });
        });
      }
    } catch { /* ignore */ }
  };

  // Auto-fill khi pick WO
  const onSelectWo = (id: string) => {
    if (!id) { setSelectedWo(null); setLines([emptyLine()]); return; }
    const wo = workOrders.find(w => w.id === id) ?? null;
    setSelectedWo(wo);
    if (wo) {
      setLyDo(`Xuất nguyên vật liệu theo lệnh sản xuất ${wo.code ?? wo.id}`);
      loadItemsFromWorkOrder(wo);
    }
  };

  const loadItemsFromWorkOrder = async (wo: WorkOrderOption) => {
    try {
      const res = await fetch(`/api/production/orders/${wo.id}`);
      if (!res.ok) return;
      const data = await res.json();

      if (!data.materials || data.materials.length === 0) {
        setLines([emptyLine()]);
        return;
      }

      const rawLines = data.materials.map((mat: any) => ({
        tenHang: mat.tenVatTu,
        soLuong: mat.soLuong,
        donGia: mat.donGia,
      }));

      const newLines: StockLine[] = rawLines.map((raw: any) => {
        const l = emptyLine();
        l.itemSearch = raw.tenHang;
        l.soLuongYC = raw.soLuong;
        l.soLuong = raw.soLuong;
        l.donGia = raw.donGia || 0;
        return l;
      });

      setLines(newLines);

      let currentWhId: string | undefined = fromWarehouseId;
      if (!currentWhId) {
        let whList = warehouses;
        if (whList.length === 0) {
          try {
            const r = await fetch("/api/plan-finance/warehouses");
            const d = await r.json();
            if (Array.isArray(d)) whList = d;
          } catch (e) { /* ignore */ }
        }
        currentWhId = whList.find((w: any) => w.code === "KVP" || w.name.toLowerCase().includes("vật tư"))?.id;
      }

      if (currentWhId) {
        rawLines.forEach((raw: any, idx: number) => {
          if (!raw.tenHang) return;
          const warehouseParam = `&warehouseId=${currentWhId}`;
          fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(raw.tenHang)}&limit=5${warehouseParam}`)
            .then(r => r.json())
            .then((searchData) => {
              if (!Array.isArray(searchData) || !searchData.length) return;
              const found = searchData.find(d => d.tenHang.toLowerCase() === raw.tenHang.toLowerCase()) ?? searchData[0];
              setLines(prev => prev.map((l, i) => {
                if (i !== idx) return l;
                return {
                  ...l,
                  item: {
                    id: found.id, code: found.code, tenHang: found.tenHang,
                    donVi: found.donVi, giaNhap: found.giaNhap,
                  },
                  itemSearch: found.tenHang,
                  donGia: found.giaNhap || raw.donGia || 0,
                  viTriHang: found.viTriHang ?? "",
                  viTriCot: found.viTriCot ?? "",
                  viTriTang: found.viTriTang ?? "",
                  soLuongTon: found.soLuongTon ?? 0,
                };
              }));
            }).catch(() => { });
        });
      }
    } catch { /* ignore */ }
  };

  const onSelectDefect = (id: string) => {
    if (!id) {
      setSelectedDefect(null);
      setCurrentTicketId(undefined);
      setLines([emptyLine()]);
      return;
    }
    const def = defects.find(d => d.id === id || d.code === id) ?? null;
    setSelectedDefect(def);
    if (def) {
      setLyDo(`Cấp phát linh kiện thay thế theo hồ sơ lỗi ${def.code}`);
      setLoaiXuatKho("Cấp phát linh kiện thay thế");
      loadItemsFromDefect(def);
    }
  };

  const loadItemsFromDefect = async (def: DefectOption) => {
    try {
      const tickets = def.logisticsTickets || [];
      const targetTicket = (initialTicketId ? tickets.find(t => t.id === initialTicketId) : null)
        || tickets.find(t => t.status !== "COMPLETED")
        || tickets.find(t => t.type === "WARRANTY_MATERIAL")
        || tickets[0];

      setCurrentTicketId(targetTicket?.id || initialTicketId);

      const ticketItems = targetTicket?.items || [];
      if (ticketItems.length === 0) {
        setLines([emptyLine()]);
        return;
      }

      const rawLines = ticketItems.map(it => {
        const inv = it.inventoryItem;
        const qty = it.pickedQty > 0 ? it.pickedQty : (it.requestedQty || 1);
        return {
          inventoryItemId: it.inventoryItemId,
          code: inv?.code || null,
          tenHang: inv?.tenHang || "Vật tư",
          donVi: inv?.donVi || "cái",
          soLuong: qty,
          soLuongYC: it.requestedQty || qty,
          giaNhap: inv?.giaNhap || 0,
          soLuongTon: inv?.soLuongTon,
          viTriHang: inv?.viTriHang || "",
          viTriCot: inv?.viTriCot || "",
          viTriTang: inv?.viTriTang || "",
        };
      });

      const newLines: StockLine[] = rawLines.map(raw => {
        const l = emptyLine();
        l.item = {
          id: raw.inventoryItemId,
          code: raw.code,
          tenHang: raw.tenHang,
          donVi: raw.donVi,
          giaNhap: raw.giaNhap,
          soLuongTon: raw.soLuongTon,
          viTriHang: raw.viTriHang,
          viTriCot: raw.viTriCot,
          viTriTang: raw.viTriTang,
        };
        l.itemSearch = raw.tenHang;
        l.soLuongYC = raw.soLuongYC;
        l.soLuong = raw.soLuong;
        l.donGia = raw.giaNhap;
        l.viTriHang = raw.viTriHang;
        l.viTriCot = raw.viTriCot;
        l.viTriTang = raw.viTriTang;
        return l;
      });

      setLines(newLines);

      let currentWhId: string | undefined = fromWarehouseId;
      if (!currentWhId) {
        let whList = warehouses;
        if (whList.length === 0) {
          try {
            const r = await fetch("/api/plan-finance/warehouses");
            const d = await r.json();
            if (Array.isArray(d)) whList = d;
          } catch (e) { /* ignore */ }
        }
        currentWhId = whList.find((w: any) => w.code === "KVP" || w.name.toLowerCase().includes("vật tư"))?.id;
        if (currentWhId) setFromWarehouseId(currentWhId);
      }

      if (currentWhId) {
        rawLines.forEach((raw, idx) => {
          if (!raw.tenHang && !raw.code) return;
          const warehouseParam = `&warehouseId=${currentWhId}`;
          const searchKey = raw.code || raw.tenHang;
          fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(searchKey)}&limit=5${warehouseParam}`)
            .then(r => r.json())
            .then((searchData) => {
              if (!Array.isArray(searchData) || !searchData.length) return;
              const found = searchData.find((d: any) => d.id === raw.inventoryItemId || d.code === raw.code || d.tenHang.toLowerCase() === raw.tenHang.toLowerCase()) ?? searchData[0];
              setLines(prev => prev.map((l, i) => {
                if (i !== idx) return l;
                return {
                  ...l,
                  item: {
                    id: found.id, code: found.code, tenHang: found.tenHang,
                    donVi: found.donVi, giaNhap: found.giaNhap,
                  },
                  itemSearch: found.tenHang,
                  donGia: found.giaNhap || raw.giaNhap || 0,
                  viTriHang: found.viTriHang ?? l.viTriHang,
                  viTriCot: found.viTriCot ?? l.viTriCot,
                  viTriTang: found.viTriTang ?? l.viTriTang,
                  soLuongTon: found.soLuongTon ?? 0,
                };
              }));
            }).catch(() => { });
        });
      }
    } catch { /* ignore */ }
  };

  // ESC close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !showPreview) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, showPreview]);

  // ── Item search — debounce 250ms ────────────────────────────────────────────
  const searchTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onItemSearch = (lineId: string, q: string) => {
    if (!q.trim()) {
      setLines(ls => ls.map(l => l.id === lineId ? {
        ...l, itemSearch: "", item: null, suggestions: [], showSugg: false,
        soLuongYC: 1, soLuong: 1, donGia: 0, viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
      } : l));
      clearTimeout(searchTimers.current[lineId]);
      return;
    }
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, itemSearch: q, showSugg: true } : l));
    clearTimeout(searchTimers.current[lineId]);
    searchTimers.current[lineId] = setTimeout(async () => {
      try {
        const whParam = fromWarehouseId ? `&warehouseId=${fromWarehouseId}` : "";
        const res = await fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8${whParam}`);
        const data: ItemSuggestion[] = await res.json();
        setLines(ls => ls.map(l => l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l));
      } catch { /* ignore */ }
    }, 250);
  };

  const selectItem = (lineId: string, item: ItemSuggestion) => setLines(ls => ls.map(l =>
    l.id === lineId
      ? {
        ...l,
        item,
        itemSearch: item.tenHang,
        suggestions: [], showSugg: false,
        donGia: item.giaNhap,
        soLuongTon: item.soLuongTon,
        // Auto-fill vị trí từ InventoryStock (chỉ fill khi chưa nhập tay)
        viTriHang: l.viTriHang || (item.viTriHang ?? ""),
        viTriCot: l.viTriCot || (item.viTriCot ?? ""),
        viTriTang: l.viTriTang || (item.viTriTang ?? ""),
        error: undefined,
      }
      : l
  ));

  const updateLine = <K extends keyof StockLine>(lineId: string, key: K, val: StockLine[K]) =>
    setLines(ls => ls.map(l => {
      if (l.id !== lineId) return l;
      const updated = { ...l, [key]: val };
      // Đồng bộ soLuong khi sửa soLuongYC (nếu chưa chỉnh tay soLuong)
      if (key === "soLuongYC" && (l.soLuong === l.soLuongYC)) updated.soLuong = val as number;
      return updated;
    }));

  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (lineId: string) => setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== lineId) : ls);

  // Re-fetch tồn kho cho tất cả item đã chọn khi đổi kho
  React.useEffect(() => {
    if (!fromWarehouseId) return;
    setLines(ls => ls.map(l => {
      // Reset tồn — sẽ được cập nhật khi search lại
      return { ...l, soLuongTon: undefined };
    }));
    // Fetch tồn mới theo kho vừa chọn
    const cur = lines.filter(l => l.itemSearch.trim() !== "");
    if (!cur.length) return;
    // Fetch từng item theo kho mới
    cur.forEach(l => {
      fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(l.itemSearch)}&limit=1&warehouseId=${fromWarehouseId}`)
        .then(r => r.json())
        .then((data: { id: string; tenHang: string; soLuongTon?: number; code: string | null; donVi: string | null; giaNhap: number; viTriHang?: string | null; viTriCot?: string | null; viTriTang?: string | null }[]) => {
          if (!Array.isArray(data) || !data.length) return;
          const found = data.find(x => x.tenHang.toLowerCase() === l.itemSearch.toLowerCase()) ?? data[0];
          setLines(prev => prev.map(pl => {
            if (pl.id !== l.id) return pl;
            return {
              ...pl,
              soLuongTon: found.soLuongTon,
              item: pl.item || {
                id: found.id, code: found.code, tenHang: found.tenHang,
                donVi: found.donVi, giaNhap: found.giaNhap,
                soLuongTon: found.soLuongTon,
                viTriHang: found.viTriHang, viTriCot: found.viTriCot, viTriTang: found.viTriTang,
              }
            };
          }));
        })
        .catch(() => { });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromWarehouseId]);

  // ── Totals + Realtime stock check ───────────────────────────────────────────
  const validLines = lines.filter(l => l.itemSearch.trim() !== "" && l.soLuong > 0);
  const tongSL = validLines.reduce((s, l) => s + l.soLuong, 0);
  const tongTien = validLines.reduce((s, l) => s + l.soLuong * l.donGia, 0);
  // Nếu đã chọn kho: soLuongTon undefined = chưa có tồn = coi như 0 (thiếu hàng)
  const deficientLines = validLines.filter(l => {
    if (!l.item) return true; // Hàng không tồn tại trong DB -> chắc chắn thiếu
    const ton = l.soLuongTon ?? (fromWarehouseId ? 0 : undefined);
    return ton !== undefined && l.soLuong > ton;
  });
  const stockStatus: "ok" | "insufficient" | "unknown" =
    validLines.length === 0 || !fromWarehouseId ? "unknown" :
      deficientLines.length > 0 ? "insufficient" : "ok";

  // ── Báo cáo thiếu hàng ────────────────────────────────────────────────
  const [reporting, setReporting] = React.useState(false);
  const reportMissingItems = async () => {
    if (!deficientLines.length || reporting) return;
    setReporting(true);
    try {
      const res = await fetch("/api/plan-finance/inventory/report-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soChungTu,
          reference: mode === "so" ? selectedSo?.code : mode === "wo" ? selectedWo?.code : mode === "defect" ? selectedDefect?.code : null,
          items: deficientLines.map(l => ({
            tenHang: l.item?.tenHang || l.itemSearch,
            thieu: l.item ? (l.soLuong - (l.soLuongTon ?? 0)) : l.soLuong,
            donVi: l.item?.donVi || "",
          })),
        }),
      });
      if (res.ok) {
        toast.success("Đã báo cáo!", "Đã gửi thông báo thiếu hàng cho bộ phận Kế toán.", 3000);
      } else {
        toast.error("Lỗi", "Không thể gửi báo cáo.");
      }
    } catch (e) {
      toast.error("Lỗi mạng", "Vui lòng thử lại.");
    } finally {
      setReporting(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const doSave = async (printAfter: boolean) => {
    setSaving(true); setInsufficient([]);
    try {
      const res = await fetch("/api/plan-finance/stock-movements/batch-xuat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
          soChungTu: soChungTu || undefined,
          lyDo: [loaiXuatKho, lyDo, ghiChu ? `Ghi chú: ${ghiChu}` : ""].filter(Boolean).join(" - ") || undefined,
          nguoiThucHien: nguoiThucHien || undefined,
          salesOrderId: selectedSo?.id || initialSoId || undefined,
          workOrderId: selectedWo?.id || initialWoId || undefined,
          ticketId: currentTicketId || selectedDefect?.logisticsTickets?.[0]?.id || initialTicketId,
          lines: validLines.map(l => ({
            inventoryItemId: l.item!.id,
            soLuong: l.soLuong,
            soLuongYC: l.soLuongYC,
            donGia: l.donGia || undefined,
            viTriHang: l.viTriHang || undefined,
            viTriCot: l.viTriCot || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu: l.ghiChu || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.insufficient?.length) {
          setInsufficient(data.insufficient);
          const errMap = new Map<string, number>(data.insufficient.map((x: { inventoryItemId: string; soLuongTon: number }) => [x.inventoryItemId, x.soLuongTon] as [string, number]));
          setLines(ls => ls.map(l => ({
            ...l,
            error: l.item && errMap.has(l.item.id)
              ? `Tồn kho chỉ còn ${(errMap.get(l.item.id) ?? 0).toLocaleString("vi-VN")} ${l.item.donVi ?? ""}`
              : undefined,
          })));
        }
        throw new Error(data.error ?? "Lỗi lưu");
      }
      toast.success("✅ Xuất kho thành công!", `Phiếu ${soChungTu} đã được xác nhận`, 5000);
      setSuccess(true);
      if (printAfter) {
        setShowPreview(true);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("logistics-orders-updated"));
      }
      onSaved();
    } catch (e) {
      toast.error("Xuất kho thất bại", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  const handleSave = (printAfter: boolean) => {
    if (!isThuKho) {
      toast.error("Không có quyền", "Chỉ tài khoản Thủ kho mới có quyền xuất kho.");
      return;
    }
    setSaveWithPrint(printAfter);
    if (!fromWarehouseId) { toast.error("Thiếu thông tin", "Vui lòng chọn kho xuất"); return; }
    if (!validLines.length) { toast.error("Chưa có hàng hoá", "Cần ít nhất 1 dòng hợp lệ"); return; }
    // Tất cả hàng đều thiếu tồn → không thể xuất, cảnh báo và đóng modal
    if (deficientLines.length === validLines.length && deficientLines.length > 0) {
      toast.error(
        "Không thể xuất kho",
        "Không có bất kỳ mặt hàng nào đủ tồn kho để xuất. Vui lòng bổ sung hàng trước.",
        6000
      );
      onClose();
      return;
    }
    // Một phần thiếu → hỏi xem có muốn xuất thiếu không
    if (stockStatus === "insufficient") { setConfirmOpen(true); return; }
    doSave(printAfter);
  };

  const locked = success;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="xk-modal-wrapper" style={{ position: "fixed", inset: 0, zIndex: 5000, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        /* RESPONSIVE STYLES FOR IPAD AND MOBILE ONLY */
        @media (max-width: 1024px) {
          /* Top bar layout: wrap items, push close to right */
          .xk-top-bar { height: auto !important; padding: 12px 16px !important; flex-wrap: wrap; }
          .xk-top-title { flex: 1; min-width: 200px; }
          .xk-mode-select { margin-left: 0 !important; width: 100%; margin-top: 12px; order: 3; }
          .xk-so-select { margin-left: 0 !important; width: 100%; margin-top: 8px; order: 4; }
          .xk-top-close { margin-left: 0 !important; }
          
          /* Body and Sidebar: Stack them vertically */
          .xk-body { flex-direction: column !important; }
          .xk-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border); overflow-y: auto !important; max-height: 250px; }
          
          /* Sidebar Info Grid: 2 items on one row */
          .xk-sidebar-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .xk-sidebar-full-row { grid-column: 1 / -1; }
          
          /* Right pane header */
          .xk-pane-header { flex-wrap: wrap; padding-bottom: 8px; }
          .xk-pane-totals { margin-left: 0 !important; width: 100%; justify-content: space-between !important; border-top: 1px dashed var(--border); padding-top: 8px; margin-top: 4px; }
          
          /* Table horizontal scrolling */
          .xk-table-wrapper { overflow-x: hidden !important; }
          .xk-table-inner { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px; padding-bottom: 12px; }
          .xk-table-inner > div { min-width: 1100px !important; } /* Increased to widen Item column on iPad */
        }

        /* SPECIFIC MOBILE TWEAKS */
        @media (max-width: 768px) {
          .xk-sidebar-grid { grid-template-columns: 1fr !important; }
          .xk-sidebar { max-height: none !important; }
          .xk-sidebar-collapsed { display: none !important; }
        }
      `}</style>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="xk-top-bar" style={{ flexShrink: 0, minHeight: 64, borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, background: "var(--card)" }}>
        {/* Left: Icon & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: "fit-content" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-box-arrow-up" style={{ fontSize: 20, color: "#d97706" }} />
          </div>
          <div className="xk-top-title">
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--foreground)", letterSpacing: "-0.01em" }}>Phiếu xuất kho</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace", opacity: 0.8 }}>{soChungTu}</p>
          </div>
        </div>

        {/* Center/Right wrapper for flex distribution */}
        <div className="xk-top-actions" style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
          {/* Mode toggle */}
          <div className="xk-mode-select" style={{ display: "flex", background: "var(--muted)", padding: 4, borderRadius: 10, gap: 4, border: "1px solid rgba(0,0,0,0.05)" }}>
            {([
              { val: "manual" as const, label: "Thủ công", icon: "bi-pencil" },
              { val: "so" as const, label: "Theo đơn bán hàng", icon: "bi-bag-check" },
              { val: "wo" as const, label: "Theo lệnh sản xuất", icon: "bi-gear" },
              { val: "defect" as const, label: "Theo hồ sơ lỗi", icon: "bi-tools" },
            ]).map(m => (
              <button key={m.val} onClick={() => !locked && setMode(m.val)} style={{
                display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center",
                padding: "6px 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: locked ? "not-allowed" : "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                background: mode === m.val ? "var(--card)" : "transparent",
                color: mode === m.val ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: mode === m.val ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                whiteSpace: "nowrap"
              }}>
                <i className={`bi ${m.icon}`} style={{ fontSize: 14, opacity: mode === m.val ? 1 : 0.7 }} />
                {m.label}
              </button>
            ))}
          </div>

          {/* SO/WO select */}
          {mode === "so" && (
            <div className="xk-so-select position-relative" style={{ display: "flex", alignItems: "center" }}>
              {listLoading ? (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "0 10px" }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang tải…
                </div>
              ) : (
                <div className="position-relative">
                  <select
                    value={selectedSo?.id ?? ""}
                    onChange={e => !locked && onSelectSo(e.target.value)}
                    style={{
                      height: 38, padding: "0 36px 0 16px",
                      border: `1px solid ${selectedSo ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                      borderRadius: 10,
                      background: selectedSo ? "rgba(245,158,11,0.05)" : "var(--background)",
                      color: selectedSo ? "#d97706" : "var(--foreground)",
                      fontSize: 13, fontWeight: selectedSo ? 600 : 400,
                      outline: "none", cursor: locked ? "not-allowed" : "pointer",
                      width: 280, transition: "all 0.2s",
                      appearance: "none", textOverflow: "ellipsis"
                    }}
                  >
                    <option value="">Chọn đơn bán hàng</option>
                    {saleOrders.length === 0 && <option disabled value="">Không có đơn đang thực hiện</option>}
                    {/* Group by type */}
                    {(["contract", "sale-order", "retail-invoice"] as const).map(type => {
                      const group = saleOrders.filter(s => s.type === type);
                      if (!group.length) return null;
                      const groupLabel = group[0].typeLabel;
                      return (
                        <optgroup key={type} label={`— ${groupLabel} —`}>
                          {group.map(so => (
                            <option key={so.id} value={so.id}>
                              {so.code ?? so.id}
                              {so.customer ? ` — ${so.customer}` : ""}
                              {so.tongTien ? ` (${so.tongTien.toLocaleString("vi-VN")}₫)` : ""}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  <i className="bi bi-chevron-down position-absolute" style={{ right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: selectedSo ? "#d97706" : "var(--muted-foreground)" }} />
                  {selectedSo && (
                    <span className="position-absolute" style={{ top: -10, right: -10, fontSize: 10, color: "#fff", fontWeight: 600, background: "#10b981", borderRadius: 20, padding: "2px 8px", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)", zIndex: 10 }}>
                      <i className="bi bi-check" style={{ marginRight: 2 }} />Đã chọn
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === "wo" && (
            <div className="xk-so-select position-relative" style={{ display: "flex", alignItems: "center" }}>
              <div className="position-relative">
                <select
                  value={selectedWo?.id ?? ""}
                  onChange={e => !locked && onSelectWo(e.target.value)}
                  style={{
                    height: 38, padding: "0 36px 0 16px",
                    border: `1px solid ${selectedWo ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                    borderRadius: 10,
                    background: selectedWo ? "rgba(99,102,241,0.05)" : "var(--background)",
                    color: selectedWo ? "#6366f1" : "var(--foreground)",
                    fontSize: 13, fontWeight: selectedWo ? 600 : 400,
                    outline: "none", cursor: locked ? "not-allowed" : "pointer",
                    width: 320, transition: "all 0.2s",
                    appearance: "none", textOverflow: "ellipsis"
                  }}
                >
                  <option value="">Chọn lệnh sản xuất</option>
                  {workOrders.length === 0 && <option disabled value="">Chưa có lệnh sản xuất</option>}
                  {workOrders.map(wo => (
                    <option key={wo.id} value={wo.id}>{wo.code ?? wo.id}</option>
                  ))}
                </select>
                <i className="bi bi-chevron-down position-absolute" style={{ right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: selectedWo ? "#6366f1" : "var(--muted-foreground)" }} />
                {selectedWo && (
                  <span className="position-absolute" style={{ top: -10, right: -10, fontSize: 10, color: "#fff", fontWeight: 600, background: "#10b981", borderRadius: 20, padding: "2px 8px", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)", zIndex: 10 }}>
                    <i className="bi bi-check" style={{ marginRight: 2 }} />Đã chọn
                  </span>
                )}
              </div>
            </div>
          )}

          {mode === "defect" && (
            <div className="xk-so-select position-relative" style={{ display: "flex", alignItems: "center" }}>
              {listLoading ? (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "0 10px" }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang tải…
                </div>
              ) : (
                <div className="position-relative">
                  <select
                    value={selectedDefect?.id ?? ""}
                    onChange={e => !locked && onSelectDefect(e.target.value)}
                    style={{
                      height: 38, padding: "0 36px 0 16px",
                      border: `1px solid ${selectedDefect ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
                      borderRadius: 10,
                      background: selectedDefect ? "rgba(239,68,68,0.05)" : "var(--background)",
                      color: selectedDefect ? "#dc2626" : "var(--foreground)",
                      fontSize: 13, fontWeight: selectedDefect ? 600 : 400,
                      outline: "none", cursor: locked ? "not-allowed" : "pointer",
                      width: 260, transition: "all 0.2s",
                      appearance: "none", textOverflow: "ellipsis"
                    }}
                  >
                    <option value="">Chọn hồ sơ lỗi</option>
                    {defects.length === 0 && <option disabled value="">Không có hồ sơ lỗi</option>}
                    {defects.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.code ?? d.id}
                      </option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down position-absolute" style={{ right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: selectedDefect ? "#dc2626" : "var(--muted-foreground)" }} />
                  {selectedDefect && (
                    <span className="position-absolute" style={{ top: -10, right: -10, fontSize: 10, color: "#fff", fontWeight: 600, background: "#10b981", borderRadius: 20, padding: "2px 8px", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)", zIndex: 10 }}>
                      <i className="bi bi-check" style={{ marginRight: 2 }} />Đã chọn
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} className="d-none d-lg-block" />

          {/* Close Button Top Right */}
          <button onClick={() => {
            onClose();
          }} className="xk-top-close" style={{ width: 36, height: 36, border: "none", background: "var(--muted)", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "all 0.2s" }}>
            <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY ═════════════════════════════════════════════════════════════ */}
      <div className="xk-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR TRÁI ────────────────────────────────────────────────── */}
        <div className="xk-sidebar" style={{ width: 272, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>

            {/* Header nhóm (Clickable on mobile) */}
            <div
              className="xk-sidebar-header-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ display: "flex", alignItems: "center", gap: 7, paddingBottom: 10, borderBottom: "1px solid var(--border)", cursor: "pointer", justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-receipt" style={{ fontSize: 13, color: "#f59e0b" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Thông tin phiếu</span>
              </div>
              <i className={`bi bi-chevron-${isSidebarOpen ? 'up' : 'down'} d-md-none`} style={{ fontSize: 14, color: "var(--muted-foreground)" }} />
            </div>

            <div className={`xk-sidebar-content ${!isSidebarOpen ? 'xk-sidebar-collapsed' : ''}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="xk-sidebar-grid" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Số phiếu — readOnly monospace */}
                <div>
                  <label style={CSS.label}>Số phiếu xuất</label>
                  <input value={soChungTu} readOnly style={{ ...CSS.input, background: "var(--muted)", color: "var(--muted-foreground)", cursor: "default", fontFamily: "monospace", fontSize: 12 }} />
                </div>

                {/* Thời gian */}
                <div>
                  <label style={CSS.label}>Thời gian</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="date"
                      value={ngayXuat}
                      min={lockDate ? new Date().toISOString().slice(0, 10) : undefined}
                      max={lockDate ? new Date().toISOString().slice(0, 10) : undefined}
                      onChange={e => !lockDate && !locked && setNgayXuat(e.target.value)}
                      readOnly={lockDate || locked}
                      style={{ ...CSS.input, flex: 1, cursor: (lockDate || locked) ? "not-allowed" : "text", opacity: (lockDate || locked) ? 0.7 : 1, background: (lockDate || locked) ? "var(--muted)" : CSS.input.background }}
                    />
                    {/* iOS-style toggle */}
                    {!locked && (
                      <span onClick={() => setLockDate(v => !v)} title={lockDate ? "Khoá ngày hôm nay — nhấn để mở" : "Đang mở — nhấn để khoá"}
                        style={{ position: "relative", display: "inline-block", width: 34, height: 18, borderRadius: 9, flexShrink: 0, background: lockDate ? "#f59e0b" : "var(--border)", transition: "background 0.2s", cursor: "pointer" }}>
                        <span style={{ position: "absolute", top: 2, left: lockDate ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.2s" }} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Loại xuất kho */}
                <div>
                  <label style={CSS.label}>Loại xuất kho</label>
                  <div style={{ position: "relative" }}>
                    <select value={loaiXuatKho} onChange={e => !locked && setLoaiXuatKho(e.target.value)} disabled={locked}
                      style={{ ...CSS.input, appearance: "none", opacity: locked ? 0.65 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                      <option value="Xuất bán hàng">Xuất bán hàng</option>
                      <option value="Xuất sản xuất">Xuất sản xuất</option>
                      <option value="Cấp phát linh kiện thay thế">Cấp phát linh kiện thay thế</option>
                      <option value="Xuất vật tư bảo hành">Xuất vật tư bảo hành</option>
                      <option value="Xuất trả nhà cung cấp">Xuất trả nhà cung cấp</option>
                      <option value="Xuất huỷ/hao hụt">Xuất huỷ / hao hụt</option>
                      <option value="Khác">Khác</option>
                    </select>
                    <i className="bi bi-chevron-down position-absolute" style={{ right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: "var(--muted-foreground)" }} />
                  </div>
                </div>

                {/* Kho xuất */}
                <div>
                  <label style={CSS.label}>Kho xuất <span style={{ color: "#f43f5e" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <select value={fromWarehouseId} onChange={e => !locked && setFromWarehouseId(e.target.value)} disabled={locked}
                      style={{ ...CSS.input, appearance: "none", borderColor: fromWarehouseId ? "rgba(245,158,11,0.5)" : "var(--border)", opacity: locked ? 0.65 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                      <option value="">Chọn kho</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <i className="bi bi-chevron-down position-absolute" style={{ right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: "var(--muted-foreground)" }} />
                  </div>
                </div>

                {/* Người thực hiện */}
                <div>
                  <label style={CSS.label}>Người thực hiện</label>
                  <input value={nguoiThucHien} onChange={e => !locked && setNguoiThucHien(e.target.value)} readOnly={locked}
                    placeholder="Tên người xuất kho"
                    style={{ ...CSS.input, opacity: locked ? 0.65 : 1, cursor: locked ? "default" : "text" }} />
                </div>
              </div>

              {/* Lý do — textarea */}
              <div className="xk-sidebar-full-row">
                <label style={CSS.label}>Lý do xuất kho</label>
                <textarea value={lyDo} onChange={e => !locked && setLyDo(e.target.value)} readOnly={locked} rows={2}
                  style={{ ...CSS.input, resize: locked ? "none" : "vertical", lineHeight: 1.5, opacity: locked ? 0.65 : 1, cursor: locked ? "default" : "text" }} />
              </div>

              {/* Ghi chú — chiếm hết không gian còn lại */}
              <div className="xk-sidebar-full-row" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <label style={CSS.label}>Ghi chú</label>
                <textarea value={ghiChu} onChange={e => !locked && setGhiChu(e.target.value)} readOnly={locked}
                  placeholder="Ghi chú thêm..."
                  style={{ ...CSS.input, flex: 1, resize: "none", lineHeight: 1.5, opacity: locked ? 0.65 : 1, cursor: locked ? "default" : "text" }} />
              </div>

              {/* Cảnh báo thiếu tồn */}
              {insufficientItems.length > 0 && (
                <div style={{ padding: 10, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 8 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 700, color: "#f43f5e" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 4 }} />Thiếu tồn kho
                  </p>
                  {insufficientItems.map(x => (
                    <p key={x.inventoryItemId} style={{ margin: "2px 0", fontSize: 11, color: "var(--foreground)" }}>
                      • {x.tenHang}: cần <b>{x.soLuong}</b>, còn <b style={{ color: "#f43f5e" }}>{x.soLuongTon}</b>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── TABLE AREA ─────────────────────────────────────────────────── */}
        <div className="xk-table-wrapper" style={{ flex: 1, overflowY: !fromWarehouseId ? "hidden" : "auto", padding: "16px 20px 24px", position: "relative" }}>

          {/* Overlay khi chưa chọn kho */}
          {!fromWarehouseId && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, backdropFilter: "blur(3px)", background: "color-mix(in srgb, var(--background) 60%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-box-seam" style={{ fontSize: 24, color: "#3b82f6" }} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Chọn kho xuất để bắt đầu</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
                Vui lòng chọn <b>Kho xuất</b> ở bảng thông tin bên trái<br />để có thể chọn hàng hoá cần xuất kho.
              </p>
            </div>
          )}

          {/* Tiêu đề bảng + tổng */}
          <div className="xk-pane-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Danh sách hàng hoá xuất kho</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>
              {lines.length} dòng
            </span>
            {mode === "so" && selectedSo && (
              <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: 20, padding: "2px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                <i className="bi bi-link-45deg" /> Từ SO: {selectedSo?.code}
              </span>
            )}
            {mode === "wo" && selectedWo && (
              <span style={{ fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.1)", borderRadius: 20, padding: "2px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                <i className="bi bi-link-45deg" /> Từ lệnh: {selectedWo?.code}
              </span>
            )}

            {validLines.length > 0 && stockStatus !== "unknown" && (
              <TrangThaiTonKhoBadge
                items={validLines.map(l => ({
                  ten: l.item?.tenHang ?? l.itemSearch,
                  soLuong: l.soLuong,
                  soLuongTon: l.item ? l.soLuongTon : 0, // Không có trong DB = Tồn kho 0
                }))}
                showPurchaseRequest={!locked}
                onCreatePR={reportMissingItems}
              />
            )}
            <div className="xk-pane-totals" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tổng SL</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", lineHeight: 1.2 }}>{tongSL.toLocaleString("vi-VN")}</div>
              </div>
              <div style={{ width: 1, height: 28, background: "var(--border)" }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá trị</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", lineHeight: 1.2 }}>***</div>
              </div>
            </div>
          </div>

          <div className="xk-table-inner">
            {/* Table header — 2 dòng */}
            <div style={{ background: "var(--muted)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
              {/* Dòng 1 — group labels */}
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px 160px 180px 110px 110px 32px", gap: 5, padding: "6px 10px 0", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <div>#</div>
                <div>Hàng hoá</div>
                <div style={{ textAlign: "center" }}>ĐVT</div>
                <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>Số lượng</div>
                <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>Vị trí trong kho</div>
                <div style={{ textAlign: "right" }}>Đơn giá (₫)</div>
                <div style={{ textAlign: "right" }}>Thành tiền</div>
                <div />
              </div>
              {/* Dòng 2 — sub-labels */}
              <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 5, padding: "2px 10px 6px", fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div /><div /><div />
                <div style={{ textAlign: "center", opacity: 0.75 }}>Yêu cầu</div>
                <div style={{ textAlign: "center", opacity: 0.9 }}>Thực xuất</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Hàng</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Cột</div>
                <div style={{ textAlign: "center", opacity: 0.75 }}>Tầng</div>
                <div /><div /><div />
              </div>
            </div>

            {/* Lines */}
            <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
              {lines.map((line, idx) => (
                <LineRow key={line.id} line={line} idx={idx}
                  onItemSearch={q => onItemSearch(line.id, q)}
                  onSelectItem={item => selectItem(line.id, item)}
                  onUpdate={(key, val) => updateLine(line.id, key, val)}
                  onRemove={() => removeLine(line.id)}
                  canRemove={lines.length > 1}
                  locked={locked}
                />
              ))}
              <div style={{ padding: "8px 10px", borderTop: "1px dashed var(--border)" }}>
                {!locked ? (
                  <button onClick={addLine}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.color = "#f59e0b"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderWidth: "1.5px", borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
                    <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm dòng hàng hoá
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, padding: "4px 4px" }}>
                    <i className="bi bi-lock-fill" style={{ fontSize: 11, color: "#f59e0b" }} />
                    Danh sách đã khoá sau khi xác nhận xuất kho
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM STATUS BAR ═════════════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, height: 60, borderTop: "1px solid var(--border)", background: "var(--card)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Status */}
        {(() => {
          const totalItemsCount = validLines.length;
          const missingItemsCount = validLines.filter(l => l.soLuong > (l.soLuongTon || 0)).length;

          let stockStatusLabel = "";
          let stockStatusColor = "";
          let stockStatusIcon = "";
          let stockStatusBg = "";

          if (totalItemsCount === 0) {
            stockStatusLabel = "Chưa có hàng hoá cần xuất";
            stockStatusColor = "var(--muted-foreground)";
            stockStatusIcon = "bi-info-circle";
            stockStatusBg = "transparent";
          } else if (missingItemsCount === 0) {
            stockStatusLabel = "Kho đã sẵn sàng xuất (Đủ hàng)";
            stockStatusColor = "#10b981";
            stockStatusIcon = "bi-check-circle-fill";
            stockStatusBg = "rgba(16, 185, 129, 0.1)";
          } else if (missingItemsCount === totalItemsCount) {
            stockStatusLabel = "Kho thiếu toàn bộ hàng hoá";
            stockStatusColor = "#ef4444";
            stockStatusIcon = "bi-exclamation-octagon-fill";
            stockStatusBg = "rgba(239, 68, 68, 0.1)";
          } else {
            stockStatusLabel = `Kho thiếu ${missingItemsCount}/${totalItemsCount} mặt hàng`;
            stockStatusColor = "#f59e0b";
            stockStatusIcon = "bi-exclamation-triangle-fill";
            stockStatusBg = "rgba(245, 158, 11, 0.1)";
          }

          return (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: stockStatusBg, color: stockStatusColor, fontSize: 13.5, fontWeight: 700 }}>
                <i className={`bi ${stockStatusIcon}`} style={{ fontSize: 16 }} />
                {stockStatusLabel}
              </div>

              {missingItemsCount > 0 && totalItemsCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", background: "rgba(245, 158, 11, 0.05)", border: "1px dashed rgba(245, 158, 11, 0.3)", borderRadius: 8 }}>
                  <div className="form-check form-switch m-0" style={{ minHeight: "auto", display: "flex", alignItems: "center" }}>
                    <input
                      className="form-check-input m-0"
                      type="checkbox"
                      id="allowExportShortage"
                      checked={allowExportShortage}
                      onChange={(e) => setAllowExportShortage(e.target.checked)}
                      style={{ cursor: "pointer", width: 32, height: 18 }}
                    />
                  </div>
                  <label htmlFor="allowExportShortage" style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--muted-foreground)", userSelect: "none", margin: 0 }}>
                    Xuất thiếu hàng
                  </label>
                </div>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowLichSu(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
            <i className="bi bi-clock-history" style={{ fontSize: 14 }} /> Lịch sử
          </button>

          {success && (
            <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "#f59e0b", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
              <i className="bi bi-printer" style={{ fontSize: 14 }} /> In phiếu xuất kho
            </button>
          )}

          {!success && (() => {
            const missingItemsCount = validLines.filter(l => !l.item || l.soLuong > (l.soLuongTon || 0)).length;
            const canSave = !saving && isThuKho && validLines.length > 0 && !!fromWarehouseId
              && !(mode === "so" && !selectedSo)
              && !(mode === "wo" && !selectedWo)
              && (missingItemsCount === 0 || allowExportShortage);
            const buttonTitle = !isThuKho
              ? "Chỉ tài khoản Thủ kho mới có quyền xuất kho"
              : mode === "so" && !selectedSo
              ? "Vui lòng chọn đơn bán hàng"
              : mode === "wo" && !selectedWo
              ? "Vui lòng chọn lệnh sản xuất"
              : validLines.length === 0
              ? "Chưa có hàng hoá"
              : missingItemsCount > 0 && !allowExportShortage
              ? "Kho không đủ hàng"
              : undefined;
            return (
              <>
                <button onClick={() => handleSave(true)} disabled={!canSave} title={buttonTitle} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", border: "1.5px solid #f59e0b", borderRadius: 8,
                  background: canSave ? "rgba(245,158,11,0.1)" : "var(--muted)",
                  color: canSave ? "#f59e0b" : "var(--muted-foreground)",
                  fontSize: 13, fontWeight: 700,
                  cursor: canSave ? "pointer" : "not-allowed",
                  opacity: canSave ? 1 : 0.6, transition: "all 0.15s",
                }}>
                  {saving && saveWithPrint
                    ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", fontSize: 14 }} />
                    : <i className="bi bi-printer" style={{ fontSize: 14 }} />}
                  Xác nhận & In phiếu
                </button>
                <button onClick={() => handleSave(false)} disabled={!canSave} title={buttonTitle} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 24px", border: "none", borderRadius: 8,
                  background: canSave ? "#f59e0b" : "var(--muted)",
                  color: canSave ? "#fff" : "var(--muted-foreground)",
                  fontSize: 13, fontWeight: 700,
                  cursor: canSave ? "pointer" : "not-allowed",
                  opacity: canSave ? 1 : 0.6, transition: "all 0.15s",
                }}>
                  {saving && !saveWithPrint
                    ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite", fontSize: 14 }} />
                    : <i className="bi bi-check2-all" style={{ fontSize: 14 }} />}
                  Xác nhận
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Confirm khi kho thiếu hàng */}
      <ConfirmDialog
        open={confirmOpen}
        variant="warning"
        title="Kho không đủ hàng"
        message={
          <div>
            <p style={{ margin: "0 0 10px" }}>
              Có <strong style={{ color: "#f43f5e" }}>{deficientLines.length} mặt hàng</strong> không đủ tồn kho:
            </p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 13 }}>
              {deficientLines.map(l => (
                <li key={l.id}>
                  <strong>{l.item?.tenHang}</strong>: cần {l.soLuong}, tồn&nbsp;
                  <span style={{ color: "#f43f5e", fontWeight: 700 }}>{l.soLuongTon ?? 0}</span>
                  {l.item?.donVi ? ` ${l.item.donVi}` : ""}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 12.5 }}>
              Bạn có muốn xuất kho với số lượng hiện có hoặc đợi bổ sung hàng?
            </p>
          </div>
        }
        confirmLabel="Xuất kho ngay"
        cancelLabel="Đợi đủ hàng"
        loading={saving}
        onConfirm={() => { setConfirmOpen(false); doSave(saveWithPrint); }}
        onCancel={() => setConfirmOpen(false)}
      />

      {showPreview && (
        <PhieuXuatKhoPreview
          soChungTu={soChungTu}
          ngayXuat={ngayXuat}
          khoName={warehouses.find(w => w.id === fromWarehouseId)?.name ?? "—"}
          lyDo={lyDo || undefined}
          nguoiThucHien={nguoiThucHien || undefined}
          lines={validLines.map(l => ({
            tenHang: l.item!.tenHang,
            maSku: l.item!.code,
            donVi: l.item!.donVi,
            soLuongYC: l.soLuongYC,
            soLuong: l.soLuong,
            donGia: l.donGia,
            viTriHang: l.viTriHang || undefined,
            viTriCot: l.viTriCot || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu: l.ghiChu || undefined,
          }))}
          onClose={() => setShowPreview(false)}
        />
      )}


      {showLichSu && (
        <LichSuXuatKhoOffcanvas onClose={() => setShowLichSu(false)} />
      )}
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────
function LineRow({ line, idx, onItemSearch, onSelectItem, onUpdate, onRemove, canRemove, locked }: {
  line: StockLine; idx: number;
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate: <K extends keyof StockLine>(key: K, val: StockLine[K]) => void;
  onRemove: () => void;
  canRemove: boolean;
  locked?: boolean;
}) {
  const cellInput: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)",
    borderRadius: 6, fontSize: 12.5, background: locked ? "var(--muted)" : "var(--background)",
    color: locked ? "var(--muted-foreground)" : "var(--foreground)",
    outline: "none", boxSizing: "border-box", cursor: locked ? "default" : "text",
  };
  const thanhTien = line.soLuong * line.donGia;
  const hasError = !!line.error;
  const isNotFound = line.itemSearch.trim() !== "" && !line.item;
  const isInsufficient = isNotFound || (line.item && line.soLuong > (line.soLuongTon ?? 0));
  const missingLabel = isNotFound ? "Không tìm thấy trong kho" : `Thiếu ${(line.soLuong - (line.soLuongTon ?? 0)).toLocaleString("vi-VN")}`;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: GRID,
      gap: 5, padding: "7px 10px",
      borderTop: idx === 0 ? "none" : "1px solid var(--border)",
      alignItems: "center",
      background: hasError ? "rgba(244,63,94,0.04)" : line.item ? "var(--background)" : `color-mix(in srgb, var(--muted) 20%, var(--background))`,
    }}>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx + 1}</div>

      {/* Item search */}
      <div style={{ position: "relative" }}>
        <input
          value={line.itemSearch}
          onChange={e => !locked && onItemSearch(e.target.value)}
          onFocus={() => { if (line.itemSearch && !locked) onUpdate("showSugg", true); }}
          readOnly={locked}
          placeholder="Tìm hoặc nhập tên hàng..."
          style={{
            ...cellInput, paddingRight: isInsufficient ? 26 : 8,
            borderColor: hasError ? "rgba(244,63,94,0.5)" : isInsufficient ? "rgba(244,63,94,0.4)" : "var(--border)",
          }}
        />
        {isInsufficient && !hasError && (
          <i className="bi bi-exclamation-circle-fill" title={missingLabel} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#f43f5e", pointerEvents: "auto", cursor: "help" }} />
        )}
        {hasError && <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#f43f5e" }}>{line.error}</p>}
        {line.showSugg && line.suggestions.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto" }}>
            {line.suggestions.map(s => (
              <div key={s.id} onClick={() => onSelectItem(s)}
                style={{ padding: "7px 11px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.tenHang}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  {s.code ?? ""} · {s.donVi ?? ""} · {s.giaNhap > 0 ? s.giaNhap.toLocaleString("vi-VN") + " ₫" : "—"}
                  {s.soLuongTon !== undefined && (
                    <span style={{ marginLeft: 8, fontWeight: 700, color: s.soLuongTon > 0 ? "#10b981" : "#f43f5e" }}>
                      Tồn: {s.soLuongTon}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{line.item?.donVi ?? "—"}</div>

      {/* SL yêu cầu */}
      <input type="number" min={0} value={line.soLuongYC}
        onChange={e => !locked && onUpdate("soLuongYC", Math.max(0, parseFloat(e.target.value) || 0))}
        readOnly={locked} title="Số lượng yêu cầu"
        style={{ ...cellInput, textAlign: "center", background: locked ? "var(--muted)" : "color-mix(in srgb, var(--muted) 60%, var(--background))", color: "var(--muted-foreground)" }} />

      {/* SL thực xuất */}
      <input type="number" min={0} value={line.soLuong}
        onChange={e => !locked && onUpdate("soLuong", Math.max(0, parseFloat(e.target.value) || 0))}
        readOnly={locked} title="Số lượng thực tế xuất kho"
        style={{
          ...cellInput, textAlign: "center",
          borderColor: hasError ? "rgba(244,63,94,0.5)" : (!locked && line.soLuong !== line.soLuongYC ? "#f59e0b" : "var(--border)"),
          fontWeight: !locked && line.soLuong !== line.soLuongYC ? 700 : 400,
          color: hasError ? "#f43f5e" : locked ? "var(--muted-foreground)" : line.soLuong !== line.soLuongYC ? "#f59e0b" : "var(--foreground)",
        }} />

      {/* Vị trí */}
      <input placeholder="Hàng" value={line.viTriHang} onChange={e => !locked && onUpdate("viTriHang", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Hàng" />
      <input placeholder="Cột" value={line.viTriCot} onChange={e => !locked && onUpdate("viTriCot", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Cột" />
      <input placeholder="Tầng" value={line.viTriTang} onChange={e => !locked && onUpdate("viTriTang", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Tầng" />

      {/* Đơn giá */}
      <input value="***" readOnly title="Bảo mật giá" style={{ ...cellInput, textAlign: "right", background: "var(--muted)", color: "var(--muted-foreground)", cursor: "not-allowed" }} />

      {/* Thành tiền */}
      <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--muted-foreground)" }}>
        ***
      </div>

      {/* Remove */}
      <button onClick={onRemove} disabled={!canRemove || locked}
        onMouseEnter={e => { if (canRemove && !locked) e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        style={{ width: 26, height: 26, border: "none", background: "transparent", color: (canRemove && !locked) ? "#f43f5e" : "var(--border)", cursor: (canRemove && !locked) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, transition: "background 0.15s" }}>
        <i className="bi bi-trash3" style={{ fontSize: 12 }} />
      </button>
    </div>
  );
}
