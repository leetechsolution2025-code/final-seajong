import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarCheck,
  Calendar3,
  CashCoin,
  Shop,
  Broadcast,
  Gift,
  Search,
  Globe,
  CameraVideo,
  Newspaper,
  ShieldCheck,
  ThreeDots,
  PencilSquare,
  Trash,
  ChevronDown,
  ChevronUp,
  PlusLg,
  Floppy,
  PrinterFill,
  CheckCircleFill,
  XCircleFill,
  SendFill,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  FileEarmarkBarGraph,
  ClockHistory,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { NumberInput } from '../../components/common/NumberInput';
import { Toggle } from '../../components/common/Toggle';
import type { ModernStepItem } from '../../types';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Table, type TableColumn } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PrintPreviewModal, printDocumentById } from '../../components/common/PrintPreviewModal';
import { SignaturePad } from '../../components/common/SignaturePad';
import { Offcanvas } from '../../components/common/Offcanvas';
import { PlanPrintDocument } from '../../components/marketing/PlanPrintDocument';
import { VIETNAM_PROVINCES, HOLIDAYS_LIST_BY_MONTH } from './constants';

// ── 13 BUDGET CATEGORIES CHUẨN CLIENT-SEAJONG ──────────────────────────────
export const BUDGET_CATEGORIES = [
  { id: 'agencyPOSBudget', label: 'Marketing tại điểm bán (POSM)', group: 'agency', icon: 'bi-shop', color: '#2563eb' },
  { id: 'agencyAdsBudget', label: 'Quảng cáo bảng hiệu đại lý', group: 'agency', icon: 'bi-signpost-2', color: '#0284c7' },
  { id: 'agencyGiftBudget', label: 'Quà tặng khai trương & sự kiện', group: 'agency', icon: 'bi-gift', color: '#059669' },
  { id: 'advFbAds', label: 'Quảng cáo Facebook Ads', group: 'adv', icon: 'bi-facebook', color: '#1877f2' },
  { id: 'advGoogleAds', label: 'Quảng cáo Google Search & GDN', group: 'adv', icon: 'bi-google', color: '#ea4335' },
  { id: 'advYoutubeAds', label: 'Quảng cáo Youtube Video', group: 'adv', icon: 'bi-youtube', color: '#ff0000' },
  { id: 'advTiktokAds', label: 'Quảng cáo TikTok Ads Video', group: 'adv', icon: 'bi-tiktok', color: '#000000' },
  { id: 'advSeoPr', label: 'SEO website & Bài PR báo chí', group: 'adv', icon: 'bi-newspaper', color: '#7c3aed' },
  { id: 'advPrintOutsource', label: 'In ấn Catalogue & Thiết kế ngoài', group: 'adv', icon: 'bi-printer', color: '#d97706' },
  { id: 'advMediaModelDecor', label: 'Media, Quay chụp, Decor mẫu', group: 'adv', icon: 'bi-camera-video', color: '#db2777' },
  { id: 'advWebDesign', label: 'Thiết kế & Nâng cấp website', group: 'adv', icon: 'bi-globe', color: '#0891b2' },
  { id: 'advOther', label: 'Các chi phí phát sinh khác', group: 'adv', icon: 'bi-three-dots', color: '#64748b' },
  { id: 'advReserve', label: 'Dự phòng ngân sách', group: 'adv', icon: 'bi-shield-check', color: '#10b981' },
];

// ── BUDGET INPUT ROW (2 CHIỀU % VÀ VNĐ TƯƠNG TỰ CLIENT-SEAJONG) ─────────────
interface BudgetInputRowProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  valBranding: number;
}

