import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BoxSeam,
  BarChartSteps,
  PieChartFill,
  GraphUpArrow,
} from 'react-bootstrap-icons';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { DatePicker } from '../../components/common/DatePicker';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination, getStoredPageSize } from '../../components/common/Pagination';

export interface SalesReportPageProps {
  onShowToast?: (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => void;
}

const ROMAN_QUARTERS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
};

type ProductCategoryKey = 'tbvs' | 'tbnb' | 'linhkien' | 'khac';

interface CategoryMeta {
  key: ProductCategoryKey;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const PRODUCT_CATEGORIES: Record<ProductCategoryKey, CategoryMeta> = {
  tbvs: {
    key: 'tbvs',
    name: 'Thiết bị vệ sinh',
    color: '#0284c7',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
  },
  tbnb: {
    key: 'tbnb',
    name: 'Thiết bị nhà bếp',
    color: '#10b981',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  linhkien: {
    key: 'linhkien',
    name: 'Linh kiện',
    color: '#8b5cf6',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
  },
  khac: {
    key: 'khac',
    name: 'Loại khác',
    color: '#f59e0b',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
};

const CATEGORY_ORDER: ProductCategoryKey[] = ['tbvs', 'tbnb', 'linhkien', 'khac'];

interface RawSaleOrderItem {
  id: string;
  saleOrderId?: string;
  inventoryItemId?: string | null;
  tenHang: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  inventoryItem?: {
    id: string;
    code?: string;
    tenHang?: string;
    donVi?: string;
    loai?: string;
  } | null;
}

interface RawSaleOrder {
  id: string;
  code: string;
  ngayDat?: string | number | Date;
  createdAt?: string | number | Date;
  tongTien?: number;
  trangThai?: string;
  ghiChu?: string;
  nguoiNhan?: string;
  customer?: {
    id?: string | null;
    code?: string;
    name?: string;
    nhom?: string;
  } | null;
  saleOrderItems?: RawSaleOrderItem[];
}

interface AggregatedProductRow {
  key: string;
  code: string;
  name: string;
  unit: string;
  categoryKey: ProductCategoryKey;
  categoryName: string;
  channel: 'seajong' | 'oem' | 'mixed';
  seajongValue: number;
  oemValue: number;
  totalQuantity: number;
  totalValue: number;
  avgPrice: number;
  ordersCount: number;
}

function classifyProductCategory(nameStr: string, skuStr = ''): ProductCategoryKey {
  const n = ` ${nameStr} ${skuStr} `.toLowerCase();
  if (
    n.includes('bếp') ||
    n.includes('rửa bát') ||
    n.includes('chậu rửa') ||
    n.includes('hút mùi') ||
    n.includes('k-30') ||
    n.includes('k-10')
  ) {
    return 'tbnb';
  }
  if (
    n.includes('linh kiện') ||
    n.includes('phụ kiện') ||
    n.includes('thoát sàn') ||
    n.includes('ga thoát') ||
    n.includes('xi phông') ||
    n.includes('xiphong') ||
    n.includes('dây cấp') ||
    n.includes('dây sen') ||
    n.includes('bát sen') ||
    n.includes('tay sen') ||
    n.includes('cần sen') ||
    n.includes('chân sen') ||
    n.includes('thân sen') ||
    n.includes('gương') ||
    n.includes('vắt khăn') ||
    n.includes('lô giấy') ||
    n.includes('hộp giấy') ||
    n.includes('xịt') ||
    n.includes('kệ ') ||
    n.includes('móc') ||
    n.includes('thanh vắt') ||
    n.includes('van ') ||
    n.includes('ruột') ||
    n.includes('óc sen') ||
    n.includes(' ốc ') ||
    n.includes(' ốp ')
  ) {
    return 'linhkien';
  }
  if (
    n.includes('sen') ||
    n.includes('tắm') ||
    n.includes('bồn cầu') ||
    n.includes('cầu') ||
    n.includes('lavabo') ||
    n.includes('tiểu') ||
    n.includes('sứ') ||
    n.includes('tủ chậu') ||
    n.includes('vòi')
  ) {
    return 'tbvs';
  }
  return 'khac';
}

function classifyChannelFromText(
  itemName = '',
  order: RawSaleOrder | null = null
): 'seajong' | 'oem' {
  const combined = `${itemName} ${order?.customer?.name || ''} ${order?.nguoiNhan || ''} ${
    order?.code || ''
  } ${order?.ghiChu || ''}`.toLowerCase();

  if (
    /voriger|oem|flux|ruby|wando|kossi|kanza|boss man|amz|joger|rangos|lucy|architorino|benza|duẩn giáp|tuấn thanh hoá|anh quân|anh hoàn|xuân trung|dbh-20261007-02|err-20260928-04|vãng lai|khách ngoài|b2b|dự án|gia công/.test(
      combined
    )
  ) {
    return 'oem';
  }
  return 'seajong';
}

function parseOrderDateParts(rawVal: string | number | Date | undefined): {
  year: number;
  month: number;
  quarter: number;
  isoDate: string;
  ym: string;
} {
  const fallback = new Date();
  let d: Date;
  if (rawVal instanceof Date) {
    d = rawVal;
  } else if (typeof rawVal === 'number') {
    d = new Date(rawVal);
  } else if (typeof rawVal === 'string' && rawVal.trim()) {
    const num = Number(rawVal);
    d = !Number.isNaN(num) && num > 1000000000 ? new Date(num) : new Date(rawVal);
  } else {
    d = fallback;
  }

  if (Number.isNaN(d.getTime())) {
    d = fallback;
  }

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const q = Math.ceil(m / 3);
  const mm = String(m).padStart(2, '0');
  const dd = String(day).padStart(2, '0');

  return {
    year: y,
    month: m,
    quarter: q,
    isoDate: `${y}-${mm}-${dd}`,
    ym: `${y}-${mm}`,
  };
}

function formatShortMoney(val: number): string {
  if (val >= 1e9) {
    return `${(val / 1e9).toLocaleString('vi-VN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} tỷ`;
  }
  if (val >= 1e6) {
    return `${(val / 1e6).toLocaleString('vi-VN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} tr`;
  }
  if (val > 0) {
    return `${Math.round(val).toLocaleString('vi-VN')} đ`;
  }
  return '0 đ';
}

export const SalesReportPage: React.FC<SalesReportPageProps> = () => {
  const now = new Date();
  const CURRENT_YEAR = now.getFullYear();
  const CURRENT_MONTH = now.getMonth() + 1;
  const CURRENT_DAY = now.getDate();
  const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3);
  const todayIso = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}-${String(
    CURRENT_DAY
  ).padStart(2, '0')}`;

  // 1. Thương hiệu: Tất cả, Seajong hoặc OEM
  const [brand, setBrand] = useState<'all' | 'seajong' | 'oem'>('all');

  // 2. Hộp tìm kiếm
  const [searchValue, setSearchValue] = useState('');

  // 3. Lọc theo Năm, Quý, Tháng, Ngày (Mặc định chọn thời điểm / ngày hôm nay)
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<number>(CURRENT_QUARTER);
  const [month, setMonth] = useState<number>(CURRENT_MONTH);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Kỳ báo cáo đang kích hoạt lọc bảng & cơ cấu sản phẩm ('year' | 'quarter' | 'month' | 'day')
  const [periodMode, setPeriodMode] = useState<'year' | 'quarter' | 'month' | 'day'>('year');

  // Dữ liệu đơn bán hàng từ API
  const [orders, setOrders] = useState<RawSaleOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Phân trang cho bảng danh sách hàng hoá đã bán
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() =>
    getStoredPageSize(10, 'seajong_sales_report_page_size')
  );

  // Hover state cho 2 biểu đồ bên phải
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredCatKey, setHoveredCatKey] = useState<ProductCategoryKey | null>(null);

  // Tải dữ liệu thực tế từ /api/sales/orders
  useEffect(() => {
    let isMounted = true;
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const ordersRes = await fetch('/api/sales/orders').then((r) =>
          r.ok ? r.json() : null
        );
        if (!isMounted) return;
        if (ordersRes && Array.isArray(ordersRes.orders)) {
          setOrders(ordersRes.orders);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu Báo cáo bán hàng:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReportData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Điều kiện khoá nút Next khi tới thời điểm hiện tại
  const isCurrentYear = year >= CURRENT_YEAR;
  const isCurrentQuarter =
    year > CURRENT_YEAR || (year === CURRENT_YEAR && quarter >= CURRENT_QUARTER);
  const isCurrentMonth =
    year > CURRENT_YEAR || (year === CURRENT_YEAR && month >= CURRENT_MONTH);

  // Xử lý chuyển Năm
  const handlePrevYear = () => {
    setYear((y) => y - 1);
    setPeriodMode('year');
  };

  const handleNextYear = () => {
    if (isCurrentYear) return;
    const nextYear = year + 1;
    setYear(nextYear);
    if (nextYear === CURRENT_YEAR) {
      if (quarter > CURRENT_QUARTER) setQuarter(CURRENT_QUARTER);
      if (month > CURRENT_MONTH) setMonth(CURRENT_MONTH);
    }
    setPeriodMode('year');
  };

  // Xử lý chuyển Quý
  const handlePrevQuarter = () => {
    const nextQ = quarter === 1 ? 4 : quarter - 1;
    const nextY = quarter === 1 ? year - 1 : year;
    setQuarter(nextQ);
    setYear(nextY);
    setMonth(nextQ * 3);
    setPeriodMode('quarter');
  };

  const handleNextQuarter = () => {
    if (isCurrentQuarter) return;
    const nextQ = quarter === 4 ? 1 : quarter + 1;
    const nextY = quarter === 4 ? year + 1 : year;
    setQuarter(nextQ);
    setYear(nextY);
    const maxM = nextY === CURRENT_YEAR ? Math.min(nextQ * 3, CURRENT_MONTH) : nextQ * 3;
    setMonth(maxM);
    setPeriodMode('quarter');
  };

  // Xử lý chuyển Tháng
  const handlePrevMonth = () => {
    const nextM = month === 1 ? 12 : month - 1;
    const nextY = month === 1 ? year - 1 : year;
    setMonth(nextM);
    setYear(nextY);
    setQuarter(Math.ceil(nextM / 3));
    setPeriodMode('month');
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    setMonth(nextM);
    setYear(nextY);
    setQuarter(Math.ceil(nextM / 3));
    setPeriodMode('month');
  };

  // Xử lý chọn Ngày
  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        if (!Number.isNaN(y) && !Number.isNaN(m)) {
          setYear(y);
          setMonth(m);
          setQuarter(Math.ceil(m / 3));
        }
      }
      setPeriodMode('day');
    } else {
      setPeriodMode('month');
    }
  };

  // Reset trang về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [brand, searchValue, year, quarter, month, selectedDate, periodMode]);

  // Lọc đơn hàng theo kỳ báo cáo đang chọn
  const activeOrdersInPeriod = useMemo(() => {
    const validOrders = orders.filter(
      (o) => String(o.trangThai || '').toLowerCase() !== 'cancelled'
    );

    return validOrders.filter((o) => {
      const dt = parseOrderDateParts(o.ngayDat || o.createdAt);
      if (periodMode === 'day' && selectedDate) {
        return dt.isoDate === selectedDate;
      }
      if (periodMode === 'month') {
        return dt.year === year && dt.month === month;
      }
      if (periodMode === 'quarter') {
        return dt.year === year && dt.quarter === quarter;
      }
      return dt.year === year;
    });
  }, [orders, periodMode, year, quarter, month, selectedDate]);

  // Tổng hợp danh sách hàng hoá đã bán theo kỳ báo cáo (Sắp xếp từ cao đến thấp theo giá trị bán cộng dồn)
  const { aggregatedProducts, categoryBreakdown, totalPeriodSalesValue, totalPeriodQuantity } =
    useMemo(() => {
      const productMap = new Map<
        string,
        {
          key: string;
          code: string;
          name: string;
          unit: string;
          categoryKey: ProductCategoryKey;
          seajongValue: number;
          oemValue: number;
          totalQuantity: number;
          totalValue: number;
          orderIds: Set<string>;
        }
      >();

      const catTotals: Record<
        ProductCategoryKey,
        { value: number; quantity: number; skuSet: Set<string>; orderSet: Set<string> }
      > = {
        tbvs: { value: 0, quantity: 0, skuSet: new Set(), orderSet: new Set() },
        tbnb: { value: 0, quantity: 0, skuSet: new Set(), orderSet: new Set() },
        linhkien: { value: 0, quantity: 0, skuSet: new Set(), orderSet: new Set() },
        khac: { value: 0, quantity: 0, skuSet: new Set(), orderSet: new Set() },
      };

      const keyword = searchValue.trim().toLowerCase();

      for (const order of activeOrdersInPeriod) {
        const items = Array.isArray(order.saleOrderItems) ? order.saleOrderItems : [];
        for (const item of items) {
          const itemName = String(
            item.tenHang || item.inventoryItem?.tenHang || 'Sản phẩm Seajong'
          ).trim();
          const itemCode = String(item.inventoryItem?.code || '').trim();
          const itemUnit = String(
            item.donViTinh || item.inventoryItem?.donVi || 'Bộ'
          ).trim();
          const qty = Number(item.soLuong) || 0;
          const val =
            Number(item.thanhTien) ||
            (Number(item.soLuong) || 1) * (Number(item.donGia) || 0);

          if (val <= 0 && qty <= 0) continue;

          const itemChannel = classifyChannelFromText(itemName, order);
          if (brand === 'seajong' && itemChannel !== 'seajong') continue;
          if (brand === 'oem' && itemChannel !== 'oem') continue;

          const catKey = classifyProductCategory(itemName, itemCode);
          const catName = PRODUCT_CATEGORIES[catKey].name;

          if (keyword) {
            const haystack = `${itemName} ${itemCode} ${catName} ${order.code || ''} ${
              order.customer?.name || ''
            }`.toLowerCase();
            if (!haystack.includes(keyword)) continue;
          }

          const normKey = `${itemCode ? itemCode.toUpperCase() : ''}::${itemName.toLowerCase()}`;

          // Cộng dồn cơ cấu sản phẩm
          catTotals[catKey].value += val;
          catTotals[catKey].quantity += qty;
          catTotals[catKey].skuSet.add(normKey);
          if (order.id) catTotals[catKey].orderSet.add(order.id);

          // Cộng dồn theo loại hàng hoá
          const existing = productMap.get(normKey);
          if (existing) {
            existing.totalQuantity += qty;
            existing.totalValue += val;
            if (itemChannel === 'oem') {
              existing.oemValue += val;
            } else {
              existing.seajongValue += val;
            }
            if (order.id) existing.orderIds.add(order.id);
            if (!existing.code && itemCode) existing.code = itemCode;
          } else {
            const orderIds = new Set<string>();
            if (order.id) orderIds.add(order.id);
            productMap.set(normKey, {
              key: normKey,
              code: itemCode,
              name: itemName,
              unit: itemUnit,
              categoryKey: catKey,
              seajongValue: itemChannel === 'seajong' ? val : 0,
              oemValue: itemChannel === 'oem' ? val : 0,
              totalQuantity: qty,
              totalValue: val,
              orderIds,
            });
          }
        }
      }

      // Chuyển sang mảng và sắp xếp từ cao đến thấp theo giá trị bán hàng cộng dồn
      const sortedRows: AggregatedProductRow[] = Array.from(productMap.values())
        .map((r) => {
          let ch: 'seajong' | 'oem' | 'mixed' = 'seajong';
          if (r.seajongValue > 0 && r.oemValue > 0) ch = 'mixed';
          else if (r.oemValue > 0) ch = 'oem';

          return {
            key: r.key,
            code: r.code,
            name: r.name,
            unit: r.unit,
            categoryKey: r.categoryKey,
            categoryName: PRODUCT_CATEGORIES[r.categoryKey].name,
            channel: ch,
            seajongValue: r.seajongValue,
            oemValue: r.oemValue,
            totalQuantity: r.totalQuantity,
            totalValue: r.totalValue,
            avgPrice: r.totalQuantity > 0 ? Math.round(r.totalValue / r.totalQuantity) : 0,
            ordersCount: r.orderIds.size,
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);

      const totalVal = sortedRows.reduce((s, r) => s + r.totalValue, 0);
      const totalQty = sortedRows.reduce((s, r) => s + r.totalQuantity, 0);

      const catList = CATEGORY_ORDER.map((k) => {
        const meta = PRODUCT_CATEGORIES[k];
        const raw = catTotals[k];
        const share = totalVal > 0 ? Number(((raw.value / totalVal) * 100).toFixed(1)) : 0;
        return {
          ...meta,
          value: raw.value,
          quantity: raw.quantity,
          skuCount: raw.skuSet.size,
          ordersCount: raw.orderSet.size,
          share,
        };
      });

      return {
        aggregatedProducts: sortedRows,
        categoryBreakdown: catList,
        totalPeriodSalesValue: totalVal,
        totalPeriodQuantity: totalQty,
      };
    }, [activeOrdersInPeriod, brand, searchValue]);

  // Dữ liệu biểu đồ doanh số bán hàng 6 tháng gần nhất:
  // - 2 cột tương ứng với Seajong và OEM
  // - Đường giá trị trung bình đơn hàng = Tổng giá trị các đơn hàng trong tháng / Số đơn hàng trong tháng
  const sixMonthsChartData = useMemo(() => {
    const endMonth = Math.min(Math.max(month, 6), 12);
    const startMonth = Math.max(1, endMonth - 5);

    const result: {
      monthNum: number;
      label: string;
      fullLabel: string;
      seajongVnd: number;
      oemVnd: number;
      totalVnd: number;
      ordersCount: number;
      avgOrderValueVnd: number;
    }[] = [];

    for (let m = startMonth; m <= endMonth; m++) {
      const mmStr = String(m).padStart(2, '0');
      const ymTarget = `${year}-${mmStr}`;

      let monthSeajongVnd = 0;
      let monthOemVnd = 0;
      let monthOrdersCount = 0;

      for (const o of orders) {
        if (String(o.trangThai || '').toLowerCase() === 'cancelled') continue;
        const dt = parseOrderDateParts(o.ngayDat || o.createdAt);
        if (dt.ym !== ymTarget) continue;

        const items = Array.isArray(o.saleOrderItems) ? o.saleOrderItems : [];
        let thisOrderSeajong = 0;
        let thisOrderOem = 0;

        if (items.length > 0) {
          for (const it of items) {
            const val =
              Number(it.thanhTien) ||
              (Number(it.soLuong) || 1) * (Number(it.donGia) || 0);
            const ch = classifyChannelFromText(it.tenHang || '', o);
            if (ch === 'oem') thisOrderOem += val;
            else thisOrderSeajong += val;
          }
        } else {
          const val = Number(o.tongTien) || 0;
          const ch = classifyChannelFromText('', o);
          if (ch === 'oem') thisOrderOem += val;
          else thisOrderSeajong += val;
        }

        if (brand === 'seajong') {
          if (thisOrderSeajong > 0) {
            monthSeajongVnd += thisOrderSeajong;
            monthOrdersCount += 1;
          }
        } else if (brand === 'oem') {
          if (thisOrderOem > 0) {
            monthOemVnd += thisOrderOem;
            monthOrdersCount += 1;
          }
        } else {
          if (thisOrderSeajong + thisOrderOem > 0) {
            monthSeajongVnd += thisOrderSeajong;
            monthOemVnd += thisOrderOem;
            monthOrdersCount += 1;
          }
        }
      }

      const totalVnd = monthSeajongVnd + monthOemVnd;
      // Giá trị trung bình 1 đơn hàng trong tháng = Tổng giá trị các đơn hàng trong tháng / Số đơn hàng trong tháng
      const avgOrderValueVnd =
        monthOrdersCount > 0 ? Math.round(totalVnd / monthOrdersCount) : 0;

      result.push({
        monthNum: m,
        label: `T${mmStr}/${String(year).slice(-2)}`,
        fullLabel: `Tháng ${mmStr}/${year}`,
        seajongVnd: monthSeajongVnd,
        oemVnd: monthOemVnd,
        totalVnd,
        ordersCount: monthOrdersCount,
        avgOrderValueVnd,
      });
    }

    return result;
  }, [orders, year, month, brand]);

  // Phân trang danh sách hàng hoá bên trái
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return aggregatedProducts.slice(startIdx, startIdx + pageSize);
  }, [aggregatedProducts, currentPage, pageSize]);

  // Nhãn mô tả kỳ báo cáo đang hiển thị
  const activePeriodLabel = useMemo(() => {
    if (periodMode === 'day' && selectedDate) {
      const [y, m, d] = selectedDate.split('-');
      return `Ngày ${d}/${m}/${y}`;
    }
    if (periodMode === 'month') {
      return `Tháng ${String(month).padStart(2, '0')}/${year}`;
    }
    if (periodMode === 'quarter') {
      return `Quý ${ROMAN_QUARTERS[quarter] || quarter}/${year}`;
    }
    return `Năm ${year}`;
  }, [periodMode, year, quarter, month, selectedDate]);

  // Tính toán thang đo cho biểu đồ 6 tháng gần nhất
  const chartScales = useMemo(() => {
    let maxBarVnd = 0;
    let maxAovVnd = 0;
    for (const item of sixMonthsChartData) {
      maxBarVnd = Math.max(maxBarVnd, item.seajongVnd, item.oemVnd);
      maxAovVnd = Math.max(maxAovVnd, item.avgOrderValueVnd);
    }
    const safeMaxBar = maxBarVnd > 0 ? maxBarVnd * 1.18 : 1000000000;
    // Giữ thang đo trục phải cân đối để đường giá trị TB đơn nằm hài hoà trong vùng biểu đồ
    const safeMaxAov = maxAovVnd > 0 ? Math.max(maxAovVnd * 1.85, 50000000) : 50000000;
    return { maxBar: safeMaxBar, maxAov: safeMaxAov };
  }, [sixMonthsChartData]);

  // Tính toán cung tròn SVG cho biểu đồ Donut cơ cấu sản phẩm
  const donutSegments = useMemo(() => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const total = categoryBreakdown.reduce((s, c) => s + c.value, 0);

    let accumulatedRatio = 0;
    return categoryBreakdown.map((cat) => {
      const ratio = total > 0 ? cat.value / total : 0;
      const strokeLength = ratio * circumference;
      const strokeOffset = -accumulatedRatio * circumference;
      accumulatedRatio += ratio;
      return {
        ...cat,
        radius,
        circumference,
        strokeDasharray: `${strokeLength} ${Math.max(0, circumference - strokeLength)}`,
        strokeDashoffset: strokeOffset,
      };
    });
  }, [categoryBreakdown]);

  const activeHoveredCategory = useMemo(() => {
    if (!hoveredCatKey) return null;
    return categoryBreakdown.find((c) => c.key === hoveredCatKey) || null;
  }, [hoveredCatKey, categoryBreakdown]);

  return (
    <div className="sales-report-page h-full">
      <StandardPage
        title="Báo cáo bán hàng"
        description="Tổng hợp dữ liệu doanh số, doanh thu và sản lượng bán hàng theo kỳ"
        icon="bi-bar-chart-line"
        color="blue"
        badge="BÁO CÁO"
        tickerContext="sales"
        cardPadding="p-0"
        useCard={true}
      >
        <div className="flex flex-col h-full flex-1 overflow-hidden">
          {/* Thanh công cụ TableToolbar trải đều full dòng */}
          <TableToolbar
            actionsBeforeSearch={
              /* Nhóm 3 Radio Button: Tất cả, Seajong, OEM */
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-700 h-[38px] shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="all"
                    checked={brand === 'all'}
                    onChange={() => setBrand('all')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span
                    className={
                      brand === 'all' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }
                  >
                    Tất cả
                  </span>
                </label>
                <div className="w-[1px] h-3.5 bg-slate-300" />
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="seajong"
                    checked={brand === 'seajong'}
                    onChange={() => setBrand('seajong')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span
                    className={
                      brand === 'seajong' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }
                  >
                    Seajong
                  </span>
                </label>
                <div className="w-[1px] h-3.5 bg-slate-300" />
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="brandFilter"
                    value="oem"
                    checked={brand === 'oem'}
                    onChange={() => setBrand('oem')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span
                    className={
                      brand === 'oem' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }
                  >
                    OEM
                  </span>
                </label>
              </div>
            }
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Tìm kiếm mã đơn, khách hàng, sản phẩm..."
            searchMinWidth="200px"
            actionsAfterSearch={
              <div className="flex items-center gap-2 shrink-0">
                {/* 1. Lọc theo Năm (YYYY) */}
                <div
                  className={`flex items-center justify-between rounded-lg h-[38px] px-1 text-[13px] font-medium shrink-0 min-w-[106px] transition-colors ${
                    periodMode === 'year'
                      ? 'bg-blue-50/70 border border-blue-300 text-blue-700'
                      : 'bg-slate-50 border border-slate-200/90 text-slate-700'
                  }`}
                  title="Lọc theo năm"
                >
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    title="Năm trước"
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodMode('year')}
                    className={`px-1.5 text-center font-semibold whitespace-nowrap select-none bg-transparent border-0 cursor-pointer ${
                      periodMode === 'year' ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    {year}
                  </button>
                  <button
                    type="button"
                    disabled={isCurrentYear}
                    onClick={handleNextYear}
                    title={isCurrentYear ? 'Đã ở năm hiện tại' : 'Năm sau'}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border-0 bg-transparent shrink-0 ${
                      isCurrentYear
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* 2. Lọc theo Quý (Quý I, II, III, IV) */}
                <div
                  className={`flex items-center justify-between rounded-lg h-[38px] px-1 text-[13px] font-medium shrink-0 min-w-[118px] transition-colors ${
                    periodMode === 'quarter'
                      ? 'bg-blue-50/70 border border-blue-300 text-blue-700'
                      : 'bg-slate-50 border border-slate-200/90 text-slate-700'
                  }`}
                  title="Lọc theo quý"
                >
                  <button
                    type="button"
                    onClick={handlePrevQuarter}
                    title="Quý trước"
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodMode('quarter')}
                    className={`px-1.5 text-center font-semibold whitespace-nowrap select-none bg-transparent border-0 cursor-pointer ${
                      periodMode === 'quarter' ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    Quý {ROMAN_QUARTERS[quarter] || quarter}
                  </button>
                  <button
                    type="button"
                    disabled={isCurrentQuarter}
                    onClick={handleNextQuarter}
                    title={isCurrentQuarter ? 'Đã ở quý hiện tại' : 'Quý sau'}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border-0 bg-transparent shrink-0 ${
                      isCurrentQuarter
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* 3. Lọc theo Tháng (Tháng 01 - Tháng 12) */}
                <div
                  className={`flex items-center justify-between rounded-lg h-[38px] px-1 text-[13px] font-medium shrink-0 min-w-[132px] transition-colors ${
                    periodMode === 'month'
                      ? 'bg-blue-50/70 border border-blue-300 text-blue-700'
                      : 'bg-slate-50 border border-slate-200/90 text-slate-700'
                  }`}
                  title="Lọc theo tháng"
                >
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Tháng trước"
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodMode('month')}
                    className={`px-1.5 text-center font-semibold whitespace-nowrap select-none bg-transparent border-0 cursor-pointer ${
                      periodMode === 'month' ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    Tháng {String(month).padStart(2, '0')}
                  </button>
                  <button
                    type="button"
                    disabled={isCurrentMonth}
                    onClick={handleNextMonth}
                    title={isCurrentMonth ? 'Đã ở tháng hiện tại' : 'Tháng sau'}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors border-0 bg-transparent shrink-0 ${
                      isCurrentMonth
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-200/80 active:bg-slate-300 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* 4. Lọc theo Ngày dùng DatePicker (Mặc định ngày hôm nay) */}
                <div style={{ width: '142px' }} className="shrink-0" title="Lọc theo ngày">
                  <DatePicker
                    value={selectedDate}
                    onChange={handleDateChange}
                    placeholder="Chọn ngày..."
                    clearable={true}
                    className="h-[38px] text-[13px]"
                  />
                </div>
              </div>
            }
            showMenu={false}
          />

          {/* Nội dung chính trong thẻ Card: Chia 2 cột (Trái: Bảng hàng hoá đã bán, Phải: 2 Biểu đồ) */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 border-t border-slate-200/80 bg-white overflow-hidden">
            {/* ════════════════════════════════════════════════════════════════════
                CỘT TRÁI (7/12): BẢNG DANH SÁCH HÀNG HOÁ ĐÃ BÁN THEO KỲ BÁO CÁO
                ════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 flex flex-col min-h-0 h-full border-b lg:border-b-0 lg:border-r border-slate-200/80 overflow-hidden">
              {/* Thanh tiêu đề nhỏ & tóm tắt số liệu bảng */}
              <div className="px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                    <BoxSeam size={14} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-800">
                      Danh sách hàng hoá đã bán
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                      {activePeriodLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[12px]">
                  <div className="text-slate-500">
                    Mặt hàng:{' '}
                    <span className="font-bold text-slate-800">
                      {aggregatedProducts.length.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="w-[1px] h-3.5 bg-slate-300" />
                  <div className="text-slate-500">
                    Sản lượng:{' '}
                    <span className="font-bold text-slate-800">
                      {totalPeriodQuantity.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="w-[1px] h-3.5 bg-slate-300" />
                  <div className="text-slate-500">
                    Tổng cộng dồn:{' '}
                    <span className="font-bold text-blue-600">
                      {totalPeriodSalesValue.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng FullWidthTable */}
              <FullWidthTable loading={loading} loadingText="Đang tổng hợp dữ liệu bán hàng...">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/95 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 pl-3.5 pr-2 w-11 text-center">#</th>
                      <th className="py-2.5 px-2.5">Loại hàng hoá / Sản phẩm</th>
                      <th className="py-2.5 px-2 w-16 text-center">ĐVT</th>
                      <th className="py-2.5 px-2.5 w-24 text-right">SL đã bán</th>
                      <th className="py-2.5 px-2.5 w-28 text-right">Đơn giá TB</th>
                      <th className="py-2.5 pl-2.5 pr-3.5 w-40 text-right">
                        Giá trị cộng dồn ↓
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[13px]">
                    {paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Không có hàng hoá phát sinh doanh số trong kỳ ({activePeriodLabel}).
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((row, idx) => {
                        const rank = (currentPage - 1) * pageSize + idx + 1;
                        const catMeta = PRODUCT_CATEGORIES[row.categoryKey];

                        return (
                          <tr
                            key={row.key}
                            className="hover:bg-blue-50/35 transition-colors group"
                          >
                            {/* Hạng */}
                            <td className="py-2.5 pl-3.5 pr-2 text-center align-middle">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                                  rank === 1
                                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                    : rank === 2
                                    ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                    : rank === 3
                                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200/80'
                                }`}
                              >
                                {rank}
                              </span>
                            </td>

                            {/* Loại hàng hoá / Sản phẩm */}
                            <td className="py-2.5 px-2.5 align-middle">
                              <div className="font-semibold text-slate-800 leading-snug line-clamp-1">
                                {row.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {row.code && (
                                  <span className="px-1.5 py-0.2 rounded text-[10.5px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {row.code}
                                  </span>
                                )}
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10.5px] font-medium border ${catMeta.bgClass} ${catMeta.textClass} ${catMeta.borderClass}`}
                                >
                                  {catMeta.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                    row.channel === 'oem'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : row.channel === 'mixed'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {row.channel === 'oem'
                                    ? 'OEM'
                                    : row.channel === 'mixed'
                                    ? 'Seajong & OEM'
                                    : 'Seajong'}
                                </span>
                              </div>
                            </td>

                            {/* ĐVT */}
                            <td className="py-2.5 px-2 text-center align-middle text-slate-600 font-medium text-[12px]">
                              {row.unit}
                            </td>

                            {/* SL đã bán */}
                            <td className="py-2.5 px-2.5 text-right align-middle">
                              <div className="font-bold text-slate-800">
                                {row.totalQuantity.toLocaleString('vi-VN')}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {row.ordersCount} đơn hàng
                              </div>
                            </td>

                            {/* Đơn giá TB */}
                            <td className="py-2.5 px-2.5 text-right align-middle font-medium text-slate-600 text-[12.5px]">
                              {row.avgPrice.toLocaleString('vi-VN')} đ
                            </td>

                            {/* Giá trị bán cộng dồn */}
                            <td className="py-2.5 pl-2.5 pr-3.5 text-right align-middle">
                              <div className="font-bold text-slate-900 text-[13px]">
                                {row.totalValue.toLocaleString('vi-VN')} đ
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </FullWidthTable>

              {/* Thanh phân trang chuẩn Enterprise (đã ẩn câu "Hiển thị 1 - 10 trong tổng số ...") */}
              <Pagination
                currentPage={currentPage}
                totalItems={aggregatedProducts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 20, 50]}
                itemName="loại hàng hoá"
                hideSummaryText={true}
                storageKey="seajong_sales_report_page_size"
              />
            </div>

            {/* ════════════════════════════════════════════════════════════════════
                CỘT PHẢI (5/12): 2 BIỂU ĐỒ (TRÊN: DOANH SỐ 6 THÁNG, DƯỚI: CƠ CẤU SP)
                ════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 flex flex-col min-h-0 h-full bg-slate-50/40 p-2.5 gap-2.5 overflow-y-auto">
              {/* ──────────────────────────────────────────────────────────────────
                  BIỂU ĐỒ TRÊN: DOANH SỐ BÁN HÀNG 6 THÁNG GẦN NHẤT (SEAJONG & OEM + AOV)
                  ────────────────────────────────────────────────────────────────── */}
              <div className="flex-1 min-h-[250px] bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                {/* Header biểu đồ trên */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center shrink-0">
                      <BarChartSteps size={14} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-slate-800 leading-tight m-0">
                        Doanh số bán hàng 6 tháng gần nhất
                      </h3>
                      <p className="text-[11px] text-slate-500 m-0">
                        So sánh kênh Seajong & OEM kèm đường giá trị trung bình đơn hàng
                      </p>
                    </div>
                  </div>

                  {/* Chú giải (Legend) */}
                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
                      Seajong
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                      OEM
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-3.5 h-0.5 bg-violet-600 inline-block relative">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 absolute -top-[2px] left-1" />
                      </span>
                      Giá trị TB đơn
                    </span>
                  </div>
                </div>

                {/* Khung SVG Kết hợp Biểu đồ cột đôi (Seajong / OEM) & Đường giá trị TB đơn hàng */}
                <div className="relative flex-1 min-h-[185px] flex flex-col justify-end pt-2">
                  {(() => {
                    const svgW = 520;
                    const svgH = 185;
                    const padL = 42;
                    const padR = 44;
                    const padT = 18;
                    const padB = 26;
                    const plotW = svgW - padL - padR;
                    const plotH = svgH - padT - padB;
                    const count = Math.max(sixMonthsChartData.length, 1);
                    const slotW = plotW / count;
                    const barW = Math.min(18, slotW * 0.28);
                    const barGap = 4;

                    const linePoints = sixMonthsChartData.map((d, i) => {
                      const cx = padL + slotW * i + slotW / 2;
                      const ratio =
                        chartScales.maxAov > 0
                          ? Math.min(1, d.avgOrderValueVnd / chartScales.maxAov)
                          : 0;
                      const cy = padT + plotH - ratio * plotH;
                      return { cx, cy, d, i };
                    });

                    const polylineStr = linePoints.map((p) => `${p.cx},${p.cy}`).join(' ');

                    const hoveredData =
                      hoveredMonthIdx !== null ? sixMonthsChartData[hoveredMonthIdx] : null;
                    const tooltipLeftPct =
                      hoveredMonthIdx !== null
                        ? Math.min(82, Math.max(18, ((hoveredMonthIdx + 0.5) / count) * 100))
                        : 50;

                    return (
                      <>
                        {/* Tooltip nổi chuẩn giao diện sáng (Light theme) */}
                        {hoveredData && (
                          <div
                            style={{
                              left: `${tooltipLeftPct}%`,
                              transform: 'translateX(-50%)',
                            }}
                            className="absolute top-1 z-30 pointer-events-none bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-[11.5px] text-slate-700 min-w-[205px]"
                          >
                            <div className="flex items-center justify-between gap-3 font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1.5">
                              <span>{hoveredData.fullLabel}</span>
                              <span className="text-[10.5px] font-semibold text-slate-500">
                                {hoveredData.ordersCount} đơn hàng
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-xs bg-sky-600 inline-block" />
                                  Doanh số Seajong:
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {hoveredData.seajongVnd.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" />
                                  Doanh số OEM:
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {hoveredData.oemVnd.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                                <span className="inline-flex items-center gap-1.5 text-violet-700 font-medium">
                                  <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" />
                                  Giá trị TB / đơn:
                                </span>
                                <span className="font-bold text-violet-700">
                                  {hoveredData.avgOrderValueVnd.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <svg
                          viewBox={`0 0 ${svgW} ${svgH}`}
                          className="w-full h-full overflow-visible select-none"
                        >
                          {/* Các đường lưới ngang */}
                          {[0, 0.25, 0.5, 0.75, 1].map((step, idx) => {
                            const y = padT + plotH - step * plotH;
                            const leftVal = step * chartScales.maxBar;
                            const rightVal = step * chartScales.maxAov;
                            return (
                              <g key={idx}>
                                <line
                                  x1={padL}
                                  y1={y}
                                  x2={svgW - padR}
                                  y2={y}
                                  stroke={step === 0 ? '#cbd5e1' : '#f1f5f9'}
                                  strokeWidth={step === 0 ? 1.2 : 1}
                                  strokeDasharray={step === 0 ? undefined : '3 3'}
                                />
                                {/* Nhãn trục trái (Doanh số) */}
                                <text
                                  x={padL - 6}
                                  y={y + 3}
                                  textAnchor="end"
                                  className="fill-slate-400 text-[9.5px] font-medium"
                                >
                                  {leftVal >= 1e9
                                    ? `${(leftVal / 1e9).toFixed(1)}tỷ`
                                    : leftVal > 0
                                    ? `${Math.round(leftVal / 1e6)}tr`
                                    : '0'}
                                </text>
                                {/* Nhãn trục phải (Giá trị TB đơn) */}
                                <text
                                  x={svgW - padR + 6}
                                  y={y + 3}
                                  textAnchor="start"
                                  className="fill-violet-500 text-[9.5px] font-medium"
                                >
                                  {rightVal >= 1e6
                                    ? `${Math.round(rightVal / 1e6)}tr`
                                    : '0'}
                                </text>
                              </g>
                            );
                          })}

                          {/* 2 Cột Seajong & OEM mỗi tháng */}
                          {sixMonthsChartData.map((d, i) => {
                            const centerX = padL + slotW * i + slotW / 2;
                            const sjH =
                              chartScales.maxBar > 0
                                ? Math.min(1, d.seajongVnd / chartScales.maxBar) * plotH
                                : 0;
                            const oemH =
                              chartScales.maxBar > 0
                                ? Math.min(1, d.oemVnd / chartScales.maxBar) * plotH
                                : 0;

                            const sjX = centerX - barW - barGap / 2;
                            const oemX = centerX + barGap / 2;
                            const sjY = padT + plotH - sjH;
                            const oemY = padT + plotH - oemH;
                            const isHovered = hoveredMonthIdx === i;

                            return (
                              <g
                                key={d.monthNum}
                                onMouseEnter={() => setHoveredMonthIdx(i)}
                                onMouseLeave={() => setHoveredMonthIdx(null)}
                                className="cursor-pointer"
                              >
                                {/* Vùng bắt sự kiện hover toàn cột */}
                                <rect
                                  x={padL + slotW * i + 2}
                                  y={padT}
                                  width={slotW - 4}
                                  height={plotH}
                                  rx={6}
                                  fill={isHovered ? '#f1f5f9' : 'transparent'}
                                  opacity={isHovered ? 0.8 : 0}
                                />

                                {/* Cột Seajong */}
                                <rect
                                  x={sjX}
                                  y={sjH > 0 ? sjY : padT + plotH - 2}
                                  width={barW}
                                  height={Math.max(2, sjH)}
                                  rx={3}
                                  fill="#0284c7"
                                  opacity={d.seajongVnd > 0 ? 0.95 : 0.25}
                                />

                                {/* Cột OEM */}
                                <rect
                                  x={oemX}
                                  y={oemH > 0 ? oemY : padT + plotH - 2}
                                  width={barW}
                                  height={Math.max(2, oemH)}
                                  rx={3}
                                  fill="#f59e0b"
                                  opacity={d.oemVnd > 0 ? 0.95 : 0.25}
                                />

                                {/* Nhãn tháng trục X */}
                                <text
                                  x={centerX}
                                  y={svgH - 7}
                                  textAnchor="middle"
                                  className={`text-[10.5px] ${
                                    isHovered
                                      ? 'fill-blue-700 font-bold'
                                      : 'fill-slate-600 font-semibold'
                                  }`}
                                >
                                  {d.label}
                                </text>
                              </g>
                            );
                          })}

                          {/* Đường Giá trị trung bình đơn hàng (AOV Line) */}
                          {linePoints.length > 1 && (
                            <polyline
                              fill="none"
                              stroke="#7c3aed"
                              strokeWidth={2.2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylineStr}
                              className="pointer-events-none"
                            />
                          )}

                          {/* Điểm nút & nhãn trên đường Giá trị TB đơn hàng */}
                          {linePoints.map(({ cx, cy, d, i }) => {
                            const isHovered = hoveredMonthIdx === i;
                            return (
                              <g
                                key={`aov-${d.monthNum}`}
                                onMouseEnter={() => setHoveredMonthIdx(i)}
                                onMouseLeave={() => setHoveredMonthIdx(null)}
                                className="cursor-pointer"
                              >
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isHovered ? 5 : 3.5}
                                  fill="#ffffff"
                                  stroke="#7c3aed"
                                  strokeWidth={2.2}
                                />
                                {d.avgOrderValueVnd > 0 && (
                                  <text
                                    x={cx}
                                    y={Math.max(10, cy - 7)}
                                    textAnchor="middle"
                                    className="fill-violet-700 text-[9.5px] font-bold pointer-events-none"
                                  >
                                    {(d.avgOrderValueVnd / 1e6).toFixed(1)}tr
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────────────
                  BIỂU ĐỒ DƯỚI: DOANH SỐ THEO CƠ CẤU SẢN PHẨM (4 NHÓM HÀNG HOÁ)
                  ────────────────────────────────────────────────────────────────── */}
              <div className="flex-1 min-h-[235px] bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                {/* Header biểu đồ dưới */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                      <PieChartFill size={14} />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-slate-800 leading-tight m-0">
                        Doanh số theo cơ cấu sản phẩm
                      </h3>
                      <p className="text-[11px] text-slate-500 m-0">
                        Phân bổ tỷ trọng 4 nhóm ngành hàng ({activePeriodLabel})
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    <GraphUpArrow size={11} className="text-emerald-600" />
                    {formatShortMoney(totalPeriodSalesValue)}
                  </span>
                </div>

                {/* Nội dung: Biểu đồ Donut bên trái + Danh sách 4 nhóm sản phẩm bên phải */}
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 min-h-0">
                  {/* Vòng Donut SVG */}
                  <div className="relative w-[136px] h-[136px] shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                      <circle
                        cx="70"
                        cy="70"
                        r="54"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="16"
                      />
                      {donutSegments.map((seg) => {
                        const isHovered = hoveredCatKey === seg.key;
                        return (
                          <circle
                            key={seg.key}
                            cx="70"
                            cy="70"
                            r={seg.radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={isHovered ? 19 : 16}
                            strokeDasharray={seg.strokeDasharray}
                            strokeDashoffset={seg.strokeDashoffset}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredCatKey(seg.key)}
                            onMouseLeave={() => setHoveredCatKey(null)}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
                      {activeHoveredCategory ? (
                        <>
                          <span className="text-[10px] font-semibold text-slate-500 line-clamp-1">
                            {activeHoveredCategory.name}
                          </span>
                          <span
                            className="text-[14px] font-extrabold leading-tight"
                            style={{ color: activeHoveredCategory.color }}
                          >
                            {activeHoveredCategory.share}%
                          </span>
                          <span className="text-[10px] font-medium text-slate-600">
                            {formatShortMoney(activeHoveredCategory.value)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-medium text-slate-400">
                            Tổng doanh số
                          </span>
                          <span className="text-[13px] font-extrabold text-slate-800 leading-tight mt-0.5">
                            {formatShortMoney(totalPeriodSalesValue)}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            {totalPeriodQuantity.toLocaleString('vi-VN')} SP
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bảng 4 nhóm sản phẩm: Thiết bị vệ sinh, Thiết bị nhà bếp, Linh kiện, Loại khác */}
                  <div className="flex-1 w-full space-y-2">
                    {categoryBreakdown.map((cat) => {
                      const isHovered = hoveredCatKey === cat.key;
                      return (
                        <div
                          key={cat.key}
                          onMouseEnter={() => setHoveredCatKey(cat.key)}
                          onMouseLeave={() => setHoveredCatKey(null)}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                            isHovered
                              ? 'bg-slate-50 border-slate-300'
                              : 'bg-slate-50/50 border-slate-200/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[12px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="font-bold text-slate-800 truncate">
                                {cat.name}
                              </span>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                ({cat.quantity.toLocaleString('vi-VN')} SP)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-slate-800">
                                {cat.value.toLocaleString('vi-VN')} đ
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10.5px] font-bold border ${cat.bgClass} ${cat.textClass} ${cat.borderClass}`}
                              >
                                {cat.share.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.max(cat.value > 0 ? 3 : 0, cat.share)}%`,
                                backgroundColor: cat.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StandardPage>
    </div>
  );
};

export default SalesReportPage;
