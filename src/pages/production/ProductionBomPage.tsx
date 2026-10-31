import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { TableToolbar } from "@/components/common/TableToolbar";
import { FullWidthTable } from "@/components/common/FullWidthTable";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Offcanvas } from "@/components/common/Offcanvas";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EventOffcanvas } from "@/components/common/EventOffcanvas";
import UpdatePriceOffcanvas from "@/components/ui/UpdatePriceOffcanvas";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { canManageProdBom } from "@/lib/production-permissions";
import BomDiffOffcanvas from "@/components/production/BomDiffOffcanvas";
import BOMPriceDetailsOffcanvas from "@/components/production/BOMPriceDetailsOffcanvas";
import {
  PlusLg,
  Upload,
  Trash,
  ArrowLeftRight,
  CalendarEvent,
  ArrowRepeat,
  Search,
  Receipt,
  PencilSquare,
} from "react-bootstrap-icons";

export function ProductionBomPage() {
  const { data: session } = useSession();
  const isProdAdmin = canManageProdBom(session?.user);
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [bomCodeQuery, setBomCodeQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState(false);

  const [bomData, setBomData] = useState<any>({
    code: "",
    tenDinhMuc: "",
    vatTu: [],
  });
  const [standardBomData, setStandardBomData] = useState<any>(null);
  const [showBomDiff, setShowBomDiff] = useState(false);
  const [loadingBom, setLoadingBom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirmDeleteBom, setShowConfirmDeleteBom] = useState(false);
  const [deletingBom, setDeletingBom] = useState(false);

  // Material selection state
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchMaterial, setSearchMaterial] = useState("");
  const [showAddMaterialDropdown, setShowAddMaterialDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchingBomRef = useRef(false);
  const listGroupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swap material state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [swapSearchMode, setSwapSearchMode] = useState<"exact" | "group">("exact");
  const [swapSearchText, setSwapSearchText] = useState("");
  const [swapBaseExact, setSwapBaseExact] = useState("");
  const [swapBaseGroup, setSwapBaseGroup] = useState("");
  const [swapBaseOptions, setSwapBaseOptions] = useState<any[]>([]);

  const swapOptions = swapBaseOptions.filter(
    (m) =>
      !swapSearchText ||
      (m.name || m.tenHang || "").toLowerCase().includes(swapSearchText.toLowerCase()) ||
      (m.code || "").toLowerCase().includes(swapSearchText.toLowerCase())
  );

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

  const [swapCounts, setSwapCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (bomData?.vatTu?.length > 0) {
      bomData.vatTu.forEach((row: any) => {
        let query = "";
        if (row.material?.category?.code) {
          query = row.material.category.code;
        }

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
  }, [bomData?.vatTu]);

  // New product state
  const [productGroups, setProductGroups] = useState<{ id: string; name: string }[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: "",
    name: "",
    categoryId: "",
    unit: "bộ",
    defaultWarehouse: "KHO-CHINH",
    notes: "",
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Price setup state
  const [showPriceOffcanvas, setShowPriceOffcanvas] = useState(false);
  const [initialCost, setInitialCost] = useState(0);

  useEffect(() => {
    fetch("/api/plan-finance/categories?types=danh_muc_thanh_pham,vat_tu_san_xuat")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProductGroups(data);
      })
      .catch((err) => console.error(err));
  }, []);

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
      const url = "/api/logistics/inventory";
      const method = editProductId ? "PUT" : "POST";

      const res = await fetch(url, {
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
        setShowAddProduct(false);
        resetProductForm();
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
    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/logistics/inventory/${editProductId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa sản phẩm");
        setShowAddProduct(false);
        setShowConfirmDelete(false);
        resetProductForm();
        fetchProducts();
        if (selectedProduct?.id === editProductId) {
          setSelectedProduct(null);
        }
      } else {
        const errorData = await res.json();
        toastError("Lỗi", errorData.error || "Không thể xóa sản phẩm");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setDeletingProduct(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(
        `/api/logistics/inventory?warehouseCode=KVP&limit=${pageSize}&page=${page}&search=${encodeURIComponent(
          search
        )}&categoryId=${filterCategoryId}`
      );
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalItems(data.total || (data.items ? data.items.length : 0));
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Không thể tải danh sách sản phẩm");
    } finally {
      setLoadingProducts(false);
    }
  }, [search, filterCategoryId, page, pageSize, toastError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      const first = products[0];
      setSelectedProduct(first);
      if (first.dinhMucs && first.dinhMucs.length > 0) {
        fetchBom(first.dinhMucs[0].id);
      } else {
        fetchBom(null, first);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.dinhMucs?.length > 0) {
      const standardBomCode = `DM-${selectedProduct.code}`;
      const standardBom = selectedProduct.dinhMucs.find((dm: any) => dm.code === standardBomCode);
      const targetId = standardBom?.id || selectedProduct.dinhMucs[0].id;

      fetch(`/api/production/bom/${targetId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setStandardBomData(data);
          else setStandardBomData(null);
        })
        .catch(console.error);
    } else {
      setStandardBomData(null);
    }
  }, [selectedProduct]);

  const isStandardBom = bomData?.code === `DM-${selectedProduct?.code}`;

  const isSameAsStandard = useMemo(() => {
    if (isStandardBom) return false;
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
  }, [bomData.vatTu, standardBomData, isStandardBom]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toastSuccess("Đã nhận tệp", `Đang đồng bộ định mức từ ${file.name}...`);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fetchProducts();
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

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    if (product.dinhMucs && product.dinhMucs.length > 0) {
      fetchBom(product.dinhMucs[0].id);
    } else {
      fetchBom(null, product);
    }
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

  const handleDeleteBom = async () => {
    if (!isProdAdmin) {
      toastError(
        "Không có quyền",
        "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xoá định mức"
      );
      return;
    }
    if (!bomData.id) return;
    setDeletingBom(true);
    try {
      const res = await fetch(`/api/production/bom/${bomData.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toastSuccess("Thành công", "Đã xóa định mức");
        setShowConfirmDeleteBom(false);
        fetchProducts();

        const updatedRes = await fetch(
          `/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}`
        );
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          const match = updatedData.items.find((p: any) => p.id === selectedProduct.id);
          if (match) {
            setSelectedProduct(match);
            fetchBom(match.dinhMucs?.[0]?.id || null, match);
          }
        }
      } else {
        const errorData = await res.json();
        toastError("Lỗi", errorData.error || "Không thể xóa định mức");
      }
    } catch (e) {
      console.error(e);
      toastError("Lỗi", "Lỗi hệ thống");
    } finally {
      setDeletingBom(false);
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
      let res;
      if (bomData.id) {
        res = await fetch(`/api/production/bom/${bomData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bomData,
            inventoryItemId: selectedProduct.id,
          }),
        });
      } else {
        res = await fetch(`/api/production/bom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bomData,
            materialItemId: selectedProduct.id,
          }),
        });
      }

      if (res.ok) {
        const savedBom = await res.json();
        toastSuccess("Thành công", "Lưu định mức thành công");
        fetchProducts();

        const updatedRes = await fetch(
          `/api/logistics/inventory?warehouseCode=KVP&search=${selectedProduct.code}`
        );
        if (updatedRes.ok) {
          const updatedData = await updatedRes.json();
          const match = updatedData.items.find((p: any) => p.id === selectedProduct.id);
          if (match) {
            setSelectedProduct(match);
            fetchBom(savedBom?.id || bomData.id || match.dinhMucs?.[0]?.id || null, match);
          }
        }
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

  const fetchMaterials = async (q: string) => {
    try {
      const res = await fetch(
        `/api/logistics/inventory?warehouseCode=KVP&search=${encodeURIComponent(
          q
        )}&page=1&nolimit=true&excludeDinhMucs=true`
      );
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMaterials(searchMaterial);
  }, [searchMaterial]);

  const addMaterialLine = (material: any) => {
    if (bomData.vatTu.find((v: any) => v.materialId === material.id)) {
      toastError("Lỗi", "Vật tư này đã có trong định mức");
      return;
    }
    setBomData((prev: any) => ({
      ...prev,
      vatTu: [
        ...prev.vatTu,
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
  };

  const removeMaterialLine = (index: number) => {
    setBomData((prev: any) => {
      const newVatTu = [...prev.vatTu];
      newVatTu.splice(index, 1);
      return { ...prev, vatTu: newVatTu };
    });
  };

  const updateMaterialLine = (index: number, field: string, value: any) => {
    setBomData((prev: any) => {
      const newVatTu = [...prev.vatTu];
      newVatTu[index] = { ...newVatTu[index], [field]: value };
      return { ...prev, vatTu: newVatTu };
    });
  };

  const searchBomByCode = async (code: string) => {
    if (!code.trim() || isSearchingBomRef.current) return;
    isSearchingBomRef.current = true;
    try {
      const res = await fetch(
        `/api/production/bom/search?code=${encodeURIComponent(code.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.bom && data.bom.inventoryItem) {
          const product = data.bom.inventoryItem;
          setSelectedProduct(product);
          setEditProductId(product.id);
          setNewProduct({
            code: product.code || "",
            name: product.tenHang || product.name || "",
            categoryId: product.categoryId || "",
            unit: product.donVi || product.unit || "bộ",
            defaultWarehouse: product.defaultWarehouse || "KHO-CHINH",
            notes: product.notes || "",
          });
          fetchBom(data.bom.id);
          toastSuccess("Thành công", "Đã tải định mức");
        } else {
          toastError("Lỗi", "Định mức không liên kết với sản phẩm nào");
        }
      } else {
        toastError("Không tìm thấy", "Không tìm thấy mã định mức này");
      }
    } catch (error) {
      console.error(error);
      toastError("Lỗi", "Đã có lỗi xảy ra");
    } finally {
      isSearchingBomRef.current = false;
    }
  };

  const totalMaterialCost = (bomData.vatTu || []).reduce(
    (sum: number, item: any) =>
      sum + (Number(item.soLuong) || 0) * (item.material?.price || item.material?.giaNhap || 0),
    0
  );

  return (
    <StandardPage
      title="Xây dựng định mức"
      description="Thiết lập định mức nguyên vật liệu (BOM) và cấu thành giá bán thành phẩm sản xuất"
      icon="bi-diagram-3"
      color="blue"
      useCard={true}
      hideTicker={true}
    >
      <input
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImportExcel}
      />

      <TableToolbar
        filters={[
          {
            id: "bom-category-filter",
            value: filterCategoryId,
            onChange: (val) => {
              setFilterCategoryId(val);
              setPage(1);
            },
            minWidth: "180px",
            options: [
              { label: "Tất cả nhóm hàng", value: "" },
              ...productGroups.map((g) => ({ label: g.name, value: g.id })),
            ],
          },
        ]}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Tìm kiếm sản phẩm, mã hàng..."
        searchMinWidth="220px"
        actionsAfterSearch={
          <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden h-9 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/15">
            <input
              type="text"
              className="px-3 text-xs text-slate-700 placeholder:text-slate-400 outline-none w-40 bg-transparent"
              placeholder="Tra cứu mã ĐM..."
              value={bomCodeQuery}
              onChange={(e) => setBomCodeQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchBomByCode(bomCodeQuery);
                }
              }}
            />
            <button
              type="button"
              onClick={() => searchBomByCode(bomCodeQuery)}
              className="px-2.5 h-full bg-slate-50 hover:bg-slate-100 border-l border-slate-200 text-slate-500 hover:text-sky-600 transition-colors cursor-pointer"
              title="Tìm theo mã định mức"
            >
              <Search size={13} />
            </button>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              className="h-9 px-3 text-xs font-bold"
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
              Import Excel
            </Button>
            <Button
              variant="primary"
              size="md"
              className="h-9 px-3.5 text-xs font-bold shadow-xs"
              leftIcon={<PlusLg size={13} />}
              disabled={!isProdAdmin}
              onClick={() => {
                if (!isProdAdmin) return;
                resetProductForm();
                setShowAddProduct(true);
              }}
            >
              Thêm sản phẩm
            </Button>
          </div>
        }
        onRefresh={fetchProducts}
        menuItems={[
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

      {/* SPLIT VIEW: LEFT PRODUCT TABLE & RIGHT BOM EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 flex-1 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: PRODUCT LIST */}
        <div className="lg:col-span-4 flex flex-col min-h-0 h-full overflow-hidden bg-white">
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <i className="bi bi-box-seam text-sky-600"></i>
              <span>Sản phẩm sản xuất</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {totalItems || products.length} SP
            </span>
          </div>

          <FullWidthTable loading={loadingProducts} className="flex-1 min-h-0">
            <table className="w-full text-left border-collapse" style={{ fontSize: "13px" }}>
              <thead className="sticky top-0 z-10 bg-white border-b-2 border-slate-200">
                <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                  <th className="py-2.5 px-4 text-left">Tên thành phẩm & Mã</th>
                  <th className="py-2.5 px-3 text-right w-24">Định mức</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length > 0 ? (
                  products.map((row: any) => {
                    const count = row.dinhMucs?.length || 0;
                    const isSelected = row.id === selectedProduct?.id;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => handleSelectProduct(row)}
                        className={`transition-colors border-b border-slate-100 cursor-pointer ${
                          isSelected
                            ? "bg-sky-50/90 hover:bg-sky-100/70"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-2.5 px-4 align-middle">
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div
                                className={`truncate ${
                                  isSelected
                                    ? "font-bold text-sky-800"
                                    : "font-medium text-slate-800"
                                }`}
                                title={row.tenHang || row.name}
                              >
                                {row.tenHang || row.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {row.code || "—"} • {row.donVi || row.unit || "bộ"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right align-middle">
                          {count > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {count} ĐM
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Chưa có
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="text-center py-10 text-slate-400 text-xs">
                      Không tìm thấy sản phẩm nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </FullWidthTable>

          <Pagination
            currentPage={page}
            totalItems={totalItems || products.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemName="SP"
            compact={true}
          />
        </div>

        {/* RIGHT COLUMN: BOM EDITOR */}
        <div className="lg:col-span-8 flex flex-col min-h-0 h-full overflow-hidden bg-white">
          {!selectedProduct ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
              <i className="bi bi-box-seam text-5xl text-slate-300 mb-3"></i>
              <h5 className="font-bold text-slate-600 text-sm">
                Chọn một sản phẩm bên trái để xem và chỉnh sửa định mức
              </h5>
            </div>
          ) : loadingBom ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              Đang tải định mức...
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Product Summary Header */}
              <div className="p-4 border-t border-b border-slate-200 bg-slate-50/40 shrink-0">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-sky-700 text-base m-0 leading-snug">
                      {selectedProduct.tenHang || selectedProduct.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>
                        <i className="bi bi-upc-scan mr-1 text-slate-400"></i>
                        Mã: <strong className="text-slate-700">{selectedProduct.code || "N/A"}</strong>
                      </span>
                      <span>
                        <i className="bi bi-tag mr-1 text-slate-400"></i>
                        ĐVT:{" "}
                        <strong className="text-slate-700">
                          {selectedProduct.donVi || selectedProduct.unit || "bộ"}
                        </strong>
                      </span>
                      <span>
                        <i className="bi bi-building mr-1 text-slate-400"></i>
                        Kho:{" "}
                        <strong className="text-slate-700">
                          {selectedProduct.stocks?.length > 0
                            ? Array.from(
                                new Set(selectedProduct.stocks.map((s: any) => s.warehouse?.name))
                              )
                                .filter(Boolean)
                                .join(", ")
                            : "Kho thành phẩm"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<PencilSquare size={13} />}
                      onClick={() => setShowAddProduct(true)}
                      title="Cập nhật thông tin sản phẩm"
                    >
                      Sửa SP
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Receipt size={13} />}
                      onClick={() => setShowPriceDetails(true)}
                      title="Chi tiết cấu thành giá bán"
                    >
                      Chi tiết giá
                    </Button>
                  </div>
                </div>

                {bomData?.id && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl mt-2.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Giá vốn vật tư:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {totalMaterialCost.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Giá bán hiện tại:</span>
                      <span className="font-bold text-emerald-600 font-mono text-sm">
                        {selectedProduct.giaBan
                          ? `${selectedProduct.giaBan.toLocaleString("vi-VN")} đ`
                          : "--- đ"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        leftIcon={<PencilSquare size={12} />}
                        onClick={() => {
                          setInitialCost(totalMaterialCost);
                          setShowPriceOffcanvas(true);
                        }}
                      >
                        Tính giá
                      </Button>
                    </div>
                  </div>
                )}

                {/* BOM Code & Description Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                  <div className="md:col-span-4">
                    {bomData.id ? (
                      <Select
                        label="Mã định mức"
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
                          ...(selectedProduct.dinhMucs || []).map((dm: any) => ({
                            label: dm.code,
                            value: dm.id,
                          })),
                          { label: "+ Tạo định mức biến thể mới", value: "NEW" },
                        ]}
                      />
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Mã định mức mới
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={bomData.code || ""}
                            onChange={(e) => setBomData({ ...bomData, code: e.target.value })}
                            placeholder="Nhập mã ĐM mới"
                          />
                          {selectedProduct.dinhMucs?.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchBom(selectedProduct.dinhMucs[0].id)}
                            >
                              Hủy
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-8">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {isStandardBom ? "Mô tả định mức" : "Mô tả định mức biến thể"}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={bomData.tenDinhMuc || ""}
                        onChange={(e) => setBomData({ ...bomData, tenDinhMuc: e.target.value })}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 shrink-0"
                        title={
                          isStandardBom
                            ? "Đây là định mức tiêu chuẩn"
                            : "Đối soát vật tư với tiêu chuẩn"
                        }
                        disabled={isStandardBom}
                        onClick={() => setShowBomDiff(true)}
                      >
                        Đối soát
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Materials Action Bar */}
              <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <i className="bi bi-layers text-sky-600"></i>
                  <span>Thành phần nguyên vật liệu ({(bomData.vatTu || []).length})</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Dropdown Add Material */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<PlusLg size={13} />}
                      disabled={!isProdAdmin}
                      title={
                        !isProdAdmin
                          ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền thêm vật tư"
                          : undefined
                      }
                      onClick={() => {
                        if (!isProdAdmin) return;
                        setShowAddMaterialDropdown((prev) => !prev);
                        setTimeout(() => {
                          searchInputRef.current?.focus();
                        }, 100);
                      }}
                    >
                      Thêm vật tư
                    </Button>
                    {showAddMaterialDropdown && (
                      <div className="absolute right-0 mt-1.5 w-[350px] bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">
                            Chọn vật tư từ kho KVP
                          </span>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            onClick={() => setShowAddMaterialDropdown(false)}
                          >
                            <i className="bi bi-x-lg text-xs"></i>
                          </button>
                        </div>
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="w-full h-8 rounded-lg border border-slate-300 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-500 mb-2"
                          placeholder="Tìm kiếm vật tư..."
                          value={searchMaterial}
                          onChange={(e) => setSearchMaterial(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              const firstBtn = listGroupRef.current?.querySelector("button");
                              if (firstBtn) (firstBtn as HTMLButtonElement).focus();
                            }
                          }}
                        />
                        <div
                          className="max-h-64 overflow-y-auto divide-y divide-slate-100"
                          ref={listGroupRef}
                        >
                          {materials.length === 0 ? (
                            <div className="text-center text-slate-400 text-xs py-4">
                              Không tìm thấy vật tư
                            </div>
                          ) : (
                            materials.map((m: any) => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full text-left py-2 px-2 hover:bg-sky-50/70 transition-colors flex items-center justify-between cursor-pointer"
                                onClick={() => {
                                  addMaterialLine(m);
                                  searchInputRef.current?.focus();
                                }}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="text-xs font-semibold text-slate-800 truncate">
                                    {m.tenHang || m.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Mã: {m.code} | ĐVT: {m.donVi || m.unit}
                                  </div>
                                </div>
                                <i className="bi bi-plus-circle-fill text-sky-600 shrink-0"></i>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {bomData.id && (
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash size={13} />}
                      onClick={() => setShowConfirmDeleteBom(true)}
                      disabled={!isProdAdmin}
                      title={
                        !isProdAdmin
                          ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xóa định mức"
                          : "Xóa định mức"
                      }
                    >
                      Xóa ĐM
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveBom}
                    disabled={saving || isSameAsStandard || !isProdAdmin}
                    isLoading={saving}
                    title={
                      !isProdAdmin
                        ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền lưu định mức"
                        : isSameAsStandard
                        ? "Danh sách vật tư trùng khớp hoàn toàn với tiêu chuẩn, vui lòng thay đổi để lưu bản biến thể"
                        : ""
                    }
                  >
                    Lưu định mức
                  </Button>
                </div>
              </div>

              {/* BOM Materials Table */}
              <FullWidthTable className="flex-1 min-h-0">
                <table className="w-full text-left border-collapse" style={{ fontSize: "13px" }}>
                  <thead className="sticky top-0 z-10 bg-white border-b-2 border-slate-200">
                    <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                      <th className="py-2.5 px-3 text-center w-14">STT</th>
                      <th className="py-2.5 px-4 text-left">Tên vật tư & Mã linh kiện</th>
                      <th className="py-2.5 px-3 text-center w-28">Đơn vị</th>
                      <th className="py-2.5 px-3 text-center w-32">Số lượng</th>
                      <th className="py-2.5 px-3 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(bomData.vatTu || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-slate-400 py-12 text-xs">
                          Chưa có thành phần vật tư nào trong định mức này
                        </td>
                      </tr>
                    ) : (
                      (bomData.vatTu || []).map((row: any, idx: number) => {
                        let query = "";
                        if (row.material?.category?.code) {
                          query = row.material.category.code;
                        }
                        const count = query ? swapCounts[query] || 0 : 0;
                        const isSwapDisabled = (count !== -1 && count <= 1) || !isProdAdmin;

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                          >
                            <td className="py-2.5 px-3 text-center align-middle text-slate-400 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 align-middle">
                              <div className="font-semibold text-slate-800">
                                {row.material?.tenHang || row.tenVatTu || "Chưa xác định"}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                <i className="bi bi-upc-scan mr-1"></i>
                                {row.material?.code || row.maVatTu || "Không có mã"}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-middle text-center">
                              <input
                                type="text"
                                className="w-20 h-8 rounded-lg border border-transparent hover:border-slate-200 focus:border-sky-500 bg-transparent focus:bg-white text-center text-xs text-slate-700 outline-none transition-all"
                                value={row.donViTinh || ""}
                                disabled={!isProdAdmin}
                                onChange={(e) =>
                                  updateMaterialLine(idx, "donViTinh", e.target.value)
                                }
                              />
                            </td>
                            <td className="py-2.5 px-3 align-middle text-center">
                              <input
                                type="number"
                                className="w-24 h-8 rounded-lg border border-slate-300 bg-white text-center font-bold text-sky-700 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                                value={row.soLuong}
                                disabled={!isProdAdmin}
                                onChange={(e) =>
                                  updateMaterialLine(
                                    idx,
                                    "soLuong",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                min="0"
                                step="0.1"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-middle text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isSwapDisabled}
                                  title={
                                    !isProdAdmin
                                      ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền đổi vật tư"
                                      : "Đổi vật tư thay thế"
                                  }
                                  onClick={() => {
                                    if (!isProdAdmin) return;
                                    setSwapIndex(idx);
                                    const rowMaThayThe =
                                      row.material?.maThayThe || row.material?.code || "";
                                    const rowCategoryId = row.material?.category?.id || "";
                                    setSwapBaseExact(rowMaThayThe);
                                    setSwapBaseGroup(rowCategoryId);
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
                                  title={
                                    !isProdAdmin
                                      ? "Chỉ Quản đốc xưởng sản xuất, Trưởng bộ phận, Trưởng phòng mới có quyền xóa vật tư"
                                      : "Xóa vật tư"
                                  }
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
            </div>
          )}
        </div>
      </div>

      {/* Offcanvas Add / Edit Product */}
      <Offcanvas
        isOpen={showAddProduct}
        onClose={() => {
          setShowAddProduct(false);
          resetProductForm();
        }}
        title={editProductId ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
        description="Thiết lập mã hàng, nhóm thành phẩm và kho mặc định"
        icon={<i className="bi bi-box-seam text-lg" />}
        width="400px"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            {editProductId ? (
              <Button
                variant="danger"
                size="md"
                leftIcon={<Trash size={14} />}
                onClick={() => setShowConfirmDelete(true)}
                disabled={!isProdAdmin}
              >
                Xóa
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowAddProduct(false);
                  resetProductForm();
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

      {/* Swap Material Offcanvas */}
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

      <BOMPriceDetailsOffcanvas
        show={showPriceDetails}
        onClose={() => setShowPriceDetails(false)}
        bomData={bomData}
        selectedProduct={selectedProduct}
        initialCost={totalMaterialCost}
      />

      <UpdatePriceOffcanvas
        show={showPriceOffcanvas}
        onClose={() => setShowPriceOffcanvas(false)}
        itemName={selectedProduct?.tenHang || selectedProduct?.name || ""}
        initialCost={initialCost}
        initialPrice={selectedProduct?.giaBan || 0}
        initialMarginPct={selectedProduct?.loiNhuanKyVong}
        initialMarginType={selectedProduct?.phuongPhapTinhLoiNhuan}
        applyAllLabel="Áp dụng cho tất cả Thành phẩm (có định mức)"
        onSaveSingle={async (finalPrice, marginPct, marginType) => {
          const res = await fetch(`/api/production/bom/${bomData.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ giaBan: finalPrice, marginPct, marginType }),
          });
          if (res.ok) {
            setSelectedProduct((prev: any) =>
              prev
                ? {
                    ...prev,
                    giaBan: finalPrice,
                    loiNhuanKyVong: marginPct,
                    phuongPhapTinhLoiNhuan: marginType,
                  }
                : prev
            );
            fetchProducts();
            setShowPriceOffcanvas(false);
            toastSuccess("Thành công", "Cập nhật giá bán thành công");
          } else {
            const data = await res.json().catch(() => ({}));
            toastError("Lỗi", data.error || "Có lỗi xảy ra khi lưu giá bán");
          }
        }}
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

            const calculatedFinalPrice =
              marginType === "revenue"
                ? marginPct < 100
                  ? Math.round(initialCost / (1 - marginPct / 100))
                  : 0
                : Math.round(initialCost * (1 + marginPct / 100));

            setSelectedProduct((prev: any) =>
              prev
                ? {
                    ...prev,
                    giaBan: calculatedFinalPrice,
                    loiNhuanKyVong: marginPct,
                    phuongPhapTinhLoiNhuan: marginType,
                  }
                : prev
            );
            fetchProducts();
            setShowPriceOffcanvas(false);
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

      <ConfirmDialog
        open={showConfirmDelete}
        title="Xóa sản phẩm"
        message="Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác."
        variant="danger"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleDeleteProduct}
        onCancel={() => setShowConfirmDelete(false)}
        loading={deletingProduct}
      />

      <ConfirmDialog
        open={showConfirmDeleteBom}
        title="Xóa định mức"
        message="Bạn có chắc chắn muốn xóa định mức này không? Hành động này không thể hoàn tác."
        variant="danger"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleDeleteBom}
        onCancel={() => setShowConfirmDeleteBom(false)}
        loading={deletingBom}
      />

      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StandardPage>
  );
}

export default ProductionBomPage;
