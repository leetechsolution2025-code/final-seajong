import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { StepPage } from "@/components/common/StepPage";
import type { ModernStepItem } from "@/types";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Input } from "@/components/common/Input";
import { NumberInput } from "@/components/common/NumberInput";
import { Select } from "@/components/common/Select";
import { Modal } from "@/components/common/Modal";
import { Offcanvas } from "@/components/common/Offcanvas";
import { DeleteButton } from "@/components/common/DeleteButton";
import { WarehouseCategoryFilter } from "@/components/common/WarehouseCategoryFilter";
import {
  ItemSuggestionSelect,
  type ItemSuggestionOption,
} from "@/components/common/ItemSuggestionSelect";
import { EventOffcanvas } from "@/components/common/EventOffcanvas";
import UpdatePriceOffcanvas from "@/components/ui/UpdatePriceOffcanvas";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { canManageProdBom } from "@/lib/production-permissions";
import BomDiffOffcanvas from "@/components/production/BomDiffOffcanvas";
import {
  PlusLg,
  Upload,
  Trash,
  ArrowLeftRight,
  CalendarEvent,
  ArrowRepeat,
  PencilSquare,
  HourglassSplit,
  CheckCircleFill,
  Diagram3,
  Check2Circle,
  Sliders,
} from "react-bootstrap-icons";

const stickyThStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  backgroundColor: "#f8fafc",
  boxShadow: "inset 0 -1px 0 #e2e8f0",
};

