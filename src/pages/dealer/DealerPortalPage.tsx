import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDepartment } from '../../context/DepartmentContext';
import { StandardPage } from '../../components/layout/StandardPage';
import { StepPage } from '../../components/common/StepPage';
import type { ModernStepItem } from '../../types';
import { DealerOverviewView } from './DealerOverviewView';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import {
  Shop,
  CartPlus,
  BoxSeam,
  CashCoin,
  Headset,
  CheckCircle,
  ClockHistory,
  Telephone,
  GeoAlt,
  PersonCheck,
  ShieldCheck,
  ExclamationTriangle,
  ArrowRight,
  Search,
  Trash,
  Send,
  Building,
  InfoCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  FileEarmarkText,
  Camera,
  XLg,
  PencilSquare,
  Printer,
  Trophy,
  Wallet2,
  ListTask
} from 'react-bootstrap-icons';
import { HoverImage } from '../../components/ui/HoverImage';
import { ProductDrawer } from '../../components/marketing/ProductDrawer';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Offcanvas } from '../../components/common/Offcanvas';

const cleanOrderProductText = (raw?: string | null): string => {
  if (!raw) return '';
  return raw
    .replace(/^(?:Đơn\s+(?:bán\s+|mua\s+)?hàng\s*[^:]*:\s*)/i, '')
    .replace(/\s*\(\d+\s*(?:bộ|chiếc|cái|sp|sản phẩm)\)\s*$/i, '')
    .trim();
};

interface ProductItem {
  id: number | string;
  code?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  images?: string[];
  excerpt?: string;
  description?: string;
  specs?: Record<string, string>;
  url?: string;
  slug?: string;
  updatedAt?: string;
  promotions?: string[] | string;
  policies?: string[] | string;
  categories?: any[];
  categoryNames?: string[];
  categoryName?: string;
  itemType?: 'thanh-pham' | 'linh-kien';
  unit?: string;
}

interface CartItem {
  productId: number | string;
  tenHang: string;
  donGia: number;
  soLuong: number;
  ghiChu?: string;
  hinhAnh?: string | null;
  images?: string[];
  unit?: string;
}

interface OrderItem {
  id: string;
  code: string;
  ngayDat: string;
  ngayGiao?: string | null;
  tongTien: number;
  daThanhToan: number;
  trangThai: string;
  keToanDuyet: string;
  ghiChu?: string | null;
  nguoiPhuTrach?: string | null;
  nguoiNhan?: string | null;
  soDienThoai?: string | null;
  diaChiGiaoHang?: string | null;
  nguoiDatHang?: string | null;
  orderSource?: string | null;
  saleOrderItems?: {
    id: string;
    tenHang: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
    hinhAnh?: string | null;
    ghiChu?: string | null;
    donViTinh?: string | null;
    seajongProductId?: number | null;
    inventoryItemId?: string | null;
  }[];
}

interface DealerOverviewData {
  customer: {
    id: string;
    code: string;
    name: string;
    dienThoai?: string | null;
    address?: string | null;
    daiDien?: string | null;
    nhom?: string | null;
    loai?: string | null;
    loaiName?: string | null;
    coCamKet?: boolean;
    hanMucCongNo: number;
    doanhSoCamKet: number;
    thuongDoanhSoNam?: string | null;
    thuongThanhToan?: string | null;
    thuongVuotDoanhSo?: string | null;
    formValues?: string | null;
    tier?: string;
    discountPercent?: number;
    rewardPoints?: number;
    nguoiChamSoc?: {
      id: string;
      fullName: string;
      phone?: string | null;
    } | null;
  };
  metrics: {
    totalOrdersCount: number;
    totalOrderValue: number;
    totalPaid: number;
    currentDebt: number;
    remainingCredit: number;
    hanMucCongNo: number;
    doanhSoCamKet: number;
  };
  recentOrders: OrderItem[];
}

