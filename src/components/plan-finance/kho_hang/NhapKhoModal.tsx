"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { isLogisticsAdmin } from "@/lib/logistics-permissions";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhieuNhapKhoPreview } from "./PhieuNhapKhoPreview";
import { LichSuNhapKhoOffcanvas } from "./LichSuNhapKhoOffcanvas";
import { genDocCode } from "@/lib/genDocCode";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Warehouse { id: string; code: string | null; name: string; isActive: boolean; }
interface ItemSuggestion { id: string; code: string | null; tenHang: string; donVi: string | null; giaNhap: number; }
interface POSuggestion { id: string; code: string | null; supplier?: { name: string } | null; ngayDat?: string | null; trangThai: string; }
interface POItem {
  id: string;
  inventoryItemId?: string | null;
  inventoryItem?: ItemSuggestion | null;
  tenHang: string;
  donVi?: string | null;
  soLuong: number;
  donGia: number;
}

interface StockLine {
  id: string;
  item: ItemSuggestion | null;
  itemSearch: string;
  suggestions: ItemSuggestion[];
  showSugg: boolean;
  soLuong: number; // theo chứng từ
  soLuongThucTe: number; // thực tế nhập
  donGia: number;
  viTriHang: string;
  viTriCot: string;
  viTriTang: string;
  ghiChu: string;
  bomCode?: string | null;
  dinhMucTen?: string | null;
}

