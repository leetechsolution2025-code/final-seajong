import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CalendarCheck,
  GraphUpArrow,
  CheckCircle,
  Download,
  PencilSquare,
  Sliders,
  X,
  Save,
  Check
} from 'react-bootstrap-icons';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import {
  fetchBusinessPlansFromDB,
  saveBusinessPlanToDB,
} from '../../../services/businessPlanService';

export interface BusinessPlanViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onNavigate?: (navId: string) => void;
  theme?: string;
}

export interface MonthlyPlanItem {
  month: string;
  monthNum: number;
  quarter: string;
  revenue: number; // Tỷ VNĐ
  revenueDong: number; // VNĐ
  share: number; // %
  units: number; // Bộ cửa
  recoveryTarget: number; // Tỷ VNĐ
  recoveryDong?: number; // VNĐ
  recoveryRate?: number; // %
  keyFocus: string;
  majorProjects: string;
}

// Hàm khởi tạo dữ liệu kế hoạch mẫu theo mùa vụ cho từng năm độc lập
const DEFAULT_FOCUS_LIST = [
  'Hoàn thiện hồ sơ nghiệm thu cuối năm trước',
  'Nghỉ Tết Nguyên Đán, bảo dưỡng máy móc 2 xưởng',
  'Đẩy mạnh ký kết hợp đồng dự án quý 2',
  'Đốt mẫu kiểm định PCCC EI60 lô mới',
  'Lắp đặt hàng loạt tháp cao tầng phân khu A',
  'Sơ kết 6 tháng đầu năm, rà soát công nợ',
  'Vận hành hết công suất chuyền dán cạnh PUR',
  'Cung ứng phụ kiện đồng bộ khóa thông minh',
  'Bàn giao các tầng mẫu thầu PCCC',
  'Nghiệm thu khối lượng hoàn thành quý 3',
  'Tăng cường nhân sự lắp đặt phụ kiện thực địa',
  'Thu hồi công nợ năm, quyết toán toàn bộ dự án',
];

const parseRev = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).trim();
  const clean = s.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) || num < 0 ? 0 : num;
};

const parseUnits = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const clean = String(val).trim().replace(/[^\d]/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) || num < 0 ? 0 : num;
};

const formatRevenueInput = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9.,]/g, '');
  if (!clean) return '';

  if (clean.includes(',')) {
    const parts = clean.split(',');
    const intPart = parts[0].replace(/[^\d]/g, '');
    const formattedInt = intPart ? parseInt(intPart, 10).toLocaleString('vi-VN') : '0';
    const decPart = parts.slice(1).join('').slice(0, 2);
    return clean.endsWith(',') ? `${formattedInt},` : `${formattedInt},${decPart}`;
  }

  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      const intPart = parts[0].replace(/[^\d]/g, '');
      const formattedInt = intPart ? parseInt(intPart, 10).toLocaleString('vi-VN') : '0';
      return clean.endsWith('.') ? `${formattedInt},` : `${formattedInt},${parts[1]}`;
    }
  }

  const digits = clean.replace(/[^\d]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('vi-VN');
};

const formatUnitsInput = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const digits = String(val).replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

// Hàm khởi tạo dữ liệu kế hoạch mẫu theo mùa vụ cho từng năm độc lập
const createDefaultPlans = (totalRev: number, totalUnits: number): MonthlyPlanItem[] => {
  const weights = [6.4, 5.1, 7.3, 7.8, 8.4, 9.1, 9.6, 10.0, 9.8, 9.3, 8.7, 8.5];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const quarters = ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q3', 'Q3', 'Q3', 'Q4', 'Q4', 'Q4'];

  return weights.map((w, idx) => {
    const ratio = w / totalWeight;
    const rev = Number((totalRev * ratio).toFixed(2));
    const revDong = Math.round(rev * 1_000_000_000);
    const units = Math.round(totalUnits * ratio);
    const recovery = Number((rev * 0.92).toFixed(2));
    const recoveryDong = Math.round(recovery * 1_000_000_000);
    const mNum = idx + 1;
    return {
      month: `Tháng ${mNum < 10 ? '0' + mNum : mNum}`,
      monthNum: mNum,
      quarter: quarters[idx],
      revenue: rev,
      revenueDong: revDong,
      share: Number((ratio * 100).toFixed(1)),
      units,
      recoveryTarget: recovery,
      recoveryDong,
      recoveryRate: 92,
      keyFocus: DEFAULT_FOCUS_LIST[idx] || '',
      majorProjects: '',
    };
  });
};

const INITIAL_YEARS_DATA: Record<string, MonthlyPlanItem[]> = {
  '2025': createDefaultPlans(21.14, 1578),
  '2026': createDefaultPlans(25.5, 1848),
  '2027': createDefaultPlans(28.5, 2050),
};