export const DealerPortalPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { activeMenuKey, setActiveMenuKey } = useDepartment();

  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<DealerOverviewData | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  
  // Ordering state
  const [orderSubTab, setOrderSubTab] = useState<'list' | 'create'>('list');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [prepaidAmount, setPrepaidAmount] = useState<number>(0);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<{ open: boolean; code?: string; total?: number; isDraft?: boolean }>({ open: false });
  const [showOrderPreview, setShowOrderPreview] = useState<boolean>(false);
  const [isShippingCollapsed, setIsShippingCollapsed] = useState<boolean>(true);

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [selectedPaymentTx, setSelectedPaymentTx] = useState<any | null>(null);
  const [selectedRewardProgram, setSelectedRewardProgram] = useState<any | null>(null);
  const [selectedMonthReward, setSelectedMonthReward] = useState<any | null>(null);
  const [rewardMonthFilter, setRewardMonthFilter] = useState<number | 'all'>('all');
  const [rewardPage, setRewardPage] = useState<number>(1);
  const [rewardPageSize, setRewardPageSize] = useState<number>(12);

  // Lightbox Image Gallery Modal
  const [galleryItem, setGalleryItem] = useState<{
    name: string;
    code?: string;
    images: string[];
    activeIndex: number;
    price?: number;
    product?: ProductItem;
  } | null>(null);

  // Offcanvas xem thông tin chi tiết hàng hoá (chuẩn phòng Marketing)
  const [selectedDrawerProduct, setSelectedDrawerProduct] = useState<any | null>(null);
  const [focusedProductId, setFocusedProductId] = useState<number | string | null>(null);

  // Quản lý chỉnh sửa / xoá / xem chi tiết đơn hàng
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null);
  const [isSubmittingDraftOrder, setIsSubmittingDraftOrder] = useState<boolean>(false);
  const [viewingOrderDetailOrder, setViewingOrderDetailOrder] = useState<OrderItem | null>(null);

  // Phone update modal / prompt
  const [showPhonePrompt, setShowPhonePrompt] = useState<boolean>(false);
  const [inputPhone, setInputPhone] = useState<string>('');
  const [savingPhone, setSavingPhone] = useState<boolean>(false);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'thanh-pham' | 'linh-kien'>('all');
  const [productPage, setProductPage] = useState<number>(1);
  const [productPageSize, setProductPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dealer_portal_product_page_size');
      if (saved) {
        const val = Number(saved);
        if ([12, 24, 48].includes(val)) return val;
      }
    } catch {
      // ignore
    }
    return 12;
  });
  const [categories, setCategories] = useState<any[]>([]);

  const [searchOrder, setSearchOrder] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);
  // StepPage state: 1 = Đang thực hiện, 2 = Đã hoàn thành
  const [orderStep, setOrderStep] = useState<number>(1);
  // StepPage state cho Công nợ và điểm thưởng: 1 = Theo dõi công nợ, 2 = Tính toán điểm thưởng
  const [debtStep, setDebtStep] = useState<number>(1);
  const [debtStartDate, setDebtStartDate] = useState<string>(() => `${new Date().getFullYear()}-01-01T00:00:00`);
  const [debtEndDate, setDebtEndDate] = useState<string>('2026-10-29T23:59:59');
  const [debtPage, setDebtPage] = useState<number>(1);
  const [debtPageSize, setDebtPageSize] = useState<number>(10);

  // 1. Fetch overview data
  const fetchOverview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/overview', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOverviewData(json.data);
          // If dealer doesn't have phone, prompt them
          if (!json.data.customer?.dienThoai) {
            setShowPhonePrompt(true);
          }
          if (json.data.customer) {
            setRecipientName(prev => prev || json.data.customer.daiDien || json.data.customer.name || '');
            setRecipientPhone(prev => prev || json.data.customer.dienThoai || '');
            setShippingAddress(prev => prev || json.data.customer.address || '');
          }
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu đại lý:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch orders
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/orders', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng đại lý:', err);
    }
  };

  // 3. Fetch products (luôn lấy dữ liệu mới nhất không qua cache)
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch(`/api/dealer/products?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      }
    } catch (err) {
      console.error('Lỗi tải catalog sản phẩm:', err);
    }
  };

  // Keyboard navigation cho Lightbox Gallery Modal
  useEffect(() => {
    if (!galleryItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGalleryItem(null);
      } else if (e.key === 'ArrowLeft') {
        setGalleryItem(prev => prev ? {
          ...prev,
          activeIndex: (prev.activeIndex - 1 + prev.images.length) % prev.images.length
        } : null);
      } else if (e.key === 'ArrowRight') {
        setGalleryItem(prev => prev ? {
          ...prev,
          activeIndex: (prev.activeIndex + 1) % prev.images.length
        } : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryItem]);

  useEffect(() => {
    fetchOverview();
    fetchOrders();
    fetchProducts();
    fetch('/api/seajong/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Ghi nhớ số lượng trên một trang khi người dùng thay đổi
  useEffect(() => {
    try {
      localStorage.setItem('dealer_portal_product_page_size', String(productPageSize));
    } catch {
      // ignore
    }
  }, [productPageSize]);

  // Update phone handler
  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim() || inputPhone.trim().length < 8) {
      setPhoneMessage('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 chữ số)');
      return;
    }
    setSavingPhone(true);
    setPhoneMessage(null);
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/update-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ phone: inputPhone.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowPhonePrompt(false);
        await refreshUser();
        await fetchOverview();
      } else {
        setPhoneMessage(data.message || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      setPhoneMessage(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSavingPhone(false);
    }
  };

  // Add to cart
  const handleAddToCart = (product: ProductItem, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => String(item.productId) === String(product.id));
      if (existing) {
        return prev.map(item =>
          String(item.productId) === String(product.id) ? { ...item, soLuong: item.soLuong + qty } : item
        );
      }
      return [...prev, {
        productId: product.id,
        tenHang: product.name,
        donGia: product.price,
        soLuong: qty,
        hinhAnh: product.imageUrl || null,
        images: product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : []),
        unit: product.unit || 'Bộ'
      }];
    });
  };

  // Remove from cart
  const handleRemoveFromCart = (productId: number | string) => {
    setCart(prev => prev.filter(item => String(item.productId) !== String(productId)));
  };

  // Focus to product in catalog when clicked from cart
  const handleFocusProductInCatalog = (productId: number | string) => {
    const prod = products.find(p => String(p.id) === String(productId));
    if (!prod) return;

    let targetList = filteredProducts;
    let willResetFilters = false;

    // Check if the current search filter excludes this item
    if (searchProduct.trim()) {
      const q = searchProduct.toLowerCase().trim();
      const matchSearch = (prod.name && prod.name.toLowerCase().includes(q)) || (prod.code && prod.code.toLowerCase().includes(q));
      if (!matchSearch) {
        willResetFilters = true;
      }
    }

    // Check if the current type filter excludes this item
    if (productTypeFilter === 'thanh-pham' && prod.itemType === 'linh-kien') {
      willResetFilters = true;
    } else if (productTypeFilter === 'linh-kien' && prod.itemType !== 'linh-kien') {
      willResetFilters = true;
    }

    if (willResetFilters) {
      setSearchProduct('');
      setProductTypeFilter('all');
      targetList = products;
    }

    const index = targetList.findIndex(p => String(p.id) === String(productId));
    if (index !== -1) {
      const targetPage = Math.floor(index / productPageSize) + 1;
      setProductPage(targetPage);
    }

    setFocusedProductId(productId);
  };

  // Tự động cuộn đến sản phẩm được focus trong catalog
  useEffect(() => {
    if (!focusedProductId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`product-card-${focusedProductId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [focusedProductId, productPage]);

  // Tự động tắt viền highlight sau 3.5s
  useEffect(() => {
    if (!focusedProductId) return;
    const timer = setTimeout(() => {
      setFocusedProductId(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [focusedProductId]);

  // Update cart item quantity
  const handleUpdateQty = (productId: number | string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => String(item.productId) === String(productId) ? { ...item, soLuong: qty } : item));
  };

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.donGia * item.soLuong), 0);
  }, [cart]);

  // Chỉnh sửa đơn hàng (nạp lại vào giỏ hàng và chuyển sang tab tạo đơn)
  const handleEditOrder = (order: OrderItem) => {
    const editCartItems = (order.saleOrderItems || []).map(item => ({
      productId: item.seajongProductId || item.inventoryItemId || item.id,
      tenHang: item.tenHang,
      donGia: item.donGia,
      soLuong: item.soLuong,
      hinhAnh: item.hinhAnh,
      donViTinh: item.donViTinh || 'Bộ'
    }));

    setCart(editCartItems);
    setRecipientName(order.nguoiNhan || '');
    setRecipientPhone(order.soDienThoai || '');
    setShippingAddress(order.diaChiGiaoHang || '');
    setDeliveryDate(order.ngayGiao ? order.ngayGiao.slice(0, 10) : '');
    setPrepaidAmount(order.daThanhToan || 0);
    setOrderNote(order.ghiChu || '');
    setEditingOrderId(order.id);
    setSelectedOrder(null);
    setOrderSubTab('create');
  };

  // Xoá đơn hàng (chỉ mở với các đơn có trạng thái bản nháp) - Mở ConfirmDialog
  const handleDeleteOrder = (order: OrderItem) => {
    if (order.trangThai !== 'draft') {
      alert('Chỉ có thể xoá các đơn hàng ở trạng thái bản nháp!');
      return;
    }
    setOrderToDelete(order);
  };

  // Xác nhận xoá đơn hàng sau khi đồng ý trên ConfirmDialog
  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    if (orderToDelete.trangThai !== 'draft') {
      alert('Chỉ có thể xoá các đơn hàng ở trạng thái bản nháp!');
      setOrderToDelete(null);
      return;
    }

    setIsDeletingOrder(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch(`/api/dealer/orders/${orderToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderToDelete(null);
        setSelectedOrder(null);
        await fetchOrders();
        await fetchOverview();
      } else {
        alert(data.message || 'Lỗi khi xoá đơn hàng');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Gửi đơn hàng bản nháp đến Bộ phận Kinh doanh để duyệt
  const handleSubmitDraftOrder = async (order: OrderItem) => {
    if (order.trangThai !== 'draft') {
      alert('Chỉ có thể gửi các đơn hàng ở trạng thái bản nháp!');
      return;
    }

    setIsSubmittingDraftOrder(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch(`/api/dealer/orders/${order.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Cập nhật trạng thái của selectedOrder nếu đang mở
        setSelectedOrder(prev => (prev && prev.id === order.id ? { ...prev, trangThai: 'pending' } : prev));
        await fetchOrders();
        await fetchOverview();
        alert(`Đơn hàng #${order.code} đã được gửi thành công đến Bộ phận Kinh doanh để phê duyệt!`);
      } else {
        alert(data.message || 'Lỗi khi gửi đơn hàng');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsSubmittingDraftOrder(false);
    }
  };

  // Submit order to Sales department or Save as draft
  const handleSaveOrder = async (isDraft = false) => {
    if (cart.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm vào đơn hàng');
      return;
    }
    setIsSubmittingOrder(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const endpoint = editingOrderId ? `/api/dealer/orders/${editingOrderId}` : '/api/dealer/orders';
      const method = editingOrderId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          items: cart,
          ghiChu: orderNote,
          ngayGiao: deliveryDate || undefined,
          daThanhToan: prepaidAmount || 0,
          nguoiNhan: recipientName || overviewData?.customer?.daiDien || overviewData?.customer?.name || '',
          soDienThoai: recipientPhone || overviewData?.customer?.dienThoai || '',
          diaChiGiaoHang: shippingAddress || overviewData?.customer?.address || '',
          nguoiDatHang: user?.name || overviewData?.customer?.name || '',
          isDraft,
          trangThai: isDraft ? 'draft' : 'pending'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingOrderId(null);
        setShowOrderPreview(false);
        setCart([]);
        setOrderNote('');
        setDeliveryDate('');
        setPrepaidAmount(0);
        setOrderSuccessModal({
          open: true,
          code: data.order?.code,
          total: data.order?.tongTien,
          isDraft
        });
        await fetchOrders();
        await fetchOverview();
      } else {
        alert(data.message || (isDraft ? 'Lỗi khi lưu nháp đơn hàng' : 'Lỗi khi gửi đơn hàng'));
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSubmitOrder = () => handleSaveOrder(false);

  // Format currency
  const formatVND = (val?: number | null) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Đếm số lượng sản phẩm theo phân loại
  const productCounts = useMemo(() => {
    let tp = 0;
    let lk = 0;
    products.forEach(p => {
      if (p.itemType === 'linh-kien') lk++;
      else tp++;
    });
    return { all: products.length, tp, lk };
  }, [products]);

  // Filtered products theo loại hàng và từ khóa tìm kiếm
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Phân loại Thành phẩm vs Linh kiện
      if (productTypeFilter === 'thanh-pham' && p.itemType !== 'thanh-pham') return false;
      if (productTypeFilter === 'linh-kien' && p.itemType !== 'linh-kien') return false;

      // 2. Tìm kiếm theo tên hoặc mã sản phẩm
      if (searchProduct.trim()) {
        const q = searchProduct.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.code ? p.code.toLowerCase().includes(q) : false;
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [products, productTypeFilter, searchProduct]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));

  const pagedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Phân loại đơn hàng theo trạng thái
  const inProgressOrders = useMemo(() => {
    return orders.filter(o => o.trangThai !== 'completed');
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(o => o.trangThai === 'completed');
  }, [orders]);

  // Danh sách các bước của StepPage: 1 = Đang thực hiện, 2 = Đã hoàn thành
  const orderSteps: ModernStepItem[] = useMemo(() => [
    {
      num: 1,
      id: 'in_progress',
      title: 'Đang thực hiện',
      desc: 'Bản nháp & chờ duyệt',
      badge: inProgressOrders.length > 0 ? `${inProgressOrders.length} đơn` : undefined,
      badgeVariant: 'warning',
      icon: <ClockHistory className="w-4 h-4" />,
    },
    {
      num: 2,
      id: 'completed',
      title: 'Đã hoàn thành',
      desc: 'Đơn hàng đã nhận & tất toán',
      badge: completedOrders.length > 0 ? `${completedOrders.length} đơn` : undefined,
      badgeVariant: 'success',
      icon: <CheckCircle className="w-4 h-4" />,
    },
  ], [inProgressOrders.length, completedOrders.length]);

  // Danh sách các bước của StepPage cho Công nợ và điểm thưởng
  const debtSteps: ModernStepItem[] = useMemo(() => [
    {
      num: 1,
      id: 'debt_tracking',
      title: 'Theo dõi công nợ',
      desc: 'Hạn mức, dư nợ & lịch sử thanh toán',
      icon: <CashCoin className="w-4 h-4" />,
    },
    {
      num: 2,
      id: 'reward_calculation',
      title: 'Tính toán điểm thưởng',
      desc: 'Điểm tích lũy & chính sách chiết khấu',
      icon: <Trophy className="w-4 h-4" />,
    },
  ], []);

  // Filtered orders theo Bước hiện tại của StepPage
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      // 1. Phân loại theo bước của StepPage
      const matchStep = orderStep === 1
        ? ord.trangThai !== 'completed'
        : ord.trangThai === 'completed';

      if (!matchStep) return false;

      // 2. Tìm kiếm theo mã hoặc ghi chú
      const matchSearch = !searchOrder.trim() ||
        ord.code.toLowerCase().includes(searchOrder.toLowerCase().trim()) ||
        (ord.ghiChu && ord.ghiChu.toLowerCase().includes(searchOrder.toLowerCase().trim()));

      // 3. Bộ lọc trạng thái con
      const matchStatus = orderStatusFilter === 'all' || ord.trangThai === orderStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, orderStep, searchOrder, orderStatusFilter]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredOrders.slice(start, start + orderPageSize);
  }, [filteredOrders, orderPage, orderPageSize]);

  // Tính toán Sổ chi tiết công nợ phát sinh theo kỳ lọc
  const debtLedgerData = useMemo(() => {
    const rawTxList: {
      id: string;
      timestamp: number;
      dateStr: string;
      ref: string;
      type: 'Mua hàng' | 'Phiếu chi (Trả nợ)' | 'Dư nợ đầu kỳ';
      note: string;
      increase: number;
      decrease: number;
      seq: number;
      order?: OrderItem;
      paymentMethod?: string;
    }[] = [];

    const formatDateTimeVN = (dt: Date) => {
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      const ss = String(dt.getSeconds()).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}`;
    };

    let seqCounter = 0;
    const validOrders = orders.filter(o => o.trangThai !== 'draft');

    validOrders.forEach((ord) => {
      const rawDate = ord.ngayDat || (ord as any).createdAt;
      const baseDate = rawDate ? new Date(rawDate) : new Date();
      const baseTime = !isNaN(baseDate.getTime()) ? baseDate.getTime() : Date.now();
      const orderAmount = Number(ord.tongTien) || 0;
      const paidAmount = Number(ord.daThanhToan) || 0;

      // 1. Bút toán Mua hàng (Phát sinh tăng)
      rawTxList.push({
        id: `BUY_${ord.id}`,
        timestamp: baseTime,
        dateStr: formatDateTimeVN(new Date(baseTime)),
        ref: ord.code,
        type: 'Mua hàng',
        note: ord.ghiChu || `Đơn mua hàng ${ord.code}`,
        increase: orderAmount,
        decrease: 0,
        seq: seqCounter++,
        order: ord,
      });

      // 2. Bút toán Phiếu chi trả nợ (Phát sinh giảm)
      const payments = Array.isArray((ord as any).payments) ? (ord as any).payments : [];
      if (payments.length > 0) {
        payments.forEach((p: any, pIdx: number) => {
          const pAmt = Number(p.amount) || 0;
          if (pAmt <= 0) return;
          const pDate = p.date ? new Date(p.date) : new Date(baseTime + (pIdx + 1) * 60000);
          const pTime = !isNaN(pDate.getTime()) ? pDate.getTime() : baseTime + (pIdx + 1) * 60000;
          rawTxList.push({
            id: `PAY_${ord.id}_${pIdx}`,
            timestamp: pTime,
            dateStr: formatDateTimeVN(new Date(pTime)),
            ref: p.code || `PC-${ord.code}`,
            type: 'Phiếu chi (Trả nợ)',
            note: p.note || p.title || `Thanh toán đơn mua hàng ${ord.code} - Chuyển khoản`,
            increase: 0,
            decrease: pAmt,
            seq: seqCounter++,
            order: ord,
            paymentMethod: p.method || 'Chuyển khoản ngân hàng',
          });
        });
      } else if (paidAmount > 0) {
        const payTime = baseTime + 120000; // +2 phút sau đơn hàng
        rawTxList.push({
          id: `PAY_${ord.id}`,
          timestamp: payTime,
          dateStr: formatDateTimeVN(new Date(payTime)),
          ref: `PC-${ord.code}`,
          type: 'Phiếu chi (Trả nợ)',
          note: `Thanh toán đơn mua hàng ${ord.code} - Chuyển khoản`,
          increase: 0,
          decrease: paidAmount,
          seq: seqCounter++,
          order: ord,
          paymentMethod: 'Chuyển khoản ngân hàng',
        });
      }
    });

    // Sắp xếp tăng dần theo thời gian để tính dư nợ lũy kế chính xác
    rawTxList.sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return a.seq - b.seq;
    });

    const startMs = debtStartDate ? new Date(debtStartDate).getTime() : null;
    const endMs = debtEndDate ? new Date(debtEndDate).getTime() : null;

    let openingBalance = 0;
    let periodIncrease = 0;
    let periodDecrease = 0;
    let runningBalance = 0;

    const inPeriodList: (typeof rawTxList[number] & { balance: number })[] = [];

    rawTxList.forEach((tx) => {
      if (startMs && !isNaN(startMs) && tx.timestamp < startMs) {
        openingBalance += tx.increase - tx.decrease;
        runningBalance = openingBalance;
        return;
      }
      if (endMs && !isNaN(endMs) && tx.timestamp > endMs) {
        return;
      }
      periodIncrease += tx.increase;
      periodDecrease += tx.decrease;
      runningBalance += tx.increase - tx.decrease;
      inPeriodList.push({
        ...tx,
        balance: runningBalance,
      });
    });

    const closingBalance = openingBalance + periodIncrease - periodDecrease;

    // Dòng Dư nợ đầu kỳ luôn nằm ở cuối danh sách hiển thị (đầu kỳ theo thời gian)
    const openingDateObj = startMs && !isNaN(startMs)
      ? new Date(startMs)
      : new Date(`${new Date().getFullYear()}-01-01T00:00:00`);

    const openingRow: typeof rawTxList[number] & { balance: number } = {
      id: 'OPENING_BALANCE',
      timestamp: openingDateObj.getTime(),
      dateStr: formatDateTimeVN(openingDateObj),
      ref: 'DK',
      type: 'Dư nợ đầu kỳ',
      note: 'Dư nợ cũ chuyển sang',
      increase: 0,
      decrease: 0,
      seq: -1,
      balance: openingBalance,
    };

    return {
      openingBalance,
      periodIncrease,
      periodDecrease,
      closingBalance,
      // Hiển thị giao dịch mới nhất lên đầu, dòng Dư nợ đầu kỳ (DK) nằm ở cuối cùng giống trong hình 2
      transactions: [...[...inPeriodList].reverse(), openingRow],
    };
  }, [orders, debtStartDate, debtEndDate]);

  const pagedDebtTransactions = useMemo(() => {
    const start = (debtPage - 1) * debtPageSize;
    return debtLedgerData.transactions.slice(start, start + debtPageSize);
  }, [debtLedgerData.transactions, debtPage, debtPageSize]);

  // ── BỘ MÁY TÍNH THƯỞNG ĐẠI LÝ THEO DỮ LIỆU THỰC TẾ TRONG DB ──
  const rewardEngineData = useMemo(() => {
    const cust = overviewData?.customer;
    let parsedForm: Record<string, any> = {};
    if (cust?.formValues) {
      try {
        parsedForm = JSON.parse(cust.formValues);
      } catch {
        parsedForm = {};
      }
    }

    const parseDbMoney = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') {
        if (val > 0 && val < 1000) return Math.round(val * 1000000000);
        return Math.round(val);
      }
      const str = String(val).trim();
      if (!str) return 0;
      if (/^\d+(\.\d+)?$/.test(str)) {
        const num = Number(str);
        if (num > 0 && num < 1000) return Math.round(num * 1000000000);
        return Math.round(num);
      }
      const digits = str.replace(/\D/g, '');
      return digits ? Number(digits) : 0;
    };

    const bbBonuses: any[] = Array.isArray(parsedForm.bbBonuses) ? parsedForm.bbBonuses : [];
    const bbPaymentRule = bbBonuses.find(
      (b) => String(b.id) === '1' || /tháng|thanh\s*toán/i.test(b.title || '')
    );
    const bbAnnualRule = bbBonuses.find(
      (b) => String(b.id) === '2' || (/doanh\s*số\s*năm/i.test(b.title || '') && !/vượt/i.test(b.title || ''))
    );
    const bbExceedRule = bbBonuses.find(
      (b) => String(b.id) === '3' || /vượt/i.test(b.title || '')
    );

    // 1. Lấy 3 công thức thưởng thực tế lưu trong DB (Customer.thuongThanhToan / thuongDoanhSoNam / thuongVuotDoanhSo / bbBonuses)
    const rawRulePayment = (
      cust?.thuongThanhToan ||
      parsedForm.thuongThanhToan ||
      bbPaymentRule?.formula ||
      bbPaymentRule?.desc ||
      ''
    ).trim();
    const rawRuleAnnual = (
      cust?.thuongDoanhSoNam ||
      parsedForm.thuongDoanhSoNam ||
      bbAnnualRule?.formula ||
      bbAnnualRule?.desc ||
      ''
    ).trim();
    const rawRuleExceed = (
      cust?.thuongVuotDoanhSo ||
      parsedForm.thuongVuotDoanhSo ||
      bbExceedRule?.formula ||
      bbExceedRule?.desc ||
      ''
    ).trim();

    // Bóc tỷ lệ % tự động từ chuỗi cấu hình thực tế trong DB
    const extractPercent = (str: string, keywordAfter?: string): number => {
      if (!str) return 0;
      if (keywordAfter) {
        const idx = str.toLowerCase().indexOf(keywordAfter.toLowerCase());
        if (idx >= 0) {
          const sub = str.slice(idx);
          const m = sub.match(/(\d+(?:[.,]\d+)?)\s*%/);
          if (m) return Number(m[1].replace(',', '.')) || 0;
        }
      }
      const matches = [...str.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)];
      if (matches.length > 0) {
        // Với câu "Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5%...", lấy số % sau chữ "Thưởng" (hoặc số % cuối cùng)
        const chosen = matches[matches.length - 1];
        return Number(chosen[1].replace(',', '.')) || 0;
      }
      return 0;
    };

    const paymentRate = extractPercent(rawRulePayment);
    const annualRate = extractPercent(rawRuleAnnual, 'thưởng');
    const exceedRate = extractPercent(rawRuleExceed, 'thưởng');

    // Hạng đại lý thực tế từ DB (Customer.loai -> Category.name)
    const loaiCode = (cust?.loai || '').toLowerCase();
    const dbTierName =
      cust?.loaiName ||
      (loaiCode === 'lkh-20260401-5039-lmcd' || loaiCode.includes('kim')
        ? 'Kim cương'
        : loaiCode === 'lkh-20260401-4322-dfdl' || loaiCode.includes('vang')
        ? 'Vàng'
        : loaiCode === 'lkh-20260401-1090-xqah' || loaiCode === 'bac'
        ? 'Bạc'
        : loaiCode === 'lkh-20260401-1825-wgxf' || loaiCode.includes('dong')
        ? 'Đồng'
        : 'Chưa phân hạng');

    const dbAnnualTarget =
      Number(cust?.doanhSoCamKet) ||
      parseDbMoney(parsedForm.doanhSoCamKet) ||
      parseDbMoney(parsedForm.plRevenueCommit) ||
      parseDbMoney(parsedForm.hdAnnualRevenue) ||
      parseDbMoney(parsedForm.contractValue) ||
      Number(overviewData?.metrics?.doanhSoCamKet) ||
      0;
    const coCamKet = Boolean(cust?.coCamKet ?? parsedForm.coCamKet ?? dbAnnualTarget > 0);
    const effectiveAnnualTarget = dbAnnualTarget;

    // 2. Duyệt từng đơn hàng thực tế trong DB của đại lý (kết hợp orders & recentOrders) để tính doanh số & thưởng
    const combinedOrdersMap = new Map<string, OrderItem>();
    orders.forEach((o) => {
      if (o && o.code) combinedOrdersMap.set(o.code, o);
    });
    (overviewData?.recentOrders || []).forEach((ro: any) => {
      if (ro && ro.code && !combinedOrdersMap.has(ro.code)) {
        combinedOrdersMap.set(ro.code, {
          id: ro.id || ro.code,
          code: ro.code,
          ngayDat: ro.ngayDat || ro.createdAt,
          tongTien: ro.tongTien || 0,
          daThanhToan: ro.daThanhToan || 0,
          trangThai: ro.trangThai || 'completed',
          ghiChu: ro.ghiChu || ro.title || `Đơn hàng ${ro.code}`,
          dueDate: ro.dueDate || null,
          debtStatus: ro.debtStatus || 'ontime',
          saleOrderItems: ro.saleOrderItems || [],
        } as any);
      }
    });

    const validOrders = Array.from(combinedOrdersMap.values()).filter(
      (o) => o.trangThai !== 'draft'
    );

    let totalGrossOrderRevenue = 0;
    let totalGrossPaidOnTime = 0;
    let totalGrossPaidOverdue = 0;
    let totalGrossRemainingInTerm = 0;

    const orderRewardRows = validOrders.map((ord) => {
      const grossOrderAmt = Number(ord.tongTien) || 0;
      const grossPaidAmt = Number(ord.daThanhToan) || 0;
      const grossRemainAmt = Math.max(0, grossOrderAmt - grossPaidAmt);
      const debtStatus = (ord as any).debtStatus || 'ontime';
      const isOverdue = debtStatus === 'overdue';

      totalGrossOrderRevenue += grossOrderAmt;
      if (isOverdue) {
        totalGrossPaidOverdue += grossPaidAmt;
      } else {
        totalGrossPaidOnTime += grossPaidAmt;
        totalGrossRemainingInTerm += grossRemainAmt;
      }

      const netOrderBase = grossOrderAmt;
      const netPaidOnTimeBase = isOverdue ? 0 : grossPaidAmt;
      const netRemainInTermBase = isOverdue ? 0 : grossRemainAmt;

      const earnedPaymentBonus =
        paymentRate > 0 ? Math.round((netPaidOnTimeBase * paymentRate) / 100) : 0;
      const pendingPaymentBonus =
        paymentRate > 0 ? Math.round((netRemainInTermBase * paymentRate) / 100) : 0;

      const rawDate = ord.ngayDat || (ord as any).createdAt;
      const dt = rawDate ? new Date(rawDate) : new Date();
      const validDt = !isNaN(dt.getTime()) ? dt : new Date();
      const dateStr = validDt.toLocaleDateString('vi-VN');
      const monthNum = validDt.getMonth() + 1;
      const yearNum = validDt.getFullYear();

      return {
        id: ord.id,
        code: ord.code,
        dateStr,
        monthNum,
        yearNum,
        dueDate: (ord as any).dueDate || 'Theo hợp đồng',
        note: cleanOrderProductText(ord.ghiChu) || ord.ghiChu || `Đơn hàng ${ord.code}`,
        grossOrderAmt,
        grossPaidAmt,
        grossRemainAmt,
        netOrderBase,
        netPaidOnTimeBase,
        netRemainInTermBase,
        isOverdue,
        statusLabel: isOverdue
          ? 'Quá hạn thanh toán'
          : grossRemainAmt === 0 && grossOrderAmt > 0
          ? 'Đã tất toán đúng hạn'
          : 'Trong hạn thanh toán',
        paymentRate,
        earnedPaymentBonus,
        pendingPaymentBonus,
        order: ord,
      };
    });

    // 3. Doanh số & tiền thanh toán thực tế từ DB
    const netTotalRevenue = totalGrossOrderRevenue;
    const netPaidOnTime = totalGrossPaidOnTime;
    const netRemainingInTerm = totalGrossRemainingInTerm;

    // Chỉ tiêu 1: Thưởng thanh toán đúng hạn
    const earnedPaymentBonusTotal =
      paymentRate > 0 ? Math.round((netPaidOnTime * paymentRate) / 100) : 0;
    const pendingPaymentBonusTotal =
      paymentRate > 0 ? Math.round((netRemainingInTerm * paymentRate) / 100) : 0;

    // Chỉ tiêu 2: Thưởng đạt doanh số cam kết năm
    const targetAchievedPercent =
      effectiveAnnualTarget > 0
        ? Number(((totalGrossOrderRevenue / effectiveAnnualTarget) * 100).toFixed(1))
        : 0;
    const isAnnualTargetMet =
      effectiveAnnualTarget > 0 && totalGrossOrderRevenue >= effectiveAnnualTarget;
    const earnedAnnualBonus =
      annualRate > 0 && isAnnualTargetMet
        ? Math.round((netTotalRevenue * annualRate) / 100)
        : 0;
    const projectedAnnualBonusAtTarget =
      annualRate > 0 && effectiveAnnualTarget > 0
        ? Math.round((effectiveAnnualTarget * annualRate) / 100)
        : 0;
    const revenueShortfall =
      effectiveAnnualTarget > 0
        ? Math.max(0, effectiveAnnualTarget - totalGrossOrderRevenue)
        : 0;

    // Chỉ tiêu 3: Thưởng vượt chỉ tiêu cam kết năm
    const grossExceededRevenue =
      effectiveAnnualTarget > 0 && totalGrossOrderRevenue > effectiveAnnualTarget
        ? totalGrossOrderRevenue - effectiveAnnualTarget
        : 0;
    const netExceededRevenue = grossExceededRevenue;
    const earnedExceedBonus =
      exceedRate > 0 && netExceededRevenue > 0
        ? Math.round((netExceededRevenue * exceedRate) / 100)
        : 0;

    // Tổng hợp 3 chương trình tính thưởng thực tế từ DB
    const programs = [
      {
        id: 'RULE_PAYMENT',
        stt: 1,
        code: 'THƯỞNG THANH TOÁN',
        name: 'Thưởng thanh toán đúng hạn',
        dbField: 'Customer.thuongThanhToan',
        dbFormula: rawRulePayment || 'Chưa cấu hình trong CSDL cho đại lý này',
        hasRule: Boolean(rawRulePayment && paymentRate > 0),
        rate: paymentRate,
        targetLabel: 'Thanh toán đúng hạn 100% đơn hàng',
        actualBaseGross: totalGrossPaidOnTime,
        actualBaseNet: netPaidOnTime,
        progressPercent:
          totalGrossOrderRevenue > 0
            ? Number(((totalGrossPaidOnTime / totalGrossOrderRevenue) * 100).toFixed(1))
            : 0,
        status: !rawRulePayment
          ? 'Không áp dụng (DB trống)'
          : totalGrossPaidOnTime > 0
          ? 'Đủ điều kiện nhận thưởng'
          : 'Chờ phát sinh thanh toán',
        statusColor: !rawRulePayment
          ? 'bg-slate-100 text-slate-600'
          : totalGrossPaidOnTime > 0
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700',
        earnedBonus: earnedPaymentBonusTotal,
        pendingBonus: pendingPaymentBonusTotal,
        pendingNote:
          pendingPaymentBonusTotal > 0
            ? `+${formatVND(pendingPaymentBonusTotal)} khi tất toán đúng hạn dư nợ còn lại`
            : 'Đã tính đủ trên số tiền đã thanh toán',
        explanation: [
          `Cấu hình gốc trong DB: "${rawRulePayment || 'Trống'}"`,
          `Tổng doanh số đã thanh toán đúng hạn trong DB: ${formatVND(totalGrossPaidOnTime)}`,
          `Công thức tính thưởng: ${formatVND(netPaidOnTime)} × ${paymentRate}% = ${formatVND(earnedPaymentBonusTotal)}`,
        ],
      },
      {
        id: 'RULE_ANNUAL',
        stt: 2,
        code: 'THƯỞNG DOANH SỐ NĂM',
        name: 'Thưởng đạt doanh số cam kết năm',
        dbField: 'Customer.thuongDoanhSoNam',
        dbFormula: rawRuleAnnual || 'Chưa cấu hình trong CSDL cho đại lý này',
        hasRule: Boolean(rawRuleAnnual && annualRate > 0),
        rate: annualRate,
        targetLabel:
          effectiveAnnualTarget > 0
            ? `Cam kết năm (DB): ${formatVND(effectiveAnnualTarget)}`
            : 'Cam kết năm trong DB: 0 đ (Chưa giao mức cam kết)',
        actualBaseGross: totalGrossOrderRevenue,
        actualBaseNet: netTotalRevenue,
        progressPercent: targetAchievedPercent,
        status: !rawRuleAnnual
          ? 'Không áp dụng (DB trống)'
          : effectiveAnnualTarget <= 0
          ? 'Chưa giao định mức cam kết (0 đ)'
          : isAnnualTargetMet
          ? `Đã đạt chỉ tiêu (${targetAchievedPercent}%)`
          : `Đang tích lũy (${targetAchievedPercent}%)`,
        statusColor: !rawRuleAnnual
          ? 'bg-slate-100 text-slate-600'
          : effectiveAnnualTarget <= 0
          ? 'bg-amber-100 text-amber-700'
          : isAnnualTargetMet
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-blue-100 text-blue-700',
        earnedBonus: earnedAnnualBonus,
        pendingBonus: isAnnualTargetMet ? 0 : projectedAnnualBonusAtTarget,
        pendingNote:
          effectiveAnnualTarget <= 0
            ? 'Doanh số cam kết năm của đại lý trong CSDL hiện là 0 đ'
            : isAnnualTargetMet
            ? 'Đã mở khóa 100% thưởng đạt cam kết năm'
            : `Còn thiếu ${formatVND(revenueShortfall)} để mở khóa ${formatVND(projectedAnnualBonusAtTarget)}`,
        explanation: [
          `Cấu hình gốc trong DB: "${rawRuleAnnual || 'Trống'}"`,
          `Mức doanh số cam kết năm trong DB: ${formatVND(dbAnnualTarget)}`,
          `Tổng doanh số mua hàng thực tế: ${formatVND(totalGrossOrderRevenue)} (Đạt ${targetAchievedPercent}%)`,
          isAnnualTargetMet
            ? `Đủ điều kiện (>= 100%): ${formatVND(netTotalRevenue)} × ${annualRate}% = ${formatVND(earnedAnnualBonus)}`
            : `Chưa đủ 100% cam kết nên thưởng thực nhận = 0 đ.`,
        ],
      },
      {
        id: 'RULE_EXCEED',
        stt: 3,
        code: 'THƯỞNG VƯỢT DOANH SỐ',
        name: 'Thưởng vượt chỉ tiêu doanh số năm',
        dbField: 'Customer.thuongVuotDoanhSo',
        dbFormula: rawRuleExceed || 'Chưa cấu hình trong CSDL cho đại lý này',
        hasRule: Boolean(rawRuleExceed && exceedRate > 0),
        rate: exceedRate,
        targetLabel:
          effectiveAnnualTarget > 0
            ? `Vượt mốc > ${formatVND(effectiveAnnualTarget)}`
            : 'Cần có mức cam kết năm > 0 đ để xét vượt chỉ tiêu',
        actualBaseGross: grossExceededRevenue,
        actualBaseNet: netExceededRevenue,
        progressPercent:
          effectiveAnnualTarget > 0 && grossExceededRevenue > 0
            ? Number(((grossExceededRevenue / effectiveAnnualTarget) * 100).toFixed(1))
            : 0,
        status: !rawRuleExceed
          ? 'Không áp dụng (DB trống)'
          : effectiveAnnualTarget <= 0
          ? 'Chưa giao định mức cam kết (0 đ)'
          : grossExceededRevenue > 0
          ? `Vượt +${formatVND(grossExceededRevenue)}`
          : 'Chưa vượt chỉ tiêu cam kết',
        statusColor: !rawRuleExceed
          ? 'bg-slate-100 text-slate-600'
          : grossExceededRevenue > 0
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
        earnedBonus: earnedExceedBonus,
        pendingBonus: 0,
        pendingNote:
          grossExceededRevenue > 0
            ? `Tính ${exceedRate}% trên phần doanh số vượt (${formatVND(netExceededRevenue)})`
            : 'Chỉ phát sinh khi Doanh số thực tế > Doanh số cam kết năm',
        explanation: [
          `Cấu hình gốc trong DB: "${rawRuleExceed || 'Trống'}"`,
          `Phần doanh số vượt chỉ tiêu = Doanh số thực tế (${formatVND(totalGrossOrderRevenue)}) - Cam kết (${formatVND(effectiveAnnualTarget)}) = ${formatVND(grossExceededRevenue)}`,
          `Công thức tính thưởng: ${formatVND(netExceededRevenue)} × ${exceedRate}% = ${formatVND(earnedExceedBonus)}`,
        ],
      },
    ];

    const totalEarnedBonus = earnedPaymentBonusTotal + earnedAnnualBonus + earnedExceedBonus;
    const totalPendingBonus =
      pendingPaymentBonusTotal + (isAnnualTargetMet ? 0 : projectedAnnualBonusAtTarget);

    // 4. Bảng tính thưởng tường minh theo từng tháng (Tháng 01 -> Tháng 12) và lũy kế Cả năm
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const explicitMonthlyTarget =
      Number((cust as any)?.doanhSoCamKetThang) || parseDbMoney(parsedForm.hdMonthlyRevenue) || 0;
    const monthlyTargetGross =
      explicitMonthlyTarget > 0
        ? explicitMonthlyTarget
        : effectiveAnnualTarget > 0
        ? Math.round(effectiveAnnualTarget / 12)
        : 0;
    const monthlyTargetNet = monthlyTargetGross;

    let runningGrossRevenue = 0;
    let prevExceededGross = 0;

    const monthlyRewards = Array.from({ length: 12 }, (_, idx) => {
      const mNum = idx + 1;
      const mStr = String(mNum).padStart(2, '0');
      const mOrders = orderRewardRows.filter((r) => r.monthNum === mNum);

      const mGrossRevenue = mOrders.reduce((s, r) => s + r.grossOrderAmt, 0);
      const mNetRevenue = mOrders.reduce((s, r) => s + r.netOrderBase, 0);
      const mGrossPaidOnTime = mOrders.reduce((s, r) => s + (r.isOverdue ? 0 : r.grossPaidAmt), 0);
      const mNetPaidOnTime = mOrders.reduce((s, r) => s + r.netPaidOnTimeBase, 0);

      runningGrossRevenue += mGrossRevenue;
      const runningNetRevenue = runningGrossRevenue;

      // 1. Thưởng thanh toán đúng hạn phát sinh trong tháng
      const mPaymentBonusEarned = mOrders.reduce((s, r) => s + r.earnedPaymentBonus, 0);
      const mPaymentBonusPending = mOrders.reduce((s, r) => s + r.pendingPaymentBonus, 0);

      // 2. Quỹ thưởng đạt doanh số năm phân bổ / tích lũy từ doanh số của tháng
      const mAnnualBonusAccrued =
        annualRate > 0 ? Math.round((mNetRevenue * annualRate) / 100) : 0;
      const mAnnualBonusEarned = isAnnualTargetMet ? mAnnualBonusAccrued : 0;
      const mAnnualBonusPending = !isAnnualTargetMet && mAnnualBonusAccrued > 0 ? mAnnualBonusAccrued : 0;

      // 3. Thưởng vượt chỉ tiêu năm phát sinh trong tháng (khi lũy kế vượt cam kết năm)
      const currentExceededGross =
        effectiveAnnualTarget > 0 && runningGrossRevenue > effectiveAnnualTarget
          ? runningGrossRevenue - effectiveAnnualTarget
          : 0;
      const monthExceededGross = Math.max(0, currentExceededGross - prevExceededGross);
      prevExceededGross = currentExceededGross;
      const monthExceededNet = monthExceededGross;
      const mExceedBonusEarned =
        exceedRate > 0 && monthExceededNet > 0
          ? Math.round((monthExceededNet * exceedRate) / 100)
          : 0;

      const mTotalEarnedBonus = mPaymentBonusEarned + mAnnualBonusEarned + mExceedBonusEarned;
      const mTotalPendingBonus = mPaymentBonusPending + mAnnualBonusPending;

      const monthTargetRate =
        monthlyTargetGross > 0
          ? Number(((mGrossRevenue / monthlyTargetGross) * 100).toFixed(1))
          : 0;

      return {
        monthNum: mNum,
        monthCode: `T${mStr}/${currentYear}`,
        monthLabel: `Tháng ${mStr}/${currentYear}`,
        isCurrentMonth: mNum === currentMonth,
        isFutureMonth: mNum > currentMonth,
        ordersCount: mOrders.length,
        orders: mOrders,
        orderCodes: mOrders.map((o) => o.code).join(', '),
        monthlyTargetGross,
        monthlyTargetNet,
        monthTargetRate,
        grossRevenue: mGrossRevenue,
        netRevenue: mNetRevenue,
        grossPaidOnTime: mGrossPaidOnTime,
        netPaidOnTime: mNetPaidOnTime,
        runningGrossRevenue,
        runningNetRevenue,
        paymentBonusEarned: mPaymentBonusEarned,
        paymentBonusPending: mPaymentBonusPending,
        annualBonusAccrued: mAnnualBonusAccrued,
        annualBonusEarned: mAnnualBonusEarned,
        annualBonusPending: mAnnualBonusPending,
        exceedBonusEarned: mExceedBonusEarned,
        totalEarnedBonus: mTotalEarnedBonus,
        totalPendingBonus: mTotalPendingBonus,
      };
    });

    return {
      currentYear,
      dbTierName,
      coCamKet,
      dbAnnualTarget,
      effectiveAnnualTarget,
      monthlyTargetGross,
      monthlyTargetNet,
      paymentRate,
      annualRate,
      exceedRate,
      isAnnualTargetMet,
      targetAchievedPercent,
      earnedPaymentBonusTotal,
      pendingPaymentBonusTotal,
      earnedAnnualBonus,
      projectedAnnualBonusAtTarget,
      earnedExceedBonus,
      totalGrossOrderRevenue,
      totalGrossPaidOnTime,
      totalGrossPaidOverdue,
      totalGrossRemainingInTerm,
      netTotalRevenue,
      netPaidOnTime,
      totalEarnedBonus,
      totalPendingBonus,
      programs,
      monthlyRewards,
      orderRewardRows,
    };
  }, [overviewData, orders]);

  const filteredMonthlyRewards = useMemo(() => {
    if (rewardMonthFilter === 'all') {
      // Ưu tiên đưa các tháng có phát sinh đơn hàng thực tế trong DB lên đầu để nhìn thấy ngay số liệu thực tế
      const withOrders = rewardEngineData.monthlyRewards.filter((m) => m.ordersCount > 0);
      const withoutOrders = rewardEngineData.monthlyRewards.filter((m) => m.ordersCount === 0);
      return [...withOrders, ...withoutOrders];
    }
    return rewardEngineData.monthlyRewards.filter((m) => m.monthNum === rewardMonthFilter);
  }, [rewardEngineData.monthlyRewards, rewardMonthFilter]);

  const filteredOrderRewardRows = useMemo(() => {
    if (rewardMonthFilter === 'all') return rewardEngineData.orderRewardRows;
    return rewardEngineData.orderRewardRows.filter((r) => r.monthNum === rewardMonthFilter);
  }, [rewardEngineData.orderRewardRows, rewardMonthFilter]);

  const pagedOrderRewardRows = useMemo(() => {
    const start = (rewardPage - 1) * rewardPageSize;
    return filteredOrderRewardRows.slice(start, start + rewardPageSize);
  }, [filteredOrderRewardRows, rewardPage, rewardPageSize]);

  // Current view tab
  const currentTab = activeMenuKey || 'overview';

  // ── RENDER CÁC MODAL DÙNG CHUNG ──
  const renderModals = () => (
    <>
      {/* ── OFFCANVAS CHI TIẾT ĐƠN HÀNG (RỘNG 400PX) ── */}
      <Offcanvas
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Chi tiết đơn hàng"
        description={selectedOrder ? `#${selectedOrder.code}` : undefined}
        icon={<BoxSeam size={20} />}
        width="400px"
      >
        {selectedOrder && (
          <div className="space-y-3.5 text-xs">
            {/* Thông tin chung */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Trạng thái:</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                  selectedOrder.trangThai === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                  selectedOrder.trangThai === 'approved' ? 'bg-blue-100 text-blue-800' :
                  selectedOrder.trangThai === 'draft' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedOrder.trangThai === 'completed' ? 'Hoàn thành' : 
                   selectedOrder.trangThai === 'approved' ? 'Đã duyệt / Đang giao' : 
                   selectedOrder.trangThai === 'draft' ? 'Bản nháp' : 'Chờ duyệt'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Ngày đặt:</span>
                <strong className="text-slate-900">{new Date(selectedOrder.ngayDat).toLocaleDateString('vi-VN')}</strong>
              </div>
              {selectedOrder.ngayGiao && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Hẹn giao:</span>
                  <strong className="text-slate-900">{new Date(selectedOrder.ngayGiao).toLocaleDateString('vi-VN')}</strong>
                </div>
              )}
              {selectedOrder.ghiChu && (
                <div className="pt-1.5 border-t border-slate-200/60">
                  <span className="text-slate-500 text-[11px] block">Ghi chú:</span>
                  <span className="text-slate-800 text-[11.5px] mt-0.5 block">
                    {cleanOrderProductText(selectedOrder.ghiChu) || selectedOrder.ghiChu}
                  </span>
                </div>
              )}
            </div>

            {/* Thông tin giao nhận hàng */}
            {(selectedOrder.nguoiNhan || selectedOrder.soDienThoai || selectedOrder.diaChiGiaoHang) && (
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-slate-700 space-y-1.5">
                <div className="font-semibold text-sky-900 text-xs flex items-center gap-1.5">
                  <GeoAlt className="w-3.5 h-3.5 text-sky-600" />
                  <span>Thông tin giao nhận hàng:</span>
                </div>
                {selectedOrder.nguoiNhan && (
                  <div className="text-[11.5px] flex items-center justify-between">
                    <span className="text-slate-500">Người nhận:</span>
                    <strong className="text-slate-900">{selectedOrder.nguoiNhan}</strong>
                  </div>
                )}
                {selectedOrder.soDienThoai && (
                  <div className="text-[11.5px] flex items-center justify-between">
                    <span className="text-slate-500">SĐT:</span>
                    <strong className="text-sky-800 font-mono">{selectedOrder.soDienThoai}</strong>
                  </div>
                )}
                {selectedOrder.diaChiGiaoHang && (
                  <div className="text-[11.5px] pt-1 border-t border-sky-200/40">
                    <span className="text-slate-500 block text-[10.5px]">Địa chỉ:</span>
                    <strong className="text-slate-800 text-[11px] block mt-0.5">{selectedOrder.diaChiGiaoHang}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Danh sách sản phẩm trong đơn */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-slate-800 text-xs">Sản phẩm trong đơn</h5>
                <span className="text-[11px] text-slate-400">({selectedOrder.saleOrderItems?.length || 0} mặt hàng)</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 text-[10.5px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Tên sản phẩm</th>
                      <th className="py-2 px-1 text-center w-8">SL</th>
                      <th className="py-2 px-2.5 text-right">Đơn giá</th>
                      <th className="py-2 px-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.saleOrderItems && selectedOrder.saleOrderItems.length > 0 ? (
                      selectedOrder.saleOrderItems.map(item => {
                        const cleanedName = cleanOrderProductText(item.tenHang) || item.tenHang;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1.5">
                                {item.hinhAnh ? (
                                  <div
                                    className="w-7 h-7 rounded border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-sky-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGalleryItem({
                                        name: cleanedName,
                                        images: [item.hinhAnh!],
                                        activeIndex: 0,
                                        price: item.donGia
                                      });
                                    }}
                                    title="Bấm để xem ảnh"
                                  >
                                    <HoverImage
                                      src={item.hinhAnh}
                                      alt={cleanedName}
                                      images={[item.hinhAnh]}
                                      previewSize={260}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                    />
                                  </div>
                                ) : (
                                  <BoxSeam className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span className="font-medium text-slate-900 line-clamp-2 leading-snug" title={cleanedName}>
                                  {cleanedName}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-1 text-center font-bold text-slate-700 whitespace-nowrap">{item.soLuong}</td>
                            <td className="py-2 px-2.5 text-right text-slate-600 whitespace-nowrap text-[11px]">{formatVND(item.donGia)}</td>
                            <td className="py-2 px-2.5 text-right font-bold text-sky-800 whitespace-nowrap text-[11.5px]">{formatVND(item.thanhTien)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">Không có dữ liệu mặt hàng</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-2 px-2.5 text-right font-semibold text-slate-600 text-[11px]">
                        Tổng giá trị đơn:
                      </td>
                      <td className="py-2 px-2.5 text-right font-black text-red-600 whitespace-nowrap text-xs">
                        {formatVND(selectedOrder.tongTien)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS CHI TIẾT PHIẾU CHI TRẢ NỢ (RỘNG 400PX) ── */}
      <Offcanvas
        isOpen={Boolean(selectedPaymentTx)}
        onClose={() => setSelectedPaymentTx(null)}
        title="Chi tiết phiếu chi (Trả nợ)"
        description={selectedPaymentTx ? `#${selectedPaymentTx.ref}` : undefined}
        icon={<CashCoin size={20} />}
        width="400px"
      >
        {selectedPaymentTx && (
          <div className="space-y-3.5 text-xs">
            {/* Thông tin chứng từ phiếu chi */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Loại giao dịch:</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800">
                  Phiếu chi (Trả nợ)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Trạng thái:</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle className="w-3 h-3" />
                  <span>Đã hạch toán</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Số chứng từ:</span>
                <strong className="text-slate-900 font-mono">{selectedPaymentTx.ref}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Thời gian giao dịch:</span>
                <strong className="text-slate-900">{selectedPaymentTx.dateStr}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Phương thức:</span>
                <strong className="text-slate-900">{selectedPaymentTx.paymentMethod || 'Chuyển khoản ngân hàng'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Đơn vị thụ hưởng:</span>
                <strong className="text-slate-900">Công ty CP Seajong Việt Nam</strong>
              </div>
              <div className="pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 text-[11px] block">Nội dung / Diễn giải:</span>
                <span className="text-slate-800 text-[11.5px] font-medium mt-0.5 block">
                  {selectedPaymentTx.note}
                </span>
              </div>
            </div>

            {/* Thông tin đối chiếu công nợ tại thời điểm thanh toán */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-slate-700 space-y-2">
              <div className="font-semibold text-emerald-900 text-xs flex items-center gap-1.5 pb-1 border-b border-emerald-200/60">
                <Wallet2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chi tiết hạch toán công nợ:</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-600">Số tiền thanh toán (Phát sinh giảm):</span>
                <strong className="text-emerald-700 font-bold">{formatVND(selectedPaymentTx.decrease)}</strong>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-600">Dư nợ lũy kế sau giao dịch:</span>
                <strong className="text-slate-900 font-bold">{formatVND(selectedPaymentTx.balance)}</strong>
              </div>
            </div>

            {/* Đơn hàng gốc liên kết */}
            {selectedPaymentTx.order && (
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-slate-700 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-sky-200/50">
                  <div className="font-semibold text-sky-900 text-xs flex items-center gap-1.5">
                    <BoxSeam className="w-3.5 h-3.5 text-sky-600" />
                    <span>Đơn hàng liên kết</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const ord = selectedPaymentTx.order;
                      setSelectedPaymentTx(null);
                      setSelectedOrder(ord);
                    }}
                    className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    Xem chi tiết đơn →
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <strong className="text-sky-800 font-mono">#{selectedPaymentTx.order.code}</strong>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-500">Tổng giá trị đơn:</span>
                  <strong className="text-slate-900">{formatVND(selectedPaymentTx.order.tongTien)}</strong>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-500">Tổng đã thanh toán:</span>
                  <strong className="text-emerald-700">{formatVND(selectedPaymentTx.order.daThanhToan)}</strong>
                </div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-slate-500">Còn nợ của đơn:</span>
                  <strong className="text-rose-600">
                    {formatVND(Math.max(0, (selectedPaymentTx.order.tongTien || 0) - (selectedPaymentTx.order.daThanhToan || 0)))}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS GIẢI TRÌNH BỘ MÁY TÍNH THƯỞNG (RỘNG 400PX, ẨN FOOTER) ── */}
      <Offcanvas
        isOpen={Boolean(selectedRewardProgram)}
        onClose={() => setSelectedRewardProgram(null)}
        title={selectedRewardProgram ? selectedRewardProgram.name : 'Chi tiết chỉ tiêu tính thưởng'}
        description={selectedRewardProgram ? `Trường DB: ${selectedRewardProgram.dbField}` : undefined}
        icon={<Trophy size={20} />}
        width="400px"
      >
        {selectedRewardProgram && (
          <div className="space-y-3.5 text-xs">
            {/* Cấu hình gốc lưu trong DB */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Mã chương trình:</span>
                <strong className="text-slate-900 font-mono">{selectedRewardProgram.code}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Hạng đại lý (DB):</span>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-100 text-indigo-700">
                  Hạng {rewardEngineData.dbTierName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Tỷ lệ trích thưởng (bóc từ DB):</span>
                <strong className="text-blue-700 font-bold text-sm">{selectedRewardProgram.rate}%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Trạng thái xét thưởng:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${selectedRewardProgram.statusColor}`}>
                  {selectedRewardProgram.status}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 text-[11px] block">Chuỗi điều kiện gốc lưu trong DB:</span>
                <span className="text-slate-900 text-[11.5px] font-semibold mt-0.5 block bg-white p-2 rounded-lg border border-slate-200">
                  {selectedRewardProgram.dbFormula}
                </span>
              </div>
            </div>

            {/* Các bước tính toán của bộ máy */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-700 space-y-2">
              <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5 pb-1 border-b border-blue-200/60">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Diễn giải phép tính tự động:</span>
              </div>
              <ul className="space-y-1.5 text-[11.5px] list-disc pl-4 text-slate-700">
                {selectedRewardProgram.explanation?.map((line: string, idx: number) => (
                  <li key={idx} className="leading-snug">{line}</li>
                ))}
              </ul>
              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Tiền thưởng thực nhận:</span>
                <strong className="text-emerald-700 font-black text-sm">
                  {formatVND(selectedRewardProgram.earnedBonus)}
                </strong>
              </div>
              {selectedRewardProgram.pendingBonus > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Thưởng tiềm năng chờ mở khóa:</span>
                  <strong className="text-amber-700 font-bold">
                    +{formatVND(selectedRewardProgram.pendingBonus)}
                  </strong>
                </div>
              )}
            </div>

            {/* Danh sách đơn hàng cấu thành */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h5 className="font-bold text-slate-800 text-xs">Đơn hàng thực tế tham gia tính thưởng</h5>
                <span className="text-[11px] text-slate-400">({rewardEngineData.orderRewardRows.length} đơn)</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2">Mã đơn</th>
                      <th className="py-1.5 px-2 text-right">Doanh số</th>
                      <th className="py-1.5 px-2 text-right">Đã trả đúng hạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rewardEngineData.orderRewardRows.length > 0 ? (
                      rewardEngineData.orderRewardRows.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => {
                            setSelectedRewardProgram(null);
                            setSelectedOrder(r.order);
                          }}
                          className="hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="py-1.5 px-2 font-mono font-bold text-sky-700">#{r.code}</td>
                          <td className="py-1.5 px-2 text-right text-slate-800">{formatVND(r.grossOrderAmt)}</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-emerald-700">
                            {r.isOverdue ? '0 đ (Quá hạn)' : formatVND(r.grossPaidAmt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-slate-400">
                          Chưa có đơn hàng phát sinh
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS CHI TIẾT TÍNH THƯỞNG THEO THÁNG (RỘNG 400PX, ẨN FOOTER) ── */}
      <Offcanvas
        isOpen={Boolean(selectedMonthReward)}
        onClose={() => setSelectedMonthReward(null)}
        title={selectedMonthReward ? `Tính thưởng ${selectedMonthReward.monthLabel}` : 'Chi tiết thưởng tháng'}
        description={selectedMonthReward ? `Kỳ hạch toán: ${selectedMonthReward.monthCode}` : undefined}
        icon={<Trophy size={20} />}
        width="400px"
      >
        {selectedMonthReward && (
          <div className="space-y-3.5 text-xs">
            {/* Tổng quan doanh số & chỉ tiêu của tháng */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Kỳ tính thưởng:</span>
                <strong className="text-slate-900 font-bold">{selectedMonthReward.monthLabel}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Số đơn phát sinh trong tháng:</span>
                <strong className="text-slate-900">{selectedMonthReward.ordersCount} đơn hàng</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Chỉ tiêu bình quân tháng (Cam kết/12):</span>
                <strong className="text-slate-700">{formatVND(selectedMonthReward.monthlyTargetGross)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Doanh số mua hàng trong tháng:</span>
                <strong className="text-blue-700 font-bold">{formatVND(selectedMonthReward.netRevenue)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Đã thanh toán đúng hạn trong tháng:</span>
                <strong className="text-emerald-700 font-bold">{formatVND(selectedMonthReward.netPaidOnTime)}</strong>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 text-[11px]">Lũy kế doanh số từ T01 đến hết {selectedMonthReward.monthCode}:</span>
                <strong className="text-slate-900 font-bold">{formatVND(selectedMonthReward.runningNetRevenue)}</strong>
              </div>
            </div>

            {/* Bóc tách 3 khoản thưởng của tháng */}
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-slate-700 space-y-2">
              <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5 pb-1 border-b border-emerald-200/60">
                <CashCoin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chi tiết các khoản thưởng trong {selectedMonthReward.monthLabel}:</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-600">
                  1. Thưởng TT đúng hạn tháng ({rewardEngineData.paymentRate}%):
                </span>
                <strong className="text-emerald-700 font-bold">
                  {formatVND(selectedMonthReward.paymentBonusEarned)}
                </strong>
              </div>
              {selectedMonthReward.paymentBonusPending > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 pl-3">• Chờ nhận thêm khi tất toán nợ tháng:</span>
                  <strong className="text-amber-600">+{formatVND(selectedMonthReward.paymentBonusPending)}</strong>
                </div>
              )}
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-600">
                  2. Quỹ thưởng DS năm tích lũy ({rewardEngineData.annualRate}%):
                </span>
                <strong className={rewardEngineData.isAnnualTargetMet ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                  {rewardEngineData.isAnnualTargetMet
                    ? formatVND(selectedMonthReward.annualBonusEarned)
                    : `+${formatVND(selectedMonthReward.annualBonusAccrued)} (Chờ đạt CK năm)`}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-600">
                  3. Thưởng vượt chỉ tiêu phát sinh ({rewardEngineData.exceedRate}%):
                </span>
                <strong className="text-indigo-700 font-bold">
                  {formatVND(selectedMonthReward.exceedBonusEarned)}
                </strong>
              </div>
              <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between">
                <span className="font-bold text-slate-800">Tổng thưởng thực nhận trong tháng:</span>
                <strong className="text-emerald-700 font-black text-sm">
                  {formatVND(selectedMonthReward.totalEarnedBonus)}
                </strong>
              </div>
            </div>

            {/* Danh sách đơn hàng trong tháng */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h5 className="font-bold text-slate-800 text-xs">
                  Đơn hàng phát sinh trong {selectedMonthReward.monthLabel}
                </h5>
                <span className="text-[11px] text-slate-400">({selectedMonthReward.ordersCount} đơn)</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-2">Mã đơn</th>
                      <th className="py-1.5 px-2 text-right">Doanh số</th>
                      <th className="py-1.5 px-2 text-right">Đã trả</th>
                      <th className="py-1.5 px-2 text-right">Thưởng TT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMonthReward.orders && selectedMonthReward.orders.length > 0 ? (
                      selectedMonthReward.orders.map((r: any) => (
                        <tr
                          key={r.id}
                          onClick={() => {
                            setSelectedMonthReward(null);
                            setSelectedOrder(r.order);
                          }}
                          className="hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="py-1.5 px-2 font-mono font-bold text-sky-700">#{r.code}</td>
                          <td className="py-1.5 px-2 text-right text-slate-800">{formatVND(r.netOrderBase)}</td>
                          <td className="py-1.5 px-2 text-right text-emerald-700">{formatVND(r.netPaidOnTimeBase)}</td>
                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">
                            {formatVND(r.earnedPaymentBonus)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-slate-400">
                          Không có đơn hàng phát sinh trong tháng này
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── MODAL XEM CHI TIẾT ĐƠN HÀNG (DẠNG TÀI LIỆU TOÀN DIỆN / IN ẤN) ── */}
      {viewingOrderDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BoxSeam className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Đơn hàng #{viewingOrderDetailOrder.code}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {overviewData?.customer?.name || 'Đại lý Seajong'} • Ngày đặt: {new Date(viewingOrderDetailOrder.ngayDat).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrderDetailOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold px-2 py-1"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Thông tin giao nhận hàng */}
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-slate-700 space-y-1.5">
                <div className="font-semibold text-sky-900 text-xs flex items-center gap-1.5 pb-1 border-b border-sky-200/50">
                  <GeoAlt className="w-3.5 h-3.5 text-sky-600" />
                  <span>Thông tin giao nhận hàng:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                  <div>Người nhận: <strong className="text-slate-900">{viewingOrderDetailOrder.nguoiNhan || '—'}</strong></div>
                  <div>SĐT: <strong className="text-sky-800 font-mono">{viewingOrderDetailOrder.soDienThoai || '—'}</strong></div>
                  <div className="sm:col-span-2">Địa chỉ: <strong className="text-slate-800">{viewingOrderDetailOrder.diaChiGiaoHang || '—'}</strong></div>
                  {viewingOrderDetailOrder.ngayGiao && <div>Hẹn giao: <strong className="text-slate-900">{new Date(viewingOrderDetailOrder.ngayGiao).toLocaleDateString('vi-VN')}</strong></div>}
                  {viewingOrderDetailOrder.ghiChu && <div className={viewingOrderDetailOrder.ngayGiao ? '' : 'sm:col-span-2'}>Ghi chú: <span className="text-slate-800 italic">{viewingOrderDetailOrder.ghiChu}</span></div>}
                </div>
              </div>

              {/* Bảng sản phẩm */}
              <div>
                <h5 className="font-bold text-slate-800 mb-2">Danh sách sản phẩm trong đơn ({viewingOrderDetailOrder.saleOrderItems?.length || 0} mặt hàng)</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tên sản phẩm</th>
                        <th className="py-2 px-3 text-center">ĐVT</th>
                        <th className="py-2 px-3 text-center">Số lượng</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingOrderDetailOrder.saleOrderItems?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.tenHang}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 text-[11px]">{item.donViTinh || 'Bộ'}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">{item.soLuong}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{formatVND(item.donGia)}</td>
                          <td className="py-2 px-3 text-right font-bold text-sky-800">{formatVND(item.thanhTien)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">Tổng cộng thanh toán:</td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-bold text-sm">{formatVND(viewingOrderDetailOrder.tongTien)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In đơn hàng</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setViewingOrderDetailOrder(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XEM TRƯỚC ĐƠN HÀNG (PREVIEW TRƯỚC KHI GỬI DUYỆT HOẶC LƯU NHÁP) ── */}
      {showOrderPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BoxSeam className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Xem trước đơn hàng - {overviewData?.customer?.name || 'Đại lý Seajong'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kiểm tra danh sách sản phẩm và thông tin nhận hàng trước khi gửi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderPreview(false)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold px-2 py-1"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Thông tin giao nhận hàng */}
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-slate-700 space-y-1.5">
                <div className="font-semibold text-sky-900 text-xs flex items-center gap-1.5 pb-1 border-b border-sky-200/50">
                  <GeoAlt className="w-3.5 h-3.5 text-sky-600" />
                  <span>Thông tin giao nhận hàng:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                  <div>Người nhận: <strong className="text-slate-900">{recipientName || overviewData?.customer?.daiDien || overviewData?.customer?.name || '(Chưa điền)'}</strong></div>
                  <div>SĐT: <strong className="text-sky-800 font-mono">{recipientPhone || overviewData?.customer?.dienThoai || '(Chưa điền)'}</strong></div>
                  <div className="sm:col-span-2">Địa chỉ: <strong className="text-slate-800">{shippingAddress || overviewData?.customer?.address || '(Chưa điền)'}</strong></div>
                  {deliveryDate && <div>Hẹn giao: <strong className="text-slate-900">{new Date(deliveryDate).toLocaleDateString('vi-VN')}</strong></div>}
                  {orderNote && <div className={deliveryDate ? '' : 'sm:col-span-2'}>Ghi chú: <span className="text-slate-800 italic">{orderNote}</span></div>}
                </div>
              </div>

              {/* Bảng sản phẩm */}
              <div>
                <h5 className="font-bold text-slate-800 mb-2">Danh sách sản phẩm trong đơn ({cart.length} mặt hàng)</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tên sản phẩm</th>
                        <th className="py-2 px-2 text-center">SL</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item) => (
                        <tr key={item.productId}>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              {(item.hinhAnh || (item.images && item.images.length > 0)) ? (
                                <div
                                  className="w-7 h-7 rounded border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-sky-400"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const imgs = item.images && item.images.length > 0 ? item.images : (item.hinhAnh ? [item.hinhAnh] : []);
                                    if (imgs.length > 0) {
                                      setGalleryItem({
                                        name: item.tenHang,
                                        images: imgs,
                                        activeIndex: 0,
                                        price: item.donGia
                                      });
                                    }
                                  }}
                                  title="Bấm để xem ảnh"
                                >
                                  <HoverImage
                                    src={item.hinhAnh || (item.images && item.images[0]) || ''}
                                    alt={item.tenHang}
                                    images={item.images && item.images.length > 0 ? item.images : (item.hinhAnh ? [item.hinhAnh] : [])}
                                    previewSize={260}
                                    onPreviewClick={(idx) => {
                                      const imgs = item.images && item.images.length > 0 ? item.images : (item.hinhAnh ? [item.hinhAnh] : []);
                                      setGalleryItem({
                                        name: item.tenHang,
                                        images: imgs,
                                        activeIndex: idx,
                                        price: item.donGia
                                      });
                                    }}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                  />
                                </div>
                              ) : (
                                <BoxSeam className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <span>{item.tenHang}</span>
                                {item.unit && <span className="text-[10px] text-slate-400 block font-normal">ĐVT: {item.unit}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-700">{item.soLuong}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{formatVND(item.donGia)}</td>
                          <td className="py-2 px-3 text-right font-bold text-sky-800">{formatVND(item.donGia * item.soLuong)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700">Tổng cộng:</td>
                        <td className="py-2.5 px-3 text-right text-red-600 font-bold text-sm">{formatVND(cartTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowOrderPreview(false)}>
                ← Quay lại chỉnh sửa
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmittingOrder}
                  onClick={() => handleSaveOrder(true)}
                  className="gap-1.5"
                >
                  <FileEarmarkText className="w-3.5 h-3.5" />
                  <span>{isSubmittingOrder ? 'Đang lưu...' : 'Lưu nháp'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingOrder}
                  onClick={() => handleSaveOrder(false)}
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingOrder ? 'Đang gửi...' : 'Gửi đơn cho Kinh doanh duyệt'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ĐẶT HÀNG / LƯU NHÁP THÀNH CÔNG ── */}
      {orderSuccessModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center animate-scale-up space-y-4">
            <div className={`w-14 h-14 ${orderSuccessModal.isDraft ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center mx-auto text-2xl`}>
              {orderSuccessModal.isDraft ? <FileEarmarkText /> : <CheckCircle />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">
                {orderSuccessModal.isDraft ? 'Đã lưu đơn hàng nháp thành công!' : 'Đã gửi đơn hàng thành công!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Đơn hàng mã <strong className="text-sky-700 font-mono font-bold">#{orderSuccessModal.code}</strong> trị giá{' '}
                <strong className="text-emerald-700">{formatVND(orderSuccessModal.total)}</strong>{' '}
                {orderSuccessModal.isDraft 
                  ? 'đã được lưu vào danh sách đơn nháp. Quý đại lý có thể xem lại hoặc gửi duyệt bất cứ lúc nào.'
                  : 'đã được gửi tới Bộ phận Kinh doanh Seajong để tiến hành phê duyệt và chuẩn bị hàng.'}
              </p>
            </div>
            <div className="pt-2 flex gap-2 justify-center">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setOrderSuccessModal({ open: false });
                  setActiveMenuKey('orders');
                }}
              >
                Xem danh sách đơn hàng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP CẬP NHẬT SỐ ĐIỆN THOẠI ── */}
      {showPhonePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-scale-up space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Telephone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Cập nhật số điện thoại nhận hàng</h4>
                <p className="text-[11px] text-slate-500">Giúp Seajong liên hệ giao hàng và hỗ trợ tốt nhất</p>
              </div>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại Đại lý / Người nhận
                </label>
                <input
                  type="tel"
                  required
                  placeholder="VD: 0988123456"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {phoneMessage && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {phoneMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setShowPhonePrompt(false)}
                >
                  Để sau
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={savingPhone}
                >
                  {savingPhone ? 'Đang lưu...' : 'Lưu số điện thoại'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PHÓNG TO / SLIDE BỘ SƯU TẬP ẢNH HÀNG HOÁ (LIGHTBOX GALLERY) ── */}
      {galleryItem && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6"
          onClick={() => setGalleryItem(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal ảnh */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between text-white bg-slate-950/80">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-white truncate">
                    {galleryItem.name}
                  </h3>
                  {galleryItem.code && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
                      {galleryItem.code}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>
                    Ảnh <strong className="text-sky-400 font-mono">{galleryItem.activeIndex + 1}</strong> / <strong className="text-slate-200 font-mono">{galleryItem.images.length}</strong> ảnh
                  </span>
                  {galleryItem.price && galleryItem.price > 0 && (
                    <span className="text-emerald-400 font-bold">
                      {formatVND(galleryItem.price)}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGalleryItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Đóng (Phím Esc)"
              >
                <XLg className="w-4 h-4" />
              </button>
            </div>

            {/* Vùng xem ảnh lớn */}
            <div className="relative flex-1 bg-black/90 flex items-center justify-center min-h-[320px] max-h-[500px] overflow-hidden select-none p-4">
              <img
                src={galleryItem.images[galleryItem.activeIndex]}
                alt={`${galleryItem.name} - ảnh ${galleryItem.activeIndex + 1}`}
                className="max-w-full max-h-[460px] object-contain transition-all duration-300 drop-shadow-xl"
              />

              {/* Nút lùi */}
              {galleryItem.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryItem(prev => prev ? {
                        ...prev,
                        activeIndex: (prev.activeIndex - 1 + prev.images.length) % prev.images.length
                      } : null);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-lg backdrop-blur-xs"
                    title="Ảnh trước (Phím ←)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryItem(prev => prev ? {
                        ...prev,
                        activeIndex: (prev.activeIndex + 1) % prev.images.length
                      } : null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-lg backdrop-blur-xs"
                    title="Ảnh sau (Phím →)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Dải thumbnail xem nhanh toàn bộ ảnh */}
            {galleryItem.images.length > 1 && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                {galleryItem.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGalleryItem(prev => prev ? { ...prev, activeIndex: idx } : null)}
                    className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative bg-slate-900 ${
                      galleryItem.activeIndex === idx
                        ? 'border-sky-500 ring-2 ring-sky-400/50 scale-105'
                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 text-[8.5px] font-mono px-1 py-0.2 bg-black/80 text-white rounded font-bold">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Footer modal với hành động nhanh */}
            <div className="p-3 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Dùng phím mũi tên <strong>←</strong> / <strong>→</strong> để lướt ảnh hoặc phím <strong>Esc</strong> để đóng.
              </span>
              {galleryItem.product && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (galleryItem.product) handleAddToCart(galleryItem.product);
                  }}
                  className="gap-1.5"
                >
                  <CartPlus className="w-4 h-4" />
                  <span>Chọn mua sản phẩm này</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── OFFCANVAS HIỂN THỊ THÔNG TIN CHI TIẾT HÀNG HOÁ GIỐNG PHÒNG MARKETING ── */}
      <ProductDrawer
        product={selectedDrawerProduct}
        cats={categories}
        onClose={() => setSelectedDrawerProduct(null)}
        onAddToCart={() => {
          if (selectedDrawerProduct) {
            handleAddToCart(selectedDrawerProduct);
          }
        }}
        addToCartLabel="Chọn mua sản phẩm này"
        isSalesMode={true}
        isDealerMode={true}
        hideMarketingActions={true}
        hidePrintLabel={true}
      />

      {/* ── CONFIRM DIALOG XÁC NHẬN XOÁ ĐƠN HÀNG BẢN NHÁP ── */}
      <ConfirmDialog
        isOpen={Boolean(orderToDelete)}
        title="Xác nhận xoá đơn hàng"
        variant="danger"
        message={
          orderToDelete ? (
            <div className="space-y-2 text-left">
              <p className="text-slate-700">
                Bạn có chắc chắn muốn xoá đơn hàng bản nháp{' '}
                <strong className="text-slate-900 font-bold">#{orderToDelete.code}</strong>?
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày đặt:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(orderToDelete.ngayDat).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số lượng mặt hàng:</span>
                  <span className="font-semibold text-slate-800">
                    {orderToDelete.saleOrderItems?.length || 0} sản phẩm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng giá trị đơn:</span>
                  <span className="font-black text-rose-600">
                    {formatVND(orderToDelete.tongTien)}
                  </span>
                </div>
                {orderToDelete.nguoiNhan && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Người nhận:</span>
                    <span className="text-slate-800 font-medium">{orderToDelete.nguoiNhan}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null
        }
        warningNote="Hành động này sẽ xoá vĩnh viễn đơn hàng và không thể hoàn tác."
        confirmText="Xoá đơn hàng"
        cancelText="Huỷ bỏ"
        isLoading={isDeletingOrder}
        onConfirm={handleConfirmDeleteOrder}
        onCancel={() => !isDeletingOrder && setOrderToDelete(null)}
        onClose={() => !isDeletingOrder && setOrderToDelete(null)}
      />
    </>
  );

  // Khi đang ở tab Đơn hàng và xem Danh sách đơn (không phải màn hình tạo đơn) -> DÙNG STEPPAGE THEO YÊU CẦU
  if ((currentTab === 'orders' || currentTab === 'order-now') && orderSubTab !== 'create' && currentTab !== 'order-now') {
    return (
      <>
        <StepPage
          title="Hệ thống đại lý và nhà phân phối"
          icon="bi-shop"
          color="blue"
          description="Cổng thông tin hoạt động, tra cứu công nợ và tự động lên đơn hàng gửi Bộ phận Kinh doanh"
          badge={overviewData?.customer?.code || (user as any)?.customer?.code || 'ĐẠI LÝ SEAJONG'}
          tickerContext="dealers"
          steps={orderSteps}
          currentStep={orderStep}
          onStepChange={(stepNum) => {
            setOrderStep(stepNum);
            setOrderPage(1);
            setOrderStatusFilter('all');
          }}
        >
          <div className="flex flex-col h-full flex-1 overflow-hidden">
            <TableToolbar
              searchPlaceholder="Tìm mã đơn hàng, ghi chú..."
              searchValue={searchOrder}
              onSearchChange={setSearchOrder}
              filters={[
                {
                  value: orderStatusFilter,
                  onChange: (v) => {
                    setOrderStatusFilter(v);
                    setOrderPage(1);
                  },
                  options: orderStep === 1 ? [
                    { label: 'Tất cả đang thực hiện', value: 'all' },
                    { label: 'Bản nháp', value: 'draft' },
                    { label: 'Chờ duyệt', value: 'pending' },
                  ] : [
                    { label: 'Tất cả đã hoàn thành', value: 'all' },
                    { label: 'Hoàn thành / Đã nhận', value: 'completed' },
                  ],
                },
              ]}
              rightActions={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CartPlus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingOrderId(null);
                    setCart([]);
                    setOrderNote('');
                    setDeliveryDate('');
                    setPrepaidAmount(0);
                    setOrderSubTab('create');
                  }}
                >
                  Lên đơn hàng mới
                </Button>
              }
              showMenu={false}
              onRefresh={fetchOrders}
            />

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable
                loading={loading}
                emptyText={orderStep === 1 ? 'Không có đơn hàng nào đang thực hiện' : 'Không có đơn hàng nào đã hoàn thành'}
              >
                <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                  <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200 text-slate-600 text-xs font-semibold">
                    <tr>
                      <th className="py-2.5 px-3.5 text-center">STT</th>
                      <th className="py-2.5 px-3.5">Mã đơn hàng</th>
                      <th className="py-2.5 px-3.5">Ngày đặt</th>
                      <th className="py-2.5 px-3.5">Ngày hẹn giao</th>
                      <th className="py-2.5 px-3.5 text-right">Tổng tiền</th>
                      <th className="py-2.5 px-3.5 text-right">Đã thanh toán</th>
                      <th className="py-2.5 px-3.5 text-center">Trạng thái đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((ord, idx) => (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-400">
                          {(orderPage - 1) * orderPageSize + idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-bold text-sky-700 hover:underline">{ord.code}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          {new Date(ord.ngayDat).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500">
                          {ord.ngayGiao ? new Date(ord.ngayGiao).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                          {formatVND(ord.tongTien)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-600">
                          {formatVND(ord.daThanhToan)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            ord.trangThai === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            ord.trangThai === 'approved' ? 'bg-blue-100 text-blue-800' :
                            ord.trangThai === 'draft' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.trangThai === 'completed' ? 'Hoàn thành' : 
                             ord.trangThai === 'approved' ? 'Đã duyệt / Đang giao' : 
                             ord.trangThai === 'draft' ? 'Bản nháp' : 'Chờ duyệt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FullWidthTable>
            </div>

            <Pagination
              page={orderPage}
              pageSize={orderPageSize}
              totalItems={filteredOrders.length}
              onPageChange={setOrderPage}
              onPageSizeChange={setOrderPageSize}
            />
          </div>
        </StepPage>
        {renderModals()}
      </>
    );
  }

  // Khi đang ở tab Công nợ và điểm thưởng -> DÙNG STEPPAGE THEO YÊU CẦU
  if (currentTab === 'debts') {
    return (
      <>
        <StepPage
          title="Hệ thống đại lý và nhà phân phối"
          icon="bi-shop"
          color="blue"
          description="Cổng thông tin hoạt động, tra cứu công nợ và tự động lên đơn hàng gửi Bộ phận Kinh doanh"
          badge={overviewData?.customer?.code || (user as any)?.customer?.code || 'ĐẠI LÝ SEAJONG'}
          tickerContext="dealers"
          steps={debtSteps}
          currentStep={debtStep}
          onStepChange={(stepNum) => setDebtStep(stepNum)}
        >
          <div className="flex flex-col h-full flex-1 overflow-hidden">
            {debtStep === 1 && (
              <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                {/* Thanh tiêu đề & Bộ lọc khoảng thời gian */}
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                      <ListTask className="w-4 h-4 text-indigo-600" />
                      <span>Sổ chi tiết công nợ phát sinh</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="datetime-local"
                        step="1"
                        value={debtStartDate}
                        onChange={(e) => {
                          setDebtStartDate(e.target.value);
                          setDebtPage(1);
                        }}
                        className="px-3 py-1 rounded-full border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-blue-500"
                        title="Từ ngày"
                      />
                      <span className="text-xs text-slate-500">đến</span>
                      <input
                        type="datetime-local"
                        step="1"
                        value={debtEndDate}
                        onChange={(e) => {
                          setDebtEndDate(e.target.value);
                          setDebtPage(1);
                        }}
                        className="px-3 py-1 rounded-full border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-blue-500"
                        title="Đến ngày"
                      />
                      {(debtStartDate || debtEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setDebtStartDate('');
                            setDebtEndDate('');
                            setDebtPage(1);
                          }}
                          className="text-xs font-semibold text-red-600 underline hover:text-red-700 cursor-pointer ml-1"
                        >
                          Xóa lọc
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FullWidthTable */}
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <FullWidthTable
                      loading={loading}
                      emptyText="Không có phát sinh công nợ nào trong kỳ đã chọn"
                    >
                      <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-800 text-[11px] font-extrabold uppercase">
                          <tr>
                            <th className="py-2.5 px-3.5 w-[155px]">Ngày</th>
                            <th className="py-2.5 px-3.5 w-[170px]">Số CT</th>
                            <th className="py-2.5 px-3.5">Diễn giải / Loại giao dịch</th>
                            <th className="py-2.5 px-3.5 text-right w-[140px]">Phát sinh tăng</th>
                            <th className="py-2.5 px-3.5 text-right w-[140px]">Phát sinh giảm</th>
                            <th className="py-2.5 px-3.5 text-right w-[140px]">Dư nợ lũy kế</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Dòng Tổng phát sinh trong kỳ */}
                          <tr className="bg-slate-50/70 border-b border-slate-200 font-extrabold">
                            <td colSpan={3} className="py-2.5 px-3.5 text-xs uppercase text-slate-800">
                              Tổng phát sinh trong kỳ
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-blue-600 font-extrabold text-[13px]">
                              {debtLedgerData.periodIncrease > 0 ? debtLedgerData.periodIncrease.toLocaleString('vi-VN') : '0'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-emerald-700 font-extrabold text-[13px]">
                              {debtLedgerData.periodDecrease > 0 ? debtLedgerData.periodDecrease.toLocaleString('vi-VN') : '0'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-red-600 font-extrabold text-[13px]">
                              {debtLedgerData.closingBalance.toLocaleString('vi-VN')}
                            </td>
                          </tr>

                          {/* Các dòng bút toán phát sinh & dòng Dư nợ đầu kỳ ở cuối */}
                          {pagedDebtTransactions.map((tx) => (
                            <tr
                              key={tx.id}
                              onClick={() => {
                                if (tx.type === 'Mua hàng' && tx.order) {
                                  setSelectedPaymentTx(null);
                                  setSelectedOrder(tx.order);
                                } else if (tx.type === 'Phiếu chi (Trả nợ)') {
                                  setSelectedOrder(null);
                                  setSelectedPaymentTx(tx);
                                }
                              }}
                              className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                                tx.id === 'OPENING_BALANCE' ? 'bg-slate-50/40' : 'cursor-pointer'
                              }`}
                            >
                              <td className="py-3 px-3.5 text-slate-800 text-xs whitespace-nowrap align-middle">
                                {tx.dateStr}
                              </td>
                              <td className="py-3 px-3.5 font-bold text-slate-900 text-xs align-middle">
                                <span className={tx.id !== 'OPENING_BALANCE' ? 'hover:text-sky-700 hover:underline' : ''}>
                                  {tx.ref}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 align-middle">
                                <div>
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                      tx.type === 'Mua hàng'
                                        ? 'bg-blue-100 text-blue-700'
                                        : tx.type === 'Phiếu chi (Trả nợ)'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-200/80 text-slate-600'
                                    }`}
                                  >
                                    {tx.type}
                                  </span>
                                  <div className="text-slate-600 text-xs mt-1 leading-snug">
                                    {tx.note}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-right text-blue-600 font-medium text-xs align-middle">
                                {tx.increase > 0 ? tx.increase.toLocaleString('vi-VN') : '-'}
                              </td>
                              <td className="py-3 px-3.5 text-right text-emerald-600 font-medium text-xs align-middle">
                                {tx.decrease > 0 ? tx.decrease.toLocaleString('vi-VN') : '-'}
                              </td>
                              <td className="py-3 px-3.5 text-right font-bold text-slate-900 text-xs align-middle">
                                {tx.balance.toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </FullWidthTable>
                  </div>

                  {/* Pagination */}
                  <Pagination
                    page={debtPage}
                    pageSize={debtPageSize}
                    totalItems={debtLedgerData.transactions.length}
                    onPageChange={setDebtPage}
                    onPageSizeChange={setDebtPageSize}
                  />
                </div>
            )}

            {debtStep === 2 && (
              <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                {/* Thanh tiêu đề & Cấu hình Bộ máy tính thưởng */}
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Bảng tính thưởng đại lý</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Hạng {rewardEngineData.dbTierName}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        rewardEngineData.coCamKet
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Cam kết DB: {formatVND(rewardEngineData.dbAnnualTarget)}
                    </span>
                  </div>

                  {/* Bộ điều khiển tính toán: Lọc kỳ Tháng/Cả năm */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div style={{ minWidth: '235px', flex: '0 0 auto' }}>
                      <Select
                        value={String(rewardMonthFilter)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRewardMonthFilter(val === 'all' ? 'all' : Number(val));
                          setRewardPage(1);
                        }}
                        options={[
                          {
                            value: 'all',
                            label: `Kỳ xem: Cả năm ${rewardEngineData.currentYear}`,
                          },
                          ...rewardEngineData.monthlyRewards.map((m) => ({
                            value: String(m.monthNum),
                            label: m.monthLabel,
                            rightLabel: `${m.ordersCount} đơn`,
                          })),
                        ]}
                        aria-label="Chọn kỳ xem thưởng theo tháng hoặc cả năm"
                        title="Chọn kỳ xem thưởng theo tháng hoặc cả năm"
                        style={{ height: '34px', fontSize: '0.8125rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bảng FullWidthTable hiển thị 3 chỉ tiêu thưởng DB & chi tiết tính thưởng từng đơn hàng */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <FullWidthTable
                    loading={loading}
                    emptyText="Không có dữ liệu chương trình tính thưởng"
                  >
                    <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-800 text-[11px] font-extrabold uppercase">
                        <tr>
                          <th className="py-2.5 px-3.5 w-[160px]">Mã / Số CT</th>
                          <th className="py-2.5 px-3.5">Chỉ tiêu tính thưởng</th>
                          <th className="py-2.5 px-3.5 text-center w-[95px]">Tỷ lệ thưởng</th>
                          <th className="py-2.5 px-3.5 text-right w-[150px]">Doanh số / Đã trả</th>
                          <th className="py-2.5 px-3.5 text-center w-[165px]">Trạng thái / Tiến độ</th>
                          <th className="py-2.5 px-3.5 text-right w-[145px]">Thưởng thực nhận</th>
                          <th className="py-2.5 px-3.5 text-right w-[145px]">Thưởng chờ mở khóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Dòng Tổng kết Quỹ thưởng Đại lý Cả năm */}
                        <tr className="bg-slate-50/80 border-b border-slate-200 font-extrabold">
                          <td colSpan={3} className="py-2.5 px-3.5 text-xs uppercase text-slate-800">
                            Tổng kết quỹ thưởng cả năm {rewardEngineData.currentYear} (Lũy kế 12 tháng)
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-blue-600 font-extrabold text-[13px]">
                            {rewardEngineData.netTotalRevenue.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-center text-xs text-slate-600 font-bold">
                            Đã trả đúng hạn: {rewardEngineData.netPaidOnTime.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-emerald-700 font-extrabold text-[13px]">
                            {rewardEngineData.totalEarnedBonus.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-amber-600 font-extrabold text-[13px]">
                            {rewardEngineData.totalPendingBonus > 0
                              ? `+${rewardEngineData.totalPendingBonus.toLocaleString('vi-VN')}`
                              : '0'}
                          </td>
                        </tr>

                        {/* Tiêu đề nhóm I: Bảng tính thưởng Tổng kết Cả năm */}
                        <tr className="bg-indigo-50/50 border-b border-slate-200">
                          <td colSpan={7} className="py-1.5 px-3.5 text-[11px] font-extrabold uppercase text-indigo-900 tracking-wide">
                            I. Bảng tính thưởng tổng kết cả năm {rewardEngineData.currentYear} - Nhấn để xem chi tiết
                          </td>
                        </tr>

                        {rewardEngineData.programs.map((prog) => (
                          <tr
                            key={prog.id}
                            onClick={() => {
                              setSelectedOrder(null);
                              setSelectedPaymentTx(null);
                              setSelectedMonthReward(null);
                              setSelectedRewardProgram(prog);
                            }}
                            className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-3.5 align-middle">
                              <span className="font-mono font-bold text-xs text-indigo-700 hover:underline block">
                                {prog.code}
                              </span>
                              <span className="text-[10.5px] text-slate-400 font-mono block">
                                Cả năm {rewardEngineData.currentYear}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 align-middle">
                              <div className="font-bold text-slate-900 text-xs">{prog.name}</div>
                              <div className="text-slate-600 text-xs mt-0.5 leading-snug">
                                {prog.dbFormula}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{prog.targetLabel}</div>
                            </td>
                            <td className="py-3 px-3.5 text-center align-middle">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                  prog.rate > 0
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {prog.rate}%
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right align-middle">
                              <div className="font-bold text-slate-900 text-xs">
                                {prog.actualBaseNet.toLocaleString('vi-VN')}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-center align-middle">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${prog.statusColor}`}
                              >
                                {prog.status}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right align-middle">
                              <span
                                className={`font-extrabold text-xs ${
                                  prog.earnedBonus > 0 ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {prog.earnedBonus > 0
                                  ? prog.earnedBonus.toLocaleString('vi-VN')
                                  : '0'}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right align-middle">
                              <span
                                className={`font-bold text-xs ${
                                  prog.pendingBonus > 0 ? 'text-amber-600' : 'text-slate-400'
                                }`}
                              >
                                {prog.pendingBonus > 0
                                  ? `+${prog.pendingBonus.toLocaleString('vi-VN')}`
                                  : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* Tiêu đề nhóm II: Bảng tính thưởng tường minh theo từng Tháng */}
                        <tr className="bg-emerald-50/60 border-b border-slate-200">
                          <td colSpan={7} className="py-1.5 px-3.5 text-[11px] font-extrabold uppercase text-emerald-900 tracking-wide">
                            II. Bảng tính thưởng tường minh theo từng tháng - Nhấn để xem chi tiết
                          </td>
                        </tr>

                        {filteredMonthlyRewards.map((m) => (
                          <tr
                            key={m.monthCode}
                            onClick={() => {
                              setSelectedOrder(null);
                              setSelectedPaymentTx(null);
                              setSelectedRewardProgram(null);
                              setSelectedMonthReward(m);
                            }}
                            className={`border-b border-slate-100 hover:bg-emerald-50/30 transition-colors cursor-pointer ${
                              m.ordersCount > 0 ? 'bg-white' : 'bg-slate-50/30'
                            }`}
                          >
                            <td className="py-2.5 px-3.5 align-middle">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-slate-900 hover:text-sky-700 hover:underline">
                                  {m.monthCode}
                                </span>
                                {m.isCurrentMonth && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[9.5px] font-extrabold">
                                    Hiện tại
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block">{m.monthLabel}</span>
                            </td>
                            <td className="py-2.5 px-3.5 align-middle">
                              {m.ordersCount > 0 ? (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                                      {m.ordersCount} đơn phát sinh
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[280px]">
                                      {m.orderCodes}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Thưởng TT đúng hạn tháng:{' '}
                                    <strong className="text-emerald-700">
                                      {formatVND(m.paymentBonusEarned)}
                                    </strong>{' '}
                                    • Tích lũy thưởng DS năm ({rewardEngineData.annualRate}%):{' '}
                                    <strong className="text-indigo-700">
                                      {formatVND(m.annualBonusAccrued)}
                                    </strong>
                                    {m.exceedBonusEarned > 0 && (
                                      <>
                                        {' '}• Thưởng vượt CK:{' '}
                                        <strong className="text-amber-700">
                                          {formatVND(m.exceedBonusEarned)}
                                        </strong>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Không phát sinh đơn hàng trong {m.monthLabel}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center align-middle">
                              <div className="text-[11px] font-bold text-blue-700">
                                TT: {rewardEngineData.paymentRate}%
                              </div>
                              <div className="text-[10.5px] text-indigo-600 font-semibold">
                                Năm: {rewardEngineData.annualRate}%
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-right align-middle">
                              <div className={`text-xs font-bold ${m.netRevenue > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                DS: {m.netRevenue.toLocaleString('vi-VN')}
                              </div>
                              <div className={`text-[11px] font-semibold ${m.netPaidOnTime > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                Đã trả: {m.netPaidOnTime.toLocaleString('vi-VN')}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-center align-middle">
                              <div className="text-[11px] font-semibold text-slate-700">
                                Lũy kế: {m.runningNetRevenue.toLocaleString('vi-VN')}
                              </div>
                              {m.monthlyTargetGross > 0 ? (
                                <span
                                  className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                    m.monthTargetRate >= 100
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : m.grossRevenue > 0
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  Đạt {m.monthTargetRate}% định mức tháng
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-slate-400">
                                  {m.ordersCount > 0 ? 'Có phát sinh' : '—'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right align-middle">
                              <span
                                className={`font-extrabold text-xs ${
                                  m.totalEarnedBonus > 0 ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {m.totalEarnedBonus > 0
                                  ? m.totalEarnedBonus.toLocaleString('vi-VN')
                                  : '0'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right align-middle">
                              <span
                                className={`font-bold text-xs ${
                                  m.totalPendingBonus > 0 ? 'text-amber-600' : 'text-slate-400'
                                }`}
                              >
                                {m.totalPendingBonus > 0
                                  ? `+${m.totalPendingBonus.toLocaleString('vi-VN')}`
                                  : '-'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* Tiêu đề nhóm III: Bảng tính thưởng chi tiết trên từng Đơn hàng thực tế */}
                        <tr className="bg-slate-100/70 border-b border-slate-200">
                          <td colSpan={7} className="py-1.5 px-3.5 text-[11px] font-extrabold uppercase text-slate-700 tracking-wide">
                            III. Bảng tính thưởng chi tiết theo từng đơn hàng phát sinh ({filteredOrderRewardRows.length} đơn hàng)
                          </td>
                        </tr>

                        {pagedOrderRewardRows.length > 0 ? (
                          pagedOrderRewardRows.map((row) => (
                            <tr
                              key={row.id}
                              onClick={() => {
                                setSelectedRewardProgram(null);
                                setSelectedPaymentTx(null);
                                setSelectedOrder(row.order);
                              }}
                              className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                            >
                              <td className="py-3 px-3.5 align-middle">
                                <span className="font-bold text-slate-900 text-xs hover:text-sky-700 hover:underline block">
                                  {row.code}
                                </span>
                                <span className="text-[11px] text-slate-400 block">{row.dateStr}</span>
                              </td>
                              <td className="py-3 px-3.5 align-middle">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-700">
                                    Đơn mua hàng
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Hạn TT: {row.dueDate}
                                  </span>
                                </div>
                                <div className="text-slate-700 text-xs mt-1 leading-snug">
                                  {row.note}
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center align-middle font-bold text-xs text-blue-600">
                                {row.isOverdue ? '0%' : `${row.paymentRate}%`}
                              </td>
                              <td className="py-3 px-3.5 text-right align-middle">
                                <div className="text-xs font-bold text-slate-900">
                                  Đơn: {row.netOrderBase.toLocaleString('vi-VN')}
                                </div>
                                <div className="text-[11px] text-emerald-600 font-semibold">
                                  Đã trả: {row.netPaidOnTimeBase.toLocaleString('vi-VN')}
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center align-middle">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    row.isOverdue
                                      ? 'bg-rose-100 text-rose-700'
                                      : row.grossRemainAmt === 0
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-sky-100 text-sky-700'
                                  }`}
                                >
                                  {row.statusLabel}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-right align-middle font-bold text-xs text-emerald-700">
                                {row.earnedPaymentBonus > 0
                                  ? row.earnedPaymentBonus.toLocaleString('vi-VN')
                                  : '-'}
                              </td>
                              <td className="py-3 px-3.5 text-right align-middle font-semibold text-xs text-amber-600">
                                {row.pendingPaymentBonus > 0
                                  ? `+${row.pendingPaymentBonus.toLocaleString('vi-VN')}`
                                  : '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                              Đại lý chưa có đơn hàng phát sinh để tính thưởng theo đơn
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </FullWidthTable>
                </div>

                {/* Pagination */}
                <Pagination
                  page={rewardPage}
                  pageSize={rewardPageSize}
                  totalItems={filteredOrderRewardRows.length}
                  onPageChange={setRewardPage}
                  onPageSizeChange={setRewardPageSize}
                />
              </div>
            )}
          </div>
        </StepPage>
        {renderModals()}
      </>
    );
  }

  return (
    <StandardPage
      title="Hệ thống đại lý và nhà phân phối"
      icon="bi-shop"
      color="blue"
      description="Cổng thông tin hoạt động, tra cứu công nợ và tự động lên đơn hàng gửi Bộ phận Kinh doanh"
      badge={overviewData?.customer?.code || user?.customer?.code || 'ĐẠI LÝ SEAJONG'}
      tickerContext="dealers"
    >
      {/* ── NỘI DUNG THEO TỪNG TAB ── */}

      {/* TAB 1: TỔNG QUAN ĐẠI LÝ (Dashboard chuẩn phong cách Ban Giám Đốc) */}
      {currentTab === 'overview' && (
        <DealerOverviewView
          overviewData={overviewData}
          loading={loading}
          onNavigateTab={(tab, subTab) => {
            setActiveMenuKey(tab);
            if (subTab) setOrderSubTab(subTab as any);
          }}
          onViewOrder={(ord) => setSelectedOrder(ord)}
          onRefresh={fetchOverview}
        />
      )}

      {/* TAB: ĐƠN HÀNG (QUẢN LÝ VÀ ĐẶT HÀNG TRỰC TUYẾN - TẠO ĐƠN) */}
      {(currentTab === 'orders' || currentTab === 'order-now') && (orderSubTab === 'create' || currentTab === 'order-now') && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 space-y-2">
            {/* Thanh điều hướng & Thanh công cụ Hàng hoá trên cùng 1 dòng (bỏ border) */}
            <div className="bg-white px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2.5 flex-nowrap overflow-x-auto">
              {/* Nhóm 1: Nút quay lại + Tiêu đề Hàng hoá */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingOrderId(null);
                    setOrderSubTab('list');
                    setActiveMenuKey('orders');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                >
                  <span>← Quay lại</span>
                </button>
                <div className="h-4 w-px bg-slate-200 shrink-0" />
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs uppercase tracking-wider shrink-0 whitespace-nowrap">
                  <BoxSeam className="w-4 h-4 text-sky-600" />
                  <span>Hàng hoá</span>
                  <span className="text-slate-400 font-normal">({filteredProducts.length})</span>
                </div>
              </div>

              {/* Nhóm 2: Ô tìm kiếm (co dãn tự động lấp đầy dòng) */}
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => {
                    setSearchProduct(e.target.value);
                    setProductPage(1);
                  }}
                  placeholder="Tìm tên, mã hàng..."
                  className="w-full pl-7.5 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-500 shadow-2xs"
                />
              </div>

              {/* Nhóm 3: Phân loại option (Tất cả, Thành phẩm, Linh kiện) */}
              <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setProductTypeFilter('all');
                    setProductPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    productTypeFilter === 'all'
                      ? 'bg-white text-sky-800 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({productCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductTypeFilter('thanh-pham');
                    setProductPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    productTypeFilter === 'thanh-pham'
                      ? 'bg-white text-sky-800 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thành phẩm ({productCounts.tp})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductTypeFilter('linh-kien');
                    setProductPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    productTypeFilter === 'linh-kien'
                      ? 'bg-white text-sky-800 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Linh kiện ({productCounts.lk})
                </button>
              </div>

              {/* Nhóm 4: Bộ phân trang & Select số lượng mỗi trang */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Bộ phân trang (Pagination) */}
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 text-xs text-slate-600 shadow-2xs">
                  <button
                    type="button"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage(prev => Math.max(1, prev - 1))}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-sky-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer transition-colors"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 font-medium text-[11px] whitespace-nowrap text-slate-600">
                    <strong className="text-sky-800 font-bold">{productPage}</strong> / {totalProductPages}
                  </span>
                  <button
                    type="button"
                    disabled={productPage >= totalProductPages}
                    onClick={() => setProductPage(prev => Math.min(totalProductPages, prev + 1))}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-sky-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer transition-colors"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Số lượng mỗi trang với icon ChevronDown chuẩn SVG */}
                <div className="relative inline-flex items-center">
                  <select
                    value={productPageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setProductPageSize(newSize);
                      setProductPage(1);
                    }}
                    className="appearance-none pl-2.5 pr-6 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-hidden focus:border-sky-500 shadow-2xs font-medium"
                    title="Số lượng mỗi trang"
                  >
                    <option value={12}>12 / trang</option>
                    <option value={24}>24 / trang</option>
                    <option value={48}>48 / trang</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Catalog Sản phẩm & Giỏ hàng */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 min-h-0">
              {/* Cột trái: Catalog Sản phẩm Seajong */}
              <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">

                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {pagedProducts.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-xs text-slate-400">
                      Không tìm thấy hàng hoá nào phù hợp với bộ lọc
                    </div>
                  ) : (
                    pagedProducts.map((p) => {
                      const inCart = cart.find(c => String(c.productId) === String(p.id));
                      const isFocused = String(focusedProductId) === String(p.id);
                      return (
                        <div
                          key={p.id}
                          id={`product-card-${p.id}`}
                          className={`p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between bg-white ${
                            isFocused
                              ? 'border-sky-500 ring-2 ring-sky-400 ring-offset-1 shadow-lg bg-sky-50/40 scale-[1.01]'
                              : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/20'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                p.itemType === 'linh-kien'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                                  : 'bg-sky-100 text-sky-800 border border-sky-200/60'
                              }`}>
                                {p.itemType === 'linh-kien' ? 'Linh kiện' : 'Thành phẩm'}
                              </span>
                              {p.code && (
                                <span className="font-mono text-[10.5px] text-slate-400 font-semibold truncate max-w-[120px]">
                                  {p.code}
                                </span>
                              )}
                            </div>

                            <div className="flex items-start gap-2.5 mt-2">
                              {/* Hình ảnh hàng hoá trước tên hàng hoá (hỗ trợ hover zoom, slide và click mở gallery) */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDrawerProduct(p);
                                }}
                                className="w-13 h-13 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative group cursor-pointer hover:border-sky-400 hover:shadow-xs transition-all"
                                title="Bấm vào để xem chi tiết hàng hoá (Offcanvas chuẩn Marketing)"
                              >
                                {(p.imageUrl || (p.images && p.images.length > 0)) ? (
                                  <HoverImage
                                    src={p.imageUrl || (p.images && p.images[0]) || ''}
                                    alt={p.name}
                                    images={p.images && p.images.length > 0 ? p.images : (p.imageUrl ? [p.imageUrl] : [])}
                                    previewSize={320}
                                    onPreviewClick={() => {
                                      setSelectedDrawerProduct(p);
                                    }}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <BoxSeam className="w-5 h-5 text-slate-400" />
                                )}
                                {p.images && p.images.length > 1 && (
                                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 text-[9px] font-bold bg-sky-800/90 text-white rounded shadow-xs flex items-center gap-0.5 pointer-events-none backdrop-blur-xs">
                                    <Camera className="w-2.5 h-2.5" />
                                    <span>{p.images.length}</span>
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h5
                                  className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug hover:text-sky-700 transition-colors cursor-pointer"
                                  title="Bấm để xem chi tiết sản phẩm"
                                  onClick={() => setSelectedDrawerProduct(p)}
                                >
                                  {p.name}
                                </h5>
                                <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                  {p.categoryName || 'Sản phẩm chính hãng Seajong'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-none">
                                Giá bán {p.unit ? `(${p.unit})` : ''}
                              </span>
                              <span className="font-black text-sky-700 text-sm">{formatVND(p.price)}</span>
                            </div>

                            {inCart ? (
                              <div className="flex items-center gap-1.5 bg-sky-100 rounded-lg p-0.5 border border-sky-200">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(p.id, inCart.soLuong - 1)}
                                  className="w-6 h-6 rounded bg-white font-bold text-sky-700 flex items-center justify-center text-xs hover:bg-sky-200 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-1 text-xs font-bold text-sky-900">{inCart.soLuong}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(p.id, inCart.soLuong + 1)}
                                  className="w-6 h-6 rounded bg-white font-bold text-sky-700 flex items-center justify-center text-xs hover:bg-sky-200 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToCart(p, 1)}
                                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <CartPlus className="w-3.5 h-3.5" />
                                <span>Chọn mua</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cột phải: Giỏ hàng & Nút gửi đơn hàng */}
              <div className="w-full md:w-84 lg:w-96 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs shrink-0">
                <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CartPlus className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Đơn hàng đang tạo ({cart.length})
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-rose-600 hover:underline text-xs cursor-pointer"
                    >
                      Xoá hết
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center py-12">
                      <BoxSeam className="w-8 h-8 text-slate-300 mb-2" />
                      <span>Chưa có sản phẩm nào trong đơn</span>
                      <span className="text-[11px] text-slate-400 mt-1">Bấm "Chọn mua" từ danh mục bên trái</span>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.productId}
                        onClick={() => handleFocusProductInCatalog(item.productId)}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          String(focusedProductId) === String(item.productId)
                            ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-300 shadow-2xs'
                            : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/90 hover:border-slate-200'
                        }`}
                        title="Bấm để định vị sản phẩm này trong danh sách hàng hoá bên trái"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 rounded-md bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center cursor-pointer hover:border-sky-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              const found = products.find(p => String(p.id) === String(item.productId));
                              if (found) {
                                setSelectedDrawerProduct(found);
                              } else {
                                setSelectedDrawerProduct({
                                  id: item.productId,
                                  name: item.tenHang,
                                  price: item.donGia,
                                  images: item.images && item.images.length > 0 ? item.images : (item.hinhAnh ? [item.hinhAnh] : []),
                                  specs: {},
                                  description: '',
                                  slug: String(item.productId),
                                  updatedAt: new Date().toISOString()
                                });
                              }
                            }}
                            title="Bấm để xem chi tiết sản phẩm"
                          >
                            {(item.hinhAnh || (item.images && item.images.length > 0)) ? (
                              <HoverImage
                                src={item.hinhAnh || (item.images && item.images[0]) || ''}
                                alt={item.tenHang}
                                images={item.images && item.images.length > 0 ? item.images : (item.hinhAnh ? [item.hinhAnh] : [])}
                                previewSize={240}
                                onPreviewClick={() => {
                                  const found = products.find(p => String(p.id) === String(item.productId));
                                  if (found) {
                                    setSelectedDrawerProduct(found);
                                  } else {
                                    setSelectedDrawerProduct({
                                      id: item.productId,
                                      name: item.tenHang,
                                      price: item.donGia,
                                      images: item.images && item.images.length > 0 ? item.images : (item.hinhAnh ? [item.hinhAnh] : []),
                                      specs: {},
                                      description: '',
                                      slug: String(item.productId),
                                      updatedAt: new Date().toISOString()
                                    });
                                  }
                                }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                              />
                            ) : (
                              <BoxSeam className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate" title={item.tenHang}>{item.tenHang}</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              {formatVND(item.donGia)} × {item.soLuong}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sky-800">{formatVND(item.donGia * item.soLuong)}</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromCart(item.productId);
                            }}
                            className="text-rose-500 hover:text-rose-700 text-[11px] mt-0.5 cursor-pointer"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Thông tin giao nhận hàng & Tổng kết */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsShippingCollapsed(prev => !prev)}
                    className="w-full text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between pb-1 border-b border-slate-200/70 cursor-pointer hover:text-sky-700 transition-colors select-none"
                    title={isShippingCollapsed ? 'Bấm để mở rộng thông tin giao nhận hàng' : 'Bấm để thu nhỏ thông tin giao nhận hàng'}
                  >
                    <div className="flex items-center gap-1.5">
                      <GeoAlt className="w-3.5 h-3.5 text-sky-600" />
                      <span>Thông tin giao nhận hàng</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="text-[10px] font-normal normal-case">
                        {isShippingCollapsed ? 'Mở rộng' : 'Thu nhỏ'}
                      </span>
                      {isShippingCollapsed ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {!isShippingCollapsed && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                            Người nhận hàng
                          </label>
                          <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Họ tên người nhận..."
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                            SĐT nhận hàng
                          </label>
                          <input
                            type="tel"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="Số điện thoại..."
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                          Địa chỉ nhận hàng chi tiết
                        </label>
                        <input
                          type="text"
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                            Ngày mong muốn nhận hàng
                          </label>
                          <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                            Thanh toán trước
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={prepaidAmount ? prepaidAmount.toLocaleString('vi-VN') : ''}
                              onChange={(e) => {
                                const val = Number(e.target.value.replace(/\D/g, ''));
                                setPrepaidAmount(val);
                              }}
                              placeholder="0"
                              className="w-full pl-2 pr-6 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono text-right font-semibold text-emerald-700"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                              đ
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                          Ghi chú cho Bộ phận Kinh doanh
                        </label>
                        <textarea
                          rows={2}
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder="VD: Giao hàng về kho số 2, đóng kiện cẩn thận..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white resize-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Tổng giá trị đơn:</span>
                    <span className="font-black text-red-600 text-base">{formatVND(cartTotal)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={cart.length === 0 || isSubmittingOrder}
                      onClick={() => handleSaveOrder(true)}
                      className="w-1/3 justify-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100"
                    >
                      <FileEarmarkText className="w-3.5 h-3.5" />
                      <span>{isSubmittingOrder ? 'Lưu...' : 'Lưu nháp'}</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      disabled={cart.length === 0 || isSubmittingOrder}
                      onClick={() => handleSaveOrder(false)}
                      className="flex-1 justify-center gap-1.5 font-bold"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingOrder ? 'Đang gửi...' : 'Gửi đơn hàng'}</span>
                    </Button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* TAB 5: YÊU CẦU HỖ TRỢ */}
      {currentTab === 'support' && (
        <div className="flex-1 overflow-y-auto space-y-3 max-w-2xl bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Headset className="w-4 h-4 text-sky-600" />
            <span>Gửi yêu cầu hỗ trợ đến Seajong</span>
          </h4>
          <p className="text-xs text-slate-500">
            Quý đại lý cần bảo hành linh kiện, cấp phát bảng biển POSM, Catalogue hoặc phản ánh giao hàng, vui lòng liên hệ trực tiếp:
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div>
              <span className="text-slate-500">Chuyên viên phụ trách:</span>
              <strong className="text-slate-900 ml-2">{overviewData?.customer?.nguoiChamSoc?.fullName || 'Phạm Quang Việt'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Số điện thoại / Zalo:</span>
              <strong className="text-sky-700 ml-2">{overviewData?.customer?.nguoiChamSoc?.phone || '0981.183.234'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Tổng đài Chăm sóc khách hàng Seajong:</span>
              <strong className="text-slate-900 ml-2">1900 888 666</strong>
            </div>
          </div>
        </div>
      )}

      {renderModals()}
    </StandardPage>
  );
};
