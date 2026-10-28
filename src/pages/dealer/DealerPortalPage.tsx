import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDepartment } from '../../context/DepartmentContext';
import { StandardPage } from '../../components/layout/StandardPage';
import { DealerOverviewView } from './DealerOverviewView';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
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
  Eye,
  Building,
  InfoCircle
} from 'react-bootstrap-icons';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  excerpt?: string;
  slug?: string;
  categories?: { id: number; name: string }[];
}

interface CartItem {
  productId: number;
  tenHang: string;
  donGia: number;
  soLuong: number;
  ghiChu?: string;
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
  saleOrderItems?: {
    id: string;
    tenHang: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
    ghiChu?: string | null;
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
    hanMucCongNo: number;
    doanhSoCamKet: number;
    thuongDoanhSoNam?: string | null;
    thuongThanhToan?: string | null;
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
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState<{ open: boolean; code?: string; total?: number }>({ open: false });

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // Phone update modal / prompt
  const [showPhonePrompt, setShowPhonePrompt] = useState<boolean>(false);
  const [inputPhone, setInputPhone] = useState<string>('');
  const [savingPhone, setSavingPhone] = useState<boolean>(false);
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [searchOrder, setSearchOrder] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPage, setOrderPage] = useState<number>(1);
  const [orderPageSize, setOrderPageSize] = useState<number>(10);

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