interface NhapKhoModalProps { 
  onClose: () => void; 
  onSaved: () => void; 
  initialItems?: { 
    name?: string; 
    tenHang?: string; 
    qty?: number; 
    soLuong?: number; 
    unit?: string; 
    inventoryItemId?: string | null; 
    code?: string | null;
    bomCode?: string | null;
    dinhMucTen?: string | null;
    [key: string]: any;
  }[];
  initialTaskId?: string;
  initialSoBienBanQC?: string;
  initialMode?: "manual" | "po" | "production" | "return";
  initialPurchaseOrderId?: string | null;
  initialPurchaseOrderCode?: string | null;
  initialShippingFee?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const fmtVnd = (n: number) => n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "—";
const emptyLine = (): StockLine => ({
  id: uid(), item: null, itemSearch: "", suggestions: [], showSugg: false,
  soLuong: 1, soLuongThucTe: 1, donGia: 0, viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
  bomCode: null, dinhMucTen: null,
});

const CSS: Record<string, React.CSSProperties> = {
  input: {
    width: "100%", padding: "8px 11px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)",
    borderRadius: 8, fontSize: 13, background: "var(--background)",
    color: "var(--foreground)", outline: "none", boxSizing: "border-box",
  },
  label: { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5 },
  section: {
    borderBottom: "1px solid var(--border)", padding: "16px 24px",
    display: "grid", gap: 12,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function NhapKhoModal({ 
  onClose, 
  onSaved, 
  initialItems, 
  initialTaskId, 
  initialSoBienBanQC, 
  initialMode,
  initialPurchaseOrderId,
  initialPurchaseOrderCode,
  initialShippingFee,
}: NhapKhoModalProps) {
  const { data: session } = useSession();
  const isThuKho = isLogisticsAdmin(session?.user);

  const isInitialReturn = (
    initialMode === "return" ||
    (initialItems && initialItems.some((it: any) => 
      it.loaiNhapKho === "Nhập kho hàng trả lại" ||
      it.isReturn ||
      (typeof it.name === "string" && (it.name.toLowerCase().includes("trả lại") || it.name.includes("ERR-"))) ||
      (typeof it.tenHang === "string" && (it.tenHang.toLowerCase().includes("trả lại") || it.tenHang.includes("ERR-")))
    ))
  );

  const [mode, setMode] = React.useState<"manual" | "po" | "production" | "return">(
    initialMode ? initialMode : (isInitialReturn ? "return" : (initialItems && initialItems.length > 0 ? "production" : "manual"))
  );

  // Header fields
  const [soChungTu, setSoChungTu] = React.useState(() => {
    const d = new Date();
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `PNH-${yyyymmdd}-001`;
  });
  const [ngayNhap, setNgayNhap] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [lockDate, setLockDate] = React.useState(true); // khoá ngày nhập vào hôm nay
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [nguoiThucHien, setNguoiThucHien] = React.useState("");
  const [lyDo, setLyDo] = React.useState(() => {
    if (initialItems && initialItems.length > 0 && initialItems[0].loaiNhapKho) {
      const matchErr = initialItems[0].defectCode || (typeof initialItems[0].name === "string" ? initialItems[0].name.match(/(ERR-[\w-]+)/)?.[1] : "");
      return matchErr ? `${initialItems[0].loaiNhapKho} theo hồ sơ lỗi ${matchErr}` : initialItems[0].loaiNhapKho;
    }
    if (isInitialReturn) return "Nhập kho hàng trả lại";
    const isDefect = initialItems && initialItems.some((it: any) => 
      it.type === "Kho Hàng Lỗi" || 
      it.warehouseCode === "KHO-LOI" || 
      (typeof it.name === "string" && it.name.includes("(Hàng lỗi)")) ||
      (typeof it.tenHang === "string" && it.tenHang.includes("(Hàng lỗi)"))
    );
    if (isDefect) return "Nhập kho hàng lỗi";
    return initialItems && initialItems.length > 0 ? "Nhập kho thành phẩm OQC" : "Nhập kho hàng hoá";
  });
  const [loaiNhapKho, setLoaiNhapKho] = React.useState(() => {
    if (initialItems && initialItems.length > 0 && initialItems[0].loaiNhapKho) {
      return initialItems[0].loaiNhapKho;
    }
    if (isInitialReturn) return "Nhập kho hàng trả lại";
    return initialItems && initialItems.length > 0 ? "Nhập từ sản xuất" : "Nhập mua hàng";
  });

  React.useEffect(() => {
    if (mode === "return") {
      setLoaiNhapKho("Nhập kho hàng trả lại");
    } else if (mode === "production") {
      if (initialItems && initialItems.length > 0 && initialItems[0].loaiNhapKho) {
        setLoaiNhapKho(initialItems[0].loaiNhapKho);
      } else {
        setLoaiNhapKho("Nhập từ sản xuất");
      }
    } else if (mode === "po") {
      setLoaiNhapKho("Nhập mua hàng");
    }
  }, [mode]);
  const [soBienBanQC, setSoBienBanQC] = React.useState(initialSoBienBanQC || "");
  const [ghiChu, setGhiChu] = React.useState("");
  const detectedShippingFee = (
    initialShippingFee ?? 
    (initialItems && initialItems.length > 0 && initialItems[0].shippingFee !== undefined ? Number(initialItems[0].shippingFee) : 0)
  ) || 0;
  const [chiPhiVanChuyen, setChiPhiVanChuyen] = React.useState<number>(detectedShippingFee);

  React.useEffect(() => {
    if (initialShippingFee !== undefined && initialShippingFee !== null && initialShippingFee > 0) {
      setChiPhiVanChuyen(initialShippingFee);
    } else if (initialItems && initialItems.length > 0 && initialItems[0].shippingFee !== undefined && Number(initialItems[0].shippingFee) > 0) {
      setChiPhiVanChuyen(Number(initialItems[0].shippingFee));
    }
  }, [initialShippingFee, initialItems]);

  React.useEffect(() => {
    if (session?.user?.name && !nguoiThucHien) {
      setNguoiThucHien(session.user.name);
    }
  }, [session, nguoiThucHien]);

  // PO mode
  const [poList, setPoList] = React.useState<POSuggestion[]>([]);
  const [poLoading, setPoLoading] = React.useState(false);
  const [selectedPO, setSelectedPO] = React.useState<POSuggestion | null>(null);

  const [woLoading, setWoLoading] = React.useState(false);
  const [woList, setWoList] = React.useState<any[]>([]);
  const [selectedWO, setSelectedWO] = React.useState<any | null>(null);

  const filteredWOList = React.useMemo(() => {
    if (mode === "return") {
      const returns = woList.filter(t => {
        const titleLower = (t.title || "").toLowerCase();
        return titleLower.includes("hàng trả lại") || 
               titleLower.includes("trả lại") || 
               t.title.includes("ERR-") ||
               titleLower.includes("hàng lỗi") ||
               (t.actualResult && (t.actualResult.includes("Nhập kho hàng trả lại") || t.actualResult.includes("KHO-LOI")));
      });
      return returns.length > 0 ? returns : woList;
    }
    return woList;
  }, [mode, woList]);

  const toast = useToast();

  // Data
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [lines, setLines] = React.useState<StockLine[]>([emptyLine()]);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showLichSu, setShowLichSu]   = React.useState(false);
  const [resolvingItems, setResolvingItems] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false); // Toggles mobile accordion

  // Auto-resolve initialItems to real InventoryItems
  React.useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setResolvingItems(true);
      Promise.all(initialItems.map(async (it) => {
        const rawName = typeof it.name === 'string' ? it.name : (typeof it.tenHang === 'string' ? it.tenHang : "");
        const cleanName = rawName
          .replace(/\s*\(x\d+\)$/, "")
          .replace(/\s*\(Hàng\s+lỗi\)$/i, "")
          .replace(/\s*\(Hàng\s+hỏng\)$/i, "");
        try {
          let url = `/api/plan-finance/inventory/search?q=${encodeURIComponent(cleanName)}&limit=1`;
          if (it.inventoryItemId) {
            url = `/api/plan-finance/inventory/search?id=${it.inventoryItemId}`;
          } else if (it.code) {
            url = `/api/plan-finance/inventory/search?code=${it.code}`;
          }

          const res = await fetch(url);
          const data = await res.json();
          const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
          return {
            id: uid(),
            item: found ? found : null,
            itemSearch: found ? found.tenHang : cleanName,
            suggestions: [],
            showSugg: false,
            soLuong: it.qty || it.soLuong || 1,
            soLuongThucTe: it.qty || it.soLuong || 1,
            donGia: found ? found.giaNhap : 0,
            viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
            bomCode: it.bomCode || (it as any).dinhMucCode || null,
            dinhMucTen: it.dinhMucTen || null,
          } as StockLine;
        } catch (e) {
          return {
            id: uid(), item: null, itemSearch: cleanName, suggestions: [], showSugg: false,
            soLuong: it.qty, soLuongThucTe: it.qty, donGia: 0, viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
            bomCode: it.bomCode || (it as any).dinhMucCode || null,
            dinhMucTen: it.dinhMucTen || null,
          } as StockLine;
        }
      })).then(resolved => {
        setLines(resolved);
      }).finally(() => setResolvingItems(false));
    }
  }, [initialItems]);

  // Fetch warehouses
  React.useEffect(() => {
    fetch("/api/plan-finance/warehouses").then(r => r.json())
      .then((d: Warehouse[]) => {
        const active = Array.isArray(d) ? d.filter(w => w.isActive) : [];
        setWarehouses(active);
        
        const isReturn = initialMode === "return" || (initialItems && initialItems.some((it: any) => 
          it.loaiNhapKho === "Nhập kho hàng trả lại" ||
          it.isReturn ||
          it.type === "Kho Hàng Lỗi" || 
          it.warehouseCode === "KHO-LOI" || 
          (typeof it.name === "string" && (it.name.toLowerCase().includes("trả lại") || it.name.includes("ERR-") || it.name.includes("(Hàng lỗi)"))) ||
          (typeof it.tenHang === "string" && (it.tenHang.toLowerCase().includes("trả lại") || it.tenHang.includes("ERR-") || it.tenHang.includes("(Hàng lỗi)")))
        ));

        if (isReturn) {
          const khoLoi = active.find(w => w.code === "KHO-LOI");
          if (khoLoi) {
            setToWarehouseId(khoLoi.id);
            return;
          }
        }

        const kvp = active.find(w => w.code === "KVP");
        if (kvp) {
          setToWarehouseId(kvp.id);
        } else if (active.length > 0) {
          setToWarehouseId(active[0].id);
        }
      }).catch(() => { });

    fetch("/api/plan-finance/stock-movements/next-code?type=nhap")
      .then((r) => r.json())
      .then((d) => {
        if (d.nextCode) setSoChungTu(d.nextCode);
      })
      .catch(() => {});
  }, [initialItems]);

  // ESC close
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  React.useEffect(() => {
    if (mode !== "po") return;
    setPoLoading(true);
    setSelectedPO(null);
    fetch("/api/plan-finance/purchasing?trangThai=received&limit=100")
      .then(r => r.json())
      .then(async d => {
        const list = Array.isArray(d.items) ? d.items : [];
        setPoList(list);
        
        const keepLines = !!(initialItems && initialItems.length > 0);
        const targetPoId = initialPurchaseOrderId || (initialItems && initialItems[0]?.purchaseOrderId);
        const targetPoCode = initialPurchaseOrderCode || (initialItems && initialItems[0]?.purchaseOrderCode);

        // 1. Tìm theo PO ID hoặc Code trực tiếp nếu có
        if (targetPoId) {
          const matchedPo = list.find((p: any) => p.id === targetPoId);
          if (matchedPo) {
            onSelectPOById(matchedPo.id, list, keepLines);
            return;
          }
        }
        if (targetPoCode) {
          const matchedPo = list.find((p: any) => p.code === targetPoCode);
          if (matchedPo) {
            onSelectPOById(matchedPo.id, list, keepLines);
            return;
          }
        }

        // 2. Tìm theo initialSoBienBanQC
        if (initialSoBienBanQC) {
          const poCodeMatch = initialSoBienBanQC.match(/(DH-\d{8}-\d{4})/);
          if (poCodeMatch) {
            const matchedPo = list.find((p: any) => p.code === poCodeMatch[1]);
            if (matchedPo) {
              onSelectPOById(matchedPo.id, list, keepLines);
              return;
            }
          }

          // Nếu là mã QC (QC-...)
          if (initialSoBienBanQC.startsWith("QC-")) {
            try {
              const qcRes = await fetch(`/api/qa/inspections?q=${encodeURIComponent(initialSoBienBanQC)}`);
              const qcD = await qcRes.json();
              if (Array.isArray(qcD) && qcD.length > 0) {
                const qcItem = qcD.find((q: any) => q.code === initialSoBienBanQC) || qcD[0];
                let meta: any = null;
                if (qcItem?.metadata) {
                  meta = typeof qcItem.metadata === "string" ? JSON.parse(qcItem.metadata) : qcItem.metadata;
                }
                const foundPoId = meta?.purchaseOrderId;
                const foundPoCode = meta?.purchaseOrderCode || meta?.poNumber;
                
                if (foundPoId || foundPoCode) {
                  const matchedPo = list.find((p: any) => (foundPoId && p.id === foundPoId) || (foundPoCode && p.code === foundPoCode));
                  if (matchedPo) {
                    onSelectPOById(matchedPo.id, list, keepLines);
                    return;
                  } else if (foundPoId) {
                    const singlePoRes = await fetch(`/api/plan-finance/purchasing/${foundPoId}`);
                    const singlePo = await singlePoRes.json();
                    if (singlePo && singlePo.id) {
                      setPoList(prev => [singlePo, ...prev]);
                      setSelectedPO(singlePo);
                      if (singlePo.shippingFee !== undefined) {
                        setChiPhiVanChuyen(Number(singlePo.shippingFee) || 0);
                      }
                      if (Array.isArray(singlePo.items) && singlePo.items.length > 0 && keepLines) {
                        setLines(prev => prev.map(l => {
                          const matchedPoItem = singlePo.items.find((it: any) => 
                            (it.inventoryItemId && it.inventoryItemId === l.item?.id) || 
                            (it.tenHang && l.itemSearch && it.tenHang.toLowerCase().trim() === l.itemSearch.toLowerCase().trim())
                          );
                          if (matchedPoItem && (!l.donGia || l.donGia === 0)) {
                            return { ...l, donGia: matchedPoItem.donGia };
                          }
                          return l;
                        }));
                      }
                      setLyDo(`Nhập kho theo đơn mua: ${singlePo.code ?? singlePo.id}`);
                    }
                  }
                }
              }
            } catch(e) {
              console.error("Lỗi liên kết PO từ biên bản QC", e);
            }
          }
        }
      })
      .catch(() => setPoList([]))
      .finally(() => setPoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialSoBienBanQC, initialPurchaseOrderId, initialPurchaseOrderCode, initialItems]);

  // Fetch pending import tasks for mode === "production" || mode === "return"
  React.useEffect(() => {
    if (mode !== "production" && mode !== "return") return;
    setWoLoading(true);
    setSelectedWO(null);
    fetch("/api/logistics/tasks/pending-import")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d.items) ? d.items : [];
        setWoList(list);
        
        let matchedWo = null;
        if (initialTaskId) {
          matchedWo = list.find((t: any) => t.id === initialTaskId);
        } else if (initialSoBienBanQC) {
          matchedWo = list.find((t: any) => t.title.includes(initialSoBienBanQC));
        }
        
        if (matchedWo) {
          onSelectWOById(matchedWo.id, list, !!(initialItems && initialItems.length > 0));
        }
      })
      .catch(() => setWoList([]))
      .finally(() => setWoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialSoBienBanQC, initialTaskId, initialItems]);

  // ── PO select ──────────────────────────────────────────────────────────────
  const onSelectPOById = async (id: string, fallbackList?: POSuggestion[], keepExistingLines?: boolean) => {
    if (!id) { 
      setSelectedPO(null); 
      if (!keepExistingLines) setLines([emptyLine()]); 
      return; 
    }
    const listToSearch = fallbackList || poList;
    const po = listToSearch.find(p => p.id === id) ?? null;
    setSelectedPO(po);
    if (!po) return;
    setPoLoading(true);
    try {
      const res = await fetch(`/api/plan-finance/purchasing/${po.id}`);
      const full = await res.json();
      if (full) {
        if (full.shippingFee !== undefined && full.shippingFee !== null) {
          setChiPhiVanChuyen(Number(full.shippingFee) || 0);
        }
        if (Array.isArray(full.items) && full.items.length > 0) {
          if (!keepExistingLines) {
            setLines(full.items.map((it: POItem) => ({
              id: uid(),
              item: it.inventoryItem
                ? { id: it.inventoryItemId!, code: it.inventoryItem.code, tenHang: it.tenHang, donVi: it.donVi ?? null, giaNhap: it.donGia }
                : null,
              itemSearch: it.tenHang,
              suggestions: [], showSugg: false,
              soLuong: it.soLuong,
              soLuongThucTe: it.soLuong, // mặc định thực tế = chứng từ
              donGia: it.donGia,
              viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
            })));
          } else {
            // Cập nhật donGia nếu lines hiện tại có donGia = 0
            setLines(prev => prev.map(l => {
              const matchedPoItem = full.items.find((it: any) => 
                (it.inventoryItemId && it.inventoryItemId === l.item?.id) || 
                (it.tenHang && l.itemSearch && it.tenHang.toLowerCase().trim() === l.itemSearch.toLowerCase().trim())
              );
              if (matchedPoItem && (!l.donGia || l.donGia === 0)) {
                return { ...l, donGia: matchedPoItem.donGia };
              }
              return l;
            }));
          }
          setLyDo(`Nhập kho theo đơn mua: ${po.code ?? po.id}`);
        }
      }
    } catch { /* giữ lines cũ */ }
    finally { setPoLoading(false); }
  };

  // ── WO / Return select ──────────────────────────────────────────────────────
  const onSelectWOById = async (taskId: string, fallbackList?: any[], keepExistingLines?: boolean) => {
    if (!taskId) {
      setSelectedWO(null);
      if (!keepExistingLines) setLines([emptyLine()]);
      return;
    }
    const listToSearch = fallbackList || woList;
    const task = listToSearch.find(t => t.id === taskId);
    setSelectedWO(task);
    if (!task) return;

    // Check if task is return / defect
    const titleLower = (task.title || "").toLowerCase();
    const isReturnTask = titleLower.includes("hàng trả lại") || 
                         titleLower.includes("trả lại") || 
                         (task.actualResult && (task.actualResult.includes("Nhập kho hàng trả lại") || task.actualResult.includes("isReturn")));
    const isRecallTask = titleLower.includes("thu hồi") || 
                         (task.actualResult && (task.actualResult.includes("Nhập kho thu hồi") || task.actualResult.includes("isRecall")));
    const isDefectTask = titleLower.includes("hàng lỗi") || 
                         titleLower.includes("kho-loi") || 
                         (task.actualResult && (task.actualResult.includes("Nhập kho hàng lỗi") || task.actualResult.includes("isDefect")));

    const matchErr = task.title.match(/(ERR-[\w-]+)/i);

    if (isReturnTask) {
      setLoaiNhapKho("Nhập kho hàng trả lại");
      setLyDo(matchErr ? `Nhập kho hàng trả lại theo hồ sơ lỗi ${matchErr[1]}` : `Nhập kho hàng trả lại: ${task.title.replace("Yêu cầu ", "")}`);
      const khoLoi = warehouses.find(w => w.code === "KHO-LOI");
      if (khoLoi) setToWarehouseId(khoLoi.id);
    } else if (isRecallTask) {
      setLoaiNhapKho("Nhập kho thu hồi");
      setLyDo(matchErr ? `Nhập kho thu hồi theo hồ sơ lỗi ${matchErr[1]}` : `Nhập kho thu hồi: ${task.title.replace("Yêu cầu ", "")}`);
      const khoKvp = warehouses.find(w => w.code === "KVP");
      if (khoKvp) setToWarehouseId(khoKvp.id);
    } else if (isDefectTask) {
      setLoaiNhapKho("Nhập kho hàng lỗi");
      setLyDo(matchErr ? `Nhập kho hàng lỗi theo hồ sơ lỗi ${matchErr[1]}` : `Nhập kho hàng lỗi: ${task.title.replace("Yêu cầu ", "")}`);
      const khoLoi = warehouses.find(w => w.code === "KHO-LOI");
      if (khoLoi) setToWarehouseId(khoLoi.id);
    } else {
      setLoaiNhapKho("Nhập từ sản xuất");
      setLyDo(`Theo yêu cầu: ${task.title.replace("Yêu cầu ", "")}`);
      const khoChinh = warehouses.find(w => w.code === "KHO-CHINH" || w.code === "KVP");
      if (khoChinh) setToWarehouseId(khoChinh.id);
    }
    
    if (task.actualResult && !keepExistingLines) {
      try {
        const parsed = JSON.parse(task.actualResult);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setResolvingItems(true);
          const resolved = await Promise.all(parsed.map(async (it: any) => {
            const rawName = typeof it.name === 'string' ? it.name : (typeof it.tenHang === 'string' ? it.tenHang : "");
            const cleanName = rawName.replace(/\s*\(x\d+\)$/, "");
            try {
              const res = await fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(cleanName)}&limit=1`);
              const data = await res.json();
              const found = Array.isArray(data) && data.length > 0 ? data[0] : null;
              return {
                id: uid(),
                item: found ? found : null,
                itemSearch: found ? found.tenHang : cleanName,
                suggestions: [],
                showSugg: false,
                soLuong: it.qty || it.soLuong || 1,
                soLuongThucTe: it.qty || it.soLuong || 1,
                donGia: found ? found.giaNhap : 0,
                viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
                bomCode: it.bomCode || it.dinhMucCode || null,
                dinhMucTen: it.dinhMucTen || null,
              } as StockLine;
            } catch (e) {
              return {
                id: uid(), item: null, itemSearch: cleanName, suggestions: [], showSugg: false,
                soLuong: it.qty || it.soLuong || 1, soLuongThucTe: it.qty || it.soLuong || 1, donGia: 0, viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
                bomCode: it.bomCode || it.dinhMucCode || null,
                dinhMucTen: it.dinhMucTen || null,
              } as StockLine;
            }
          }));
          setLines(resolved);
        }
      } catch (e) {
        console.error("Error parsing task result", e);
      } finally {
        setResolvingItems(false);
      }
    }
  };

  // ── Item search (per line) ─────────────────────────────────────────────────
  const searchTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const onItemSearch = (lineId: string, q: string) => {
    if (!q.trim()) {
      // Xoá tên → reset toàn bộ dữ liệu liên quan
      setLines(ls => ls.map(l => l.id === lineId ? {
        ...l,
        itemSearch: "", item: null, suggestions: [], showSugg: false,
        soLuong: 1, soLuongThucTe: 1, donGia: 0,
        viTriHang: "", viTriCot: "", viTriTang: "", ghiChu: "",
      } : l));
      clearTimeout(searchTimers.current[lineId]);
      return;
    }
    setLines(ls => ls.map(l => l.id === lineId ? { ...l, itemSearch: q, showSugg: true } : l));
    clearTimeout(searchTimers.current[lineId]);
    searchTimers.current[lineId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plan-finance/inventory/search?q=${encodeURIComponent(q)}&limit=8`);
        const data: ItemSuggestion[] = await res.json();
        setLines(ls => ls.map(l => l.id === lineId ? { ...l, suggestions: Array.isArray(data) ? data : [] } : l));
      } catch { /* ignore */ }
    }, 250);
  };

  const selectItem = (lineId: string, item: ItemSuggestion) =>
    setLines(ls => ls.map(l => l.id === lineId
      ? { ...l, item, itemSearch: item.tenHang, suggestions: [], showSugg: false, donGia: item.giaNhap }
      : l));

  const updateLine = <K extends keyof StockLine>(lineId: string, key: K, val: StockLine[K]) =>
    setLines(ls => ls.map(l => {
      if (l.id !== lineId) return l;
      const updated = { ...l, [key]: val };
      // Nếu đang sửa soLuong (chứng từ) và soLuongThucTe chưa bị chỉnh tay → đồng bộ theo
      if (key === "soLuong" && (l.soLuongThucTe === l.soLuong || l.soLuongThucTe === undefined)) {
        updated.soLuongThucTe = val as number;
      }
      return updated;
    }));

  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (lineId: string) =>
    setLines(ls => ls.length > 1 ? ls.filter(l => l.id !== lineId) : ls);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const validLines = lines.filter(l => l.item && (l.soLuongThucTe ?? l.soLuong) > 0);
  const tongSL = validLines.reduce((s, l) => s + (l.soLuongThucTe ?? l.soLuong), 0);
  const tongTien = validLines.reduce((s, l) => s + (l.soLuongThucTe ?? l.soLuong) * l.donGia, 0);

  // ── Save (có kiểm tra vị trí kho) ───────────────────────────────────────────
  const doSave = async () => {
    setSaving(true);
    try {
      const taskIdToComplete = initialTaskId || selectedWO?.id;
      const res = await fetch("/api/plan-finance/stock-movements/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWarehouseId,
          soChungTu: soChungTu || undefined,
          taskId: taskIdToComplete || undefined,
          purchaseOrderId: selectedPO?.id || initialPurchaseOrderId || (initialItems && initialItems[0]?.purchaseOrderId) || undefined,
          lyDo: [loaiNhapKho, lyDo, soBienBanQC ? `Số BB QC: ${soBienBanQC}` : "", ghiChu ? `Ghi chú: ${ghiChu}` : "", chiPhiVanChuyen > 0 ? `Phí vận chuyển: ${fmtVnd(chiPhiVanChuyen)}` : ""].filter(Boolean).join(" - ") || undefined,
          nguoiThucHien: nguoiThucHien || undefined,
          lines: validLines.map(l => {
            const soLuong = l.soLuongThucTe ?? l.soLuong;
            const thanhTien = soLuong * l.donGia;
            const phanBo = tongTien > 0 ? (thanhTien / tongTien) * chiPhiVanChuyen : tongSL > 0 ? (soLuong / tongSL) * chiPhiVanChuyen : 0;
            const giaVonDonVi = soLuong > 0 ? (thanhTien + phanBo) / soLuong : 0;

            return {
              inventoryItemId: l.item!.id,
              soLuong: soLuong,
              soLuongCT: l.soLuong,
              donGia: giaVonDonVi || l.donGia || undefined,
              viTriHang: l.viTriHang || undefined,
              viTriCot: l.viTriCot || undefined,
              viTriTang: l.viTriTang || undefined,
              ghiChu: l.ghiChu || undefined,
            };
          }),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Lỗi lưu"); }
      
      // Update task status if applicable
      if (taskIdToComplete) {
        try {
          await fetch(`/api/board/tasks/${taskIdToComplete}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" })
          });
        } catch (e) {
          console.error("Lỗi cập nhật task", e);
        }
      }

      // Record activity to defect record if from defect
      const taskTitle = selectedWO?.title || "";
      const matchErr = taskTitle.match(/(ERR-[\w-]+)/i);
      if (matchErr) {
        try {
          await fetch(`/api/production/defects/${matchErr[1]}/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "NHẬP KHO HÀNG TRẢ LẠI THÀNH CÔNG",
              note: `Thủ kho (${nguoiThucHien || "Kho"}) đã xác nhận nhập kho hàng trả lại ${soChungTu} vào Kho hàng lỗi (KHO-LOI).`,
              performedBy: nguoiThucHien || "Thủ kho"
            })
          });
        } catch (e) {}
      }

      toast.success("✅ Nhập kho thành công!", `Phiếu ${soChungTu} đã được xác nhận`, 5000);
      setSuccess(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("logistics-orders-updated"));
      }
      onSaved();
    } catch (e) {
      toast.error("Nhập kho thất bại", e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setSaving(false); }
  };

  const handleSave = () => {
    if (!isThuKho) { toast.error("Không có quyền", "Chỉ tài khoản Thủ kho mới có quyền nhập kho."); return; }
    if (!toWarehouseId) { toast.error("Thiếu thông tin", "Vui lòng chọn kho nhập"); return; }
    if (!validLines.length) { toast.error("Chưa có hàng hoá", "Cần ít nhất 1 dòng hàng hoá hợp lệ"); return; }
    const missingPos = validLines.some(l => !l.viTriHang && !l.viTriCot && !l.viTriTang);
    if (missingPos) { setConfirmOpen(true); } else { doSave(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="nk-modal-wrapper" style={{ position: "fixed", inset: 0, zIndex: 5000, background: "var(--background)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        /* RESPONSIVE STYLES FOR IPAD AND MOBILE ONLY */
        @media (max-width: 1024px) {
          /* Top bar layout */
          .nk-top-bar { height: auto !important; padding: 12px 16px !important; flex-wrap: wrap; }
          .nk-top-title { flex: 1; min-width: 150px; order: 1; }
          .nk-top-close { margin-left: auto !important; order: 2; }
          .nk-mode-select { margin-left: 0 !important; width: 100%; margin-top: 12px; order: 3; }
          .nk-po-select { margin-left: 0 !important; width: 100%; margin-top: 8px; order: 4; }
          .nk-top-actions-desktop { display: none !important; }
          
          /* Bottom Toolbar */
          .nk-bottom-toolbar { display: flex !important; }
          
          /* Body and Sidebar */
          .nk-body { flex-direction: column !important; }
          .nk-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border); overflow-y: auto !important; max-height: 250px; }
          
          /* Sidebar Info Grid: 2 items on one row */
          .nk-sidebar-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .nk-sidebar-full-row { grid-column: 1 / -1; }
          
          /* Right pane header */
          .nk-pane-header { flex-wrap: wrap; padding-bottom: 8px; }
          .nk-pane-totals { margin-left: 0 !important; width: 100%; justify-content: space-between !important; border-top: 1px dashed var(--border); padding-top: 8px; margin-top: 4px; }
          
          /* Table horizontal scrolling */
          .nk-table-wrapper { overflow-x: hidden !important; }
          .nk-table-inner { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-left: -20px; margin-right: -20px; padding-left: 20px; padding-right: 20px; padding-bottom: 12px; }
          .nk-table-inner > div { min-width: 1100px !important; }
        }

        /* SPECIFIC MOBILE TWEAKS */
        @media (max-width: 768px) {
          .nk-sidebar-grid { grid-template-columns: 1fr !important; }
          .nk-sidebar { max-height: none !important; }
          .nk-sidebar-collapsed { display: none !important; }
        }
      `}</style>

      {/* ═══ TOP BAR ═══════════════════════════════════════════════════════ */}
      <div className="nk-top-bar" style={{ flexShrink: 0, minHeight: 64, borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, background: "var(--card)" }}>
        {/* Left: Icon & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: "fit-content" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-box-arrow-in-down" style={{ fontSize: 20, color: "#059669" }} />
          </div>
          <div className="nk-top-title">
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--foreground)", letterSpacing: "-0.01em" }}>Phiếu nhập kho</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", fontFamily: "monospace", opacity: 0.8 }}>{soChungTu}</p>
          </div>
        </div>

        {/* Center/Right wrapper for flex distribution */}
        <div className="nk-top-actions" style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
          {/* Mode toggle */}
          <div className="nk-mode-select" style={{ display: "flex", background: "var(--muted)", padding: 4, borderRadius: 10, gap: 4, border: "1px solid rgba(0,0,0,0.05)" }}>
            {([
              { val: "manual" as const, label: "Nhập thủ công", icon: "bi-pencil" },
              { val: "po" as const, label: "Theo đơn mua", icon: "bi-file-earmark-text" },
              { val: "production" as const, label: "Thành phẩm sản xuất", icon: "bi-box-seam" },
              { val: "return" as const, label: "Hàng trả lại", icon: "bi-arrow-return-left" }
            ]).map(m => (
              <button key={m.val} onClick={() => setMode(m.val)} style={{
                display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center",
                padding: "6px 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
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

          {/* PO select */}
          {mode === "po" && (
            <div className="nk-po-select position-relative" style={{ display: "flex", alignItems: "center" }}>
              {poLoading ? (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "0 10px" }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang tải…
                </div>
              ) : (
                <div className="position-relative">
                  <select
                    value={selectedPO?.id ?? ""}
                    onChange={e => onSelectPOById(e.target.value)}
                    style={{
                      height: 38, padding: "0 36px 0 16px",
                      border: `1px solid ${selectedPO ? "rgba(16,185,129,0.4)" : "var(--border)"}`,
                      borderRadius: 10,
                      background: selectedPO ? "rgba(16,185,129,0.05)" : "var(--background)",
                      color: selectedPO ? "#059669" : "var(--foreground)",
                      fontSize: 13, fontWeight: selectedPO ? 600 : 400,
                      outline: "none", cursor: "pointer",
                      width: 280, transition: "all 0.2s",
                      appearance: "none", textOverflow: "ellipsis"
                    }}
                  >
                    <option value="">Chọn đơn mua hàng</option>
                    {poList.length === 0 && <option disabled value="">Không có đơn hàng</option>}
                    {poList.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.code ?? po.id}{po.supplier?.name ? ` — ${po.supplier.name}` : ""}
                      </option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down position-absolute" style={{ right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: selectedPO ? "#059669" : "var(--muted-foreground)" }} />
                  {selectedPO && (
                    <span className="position-absolute" style={{ top: -10, right: -10, fontSize: 10, color: "#fff", fontWeight: 600, background: "#10b981", borderRadius: 20, padding: "2px 8px", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)", zIndex: 10 }}>
                      <i className="bi bi-check" style={{ marginRight: 2 }} />Đã chọn
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* WO / Return select */}
          {(mode === "production" || mode === "return") && (
            <div className="nk-po-select position-relative" style={{ display: "flex", alignItems: "center" }}>
              {woLoading ? (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "0 10px" }}>
                  <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Đang tải…
                </div>
              ) : (
                <div className="position-relative">
                  <select
                    value={selectedWO?.id ?? ""}
                    onChange={e => onSelectWOById(e.target.value)}
                    style={{
                      height: 38, padding: "0 36px 0 16px",
                      border: `1px solid ${selectedWO ? "rgba(16,185,129,0.4)" : "var(--border)"}`,
                      borderRadius: 10,
                      background: selectedWO ? "rgba(16,185,129,0.05)" : "var(--background)",
                      color: selectedWO ? "#059669" : "var(--foreground)",
                      fontSize: 13, fontWeight: selectedWO ? 600 : 400,
                      outline: "none", cursor: "pointer",
                      width: 290, transition: "all 0.2s",
                      appearance: "none", textOverflow: "ellipsis"
                    }}
                  >
                    <option value="">
                      {mode === "return" ? "-- Chọn lệnh hàng trả lại --" : "-- Chọn lệnh chờ nhập --"}
                    </option>
                    {filteredWOList.length === 0 && (
                      <option disabled value="">
                        {mode === "return" ? "Không có lệnh hàng trả lại" : "Không có lệnh chờ nhập"}
                      </option>
                    )}
                    {filteredWOList.map(wo => (
                      <option key={wo.id} value={wo.id}>
                        {wo.title.replace("Yêu cầu ", "")}
                      </option>
                    ))}
                  </select>
                  <i className="bi bi-chevron-down position-absolute" style={{ right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: selectedWO ? "#059669" : "var(--muted-foreground)" }} />
                  {selectedWO && (
                    <span className="position-absolute" style={{ top: -10, right: -10, fontSize: 10, color: "#fff", fontWeight: 600, background: "#10b981", borderRadius: 20, padding: "2px 8px", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)", zIndex: 10 }}>
                      <i className="bi bi-check" style={{ marginRight: 2 }} />Đã chọn
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} className="d-none d-lg-block" />

          {/* Desktop Actions */}
          <div className="nk-top-actions-desktop" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {success && (
              <button onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "#10b981", background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
                <i className="bi bi-printer" style={{ fontSize: 14 }} /> In phiếu nhập kho
              </button>
            )}
            {!success && (() => {
              const canSave = !saving
                && validLines.length > 0
                && !(mode === "po" && !selectedPO)
                && isThuKho;
              return (
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  title={
                    !isThuKho ? "Chỉ tài khoản Thủ kho mới có quyền nhập kho" :
                      mode === "po" && !selectedPO ? "Vui lòng chọn đơn mua hàng" :
                        validLines.length === 0 ? "Chưa có hàng hoá nào trong bảng" : undefined
                  }
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 20px", border: "none", borderRadius: 8,
                    background: canSave ? "#10b981" : "var(--muted)",
                    color: canSave ? "#fff" : "var(--muted-foreground)",
                    fontSize: 13, fontWeight: 700,
                    cursor: canSave ? "pointer" : "not-allowed",
                    opacity: canSave ? 1 : 0.6,
                    transition: "all 0.15s",
                    whiteSpace: "nowrap"
                  }}
                >
                  {saving
                    ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} />
                    : <i className="bi bi-check2-all" style={{ fontSize: 14 }} />}
                  Xác nhận
                </button>
              );
            })()}

            <button onClick={() => setShowLichSu(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
              <i className="bi bi-clock-history" style={{ fontSize: 14 }} /> Lịch sử
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} className="d-none d-lg-block" />

          {/* Close Button Top Right */}
          <button onClick={onClose} className="nk-top-close" style={{ width: 36, height: 36, border: "none", background: "var(--muted)", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", transition: "all 0.2s" }}>
            <i className="bi bi-x-lg" style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {/* ═══ BODY: sidebar trái + nội dung phải ══════════════════════════ */}
      <div className="nk-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR TRÁI: Thông tin phiếu ─────────────────────────────── */}
        <div className="nk-sidebar" style={{
          width: 272,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>



          {/* Form fields */}
          <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>

            {/* Header nhóm (Clickable on mobile) */}
            <div 
              className="nk-sidebar-header-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--border)", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-receipt" style={{ fontSize: 13, color: "#10b981" }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 13, color: "var(--foreground)" }}>Thông tin phiếu</span>
              </div>
              <i className={`bi bi-chevron-${isSidebarOpen ? 'up' : 'down'} d-md-none`} style={{ fontSize: 14, color: "var(--muted-foreground)" }} />
            </div>

            <div className={`nk-sidebar-content ${!isSidebarOpen ? 'nk-sidebar-collapsed' : ''}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="nk-sidebar-grid" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Số phiếu */}
              <div>
                <label style={CSS.label}>Số phiếu nhập</label>
                <input
                  value={soChungTu}
                  readOnly
                  style={{
                    ...CSS.input,
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                    cursor: "default",
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                />
              </div>

              {/* Số biên bản QC */}
              <div>
                <label style={CSS.label}>Số biên bản QC</label>
                <input
                  value={soBienBanQC}
                  onChange={e => setSoBienBanQC(e.target.value)}
                  placeholder="Nhập số BB QC (nếu có)"
                  style={CSS.input}
                />
              </div>

              {/* Thời gian */}
              <div>
                <label style={CSS.label}>Thời gian</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Date input */}
                  <input
                    type="date"
                    value={ngayNhap}
                    min={lockDate ? new Date().toISOString().slice(0, 10) : undefined}
                    max={lockDate ? new Date().toISOString().slice(0, 10) : undefined}
                    onChange={e => !lockDate && setNgayNhap(e.target.value)}
                    readOnly={lockDate}
                    style={{
                      ...CSS.input,
                      flex: 1,
                      cursor: lockDate ? "not-allowed" : "text",
                      opacity: lockDate ? 0.7 : 1,
                      background: lockDate ? "var(--muted)" : CSS.input.background,
                    }}
                  />
                  {/* iOS-style switch */}
                  <label
                    title={lockDate ? "Khoá ngày hôm nay — nhấn để mở" : "Đang mở — nhấn để khoá"}
                    style={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
                  >
                    <span
                      onClick={() => setLockDate(v => !v)}
                      style={{
                        position: "relative", display: "inline-block",
                        width: 34, height: 18, borderRadius: 9, flexShrink: 0,
                        background: lockDate ? "#10b981" : "var(--border)",
                        transition: "background 0.2s",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{
                        position: "absolute",
                        top: 2, left: lockDate ? 18 : 2,
                        width: 14, height: 14, borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                        transition: "left 0.2s",
                      }} />
                    </span>
                  </label>
                </div>
              </div>

              {/* Loại nhập kho */}
              <div>
                <label style={CSS.label}>Loại nhập kho</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={loaiNhapKho}
                    onChange={e => !success && setLoaiNhapKho(e.target.value)}
                    disabled={success}
                    style={{ ...CSS.input, appearance: "none", opacity: success ? 0.65 : 1, cursor: success ? "not-allowed" : "pointer" }}
                  >
                    <option value="Nhập mua hàng">Nhập mua hàng</option>
                    <option value="Nhập từ sản xuất">Nhập từ sản xuất</option>
                    <option value="Nhập kho thu hồi">Nhập kho thu hồi</option>
                    <option value="Nhập kho hàng lỗi">Nhập kho hàng lỗi</option>
                    <option value="Nhập kho hàng trả lại">Nhập kho hàng trả lại</option>
                    <option value="Nhập hàng hoàn trả">Nhập hàng hoàn trả</option>
                    <option value="Nhập nội bộ">Nhập nội bộ</option>
                    <option value="Khác">Khác</option>
                  </select>
                  <i className="bi bi-chevron-down position-absolute" style={{ right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: "var(--muted-foreground)" }} />
                </div>
              </div>

              {/* Kho nhập */}
              <div>
                <label style={CSS.label}>Kho nhập <span style={{ color: "#f43f5e" }}>*</span></label>
                <select
                  value={toWarehouseId}
                  onChange={e => !success && setToWarehouseId(e.target.value)}
                  disabled={success}
                  style={{ ...CSS.input, appearance: "none", borderColor: toWarehouseId ? "rgba(16,185,129,0.5)" : "var(--border)", opacity: success ? 0.65 : 1, cursor: success ? "not-allowed" : "pointer" }}
                >
                  <option value="">Chọn kho</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Chi phí vận chuyển */}
              <div>
                <label style={CSS.label}>Chi phí vận chuyển (đ)</label>
                <CurrencyInput
                  value={chiPhiVanChuyen}
                  onChange={v => !success && setChiPhiVanChuyen(v)}
                  readOnly={success}
                  placeholder="0"
                  style={{ ...CSS.input, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
                />
              </div>

              {/* Người thực hiện */}
              <div>
                <label style={CSS.label}>Người thực hiện</label>
                <input
                  value={nguoiThucHien}
                  onChange={e => !success && setNguoiThucHien(e.target.value)}
                  readOnly={success}
                  placeholder="Tên thủ kho / người nhập"
                  style={{ ...CSS.input, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
                />
              </div>
            </div>

            {/* Lý do */}
            <div className="nk-sidebar-full-row">
              <label style={CSS.label}>Lý do nhập kho</label>
              <textarea
                value={lyDo}
                onChange={e => !success && setLyDo(e.target.value)}
                readOnly={success}
                rows={2}
                style={{ ...CSS.input, resize: success ? "none" : "vertical", lineHeight: 1.5, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
              />
            </div>

            {/* Ghi chú — chiếm hết không gian còn lại */}
            <div className="nk-sidebar-full-row" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <label style={CSS.label}>Ghi chú</label>
              <textarea
                value={ghiChu}
                onChange={e => !success && setGhiChu(e.target.value)}
                readOnly={success}
                placeholder="Ghi chú thêm..."
                style={{ ...CSS.input, flex: 1, resize: "none", lineHeight: 1.5, opacity: success ? 0.65 : 1, cursor: success ? "default" : "text" }}
              />
            </div>
          </div>
          </div>
        </div>


        {/* ── NỘI DUNG PHẢI: Bảng hàng hoá ──────────────────────────────── */}
        <div className="nk-table-wrapper" style={{ flex: 1, overflowY: !toWarehouseId ? "hidden" : "auto", padding: "16px 20px 24px", position: "relative" }}>

          {/* Overlay khi chưa chọn kho */}
          {!toWarehouseId && (
            <div style={{ position: "absolute", inset: 0, zIndex: 10, backdropFilter: "blur(3px)", background: "color-mix(in srgb, var(--background) 60%, transparent)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-box-seam" style={{ fontSize: 24, color: "#3b82f6" }} />
              </div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "var(--foreground)" }}>Chọn kho nhập để bắt đầu</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
                Vui lòng chọn <b>Kho nhập</b> ở bảng thông tin bên trái<br />để có thể chọn hàng hoá cần nhập kho.
              </p>
            </div>
          )}

          {/* Tiêu đề bảng */}
          <div className="nk-pane-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Danh sách hàng hoá nhập kho</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 20, padding: "2px 10px" }}>
              {lines.length} dòng
            </span>
            {mode === "po" && selectedPO && (
              <span style={{ fontSize: 11, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>
                <i className="bi bi-link-45deg" /> Từ PO: {selectedPO.code}
              </span>
            )}
            {/* Summary tổng — căn phải */}
            <div className="nk-pane-totals" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tổng SL</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981", lineHeight: 1.2 }}>{tongSL.toLocaleString("vi-VN")}</div>
              </div>
              <div style={{ width: 1, height: 28, background: "var(--border)" }} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá trị</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981", lineHeight: 1.2 }}>*** ₫</div>
              </div>
            </div>
          </div>

          <div className="nk-table-inner">
            {/* Table header — 2 dòng, merge cột SL + merge cột Vị trí */}
            <div style={{ background: "var(--muted)", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
            {/* Dòng 1: nhãn nhóm */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 60px 140px 180px 100px 100px 100px 32px",
              gap: 5, padding: "6px 10px 0",
              fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <div>#</div>
              <div>Hàng hoá</div>
              <div style={{ textAlign: "center" }}>ĐVT</div>
              {/* merge 2 cột SL */}
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>
                Số lượng nhập
              </div>
              {/* merge 3 cột Vị trí */}
              <div style={{ textAlign: "center", borderBottom: "2px solid var(--border)", paddingBottom: 3, fontSize: 10.5 }}>
                Vị trí trong kho
              </div>
              <div style={{ textAlign: "right" }}>Đơn giá (₫)</div>
              <div style={{ textAlign: "right", color: "#8b5cf6" }}>Giá vốn (₫)</div>
              <div style={{ textAlign: "right" }}>Thành tiền</div>
              <div />
            </div>
            {/* Dòng 2: sub-label */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 60px 70px 70px 60px 60px 60px 100px 100px 100px 32px",
              gap: 5, padding: "2px 10px 6px",
              fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              <div /><div /><div />
              <div style={{ textAlign: "center", opacity: 0.75 }}>Theo CT</div>
              <div style={{ textAlign: "center", opacity: 0.9 }}>Thực tế</div>
              <div style={{ textAlign: "center", opacity: 0.75 }}>Hàng</div>
              <div style={{ textAlign: "center", opacity: 0.75 }}>Cột</div>
              <div style={{ textAlign: "center", opacity: 0.75 }}>Tầng</div>
              <div /><div /><div /><div />
            </div>
          </div>


          {/* Lines */}
          <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px" }}>
            {lines.map((line, idx) => (
              <LineRow key={line.id} line={line} idx={idx}
                tongTien={tongTien} tongSL={tongSL} chiPhiVanChuyen={chiPhiVanChuyen}
                onItemSearch={q => onItemSearch(line.id, q)}
                onSelectItem={item => selectItem(line.id, item)}
                onUpdate={(key, val) => updateLine(line.id, key, val)}
                onRemove={() => removeLine(line.id)}
                canRemove={lines.length > 1}
                locked={success}
              />
            ))}
            <div style={{ padding: "8px 10px", borderTop: "1px dashed var(--border)" }}>
              {!success ? (
                <button onClick={addLine}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#10b981"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderWidth: "1.5px", borderStyle: "dashed", borderColor: "var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: "pointer", transition: "all 0.15s" }}>
                  <i className="bi bi-plus-lg" style={{ fontSize: 13 }} /> Thêm dòng hàng hoá
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, padding: "4px 4px" }}>
                  <i className="bi bi-lock-fill" style={{ fontSize: 11, color: "#10b981" }} />
                  Danh sách đã khoá sau khi xác nhận nhập kho
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM TOOLBAR (MOBILE ONLY) ════════════════════════════════════ */}
      <div className="nk-bottom-toolbar" style={{ display: "none", padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--card)", gap: 8, flexShrink: 0 }}>
        {success && (
          <button onClick={() => setShowPreview(true)} style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", gap: 6, padding: "10px 16px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "#10b981", background: "rgba(16,185,129,0.1)", color: "#10b981", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
            <i className="bi bi-printer" style={{ fontSize: 14 }} /> In phiếu
          </button>
        )}
        {!success && (() => {
          const canSave = !saving && validLines.length > 0 && !(mode === "po" && !selectedPO) && isThuKho;
          return (
            <button onClick={handleSave} disabled={!canSave}
              title={!isThuKho ? "Chỉ tài khoản Thủ kho mới có quyền nhập kho" : undefined}
              style={{
                display: "flex", flex: 2, justifyContent: "center", alignItems: "center", gap: 6,
                padding: "10px 20px", border: "none", borderRadius: 8,
                background: canSave ? "#10b981" : "var(--muted)",
                color: canSave ? "#fff" : "var(--muted-foreground)",
                fontSize: 13, fontWeight: 700,
                cursor: canSave ? "pointer" : "not-allowed", opacity: canSave ? 1 : 0.6, transition: "all 0.15s",
              }}
            >
              {saving ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-check2-all" style={{ fontSize: 14 }} />}
              Xác nhận
            </button>
          );
        })()}
        <button onClick={() => setShowLichSu(true)} style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", gap: 6, padding: "10px 16px", borderWidth: "1.5px", borderStyle: "solid", borderColor: "var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
          <i className="bi bi-clock-history" style={{ fontSize: 14 }} /> Lịch sử
        </button>
      </div>

      {/* Confirm khi thiếu vị trí kho */}
      <ConfirmDialog
        open={confirmOpen}
        variant="warning"
        title="Chưa nhập vị trí hàng trong kho"
        message="Một số mặt hàng chưa có thông tin Hàng / Cột / Tầng. Bạn vẫn muốn xác nhận nhập kho?"
        confirmLabel="Vẫn nhập kho"
        cancelLabel="Quay lại nhập vị trí"
        loading={saving}
        onConfirm={() => { setConfirmOpen(false); doSave(); }}
        onCancel={() => setConfirmOpen(false)}
      />
      {/* Preview phieu nhap kho */}
      {showPreview && (
        <PhieuNhapKhoPreview
          soChungTu={soChungTu}
          ngayNhap={ngayNhap}
          khoName={warehouses.find(w => w.id === toWarehouseId)?.name ?? "—"}
          lyDo={lyDo || undefined}
          nguoiThucHien={nguoiThucHien || undefined}
          lines={validLines.map(l => ({
            tenHang: l.item!.tenHang,
            maSku: l.item!.code,
            donVi: l.item!.donVi,
            soLuongCT: l.soLuong,
            soLuong: l.soLuongThucTe ?? l.soLuong,
            donGia: l.donGia,
            viTriHang: l.viTriHang || undefined,
            viTriCot: l.viTriCot || undefined,
            viTriTang: l.viTriTang || undefined,
            ghiChu: l.ghiChu || undefined,
            bomCode: l.bomCode || undefined,
            dinhMucTen: l.dinhMucTen || undefined,
          }))}
          onClose={() => setShowPreview(false)}
        />
      )}
      {showLichSu && (
        <LichSuNhapKhoOffcanvas onClose={() => setShowLichSu(false)} />
      )}
    </div>
  );
}

// ── LineRow ───────────────────────────────────────────────────────────────────
function LineRow({ line, idx, onItemSearch, onSelectItem, onUpdate, onRemove, canRemove, locked, tongTien, tongSL, chiPhiVanChuyen }: {
  line: StockLine; idx: number;
  onItemSearch: (q: string) => void;
  onSelectItem: (item: ItemSuggestion) => void;
  onUpdate: <K extends keyof StockLine>(key: K, val: StockLine[K]) => void;
  onRemove: () => void;
  canRemove: boolean;
  locked?: boolean;
  tongTien: number;
  tongSL: number;
  chiPhiVanChuyen: number;
}) {
  const cellInput: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)",
    borderRadius: 6, fontSize: 12.5, background: locked ? "var(--muted)" : "var(--background)",
    color: locked ? "var(--muted-foreground)" : "var(--foreground)",
    outline: "none", boxSizing: "border-box",
    cursor: locked ? "default" : "text",
  };
  const soLuong = line.soLuongThucTe ?? line.soLuong;
  const thanhTien = soLuong * line.donGia;
  const phanBo = tongTien > 0 ? (thanhTien / tongTien) * chiPhiVanChuyen : tongSL > 0 ? (soLuong / tongSL) * chiPhiVanChuyen : 0;
  const giaVonDonVi = soLuong > 0 ? (thanhTien + phanBo) / soLuong : 0;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px 1fr 60px 70px 70px 60px 60px 60px 100px 100px 100px 32px",
      gap: 5, padding: "7px 10px",
      borderTop: idx === 0 ? "none" : "1px solid var(--border)",
      alignItems: "center",
      background: line.item ? "var(--background)" : `color-mix(in srgb, var(--muted) 20%, var(--background))`,
    }}>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 600 }}>{idx + 1}</div>

      {/* Item search */}
      <div style={{ minWidth: 0 }}>
        <div style={{ position: "relative" }}>
          <input value={line.itemSearch}
            onChange={e => !locked && onItemSearch(e.target.value)}
            onFocus={() => { if (line.itemSearch && !locked) onUpdate("showSugg", true); }}
            readOnly={locked}
            placeholder="Tìm hoặc nhập tên hàng..." style={{ ...cellInput, paddingRight: line.item ? 26 : 8, borderColor: line.item ? "rgba(16,185,129,0.4)" : "var(--border)" }} />
          {line.item && <i className="bi bi-check-circle-fill" style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#10b981", pointerEvents: "none" }} />}
          {line.showSugg && line.suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 200, background: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", borderRadius: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto" }}>
              {line.suggestions.map(s => (
                <div key={s.id} onClick={() => onSelectItem(s)}
                  style={{ padding: "7px 11px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.tenHang}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{s.code ?? ""} · {s.donVi ?? ""} · {s.giaNhap > 0 ? s.giaNhap.toLocaleString("vi-VN") + " ₫" : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {(line.bomCode || line.dinhMucTen) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4, paddingLeft: 2 }}>
            {line.bomCode && (
              <span style={{ 
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10.5, fontWeight: 700, 
                color: "#2563eb", background: "rgba(37,99,235,0.08)", 
                border: "1px solid rgba(37,99,235,0.2)",
                padding: "1px 6px", borderRadius: 4 
              }}>
                <i className="bi bi-diagram-3" style={{ fontSize: 10 }} />
                {line.bomCode}
              </span>
            )}
            {line.dinhMucTen && (
              <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic", lineHeight: 1.2 }}>
                {line.dinhMucTen}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ĐVT */}
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>{line.item?.donVi ?? "—"}</div>

      {/* SL theo chứng từ */}
      <input
        type="number" min={0}
        value={line.soLuong}
        onChange={e => !locked && onUpdate("soLuong", Math.max(0, parseFloat(e.target.value) || 0))}
        readOnly={locked}
        style={{ ...cellInput, textAlign: "center", background: locked ? "var(--muted)" : "color-mix(in srgb, var(--muted) 60%, var(--background))", color: "var(--muted-foreground)" }}
        title="Số lượng theo chứng từ"
      />

      {/* SL thực tế nhập */}
      <input
        type="number" min={0}
        value={line.soLuongThucTe ?? line.soLuong}
        onChange={e => !locked && onUpdate("soLuongThucTe", Math.max(0, parseFloat(e.target.value) || 0))}
        readOnly={locked}
        style={{
          ...cellInput, textAlign: "center",
          borderColor: !locked && (line.soLuongThucTe ?? line.soLuong) !== line.soLuong ? "#f59e0b" : "var(--border)",
          fontWeight: !locked && (line.soLuongThucTe ?? line.soLuong) !== line.soLuong ? 700 : 400,
          color: locked ? "var(--muted-foreground)" : (line.soLuongThucTe ?? line.soLuong) !== line.soLuong ? "#f59e0b" : "var(--foreground)",
        }}
        title="Số lượng thực tế nhập kho"
      />

      {/* Vị trí kho */}
      <input placeholder="Hàng" value={line.viTriHang} onChange={e => !locked && onUpdate("viTriHang", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Hàng" />
      <input placeholder="Cột" value={line.viTriCot} onChange={e => !locked && onUpdate("viTriCot", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Cột" />
      <input placeholder="Tầng" value={line.viTriTang} onChange={e => !locked && onUpdate("viTriTang", e.target.value)} readOnly={locked} style={{ ...cellInput, textAlign: "center" }} title="Tầng" />

      {/* Đơn giá */}
      <div style={{ ...cellInput, textAlign: "right", background: locked ? "var(--muted)" : "var(--background)", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        ***
      </div>

      {/* Giá vốn */}
      <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--muted-foreground)" }}>
        ***
      </div>

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
