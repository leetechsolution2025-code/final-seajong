import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  PlusLg,
  ArrowCounterclockwise,
  Save,
  Briefcase,
} from 'react-bootstrap-icons';
import {
  Button,
  Input,
  Select,
  Toggle,
  Badge,
  ConfirmDialog,
  Modal,
} from '../../../components/common';

export interface HolidayDayItem {
  id: string;
  date: string;
  dayOfWeek: string;
  name: string;
  isPaid: boolean;
  isCompensation: boolean;
  note?: string;
}

export interface HolidayPeriodItem {
  id: string;
  name: string;
  code: string;
  category: 'statutory' | 'company' | 'special';
  categoryLabel: string;
  year: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPaidDays: number;
  description: string;
  isStatutory: boolean;
  days: HolidayDayItem[];
}

export interface AnnualLeavePolicy {
  standardLeaveDaysPerYear: number;
  heavyHazardousLeaveDays?: number;
  specialHazardousLeaveDays?: number;
  seniorityBonusYears: number;
  seniorityBonusDays: number;
  marriageLeaveDays: number;
  childMarriageLeaveDays: number;
  bereavementLeaveDays: number;
  grandparentSiblingBereavementDays?: number;
  parentRemarriageLeaveDays?: number;
  siblingMarriageLeaveDays?: number;
  allowTransferToNextYear: boolean;
  maxTransferredDays: number;
  transferExpiryMonth: number;
}

export interface HolidayRulesData {
  year: number;
  periods: HolidayPeriodItem[];
  annualLeavePolicy: AnnualLeavePolicy;
  lastUpdated: string;
  updatedBy: string;
}

export const formatNumberGroup = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^\d]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