export const BusinessPlanView: React.FC<BusinessPlanViewProps> = ({ onShowToast, onNavigate: _onNavigate }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [activeTab, setActiveTab] = useState<'months' | 'curve'>('months');

  // Ref và state đo kích thước thực tế vùng chứa biểu đồ để tự chiếm hết chiều cao khả dụng
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 900, height: 420 });

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const updateSize = () => {
      if (chartContainerRef.current) {
        const { clientWidth, clientHeight } = chartContainerRef.current;
        if (clientWidth > 50 && clientHeight > 50) {
          setChartDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(chartContainerRef.current);
    return () => ro.disconnect();
  }, [activeTab]);
  
  // Dữ liệu kế hoạch tách biệt hoàn toàn theo từng năm
  const [yearlyPlans, setYearlyPlans] = useState<Record<string, MonthlyPlanItem[]>>(INITIAL_YEARS_DATA);
  const [yearlyStatuses, setYearlyStatuses] = useState<Record<string, 'draft' | 'approved' | 'active'>>({
    '2025': 'approved',
    '2026': 'active',
    '2027': 'draft',
  });

  // Lấy dữ liệu 12 tháng của riêng năm đang chọn (luôn đảm bảo đủ 12 tháng)
  const monthlyPlans = useMemo(() => {
    const list = yearlyPlans[selectedYear];
    if (list && list.length === 12) return list;
    return INITIAL_YEARS_DATA[selectedYear] || createDefaultPlans(25.5, 1848);
  }, [yearlyPlans, selectedYear]);

  const planStatus = yearlyStatuses[selectedYear] || 'draft';

  // Xác định năm trong quá khứ (< năm hiện tại)
  const currentYear = new Date().getFullYear();
  const isPastYear = Number(selectedYear) < currentYear;

  // Trạng thái đang lưu dữ liệu vào DB
  const [isSaving, setIsSaving] = useState(false);

  // Tải dữ liệu từ SQLite DB khi khởi động
  useEffect(() => {
    let isMounted = true;
    fetchBusinessPlansFromDB().then((data) => {
      if (!isMounted) return;
      if (data && data.plans && Object.keys(data.plans).length > 0) {
        const cleanPlans: Record<string, MonthlyPlanItem[]> = {};
        Object.entries(data.plans).forEach(([yr, items]) => {
          if (Array.isArray(items) && items.length === 12) {
            cleanPlans[yr] = items;
          } else if (Array.isArray(items) && items.length > 0) {
            const totRev = items.reduce((s, m) => s + (m.revenue || 0), 0) || 25.5;
            const totUnits = items.reduce((s, m) => s + (m.units || 0), 0) || 1848;
            cleanPlans[yr] = createDefaultPlans(totRev, totUnits);
          }
        });

        setYearlyPlans((prev) => ({
          ...prev,
          ...cleanPlans,
        }));
        if (data.statuses && Object.keys(data.statuses).length > 0) {
          setYearlyStatuses((prev) => ({
            ...prev,
            ...data.statuses,
          }));
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal điều chỉnh chỉ tiêu 1 tháng cụ thể
  const [editingMonth, setEditingMonth] = useState<MonthlyPlanItem | null>(null);

  // Modal phân bổ nhanh tự động theo mùa vụ
  const [isAutoAllocateOpen, setIsAutoAllocateOpen] = useState(false);
  const [isModalShaking, setIsModalShaking] = useState(false);
  const [annualInputRev, setAnnualInputRev] = useState<string>('25,5');
  const [annualInputUnits, setAnnualInputUnits] = useState<string>('1.848');
  const [isRevFocused, setIsRevFocused] = useState<boolean>(false);
  const [isUnitsFocused, setIsUnitsFocused] = useState<boolean>(false);
  const [allocationMode, setAllocationMode] = useState<'seasonal' | 'equal' | 'growth'>('seasonal');

  // Tính toán tổng chỉ tiêu năm từ 12 tháng của năm đang chọn
  const summary = useMemo(() => {
    const totalRev = monthlyPlans.reduce((sum, item) => sum + item.revenue, 0);
    const totalUnits = monthlyPlans.reduce((sum, item) => sum + item.units, 0);
    const totalRecovery = monthlyPlans.reduce((sum, item) => sum + item.recoveryTarget, 0);
    const avgRevPerMonth = totalRev / 12;

    // Quý 1, 2, 3, 4
    const q1 = monthlyPlans.filter((m) => m.quarter === 'Q1').reduce((s, m) => s + m.revenue, 0);
    const q2 = monthlyPlans.filter((m) => m.quarter === 'Q2').reduce((s, m) => s + m.revenue, 0);
    const q3 = monthlyPlans.filter((m) => m.quarter === 'Q3').reduce((s, m) => s + m.revenue, 0);
    const q4 = monthlyPlans.filter((m) => m.quarter === 'Q4').reduce((s, m) => s + m.revenue, 0);

    return {
      totalRev: Number(totalRev.toFixed(2)),
      totalUnits,
      totalRecovery: Number(totalRecovery.toFixed(2)),
      avgRevPerMonth: Number(avgRevPerMonth.toFixed(2)),
      avgUnitsPerMonth: Math.round(totalUnits / 12),
      q1: Number(q1.toFixed(2)),
      q2: Number(q2.toFixed(2)),
      q3: Number(q3.toFixed(2)),
      q4: Number(q4.toFixed(2)),
    };
  }, [monthlyPlans]);

  // Mở modal phân bổ tự động và nạp đúng số liệu của năm đang chọn
  const handleOpenAutoAllocate = () => {
    setAnnualInputRev(formatRevenueInput(summary.totalRev || 25.5));
    setAnnualInputUnits(formatUnitsInput(summary.totalUnits || 1848));
    setIsAutoAllocateOpen(true);
  };

  // Xử lý lưu điều chỉnh tháng từ Offcanvas (chỉ lưu cho năm đang chọn)
  const handleSaveMonthEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonth) return;

    setYearlyPlans((prev) => {
      const currentList = prev[selectedYear] || [];
      const updatedList = currentList.map((item) => {
        if (item.monthNum === editingMonth.monthNum) {
          const revDong = Number(editingMonth.revenueDong) || 0;
          const rev = Number(editingMonth.revenue) || Number((revDong / 1_000_000_000).toFixed(2));
          const recDong = Number(editingMonth.recoveryDong) || Math.round(Number(editingMonth.recoveryTarget || 0) * 1_000_000_000);
          const rec = Number(editingMonth.recoveryTarget) || Number((recDong / 1_000_000_000).toFixed(2));
          return {
            ...editingMonth,
            revenue: rev,
            revenueDong: revDong || Math.round(rev * 1_000_000_000),
            units: Number(editingMonth.units) || 0,
            recoveryTarget: rec,
            recoveryDong: recDong,
          };
        }
        return item;
      });
      return {
        ...prev,
        [selectedYear]: updatedList,
      };
    });

    onShowToast?.('success', 'Cập nhật chỉ tiêu', `Đã lưu chỉ tiêu ${editingMonth.month} năm ${selectedYear} thành công.`);
    setEditingMonth(null);
  };

  // Phân bổ tự động (chỉ cập nhật năm đang chọn, luôn sinh đủ 12 tháng và lưu ngay)
  const handleApplyAutoAllocate = () => {
    const weights: Record<'seasonal' | 'equal' | 'growth', number[]> = {
      seasonal: [6.4, 5.1, 7.3, 7.8, 8.4, 9.1, 9.6, 10.0, 9.8, 9.3, 8.7, 8.5],
      equal: Array(12).fill(8.333),
      growth: [5.5, 6.0, 6.8, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.2, 10.5, 11.0], // Tăng dần
    };

    const selectedWeights = weights[allocationMode];
    const totalWeight = selectedWeights.reduce((a, b) => a + b, 0);

    const parsedRev = parseRev(annualInputRev);
    const parsedUnits = parseUnits(annualInputUnits);

    if (parsedRev <= 0) {
      onShowToast?.('warning', 'Chưa nhập chỉ tiêu', 'Vui lòng nhập tổng doanh số năm lớn hơn 0.');
      return;
    }

    const currentYearPlans = yearlyPlans[selectedYear] || [];
    const quarters = ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q3', 'Q3', 'Q3', 'Q4', 'Q4', 'Q4'];

    // Luôn đảm bảo tạo đủ chính xác 12 tháng từ Tháng 01 đến Tháng 12
    const updated: MonthlyPlanItem[] = Array.from({ length: 12 }, (_, idx) => {
      const mNum = idx + 1;
      const existing = currentYearPlans.find((item) => item.monthNum === mNum);
      const weightRatio = selectedWeights[idx] / totalWeight;
      const rev = Number((parsedRev * weightRatio).toFixed(2));
      const units = Math.round(parsedUnits * weightRatio);
      const recovery = Number((rev * 0.92).toFixed(2));
      return {
        month: `Tháng ${mNum < 10 ? '0' + mNum : mNum}`,
        monthNum: mNum,
        quarter: quarters[idx],
        revenue: rev,
        revenueDong: Math.round(rev * 1_000_000_000),
        share: Number((weightRatio * 100).toFixed(1)),
        units,
        recoveryTarget: recovery,
        recoveryDong: Math.round(recovery * 1_000_000_000),
        recoveryRate: 92,
        keyFocus: existing?.keyFocus || DEFAULT_FOCUS_LIST[idx] || '',
        majorProjects: existing?.majorProjects || '',
      };
    });

    setYearlyPlans((prev) => ({
      ...prev,
      [selectedYear]: updated,
    }));

    // Lưu ngay kế hoạch mới phân bổ vào SQLite DB và LocalStorage cache
    saveBusinessPlanToDB(
      selectedYear,
      updated,
      planStatus,
      parsedRev,
      parsedUnits,
      Number((parsedRev * 0.92).toFixed(2))
    );

    setIsAutoAllocateOpen(false);
    onShowToast?.(
      'success',
      'Phân bổ tự động thành công',
      `Đã phân bổ lại chỉ tiêu năm ${selectedYear} (${parsedRev} tỷ đồng / ${parsedUnits.toLocaleString('vi-VN')} bộ cửa) cho toàn bộ 12 tháng theo quy luật ${allocationMode === 'seasonal' ? 'mùa vụ ngành cửa' : allocationMode === 'growth' ? 'tăng trưởng đều' : 'chia đều'}.`
    );
  };

  // Lưu kế hoạch vào cơ sở dữ liệu SQLite
  const handleSaveFullPlan = async () => {
    setIsSaving(true);
    const res = await saveBusinessPlanToDB(
      selectedYear,
      monthlyPlans,
      planStatus,
      summary.totalRev,
      summary.totalUnits,
      summary.totalRecovery
    );
    setIsSaving(false);

    if (res.success) {
      onShowToast?.(
        'success',
        'Lưu cơ sở dữ liệu thành công',
        `Kế hoạch kinh doanh năm ${selectedYear} (${summary.totalRev} tỷ đồng) đã được lưu vào hệ thống cơ sở dữ liệu SQLite thành công.`
      );
    } else {
      onShowToast?.(
        'warning',
        'Lưu kế hoạch',
        res.message || 'Đã lưu tạm thời vào bộ nhớ trình duyệt.'
      );
    }
  };

  // Phê duyệt kế hoạch và cập nhật vào DB
  const handleApprovePlan = async () => {
    const nextStatuses = {
      ...yearlyStatuses,
      [selectedYear]: 'approved' as const,
    };
    setYearlyStatuses(nextStatuses);

    // Cập nhật trạng thái duyệt vào SQLite DB
    await saveBusinessPlanToDB(
      selectedYear,
      monthlyPlans,
      'approved',
      summary.totalRev,
      summary.totalUnits,
      summary.totalRecovery
    );

    onShowToast?.(
      'success',
      'Phê duyệt chỉ tiêu',
      `Nghị quyết HĐQT phê duyệt Kế hoạch Sản xuất Kinh doanh năm ${selectedYear} đã được ban hành và cập nhật vào DB.`
    );
  };

  // Xuất kế hoạch
  const handleExportPlan = () => {
    onShowToast?.('info', 'Kết xuất file', `Đang tạo file bảng kế hoạch kinh doanh 12 tháng năm ${selectedYear} định dạng Excel/PDF...`);
  };

  return (
    <div
      className="custom-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 20px 20px 20px',
        backgroundColor: 'var(--bg-surface-1)',
        height: '100%',
        maxHeight: '100%',
        overflowY: activeTab === 'curve' ? 'hidden' : 'auto',
        boxSizing: 'border-box',
        flex: '1 1 0%',
        minHeight: 0,
      }}
    >
      {/* ── 1. THANH ĐIỀU KHIỂN VÀ BỘ LỌC NĂM KẾ HOẠCH ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Chọn năm kế hoạch */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--bg-surface-2)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {['2025 (Quá khứ)', '2026 (Năm hiện hành)', '2027 (Kế hoạch tới)'].map((yStr) => {
              const val = yStr.split(' ')[0];
              const isSel = selectedYear === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setSelectedYear(val);
                    setEditingMonth(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: isSel ? 700 : 500,
                    backgroundColor: isSel ? 'var(--color-primary)' : 'transparent',
                    color: isSel ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Năm {val}
                </button>
              );
            })}
          </div>

          {/* Trạng thái duyệt */}
          <Badge
            variant={isPastYear ? 'neutral' : planStatus === 'approved' ? 'success' : planStatus === 'active' ? 'brand' : 'warning'}
            style={{ fontSize: '0.71875rem', padding: '3px 8px' }}
          >
            {isPastYear ? 'Đã kết thúc (Chỉ xem)' : planStatus === 'approved' ? 'HĐQT Đã duyệt' : planStatus === 'active' ? 'Đang thực hiện' : 'Bản dự thảo'}
          </Badge>
        </div>

        {/* Cụm thao tác: Phân bổ tự động, Lưu, Phê duyệt, Xuất */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Sliders size={13} />}
            onClick={handleOpenAutoAllocate}
            disabled={isPastYear}
            title={isPastYear ? `Kế hoạch năm ${selectedYear} đã lưu trữ (không thể phân bổ lại)` : "Nhập tổng chỉ tiêu năm và tự động phân bổ cho 12 tháng theo quy luật mùa vụ"}
          >
            Phân bổ tự động
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={13} />}
            onClick={handleExportPlan}
            title="Xuất bảng kế hoạch kinh doanh định dạng Excel/PDF"
          >
            Xuất Excel/PDF
          </Button>

          {planStatus !== 'approved' && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCircle size={13} />}
              onClick={handleApprovePlan}
              title="Phê duyệt chính thức kế hoạch kinh doanh năm"
            >
              Phê duyệt
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save size={13} />}
            onClick={handleSaveFullPlan}
            disabled={isPastYear || isSaving}
            isLoading={isSaving}
            title="Lưu kế hoạch kinh doanh vào cơ sở dữ liệu SQLite"
          >
            {isSaving ? 'Đang lưu DB...' : 'Lưu kế hoạch'}
          </Button>
        </div>
      </div>

      {/* ── 2. HÀNG 4 THẺ CHỈ TIÊU NĂM TỔNG THỂ (ANNUAL EXECUTIVE TARGETS) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* Card 1: Tổng doanh số năm */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Chỉ tiêu doanh số năm {selectedYear}
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
              <GraphUpArrow size={11} /> +20.6% vs {Number(selectedYear) - 1}
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {summary.totalRev} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Trung bình: <strong>{summary.avgRevPerMonth} tỷ đồng/tháng</strong> • Q3-Q4 chiếm <strong>56.8%</strong>
          </div>
        </div>

        {/* Card 2: Tổng sản lượng sản xuất */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Chỉ tiêu sản lượng
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
              <GraphUpArrow size={11} /> +17.1%
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {summary.totalUnits.toLocaleString('vi-VN')} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>bộ cửa</span>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Trung bình: <strong>{summary.avgUnitsPerMonth.toLocaleString('vi-VN')} bộ cửa/tháng</strong>
          </div>
        </div>

        {/* Card 3: Biên lợi nhuận gộp mục tiêu */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Biên lợi nhuận gộp mục tiêu
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              Kế hoạch chuẩn
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            28.5%
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Lợi nhuận gộp dự kiến: <strong>{(summary.totalRev * 0.285).toFixed(2)} tỷ đồng</strong>
          </div>
        </div>

        {/* Card 4: Kế hoạch thu hồi công nợ */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Kế hoạch dòng tiền thu hồi
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              Tỷ lệ ≥ 92%
            </span>
          </div>

          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#8b5cf6', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {summary.totalRecovery} <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>tỷ đồng</span>
          </div>

          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Cam kết bàn giao đúng hạn : <strong>≥ 95.0%</strong>
          </div>
        </div>
      </div>

      {/* ── 3. THANH ĐIỀU HƯỚNG TAB CHỨC NĂNG LẬP KẾ HOẠCH ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('months')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === 'months' ? 700 : 500,
              backgroundColor: activeTab === 'months' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'months' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <CalendarCheck size={14} />
            Bảng chỉ tiêu 12 Tháng
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('curve')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === 'curve' ? 700 : 500,
              backgroundColor: activeTab === 'curve' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'curve' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <GraphUpArrow size={14} />
            Đồ thị đường chỉ tiêu năm
          </button>
        </div>

        {/* Thanh đồ thị nằm ngang hiển thị màu của các quý (Progress bar) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '340px',
            maxWidth: '440px',
            padding: '4px 8px',
          }}
        >
          {/* Progress bar đa màu theo 4 Quý */}
          <div
            style={{
              display: 'flex',
              height: '9px',
              width: '100%',
              backgroundColor: 'var(--bg-surface-3)',
              borderRadius: '999px',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
              gap: '1px',
            }}
          >
            <div
              style={{
                width: `${(summary.q1 / summary.totalRev) * 100}%`,
                backgroundColor: '#0284c7',
                transition: 'width 0.3s ease',
              }}
              title={`Quý 1: ${summary.q1} Tỷ (${((summary.q1 / summary.totalRev) * 100).toFixed(1)}%)`}
            />
            <div
              style={{
                width: `${(summary.q2 / summary.totalRev) * 100}%`,
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease',
              }}
              title={`Quý 2: ${summary.q2} Tỷ (${((summary.q2 / summary.totalRev) * 100).toFixed(1)}%)`}
            />
            <div
              style={{
                width: `${(summary.q3 / summary.totalRev) * 100}%`,
                backgroundColor: '#f59e0b',
                transition: 'width 0.3s ease',
              }}
              title={`Quý 3: ${summary.q3} Tỷ (${((summary.q3 / summary.totalRev) * 100).toFixed(1)}%)`}
            />
            <div
              style={{
                width: `${(summary.q4 / summary.totalRev) * 100}%`,
                backgroundColor: '#8b5cf6',
                transition: 'width 0.3s ease',
              }}
              title={`Quý 4: ${summary.q4} Tỷ (${((summary.q4 / summary.totalRev) * 100).toFixed(1)}%)`}
            />
          </div>

          {/* Chú thích màu các quý */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.6875rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
              <strong>Q1:</strong> {summary.q1} Tỷ <span style={{ color: 'var(--text-muted)' }}>({((summary.q1 / summary.totalRev) * 100).toFixed(0)}%)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <strong>Q2:</strong> {summary.q2} Tỷ <span style={{ color: 'var(--text-muted)' }}>({((summary.q2 / summary.totalRev) * 100).toFixed(0)}%)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <strong>Q3:</strong> {summary.q3} Tỷ <span style={{ color: 'var(--text-muted)' }}>({((summary.q3 / summary.totalRev) * 100).toFixed(0)}%)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
              <strong>Q4:</strong> {summary.q4} Tỷ <span style={{ color: 'var(--text-muted)' }}>({((summary.q4 / summary.totalRev) * 100).toFixed(0)}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. NỘI DUNG CHÍNH THEO TAB ── */}

      {/* TAB 1: BẢNG KẾ HOẠCH 12 THÁNG CHI TIẾT */}
      {activeTab === 'months' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Kế hoạch phân bổ chỉ tiêu 12 tháng năm {selectedYear}
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Tổng 12 tháng: <strong style={{ color: 'var(--color-primary)' }}>{Math.round(summary.totalRev * 1_000_000_000).toLocaleString('vi-VN')} đ</strong> | {summary.totalUnits.toLocaleString('vi-VN')} bộ cửa
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-1)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600, width: '110px' }}>Tháng</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Chỉ tiêu Doanh số</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Tỷ trọng</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Sản lượng</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Thu hồi dòng tiền</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Nhiệm vụ trọng tâm</th>
                </tr>
              </thead>
              <tbody>
                {monthlyPlans.map((m, idx) => {
                  return (
                    <tr
                      key={m.monthNum}
                      onClick={isPastYear ? undefined : () => setEditingMonth(m)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: idx % 2 === 1 ? 'var(--bg-surface-1)' : 'transparent',
                        cursor: isPastYear ? 'default' : 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isPastYear) {
                          e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isPastYear) {
                          e.currentTarget.style.backgroundColor = idx % 2 === 1 ? 'var(--bg-surface-1)' : 'transparent';
                        }
                      }}
                      title={
                        isPastYear
                          ? `Kế hoạch năm ${selectedYear} đã kết thúc (chế độ chỉ xem)`
                          : `Nhấn vào dòng để thiết lập chỉ số ${m.month}`
                      }
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {m.month}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {m.revenueDong.toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          ({m.revenue.toFixed(2)} tỷ đồng)
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {m.share}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.units.toLocaleString('vi-VN')} bộ cửa
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#8b5cf6', fontVariantNumeric: 'tabular-nums' }}>
                          {(m.recoveryDong || Math.round(m.recoveryTarget * 1_000_000_000)).toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          ({m.recoveryTarget.toFixed(2)} tỷ đồng)
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {m.keyFocus}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-surface-3)', borderTop: '2px solid var(--border-default)', fontWeight: 800 }}>
                  <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                    TỔNG CỘNG
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                      {Math.round(summary.totalRev * 1_000_000_000).toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      ({summary.totalRev} tỷ đồng)
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-primary)' }}>
                    100.0%
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>
                    {summary.totalUnits.toLocaleString('vi-VN')} bộ cửa
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: '#8b5cf6', fontVariantNumeric: 'tabular-nums' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                      {Math.round(summary.totalRecovery * 1_000_000_000).toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      ({summary.totalRecovery} tỷ đồng)
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.71875rem' }}>
                    Mục tiêu tăng trưởng: +20.6% doanh số, tỷ lệ thu hồi ≥ 92%, bàn giao đúng hạn ≥ 95%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ĐỒ THỊ ĐƯỜNG CHỈ TIÊU KẾ HOẠCH NĂM */}
      {activeTab === 'curve' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: '1 1 0%',
            minHeight: '280px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Đồ thị đường chỉ tiêu kế hoạch 12 tháng năm {selectedYear}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Đường nét đứt màu đỏ thể hiện chính xác chỉ tiêu sẽ được đồng bộ và phản ánh trực tiếp trên đồ thị Tổng quan BOM
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                <span style={{ width: '18px', height: '2.5px', borderTop: '2.5px dashed #ef4444', display: 'inline-block' }} />
                Đường chỉ tiêu doanh số
              </span>
            </div>
          </div>

          {/* SVG Visualizer */}
          <div
            ref={chartContainerRef}
            style={{
              position: 'relative',
              width: '100%',
              flex: '1 1 0%',
              minHeight: '200px',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {(() => {
              const { width: cWidth, height: cHeight } = chartDimensions;
              const revList = monthlyPlans.map((m) => m.revenue);
              const maxRev = Math.max(...revList, 0.1);
              // Co giãn linh hoạt trần Y-axis theo dữ liệu thực tế (bảo đảm đường biểu đồ luôn thể hiện trực quan rõ ràng)
              const maxVal = Math.max(0.4, Number((Math.ceil(maxRev * 1.25 * 10) / 10).toFixed(2)));
              const startX = 30;
              const endX = Math.max(startX + 120, cWidth - 30);
              const baselineY = Math.max(60, cHeight - 38);
              const topY = 35;
              const chartHeight = Math.max(40, baselineY - topY);
              const stepX = (endX - startX) / Math.max(1, monthlyPlans.length - 1);

              const points = monthlyPlans.map((m, idx) => ({
                x: startX + idx * stepX,
                y: baselineY - (m.revenue / maxVal) * chartHeight,
                val: m.revenue,
                month: m.month,
              }));

              let curveD = points.length > 0 ? `M ${points[0].x},${points[0].y}` : '';
              for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i === 0 ? 0 : i - 1];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2] || p2;
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                curveD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
              }

              // Các vạch kẻ ngang chia lưới theo tỷ lệ động
              const gridTicks = [0.8, 0.6, 0.4, 0.2]
                .map((r) => Number((maxVal * r).toFixed(2)))
                .filter((v, idx, arr) => v > 0 && arr.indexOf(v) === idx);

              return (
                <svg
                  viewBox={`0 0 ${cWidth} ${cHeight}`}
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="planCurveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.16" />
                      <stop offset="85%" stopColor="#ef4444" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Vùng bóng đổ nhẹ dưới đường biểu đồ */}
                  {points.length > 0 && (
                    <path
                      d={`${curveD} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`}
                      fill="url(#planCurveGradient)"
                    />
                  )}

                  {/* Grid lines (không hiển thị nhãn số cột thẳng đứng theo yêu cầu) */}
                  {gridTicks.map((gVal) => {
                    const y = baselineY - (gVal / maxVal) * chartHeight;
                    return (
                      <line
                        key={gVal}
                        x1={startX}
                        y1={y}
                        x2={endX}
                        y2={y}
                        stroke="var(--border-subtle)"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Baseline */}
                  <line x1={startX} y1={baselineY} x2={endX} y2={baselineY} stroke="var(--border-default)" strokeWidth="1.2" />

                  {/* Plan Curve */}
                  <path d={curveD} fill="none" stroke="#ef4444" strokeWidth="2.8" strokeDasharray="6 4" />

                  {/* Points and Labels */}
                  {points.map((pt, pIdx) => (
                    <g key={pIdx}>
                      <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
                      <text x={pt.x} y={pt.y - 9} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="#ef4444">
                        {pt.val.toFixed(2)}
                      </text>
                      <text x={pt.x} y={baselineY + 18} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--text-secondary)">
                        T{pIdx + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL 1: SỬA CHỈ TIÊU TỪNG THÁNG ── */}
      {/* ── OFFCANVAS RỘNG 400PX: THIẾT LẬP / ĐIỀU CHỈNH CHỈ SỐ THÁNG ── */}
      {!isPastYear && editingMonth && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setEditingMonth(null)}
        >
          <div
            style={{
              width: '400px',
              maxWidth: '100vw',
              height: '100%',
              backgroundColor: 'var(--bg-surface-1)',
              borderLeft: '1px solid var(--border-subtle)',
              boxShadow: '-6px 0 24px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Offcanvas */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PencilSquare size={17} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Thiết lập chỉ số {editingMonth.month}
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Kế hoạch SXKD năm {selectedYear} • {editingMonth.quarter}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMonth(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Đóng"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body Form Offcanvas */}
            <form
              onSubmit={handleSaveMonthEdit}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Thẻ tóm tắt thông số tháng */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Tỷ trọng tháng so với năm:</span>
                  <strong style={{ color: 'var(--color-primary)' }}>{editingMonth.share}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Đơn giá bình quân ước tính:</span>
                  <strong>
                    {editingMonth.units > 0
                      ? Math.round((editingMonth.revenueDong || (editingMonth.revenue * 1_000_000_000)) / editingMonth.units).toLocaleString('vi-VN') + ' đ/bộ'
                      : '—'}
                  </strong>
                </div>
              </div>

              {/* 1. Chỉ tiêu Doanh số (Hiển thị và nhập bằng Đồng) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Chỉ tiêu Doanh số <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={editingMonth.revenueDong ? editingMonth.revenueDong.toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const numDong = parseInt(raw, 10) || 0;
                      const numTy = Number((numDong / 1_000_000_000).toFixed(2));
                      const rate = editingMonth.recoveryRate !== undefined
                        ? editingMonth.recoveryRate
                        : editingMonth.revenueDong && editingMonth.revenueDong > 0
                        ? Number((((editingMonth.recoveryDong || Math.round((editingMonth.recoveryTarget || 0) * 1_000_000_000)) / editingMonth.revenueDong) * 100).toFixed(1))
                        : 92;
                      const calculatedRecoveryDong = Math.round((numDong * rate) / 100);
                      const calculatedRecoveryTy = Number((calculatedRecoveryDong / 1_000_000_000).toFixed(2));
                      setEditingMonth({
                        ...editingMonth,
                        revenueDong: numDong,
                        revenue: numTy,
                        recoveryDong: calculatedRecoveryDong,
                        recoveryTarget: calculatedRecoveryTy,
                        recoveryRate: rate,
                      });
                    }}
                    placeholder="Nhập số tiền bằng đồng"
                    style={{
                      width: '100%',
                      padding: '9px 36px 9px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-2)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  >
                    đ
                  </span>
                </div>
              </div>

              {/* 2. Chỉ tiêu sản lượng */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Chỉ tiêu sản lượng <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={editingMonth.units || 0}
                    onChange={(e) => setEditingMonth({ ...editingMonth, units: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      padding: '9px 42px 9px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-2)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  >
                    Bộ
                  </span>
                </div>
              </div>

              {/* 3. Dòng tiền thu hồi và Tỷ lệ thu hồi */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Kế hoạch dòng tiền thu hồi
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={
                        editingMonth.recoveryDong
                          ? editingMonth.recoveryDong.toLocaleString('vi-VN')
                          : editingMonth.recoveryTarget
                          ? Math.round(editingMonth.recoveryTarget * 1_000_000_000).toLocaleString('vi-VN')
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        const numDong = parseInt(raw, 10) || 0;
                        const numTy = Number((numDong / 1_000_000_000).toFixed(2));
                        const revDong = editingMonth.revenueDong || Math.round((editingMonth.revenue || 0) * 1_000_000_000);
                        const calculatedRate = revDong > 0
                          ? Number(((numDong / revDong) * 100).toFixed(1))
                          : 92;
                        setEditingMonth({
                          ...editingMonth,
                          recoveryDong: numDong,
                          recoveryTarget: numTy,
                          recoveryRate: calculatedRate,
                        });
                      }}
                      placeholder="Số tiền thu hồi"
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-2)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      đ
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Tỷ lệ thu hồi
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={
                        editingMonth.recoveryRate !== undefined
                          ? editingMonth.recoveryRate
                          : editingMonth.revenueDong && editingMonth.revenueDong > 0
                          ? Number((((editingMonth.recoveryDong || Math.round((editingMonth.recoveryTarget || 0) * 1_000_000_000)) / editingMonth.revenueDong) * 100).toFixed(1))
                          : 92
                      }
                      onChange={(e) => {
                        const newRate = parseFloat(e.target.value) || 0;
                        const revDong = editingMonth.revenueDong || Math.round((editingMonth.revenue || 0) * 1_000_000_000);
                        const calculatedRecoveryDong = Math.round((revDong * newRate) / 100);
                        const calculatedRecoveryTy = Number((calculatedRecoveryDong / 1_000_000_000).toFixed(2));
                        setEditingMonth({
                          ...editingMonth,
                          recoveryRate: newRate,
                          recoveryDong: calculatedRecoveryDong,
                          recoveryTarget: calculatedRecoveryTy,
                        });
                      }}
                      placeholder="92"
                      style={{
                        width: '100%',
                        padding: '9px 32px 9px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-2)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: '12px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    >
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Nhiệm vụ trọng tâm */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '140px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Nhiệm vụ trọng tâm
                </label>
                <textarea
                  value={editingMonth.keyFocus || ''}
                  onChange={(e) => setEditingMonth({ ...editingMonth, keyFocus: e.target.value })}
                  placeholder="Nhiệm vụ và chỉ đạo trọng tâm của Ban Giám đốc trong tháng..."
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Offcanvas Footer Actions */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <Button variant="secondary" size="sm" type="button" onClick={() => setEditingMonth(null)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="submit" leftIcon={<Check size={14} />}>
                  Lưu chỉ số
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CÔNG CỤ PHÂN BỔ NHANH THEO MÙA VỤ ── */}
      {isAutoAllocateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            // Thuộc tính static: không đóng modal khi click ra ngoài backdrop, tạo hiệu ứng phản hồi nhẹ
            if (e.target === e.currentTarget) {
              setIsModalShaking(true);
              setTimeout(() => setIsModalShaking(false), 200);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-lg)',
              border: isModalShaking ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
              padding: '22px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: isModalShaking
                ? '0 12px 30px rgba(2, 132, 199, 0.35)'
                : '0 10px 25px rgba(0, 0, 0, 0.2)',
              transform: isModalShaking ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Công cụ phân bổ tự động chỉ tiêu năm {selectedYear}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoAllocateOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
              Nhập tổng chỉ tiêu năm, hệ thống sẽ tính toán và phân bổ tự động cho toàn bộ 12 tháng theo quy luật mùa vụ ngành cửa công trình:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Tổng doanh số
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 'var(--radius-md)',
                      border: isRevFocused ? '1px solid var(--color-primary)' : '1px solid var(--border-default)',
                      boxShadow: isRevFocused ? '0 0 0 2px rgba(2, 132, 199, 0.18)' : 'none',
                      backgroundColor: 'var(--bg-surface-1)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={annualInputRev}
                      onFocus={() => setIsRevFocused(true)}
                      onBlur={() => setIsRevFocused(false)}
                      onChange={(e) => setAnnualInputRev(formatRevenueInput(e.target.value))}
                      placeholder="0"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '8px 12px',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        boxSizing: 'border-box',
                      }}
                    />
                    <span
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.78125rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-surface-2)',
                        borderLeft: '1px solid var(--border-subtle)',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      tỷ đồng
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    = {Math.round(parseRev(annualInputRev) * 1_000_000_000).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Tổng sản lượng
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 'var(--radius-md)',
                      border: isUnitsFocused ? '1px solid var(--color-primary)' : '1px solid var(--border-default)',
                      boxShadow: isUnitsFocused ? '0 0 0 2px rgba(2, 132, 199, 0.18)' : 'none',
                      backgroundColor: 'var(--bg-surface-1)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      value={annualInputUnits}
                      onFocus={() => setIsUnitsFocused(true)}
                      onBlur={() => setIsUnitsFocused(false)}
                      onChange={(e) => setAnnualInputUnits(formatUnitsInput(e.target.value))}
                      placeholder="0"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '8px 12px',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        fontWeight: 800,
                        boxSizing: 'border-box',
                      }}
                    />
                    <span
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.78125rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-surface-2)',
                        borderLeft: '1px solid var(--border-subtle)',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      bộ cửa
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ~ {Math.round(parseUnits(annualInputUnits) / 12).toLocaleString('vi-VN')} bộ/tháng
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Mô hình phân bổ theo thời gian:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: allocationMode === 'seasonal' ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-surface-1)',
                      border: allocationMode === 'seasonal' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="allocMode"
                      checked={allocationMode === 'seasonal'}
                      onChange={() => setAllocationMode('seasonal')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Theo mùa vụ ngành cửa (Khuyên dùng)
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Q1 khởi động (18.8%), Q2 tăng tốc (25.3%), Q3 đỉnh điểm (29.4%), Q4 bàn giao về đích (26.5%).
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: allocationMode === 'growth' ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-surface-1)',
                      border: allocationMode === 'growth' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="allocMode"
                      checked={allocationMode === 'growth'}
                      onChange={() => setAllocationMode('growth')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Tăng trưởng tịnh tiến qua các tháng
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Chỉ tiêu tăng dần đều từ Tháng 1 (1.2 Tỷ) đến Tháng 12 (2.4 Tỷ) theo đà mở rộng xưởng.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: allocationMode === 'equal' ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-surface-1)',
                      border: allocationMode === 'equal' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="allocMode"
                      checked={allocationMode === 'equal'}
                      onChange={() => setAllocationMode('equal')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Chia đều 12 tháng (Bình quân)
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Mỗi tháng đúng 8.33% chỉ tiêu năm (thích hợp cho hợp đồng bảo trì/dịch vụ định kỳ).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsAutoAllocateOpen(false)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="button" onClick={handleApplyAutoAllocate} leftIcon={<Check size={14} />}>
                  Thực hiện phân bổ 12 tháng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPlanView;
