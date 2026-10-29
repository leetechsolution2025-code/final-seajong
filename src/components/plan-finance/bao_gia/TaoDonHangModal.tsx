"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { genDocCode } from "@/lib/genDocCode";
import { 
  Button, 
  Avatar, 
  FullWidthTable, 
  Offcanvas, 
  ConfirmDialog,
  Input,
  Select,
  Toggle,
} from "@/components/common";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CustomerRow = {
  id: string;
  name: string;
  nhom: string | null;
  nguon: string | null;
  dienThoai: string | null;
  email: string | null;
  address: string | null;
  daiDien: string | null;
  xungHo: string | null;
  chucVu: string | null;
  ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: number;
  ten: string;
  dvt: string;
  soLuong: number;
  donGia: number;
  ckPct: number;
  soLuongTon: number | null;
  trangThaiKho: string | null;
  inventoryId: string | null;
  imageUrl?: string | null;
  code?: string | null;
  dinhMucs?: any[];
  dinhMucId?: string | null;
  dinhMucTen?: string | null;
  bomCode?: string | null;
  khoTen?: string | null;
  source?: string;
  loiNhuanKyVong?: number;
  phuongPhapTinhLoiNhuan?: string;
  baseGiaBan?: number;
};

// Helper: number to words (VND)
export function numberToVNWords(n: number): string {
  if (n === 0) return "Không đồng";
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
  function readHundred(h: number): string {
    const c = Math.floor(h / 100), t = Math.floor((h % 100) / 10), u = h % 10;
    let r = c > 0 ? ones[c] + " trăm" : "";
    if (t === 1) r += (r ? " " : "") + teens[u];
    else if (t > 1) r += (r ? " " : "") + ones[t] + " mươi" + (u > 0 ? " " + (u === 5 ? "lăm" : ones[u]) : "");
    else if (u > 0 && c > 0) r += " lẻ " + ones[u];
    else if (u > 0) r += ones[u];
    return r;
  }
  const groups = [
    { v: 1_000_000_000, s: "tỷ" }, { v: 1_000_000, s: "triệu" },
    { v: 1_000, s: "nghìn" }, { v: 1, s: "" },
  ];
  let result = "", num = Math.round(n);
  for (const g of groups) {
    const q = Math.floor(num / g.v);
    if (q > 0) {
      result += (result ? " " : "") + readHundred(q) + (g.s ? " " + g.s : "");
      num %= g.v;
    }
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 13,
  outline: "none",
  borderRadius: 8,
  fontFamily: "inherit",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const FLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

const calculateBomPrice = (dm: any, baseGiaBan: number, margin: number, method: string) => {
  if (!dm) return baseGiaBan;
  if (dm.giaBan > 0) return dm.giaBan;
  if (dm.vatTu && dm.vatTu.length > 0) {
    const totalCost = dm.vatTu.reduce((acc: number, vt: any) => acc + (vt.soLuong * (vt.inventoryItem?.giaNhap || 0)), 0);
    if (margin > 0 && totalCost > 0) {
      if (method === 'revenue' && margin < 100) {
        return Math.round(totalCost / (1 - margin / 100));
      } else {
        return Math.round(totalCost * (1 + margin / 100));
      }
    }
    if (totalCost > 0) return totalCost;
  }
  return baseGiaBan;
};

// ── Main TaoDonHangModal Component ──────────────────────────────────────────
export function TaoDonHangModal({ open, onClose, customer, onSaved, type = "agency", editOrder, mode = "order" }: {
  open: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
  onSaved?: () => void;
  type?: string;
  editOrder?: any;
  mode?: "order" | "quotation";
}) {
  const isQuotation = mode === "quotation";
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN" || user?.role?.toUpperCase() === "SUPERADMIN";
  const isKinhDoanh = Boolean(
    user?.employee?.departmentName?.toLowerCase().includes("kinh doanh") ||
    user?.employee?.departmentCode === "KD" ||
    isAdmin
  );

  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const defaultNgayLap = fmtDate(today);

  const [info, setInfo] = React.useState({
    soPhieu: isQuotation ? "BG-Tự động tạo" : "DBH-Tự động tạo",
    ngayLap: defaultNgayLap,
    ngayGiaoHang: defaultNgayLap,
    tenNguoiNhan: "",
    sdtNguoiNhan: "",
    diaChiGiaoHang: "",
    ghiChu: "",
    chietKhauTong: 0,
    thue: 0,
    chiPhiKhac: 0,
    daThanhToan: 0,
    isChuyenKhoan: true,
  });

  const [expandedBOMRows, setExpandedBOMRows] = React.useState<Record<number, boolean>>({});

  const [showInfoSidebar, setShowInfoSidebar] = React.useState(false);
  const [showBomMenu, setShowBomMenu] = React.useState(false);

  const [custInfo, setCustInfo] = React.useState({
    id: customer?.id || "",
    name: customer?.name || "",
    dienThoai: customer?.dienThoai || "",
    address: customer?.address || "",
    nhom: customer?.nhom || "ca-nhan",
    nguon: customer?.nguon || null,
  });

  // Sync customer details when passed
  React.useEffect(() => {
    if (customer && !editOrder) {
      setCustInfo({
        id: customer.id || "",
        name: customer.name || "",
        dienThoai: customer.dienThoai || "",
        address: customer.address || "",
        nhom: customer.nhom || "ca-nhan",
        nguon: customer.nguon || null,
      });
      setInfo(prev => ({
        ...prev,
        soPhieu: isQuotation ? "BG-Tự động tạo" : "DBH-Tự động tạo",
        tenNguoiNhan: customer.name || prev.tenNguoiNhan || "",
        sdtNguoiNhan: customer.dienThoai || prev.sdtNguoiNhan || "",
        diaChiGiaoHang: customer.address || prev.diaChiGiaoHang || "",
      }));
    }
  }, [customer, editOrder, isQuotation]);

  React.useEffect(() => {
    if (open && editOrder) {
      let rawGhiChu = editOrder.ghiChu || "";
      let tenNguoiNhan = "";
      let sdtNguoiNhan = "";
      let diaChiGiaoHang = "";

      const guestMatch = rawGhiChu.match(/\[GuestInfo:(.*?)\]/);
      if (guestMatch) {
        try {
          const parsed = JSON.parse(guestMatch[1]);
          tenNguoiNhan = parsed.name || tenNguoiNhan;
          sdtNguoiNhan = parsed.dienThoai || sdtNguoiNhan;
          diaChiGiaoHang = parsed.address || diaChiGiaoHang;
          rawGhiChu = rawGhiChu.replace(/\[GuestInfo:.*?\]\n?/, "");
        } catch (e) { }
      }

      const lines = rawGhiChu.split("\n");
      const remainingLines = [];
      let chiPhiKhac = 0;
      let parsedDaThanhToan = editOrder.daThanhToan || 0;
      for (const line of lines) {
        if (line.startsWith("Tên khách hàng: ")) { tenNguoiNhan = line.replace("Tên khách hàng: ", ""); continue; }
        if (line.startsWith("Số điện thoại: ")) { sdtNguoiNhan = line.replace("Số điện thoại: ", ""); continue; }
        if (line.startsWith("Địa chỉ giao hàng: ")) { diaChiGiaoHang = line.replace("Địa chỉ giao hàng: ", ""); continue; }
        if (line.startsWith("Chi phí khác: ")) {
          const match = line.replace("Chi phí khác: ", "").replace(/\D/g, "");
          if (match) chiPhiKhac = Number(match);
          continue;
        }
        if (line.startsWith("Đã trả trước: ")) {
          const match = line.replace("Đã trả trước: ", "").replace(/\D/g, "");
          if (match) parsedDaThanhToan = Number(match);
          continue;
        }
        remainingLines.push(line);
      }
      rawGhiChu = remainingLines.join("\n").trim();

      setInfo(prev => ({
        ...prev,
        soPhieu: editOrder.code || editOrder.id || prev.soPhieu || "DBH-Tự động tạo",
        ngayLap: editOrder.ngayDat ? new Date(editOrder.ngayDat).toISOString().split("T")[0] : prev.ngayLap,
        ngayGiaoHang: editOrder.ngayGiao ? new Date(editOrder.ngayGiao).toISOString().split("T")[0] : prev.ngayGiaoHang,
        ghiChu: rawGhiChu || prev.ghiChu || "",
        tenNguoiNhan: tenNguoiNhan || editOrder.nguoiNhan || editOrder.customer?.name || prev.tenNguoiNhan || "",
        sdtNguoiNhan: sdtNguoiNhan || editOrder.soDienThoai || editOrder.customer?.dienThoai || prev.sdtNguoiNhan || "",
        diaChiGiaoHang: diaChiGiaoHang || editOrder.diaChiGiaoHang || editOrder.customer?.address || prev.diaChiGiaoHang || "",
        chiPhiKhac: editOrder.chiPhiKhac || chiPhiKhac || 0,
        chietKhauTong: editOrder.discount || 0,
        thue: editOrder.vat || 0,
        daThanhToan: parsedDaThanhToan || 0
      }));
      if (editOrder.customer) {
        setCustInfo({
          id: editOrder.customer.id || "",
          name: editOrder.customer.name || "",
          dienThoai: editOrder.customer.dienThoai || "",
          address: editOrder.customer.address || "",
          nhom: editOrder.customer.nhom || "ca-nhan",
          nguon: editOrder.customer.nguon || null,
        });
      }
      if (editOrder.items && editOrder.items.length > 0) {
        setItems(editOrder.items.map((it: any) => ({
          id: nextId.current++,
          ten: it.tenHang || "",
          dvt: it.donVi || "cái",
          soLuong: Number(it.soLuong) || 1,
          donGia: Number(it.donGia) || 0,
          ckPct: (() => {
            const tongGia = (Number(it.soLuong) || 1) * (Number(it.donGia) || 0);
            if (tongGia > 0 && it.thanhTien !== undefined) {
              const ckAmount = tongGia - Number(it.thanhTien);
              if (ckAmount > 0) return Math.round((ckAmount / tongGia) * 100);
            }
            return 0;
          })(),
          soLuongTon: null,
          trangThaiKho: null,
          inventoryId: null,
          code: null,
          khoTen: (() => {
            try { return JSON.parse(it.ghiChu || "{}").khoTen || ""; } catch { return ""; }
          })(),
          dinhMucId: (() => {
            try { return JSON.parse(it.ghiChu || "{}").dinhMucId || it.dinhMucId || null; } catch { return it.dinhMucId || null; }
          })(),
          dinhMucTen: (() => {
            try { return JSON.parse(it.ghiChu || "{}").dinhMucTen || null; } catch { return null; }
          })(),
          bomCode: (() => {
            try { return JSON.parse(it.ghiChu || "{}").bomCode || null; } catch { return null; }
          })()
        })));
      }
    }
  }, [open, editOrder]);

  const [debtInfo, setDebtInfo] = React.useState<{ outstandingDebt: number; creditLimit: number } | null>(null);
  const [isCustomerNew, setIsCustomerNew] = React.useState(true);

  // Fetch outstanding debt & credit limit info
  React.useEffect(() => {
    if (!open) return;
    if (custInfo.id) {
      setIsCustomerNew(false);
      fetch(`/api/plan-finance/customers/${custInfo.id}`)
        .then(async res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data) {
            setDebtInfo({
              outstandingDebt: data.outstandingDebt || 0,
              creditLimit: data.creditLimit || 0
            });
          } else {
            setDebtInfo(null);
          }
        })
        .catch(() => {
          setDebtInfo(null);
        });
    } else {
      setDebtInfo(null);
    }
  }, [custInfo.id, open]);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const nextId = React.useRef(1);
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [formItem, setFormItem] = React.useState<OrderItem>({
    id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: ""
  });

  const initialDonGiaRef = React.useRef<number>(0);



  const [showBomDetail, setShowBomDetail] = React.useState(false);
  const [bomDetailData, setBomDetailData] = React.useState<any>(null);
  const [originalBomData, setOriginalBomData] = React.useState<any>(null);
  const [newBomDescription, setNewBomDescription] = React.useState("");
  const [savingNewBom, setSavingNewBom] = React.useState(false);
  const [loadingBom, setLoadingBom] = React.useState(false);
  const [altSearch, setAltSearch] = React.useState("");
  const [swapSearchMode, setSwapSearchMode] = React.useState<"exact" | "group">("group");
  const [previewCode, setPreviewCode] = React.useState("");
  const [confirmDeleteBom, setConfirmDeleteBom] = React.useState(false);
  const [isDeletingBom, setIsDeletingBom] = React.useState(false);

  const handleDeleteBom = async () => {
    if (!formItem.dinhMucId) return;
    setIsDeletingBom(true);
    try {
      const res = await fetch(`/api/production/bom/${formItem.dinhMucId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete BOM");
      
      const newDinhMucs = (formItem.dinhMucs || []).filter((d: any) => d.id !== formItem.dinhMucId);
      const standardDm = newDinhMucs.length > 0 ? newDinhMucs[0] : null;
      
      setFormItem((prev: any) => ({
        ...prev,
        dinhMucs: newDinhMucs,
        dinhMucId: standardDm ? standardDm.id : null,
        dinhMucTen: standardDm ? standardDm.tenDinhMuc : null,
        code: standardDm ? standardDm.code : prev.code,
        donGia: standardDm ? (standardDm.giaBan ?? 0) : prev.donGia
      }));
      setConfirmDeleteBom(false);
      toast.success("Xoá thành công", "Đã xoá định mức khỏi hệ thống");
    } catch (e) {
      console.error(e);
      toast.error("Lỗi xoá định mức", "Không thể xoá định mức này");
    } finally {
      setIsDeletingBom(false);
    }
  };

  const activeDm = formItem.dinhMucs?.find((x: any) => x.id === formItem.dinhMucId);
  const isStandardBom = activeDm ? !/-[0-9]+$/.test(activeDm.code) : true;

  const hasBomChanged = React.useMemo(() => {
    if (!originalBomData || !bomDetailData) return false;
    const origStr = originalBomData.vatTu?.map((v: any) => `${v.inventoryItemId || v.material?.id || 'unknown'}:${v.soLuong}`).join(",") || "";
    const currStr = bomDetailData.vatTu?.map((v: any) => `${v.inventoryItemId || v.material?.id || 'unknown'}:${v.soLuong}`).join(",") || "";
    return origStr !== currStr;
  }, [originalBomData, bomDetailData]);

  const getGiaNhap = (vt: any) => {
    return Number(vt?.material?.giaNhap || vt?.inventoryItem?.giaNhap || vt?.giaNhap || 0);
  };

  const totalBomCost = React.useMemo(() => {
    if (!bomDetailData || !bomDetailData.vatTu) return 0;
    return bomDetailData.vatTu.reduce((acc: number, vt: any) => acc + getGiaNhap(vt) * (vt.soLuong || 0), 0);
  }, [bomDetailData]);

  const proposedDonGia = React.useMemo(() => {
    if (!originalBomData || !hasBomChanged) return formItem.donGia;
    const origCost = originalBomData.vatTu?.reduce((acc: number, vt: any) => acc + getGiaNhap(vt) * (vt.soLuong || 0), 0) || 0;
    
    // If origCost is 0, fallback to a 30% margin
    const ratio = origCost > 0 ? (initialDonGiaRef.current / origCost) : 1.3;
    
    // If initialDonGiaRef.current was 0 for some reason, and we have a cost, just use cost * 1.3
    if (initialDonGiaRef.current === 0 && totalBomCost > 0) {
      return Math.round(totalBomCost * 1.3);
    }
    
    return Math.round(totalBomCost * ratio);
  }, [hasBomChanged, totalBomCost, originalBomData, formItem.donGia]);

  React.useEffect(() => {
    if (hasBomChanged && originalBomData?.code) {
      fetch(`/api/production/bom/next-code?originalCode=${originalBomData.code}`)
        .then(res => res.json())
        .then(data => {
          if (data.nextCode) setPreviewCode(data.nextCode);
        })
        .catch(console.error);
    } else {
      setPreviewCode("");
    }
  }, [hasBomChanged, originalBomData?.code]);

  const [showAlternative, setShowAlternative] = React.useState(false);
  const [alternativeTarget, setAlternativeTarget] = React.useState<any>(null);
  const [activeVtMenu, setActiveVtMenu] = React.useState<number | null>(null);
  const [alternativeMaterials, setAlternativeMaterials] = React.useState<any[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = React.useState(false);
  const [targetDeleteMaterial, setTargetDeleteMaterial] = React.useState<any>(null);

  const [showAddMaterial, setShowAddMaterial] = React.useState(false);
  const [addMaterialTargetIndex, setAddMaterialTargetIndex] = React.useState<number | null>(null);
  const [addMaterials, setAddMaterials] = React.useState<any[]>([]);
  const [loadingAddMaterials, setLoadingAddMaterials] = React.useState(false);
  const [addSearch, setAddSearch] = React.useState("");
  const [addCategory, setAddCategory] = React.useState("");
  const [addCategories, setAddCategories] = React.useState<any[]>([]);
  const [addQuantities, setAddQuantities] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (showAddMaterial) {
      setLoadingAddMaterials(true);
      Promise.all([
        fetch(`/api/logistics/inventory`).then(res => res.json()),
        fetch(`/api/logistics/categories`).then(res => res.json())
      ])
        .then(([materialsData, categoriesData]) => {
          setAddMaterials(materialsData.items || []);
          setAddCategories(categoriesData || []);
          setAddSearch("");
          setAddCategory("");
          setAddQuantities({});
        })
        .catch(console.error)
        .finally(() => setLoadingAddMaterials(false));
    } else {
      setAddMaterials([]);
      setAddCategories([]);
      setAddMaterialTargetIndex(null);
    }
  }, [showAddMaterial]);

  React.useEffect(() => {
    if (showAlternative && alternativeTarget?.material) {
      setLoadingAlternatives(true);
      
      let exactLetterPrefix = "";
      if (alternativeTarget.material.code) {
        const match = alternativeTarget.material.code.match(/^[a-zA-Z]+/);
        if (match) exactLetterPrefix = match[0];
      }
      
      const queryParams = new URLSearchParams();
      if (swapSearchMode === "exact" && ((alternativeTarget.material as any)?.maThayThe || alternativeTarget.material?.code)) {
        queryParams.append("exactCode", (alternativeTarget.material as any)?.maThayThe || alternativeTarget.material?.code || "");
      } else if (swapSearchMode === "group" && alternativeTarget.material.category?.id) {
        queryParams.append("categoryId", alternativeTarget.material.category.id);
      }
      queryParams.append("nolimit", "true");

      fetch(`/api/logistics/inventory?${queryParams.toString()}`)
        .then(res => res.json())
        .then(data => {
          setAlternativeMaterials(data.items || []);
          setAltSearch("");
        })
        .catch(console.error)
        .finally(() => setLoadingAlternatives(false));
    } else if (!showAlternative) {
      setAlternativeMaterials([]);
      setAlternativeTarget(null);
    }
  }, [showAlternative, alternativeTarget, swapSearchMode]);

  React.useEffect(() => {
    if (showBomDetail && formItem.dinhMucId) {
      setLoadingBom(true);
      fetch(`/api/production/bom/${formItem.dinhMucId}`)
        .then(res => res.json())
        .then(data => {
          setBomDetailData(data);
          setOriginalBomData(JSON.parse(JSON.stringify(data)));
          setNewBomDescription("");
          initialDonGiaRef.current = formItem.donGia || 0;
        })
        .catch(console.error)
        .finally(() => setLoadingBom(false));
    } else if (!showBomDetail) {
      setBomDetailData(null);
      setOriginalBomData(null);
      setNewBomDescription("");
    }
  }, [showBomDetail, formItem.dinhMucId]);

  const handleSwapMaterial = (altMaterial: any) => {
    if (!alternativeTarget || !bomDetailData) return;
    const newVatTu = [...(bomDetailData.vatTu || [])];
    const index = newVatTu.findIndex(v => v.id === alternativeTarget.id);
    if (index !== -1) {
      newVatTu[index] = {
        ...newVatTu[index],
        inventoryItemId: altMaterial.id,
        maVatTu: altMaterial.code,
        materialId: altMaterial.id,
        tenVatTu: altMaterial.name || altMaterial.tenHang,
        material: {
          ...newVatTu[index].material,
          id: altMaterial.id,
          code: altMaterial.code,
          tenHang: altMaterial.name || altMaterial.tenHang,
          name: altMaterial.name || altMaterial.tenHang,
          unit: altMaterial.unit || altMaterial.donVi,
          donVi: altMaterial.unit || altMaterial.donVi,
          price: altMaterial.giaNhap || altMaterial.price || 0,
          giaNhap: altMaterial.giaNhap || altMaterial.price || 0,
          giaBan: altMaterial.giaBan || 0,
        }
      };
      setBomDetailData({ ...bomDetailData, vatTu: newVatTu });
    }
    setShowAlternative(false);
  };

  const handleDeleteMaterial = () => {
    if (!targetDeleteMaterial || !bomDetailData) return;
    const newVatTu = bomDetailData.vatTu.filter((v: any) => v.id !== targetDeleteMaterial.id);
    setBomDetailData({ ...bomDetailData, vatTu: newVatTu });
    setTargetDeleteMaterial(null);
  };

  const handleAddMaterial = (newMaterial: any) => {
    if (addMaterialTargetIndex === null || !bomDetailData) return;
    const qty = addQuantities[newMaterial.id] || 1;
    const newVatTu = [...(bomDetailData.vatTu || [])];
    
    const newItem = {
      inventoryItemId: newMaterial.id,
      maVatTu: newMaterial.code,
      materialId: newMaterial.id,
      tenVatTu: newMaterial.name || newMaterial.tenHang,
      soLuong: qty,
      donViTinh: newMaterial.unit || newMaterial.donVi,
      material: {
        id: newMaterial.id,
        code: newMaterial.code,
        tenHang: newMaterial.name || newMaterial.tenHang,
        name: newMaterial.name || newMaterial.tenHang,
        unit: newMaterial.unit || newMaterial.donVi,
        donVi: newMaterial.unit || newMaterial.donVi,
        price: newMaterial.giaNhap || newMaterial.price || 0,
        giaNhap: newMaterial.giaNhap || newMaterial.price || 0,
        giaBan: newMaterial.giaBan || 0,
      }
    };

    newVatTu.splice(addMaterialTargetIndex + 1, 0, newItem);
    setBomDetailData({ ...bomDetailData, vatTu: newVatTu });
    setShowAddMaterial(false);
  };

  const handleSaveNewBom = async () => {
    if (!newBomDescription.trim() || !hasBomChanged || !bomDetailData) return;
    setSavingNewBom(true);
    try {
      const payload = {
        code: previewCode || undefined,
        originalCode: originalBomData.code,
        tenDinhMuc: newBomDescription.trim(),
        materialItemId: formItem.inventoryId || null,
        manufacturedProductId: null,
        vatTu: bomDetailData.vatTu.map((v: any) => ({
          inventoryItemId: v.material?.id || v.inventoryItemId || null,
          maVatTu: v.material?.code || v.maVatTu || null,
          tenVatTu: v.material?.tenHang || v.material?.name || v.tenVatTu,
          soLuong: v.soLuong,
          donViTinh: v.donViTinh || v.material?.unit || v.material?.donVi || "",
          ghiChu: v.ghiChu || ""
        }))
      };

      const res = await fetch("/api/production/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save BOM");

      const created = await res.json();
      
      // Update local states so it turns into the new BOM
      // We need to fetch it to get full details (with vatTu structure) or just rely on what we have.
      // Re-fetching is safer.
      const res2 = await fetch(`/api/production/bom/${created.id}`);
      const freshData = await res2.json();
      
      setFormItem(prev => ({
        ...prev,
        dinhMucs: [...(prev.dinhMucs || []), freshData],
        dinhMucId: freshData.id,
        dinhMucTen: freshData.tenDinhMuc,
        code: freshData.code,
        donGia: Number(proposedDonGia || 0)
      }));
      
      setBomDetailData(freshData);
      setOriginalBomData(JSON.parse(JSON.stringify(freshData)));
      setNewBomDescription("");
      initialDonGiaRef.current = Number(proposedDonGia || 0);
      
      toast.success("Lưu thành công", "Đã tạo định mức mới: " + created.code);
      setShowBomDetail(false);
    } catch (e) {
      console.error(e);
      toast.error("Lỗi", "Có lỗi xảy ra khi lưu định mức mới!");
    } finally {
      setSavingNewBom(false);
    }
  };

  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [activeRowId, setActiveRowId] = React.useState<number | null>(null);
  const activeRowIdRef = React.useRef<number | null>(null);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveRowIdSync = (id: number | null) => {
    activeRowIdRef.current = id;
    setActiveRowId(id);
  };

  const fetchSuggest = React.useCallback((query: string, rowId: number) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query.trim() || query.length < 2) {
      setSuggest([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&limit=20&includeManufactured=true`)
        .then(r => r.json())
        .then(d => {
          if (activeRowIdRef.current === rowId) {
            const filtered = (d.items ?? []).map((item: any) => {
              const relevantStocks = (item.stocks || []).filter((s: any) => {
                return s.warehouse?.code === "KHO-CHINH" || s.warehouse?.code === "KVP";
              });
              const soLuong = relevantStocks.reduce((acc: number, s: any) => acc + (s.soLuong || 0), 0);
              const soLuongGiu = relevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
              const thucTon = Math.max(0, soLuong - soLuongGiu);
              let whCode = relevantStocks.length > 0 ? relevantStocks[0].warehouse?.code : item.defaultWarehouse;
              if (!whCode) {
                whCode = "KHO-CHINH";
              }
              const khoTenStr = relevantStocks.length > 0 ? relevantStocks[0].warehouse?.name : 
                (whCode === "KVP" ? "Kho sản xuất và lắp ráp" : "Kho thương mại");
              
              return { ...item, thucTon, soLuong, whCode, khoTenStr, relevantStocks };
            }).filter((item: any) => item.whCode === "KHO-CHINH" || item.whCode === "KVP");
            setSuggest(filtered);
          }
        })
        .catch(() => setSuggest([]));
    }, 300);
  }, []);

  const applySuggest = (rowId: number, item: any) => {
    const soLuongTon = item.thucTon ?? item.soLuong;
    const defaultDinhMuc = item.dinhMucs?.length > 0 ? item.dinhMucs[0] : null;
    const khoTenStr = item.khoTenStr;

    const updatePayload = {
      ten: item.tenHang,
      khoTen: khoTenStr,
      dvt: item.donVi ?? "cái",
      donGia: calculateBomPrice(defaultDinhMuc, item.giaBan, item.loiNhuanKyVong, item.phuongPhapTinhLoiNhuan),
      soLuongTon,
      trangThaiKho: item.trangThai,
      inventoryId: item.id,
      imageUrl: item.imageUrl || null,
      code: item.code || null,
      dinhMucs: item.dinhMucs || [],
      dinhMucId: defaultDinhMuc ? defaultDinhMuc.id : null,
      dinhMucTen: defaultDinhMuc ? defaultDinhMuc.tenDinhMuc : null,
      source: item.source,
      loiNhuanKyVong: item.loiNhuanKyVong || 0,
      phuongPhapTinhLoiNhuan: item.phuongPhapTinhLoiNhuan || 'revenue',
      baseGiaBan: item.giaBan || 0
    };

    if (rowId === -1) {
      setFormItem(x => {
        const next = { ...x, ...updatePayload };
        if (next.id !== -1) {
          setItems(r => r.map(itemRow => itemRow.id === next.id ? { ...itemRow, ...updatePayload } : itemRow));
        }
        return next;
      });
    } else {
      setItems(r => r.map(x => x.id === rowId ? { ...x, ...updatePayload } : x));
    }
    setSuggest([]);
    setActiveRowIdSync(null);
  };

  const updateFormField = <K extends keyof OrderItem>(key: K, value: OrderItem[K]) => {
    setFormItem(p => {
      const next = { ...p, [key]: value };
      if (next.id !== -1) {
        setItems(r => r.map(x => x.id === next.id ? { ...x, [key]: value } : x));
      }
      return next;
    });
  };

  const updateFormFields = (updates: Partial<OrderItem>) => {
    setFormItem(p => {
      const next = { ...p, ...updates };
      if (next.id !== -1) {
        setItems(r => r.map(x => x.id === next.id ? { ...x, ...updates } : x));
      }
      return next;
    });
  };

  const setInfoField = (k: string) => (e: any) => {
    setInfo(f => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  };

  const addRow = () => {
    if (!formItem.ten.trim()) {
      toast.error("Lỗi", "Vui lòng chọn hoặc nhập tên sản phẩm");
      return;
    }
    if (formItem.id !== -1) {
      setItems(r => r.map(x => x.id === formItem.id ? formItem : x));
    } else {
      setItems(r => [...r, { ...formItem, id: nextId.current++ }]);
    }
    setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "", loiNhuanKyVong: 0, phuongPhapTinhLoiNhuan: "revenue", baseGiaBan: 0 });
  };

  const removeRow = (id: number) => {
    setItems(r => r.filter(x => x.id !== id));
    if (formItem.id === id) {
      setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "", loiNhuanKyVong: 0, phuongPhapTinhLoiNhuan: "revenue", baseGiaBan: 0 });
    }
  };

  const updateRow = (id: number, k: keyof OrderItem, val: any) => {
    setItems(r => r.map(x => x.id === id ? { ...x, [k]: val } : x));
  };

  const getProductCode = (it: OrderItem) => it.code || "";

  const thanhTien = (it: OrderItem) => it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s, it) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien + (info.chiPhiKhac || 0);
  const checkMaterialShortage = (it: OrderItem) => {
    const activeDinhMuc = (it.dinhMucs || []).find((dm: any) => dm.id == it.dinhMucId || String(dm.id) === String(it.dinhMucId)) || (it.dinhMucs && it.dinhMucs.length > 0 ? it.dinhMucs[0] : null);
    if (!activeDinhMuc || !activeDinhMuc.vatTu || activeDinhMuc.vatTu.length === 0) {
      return { hasBOM: false, hasShortage: false, missingCount: 0 };
    }
    let missingCount = 0;
    activeDinhMuc.vatTu.forEach((vt: any) => {
      const vtStocks = vt.stocks || vt.inventoryItem?.stocks || vt.material?.stocks || [];
      const vtRelevantStocks = vtStocks.filter((s: any) => {
        const c = s.warehouse?.code?.toUpperCase()?.trim();
        return c === "KHO-CHINH" || c === "KVP" || c === "KHO_CHINH";
      });
      const vtSoLuong = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuong || 0), 0);
      const vtSoLuongGiu = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
      const vtThucTon = Math.max(0, vtSoLuong - vtSoLuongGiu);
      const needed = (vt.soLuong || 0) * (it.soLuong || 0);
      if (vtThucTon < needed) {
        missingCount++;
      }
    });
    return {
      hasBOM: true,
      hasShortage: missingCount > 0,
      missingCount
    };
  };

  const itemsWithMaterialShortage = items.filter(it => {
    const isMainShort = it.soLuongTon !== null && it.soLuongTon !== undefined && it.soLuong > (it.soLuongTon as number);
    if (!isMainShort) return false;
    const matCheck = checkMaterialShortage(it);
    return matCheck.hasBOM && matCheck.hasShortage;
  });
  const hasAnyMaterialShortage = itemsWithMaterialShortage.length > 0;

  const isOutOfStock = items.some(it => {
    const mainOutOfStock = it.soLuongTon !== null && it.soLuongTon !== undefined && it.soLuong > (it.soLuongTon as number);
    if (!mainOutOfStock) return false;
    
    // Main item is out of stock. Check if materials are sufficient to produce.
    const matCheck = checkMaterialShortage(it);
    if (matCheck.hasBOM && !matCheck.hasShortage) {
      return false; // NOT out of stock, materials are sufficient!
    }
    
    return true; // Out of stock and insufficient materials
  });


  const handleSave = async () => {
    if (!info.soPhieu.trim()) {
      setSaveError("Vui lòng nhập số đơn hàng");
      return;
    }
    if (!info.ngayGiaoHang) {
      setSaveError("Vui lòng chọn ngày giao hàng");
      return;
    }
    if (!custInfo.id) {
      if (!info.tenNguoiNhan?.trim()) {
        setSaveError("Vui lòng nhập tên khách hàng");
        return;
      }
      if (!info.sdtNguoiNhan?.trim()) {
        setSaveError("Vui lòng nhập số điện thoại");
        return;
      }
      if (!custInfo.address?.trim()) {
        setSaveError("Vui lòng nhập địa chỉ khách hàng");
        return;
      }
      if (!info.diaChiGiaoHang?.trim()) {
        setSaveError("Vui lòng nhập địa chỉ giao hàng");
        return;
      }
    }
    const validItems = items.filter(it => it.ten.trim());
    if (validItems.length === 0) {
      setSaveError("Vui lòng nhập ít nhất một mặt hàng");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      let finalCustomerId = custInfo.id;
      let finalGhiChu = [
        info.ghiChu,
        info.chiPhiKhac > 0 ? `Chi phí khác: ${info.chiPhiKhac.toLocaleString("vi-VN")} ₫` : "",
        info.daThanhToan > 0 ? `Đã trả trước: ${info.daThanhToan.toLocaleString("vi-VN")} ₫ (${info.isChuyenKhoan ? 'Chuyển khoản' : 'Tiền mặt'})` : ""
      ].filter(Boolean).join("\n");

      if (!finalCustomerId) {
        const guestName = info.tenNguoiNhan?.trim() || "Khách vãng lai";
        try {
          const custRes = await fetch("/api/plan-finance/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: guestName,
              dienThoai: info.sdtNguoiNhan?.trim() || "",
              address: info.diaChiGiaoHang?.trim() || "",
              nhom: "ca-nhan",
              nguon: "walk-in",
            })
          });
          if (custRes.ok) {
            const newCust = await custRes.json();
            finalCustomerId = newCust.id || newCust.customer?.id;
          } else {
            const guestInfo = { name: guestName, dienThoai: info.sdtNguoiNhan?.trim() || "", address: info.diaChiGiaoHang?.trim() || "" };
            finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
          }
        } catch (err) {
          const guestInfo = { name: guestName, dienThoai: info.sdtNguoiNhan?.trim() || "", address: info.diaChiGiaoHang?.trim() || "" };
          finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
        }
      }

      if (editOrder) {
        const updatePayload = {
          ngayGiao: info.ngayGiaoHang,
          ghiChu: finalGhiChu,
          tongTien: tongCong,
          daThanhToan: info.daThanhToan,
          isChuyenKhoan: info.isChuyenKhoan,
          discount: info.chietKhauTong,
          vat: info.thue,
          items: validItems.map((it, idx) => ({
            tenHang: it.ten.trim(),
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: thanhTien(it),
            ghiChu: JSON.stringify({ 
              code: it.code || "", 
              khoTen: it.khoTen || "", 
              dinhMucId: it.dinhMucId || "",
              bomCode: (it.dinhMucs && Array.isArray(it.dinhMucs) ? it.dinhMucs.find((d: any) => d.id === it.dinhMucId)?.code : "") || "",
              dinhMucTen: it.dinhMucTen || (it.dinhMucs && Array.isArray(it.dinhMucs) ? it.dinhMucs.find((d: any) => d.id === it.dinhMucId)?.tenDinhMuc : "") || ""
            })
          }))
        };
        const res = await fetch(`/api/plan-finance/sales/${editOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi cập nhật");
        const updatedResult = await res.json().catch(() => ({}));
        const displayCode = updatedResult.code || updatedResult.order?.code || info.soPhieu;
        toast.success("Cập nhật thành công", `Đơn hàng ${displayCode} đã được lưu.`);
      } else {
        const payload = {
          code: info.soPhieu.trim(),
          ngayBaoGia: info.ngayLap,
          ngayHetHan: info.ngayGiaoHang,
          ngayGiaoHang: info.ngayGiaoHang,
          trangThai: isQuotation ? "sent" : "won",
          uuTien: "medium",
          tongTien: tamTinh,
          daThanhToan: info.daThanhToan,
          isChuyenKhoan: info.isChuyenKhoan,
          discount: info.chietKhauTong,
          vat: info.thue,
          chiPhiThiCong: info.chiPhiKhac || 0,
          thanhTien: tongCong,
          ghiChu: finalGhiChu,
          quoteType: "Không có quầy kệ",
          items: validItems.map((it, idx) => ({
            tenHang: it.ten.trim(),
            donVi: it.dvt || "cái",
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: thanhTien(it),
            ghiChu: JSON.stringify({ 
              code: it.code || "", 
              khoTen: it.khoTen || "", 
              dinhMucId: it.dinhMucId || "", 
              bomCode: (it.dinhMucs && Array.isArray(it.dinhMucs) ? it.dinhMucs.find((d: any) => d.id === it.dinhMucId)?.code : "") || "",
              dinhMucTen: it.dinhMucTen || (it.dinhMucs && Array.isArray(it.dinhMucs) ? it.dinhMucs.find((d: any) => d.id === it.dinhMucId)?.tenDinhMuc : "") || ""
            }),
            sortOrder: idx
          })),
          customerId: finalCustomerId || null,
          type
        };

        const res = await fetch("/api/plan-finance/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error((await res.json()).error ?? (isQuotation ? "Lỗi tạo báo giá" : "Lỗi tạo đơn hàng"));
        }
        const createdOrder = await res.json().catch(() => ({}));
        const displayCode = createdOrder.code || createdOrder.order?.code || info.soPhieu;
        toast.success(
          isQuotation ? "Tạo báo giá thành công" : "Tạo đơn hàng thành công",
          `${isQuotation ? "Báo giá" : "Đơn hàng"} ${displayCode} đã được lưu.`
        );
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setSaveError(err.message ?? "Lỗi lưu đơn hàng");
      toast.error("Lỗi tạo đơn hàng", err.message ?? "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <style>{`
        .d-none { display: none !important; }
        .d-inline { display: inline !important; }
        .d-block { display: block !important; }
        .d-flex { display: flex !important; }
        @media (max-width: 575.98px) {
          .d-sm-inline { display: none !important; }
          .d-sm-block { display: none !important; }
          .d-sm-flex { display: none !important; }
        }
        @media (min-width: 576px) {
          .d-sm-none { display: none !important; }
          .d-sm-inline { display: inline !important; }
          .d-sm-block { display: block !important; }
          .d-sm-flex { display: flex !important; }
        }
        @media (max-width: 767.98px) {
          .d-md-inline { display: none !important; }
          .d-md-block { display: none !important; }
          .d-md-flex { display: none !important; }
        }
        @media (min-width: 768px) {
          .d-md-none { display: none !important; }
          .d-md-inline { display: inline !important; }
          .d-md-block { display: block !important; }
          .d-md-flex { display: flex !important; }
        }

        /* Responsive styles for iPad/tablets */
        @media (max-width: 1024px) {
          .order-modal-body {
            position: relative !important;
          }
          .order-modal-left {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 350px !important;
            max-width: 85vw !important;
            z-index: 200 !important;
            border-right: 1px solid var(--border) !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.25) !important;
            background: var(--card) !important;
          }
          .order-modal-left.show {
            transform: translateX(0) !important;
          }
          .order-modal-right {
            width: 100% !important;
            flex: 1 !important;
          }
          .order-modal-toggle-btn {
            display: flex !important;
          }
          .order-modal-sidebar-header {
            display: flex !important;
          }
          .order-modal-table th, 
          .order-modal-table td {
            padding: 6px 8px !important;
          }
          .order-modal-header {
            padding: 0 12px !important;
          }
          .order-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .order-modal-header-title {
            font-size: 14px !important;
          }
        }

        /* Mobile specific styles (<= 768px) */
        @media (max-width: 768px) {
          /* Mobile Full-Screen Sidebar Panel for Order Info */
          .order-modal-left {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            width: 100vw !important;
            max-width: 100% !important;
            max-width: 100vw !important;
            height: 100% !important;
            height: 100dvh !important;
            z-index: 3100 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: none !important;
            border-right: none !important;
            border-radius: 0 !important;
            background: var(--card) !important;
          }
          .order-modal-left.show {
            transform: translateX(0) !important;
          }
          .order-modal-sidebar-header {
            display: flex !important;
            padding-top: max(8px, env(safe-area-inset-top, 8px)) !important;
          }
          .order-modal-left > div {
            padding: 14px 16px max(14px, env(safe-area-inset-bottom, 14px)) 16px !important;
          }

          .order-modal-header {
            height: 50px !important;
            padding: 0 10px !important;
          }
          .order-modal-header-icon {
            width: 30px !important;
            height: 30px !important;
            border-radius: 7px !important;
          }
          .order-modal-header-title {
            font-size: 13.5px !important;
            font-weight: 700 !important;
            max-width: 175px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          .order-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
            height: 34px !important;
          }
          .order-modal-right {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
          }
          .order-modal-subheader {
            padding: 8px 10px !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
          }
          .order-modal-subheader-title {
            font-size: 11.5px !important;
          }
          .order-modal-table-container {
            overflow-x: hidden !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 8px !important;
            gap: 10px !important;
            box-sizing: border-box !important;
          }
          .order-modal-add-form {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            align-items: stretch !important;
            padding: 10px !important;
            gap: 8px !important;
          }
          .order-modal-form-top,
          .order-modal-row-pricing,
          .order-modal-form-actions {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
          }
          .order-modal-form-top {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .order-modal-field-product {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .order-modal-bom-group {
            display: grid !important;
            grid-template-columns: 105px minmax(0, 1fr) !important;
            gap: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .order-modal-field-bom-code,
          .order-modal-field-bom-desc {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .order-modal-field-bom-desc input {
            min-width: 0 !important;
          }
          /* Hide warehouse name & unit on mobile phones */
          .order-modal-row-warehouse {
            display: none !important;
          }
          .order-modal-row-pricing {
            display: grid !important;
            grid-template-columns: 75px 80px minmax(0, 1fr) !important;
            gap: 6px !important;
          }
          .order-modal-field-qty,
          .order-modal-field-ck,
          .order-modal-field-price {
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }
          .order-modal-field-price input {
            min-width: 0 !important;
          }
          .order-modal-form-actions {
            display: flex !important;
            gap: 8px !important;
            margin-top: 2px !important;
          }
          .order-modal-form-actions button {
            flex: 1 !important;
            height: 38px !important;
            justify-content: center !important;
            font-size: 13.5px !important;
            font-weight: 700 !important;
          }
          .order-modal-desktop-table {
            display: none !important;
          }
          .order-modal-mobile-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .order-modal-footer {
            padding: 8px 10px max(14px, env(safe-area-inset-bottom, 14px)) 10px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            align-items: stretch !important;
            background: var(--card) !important;
            border-top: 1px solid var(--border) !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.06) !important;
            box-sizing: border-box !important;
          }
          .order-modal-footer-totals {
            order: 1 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
            padding-bottom: 6px !important;
            border-bottom: 1px dashed var(--border) !important;
            box-sizing: border-box !important;
          }
          .order-modal-footer-totals > div {
            flex: 1 !important;
            text-align: center !important;
          }
          .order-modal-footer-totals p:first-child {
            font-size: 10px !important;
            margin: 0 !important;
            color: var(--muted-foreground) !important;
          }
          .order-modal-footer-totals p:last-child {
            font-size: 12px !important;
            font-weight: 700 !important;
            margin: 0 !important;
          }
          .order-modal-footer-grandtotal {
            display: none !important;
          }
          .order-modal-footer-bottom {
            order: 2 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }
          .order-modal-footer-payment {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex: 1 !important;
            margin-left: 0 !important;
            min-width: 0 !important;
          }
          .order-modal-footer-payment label {
            font-size: 11.5px !important;
            margin: 0 !important;
          }
          .order-modal-footer-payment input[type="text"] {
            width: 82px !important;
            padding: 4px 18px 4px 6px !important;
            font-size: 12.5px !important;
            font-weight: 700 !important;
            height: 30px !important;
            box-sizing: border-box !important;
          }
          .order-modal-footer-mobile-grandtotal {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            flex-shrink: 0 !important;
            margin-left: auto !important;
          }
          .order-modal-footer-mobile-grandtotal span:first-child {
            font-size: 9.5px !important;
            font-weight: 700 !important;
            color: var(--primary) !important;
            text-transform: uppercase !important;
            line-height: 1 !important;
          }
          .order-modal-footer-mobile-grandtotal span:last-child {
            font-size: 16px !important;
            font-weight: 900 !important;
            color: var(--primary) !important;
            line-height: 1.2 !important;
          }
        }
        @media (min-width: 769px) {
          .order-modal-footer-bottom {
            display: contents !important;
          }
          .order-modal-footer-mobile-grandtotal {
            display: none !important;
          }
          .order-modal-mobile-list {
            display: none !important;
          }
          .order-modal-row-warehouse {
            display: flex !important;
          }
          .order-modal-desktop-table {
            display: table !important;
            min-width: 650px !important;
          }
        }
        @media (min-width: 1025px) {
          .order-modal-body {
            background: #EBF0F5 !important;
            padding: 8px !important;
            gap: 8px !important;
          }
          .order-modal-left {
            border-radius: 12px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            background: #ffffff !important;
          }
          .order-modal-right {
            border-radius: 12px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            background: #ffffff !important;
          }
          .order-modal-table-container {
            padding: 8px !important;
            gap: 8px !important;
          }
          .order-modal-add-form {
            padding: 8px !important;
            gap: 8px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="order-modal-header" style={{ height: 56, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.03)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="order-modal-header-icon" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(2, 132, 199, 0.08)", border: "1px solid rgba(2, 132, 199, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--color-primary, #0284c7)" }}>
            <i className="bi bi-cart3" style={{ fontSize: 17 }} />
          </div>
          <div>
            <p className="order-modal-header-title" style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#0f172a", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="hidden sm:inline">
                {isQuotation
                  ? editOrder ? "Cập nhật báo giá (BG)" : "Lập báo giá (BG)"
                  : editOrder ? "Cập nhật đơn bán hàng (SO)" : "Lập đơn bán hàng (SO)"}
              </span>
              <span className="inline sm:hidden">
                {isQuotation
                  ? editOrder ? "Cập nhật BG" : "Lập báo giá"
                  : editOrder ? "Cập nhật đơn" : "Đơn bán hàng"}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200">
                {type === "retail" ? "BÁN LẺ" : "ĐẠI LÝ"}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && (
            <span style={{ fontSize: 12, color: "#ef4444", alignSelf: "center", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <i className="bi bi-exclamation-circle-fill text-red-500" /> {saveError}
            </span>
          )}
          {hasAnyMaterialShortage ? (
            <span style={{ fontSize: 12, color: "#dc2626", background: "rgba(220,38,38,0.08)", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(220,38,38,0.25)", alignSelf: "center", display: "flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
              <i className="bi bi-exclamation-octagon-fill" /> Không đủ vật tư
            </span>
          ) : (isOutOfStock && (
            <span style={{ fontSize: 12, color: "#ea580c", background: "rgba(234,88,12,0.08)", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(234,88,12,0.25)", alignSelf: "center", display: "flex", alignItems: "center", gap: 5, fontWeight: 700 }}>
              <i className="bi bi-exclamation-triangle-fill" /> Đơn có hàng hóa thiếu
            </span>
          ))}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || (!isQuotation && isOutOfStock)}
            isLoading={saving}
            leftIcon={<i className="bi bi-check-circle-fill" />}
            style={{ padding: "0 18px", fontWeight: 700, fontSize: 13, borderRadius: 8, height: 36 }}
          >
            <span className="hidden sm:inline">
              {isQuotation
                ? editOrder ? "Cập nhật báo giá" : "Tạo báo giá"
                : editOrder ? "Cập nhật đơn" : "Tạo đơn hàng"}
            </span>
            <span className="inline sm:hidden">
              {isQuotation ? "Tạo BG" : editOrder ? "Lưu" : "Tạo đơn"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            style={{ width: 36, height: 36, padding: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
            className="text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors shadow-2xs"
            title="Đóng (Esc)"
          >
            <i className="bi bi-x-lg" style={{ fontSize: 15 }} />
          </Button>
        </div>
      </div>

      <div className="order-modal-body" style={{ flex: 1, display: "flex", overflow: "hidden", background: "#EBF0F5", padding: 8, gap: 8, minHeight: 0 }}>
        {/* Backdrop for Offcanvas */}
        {showInfoSidebar && (
          <div
            onClick={() => setShowInfoSidebar(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2.5px)",
              zIndex: 199
            }}
          />
        )}

        {/* Left Side: Order Info */}
        <div className={`order-modal-left ${showInfoSidebar ? "show" : ""}`} style={{ width: 380, flexShrink: 0, border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative", display: "flex", flexDirection: "column", background: "#ffffff", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 8, background: "#ffffff", overflowY: "auto" }}>
            {/* Offcanvas Header */}
            <div className="order-modal-sidebar-header" style={{ display: "none", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #e2e8f0", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bi bi-info-circle-fill" style={{ fontSize: 16, color: "#003087" }} />
                <span style={{ fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.04em", color: "#003087" }}>Thông tin chung</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoSidebar(false)}
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#0f172a",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Đóng"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <Input
              label="Số đơn hàng (Tham chiếu)"
              required
              value={info.soPhieu || ""}
              onChange={setInfoField("soPhieu")}
              style={{ fontFamily: "monospace", fontWeight: 700 }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Input
                type="date"
                label="Ngày đặt hàng"
                required
                value={info.ngayLap}
                onChange={setInfoField("ngayLap")}
              />
              <Input
                type="date"
                label="Ngày giao hàng mong muốn"
                required
                value={info.ngayGiaoHang}
                onChange={setInfoField("ngayGiaoHang")}
              />
            </div>

            {/* Customer Details Display */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Thông tin khách hàng</p>
              {customer ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={customer.name} size="md" />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3, textTransform: "uppercase", color: "#0f172a", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customer.name}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{customer.nhom === "dai-ly" ? "Đại lý" : customer.nhom || "Khách hàng"}</span>
                    </div>
                  </div>
                  {(info.sdtNguoiNhan || customer.dienThoai) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
                      <i className="bi bi-telephone-fill" style={{ fontSize: 11, color: "#10b981" }} />
                      {info.sdtNguoiNhan || customer.dienThoai}
                    </div>
                  )}
                  {(info.diaChiGiaoHang || customer.address) && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <i className="bi bi-geo-alt-fill" style={{ fontSize: 12, color: "#ef4444", marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.3 }}>{info.diaChiGiaoHang || customer.address}</span>
                    </div>
                  )}
                  {debtInfo && (
                    <div style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      background: "rgba(59,130,246,0.06)",
                      padding: 6,
                      borderRadius: 6,
                      border: "1px dashed rgba(59,130,246,0.25)"
                    }}>
                      <div>
                        <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 700 }}>CÔNG NỢ HIỆN TẠI</span>
                        <strong style={{ fontSize: 12, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: "#64748b", display: "block", fontWeight: 700 }}>HẠN MỨC CÔNG NỢ</span>
                        <strong style={{ fontSize: 12, color: "#003087" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <Input
                      label="Tên khách hàng"
                      value={custInfo.name}
                      onChange={e => {
                        const val = e.target.value;
                        setCustInfo(prev => ({ ...prev, name: val, id: "" }));
                        setInfo(prev => ({ ...prev, tenNguoiNhan: val }));
                      }}
                      placeholder="Nhập tên khách hàng"
                    />
                    <Input
                      label="Số điện thoại"
                      value={custInfo.dienThoai}
                      onChange={e => {
                        const val = e.target.value;
                        setCustInfo(prev => ({ ...prev, dienThoai: val }));
                        setInfo(prev => ({ ...prev, sdtNguoiNhan: val }));
                      }}
                      placeholder="Số điện thoại"
                    />
                  </div>
                  <Input
                    label="Địa chỉ"
                    value={custInfo.address}
                    onChange={e => {
                      const val = e.target.value;
                      setCustInfo(prev => ({ ...prev, address: val }));
                      setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
                    }}
                    placeholder="Địa chỉ khách hàng"
                  />
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Input
                label={customer ? "Tên người nhận" : "Tên khách hàng"}
                required={!custInfo.id}
                value={info.tenNguoiNhan}
                onChange={e => {
                  const val = e.target.value;
                  setInfo(prev => ({ ...prev, tenNguoiNhan: val }));
                  if (!customer) setCustInfo(prev => ({ ...prev, name: val, id: "" }));
                }}
                placeholder={customer?.name || "Tên người nhận"}
              />
              <Input
                label={customer ? "SĐT người nhận" : "Số điện thoại"}
                required={!custInfo.id}
                value={info.sdtNguoiNhan}
                onChange={e => {
                  const val = e.target.value;
                  setInfo(prev => ({ ...prev, sdtNguoiNhan: val }));
                  if (!customer) setCustInfo(prev => ({ ...prev, dienThoai: val }));
                }}
                placeholder={customer?.dienThoai || "Số điện thoại"}
              />
            </div>

            <Input
              label="Địa chỉ khách hàng"
              required={!custInfo.id}
              value={custInfo.address}
              onChange={e => {
                const val = e.target.value;
                setCustInfo(prev => ({ ...prev, address: val }));
                if (!customer) setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
              }}
              placeholder={customer?.address || "Địa chỉ khách hàng"}
            />

            <Input
              label="Địa chỉ giao hàng"
              required={!custInfo.id}
              value={info.diaChiGiaoHang}
              onChange={e => {
                const val = e.target.value;
                setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
                if (!customer) setCustInfo(prev => ({ ...prev, address: val }));
              }}
              placeholder={customer?.address || "Địa chỉ giao hàng"}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1.5fr", gap: 8 }}>
              <Input
                type="number"
                min={0}
                max={100}
                label="Chiết khấu tổng"
                suffix="%"
                value={info.chietKhauTong}
                onChange={setInfoField("chietKhauTong")}
              />
              <Input
                type="number"
                min={0}
                max={100}
                label="Thuế VAT"
                suffix="%"
                value={info.thue}
                onChange={setInfoField("thue")}
              />
              <Input
                type="text"
                label="Chi phí khác"
                suffix="₫"
                value={info.chiPhiKhac ? info.chiPhiKhac.toLocaleString("vi-VN") : "0"}
                onChange={e => {
                  const val = Number(e.target.value.replace(/\D/g, ""));
                  setInfo(prev => ({ ...prev, chiPhiKhac: val }));
                }}
              />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 4 }}>
              <FLabel text="Ghi chú nội bộ" />
              <textarea
                value={info.ghiChu}
                onChange={e => setInfo(prev => ({ ...prev, ghiChu: e.target.value }))}
                className="form-input"
                style={{ flex: 1, resize: "none", minHeight: 80, padding: "8px 12px", fontSize: 13 }}
                placeholder="Nhập ghi chú cho đơn hàng..."
              />
            </div>

            {/* Action button at bottom on mobile */}
            <div className="block md:hidden" style={{ marginTop: 8, paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}>
              <Button
                variant="primary"
                onClick={() => setShowInfoSidebar(false)}
                leftIcon={<i className="bi bi-check2" />}
                className="w-full font-bold text-sm"
                style={{ height: 42, borderRadius: 8 }}
              >
                Hoàn tất & Quay lại đơn hàng
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Items Table */}
        <div className="order-modal-right" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="order-modal-subheader" style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="order-modal-toggle-btn"
                onClick={() => setShowInfoSidebar(true)}
                style={{
                  padding: "5px 10px",
                  background: "#003087",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "none",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <i className="bi bi-layout-sidebar-inset" />
                <span className="hidden sm:inline">Thông tin chung</span>
                <span className="inline sm:hidden">TT chung</span>
              </button>
              <span className="order-modal-subheader-title" style={{ fontWeight: 700, fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span className="hidden sm:inline">Bảng danh sách sản phẩm</span>
                <span className="inline sm:hidden">Sản phẩm ({items.length})</span>
              </span>
              <TrangThaiTonKhoBadge
                items={items.map(it => ({ ten: it.ten, soLuong: it.soLuong, soLuongTon: it.soLuongTon }))}
                showPurchaseRequest={false}
              />
              {hasAnyMaterialShortage && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#dc2626",
                    background: "rgba(220,38,38,0.08)",
                    borderRadius: 20,
                    padding: "3px 10px",
                    border: "1px solid rgba(220,38,38,0.25)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="bi bi-exclamation-octagon-fill" style={{ fontSize: 11 }} />
                  Không đủ vật tư
                  <span style={{ fontWeight: 400, fontSize: 10.5, marginLeft: 2 }}>
                    ({itemsWithMaterialShortage.length} mặt hàng)
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="order-modal-table-container" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 8, display: "flex", flexDirection: "column", gap: 8, background: "#ffffff" }}>
            {/* Form nhập liệu */}
            <div className="order-modal-add-form" style={{ padding: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <div className="order-modal-form-top" style={{ flex: "1 1 100%", display: "flex", gap: 8 }}>
                <div className="order-modal-field-product" style={{ flex: "2 1 250px", position: "relative" }}>
                  <FLabel text="Sản phẩm / Dịch vụ" required />
                  <SearchInput
                    value={formItem.ten}
                    onChange={v => {
                      updateFormField("ten", v);
                      if (!v) {
                        setSuggest([]);
                      } else {
                        setActiveRowIdSync(-1);
                        fetchSuggest(v, -1);
                      }
                    }}
                    onFocus={e => { setActiveRowIdSync(-1); fetchSuggest(formItem.ten, -1); }}
                    onBlur={e => { setTimeout(() => { if (activeRowIdRef.current === -1) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                  />
                  {activeRowId === -1 && suggest.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                      {suggest.map(s => (
                        <div key={s.id} onClick={() => applySuggest(-1, s)}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                        >
                          <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                            {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                            <span>Thực tồn: <b>{s.thucTon ?? s.soLuong}</b> {s.donVi}</span>
                            <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="order-modal-bom-group" style={{ display: "flex", gap: 8, flex: "3 1 350px" }}>
                  <div className="order-modal-field-bom-code" style={{ flex: "1 1 110px", maxWidth: 180 }}>
                    <Select
                      label="Mã định mức"
                      value={formItem.dinhMucId || ""}
                      onChange={e => {
                        const dmId = e.target.value;
                        const dm = formItem.dinhMucs?.find(x => x.id === dmId || String(x.id) === String(dmId));
                        const newDonGia = calculateBomPrice(dm, (formItem as any).baseGiaBan || formItem.donGia, (formItem as any).loiNhuanKyVong || 0, (formItem as any).phuongPhapTinhLoiNhuan || 'revenue');
                        updateFormFields({
                          dinhMucId: dmId,
                          dinhMucTen: dm ? dm.tenDinhMuc : null,
                          donGia: newDonGia
                        });
                      }}
                      disabled={formItem.source === "inventory"}
                      style={{ height: 34, fontSize: 13 }}
                    >
                      {formItem.dinhMucs?.map((dm: any) => (
                        <option key={dm.id} value={dm.id}>{dm.code}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="order-modal-field-bom-desc" style={{ flex: "2 1 240px" }}>
                    <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Mô tả định mức</label>
                    <div className="d-flex gap-2">
                      <Input
                        value={formItem.dinhMucTen || ""}
                        readOnly
                        placeholder="Mô tả định mức"
                        style={{ height: 34, fontSize: 13, backgroundColor: "#f1f5f9" }}
                        className="flex-1"
                      />
                      <div className="dropdown" style={{ position: "relative" }}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBomMenu(v => !v)}
                          disabled={!formItem.dinhMucId || isKinhDoanh}
                          style={{ height: 34, width: 34, padding: 0, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                          title={isKinhDoanh ? "Không có quyền chỉnh sửa định mức" : "Tuỳ chọn định mức"}
                        >
                          <i className="bi bi-three-dots"></i>
                        </Button>
                        {showBomMenu && (
                          <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 p-1 show" style={{ position: "absolute", top: "100%", right: 0, zIndex: 1050, display: "block", background: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", minWidth: 160, margin: 0, padding: 4, listStyle: "none" }}>
                            <li>
                              <button 
                                className="dropdown-item py-1.5 px-3 rounded-2" 
                                onClick={() => { setShowBomDetail(true); setShowBomMenu(false); }}
                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 4, color: "#0f172a" }}
                              >
                                <i className="bi bi-info-circle text-info"></i> Xem chi tiết
                              </button>
                            </li>
                            <li>
                              <button 
                                className="dropdown-item py-1.5 px-3 rounded-2 text-danger" 
                                disabled={isStandardBom}
                                onClick={() => { setConfirmDeleteBom(true); setShowBomMenu(false); }}
                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 12px", fontSize: 13, cursor: isStandardBom ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, color: "#dc2626", borderRadius: 4, opacity: isStandardBom ? 0.5 : 1 }}
                              >
                                <i className="bi bi-trash"></i> Xoá định mức
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-modal-row-warehouse" style={{ display: "flex", gap: 8, flex: "1 1 200px" }}>
                <div className="order-modal-field-kho" style={{ flex: "1 1 120px" }}>
                  <Input
                    label="Tên kho"
                    value={formItem.khoTen || ""}
                    readOnly
                    style={{ height: 34, fontSize: 13, backgroundColor: "#f1f5f9" }}
                  />
                </div>
                <div className="order-modal-field-dvt" style={{ flex: "1 1 80px" }}>
                  <Input
                    label="Đơn vị tính"
                    value={formItem.dvt}
                    onChange={e => updateFormField("dvt", e.target.value)}
                    style={{ height: 34, fontSize: 13, textAlign: "center" }}
                  />
                </div>
              </div>

              <div className="order-modal-row-pricing" style={{ display: "flex", gap: 8, flex: "2 1 300px" }}>
                <div className="order-modal-field-qty" style={{ flex: "1 1 90px" }}>
                  <Input
                    type="number"
                    min={1}
                    label="Số lượng"
                    required
                    value={formItem.soLuong}
                    onChange={e => updateFormField("soLuong", Math.max(1, Number(e.target.value)))}
                    style={{ height: 34, fontSize: 13, textAlign: "right" }}
                  />
                </div>
                <div className="order-modal-field-ck" style={{ flex: "1 1 90px" }}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    label="Chiết khấu (%)"
                    suffix="%"
                    value={formItem.ckPct}
                    onChange={e => updateFormField("ckPct", Math.max(0, Math.min(100, Number(e.target.value))))}
                    style={{ height: 34, fontSize: 13, textAlign: "right" }}
                  />
                </div>
                <div className="order-modal-field-price" style={{ flex: "1 1 120px" }}>
                  <label className="form-label" style={{ marginBottom: 4, display: "block" }}>Đơn giá (đ)</label>
                  <CurrencyInput
                    value={formItem.donGia}
                    onChange={v => !(!isAdmin) && updateFormField("donGia", v)}
                    readOnly={!isAdmin}
                    style={{ width: "100%", padding: "0 10px", height: 34, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 6, background: !isAdmin ? "var(--muted)" : "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: !isAdmin ? "var(--muted-foreground)" : "var(--foreground)", cursor: !isAdmin ? "not-allowed" : "text" }}
                  />
                </div>
              </div>

              <div className="order-modal-form-actions" style={{ display: "flex", gap: 6 }}>
                <Button 
                  variant="primary"
                  size="sm"
                  onClick={addRow} 
                  leftIcon={<i className={formItem.id === -1 ? "bi bi-plus-lg" : "bi bi-check2"} />}
                  style={{ height: 34, padding: "0 14px", fontWeight: 700, fontSize: 13, borderRadius: 6, border: "none" }}
                >
                  {formItem.id === -1 ? "Thêm" : "Cập nhật"}
                </Button>
                {formItem.id !== -1 && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "", loiNhuanKyVong: 0, phuongPhapTinhLoiNhuan: "revenue", baseGiaBan: 0 })}
                    style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6 }}
                    title="Bỏ chọn / thêm mới"
                  >
                    Bỏ chọn
                  </Button>
                )}
              </div>
            </div>

            <FullWidthTable 
              className="border border-slate-200 rounded-lg overflow-hidden shadow-xs"
              style={{ background: "#ffffff" }}
              emptyText="Chưa có sản phẩm nào"
            >
              <table className="order-modal-table order-modal-desktop-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#ffffff" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: 10, width: 40, color: "#64748b" }}>#</th>
                    <th style={{ padding: 10, color: "#475569" }}>Tên sản phẩm - Dịch vụ</th>
                    <th style={{ padding: 10, width: 90, textAlign: "center", color: "#475569" }}>Đơn vị tính</th>
                    <th style={{ padding: 10, width: 90, textAlign: "center", color: "#475569" }}>Số lượng</th>
                    <th style={{ padding: 10, width: 110, textAlign: "center", color: "#475569" }}>Chiết khấu (%)</th>
                    <th style={{ padding: 10, width: 130, textAlign: "right", color: "#475569" }}>Đơn giá (đ)</th>
                    <th style={{ padding: 10, width: 130, textAlign: "right", color: "#475569" }}>Thành tiền (đ)</th>
                    <th style={{ padding: 10, width: 40 }} />
                  </tr>
                </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)" }}>Chưa có sản phẩm nào</td></tr>
                ) : items.map((originalIt, idx) => {
                  const it = formItem.id === originalIt.id ? (formItem as any) : originalIt;
                  const isMainShortOfStock = it.soLuongTon !== null && it.soLuongTon !== undefined && it.soLuong > (it.soLuongTon as number);
                  const activeDinhMuc = (it.dinhMucs || []).find((dm: any) => dm.id === it.dinhMucId) || (it.dinhMucs && it.dinhMucs.length > 0 ? it.dinhMucs[0] : null);
                  const hasBOM = !!activeDinhMuc;
                  const isExpanded = !!expandedBOMRows[it.id];
                  return (
                    <React.Fragment key={it.id}>
                      <tr 
                        onClick={() => setFormItem(it)}
                        style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", background: formItem.id === it.id ? "rgba(0,0,0,0.03)" : "transparent" }}
                      >
                        <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                        <td style={{ padding: "6px 10px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {activeDinhMuc && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedBOMRows(prev => ({ ...prev, [it.id]: !prev[it.id] }));
                                  }}
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--primary)", display: "flex" }}
                                  title={isExpanded ? "Ẩn vật tư" : "Hiện vật tư"}
                                >
                                  <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 12, strokeWidth: 2 }}></i>
                                </button>
                              )}
                              <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{it.ten}</span>
                              {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
                                const ton = it.soLuongTon as number;
                                const isOutOfFinishedGood = ton === 0 || it.soLuong > ton;
                                if (!isOutOfFinishedGood) return null;

                                const matCheck = checkMaterialShortage(it);

                                return (
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {ton === 0 ? (
                                      <span title="Hết hàng thành phẩm" style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                                        <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>Hết hàng</span>
                                      </span>
                                    ) : (
                                      <span title={`Thiếu hàng (thực tồn: ${ton})`} style={{ color: "#f97316", display: "flex", alignItems: "center", gap: 4 }}>
                                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 13 }} />
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>Thiếu hàng (tồn: {ton})</span>
                                      </span>
                                    )}

                                    {matCheck.hasBOM && (
                                      matCheck.hasShortage ? (
                                        <span 
                                          title={`Không đủ vật tư sản xuất (${matCheck.missingCount} loại vật tư thiếu)`} 
                                          style={{ 
                                            color: "#dc2626", 
                                            background: "rgba(220, 38, 38, 0.08)", 
                                            padding: "1px 7px", 
                                            borderRadius: 12, 
                                            border: "1px solid rgba(220, 38, 38, 0.25)", 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 4 
                                          }}
                                        >
                                          <i className="bi bi-exclamation-octagon-fill" style={{ fontSize: 11 }} />
                                          <span style={{ fontSize: 11, fontWeight: 700 }}>Không đủ vật tư</span>
                                        </span>
                                      ) : (
                                        <span 
                                          title="Đủ vật tư để sản xuất" 
                                          style={{ 
                                            color: "#059669", 
                                            background: "rgba(5, 150, 105, 0.08)", 
                                            padding: "1px 7px", 
                                            borderRadius: 12, 
                                            border: "1px solid rgba(5, 150, 105, 0.25)", 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 4 
                                          }}
                                        >
                                          <i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} />
                                          <span style={{ fontSize: 11, fontWeight: 600 }}>Đủ vật tư SX</span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            {(() => {
                              const moTaDinhMuc = it.dinhMucTen || activeDinhMuc?.tenDinhMuc;
                              const dmCode = activeDinhMuc?.code || it.bomCode;
                              if (!moTaDinhMuc && !dmCode) return null;
                              return (
                                <div style={{ 
                                  fontSize: 11.5, 
                                  color: "var(--muted-foreground)", 
                                  paddingLeft: activeDinhMuc ? 18 : 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                  lineHeight: 1.3,
                                  marginTop: 2
                                }}>
                                  {dmCode && (
                                    <div style={{ display: "flex" }}>
                                      <span style={{
                                        fontFamily: "monospace",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: "#2563eb",
                                        background: "rgba(37, 99, 235, 0.08)",
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        whiteSpace: "nowrap",
                                        display: "inline-block"
                                      }}>
                                        {dmCode}
                                      </span>
                                    </div>
                                  )}
                                  {moTaDinhMuc && <span style={{ fontStyle: "italic", wordBreak: "break-word" }}>{moTaDinhMuc}</span>}
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: 6, textAlign: "center" }}>{it.dvt}</td>
                        <td style={{ padding: 6, textAlign: "center" }}>{it.soLuong}</td>
                        <td style={{ padding: 6, textAlign: "center" }}>{it.ckPct}</td>
                        <td style={{ padding: 6, textAlign: "right" }}>{fmt(it.donGia)}</td>
                        <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmt(thanhTien(it))} đ</td>
                        <td style={{ padding: 6 }}>
                          <button onClick={(e) => { e.stopPropagation(); removeRow(it.id); }} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                      {hasBOM && isExpanded && (
                        <tr style={{ background: "rgba(59,130,246,0.03)", borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={8} style={{ padding: "10px 10px 10px 40px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <div style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>Định mức vật tư ({activeDinhMuc.tenDinhMuc})</div>
                              {(() => {
                                const matCheck = checkMaterialShortage(it);
                                if (matCheck.hasShortage) {
                                  return (
                                    <span style={{
                                      color: "#dc2626",
                                      background: "rgba(220, 38, 38, 0.08)",
                                      padding: "2px 8px",
                                      borderRadius: 12,
                                      border: "1px solid rgba(220, 38, 38, 0.25)",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4
                                    }}>
                                      <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 11 }} />
                                      Không đủ vật tư ({matCheck.missingCount} loại thiếu)
                                    </span>
                                  );
                                }
                                return (
                                  <span style={{
                                    color: "#059669",
                                    background: "rgba(5, 150, 105, 0.08)",
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    border: "1px solid rgba(5, 150, 105, 0.25)",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4
                                  }}>
                                    <i className="bi bi-check-circle-fill" style={{ fontSize: 11 }} />
                                    Đủ vật tư sản xuất
                                  </span>
                                );
                              })()}
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: "var(--muted)", textAlign: "left", color: "var(--muted-foreground)" }}>
                                  <th style={{ padding: "6px 10px" }}>Mã VT</th>
                                  <th style={{ padding: "6px 10px" }}>Tên vật tư</th>
                                  <th style={{ padding: "6px 10px", textAlign: "center" }}>ĐVT</th>
                                  <th style={{ padding: "6px 10px", textAlign: "right" }}>SL / 1 SP</th>
                                  <th style={{ padding: "6px 10px", textAlign: "right" }}>Tổng SL cần</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeDinhMuc.vatTu && activeDinhMuc.vatTu.length > 0 ? activeDinhMuc.vatTu.map((vt: any, vtIdx: number) => {
                                  const vtStocks = vt.inventoryItem?.stocks || vt.material?.stocks || [];
                                  const vtRelevantStocks = vtStocks.filter((s: any) => s.warehouse?.code === "KHO-CHINH" || s.warehouse?.code === "KVP");
                                  const vtSoLuong = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuong || 0), 0);
                                  const vtSoLuongGiu = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
                                  const vtThucTon = Math.max(0, vtSoLuong - vtSoLuongGiu);
                                  const needed = vt.soLuong * it.soLuong;
                                  const isVTOOS = vtThucTon < needed;
                                  const vtName = vt.inventoryItem?.tenHang || vt.tenVatTu;

                                  return (
                                    <tr key={vt.id || vtIdx} style={{ borderBottom: "1px solid var(--border)" }}>
                                      <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{vt.inventoryItem?.code || vt.maVatTu || "-"}</td>
                                      <td style={{ padding: "6px 10px", fontWeight: 500, color: "var(--foreground)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          {vtName}
                                          {isVTOOS && (
                                            <span title={`Thiếu hàng (thực tồn: ${vtThucTon})`} style={{ color: "#f97316", display: "flex", alignItems: "center", gap: 4 }}>
                                              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 13 }} />
                                              <span style={{ fontSize: 11, fontWeight: 600 }}>Thiếu {needed - vtThucTon} (tồn {vtThucTon})</span>
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "center" }}>{vt.donViTinh || "-"}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{vt.soLuong}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "var(--primary)" }}>{needed}</td>
                                    </tr>
                                  );
                                }) : (
                                  <tr>
                                    <td colSpan={5} style={{ padding: "10px", textAlign: "center", color: "var(--muted-foreground)" }}>
                                      Định mức này chưa có chi tiết vật tư
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>

            {/* Mobile Cards List */}
            <div className="order-modal-mobile-list">
              {items.length === 0 ? (
                <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--muted-foreground)", background: "rgba(0,0,0,0.02)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 13 }}>
                  <i className="bi bi-bag-plus" style={{ fontSize: 24, display: "block", marginBottom: 4, opacity: 0.45 }} />
                  <span style={{ fontWeight: 600 }}>Chưa có sản phẩm nào</span>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Tìm và thêm sản phẩm từ biểu mẫu phía trên</div>
                </div>
              ) : (
                items.map((originalIt, idx) => {
                  const it = formItem.id === originalIt.id ? (formItem as any) : originalIt;
                  const isSelected = formItem.id === it.id;
                  const activeDinhMuc = (it.dinhMucs || []).find((dm: any) => dm.id === it.dinhMucId || String(dm.id) === String(it.dinhMucId)) || (it.dinhMucs && it.dinhMucs.length > 0 ? it.dinhMucs[0] : null);
                  const hasBOM = !!activeDinhMuc;
                  const isExpanded = !!expandedBOMRows[it.id];
                  const matCheck = checkMaterialShortage(it);
                  const moTaDinhMuc = it.dinhMucTen || activeDinhMuc?.tenDinhMuc;
                  const ton = it.soLuongTon as number;
                  const isOutOfFinishedGood = it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (ton === 0 || it.soLuong > ton);

                  return (
                    <div
                      key={it.id}
                      onClick={() => setFormItem(it)}
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.06)" : "var(--card)",
                        border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                      }}
                    >
                      {/* Row 1: Index + Title + Delete */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: "var(--muted)", color: "var(--muted-foreground)", borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)", lineHeight: 1.3, display: "block" }}>
                              {it.ten}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700, display: "inline-block", marginTop: 2 }}>
                                <i className="bi bi-pencil-square me-1" /> Đang chỉnh sửa
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRow(it.id);
                          }}
                          style={{
                            border: "none",
                            background: "rgba(239,68,68,0.08)",
                            color: "#ef4444",
                            borderRadius: 6,
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                          title="Xoá hàng"
                        >
                          <i className="bi bi-trash" style={{ fontSize: 13 }} />
                        </button>
                      </div>

                      {/* Row 2: Badges (Hết hàng / Thiếu vật tư / Đủ vật tư) */}
                      {isOutOfFinishedGood && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ton === 0 ? (
                            <span style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "1px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <i className="bi bi-x-circle-fill" style={{ fontSize: 10 }} /> Hết hàng
                            </span>
                          ) : (
                            <span style={{ color: "#f97316", background: "rgba(249,115,22,0.08)", padding: "1px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 10 }} /> Thiếu hàng (tồn: {ton})
                            </span>
                          )}
                          {matCheck.hasBOM && (
                            matCheck.hasShortage ? (
                              <span style={{ color: "#dc2626", background: "rgba(220, 38, 38, 0.08)", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(220, 38, 38, 0.25)", fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <i className="bi bi-exclamation-octagon-fill" style={{ fontSize: 10 }} /> Không đủ vật tư
                              </span>
                            ) : (
                              <span style={{ color: "#059669", background: "rgba(5, 150, 105, 0.08)", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(5, 150, 105, 0.25)", fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <i className="bi bi-check-circle-fill" style={{ fontSize: 10 }} /> Đủ vật tư SX
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* Row 3: BOM Code & Details Toggle */}
                      {hasBOM && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--muted)", padding: "4px 8px", borderRadius: 6, fontSize: 11 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {(activeDinhMuc?.code || it.bomCode) && (
                              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#2563eb", background: "rgba(37, 99, 235, 0.08)", padding: "0 4px", borderRadius: 3 }}>
                                {activeDinhMuc?.code || it.bomCode}
                              </span>
                            )}
                            {moTaDinhMuc && <span style={{ color: "var(--muted-foreground)" }}>{moTaDinhMuc}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedBOMRows(prev => ({ ...prev, [it.id]: !prev[it.id] }));
                            }}
                            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
                          >
                            {isExpanded ? "Ẩn VT" : "Xem VT"}
                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} />
                          </button>
                        </div>
                      )}

                      {/* Row 4: Quantity, Unit, Price, Discount, Total */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, borderTop: "1px dashed var(--border)", paddingTop: 6 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--muted-foreground)", fontSize: 11.5 }}>
                          <span>SL: <b style={{ color: "var(--foreground)" }}>{it.soLuong}</b> {it.dvt}</span>
                          <span>×</span>
                          <span>{fmt(it.donGia)} đ</span>
                          {it.ckPct > 0 && <span style={{ color: "#f59e0b", fontWeight: 600 }}>(-{it.ckPct}%)</span>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>
                            {fmt(thanhTien(it))} ₫
                          </span>
                        </div>
                      </div>

                      {/* Expanded BOM materials list */}
                      {hasBOM && isExpanded && (
                        <div style={{ background: "rgba(59,130,246,0.03)", borderRadius: 6, padding: "8px 10px", marginTop: 4, border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>
                            <span>Vật tư cần ({activeDinhMuc.vatTu?.length || 0})</span>
                            {matCheck.hasShortage ? (
                              <span style={{ color: "#dc2626" }}>Thiếu {matCheck.missingCount} loại</span>
                            ) : (
                              <span style={{ color: "#059669" }}>Đủ vật tư</span>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {activeDinhMuc.vatTu && activeDinhMuc.vatTu.length > 0 ? (
                              activeDinhMuc.vatTu.map((vt: any, vtIdx: number) => {
                                const vtStocks = vt.stocks || vt.inventoryItem?.stocks || vt.material?.stocks || [];
                                const vtRelevantStocks = vtStocks.filter((s: any) => {
                                  const c = s.warehouse?.code?.toUpperCase()?.trim();
                                  return c === "KHO-CHINH" || c === "KVP" || c === "KHO_CHINH";
                                });
                                const vtSoLuong = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuong || 0), 0);
                                const vtSoLuongGiu = vtRelevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
                                const vtThucTon = Math.max(0, vtSoLuong - vtSoLuongGiu);
                                const needed = (vt.soLuong || 0) * (it.soLuong || 0);
                                const isVTOOS = vtThucTon < needed;
                                const vtName = vt.material?.tenVatTu || vt.inventoryItem?.tenHang || vt.tenVatTu || "Vật tư";
                                const vtCode = vt.material?.code || vt.inventoryItem?.code || vt.maVatTu || "-";
                                return (
                                  <div key={vt.id || vtIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "1px dashed rgba(0,0,0,0.06)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
                                      <span style={{ fontFamily: "monospace", fontSize: 9.5, color: "var(--muted-foreground)" }}>{vtCode}</span>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground)" }}>{vtName}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                      <span style={{ fontWeight: 600, color: "var(--primary)" }}>{needed} {vt.donViTinh || vt.dvt || ""}</span>
                                      {isVTOOS ? (
                                        <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }} title={`Tồn ${vtThucTon}`}>Thiếu {needed - vtThucTon}</span>
                                      ) : (
                                        <span style={{ color: "#059669", fontSize: 10 }}>Đủ</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>Chưa có chi tiết vật tư</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom summaries */}
          <div className="order-modal-footer" style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", flexShrink: 0 }}>
            <div className="order-modal-footer-bottom" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="order-modal-footer-payment" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Đã trả:</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 140 }}>
                    <Input
                      type="text"
                      value={info.daThanhToan ? info.daThanhToan.toLocaleString("vi-VN") : ""}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/\D/g, ""));
                        setInfo(f => ({ ...f, daThanhToan: val }));
                      }}
                      placeholder="0"
                      suffix="₫"
                      style={{ height: 34, fontSize: 14, fontWeight: 700 }}
                    />
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", marginLeft: 4 }}>
                    <Toggle 
                      checked={info.isChuyenKhoan} 
                      onChange={(val) => setInfo(f => ({ ...f, isChuyenKhoan: val }))}
                      label="Chuyển khoản"
                    />
                  </div>
                </div>
              </div>
              <div className="order-modal-footer-mobile-grandtotal">
                <span>TỔNG CỘNG</span>
                <span>{fmt(tongCong)} ₫</span>
              </div>
            </div>

            <div className="order-modal-footer-totals" style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Tạm tính</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>{fmt(tamTinh)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Khấu trừ</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>− {fmt(ckTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Thuế</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>+ {fmt(thueTien)} ₫</p></div>
              {info.chiPhiKhac > 0 && <div><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>CP khác</p><p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>+ {fmt(info.chiPhiKhac)} ₫</p></div>}
              <div className="order-modal-footer-grandtotal"><p style={{ margin: 0, fontSize: 11, color: "#003087", fontWeight: 700 }}>TỔNG CỘNG</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#003087" }}>{fmt(tongCong)} ₫</p></div>
            </div>
          </div>
        </div>
      </div>

      <Offcanvas
        isOpen={showBomDetail}
        onClose={() => setShowBomDetail(false)}
        title="Chi tiết định mức"
        width="400px"
        icon={<i className="bi bi-diagram-3-fill text-blue-600" style={{ fontSize: 20 }} />}
        bodyStyle={{ padding: 0 }}
      >
              {loadingBom ? (
                <div className="text-center p-5 text-muted d-flex flex-column align-items-center justify-content-center h-100">
                  <div className="spinner-border text-primary mb-3" style={{ width: "2rem", height: "2rem" }}></div>
                  <span style={{ fontSize: 14 }}>Đang tải dữ liệu định mức...</span>
                </div>
              ) : bomDetailData ? (
                <div className="d-flex flex-column h-100 bg-light">
                  <div className="p-4 bg-white" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge px-2 py-1" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: 10, letterSpacing: 0.5, fontWeight: 700 }}>
                        <i className="bi bi-diagram-3 me-1"></i> B.O.M
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <h5 className="mb-0 fw-bold" style={{ color: "var(--foreground)" }}>
                        {hasBomChanged ? (previewCode || `${originalBomData?.code}-XX`) : bomDetailData.code}
                      </h5>
                      <span className="fw-bold text-primary" style={{ fontSize: 15 }}>{fmt(Number(proposedDonGia || 0))} ₫</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="mb-0 text-muted" style={{ fontSize: 13 }}>
                        {originalBomData?.tenDinhMuc || bomDetailData.tenDinhMuc}
                      </p>
                      <div className="text-end text-muted" style={{ fontSize: 12 }}>
                        Giá vốn: <span className="fw-semibold text-danger">*** ₫</span>
                        <span className="mx-1">|</span>
                        Tỷ lệ: <span className="fw-semibold text-success">
                          ***x
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 d-flex align-items-center gap-2">
                      <div className="flex-1">
                        <Input 
                          placeholder="Mô tả định mức mới (bắt buộc)" 
                          value={newBomDescription}
                          onChange={e => setNewBomDescription(e.target.value)}
                          disabled={!hasBomChanged || savingNewBom}
                          style={{ height: 32, fontSize: 13 }}
                        />
                      </div>
                      <Button 
                        variant="primary"
                        size="sm"
                        style={{ width: 32, height: 32, padding: 0 }}
                        onClick={handleSaveNewBom}
                        disabled={!hasBomChanged || !newBomDescription.trim() || savingNewBom}
                        isLoading={savingNewBom}
                        title="Lưu định mức mới"
                      >
                        {!savingNewBom && <i className="bi bi-floppy"></i>}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <p className="fw-bold mb-0 text-uppercase" style={{ fontSize: 11, letterSpacing: 0.5, color: "var(--muted-foreground)" }}>
                        Thành phần nguyên vật liệu
                      </p>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
                        {bomDetailData.vatTu?.length || 0} mục
                      </span>
                    </div>

                    {bomDetailData.vatTu?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {bomDetailData.vatTu.map((vt: any, idx: number) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between p-2 px-3 bg-white" style={{ border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32, background: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
                                <i className="bi bi-box-seam" style={{ fontSize: 14 }}></i>
                              </div>
                              <div>
                                <h6 className="mb-0 fw-semibold" style={{ fontSize: 13, color: "var(--foreground)" }}>
                                  {vt.material?.tenHang || vt.material?.name || vt.tenVatTu}
                                </h6>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Mã: {vt.material?.code || "---"}
                                </span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <div className="dropdown position-relative">
                                <button 
                                  className="btn btn-sm btn-link p-0 text-muted" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveVtMenu(activeVtMenu === idx ? null : idx);
                                  }}
                                  title="Tuỳ chọn"
                                >
                                  <i className="bi bi-three-dots-vertical"></i>
                                </button>
                                {activeVtMenu === idx && (
                                  <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 p-1 show" style={{ position: "absolute", top: "100%", right: 0, zIndex: 1050, display: "block", fontSize: 13, minWidth: 160, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
                                    <li>
                                      <button 
                                        className="dropdown-item py-1.5 px-3 rounded-2 text-success d-flex align-items-center" 
                                        onClick={() => {
                                          setActiveVtMenu(null);
                                          setAddMaterialTargetIndex(idx);
                                          setShowAddMaterial(true);
                                        }}
                                      >
                                        <i className="bi bi-plus-circle me-2"></i>Thêm mới
                                      </button>
                                    </li>
                                    {vt.material?.category?.id && (
                                      <li>
                                        <button className="dropdown-item py-1.5 px-3 rounded-2 d-flex align-items-center" onClick={() => {
                                          setActiveVtMenu(null);
                                          setAlternativeTarget(vt);
                                          setShowAlternative(true);
                                        }}>
                                          <i className="bi bi-arrow-left-right me-2 text-primary"></i>Thay thế
                                        </button>
                                      </li>
                                    )}
                                    <li>
                                      <button 
                                        className="dropdown-item py-1.5 px-3 rounded-2 text-danger d-flex align-items-center" 
                                        onClick={() => {
                                          setActiveVtMenu(null);
                                          setTargetDeleteMaterial(vt);
                                        }}
                                      >
                                        <i className="bi bi-trash me-2"></i>Xoá bỏ
                                      </button>
                                    </li>
                                  </ul>
                                )}
                              </div>
                              <div className="text-end border-start ps-3 flex-shrink-0">
                                <span className="fw-bold d-block text-primary" style={{ fontSize: 15 }}>{vt.soLuong}</span>
                                <span className="text-muted text-uppercase" style={{ fontSize: 10, fontWeight: 600 }}>{vt.donViTinh || vt.material?.unit || vt.material?.donVi}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-3 border" style={{ borderStyle: "dashed !important" }}>
                        <i className="bi bi-inboxes text-muted opacity-50 d-block mb-2" style={{ fontSize: 24 }}></i>
                        <p className="small text-muted fst-italic mb-0">Định mức này chưa có thành phần vật tư.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-5 text-muted d-flex flex-column align-items-center h-100 justify-content-center">
                  <i className="bi bi-exclamation-circle mb-2" style={{ fontSize: 24 }}></i>
                  Không tải được dữ liệu định mức.
                </div>
              )}
      </Offcanvas>

          {/* Modal xem danh sách vật tư thay thế */}
          {showAlternative && (
            <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ height: "85vh" }}>
                  <div className="modal-header border-bottom-0 pb-0">
                    <h5 className="modal-title fw-bold">Vật tư thay thế cùng loại</h5>
                    <button type="button" className="btn-close" onClick={() => setShowAlternative(false)}></button>
                  </div>
                  <div className="bg-white p-3 border-bottom rounded-top">
                    <p className="mb-1 text-muted" style={{ fontSize: 12 }}>Đang xem vật tư thay thế cho:</p>
                    <h6 className="mb-3 fw-semibold text-primary">{alternativeTarget?.material?.name || alternativeTarget?.material?.tenHang || alternativeTarget?.tenVatTu}</h6>
                    <div className="d-flex flex-wrap gap-3 text-secondary mb-3" style={{ fontSize: "0.75rem" }}>
                      <span>Mã TP: <strong className="text-dark">{alternativeTarget?.material?.code || "N/A"}</strong></span>
                      <span>Mã nhóm PM: <strong className="text-dark">{alternativeTarget?.material?.category?.code || alternativeTarget?.material?.category?.name || "N/A"}</strong></span>
                      <span>Mã thay thế: <strong className="text-dark">{(alternativeTarget?.material as any)?.maThayThe || "N/A"}</strong></span>
                    </div>
                    <div className="d-flex align-items-center gap-1 mb-3 p-1 rounded-lg" style={{ background: "#f1f5f9", width: "fit-content" }}>
                      <button
                        type="button"
                        onClick={() => setSwapSearchMode("exact")}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: "none",
                          fontSize: 12,
                          fontWeight: swapSearchMode === "exact" ? 600 : 500,
                          backgroundColor: swapSearchMode === "exact" ? "#ffffff" : "transparent",
                          color: swapSearchMode === "exact" ? "#003087" : "#64748b",
                          boxShadow: swapSearchMode === "exact" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Chính xác
                      </button>
                      <button
                        type="button"
                        onClick={() => setSwapSearchMode("group")}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: "none",
                          fontSize: 12,
                          fontWeight: swapSearchMode === "group" ? 600 : 500,
                          backgroundColor: swapSearchMode === "group" ? "#ffffff" : "transparent",
                          color: swapSearchMode === "group" ? "#003087" : "#64748b",
                          boxShadow: swapSearchMode === "group" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Theo nhóm
                      </button>
                    </div>
                    <div>
                      <Input 
                        placeholder="Tìm kiếm theo mã hoặc tên..."
                        value={altSearch}
                        onChange={e => setAltSearch(e.target.value)}
                        leftIcon={<i className="bi bi-search text-muted" />}
                        style={{ height: 36, fontSize: 13 }}
                      />
                    </div>
                  </div>
                  <div className="modal-body bg-light p-3">
                    {loadingAlternatives ? (
                      <div className="text-center p-4">
                        <div className="spinner-border text-primary" role="status"></div>
                      </div>
                    ) : alternativeMaterials.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {Object.entries(
                          alternativeMaterials.filter(m => {
                            if (!altSearch.trim()) return true;
                            const q = altSearch.toLowerCase();
                            return (m.name || m.tenHang || "").toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q);
                          }).reduce((acc: any, alt: any) => {
                            const cat = alt.categoryName || alt.category?.name || "Vật tư khác";
                            if (!acc[cat]) acc[cat] = [];
                            acc[cat].push(alt);
                            return acc;
                          }, {})
                        ).map(([catName, items]: [string, any]) => (
                          <div key={catName} className="mb-2">
                            <h6 className="mb-2 fw-bold text-uppercase text-muted" style={{ fontSize: 11, letterSpacing: 0.5 }}>
                              {catName} <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill ms-1">{items.length}</span>
                            </h6>
                            <div className="d-flex flex-column gap-2">
                                    {items.map((alt: any, idx: number) => {
                                      const targetExactCode = ((alternativeTarget.material as any)?.maThayThe || alternativeTarget.material?.code || "").toLowerCase();
                                      const altMaThayThe = (alt.maThayThe || "").toLowerCase();
                                      const altCode = (alt.code || "").toLowerCase();
                                      const isCungLoai = targetExactCode && ((altMaThayThe && altMaThayThe.includes(targetExactCode)) || altCode.includes(targetExactCode));
                                      
                                      return (
                                        <div key={idx} className="p-3 bg-white d-flex align-items-center justify-content-between" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
                                          <div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                              <h6 className="mb-0 fw-semibold" style={{ fontSize: 13 }}>{alt.name || alt.tenHang}</h6>
                                              {isCungLoai ? (
                                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" style={{ fontSize: 10, padding: "2px 6px" }}>Cùng loại</span>
                                              ) : (
                                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25" style={{ fontSize: 10, padding: "2px 6px" }}>Cùng nhóm</span>
                                              )}
                                            </div>
                                            <span className="text-muted" style={{ fontSize: 11 }}>
                                              Mã: {alt.code} | Đơn vị: {alt.unit || alt.donVi} <span className="mx-1">|</span> Giá bán: <span className="fw-semibold text-primary">{fmt(alt.giaBan || 0)} ₫</span>
                                            </span>
                                          </div>
                                  <div className="d-flex align-items-center gap-3">
                                    <div className="text-end ps-2 border-start">
                                      <span className="d-block text-muted" style={{ fontSize: 10 }}>TỒN KHO</span>
                                      <span className="fw-bold" style={{ fontSize: 14 }}>{alt.stocks?.reduce((acc: any, s: any) => acc + s.soLuong, 0) || 0}</span>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleSwapMaterial(alt)}>
                                      Chọn
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted">
                          Không tìm thấy vật tư nào khác cùng loại.
                        </div>
                      )}
                  </div>
                  <div className="modal-footer bg-white border-top">
                    <Button variant="secondary" onClick={() => setShowAlternative(false)}>Đóng</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal tìm và thêm vật tư mới */}
          {showAddMaterial && (
            <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ height: "85vh" }}>
                  <div className="modal-header border-bottom-0 pb-0">
                    <h5 className="modal-title fw-bold">Thêm mới vật tư</h5>
                    <button type="button" className="btn-close" onClick={() => setShowAddMaterial(false)}></button>
                  </div>
                  <div className="bg-white p-3 border-bottom rounded-top">
                    <div className="d-flex gap-2">
                      <div style={{ width: 180 }}>
                        <Select 
                          value={addCategory} 
                          onChange={e => setAddCategory(e.target.value)}
                          options={[
                            { value: "", label: "Tất cả danh mục" },
                            ...addCategories.map((c: any) => ({ value: c.id, label: c.name }))
                          ]}
                          style={{ height: 36, fontSize: 13 }}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <Input 
                          placeholder="Tìm kiếm theo mã hoặc tên..."
                          value={addSearch}
                          onChange={e => setAddSearch(e.target.value)}
                          leftIcon={<i className="bi bi-search text-muted" />}
                          style={{ height: 36, fontSize: 13 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-body bg-light p-3">
                    {loadingAddMaterials ? (
                      <div className="text-center p-4">
                        <div className="spinner-border text-primary" role="status"></div>
                      </div>
                    ) : addMaterials.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {addMaterials.filter(m => {
                          if (addCategory && m.categoryId !== addCategory) return false;
                          if (!addSearch.trim()) return true;
                          const q = addSearch.toLowerCase();
                          return (m.name || m.tenHang || "").toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q);
                        }).slice(0, 50).map((alt, idx) => (
                            <div key={idx} className="p-3 bg-white d-flex align-items-center justify-content-between" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
                              <div className="flex-grow-1 pe-3">
                                <h6 className="mb-1 fw-semibold" style={{ fontSize: 13 }}>{alt.name || alt.tenHang}</h6>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Mã: {alt.code} | Đơn vị: {alt.unit || alt.donVi} <span className="mx-1">|</span> Giá bán: <span className="fw-semibold text-primary">{fmt(alt.giaBan || 0)} ₫</span>
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <div className="text-end ps-2 border-start">
                                  <span className="d-block text-muted" style={{ fontSize: 10 }}>TỒN KHO</span>
                                  <span className="fw-bold" style={{ fontSize: 14 }}>{alt.stocks?.reduce((acc: any, s: any) => acc + s.soLuong, 0) || 0}</span>
                                </div>
                                <div style={{ width: 64 }}>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    value={addQuantities[alt.id] || 1}
                                    onChange={(e) => setAddQuantities(p => ({ ...p, [alt.id]: Math.max(1, Number(e.target.value)) }))}
                                    style={{ height: 32, fontSize: 13, textAlign: "center" }} 
                                  />
                                </div>
                                <Button size="sm" variant="success" onClick={() => handleAddMaterial(alt)} title="Thêm vật tư" style={{ padding: "0 10px", height: 32 }}>
                                  <i className="bi bi-plus-lg"></i>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted">
                          Không tìm thấy vật tư nào.
                        </div>
                      )}
                  </div>
                  <div className="modal-footer bg-white border-top">
                    <Button variant="secondary" onClick={() => setShowAddMaterial(false)}>Đóng</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
      <ConfirmDialog
        open={confirmDeleteBom}
        variant="danger"
        title="Xoá định mức?"
        message="Bạn có chắc chắn muốn xoá định mức này khỏi hệ thống? Thao tác này không thể hoàn tác."
        confirmLabel="Xoá định mức"
        loading={isDeletingBom}
        onConfirm={handleDeleteBom}
        onCancel={() => setConfirmDeleteBom(false)}
      />

      <ConfirmDialog
        open={!!targetDeleteMaterial}
        variant="danger"
        title="Xoá vật tư?"
        message={`Bạn có chắc chắn muốn xoá vật tư "${targetDeleteMaterial?.tenVatTu || targetDeleteMaterial?.material?.name || targetDeleteMaterial?.material?.tenHang || 'này'}" khỏi định mức?`}
        confirmLabel="Xoá"
        onConfirm={handleDeleteMaterial}
        onCancel={() => setTargetDeleteMaterial(null)}
      />
    </div>
  );
}
