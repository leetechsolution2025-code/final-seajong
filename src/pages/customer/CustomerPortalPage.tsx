import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDepartment } from '../../context/DepartmentContext';
import { useToast } from '../../components/ui/Toast';
import { StepPage } from '../../components/common/StepPage';
import type { ModernStepItem } from '../../types';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DatePicker } from '../../components/common/DatePicker';
import { Badge } from '../../components/common/Badge';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { HoverImage } from '../../components/ui/HoverImage';
import { ProductDrawer } from '../../components/marketing/ProductDrawer';
import {
  CartPlus,
  BoxSeam,
  Headset,
  CheckCircle,
  ShieldCheck,
  Trash,
  Send,
  ArrowLeft,
  ArrowRight,
  QrCode,
  CreditCard,
  Truck,
  Eye,
  BagCheck,
  LightningCharge,
  ArrowRepeat,
  PlusLg,
  DashLg,
  Wallet2,
} from 'react-bootstrap-icons';

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
  code?: string;
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

interface WarrantyItem {
  id: string;
  warrantyCode: string;
  productName: string;
  orderCode: string;
  activatedDate: string;
  expiryDate: string;
  durationMonths: number;
  quantity: number;
  unitPrice: number;
  status: 'active' | 'expiring' | 'expired';
}

type StoreViewTab = 'store' | 'orders' | 'warranty' | 'support';
type PaymentMethodType = 'vietqr' | 'vnpay' | 'cod';

const VOUCHERS = [
  {
    code: 'SEAJONG10',
    label: 'SEAJONG10 - Giảm 10% (Tối đa 500.000 đ)',
    desc: 'Áp dụng cho mọi đơn hàng thiết bị phòng tắm & nhà bếp',
    minOrder: 0,
    calcDiscount: (subtotal: number) => Math.min(500000, Math.round(subtotal * 0.1)),
  },
  {
    code: 'VIP300',
    label: 'VIP300 - Giảm 300.000 đ (Đơn từ 5 triệu)',
    desc: 'Áp dụng cho đơn hàng từ 5.000.000 đ trở lên',
    minOrder: 5000000,
    calcDiscount: (subtotal: number) => (subtotal >= 5000000 ? 300000 : 0),
  },
  {
    code: 'COMBO1000',
    label: 'COMBO1000 - Giảm 1.000.000 đ (Đơn từ 15 triệu)',
    desc: 'Ưu đãi combo trọn bộ phòng tắm từ 15.000.000 đ',
    minOrder: 15000000,
    calcDiscount: (subtotal: number) => (subtotal >= 15000000 ? 1000000 : 0),
  },
];

