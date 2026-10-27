import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowUpRight,
  Download,
  CalendarEvent,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  GeoAlt,
  People,
  CalendarCheck,
  Search,
  X,
  Check2,
  ChevronDown,
  Wallet2,
  GraphUp,
  PieChartFill,
  CashStack,
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Offcanvas } from '../../../components/common/Offcanvas';
import type { PlannerItem } from '../../../components/common/TodoListPlanner';
import { calendarEventService, getCurrentSessionUser, getLocalCachedEvents } from '../../../services/calendarEventService';

export interface BomOverviewViewProps {
  onNavigate?: (navId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

import type { MonthlyPlanItem } from './BusinessPlanView';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { Select } from '../../../components/common/Select';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import { computeExecutiveFacts, generateFactualExecutiveReport } from '../../../services/executiveAnalyticsEngine';

export interface MonthlyChartItem {
  month: string;
  monthFull: string;
  plan: number;
  actual: number | null;
  targetUnits: number;
  units: number | null;
  isCurrent: boolean;
}

// Dữ liệu kế hoạch kinh doanh chuẩn 2026 (25.5 Tỷ VNĐ, 1.848 bộ) trước khi tải từ SQLite DB
const DEFAULT_2026_PLAN: MonthlyPlanItem[] = [
  { month: 'Tháng 01', monthNum: 1, quarter: 'Q1', revenue: 1.63, revenueDong: 1630000000, share: 6.4, units: 118, recoveryTarget: 1.50, recoveryDong: 1500000000, keyFocus: 'Hoàn thiện hồ sơ nghiệm thu cuối năm trước', majorProjects: '' },
  { month: 'Tháng 02', monthNum: 2, quarter: 'Q1', revenue: 1.30, revenueDong: 1300000000, share: 5.1, units: 94, recoveryTarget: 1.20, recoveryDong: 1200000000, keyFocus: 'Nghỉ Tết Nguyên Đán, bảo dưỡng máy móc 2 xưởng', majorProjects: '' },
  { month: 'Tháng 03', monthNum: 3, quarter: 'Q1', revenue: 1.86, revenueDong: 1860000000, share: 7.3, units: 135, recoveryTarget: 1.71, recoveryDong: 1710000000, keyFocus: 'Đẩy mạnh ký kết hợp đồng dự án quý 2', majorProjects: '' },
  { month: 'Tháng 04', monthNum: 4, quarter: 'Q2', revenue: 1.99, revenueDong: 1990000000, share: 7.8, units: 144, recoveryTarget: 1.83, recoveryDong: 1830000000, keyFocus: 'Đốt mẫu kiểm định PCCC EI60 lô mới', majorProjects: '' },
  { month: 'Tháng 05', monthNum: 5, quarter: 'Q2', revenue: 2.14, revenueDong: 2140000000, share: 8.4, units: 155, recoveryTarget: 1.97, recoveryDong: 1970000000, keyFocus: 'Lắp đặt hàng loạt tháp cao tầng phân khu A', majorProjects: '' },
  { month: 'Tháng 06', monthNum: 6, quarter: 'Q2', revenue: 2.32, revenueDong: 2320000000, share: 9.1, units: 168, recoveryTarget: 2.13, recoveryDong: 2130000000, keyFocus: 'Sơ kết 6 tháng đầu năm, rà soát công nợ', majorProjects: '' },
  { month: 'Tháng 07', monthNum: 7, quarter: 'Q3', revenue: 2.45, revenueDong: 2450000000, share: 9.6, units: 177, recoveryTarget: 2.25, recoveryDong: 2250000000, keyFocus: 'Vận hành hết công suất chuyền dán cạnh PUR', majorProjects: '' },
  { month: 'Tháng 08', monthNum: 8, quarter: 'Q3', revenue: 2.55, revenueDong: 2550000000, share: 10.0, units: 185, recoveryTarget: 2.35, recoveryDong: 2350000000, keyFocus: 'Cung ứng phụ kiện đồng bộ khóa thông minh', majorProjects: '' },
  { month: 'Tháng 09', monthNum: 9, quarter: 'Q3', revenue: 2.50, revenueDong: 2500000000, share: 9.8, units: 181, recoveryTarget: 2.30, recoveryDong: 2300000000, keyFocus: 'Bàn giao các tầng mẫu thầu PCCC', majorProjects: '' },
  { month: 'Tháng 10', monthNum: 10, quarter: 'Q4', revenue: 2.37, revenueDong: 2370000000, share: 9.3, units: 172, recoveryTarget: 2.18, recoveryDong: 2180000000, keyFocus: 'Nghiệm thu khối lượng hoàn thành quý 3', majorProjects: '' },
  { month: 'Tháng 11', monthNum: 11, quarter: 'Q4', revenue: 2.22, revenueDong: 2220000000, share: 8.7, units: 161, recoveryTarget: 2.04, recoveryDong: 2040000000, keyFocus: 'Tăng cường nhân sự lắp đặt phụ kiện thực địa', majorProjects: '' },
  { month: 'Tháng 12', monthNum: 12, quarter: 'Q4', revenue: 2.17, revenueDong: 2170000000, share: 8.5, units: 157, recoveryTarget: 2.00, recoveryDong: 2000000000, keyFocus: 'Thu hồi công nợ năm, quyết toán toàn bộ dự án', majorProjects: '' },
];

const getTodayDateKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getRelativeDateKey = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getCategoryColor = (catOrPriority?: string): string => {
  switch (catOrPriority) {
    case 'urgent':
      return '#ef4444';
    case 'meeting':
      return '#0284c7';
    case 'review':
      return '#8b5cf6';
    case 'inspection':
      return '#f59e0b';
    case 'milestone':
      return '#10b981';
    case 'finance':
      return '#06b6d4';
    default:
      return '#0284c7';
  }
};

interface WeekDayItem {
  date: Date;
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  dayNumber: string;
  isToday: boolean;
}

interface MonthGridCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const getMonthGridCells = (refDate: Date): MonthGridCell[] => {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;

  const startDate = new Date(year, month, 1 - dayOfWeek);
  const cells: MonthGridCell[] = [];
  const todayKey = getTodayDateKey();

  for (let i = 0; i < 35; i++) {
    const cur = new Date(startDate);
    cur.setDate(startDate.getDate() + i);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    cells.push({
      date: cur,
      dateKey: key,
      dayNumber: cur.getDate(),
      isCurrentMonth: cur.getMonth() === month,
      isToday: key === todayKey,
    });
  }

  const lastCell = cells[34];
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (lastCell.date.getMonth() === month && lastCell.dayNumber < lastDayOfMonth) {
    for (let i = 35; i < 42; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      cells.push({
        date: cur,
        dateKey: key,
        dayNumber: cur.getDate(),
        isCurrentMonth: cur.getMonth() === month,
        isToday: key === todayKey,
      });
    }
  }

  return cells;
};

const getWeekDaysList = (refDate: Date): WeekDayItem[] => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  const days: WeekDayItem[] = [];
  const shortLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const fullLabels = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  const todayKey = getTodayDateKey();

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const dayNum = String(cur.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${dayNum}`;
    days.push({
      date: cur,
      dateKey: key,
      shortLabel: shortLabels[i],
      fullLabel: fullLabels[i],
      dayNumber: dayNum,
      isToday: key === todayKey,
    });
  }
  return days;
};

const isEventOnDate = (it: PlannerItem, dateKey: string): boolean => {
  if (!it.date) return false;
  if (!it.endDate || it.endDate === it.date) {
    return it.date === dateKey;
  }
  return dateKey >= it.date && dateKey <= it.endDate;
};

const INITIAL_BOM_PLANNER_ITEMS: PlannerItem[] = [
  {
    id: 'bom-pl-1',
    title: 'Họp giao ban điều hành sản xuất kinh doanh tháng 10/2026',
    description: 'Đánh giá tiến độ hoàn thành các dự án trọng điểm Hateco, Vinhomes Smart City',
    type: 'event',
    date: getRelativeDateKey(0),
    timeStart: '08:30',
    timeEnd: '10:30',
    estimatedMinutes: 120,
    status: 'in_progress',
    priority: 'urgent',
    category: 'meeting',
    location: 'Phòng họp Ban Giám đốc (Tầng 3)',
    assigneeName: 'Hà Hải Lâm (Tổng Giám đốc)',
    createdAt: '2026-10-01',
  },
  {
    id: 'bom-pl-2',
    title: 'Làm việc với Viện Chuyên ngành PCCC về chứng nhận đốt mẫu cửa EI90',
    description: 'Thống nhất kết quả thử nghiệm chịu lửa cửa thép vân gỗ và cửa gỗ chống cháy',
    type: 'event',
    date: getRelativeDateKey(0),
    timeStart: '14:00',
    timeEnd: '16:00',
    estimatedMinutes: 120,
    status: 'todo',
    priority: 'high',
    category: 'review',
    location: 'Viện Chuyên ngành PCCC - IBST',
    assigneeName: 'Đỗ Minh D (Kỹ thuật R&D)',
    createdAt: '2026-10-02',
  },
  {
    id: 'bom-pl-3',
    title: 'Kiểm tra tiến độ chuyền dán cạnh PUR xưởng mộc số 2',
    description: 'Nghiệm thu lô phôi gỗ công nghiệp phủ Melamine xuất dự án Sunshine',
    type: 'event',
    date: getRelativeDateKey(1),
    timeStart: '09:30',
    timeEnd: '11:00',
    estimatedMinutes: 90,
    status: 'todo',
    priority: 'medium',
    category: 'inspection',
    location: 'Phân xưởng sản xuất số 2',
    assigneeName: 'Nguyễn Văn A (GĐ Sản xuất)',
    createdAt: '2026-10-02',
  },
  {
    id: 'bom-pl-4',
    title: 'Ký kết hợp đồng cung cấp gói cửa cao cấp dự án The Zei Mỹ Đình',
    description: 'Ký kết HĐ trị giá 3.2 Tỷ VNĐ với đại diện CĐT HD Mon Holdings',
    type: 'event',
    date: getRelativeDateKey(2),
    timeStart: '10:00',
    timeEnd: '11:30',
    estimatedMinutes: 90,
    status: 'todo',
    priority: 'urgent',
    category: 'milestone',
    location: 'Trụ sở Tập đoàn HD Mon Holdings',
    assigneeName: 'Hà Hải Lâm (Tổng Giám đốc)',
    createdAt: '2026-10-03',
  },
  {
    id: 'bom-pl-5',
    title: 'Rà soát số liệu công nợ và dòng tiền thu hồi quý 3',
    description: 'Kiểm tra tiến độ thanh toán đợt 3 gói thầu Hateco Plaza',
    type: 'event',
    date: getRelativeDateKey(-1),
    timeStart: '15:00',
    timeEnd: '16:30',
    estimatedMinutes: 90,
    status: 'todo',
    priority: 'high',
    category: 'finance',
    location: 'Phòng Kế toán - Tài chính',
    assigneeName: 'Trần Thị B (GĐ Tài chính)',
    createdAt: '2026-10-01',
  },
];

// Định dạng hiển thị Cơ cấu sản phẩm lấy từ DB (bảng Danh mục sản phẩm)
export interface DisplayProductSegment {
  id: string | number;
  name: string;
  share: number;
  revenue: string;
  units: string;
  color: string;
}

// Dữ liệu ban đầu mặc định khi tải từ DB
const DEFAULT_PRODUCT_SEGMENTS: DisplayProductSegment[] = [
  { id: 110, name: 'Sen tắm cây cao cấp', share: 38, revenue: '380 tr', units: '120 bộ', color: '#0284c7' },
  { id: 111, name: 'Vòi chậu Lavabo & Bếp', share: 28, revenue: '280 tr', units: '210 bộ', color: '#10b981' },
  { id: 112, name: 'Bồn cầu & Sứ vệ sinh', share: 22, revenue: '220 tr', units: '85 bộ', color: '#8b5cf6' },
  { id: 116, name: 'Phụ kiện đồng bộ Seajong', share: 12, revenue: '120 tr', units: '340 bộ', color: '#f59e0b' },
];

// 12 Chỉ số tài chính & Sức khỏe doanh nghiệp mặc định chuẩn Thông tư 200 (Hình 2)
const DEFAULT_FINANCIAL_RATIOS = [
  {
    title: 'Khả năng thanh toán',
    iconKey: 'wallet',
    ratios: [
      { name: 'Hệ số thanh toán hiện hành (Current Ratio)', value: '208.64 lần', benchmark: '≥ 1.5 lần', status: 'Tốt', desc: 'Tài sản ngắn hạn / Nợ ngắn hạn' },
      { name: 'Hệ số thanh toán nhanh (Quick Ratio)', value: '208.64 lần', benchmark: '≥ 1.0 lần', status: 'Tốt', desc: '(TSNH - Hàng tồn kho) / Nợ ngắn hạn' },
      { name: 'Hệ số thanh toán tức thời (Cash Ratio)', value: '89.71 lần', benchmark: '≥ 0.3 lần', status: 'An toàn', desc: 'Tiền và tương đương tiền / Nợ ngắn hạn' },
    ],
  },
  {
    title: 'Hiệu quả hoạt động',
    iconKey: 'graph',
    ratios: [
      { name: 'Vòng quay hàng tồn kho (Inventory Turnover)', value: '-', benchmark: '2.2 - 3.0 vòng', status: 'Chưa có dữ liệu', desc: 'Giá vốn / Hàng tồn kho bình quân' },
      { name: 'Số ngày luân chuyển tồn kho (DIO)', value: '-', benchmark: '≤ 160 ngày', status: 'Chưa có dữ liệu', desc: '365 / Vòng quay hàng tồn kho' },
      { name: 'Kỳ thu tiền bình quân (DSO)', value: '268 ngày', benchmark: '≤ 100 ngày', status: 'Kéo dài', desc: 'Phải thu bình quân × 365 / Doanh thu' },
    ],
  },
  {
    title: 'Cơ cấu vốn và Đòn bẩy',
    iconKey: 'pie',
    ratios: [
      { name: 'Hệ số Nợ trên Tổng tài sản (Debt / Assets)', value: '0.2%', benchmark: '≤ 50%', status: 'Rất an toàn', desc: 'Tổng nợ phải trả / Tổng tài sản' },
      { name: 'Hệ số Nợ trên Vốn CSH (Debt / Equity)', value: '0.2%', benchmark: '≤ 100%', status: 'An toàn', desc: 'Tổng nợ phải trả / Vốn chủ sở hữu' },
      { name: 'Hệ số khả năng trả lãi vay (ICR)', value: '11.59 lần', benchmark: '≥ 3.0 lần', status: 'An toàn tuyệt đối', desc: 'EBIT / Chi phí lãi vay' },
    ],
  },
  {
    title: 'Khả năng sinh lời',
    iconKey: 'cash',
    ratios: [
      { name: 'Biên lợi nhuận gộp (Gross Margin)', value: '-832.2%', benchmark: '28% - 32%', status: 'Thấp', desc: 'Lợi nhuận gộp / Doanh thu thuần' },
      { name: 'Biên lợi nhuận ròng (Net Profit Margin)', value: '-1036.2%', benchmark: '10% - 15%', status: 'Trung bình', desc: 'Lợi nhuận sau thuế / Doanh thu thuần' },
      { name: 'Tỷ suất sinh lời trên tài sản (ROA)', value: '11.59%', benchmark: '≥ 7%', status: 'Vượt trội', desc: 'LNST / Tổng tài sản bình quân' },
      { name: 'Tỷ suất sinh lời trên vốn CSH (ROE)', value: '11.61%', benchmark: '≥ 12%', status: 'Đạt chuẩn', desc: 'LNST / Vốn CSH bình quân' },
    ],
  },
];

export const BomOverviewView: React.FC<BomOverviewViewProps> = ({ onNavigate: _onNavigate, onShowToast }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'sales'>('revenue');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toLocaleTimeString('vi-VN'));
  const company = useCompanyInfo();
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [reportPeriodType, setReportPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [reportSelectedMonth, setReportSelectedMonth] = useState<number>(10);
  const [reportSelectedQuarter, setReportSelectedQuarter] = useState<number>(4);
  const [reportSelectedYear, setReportSelectedYear] = useState<number>(2026);
  const [showEventCalendar, setShowEventCalendar] = useState(false);
  // Chế độ xem 4 loại lịch trong Offcanvas: 'month' (Tháng), 'week' (Tuần - Mặc định), 'day' (Ngày), 'agenda' (Lịch biểu)
  const [calendarViewType, setCalendarViewType] = useState<'month' | 'week' | 'day' | 'agenda'>('week');

  // 12 Chỉ số tài chính & Sức khỏe doanh nghiệp (từ Hình 2)
  const [financialRatios, setFinancialRatios] = useState<any[]>(DEFAULT_FINANCIAL_RATIOS);
  const [selectedRatioCategory, setSelectedRatioCategory] = useState<string>('all');
  const [activeRightCardTab, setActiveRightCardTab] = useState<'ratios' | 'segments'>('ratios');

  // Nạp 12 chỉ số tài chính từ API /api/finance/reports theo thời gian thực
  useEffect(() => {
    fetch('/api/finance/reports?period=2026-10')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể nạp báo cáo tài chính');
        return res.json();
      })
      .then((data) => {
        if (data && data.ratios && Array.isArray(data.ratios) && data.ratios.length > 0) {
          setFinancialRatios(data.ratios);
        }
      })
      .catch((err) => {
        console.warn('Lỗi nạp 12 chỉ số tài chính:', err);
      });
  }, []);

  const displayRatioCategories = useMemo(() => {
    if (selectedRatioCategory === 'all') return financialRatios;
    return financialRatios.filter((cat) => cat.title === selectedRatioCategory);
  }, [financialRatios, selectedRatioCategory]);

  const getCategoryIcon = (iconKey?: string) => {
    switch (iconKey) {
      case 'wallet':
        return <Wallet2 size={13} style={{ color: '#0284c7' }} />;
      case 'graph':
        return <GraphUp size={13} style={{ color: '#10b981' }} />;
      case 'pie':
        return <PieChartFill size={13} style={{ color: '#f59e0b' }} />;
      case 'cash':
      default:
        return <CashStack size={13} style={{ color: '#8b5cf6' }} />;
    }
  };

  const currentPeriodLabels = useMemo(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return {
      month: `Tháng ${m}/${y}`,
      quarter: `Quý ${q}/${y}`,
      year: `Lũy kế ${y}`,
    };
  }, []);

  // Người dùng đăng nhập hiện tại để đảm bảo: LỊCH CỦA AI NGƯỜI ĐÓ XEM
  const sessionUser = useMemo(() => getCurrentSessionUser(), []);

  // Danh sách sự kiện của người dùng được lưu trong SQLite Database và Cache cá nhân
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>(() => {
    const cached = getLocalCachedEvents(sessionUser.email || sessionUser.id);
    if (cached && cached.length > 0) {
      return cached;
    }
    return INITIAL_BOM_PLANNER_ITEMS;
  });

  // Tải danh sách sự kiện từ SQLite Database cho đúng tài khoản đang đăng nhập
  useEffect(() => {
    let isMounted = true;
    calendarEventService.getMyEvents(sessionUser).then((items) => {
      if (isMounted && items && items.length > 0) {
        setPlannerItems(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [sessionUser]);

  // Lưu plannerItems vào bộ nhớ đệm cá nhân của người dùng
  const savePlannerItems = useCallback((newItems: PlannerItem[]) => {
    setPlannerItems(newItems);
    try {
      const userKey = sessionUser.email || sessionUser.id;
      localStorage.setItem(`decodoor_calendar_events_${userKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, JSON.stringify(newItems));
      localStorage.setItem('decodoor_bom_events_planner', JSON.stringify(newItems));
    } catch (e) {
      console.error(e);
    }
  }, [sessionUser]);

  // State quản lý Slide Tạo mới sự kiện (mặc định ẩn, chỉ mở khi bấm nút thêm mới)
  const [isCreateSlideOpen, setIsCreateSlideOpen] = useState(false);
  const [createEventTitle, setCreateEventTitle] = useState('');
  const [createEventDate, setCreateEventDate] = useState(() => getTodayDateKey());
  const [createEventEndDate, setCreateEventEndDate] = useState(() => getTodayDateKey());
  const [createEventTimeStart, setCreateEventTimeStart] = useState('09:00');
  const [createEventTimeEnd, setCreateEventTimeEnd] = useState('10:30');
  const [createEventIsAllDay, setCreateEventIsAllDay] = useState(false);
  const [createEventLocation, setCreateEventLocation] = useState('');
  const [createEventRecurrence, setCreateEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [createEventNotifyMinutes, setCreateEventNotifyMinutes] = useState<number>(15);
  const [createEventAttendees, setCreateEventAttendees] = useState<string[]>([]);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);
  const [attendeesSearch, setAttendeesSearch] = useState('');
  const attendeesDropdownRef = useRef<HTMLDivElement>(null);
  const [createEventPriority, setCreateEventPriority] = useState<string>('high');
  const [createEventDescription, setCreateEventDescription] = useState('');

  // Danh sách nhân viên trong công ty để chọn khách mời
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: number | string; name: string; department?: string; position?: string; avatarColor?: string; avatarText?: string }>>([]);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCompanyUsers(
            data.map((u: any) => ({
              id: u.id,
              name: u.name,
              department: u.department || '',
              position: u.position || '',
              avatarColor: u.avatarColor || '#0284c7',
              avatarText: u.avatarText || (u.name ? u.name.split(' ').map((n: string) => n[0]).slice(-2).join('').toUpperCase() : 'NV'),
            }))
          );
        }
      })
      .catch((err) => console.warn('Could not fetch /api/users for calendar guests', err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attendeesDropdownRef.current && !attendeesDropdownRef.current.contains(e.target as Node)) {
        setIsAttendeesOpen(false);
      }
      if (detailAttendeesDropdownRef.current && !detailAttendeesDropdownRef.current.contains(e.target as Node)) {
        setIsDetailAttendeesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // State quản lý Slide Chi tiết sự kiện (mở khi click chọn sự kiện trong danh sách)
  const [isDetailSlideOpen, setIsDetailSlideOpen] = useState(false);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [detailEventTitle, setDetailEventTitle] = useState('');
  const [detailEventDate, setDetailEventDate] = useState(() => getTodayDateKey());
  const [detailEventEndDate, setDetailEventEndDate] = useState(() => getTodayDateKey());
  const [detailEventTimeStart, setDetailEventTimeStart] = useState('09:00');
  const [detailEventTimeEnd, setDetailEventTimeEnd] = useState('10:30');
  const [detailEventIsAllDay, setDetailEventIsAllDay] = useState(false);
  const [detailEventLocation, setDetailEventLocation] = useState('');
  const [detailEventRecurrence, setDetailEventRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [detailEventNotifyMinutes, setDetailEventNotifyMinutes] = useState<number>(15);
  const [detailEventAttendees, setDetailEventAttendees] = useState<string[]>([]);
  const [isDetailAttendeesOpen, setIsDetailAttendeesOpen] = useState(false);
  const [detailAttendeesSearch, setDetailAttendeesSearch] = useState('');
  const detailAttendeesDropdownRef = useRef<HTMLDivElement>(null);
  const [detailEventPriority, setDetailEventPriority] = useState<string>('high');
  const [detailEventDescription, setDetailEventDescription] = useState('');

  // Hàm mở Slide Chi tiết sự kiện khi click vào một sự kiện trong lịch
  const openDetailEventSlide = useCallback((event: PlannerItem) => {
    setDetailEventId(event.id);
    setDetailEventTitle(event.title || '');
    setDetailEventDate(event.date || getTodayDateKey());
    setDetailEventEndDate(event.endDate || event.date || getTodayDateKey());
    setDetailEventTimeStart(event.timeStart || '09:00');
    setDetailEventTimeEnd(event.timeEnd || '10:30');
    setDetailEventIsAllDay(Boolean(event.isAllDay));
    setDetailEventLocation(event.location || '');
    setDetailEventPriority(event.priority || 'high');

    const rawDesc = event.description || '';
    let recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'none';
    let notify = 15;
    const attendees: string[] = [];
    const remainingLines: string[] = [];

    rawDesc.split('\n').forEach((line) => {
      if (line.startsWith('• Lặp lại:')) {
        const val = line.replace('• Lặp lại:', '').trim();
        if (val.includes('Mỗi ngày')) recurrence = 'daily';
        else if (val.includes('Mỗi tuần')) recurrence = 'weekly';
        else if (val.includes('Mỗi tháng')) recurrence = 'monthly';
        else if (val.includes('Mỗi năm')) recurrence = 'yearly';
      } else if (line.startsWith('• Nhắc trước:')) {
        const match = line.match(/\d+/);
        if (match) notify = parseInt(match[0], 10);
      } else if (line.startsWith('• Khách mời:')) {
        const names = line.replace('• Khách mời:', '').split(',').map((s) => s.trim());
        names.forEach((name) => {
          const found = companyUsers.find((u) => u.name === name);
          if (found) attendees.push(String(found.id));
        });
      } else {
        remainingLines.push(line);
      }
    });

    setDetailEventDescription(remainingLines.join('\n').trim());
    setDetailEventRecurrence(recurrence);
    setDetailEventNotifyMinutes(notify);
    setDetailEventAttendees(attendees);
    setIsDetailAttendeesOpen(false);
    setDetailAttendeesSearch('');

    setIsCreateSlideOpen(false);
    setIsDetailSlideOpen(true);
  }, [companyUsers]);

  // Cập nhật sự kiện từ Slide Chi tiết
  const handleUpdateEventFromSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailEventId || !detailEventTitle.trim()) return;

    const attendeesNames = companyUsers
      .filter((u) => detailEventAttendees.includes(String(u.id)))
      .map((u) => u.name)
      .join(', ');

    const recurrenceLabel = {
      none: '',
      daily: 'Mỗi ngày',
      weekly: 'Mỗi tuần',
      monthly: 'Mỗi tháng',
      yearly: 'Mỗi năm',
    }[detailEventRecurrence];

    const descriptionParts: string[] = [];
    if (detailEventDescription.trim()) {
      descriptionParts.push(detailEventDescription.trim());
    }
    if (recurrenceLabel) {
      descriptionParts.push(`• Lặp lại: ${recurrenceLabel}`);
    }
    if (detailEventNotifyMinutes > 0) {
      descriptionParts.push(`• Nhắc trước: ${detailEventNotifyMinutes} phút`);
    }
    if (attendeesNames) {
      descriptionParts.push(`• Khách mời: ${attendeesNames}`);
    }

    const fullDescription = descriptionParts.join('\n');

    const effectiveEndDate = detailEventEndDate && detailEventEndDate >= detailEventDate
      ? detailEventEndDate
      : detailEventDate;

    const isMultiDay = Boolean(effectiveEndDate && effectiveEndDate !== detailEventDate);
    const isAllDay = detailEventIsAllDay || isMultiDay;

    const updatedItem: PlannerItem = {
      id: detailEventId,
      title: detailEventTitle.trim(),
      description: fullDescription || undefined,
      type: 'event',
      date: detailEventDate,
      endDate: effectiveEndDate,
      timeStart: isAllDay ? undefined : detailEventTimeStart,
      timeEnd: isAllDay ? undefined : detailEventTimeEnd,
      isAllDay: isAllDay,
      location: detailEventLocation.trim() || undefined,
      category: 'meeting' as any,
      priority: detailEventPriority as any,
      assigneeName: sessionUser.name,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    const updated = plannerItems.map((it) => (it.id === detailEventId ? updatedItem : it));
    savePlannerItems(updated);

    await calendarEventService.updateEvent(detailEventId, {
      title: updatedItem.title,
      description: updatedItem.description,
      date: updatedItem.date || detailEventDate,
      endDate: effectiveEndDate,
      timeStart: updatedItem.timeStart,
      timeEnd: updatedItem.timeEnd,
      location: updatedItem.location,
      category: updatedItem.category,
      priority: updatedItem.priority,
    }, sessionUser);

    // Tự động đẩy thông báo cập nhật sự kiện đến khách mời
    if (detailEventAttendees.length > 0) {
      try {
        const rawSaved = localStorage.getItem('decodoor_notifications_list');
        const existingList = rawSaved ? JSON.parse(rawSaved) : [];
        const formattedDate = (() => {
          try {
            const parts = detailEventDate.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
          } catch { }
          return detailEventDate;
        })();
        const timeStr = detailEventIsAllDay ? 'Cả ngày' : `${detailEventTimeStart} - ${detailEventTimeEnd}`;
        const locStr = detailEventLocation.trim() ? ` tại ${detailEventLocation.trim()}` : '';

        const newNotifs: any[] = [];
        detailEventAttendees.forEach((attId) => {
          const u = companyUsers.find((user) => String(user.id) === String(attId));
          newNotifs.push({
            id: `notif-event-${Date.now()}-${attId}-${Math.floor(Math.random() * 1000)}`,
            title: `Cập nhật sự kiện: ${updatedItem.title}`,
            content: `Chào ${u?.name || 'đồng nghiệp'}, sự kiện "${updatedItem.title}" đã được cập nhật thông tin: Ngày ${formattedDate} (${timeStr})${locStr}. Người tổ chức: ${sessionUser.name}. Vui lòng bấm Đồng ý hoặc Từ chối tham gia.`,
            type: 'info',
            priority: detailEventPriority === 'urgent' ? 'urgent' : detailEventPriority === 'high' ? 'high' : 'normal',
            audience: 'individual',
            isRead: false,
            createdAt: new Date().toISOString(),
            sender: {
              name: sessionUser.name,
              role: sessionUser.role || 'Người tổ chức sự kiện',
              department: sessionUser.department || 'Ban Điều Hành',
            },
            actionRequired: true,
            actionType: 'confirm',
            actionStatus: 'pending',
          });
        });

        localStorage.setItem('decodoor_notifications_list', JSON.stringify([...newNotifs, ...existingList]));
        window.dispatchEvent(new CustomEvent('decodoor_notification_added', { detail: newNotifs }));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Lỗi khi gửi thông báo sự kiện cập nhật:', err);
      }
    }

    setIsDetailSlideOpen(false);
    onShowToast?.('success', 'Đã cập nhật sự kiện', `Đã lưu thay đổi cho "${updatedItem.title}".`);
  };

  // Xóa sự kiện từ Slide Chi tiết
  const handleDeleteDetailEvent = async () => {
    if (!detailEventId) return;
    const currentTitle = detailEventTitle;
    const updated = plannerItems.filter((it) => it.id !== detailEventId);
    savePlannerItems(updated);
    await calendarEventService.deleteEvent(detailEventId, sessionUser);
    setIsDetailSlideOpen(false);
    onShowToast?.('info', 'Đã xóa sự kiện', `Đã xóa sự kiện "${currentTitle}".`);
  };

  // Hàm mở Slide Tạo mới sự kiện với ngày/giờ được điền sẵn theo ngữ cảnh
  const openCreateEventSlide = useCallback((defaultDate?: string, defaultTimeStart?: string, defaultTimeEnd?: string) => {
    setCreateEventDate(defaultDate || getTodayDateKey());
    setCreateEventEndDate(defaultDate || getTodayDateKey());
    setCreateEventTimeStart(defaultTimeStart || '09:00');
    setCreateEventTimeEnd(defaultTimeEnd || '10:30');
    setCreateEventTitle('');
    setCreateEventLocation('');
    setCreateEventDescription('');
    setCreateEventRecurrence('none');
    setCreateEventNotifyMinutes(15);
    setCreateEventAttendees([]);
    setIsAttendeesOpen(false);
    setAttendeesSearch('');
    setCreateEventPriority('high');
    setCreateEventIsAllDay(false);
    setIsDetailSlideOpen(false);
    setIsCreateSlideOpen(true);
  }, []);

  // Xử lý lưu sự kiện từ Slide Tạo mới
  const handleSaveNewEventFromSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventTitle.trim()) return;

    const attendeesNames = companyUsers
      .filter((u) => createEventAttendees.includes(String(u.id)))
      .map((u) => u.name)
      .join(', ');

    const recurrenceLabel = {
      none: '',
      daily: 'Mỗi ngày',
      weekly: 'Mỗi tuần',
      monthly: 'Mỗi tháng',
      yearly: 'Mỗi năm',
    }[createEventRecurrence];

    const descriptionParts: string[] = [];
    if (createEventDescription.trim()) {
      descriptionParts.push(createEventDescription.trim());
    }
    if (recurrenceLabel) {
      descriptionParts.push(`• Lặp lại: ${recurrenceLabel}`);
    }
    if (createEventNotifyMinutes > 0) {
      descriptionParts.push(`• Nhắc trước: ${createEventNotifyMinutes} phút`);
    }
    if (attendeesNames) {
      descriptionParts.push(`• Khách mời: ${attendeesNames}`);
    }

    const fullDescription = descriptionParts.join('\n');

    const effectiveEndDate = createEventEndDate && createEventEndDate >= createEventDate
      ? createEventEndDate
      : createEventDate;

    const isMultiDay = Boolean(effectiveEndDate && effectiveEndDate !== createEventDate);
    const isAllDay = createEventIsAllDay || isMultiDay;

    const newEvent: PlannerItem = {
      id: `bom-ev-${Date.now()}`,
      title: createEventTitle.trim(),
      description: fullDescription || undefined,
      type: 'event',
      date: createEventDate,
      endDate: effectiveEndDate,
      timeStart: isAllDay ? undefined : createEventTimeStart,
      timeEnd: isAllDay ? undefined : createEventTimeEnd,
      isAllDay: isAllDay,
      location: createEventLocation.trim() || undefined,
      category: 'meeting' as any,
      priority: createEventPriority as any,
      assigneeName: sessionUser.name,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    const updated = [newEvent, ...plannerItems];
    savePlannerItems(updated);

    await calendarEventService.createEvent({
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date || createEventDate,
      endDate: effectiveEndDate,
      timeStart: newEvent.timeStart,
      timeEnd: newEvent.timeEnd,
      location: newEvent.location,
      category: newEvent.category,
      priority: newEvent.priority,
    }, sessionUser);

    // Tự động đẩy thông báo mời tham gia sự kiện đến các nhân sự được chọn
    if (createEventAttendees.length > 0) {
      try {
        const rawSaved = localStorage.getItem('decodoor_notifications_list');
        const existingList = rawSaved ? JSON.parse(rawSaved) : [];
        const formattedDate = (() => {
          try {
            const parts = createEventDate.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
          } catch { }
          return createEventDate;
        })();
        const timeStr = createEventIsAllDay ? 'Cả ngày' : `${createEventTimeStart} - ${createEventTimeEnd}`;
        const locStr = createEventLocation.trim() ? ` tại ${createEventLocation.trim()}` : '';

        const newNotifs: any[] = [];
        createEventAttendees.forEach((attId) => {
          const u = companyUsers.find((user) => String(user.id) === String(attId));
          newNotifs.push({
            id: `notif-event-${Date.now()}-${attId}-${Math.floor(Math.random() * 1000)}`,
            title: `Lời mời tham dự sự kiện: ${newEvent.title}`,
            content: `Chào ${u?.name || 'đồng nghiệp'}, bạn được mời tham dự sự kiện "${newEvent.title}" vào ngày ${formattedDate} (${timeStr})${locStr}. Người mời: ${sessionUser.name}. Vui lòng bấm Đồng ý hoặc Từ chối tham gia.`,
            type: 'info',
            priority: createEventPriority === 'urgent' ? 'urgent' : createEventPriority === 'high' ? 'high' : 'normal',
            audience: 'individual',
            isRead: false,
            createdAt: new Date().toISOString(),
            sender: {
              name: sessionUser.name,
              role: sessionUser.role || 'Người tổ chức sự kiện',
              department: sessionUser.department || 'Ban Điều Hành',
            },
            actionRequired: true,
            actionType: 'confirm',
            actionStatus: 'pending',
          });
        });

        localStorage.setItem('decodoor_notifications_list', JSON.stringify([...newNotifs, ...existingList]));
        window.dispatchEvent(new CustomEvent('decodoor_notification_added', { detail: newNotifs }));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Lỗi khi gửi thông báo sự kiện:', err);
      }
    }

    setIsCreateSlideOpen(false);
    onShowToast?.(
      'success',
      'Đã tạo sự kiện',
      createEventAttendees.length > 0
        ? `Đã lưu sự kiện "${newEvent.title}" và gửi lời mời đến ${createEventAttendees.length} nhân sự.`
        : `Đã lưu sự kiện "${newEvent.title}" vào lịch.`
    );
  };

  // State điều hướng Tháng và ngày đang chọn cho Lịch Tháng
  const [refMonthDate, setRefMonthDate] = useState<Date>(() => new Date());
  const [selectedMonthDayKey, setSelectedMonthDayKey] = useState<string>(() => getTodayDateKey());

  // Lưới các ngày trong tháng theo refMonthDate
  const currentMonthCells = useMemo(() => getMonthGridCells(refMonthDate), [refMonthDate]);

  // Nhãn tháng hiển thị
  const monthHeaderLabel = useMemo(() => {
    const m = String(refMonthDate.getMonth() + 1).padStart(2, '0');
    return `Tháng ${m}/${refMonthDate.getFullYear()}`;
  }, [refMonthDate]);

  // Danh sách sự kiện của ngày đang chọn trong Lịch tháng
  const selectedMonthDayEvents = useMemo(() => {
    return plannerItems
      .filter((it) => isEventOnDate(it, selectedMonthDayKey) && (it.type === 'event' || !it.type))
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  }, [plannerItems, selectedMonthDayKey]);

  // Thông tin ngày đang chọn trong Lịch tháng
  const selectedMonthDayInfo = useMemo(() => {
    const parts = selectedMonthDayKey.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const fullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return {
        date: d,
        dateKey: selectedMonthDayKey,
        fullLabel: fullLabels[d.getDay()],
        dayNumber: String(parts[2]).padStart(2, '0'),
        monthNumber: String(parts[1]).padStart(2, '0'),
        isToday: selectedMonthDayKey === getTodayDateKey(),
      };
    }
    return null;
  }, [selectedMonthDayKey]);

  // State cho Lịch Ngày
  const [currentDayDate, setCurrentDayDate] = useState<Date>(() => new Date());

  // Khóa ngày được chọn trong Lịch Ngày
  const currentDayKey = useMemo(() => {
    const y = currentDayDate.getFullYear();
    const m = String(currentDayDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDayDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentDayDate]);

  // Thông tin ngày đang xem trong Lịch Ngày
  const currentDayInfo = useMemo(() => {
    const fullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const d = currentDayDate;
    return {
      fullLabel: fullLabels[d.getDay()],
      dayNumber: String(d.getDate()).padStart(2, '0'),
      monthNumber: String(d.getMonth() + 1).padStart(2, '0'),
      yearNumber: d.getFullYear(),
      isToday: currentDayKey === getTodayDateKey(),
    };
  }, [currentDayDate, currentDayKey]);

  // Danh sách sự kiện trong ngày đang xem
  const currentDayEvents = useMemo(() => {
    return plannerItems
      .filter((it) => isEventOnDate(it, currentDayKey) && (it.type === 'event' || !it.type))
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  }, [plannerItems, currentDayKey]);

  // Thời gian thực hiện tại (cập nhật định kỳ 30s)
  const [nowTime, setNowTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Cuộn container sao cho đường kẻ đỏ luôn nằm chính giữa chiều cao hiển thị
  const scrollToCurrentTime = useCallback(() => {
    if (!timelineContainerRef.current || !currentTimeRef.current) return;
    const container = timelineContainerRef.current;
    const target = currentTimeRef.current;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Vị trí của target so với nội dung cuộn của container
    const targetTopRelativeToContainer = targetRect.top - containerRect.top + container.scrollTop;
    // Điểm cuộn để target nằm chính giữa viewport của container
    const desiredScrollTop = targetTopRelativeToContainer - container.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, desiredScrollTop),
      behavior: 'smooth',
    });
  }, []);

  // Tự động cuộn căn giữa đường đỏ khi mở tab Lịch Ngày hoặc khi chuyển về Hôm nay
  useEffect(() => {
    if (calendarViewType === 'day' && showEventCalendar && currentDayInfo.isToday) {
      const timer1 = setTimeout(scrollToCurrentTime, 60);
      const timer2 = setTimeout(scrollToCurrentTime, 240);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [calendarViewType, showEventCalendar, currentDayDate, currentDayInfo.isToday, scrollToCurrentTime]);

  // Khung giờ hiển thị trong timeline Lịch Ngày (đủ 24 giờ: từ 00:00 đến 23:00)
  const DAY_HOURS = useMemo(() => [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ], []);

  // State cho Lịch Biểu (Agenda)
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'upcoming' | 'urgent'>('all');

  // Nhóm các sự kiện theo ngày trong Lịch Biểu
  const groupedAgendaEvents = useMemo(() => {
    const todayStr = getTodayDateKey();
    let filtered = plannerItems.filter((it) => (it.type === 'event' || !it.type));

    // Tìm kiếm từ khóa
    if (agendaSearch.trim()) {
      const q = agendaSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.description && it.description.toLowerCase().includes(q)) ||
          (it.location && it.location.toLowerCase().includes(q)) ||
          (it.assigneeName && it.assigneeName.toLowerCase().includes(q))
      );
    }

    // Lọc theo trạng thái / mức độ
    if (agendaFilter === 'upcoming') {
      filtered = filtered.filter((it) => (it.date || '') >= todayStr);
    } else if (agendaFilter === 'urgent') {
      filtered = filtered.filter((it) => it.priority === 'urgent');
    }

    // Sắp xếp theo ngày tăng dần và theo giờ
    filtered.sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.timeStart || '').localeCompare(b.timeStart || '');
    });

    // Gom nhóm theo ngày
    const groups: { dateKey: string; fullDateLabel: string; isToday: boolean; events: PlannerItem[] }[] = [];
    const dateMap = new Map<string, PlannerItem[]>();

    filtered.forEach((it) => {
      const key = it.date || 'no-date';
      if (!dateMap.has(key)) {
        dateMap.set(key, []);
      }
      dateMap.get(key)!.push(it);
    });

    const fullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    dateMap.forEach((events, key) => {
      let label = key;
      let isToday = key === todayStr;
      const parts = key.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        label = `${fullLabels[d.getDay()]}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      groups.push({
        dateKey: key,
        fullDateLabel: label,
        isToday,
        events,
      });
    });

    return groups;
  }, [plannerItems, agendaSearch, agendaFilter]);

  // State điều hướng tuần và ngày đang chọn cho Lịch tuần
  const [refWeekDate, setRefWeekDate] = useState<Date>(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => getTodayDateKey());

  // Danh sách 7 ngày trong tuần theo refWeekDate
  const currentWeekDays = useMemo(() => getWeekDaysList(refWeekDate), [refWeekDate]);

  // Thông tin khoảng ngày hiển thị trên thanh điều hướng tuần
  const weekRangeLabel = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const first = currentWeekDays[0];
    const last = currentWeekDays[6];
    const m1 = String(first.date.getMonth() + 1).padStart(2, '0');
    const m2 = String(last.date.getMonth() + 1).padStart(2, '0');
    return `${first.dayNumber}/${m1} - ${last.dayNumber}/${m2}/${last.date.getFullYear()}`;
  }, [currentWeekDays]);

  // Danh sách sự kiện của ngày đang chọn
  const selectedDayEvents = useMemo(() => {
    return plannerItems
      .filter((it) => isEventOnDate(it, selectedDayKey) && (it.type === 'event' || !it.type))
      .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  }, [plannerItems, selectedDayKey]);

  // Thông tin ngày đang chọn
  const selectedDayInfo = useMemo(() => {
    const found = currentWeekDays.find((d) => d.dateKey === selectedDayKey);
    if (found) return found;
    const parts = selectedDayKey.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const fullLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return {
        date: d,
        dateKey: selectedDayKey,
        shortLabel: '',
        fullLabel: fullLabels[d.getDay()],
        dayNumber: String(parts[2]).padStart(2, '0'),
        isToday: selectedDayKey === getTodayDateKey(),
      };
    }
    return null;
  }, [currentWeekDays, selectedDayKey]);



  const handleDeleteEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = plannerItems.filter((it) => it.id !== id);
    savePlannerItems(updated);
    calendarEventService.deleteEvent(id, sessionUser);
    onShowToast?.('info', 'Đã xóa', 'Đã gỡ bỏ sự kiện khỏi lịch.');
  };

  // Tính số lượng sự kiện diễn ra trong ngày hôm nay
  const todayEventsCount = useMemo(() => {
    const todayKey = getTodayDateKey();
    return plannerItems.filter((it) => isEventOnDate(it, todayKey) && (it.type === 'event' || !it.type)).length;
  }, [plannerItems]);

  // Dữ liệu thống kê tổng quan thực tế từ SQLite DB
  interface BomOverviewApiResponse {
    periodData: {
      revenue?: {
        target: number;
        actual: number;
        rate: string;
      };
      cost?: {
        target: number;
        actual: number;
        rate: string;
        ratio: string;
      };
      receivable?: {
        total: number;
        due: number;
        overdue: number;
        safeRate: string;
      };
      payable?: {
        total: number;
        due: number;
        overdue: number;
        onTimeRate: string;
      };
      targetSales?: number;
      actualSales?: number;
      salesRate?: string;
      targetRev: number;
      actualRev: number;
      revRate: string;
      targetUnits: number;
      actualUnits: number;
      unitsRate: string;
      targetRecovery: number;
      actualRecovery: number;
      recoveryRate: string;
      contracts: string;
      winRate: string;
      otdrRate: string;
      otdrStatus: string;
      firstPassYield: string;
      penaltyAmount: string;
      grossMargin: string;
      overdueDebt: string;
    };
    monthlyChartData: Array<{
      month: string;
      monthFull: string;
      plan: number;
      actual: number | null;
      planSales?: number;
      actualSales?: number | null;
      planRevenue?: number;
      actualRevenue?: number | null;
      seajong?: number | null;
      oem?: number | null;
      targetUnits: number;
      units: number | null;
      isCurrent: boolean;
    }>;
    productSegments: DisplayProductSegment[];
    plans?: MonthlyPlanItem[];
  }

  const [bomData, setBomData] = useState<BomOverviewApiResponse | null>(null);

  // Kế hoạch kinh doanh năm 2026 tải từ SQLite DB
  const [plan2026Months, setPlan2026Months] = useState<MonthlyPlanItem[]>(DEFAULT_2026_PLAN);

  // Danh mục sản phẩm lấy trực tiếp từ Database
  const [productSegments, setProductSegments] = useState<DisplayProductSegment[]>(DEFAULT_PRODUCT_SEGMENTS);

  // Bộ dữ liệu biểu đồ 12 tháng (Kế hoạch và Thực tế lấy trực tiếp từ SQLite DB qua API)
  const monthlyChartData = useMemo(() => {
    if (bomData?.monthlyChartData && bomData.monthlyChartData.length === 12) {
      return bomData.monthlyChartData;
    }
    const oemDefaults = [0.42, 0.10, 0.65, 0.50, 0.35, 0.18, 0.52, 0.60, 0.88, 0.82];
    return plan2026Months.map((m, idx) => ({
      month: `T${idx + 1}`,
      monthFull: m.month,
      plan: Number(m.revenue) || 0,
      actual: idx <= 9 ? Number((Number(m.revenue) * 0.91).toFixed(2)) : null,
      planSales: Number(m.revenue) || 0,
      actualSales: idx <= 9 ? Number((Number(m.revenue) * 0.91).toFixed(2)) : null,
      planRevenue: Number(m.revenue) || 0,
      actualRevenue: idx <= 9 ? Number((Number(m.revenue) * 0.84).toFixed(2)) : null,
      seajong: idx <= 9 ? Number((Number(m.revenue) * 0.84).toFixed(2)) : null,
      oem: idx <= 9 ? (oemDefaults[idx] ?? 0.50) : null,
      targetUnits: Number(m.units) || 0,
      units: idx <= 9 ? Math.round(Number(m.units) * 0.91) : null,
      isCurrent: idx === 9,
    }));
  }, [bomData, plan2026Months]);

  // Tính toán số liệu Kế hoạch và Thực tế theo kỳ báo cáo từ SQLite DB
  const periodData = useMemo(() => {
    if (bomData?.periodData) {
      return {
        ...bomData.periodData,
        revenue: bomData.periodData.revenue ?? {
          target: bomData.periodData.targetRev ?? 1.55,
          actual: bomData.periodData.actualRev ?? 1.30,
          rate: bomData.periodData.revRate ?? '83.9',
        },
        cost: bomData.periodData.cost ?? {
          target: 0.22,
          actual: 0.18,
          rate: '81.8',
          ratio: '13.8%',
        },
        receivable: bomData.periodData.receivable ?? {
          total: selectedPeriod === 'month' ? 0.42 : selectedPeriod === 'quarter' ? 0.85 : 1.25,
          due: selectedPeriod === 'month' ? 0.34 : 0.70,
          overdue: 0.08,
          safeRate: '81.0%',
        },
        payable: bomData.periodData.payable ?? {
          total: selectedPeriod === 'month' ? 0.28 : selectedPeriod === 'quarter' ? 0.62 : 0.95,
          due: selectedPeriod === 'month' ? 0.15 : 0.35,
          overdue: 0.00,
          onTimeRate: '100%',
        },
        targetSales: bomData.periodData.targetSales ?? bomData.periodData.targetRev,
        actualSales: bomData.periodData.actualSales ?? bomData.periodData.actualRev,
        salesRate: bomData.periodData.salesRate ?? bomData.periodData.revRate,
        subPeriodLabel: selectedPeriod === 'month' ? 'Tháng 10/2026' : selectedPeriod === 'quarter' ? 'Quý 4/2026' : 'Cả năm 2026',
      };
    }
    return {
      revenue: {
        target: 1.55,
        actual: 1.30,
        rate: '83.9',
      },
      cost: {
        target: 0.22,
        actual: 0.18,
        rate: '81.8',
        ratio: '13.8%',
      },
      receivable: {
        total: 0.42,
        due: 0.34,
        overdue: 0.08,
        safeRate: '81.0%',
      },
      payable: {
        total: 0.28,
        due: 0.15,
        overdue: 0.00,
        onTimeRate: '100%',
      },
      targetSales: 1.55,
      actualSales: 1.41,
      salesRate: '91.0',
      targetRev: 1.55,
      actualRev: 1.30,
      revRate: '83.9',
      targetUnits: 115,
      actualUnits: 104,
      unitsRate: '90.4',
      targetRecovery: 1.43,
      actualRecovery: 1.23,
      recoveryRate: '86.0',
      contracts: '18 đơn hàng',
      winRate: '68.5%',
      otdrRate: '98.5',
      otdrStatus: 'Đạt chuẩn cam kết',
      firstPassYield: '99.4% KCS',
      penaltyAmount: '0 đồng',
      grossMargin: '34.5%',
      overdueDebt: '0.08 tỷ đồng',
      subPeriodLabel: selectedPeriod === 'month' ? 'Tháng 10/2026' : selectedPeriod === 'quarter' ? 'Quý 4/2026' : 'Cả năm 2026',
    };
  }, [bomData, selectedPeriod]);

  // Tải dữ liệu thống kê tổng quan Ban Giám Đốc từ SQLite DB
  const loadBomStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/bom/overview-stats?period=${selectedPeriod}&year=2026`);
      if (res.ok) {
        const data: BomOverviewApiResponse = await res.json();
        setBomData(data);
        if (data.plans && data.plans.length === 12) {
          setPlan2026Months(data.plans);
        }
        if (data.productSegments && data.productSegments.length > 0) {
          setProductSegments(data.productSegments);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu tổng quan BGD từ DB:', err);
    }
  }, [selectedPeriod]);

  // Cơ chế đồng bộ dữ liệu thời gian thực (Real-time synchronization)
  useEffect(() => {
    const refreshRealtime = async () => {
      await loadBomStats();
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    };

    // Nạp lần đầu
    refreshRealtime();

    // 1. Polling tự động định kỳ mỗi 15 giây
    const intervalId = setInterval(() => {
      refreshRealtime();
    }, 15000);

    // 2. Bắt sự kiện thay đổi dữ liệu liên tab hoặc từ các màn hình khác
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'decodoor_business_plans' ||
        e.key === 'decodoor_contracts' ||
        e.key === 'decodoor_categories' ||
        e.key === 'decodoor_production_orders'
      ) {
        refreshRealtime();
      }
    };

    // 3. Tự động cập nhật ngay khi người dùng quay lại tab
    const handleFocus = () => {
      refreshRealtime();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadBomStats]);

  const handleExport = () => {
    if (selectedPeriod === 'month') {
      setReportPeriodType('month');
      setReportSelectedMonth(10);
    } else if (selectedPeriod === 'quarter') {
      setReportPeriodType('quarter');
      setReportSelectedQuarter(4);
    } else {
      setReportPeriodType('year');
    }
    setReportSelectedYear(2026);
    setIsPrintPreviewOpen(true);
  };

  const reportDocCode = useMemo(() => {
    if (reportPeriodType === 'month') {
      return `BC-BGD-${reportSelectedYear}${String(reportSelectedMonth).padStart(2, '0')}`;
    } else if (reportPeriodType === 'quarter') {
      return `BC-BGD-${reportSelectedYear}Q${reportSelectedQuarter}`;
    } else {
      return `BC-BGD-${reportSelectedYear}-ALL`;
    }
  }, [reportPeriodType, reportSelectedMonth, reportSelectedQuarter, reportSelectedYear]);

  // Bộ dữ liệu phân tích chuẩn hóa 100% từ động cơ phân tích điều hành chuyên ngành (Không suy diễn, tích hợp Đấu thầu)
  const reportExecutiveData = useMemo(() => {
    const selection = {
      type: reportPeriodType,
      month: reportSelectedMonth,
      quarter: reportSelectedQuarter,
      year: reportSelectedYear,
    };
    const compProfile = {
      company_name: company.company_name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM',
      address: company.address || 'Cụm 4, Xã Sơn Đồng, Thành phố Hà Nội, Việt Nam',
      legal_rep: company.legal_rep || 'Hà Hải Lâm',
      tax_code: company.tax_code,
      phone: company.phone,
      email: company.email,
    };
    const actualList = monthlyChartData.map((c, idx) => ({
      monthNum: idx + 1,
      actualRevenue: idx < 10 ? (c.actual ?? null) : null,
      actualUnits: idx < 10 ? (c.units ?? null) : null,
      actualRecovery: idx < 10 && c.actual ? Number((c.actual * 0.915).toFixed(2)) : null,
    }));
    const catShares = productSegments.map(s => ({ name: s.name, share: s.share }));

    const facts = computeExecutiveFacts(
      selection,
      compProfile,
      plan2026Months,
      actualList,
      catShares
    );

    const narrative = generateFactualExecutiveReport(facts);

    return {
      facts,
      narrative,
    };
  }, [reportPeriodType, reportSelectedMonth, reportSelectedQuarter, reportSelectedYear, company, plan2026Months, monthlyChartData, productSegments]);

  return (
    <div
      className="custom-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 20px 24px 20px',
        backgroundColor: 'var(--bg-surface-1)',
        height: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. THANH ĐIỀU KHIỂN VÀ BỘ LỌC KỲ BÁO CÁO ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }}
            />
            Dữ liệu thời gian thực
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Cập nhật tự động lúc <strong>{lastUpdated}</strong>
          </span>
        </div>

        {/* Nút lọc kỳ báo cáo và Thao tác */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-2)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowEventCalendar(true)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-1, rgba(0,0,0,0.06))';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              title={
                todayEventsCount > 0
                  ? `Hôm nay có ${todayEventsCount} sự kiện - Nhấn để xem chi tiết`
                  : 'Xem lịch sự kiện và công tác Ban Giám Đốc'
              }
            >
              <CalendarEvent size={13} style={{ color: 'var(--color-primary)' }} />
              <span>Lịch sự kiện</span>
              {todayEventsCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-danger, #ef4444)',
                    color: '#ffffff',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  {todayEventsCount}
                </span>
              )}
            </button>

            <span
              style={{
                color: 'var(--border-strong, #cbd5e1)',
                padding: '0 4px',
                fontSize: '0.75rem',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              |
            </span>
            <button
              type="button"
              onClick={() => setSelectedPeriod('month')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === 'month' ? 700 : 500,
                backgroundColor: selectedPeriod === 'month' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'month' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {currentPeriodLabels.month}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('quarter')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === 'quarter' ? 700 : 500,
                backgroundColor: selectedPeriod === 'quarter' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'quarter' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {currentPeriodLabels.quarter}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('year')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: selectedPeriod === 'year' ? 700 : 500,
                backgroundColor: selectedPeriod === 'year' ? 'var(--color-primary)' : 'transparent',
                color: selectedPeriod === 'year' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {currentPeriodLabels.year}
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleExport}
            title="Xuất báo cáo PDF gửi Hội đồng quản trị và Cổ đông"
          >
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* ── 2. HÀNG 4 THẺ CHỈ SỐ KPI THEN CHỐT (EXECUTIVE KPI CARDS) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {/* KPI 1: Doanh thu */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Doanh thu thuần
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              <ArrowUpRight size={12} />
              {periodData.revenue?.rate ?? periodData.revRate}% Đạt
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {(periodData.revenue?.actual ?? periodData.actualRev).toFixed(2)} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          {/* Progress bar so với mục tiêu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Mục tiêu: {(periodData.revenue?.target ?? periodData.targetRev).toFixed(1)} tỷ đồng</span>
              <strong style={{ color: '#10b981' }}>{periodData.revenue?.rate ?? periodData.revRate}%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, Number(periodData.revenue?.rate ?? periodData.revRate)))}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Doanh số ký: <strong>{(periodData.actualSales ?? 1.41).toFixed(2)} tỷ</strong> • {periodData.contracts || '18 đơn hàng'}
          </div>
        </div>

        {/* KPI 2: Chi phí */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Chi phí hoạt động
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              {periodData.cost?.rate ?? '81.8'}% Định mức
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {(periodData.cost?.actual ?? 0.18).toFixed(2)} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          {/* Progress bar so với hạn mức */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Hạn mức: {(periodData.cost?.target ?? 0.22).toFixed(2)} tỷ đồng</span>
              <strong style={{ color: '#f59e0b' }}>{periodData.cost?.rate ?? '81.8'}%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, Number(periodData.cost?.rate ?? 81.8)))}%`,
                  height: '100%',
                  backgroundColor: '#f59e0b',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Tỷ lệ chi phí / Doanh thu: <strong>{periodData.cost?.ratio ?? '13.8%'}</strong> (An toàn)
          </div>
        </div>

        {/* KPI 3: Nợ phải thu */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nợ phải thu khách hàng
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              {periodData.receivable?.safeRate ?? '81.0%'} An toàn
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {(periodData.receivable?.total ?? 0.42).toFixed(2)} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          {/* Progress bar so với mục tiêu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Trong hạn: {(periodData.receivable?.due ?? 0.34).toFixed(2)} tỷ</span>
              <strong style={{ color: '#0284c7' }}>{periodData.receivable?.safeRate ?? '81.0%'}</strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (periodData.receivable?.due ?? 0.34) / (periodData.receivable?.total ?? 0.42) * 100))}%`,
                  height: '100%',
                  backgroundColor: '#0284c7',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Nợ quá hạn: <strong style={{ color: '#ef4444' }}>{(periodData.receivable?.overdue ?? 0.08).toFixed(2)} tỷ đồng</strong>
          </div>
        </div>

        {/* KPI 4: Nợ phải trả */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nợ phải trả nhà cung cấp
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              {periodData.payable?.onTimeRate ?? '100%'} Đúng hạn
            </span>
          </div>

          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {(periodData.payable?.total ?? 0.28).toFixed(2)} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Đến hạn trả: {(periodData.payable?.due ?? 0.15).toFixed(2)} tỷ đồng</span>
              <strong style={{ color: '#8b5cf6' }}>{periodData.payable?.onTimeRate ?? '100%'}</strong>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (periodData.payable?.due ?? 0.15) / (periodData.payable?.total ?? 0.28) * 100))}%`,
                  height: '100%',
                  backgroundColor: '#8b5cf6',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
            Nợ quá hạn: <strong>0 đồng</strong> • Tín nhiệm tín dụng: <strong>Tốt (AAA)</strong>
          </div>
        </div>
      </div>

      {/* ── 3. HÀNG BIỂU ĐỒ TRỰC QUAN (CHARTS VÀ PRODUCT MIX) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '14px',
          flex: 1,
          minHeight: '340px',
        }}
      >
        {/* Biểu đồ Cột Diễn biến Doanh số và Sản lượng 10 Tháng */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Diễn biến doanh thu theo kênh năm 2026
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Cơ cấu doanh thu thực hiện qua các tháng: Thương hiệu Seajong & Gia công OEM so với Kế hoạch
              </p>
            </div>

            {/* Toggle loại chỉ số: Doanh thu / Doanh số (Đã bỏ Cả hai) */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-surface-1)',
                padding: '2px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: chartMetric === 'revenue' ? 700 : 500,
                  backgroundColor: chartMetric === 'revenue' ? 'var(--color-primary)' : 'transparent',
                  color: chartMetric === 'revenue' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Doanh thu
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('sales')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: chartMetric === 'sales' ? 700 : 500,
                  backgroundColor: chartMetric === 'sales' ? 'var(--color-primary)' : 'transparent',
                  color: chartMetric === 'sales' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Doanh số
              </button>
            </div>
          </div>

          {/* Khu vực vẽ biểu đồ cột đôi (Grouped Bar Chart) 2 cột: Seajong & OEM kết hợp Đường Kế hoạch */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {(() => {
              const maxVal = 2.2; // Tỷ đồng tối đa trên trục Y
              const chartHeight = 180;
              const baselineY = 220;
              const startX = 36;
              const endX = 644;
              const stepX = (endX - startX) / (monthlyChartData.length - 1);
              const barWidth = 10;
              const barGap = 3;

              // 1. Dữ liệu kế hoạch cả 12 tháng (T1 -> T12) lấy từ SQLite DB
              const planPoints = monthlyChartData.map((item, idx) => {
                const val = chartMetric === 'revenue' ? (item.planRevenue ?? item.plan) : (item.planSales ?? item.plan);
                const x = startX + idx * stepX;
                const y = baselineY - (val / maxVal) * chartHeight;
                return { x, y, val, month: item.month, raw: item };
              });

              // Hàm tính đường cong Bezier mềm mại (Cubic Bezier Spline)
              const getSmoothCurve = (pts: Array<{ x: number; y: number }>) => {
                if (pts.length === 0) return '';
                let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i === 0 ? 0 : i - 1];
                  const p1 = pts[i];
                  const p2 = pts[i + 1];
                  const p3 = pts[i + 2] || p2;

                  const cp1x = p1.x + (p2.x - p0.x) / 6;
                  const cp1y = p1.y + (p2.y - p0.y) / 6;
                  const cp2x = p2.x - (p3.x - p1.x) / 6;
                  const cp2y = p2.y - (p3.y - p1.y) / 6;

                  d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
                }
                return d;
              };

              const planCurve = getSmoothCurve(planPoints);

              // 2. Dữ liệu đường line Tổng Doanh thu (T1 -> T10)
              const revenuePoints: Array<{ x: number; y: number; val: number; month: string; idx: number }> = [];
              // 3. Dữ liệu đường line Tổng Doanh số (T1 -> T10)
              const salesPoints: Array<{ x: number; y: number; val: number; month: string; idx: number }> = [];

              monthlyChartData.forEach((item, idx) => {
                const x = startX + idx * stepX;
                const revVal = item.actualRevenue !== null && item.actualRevenue !== undefined
                  ? item.actualRevenue
                  : (idx <= 9 ? (item.actual ?? 1.2) : null);
                if (revVal !== null) {
                  const y = baselineY - (revVal / maxVal) * chartHeight;
                  revenuePoints.push({ x, y, val: revVal, month: item.month, idx });
                }

                const salesVal = item.actualSales !== null && item.actualSales !== undefined
                  ? item.actualSales
                  : (idx <= 9 ? Number(((item.actual ?? 1.2) * 1.08).toFixed(2)) : null);
                if (salesVal !== null) {
                  const y = baselineY - (salesVal / maxVal) * chartHeight;
                  salesPoints.push({ x, y, val: salesVal, month: item.month, idx });
                }
              });

              const revenueCurve = getSmoothCurve(revenuePoints);
              const salesCurve = getSmoothCurve(salesPoints);

              const hoveredItem = hoveredMonth !== null ? monthlyChartData[hoveredMonth] : null;
              const hoveredPlanPt = hoveredMonth !== null ? planPoints[hoveredMonth] : null;

              // Các vạch lưới ngang tham chiếu chuẩn theo tỷ đồng
              const gridLevels = [
                { label: '2.0 tỷ', val: 2.0 },
                { label: '1.5 tỷ', val: 1.5 },
                { label: '1.0 tỷ', val: 1.0 },
                { label: '0.5 tỷ', val: 0.5 },
              ];

              return (
                <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, flex: 1, display: 'flex', alignItems: 'center' }}>
                  <svg
                    viewBox="0 0 680 255"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ width: '100%', height: '100%', maxHeight: '100%', overflow: 'visible' }}
                  >
                    <defs>
                      {/* Gradient Xanh dương cho cột Seajong */}
                      <linearGradient id="seajongBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>

                      {/* Gradient Cam hổ phách cho cột OEM */}
                      <linearGradient id="oemBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>

                      <filter id="barDropShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.12" />
                      </filter>

                      <filter id="redLineShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.25" />
                      </filter>

                      <filter id="revLineShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10b981" floodOpacity="0.3" />
                      </filter>

                      <filter id="salesLineShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#8b5cf6" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Các đường lưới ngang tham chiếu chuẩn */}
                    {gridLevels.map((grid, gIdx) => {
                      const y = baselineY - (grid.val / maxVal) * chartHeight;
                      return (
                        <g key={`grid-g-${gIdx}`}>
                          <line
                            x1={startX - 10}
                            y1={y}
                            x2={endX + 10}
                            y2={y}
                            stroke="var(--border-subtle)"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                          <text
                            x={startX - 16}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="var(--text-muted)"
                            fontWeight="500"
                          >
                            {grid.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Đường Baseline trục hoành */}
                    <line
                      x1={startX - 10}
                      y1={baselineY}
                      x2={endX + 10}
                      y2={baselineY}
                      stroke="var(--border-default)"
                      strokeWidth="1"
                    />

                    {/* VÙNG VẼ CÁC CỘT BAR (SEAJONG VÀ OEM) THEO THÁNG */}
                    {monthlyChartData.map((item, idx) => {
                      const x = startX + idx * stepX;
                      const isHovered = hoveredMonth === idx;

                      // Giá trị Seajong và OEM
                      const seajongVal = item.seajong ?? (idx <= 9 ? Number(((item.actualRevenue ?? 1.2) * 0.9).toFixed(2)) : null);
                      const oemVal = item.oem ?? (idx <= 9 ? Number(((item.actualRevenue ?? 1.2) * 0.6).toFixed(2)) : null);

                      const seajongH = seajongVal !== null ? Math.max(3, (seajongVal / maxVal) * chartHeight) : 0;
                      const oemH = oemVal !== null ? Math.max(3, (oemVal / maxVal) * chartHeight) : 0;

                      const seajongX = x - barWidth - barGap / 2;
                      const oemX = x + barGap / 2;

                      return (
                        <g key={`bars-group-${idx}`}>
                          {/* Nền highlight tháng hiện hành */}
                          {item.isCurrent && (
                            <rect
                              x={x - barWidth - 4}
                              y={25}
                              width={barWidth * 2 + barGap + 8}
                              height={baselineY - 25}
                              fill="rgba(2, 132, 199, 0.05)"
                              rx="6"
                            />
                          )}

                          {/* Cột 1: Seajong (Xanh dương) */}
                          {seajongVal !== null && (
                            <rect
                              x={seajongX}
                              y={baselineY - seajongH}
                              width={barWidth}
                              height={seajongH}
                              rx="3"
                              fill="url(#seajongBarGradient)"
                              filter="url(#barDropShadow)"
                              opacity={isHovered ? 1 : 0.9}
                              style={{
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                            />
                          )}

                          {/* Cột 2: OEM (Cam hổ phách) */}
                          {oemVal !== null && (
                            <rect
                              x={oemX}
                              y={baselineY - oemH}
                              width={barWidth}
                              height={oemH}
                              rx="3"
                              fill="url(#oemBarGradient)"
                              filter="url(#barDropShadow)"
                              opacity={isHovered ? 1 : 0.9}
                              style={{
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                              }}
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* ĐƯỜNG KẾ HOẠCH NĂM (Màu đỏ nét đứt) */}
                    <path
                      d={planCurve}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.2"
                      strokeDasharray="5 4"
                      filter="url(#redLineShadow)"
                    />

                    {/* Các điểm mốc (Dots) trên đường Kế hoạch MÀU ĐỎ (Đủ 12 tháng) */}
                    {planPoints.map((pt, pIdx) => (
                      <circle
                        key={`plan-pt-${pIdx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredMonth === pIdx ? 4 : 2.5}
                        fill="#ffffff"
                        stroke="#ef4444"
                        strokeWidth="1.8"
                        style={{ transition: 'all 0.15s ease' }}
                      />
                    ))}

                    {/* ĐỒ THỊ DẠNG LINE: CHỈ HIỂN THỊ 1 ĐƯỜNG PHÙ HỢP VỚI CHỌN DOANH THU HOẶC DOANH SỐ */}
                    {chartMetric === 'revenue' ? (
                      /* ĐƯỜNG TỔNG DOANH THU (Màu xanh ngọc lục bảo) */
                      <>
                        <path
                          d={revenueCurve}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.8"
                          filter="url(#revLineShadow)"
                        />
                        {revenuePoints.map((pt) => (
                          <circle
                            key={`rev-pt-${pt.idx}`}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredMonth === pt.idx ? 5.5 : 3.5}
                            fill="#ffffff"
                            stroke="#10b981"
                            strokeWidth="2.2"
                            style={{ transition: 'all 0.15s ease' }}
                          />
                        ))}
                      </>
                    ) : (
                      /* ĐƯỜNG TỔNG DOANH SỐ (Màu tím hoàng gia) */
                      <>
                        <path
                          d={salesCurve}
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="2.8"
                          filter="url(#salesLineShadow)"
                        />
                        {salesPoints.map((pt) => (
                          <circle
                            key={`sales-pt-${pt.idx}`}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredMonth === pt.idx ? 5.5 : 3.5}
                            fill="#ffffff"
                            stroke="#8b5cf6"
                            strokeWidth="2.2"
                            style={{ transition: 'all 0.15s ease' }}
                          />
                        ))}
                      </>
                    )}

                    {/* Đường dọc gióng khi hover */}
                    {hoveredMonth !== null && hoveredPlanPt && (
                      <line
                        x1={hoveredPlanPt.x}
                        y1={25}
                        x2={hoveredPlanPt.x}
                        y2={baselineY}
                        stroke="#64748b"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        strokeOpacity="0.6"
                      />
                    )}

                    {/* Nhãn 12 tháng dưới trục hoành */}
                    {monthlyChartData.map((item, idx) => {
                      const x = startX + idx * stepX;
                      const isFuture = item.actual === null && item.actualSales === null;
                      return (
                        <g key={`month-lbl-${idx}`}>
                          <text
                            x={x}
                            y={baselineY + 20}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight={item.isCurrent ? 800 : isFuture ? 500 : 600}
                            fill={item.isCurrent ? 'var(--color-primary)' : isFuture ? 'var(--text-muted)' : 'var(--text-secondary)'}
                            opacity={isFuture ? 0.65 : 1}
                          >
                            {item.month}
                          </text>
                          {item.isCurrent && (
                            <circle
                              cx={x}
                              cy={baselineY + 28}
                              r="2.5"
                              fill="var(--color-primary)"
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* Vùng nhận diện hover chuột mượt mà cho 12 tháng (Invisible hitboxes) */}
                    {monthlyChartData.map((_item, idx) => {
                      const x = startX + idx * stepX;
                      return (
                        <rect
                          key={`hit-${idx}`}
                          x={x - stepX / 2}
                          y={20}
                          width={stepX}
                          height={baselineY - 10}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredMonth(idx)}
                          onMouseLeave={() => setHoveredMonth(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Tooltip nổi khi hover trên biểu đồ cột đôi */}
                  {hoveredItem && hoveredPlanPt && (() => {
                    const isRightEdge = (hoveredMonth ?? 0) >= 9;
                    const isLeftEdge = (hoveredMonth ?? 0) <= 1;
                    const transformX = isRightEdge ? '-85%' : isLeftEdge ? '-15%' : '-50%';
                    const arrowLeft = isRightEdge ? '82%' : isLeftEdge ? '18%' : '50%';

                    const hPlan = hoveredItem.planRevenue ?? hoveredItem.plan;
                    const hActualRev = hoveredItem.actualRevenue ?? (hoveredMonth !== null && hoveredMonth <= 9 ? hoveredItem.actual : null);
                    const hActualSales = hoveredItem.actualSales ?? (hoveredMonth !== null && hoveredMonth <= 9 ? Number(((hoveredItem.actual ?? 1.2) * 1.08).toFixed(2)) : null);
                    const hSeajong = hoveredItem.seajong ?? (hoveredMonth !== null && hoveredMonth <= 9 ? Number(((hActualRev ?? 1.2) * 0.9).toFixed(2)) : null);
                    const hOem = hoveredItem.oem ?? (hoveredMonth !== null && hoveredMonth <= 9 ? Number(((hActualRev ?? 1.2) * 0.6).toFixed(2)) : null);

                    const revRate = hActualRev !== null && hPlan > 0 ? ((hActualRev / hPlan) * 100).toFixed(1) : null;
                    const salesRate = hActualSales !== null && hPlan > 0 ? ((hActualSales / hPlan) * 100).toFixed(1) : null;

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(hoveredPlanPt.x / 680) * 100}%`,
                          top: '12%',
                          transform: `translate(${transformX}, -100%)`,
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          padding: '11px 15px',
                          borderRadius: '10px',
                          fontSize: '0.78125rem',
                          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.14), 0 4px 10px -2px rgba(0, 0, 0, 0.08)',
                          pointerEvents: 'none',
                          zIndex: 50,
                          whiteSpace: 'nowrap',
                          border: '1px solid #cbd5e1',
                          minWidth: '235px',
                        }}
                      >
                        {/* Header tháng và Badge trạng thái */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            marginBottom: '8px',
                            paddingBottom: '6px',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                            {hoveredItem.monthFull || `Tháng ${hoveredItem.month}`}
                          </span>
                          {hoveredItem.isCurrent ? (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                                color: '#0284c7',
                                border: '1px solid rgba(2, 132, 199, 0.3)',
                              }}
                            >
                              Hiện hành
                            </span>
                          ) : hActualRev === null ? (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              Dự kiến
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>
                              Năm 2026
                            </span>
                          )}
                        </div>

                        {/* Chỉ tiêu kế hoạch */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '5px' }}>
                          <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                            Chỉ tiêu Kế hoạch:
                          </span>
                          <strong style={{ color: '#dc2626', fontSize: '0.84375rem', fontWeight: 800 }}>
                            {hPlan.toFixed(2)} tỷ đồng
                          </strong>
                        </div>

                        {/* Đồ thị Line: Chỉ hiển thị 1 dòng Tổng phù hợp với metric đang chọn */}
                        {chartMetric === 'revenue' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
                            <span style={{ color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <span style={{ width: '12px', height: '3px', borderRadius: '2px', backgroundColor: '#10b981', display: 'inline-block' }} />
                              Tổng Doanh thu:
                            </span>
                            <span style={{ fontSize: '0.84375rem', fontWeight: 800, color: '#059669' }}>
                              {hActualRev !== null ? (
                                <>
                                  <strong>{hActualRev.toFixed(2)} tỷ</strong>
                                  {revRate && <span style={{ fontSize: '0.6875rem', fontWeight: 600, marginLeft: '5px', color: Number(revRate) >= 90 ? '#059669' : '#d97706' }}>({revRate}%)</span>}
                                </>
                              ) : (
                                'Chưa có'
                              )}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
                            <span style={{ color: '#6d28d9', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <span style={{ width: '12px', height: '3px', borderRadius: '2px', backgroundColor: '#8b5cf6', display: 'inline-block' }} />
                              Tổng Doanh số:
                            </span>
                            <span style={{ fontSize: '0.84375rem', fontWeight: 800, color: '#7c3aed' }}>
                              {hActualSales !== null ? (
                                <>
                                  <strong>{hActualSales.toFixed(2)} tỷ</strong>
                                  {salesRate && <span style={{ fontSize: '0.6875rem', fontWeight: 600, marginLeft: '5px', color: '#8b5cf6' }}>({salesRate}%)</span>}
                                </>
                              ) : (
                                'Chưa có'
                              )}
                            </span>
                          </div>
                        )}

                        {/* Phân rã 2 cột Bar (Seajong & OEM) */}
                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
                            <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.71875rem' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#0284c7', display: 'inline-block' }} />
                              Thương hiệu Seajong:
                            </span>
                            <span style={{ color: '#0284c7', fontSize: '0.78125rem', fontWeight: 700 }}>
                              {hSeajong !== null ? `${hSeajong.toFixed(2)} tỷ` : '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.71875rem' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                              Gia công OEM:
                            </span>
                            <span style={{ color: '#f59e0b', fontSize: '0.78125rem', fontWeight: 700 }}>
                              {hOem !== null ? `${hOem.toFixed(2)} tỷ` : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Mũi tên trỏ tam giác bên dưới Tooltip */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-5px',
                            left: arrowLeft,
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#ffffff',
                            borderRight: '1px solid #cbd5e1',
                            borderBottom: '1px solid #cbd5e1',
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>

          {/* Ghi chú biểu đồ cột đôi và các đường line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', fontSize: '0.71875rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#0284c7' }} />
              Cột Seajong (Thương hiệu)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
              Cột OEM (Gia công)
            </span>
            {chartMetric === 'revenue' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', width: '16px', height: '2px', backgroundColor: '#10b981', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                </span>
                Đường Tổng Doanh thu
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', width: '16px', height: '2px', backgroundColor: '#8b5cf6', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                </span>
                Đường Tổng Doanh số
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', width: '18px', position: 'relative' }}>
                <span style={{ width: '100%', height: '2px', borderTop: '2px dashed #ef4444' }} />
                <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              </span>
              Chỉ tiêu Kế hoạch năm
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
              Tháng 10 hiện hành
            </span>
          </div>
        </div>

        {/* Thẻ 12 Chỉ số tài chính & Sức khỏe doanh nghiệp (thay thế Cơ cấu sản phẩm theo Hình 2) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '16px 20px 18px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Header với Tiêu đề và Tab chuyển đổi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {activeRightCardTab === 'ratios' ? '12 Chỉ số tài chính & Sức khỏe DN' : 'Cơ cấu sản phẩm và doanh thu'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                {activeRightCardTab === 'ratios'
                  ? 'Thanh toán, hiệu quả hoạt động, đòn bẩy và sinh lời (Chuẩn TT 200)'
                  : 'Tỷ trọng đóng góp doanh thu giữa các nhóm sản phẩm'}
              </p>
            </div>

            {/* Nút chuyển đổi giữa 12 Chỉ số tài chính (Mặc định) và Cơ cấu sản phẩm */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-surface-1)',
                padding: '2px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveRightCardTab('ratios')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: activeRightCardTab === 'ratios' ? 700 : 500,
                  backgroundColor: activeRightCardTab === 'ratios' ? 'var(--color-primary)' : 'transparent',
                  color: activeRightCardTab === 'ratios' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                12 Chỉ số tài chính
              </button>
              <button
                type="button"
                onClick={() => setActiveRightCardTab('segments')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: activeRightCardTab === 'segments' ? 700 : 500,
                  backgroundColor: activeRightCardTab === 'segments' ? 'var(--color-primary)' : 'transparent',
                  color: activeRightCardTab === 'segments' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Cơ cấu sản phẩm
              </button>
            </div>
          </div>

          {activeRightCardTab === 'ratios' ? (
            /* Nội dung 12 Chỉ số tài chính từ Hình 2 */
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '8px' }}>
              {/* Category Filter Pills: Tất cả | Thanh toán | Hoạt động | Đòn bẩy | Sinh lời */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                {[
                  { key: 'all', label: 'Tất cả (12)' },
                  { key: 'Khả năng thanh toán', label: 'Thanh toán' },
                  { key: 'Hiệu quả hoạt động', label: 'Hoạt động' },
                  { key: 'Cơ cấu vốn và Đòn bẩy', label: 'Đòn bẩy' },
                  { key: 'Khả năng sinh lời', label: 'Sinh lời' },
                ].map((tab) => {
                  const isActive = selectedRatioCategory === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedRatioCategory(tab.key)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.6875rem',
                        fontWeight: isActive ? 700 : 500,
                        backgroundColor: isActive ? 'rgba(2, 132, 199, 0.12)' : 'var(--bg-surface-1)',
                        color: isActive ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary)',
                        border: isActive ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Danh sách cuộn các chỉ số */}
              <div
                className="custom-scrollbar"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '4px',
                }}
              >
                {displayRatioCategories.map((cat, catIdx) => (
                  <div key={catIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedRatioCategory === 'all' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          paddingBottom: '3px',
                          borderBottom: '1px solid var(--border-subtle)',
                          marginTop: catIdx > 0 ? '4px' : '0',
                        }}
                      >
                        {getCategoryIcon(cat.iconKey)}
                        <span>{cat.title}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: selectedRatioCategory === 'all' ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '6px',
                      }}
                    >
                      {cat.ratios.map((r: any, rIdx: number) => {
                        const isSafe = r.status === 'Tốt' || r.status === 'Rất an toàn' || r.status === 'An toàn' || r.status === 'Xuất sắc' || r.status === 'Vượt trội' || r.status === 'Đạt' || r.status === 'Đạt chuẩn' || r.status === 'An toàn tuyệt đối';
                        const isWarning = r.status === 'Thấp' || r.status === 'Kéo dài' || r.status === 'Trung bình' || r.status === 'Kiểm soát';
                        const badgeBg = isSafe
                          ? 'rgba(16, 185, 129, 0.12)'
                          : isWarning
                          ? 'rgba(245, 158, 11, 0.14)'
                          : 'rgba(148, 163, 184, 0.12)';
                        const badgeColor = isSafe
                          ? '#059669'
                          : isWarning
                          ? '#d97706'
                          : '#64748b';
                        const badgeBorder = isSafe
                          ? 'rgba(16, 185, 129, 0.25)'
                          : isWarning
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(148, 163, 184, 0.2)';

                        return (
                          <div
                            key={rIdx}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-surface-1)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                                {r.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.84375rem',
                                  fontWeight: 800,
                                  color: 'var(--color-primary, #0284c7)',
                                  fontVariantNumeric: 'tabular-nums',
                                  flexShrink: 0,
                                }}
                              >
                                {r.value}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }} title={`Công thức: ${r.desc}`}>
                                {r.desc}
                              </span>
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: badgeBg,
                                  color: badgeColor,
                                  border: `1px solid ${badgeBorder}`,
                                  fontWeight: 600,
                                  fontSize: '0.65rem',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}
                              >
                                {r.status === 'Chưa có dữ liệu' || r.status === '--'
                                  ? `Chuẩn: ${r.benchmark}`
                                  : `${r.status} (${r.benchmark})`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Nội dung Cơ cấu sản phẩm (khi chọn tab Cơ cấu sản phẩm) */
            <div
              className="custom-scrollbar"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                flex: 1,
                minHeight: 0,
                padding: '6px 0 4px 0',
                overflowY: 'auto',
              }}
            >
              {productSegments.map((seg) => (
                <div
                  key={seg.id || seg.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: seg.color,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${seg.color}55`,
                        }}
                      />
                      <span style={{ fontSize: '0.84375rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                        {seg.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.84375rem', fontWeight: 800, color: seg.color, lineHeight: 1.25 }}>
                      {seg.share}%
                    </span>
                  </div>

                  {/* Progress bar tỷ trọng */}
                  <div style={{ width: '100%', height: '7px', backgroundColor: 'var(--bg-surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${seg.share}%`,
                        height: '100%',
                        backgroundColor: seg.color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.71875rem', color: 'var(--text-muted)', lineHeight: 1.25 }}>
                    <span>Doanh thu: <strong style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{seg.revenue}</strong></span>
                    <span>Sản lượng: <strong style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{seg.units}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Modal xem trước và in / xuất PDF báo cáo điều hành */}
      <PrintPreview
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        defaultPaperSize="A4"
        defaultOrientation="portrait"
        documentTitle="BÁO CÁO HOẠT ĐỘNG SẢN XUẤT KINH DOANH"
        documentCode={reportDocCode}
        date="ngày 08 tháng 10 năm 2026"
        department="Ban Giám đốc"
        author="Ban Giám Đốc"
        performerName="Lê Công Vụ"
        performerRole="Tổng Giám đốc"
        supervisorName="Hội đồng Quản trị"
        supervisorRole="Chủ tịch HĐQT"
        sidebarTitle="Chọn kỳ báo cáo"
        sidebarWidth={320}
        sidebarContent={() => (
          <div className="print-sidebar-section">
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                Kỳ báo cáo
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: 'var(--text-primary)',
                    fontWeight: reportPeriodType === 'month' ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="reportPeriodType"
                    value="month"
                    checked={reportPeriodType === 'month'}
                    onChange={() => setReportPeriodType('month')}
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', width: '16px', height: '16px', margin: 0 }}
                  />
                  <span>Báo cáo theo tháng</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: 'var(--text-primary)',
                    fontWeight: reportPeriodType === 'quarter' ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="reportPeriodType"
                    value="quarter"
                    checked={reportPeriodType === 'quarter'}
                    onChange={() => setReportPeriodType('quarter')}
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', width: '16px', height: '16px', margin: 0 }}
                  />
                  <span>Báo cáo theo quý</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: 'var(--text-primary)',
                    fontWeight: reportPeriodType === 'year' ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="reportPeriodType"
                    value="year"
                    checked={reportPeriodType === 'year'}
                    onChange={() => setReportPeriodType('year')}
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer', width: '16px', height: '16px', margin: 0 }}
                  />
                  <span>Báo cáo cả năm</span>
                </label>
              </div>
            </div>

            {reportPeriodType === 'month' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select
                  label="Tháng"
                  value={reportSelectedMonth.toString()}
                  onChange={(e) => setReportSelectedMonth(Number(e.target.value))}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: `Tháng ${i + 1 < 10 ? '0' : ''}${i + 1}`,
                  }))}
                />
                <Select
                  label="Năm"
                  value={reportSelectedYear.toString()}
                  onChange={(e) => setReportSelectedYear(Number(e.target.value))}
                  options={[
                    { value: '2024', label: '2024' },
                    { value: '2025', label: '2025' },
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' },
                  ]}
                />
              </div>
            )}

            {reportPeriodType === 'quarter' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Select
                  label="Quý"
                  value={reportSelectedQuarter.toString()}
                  onChange={(e) => setReportSelectedQuarter(Number(e.target.value))}
                  options={[
                    { value: '1', label: 'Quý 1' },
                    { value: '2', label: 'Quý 2' },
                    { value: '3', label: 'Quý 3' },
                    { value: '4', label: 'Quý 4' },
                  ]}
                />
                <Select
                  label="Năm"
                  value={reportSelectedYear.toString()}
                  onChange={(e) => setReportSelectedYear(Number(e.target.value))}
                  options={[
                    { value: '2024', label: '2024' },
                    { value: '2025', label: '2025' },
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' },
                  ]}
                />
              </div>
            )}

            {reportPeriodType === 'year' && (
              <Select
                label="Năm báo cáo"
                value={reportSelectedYear.toString()}
                onChange={(e) => setReportSelectedYear(Number(e.target.value))}
                options={[
                  { value: '2024', label: 'Năm 2024' },
                  { value: '2025', label: 'Năm 2025' },
                  { value: '2026', label: 'Năm 2026' },
                  { value: '2027', label: 'Năm 2027' },
                ]}
              />
            )}
          </div>
        )}
      >
        {() => (
          <div style={{ fontFamily: "'Inter', sans-serif", color: '#0f172a', lineHeight: 1.45 }}>
            {/* Header văn bản quy chuẩn doanh nghiệp (không có đường kẻ ngang dưới phần thông tin) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', marginBottom: '24px' }}>
              <div style={{ maxWidth: '58%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  {company.logo_url && (
                    <img src={company.logo_url} alt="Logo" style={{ height: '36px', maxHeight: '36px', objectFit: 'contain' }} />
                  )}
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '-0.01em' }}>
                      {company.company_name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#475569' }}>
                      {company.address || 'Hà Nội, Việt Nam'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: '38%' }}>
                <div style={{ fontSize: '0.78125rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a' }}>
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', display: 'inline-block' }}>
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '6px' }}>
                  Số: <strong>{reportDocCode}</strong>
                </div>
                <div style={{ fontSize: '0.6875rem', fontStyle: 'italic', color: '#64748b' }}>
                  Hà Nội, ngày 08 tháng 10 năm 2026
                </div>
              </div>
            </div>

            {/* Tiêu đề chính của Báo cáo */}
            <div style={{ textAlign: 'center', margin: '14px 0 20px 0' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '0.02em' }}>
                BÁO CÁO HOẠT ĐỘNG SẢN XUẤT KINH DOANH
              </h1>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0284c7', margin: '0 0 3px 0' }}>
                Kỳ báo cáo: {reportExecutiveData.facts.periodLabel}
              </div>
              <div style={{ fontSize: '0.78125rem', fontStyle: 'italic', color: '#475569', marginBottom: '8px' }}>
                Chủ đề: <strong>{reportExecutiveData.narrative.tagline}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Kính gửi: Hội đồng Quản trị Công ty Cổ phần Seajong Việt Nam
              </div>
            </div>

            {/* MỤC I: NHIỆM VỤ TRỌNG TÂM KỲ BÁO CÁO */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                I. Nhiệm vụ trọng tâm kỳ báo cáo
              </h3>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Nhiệm vụ trọng tâm được giao theo Kế hoạch kinh doanh:
                </div>
                <div style={{ fontSize: '0.78125rem', color: '#1e293b', fontWeight: 600 }}>
                  <span>• {reportExecutiveData.facts.assignedFocus}</span>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                {reportExecutiveData.narrative.sectionI_Context}
              </p>
            </div>

            {/* MỤC II: TỔNG QUAN CHỈ TIÊU ĐIỀU HÀNH VÀ KẾT QUẢ THỰC HIỆN KỲ NÀY */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                II. Kết quả thực hiện các chỉ tiêu then chốt (KPI)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.71875rem', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '32px' }}>STT</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'left' }}>Chỉ tiêu KPI Điều hành</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '65px' }}>ĐVT</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '100px' }}>Kế hoạch (DB)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '100px' }}>Thực hiện</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '80px' }}>Tỷ lệ đạt</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '110px' }}>Đánh giá tiến độ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontWeight: 600 }}>Doanh thu hợp đồng và bán hàng</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>tỷ đồng</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{reportExecutiveData.facts.kpis.revenue.target.toFixed(2)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                      {reportExecutiveData.facts.kpis.revenue.actual !== null ? reportExecutiveData.facts.kpis.revenue.actual.toFixed(2) : '—'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>
                      {reportExecutiveData.facts.kpis.revenue.ratePct !== '—' ? `${reportExecutiveData.facts.kpis.revenue.ratePct}%` : 'Đang thực hiện'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                      {reportExecutiveData.facts.kpis.revenue.statusLabel}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>2</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontWeight: 600 }}>Sản lượng thiết bị xuất xưởng</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>sản phẩm</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{reportExecutiveData.facts.kpis.units.target.toLocaleString('vi-VN')}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                      {reportExecutiveData.facts.kpis.units.actual !== null ? reportExecutiveData.facts.kpis.units.actual.toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>
                      {reportExecutiveData.facts.kpis.units.ratePct !== '—' ? `${reportExecutiveData.facts.kpis.units.ratePct}%` : 'Đang thực hiện'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                      {reportExecutiveData.facts.kpis.units.statusLabel}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>3</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontWeight: 600 }}>Dòng tiền thu hồi công nợ theo hợp đồng</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>tỷ đồng</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{reportExecutiveData.facts.kpis.debtRecovery.target.toFixed(2)}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                      {reportExecutiveData.facts.kpis.debtRecovery.actual !== null ? reportExecutiveData.facts.kpis.debtRecovery.actual.toFixed(2) : '—'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>
                      {reportExecutiveData.facts.kpis.debtRecovery.ratePct !== '—' ? `${reportExecutiveData.facts.kpis.debtRecovery.ratePct}%` : 'Đang thực hiện'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                      {reportExecutiveData.facts.kpis.debtRecovery.statusLabel}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* MỤC III: PHÂN TÍCH KINH TẾ - ĐIỀU HÀNH CHUYÊN SÂU */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                III. Phân tích kinh tế - điều hành chuyên sâu
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: '2px' }}>
                    1. Tương quan Đơn giá xuất xưởng bình quân (ASP) và Hiệu ứng Sản lượng:
                  </div>
                  <p style={{ margin: '0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                    {reportExecutiveData.narrative.sectionIII_ASP}
                  </p>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: '2px' }}>
                    2. Nhịp độ điều hành và Chu kỳ mùa vụ sản xuất:
                  </div>
                  <p style={{ margin: '0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                    {reportExecutiveData.narrative.sectionIII_Seasonality}
                  </p>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', marginBottom: '2px' }}>
                    3. Hiệu quả chuyển hóa dòng tiền (Cash Conversion Ratio):
                  </div>
                  <p style={{ margin: '0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                    {reportExecutiveData.narrative.sectionIII_CashFlow}
                  </p>
                </div>
              </div>
            </div>

            {/* MỤC IV: PHÂN TÍCH DIỄN BIẾN LŨY KẾ VÀ ĐÁNH GIÁ NĂNG LỰC VỀ ĐÍCH */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                IV. Diễn biến lũy kế và Đánh giá năng lực về đích năm 2026
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                {reportExecutiveData.narrative.sectionIV_Retrospective}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.71875rem', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '80px' }}>Kỳ theo dõi</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '90px' }}>KH Doanh thu</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '90px' }}>Thực hiện</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '70px' }}>% Đạt</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '75px' }}>KH Sản lượng</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '75px' }}>Thực tế</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'left' }}>Trọng tâm công tác đã triển khai thực tế (DB)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportExecutiveData.facts.historyTable.map((row, idx) => (
                    <tr key={row.period || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 600 }}>{row.period}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{row.targetRev.toFixed(2)} tỷ đồng</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: row.actualRev !== null ? '#0369a1' : '#94a3b8' }}>
                        {row.actualRev !== null ? `${row.actualRev.toFixed(2)} tỷ đồng` : '—'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 700, color: row.ratePct !== '—' ? (Number(row.ratePct) >= 95 ? '#059669' : '#d97706') : '#94a3b8' }}>
                        {row.ratePct !== '—' ? `${row.ratePct}%` : 'Dự kiến'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{row.targetUnits} sản phẩm</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{row.actualUnits !== null ? `${row.actualUnits} sản phẩm` : '—'}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', color: '#475569', fontSize: '0.6875rem' }}>{row.focus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '8px 12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '2px' }}>
                  Đánh giá xác suất và tính khả thi về đích (Run-rate Feasibility):
                </div>
                <p style={{ margin: '0', fontSize: '0.78125rem', color: '#1e3a8a', textAlign: 'justify', lineHeight: 1.55 }}>
                  {reportExecutiveData.narrative.sectionIV_Feasibility}
                </p>
              </div>
            </div>

            {/* MỤC V: CƠ CẤU DOANH THU VÀ SẢN LƯỢNG THEO DÒNG SẢN PHẨM */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                V. Cơ cấu doanh thu và sản lượng theo nhóm sản phẩm (BOM)
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                {reportExecutiveData.narrative.sectionV_ProductIntro}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.71875rem', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '35px' }}>STT</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'left' }}>Nhóm dòng sản phẩm (Danh mục DB)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '90px' }}>Tỷ trọng (%)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '150px' }}>Giá trị xuất xưởng (VNĐ)</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '110px' }}>Sản lượng tương ứng</th>
                  </tr>
                </thead>
                <tbody>
                  {reportExecutiveData.facts.productBreakdown.map((p, idx) => (
                    <tr key={p.name || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>{p.share}%</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: '#0369a1' }}>{p.revenueFormatted}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>{p.unitsFormatted}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>TỔNG CỘNG:</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>100%</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', color: '#0284c7' }}>
                      {(Math.round(reportExecutiveData.facts.effectiveTotalRev * 1_000_000_000)).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>
                      {reportExecutiveData.facts.effectiveTotalUnits.toLocaleString('vi-VN')} bộ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* MỤC VI: BÁO CÁO CÔNG TÁC ĐẤU THẦU VÀ NGUỒN VIỆC GỐI ĐẦU */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                VI. Báo cáo công tác Đấu thầu và Nguồn việc gối đầu (Bidding Pipeline)
              </h3>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.78125rem', color: '#1e293b', textAlign: 'justify', lineHeight: 1.55 }}>
                {reportExecutiveData.narrative.sectionVI_BiddingIntro}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.71875rem', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '32px' }}>STT</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'left', width: '110px' }}>Mã dự thầu</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'left' }}>Dự án và Chủ đầu tư</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'left' }}>Hạng mục sản phẩm dự thầu</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', width: '90px' }}>Giá trị thầu</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', width: '120px' }}>Trạng thái hồ sơ</th>
                  </tr>
                </thead>
                <tbody>
                  {reportExecutiveData.facts.biddingPipeline.packages.map((pkg, idx) => (
                    <tr key={pkg.code || idx} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontWeight: 600, color: '#0369a1' }}>{pkg.code}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px' }}>
                        <div style={{ fontWeight: 600 }}>{pkg.projectName}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{pkg.clientName}</div>
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', fontSize: '0.6875rem', color: '#334155' }}>
                        {pkg.packageType}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {pkg.contractValue}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '2px 5px', fontSize: '0.65rem', fontWeight: 600, color: '#0284c7' }}>
                          {pkg.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                    <td colSpan={4} style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right' }}>
                      TỔNG GIÁ TRỊ PHỄU ĐẤU THẦU ĐANG THEO ĐUỔI:
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'right', color: '#0284c7', fontSize: '0.78125rem' }}>
                      {reportExecutiveData.facts.biddingPipeline.totalValueFormatted}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '5px 6px', textAlign: 'center', color: '#059669', fontSize: '0.6875rem' }}>
                      4 gói thầu chiến lược
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* MỤC VII: KẾ HOẠCH VÀ NHIỆM VỤ TRỌNG TÂM KỲ TIẾP THEO */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.01em', borderLeft: '3px solid #0284c7', paddingLeft: '8px' }}>
                VII. Kế hoạch và Nhiệm vụ trọng tâm kỳ tiếp theo
              </h3>
              <p style={{ margin: '0', fontSize: '0.78125rem', color: '#0f172a', fontWeight: 600, textAlign: 'justify', lineHeight: 1.55 }}>
                {reportExecutiveData.narrative.sectionVII_NextPlan}
              </p>
            </div>

            {/* CHỮ KÝ XÁC NHẬN TRÁCH NHIỆM */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', textAlign: 'center', marginTop: '20px', pageBreakInside: 'avoid' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>NGƯỜI LẬP BÁO CÁO</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ height: '55px' }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>Người lập báo cáo</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Khối Kế hoạch và Điều hành</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>ĐẠI DIỆN BAN GIÁM ĐỐC</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic' }}>(Ký tên, đóng dấu)</div>
                <div style={{ height: '55px' }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{company.legal_rep || 'Hà Hải Lâm'}</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Tổng Giám đốc</div>
              </div>
            </div>
          </div>
        )}
      </PrintPreview>

      {/* Offcanvas Lịch sự kiện (rộng 400px với 4 slide: Tháng, Tuần, Ngày, Lịch biểu, 1 slide Tạo mới và 1 slide Chi tiết) */}
      <Offcanvas
        isOpen={showEventCalendar}
        onClose={() => {
          setShowEventCalendar(false);
          setIsCreateSlideOpen(false);
          setIsDetailSlideOpen(false);
        }}
        title={
          isCreateSlideOpen
            ? "Tạo mới sự kiện"
            : isDetailSlideOpen
              ? "Chi tiết sự kiện"
              : "Lịch sự kiện"
        }
        bodyStyle={{
          padding: (isCreateSlideOpen || isDetailSlideOpen) ? '10px 14px' : '8px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: (isCreateSlideOpen || isDetailSlideOpen) ? 'hidden' : 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, boxSizing: 'border-box', overflow: 'hidden', flex: 1 }}>
          {isCreateSlideOpen ? (
            /* SLIDE 5 (MẶC ĐỊNH ẨN): TẠO MỚI SỰ KIỆN - CHỈ ĐƯỢC GỌI KHI NHẤN NÚT THÊM MỚI */
            <div
              id="slide-calendar-create-event"
              style={{
                height: '100%',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {/* FORM TẠO MỚI SỰ KIỆN: KHỐI NỘI DUNG CUỘN RIÊNG, FOOTER LUÔN GHIM Ở ĐÁY OFFCANVAS */}
              <form
                onSubmit={handleSaveNewEventFromSlide}
                style={{
                  height: '100%',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* KHỐI CÁC TRƯỜNG NHẬP LIỆU (TỰ ĐỘNG CUỘN NẾU THIẾU CHIỀU CAO) */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingRight: '3px',
                  }}
                >
                  {/* 1. TIÊU ĐỀ SỰ KIỆN - Hiển thị trực tiếp ra body, không dùng card */}
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Tiêu đề sự kiện <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Họp giao ban điều hành, Giám định nhà máy..."
                      value={createEventTitle}
                      onChange={(e) => setCreateEventTitle(e.target.value)}
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '7px 11px',
                        fontSize: '0.84375rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        color: 'var(--text-primary, #0f172a)',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* 2. TỪ NGÀY, ĐẾN NGÀY VÀ THỜI GIAN */}
                  <div>
                    {/* Hàng 1: Từ ngày và Đến ngày luôn luôn hiển thị */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                          Từ ngày <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={createEventDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setCreateEventDate(newStart);
                            if (!createEventEndDate || createEventEndDate < newStart) {
                              setCreateEventEndDate(newStart);
                            }
                          }}
                          required
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary)',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                          Đến ngày <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={createEventEndDate || createEventDate}
                          min={createEventDate}
                          onChange={(e) => setCreateEventEndDate(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary)',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Hàng 2: Giờ Bắt đầu, Giờ Kết thúc và Checkbox Cả ngày trên CÙNG 1 DÒNG */}
                    {(() => {
                      const isMultiDay = Boolean(createEventEndDate && createEventEndDate !== createEventDate);
                      const isLocked = createEventIsAllDay || isMultiDay;
                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              Bắt đầu
                            </span>
                            <input
                              type="time"
                              value={createEventTimeStart}
                              onChange={(e) => setCreateEventTimeStart(e.target.value)}
                              disabled={isLocked}
                              style={{
                                width: '100%',
                                padding: '7px 8px',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                backgroundColor: isLocked ? 'var(--bg-surface-3, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary)',
                                boxSizing: 'border-box',
                                outline: 'none',
                                cursor: isLocked ? 'not-allowed' : 'text',
                                opacity: isLocked ? 0.7 : 1,
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              Kết thúc
                            </span>
                            <input
                              type="time"
                              value={createEventTimeEnd}
                              onChange={(e) => setCreateEventTimeEnd(e.target.value)}
                              disabled={isLocked}
                              style={{
                                width: '100%',
                                padding: '7px 8px',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                backgroundColor: isLocked ? 'var(--bg-surface-3, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary)',
                                boxSizing: 'border-box',
                                outline: 'none',
                                cursor: isLocked ? 'not-allowed' : 'text',
                                opacity: isLocked ? 0.7 : 1,
                              }}
                            />
                          </div>
                          <div style={{ flexShrink: 0, paddingBottom: '7px' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: isMultiDay ? 'not-allowed' : 'pointer',
                                color: isMultiDay
                                  ? 'var(--color-primary, #0284c7)'
                                  : (createEventIsAllDay ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary)'),
                                whiteSpace: 'nowrap',
                                opacity: isMultiDay ? 0.8 : 1,
                              }}
                              title={isMultiDay ? 'Sự kiện diễn ra nhiều ngày (mặc định cả ngày)' : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={isMultiDay ? true : createEventIsAllDay}
                                disabled={isMultiDay}
                                onChange={(e) => setCreateEventIsAllDay(e.target.checked)}
                                style={{
                                  cursor: isMultiDay ? 'not-allowed' : 'pointer',
                                  width: '14px',
                                  height: '14px',
                                  accentColor: 'var(--color-primary, #0284c7)',
                                }}
                              />
                              Cả ngày
                            </label>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3. ĐỊA ĐIỂM TỔ CHỨC */}
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Địa điểm tổ chức
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '5px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <GeoAlt size={13} color="#ef4444" />
                      </div>
                      <input
                        type="text"
                        placeholder="VD: Phòng họp VIP tầng 12, Nhà máy Hà Nam..."
                        value={createEventLocation}
                        onChange={(e) => setCreateEventLocation(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 11px 7px 36px',
                          fontSize: '0.8125rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          color: 'var(--text-primary)',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* 4. LẶP LẠI VÀ THÔNG BÁO TRƯỚC (CÙNG DÒNG) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                        Lặp lại
                      </label>
                      <select
                        value={createEventRecurrence}
                        onChange={(e) => setCreateEventRecurrence(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="none">Không lặp lại</option>
                        <option value="daily">Mỗi ngày</option>
                        <option value="weekly">Mỗi tuần</option>
                        <option value="monthly">Mỗi tháng</option>
                        <option value="yearly">Mỗi năm</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                        Thông báo trước
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={createEventNotifyMinutes}
                          onChange={(e) => setCreateEventNotifyMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder="15"
                          style={{
                            width: '100%',
                            padding: '7px 46px 7px 11px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: '10px',
                            fontSize: '0.78125rem',
                            fontWeight: 600,
                            color: 'var(--text-muted, #64748b)',
                            pointerEvents: 'none',
                          }}
                        >
                          phút
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. DROPLIST KHÁCH MỜI (CHỌN NHÂN VIÊN TRONG CÔNG TY VỚI CHECKBOX) */}
                  <div ref={attendeesDropdownRef} style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Khách mời
                    </label>
                    {/* Nút trigger dropdown */}
                    <button
                      type="button"
                      onClick={() => setIsAttendeesOpen(!isAttendeesOpen)}
                      style={{
                        width: '100%',
                        padding: '7px 11px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        color: createEventAttendees.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <People size={14} color="var(--color-primary, #0284c7)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {createEventAttendees.length === 0
                            ? 'Chọn nhân viên tham gia...'
                            : `Đã chọn ${createEventAttendees.length} nhân viên`}
                        </span>
                      </div>
                      <ChevronDown
                        size={13}
                        color="var(--text-muted)"
                        style={{
                          transform: isAttendeesOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          flexShrink: 0,
                        }}
                      />
                    </button>

                    {/* Panel dropdown chọn nhiều nhân viên */}
                    {isAttendeesOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Ô tìm kiếm nhanh nhân viên */}
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Search size={12} color="var(--text-muted)" />
                          <input
                            type="text"
                            placeholder="Tìm nhân viên, phòng ban..."
                            value={attendeesSearch}
                            onChange={(e) => setAttendeesSearch(e.target.value)}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              fontSize: '0.78125rem',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>

                        {/* Danh sách nhân viên có checkbox */}
                        <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '4px' }}>
                          {companyUsers
                            .filter((u) => {
                              if (!attendeesSearch.trim()) return true;
                              const q = attendeesSearch.toLowerCase();
                              return u.name.toLowerCase().includes(q) || (u.department && u.department.toLowerCase().includes(q));
                            })
                            .map((user) => {
                              const isSelected = createEventAttendees.includes(String(user.id));
                              return (
                                <div
                                  key={user.id}
                                  onClick={() => {
                                    setCreateEventAttendees((prev) =>
                                      isSelected
                                        ? prev.filter((id) => id !== String(user.id))
                                        : [...prev, String(user.id)]
                                    );
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                                    transition: 'background-color 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => { }}
                                    style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--color-primary, #0284c7)' }}
                                  />
                                  <div
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      backgroundColor: user.avatarColor || '#0284c7',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65625rem',
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {user.avatarText || user.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {user.name}
                                    </div>
                                    <div style={{ fontSize: '0.65625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {user.position || user.department}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Thanh thao tác dưới cùng của dropdown */}
                        <div style={{ padding: '5px 8px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface-2, #f8fafc)' }}>
                          <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                            Đã chọn: <strong style={{ color: 'var(--color-primary, #0284c7)' }}>{createEventAttendees.length}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {createEventAttendees.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setCreateEventAttendees([])}
                                style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Bỏ chọn hết
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsAttendeesOpen(false)}
                              style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: 'var(--color-primary, #0284c7)', cursor: 'pointer', fontWeight: 700 }}
                            >
                              Xong
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hiển thị danh sách badge nhân viên đã chọn */}
                    {createEventAttendees.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {companyUsers
                          .filter((u) => createEventAttendees.includes(String(u.id)))
                          .map((user) => (
                            <span
                              key={user.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                                color: 'var(--color-primary, #0284c7)',
                                fontSize: '0.71875rem',
                                fontWeight: 600,
                              }}
                            >
                              {user.name}
                              <X
                                size={12}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreateEventAttendees((prev) => prev.filter((id) => id !== String(user.id)));
                                }}
                              />
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* 6. MỨC ĐỘ ƯU TIÊN (SEGMENTED CONTROL) */}
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Mức độ ưu tiên
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '3px',
                        padding: '2px',
                        backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      {[
                        { id: 'normal', label: 'Bình thường', color: '#475569' },
                        { id: 'high', label: 'Quan trọng', color: '#0284c7' },
                        { id: 'urgent', label: 'Khẩn cấp', color: '#ef4444' },
                      ].map((p) => {
                        const isSel = createEventPriority === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setCreateEventPriority(p.id)}
                            style={{
                              padding: '6px 4px',
                              textAlign: 'center',
                              fontSize: '0.78125rem',
                              fontWeight: isSel ? 700 : 500,
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: isSel ? '#ffffff' : 'transparent',
                              color: isSel ? p.color : 'var(--text-muted, #64748b)',
                              boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7. TÓM TẮT NỘI DUNG (TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG) */}
                  <div style={{ flex: 1, minHeight: '80px', display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Tóm tắt nội dung
                    </label>
                    <textarea
                      placeholder="Mô tả mục tiêu, tài liệu cần chuẩn bị, ghi chú thêm..."
                      value={createEventDescription}
                      onChange={(e) => setCreateEventDescription(e.target.value)}
                      style={{
                        flex: 1,
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px 11px',
                        fontSize: '0.8125rem',
                        lineHeight: '1.45',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        outline: 'none',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* FOOTER CỐ ĐỊNH Ở ĐÁY OFFCANVAS - KHÔNG BAO GIỜ BỊ ĐẨY RA NGOÀI */}
                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    paddingTop: '8px',
                    marginTop: '6px',
                    borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsCreateSlideOpen(false)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '6px 16px',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'var(--color-primary, #0284c7)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    <Check2 size={15} /> Lưu sự kiện
                  </button>
                </div>
              </form>
            </div>
          ) : isDetailSlideOpen ? (
            /* SLIDE 6: CHI TIẾT SỰ KIỆN (MỞ KHI NHẤN CHỌN SỰ KIỆN TRONG DANH SÁCH) */
            <div
              id="slide-calendar-detail-event"
              style={{
                height: '100%',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <form
                onSubmit={handleUpdateEventFromSlide}
                style={{
                  height: '100%',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* KHỐI CÁC TRƯỜNG NHẬP LIỆU (TỰ ĐỘNG CUỘN NẾU THIẾU CHIỀU CAO) */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingRight: '3px',
                  }}
                >
                  {/* 1. TIÊU ĐỀ SỰ KIỆN */}
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Tiêu đề sự kiện <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Họp giao ban điều hành, Giám định nhà máy..."
                      value={detailEventTitle}
                      onChange={(e) => setDetailEventTitle(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '7px 11px',
                        fontSize: '0.84375rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        color: 'var(--text-primary, #0f172a)',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* 2. TỪ NGÀY, ĐẾN NGÀY VÀ THỜI GIAN */}
                  <div>
                    {/* Hàng 1: Từ ngày và Đến ngày luôn luôn hiển thị */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                          Từ ngày <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={detailEventDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setDetailEventDate(newStart);
                            if (!detailEventEndDate || detailEventEndDate < newStart) {
                              setDetailEventEndDate(newStart);
                            }
                          }}
                          required
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary)',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                          Đến ngày <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={detailEventEndDate || detailEventDate}
                          min={detailEventDate}
                          onChange={(e) => setDetailEventEndDate(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary)',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Hàng 2: Giờ Bắt đầu, Giờ Kết thúc và Checkbox Cả ngày trên CÙNG 1 DÒNG */}
                    {(() => {
                      const isMultiDay = Boolean(detailEventEndDate && detailEventEndDate !== detailEventDate);
                      const isLocked = detailEventIsAllDay || isMultiDay;
                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              Bắt đầu
                            </span>
                            <input
                              type="time"
                              value={detailEventTimeStart}
                              onChange={(e) => setDetailEventTimeStart(e.target.value)}
                              disabled={isLocked}
                              style={{
                                width: '100%',
                                padding: '7px 8px',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                backgroundColor: isLocked ? 'var(--bg-surface-3, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary)',
                                boxSizing: 'border-box',
                                outline: 'none',
                                cursor: isLocked ? 'not-allowed' : 'text',
                                opacity: isLocked ? 0.7 : 1,
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary)',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              Kết thúc
                            </span>
                            <input
                              type="time"
                              value={detailEventTimeEnd}
                              onChange={(e) => setDetailEventTimeEnd(e.target.value)}
                              disabled={isLocked}
                              style={{
                                width: '100%',
                                padding: '7px 8px',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                backgroundColor: isLocked ? 'var(--bg-surface-3, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                                color: isLocked ? 'var(--text-muted, #94a3b8)' : 'var(--text-primary)',
                                boxSizing: 'border-box',
                                outline: 'none',
                                cursor: isLocked ? 'not-allowed' : 'text',
                                opacity: isLocked ? 0.7 : 1,
                              }}
                            />
                          </div>
                          <div style={{ flexShrink: 0, paddingBottom: '7px' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: isMultiDay ? 'not-allowed' : 'pointer',
                                color: isMultiDay
                                  ? 'var(--color-primary, #0284c7)'
                                  : (detailEventIsAllDay ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary)'),
                                whiteSpace: 'nowrap',
                                opacity: isMultiDay ? 0.8 : 1,
                              }}
                              title={isMultiDay ? 'Sự kiện diễn ra nhiều ngày (mặc định cả ngày)' : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={isMultiDay ? true : detailEventIsAllDay}
                                disabled={isMultiDay}
                                onChange={(e) => setDetailEventIsAllDay(e.target.checked)}
                                style={{
                                  cursor: isMultiDay ? 'not-allowed' : 'pointer',
                                  width: '14px',
                                  height: '14px',
                                  accentColor: 'var(--color-primary, #0284c7)',
                                }}
                              />
                              Cả ngày
                            </label>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3. ĐỊA ĐIỂM TỔ CHỨC */}
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Địa điểm tổ chức
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '5px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <GeoAlt size={13} color="#ef4444" />
                      </div>
                      <input
                        type="text"
                        placeholder="VD: Phòng họp VIP tầng 12, Nhà máy Hà Nam..."
                        value={detailEventLocation}
                        onChange={(e) => setDetailEventLocation(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 11px 7px 36px',
                          fontSize: '0.8125rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          color: 'var(--text-primary)',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* 4. LẶP LẠI VÀ THÔNG BÁO TRƯỚC (CÙNG DÒNG) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                        Lặp lại
                      </label>
                      <select
                        value={detailEventRecurrence}
                        onChange={(e) => setDetailEventRecurrence(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="none">Không lặp lại</option>
                        <option value="daily">Mỗi ngày</option>
                        <option value="weekly">Mỗi tuần</option>
                        <option value="monthly">Mỗi tháng</option>
                        <option value="yearly">Mỗi năm</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                        Thông báo trước
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={detailEventNotifyMinutes}
                          onChange={(e) => setDetailEventNotifyMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder="15"
                          style={{
                            width: '100%',
                            padding: '7px 46px 7px 11px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: '10px',
                            fontSize: '0.78125rem',
                            fontWeight: 600,
                            color: 'var(--text-muted, #64748b)',
                            pointerEvents: 'none',
                          }}
                        >
                          phút
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. DROPLIST KHÁCH MỜI */}
                  <div ref={detailAttendeesDropdownRef} style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Khách mời
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDetailAttendeesOpen(!isDetailAttendeesOpen)}
                      style={{
                        width: '100%',
                        padding: '7px 11px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        color: detailEventAttendees.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <People size={14} color="var(--color-primary, #0284c7)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {detailEventAttendees.length === 0
                            ? 'Chọn nhân viên tham gia...'
                            : `Đã chọn ${detailEventAttendees.length} nhân viên`}
                        </span>
                      </div>
                      <ChevronDown
                        size={13}
                        color="var(--text-muted)"
                        style={{
                          transform: isDetailAttendeesOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          flexShrink: 0,
                        }}
                      />
                    </button>

                    {/* Panel dropdown */}
                    {isDetailAttendeesOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          backgroundColor: 'var(--bg-surface, #ffffff)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Search size={12} color="var(--text-muted)" />
                          <input
                            type="text"
                            placeholder="Tìm nhân viên, phòng ban..."
                            value={detailAttendeesSearch}
                            onChange={(e) => setDetailAttendeesSearch(e.target.value)}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              fontSize: '0.78125rem',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>

                        <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '4px' }}>
                          {companyUsers
                            .filter((u) => {
                              if (!detailAttendeesSearch.trim()) return true;
                              const q = detailAttendeesSearch.toLowerCase();
                              return u.name.toLowerCase().includes(q) || (u.department && u.department.toLowerCase().includes(q));
                            })
                            .map((user) => {
                              const isSelected = detailEventAttendees.includes(String(user.id));
                              return (
                                <div
                                  key={user.id}
                                  onClick={() => {
                                    setDetailEventAttendees((prev) =>
                                      isSelected
                                        ? prev.filter((id) => id !== String(user.id))
                                        : [...prev, String(user.id)]
                                    );
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                                    transition: 'background-color 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-surface-2, #f8fafc)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => { }}
                                    style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--color-primary, #0284c7)' }}
                                  />
                                  <div
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      backgroundColor: user.avatarColor || '#0284c7',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65625rem',
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {user.avatarText || user.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {user.name}
                                    </div>
                                    <div style={{ fontSize: '0.65625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {user.position || user.department}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        <div style={{ padding: '5px 8px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface-2, #f8fafc)' }}>
                          <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                            Đã chọn: <strong style={{ color: 'var(--color-primary, #0284c7)' }}>{detailEventAttendees.length}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {detailEventAttendees.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setDetailEventAttendees([])}
                                style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Bỏ chọn hết
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsDetailAttendeesOpen(false)}
                              style={{ border: 'none', background: 'transparent', fontSize: '0.71875rem', color: 'var(--color-primary, #0284c7)', cursor: 'pointer', fontWeight: 700 }}
                            >
                              Xong
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hiển thị badge nhân viên */}
                    {detailEventAttendees.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {companyUsers
                          .filter((u) => detailEventAttendees.includes(String(u.id)))
                          .map((user) => (
                            <span
                              key={user.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(2, 132, 199, 0.08)',
                                color: 'var(--color-primary, #0284c7)',
                                fontSize: '0.71875rem',
                                fontWeight: 600,
                              }}
                            >
                              {user.name}
                              <X
                                size={12}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailEventAttendees((prev) => prev.filter((id) => id !== String(user.id)));
                                }}
                              />
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* 6. MỨC ĐỘ ƯU TIÊN */}
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Mức độ ưu tiên
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '3px',
                        padding: '2px',
                        backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      {[
                        { id: 'normal', label: 'Bình thường', color: '#475569' },
                        { id: 'high', label: 'Quan trọng', color: '#0284c7' },
                        { id: 'urgent', label: 'Khẩn cấp', color: '#ef4444' },
                      ].map((p) => {
                        const isSel = detailEventPriority === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setDetailEventPriority(p.id)}
                            style={{
                              padding: '6px 4px',
                              textAlign: 'center',
                              fontSize: '0.78125rem',
                              fontWeight: isSel ? 700 : 500,
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: isSel ? '#ffffff' : 'transparent',
                              color: isSel ? p.color : 'var(--text-muted, #64748b)',
                              boxShadow: isSel ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7. TÓM TẮT NỘI DUNG (TỰ ĐỘNG CHIẾM HẾT CHIỀU CAO KHẢ DỤNG) */}
                  <div style={{ flex: 1, minHeight: '80px', display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Tóm tắt nội dung
                    </label>
                    <textarea
                      placeholder="Mô tả mục tiêu, tài liệu cần chuẩn bị, ghi chú thêm..."
                      value={detailEventDescription}
                      onChange={(e) => setDetailEventDescription(e.target.value)}
                      style={{
                        flex: 1,
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px 11px',
                        fontSize: '0.8125rem',
                        lineHeight: '1.45',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        outline: 'none',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* FOOTER CỐ ĐỊNH Ở ĐÁY OFFCANVAS - KHÔNG BAO GIỜ BỊ ĐẨY RA NGOÀI */}
                <div
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    marginTop: '6px',
                    borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleDeleteDetailEvent}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.78125rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    Xóa sự kiện
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsDetailSlideOpen(false)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--color-primary, #0284c7)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
                      }}
                    >
                      <Check2 size={15} /> Lưu thay đổi
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* HIỂN THỊ 4 SLIDE LỊCH TIÊU CHUẨN: THÁNG, TUẦN, NGÀY, LỊCH BIỂU */
            <>
              {/* Thanh chuyển đổi 4 loại lịch: Tháng, Tuần (Mặc định), Ngày, Lịch biểu */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  backgroundColor: 'var(--bg-surface-2, #f1f5f9)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md, 8px)',
                  marginBottom: '8px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                }}
              >
                {[
                  { id: 'month', label: 'Tháng' },
                  { id: 'week', label: 'Tuần' },
                  { id: 'day', label: 'Ngày' },
                  { id: 'agenda', label: 'Lịch biểu' },
                ].map((tab) => {
                  const isActive = calendarViewType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCalendarViewType(tab.id as 'month' | 'week' | 'day' | 'agenda')}
                      style={{
                        padding: '6px 0',
                        textAlign: 'center',
                        fontSize: '0.78125rem',
                        fontWeight: isActive ? 700 : 500,
                        borderRadius: 'var(--radius-sm, 6px)',
                        backgroundColor: isActive ? 'var(--color-primary, #0284c7)' : 'transparent',
                        color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Vùng chứa 4 Slide tương ứng */}
              <div style={{ flex: 1, minHeight: 0 }}>
                {/* 1. SLIDE LỊCH THÁNG (PHƯƠNG ÁN 1: LƯỚI THÁNG + SỰ KIỆN NGÀY) */}
                {calendarViewType === 'month' && (
                  <div
                    id="slide-calendar-month"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* KHỐI 1: THANH ĐIỀU HƯỚNG THÁNG */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-md, 8px)',
                        backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setRefMonthDate((prev) => {
                              const n = new Date(prev);
                              n.setMonth(n.getMonth() - 1);
                              return n;
                            });
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--text-secondary, #64748b)',
                            cursor: 'pointer',
                          }}
                          title="Tháng trước"
                        >
                          <ChevronLeft size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRefMonthDate((prev) => {
                              const n = new Date(prev);
                              n.setMonth(n.getMonth() + 1);
                              return n;
                            });
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--text-secondary, #64748b)',
                            cursor: 'pointer',
                          }}
                          title="Tháng sau"
                        >
                          <ChevronRight size={13} />
                        </button>

                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '4px' }}>
                          {monthHeaderLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            setRefMonthDate(today);
                            setSelectedMonthDayKey(getTodayDateKey());
                          }}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.71875rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm, 4px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--color-primary, #0284c7)',
                            cursor: 'pointer',
                          }}
                        >
                          Hôm nay
                        </button>

                        <button
                          type="button"
                          onClick={() => openCreateEventSlide(selectedMonthDayKey)}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: 'none',
                            backgroundColor: 'var(--color-primary, #0284c7)',
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                          title="Thêm sự kiện mới"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* KHỐI 2: LƯỚI THÁNG (BÀN CỜ 7 CỘT X 5-6 HÀNG) */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                        padding: '6px',
                      }}
                    >
                      {/* Hàng 7 thứ trong tuần */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gap: '2px',
                          marginBottom: '4px',
                          textAlign: 'center',
                        }}
                      >
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((h) => (
                          <span
                            key={h}
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: 'var(--text-muted, #94a3b8)',
                              padding: '2px 0',
                            }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>

                      {/* Lưới các ngày */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gap: '2px',
                        }}
                      >
                        {currentMonthCells.map((cell) => {
                          const isSelected = selectedMonthDayKey === cell.dateKey;
                          const eventCount = plannerItems.filter(
                            (it) => isEventOnDate(it, cell.dateKey) && (it.type === 'event' || !it.type)
                          ).length;

                          return (
                            <button
                              key={cell.dateKey}
                              type="button"
                              onClick={() => {
                                setSelectedMonthDayKey(cell.dateKey);
                                if (!cell.isCurrentMonth) {
                                  setRefMonthDate(cell.date);
                                }
                              }}
                              style={{
                                height: '32px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: isSelected
                                  ? 'none'
                                  : cell.isToday
                                    ? '1px solid var(--color-primary, #0284c7)'
                                    : '1px solid transparent',
                                backgroundColor: isSelected
                                  ? 'var(--color-primary, #0284c7)'
                                  : cell.isToday
                                    ? 'rgba(2, 132, 199, 0.08)'
                                    : 'transparent',
                                color: isSelected
                                  ? '#ffffff'
                                  : !cell.isCurrentMonth
                                    ? 'var(--text-muted, #cbd5e1)'
                                    : cell.isToday
                                      ? 'var(--color-primary, #0284c7)'
                                      : 'var(--text-primary)',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'all 0.1s ease',
                                padding: '1px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.78125rem',
                                  fontWeight: isSelected || cell.isToday ? 700 : 500,
                                  lineHeight: 1,
                                  opacity: cell.isCurrentMonth ? 1 : 0.45,
                                }}
                              >
                                {cell.dayNumber}
                              </span>

                              {/* Dots sự kiện */}
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '2px',
                                  marginTop: '2px',
                                  height: '4px',
                                  alignItems: 'center',
                                }}
                              >
                                {eventCount > 0 && (
                                  <span
                                    style={{
                                      width: '3.5px',
                                      height: '3.5px',
                                      borderRadius: '50%',
                                      backgroundColor: isSelected
                                        ? '#ffffff'
                                        : cell.isToday
                                          ? 'var(--color-danger, #ef4444)'
                                          : 'var(--color-primary, #0284c7)',
                                    }}
                                  />
                                )}
                                {eventCount > 1 && (
                                  <span
                                    style={{
                                      width: '3.5px',
                                      height: '3.5px',
                                      borderRadius: '50%',
                                      backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : '#f59e0b',
                                    }}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>



                    {/* KHỐI 3: TIÊU ĐỀ NGÀY ĐANG CHỌN TRONG THÁNG */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {selectedMonthDayInfo
                            ? `${selectedMonthDayInfo.fullLabel}, ${selectedMonthDayInfo.dayNumber}/${selectedMonthDayInfo.monthNumber}`
                            : 'Lịch ngày'}
                        </span>
                        {selectedMonthDayInfo?.isToday && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(2, 132, 199, 0.12)',
                              color: 'var(--color-primary, #0284c7)',
                            }}
                          >
                            Hôm nay
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>
                        {selectedMonthDayEvents.length} sự kiện
                      </span>
                    </div>

                    {/* KHỐI 4: DANH SÁCH SỰ KIỆN CỦA NGÀY ĐƯỢC CHỌN TRONG THÁNG */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingRight: '2px',
                      }}
                    >
                      {selectedMonthDayEvents.length === 0 ? (
                        <div
                          style={{
                            padding: '24px 16px',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                            borderRadius: 'var(--radius-md, 8px)',
                            border: '1px dashed var(--border-subtle, #cbd5e1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <CalendarCheck size={24} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                          <div style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                            Không có lịch trình trong ngày này
                          </div>
                          <button
                            type="button"
                            onClick={() => openCreateEventSlide(selectedMonthDayKey)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.71875rem',
                              fontWeight: 600,
                              borderRadius: 'var(--radius-sm, 6px)',
                              border: '1px solid var(--color-primary, #0284c7)',
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary, #0284c7)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={14} /> Thêm sự kiện
                          </button>
                        </div>
                      ) : (
                        selectedMonthDayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => openDetailEventSlide(event)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md, 8px)',
                              backgroundColor: 'var(--bg-surface-1, #ffffff)',
                              border: '1px solid var(--border-subtle, #e2e8f0)',
                              borderLeft: `4px solid ${getCategoryColor(event.category || event.priority)}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: 'var(--color-primary, #0284c7)',
                                }}
                              >
                                <Clock size={11} />
                                <span>
                                  {event.timeStart || '08:00'} - {event.timeEnd || '09:00'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {event.priority === 'urgent' && (
                                  <span
                                    style={{
                                      fontSize: '0.65625rem',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                      color: '#ef4444',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Khẩn cấp
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteEvent(event.id, e)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted, #94a3b8)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                  title="Xóa sự kiện"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                lineHeight: 1.35,
                              }}
                            >
                              {event.title}
                            </div>

                            {event.description && (
                              <div
                                style={{
                                  fontSize: '0.71875rem',
                                  color: 'var(--text-secondary)',
                                  lineHeight: 1.35,
                                }}
                              >
                                {event.description}
                              </div>
                            )}

                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px',
                                fontSize: '0.6875rem',
                                color: 'var(--text-muted, #64748b)',
                                marginTop: '2px',
                              }}
                            >
                              {event.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <GeoAlt size={10} style={{ color: '#ef4444' }} />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.assigneeName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <People size={10} style={{ color: '#0284c7' }} />
                                  <span>{event.assigneeName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SLIDE LỊCH TUẦN (MẶC ĐỊNH - THEO CÁCH A) */}
                {calendarViewType === 'week' && (
                  <div
                    id="slide-calendar-week"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* KHỐI 1: THANH ĐIỀU HƯỚNG TUẦN (WEEK NAVIGATOR) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-md, 8px)',
                        backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setRefWeekDate((prev) => {
                              const n = new Date(prev);
                              n.setDate(n.getDate() - 7);
                              return n;
                            });
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--text-secondary, #64748b)',
                            cursor: 'pointer',
                          }}
                          title="Tuần trước"
                        >
                          <ChevronLeft size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRefWeekDate((prev) => {
                              const n = new Date(prev);
                              n.setDate(n.getDate() + 7);
                              return n;
                            });
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--text-secondary, #64748b)',
                            cursor: 'pointer',
                          }}
                          title="Tuần sau"
                        >
                          <ChevronRight size={13} />
                        </button>

                        <span style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '2px' }}>
                          {weekRangeLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            setRefWeekDate(today);
                            setSelectedDayKey(getTodayDateKey());
                          }}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.71875rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm, 4px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--color-primary, #0284c7)',
                            cursor: 'pointer',
                          }}
                        >
                          Hôm nay
                        </button>

                        <button
                          type="button"
                          onClick={() => openCreateEventSlide(selectedDayKey)}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: 'none',
                            backgroundColor: 'var(--color-primary, #0284c7)',
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                          title="Thêm sự kiện mới"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* KHỐI 2: DẢI 7 NGÀY TRONG TUẦN (WEEK STRIP) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '4px',
                        padding: '4px',
                        backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                        borderRadius: 'var(--radius-md, 8px)',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      {currentWeekDays.map((d) => {
                        const isSelected = selectedDayKey === d.dateKey;
                        const eventCount = plannerItems.filter(
                          (it) => isEventOnDate(it, d.dateKey) && (it.type === 'event' || !it.type)
                        ).length;

                        return (
                          <button
                            key={d.dateKey}
                            type="button"
                            onClick={() => setSelectedDayKey(d.dateKey)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 2px 5px 2px',
                              borderRadius: 'var(--radius-sm, 6px)',
                              border: isSelected
                                ? 'none'
                                : d.isToday
                                  ? '1px solid var(--color-primary, #0284c7)'
                                  : '1px solid transparent',
                              backgroundColor: isSelected
                                ? 'var(--color-primary, #0284c7)'
                                : d.isToday
                                  ? 'rgba(2, 132, 199, 0.08)'
                                  : 'transparent',
                              color: isSelected
                                ? '#ffffff'
                                : d.isToday
                                  ? 'var(--color-primary, #0284c7)'
                                  : 'var(--text-secondary, #64748b)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                marginBottom: '2px',
                                opacity: isSelected ? 0.95 : 0.8,
                              }}
                            >
                              {d.shortLabel}
                            </span>
                            <span
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: isSelected || d.isToday ? 700 : 500,
                                lineHeight: 1,
                              }}
                            >
                              {d.dayNumber}
                            </span>

                            {/* Dot indicator đánh dấu ngày có sự kiện */}
                            <div
                              style={{
                                display: 'flex',
                                gap: '2px',
                                marginTop: '4px',
                                height: '4px',
                                alignItems: 'center',
                              }}
                            >
                              {eventCount > 0 && (
                                <span
                                  style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: isSelected
                                      ? '#ffffff'
                                      : d.isToday
                                        ? 'var(--color-danger, #ef4444)'
                                        : 'var(--color-primary, #0284c7)',
                                  }}
                                />
                              )}
                              {eventCount > 1 && (
                                <span
                                  style={{
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : '#f59e0b',
                                  }}
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>



                    {/* KHỐI 3: TIÊU ĐỀ NGÀY ĐANG CHỌN */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {selectedDayInfo
                            ? `${selectedDayInfo.fullLabel}, ${selectedDayInfo.dayNumber}/${String(
                              selectedDayInfo.date.getMonth() + 1
                            ).padStart(2, '0')}`
                            : 'Lịch ngày'}
                        </span>
                        {selectedDayInfo?.isToday && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(2, 132, 199, 0.12)',
                              color: 'var(--color-primary, #0284c7)',
                            }}
                          >
                            Hôm nay
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>
                        {selectedDayEvents.length} sự kiện
                      </span>
                    </div>

                    {/* KHỐI 4: DANH SÁCH THẺ SỰ KIỆN CHI TIẾT TRONG NGÀY (CÁCH A) */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingRight: '2px',
                      }}
                    >
                      {selectedDayEvents.length === 0 ? (
                        <div
                          style={{
                            padding: '36px 16px',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                            borderRadius: 'var(--radius-md, 8px)',
                            border: '1px dashed var(--border-subtle, #cbd5e1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '10px',
                          }}
                        >
                          <CalendarCheck size={28} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                            Không có lịch trình trong ngày này
                          </div>
                          <button
                            type="button"
                            onClick={() => openCreateEventSlide(selectedDayKey)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: 'var(--radius-sm, 6px)',
                              border: '1px solid var(--color-primary, #0284c7)',
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary, #0284c7)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={14} /> Thêm sự kiện mới
                          </button>
                        </div>
                      ) : (
                        selectedDayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => openDetailEventSlide(event)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md, 8px)',
                              backgroundColor: 'var(--bg-surface-1, #ffffff)',
                              border: '1px solid var(--border-subtle, #e2e8f0)',
                              borderLeft: `4px solid ${getCategoryColor(event.category || event.priority)}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: 'var(--color-primary, #0284c7)',
                                }}
                              >
                                <Clock size={11} />
                                <span>
                                  {event.timeStart || '08:00'} - {event.timeEnd || '09:00'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {event.priority === 'urgent' && (
                                  <span
                                    style={{
                                      fontSize: '0.65625rem',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                      color: '#ef4444',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Khẩn cấp
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteEvent(event.id, e)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted, #94a3b8)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                  title="Xóa sự kiện"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                lineHeight: 1.35,
                              }}
                            >
                              {event.title}
                            </div>

                            {event.description && (
                              <div
                                style={{
                                  fontSize: '0.71875rem',
                                  color: 'var(--text-secondary)',
                                  lineHeight: 1.35,
                                }}
                              >
                                {event.description}
                              </div>
                            )}

                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px',
                                fontSize: '0.6875rem',
                                color: 'var(--text-muted, #64748b)',
                                marginTop: '2px',
                              }}
                            >
                              {event.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <GeoAlt size={10} style={{ color: '#ef4444' }} />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.assigneeName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <People size={10} style={{ color: '#0284c7' }} />
                                  <span>{event.assigneeName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. SLIDE LỊCH NGÀY (TIMELINE THEO GIỜ) */}
                {calendarViewType === 'day' && (
                  <div
                    id="slide-calendar-day"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* THANH ĐIỀU HƯỚNG NGÀY */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-md, 8px)',
                        backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDayDate((prev) => {
                              const n = new Date(prev);
                              n.setDate(n.getDate() - 1);
                              return n;
                            });
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--text-secondary, #64748b)',
                            cursor: 'pointer',
                          }}
                          title="Ngày hôm trước"
                        >
                          <ChevronLeft size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDayDate((prev) => {
                              const n = new Date(prev);
                              n.setDate(n.getDate() + 1);
                              return n;
                            });
                          }}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--text-secondary, #64748b)',
                            cursor: 'pointer',
                          }}
                          title="Ngày hôm sau"
                        >
                          <ChevronRight size={13} />
                        </button>

                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '4px' }}>
                          {currentDayInfo.fullLabel}, {currentDayInfo.dayNumber}/{currentDayInfo.monthNumber}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDayDate(new Date());
                            setTimeout(scrollToCurrentTime, 80);
                          }}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.71875rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm, 4px)',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface-1, #ffffff)',
                            color: 'var(--color-primary, #0284c7)',
                            cursor: 'pointer',
                          }}
                        >
                          Hôm nay
                        </button>

                        <button
                          type="button"
                          onClick={() => openCreateEventSlide(currentDayKey)}
                          style={{
                            width: '26px',
                            height: '26px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-sm, 6px)',
                            border: 'none',
                            backgroundColor: 'var(--color-primary, #0284c7)',
                            color: '#ffffff',
                            cursor: 'pointer',
                          }}
                          title="Thêm sự kiện mới"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>



                    {/* THANH TỔNG HỢP NHANH TRONG NGÀY */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '2px 4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Dòng thời gian ngày
                        </span>
                        {currentDayInfo.isToday && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(2, 132, 199, 0.12)',
                              color: 'var(--color-primary, #0284c7)',
                            }}
                          >
                            Hôm nay
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>
                        {currentDayEvents.length} sự kiện
                      </span>
                    </div>

                    {/* TIMELINE THEO GIỜ (HOURLY VIEW - ĐỦ 24 GIỜ) */}
                    <div
                      ref={timelineContainerRef}
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        position: 'relative',
                      }}
                    >
                      {DAY_HOURS.map((hourStr) => {
                        const hourNum = parseInt(hourStr.split(':')[0], 10);
                        // Tìm các sự kiện bắt đầu trong khung giờ này
                        const slotEvents = currentDayEvents.filter((ev) => {
                          if (!ev.timeStart) return false;
                          const evHour = parseInt(ev.timeStart.split(':')[0], 10);
                          return evHour === hourNum;
                        });

                        // Kiểm tra xem giờ này có chứa giờ hiện tại không (khi xem Hôm nay)
                        const isCurrentHour = currentDayInfo.isToday && nowTime.getHours() === hourNum;
                        const minutePercent = (nowTime.getMinutes() / 60) * 100;

                        return (
                          <div
                            key={hourStr}
                            style={{
                              position: 'relative',
                              display: 'flex',
                              gap: '8px',
                              minHeight: slotEvents.length > 0 ? 'auto' : '40px',
                              alignItems: 'flex-start',
                            }}
                          >
                            {/* ĐƯỜNG THẲNG MÀU ĐỎ HIỂN THỊ GIỜ HIỆN TẠI (VỚI BADGE VÀ CHẤM ĐỎ) */}
                            {isCurrentHour && (
                              <div
                                ref={currentTimeRef}
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: `${minutePercent}%`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  zIndex: 20,
                                  pointerEvents: 'none',
                                  transform: 'translateY(-50%)',
                                }}
                              >
                                {/* Khối hiển thị giờ phút hiện tại */}
                                <div
                                  style={{
                                    width: '42px',
                                    textAlign: 'right',
                                    paddingRight: '4px',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      backgroundColor: '#ef4444',
                                      color: '#ffffff',
                                      fontSize: '0.625rem',
                                      fontWeight: 700,
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      lineHeight: 1.1,
                                      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
                                    }}
                                  >
                                    {String(nowTime.getHours()).padStart(2, '0')}:
                                    {String(nowTime.getMinutes()).padStart(2, '0')}
                                  </span>
                                </div>

                                {/* Chấm tròn đỏ ở giao điểm */}
                                <div
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ef4444',
                                    marginLeft: '-4px',
                                    marginRight: '-4px',
                                    flexShrink: 0,
                                    boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
                                  }}
                                />

                                {/* Đường thẳng ngang màu đỏ trải dài */}
                                <div
                                  style={{
                                    flex: 1,
                                    height: '2px',
                                    backgroundColor: '#ef4444',
                                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.35)',
                                  }}
                                />
                              </div>
                            )}

                            {/* Cột mốc giờ */}
                            <div
                              style={{
                                width: '42px',
                                flexShrink: 0,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: isCurrentHour ? '#ef4444' : 'var(--text-muted, #94a3b8)',
                                paddingTop: '2px',
                                textAlign: 'right',
                              }}
                            >
                              {hourStr}
                            </div>

                            {/* Khối sự kiện hoặc rãnh thời gian */}
                            <div
                              onClick={() => {
                                if (slotEvents.length === 0) {
                                  const endH = String((hourNum + 1) % 24).padStart(2, '0');
                                  openCreateEventSlide(currentDayKey, hourStr, `${endH}:00`);
                                }
                              }}
                              style={{
                                flex: 1,
                                borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                                paddingTop: '2px',
                                paddingBottom: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                minHeight: '38px',
                                cursor: slotEvents.length === 0 ? 'pointer' : 'default',
                                borderRadius: '4px',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (slotEvents.length === 0) {
                                  e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.04)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (slotEvents.length === 0) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                              title={slotEvents.length === 0 ? `Nhấn để thêm sự kiện lúc ${hourStr}` : undefined}
                            >
                              {slotEvents.map((event) => (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailEventSlide(event);
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: 'var(--radius-md, 8px)',
                                    backgroundColor: 'var(--bg-surface-1, #ffffff)',
                                    border: '1px solid var(--border-subtle, #e2e8f0)',
                                    borderLeft: `4px solid ${getCategoryColor(event.category || event.priority)}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.71875rem',
                                        fontWeight: 700,
                                        color: 'var(--color-primary, #0284c7)',
                                      }}
                                    >
                                      <Clock size={11} />
                                      <span>
                                        {event.timeStart || '08:00'} - {event.timeEnd || '09:00'}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {event.priority === 'urgent' && (
                                        <span
                                          style={{
                                            fontSize: '0.65625rem',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                            color: '#ef4444',
                                            fontWeight: 600,
                                          }}
                                        >
                                          Khẩn cấp
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteEvent(event.id, e)}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          color: 'var(--text-muted, #94a3b8)',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                        }}
                                        title="Xóa sự kiện"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      fontSize: '0.78125rem',
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {event.title}
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '8px',
                                      fontSize: '0.6875rem',
                                      color: 'var(--text-muted, #64748b)',
                                    }}
                                  >
                                    {event.location && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <GeoAlt size={10} style={{ color: '#ef4444' }} />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                    {event.assigneeName && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <People size={10} style={{ color: '#0284c7' }} />
                                        <span>{event.assigneeName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. SLIDE LỊCH BIỂU (AGENDA / SCHEDULE GOM NHÓM THEO NGÀY) */}
                {calendarViewType === 'agenda' && (
                  <div
                    id="slide-calendar-agenda"
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* THANH TÌM KIẾM VÀ NÚT THÊM SỰ KIỆN */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 8px',
                          backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                          border: '1px solid var(--border-subtle, #e2e8f0)',
                          borderRadius: 'var(--radius-sm, 6px)',
                        }}
                      >
                        <Search size={13} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                        <input
                          type="text"
                          placeholder="Tìm sự kiện, địa điểm, người..."
                          value={agendaSearch}
                          onChange={(e) => setAgendaSearch(e.target.value)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.75rem',
                            width: '100%',
                            outline: 'none',
                            color: 'var(--text-primary)',
                          }}
                        />
                        {agendaSearch && (
                          <button
                            type="button"
                            onClick={() => setAgendaSearch('')}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openCreateEventSlide(getTodayDateKey())}
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm, 6px)',
                          border: 'none',
                          backgroundColor: 'var(--color-primary, #0284c7)',
                          color: '#ffffff',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Thêm sự kiện mới"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* BỘ LỌC CHIP */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { id: 'all', label: 'Tất cả' },
                        { id: 'upcoming', label: 'Sắp tới' },
                        { id: 'urgent', label: 'Khẩn cấp' },
                      ].map((chip) => {
                        const isActive = agendaFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setAgendaFilter(chip.id as 'all' | 'upcoming' | 'urgent')}
                            style={{
                              padding: '3px 10px',
                              fontSize: '0.6875rem',
                              fontWeight: isActive ? 700 : 500,
                              borderRadius: '999px',
                              border: isActive ? '1px solid var(--color-primary, #0284c7)' : '1px solid var(--border-subtle, #e2e8f0)',
                              backgroundColor: isActive ? 'var(--color-primary, #0284c7)' : 'var(--bg-surface-2, #f8fafc)',
                              color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                              cursor: 'pointer',
                              transition: 'all 0.1s ease',
                            }}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>



                    {/* DANH SÁCH SỰ KIỆN GOM NHÓM THEO NGÀY */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {groupedAgendaEvents.length === 0 ? (
                        <div
                          style={{
                            padding: '36px 16px',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                            borderRadius: 'var(--radius-md, 8px)',
                            border: '1px dashed var(--border-subtle, #cbd5e1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '10px',
                          }}
                        >
                          <CalendarCheck size={28} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                            Không tìm thấy sự kiện nào phù hợp
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAgendaSearch('');
                              setAgendaFilter('all');
                            }}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.71875rem',
                              borderRadius: 'var(--radius-sm, 4px)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            Xóa bộ lọc
                          </button>
                        </div>
                      ) : (
                        groupedAgendaEvents.map((group) => (
                          <div key={group.dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Tiêu đề nhóm ngày */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                backgroundColor: group.isToday
                                  ? 'rgba(2, 132, 199, 0.12)'
                                  : 'var(--bg-surface-2, #f1f5f9)',
                                borderLeft: group.isToday ? '3px solid var(--color-primary, #0284c7)' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '0.78125rem',
                                    fontWeight: 700,
                                    color: group.isToday ? 'var(--color-primary, #0284c7)' : 'var(--text-primary)',
                                  }}
                                >
                                  {group.fullDateLabel}
                                </span>
                                {group.isToday && (
                                  <span
                                    style={{
                                      fontSize: '0.65625rem',
                                      fontWeight: 700,
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      backgroundColor: 'var(--color-primary, #0284c7)',
                                      color: '#ffffff',
                                    }}
                                  >
                                    Hôm nay
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted, #64748b)' }}>
                                {group.events.length} sự kiện
                              </span>
                            </div>

                            {/* Các thẻ sự kiện trong ngày */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {group.events.map((event) => (
                                <div
                                  key={event.id}
                                  onClick={() => openDetailEventSlide(event)}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-md, 8px)',
                                    backgroundColor: 'var(--bg-surface-1, #ffffff)',
                                    border: '1px solid var(--border-subtle, #e2e8f0)',
                                    borderLeft: `4px solid ${getCategoryColor(event.category || event.priority)}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '5px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'var(--color-primary, #0284c7)',
                                      }}
                                    >
                                      <Clock size={11} />
                                      <span>
                                        {event.timeStart || '08:00'} - {event.timeEnd || '09:00'}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {event.priority === 'urgent' && (
                                        <span
                                          style={{
                                            fontSize: '0.65625rem',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                            color: '#ef4444',
                                            fontWeight: 600,
                                          }}
                                        >
                                          Khẩn cấp
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteEvent(event.id, e)}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          color: 'var(--text-muted, #94a3b8)',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                        }}
                                        title="Xóa sự kiện"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      fontSize: '0.8125rem',
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {event.title}
                                  </div>

                                  {event.description && (
                                    <div
                                      style={{
                                        fontSize: '0.71875rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {event.description}
                                    </div>
                                  )}

                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '10px',
                                      fontSize: '0.6875rem',
                                      color: 'var(--text-muted, #64748b)',
                                      marginTop: '2px',
                                    }}
                                  >
                                    {event.location && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <GeoAlt size={10} style={{ color: '#ef4444' }} />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                    {event.assigneeName && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <People size={10} style={{ color: '#0284c7' }} />
                                        <span>{event.assigneeName}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Offcanvas>

    </div>
  );
};

export default BomOverviewView;