  // 3. Fetch products
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/products', {
        headers: {
          'Content-Type': 'application/json',
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

  useEffect(() => {
    fetchOverview();
    fetchOrders();
    fetchProducts();
  }, []);

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
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id ? { ...item, soLuong: item.soLuong + qty } : item
        );
      }
      return [...prev, {
        productId: product.id,
        tenHang: product.name,
        donGia: product.price,
        soLuong: qty
      }];
    });
  };

  // Remove from cart
  const handleRemoveFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Update cart item quantity
  const handleUpdateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, soLuong: qty } : item));
  };

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.donGia * item.soLuong), 0);
  }, [cart]);

  // Submit order to Sales department
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm vào đơn hàng');
      return;
    }
    setIsSubmittingOrder(true);
    try {
      const token = localStorage.getItem('seajong_token');
      const res = await fetch('/api/dealer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          items: cart,
          ghiChu: orderNote,
          ngayGiao: deliveryDate || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCart([]);
        setOrderNote('');
        setDeliveryDate('');
        setOrderSuccessModal({
          open: true,
          code: data.order?.code,
          total: data.order?.tongTien
        });
        await fetchOrders();
        await fetchOverview();
      } else {
        alert(data.message || 'Lỗi khi gửi đơn hàng');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ khi gửi đơn: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Format currency
  const formatVND = (val?: number | null) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!searchProduct.trim()) return products;
    const q = searchProduct.toLowerCase().trim();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, searchProduct]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const matchSearch = !searchOrder.trim() ||
        ord.code.toLowerCase().includes(searchOrder.toLowerCase().trim()) ||
        (ord.ghiChu && ord.ghiChu.toLowerCase().includes(searchOrder.toLowerCase().trim()));
      const matchStatus = orderStatusFilter === 'all' || ord.trangThai === orderStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchOrder, orderStatusFilter]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredOrders.slice(start, start + orderPageSize);
  }, [filteredOrders, orderPage, orderPageSize]);

  // Current view tab
  const currentTab = activeMenuKey || 'overview';

  return (
    <StandardPage
      title="Hệ thống đại lý và nhà phân phối"
      icon="bi-shop"
      color="blue"
      description="Cổng thông tin hoạt động, tra cứu công nợ và tự động lên đơn hàng gửi Bộ phận Kinh doanh"
      badge={overviewData?.customer?.code || user?.customer?.code || 'ĐẠI LÝ SEAJONG'}
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

      {/* TAB: ĐƠN HÀNG (QUẢN LÝ VÀ ĐẶT HÀNG TRỰC TUYẾN) */}
      {(currentTab === 'orders' || currentTab === 'order-now') && (
        orderSubTab === 'create' || currentTab === 'order-now' ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 space-y-2">
            {/* Thanh điều hướng quay lại danh sách đơn */}
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setOrderSubTab('list');
                  setActiveMenuKey('orders');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>← Quay lại danh sách đơn hàng</span>
              </button>
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                Chọn sản phẩm từ danh mục bên dưới để thêm vào đơn hàng gửi Bộ phận Kinh doanh
              </div>
            </div>

            {/* Catalog Sản phẩm & Giỏ hàng */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-3 min-h-0">
              {/* Cột trái: Catalog Sản phẩm Seajong */}
              <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <BoxSeam className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Danh mục sản phẩm ({filteredProducts.length})
                    </span>
                  </div>
                  <div className="relative w-64 max-w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      placeholder="Tìm tên sản phẩm Seajong..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredProducts.map((p) => {
                    const inCart = cart.find(c => c.productId === p.id);
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">
                              {p.name}
                            </h5>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {p.categories?.[0]?.name || 'Thiết bị phòng tắm cao cấp'}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block leading-none">Giá bán</span>
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
                  })}
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
                      <div key={item.productId} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 truncate">{item.tenHang}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {formatVND(item.donGia)} × {item.soLuong}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sky-800">{formatVND(item.donGia * item.soLuong)}</div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="text-rose-500 hover:text-rose-700 text-[11px] mt-0.5 cursor-pointer"
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Thông tin đơn & Tổng kết */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ngày mong muốn nhận hàng
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Tổng giá trị đơn:</span>
                    <span className="font-black text-sky-800 text-base">{formatVND(cartTotal)}</span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    disabled={cart.length === 0 || isSubmittingOrder}
                    onClick={handleSubmitOrder}
                    className="w-full justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingOrder ? 'Đang gửi...' : 'Gửi đơn cho Kinh doanh duyệt'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-2xs">
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
                  options: [
                    { label: 'Tất cả trạng thái', value: 'all' },
                    { label: 'Chờ duyệt', value: 'pending' },
                    { label: 'Đang giao hàng', value: 'approved' },
                    { label: 'Hoàn thành / Đã nhận', value: 'completed' },
                  ],
                },
              ]}
              rightActions={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CartPlus className="w-4 h-4" />}
                  onClick={() => setOrderSubTab('create')}
                >
                  Lên đơn hàng mới
                </Button>
              }
              onRefresh={fetchOrders}
            />

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <FullWidthTable loading={loading} emptyText="Không tìm thấy đơn hàng nào">
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
                      <th className="py-2.5 px-3.5 text-center">Kế toán duyệt</th>
                      <th className="py-2.5 px-3.5 text-center">Xem</th>
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
                            ord.trangThai === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.trangThai === 'completed' ? 'Hoàn thành' : ord.trangThai === 'approved' ? 'Đã duyệt / Đang giao' : 'Chờ kinh doanh duyệt'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            ord.keToanDuyet === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ord.keToanDuyet === 'approved' ? 'Đã duyệt' : 'Chờ kế toán'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            className="p-1 text-slate-500 hover:text-sky-600 rounded hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
        )
      )}

      {/* TAB: CÔNG NỢ VÀ ĐIỂM THƯỞNG */}
      {currentTab === 'debts' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Hạn mức công nợ */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold uppercase">Hạn mức được duyệt</span>
              <div className="text-xl font-black text-slate-900 mt-2">
                {formatVND(overviewData?.metrics?.hanMucCongNo)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mua hàng công nợ gối đầu được phê duyệt.
              </p>
            </div>

            {/* Card 2: Dư nợ cần thanh toán */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold uppercase">Dư nợ cần thanh toán</span>
              <div className="text-xl font-black text-rose-600 mt-2">
                {formatVND(overviewData?.metrics?.currentDebt)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Các khoản mua hàng ghi nhận công nợ.
              </p>
            </div>

            {/* Card 3: Doanh số cam kết năm */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold uppercase">Doanh số cam kết năm</span>
              <div className="text-xl font-black text-sky-700 mt-2">
                {formatVND(overviewData?.metrics?.doanhSoCamKet)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Căn cứ xét thưởng cuối năm theo hợp đồng.
              </p>
            </div>

            {/* Card 4: Điểm thưởng tích lũy */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-2xs">
              <span className="text-xs text-amber-800 font-semibold uppercase flex items-center gap-1.5">
                <CashCoin className="w-3.5 h-3.5 text-amber-600" />
                <span>Điểm thưởng tích lũy</span>
              </span>
              <div className="text-xl font-black text-amber-900 mt-2">
                {Math.max(150, Math.floor((overviewData?.metrics?.totalOrderValue || 0) / 1000000))} điểm
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Khấu trừ vào đơn kế tiếp hoặc nhận quà tri ân.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <CashCoin className="w-4 h-4 text-emerald-600" />
              <span>Chính sách thưởng & Quyền lợi Đại lý</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <strong className="text-emerald-900">Thưởng thanh toán đúng hạn:</strong>
                <p className="text-emerald-800 mt-1 text-[11.5px]">
                  {overviewData?.customer?.thuongThanhToan || 'Chiết khấu bổ sung 1.5% đối với các đơn hàng thanh toán trong vòng 7 ngày kể từ khi nhận hàng.'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                <strong className="text-blue-900">Thưởng đạt doanh số năm:</strong>
                <p className="text-blue-800 mt-1 text-[11.5px]">
                  {overviewData?.customer?.thuongDoanhSoNam || 'Thưởng nóng 2% tổng doanh thu đạt được khi đại lý hoàn thành tối thiểu 100% chỉ tiêu cam kết năm.'}
                </p>
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

      {/* ── MODAL CHI TIẾT ĐƠN HÀNG ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BoxSeam className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Chi tiết đơn hàng #{selectedOrder.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold px-2 py-1"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>Ngày đặt: <strong className="text-slate-900">{new Date(selectedOrder.ngayDat).toLocaleDateString('vi-VN')}</strong></div>
                <div>Trạng thái: <strong className="text-sky-700">{selectedOrder.trangThai === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}</strong></div>
                <div className="col-span-2">Ghi chú: <span className="text-slate-800">{selectedOrder.ghiChu || 'Không có'}</span></div>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 mb-2">Danh sách sản phẩm trong đơn</h5>
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
                      {selectedOrder.saleOrderItems && selectedOrder.saleOrderItems.length > 0 ? (
                        selectedOrder.saleOrderItems.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-medium text-slate-900">{item.tenHang}</td>
                            <td className="py-2 px-2 text-center font-bold text-slate-700">{item.soLuong}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatVND(item.donGia)}</td>
                            <td className="py-2 px-3 text-right font-bold text-sky-800">{formatVND(item.thanhTien)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-slate-400">Không có dữ liệu mặt hàng</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700">Tổng cộng:</td>
                        <td className="py-2.5 px-3 text-right text-sky-800 text-sm">{formatVND(selectedOrder.tongTien)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ĐẶT HÀNG THÀNH CÔNG ── */}
      {orderSuccessModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center animate-scale-up space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <CheckCircle />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Đã gửi đơn hàng thành công!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Đơn hàng mã <strong className="text-sky-700 font-mono font-bold">#{orderSuccessModal.code}</strong> trị giá{' '}
                <strong className="text-emerald-700">{formatVND(orderSuccessModal.total)}</strong> đã được gửi tới Bộ phận Kinh doanh Seajong để tiến hành phê duyệt và chuẩn bị hàng.
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
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 text-sky-800">
              <Telephone className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Xác nhận Số điện thoại Đại lý
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chào mừng <strong>{overviewData?.customer?.name || user?.name}</strong>! Vui lòng nhập số điện thoại liên hệ chính thức của Quý đại lý để từ lần sau có thể đăng nhập trực tiếp bằng Số điện thoại và nhận thông báo giao vận.
            </p>

            <form onSubmit={handleSavePhone} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại đại lý:
                </label>
                <input
                  type="tel"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="VD: 0987654321"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-bold"
                  autoFocus
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
    </StandardPage>
  );
};