export function ProductionBomPage() {
  const { data: session } = useSession();
  const isProdAdmin = canManageProdBom(session?.user);
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  // StepPage: 1 = Chưa có định mức, 2 = Đã có định mức
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [bomCounts, setBomCounts] = useState<{ noBomCount: number; hasBomCount: number }>({
    noBomCount: 0,
    hasBomCount: 0,
  });

  // Product table state
  const [products, setProducts] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);

  // Selected product & Fullscreen BOM + Pricing Modal state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [bomData, setBomData] = useState<any>({
    code: "",
    tenDinhMuc: "",
    vatTu: [],
  });
  const [pricingForm, setPricingForm] = useState<{
    marginPct: number;
    marginType: "cost" | "revenue";
    officialPrice: number;
  }>({
    marginPct: 30,
    marginType: "cost",
    officialPrice: 0,
  });
  const [standardBomData, setStandardBomData] = useState<any>(null);
  const [showBomDiff, setShowBomDiff] = useState(false);
  const [loadingBom, setLoadingBom] = useState(false);
  const [saving, setSaving] = useState(false);

  // Material suggestion state (for ItemSuggestionSelect)
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [materialPickerResetKey, setMaterialPickerResetKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swap material Offcanvas state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [swapSearchMode, setSwapSearchMode] = useState<"exact" | "group">("exact");
  const [swapSearchText, setSwapSearchText] = useState("");
  const [swapBaseExact, setSwapBaseExact] = useState("");
  const [swapBaseGroup, setSwapBaseGroup] = useState("");
  const [swapBaseOptions, setSwapBaseOptions] = useState<any[]>([]);
  const [swapCounts, setSwapCounts] = useState<Record<string, number>>({});

  // Add / Edit Product Offcanvas state
  const [productGroups, setProductGroups] = useState<{ id: string; name: string }[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    code: "",
    name: "",
    categoryId: "",
    unit: "bộ",
    defaultWarehouse: "KHO-CHINH",
    notes: "",
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Bulk Price Ratio Offcanvas state
  const [showBulkPriceOffcanvas, setShowBulkPriceOffcanvas] = useState(false);

  // Load categories for Add/Edit Product Offcanvas
  useEffect(() => {
    fetch("/api/plan-finance/categories?types=danh_muc_thanh_pham,vat_tu_san_xuat")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProductGroups(data);
      })
      .catch(console.error);
  }, []);

  // Auto-generate product code when creating new product
  useEffect(() => {
    if (newProduct.categoryId && !editProductId) {
      fetch(`/api/logistics/inventory/generate-code?categoryId=${newProduct.categoryId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.code) {
            setNewProduct((prev) => ({ ...prev, code: data.code }));
          }
        })
        .catch(console.error);
    }
  }, [newProduct.categoryId, editProductId]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const bomStatus = currentStep === 1 ? "no-bom" : "has-bom";
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
        search,
        categoryId: filterCategoryId,
        bomStatus,
      });
      if (filterWarehouse && filterWarehouse !== "all") {
        params.set("warehouseId", filterWarehouse);
      } else {
        params.set("warehouseCode", "KVP");
      }

      const res = await fetch(`/api/logistics/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalItems(data.total ?? (data.items ? data.items.length : 0));
        if (data.bomCounts) {
          setBomCounts({
            noBomCount: Number(data.bomCounts.noBomCount) || 0,
            hasBomCount: Number(data.bomCounts.hasBomCount) || 0,
          });
        }
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Không thể tải danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  }, [currentStep, page, pageSize, search, filterWarehouse, filterCategoryId, toastError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load materials catalog when BOM Modal opens
  useEffect(() => {
    if (isBomModalOpen && !materialsLoaded) {
      fetch(`/api/logistics/inventory?warehouseCode=KVP&page=1&nolimit=true&excludeDinhMucs=true`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.items)) {
            setMaterials(data.items);
            setMaterialsLoaded(true);
          }
        })
        .catch(console.error);
    }
  }, [isBomModalOpen, materialsLoaded]);

  // Load standard BOM for diff comparison
  useEffect(() => {
    if (isBomModalOpen && selectedProduct && selectedProduct.dinhMucs?.length > 0) {
      const standardBomCode = `DM-${selectedProduct.code}`;
      const standardBom = selectedProduct.dinhMucs.find((dm: any) => dm.code === standardBomCode);
      const targetId = standardBom?.id || selectedProduct.dinhMucs[0].id;

      fetch(`/api/production/bom/${targetId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setStandardBomData(data || null);
        })
        .catch(() => setStandardBomData(null));
    } else {
      setStandardBomData(null);
    }
  }, [isBomModalOpen, selectedProduct]);

  // Load swap options when Swap Offcanvas opens
  useEffect(() => {
    if (showSwapModal) {
      if (swapSearchMode === "exact" && !swapBaseExact) {
        setSwapBaseOptions([]);
        return;
      }
      if (swapSearchMode === "group" && !swapBaseGroup) {
        setSwapBaseOptions([]);
        return;
      }

      let url = `/api/logistics/inventory?warehouseCode=KVP&page=1&nolimit=true&excludeDinhMucs=true`;
      if (swapSearchMode === "exact") {
        url += `&exactCode=${encodeURIComponent(swapBaseExact)}`;
      } else if (swapSearchMode === "group") {
        url += `&categoryId=${encodeURIComponent(swapBaseGroup)}`;
      }

      fetch(url)
        .then((res) => res.json())
        .then((data) => setSwapBaseOptions(data.items || []))
        .catch(console.error);
    }
  }, [swapBaseExact, swapBaseGroup, swapSearchMode, showSwapModal]);

  // Check swap candidate counts per material category code
  useEffect(() => {
    if (isBomModalOpen && bomData?.vatTu?.length > 0) {
      bomData.vatTu.forEach((row: any) => {
        const query = row.material?.category?.code || "";
        if (!query) {
          setSwapCounts((prev) => ({ ...prev, [row.id || row.tenVatTu]: 0 }));
          return;
        }
        setSwapCounts((prev) => {
          if (prev[query] !== undefined) return prev;
          const next = { ...prev, [query]: -1 };
          fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&page=1`)
            .then((res) => res.json())
            .then((data) => {
              setSwapCounts((p) => ({ ...p, [query]: data.items?.length || 0 }));
            })
            .catch(() => {
              setSwapCounts((p) => ({ ...p, [query]: 0 }));
            });
          return next;
        });
      });
    }
  }, [isBomModalOpen, bomData?.vatTu]);

  const swapOptions = useMemo(
    () =>
      swapBaseOptions.filter(
        (m) =>
          !swapSearchText ||
          (m.name || m.tenHang || "").toLowerCase().includes(swapSearchText.toLowerCase()) ||
          (m.code || "").toLowerCase().includes(swapSearchText.toLowerCase())
      ),
    [swapBaseOptions, swapSearchText]
  );

  const materialSuggestionOptions: ItemSuggestionOption[] = useMemo(() => {
    const existingIds = new Set(
      (bomData.vatTu || []).map((v: any) => v.materialId || v.inventoryItemId).filter(Boolean)
    );
    return materials
      .filter((m) => m.id !== selectedProduct?.id && !existingIds.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.tenHang || m.name || "Chưa đặt tên",
        code: m.code,
        donVi: m.donVi || m.unit || "cái",
        soLuong: m.thucTon ?? m.soLuong ?? 0,
        categoryName: m.categoryName || m.category?.name || "",
      }));
  }, [materials, bomData.vatTu, selectedProduct?.id]);

  const isStandardBom = bomData?.code === `DM-${selectedProduct?.code}`;

  const hasPricingChanged = useMemo(() => {
    if (!selectedProduct) return false;
    const origPct =
      selectedProduct.loiNhuanKyVong !== undefined && selectedProduct.loiNhuanKyVong !== null
        ? Number(selectedProduct.loiNhuanKyVong)
        : 30;
    const origType = selectedProduct.phuongPhapTinhLoiNhuan === "revenue" ? "revenue" : "cost";
    const origPrice = Number(selectedProduct.giaBan) || 0;
    return (
      pricingForm.marginPct !== origPct ||
      pricingForm.marginType !== origType ||
      pricingForm.officialPrice !== origPrice
    );
  }, [selectedProduct, pricingForm]);

  const isSameAsStandard = useMemo(() => {
    if (isStandardBom) return false;
    if (hasPricingChanged) return false;
    if (!standardBomData || !bomData.vatTu) return false;

    const standardVatTu = standardBomData.vatTu || [];
    const currentVatTu = bomData.vatTu || [];

    if (standardVatTu.length !== currentVatTu.length) return false;

    const stdMap = new Map();
    standardVatTu.forEach((v: any) => stdMap.set(v.material?.code || v.maVatTu, v.soLuong));

    for (const v of currentVatTu) {
      const key = v.material?.code || v.maVatTu;
      if (!stdMap.has(key)) return false;
      if (stdMap.get(key) !== v.soLuong) return false;
    }

    return true;
  }, [bomData.vatTu, standardBomData, isStandardBom, hasPricingChanged]);

  const totalMaterialCost = useMemo(
    () =>
      (bomData.vatTu || []).reduce(
        (sum: number, item: any) =>
          sum +
          (Number(item.soLuong) || 0) *
            (item.material?.price ||
              item.material?.giaNhap ||
              item.inventoryItem?.giaNhap ||
              0),
        0
      ),
    [bomData.vatTu]
  );

  const calculatedPrice = useMemo(() => {
    const pct = Number(pricingForm.marginPct) || 0;
    let raw = 0;
    if (pricingForm.marginType === "revenue") {
      raw = pct < 100 ? totalMaterialCost / (1 - pct / 100) : 0;
    } else {
      raw = totalMaterialCost * (1 + pct / 100);
    }
    return Math.round(raw / 1000) * 1000;
  }, [totalMaterialCost, pricingForm.marginPct, pricingForm.marginType]);

  const steps: ModernStepItem[] = useMemo(
    () => [
      {
        num: 1,
        id: "no-bom",
        title: "Chưa có định mức",
        mobileTitle: "Chưa có ĐM",
        desc: "Các thành phẩm và bán thành phẩm chưa được thiết lập định mức vật tư",
        badge: `${bomCounts.noBomCount} sản phẩm`,
        badgeVariant: "warning",
        icon: <HourglassSplit size={16} />,
      },
      {
        num: 2,
        id: "has-bom",
        title: "Đã có định mức",
        mobileTitle: "Đã có ĐM",
        desc: "Các thành phẩm đã xây dựng định mức nguyên vật liệu và cấu thành giá vốn",
        badge: `${bomCounts.hasBomCount} sản phẩm`,
        badgeVariant: "success",
        icon: <CheckCircleFill size={16} />,
      },
    ],
    [bomCounts.noBomCount, bomCounts.hasBomCount]
  );

  const resetProductForm = () => {
    setNewProduct({
      code: "",
      name: "",
      categoryId: "",
      unit: "bộ",
      defaultWarehouse: "KHO-CHINH",
      notes: "",
    });
    setEditProductId(null);
  };

  const syncEditProductState = (product: any) => {
    setEditProductId(product.id);
    setNewProduct({
      code: product.code || "",
      name: product.tenHang || product.name || "",
      categoryId: product.categoryId || "",
      unit: product.donVi || product.unit || "bộ",
      defaultWarehouse: product.defaultWarehouse || "KHO-CHINH",
      notes: product.notes || "",
    });
  };

  const syncPricingState = (product: any) => {
    setPricingForm({
      marginPct:
        product?.loiNhuanKyVong !== undefined && product?.loiNhuanKyVong !== null
          ? Number(product.loiNhuanKyVong)
          : 30,
      marginType: product?.phuongPhapTinhLoiNhuan === "revenue" ? "revenue" : "cost",
      officialPrice: Number(product?.giaBan) || 0,
    });
  };

  const fetchBom = async (bomId: string | null, product: any = null) => {
    if (!bomId) {
      setBomData({
        id: "",
        code: `DM-${(
          product?.code || Math.random().toString(36).substring(2, 8).toUpperCase()
        ).replace(/MẠ/g, "MA")}`,
        tenDinhMuc: `Định mức tiêu chuẩn ${product?.tenHang || product?.name || ""}`,
        vatTu: [],
      });
      return;
    }
    setLoadingBom(true);
    try {
      const res = await fetch(`/api/production/bom/${bomId}`);
      if (res.ok) {
        const data = await res.json();
        setBomData(data);
      } else {
        toastError("Lỗi", "Không tìm thấy định mức");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi khi tải định mức");
    } finally {
      setLoadingBom(false);
    }
  };

  const handleOpenBomModal = (product: any, specificBomId?: string) => {
    setSelectedProduct(product);
    syncEditProductState(product);
    syncPricingState(product);
    setIsBomModalOpen(true);

    if (specificBomId) {
      fetchBom(specificBomId, product);
    } else if (product.dinhMucs && product.dinhMucs.length > 0) {
      const stdCode = `DM-${product.code}`;
      const stdBom = product.dinhMucs.find((dm: any) => dm.code === stdCode);
      fetchBom((stdBom || product.dinhMucs[0]).id, product);
    } else {
      fetchBom(null, product);
    }
  };

  const handleOpenEditProduct = (product: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    syncEditProductState(product);
    setShowAddProduct(true);
  };

  const handleSaveProduct = async () => {
    if (!isProdAdmin) {
      toastError(
        "Không có quyền",
        "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền thao tác sản phẩm"
      );
      return;
    }
    if (!newProduct.name.trim()) {
      toastError("Lỗi", "Vui lòng nhập tên sản phẩm");
      return;
    }
    setSavingProduct(true);
    try {
      const method = editProductId ? "PUT" : "POST";
      const res = await fetch("/api/logistics/inventory", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          id: editProductId || undefined,
          warehouseCode: "KHO-CHINH",
        }),
      });
      if (res.ok) {
        toastSuccess(
          "Thành công",
          editProductId ? "Cập nhật sản phẩm thành công" : "Thêm sản phẩm thành công"
        );
        if (selectedProduct && editProductId === selectedProduct.id) {
          setSelectedProduct((prev: any) =>
            prev
              ? {
                  ...prev,
                  code: newProduct.code,
                  tenHang: newProduct.name,
                  name: newProduct.name,
                  donVi: newProduct.unit,
                  unit: newProduct.unit,
                  categoryId: newProduct.categoryId,
                }
              : prev
          );
        }
        setShowAddProduct(false);
        if (!isBomModalOpen) resetProductForm();
        fetchProducts();
      } else {
        const error = await res.json();
        toastError("Lỗi", error.error || "Thất bại");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editProductId) return;
    try {
      const res = await fetch(`/api/logistics/inventory/${editProductId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa sản phẩm");
        setShowAddProduct(false);
        if (selectedProduct?.id === editProductId) {
          setIsBomModalOpen(false);
          setSelectedProduct(null);
        }
        resetProductForm();
        fetchProducts();
      } else {
        const errorData = await res.json();
        toastError("Lỗi", errorData.error || "Không thể xóa sản phẩm");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toastSuccess("Đã nhận tệp", `Đang đồng bộ định mức từ ${file.name}...`);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fetchProducts();
  };

  const refreshSelectedProductAndList = async (preferredBomId?: string | null) => {
    fetchProducts();
    if (!selectedProduct?.code) return;
    try {
      const updatedRes = await fetch(
        `/api/logistics/inventory?warehouseCode=KVP&search=${encodeURIComponent(
          selectedProduct.code
        )}&nolimit=true`
      );
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        const match = (updatedData.items || []).find((p: any) => p.id === selectedProduct.id);
        if (match) {
          setSelectedProduct(match);
          syncPricingState(match);
          const targetId =
            preferredBomId !== undefined
              ? preferredBomId
              : match.dinhMucs?.[0]?.id || null;
          fetchBom(targetId, match);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBom = async () => {
    if (!isProdAdmin) {
      toastError(
        "Không có quyền",
        "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xoá định mức"
      );
      return;
    }
    if (!bomData.id) return;
    try {
      const res = await fetch(`/api/production/bom/${bomData.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa định mức");
        await refreshSelectedProductAndList(undefined);
      } else {
        const errorData = await res.json();
        toastError("Lỗi", errorData.error || "Không thể xóa định mức");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    }
  };

  const handleSaveBom = async () => {
    if (!isProdAdmin) {
      toastError(
        "Không có quyền",
        "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền lưu định mức"
      );
      return;
    }
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const finalGiaBan =
        pricingForm.officialPrice > 0 ? pricingForm.officialPrice : calculatedPrice;

      const payload = {
        ...bomData,
        inventoryItemId: selectedProduct.id,
        materialItemId: selectedProduct.id,
        marginPct: pricingForm.marginPct,
        marginType: pricingForm.marginType,
        giaBan: finalGiaBan,
      };

      const res = bomData.id
        ? await fetch(`/api/production/bom/${bomData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/production/bom`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        const savedBom = await res.json();
        toastSuccess("Thành công", "Đã lưu định mức và cấu hình giá bán");
        await refreshSelectedProductAndList(savedBom?.id || bomData.id || undefined);
      } else {
        toastError("Lỗi", "Lưu định mức thất bại");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterialFromSuggestion = (opt: ItemSuggestionOption | null) => {
    if (!opt) return;
    const material = materials.find((m) => m.id === opt.id);
    if (!material) return;

    if (
      (bomData.vatTu || []).some(
        (v: any) => v.materialId === material.id || v.inventoryItemId === material.id
      )
    ) {
      toastError("Lỗi", "Vật tư này đã có trong định mức");
      setMaterialPickerResetKey((k) => k + 1);
      return;
    }

    setBomData((prev: any) => ({
      ...prev,
      vatTu: [
        ...(prev.vatTu || []),
        {
          materialId: material.id,
          inventoryItemId: material.id,
          maVatTu: material.code,
          tenVatTu: material.tenHang || material.name,
          soLuong: 1,
          donViTinh: material.donVi || material.unit || "cái",
          ghiChu: "",
          material,
        },
      ],
    }));
    setMaterialPickerResetKey((k) => k + 1);
  };

  const removeMaterialLine = (index: number) => {
    setBomData((prev: any) => {
      const newVatTu = [...(prev.vatTu || [])];
      newVatTu.splice(index, 1);
      return { ...prev, vatTu: newVatTu };
    });
  };

  const updateMaterialLine = (index: number, field: string, value: any) => {
    setBomData((prev: any) => {
      const newVatTu = [...(prev.vatTu || [])];
      newVatTu[index] = { ...newVatTu[index], [field]: value };
      return { ...prev, vatTu: newVatTu };
    });
  };

  const hasChildOffcanvasOpen =
    showAddProduct || showSwapModal || showBulkPriceOffcanvas || showBomDiff;

  const selectedWarehouseNames = useMemo(() => {
    if (!selectedProduct?.stocks?.length) return "Kho sản xuất và lắp ráp";
    const names = Array.from(
      new Set(selectedProduct.stocks.map((s: any) => s.warehouse?.name).filter(Boolean))
    );
    return names.length > 0 ? names.join(", ") : "Kho sản xuất và lắp ráp";
  }, [selectedProduct]);

  const effectiveOfficialPrice = pricingForm.officialPrice || 0;
  const priceDiff = effectiveOfficialPrice - calculatedPrice;

  return (
    <div className="prod-bom-page h-full">
      <input
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImportExcel}
      />

      <StepPage
        title="Xây dựng định mức"
        description="Thiết lập định mức nguyên vật liệu (BOM) và cấu thành giá bán thành phẩm sản xuất"
        icon="bi-diagram-3"
        color="blue"
        badge="ĐỊNH MỨC SẢN XUẤT"
        steps={steps}
        currentStep={currentStep}
        onStepChange={(step) => {
          setCurrentStep(step);
          setPage(1);
        }}
      >
        <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <TableToolbar
            customFilters={
              <WarehouseCategoryFilter
                warehouse={filterWarehouse}
                onWarehouseChange={(wh) => {
                  setFilterWarehouse(wh);
                  setPage(1);
                }}
                category={filterCategoryId}
                onCategoryChange={(cat) => {
                  setFilterCategoryId(cat);
                  setPage(1);
                }}
                warehouseMinWidth="165px"
                categoryMinWidth="170px"
                allCategoryLabel="Tất cả nhóm hàng"
              />
            }
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder="Tìm sản phẩm, mã hàng, mã định mức..."
            searchMinWidth="240px"
            rightActions={
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload size={13} />}
                  disabled={saving || !isProdAdmin}
                  title={
                    !isProdAdmin
                      ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền import định mức"
                      : "Import Excel"
                  }
                  onClick={() => {
                    if (!isProdAdmin) return;
                    fileInputRef.current?.click();
                  }}
                >
                  <span className="sm:hidden">Import</span>
                  <span className="hidden sm:inline">Import Excel</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusLg size={14} />}
                  disabled={!isProdAdmin}
                  title={
                    !isProdAdmin
                      ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền thêm sản phẩm"
                      : undefined
                  }
                  onClick={() => {
                    if (!isProdAdmin) return;
                    resetProductForm();
                    setShowAddProduct(true);
                  }}
                >
                  <span className="sm:hidden">Thêm SP</span>
                  <span className="hidden sm:inline">Thêm sản phẩm</span>
                </Button>
              </div>
            }
            onRefresh={fetchProducts}
            menuItems={[
              {
                id: "bulk-price-ratio",
                label: "Thiết lập tỷ suất giá hàng loạt",
                icon: <Sliders size={15} className="text-emerald-600" />,
                onClick: () => setShowBulkPriceOffcanvas(true),
              },
              {
                id: "event-calendar",
                label: "Lịch sự kiện",
                icon: <CalendarEvent size={15} className="text-sky-600" />,
                onClick: () => setIsEventCalendarOpen(true),
              },
              { id: "div-1", label: "", divider: true, onClick: () => {} },
              {
                id: "refresh",
                label: "Làm mới dữ liệu",
                icon: <ArrowRepeat size={15} className="text-indigo-600" />,
                onClick: fetchProducts,
              },
            ]}
          />

          <FullWidthTable loading={loadingProducts}>
            <table className="w-full text-left border-collapse" style={{ fontSize: "13px" }}>
              <thead className="sticky top-0 z-20 bg-slate-50 border-t border-slate-200">
                <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                  <th className="py-2.5 px-2.5 sm:px-4 text-left" style={stickyThStyle}>
                    Thành phẩm & Mã hàng
                  </th>
                  <th
                    className="hidden md:table-cell py-2.5 px-4 text-left w-52"
                    style={stickyThStyle}
                  >
                    Nhóm hàng & Kho
                  </th>
                  <th className="py-2.5 px-2.5 sm:px-4 text-left sm:w-72" style={stickyThStyle}>
                    Định mức & Linh kiện
                  </th>
                  <th
                    className="hidden sm:table-cell py-2.5 px-4 text-right w-48"
                    style={stickyThStyle}
                  >
                    Giá vốn ĐM & Giá bán
                  </th>
                  <th
                    className="py-2.5 px-2.5 sm:px-4 text-center w-20"
                    style={stickyThStyle}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length > 0 ? (
                  products.map((row: any) => {
                    const boms = row.dinhMucs || [];
                    const bomCount = boms.length;
                    const primaryBom =
                      boms.find((dm: any) => dm.code === `DM-${row.code}`) || boms[0] || null;
                    const componentCount = primaryBom?.vatTu?.length || 0;
                    const warehouseNames =
                      row.stocks?.length > 0
                        ? Array.from(
                            new Set(row.stocks.map((s: any) => s.warehouse?.name).filter(Boolean))
                          ).join(", ")
                        : "Kho sản xuất và lắp ráp";

                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleOpenBomModal(row)}
                        className="hover:bg-sky-50/40 transition-colors border-b border-slate-100 cursor-pointer"
                      >
                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 align-middle">
                          <div
                            className="font-semibold text-slate-800 line-clamp-2 sm:truncate text-[13px]"
                            title={row.tenHang || row.name}
                          >
                            {row.tenHang || row.name}
                          </div>
                          <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono font-bold text-sky-700">
                              {row.code || "—"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span>ĐVT: {row.donVi || row.unit || "bộ"}</span>
                          </div>
                        </td>

                        <td className="hidden md:table-cell py-3 px-4 align-middle">
                          <div className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                            {row.categoryName || "Chưa phân nhóm"}
                          </div>
                          <div
                            className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5"
                            title={warehouseNames}
                          >
                            {warehouseNames}
                          </div>
                        </td>

                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 align-middle">
                          {bomCount > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <Badge variant="success">{bomCount} định mức</Badge>
                                <span className="text-xs text-slate-500">
                                  {componentCount} linh kiện
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-1">
                                {boms.slice(0, 3).map((dm: any) => (
                                  <button
                                    key={dm.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenBomModal(row, dm.id);
                                    }}
                                    className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 border border-slate-200 transition-colors cursor-pointer"
                                    title={dm.tenDinhMuc || dm.code}
                                  >
                                    {dm.code}
                                  </button>
                                ))}
                                {bomCount > 3 && (
                                  <span className="text-[11px] text-slate-400">
                                    +{bomCount - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="neutral">Chưa có định mức</Badge>
                          )}
                        </td>

                        <td className="hidden sm:table-cell py-3 px-4 align-middle text-right">
                          <div className="text-xs text-slate-500">
                            Giá vốn:{" "}
                            <strong className="font-mono text-slate-800">
                              {row.estimatedBomCost > 0
                                ? `${Math.round(row.estimatedBomCost).toLocaleString("vi-VN")} đ`
                                : "—"}
                            </strong>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Giá bán:{" "}
                            <strong className="font-mono text-emerald-600">
                              {row.giaBan > 0
                                ? `${Math.round(row.giaBan).toLocaleString("vi-VN")} đ`
                                : "—"}
                            </strong>
                          </div>
                        </td>

                        <td className="py-2.5 sm:py-3 px-2.5 sm:px-4 align-middle text-center">
                          <div
                            className="inline-flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditProduct(row, e)}
                              title="Cập nhật thông tin sản phẩm"
                              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-sky-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            >
                              <PencilSquare size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <i className="bi bi-inbox text-2xl text-slate-300" />
                        <span>
                          {currentStep === 1
                            ? "Không có sản phẩm nào chưa thiết lập định mức khớp bộ lọc"
                            : "Chưa có sản phẩm nào đã thiết lập định mức khớp bộ lọc"}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
            itemName="sản phẩm"
          />
        </div>

        {/* Fullscreen Modal: Kết hợp Thiết lập Định mức (BOM) & Chi tiết Cấu thành Giá bán */}
        <Modal
          isOpen={isBomModalOpen}
          onClose={() => setIsBomModalOpen(false)}
          isFullscreen={true}
          isStatic={hasChildOffcanvasOpen}
          padding="12px 16px"
          headerIcon={<Diagram3 size={18} className="text-sky-600" />}
          title={selectedProduct?.tenHang || selectedProduct?.name || "Thiết lập định mức"}
          description={
            selectedProduct
              ? `Mã TP: ${selectedProduct.code || "N/A"} • ĐVT: ${
                  selectedProduct.donVi || selectedProduct.unit || "bộ"
                } • Kho: ${selectedWarehouseNames}`
              : undefined
          }
          headerActions={
            selectedProduct ? (
              <div className="flex items-center gap-2">
                <Badge variant={bomData.id ? "success" : "warning"}>
                  {bomData.id
                    ? isStandardBom
                      ? "Định mức tiêu chuẩn"
                      : "Định mức biến thể"
                    : "Định mức mới"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PencilSquare size={13} />}
                  onClick={() => handleOpenEditProduct(selectedProduct)}
                >
                  Sửa SP
                </Button>
              </div>
            ) : undefined
          }
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                {bomData?.id && (
                  <DeleteButton
                    label="Xóa định mức"
                    size="sm"
                    disabled={!isProdAdmin}
                    dialogTitle="Xóa định mức sản xuất"
                    dialogMessage={`Bạn có chắc chắn muốn xóa định mức ${bomData.code} không? Hành động này không thể hoàn tác.`}
                    onConfirm={handleDeleteBom}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Sliders size={13} />}
                  disabled={!isProdAdmin}
                  onClick={() => setShowBulkPriceOffcanvas(true)}
                >
                  <span className="hidden sm:inline">Đồng bộ tỷ suất toàn bộ SP</span>
                  <span className="sm:hidden">Tỷ suất chung</span>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsBomModalOpen(false)}
                  disabled={saving}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveBom}
                  disabled={saving || isSameAsStandard || !isProdAdmin}
                  isLoading={saving}
                  title={
                    !isProdAdmin
                      ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền lưu định mức"
                      : isSameAsStandard
                      ? "Danh sách vật tư trùng khớp với tiêu chuẩn"
                      : undefined
                  }
                >
                  Lưu định mức & Giá bán
                </Button>
              </div>
            </div>
          }
        >
          {loadingBom ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Đang tải thông tin định mức...
            </div>
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-y-auto lg:overflow-hidden bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 text-[13px]">
              {/* CỘT TRÁI (8 CỘT): THIẾT LẬP ĐỊNH MỨC & THÀNH PHẦN NGUYÊN VẬT LIỆU */}
              <div className="lg:col-span-8 flex flex-col gap-3 min-h-0 lg:h-full overflow-hidden">
                {/* Khung 1: Phiên bản Mã định mức & Mô tả */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs shrink-0">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      {bomData.id ? (
                        <Select
                          label="Phiên bản mã định mức"
                          value={bomData.id}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "NEW") {
                              const originalCode = `DM-${selectedProduct?.code || Date.now()}`;
                              fetch(
                                `/api/production/bom/next-code?originalCode=${encodeURIComponent(
                                  originalCode
                                )}`
                              )
                                .then((r) => r.json())
                                .then((d) => {
                                  setBomData((prev: any) => ({
                                    ...prev,
                                    id: undefined,
                                    code: d.nextCode || `${originalCode}-01`,
                                    tenDinhMuc: `Biến thể của định mức tiêu chuẩn ${
                                      selectedProduct?.tenHang || selectedProduct?.name || ""
                                    }`,
                                  }));
                                })
                                .catch(() => {
                                  const nextIndex = (selectedProduct?.dinhMucs?.length || 0) + 1;
                                  const nextSuffix = String(nextIndex).padStart(2, "0");
                                  setBomData((prev: any) => ({
                                    ...prev,
                                    id: undefined,
                                    code: `${originalCode}-${nextSuffix}`,
                                    tenDinhMuc: `Biến thể của định mức tiêu chuẩn ${
                                      selectedProduct?.tenHang || selectedProduct?.name || ""
                                    }`,
                                  }));
                                });
                            } else {
                              fetchBom(val);
                            }
                          }}
                          options={[
                            ...(selectedProduct?.dinhMucs || []).map((dm: any) => ({
                              label: dm.code,
                              value: dm.id,
                            })),
                            { label: "+ Tạo định mức biến thể mới", value: "NEW" },
                          ]}
                        />
                      ) : (
                        <div className="flex items-end gap-1.5">
                          <div className="flex-1">
                            <Input
                              label="Mã định mức mới"
                              value={bomData.code || ""}
                              onChange={(e) => setBomData({ ...bomData, code: e.target.value })}
                              placeholder="Nhập mã ĐM mới"
                            />
                          </div>
                          {selectedProduct?.dinhMucs?.length > 0 && (
                            <Button
                              variant="outline"
                              size="md"
                              onClick={() => fetchBom(selectedProduct.dinhMucs[0].id)}
                            >
                              Hủy
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-8">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input
                            label={isStandardBom ? "Mô tả định mức" : "Mô tả định mức biến thể"}
                            value={bomData.tenDinhMuc || ""}
                            onChange={(e) =>
                              setBomData({ ...bomData, tenDinhMuc: e.target.value })
                            }
                          />
                        </div>
                        {!isStandardBom && standardBomData && (
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => setShowBomDiff(true)}
                          >
                            Đối soát
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khung 2: Bảng Thành phần nguyên vật liệu & Chi phí giá vốn */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 min-h-[300px] lg:min-h-0 flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800 shrink-0">
                      <i className="bi bi-layers text-sky-600" />
                      <span>
                        1. Chi phí nguyên vật liệu — Giá vốn ({(bomData.vatTu || []).length})
                      </span>
                    </div>

                    <div className="w-full sm:w-[380px]">
                      <ItemSuggestionSelect
                        key={materialPickerResetKey}
                        items={materialSuggestionOptions}
                        selectedId=""
                        onSelect={handleAddMaterialFromSuggestion}
                        placeholder="Gõ tên hoặc mã vật tư để thêm vào định mức..."
                        minWidth="100%"
                        disabled={!isProdAdmin}
                      />
                    </div>
                  </div>

                  <FullWidthTable className="flex-1 min-h-0">
                    <table
                      className="w-full text-left border-collapse"
                      style={{ fontSize: "13px" }}
                    >
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                          <th
                            className="hidden sm:table-cell py-2.5 px-3 text-center w-12"
                            style={stickyThStyle}
                          >
                            STT
                          </th>
                          <th className="py-2.5 px-3 text-left" style={stickyThStyle}>
                            Tên vật tư & Mã linh kiện
                          </th>
                          <th
                            className="hidden sm:table-cell py-2.5 px-2 text-center w-24"
                            style={stickyThStyle}
                          >
                            Đơn vị
                          </th>
                          <th
                            className="py-2.5 px-2 text-center w-28 sm:w-32"
                            style={stickyThStyle}
                          >
                            Số lượng
                          </th>
                          <th
                            className="hidden md:table-cell py-2.5 px-3 text-right w-32"
                            style={stickyThStyle}
                          >
                            Đơn giá
                          </th>
                          <th
                            className="hidden sm:table-cell py-2.5 px-3 text-right w-36"
                            style={stickyThStyle}
                          >
                            Thành tiền
                          </th>
                          <th
                            className="py-2.5 px-2.5 text-center w-24"
                            style={stickyThStyle}
                          >
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(bomData.vatTu || []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-slate-400 py-14 text-xs">
                              Chưa có thành phần vật tư nào trong định mức này
                            </td>
                          </tr>
                        ) : (
                          (bomData.vatTu || []).map((row: any, idx: number) => {
                            const query = row.material?.category?.code || "";
                            const count = query ? swapCounts[query] || 0 : 0;
                            const isSwapDisabled = (count !== -1 && count <= 1) || !isProdAdmin;
                            const unitPrice =
                              row.material?.price ||
                              row.material?.giaNhap ||
                              row.inventoryItem?.giaNhap ||
                              0;
                            const lineTotal = (Number(row.soLuong) || 0) * unitPrice;

                            return (
                              <tr
                                key={row.id || `${row.maVatTu}-${idx}`}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="hidden sm:table-cell py-2.5 px-3 text-center align-middle text-slate-400 font-semibold">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <div className="font-semibold text-slate-800 text-xs sm:text-[13px] line-clamp-2">
                                    {row.material?.tenHang || row.tenVatTu || "Chưa xác định"}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {row.material?.code || row.maVatTu || "Không có mã"}
                                  </div>
                                </td>
                                <td className="hidden sm:table-cell py-2 px-2 align-middle text-center">
                                  <Input
                                    value={row.donViTinh || ""}
                                    disabled={!isProdAdmin}
                                    onChange={(e) =>
                                      updateMaterialLine(idx, "donViTinh", e.target.value)
                                    }
                                    className="text-center h-8 text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2 align-middle">
                                  <NumberInput
                                    value={row.soLuong}
                                    disabled={!isProdAdmin}
                                    hideZero={false}
                                    allowDecimal={true}
                                    min={0}
                                    onValueChange={(num) =>
                                      updateMaterialLine(idx, "soLuong", num)
                                    }
                                    className="text-center font-bold text-sky-700 h-8 text-xs"
                                  />
                                </td>
                                <td className="hidden md:table-cell py-2.5 px-3 align-middle text-right font-mono text-xs text-slate-600">
                                  {Math.round(unitPrice).toLocaleString("vi-VN")} đ
                                </td>
                                <td className="hidden sm:table-cell py-2.5 px-3 align-middle text-right font-mono text-xs font-bold text-slate-800">
                                  {Math.round(lineTotal).toLocaleString("vi-VN")} đ
                                </td>
                                <td className="py-2.5 px-2.5 align-middle text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isSwapDisabled}
                                      title="Đổi vật tư thay thế"
                                      onClick={() => {
                                        if (!isProdAdmin) return;
                                        setSwapIndex(idx);
                                        setSwapBaseExact(
                                          row.material?.maThayThe || row.material?.code || ""
                                        );
                                        setSwapBaseGroup(row.material?.category?.id || "");
                                        setSwapSearchMode("exact");
                                        setSwapSearchText("");
                                        setShowSwapModal(true);
                                      }}
                                      className="w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      <ArrowLeftRight size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!isProdAdmin}
                                      title="Xóa dòng vật tư"
                                      onClick={() => {
                                        if (!isProdAdmin) return;
                                        removeMaterialLine(idx);
                                      }}
                                      className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      <Trash size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </FullWidthTable>

                  {/* Thanh tổng giá vốn vật tư cố định dưới bảng */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-500">
                      Tổng cộng:{" "}
                      <strong className="text-slate-800">
                        {(bomData.vatTu || []).length} linh kiện
                      </strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        Tổng giá vốn vật tư:
                      </span>
                      <span className="text-base font-extrabold text-rose-600 font-mono">
                        {Math.round(totalMaterialCost).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (4 CỘT): CHI TIẾT CẤU THÀNH GIÁ BÁN & LỢI NHUẬN */}
              <div className="lg:col-span-4 flex flex-col gap-3 lg:h-full lg:overflow-y-auto">
                {/* Phần 2: Cấu hình lợi nhuận */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="bi bi-calculator text-sky-600" />
                    <h6 className="font-bold text-xs uppercase tracking-wider text-sky-800 m-0">
                      2. Cấu hình lợi nhuận
                    </h6>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                    <NumberInput
                      label="Tỷ suất kỳ vọng"
                      suffix="%"
                      value={pricingForm.marginPct}
                      disabled={!isProdAdmin}
                      hideZero={false}
                      allowDecimal={true}
                      min={0}
                      max={99.9}
                      onValueChange={(num) =>
                        setPricingForm((prev) => ({
                          ...prev,
                          marginPct: Math.min(99.9, Math.max(0, num)),
                        }))
                      }
                    />

                    <Select
                      label="Phương pháp tính"
                      value={pricingForm.marginType}
                      disabled={!isProdAdmin}
                      onChange={(e) =>
                        setPricingForm((prev) => ({
                          ...prev,
                          marginType: e.target.value === "revenue" ? "revenue" : "cost",
                        }))
                      }
                      options={[
                        { value: "cost", label: "Trên giá vốn" },
                        { value: "revenue", label: "Trên doanh thu" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <div className="text-[11px] text-slate-400">Giá vốn định mức</div>
                      <div className="font-bold text-xs font-mono text-slate-800 mt-0.5">
                        {Math.round(totalMaterialCost).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <div className="text-[11px] text-slate-400">Lợi nhuận gộp / ĐVT</div>
                      <div className="font-bold text-xs font-mono text-emerald-600 mt-0.5">
                        +
                        {Math.max(
                          0,
                          Math.round(
                            (effectiveOfficialPrice || calculatedPrice) - totalMaterialCost
                          )
                        ).toLocaleString("vi-VN")}{" "}
                        đ
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phần 3: Giá bán tính toán (Đề xuất) */}
                <div className="rounded-xl p-4 bg-gradient-to-br from-sky-600 to-blue-600 text-white shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold opacity-90">
                      3. Giá bán tính toán (Đề xuất)
                    </span>
                    <button
                      type="button"
                      disabled={!isProdAdmin || calculatedPrice <= 0}
                      onClick={() =>
                        setPricingForm((prev) => ({
                          ...prev,
                          officialPrice: calculatedPrice,
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Check2Circle size={12} />
                      <span>Áp dụng giá này</span>
                    </button>
                  </div>

                  <div className="text-2xl font-extrabold font-mono my-2">
                    {calculatedPrice.toLocaleString("vi-VN")} đ
                  </div>

                  <div className="bg-white/15 rounded-lg p-2.5 text-left text-xs font-mono">
                    <div className="opacity-80 mb-0.5 text-[11px] font-sans">
                      Công thức áp dụng:
                    </div>
                    {pricingForm.marginType === "revenue"
                      ? `${Math.round(totalMaterialCost).toLocaleString("vi-VN")} đ / (1 - ${
                          pricingForm.marginPct || 0
                        }%) = ${calculatedPrice.toLocaleString("vi-VN")} đ`
                      : `${Math.round(totalMaterialCost).toLocaleString("vi-VN")} đ × (1 + ${
                          pricingForm.marginPct || 0
                        }%) = ${calculatedPrice.toLocaleString("vi-VN")} đ`}
                  </div>
                </div>

                {/* Phần 4: Giá bán chính thức đang áp dụng */}
                <div className="bg-white rounded-xl border border-emerald-200 border-l-4 border-l-emerald-500 p-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-600">
                      4. Giá bán chính thức đang áp dụng
                    </span>
                    {priceDiff !== 0 ? (
                      <Badge variant="warning">
                        Chênh lệch {priceDiff > 0 ? "+" : ""}
                        {Math.round(priceDiff).toLocaleString("vi-VN")} đ
                      </Badge>
                    ) : calculatedPrice > 0 ? (
                      <Badge variant="success">Khớp đề xuất</Badge>
                    ) : null}
                  </div>

                  <div className="text-xl font-extrabold text-emerald-600 font-mono mb-3">
                    {Math.round(effectiveOfficialPrice).toLocaleString("vi-VN")} đ
                  </div>

                  <NumberInput
                    label="Điều chỉnh giá bán chính thức"
                    placeholder="Nhập giá bán chính thức..."
                    suffix="đ"
                    value={pricingForm.officialPrice}
                    disabled={!isProdAdmin}
                    min={0}
                    onValueChange={(num) =>
                      setPricingForm((prev) => ({
                        ...prev,
                        officialPrice: num,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Offcanvas Thêm / Cập nhật sản phẩm (400px chuẩn dự án) */}
        <Offcanvas
          isOpen={showAddProduct}
          onClose={() => {
            setShowAddProduct(false);
            if (!isBomModalOpen) resetProductForm();
          }}
          title={editProductId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
          description="Thiết lập mã hàng, nhóm thành phẩm và kho mặc định"
          icon={<i className="bi bi-box-seam text-lg" />}
          width="400px"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              {editProductId ? (
                <DeleteButton
                  label="Xóa"
                  size="md"
                  disabled={!isProdAdmin}
                  dialogTitle="Xóa sản phẩm"
                  dialogMessage="Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác."
                  onConfirm={handleDeleteProduct}
                />
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setShowAddProduct(false);
                    if (!isBomModalOpen) resetProductForm();
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveProduct}
                  disabled={savingProduct || !isProdAdmin}
                  isLoading={savingProduct}
                >
                  {editProductId ? "Cập nhật" : "Lưu sản phẩm"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-3.5 text-[13px]">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-5">
                <Input
                  label="Mã sản phẩm"
                  placeholder="VD: 01S"
                  value={newProduct.code}
                  onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                />
              </div>
              <div className="col-span-7">
                <Select
                  label="Nhóm sản phẩm"
                  value={newProduct.categoryId || ""}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  options={[
                    { label: "Chọn nhóm...", value: "" },
                    ...productGroups.map((g) => ({ label: g.name, value: g.id })),
                  ]}
                />
              </div>
            </div>

            <Input
              label="Tên sản phẩm *"
              placeholder="Nhập tên sản phẩm..."
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <Input
                  label="Đơn vị tính"
                  placeholder="bộ"
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                />
              </div>
              <div className="col-span-6">
                <Input label="Kho mặc định" disabled value="Kho thành phẩm" />
              </div>
            </div>
          </div>
        </Offcanvas>

        {/* Offcanvas Đổi vật tư thay thế (400px chuẩn dự án) */}
        <Offcanvas
          isOpen={showSwapModal}
          onClose={() => setShowSwapModal(false)}
          title="Đổi vật tư / Hàng hoá cùng loại"
          description="Chọn linh kiện thay thế từ kho Vật tư Phụ kiện (KVP)"
          icon={<i className="bi bi-arrow-left-right text-lg" />}
          width="400px"
        >
          <div className="flex flex-col gap-3 text-[13px]">
            <Input
              placeholder="Tìm kiếm vật tư thay thế..."
              value={swapSearchText}
              onChange={(e) => setSwapSearchText(e.target.value)}
            />

            {swapIndex !== null &&
              bomData?.vatTu?.[swapIndex] &&
              (() => {
                const r = bomData.vatTu[swapIndex];
                const fullName = r.material?.tenHang || r.material?.name || r.tenVatTu;
                return (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="text-slate-500 mb-1">
                      Đang thay đổi cho: <strong className="text-slate-900">{fullName}</strong>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span>
                        Mã TP: <strong className="text-slate-800">{r.material?.code || "N/A"}</strong>
                      </span>
                      <span>
                        Mã nhóm PM:{" "}
                        <strong className="text-slate-800">
                          {r.material?.category?.code || "N/A"}
                        </strong>
                      </span>
                      <span>
                        Mã thay thế:{" "}
                        <strong className="text-slate-800">{r.material?.maThayThe || "N/A"}</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}

            <div className="flex items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="swapMode"
                  checked={swapSearchMode === "exact"}
                  onChange={() => setSwapSearchMode("exact")}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span>Chính xác</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="swapMode"
                  checked={swapSearchMode === "group"}
                  onChange={() => setSwapSearchMode("group")}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span>Theo nhóm</span>
              </label>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {swapOptions.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10">
                  Không tìm thấy vật tư phù hợp
                </div>
              ) : (
                swapOptions.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full text-left p-3 hover:bg-sky-50/70 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    onClick={() => {
                      if (swapIndex !== null) {
                        setBomData((prev: any) => {
                          const newVatTu = [...prev.vatTu];
                          newVatTu[swapIndex] = {
                            ...newVatTu[swapIndex],
                            materialId: m.id,
                            inventoryItemId: m.id,
                            maVatTu: m.code,
                            tenVatTu: m.tenHang || m.name,
                            donViTinh: m.donVi || m.unit || "cái",
                            material: m,
                          };
                          return { ...prev, vatTu: newVatTu };
                        });
                      }
                      setShowSwapModal(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-xs">
                        {m.tenHang || m.name}
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mt-1">
                        <span>Mã: {m.code}</span>
                        <span>ĐVT: {m.donVi || m.unit}</span>
                        <span>{(m.giaNhap || m.price || 0).toLocaleString("vi-VN")} đ</span>
                        <span>
                          Tồn:{" "}
                          <strong
                            className={m.soLuong > 0 ? "text-emerald-600" : "text-rose-600"}
                          >
                            {m.soLuong || 0}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                      <ArrowLeftRight size={12} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Offcanvas>

        {/* Offcanvas Đồng bộ tỷ suất lợi nhuận hàng loạt (400px chuẩn dự án) */}
        <UpdatePriceOffcanvas
          show={showBulkPriceOffcanvas}
          onClose={() => setShowBulkPriceOffcanvas(false)}
          itemName="Áp dụng tỷ suất lợi nhuận chung cho toàn bộ thành phẩm có định mức"
          initialCost={totalMaterialCost}
          initialPrice={selectedProduct?.giaBan || 0}
          initialMarginPct={pricingForm.marginPct}
          initialMarginType={pricingForm.marginType}
          isBulkOnly={true}
          applyAllLabel="Áp dụng cho tất cả Thành phẩm (có định mức)"
          onSaveSingle={async () => {}}
          onSaveAll={async (marginPct, marginType) => {
            toastInfo("Đang xử lý", "Đang tính toán và áp dụng cho tất cả...");
            const res = await fetch("/api/logistics/inventory/update-price-ratio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ marginPct, marginType, scope: "bom" }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
              toastSuccess(
                "Thành công",
                `Đã cập nhật giá bán cho ${data.updatedCount} sản phẩm`
              );
              const nextCalc =
                marginType === "revenue"
                  ? marginPct < 100
                    ? Math.round(totalMaterialCost / (1 - marginPct / 100) / 1000) * 1000
                    : 0
                  : Math.round((totalMaterialCost * (1 + marginPct / 100)) / 1000) * 1000;

              setPricingForm({
                marginPct,
                marginType: marginType === "revenue" ? "revenue" : "cost",
                officialPrice: nextCalc,
              });
              setSelectedProduct((prev: any) =>
                prev
                  ? {
                      ...prev,
                      giaBan: nextCalc,
                      loiNhuanKyVong: marginPct,
                      phuongPhapTinhLoiNhuan: marginType,
                    }
                  : prev
              );
              fetchProducts();
              setShowBulkPriceOffcanvas(false);
            } else {
              toastError("Lỗi", data.error || "Có lỗi xảy ra");
            }
          }}
        />

        <BomDiffOffcanvas
          show={showBomDiff}
          onClose={() => setShowBomDiff(false)}
          bomData={bomData}
          standardBomData={standardBomData}
          productName={selectedProduct?.tenHang || selectedProduct?.name || ""}
        />

        <EventOffcanvas
          isOpen={isEventCalendarOpen}
          onClose={() => setIsEventCalendarOpen(false)}
        />
      </StepPage>
    </div>
  );
}

export default ProductionBomPage;