const BudgetInputRow: React.FC<BudgetInputRowProps> = ({ label, value, onChange, valBranding }) => {
  const [pctText, setPctText] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (valBranding > 0) {
      const pct = (value / valBranding) * 100;
      const roundedPct = Math.round(pct * 100) / 100;
      const parsedPct = parseFloat(pctText);
      if (isNaN(parsedPct) || Math.abs(parsedPct - roundedPct) > 0.001) {
        if (value === 0) {
          setPctText('');
        } else {
          setPctText(roundedPct.toString());
        }
      }
    } else {
      setPctText('');
    }
  }, [value, valBranding]);

  const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value.replace(/,/g, '.');
    const cleanVal = inputVal.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    let formattedVal = parts[0];
    if (parts.length > 1) {
      formattedVal += '.' + parts[1].substring(0, 2);
    }
    setPctText(formattedVal);

    if (formattedVal === '' || formattedVal === '.') {
      onChange(0);
      return;
    }

    const pct = parseFloat(formattedVal);
    if (!isNaN(pct)) {
      const calculatedVnd = Math.round((pct / 100) * valBranding);
      onChange(calculatedVnd);
    }
  };

  const handleVndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const numVal = Number(rawVal) || 0;
    onChange(numVal);
  };

  return (
    <div className="flex items-center justify-between gap-2.5 py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate text-left font-medium">
        {label}
      </span>
      <div
        className={`flex items-center rounded-md bg-white dark:bg-slate-900 px-2 h-7 w-44 transition-all ${
          isFocused
            ? 'border border-indigo-500 ring-1 ring-indigo-500/20'
            : 'border border-slate-200 dark:border-slate-700'
        }`}
      >
        <input
          type="text"
          value={pctText}
          onChange={handlePctChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0"
          className="w-8 h-full text-right text-xs font-semibold bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 p-0"
        />
        <span className="text-[11px] text-muted-foreground px-1.5 border-r border-slate-200 dark:border-slate-700 h-4 flex items-center">
          %
        </span>
        <input
          type="text"
          value={value ? value.toLocaleString('vi-VN') : ''}
          onChange={handleVndChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0"
          className="flex-1 min-w-0 w-0 h-full text-right text-xs font-bold bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 pl-1.5 pr-0.5"
        />
        <span className="text-[11px] text-muted-foreground pl-0.5">
          đ
        </span>
      </div>
    </div>
  );
};

// ── DROPDOWN CHỌN THIẾT BỊ / SẢN PHẨM TRỌNG TÂM THEO TUẦN ────────────────────
const DEFAULT_SEAJONG_CATEGORIES = [
  'Thiết bị vệ sinh',
  'Phụ kiện nhà tắm',
  'Sen cây',
  'Thiết bị nhà bếp',
  'Vòi lavabo',
  'Combo phòng tắm',
  'Bồn cầu',
  'Hút mùi',
  'Bồn rửa chén',
  'Sen cây âm trần',
  'Vòi bếp',
  'Ga thoát sàn',
  'Chậu Lavabo',
];

interface WeekProductSelectDropdownProps {
  weekNum: number;
  month: number;
  selectedList: string[];
  allCategories: any[];
  onChange: (newList: string[]) => void;
}

const WeekProductSelectDropdown: React.FC<WeekProductSelectDropdownProps> = ({
  weekNum,
  month,
  selectedList,
  allCategories,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const categories = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(allCategories) && allCategories.length > 0) {
      allCategories.forEach((cat) => {
        const name = typeof cat === 'string' ? cat : cat?.name;
        if (name && !list.includes(name)) list.push(name);
      });
    }
    DEFAULT_SEAJONG_CATEGORIES.forEach((name) => {
      if (!list.includes(name)) list.push(name);
    });
    return list;
  }, [allCategories]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, search]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 260;
    const left = Math.max(10, Math.min(window.innerWidth - dropdownWidth - 10, rect.left));
    const top = rect.bottom + 6;
    setCoords({ top, left });
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEvents = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      updatePosition();
    };

    document.addEventListener('mousedown', handleEvents);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleEvents);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  const toggleItem = (name: string) => {
    if (selectedList.includes(name)) {
      onChange(selectedList.filter((n) => n !== name));
    } else {
      onChange([...selectedList, name]);
    }
  };

  const hasSelected = selectedList.length > 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
          hasSelected
            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80'
        }`}
        title={hasSelected ? `Tuần ${weekNum}: ${selectedList.join(', ')}` : `Chọn thiết bị trọng tâm Tuần ${weekNum}`}
      >
        {hasSelected ? (
          <>
            <i className="bi bi-box-seam text-[10px]" />
            <span>{selectedList.length} SP</span>
            <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-[8px]`} />
          </>
        ) : (
          <>
            <PlusLg size={10} />
            <span>Chọn SP</span>
          </>
        )}
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: 260,
            zIndex: 99999,
          }}
          className="bg-white rounded-xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col text-slate-800 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-indigo-900">Thiết bị Tuần {weekNum}</span>
              <span className="text-[10px] text-slate-500">(Tháng {month})</span>
            </div>
            {hasSelected && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                {selectedList.length}
              </span>
            )}
          </div>

          {/* Search box */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center rounded-lg border border-slate-200 px-2 py-1 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white transition-colors">
              <Search size={11} className="text-slate-400 mr-1.5 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên thiết bị..."
                className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 p-0"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Device list with checkboxes */}
          <div className="max-h-52 overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-0.5">
            {filteredCategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                Không tìm thấy thiết bị nào
              </div>
            ) : (
              filteredCategories.map((name) => {
                const isChecked = selectedList.includes(name);
                return (
                  <label
                    key={name}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-indigo-50/80 text-indigo-950 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(name)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="flex-1 truncate">{name}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-2.5 py-1.5 bg-slate-50/90 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
            {hasSelected ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 hover:text-rose-700 font-medium hover:underline cursor-pointer"
              >
                Bỏ chọn hết
              </button>
            ) : (
              <span className="text-slate-400 text-[10px]">Chọn 1 hoặc nhiều TB</span>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 px-2.5 text-[11px]"
            >
              Xong
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── SVG DONUT CHART (HIỂN THỊ CƠ CẤU DOANH THU THAY THẾ REACT-APEXCHARTS) ───
interface RevenueDonutProps {
  data: { label: string; value: number; color: string }[];
  totalRevenue: number;
}

const RevenueDonutChart: React.FC<RevenueDonutProps> = ({ data, totalRevenue }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const radius = 54;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ width: 130, height: 130, position: 'relative', margin: '2px 0 8px 0' }}>
        <svg width="130" height="130" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {totalRevenue > 0 &&
            data.map((item, idx) => {
              const pct = (item.value / totalRevenue) * 100;
              if (pct <= 0) return null;
              const strokeDash = `${(pct / 100) * circumference} ${circumference}`;
              const rotation = -90 + (accumulatedPercent / 100) * 360;
              accumulatedPercent += pct;
              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDash}
                  transform={`rotate(${rotation} 80 80)`}
                  style={{
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    cursor: 'pointer',
                    opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
        </svg>
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted-foreground)' }}>
            {hoveredIdx !== null ? data[hoveredIdx].label : 'Tổng DT'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>
            {hoveredIdx !== null
              ? `${((data[hoveredIdx].value / (totalRevenue || 1)) * 100).toFixed(1)}%`
              : `${(totalRevenue / 1e9).toFixed(1)} tỷ`}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 8px', width: '100%', padding: '0 4px' }}>
        {data.map((item, idx) => {
          const ratio = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10.5,
                cursor: 'pointer',
                opacity: hoveredIdx !== null && hoveredIdx !== idx ? 0.5 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--foreground)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                {ratio.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── TYPES & INTERFACES ──────────────────────────────────────────────────────
interface ChildRowItem {
  id: string;
  pillar: string;
  details: string;
  ratioStr?: string;
  budget?: number;
  channel?: string;
  landingPage?: string;
}

interface ParentDetails {
  description: string;
  children: ChildRowItem[];
}

interface ContentPlanItem {
  id: string;
  stt?: string;
  pillar: string;
  purpose?: string;
  role?: string;
  details: string;
  budget: number;
  postsCount: number;
  isTotal?: boolean;
  isChildRow?: boolean;
  parentId?: string;
  childId?: string;
  ratioStr?: string;
}

interface AdPlanItem {
  id: string;
  stt?: string;
  objective: string;
  topic: string;
  channel: string;
  content: string;
  landingPage?: string;
  budget: number;
  region: string;
  assignee: string;
  startDate: string;
  endDate: string;
  audience: string;
  isTotal?: boolean;
  details?: string;
  isChildRow?: boolean;
  parentId?: string;
  childId?: string;
  ratioStr?: string;
  postsCount?: number;
}

interface SalaryTargetItem {
  id: string;
  stt?: string;
  name: string;
  basic: number;
  perf: number;
  allowance: number;
  qty: number;
  fund: number;
  isTotal?: boolean;
}

interface BudgetTargetItem {
  id: string;
  stt?: string;
  name: string;
  value: number;
  ratio: number;
  isTotal?: boolean;
  isFullWidth?: boolean;
  fullWidthContent?: string;
}

// ── COMPONENT CHÍNH MARKETING PLAN PAGE ─────────────────────────────────────
export const MarketingPlanPage: React.FC = () => {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [planDate, setPlanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const currentM = new Date().getMonth() + 1;
    return currentM >= 1 && currentM <= 12 ? currentM : 1;
  }); // Tự động lấy theo tháng hiện hành
  const [step1Tab, setStep1Tab] = useState<'kpi' | 'salary'>('kpi');
  const [step4BudgetTab, setStep4BudgetTab] = useState<'agency' | 'adv'>('agency');

  // Global loading & editing states
  const [loadingMasterPlan, setLoadingMasterPlan] = useState<boolean>(true);
  const [masterPlanRecord, setMasterPlanRecord] = useState<any>(null);
  const [masterPlanData, setMasterPlanData] = useState<any>(null);
  const [planStatus, setPlanStatus] = useState<string>('draft');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState<boolean>(false);

  // Print Preview & Digital Signature Modal
  const [showPlanPrintModal, setShowPlanPrintModal] = useState<boolean>(false);
  const [rowPadding, setRowPadding] = useState<number>(3);
  const [planProposerSig, setPlanProposerSig] = useState<string | null>(null);
  const [planApproverSig, setPlanApproverSig] = useState<string | null>(null);
  const [marketingManagerName, setMarketingManagerName] = useState<string>('Nguyễn Thu Huyền');
  const [directorName, setDirectorName] = useState<string>('Lê Công Vụ');

  // Step 1: Staff management state
  const [editedStaff, setEditedStaff] = useState<{ [key: string]: { name: string; basic: number; perf: number; allowance: number; qty: number } }>({});
  const [customStaffIds, setCustomStaffIds] = useState<string[]>([]);
  const [deletedBaseStaffIds, setDeletedBaseStaffIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Step 1: Revenue & Cost state
  const [brandingCost, setBrandingCost] = useState<number | null>(null);
  const [travelCost, setTravelCost] = useState<number | null>(null);
  const [editedRevenue, setEditedRevenue] = useState<{ [key: string]: number }>({});

  // Step 2: Content Plan & Ad Plan state
  const [subStep, setSubStep] = useState<'pillar' | 'ads'>('pillar');
  const [editedContentPlan, setEditedContentPlan] = useState<{ [key: string]: any }>({});
  const [customContentPlanIds, setCustomContentPlanIds] = useState<string[]>([]);
  const [selectedContentPlanIds, setSelectedContentPlanIds] = useState<string[]>([]);
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>([]);

  const [showAddOffcanvas, setShowAddOffcanvas] = useState<boolean>(false);
  const [editingContentPlanId, setEditingContentPlanId] = useState<string | null>(null);
  const [offcanvasData, setOffcanvasData] = useState<{
    pillar: string;
    purpose: string;
    role: string;
    details: string;
    budget: number;
    ratioStr: string;
    postsCount: number;
  }>({
    pillar: '',
    purpose: '',
    role: '',
    details: '',
    budget: 10000000,
    ratioStr: '0.77',
    postsCount: 5,
  });

  // Step 2: Ad Plan state
  const [editedAdPlan, setEditedAdPlan] = useState<{ [key: string]: any }>({});
  const [customAdPlanIds, setCustomAdPlanIds] = useState<string[]>([]);
  const [expandedAdParentIds, setExpandedAdParentIds] = useState<string[]>([]);
  const [showAdOffcanvas, setShowAdOffcanvas] = useState<boolean>(false);
  const [editingAdPlanId, setEditingAdPlanId] = useState<string | null>(null);
  const [adOffcanvasData, setAdOffcanvasData] = useState<{
    objective: string;
    topic: string;
    channel: string;
    content: string;
    landingPage: string;
    budget: number;
    region: string;
    assignee: string;
    startDate: string;
    endDate: string;
    audience: string;
  }>({
    objective: '',
    topic: '',
    channel: '',
    content: '',
    landingPage: '',
    budget: 10000000,
    region: 'Toàn quốc',
    assignee: 'Nguyễn Thu Huyền',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    audience: '',
  });

  // Step 3: Monthly Matrix state
  const [monthlyThemes, setMonthlyThemes] = useState<{ id: string; topic: string; content: string; month?: number }[]>([]);
  const [monthlyThemeTopic, setMonthlyThemeTopic] = useState<string>('');
  const [monthlyThemeContent, setMonthlyThemeContent] = useState<string>('');
  const [isThemeCollapsed, setIsThemeCollapsed] = useState<boolean>(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [customHolidays, setCustomHolidays] = useState<{ dateStr: string; name: string; weekNum: number; month: number }[]>([]);
  const [sectionContentItems, setSectionContentItems] = useState<Record<string, any[]>>({});
  const [monthlyProducts, setMonthlyProducts] = useState<Record<number, Record<number, string[]>>>({});

  // Modals in Step 3
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  const [newHolidayName, setNewHolidayName] = useState<string>('');
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');

  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [activeProductWeek, setActiveProductWeek] = useState<number | null>(null);
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [tempSelectedProducts, setTempSelectedProducts] = useState<string[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Task Offcanvas (Step 3)
  const [showTaskOffcanvas, setShowTaskOffcanvas] = useState<boolean>(false);
  const [taskOffcanvasSection, setTaskOffcanvasSection] = useState<string>('section_content');
  const [editingTaskItemId, setEditingTaskItemId] = useState<string | null>(null);
  const [taskPillar, setTaskPillar] = useState<string>('');
  const [taskTopic, setTaskTopic] = useState<string>('');
  const [taskFormat, setTaskFormat] = useState<string>('');
  const [taskChannel, setTaskChannel] = useState<string>('');
  const [taskWeeks, setTaskWeeks] = useState<number[]>([]);
  const [taskAssignee, setTaskAssignee] = useState<string>('Nguyễn Thu Huyền');
  const [taskBudget, setTaskBudget] = useState<string>('');
  const [taskDetails, setTaskDetails] = useState<string>('');
  const [taskIsAds, setTaskIsAds] = useState<boolean>(false);

  // Step 4: Budget Allocations state
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<number, number>>({});
  const [monthlyAllocations, setMonthlyAllocations] = useState<Record<number, Record<string, { budget: number; note: string }>>>({});
  const [agencyPOSBudget, setAgencyPOSBudget] = useState<number>(0);
  const [agencyAdsBudget, setAgencyAdsBudget] = useState<number>(0);
  const [agencyGiftBudget, setAgencyGiftBudget] = useState<number>(0);
  const [advFbAds, setAdvFbAds] = useState<number>(0);
  const [advGoogleAds, setAdvGoogleAds] = useState<number>(0);
  const [advYoutubeAds, setAdvYoutubeAds] = useState<number>(0);
  const [advTiktokAds, setAdvTiktokAds] = useState<number>(0);
  const [advSeoPr, setAdvSeoPr] = useState<number>(0);
  const [advPrintOutsource, setAdvPrintOutsource] = useState<number>(0);
  const [advMediaModelDecor, setAdvMediaModelDecor] = useState<number>(0);
  const [advWebDesign, setAdvWebDesign] = useState<number>(0);
  const [advOther, setAdvOther] = useState<number>(0);
  const [advReserve, setAdvReserve] = useState<number>(0);

  // Helper: Parse parent details for hierarchical child rows
  const parseParentDetails = (detailsStr: string): ParentDetails => {
    let description = '';
    let children: ChildRowItem[] = [];
    if (!detailsStr) return { description, children };
    if (detailsStr === 'Nội dung chi tiết...') return { description: 'Nội dung chi tiết...', children };

    try {
      if (detailsStr.startsWith('{')) {
        const obj = JSON.parse(detailsStr);
        description = obj.description || '';
        if (Array.isArray(obj.children)) children = obj.children;
      } else {
        description = detailsStr;
      }
    } catch {
      description = detailsStr;
    }
    return { description, children };
  };

  // Helper: Render content details with round badges for numbered items (1, 2, 3...)
  const renderContentDetails = (detailsRaw: string) => {
    if (!detailsRaw) return null;

    const regex = /(?:^|\s+)(\d+)\.\s+/g;
    const matches: { num: string; start: number; end: number }[] = [];
    let m: RegExpExecArray | null;

    while ((m = regex.exec(detailsRaw)) !== null) {
      const fullMatch = m[0];
      const num = m[1];
      const leadingSpaces = fullMatch.length - (num.length + 2);
      const actualStart = m.index + leadingSpaces;
      const actualEnd = actualStart + num.length + 2;
      matches.push({ num, start: actualStart, end: actualEnd });
    }

    if (matches.length === 0) {
      return <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{detailsRaw}</span>;
    }

    const intro = detailsRaw.slice(0, matches[0].start).trim();
    const items: { num: string; text: string }[] = [];

    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i];
      const nextStart = i + 1 < matches.length ? matches[i + 1].start : detailsRaw.length;
      const itemText = detailsRaw.slice(curr.end, nextStart).trim();
      items.push({ num: curr.num, text: itemText });
    }

    return (
      <div className="space-y-1.5 py-0.5 text-xs text-muted-foreground">
        {intro && (
          <div className="font-medium text-foreground/80 leading-relaxed mb-0.5">
            {intro}
          </div>
        )}
        <div className="space-y-1">
          {items.map((item, idx) => {
            const colonIdx = item.text.indexOf(':');
            let titlePart = '';
            let restPart = item.text;

            if (colonIdx > 0 && colonIdx <= 60) {
              titlePart = item.text.slice(0, colonIdx + 1);
              restPart = item.text.slice(colonIdx + 1);
            }

            return (
              <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50 text-[10px] font-bold shrink-0 mt-0.5">
                  {item.num}
                </span>
                <span className="flex-1">
                  {titlePart ? (
                    <>
                      <span className="font-semibold text-foreground/90">{titlePart}</span>
                      {restPart}
                    </>
                  ) : (
                    item.text
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── LOAD MASTER PLAN DATA FROM DATABASE ──────────────────────────────────
  useEffect(() => {
    const fetchMasterPlan = async () => {
      setLoadingMasterPlan(true);
      try {
        const res = await fetch(`/api/plan-finance/master-plan?year=${selectedYear}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.plan) {
            setMasterPlanRecord(data.plan);
            setPlanStatus(data.plan.status || 'draft');
            const parsed = typeof data.plan.planData === 'string' ? JSON.parse(data.plan.planData) : data.plan.planData;
            setMasterPlanData(parsed || {});

            if (parsed) {
              if (parsed.mkt_brandingCost !== undefined) setBrandingCost(parsed.mkt_brandingCost);
              if (parsed.mkt_travelCost !== undefined) setTravelCost(parsed.mkt_travelCost);
              if (parsed.mkt_editedStaff) setEditedStaff(parsed.mkt_editedStaff);
              if (parsed.mkt_customStaffIds) setCustomStaffIds(parsed.mkt_customStaffIds);
              if (parsed.mkt_deletedBaseStaffIds) setDeletedBaseStaffIds(parsed.mkt_deletedBaseStaffIds);

              if (parsed.mkt_editedContentPlan) setEditedContentPlan(parsed.mkt_editedContentPlan);
              if (parsed.mkt_customContentPlanIds) setCustomContentPlanIds(parsed.mkt_customContentPlanIds);

              if (parsed.mkt_editedAdPlan) setEditedAdPlan(parsed.mkt_editedAdPlan);
              if (parsed.mkt_customAdPlanIds) setCustomAdPlanIds(parsed.mkt_customAdPlanIds);

              if (parsed.mkt_monthlyThemes) setMonthlyThemes(parsed.mkt_monthlyThemes);
              if (parsed.mkt_monthlyThemeTopic) setMonthlyThemeTopic(parsed.mkt_monthlyThemeTopic);
              if (parsed.mkt_monthlyThemeContent) setMonthlyThemeContent(parsed.mkt_monthlyThemeContent);
              if (parsed.mkt_customHolidays) setCustomHolidays(parsed.mkt_customHolidays);
              if (parsed.mkt_sectionContentItems) setSectionContentItems(parsed.mkt_sectionContentItems);
              if (parsed.mkt_monthlyProducts) setMonthlyProducts(parsed.mkt_monthlyProducts);

              if (parsed.mkt_monthlyBudgets) setMonthlyBudgets(parsed.mkt_monthlyBudgets);
              if (parsed.mkt_monthlyAllocations) setMonthlyAllocations(parsed.mkt_monthlyAllocations);

              if (parsed.mkt_agencyPOSBudget !== undefined) setAgencyPOSBudget(Number(parsed.mkt_agencyPOSBudget) || 0);
              if (parsed.mkt_agencyAdsBudget !== undefined) setAgencyAdsBudget(Number(parsed.mkt_agencyAdsBudget) || 0);
              if (parsed.mkt_agencyGiftBudget !== undefined) setAgencyGiftBudget(Number(parsed.mkt_agencyGiftBudget) || 0);
              if (parsed.mkt_advFbAds !== undefined) setAdvFbAds(Number(parsed.mkt_advFbAds) || 0);
              if (parsed.mkt_advGoogleAds !== undefined) setAdvGoogleAds(Number(parsed.mkt_advGoogleAds) || 0);
              if (parsed.mkt_advYoutubeAds !== undefined) setAdvYoutubeAds(Number(parsed.mkt_advYoutubeAds) || 0);
              if (parsed.mkt_advTiktokAds !== undefined) setAdvTiktokAds(Number(parsed.mkt_advTiktokAds) || 0);
              if (parsed.mkt_advSeoPr !== undefined) setAdvSeoPr(Number(parsed.mkt_advSeoPr) || 0);
              if (parsed.mkt_advPrintOutsource !== undefined) setAdvPrintOutsource(Number(parsed.mkt_advPrintOutsource) || 0);
              if (parsed.mkt_advMediaModelDecor !== undefined) setAdvMediaModelDecor(Number(parsed.mkt_advMediaModelDecor) || 0);
              if (parsed.mkt_advWebDesign !== undefined) setAdvWebDesign(Number(parsed.mkt_advWebDesign) || 0);
              if (parsed.mkt_advOther !== undefined) setAdvOther(Number(parsed.mkt_advOther) || 0);
              if (parsed.mkt_advReserve !== undefined) setAdvReserve(Number(parsed.mkt_advReserve) || 0);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải MasterPlan từ DB:', err);
      } finally {
        setLoadingMasterPlan(false);
      }
    };
    fetchMasterPlan();
  }, [selectedYear]);

  // Load product categories & employees
  useEffect(() => {
    fetch('/api/seajong/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res && res.categories) setProductCategories(res.categories);
        else if (Array.isArray(res)) setProductCategories(res);
      })
      .catch(() => {});

    fetch('/api/company/employees')
      .then((r) => r.json())
      .then((res) => {
        const list = res.data || res;
        if (Array.isArray(list)) {
          const mgr = list.find(
            (e: any) => String(e.departmentCode || '').toLowerCase() === 'marketing'
          );
          if (mgr) setMarketingManagerName(mgr.fullName);
          const dir = list.find(
            (e: any) => String(e.departmentCode || '').toLowerCase() === 'board'
          );
          if (dir) setDirectorName(dir.fullName);
        }
      })
      .catch(() => {});
  }, []);

  // ── CALCULATIONS (STEP 1: REVENUE, COSTS & STAFF) ──────────────────────────
  const baseRevenue = {
    agent: Number(masterPlanData?.revenueAgent) || 1750000000,
    agentDev: Number(masterPlanData?.revenueAgentDev) || 2500000000,
    traditional: Number(masterPlanData?.revenueTraditional) || 750000000,
    ecommerce: Number(masterPlanData?.revenueEcommerce) || 0,
  };

  const valAgent = editedRevenue['agent'] !== undefined ? editedRevenue['agent'] : baseRevenue.agent;
  const valAgentDev = editedRevenue['agentDev'] !== undefined ? editedRevenue['agentDev'] : baseRevenue.agentDev;
  const valTraditional = editedRevenue['traditional'] !== undefined ? editedRevenue['traditional'] : baseRevenue.traditional;
  const valEcommerce = editedRevenue['ecommerce'] !== undefined ? editedRevenue['ecommerce'] : baseRevenue.ecommerce;
  const totalRevenue = valAgent + valAgentDev + valTraditional + valEcommerce;

  const getRatio = (val: number) => (totalRevenue > 0 ? (val / totalRevenue) * 100 : 0);

  // Quota marketing budget
  const valMarketingCost = Number(masterPlanData?.costMarketing) || 130000000;

  // Base Staff Positions
  const baseStaffConfigs = [
    { id: 'mkt_s1', label: 'Trưởng phòng Marketing', defaultBasic: 30000000, defaultPerf: 5000000, defaultAllowance: 1000000, defaultQty: 0 },
    { id: 'mkt_s2', label: 'Chuyên viên SEO & Content', defaultBasic: 15000000, defaultPerf: 3000000, defaultAllowance: 800000, defaultQty: 0 },
    { id: 'mkt_s3', label: 'Chuyên viên Thiết kế (Design/POSM)', defaultBasic: 16000000, defaultPerf: 2000000, defaultAllowance: 800000, defaultQty: 0 },
    { id: 'mkt_s4', label: 'Chuyên viên Chạy Ads & Media', defaultBasic: 18000000, defaultPerf: 4000000, defaultAllowance: 800000, defaultQty: 0 },
    { id: 'mkt_s5', label: 'Chuyên viên Video Editor', defaultBasic: 14000000, defaultPerf: 2000000, defaultAllowance: 800000, defaultQty: 0 },
  ];

  const updateStaffField = (id: string, field: string, val: any) => {
    setEditedStaff((prev) => {
      const cfg = baseStaffConfigs.find((c) => c.id === id);
      const curr = prev[id] || {
        name: cfg ? cfg.label : 'Vị trí mới',
        basic: cfg ? cfg.defaultBasic : 10000000,
        perf: cfg ? cfg.defaultPerf : 0,
        allowance: cfg ? cfg.defaultAllowance : 0,
        qty: cfg ? cfg.defaultQty : 1,
      };
      return { ...prev, [id]: { ...curr, [field]: val } };
    });
  };

  const getStaffValues = (id: string, defaultLabel: string, defBasic: number, defPerf: number, defAllowance: number, defQty: number) => {
    const est = editedStaff[id];
    const name = est ? est.name : defaultLabel;
    const basic = est ? est.basic : defBasic;
    const perf = est ? est.perf : defPerf;
    const allowance = est ? est.allowance : defAllowance;
    const qty = est ? est.qty : defQty;
    const fund = (basic + perf + allowance) * qty * 12;
    return { name, basic, perf, allowance, qty, fund };
  };

  const staffList = baseStaffConfigs
    .filter((cfg) => !deletedBaseStaffIds.includes(cfg.id))
    .map((cfg) => ({
      id: cfg.id,
      ...getStaffValues(cfg.id, cfg.label, cfg.defaultBasic, cfg.defaultPerf, cfg.defaultAllowance, cfg.defaultQty),
    }));

  const customStaffList = customStaffIds.map((id) => ({
    id,
    ...getStaffValues(id, 'Vị trí mới', 10000000, 0, 0, 1),
  }));

  const allStaff = [...staffList, ...customStaffList];
  const totalQty = allStaff.reduce((s, i) => s + i.qty, 0);
  const totalFund = allStaff.reduce((s, i) => s + i.fund, 0);

  // Marketing Costs
  const valBranding = brandingCost !== null ? brandingCost : (Number(masterPlanData?.c_mkt_ads) || 25000000);
  const valSalaryBonus = totalFund;
  const valTravel = travelCost !== null ? travelCost : (Number(masterPlanData?.c_mkt_print) || 0);
  const totalCostMarketing = valBranding + valSalaryBonus + valTravel;

  // Step 1: Tables data
  const budgetRows: BudgetTargetItem[] = [
    { id: 'dt', name: 'Mục tiêu doanh thu', value: 0, ratio: 0, isFullWidth: true, fullWidthContent: 'Mục tiêu doanh thu' },
    { id: 'dt_sum', stt: '1', name: 'Tổng doanh thu', value: totalRevenue, ratio: totalRevenue > 0 ? 100 : 0, isTotal: true },
    { id: 'dt_1', stt: '1.1', name: 'Doanh thu đại lý', value: valAgent, ratio: getRatio(valAgent) },
    { id: 'dt_2', stt: '1.2', name: 'Doanh thu phát triển đại lý', value: valAgentDev, ratio: getRatio(valAgentDev) },
    { id: 'dt_3', stt: '1.3', name: 'Doanh thu truyền thống', value: valTraditional, ratio: getRatio(valTraditional) },
    { id: 'dt_4', stt: '1.4', name: 'Doanh thu thương mại điện tử', value: valEcommerce, ratio: getRatio(valEcommerce) },
    { id: 'cp', name: 'Định mức chi phí', value: 0, ratio: 0, isFullWidth: true, fullWidthContent: `Định mức chi phí (Ngân sách được phân bổ: ${valMarketingCost.toLocaleString('vi-VN')} đồng)` },
    { id: 'cp_sum', stt: '2', name: 'Tổng chi phí', value: totalCostMarketing, ratio: getRatio(totalCostMarketing), isTotal: true },
    { id: 'cp_1', stt: '2.1', name: 'Chi phí Branding & Quảng cáo', value: valBranding, ratio: getRatio(valBranding) },
    { id: 'cp_2', stt: '2.2', name: 'Lương và thưởng', value: valSalaryBonus, ratio: getRatio(valSalaryBonus) },
    { id: 'cp_3', stt: '2.3', name: 'Công tác phí', value: valTravel, ratio: getRatio(valTravel) },
  ];

  const budgetColumns: TableColumn<BudgetTargetItem>[] = [
    {
      header: 'STT',
      width: 42,
      align: 'left',
      render: (row) => (row.isFullWidth ? '' : <span style={{ color: row.isTotal ? 'inherit' : 'var(--muted-foreground)', fontWeight: row.isTotal ? 700 : 400 }}>{row.stt}</span>),
    },
    {
      header: 'Khoản mục',
      align: 'left',
      render: (row) => <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>{row.name}</span>,
    },
    {
      header: 'Mục tiêu năm (đ)',
      align: 'right',
      render: (row) => {
        if (row.isFullWidth) return null;
        if (isEditing && (row.id === 'dt_1' || row.id === 'dt_2' || row.id === 'dt_3' || row.id === 'dt_4')) {
          const keyMap: any = { dt_1: 'agent', dt_2: 'agentDev', dt_3: 'traditional', dt_4: 'ecommerce' };
          const k = keyMap[row.id];
          return (
            <NumberInput
              value={row.value || 0}
              suffix="đ"
              onValueChange={(val) => {
                setEditedRevenue((prev) => ({ ...prev, [k]: val }));
              }}
              style={{ width: '100%', maxWidth: 140, height: 26, fontSize: 12, textAlign: 'right' }}
            />
          );
        }
        if (isEditing && (row.id === 'cp_1' || row.id === 'cp_3')) {
          return (
            <NumberInput
              value={row.value || 0}
              suffix="đ"
              onValueChange={(val) => {
                if (row.id === 'cp_1') setBrandingCost(val);
                if (row.id === 'cp_3') setTravelCost(val);
              }}
              style={{ width: '100%', maxWidth: 140, height: 26, fontSize: 12, textAlign: 'right' }}
            />
          );
        }
        return <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>{row.value.toLocaleString('vi-VN')} đ</span>;
      },
    },
    {
      header: 'Tỷ lệ (%)',
      width: 72,
      align: 'right',
      render: (row) => (row.isFullWidth ? null : <span style={{ fontWeight: row.isTotal ? 700 : 400, color: row.isTotal ? 'var(--primary)' : 'inherit' }}>{row.ratio.toFixed(1)}%</span>),
    },
  ];

  const salaryRows: SalaryTargetItem[] = [
    ...allStaff.map((item, idx) => ({
      id: item.id,
      stt: String(idx + 1),
      name: item.name,
      basic: item.basic,
      perf: item.perf,
      allowance: item.allowance,
      qty: item.qty,
      fund: item.fund,
    })),
    { id: 's_sum', name: 'Tổng cộng', basic: 0, perf: 0, allowance: 0, qty: totalQty, fund: totalFund, isTotal: true },
  ];

  const salaryColumns: TableColumn<SalaryTargetItem>[] = [
    {
      header: 'STT',
      width: 40,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedStaffIds.includes(row.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedStaffIds((prev) => [...prev, row.id]);
                  else setSelectedStaffIds((prev) => prev.filter((id) => id !== row.id));
                }}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{row.stt}</span>
            </div>
          );
        }
        return <span style={{ color: 'var(--muted-foreground)' }}>{row.stt}</span>;
      },
    },
    {
      header: 'VỊ TRÍ',
      width: 150,
      align: 'left',
      render: (row) => {
        if (isEditing && !row.isTotal) {
          return (
            <Input
              value={row.name || ''}
              onChange={(e) => updateStaffField(row.id, 'name', e.target.value)}
              style={{ width: '100%', height: 26, fontSize: 12, outline: 'none' }}
            />
          );
        }
        return <span>{row.name}</span>;
      },
    },
    {
      header: 'CƠ BẢN',
      width: 92,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <NumberInput
              value={row.basic || 0}
              onValueChange={(val) => updateStaffField(row.id, 'basic', val)}
              style={{ width: '100%', height: 26, fontSize: 12, textAlign: 'center', outline: 'none' }}
            />
          );
        }
        return <span>{row.basic.toLocaleString('vi-VN')}</span>;
      },
    },
    {
      header: 'HIỆU SUẤT',
      width: 82,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <NumberInput
              value={row.perf || 0}
              onValueChange={(val) => updateStaffField(row.id, 'perf', val)}
              style={{ width: '100%', height: 26, fontSize: 12, textAlign: 'center', outline: 'none' }}
            />
          );
        }
        return <span>{row.perf.toLocaleString('vi-VN')}</span>;
      },
    },
    {
      header: 'PHỤ CẤP',
      width: 78,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <NumberInput
              value={row.allowance || 0}
              onValueChange={(val) => updateStaffField(row.id, 'allowance', val)}
              style={{ width: '100%', height: 26, fontSize: 12, textAlign: 'center', outline: 'none' }}
            />
          );
        }
        return <span>{row.allowance.toLocaleString('vi-VN')}</span>;
      },
    },
    {
      header: 'SL',
      width: 48,
      align: 'center',
      render: (row) => {
        if (isEditing && !row.isTotal) {
          return (
            <NumberInput
              value={row.qty || 0}
              min={0}
              onValueChange={(val) => updateStaffField(row.id, 'qty', val)}
              style={{ width: '100%', height: 26, fontSize: 12, textAlign: 'center', outline: 'none' }}
            />
          );
        }
        return <span style={{ fontWeight: row.isTotal ? 700 : 400 }}>{row.qty}</span>;
      },
    },
    {
      header: 'QUỸ LƯƠNG (Đ)',
      width: 95,
      align: 'right',
      render: (row) => <span style={{ fontWeight: 700 }}>{row.fund.toLocaleString('vi-VN')}</span>,
    },
  ];

  // ── STEP 2: CONTENT PILLARS & AD PLANS DATA (FROM DB / USER) ──────────────
  const contentPlanIds = useMemo(() => {
    return Array.from(
      new Set([
        ...customContentPlanIds,
        ...Object.keys(editedContentPlan).filter((k) => k !== 'cp_1' && k !== 'cp_2'),
      ])
    );
  }, [customContentPlanIds, editedContentPlan]);

  const contentPlanList = useMemo(() => {
    return contentPlanIds.map((id) => {
      const ed = editedContentPlan[id] || {};
      return {
        id,
        pillar: ed.pillar || 'Tuyến nội dung mới',
        purpose: ed.purpose || '',
        role: ed.role || '',
        details: ed.details || '',
        budget: Number(ed.budget) || 0,
        postsCount: Number(ed.postsCount) || 0,
        ratioStr: ed.ratioStr || '0',
      };
    });
  }, [contentPlanIds, editedContentPlan]);

  const totalContentBudget = useMemo(() => contentPlanList.reduce((s, i) => s + (i.budget || 0), 0), [contentPlanList]);
  const totalContentPosts = useMemo(() => contentPlanList.reduce((s, i) => s + (i.postsCount || 0), 0), [contentPlanList]);

  const contentPlanRows = useMemo(() => {
    const list: ContentPlanItem[] = [
      { id: 'cp_sum', pillar: 'Tổng cộng', details: '', budget: totalContentBudget, postsCount: totalContentPosts, isTotal: true },
    ];
    let idx = 1;
    contentPlanList.forEach((parent) => {
      list.push({ ...parent, stt: String(idx++) });
      if (expandedParentIds.includes(parent.id)) {
        const { children } = parseParentDetails(parent.details || '');
        children.forEach((child) => {
          list.push({
            id: `${parent.id}_child_${child.id}`,
            parentId: parent.id,
            childId: child.id,
            pillar: child.pillar,
            purpose: '',
            role: '',
            details: child.details,
            budget: child.budget || 0,
            postsCount: 1,
            isChildRow: true,
            ratioStr: child.ratioStr,
          });
        });
      }
    });
    return list;
  }, [contentPlanList, expandedParentIds, totalContentBudget, totalContentPosts]);

  const contentPlanColumns: TableColumn<ContentPlanItem>[] = [
    {
      header: 'STT',
      width: 44,
      align: 'center',
      render: (row) => (row.isTotal ? '' : row.isChildRow ? '' : <span style={{ color: 'var(--muted-foreground)' }}>{row.stt}</span>),
    },
    {
      header: 'Tuyến nội dung',
      align: 'left',
      render: (row) => {
        const hasChildren = !row.isTotal && !row.isChildRow && (parseParentDetails(row.details || '').children || []).length > 0;
        return (
          <div style={{ paddingLeft: row.isChildRow ? 20 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasChildren && (
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-secondary"
                onClick={() => {
                  setExpandedParentIds((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]));
                }}
              >
                <i className={`bi ${expandedParentIds.includes(row.id) ? 'bi-chevron-down' : 'bi-chevron-right'}`} style={{ fontSize: 10 }} />
              </button>
            )}
            <span style={{ fontWeight: row.isTotal || !row.isChildRow ? 700 : 400, color: row.isChildRow ? 'var(--muted-foreground)' : 'inherit' }}>
              {row.pillar}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Mục tiêu & Vai trò',
      align: 'left',
      render: (row) => {
        if (row.isTotal || row.isChildRow) return null;
        if (!row.purpose && !row.role) return <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>—</span>;
        return (
          <div className="space-y-1.5 py-0.5 text-xs leading-relaxed">
            {row.purpose && (
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">Mục tiêu: </span>
                <span className="text-muted-foreground">{row.purpose}</span>
              </div>
            )}
            {row.role && (
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">Vai trò: </span>
                <span className="text-muted-foreground">{row.role}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Nội dung chi tiết',
      align: 'left',
      render: (row) => {
        if (row.isTotal) return null;
        const rawDesc = parseParentDetails(row.details || '').description || row.details || '';
        return renderContentDetails(rawDesc);
      },
    },
    {
      header: 'Ngân sách (đ)',
      width: 120,
      align: 'right',
      render: (row) => <span style={{ fontWeight: 700 }}>{row.budget.toLocaleString('vi-VN')} đ</span>,
    },
    {
      header: 'Số bài',
      width: 60,
      align: 'center',
      render: (row) => <span>{row.postsCount}</span>,
    },
    {
      header: 'Thao tác',
      width: 70,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return null;
        return (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            <button
              className="btn btn-sm btn-link p-0 text-primary"
              title="Chỉnh sửa"
              onClick={() => {
                setEditingContentPlanId(row.id);
                setOffcanvasData({
                  pillar: row.pillar,
                  purpose: row.purpose || '',
                  role: row.role || '',
                  details: row.details,
                  budget: row.budget,
                  ratioStr: '0',
                  postsCount: row.postsCount,
                });
                setShowAddOffcanvas(true);
              }}
            >
              <PencilSquare size={13} />
            </button>
            <button
              className="btn btn-sm btn-link p-0 text-danger"
              title="Xóa"
              onClick={() => {
                setCustomContentPlanIds((prev) => prev.filter((id) => id !== row.id));
                setEditedContentPlan((prev) => {
                  const copy = { ...prev };
                  delete copy[row.id];
                  return copy;
                });
                toast.info('Đã xóa', 'Đã xóa tuyến nội dung.');
              }}
            >
              <Trash size={13} />
            </button>
          </div>
        );
      },
    },
  ];

  // Ad Plans data (from DB / User)
  const allAdPlanIds = useMemo(() => {
    return Array.from(
      new Set([
        ...customAdPlanIds,
        ...Object.keys(editedAdPlan).filter((k) => k !== 'ad_1' && k !== 'ad_2'),
      ])
    );
  }, [customAdPlanIds, editedAdPlan]);

  const adPlanList = useMemo(() => {
    return allAdPlanIds.map((id) => {
      const ed = editedAdPlan[id] || {};
      let childrenBudget = 0;
      const childrenChannels: string[] = [];
      const childrenContent: string[] = [];
      const childrenLandingPages: string[] = [];

      if (ed.details) {
        try {
          const parsed = JSON.parse(ed.details);
          if (Array.isArray(parsed.children)) {
            parsed.children.forEach((c: any) => {
              if (c.budget) childrenBudget += Number(c.budget) || 0;
              if (c.pillar) childrenChannels.push(c.pillar);
              else if (c.channel) childrenChannels.push(c.channel);
              if (c.details) childrenContent.push(c.details);
              if (c.landingPage) childrenLandingPages.push(c.landingPage);
            });
          }
        } catch {}
      }

      const finalBudget = ed.budget > 0 ? Number(ed.budget) : childrenBudget;
      const finalChannel = ed.channel || (childrenChannels.length ? Array.from(new Set(childrenChannels)).join(', ') : 'Đa kênh');
      const finalContent = ed.content || (childrenContent.length ? childrenContent.join('\n') : '');
      const finalLandingPage = ed.landingPage || (childrenLandingPages.length ? childrenLandingPages.join('\n') : '');

      return {
        id,
        objective: ed.objective || 'Mục tiêu mới',
        topic: ed.topic || '',
        channel: finalChannel,
        content: finalContent,
        landingPage: finalLandingPage,
        budget: finalBudget,
        region: ed.region || 'Toàn quốc',
        assignee: ed.assignee || 'Nguyễn Thu Huyền',
        startDate: ed.startDate || '2026-01-01',
        endDate: ed.endDate || '2026-12-31',
        audience: ed.audience || '',
        details: ed.details || '',
      };
    });
  }, [allAdPlanIds, editedAdPlan]);

  const totalAdBudget = useMemo(() => adPlanList.reduce((s, i) => s + (i.budget || 0), 0), [adPlanList]);

  const adPlanRows: AdPlanItem[] = useMemo(() => [
    {
      id: 'ad_sum',
      objective: 'Tổng cộng',
      topic: '',
      channel: '',
      content: '',
      budget: totalAdBudget,
      region: '',
      assignee: '',
      startDate: '',
      endDate: '',
      audience: '',
      isTotal: true,
    },
    ...adPlanList.map((item, idx) => ({ ...item, stt: String(idx + 1) })),
  ], [adPlanList, totalAdBudget]);

  const adPlanColumns: TableColumn<AdPlanItem>[] = [
    {
      header: 'STT',
      width: 44,
      align: 'center',
      render: (row) => (row.isTotal ? '' : <span className="text-muted-foreground font-medium text-xs">{row.stt}</span>),
    },
    {
      header: 'Mục tiêu quảng cáo',
      align: 'left',
      width: 220,
      render: (row) => {
        if (row.isTotal) return <span className="font-bold text-slate-900 dark:text-white">{row.objective}</span>;
        return (
          <div className="space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-xs tracking-tight uppercase leading-snug">
              {row.objective}
            </div>
            {row.region && (
              <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                <i className="bi bi-geo-alt text-[10px]" />
                <span>{row.region}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Chủ đề',
      align: 'left',
      width: 170,
      render: (row) => (row.isTotal ? null : <span className="text-xs text-slate-700 dark:text-slate-200 leading-snug">{row.topic || '—'}</span>),
    },
    {
      header: 'Kênh chạy',
      align: 'left',
      width: 200,
      render: (row) => {
        if (row.isTotal) return null;
        const channels = (row.channel || '')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);
        if (channels.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {channels.map((ch, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60"
              >
                {ch}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Nội dung thông điệp',
      align: 'left',
      render: (row) => {
        if (row.isTotal) return null;
        if (!row.content && !row.landingPage) return <span className="text-xs text-muted-foreground">—</span>;
        const lines = (row.content || '')
          .split(/\n|(?<=[^-\s])\s*-\s+/)
          .map((l) => l.replace(/^-\s*/, '').trim())
          .filter(Boolean);

        return (
          <div className="space-y-1.5 py-0.5 text-xs text-muted-foreground">
            {lines.map((line, i) => (
              <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                <span className="flex-1">{line}</span>
              </div>
            ))}
            {row.landingPage && (
              <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 truncate flex items-center gap-1">
                <i className="bi bi-link-45deg text-xs" />
                <span className="truncate">{row.landingPage.split('\n')[0]}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Ngân sách (đ)',
      width: 120,
      align: 'right',
      render: (row) => (
        <span className={`text-xs ${row.isTotal ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-100'}`}>
          {row.budget.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Người phụ trách',
      width: 130,
      align: 'left',
      render: (row) => {
        if (row.isTotal) return null;
        const name = row.assignee || 'Nguyễn Thu Huyền';
        const initial = name.charAt(0);
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
              {initial}
            </div>
            <span className="truncate">{name}</span>
          </div>
        );
      },
    },
    {
      header: 'Thao tác',
      width: 70,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return null;
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-sm btn-link p-0 text-primary"
              title="Chỉnh sửa"
              onClick={() => {
                setEditingAdPlanId(row.id);
                setAdOffcanvasData({
                  objective: row.objective || '',
                  topic: row.topic || '',
                  channel: row.channel || 'Facebook Ads',
                  content: row.content || '',
                  landingPage: row.landingPage || '',
                  budget: row.budget || 0,
                  region: row.region || 'Toàn quốc',
                  assignee: row.assignee || 'Nguyễn Thu Huyền',
                  startDate: row.startDate || '2026-01-01',
                  endDate: row.endDate || '2026-12-31',
                  audience: row.audience || '',
                });
                setShowAdOffcanvas(true);
              }}
            >
              <PencilSquare size={13} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-link p-0 text-danger"
              title="Xóa"
              onClick={() => {
                setCustomAdPlanIds((prev) => prev.filter((id) => id !== row.id));
                setEditedAdPlan((prev) => {
                  const copy = { ...prev };
                  delete copy[row.id];
                  return copy;
                });
                toast.info('Đã xóa', 'Đã xóa mục tiêu quảng cáo.');
              }}
            >
              <Trash size={13} />
            </button>
          </div>
        );
      },
    },
  ];

  // ── STEP 3: MONTHLY WORK MATRIX DATA ──────────────────────────────────────
  const monthStr = String(selectedMonth).padStart(2, '0');
  const lastDayOfMonth = new Date(parseInt(selectedYear, 10) || 2026, selectedMonth, 0).getDate();
  const lastDayStr = String(lastDayOfMonth).padStart(2, '0');

  const baseStep3Sections = [
    { id: 'section_theme', stt: '1', category: 'Chủ đề tháng', name: 'CHỦ ĐỀ THÁNG', type: 'theme_header' },
    { id: 'theme_holiday', stt: '', category: 'Chủ đề tháng', name: 'NGÀY LỄ', type: 'theme', showPlus: true },
    { id: 'theme_content', stt: '', category: 'Chủ đề tháng', name: 'NỘI DUNG', type: 'theme', showPlus: true },
    { id: 'theme_product', stt: '', category: 'Chủ đề tháng', name: 'SẢN PHẨM', type: 'theme', showPlus: false },
    { id: 'section_content', stt: '2', category: 'Content', name: 'CONTENT', type: 'section_header', colorTheme: 'red' },
    { id: 'section_media', stt: '3', category: 'Media', name: 'MEDIA', type: 'section_header', colorTheme: 'blue' },
    { id: 'section_design', stt: '4', category: 'Design', name: 'DESIGN', type: 'section_header', colorTheme: 'blue' },
    { id: 'section_seo', stt: '5', category: 'SEO', name: 'SEO', type: 'section_header', colorTheme: 'blue' },
    { id: 'section_adv', stt: '6', category: 'Quảng cáo', name: 'QUẢNG CÁO', type: 'section_header', colorTheme: 'blue' },
    { id: 'section_pos', stt: '7', category: 'Điểm bán', name: 'ĐIỂM BÁN', type: 'section_header', colorTheme: 'blue' },
  ];

  const monthlyWorkRows = useMemo(() => {
    const list: any[] = [];
    baseStep3Sections.forEach((row) => {
      if (isThemeCollapsed && row.type === 'theme') return;
      list.push(row);
      if (row.type === 'section_header') {
        const isCollapsed = collapsedSections.includes(row.id);
        if (!isCollapsed) {
          const sectionKey = `${row.id}_${selectedMonth}`;
          const items = sectionContentItems[sectionKey] || [];
          items.forEach((item) => {
            list.push({
              id: `${row.id}_item_${item.id}`,
              parentId: row.id,
              stt: '',
              name: item.topic || item.pillar || 'Nội dung',
              type: 'section_item',
              colorTheme: row.colorTheme,
              item,
            });
          });
        }
      }
    });
    return list;
  }, [isThemeCollapsed, collapsedSections, selectedMonth, sectionContentItems]);

  const toggleTaskWeek = (sectionId: string, itemId: string, weekNum: number) => {
    const key = `${sectionId}_${selectedMonth}`;
    setSectionContentItems((prev) => {
      const items = [...(prev[key] || [])];
      const target = items.find((i) => i.id === itemId);
      if (target) {
        const weeks = target.weeks || [];
        target.weeks = weeks.includes(weekNum) ? weeks.filter((w: number) => w !== weekNum) : [...weeks, weekNum].sort();
      }
      return { ...prev, [key]: items };
    });
  };

  const monthlyWorkColumns: TableColumn<any>[] = [
    {
      header: 'STT',
      width: 44,
      align: 'center',
      render: (row) => {
        if (row.id === 'section_theme' || row.type === 'section_header') {
          const isTheme = row.id === 'section_theme';
          const isCollapsed = isTheme ? isThemeCollapsed : collapsedSections.includes(row.id);
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-slate-200/80 font-bold text-xs transition-colors gap-0.5 cursor-pointer"
              style={{ color: row.colorTheme === 'red' ? '#dc2626' : '#2563eb' }}
              onClick={() => {
                if (isTheme) setIsThemeCollapsed(!isThemeCollapsed);
                else setCollapsedSections((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]));
              }}
              title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              <span>{row.stt}</span>
              <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-[9px]`} />
            </button>
          );
        }
        return null;
      },
    },
    {
      header: 'Danh mục',
      width: 120,
      align: 'left',
      render: (row) => {
        if (row.type === 'theme_header' || row.type === 'section_header') {
          const isRed = row.colorTheme === 'red';
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider ${
                isRed
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
              }`}
            >
              {row.name}
            </span>
          );
        }
        if (row.type === 'theme') {
          return (
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {row.name}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/50">
            {row.item?.pillar || ''}
          </span>
        );
      },
    },
    {
      header: 'Hạng mục / Nội dung',
      align: 'left',
      colSpan: (row) => (row.id === 'theme_holiday' || row.id === 'theme_content' ? 7 : 1),
      render: (row) => {
        if (row.type === 'theme_header' || row.type === 'section_header') return null;
        if (row.id === 'theme_holiday') {
          const allHolidays = [...(HOLIDAYS_LIST_BY_MONTH[selectedMonth] || []), ...(customHolidays.filter((h) => h.month === selectedMonth) || [])];
          return (
            <div className="flex items-center gap-2 flex-wrap">
              {allHolidays.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Không có ngày lễ trong tháng</span>
              ) : (
                allHolidays.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60 whitespace-nowrap shadow-2xs"
                  >
                    <i className="bi bi-calendar-event text-[11px] text-rose-500" />
                    <span className="font-bold">{h.dateStr}:</span> {h.name}
                  </span>
                ))
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-dashed border-indigo-300 cursor-pointer whitespace-nowrap"
                onClick={() => setShowHolidayModal(true)}
                title="Thêm ngày lễ"
              >
                <PlusLg size={10} />
                <span>Thêm</span>
              </button>
            </div>
          );
        }
        if (row.id === 'theme_content') {
          const currentTheme = monthlyThemes.find((t) => t.month === selectedMonth);
          const topicText = currentTheme ? currentTheme.topic : (monthlyThemeTopic || 'Chưa thiết lập chủ đề tháng');
          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50/70 text-indigo-900 border border-indigo-200/60">
                <i className="bi bi-lightbulb-fill text-amber-500 text-xs" />
                <span>{topicText}</span>
              </span>
              <button
                type="button"
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                onClick={() => setShowThemeModal(true)}
                title="Sửa chủ đề"
              >
                <PencilSquare size={13} />
              </button>
            </div>
          );
        }
        if (row.id === 'theme_product') {
          return (
            <div className="flex items-center gap-2 py-0.5">
              <i className="bi bi-box-seam text-indigo-600 text-xs shrink-0" />
              <span className="font-semibold text-slate-700 text-xs">
                Sản phẩm & thiết bị trọng tâm đẩy mạnh theo tuần
              </span>
            </div>
          );
        }
        return <span className="font-medium text-slate-800 text-[12.5px] leading-snug">{row.name}</span>;
      },
    },
    {
      header: `T1 (01-07/${monthStr})`,
      width: 95,
      align: 'center',
      render: (row) => {
        if (row.id === 'theme_product') {
          const monthProducts = monthlyProducts[selectedMonth] || {};
          const weekList = monthProducts[1] || [];
          return (
            <WeekProductSelectDropdown
              weekNum={1}
              month={selectedMonth}
              selectedList={weekList}
              allCategories={productCategories}
              onChange={(newList) => {
                setMonthlyProducts((prev) => {
                  const mData = prev[selectedMonth] || {};
                  return { ...prev, [selectedMonth]: { ...mData, 1: newList } };
                });
              }}
            />
          );
        }
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(1);
        return (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-8 h-6 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
              active
                ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 border border-slate-200/60'
            }`}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 1)}
            title={`Tuần 1: ${active ? 'Đang kích hoạt' : 'Chưa kích hoạt'}`}
          >
            T1
          </button>
        );
      },
    },
    {
      header: `T2 (08-14/${monthStr})`,
      width: 95,
      align: 'center',
      render: (row) => {
        if (row.id === 'theme_product') {
          const monthProducts = monthlyProducts[selectedMonth] || {};
          const weekList = monthProducts[2] || [];
          return (
            <WeekProductSelectDropdown
              weekNum={2}
              month={selectedMonth}
              selectedList={weekList}
              allCategories={productCategories}
              onChange={(newList) => {
                setMonthlyProducts((prev) => {
                  const mData = prev[selectedMonth] || {};
                  return { ...prev, [selectedMonth]: { ...mData, 2: newList } };
                });
              }}
            />
          );
        }
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(2);
        return (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-8 h-6 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
              active
                ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 border border-slate-200/60'
            }`}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 2)}
            title={`Tuần 2: ${active ? 'Đang kích hoạt' : 'Chưa kích hoạt'}`}
          >
            T2
          </button>
        );
      },
    },
    {
      header: `T3 (15-21/${monthStr})`,
      width: 95,
      align: 'center',
      render: (row) => {
        if (row.id === 'theme_product') {
          const monthProducts = monthlyProducts[selectedMonth] || {};
          const weekList = monthProducts[3] || [];
          return (
            <WeekProductSelectDropdown
              weekNum={3}
              month={selectedMonth}
              selectedList={weekList}
              allCategories={productCategories}
              onChange={(newList) => {
                setMonthlyProducts((prev) => {
                  const mData = prev[selectedMonth] || {};
                  return { ...prev, [selectedMonth]: { ...mData, 3: newList } };
                });
              }}
            />
          );
        }
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(3);
        return (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-8 h-6 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
              active
                ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 border border-slate-200/60'
            }`}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 3)}
            title={`Tuần 3: ${active ? 'Đang kích hoạt' : 'Chưa kích hoạt'}`}
          >
            T3
          </button>
        );
      },
    },
    {
      header: `T4 (22-${lastDayStr}/${monthStr})`,
      width: 95,
      align: 'center',
      render: (row) => {
        if (row.id === 'theme_product') {
          const monthProducts = monthlyProducts[selectedMonth] || {};
          const weekList = monthProducts[4] || [];
          return (
            <WeekProductSelectDropdown
              weekNum={4}
              month={selectedMonth}
              selectedList={weekList}
              allCategories={productCategories}
              onChange={(newList) => {
                setMonthlyProducts((prev) => {
                  const mData = prev[selectedMonth] || {};
                  return { ...prev, [selectedMonth]: { ...mData, 4: newList } };
                });
              }}
            />
          );
        }
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(4);
        return (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-8 h-6 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
              active
                ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 border border-slate-200/60'
            }`}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 4)}
            title={`Tuần 4: ${active ? 'Đang kích hoạt' : 'Chưa kích hoạt'}`}
          >
            T4
          </button>
        );
      },
    },
    {
      header: 'Người phụ trách',
      width: 140,
      align: 'left',
      render: (row) => {
        if (row.type !== 'section_item') return null;
        const name = row.item.assignee || 'Chu Thị Hằng';
        const initial = name.trim().charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-200/60 shrink-0">
              {initial}
            </span>
            <span className="text-xs text-slate-700 font-medium truncate">{name}</span>
          </div>
        );
      },
    },
    {
      header: 'Thao tác',
      width: 70,
      align: 'center',
      render: (row) => {
        if (row.type === 'section_header') {
          return (
            <button
              type="button"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              title="Thêm nhiệm vụ mới"
              onClick={() => {
                setTaskOffcanvasSection(row.id);
                setEditingTaskItemId(null);
                setTaskPillar('Sản phẩm');
                setTaskTopic('');
                setTaskWeeks([1, 2]);
                setTaskAssignee('Nguyễn Thu Huyền');
                setShowTaskOffcanvas(true);
              }}
            >
              <PlusLg size={11} />
              <span>Thêm</span>
            </button>
          );
        }
        if (row.type === 'section_item') {
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Chỉnh sửa"
                onClick={() => {
                  setTaskOffcanvasSection(row.parentId);
                  setEditingTaskItemId(row.item.id);
                  setTaskPillar(row.item.pillar || '');
                  setTaskTopic(row.item.topic || '');
                  setTaskWeeks(row.item.weeks || []);
                  setTaskAssignee(row.item.assignee || 'Nguyễn Thu Huyền');
                  setShowTaskOffcanvas(true);
                }}
              >
                <PencilSquare size={13} />
              </button>
              <button
                type="button"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Xóa hoạt động"
                onClick={() => {
                  const key = `${row.parentId}_${selectedMonth}`;
                  setSectionContentItems((prev) => ({
                    ...prev,
                    [key]: (prev[key] || []).filter((i) => i.id !== row.item.id),
                  }));
                  toast.info('Đã xóa', 'Đã xóa hoạt động.');
                }}
              >
                <Trash size={13} />
              </button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  // ── STEP 4: BUDGET ALLOCATION DATA ────────────────────────────────────────
  const totalAllocatedBudgets = Object.values(monthlyBudgets).reduce((sum, v) => sum + (v || 0), 0);

  const handleMonthlyCategoryBudgetChange = (catId: string, val: number) => {
    setMonthlyAllocations((prev) => {
      const currentMonthAlloc = prev[selectedMonth] || {};
      const currentItem = currentMonthAlloc[catId] || { budget: 0, note: '' };
      const updatedMonthAlloc = { ...currentMonthAlloc, [catId]: { ...currentItem, budget: val } };

      const monthSum = BUDGET_CATEGORIES.reduce((s, cat) => s + ((updatedMonthAlloc[cat.id] || {}).budget || 0), 0);
      setMonthlyBudgets((bPrev) => ({ ...bPrev, [selectedMonth]: monthSum }));

      return { ...prev, [selectedMonth]: updatedMonthAlloc };
    });
  };

  const handleMonthlyCategoryNoteChange = (catId: string, note: string) => {
    setMonthlyAllocations((prev) => {
      const currentMonthAlloc = prev[selectedMonth] || {};
      const currentItem = currentMonthAlloc[catId] || { budget: 0, note: '' };
      return { ...prev, [selectedMonth]: { ...currentMonthAlloc, [catId]: { ...currentItem, note } } };
    });
  };

  // ── SAVE AND APPROVAL ACTIONS ─────────────────────────────────────────────
  const handleSaveToDB = async (statusOverride?: string): Promise<boolean> => {
    try {
      const updatedPlanData = {
        ...(masterPlanData || {}),
        revenueAgent: String(valAgent),
        revenueAgentDev: String(valAgentDev),
        revenueTraditional: String(valTraditional),
        revenueEcommerce: String(valEcommerce),
        costMarketing: String(valMarketingCost),
        costMarketingPercent: totalRevenue > 0 ? ((valMarketingCost / totalRevenue) * 100).toFixed(1) : '2.6',
        c_mkt_ads: String(valBranding),
        mkt_brandingCost: brandingCost,
        mkt_travelCost: travelCost,
        mkt_editedStaff: editedStaff,
        mkt_customStaffIds: customStaffIds,
        mkt_deletedBaseStaffIds: deletedBaseStaffIds,
        mkt_editedContentPlan: editedContentPlan,
        mkt_customContentPlanIds: customContentPlanIds,
        mkt_editedAdPlan: editedAdPlan,
        mkt_customAdPlanIds: customAdPlanIds,
        mkt_monthlyThemes: monthlyThemes,
        mkt_monthlyThemeTopic: monthlyThemeTopic,
        mkt_monthlyThemeContent: monthlyThemeContent,
        mkt_customHolidays: customHolidays,
        mkt_sectionContentItems: sectionContentItems,
        mkt_monthlyProducts: monthlyProducts,
        mkt_monthlyBudgets: monthlyBudgets,
        mkt_monthlyAllocations: monthlyAllocations,
        mkt_agencyPOSBudget: agencyPOSBudget,
        mkt_agencyAdsBudget: agencyAdsBudget,
        mkt_agencyGiftBudget: agencyGiftBudget,
        mkt_advFbAds: advFbAds,
        mkt_advGoogleAds: advGoogleAds,
        mkt_advYoutubeAds: advYoutubeAds,
        mkt_advTiktokAds: advTiktokAds,
        mkt_advSeoPr: advSeoPr,
        mkt_advPrintOutsource: advPrintOutsource,
        mkt_advMediaModelDecor: advMediaModelDecor,
        mkt_advWebDesign: advWebDesign,
        mkt_advOther: advOther,
        mkt_advReserve: advReserve,
      };

      const res = await fetch('/api/plan-finance/master-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(selectedYear, 10),
          planData: JSON.stringify(updatedPlanData),
          status: statusOverride || planStatus,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMasterPlanData(updatedPlanData);
          setIsEditing(false);
          setSelectedStaffIds([]);
          if (!statusOverride) toast.success('Thành công', `Đã lưu dữ liệu kế hoạch năm ${selectedYear} vào Database thành công!`);
          return true;
        }
      }
      toast.error('Lỗi', 'Không thể lưu dữ liệu kế hoạch vào cơ sở dữ liệu');
      return false;
    } catch (err) {
      console.error(err);
      toast.error('Lỗi', 'Lỗi kết nối cơ sở dữ liệu');
      return false;
    }
  };

  const handleSubmitPlan = async () => {
    if (isSubmittingPlan) return;
    setIsSubmittingPlan(true);
    try {
      await handleSaveToDB('pending_approval');
      const res = await fetch('/api/plan-finance/master-plan/submit-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(selectedYear, 10) }),
      });
      if (res.ok) {
        setPlanStatus('pending_approval');
        toast.info('Trình duyệt thành công', 'Kế hoạch đã được trình duyệt tới Ban Giám đốc & Phòng Tài chính.');
      } else {
        toast.error('Lỗi', 'Không thể gửi trình duyệt kế hoạch.');
      }
    } catch {
      toast.error('Lỗi', 'Lỗi mạng khi trình duyệt.');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleApprovePlan = async () => {
    try {
      const res = await fetch(`/api/plan-finance/master-plan/${selectedYear}/approve`, { method: 'POST' });
      if (res.ok) {
        setPlanStatus('approved');
        toast.success('Phê duyệt', 'Kế hoạch Marketing đã được phê duyệt thành công!');
      }
    } catch {
      toast.error('Lỗi', 'Lỗi khi phê duyệt.');
    }
  };

  const handleRejectPlan = async () => {
    try {
      const res = await fetch(`/api/plan-finance/master-plan/${selectedYear}/reject`, { method: 'POST' });
      if (res.ok) {
        setPlanStatus('draft');
        toast.info('Từ chối', 'Đã chuyển trạng thái kế hoạch về bản thảo.');
      }
    } catch {
      toast.error('Lỗi', 'Lỗi khi từ chối.');
    }
  };

  // Stepper definition
  const steps: ModernStepItem[] = [
    { num: 1, id: 'step1', title: 'Mục tiêu năm', desc: 'Xác định mục tiêu & đối tượng', icon: <CalendarCheck size={14} /> },
    { num: 2, id: 'step2', title: 'Kế hoạch năm', desc: 'Tính toán chi phí & kênh chạy', icon: <CashCoin size={14} /> },
    { num: 3, id: 'step3', title: 'Kế hoạch tháng', desc: 'Chi tiết kế hoạch từng tháng', icon: <Calendar3 size={14} /> },
    { num: 4, id: 'step4', title: 'Ngân sách tháng', desc: 'Phân bổ ngân sách theo tháng', icon: <Shop size={14} /> },
  ];

  const stepperExtraRight = (
    <div className="flex items-center gap-2">
      <Badge
        variant={planStatus === 'approved' ? 'success' : planStatus === 'pending_approval' ? 'warning' : 'neutral'}
        hasDot
      >
        {planStatus === 'approved' ? 'Đã phê duyệt' : planStatus === 'pending_approval' ? 'Chờ duyệt' : 'Bản thảo'}
      </Badge>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col min-h-0" style={{ height: '100%' }}>
      <StepPage
        title="Lập kế hoạch"
        description="Quy trình lập kế hoạch tiếp thị và phát triển thị trường"
        badge="MARKETING"
        icon="bi-calendar-range"
        color="indigo"
        hideTicker={true}
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        stepperExtraRight={stepperExtraRight}
      >
        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 1: MỤC TIÊU NĂM (STEP 1)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="mkt-step1-grid">
            {/* Left Column (Fixed / Cố định, tự động điều chỉnh chiếm hết chiều cao khả dụng) */}
            <div className="mkt-step1-left">
              {/* Year, Date, Approval, Report */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-2 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Select
                      label="NĂM KẾ HOẠCH"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      options={[
                        { value: '2025', label: '2025' },
                        { value: '2026', label: '2026' },
                        { value: '2027', label: '2027' },
                      ]}
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      label="NGÀY LẬP"
                      value={planDate}
                      onChange={(e) => setPlanDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={isSubmittingPlan ? undefined : <SendFill size={11} />}
                    isLoading={isSubmittingPlan}
                    onClick={handleSubmitPlan}
                    disabled={isSubmittingPlan || planStatus === 'pending_approval'}
                    className="flex-1 h-8 shadow-xs"
                  >
                    Trình duyệt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FileEarmarkBarGraph size={12} />}
                    onClick={() => setShowPlanPrintModal(true)}
                    className="flex-1 h-8 bg-white shadow-xs"
                  >
                    Báo cáo
                  </Button>
                </div>
              </div>

              {/* Status Badges & Approval Actions */}
              {planStatus === 'pending_approval' && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shrink-0">
                  <Badge variant="warning" hasDot pulseDot>Đang chờ duyệt</Badge>
                  <div className="flex gap-1.5">
                    <Button variant="success" size="sm" icon={<Check size={14} />} onClick={handleApprovePlan} className="h-7 text-xs">
                      Phê duyệt
                    </Button>
                    <Button variant="danger" size="sm" icon={<X size={14} />} onClick={handleRejectPlan} className="h-7 text-xs">
                      Từ chối
                    </Button>
                  </div>
                </div>
              )}
              {planStatus === 'approved' && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 shrink-0">
                  <Badge variant="success" hasDot>Kế hoạch đã phê duyệt</Badge>
                  <span className="text-xs text-emerald-800 font-medium">Hiệu lực năm {selectedYear}.</span>
                </div>
              )}
              {planStatus === 'rejected' && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 shrink-0">
                  <Badge variant="danger" hasDot>Kế hoạch bị từ chối</Badge>
                  <span className="text-xs text-rose-800 font-medium">Vui lòng điều chỉnh lại.</span>
                </div>
              )}

              {/* Cost/Revenue Progress Card */}
              {(() => {
                const costRatio = getRatio(totalCostMarketing);
                const isOver = totalCostMarketing > valMarketingCost;
                return (
                  <div className="rounded-xl border border-slate-200/80 p-3 bg-white shadow-xs flex flex-col gap-2 shrink-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        TỶ LỆ CHI PHÍ / DOANH THU
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOver
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}
                      >
                        {isOver ? 'Vượt định mức' : 'Trong định mức'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {costRatio.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        trên tổng doanh thu
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                            : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                        }`}
                        style={{ width: `${Math.min(costRatio, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div>
                        Chi phí: <strong className="text-slate-800">{totalCostMarketing.toLocaleString('vi-VN')} đ</strong>
                      </div>
                      <div>
                        Định mức: <strong className="text-slate-800">{valMarketingCost.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Revenue Donut Chart Card (Fills remaining height) */}
              <div className="rounded-xl border border-slate-200/80 p-2.5 bg-white shadow-xs flex-1 min-h-0 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  Cơ cấu doanh thu năm {selectedYear}
                </span>
                <div className="flex-1 flex items-center justify-center min-h-0 py-1">
                  <RevenueDonutChart
                    totalRevenue={totalRevenue}
                    data={[
                      { label: 'Đại lý', value: valAgent, color: '#3b82f6' },
                      { label: 'Phát triển đại lý', value: valAgentDev, color: '#10b981' },
                      { label: 'Truyền thống', value: valTraditional, color: '#f59e0b' },
                      { label: 'Thương mại điện tử', value: valEcommerce, color: '#ec4899' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Right Column (2 Tabs: BẢNG CHỈ SỐ KẾ HOẠCH MARKETING & CHI TIẾT CHI PHÍ LƯƠNG THƯỞNG NHÂN SỰ) */}
            <div className="mkt-step1-right">
              {/* Tab Header Toolbar with uppercase titles */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 shrink-0 gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                      step1Tab === 'kpi'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setStep1Tab('kpi')}
                  >
                    Bảng chỉ số kế hoạch
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                      step1Tab === 'salary'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setStep1Tab('salary')}
                  >
                    Chi tiết chi phí
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {step1Tab === 'salary' && isEditing && (
                    <>
                      {selectedStaffIds.length > 0 && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash size={11} />}
                          onClick={() => {
                            setCustomStaffIds((prev) => prev.filter((id) => !selectedStaffIds.includes(id)));
                            setDeletedBaseStaffIds((prev) => [...prev, ...selectedStaffIds.filter((id) => id.startsWith('mkt_s'))]);
                            setSelectedStaffIds([]);
                            toast.info('Đã xóa', 'Đã xóa các vị trí đã chọn.');
                          }}
                          className="h-8 text-xs"
                        >
                          Xóa ({selectedStaffIds.length})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<PlusLg size={11} />}
                        onClick={() => {
                          const newId = `mkt_custom_${Date.now()}`;
                          setCustomStaffIds((prev) => [...prev, newId]);
                          setEditedStaff((prev) => ({
                            ...prev,
                            [newId]: { name: 'Vị trí mới', basic: 10000000, perf: 0, allowance: 0, qty: 1 },
                          }));
                        }}
                        className="h-8 text-xs bg-white"
                      >
                        Thêm vị trí
                      </Button>
                    </>
                  )}
                  <div style={{ width: 'auto' }}>
                    <Toggle
                      checked={isEditing}
                      onChange={(val) => {
                        setIsEditing(val);
                        if (!val) setSelectedStaffIds([]);
                      }}
                      label={<span className="text-xs font-bold uppercase text-slate-600">Chỉnh sửa</span>}
                    />
                  </div>
                  <Button
                    variant="success"
                    size="sm"
                    icon={<Floppy size={12} />}
                    disabled={!isEditing}
                    onClick={() => handleSaveToDB()}
                    className="h-8 text-xs shadow-xs"
                  >
                    Lưu vào DB
                  </Button>
                </div>
              </div>

              {/* Tab Contents: Each table takes full vertical height */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pt-1">
                {step1Tab === 'kpi' && (
                  <Table
                    rows={budgetRows}
                    columns={budgetColumns}
                    loading={loadingMasterPlan}
                    borderless={false}
                    striped={false}
                    compact={true}
                    fontSize={12}
                    rowKey={(row) => row.id}
                    rowStyle={(row) => ({
                      fontWeight: row.isTotal ? 700 : 400,
                      background: '#fff',
                    })}
                    cellStyle={() => ({ background: '#fff', padding: '8px 10px', verticalAlign: 'top' })}
                    wrapperStyle={{ background: '#fff', border: 'none', overflowX: 'auto' }}
                    wrapperClassName="mkt-plan-table-no-min"
                    minWidth={320}
                  />
                )}

                {step1Tab === 'salary' && (
                  <Table
                    rows={salaryRows}
                    columns={salaryColumns}
                    loading={loadingMasterPlan}
                    borderless={false}
                    striped={false}
                    compact={true}
                    fontSize={12}
                    rowKey={(row) => row.id}
                    rowStyle={(row) => ({
                      fontWeight: row.isTotal ? 700 : 400,
                      background: '#fff',
                    })}
                    cellStyle={() => ({ background: '#fff', padding: '8px 10px', verticalAlign: 'top' })}
                    wrapperStyle={{ background: '#fff', border: 'none', overflowX: 'auto' }}
                    wrapperClassName="mkt-plan-table-no-min"
                    minWidth={480}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 2: KẾ HOẠCH NĂM (STEP 2: CONTENT PILLARS & ADS)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      subStep === 'pillar'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setSubStep('pillar')}
                  >
                    Tuyến nội dung ({contentPlanList.length})
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      subStep === 'ads'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setSubStep('ads')}
                  >
                    Kế hoạch quảng cáo ({adPlanList.length})
                  </button>
                </div>
                <Badge variant="brand" className="text-xs">
                  Ngân sách phân bổ: {valBranding.toLocaleString('vi-VN')} đ
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {subStep === 'pillar' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<PlusLg size={11} />}
                    onClick={() => {
                      setEditingContentPlanId(null);
                      setOffcanvasData({
                        pillar: '',
                        purpose: '',
                        role: '',
                        details: '',
                        budget: 10000000,
                        ratioStr: '0.77',
                        postsCount: 5,
                      });
                      setShowAddOffcanvas(true);
                    }}
                    className="h-8 shadow-xs"
                  >
                    Thêm tuyến nội dung
                  </Button>
                )}
                {subStep === 'ads' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<PlusLg size={11} />}
                    onClick={() => {
                      setEditingAdPlanId(null);
                      setAdOffcanvasData({
                        objective: '',
                        topic: '',
                        channel: 'Facebook Ads',
                        content: '',
                        landingPage: '',
                        budget: 10000000,
                        region: 'Toàn quốc',
                        assignee: 'Nguyễn Thu Huyền',
                        startDate: '2026-07-01',
                        endDate: '2026-12-31',
                        audience: '',
                      });
                      setShowAdOffcanvas(true);
                    }}
                    className="h-8 shadow-xs"
                  >
                    Thêm mục tiêu quảng cáo
                  </Button>
                )}
                <Button
                  variant="success"
                  size="sm"
                  icon={<Floppy size={12} />}
                  onClick={() => handleSaveToDB()}
                  className="h-8 px-2.5 shadow-xs"
                  title="Lưu thay đổi"
                >
                  Lưu
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
              {subStep === 'pillar' ? (
                <Table
                  rows={contentPlanRows}
                  columns={contentPlanColumns}
                  loading={loadingMasterPlan}
                  borderless={false}
                  striped={false}
                  compact={true}
                  fontSize={13}
                  rowKey={(row) => row.id}
                  rowStyle={(row) => ({
                    fontWeight: row.isTotal ? 700 : 400,
                    background: '#fff',
                  })}
                  cellStyle={() => ({ background: '#fff', padding: '8px 10px', verticalAlign: 'top' })}
                  wrapperClassName="mkt-plan-table-no-min"
                  wrapperStyle={{ background: '#fff', border: 'none' }}
                />
              ) : (
                <Table
                  rows={adPlanRows}
                  columns={adPlanColumns}
                  loading={loadingMasterPlan}
                  borderless={false}
                  striped={false}
                  compact={true}
                  fontSize={13}
                  rowKey={(row) => row.id}
                  rowStyle={(row) => ({
                    fontWeight: row.isTotal ? 700 : 400,
                    background: '#fff',
                  })}
                  cellStyle={() => ({ background: '#fff', padding: '8px 10px', verticalAlign: 'top' })}
                  wrapperClassName="mkt-plan-table-no-min"
                  wrapperStyle={{ background: '#fff', border: 'none' }}
                />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 3: KẾ HOẠCH THÁNG (STEP 3: MONTHLY WORK MATRIX)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            {/* Header with 12 Month Selector */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80 bg-slate-50/60 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <SectionTitle
                  title={`Kế hoạch hoạt động tháng ${selectedMonth} - Năm ${selectedYear}`}
                  className="mb-0 uppercase"
                  style={{ color: 'var(--primary)', fontSize: 13, letterSpacing: '0.02em', textTransform: 'uppercase' }}
                />
                {(() => {
                  const currentTheme = monthlyThemes.find((t) => t.month === selectedMonth);
                  const topic = currentTheme ? currentTheme.topic : monthlyThemeTopic;
                  if (!topic) return null;
                  return (
                    <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60 max-w-xs truncate">
                      <i className="bi bi-lightbulb-fill text-amber-500 text-[10px]" />
                      <span className="truncate">Chủ đề: {topic}</span>
                    </span>
                  );
                })()}
              </div>

              {/* 12-Month Selector Timeline */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5 border border-slate-200/60 shadow-2xs">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const isActive = m === selectedMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                      onClick={() => setSelectedMonth(m)}
                      title={`Tháng ${m}`}
                    >
                      T{m}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<PencilSquare size={12} />}
                  onClick={() => setShowThemeModal(true)}
                  className="h-8 bg-white shadow-xs text-xs font-medium"
                >
                  Chủ đề tháng
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  icon={<Floppy size={12} />}
                  onClick={() => handleSaveToDB()}
                  className="h-8 px-3 shadow-xs text-xs font-semibold"
                  title="Lưu lại"
                >
                  Lưu
                </Button>
              </div>
            </div>

            {/* Table Matrix */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
              <Table
                rows={monthlyWorkRows}
                columns={monthlyWorkColumns}
                loading={loadingMasterPlan}
                borderless={false}
                striped={false}
                compact={true}
                fontSize={12}
                rowKey={(row) => row.id}
                rowStyle={(row) => ({
                  fontWeight: row.type === 'section_header' || row.type === 'theme_header' ? 700 : 400,
                  background: row.type === 'section_header' || row.type === 'theme_header' ? '#f8fafc' : '#fff',
                })}
                cellStyle={() => ({ background: '#fff', padding: '8px 10px', verticalAlign: 'top' })}
                wrapperClassName="mkt-plan-table-no-min"
                wrapperStyle={{ background: '#fff', border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 4: NGÂN SÁCH THÁNG (STEP 4: MONTHLY BUDGET ALLOCATIONS)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="flex-1 flex overflow-hidden min-h-0 h-full w-full">
            <div className="mkt-step4-grid">
              {/* Left Column: Stats & Annual Category Settings */}
              <div className="mkt-step4-left">
                {/* Summary Card */}
                <div className="rounded-xl border border-slate-200/80 p-3 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100/60 shadow-xs shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-bold text-slate-600 uppercase text-[11px] tracking-wider mb-0 flex items-center gap-1.5">
                      <CashCoin className="text-indigo-600" size={13} />
                      TÓM TẮT NGÂN SÁCH NĂM {selectedYear}
                    </h6>
                    <Badge variant={valBranding - totalAllocatedBudgets < 0 ? 'danger' : 'success'}>
                      {valBranding - totalAllocatedBudgets < 0 ? 'Vượt hạn mức' : 'Cân đối'}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] text-slate-500 mb-0.5">Tổng ngân sách năm {selectedYear}</div>
                    <div className="text-xl font-extrabold text-indigo-700 leading-tight">
                      {valBranding.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const allocPct = valBranding > 0 ? (totalAllocatedBudgets / valBranding) * 100 : 0;
                    return (
                      <div className="my-2">
                        <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                          <span>Tiến độ phân bổ</span>
                          <span className="font-bold text-slate-700">{allocPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              allocPct > 100 ? 'bg-rose-500' : allocPct >= 95 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, allocPct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                    <div className="p-2 rounded-lg bg-white/70 border border-slate-200/60">
                      <div className="text-[10.5px] text-slate-500 mb-0.5 font-medium">Đã phân bổ</div>
                      <div className="text-xs font-bold text-slate-800">
                        {totalAllocatedBudgets.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/70 border border-slate-200/60">
                      <div className="text-[10.5px] text-slate-500 mb-0.5 font-medium">Còn lại</div>
                      <div
                        className={`text-xs font-bold ${
                          valBranding - totalAllocatedBudgets < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {(valBranding - totalAllocatedBudgets).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2 Tabs: Ngân sách đại lý vs Ngân sách quảng cáo */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg shrink-0">
                  <button
                    type="button"
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      step4BudgetTab === 'agency'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setStep4BudgetTab('agency')}
                  >
                    Đại lý (3)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      step4BudgetTab === 'adv'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setStep4BudgetTab('adv')}
                  >
                    Quảng cáo (10)
                  </button>
                </div>

                {/* Tab 1: Ngân sách cho đại lý */}
                {step4BudgetTab === 'agency' && (
                  <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Shop size={13} className="text-blue-600" />
                        Ngân sách cho đại lý
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700">
                        {(agencyPOSBudget + agencyAdsBudget + agencyGiftBudget).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-slate-200/70 shadow-2xs overflow-y-auto custom-scrollbar">
                      <BudgetInputRow label="Marketing tại điểm bán" value={agencyPOSBudget} onChange={setAgencyPOSBudget} valBranding={valBranding} />
                      <BudgetInputRow label="Quảng cáo bảng hiệu" value={agencyAdsBudget} onChange={setAgencyAdsBudget} valBranding={valBranding} />
                      <BudgetInputRow label="Quà tặng khai trương & sự kiện" value={agencyGiftBudget} onChange={setAgencyGiftBudget} valBranding={valBranding} />
                    </div>
                  </div>
                )}

                {/* Tab 2: Ngân sách cho quảng cáo */}
                {step4BudgetTab === 'adv' && (
                  <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Broadcast size={13} className="text-indigo-600" />
                        Ngân sách cho quảng cáo
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700">
                        {(
                          advFbAds +
                          advGoogleAds +
                          advYoutubeAds +
                          advTiktokAds +
                          advSeoPr +
                          advPrintOutsource +
                          advMediaModelDecor +
                          advWebDesign +
                          advOther +
                          advReserve
                        ).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-slate-200/70 shadow-2xs overflow-y-auto custom-scrollbar flex-1 min-h-0">
                      <BudgetInputRow label="Facebook Ads" value={advFbAds} onChange={setAdvFbAds} valBranding={valBranding} />
                      <BudgetInputRow label="Google Ads" value={advGoogleAds} onChange={setAdvGoogleAds} valBranding={valBranding} />
                      <BudgetInputRow label="Youtube Ads" value={advYoutubeAds} onChange={setAdvYoutubeAds} valBranding={valBranding} />
                      <BudgetInputRow label="TikTok Ads" value={advTiktokAds} onChange={setAdvTiktokAds} valBranding={valBranding} />
                      <BudgetInputRow label="SEO + PR báo chí" value={advSeoPr} onChange={setAdvSeoPr} valBranding={valBranding} />
                      <BudgetInputRow label="In ấn & Thiết kế ngoài" value={advPrintOutsource} onChange={setAdvPrintOutsource} valBranding={valBranding} />
                      <BudgetInputRow label="Media, Mẫu, Decor" value={advMediaModelDecor} onChange={setAdvMediaModelDecor} valBranding={valBranding} />
                      <BudgetInputRow label="Website & Công nghệ" value={advWebDesign} onChange={setAdvWebDesign} valBranding={valBranding} />
                      <BudgetInputRow label="Chi phí khác" value={advOther} onChange={setAdvOther} valBranding={valBranding} />
                      <BudgetInputRow label="Dự phòng ngân sách" value={advReserve} onChange={setAdvReserve} valBranding={valBranding} />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Month Allocations Table */}
              <div className="mkt-step4-right">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 shrink-0">
                  <SectionTitle
                    title={`Phân bổ ngân sách theo tháng - Năm ${selectedYear}`}
                    className="mb-0 uppercase"
                    style={{ color: 'var(--primary)', fontSize: 13, letterSpacing: '0.02em', textTransform: 'uppercase' }}
                  />
                  <div className="flex items-center gap-3">
                    <div style={{ width: 'auto' }}>
                      <Toggle
                        checked={isEditing}
                        onChange={setIsEditing}
                        label={<span className="text-[11px] font-bold uppercase text-slate-600">Chỉnh sửa</span>}
                      />
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      icon={<Floppy size={12} />}
                      onClick={() => handleSaveToDB()}
                      className="h-8 text-xs font-semibold px-3 shadow-xs"
                    >
                      Lưu lại
                    </Button>
                  </div>
                </div>

                {/* 12-Month Selector Timeline */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5 border border-slate-200/60 shadow-2xs shrink-0">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const isActive = m === selectedMonth;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMonth(m)}
                        title={`Tháng ${m}`}
                        className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        T{m}
                      </button>
                    );
                  })}
                </div>

                {/* Monthly Budget Summary Banner */}
                <div className="p-3 bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-slate-50 rounded-xl border border-indigo-100/80 flex items-center justify-between shadow-2xs shrink-0">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                      Tổng ngân sách dự kiến chi cho Tháng {selectedMonth}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Chiếm {valBranding > 0 ? (((monthlyBudgets[selectedMonth] || 0) / valBranding) * 100).toFixed(1) : 0}% tổng ngân sách cả năm
                    </div>
                  </div>
                  <div className="text-lg font-black text-indigo-700">
                    {(monthlyBudgets[selectedMonth] || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                {/* 13 Categories Monthly Table */}
                <div className="border border-slate-200/80 rounded-xl bg-white overflow-hidden shadow-2xs flex-1">
                  <table className="w-full" style={{ fontSize: 12, borderCollapse: 'collapse', tableLayout: 'auto' }}>
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                        <th className="py-2.5 px-3.5 text-start" style={{ width: '42%' }}>Khoản mục chi phí</th>
                        <th className="py-2.5 px-3.5 text-end" style={{ width: '22%', minWidth: 160 }}>Ngân sách Tháng {selectedMonth}</th>
                        <th className="py-2.5 px-3.5 text-start" style={{ width: '36%' }}>Ghi chú phân bổ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Section: Agency */}
                      <tr className="bg-blue-50/70 font-extrabold text-blue-900 border-b border-blue-100">
                        <td colSpan={3} className="py-2 px-3.5 text-[11.5px] uppercase tracking-wide">
                          1. Chi phí cho đại lý
                        </td>
                      </tr>
                      {BUDGET_CATEGORIES.slice(0, 3).map((cat) => {
                        const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0, note: '' };
                        return (
                          <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <i className={`bi ${cat.icon} text-xs`} style={{ color: cat.color }} />
                                <span>{cat.label}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3.5 text-end">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full text-end bg-white border border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs font-bold outline-none transition-colors"
                                  value={alloc.budget ? alloc.budget.toLocaleString('vi-VN') : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const raw = Number(e.target.value.replace(/\D/g, '')) || 0;
                                    handleMonthlyCategoryBudgetChange(cat.id, raw);
                                  }}
                                  style={{ height: 28 }}
                                />
                              ) : (
                                <span className="font-bold text-slate-900 text-xs">
                                  {alloc.budget ? `${alloc.budget.toLocaleString('vi-VN')} đ` : '0 đ'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3.5">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs outline-none transition-colors"
                                  value={alloc.note || ''}
                                  placeholder="Ghi chú chi tiết..."
                                  onChange={(e) => handleMonthlyCategoryNoteChange(cat.id, e.target.value)}
                                  style={{ height: 28 }}
                                />
                              ) : (
                                <span className="text-slate-500 text-xs">{alloc.note || '-'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Section: Advertising */}
                      <tr className="bg-blue-50/70 font-extrabold text-blue-900 border-b border-blue-100">
                        <td colSpan={3} className="py-2 px-3.5 text-[11.5px] uppercase tracking-wide">
                          2. Chi phí cho quảng cáo & tiếp thị
                        </td>
                      </tr>
                      {BUDGET_CATEGORIES.slice(3).map((cat) => {
                        const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0, note: '' };
                        return (
                          <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <i className={`bi ${cat.icon} text-xs`} style={{ color: cat.color }} />
                                <span>{cat.label}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3.5 text-end">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full text-end bg-white border border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs font-bold outline-none transition-colors"
                                  value={alloc.budget ? alloc.budget.toLocaleString('vi-VN') : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const raw = Number(e.target.value.replace(/\D/g, '')) || 0;
                                    handleMonthlyCategoryBudgetChange(cat.id, raw);
                                  }}
                                  style={{ height: 28 }}
                                />
                              ) : (
                                <span className="font-bold text-slate-900 text-xs">
                                  {alloc.budget ? `${alloc.budget.toLocaleString('vi-VN')} đ` : '0 đ'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3.5">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded px-2 py-1 text-xs outline-none transition-colors"
                                  value={alloc.note || ''}
                                  placeholder="Ghi chú chi tiết..."
                                  onChange={(e) => handleMonthlyCategoryNoteChange(cat.id, e.target.value)}
                                  style={{ height: 28 }}
                                />
                              ) : (
                                <span className="text-slate-500 text-xs">{alloc.note || '-'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </StepPage>

      {/* ── OFFCANVAS & MODALS ────────────────────────────────────────────── */}

      {/* 1. Add/Edit Content Pillar Offcanvas (Step 2) */}
      <Offcanvas
        isOpen={showAddOffcanvas}
        onClose={() => setShowAddOffcanvas(false)}
        title={editingContentPlanId ? 'Hiệu chỉnh tuyến nội dung' : 'Thêm tuyến nội dung mới'}
        width="400px"
        bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        bodyClassName="h-full flex flex-col p-4"
        footer={
          <div className="w-full flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddOffcanvas(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!offcanvasData.pillar.trim()) {
                  toast.error('Lỗi', 'Vui lòng nhập tên tuyến nội dung.');
                  return;
                }
                if (editingContentPlanId) {
                  setEditedContentPlan((prev) => ({
                    ...prev,
                    [editingContentPlanId]: {
                      ...(prev[editingContentPlanId] || {}),
                      ...offcanvasData,
                    },
                  }));
                } else {
                  const newId = `cp_custom_${Date.now()}`;
                  setCustomContentPlanIds((prev) => [...prev, newId]);
                  setEditedContentPlan((prev) => ({ ...prev, [newId]: offcanvasData }));
                }
                setShowAddOffcanvas(false);
                toast.success('Thành công', 'Đã cập nhật tuyến nội dung.');
              }}
            >
              Lưu tuyến nội dung
            </Button>
          </div>
        }
      >
        <div className="flex flex-col flex-1 h-full gap-3 text-xs">
          <Input
            label="Tuyến nội dung *"
            placeholder="VD: Nhận diện thương hiệu, Tuyển đại lý..."
            value={offcanvasData.pillar}
            onChange={(e) => setOffcanvasData({ ...offcanvasData, pillar: e.target.value })}
          />
          <Input
            label="Mục tiêu"
            placeholder="VD: Tạo khách hàng đại lý tiềm năng chất lượng..."
            value={offcanvasData.purpose}
            onChange={(e) => setOffcanvasData({ ...offcanvasData, purpose: e.target.value })}
          />
          <Input
            label="Vai trò"
            placeholder="VD: Thu hút, sàng lọc và nuôi dưỡng đối tác..."
            value={offcanvasData.role}
            onChange={(e) => setOffcanvasData({ ...offcanvasData, role: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Ngân sách (đ)"
              suffix="đ"
              value={offcanvasData.budget}
              onValueChange={(val) => setOffcanvasData({ ...offcanvasData, budget: val })}
            />
            <NumberInput
              label="Số lượng bài"
              suffix="bài"
              value={offcanvasData.postsCount}
              onValueChange={(val) => setOffcanvasData({ ...offcanvasData, postsCount: val })}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-[140px]">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nội dung chi tiết
            </label>
            <textarea
              className="w-full flex-1 min-h-[130px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              value={offcanvasData.details}
              placeholder="VD: Triển khai các nhóm: 1. Vấn đề đại lý: ... 2. Giải pháp Seajong: ..."
              onChange={(e) => setOffcanvasData({ ...offcanvasData, details: e.target.value })}
            />
          </div>
        </div>
      </Offcanvas>

      {/* 2. Add/Edit Ad Plan Offcanvas (Step 2) */}
      <Offcanvas
        isOpen={showAdOffcanvas}
        onClose={() => setShowAdOffcanvas(false)}
        title={editingAdPlanId ? 'Hiệu chỉnh mục tiêu quảng cáo' : 'Thêm mục tiêu quảng cáo mới'}
        width="400px"
        bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        bodyClassName="h-full flex flex-col p-4"
        footer={
          <div className="w-full flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdOffcanvas(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!adOffcanvasData.objective.trim()) {
                  toast.error('Lỗi', 'Vui lòng nhập mục tiêu chiến dịch.');
                  return;
                }
                if (editingAdPlanId) {
                  setEditedAdPlan((prev) => ({
                    ...prev,
                    [editingAdPlanId]: {
                      ...(prev[editingAdPlanId] || {}),
                      ...adOffcanvasData,
                    },
                  }));
                } else {
                  const newId = `ad_custom_${Date.now()}`;
                  setCustomAdPlanIds((prev) => [...prev, newId]);
                  setEditedAdPlan((prev) => ({ ...prev, [newId]: adOffcanvasData }));
                }
                setShowAdOffcanvas(false);
                toast.success('Thành công', 'Đã lưu mục tiêu quảng cáo.');
              }}
            >
              Lưu mục tiêu
            </Button>
          </div>
        }
      >
        <div className="flex flex-col flex-1 h-full gap-3 text-xs">
          <Input
            label="Mục tiêu chiến dịch *"
            placeholder="VD: Tìm kiếm đại lý, Nhận diện thương hiệu..."
            value={adOffcanvasData.objective}
            onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, objective: e.target.value })}
          />
          <Input
            label="Chủ đề quảng cáo"
            placeholder="VD: Chính sách chiết khấu 2026, Bộ sưu tập Sen phím đàn..."
            value={adOffcanvasData.topic}
            onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, topic: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Kênh triển khai
              </label>
              <select
                className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={adOffcanvasData.channel}
                onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, channel: e.target.value })}
              >
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="Youtube Ads">Youtube Ads</option>
                <option value="Quảng cáo Facebook, Quảng cáo Tiktok, Quảng cáo Youtube, Quảng cáo Google Ads">Đa kênh (FB, TikTok, YT, Google)</option>
              </select>
            </div>
            <NumberInput
              label="Ngân sách (đ)"
              suffix="đ"
              value={adOffcanvasData.budget}
              onValueChange={(val) => setAdOffcanvasData({ ...adOffcanvasData, budget: val })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Khu vực
              </label>
              <select
                className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={adOffcanvasData.region}
                onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, region: e.target.value })}
              >
                <option value="Toàn quốc">Toàn quốc</option>
                <option value="Miền Bắc">Miền Bắc</option>
                <option value="Miền Trung">Miền Trung</option>
                <option value="Miền Nam">Miền Nam</option>
                {VIETNAM_PROVINCES.slice(0, 15).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Người phụ trách"
              placeholder="VD: Nguyễn Thu Huyền"
              value={adOffcanvasData.assignee}
              onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, assignee: e.target.value })}
            />
          </div>
          <Input
            label="Trang đích"
            placeholder="VD: https://seajong.com/dai-ly-seajong/"
            value={adOffcanvasData.landingPage}
            onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, landingPage: e.target.value })}
          />
          <Input
            label="Đối tượng mục tiêu"
            placeholder="VD: Chủ cửa hàng VLXD, thầu thợ, đại lý điện nước..."
            value={adOffcanvasData.audience}
            onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, audience: e.target.value })}
          />
          <div className="flex-1 flex flex-col min-h-[120px]">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Thông điệp nội dung
            </label>
            <textarea
              className="w-full flex-1 min-h-[110px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              value={adOffcanvasData.content}
              placeholder="VD: - Video về thương hiệu Seajong&#10;- Bài viết về chính sách hỗ trợ đại lý..."
              onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, content: e.target.value })}
            />
          </div>
        </div>
      </Offcanvas>

      {/* 3. Task Offcanvas (Step 3: Content / Media / Design / Ads) */}
      <Offcanvas
        isOpen={showTaskOffcanvas}
        onClose={() => setShowTaskOffcanvas(false)}
        title={editingTaskItemId ? 'Hiệu chỉnh nhiệm vụ' : 'Thêm hoạt động marketing'}
        width="400px"
        bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        bodyClassName="h-full flex flex-col p-4"
        footer={
          <div className="w-full flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTaskOffcanvas(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const key = `${taskOffcanvasSection}_${selectedMonth}`;
                setSectionContentItems((prev) => {
                  const list = [...(prev[key] || [])];
                  if (editingTaskItemId) {
                    const idx = list.findIndex((i) => i.id === editingTaskItemId);
                    if (idx >= 0) {
                      list[idx] = { ...list[idx], pillar: taskPillar, topic: taskTopic, weeks: taskWeeks, assignee: taskAssignee };
                    }
                  } else {
                    list.push({
                      id: String(Date.now()),
                      pillar: taskPillar,
                      topic: taskTopic,
                      weeks: taskWeeks,
                      assignee: taskAssignee,
                    });
                  }
                  return { ...prev, [key]: list };
                });
                setShowTaskOffcanvas(false);
                toast.success('Thành công', 'Đã lưu hoạt động.');
              }}
            >
              Lưu hoạt động
            </Button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col gap-3 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Hạng mục
            </label>
            <select
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={taskPillar}
              onChange={(e) => setTaskPillar(e.target.value)}
            >
              <option value="Sản phẩm">Sản phẩm</option>
              <option value="Bán hàng">Bán hàng</option>
              <option value="Nhận diện thương hiệu">Nhận diện thương hiệu</option>
              <option value="Chiến dịch mùa vụ">Chiến dịch mùa vụ</option>
            </select>
          </div>

          <Input
            label="Người phụ trách"
            placeholder="VD: Chu Thị Hằng, Nguyễn Thu Huyền..."
            value={taskAssignee}
            onChange={(e) => setTaskAssignee(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Tuần triển khai trong tháng
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((w) => {
                const isSelected = taskWeeks.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    onClick={() => {
                      setTaskWeeks((prev) => (prev.includes(w) ? prev.filter((item) => item !== w) : [...prev, w].sort()));
                    }}
                  >
                    Tuần {w}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[140px]">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Chủ đề / Tên nội dung
            </label>
            <textarea
              className="w-full flex-1 min-h-[130px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              value={taskTopic}
              placeholder="Mô tả tiêu đề bài viết, kịch bản video hoặc hoạt động triển khai..."
              onChange={(e) => setTaskTopic(e.target.value)}
            />
          </div>
        </div>
      </Offcanvas>

      {/* 5. Monthly Theme Modal (Step 3) */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h5 className="font-bold text-sm text-slate-800 uppercase mb-0">
                Chủ đề & Thông điệp tháng {selectedMonth}
              </h5>
              <button className="text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setShowThemeModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-3.5 flex flex-col gap-3 text-xs">
              <Input
                label="Chủ đề chính trong tháng"
                placeholder="VD: SEAJONG – CÔNG NGHỆ HÀN QUỐC CHO KHÔNG GIAN SỐNG..."
                value={monthlyThemeTopic}
                onChange={(e) => setMonthlyThemeTopic(e.target.value)}
              />
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mục tiêu truyền thông trọng tâm
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  value={monthlyThemeContent}
                  placeholder="Mô tả thông điệp truyền thông cốt lõi..."
                  onChange={(e) => setMonthlyThemeContent(e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowThemeModal(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setMonthlyThemes((prev) => {
                    const filtered = prev.filter((t) => t.month !== selectedMonth);
                    return [...filtered, { id: String(Date.now()), topic: monthlyThemeTopic, content: monthlyThemeContent, month: selectedMonth }];
                  });
                  setShowThemeModal(false);
                  toast.success('Thành công', 'Đã lưu chủ đề tháng.');
                }}
              >
                Lưu chủ đề
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Holiday Modal (Step 3) */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h5 className="font-bold text-sm text-slate-800 uppercase mb-0">
                Thêm ngày lễ trong tháng {selectedMonth}
              </h5>
              <button className="text-slate-400 hover:text-slate-700 cursor-pointer" onClick={() => setShowHolidayModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-3.5 flex flex-col gap-3 text-xs">
              <Input
                label="Ngày (dd/MM)"
                placeholder="VD: 15/08"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
              />
              <Input
                label="Tên ngày lễ / sự kiện"
                placeholder="VD: Lễ Vu Lan báo hiếu..."
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
              />
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowHolidayModal(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (newHolidayDate && newHolidayName) {
                    setCustomHolidays((prev) => [
                      ...prev,
                      { dateStr: newHolidayDate, name: newHolidayName, weekNum: 2, month: selectedMonth },
                    ]);
                    setNewHolidayDate('');
                    setNewHolidayName('');
                    setShowHolidayModal(false);
                    toast.success('Thành công', 'Đã thêm ngày lễ mới.');
                  }
                }}
              >
                Thêm ngày lễ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Print Preview Modal & Digital Signature */}
      {showPlanPrintModal && (
        <PrintPreviewModal
          title={`BẢN IN KẾ HOẠCH MARKETING NĂM ${selectedYear}`}
          documentId="mkt-plan-print-document"
          printOrientation="portrait"
          onClose={() => setShowPlanPrintModal(false)}
          sidebar={
            <div className="p-3 flex flex-col gap-3">
              <h6 className="font-bold text-xs uppercase text-slate-700">Chữ ký điện tử bản kế hoạch</h6>
              <div className="border rounded p-2 bg-slate-50">
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Người lập ({marketingManagerName})
                </span>
                <SignaturePad
                  onSave={setPlanProposerSig}
                  onClear={() => setPlanProposerSig(null)}
                  width={220}
                  height={90}
                />
              </div>
              <div className="border rounded p-2 bg-slate-50">
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Tổng giám đốc phê duyệt ({directorName})
                </span>
                <SignaturePad
                  onSave={setPlanApproverSig}
                  onClear={() => setPlanApproverSig(null)}
                  width={220}
                  height={90}
                />
              </div>
            </div>
          }
          document={
            <div id="mkt-plan-print-document">
              <PlanPrintDocument
                selectedYear={selectedYear}
                planDate={planDate}
                valAgent={valAgent}
                valAgentDev={valAgentDev}
                valTraditional={valTraditional}
                valEcommerce={valEcommerce}
                valQuota={valMarketingCost}
                valBranding={valBranding}
                valSalary={valSalaryBonus}
                valTravel={valTravel}
                contentPillars={contentPlanList}
                adPlans={adPlanList}
                monthlyBudgets={monthlyBudgets}
                monthlyAllocations={monthlyAllocations}
                categoryBudgets={{
                  agencyPOSBudget,
                  agencyAdsBudget,
                  agencyGiftBudget,
                  advFbAds,
                  advGoogleAds,
                  advYoutubeAds,
                  advTiktokAds,
                  advSeoPr,
                  advPrintOutsource,
                  advMediaModelDecor,
                  advWebDesign,
                  advOther,
                  advReserve,
                }}
                rowPadding={rowPadding}
                proposerSig={planProposerSig}
                approverSig={planApproverSig}
                proposerName={marketingManagerName}
                approverName={directorName}
                planStatus={planStatus}
              />
            </div>
          }
        />
      )}

      {/* Embedded CSS matching client-seajong */}
      <style>{`
        .mkt-step1-grid {
          display: flex;
          flex: 1 1 0%;
          height: 100%;
          min-height: 0;
          width: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .mkt-step1-left {
          width: 380px;
          min-width: 350px;
          max-width: 400px;
          flex-shrink: 0;
          border-right: 1px solid var(--border, #e2e8f0);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
          min-height: 0;
          height: 100%;
          background: #f8fafc;
        }
        .mkt-step1-right {
          flex: 1 1 0%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          min-height: 0;
          height: 100%;
          overflow: hidden;
          padding: 10px 14px;
          background: #ffffff;
        }
        .mkt-step4-grid {
          display: flex;
          flex: 1 1 0%;
          min-height: 0;
          height: 100%;
          width: 100%;
          min-width: 0;
          overflow: hidden;
        }
        .mkt-step4-left {
          width: 380px;
          min-width: 350px;
          max-width: 400px;
          flex-shrink: 0;
          border-right: 1px solid var(--border, #e2e8f0);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          min-height: 0;
          height: 100%;
          background: #f8fafc;
        }
        .mkt-step4-right {
          flex: 1 1 0%;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          min-height: 0;
          height: 100%;
          overflow-y: auto;
          padding: 10px 14px;
          background: #ffffff;
        }
        .mkt-step3-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 44px;
          padding: 0 16px;
          background: #ffffff;
          border-bottom: 1px solid var(--border, #e2e8f0);
          border-radius: 8px 8px 0 0;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .mkt-month-timeline {
          display: inline-flex;
          align-items: center;
          position: relative;
        }
        .mkt-month-line {
          position: absolute;
          left: 11px;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          height: 2px;
          background-color: color-mix(in srgb, var(--primary, #0284c7) 15%, #cbd5e1);
          z-index: 1;
        }
        .mkt-month-container {
          display: flex;
          gap: 8px;
          position: relative;
          z-index: 2;
          align-items: center;
        }
        .mkt-month-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10.5px;
          font-weight: 500;
          background-color: #fff;
          color: color-mix(in srgb, var(--foreground, #0f172a) 75%, #475569);
          border: 1.5px solid color-mix(in srgb, var(--primary, #0284c7) 20%, #cbd5e1);
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          outline: none;
        }
        .mkt-month-btn.active {
          font-weight: 700;
          background-color: #1e3a8a;
          color: #fff;
          border: none;
          box-shadow: 0 2px 6px rgba(30, 58, 138, 0.2);
        }
        @media (max-width: 1024px) {
          .mkt-step1-grid {
            flex-direction: column;
            overflow-y: auto;
          }
          .mkt-step1-left {
            width: 100%;
            max-width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--border, #e2e8f0);
            overflow: visible;
          }
          .mkt-step1-right {
            width: 100%;
            height: auto;
            overflow: visible;
          }
          .mkt-step4-grid {
            flex-direction: column;
            overflow-y: auto;
          }
          .mkt-step4-left {
            width: 100%;
            max-width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--border, #e2e8f0);
            overflow: visible;
          }
          .mkt-step4-right {
            width: 100%;
            height: auto;
            overflow: visible;
          }
          .mkt-step3-header {
            height: auto;
            flex-direction: column;
            gap: 10px;
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default MarketingPlanPage;