const formatVND = (amount?: number | null): string => {
  if (amount === undefined || amount === null) return '0 đ';
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
};

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { activeMenuKey, setActiveMenuKey } = useDepartment();
  const toast = useToast();

  // Active storefront section: default to 'store' (Bước 1: Cửa hàng trực tuyến)
  const [viewTab, setViewTab] = useState<StoreViewTab>('store');

  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Storefront product filters
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'thanh-pham' | 'linh-kien'>('thanh-pham');
  const [priceSort, setPriceSort] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [productPage, setProductPage] = useState<number>(1);
  const [productPageSize, setProductPageSize] = useState<number>(12);
  const [selectedDrawerProduct, setSelectedDrawerProduct] = useState<any | null>(null);

  // Cart & Checkout Offcanvas (400px, 2 slides: Slide 1 = Thông tin chung, Slide 2 = Chi tiết hàng hoá đã chọn)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);
  const [isCartItemsSlideOpen, setIsCartItemsSlideOpen] = useState<boolean>(false);
  const [quickAddProductId, setQuickAddProductId] = useState<string>('');

  const [voucherCode, setVoucherCode] = useState<string>('SEAJONG10');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('vietqr');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [prepaidAmount, setPrepaidAmount] = useState<number>(0);
  const [isPrepaidCustomEdited, setIsPrepaidCustomEdited] = useState<boolean>(false);
  const [orderNote, setOrderNote] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Online Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<{
    open: boolean;
    code?: string;
    total?: number;
    paidAmount?: number;
    paymentMethod?: PaymentMethodType;
  }>({ open: false });

  // Orders list state
  const [searchOrder, setSearchOrder] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  // Warranty state
  const [searchWarranty, setSearchWarranty] = useState<string>('');
  const [warrantyPage, setWarrantyPage] = useState<number>(1);
  const [warrantyPageSize, setWarrantyPageSize] = useState<number>(10);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyItem | null>(null);

  // Support state
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState<boolean>(false);
  const [searchSupport, setSearchSupport] = useState<string>('');
  const [supportTypeFilter, setSupportTypeFilter] = useState<string>('all');
  const [supportPage, setSupportPage] = useState<number>(1);
  const [supportPageSize, setSupportPageSize] = useState<number>(10);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState<any | null>(null);
  const [showSupportFormDrawer, setShowSupportFormDrawer] = useState<boolean>(false);
  const [supportFormType, setSupportFormType] = useState<string>('Bảo hành & Linh kiện');
  const [supportFormTitle, setSupportFormTitle] = useState<string>('');
  const [supportFormContent, setSupportFormContent] = useState<string>('');
  const [supportFormOrderCode, setSupportFormOrderCode] = useState<string>('');
  const [supportFormPriority, setSupportFormPriority] = useState<string>('normal');
  const [isSavingSupportTicket, setIsSavingSupportTicket] = useState<boolean>(false);

  // Sync with department menu key if triggered externally
  useEffect(() => {
    if (activeMenuKey === 'orders') setViewTab('orders');
    else if (activeMenuKey === 'warranty') setViewTab('warranty');
    else if (activeMenuKey === 'support') setViewTab('support');
    else if (activeMenuKey === 'overview' || activeMenuKey === 'store') setViewTab('store');
  }, [activeMenuKey]);

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/overview', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOverviewData(json.data);
          if (json.data.customer) {
            setRecipientName((prev) => prev || json.data.customer.daiDien || json.data.customer.name || '');
            setRecipientPhone((prev) => prev || json.data.customer.dienThoai || '');
            setShippingAddress((prev) => prev || json.data.customer.address || '');
          }
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu khách hàng:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/orders', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      }
    } catch (err) {
      console.error('Lỗi tải đơn mua hàng:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('seajong_token');
      const res = await fetch(`/api/dealer/products?_t=${Date.now()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh mục sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportTickets = async () => {
    try {
      setSupportLoading(true);
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/support-tickets', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSupportTickets(json.data);
        }
      }
    } catch (err) {
      console.error('Lỗi tải yêu cầu hỗ trợ:', err);
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOverview();
    fetchOrders();
    fetchSupportTickets();
    fetch('/api/seajong/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const customer = overviewData?.customer || user?.customer;

  // Danh sách nhóm danh mục hiển thị trên thanh lọc cửa hàng
  const storeCategories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (productTypeFilter === 'thanh-pham' && p.itemType === 'linh-kien') return;
      if (productTypeFilter === 'linh-kien' && p.itemType !== 'linh-kien') return;
      const cat = p.categoryName || 'Thiết bị Seajong';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [products, productTypeFilter]);

  const productCounts = useMemo(() => {
    const tp = products.filter((p) => p.itemType !== 'linh-kien').length;
    const lk = products.filter((p) => p.itemType === 'linh-kien').length;
    return { all: products.length, tp, lk };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      if (productTypeFilter === 'thanh-pham' && p.itemType === 'linh-kien') return false;
      if (productTypeFilter === 'linh-kien' && p.itemType !== 'linh-kien') return false;
      if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
      if (searchProduct.trim()) {
        const q = searchProduct.toLowerCase().trim();
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
        );
      }
      return true;
    });

    if (priceSort === 'price-asc') {
      return [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    }
    if (priceSort === 'price-desc') {
      return [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    return list;
  }, [products, productTypeFilter, selectedCategory, searchProduct, priceSort]);

  const pagedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Cart actions
  const handleAddToCart = (product: ProductItem, qty: number = 1, silent = false) => {
    setCart((prev) => {
      const existing = prev.find((item) => String(item.productId) === String(product.id));
      if (existing) {
        return prev.map((item) =>
          String(item.productId) === String(product.id)
            ? { ...item, soLuong: item.soLuong + qty }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          tenHang: product.name,
          donGia: product.price,
          soLuong: qty,
          hinhAnh: product.imageUrl || null,
          images:
            product.images && product.images.length > 0
              ? product.images
              : product.imageUrl
              ? [product.imageUrl]
              : [],
          unit: product.unit || 'Bộ',
        },
      ];
    });
    if (!silent) {
      toast.success('Đã thêm vào giỏ hàng', `${product.name}`);
    }
  };

  const handleBuyNow = (product: ProductItem) => {
    handleAddToCart(product, 1, true);
    setIsCartItemsSlideOpen(false);
    setMobileCartOpen(true);
    toast.info(
      'Sẵn sàng đặt hàng',
      `Đã chọn "${product.name}". Vui lòng kiểm tra thông tin đơn hàng và thanh toán.`
    );
  };

  const handleUpdateQty = (productId: number | string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => String(item.productId) !== String(productId)));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        String(item.productId) === String(productId) ? { ...item, soLuong: qty } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: number | string) => {
    setCart((prev) => prev.filter((item) => String(item.productId) !== String(productId)));
  };

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.soLuong, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.donGia * item.soLuong, 0),
    [cart]
  );

  const selectedVoucher = useMemo(
    () => VOUCHERS.find((v) => v.code === voucherCode) || null,
    [voucherCode]
  );

  const voucherDiscount = useMemo(() => {
    if (!selectedVoucher || cartSubtotal === 0) return 0;
    return selectedVoucher.calcDiscount(cartSubtotal);
  }, [selectedVoucher, cartSubtotal]);

  const onlinePaymentDiscount = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    if (paymentMethod === 'vietqr' || paymentMethod === 'vnpay') {
      return Math.round(Math.max(0, cartSubtotal - voucherDiscount) * 0.02);
    }
    return 0;
  }, [cartSubtotal, voucherDiscount, paymentMethod]);

  const shippingFee = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    return cartSubtotal >= 2000000 ? 0 : 35000;
  }, [cartSubtotal]);

  const finalTotal = useMemo(
    () => Math.max(0, cartSubtotal - voucherDiscount - onlinePaymentDiscount + shippingFee),
    [cartSubtotal, voucherDiscount, onlinePaymentDiscount, shippingFee]
  );

  // Tự động đồng bộ giá trị trả trước theo phương thức thanh toán nếu người dùng chưa tự nhập tay
  useEffect(() => {
    if (!isPrepaidCustomEdited) {
      if (paymentMethod === 'vietqr' || paymentMethod === 'vnpay') {
        setPrepaidAmount(finalTotal);
      } else {
        setPrepaidAmount(0);
      }
    } else if (prepaidAmount > finalTotal) {
      setPrepaidAmount(finalTotal);
    }
  }, [finalTotal, paymentMethod, isPrepaidCustomEdited]);

  const remainingAmount = useMemo(
    () => Math.max(0, finalTotal - (prepaidAmount || 0)),
    [finalTotal, prepaidAmount]
  );

  // Proceed to checkout / online payment
  const handleInitiateCheckout = () => {
    if (cart.length === 0) {
      toast.warning('Giỏ hàng trống', 'Vui lòng chọn ít nhất một sản phẩm để đặt hàng.');
      setIsCartItemsSlideOpen(true);
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim() || !shippingAddress.trim()) {
      toast.warning(
        'Thiếu thông tin giao hàng',
        'Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng.'
      );
      setIsCartItemsSlideOpen(false);
      return;
    }

    if ((paymentMethod === 'vietqr' || paymentMethod === 'vnpay') && (prepaidAmount || finalTotal) > 0) {
      setPaymentModalOpen(true);
    } else {
      handleSubmitOrder(false);
    }
  };

  const handleSubmitOrder = async (isPaidOnline: boolean) => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const paymentLabel =
        paymentMethod === 'vietqr'
          ? 'Chuyển khoản VietQR 24/7'
          : paymentMethod === 'vnpay'
          ? 'Cổng VNPAY / Ví điện tử QR'
          : 'Thanh toán khi nhận hàng (COD)';

      const actualPaidAmount = isPaidOnline
        ? prepaidAmount > 0
          ? prepaidAmount
          : finalTotal
        : prepaidAmount > 0
        ? prepaidAmount
        : 0;

      const fullNote = [
        `[TT: ${paymentLabel}${isPaidOnline ? ' - ĐÃ THANH TOÁN ONLINE' : ''}]`,
        voucherDiscount > 0 ? `[Mã KM: ${voucherCode} (-${formatVND(voucherDiscount)})]` : '',
        onlinePaymentDiscount > 0 ? `[Ưu đãi Online -2%: -${formatVND(onlinePaymentDiscount)}]` : '',
        orderNote.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      const res = await fetch('/api/dealer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: cart,
          ghiChu: fullNote,
          ngayGiao: deliveryDate || undefined,
          daThanhToan: actualPaidAmount,
          nguoiNhan: recipientName.trim(),
          soDienThoai: recipientPhone.trim(),
          diaChiGiaoHang: shippingAddress.trim(),
          nguoiDatHang: recipientName.trim() || 'Khách hàng Seajong',
          isDraft: false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const createdCode = data.order?.code || `KHL-${Date.now().toString().slice(-6)}`;
        setPaymentModalOpen(false);
        setMobileCartOpen(false);
        setIsCartItemsSlideOpen(false);
        setCart([]);
        setOrderNote('');
        setDeliveryDate('');
        setIsPrepaidCustomEdited(false);
        setOrderSuccessModal({
          open: true,
          code: createdCode,
          total: finalTotal,
          paidAmount: actualPaidAmount,
          paymentMethod,
        });
        toast.success(
          'Đặt hàng thành công!',
          `Mã đơn hàng #${createdCode} đã được ghi nhận trên hệ thống Seajong.`
        );
        await fetchOrders();
        await fetchOverview();
      } else {
        toast.error('Không thể tạo đơn hàng', data.message || 'Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err) {
      console.error('Lỗi đặt hàng:', err);
      toast.error('Lỗi kết nối máy chủ', 'Không thể gửi đơn hàng, vui lòng thử lại.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch(`/api/dealer/orders/${orderToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrderToDelete(null);
        setSelectedOrder(null);
        toast.success('Đã xoá đơn hàng', `Đơn hàng #${orderToDelete.code} đã được xoá.`);
        await fetchOrders();
      }
    } catch (err) {
      console.error('Lỗi xoá đơn:', err);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Warranty list computed from customer orders
  const warrantyList = useMemo<WarrantyItem[]>(() => {
    const items: WarrantyItem[] = [];
    let seq = 1;
    const sourceOrders = orders.length > 0 ? orders : overviewData?.recentOrders || [];
    sourceOrders
      .filter((o: any) => o.trangThai !== 'draft')
      .forEach((ord: any) => {
        const actDate = ord.ngayDat ? new Date(ord.ngayDat) : new Date();
        const expDate = new Date(actDate);
        expDate.setFullYear(expDate.getFullYear() + 5);
        const subItems =
          Array.isArray(ord.saleOrderItems) && ord.saleOrderItems.length > 0
            ? ord.saleOrderItems
            : [
                {
                  id: `${ord.id}-1`,
                  tenHang: ord.ghiChu || `Thiết bị vệ sinh Seajong (${ord.code})`,
                  soLuong: 1,
                  donGia: ord.tongTien || 0,
                },
              ];

        subItems.forEach((si: any) => {
          const codeSuffix = String(seq).padStart(3, '0');
          items.push({
            id: `${ord.id}-${seq}`,
            warrantyCode: `BH-SJ-${codeSuffix}`,
            productName: si.tenHang || `Thiết bị chính hãng Seajong`,
            orderCode: ord.code,
            activatedDate: actDate.toISOString(),
            expiryDate: expDate.toISOString(),
            durationMonths: 60,
            quantity: Number(si.soLuong) || 1,
            unitPrice: Number(si.donGia) || Number(ord.tongTien) || 0,
            status: 'active',
          });
          seq++;
        });
      });
    return items;
  }, [orders, overviewData]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderStatusFilter !== 'all' && ord.trangThai !== orderStatusFilter) return false;
      if (searchOrder.trim()) {
        const kw = searchOrder.toLowerCase().trim();
        return (
          ord.code.toLowerCase().includes(kw) ||
          (ord.ghiChu && ord.ghiChu.toLowerCase().includes(kw)) ||
          (ord.nguoiNhan && ord.nguoiNhan.toLowerCase().includes(kw))
        );
      }
      return true;
    });
  }, [orders, orderStatusFilter, searchOrder]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredOrders.slice(start, start + orderPageSize);
  }, [filteredOrders, orderPage, orderPageSize]);

  // Filtered Warranties
  const filteredWarranties = useMemo(() => {
    return warrantyList.filter((w) => {
      if (searchWarranty.trim()) {
        const kw = searchWarranty.toLowerCase().trim();
        return (
          w.warrantyCode.toLowerCase().includes(kw) ||
          w.productName.toLowerCase().includes(kw) ||
          w.orderCode.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [warrantyList, searchWarranty]);

  const pagedWarranties = useMemo(() => {
    const start = (warrantyPage - 1) * warrantyPageSize;
    return filteredWarranties.slice(start, start + warrantyPageSize);
  }, [filteredWarranties, warrantyPage, warrantyPageSize]);

  // Filtered Support Tickets
  const filteredSupportTickets = useMemo(() => {
    return supportTickets.filter((t) => {
      if (supportTypeFilter !== 'all' && t.type !== supportTypeFilter) return false;
      if (searchSupport.trim()) {
        const kw = searchSupport.toLowerCase().trim();
        return (
          String(t.code || '').toLowerCase().includes(kw) ||
          String(t.title || '').toLowerCase().includes(kw) ||
          String(t.content || '').toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [supportTickets, supportTypeFilter, searchSupport]);

  const pagedSupportTickets = useMemo(() => {
    const start = (supportPage - 1) * supportPageSize;
    return filteredSupportTickets.slice(start, start + supportPageSize);
  }, [filteredSupportTickets, supportPage, supportPageSize]);

  const handleOpenCreateSupportTicket = (prefillTitle = '', prefillOrderCode = '') => {
    setSupportFormType('Bảo hành & Linh kiện');
    setSupportFormTitle(prefillTitle);
    setSupportFormContent('');
    setSupportFormOrderCode(prefillOrderCode);
    setSupportFormPriority('normal');
    setShowSupportFormDrawer(true);
  };

  const handleSaveSupportTicket = async () => {
    if (!supportFormTitle.trim()) {
      toast.warning('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề yêu cầu hỗ trợ.');
      return;
    }
    setIsSavingSupportTicket(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: supportFormType,
          title: supportFormTitle.trim(),
          content: supportFormContent.trim(),
          orderCode: supportFormOrderCode,
          priority: supportFormPriority,
          isDraft: false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowSupportFormDrawer(false);
        toast.success(
          'Đã gửi yêu cầu hỗ trợ',
          'Bộ phận CSKH Seajong sẽ liên hệ hỗ trợ quý khách sớm nhất.'
        );
        await fetchSupportTickets();
      } else {
        toast.error('Lỗi gửi yêu cầu', json.message || 'Không thể lưu yêu cầu hỗ trợ');
      }
    } catch (err) {
      console.error('Lỗi lưu yêu cầu hỗ trợ:', err);
    } finally {
      setIsSavingSupportTicket(false);
    }
  };

  // VietQR URL dynamic generator
  const qrTransferInfo = useMemo(() => {
    const phoneSuffix = (recipientPhone || 'KHACHHANG').replace(/\D/g, '').slice(-6) || 'SEAJONG';
    return `SEAJONG TT ${phoneSuffix}`;
  }, [recipientPhone]);

  const qrPaymentAmount = useMemo(
    () => (prepaidAmount > 0 ? prepaidAmount : finalTotal),
    [prepaidAmount, finalTotal]
  );

  const vietQrUrl = useMemo(() => {
    const amount = Math.max(0, qrPaymentAmount);
    const addInfo = encodeURIComponent(qrTransferInfo);
    const accountName = encodeURIComponent('CONG TY CP SEAJONG VIET NAM');
    return `https://img.vietqr.io/image/MB-0981183234-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
  }, [qrPaymentAmount, qrTransferInfo]);

  // StepPage steps configuration
  const portalSteps = useMemo<ModernStepItem[]>(
    () => [
      {
        num: 1,
        id: 'store',
        title: 'Cửa hàng trực tuyến',
        mobileTitle: 'Cửa hàng',
        desc: 'Chọn thiết bị & đặt mua trực tuyến',
        badge: `${products.length} SP`,
        badgeVariant: 'brand',
        icon: <CartPlus className="w-4 h-4" />,
      },
      {
        num: 2,
        id: 'orders',
        title: 'Đơn hàng đã đặt',
        mobileTitle: 'Đơn hàng',
        desc: 'Theo dõi giao nhận & thanh toán',
        badge: `${orders.length} đơn`,
        badgeVariant: 'warning',
        icon: <BoxSeam className="w-4 h-4" />,
      },
      {
        num: 3,
        id: 'warranty',
        title: 'Bảo hành điện tử',
        mobileTitle: 'Bảo hành',
        desc: 'Tra cứu chứng nhận BH 60 tháng',
        badge: `${warrantyList.length} thiết bị`,
        badgeVariant: 'success',
        icon: <ShieldCheck className="w-4 h-4" />,
      },
      {
        num: 4,
        id: 'support',
        title: 'Hỗ trợ & CSKH',
        mobileTitle: 'Hỗ trợ',
        desc: 'Yêu cầu bảo hành & kỹ thuật 24/7',
        badge: `${supportTickets.length} phiếu`,
        badgeVariant: 'neutral',
        icon: <Headset className="w-4 h-4" />,
      },
    ],
    [products.length, orders.length, warrantyList.length, supportTickets.length]
  );

  const currentStepNumber = useMemo(() => {
    if (viewTab === 'store') return 1;
    if (viewTab === 'orders') return 2;
    if (viewTab === 'warranty') return 3;
    return 4;
  }, [viewTab]);

  const handleStepChange = (stepNum: number) => {
    if (stepNum === 1) {
      setViewTab('store');
      setActiveMenuKey('overview');
    } else if (stepNum === 2) {
      setViewTab('orders');
      setActiveMenuKey('orders');
    } else if (stepNum === 3) {
      setViewTab('warranty');
      setActiveMenuKey('warranty');
    } else {
      setViewTab('support');
      setActiveMenuKey('support');
    }
  };

  // Danh sách options cho Select thêm nhanh hàng hoá trong Slide 2 của Offcanvas
  const quickAddProductOptions = useMemo(() => {
    return [
      { value: '', label: '-- Chọn sản phẩm để thêm vào giỏ --' },
      ...products.slice(0, 200).map((p) => ({
        value: String(p.id),
        label: `${p.code ? `[${p.code}] ` : ''}${p.name}`,
        rightLabel: formatVND(p.price),
      })),
    ];
  }, [products]);

  return (
    <StepPage
      title="Cửa hàng trực tuyến và bảo hành sản phẩm"
      icon="bi-bag-heart"
      color="blue"
      badge="KHÁCH HÀNG"
      description="Mua sắm thiết bị phòng tắm, nhà bếp chính hãng Seajong • Thanh toán trực tuyến & Bảo hành điện tử 5 năm"
      tickerContext="customer-portal"
      steps={portalSteps}
      currentStep={currentStepNumber}
      onStepChange={handleStepChange}
      className="customer-portal-page"
    >
      {/* ── BƯỚC 1: CỬA HÀNG TRỰC TUYẾN ── */}
      {viewTab === 'store' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <TableToolbar
            searchPlaceholder="Tìm kiếm sen cây, bồn cầu thông minh, vòi lavabo, chậu rửa..."
            searchValue={searchProduct}
            onSearchChange={(val) => {
              setSearchProduct(val);
              setProductPage(1);
            }}
            filters={[
              {
                id: 'product-type-filter',
                value: productTypeFilter,
                onChange: (val) => {
                  setProductTypeFilter(val as any);
                  setSelectedCategory('all');
                  setProductPage(1);
                },
                minWidth: '185px',
                options: [
                  { value: 'thanh-pham', label: `Thiết bị chính hãng (${productCounts.tp})` },
                  { value: 'linh-kien', label: `Linh kiện & Phụ tùng (${productCounts.lk})` },
                  { value: 'all', label: `Tất cả sản phẩm (${productCounts.all})` },
                ],
              },
              {
                id: 'product-category-filter',
                value: selectedCategory,
                onChange: (val) => {
                  setSelectedCategory(val);
                  setProductPage(1);
                },
                minWidth: '190px',
                options: [
                  { value: 'all', label: 'Tất cả danh mục' },
                  ...storeCategories.map((c) => ({
                    value: c.name,
                    label: `${c.name} (${c.count})`,
                  })),
                ],
              },
              {
                id: 'product-sort-filter',
                value: priceSort,
                onChange: (val) => setPriceSort(val as any),
                minWidth: '165px',
                options: [
                  { value: 'popular', label: 'Sắp xếp: Phổ biến nhất' },
                  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
                  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
                ],
              },
            ]}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                icon={<CartPlus className="w-4 h-4" />}
                onClick={() => {
                  setIsCartItemsSlideOpen(false);
                  setMobileCartOpen(true);
                }}
              >
                <span>Giỏ hàng ({cartItemCount})</span>
                {cartSubtotal > 0 && (
                  <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.2 rounded bg-white/20 text-[11px] font-extrabold">
                    {formatVND(finalTotal)}
                  </span>
                )}
              </Button>
            }
            showMenu={false}
            onRefresh={fetchProducts}
          />

          {/* Dải lọc nhanh Danh mục thiết bị */}
          {storeCategories.length > 0 && (
            <div className="customer-category-strip px-3 py-1.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="customer-category-label text-[11px] font-bold text-slate-500 shrink-0 mr-1">
                Danh mục:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setProductPage(1);
                }}
                className={`customer-category-chip px-2.5 py-1 rounded-full text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tất cả (
                {productTypeFilter === 'thanh-pham'
                  ? productCounts.tp
                  : productTypeFilter === 'linh-kien'
                  ? productCounts.lk
                  : productCounts.all}
                )
              </button>
              {storeCategories.map((cat) => {
                const isActive = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(isActive ? 'all' : cat.name);
                      setProductPage(1);
                    }}
                    className={`customer-category-chip px-2.5 py-1 rounded-full text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Lưới Sản phẩm Toàn màn hình */}
          <div className="customer-product-grid-wrap flex-1 overflow-y-auto p-3 min-h-0 bg-slate-50/40">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                <ArrowRepeat className="w-6 h-6 animate-spin text-blue-600" />
                <span>Đang tải danh mục thiết bị chính hãng Seajong...</span>
              </div>
            ) : pagedProducts.length === 0 ? (
              <div className="h-64 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center p-6">
                <BoxSeam className="w-8 h-8 text-slate-300 mb-2" />
                <div className="text-sm font-bold text-slate-700">
                  Không tìm thấy sản phẩm phù hợp
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác
                </p>
              </div>
            ) : (
              <div className="customer-product-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                {pagedProducts.map((p) => {
                  const inCart = cart.find((c) => String(c.productId) === String(p.id));
                  const originalPrice =
                    p.price > 0 ? Math.round((p.price * 1.18) / 10000) * 10000 : 0;

                  return (
                    <div
                      key={p.id}
                      className={`customer-product-card bg-white rounded-xl border transition-all flex flex-col justify-between overflow-hidden group ${
                        inCart
                          ? 'border-blue-400 ring-1 ring-blue-200 shadow-xs'
                          : 'border-slate-200/90 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div>
                        {/* Ảnh sản phẩm + Badges */}
                        <div
                          onClick={() => setSelectedDrawerProduct(p)}
                          className="customer-product-img relative h-44 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
                        >
                          {p.imageUrl ? (
                            <HoverImage
                              src={p.imageUrl}
                              alt={p.name}
                              images={p.images && p.images.length > 0 ? p.images : [p.imageUrl]}
                              previewSize={280}
                              onPreviewClick={() => setSelectedDrawerProduct(p)}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                padding: '8px',
                              }}
                            />
                          ) : (
                            <BoxSeam className="w-10 h-10 text-slate-300" />
                          )}

                          <div className="customer-product-badges absolute top-2 left-2 z-10 flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold leading-tight bg-blue-600 text-white shadow-xs">
                              {p.itemType === 'linh-kien' ? 'Chính hãng' : 'BH 5 năm'}
                            </span>
                            {p.price > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold leading-tight bg-rose-600 text-white shadow-xs">
                                -15%
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrawerProduct(p);
                            }}
                            className="customer-product-detail-btn absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-900/75 hover:bg-slate-900 text-white text-[10.5px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem chi tiết</span>
                          </button>
                        </div>

                        {/* Thông tin sản phẩm */}
                        <div className="customer-product-body p-3">
                          <div className="customer-product-meta flex items-center justify-between text-[10.5px] text-slate-400 mb-1">
                            <span className="truncate font-semibold text-blue-700">
                              {p.categoryName || 'Thiết bị Seajong'}
                            </span>
                            <span className="font-mono shrink-0">{p.code}</span>
                          </div>

                          <h4
                            onClick={() => setSelectedDrawerProduct(p)}
                            className="customer-product-title font-bold text-slate-900 text-xs leading-snug line-clamp-2 min-h-[34px] hover:text-blue-700 cursor-pointer m-0"
                            title={p.name}
                          >
                            {p.name}
                          </h4>

                          {/* Giá bán & Ưu đãi */}
                          <div className="customer-product-price-row mt-2 flex items-baseline gap-2 flex-wrap">
                            <span className="customer-product-price font-black text-rose-600 text-sm">
                              {formatVND(p.price)}
                            </span>
                            {originalPrice > p.price && (
                              <span className="customer-product-old-price text-[11px] text-slate-400 line-through">
                                {formatVND(originalPrice)}
                              </span>
                            )}
                          </div>

                          <div className="customer-product-tags mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-semibold leading-tight">
                              Đổi mới 30 ngày
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/70 text-[10px] font-semibold leading-tight">
                              VietQR -2%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nút chọn mua / Mua ngay sử dụng component Button chuẩn */}
                      <div className="customer-product-actions px-3 pb-3 pt-1 flex items-center gap-1.5">
                        {inCart ? (
                          <div className="customer-product-qty-box flex-1 flex items-center justify-between bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(p.id, inCart.soLuong - 1)}
                              className="w-6 h-6 rounded bg-white font-bold text-blue-700 flex items-center justify-center cursor-pointer border border-blue-200"
                            >
                              -
                            </button>
                            <span className="text-xs font-extrabold text-blue-900">
                              <span className="hidden sm:inline">Đã chọn: </span>
                              {inCart.soLuong}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(p.id, inCart.soLuong + 1)}
                              className="w-6 h-6 rounded bg-white font-bold text-blue-700 flex items-center justify-center cursor-pointer border border-blue-200"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<CartPlus className="w-3.5 h-3.5" />}
                            onClick={() => handleAddToCart(p, 1)}
                            className="customer-add-cart-btn flex-1 justify-center"
                          >
                            <span className="customer-add-cart-label">Thêm giỏ</span>
                          </Button>
                        )}

                        <Button
                          variant="primary"
                          size="sm"
                          icon={<LightningCharge className="w-3.5 h-3.5" />}
                          onClick={() => handleBuyNow(p)}
                          className="customer-buy-now-btn shrink-0 justify-center"
                        >
                          Mua ngay
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Pagination
            page={productPage}
            pageSize={productPageSize}
            totalItems={filteredProducts.length}
            itemName="sản phẩm"
            pageSizeOptions={[12, 24, 48]}
            onPageChange={setProductPage}
            onPageSizeChange={(size) => {
              setProductPageSize(size);
              setProductPage(1);
            }}
          />
        </div>
      )}

      {/* ── BƯỚC 2: LỊCH SỬ ĐƠN HÀNG ĐÃ ĐẶT ── */}
      {viewTab === 'orders' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <TableToolbar
            searchPlaceholder="Tìm mã đơn hàng, tên người nhận..."
            searchValue={searchOrder}
            onSearchChange={setSearchOrder}
            filters={[
              {
                value: orderStatusFilter,
                onChange: (v) => {
                  setOrderStatusFilter(v);
                  setOrderPage(1);
                },
                options: [
                  { label: 'Tất cả trạng thái', value: 'all' },
                  { label: 'Chờ xác nhận', value: 'pending' },
                  { label: 'Đang giao hàng', value: 'approved' },
                  { label: 'Đã hoàn thành', value: 'completed' },
                ],
              },
            ]}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                icon={<CartPlus className="w-4 h-4" />}
                onClick={() => setViewTab('store')}
              >
                Tiếp tục mua sắm
              </Button>
            }
            showMenu={false}
            onRefresh={fetchOrders}
          />

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={false}
              emptyText="Bạn chưa có đơn mua hàng nào. Hãy chọn sản phẩm tại Cửa hàng trực tuyến để đặt mua!"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200 text-slate-600 text-xs font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5 text-center hidden sm:table-cell">STT</th>
                    <th className="py-2.5 px-3.5">Mã đơn hàng</th>
                    <th className="py-2.5 px-3.5 hidden sm:table-cell">Ngày đặt</th>
                    <th className="py-2.5 px-3.5">Người nhận & Giao hàng</th>
                    <th className="py-2.5 px-3.5 text-right">Giá trị đơn</th>
                    <th className="py-2.5 px-3.5 text-right hidden sm:table-cell">Đã trả trước</th>
                    <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((ord, idx) => {
                    const isPaid = (ord.daThanhToan || 0) >= (ord.tongTien || 1);
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-400 hidden sm:table-cell">
                          {(orderPage - 1) * orderPageSize + idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700">
                          <div>{ord.code}</div>
                          <div className="sm:hidden text-[10.5px] font-normal text-slate-400 mt-0.5">
                            {new Date(ord.ngayDat).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 hidden sm:table-cell">
                          {new Date(ord.ngayDat).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-slate-900">
                            {ord.nguoiNhan || 'Khách hàng Seajong'}{' '}
                            {ord.soDienThoai ? `• ${ord.soDienThoai}` : ''}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[160px] sm:max-w-md">
                            {ord.diaChiGiaoHang || ord.ghiChu || 'Giao hàng tiêu chuẩn'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                          <div>{formatVND(ord.tongTien)}</div>
                          <div className="sm:hidden text-[10.5px] font-semibold text-emerald-700 mt-0.5">
                            TT: {formatVND(ord.daThanhToan)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right hidden sm:table-cell">
                          <span
                            className={`font-bold ${
                              isPaid ? 'text-emerald-700' : 'text-amber-600'
                            }`}
                          >
                            {formatVND(ord.daThanhToan)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <Badge
                            variant={
                              ord.trangThai === 'completed'
                                ? 'success'
                                : ord.trangThai === 'approved'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {ord.trangThai === 'completed'
                              ? 'Hoàn thành'
                              : ord.trangThai === 'approved'
                              ? 'Đang giao'
                              : 'Chờ duyệt'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
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
      )}

      {/* ── BƯỚC 3: TRA CỨU BẢO HÀNH ĐIỆN TỬ 5 NĂM ── */}
      {viewTab === 'warranty' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <TableToolbar
            searchPlaceholder="Tra cứu mã bảo hành điện tử, tên sản phẩm, mã đơn hàng..."
            searchValue={searchWarranty}
            onSearchChange={setSearchWarranty}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                icon={<Headset className="w-4 h-4" />}
                onClick={() =>
                  handleOpenCreateSupportTicket('Yêu cầu kích hoạt / kiểm tra bảo hành')
                }
              >
                Yêu cầu bảo hành tận nơi
              </Button>
            }
            showMenu={false}
            onRefresh={fetchOrders}
          />

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={false}
              emptyText="Chưa có thiết bị kích hoạt bảo hành điện tử. Bảo hành 5 năm sẽ tự động kích hoạt ngay khi bạn đặt mua sản phẩm!"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200 text-slate-600 text-xs font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5 text-center hidden sm:table-cell">STT</th>
                    <th className="py-2.5 px-3.5">Mã chứng nhận BH</th>
                    <th className="py-2.5 px-3.5">Tên thiết bị chính hãng</th>
                    <th className="py-2.5 px-3.5 hidden sm:table-cell">Mã đơn mua</th>
                    <th className="py-2.5 px-3.5 hidden sm:table-cell">Ngày kích hoạt</th>
                    <th className="py-2.5 px-3.5">Hiệu lực đến</th>
                    <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedWarranties.map((w, idx) => (
                    <tr
                      key={w.id}
                      onClick={() => setSelectedWarranty(w)}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-400 hidden sm:table-cell">
                        {(warrantyPage - 1) * warrantyPageSize + idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700">
                        <div>{w.warrantyCode}</div>
                        <div className="sm:hidden text-[10.5px] font-normal text-slate-400 mt-0.5">
                          Đơn: {w.orderCode}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                        {w.productName}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-600 hidden sm:table-cell">
                        {w.orderCode}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 hidden sm:table-cell">
                        {new Date(w.activatedDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-emerald-700">
                        {new Date(w.expiryDate).toLocaleDateString('vi-VN')}
                        <span className="hidden sm:inline"> (60 tháng)</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <Badge variant="success">Đang BH</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
          </div>

          <Pagination
            page={warrantyPage}
            pageSize={warrantyPageSize}
            totalItems={filteredWarranties.length}
            onPageChange={setWarrantyPage}
            onPageSizeChange={setWarrantyPageSize}
          />
        </div>
      )}

      {/* ── BƯỚC 4: TRUNG TÂM HỖ TRỢ & CSKH ── */}
      {viewTab === 'support' && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <TableToolbar
            searchPlaceholder="Tìm mã phiếu hỗ trợ, nội dung yêu cầu..."
            searchValue={searchSupport}
            onSearchChange={setSearchSupport}
            filters={[
              {
                value: supportTypeFilter,
                onChange: (v) => {
                  setSupportTypeFilter(v);
                  setSupportPage(1);
                },
                options: [
                  { label: 'Tất cả phân loại', value: 'all' },
                  { label: 'Bảo hành & Linh kiện', value: 'Bảo hành & Linh kiện' },
                  { label: 'Kỹ thuật & Lắp đặt', value: 'Kỹ thuật & Lắp đặt' },
                  { label: 'Đơn hàng & Giao vận', value: 'Đơn hàng & Giao vận' },
                ],
              },
            ]}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                icon={<Headset className="w-4 h-4" />}
                onClick={() => handleOpenCreateSupportTicket()}
              >
                Gửi yêu cầu hỗ trợ mới
              </Button>
            }
            showMenu={false}
            onRefresh={fetchSupportTickets}
          />

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={supportLoading}
              emptyText="Chưa có yêu cầu hỗ trợ nào. Đội ngũ kỹ thuật Seajong luôn sẵn sàng hỗ trợ quý khách 24/7!"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200 text-slate-600 text-xs font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5 text-center hidden sm:table-cell">STT</th>
                    <th className="py-2.5 px-3.5">Mã yêu cầu</th>
                    <th className="py-2.5 px-3.5 hidden sm:table-cell">Phân loại</th>
                    <th className="py-2.5 px-3.5">Tiêu đề yêu cầu</th>
                    <th className="py-2.5 px-3.5 hidden sm:table-cell">Ngày gửi</th>
                    <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSupportTickets.map((tk, idx) => (
                    <tr
                      key={tk.id}
                      onClick={() => setSelectedSupportTicket(tk)}
                      className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-400 hidden sm:table-cell">
                        {(supportPage - 1) * supportPageSize + idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700">
                        <div>{tk.code}</div>
                        <div className="sm:hidden text-[10.5px] font-normal text-slate-400 mt-0.5">
                          {new Date(tk.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-700 hidden sm:table-cell">
                        {tk.type}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                        <div>{tk.title}</div>
                        <div className="sm:hidden text-[11px] font-normal text-slate-500 mt-0.5">
                          {tk.type}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-500 hidden sm:table-cell">
                        {new Date(tk.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <Badge
                          variant={
                            tk.status === 'Resolved' || tk.status === 'Completed'
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {tk.status === 'Resolved' || tk.status === 'Completed'
                            ? 'Đã xử lý'
                            : 'Đang tiếp nhận'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
          </div>

          <Pagination
            page={supportPage}
            pageSize={supportPageSize}
            totalItems={filteredSupportTickets.length}
            onPageChange={setSupportPage}
            onPageSizeChange={setSupportPageSize}
          />
        </div>
      )}

      {/* Thanh nổi Giỏ hàng nhanh dưới đáy màn hình Điện thoại (< md) */}
      {viewTab === 'store' && cartItemCount > 0 && !mobileCartOpen && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-blue-200 shadow-lg px-3 pt-2 flex items-center justify-between gap-2"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            onClick={() => {
              setIsCartItemsSlideOpen(true);
              setMobileCartOpen(true);
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center relative shrink-0">
              <CartPlus className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {cartItemCount}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 font-medium truncate">
                Đã chọn {cart.length} mặt hàng ({cartItemCount} SP)
              </div>
              <div className="text-sm font-black text-rose-600 leading-tight">
                {formatVND(finalTotal)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsCartItemsSlideOpen(true);
                setMobileCartOpen(true);
              }}
            >
              Xem giỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<LightningCharge className="w-3.5 h-3.5" />}
              onClick={() => {
                setIsCartItemsSlideOpen(false);
                setMobileCartOpen(true);
              }}
            >
              Thanh toán
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          OFFCANVAS GIỎ HÀNG & THANH TOÁN (RỘNG 400PX, GỒM 2 SLIDE CHUẨN OFFCANVAS.TSX)
          - Slide 1: Thông tin chung, giá trị đơn hàng, giá trị trả trước...
          - Slide 2 (slidePanel): Chi tiết các hàng hoá đã chọn (thêm, bớt, xoá)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={mobileCartOpen}
        onClose={() => {
          setMobileCartOpen(false);
          setIsCartItemsSlideOpen(false);
        }}
        title={`Giỏ hàng & Thanh toán (${cartItemCount})`}
        description={
          isCartItemsSlideOpen
            ? `Slide 2/2 • Chi tiết ${cart.length} mặt hàng (${cartItemCount} sản phẩm)`
            : 'Slide 1/2 • Thông tin chung & giá trị thanh toán đơn hàng'
        }
        icon={<CartPlus size={20} />}
        width="400px"
        subHeader={
          <div className="px-4 py-2 bg-slate-50 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsCartItemsSlideOpen(false)}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                !isCartItemsSlideOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Wallet2 size={13} />
              <span>1. Thông tin chung</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCartItemsSlideOpen(true)}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                isCartItemsSlideOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <BoxSeam size={13} />
              <span>2. Hàng hoá ({cartItemCount})</span>
            </button>
          </div>
        }
        slidePanel={
          /* ── SLIDE 2: CHI TIẾT HÀNG HOÁ ĐÃ CHỌN (CÓ THỂ THÊM, BỚT, XOÁ) ── */
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#ffffff',
              zIndex: 50,
              transform: isCartItemsSlideOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Thanh công cụ Thêm nhanh & Xoá tất cả trong Slide 2 */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BoxSeam className="w-3.5 h-3.5 text-blue-600" />
                  <span>Danh sách hàng hoá ({cart.length} mặt hàng)</span>
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer bg-transparent border-0"
                  >
                    <Trash className="w-3 h-3" />
                    <span>Xoá tất cả</span>
                  </button>
                )}
              </div>

              {/* Ô chọn thêm nhanh hàng hoá ngay trong Slide 2 */}
              <Select
                label="Thêm hàng hoá vào đơn"
                value={quickAddProductId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setQuickAddProductId('');
                  if (!pid) return;
                  const found = products.find((p) => String(p.id) === String(pid));
                  if (found) {
                    handleAddToCart(found, 1);
                  }
                }}
                options={quickAddProductOptions}
              />
            </div>

            {/* Danh sách chi tiết các hàng hoá đã chọn */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CartPlus className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Chưa có hàng hoá nào được chọn
                  </div>
                  <p className="text-xs text-slate-400 m-0 px-4">
                    Hãy chọn sản phẩm ở ô phía trên hoặc tại cửa hàng trực tuyến để thêm vào đơn.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.hinhAnh ? (
                          <img
                            src={item.hinhAnh}
                            alt={item.tenHang}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <BoxSeam className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <div
                            className="font-bold text-slate-900 text-xs leading-snug line-clamp-2"
                            title={item.tenHang}
                          >
                            {item.tenHang}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(item.productId)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                            title="Xoá mặt hàng này"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Đơn giá: <strong className="text-slate-700">{formatVND(item.donGia)}</strong> /{' '}
                          {item.unit || 'Bộ'}
                        </div>
                      </div>
                    </div>

                    {/* Hàng điều chỉnh số lượng (Thêm / Bớt) & Thành tiền */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.soLuong - 1)}
                          className="w-7 h-7 rounded-md bg-white text-slate-700 hover:text-rose-600 flex items-center justify-center cursor-pointer border-0 shadow-2xs"
                          title="Giảm số lượng"
                        >
                          <DashLg size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.soLuong}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              handleUpdateQty(item.productId, val);
                            }
                          }}
                          className="w-11 text-center text-xs font-extrabold text-slate-900 bg-transparent border-0 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.soLuong + 1)}
                          className="w-7 h-7 rounded-md bg-white text-slate-700 hover:text-blue-600 flex items-center justify-center cursor-pointer border-0 shadow-2xs"
                          title="Tăng số lượng"
                        >
                          <PlusLg size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10.5px] text-slate-400 block">Thành tiền</span>
                        <strong className="text-xs font-black text-blue-700">
                          {formatVND(item.donGia * item.soLuong)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        }
        footer={
          isCartItemsSlideOpen ? (
            <div className="flex items-center justify-between gap-2 w-full">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<ArrowLeft size={15} />}
                onClick={() => setIsCartItemsSlideOpen(false)}
              >
                Thông tin chung
              </Button>
              <Button
                variant="primary"
                size="md"
                rightIcon={<CheckCircle size={15} />}
                onClick={() => setIsCartItemsSlideOpen(false)}
              >
                Xác nhận ({formatVND(cartSubtotal)})
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 w-full">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<BoxSeam size={15} />}
                onClick={() => setIsCartItemsSlideOpen(true)}
              >
                Hàng hoá ({cartItemCount})
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={
                  paymentMethod === 'vietqr' || paymentMethod === 'vnpay' ? (
                    <QrCode size={15} />
                  ) : (
                    <BagCheck size={15} />
                  )
                }
                disabled={cart.length === 0 || isSubmittingOrder}
                isLoading={isSubmittingOrder}
                onClick={handleInitiateCheckout}
              >
                {paymentMethod === 'vietqr' || paymentMethod === 'vnpay'
                  ? 'Đặt hàng & Thanh toán'
                  : 'Hoàn tất Đặt hàng'}
              </Button>
            </div>
          )
        }
      >
        {/* ── SLIDE 1: THÔNG TIN CHUNG, GIÁ TRỊ ĐƠN HÀNG, GIÁ TRỊ TRẢ TRƯỚC ── */}
        <div className="space-y-3.5 text-xs">
          {/* Thẻ tóm tắt hàng hoá đã chọn -> Bấm để trượt sang Slide 2 */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                Hàng hoá trong đơn
              </div>
              <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                {cart.length} mặt hàng • {cartItemCount} sản phẩm ({formatVND(cartSubtotal)})
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight size={13} />}
              onClick={() => setIsCartItemsSlideOpen(true)}
            >
              Chi tiết / Sửa
            </Button>
          </div>

          {/* Thông tin người nhận & giao hàng (Dùng component Input, DatePicker, Select chuẩn) */}
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Người nhận hàng"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Họ và tên..."
            />
            <Input
              label="Số điện thoại"
              required
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="SĐT nhận hàng..."
            />
          </div>

          <Input
            label="Địa chỉ nhận hàng chi tiết"
            required
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố..."
          />

          <div className="grid grid-cols-2 gap-2.5">
            <DatePicker
              label="Ngày hẹn giao"
              value={deliveryDate}
              onChange={(val) => setDeliveryDate(val)}
              placeholder="Chọn ngày nhận"
            />
            <Select
              label="Mã khuyến mại"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              options={[
                { value: '', label: '-- Không dùng mã --' },
                ...VOUCHERS.map((v) => ({
                  value: v.code,
                  label: v.code,
                  rightLabel: v.code === 'SEAJONG10' ? '-10%' : v.code === 'VIP300' ? '-300K' : '-1M',
                })),
              ]}
            />
          </div>

          <Select
            label="Phương thức thanh toán"
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value as PaymentMethodType);
              setIsPrepaidCustomEdited(false);
            }}
            options={[
              {
                value: 'vietqr',
                label: 'Chuyển khoản Ngân hàng VietQR 24/7 (Ưu đãi -2%)',
              },
              {
                value: 'vnpay',
                label: 'Cổng VNPAY QR / Ví điện tử (Ưu đãi -2%)',
              },
              {
                value: 'cod',
                label: 'Thanh toán khi nhận hàng (COD - Kiểm hàng trước)',
              },
            ]}
          />

          <Input
            label="Ghi chú đơn hàng / yêu cầu kỹ thuật"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Ghi chú thời gian nhận hàng, yêu cầu lắp đặt..."
          />

          {/* Bảng tổng hợp Giá trị đơn hàng, Giá trị trả trước & Còn lại */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wide pb-1.5 border-b border-slate-200 flex items-center justify-between">
              <span>Giá trị đơn hàng & Thanh toán</span>
              <Badge variant="brand">{cartItemCount} SP</Badge>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền hàng (Tạm tính):</span>
                <strong className="text-slate-900">{formatVND(cartSubtotal)}</strong>
              </div>

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Chiết khấu mã ưu đãi ({voucherCode}):</span>
                  <strong>-{formatVND(voucherDiscount)}</strong>
                </div>
              )}

              {onlinePaymentDiscount > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Ưu đãi thanh toán trực tuyến (-2%):</span>
                  <strong>-{formatVND(onlinePaymentDiscount)}</strong>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển:</span>
                <strong className="text-emerald-700">
                  {shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}
                </strong>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">Tổng giá trị đơn hàng:</span>
                <span className="font-black text-rose-600 text-base">{formatVND(finalTotal)}</span>
              </div>
            </div>

            {/* Ô nhập Giá trị trả trước & Nút chọn nhanh tỷ lệ trả trước */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <Input
                type="number"
                label="Giá trị trả trước (VNĐ)"
                suffix="đ"
                hideZero={false}
                value={prepaidAmount}
                onNumericChange={(numVal) => {
                  setIsPrepaidCustomEdited(true);
                  setPrepaidAmount(Math.min(finalTotal, Math.max(0, numVal)));
                }}
                placeholder="Nhập số tiền trả trước..."
              />

              {finalTotal > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrepaidCustomEdited(true);
                      setPrepaidAmount(finalTotal);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                      prepaidAmount === finalTotal
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Trả đủ 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrepaidCustomEdited(true);
                      setPrepaidAmount(Math.round(finalTotal * 0.5));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                      prepaidAmount === Math.round(finalTotal * 0.5)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Đặt cọc 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrepaidCustomEdited(true);
                      setPrepaidAmount(Math.round(finalTotal * 0.3));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                      prepaidAmount === Math.round(finalTotal * 0.3)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Đặt cọc 30%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrepaidCustomEdited(true);
                      setPrepaidAmount(0);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                      prepaidAmount === 0
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    0 đ (Khi nhận hàng)
                  </button>
                </div>
              )}

              <div className="pt-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Còn lại thanh toán khi nhận:</span>
                <strong className="font-extrabold text-blue-700 text-sm">
                  {formatVND(remainingAmount)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* ── MODAL CỔNG THANH TOÁN TRỰC TUYẾN VIETQR / VNPAY ── */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-dropdown">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-sm m-0">
                    {paymentMethod === 'vietqr'
                      ? 'Thanh toán Chuyển khoản VietQR 24/7'
                      : 'Cổng Thanh toán Điện tử VNPAY QR'}
                  </h3>
                  <p className="text-[11px] text-blue-100 m-0">
                    Quét mã QR bằng ứng dụng Ngân hàng hoặc Ví điện tử
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex flex-col items-center justify-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <img
                  src={vietQrUrl}
                  alt="VietQR Seajong"
                  className="w-56 h-56 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-2xs"
                />
                <div className="mt-2 text-center">
                  <div className="text-[11px] text-slate-500">Số tiền thanh toán trực tuyến</div>
                  <div className="text-lg font-black text-rose-600">
                    {formatVND(qrPaymentAmount)}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn vị thụ hưởng:</span>
                  <strong className="text-slate-900">CÔNG TY CP SEAJONG VIỆT NAM</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <strong className="text-slate-900">MB Bank (Ngân hàng Quân Đội)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <strong className="font-mono text-blue-800">0981183234</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nội dung CK:</span>
                  <strong className="font-mono text-rose-600">{qrTransferInfo}</strong>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="md"
                  icon={<CheckCircle className="w-4 h-4" />}
                  isLoading={isSubmittingOrder}
                  onClick={() => handleSubmitOrder(true)}
                  className="w-full justify-center"
                >
                  Tôi đã thanh toán • Hoàn tất đơn hàng
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowRepeat className="w-3.5 h-3.5" />}
                  disabled={isSubmittingOrder}
                  onClick={() => handleSubmitOrder(false)}
                  className="w-full justify-center"
                >
                  Gửi đơn hàng trước, thanh toán khi nhận hàng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ĐẶT HÀNG THÀNH CÔNG ── */}
      {orderSuccessModal.open && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <CheckCircle />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Đặt mua hàng thành công!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Đơn hàng{' '}
                <strong className="text-blue-700 font-mono">#{orderSuccessModal.code}</strong> trị
                giá <strong>{formatVND(orderSuccessModal.total)}</strong> đã được tiếp nhận và kích
                hoạt bảo hành điện tử.
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hình thức thanh toán:</span>
                  <strong className="text-slate-800">
                    {orderSuccessModal.paymentMethod === 'vietqr'
                      ? 'VietQR Trực tuyến'
                      : orderSuccessModal.paymentMethod === 'vnpay'
                      ? 'VNPAY QR Trực tuyến'
                      : 'Thanh toán khi nhận hàng (COD)'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Giá trị đã trả trước:</span>
                  <strong
                    className={
                      (orderSuccessModal.paidAmount || 0) > 0
                        ? 'text-emerald-700'
                        : 'text-amber-600'
                    }
                  >
                    {(orderSuccessModal.paidAmount || 0) > 0
                      ? formatVND(orderSuccessModal.paidAmount)
                      : '0 đ (Thanh toán khi nhận hàng)'}
                  </strong>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOrderSuccessModal({ open: false });
                  setViewTab('store');
                }}
              >
                Tiếp tục mua sắm
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setOrderSuccessModal({ open: false });
                  setViewTab('orders');
                }}
              >
                Xem đơn hàng đã đặt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHI TIẾT SẢN PHẨM DRAWER ── */}
      <ProductDrawer
        product={selectedDrawerProduct}
        cats={categories}
        onClose={() => setSelectedDrawerProduct(null)}
        onAddToCart={() => {
          if (selectedDrawerProduct) handleAddToCart(selectedDrawerProduct, 1);
        }}
        addToCartLabel="Thêm vào giỏ hàng"
        isSalesMode={true}
        isDealerMode={true}
        hideMarketingActions={true}
        hidePrintLabel={true}
      />

      {/* ── CHI TIẾT ĐƠN HÀNG OFFCANVAS (400px) ── */}
      <Offcanvas
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title="Chi tiết đơn mua hàng"
        description={selectedOrder ? `#${selectedOrder.code}` : undefined}
        icon={<BoxSeam size={18} />}
        width="400px"
        footer={
          selectedOrder && selectedOrder.trangThai === 'draft' ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash className="w-4 h-4" />}
              onClick={() => setOrderToDelete(selectedOrder)}
            >
              Xoá đơn nháp
            </Button>
          ) : undefined
        }
      >
        {selectedOrder && (
          <div className="space-y-3.5 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngày đặt hàng:</span>
                <strong className="text-slate-900">
                  {new Date(selectedOrder.ngayDat).toLocaleDateString('vi-VN')}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Người nhận:</span>
                <strong className="text-slate-900">
                  {selectedOrder.nguoiNhan || 'Khách hàng Seajong'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <strong className="font-mono text-slate-900">
                  {selectedOrder.soDienThoai || '—'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tổng giá trị đơn:</span>
                <strong className="text-rose-600 text-sm">
                  {formatVND(selectedOrder.tongTien)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Đã trả trước / Thanh toán:</span>
                <strong className="text-emerald-700">
                  {formatVND(selectedOrder.daThanhToan)}
                </strong>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-800 mb-2">Danh sách sản phẩm đặt mua</h5>
              <div className="space-y-2">
                {(selectedOrder.saleOrderItems || []).map((item, i) => (
                  <div
                    key={item.id || i}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate">{item.tenHang}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatVND(item.donGia)} × {item.soLuong} {item.donViTinh || 'Bộ'}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 shrink-0">
                      {formatVND(item.thanhTien)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => {
                  const ordCode = selectedOrder.code;
                  setSelectedOrder(null);
                  setViewTab('support');
                  handleOpenCreateSupportTicket(`Yêu cầu hỗ trợ đơn hàng ${ordCode}`, ordCode);
                }}
              >
                Gửi yêu cầu hỗ trợ / Bảo hành đơn này
              </Button>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── CHI TIẾT CHỨNG NHẬN BẢO HÀNH ĐIỆN TỬ (400px) ── */}
      <Offcanvas
        isOpen={Boolean(selectedWarranty)}
        onClose={() => setSelectedWarranty(null)}
        title="Chứng nhận Bảo hành Điện tử"
        description={selectedWarranty ? selectedWarranty.warrantyCode : undefined}
        icon={<ShieldCheck size={18} />}
        width="400px"
      >
        {selectedWarranty && (
          <div className="space-y-3.5 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  SEAJONG OFFICIAL WARRANTY
                </span>
                <span className="font-mono text-xs font-bold">{selectedWarranty.warrantyCode}</span>
              </div>
              <div className="font-black text-base leading-snug pt-1">
                {selectedWarranty.productName}
              </div>
              <div className="text-blue-100 text-[11px] flex items-center justify-between pt-2 border-t border-white/15">
                <span>Chủ sở hữu: {customer?.name || user?.name}</span>
                <span>Hiệu lực: 60 tháng</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn mua hàng:</span>
                <strong className="font-mono text-slate-900">{selectedWarranty.orderCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày kích hoạt:</span>
                <strong className="text-slate-900">
                  {new Date(selectedWarranty.activatedDate).toLocaleDateString('vi-VN')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày hết hạn bảo hành:</span>
                <strong className="text-emerald-700">
                  {new Date(selectedWarranty.expiryDate).toLocaleDateString('vi-VN')}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── FORM GỬI YÊU CẦU HỖ TRỢ & CSKH (400px) ── */}
      <Offcanvas
        isOpen={showSupportFormDrawer}
        onClose={() => setShowSupportFormDrawer(false)}
        title="Gửi yêu cầu Bảo hành & CSKH"
        icon={<Headset size={18} />}
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={handleSaveSupportTicket}
              disabled={isSavingSupportTicket}
            >
              {isSavingSupportTicket ? 'Đang gửi...' : 'Gửi tới CSKH Seajong'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col h-full gap-3 text-xs">
          <Select
            label="Phân loại yêu cầu"
            value={supportFormType}
            onChange={(e) => setSupportFormType(e.target.value)}
            options={[
              { value: 'Bảo hành & Linh kiện', label: 'Bảo hành sản phẩm & Linh kiện' },
              { value: 'Kỹ thuật & Lắp đặt', label: 'Hỗ trợ kỹ thuật & Hướng dẫn lắp đặt' },
              { value: 'Đơn hàng & Giao vận', label: 'Tra cứu đơn hàng & Giao nhận' },
              { value: 'Góp ý dịch vụ', label: 'Tư vấn sản phẩm & Góp ý dịch vụ' },
            ]}
          />

          <Select
            label="Đơn mua hàng liên quan"
            value={supportFormOrderCode}
            onChange={(e) => setSupportFormOrderCode(e.target.value)}
            options={[
              { value: '', label: '-- Chọn đơn hàng --' },
              ...orders.map((o) => ({ value: o.code, label: o.code })),
            ]}
          />

          <Input
            label="Tiêu đề yêu cầu"
            required
            value={supportFormTitle}
            onChange={(e) => setSupportFormTitle(e.target.value)}
            placeholder="VD: Yêu cầu kích hoạt bảo hành / Tư vấn lắp đặt sen cây..."
          />

          <div className="flex-1 flex flex-col min-h-0">
            <label className="form-label block">Nội dung chi tiết</label>
            <textarea
              value={supportFormContent}
              onChange={(e) => setSupportFormContent(e.target.value)}
              placeholder="Mô tả chi tiết yêu cầu hỗ trợ, số điện thoại liên hệ..."
              className="flex-1 w-full min-h-[120px] px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-blue-600 resize-none"
            />
          </div>
        </div>
      </Offcanvas>

      {/* ── CHI TIẾT YÊU CẦU HỖ TRỢ (400px) ── */}
      <Offcanvas
        isOpen={Boolean(selectedSupportTicket)}
        onClose={() => setSelectedSupportTicket(null)}
        title="Chi tiết yêu cầu hỗ trợ"
        description={selectedSupportTicket ? `#${selectedSupportTicket.code}` : undefined}
        icon={<Headset size={18} />}
        width="400px"
      >
        {selectedSupportTicket && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Phân loại:</span>
                <strong className="text-slate-900">{selectedSupportTicket.type}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày gửi:</span>
                <strong className="text-slate-900">
                  {new Date(selectedSupportTicket.createdAt).toLocaleDateString('vi-VN')}
                </strong>
              </div>
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm mb-1">
                {selectedSupportTicket.title}
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedSupportTicket.content || 'Không có mô tả chi tiết.'}
              </div>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── XÁC NHẬN XOÁ ĐƠN NHÁP ── */}
      <ConfirmDialog
        isOpen={Boolean(orderToDelete)}
        title="Xác nhận xoá đơn hàng nháp"
        variant="danger"
        message={
          orderToDelete ? `Bạn có chắc chắn muốn xoá đơn hàng nháp #${orderToDelete.code}?` : ''
        }
        confirmText="Xoá đơn nháp"
        cancelText="Huỷ"
        isLoading={isDeletingOrder}
        onConfirm={handleConfirmDeleteOrder}
        onCancel={() => setOrderToDelete(null)}
        onClose={() => setOrderToDelete(null)}
      />
    </StepPage>
  );
};
export default CustomerPortalPage;