export const parseNumberGroup = (val: string): number => {
  const cleaned = val.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Dữ liệu nghỉ lễ Tết chuẩn theo Bộ luật Lao động Việt Nam
export const DEFAULT_HOLIDAY_PERIODS_2026: HolidayPeriodItem[] = [
  {
    id: 'HP-2026-01',
    name: 'Tết Dương Lịch 2026',
    code: 'TET_DUONG_LICH',
    category: 'statutory',
    categoryLabel: 'Theo luật lao động',
    year: 2026,
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    totalDays: 1,
    totalPaidDays: 1,
    description: 'Nghỉ 01 ngày tết dương lịch hưởng nguyên lương theo Điều 112 Bộ luật Lao động',
    isStatutory: true,
    days: [
      {
        id: 'HD-01',
        date: '2026-01-01',
        dayOfWeek: 'T5',
        name: 'Tết Dương Lịch chính thức',
        isPaid: true,
        isCompensation: false,
        note: 'Hưởng 100% lương tiêu chuẩn',
      },
    ],
  },
  {
    id: 'HP-2026-02',
    name: 'Tết Nguyên Đán Bính Ngọ 2026',
    code: 'TET_AM_LICH',
    category: 'statutory',
    categoryLabel: 'Theo luật lao động',
    year: 2026,
    startDate: '2026-02-14',
    endDate: '2026-02-22',
    totalDays: 9,
    totalPaidDays: 5,
    description: 'Kỳ nghỉ Tết Âm lịch gồm 5 ngày chính thức theo Luật và 4 ngày nghỉ cuối tuần hoán đổi',
    isStatutory: true,
    days: [
      { id: 'HD-02', date: '2026-02-14', dayOfWeek: 'T7', name: 'Nghỉ cuối tuần trước Tết', isPaid: false, isCompensation: false, note: 'Nghỉ hàng tuần' },
      { id: 'HD-03', date: '2026-02-15', dayOfWeek: 'CN', name: 'Nghỉ Chủ nhật trước Tết', isPaid: false, isCompensation: false, note: 'Nghỉ hàng tuần' },
      { id: 'HD-04', date: '2026-02-16', dayOfWeek: 'T2', name: 'Nghỉ Tết Âm lịch ngày 29 tháng Chạp', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-05', date: '2026-02-17', dayOfWeek: 'T3', name: 'Nghỉ Tết Âm lịch ngày 30 tháng Chạp Giao thừa', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-06', date: '2026-02-18', dayOfWeek: 'T4', name: 'Nghỉ Tết Mùng 1 Tết Bính Ngọ', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-07', date: '2026-02-19', dayOfWeek: 'T5', name: 'Nghỉ Tết Mùng 2 Tết Bính Ngọ', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-08', date: '2026-02-20', dayOfWeek: 'T6', name: 'Nghỉ Tết Mùng 3 Tết Bính Ngọ', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-09', date: '2026-02-21', dayOfWeek: 'T7', name: 'Nghỉ Mùng 4 Tết bù ngày Thứ Bảy', isPaid: false, isCompensation: true, note: 'Nghỉ bù cuối tuần' },
      { id: 'HD-10', date: '2026-02-22', dayOfWeek: 'CN', name: 'Nghỉ Mùng 5 Tết bù ngày Chủ nhật', isPaid: false, isCompensation: true, note: 'Nghỉ bù cuối tuần' },
    ],
  },
  {
    id: 'HP-2026-03',
    name: 'Giỗ Tổ Hùng Vương 2026',
    code: 'GIO_TO_HUNG_VUONG',
    category: 'statutory',
    categoryLabel: 'Theo luật lao động',
    year: 2026,
    startDate: '2026-04-26',
    endDate: '2026-04-27',
    totalDays: 2,
    totalPaidDays: 1,
    description: 'Ngày 10 tháng 3 Âm lịch trùng vào Chủ nhật nên người lao động được nghỉ bù vào Thứ Hai',
    isStatutory: true,
    days: [
      { id: 'HD-11', date: '2026-04-26', dayOfWeek: 'CN', name: 'Giỗ Tổ Hùng Vương 10 tháng 3 Âm lịch', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-12', date: '2026-04-27', dayOfWeek: 'T2', name: 'Nghỉ bù ngày Giỗ Tổ do trùng Chủ nhật', isPaid: false, isCompensation: true, note: 'Nghỉ bù ngày làm việc' },
    ],
  },
  {
    id: 'HP-2026-04',
    name: 'Ngày Chiến Thắng 30/04 và Quốc Tế Lao Động 01/05',
    code: 'CHIEN_THANG_LAO_DONG',
    category: 'statutory',
    categoryLabel: 'Theo luật lao động',
    year: 2026,
    startDate: '2026-04-30',
    endDate: '2026-05-03',
    totalDays: 4,
    totalPaidDays: 2,
    description: 'Nghỉ 2 ngày chính thức hưởng nguyên lương và nối liền 2 ngày nghỉ cuối tuần',
    isStatutory: true,
    days: [
      { id: 'HD-13', date: '2026-04-30', dayOfWeek: 'T5', name: 'Kỷ niệm Ngày Giải phóng miền Nam 30/04', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-14', date: '2026-05-01', dayOfWeek: 'T6', name: 'Ngày Quốc tế Lao động 01/05', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương' },
      { id: 'HD-15', date: '2026-05-02', dayOfWeek: 'T7', name: 'Nghỉ cuối tuần Thứ Bảy', isPaid: false, isCompensation: false, note: 'Nghỉ hàng tuần' },
      { id: 'HD-16', date: '2026-05-03', dayOfWeek: 'CN', name: 'Nghỉ cuối tuần Chủ nhật', isPaid: false, isCompensation: false, note: 'Nghỉ hàng tuần' },
    ],
  },
  {
    id: 'HP-2026-05',
    name: 'Lễ Quốc Khánh 02/09 năm 2026',
    code: 'QUOC_KHANH',
    category: 'statutory',
    categoryLabel: 'Theo luật lao động',
    year: 2026,
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    totalDays: 2,
    totalPaidDays: 2,
    description: 'Nghỉ 02 ngày gồm ngày Quốc khánh 02/09 và 01 ngày liền kề trước đó hưởng nguyên lương',
    isStatutory: true,
    days: [
      { id: 'HD-17', date: '2026-09-01', dayOfWeek: 'T3', name: 'Ngày nghỉ liền kề trước Lễ Quốc khánh', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương theo Luật' },
      { id: 'HD-18', date: '2026-09-02', dayOfWeek: 'T4', name: 'Ngày Quốc khánh nước Cộng hòa xã hội chủ nghĩa Việt Nam', isPaid: true, isCompensation: false, note: 'Hưởng 100% lương theo Luật' },
    ],
  },
  {
    id: 'HP-2026-06',
    name: 'Ngày Văn hoá Việt Nam',
    code: 'NGAY_VAN_HOA_VN',
    category: 'statutory',
    categoryLabel: 'Theo quy định',
    year: 2026,
    startDate: '2026-11-24',
    endDate: '2026-11-24',
    totalDays: 1,
    totalPaidDays: 1,
    description: 'Nghỉ ngày Văn hoá Việt Nam ngày 24/11 hưởng nguyên lương',
    isStatutory: true,
    days: [
      {
        id: 'HD-22',
        date: '2026-11-24',
        dayOfWeek: 'T3',
        name: 'Ngày Văn hoá Việt Nam 24/11',
        isPaid: true,
        isCompensation: false,
        note: 'Hưởng 100% lương',
      },
    ],
  },
  {
    id: 'HP-2026-07',
    name: 'Kỳ Nghỉ Mát Hè Nhà Máy Seajong 2026',
    code: 'NGHI_MAT_HE',
    category: 'company',
    categoryLabel: 'Kỳ nghỉ công ty',
    year: 2026,
    startDate: '2026-07-10',
    endDate: '2026-07-12',
    totalDays: 3,
    totalPaidDays: 1,
    description: 'Chương trình du lịch dã ngoại và gắn kết văn hóa doanh nghiệp do Seajong đài thọ',
    isStatutory: false,
    days: [
      { id: 'HD-19', date: '2026-07-10', dayOfWeek: 'T6', name: 'Ngày hội văn hóa nội bộ công ty Seajong', isPaid: true, isCompensation: false, note: 'Công ty đài thọ 100% lương' },
      { id: 'HD-20', date: '2026-07-11', dayOfWeek: 'T7', name: 'Tham quan dã ngoại toàn thể cán bộ công nhân viên', isPaid: false, isCompensation: false, note: 'Nghỉ cuối tuần Thứ Bảy' },
      { id: 'HD-21', date: '2026-07-12', dayOfWeek: 'CN', name: 'Nghỉ ngơi chuẩn bị sản xuất', isPaid: false, isCompensation: false, note: 'Nghỉ cuối tuần Chủ nhật' },
    ],
  },
];

export const DEFAULT_ANNUAL_LEAVE_POLICY: AnnualLeavePolicy = {
  standardLeaveDaysPerYear: 12,
  heavyHazardousLeaveDays: 14,
  specialHazardousLeaveDays: 16,
  seniorityBonusYears: 5,
  seniorityBonusDays: 1,
  marriageLeaveDays: 3,
  childMarriageLeaveDays: 1,
  bereavementLeaveDays: 3,
  grandparentSiblingBereavementDays: 1,
  parentRemarriageLeaveDays: 1,
  siblingMarriageLeaveDays: 1,
  allowTransferToNextYear: true,
  maxTransferredDays: 5,
  transferExpiryMonth: 3,
};

export const DEFAULT_HOLIDAY_RULES_DATA: HolidayRulesData = {
  year: 2026,
  periods: DEFAULT_HOLIDAY_PERIODS_2026,
  annualLeavePolicy: DEFAULT_ANNUAL_LEAVE_POLICY,
  lastUpdated: '04/10/2026 12:00',
  updatedBy: 'Lê Công Vụ - Giám đốc',
};

export interface HolidayRulesViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const HolidayRulesView: React.FC<HolidayRulesViewProps> = ({ onShowToast }) => {
  const [data, setData] = useState<HolidayRulesData>(DEFAULT_HOLIDAY_RULES_DATA);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<'periods' | 'policy'>('periods');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'statutory' | 'company'>('all');
  const [expandedPeriodIds, setExpandedPeriodIds] = useState<string[]>(['HP-2026-01', 'HP-2026-02']);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State cho Kỳ nghỉ
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<HolidayPeriodItem | null>(null);
  const [periodForm, setPeriodForm] = useState<{
    name: string;
    code: string;
    category: 'statutory' | 'company' | 'special';
    startDate: string;
    endDate: string;
    description: string;
  }>({
    name: '',
    code: '',
    category: 'statutory',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    description: '',
  });

  // Modal State cho Ngày nghỉ trong kỳ
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [targetPeriodId, setTargetPeriodId] = useState<string>('');
  const [editingDay, setEditingDay] = useState<HolidayDayItem | null>(null);
  const [dayForm, setDayForm] = useState<{
    date: string;
    name: string;
    isPaid: boolean;
    isCompensation: boolean;
    note: string;
  }>({
    date: '2026-01-01',
    name: '',
    isPaid: true,
    isCompensation: false,
    note: '',
  });

  // ConfirmDialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Tải dữ liệu từ backend API hoặc localStorage khi mount
  useEffect(() => {
    const ensureVanHoaHoliday = (rulesData: HolidayRulesData): HolidayRulesData => {
      const hasVanHoa = rulesData.periods.some(
        (p) => p.code === 'NGAY_VAN_HOA_VN' || p.name.includes('Ngày Văn hoá Việt Nam')
      );
      if (!hasVanHoa) {
        const vanHoaItem = DEFAULT_HOLIDAY_PERIODS_2026.find((p) => p.code === 'NGAY_VAN_HOA_VN');
        if (vanHoaItem) {
          return {
            ...rulesData,
            periods: [...rulesData.periods, vanHoaItem],
          };
        }
      }
      return rulesData;
    };

    fetch('/api/holiday-rules')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải từ máy chủ');
        return res.json();
      })
      .then((result) => {
        if (result && typeof result === 'object' && Array.isArray(result.periods)) {
          setData(ensureVanHoaHoliday(result));
        } else {
          const cached = localStorage.getItem('seajong_holiday_rules');
          if (cached) {
            try {
              setData(ensureVanHoaHoliday(JSON.parse(cached)));
            } catch {
              // fallback
            }
          }
        }
      })
      .catch(() => {
        const cached = localStorage.getItem('seajong_holiday_rules');
        if (cached) {
          try {
            setData(ensureVanHoaHoliday(JSON.parse(cached)));
          } catch {
            // fallback
          }
        }
      });
  }, []);



  // Lọc danh sách kỳ nghỉ
  const filteredPeriods = useMemo(() => {
    return data.periods.filter((p) => {
      if (p.year !== selectedYear) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchDay = p.days.some((d) => d.name.toLowerCase().includes(q) || d.date.includes(q));
        if (!matchName && !matchDesc && !matchDay) return false;
      }
      return true;
    });
  }, [data.periods, selectedYear, filterCategory, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedPeriodIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Tính lại tổng ngày và ngày hưởng lương của kỳ
  const recalculatePeriodCounts = (days: HolidayDayItem[]) => {
    const totalDays = days.length;
    const totalPaidDays = days.filter((d) => d.isPaid).length;
    return { totalDays, totalPaidDays };
  };

  // Mở modal thêm kỳ nghỉ
  const handleOpenAddPeriod = () => {
    setEditingPeriod(null);
    setPeriodForm({
      name: '',
      code: `KY_NGHI_${Date.now()}`,
      category: 'statutory',
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-01-01`,
      description: '',
    });
    setPeriodModalOpen(true);
  };

  // Mở modal sửa kỳ nghỉ
  const handleOpenEditPeriod = (period: HolidayPeriodItem) => {
    setEditingPeriod(period);
    setPeriodForm({
      name: period.name,
      code: period.code,
      category: period.category,
      startDate: period.startDate,
      endDate: period.endDate,
      description: period.description,
    });
    setPeriodModalOpen(true);
  };

  // Lưu thông tin kỳ nghỉ
  const handleSavePeriodForm = () => {
    if (!periodForm.name.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên kỳ nghỉ');
      return;
    }

    setHasChanges(true);
    if (editingPeriod) {
      // Cập nhật
      setData((prev) => ({
        ...prev,
        periods: prev.periods.map((p) => {
          if (p.id !== editingPeriod.id) return p;
          return {
            ...p,
            name: periodForm.name.trim(),
            code: periodForm.code.trim() || p.code,
            category: periodForm.category,
            categoryLabel:
              periodForm.category === 'statutory'
                ? 'Theo luật lao động'
                : periodForm.category === 'company'
                ? 'Kỳ nghỉ công ty'
                : 'Đặc thù',
            startDate: periodForm.startDate,
            endDate: periodForm.endDate,
            description: periodForm.description.trim(),
          };
        }),
      }));
      if (onShowToast) onShowToast('success', 'Đã cập nhật', 'Thông tin kỳ nghỉ đã được sửa thành công');
    } else {
      // Thêm mới
      const newId = `HP-${selectedYear}-${Date.now()}`;
      const newPeriod: HolidayPeriodItem = {
        id: newId,
        name: periodForm.name.trim(),
        code: periodForm.code.trim() || `KY_NGHI_${Date.now()}`,
        category: periodForm.category,
        categoryLabel:
          periodForm.category === 'statutory'
            ? 'Theo luật lao động'
            : periodForm.category === 'company'
            ? 'Kỳ nghỉ công ty'
            : 'Đặc thù',
        year: selectedYear,
        startDate: periodForm.startDate,
        endDate: periodForm.endDate,
        totalDays: 0,
        totalPaidDays: 0,
        description: periodForm.description.trim() || 'Kỳ nghỉ do người dùng thiết lập',
        isStatutory: periodForm.category === 'statutory',
        days: [],
      };

      setData((prev) => ({
        ...prev,
        periods: [newPeriod, ...prev.periods],
      }));
      setExpandedPeriodIds((prev) => [newId, ...prev]);
      if (onShowToast) onShowToast('success', 'Đã thêm kỳ nghỉ', 'Kỳ nghỉ mới đã được tạo thành công');
    }
    setPeriodModalOpen(false);
  };

  // Xác nhận xóa kỳ nghỉ
  const handleDeletePeriod = (period: HolidayPeriodItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa kỳ nghỉ',
      message: `Bạn có chắc chắn muốn xóa kỳ nghỉ "${period.name}" không? Toàn bộ danh sách ngày nghỉ trong kỳ này sẽ bị xóa khỏi lịch làm việc.`,
      confirmText: 'Xóa kỳ nghỉ',
      cancelText: 'Huỷ',
      type: 'danger',
      onConfirm: () => {
        setHasChanges(true);
        setData((prev) => ({
          ...prev,
          periods: prev.periods.filter((p) => p.id !== period.id),
        }));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (onShowToast) onShowToast('info', 'Đã xóa', 'Kỳ nghỉ đã được gỡ khỏi danh sách');
      },
    });
  };

  // Mở modal thêm ngày nghỉ vào kỳ
  const handleOpenAddDay = (periodId: string) => {
    setTargetPeriodId(periodId);
    setEditingDay(null);
    setDayForm({
      date: `${selectedYear}-01-01`,
      name: '',
      isPaid: true,
      isCompensation: false,
      note: 'Hưởng 100% lương',
    });
    setDayModalOpen(true);
  };

  // Mở modal sửa ngày nghỉ trong kỳ
  const handleOpenEditDay = (periodId: string, day: HolidayDayItem) => {
    setTargetPeriodId(periodId);
    setEditingDay(day);
    setDayForm({
      date: day.date,
      name: day.name,
      isPaid: day.isPaid,
      isCompensation: day.isCompensation,
      note: day.note || '',
    });
    setDayModalOpen(true);
  };

  // Lưu thông tin ngày nghỉ
  const handleSaveDayForm = () => {
    if (!dayForm.name.trim()) {
      if (onShowToast) onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên ngày nghỉ');
      return;
    }

    setHasChanges(true);
    // Tính thứ trong tuần từ date
    const dObj = new Date(dayForm.date);
    const dayIndex = dObj.getDay();
    const dowMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const calculatedDow = dowMap[dayIndex] || 'T2';

    setData((prev) => ({
      ...prev,
      periods: prev.periods.map((p) => {
        if (p.id !== targetPeriodId) return p;

        let newDays: HolidayDayItem[];
        if (editingDay) {
          newDays = p.days.map((d) => {
            if (d.id !== editingDay.id) return d;
            return {
              ...d,
              date: dayForm.date,
              dayOfWeek: calculatedDow,
              name: dayForm.name.trim(),
              isPaid: dayForm.isPaid,
              isCompensation: dayForm.isCompensation,
              note: dayForm.note.trim(),
            };
          });
        } else {
          const newDay: HolidayDayItem = {
            id: `HD-${Date.now()}`,
            date: dayForm.date,
            dayOfWeek: calculatedDow,
            name: dayForm.name.trim(),
            isPaid: dayForm.isPaid,
            isCompensation: dayForm.isCompensation,
            note: dayForm.note.trim(),
          };
          newDays = [...p.days, newDay].sort((a, b) => a.date.localeCompare(b.date));
        }

        const { totalDays, totalPaidDays } = recalculatePeriodCounts(newDays);
        return {
          ...p,
          days: newDays,
          totalDays,
          totalPaidDays,
        };
      }),
    }));

    if (onShowToast) {
      onShowToast(
        'success',
        editingDay ? 'Đã sửa ngày nghỉ' : 'Đã thêm ngày nghỉ',
        'Ngày nghỉ trong kỳ đã được lưu thành công'
      );
    }
    setDayModalOpen(false);
  };

  // Xóa ngày nghỉ trong kỳ
  const handleDeleteDay = (periodId: string, day: HolidayDayItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa ngày nghỉ',
      message: `Bạn có chắc chắn muốn xóa ngày nghỉ ${day.date} - ${day.name} khỏi kỳ nghỉ này không?`,
      confirmText: 'Xóa ngày',
      cancelText: 'Huỷ',
      type: 'danger',
      onConfirm: () => {
        setHasChanges(true);
        setData((prev) => ({
          ...prev,
          periods: prev.periods.map((p) => {
            if (p.id !== periodId) return p;
            const newDays = p.days.filter((d) => d.id !== day.id);
            const { totalDays, totalPaidDays } = recalculatePeriodCounts(newDays);
            return {
              ...p,
              days: newDays,
              totalDays,
              totalPaidDays,
            };
          }),
        }));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (onShowToast) onShowToast('info', 'Đã xóa ngày', 'Ngày nghỉ đã được gỡ khỏi kỳ nghỉ');
      },
    });
  };

  // Toggle nhanh hưởng lương cho một ngày
  const handleToggleDayPaid = (periodId: string, dayId: string, currentPaid: boolean) => {
    setHasChanges(true);
    setData((prev) => ({
      ...prev,
      periods: prev.periods.map((p) => {
        if (p.id !== periodId) return p;
        const newDays = p.days.map((d) => (d.id === dayId ? { ...d, isPaid: !currentPaid } : d));
        const { totalDays, totalPaidDays } = recalculatePeriodCounts(newDays);
        return {
          ...p,
          days: newDays,
          totalDays,
          totalPaidDays,
        };
      }),
    }));
  };

  // Khôi phục lịch chuẩn theo Bộ luật Lao động
  const handleResetToStatutory = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Khôi phục lịch nghỉ lễ theo Luật Lao động',
      message: 'Bạn có chắc chắn muốn khôi phục toàn bộ lịch nghỉ lễ và Tết năm 2026 về danh mục chuẩn theo Điều 112 Bộ luật Lao động không? Các kỳ nghỉ tự tạo thêm sẽ được thiết lập lại.',
      confirmText: 'Đồng ý khôi phục',
      cancelText: 'Huỷ',
      type: 'warning',
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          periods: DEFAULT_HOLIDAY_PERIODS_2026,
        }));
        setHasChanges(true);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        if (onShowToast) {
          onShowToast('info', 'Đã khôi phục', 'Lịch nghỉ lễ Tết đã trở về chuẩn Bộ luật Lao động');
        }
      },
    });
  };

  // Lưu lịch nghỉ lễ vào hệ thống
  const handleSaveAll = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận lưu lịch nghỉ lễ',
      message: 'Bạn có muốn lưu và áp dụng lịch nghỉ lễ, Tết và quy định phép năm này vào hệ thống Seajong không?',
      confirmText: 'Lưu lịch nghỉ lễ',
      cancelText: 'Huỷ',
      type: 'info',
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        executeSave();
      },
    });
  };

  const executeSave = async () => {
    setIsSaving(true);
    const updatedData: HolidayRulesData = {
      ...data,
      lastUpdated: new Date().toLocaleDateString('vi-VN'),
      updatedBy: 'Lê Công Vụ - Giám đốc',
    };

    try {
      localStorage.setItem('seajong_holiday_rules', JSON.stringify(updatedData));
      const res = await fetch('/api/holiday-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error('Máy chủ phản hồi lỗi');

      setData(updatedData);
      setHasChanges(false);
      if (onShowToast) {
        onShowToast('success', 'Lưu thành công', 'Đã lưu toàn bộ danh mục lịch nghỉ lễ vào hệ thống');
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lưu thành công',
          message: 'Đã lưu thành công danh mục lịch nghỉ lễ và quy chế phép năm vào hệ thống Seajong',
          confirmText: 'Đóng',
          type: 'success',
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', 'Lỗi lưu dữ liệu', err?.message || 'Không thể kết nối máy chủ');
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lỗi lưu dữ liệu',
          message: 'Không thể kết nối máy chủ. Cấu hình đã được lưu tạm vào bộ nhớ trình duyệt.',
          confirmText: 'Đóng',
          type: 'danger',
          onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Cập nhật chính sách phép năm
  const updateAnnualPolicy = (field: keyof AnnualLeavePolicy, value: any) => {
    setHasChanges(true);
    setData((prev) => ({
      ...prev,
      annualLeavePolicy: {
        ...prev.annualLeavePolicy,
        [field]: value,
      },
    }));
  };

  // Cập nhật ngày bắt đầu hoặc kết thúc của kỳ nghỉ lễ
  const handleUpdatePeriodDate = (periodId: string, field: 'startDate' | 'endDate', value: string) => {
    setHasChanges(true);
    setData((prev) => ({
      ...prev,
      periods: prev.periods.map((p) => {
        if (p.id !== periodId) return p;
        const newStart = field === 'startDate' ? value : p.startDate;
        const newEnd = field === 'endDate' ? value : p.endDate;
        let calculatedTotal = p.totalDays;
        if (newStart && newEnd) {
          const s = new Date(newStart).getTime();
          const e = new Date(newEnd).getTime();
          if (!isNaN(s) && !isNaN(e) && e >= s) {
            calculatedTotal = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
          }
        }
        return {
          ...p,
          [field]: value,
          totalDays: calculatedTotal,
        };
      }),
    }));
  };

  // Danh sách các kỳ nghỉ lễ tết theo quy định của pháp luật (Điều 112 Bộ luật Lao động)
  const statutoryPeriods = useMemo(() => {
    return data.periods.filter((p) => p.isStatutory || p.category === 'statutory');
  }, [data.periods]);

  // Tham chiếu tạm thời để không bị lỗi unused biến trong khi chờ thiết kế giao diện mới
  void [
    selectedYear,
    setSelectedYear,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    expandedPeriodIds,
    setExpandedPeriodIds,
    filteredPeriods,
    toggleExpand,
    handleOpenEditPeriod,
    handleDeletePeriod,
    handleOpenAddDay,
    handleOpenEditDay,
    handleDeleteDay,
    handleToggleDayPaid,
    updateAnnualPolicy,
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px 18px',
        fontFamily: "'Roboto Condensed', sans-serif",
      }}
    >
      {/* ── 1. HEADER VÀ THANH CÔNG CỤ ĐIỀU HƯỚNG ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border-default, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0,
            }}
          >
            <CalendarCheck />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                Thiết lập lịch nghỉ lễ, Tết và phép năm
              </h2>
              {hasChanges && <Badge variant="warning">Chưa lưu thay đổi</Badge>}
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
              Quản lý danh mục các kỳ nghỉ lễ chính thức theo luật lao động, ngày nghỉ bù và các kỳ nghỉ nội bộ nhà máy Seajong
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowCounterclockwise size={14} />}
            onClick={handleResetToStatutory}
            disabled={isSaving}
          >
            Khôi phục chuẩn Luật Lao động
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<PlusLg size={14} />}
            onClick={handleOpenAddPeriod}
            disabled={isSaving}
            style={{ fontWeight: 700 }}
          >
            Thêm kỳ nghỉ mới
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Save size={14} />}
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{ fontWeight: 700 }}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu lịch nghỉ lễ'}
          </Button>
        </div>
      </div>



      {/* Card 1: Danh sách các kỳ nghỉ lễ tết trong năm */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <CalendarCheck size={16} />
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                Danh sách các kỳ nghỉ lễ tết trong năm
              </h5>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Lịch các ngày nghỉ lễ, Tết theo quy định của pháp luật và doanh nghiệp
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #dbeafe',
            }}
          >
            Năm {selectedYear} • {statutoryPeriods.length} kỳ nghỉ theo quy định
          </span>
        </div>

        {/* Bảng danh sách các ngày nghỉ lễ tết theo quy định */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    padding: '8px 12px',
                    fontWeight: 700,
                    color: '#475569',
                    width: '56px',
                    textAlign: 'center',
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    padding: '8px 14px',
                    fontWeight: 700,
                    color: '#475569',
                    minWidth: '240px',
                  }}
                >
                  Tên kỳ nghỉ
                </th>
                <th
                  style={{
                    padding: '8px 14px',
                    fontWeight: 700,
                    color: '#475569',
                    minWidth: '340px',
                  }}
                >
                  Thời gian nghỉ
                </th>
              </tr>
            </thead>
            <tbody>
              {statutoryPeriods.map((period, index) => (
                <tr
                  key={period.id}
                  style={{
                    borderBottom: index < statutoryPeriods.length - 1 ? '1px solid #f1f5f9' : 'none',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                  }}
                >
                  {/* Cột 1: STT */}
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    {index + 1}
                  </td>

                  {/* Cột 2: Tên kỳ nghỉ */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                      {period.name}
                    </div>
                    {period.description && (
                      <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                        {period.description}
                      </div>
                    )}
                  </td>

                  {/* Cột 3: Thời gian nghỉ */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.7188rem', color: '#64748b', fontWeight: 600 }}>Từ:</span>
                        <input
                          type="date"
                          value={period.startDate}
                          onChange={(e) => handleUpdatePeriodDate(period.id, 'startDate', e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.7188rem', color: '#64748b', fontWeight: 600 }}>Đến:</span>
                        <input
                          type="date"
                          value={period.endDate}
                          onChange={(e) => handleUpdatePeriodDate(period.id, 'endDate', e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#1e293b',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {period.totalDays} ngày nghỉ ({period.totalPaidDays} ngày hưởng lương)
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 2: Quy định chế độ nghỉ phép năm và việc riêng */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '12px 14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Header của Card 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '6px',
            borderBottom: '1px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}
            >
              <Briefcase size={15} />
            </div>
            <div>
              <h5 style={{ margin: 0, fontSize: '0.8438rem', fontWeight: 800, color: '#0f172a' }}>
                Quy định chế độ nghỉ phép năm và việc riêng
              </h5>
              <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                Căn cứ theo Điều 113, 114 và Điều 115 Bộ luật Lao động số 45/2019/QH14
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: '#f5f3ff',
              color: '#6d28d9',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid #ddd6fe',
            }}
          >
            Chuẩn Bộ luật Lao động
          </span>
        </div>

        {/* ── PHẦN 1: CHẾ ĐỘ NGHỈ PHÉP NĂM (ĐIỀU 113 VÀ ĐIỀU 114 BLLĐ) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '3px', height: '12px', backgroundColor: '#4f46e5', borderRadius: '2px' }} />
            <h6 style={{ margin: 0, fontSize: '0.7813rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              1. Chế độ nghỉ phép năm (Điều 113 và Điều 114)
            </h6>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
            {/* Box 1.1: Định mức ngày phép năm tiêu chuẩn */}
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.7188rem', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                Định mức ngày phép năm theo điều kiện lao động (Điều 113)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#334155' }}>Lao động điều kiện bình thường:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      value={data.annualLeavePolicy.standardLeaveDaysPerYear}
                      onChange={(e) => updateAnnualPolicy('standardLeaveDaysPerYear', Number(e.target.value) || 0)}
                      style={{
                        width: '52px',
                        height: '24px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#334155' }}>Nặng nhọc, độc hại hoặc chưa thành niên:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      value={data.annualLeavePolicy.heavyHazardousLeaveDays ?? 14}
                      onChange={(e) => updateAnnualPolicy('heavyHazardousLeaveDays', Number(e.target.value) || 0)}
                      style={{
                        width: '52px',
                        height: '24px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#334155' }}>Đặc biệt nặng nhọc, độc hại:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      value={data.annualLeavePolicy.specialHazardousLeaveDays ?? 16}
                      onChange={(e) => updateAnnualPolicy('specialHazardousLeaveDays', Number(e.target.value) || 0)}
                      style={{
                        width: '52px',
                        height: '24px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.6563rem', color: '#64748b', fontStyle: 'italic', marginTop: '1px' }}>
                * Người làm việc dưới 12 tháng: Số ngày phép = Số tháng làm việc thực tế.
              </div>
            </div>

            {/* Box 1.2: Thâm niên và Chuyển phép */}
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.7188rem', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>
                Tăng phép theo thâm niên và Chuyển phép (Điều 114)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#334155' }}>Cứ đủ số năm làm việc:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      value={data.annualLeavePolicy.seniorityBonusYears}
                      onChange={(e) => updateAnnualPolicy('seniorityBonusYears', Number(e.target.value) || 0)}
                      style={{
                        width: '52px',
                        height: '24px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>năm</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#334155' }}>Được tăng thêm ngày phép:</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      value={data.annualLeavePolicy.seniorityBonusDays}
                      onChange={(e) => updateAnnualPolicy('seniorityBonusDays', Number(e.target.value) || 0)}
                      style={{
                        width: '52px',
                        height: '24px',
                        padding: '1px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '3px', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#334155' }}>Chuyển phép sang năm sau (tối đa):</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Toggle
                      checked={data.annualLeavePolicy.allowTransferToNextYear}
                      onChange={(checked) => updateAnnualPolicy('allowTransferToNextYear', checked)}
                    />
                    <input
                      type="number"
                      disabled={!data.annualLeavePolicy.allowTransferToNextYear}
                      value={data.annualLeavePolicy.maxTransferredDays}
                      onChange={(e) => updateAnnualPolicy('maxTransferredDays', Number(e.target.value) || 0)}
                      style={{
                        width: '46px',
                        height: '24px',
                        padding: '1px 4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: data.annualLeavePolicy.allowTransferToNextYear ? '#ffffff' : '#f1f5f9',
                        color: '#1e293b',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.6563rem', color: '#64748b', fontStyle: 'italic', marginTop: '1px' }}>
                * Hạn chót sử dụng hết ngày phép chuyển: Hết ngày 31 tháng 03 của năm sau.
              </div>
            </div>
          </div>
        </div>

        {/* ── PHẦN 2: CHẾ ĐỘ NGHỈ VIỆC RIÊNG (ĐIỀU 115 BLLĐ) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '3px', height: '12px', backgroundColor: '#7c3aed', borderRadius: '2px' }} />
              <h6 style={{ margin: 0, fontSize: '0.7813rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                2. Chế độ nghỉ việc riêng (Điều 115)
              </h6>
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              Người lao động phải thông báo trước cho người sử dụng lao động theo quy định
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '5px 8px', fontWeight: 700, color: '#475569', width: '46px', textAlign: 'center' }}>
                    STT
                  </th>
                  <th style={{ padding: '5px 10px', fontWeight: 700, color: '#475569', minWidth: '260px' }}>
                    Trường hợp nghỉ việc riêng
                  </th>
                  <th style={{ padding: '5px 10px', fontWeight: 700, color: '#475569', width: '120px', textAlign: 'center' }}>
                    Số ngày nghỉ
                  </th>
                  <th style={{ padding: '5px 10px', fontWeight: 700, color: '#475569', width: '160px' }}>
                    Chế độ tiền lương
                  </th>
                  <th style={{ padding: '5px 10px', fontWeight: 700, color: '#475569', width: '150px' }}>
                    Căn cứ pháp lý
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Kết hôn */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>1</td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, color: '#0f172a' }}>
                    Bản thân người lao động kết hôn
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        value={data.annualLeavePolicy.marriageLeaveDays}
                        onChange={(e) => updateAnnualPolicy('marriageLeaveDays', Number(e.target.value) || 0)}
                        style={{
                          width: '46px',
                          height: '22px',
                          padding: '1px 4px',
                          fontSize: '0.7188rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', display: 'inline-block' }}>
                      Hưởng nguyên lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Điểm a Khoản 1 Điều 115
                  </td>
                </tr>

                {/* 2. Con kết hôn */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>2</td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, color: '#0f172a' }}>
                    Con đẻ, con nuôi kết hôn
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        value={data.annualLeavePolicy.childMarriageLeaveDays}
                        onChange={(e) => updateAnnualPolicy('childMarriageLeaveDays', Number(e.target.value) || 0)}
                        style={{
                          width: '46px',
                          height: '22px',
                          padding: '1px 4px',
                          fontSize: '0.7188rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', display: 'inline-block' }}>
                      Hưởng nguyên lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Điểm b Khoản 1 Điều 115
                  </td>
                </tr>

                {/* 3. Tứ thân phụ mẫu / vợ chồng / con mất */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>3</td>
                  <td style={{ padding: '4px 10px', color: '#0f172a' }}>
                    <div style={{ fontWeight: 600 }}>Cha đẻ, mẹ đẻ, cha nuôi, mẹ nuôi; cha mẹ của vợ hoặc chồng; vợ hoặc chồng; con đẻ, con nuôi chết</div>
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        value={data.annualLeavePolicy.bereavementLeaveDays}
                        onChange={(e) => updateAnnualPolicy('bereavementLeaveDays', Number(e.target.value) || 0)}
                        style={{
                          width: '46px',
                          height: '22px',
                          padding: '1px 4px',
                          fontSize: '0.7188rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', display: 'inline-block' }}>
                      Hưởng nguyên lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Điểm c Khoản 1 Điều 115
                  </td>
                </tr>

                {/* 4. Ông bà, anh chị em ruột mất */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>4</td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, color: '#0f172a' }}>
                    Ông nội, bà nội, ông ngoại, bà ngoại, anh, chị, em ruột chết
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        value={data.annualLeavePolicy.grandparentSiblingBereavementDays ?? 1}
                        onChange={(e) => updateAnnualPolicy('grandparentSiblingBereavementDays', Number(e.target.value) || 0)}
                        style={{
                          width: '46px',
                          height: '22px',
                          padding: '1px 4px',
                          fontSize: '0.7188rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a', display: 'inline-block' }}>
                      Không hưởng lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Điểm a Khoản 2 Điều 115
                  </td>
                </tr>

                {/* 5. Cha hoặc mẹ kết hôn */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>5</td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, color: '#0f172a' }}>
                    Cha hoặc mẹ kết hôn (tái hôn)
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        value={data.annualLeavePolicy.parentRemarriageLeaveDays ?? 1}
                        onChange={(e) => updateAnnualPolicy('parentRemarriageLeaveDays', Number(e.target.value) || 0)}
                        style={{
                          width: '46px',
                          height: '22px',
                          padding: '1px 4px',
                          fontSize: '0.7188rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a', display: 'inline-block' }}>
                      Không hưởng lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Điểm b Khoản 2 Điều 115
                  </td>
                </tr>

                {/* 6. Anh chị em ruột kết hôn */}
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>6</td>
                  <td style={{ padding: '4px 10px', fontWeight: 600, color: '#0f172a' }}>
                    Anh, chị, em ruột kết hôn
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        value={data.annualLeavePolicy.siblingMarriageLeaveDays ?? 1}
                        onChange={(e) => updateAnnualPolicy('siblingMarriageLeaveDays', Number(e.target.value) || 0)}
                        style={{
                          width: '46px',
                          height: '22px',
                          padding: '1px 4px',
                          fontSize: '0.7188rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>ngày</span>
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a', display: 'inline-block' }}>
                      Không hưởng lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Điểm c Khoản 2 Điều 115
                  </td>
                </tr>

                {/* 7. Nghỉ việc riêng khác theo thỏa thuận */}
                <tr style={{ backgroundColor: '#ffffff' }}>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>7</td>
                  <td style={{ padding: '4px 10px', color: '#0f172a' }}>
                    <div style={{ fontWeight: 600 }}>Các trường hợp việc riêng cá nhân khác</div>
                    <div style={{ fontSize: '0.6563rem', color: '#64748b', marginTop: '1px' }}>
                      Theo thỏa thuận giữa người lao động và người sử dụng lao động
                    </div>
                  </td>
                  <td style={{ padding: '4px 10px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '0.6875rem' }}>
                    Theo thỏa thuận
                  </td>
                  <td style={{ padding: '4px 10px' }}>
                    <span style={{ fontSize: '0.6563rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                      Không hưởng lương
                    </span>
                  </td>
                  <td style={{ padding: '4px 10px', fontSize: '0.6875rem', color: '#64748b' }}>
                    Khoản 3 Điều 115
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 6. MODAL THÊM HOẶC SỬA KỲ NGHỈ ── */}
      <Modal
        isOpen={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        title={editingPeriod ? 'Chỉnh sửa thông tin kỳ nghỉ lễ' : 'Thêm kỳ nghỉ lễ mới'}
        description="Thiết lập tên kỳ nghỉ, phân loại theo luật hoặc công ty và khoảng thời gian áp dụng"
        maxWidth="540px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setPeriodModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSavePeriodForm} style={{ fontWeight: 700 }}>
              {editingPeriod ? 'Cập nhật kỳ nghỉ' : 'Thêm kỳ nghỉ'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Tên kỳ nghỉ lễ:
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Tết Nguyên Đán, Nghỉ mát công ty hè..."
              value={periodForm.name}
              onChange={(e) => setPeriodForm((prev) => ({ ...prev, name: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Phân loại kỳ nghỉ:
              </label>
              <Select
                value={periodForm.category}
                onChange={(e) => setPeriodForm((prev) => ({ ...prev, category: e.target.value as any }))}
                options={[
                  { value: 'statutory', label: 'Theo Luật Lao động' },
                  { value: 'company', label: 'Kỳ nghỉ công ty' },
                  { value: 'special', label: 'Nghỉ đặc thù' },
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Mã kỳ nghỉ:
              </label>
              <Input
                type="text"
                placeholder="Mã nhận diện"
                value={periodForm.code}
                onChange={(e) => setPeriodForm((prev) => ({ ...prev, code: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Ngày bắt đầu:
              </label>
              <Input
                type="date"
                value={periodForm.startDate}
                onChange={(e) => setPeriodForm((prev) => ({ ...prev, startDate: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
                Ngày kết thúc:
              </label>
              <Input
                type="date"
                value={periodForm.endDate}
                onChange={(e) => setPeriodForm((prev) => ({ ...prev, endDate: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Mô tả và căn cứ quy định:
            </label>
            <Input
              type="text"
              placeholder="Căn cứ thông báo của Bộ Lao động hoặc quyết định của Ban Giám Đốc..."
              value={periodForm.description}
              onChange={(e) => setPeriodForm((prev) => ({ ...prev, description: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>
      </Modal>

      {/* ── 7. MODAL THÊM HOẶC SỬA NGÀY NGHỈ TRONG KỲ ── */}
      <Modal
        isOpen={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        title={editingDay ? 'Chỉnh sửa ngày nghỉ cụ thể' : 'Thêm ngày nghỉ vào kỳ'}
        description="Thiết lập ngày, tên ngày lễ, chế độ hưởng lương và tính chất nghỉ bù"
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" onClick={() => setDayModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveDayForm} style={{ fontWeight: 700 }}>
              {editingDay ? 'Cập nhật ngày' : 'Thêm ngày'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Ngày nghỉ cụ thể:
            </label>
            <Input
              type="date"
              value={dayForm.date}
              onChange={(e) => setDayForm((prev) => ({ ...prev, date: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Tên ngày lễ hoặc nội dung diễn giải:
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Nghỉ mùng 4 Tết, Nghỉ bù ngày Chủ nhật..."
              value={dayForm.name}
              onChange={(e) => setDayForm((prev) => ({ ...prev, name: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8438rem', fontWeight: 700, color: '#0f172a' }}>
                  Hưởng 100% nguyên lương
                </div>
                <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px' }}>
                  Nếu bật, nhân viên nghỉ được hưởng nguyên lương theo Điều 112 Bộ luật Lao động
                </div>
              </div>
              <Toggle
                checked={dayForm.isPaid}
                onChange={(checked) => setDayForm((prev) => ({ ...prev, isPaid: checked }))}
              />
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.8438rem', fontWeight: 700, color: '#0f172a' }}>
                  Là ngày nghỉ bù hoặc hoán đổi công tác
                </div>
                <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '2px' }}>
                  Đánh dấu nếu ngày này là ngày nghỉ bù do trùng ngày nghỉ hàng tuần
                </div>
              </div>
              <Toggle
                checked={dayForm.isCompensation}
                onChange={(checked) => setDayForm((prev) => ({ ...prev, isCompensation: checked }))}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7813rem', fontWeight: 700, marginBottom: '6px' }}>
              Ghi chú thêm:
            </label>
            <Input
              type="text"
              placeholder="Ghi chú áp dụng cho chấm công và tính lương..."
              value={dayForm.note}
              onChange={(e) => setDayForm((prev) => ({ ...prev, note: e.target.value }))}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>
      </Modal>

      {/* ── 8. CONFIRM DIALOG XÁC NHẬN TÁC VỤ ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Đồng ý'}
        cancelText={confirmDialog.cancelText || 'Huỷ'}
        type={confirmDialog.type || 'warning'}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
