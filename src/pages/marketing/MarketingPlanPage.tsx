import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { PageTitle } from '../../components/ui/PageTitle';
import { DynamicTicker } from '../../components/layout/DynamicTicker';
import { ModernStepper } from '../../components/ui/ModernStepper';
import type { ModernStepItem } from '../../types';
import { WorkflowCard } from '../../components/ui/WorkflowCard';
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
    <div className="d-flex align-items-center justify-content-between gap-3" style={{ height: 28 }}>
      <span style={{ fontSize: 12, color: 'var(--muted-foreground)', flex: 1, textAlign: 'left' }}>
        {label}
      </span>
      <div
        className="d-flex align-items-center"
        style={{
          border: isFocused ? '1px solid #86b7fe' : '1px solid #ced4da',
          boxShadow: isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
          borderRadius: 4,
          height: 28,
          width: 160,
          background: '#fff',
          padding: '0 6px',
          transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          userSelect: 'none',
        }}
      >
        <input
          type="text"
          value={pctText}
          onChange={handlePctChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0"
          style={{
            border: 'none',
            outline: 'none',
            width: '35px',
            height: '100%',
            textAlign: 'right',
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            padding: '0 2px 0 0',
            color: 'var(--foreground)',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', paddingRight: 6, borderRight: '1px solid #dee2e6', height: '60%', display: 'flex', alignItems: 'center' }}>
          %
        </span>
        <input
          type="text"
          value={value ? value.toLocaleString('vi-VN') : ''}
          onChange={handleVndChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="0"
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: 0,
            width: 0,
            height: '100%',
            textAlign: 'right',
            fontSize: 12,
            fontWeight: 600,
            background: 'transparent',
            padding: '0 2px 0 6px',
            color: 'var(--foreground)',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', paddingLeft: 2 }}>
          đ
        </span>
      </div>
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
      <div style={{ width: 180, height: 180, position: 'relative', margin: '4px 0 12px 0' }}>
        <svg width="180" height="180" viewBox="0 0 160 160">
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
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)' }}>
            {hoveredIdx !== null ? data[hoveredIdx].label : 'Tổng doanh thu'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>
            {hoveredIdx !== null
              ? `${((data[hoveredIdx].value / (totalRevenue || 1)) * 100).toFixed(1)}%`
              : `${(totalRevenue / 1e9).toFixed(1)} tỷ`}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 12px', width: '100%', padding: '0 8px' }}>
        {data.map((item, idx) => {
          const ratio = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
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
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [planDate, setPlanDate] = useState<string>('2026-06-23');
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // Mặc định tháng 8

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
          const mgr = list.find((e: any) => e.departmentName === 'Marketing');
          if (mgr) setMarketingManagerName(mgr.fullName);
          const dir = list.find((e: any) => e.departmentName === 'Ban Giám đốc');
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
            <input
              type="text"
              className="form-control form-control-sm text-end bg-white border px-1.5 py-0.5 fw-semibold"
              value={row.value ? row.value.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                setEditedRevenue((prev) => ({ ...prev, [k]: val }));
              }}
              style={{ width: '100%', maxWidth: 130, height: 26, fontSize: 12, outline: 'none' }}
            />
          );
        }
        if (isEditing && (row.id === 'cp_1' || row.id === 'cp_3')) {
          return (
            <input
              type="text"
              className="form-control form-control-sm text-end bg-white border px-1.5 py-0.5 fw-semibold"
              value={row.value ? row.value.toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                if (row.id === 'cp_1') setBrandingCost(val);
                if (row.id === 'cp_3') setTravelCost(val);
              }}
              style={{ width: '100%', maxWidth: 130, height: 26, fontSize: 12, outline: 'none' }}
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
            <input
              type="text"
              className="form-control form-control-sm bg-white border px-1.5 py-0.5 text-start"
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
      width: 86,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-white border px-1 text-center"
              value={row.basic ? row.basic.toLocaleString('vi-VN') : ''}
              onChange={(e) => updateStaffField(row.id, 'basic', Number(e.target.value.replace(/\D/g, '')) || 0)}
              style={{ width: '100%', height: 26, fontSize: 12, outline: 'none' }}
            />
          );
        }
        return <span>{row.basic.toLocaleString('vi-VN')}</span>;
      },
    },
    {
      header: 'HIỆU SUẤT',
      width: 78,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-white border px-1 text-center"
              value={row.perf ? row.perf.toLocaleString('vi-VN') : ''}
              onChange={(e) => updateStaffField(row.id, 'perf', Number(e.target.value.replace(/\D/g, '')) || 0)}
              style={{ width: '100%', height: 26, fontSize: 12, outline: 'none' }}
            />
          );
        }
        return <span>{row.perf.toLocaleString('vi-VN')}</span>;
      },
    },
    {
      header: 'PHỤ CẤP',
      width: 70,
      align: 'center',
      render: (row) => {
        if (row.isTotal) return '';
        if (isEditing) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-white border px-1 text-center"
              value={row.allowance ? row.allowance.toLocaleString('vi-VN') : ''}
              onChange={(e) => updateStaffField(row.id, 'allowance', Number(e.target.value.replace(/\D/g, '')) || 0)}
              style={{ width: '100%', height: 26, fontSize: 12, outline: 'none' }}
            />
          );
        }
        return <span>{row.allowance.toLocaleString('vi-VN')}</span>;
      },
    },
    {
      header: 'SL',
      width: 40,
      align: 'center',
      render: (row) => {
        if (isEditing && !row.isTotal) {
          return (
            <input
              type="text"
              className="form-control form-control-sm bg-white border px-1 text-center"
              value={row.qty ? row.qty.toLocaleString('vi-VN') : ''}
              onChange={(e) => updateStaffField(row.id, 'qty', Number(e.target.value.replace(/\D/g, '')) || 0)}
              style={{ width: '100%', height: 26, fontSize: 12, outline: 'none' }}
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

  // ── STEP 2: CONTENT PILLARS & AD PLANS DATA ──────────────────────────────
  const baseContentPlans: ContentPlanItem[] = [
    {
      id: 'cp_1',
      pillar: 'Nhận diện thương hiệu (Branding)',
      purpose: 'Tăng mức độ tin cậy và nhận diện thương hiệu sen vòi Seajong Hàn Quốc',
      role: 'Định vị thương hiệu cao cấp tiêu chuẩn Hàn Quốc',
      details: 'Video giới thiệu nhà máy đúc đồng 59-1, hình ảnh catalogue showroom',
      budget: 15000000,
      postsCount: 12,
    },
    {
      id: 'cp_2',
      pillar: 'Sản phẩm & Tính năng (Product USP)',
      purpose: 'Thúc đẩy mua sắm bộ sen phím đàn SJ-SH và vòi chậu Titan Gray',
      role: 'Chuyển đổi khách hàng tiềm năng thành đơn hàng',
      details: 'Bài viết so sánh chất lượng mạ PVD, video thử áp lực nước 16 bar',
      budget: 10000000,
      postsCount: 16,
    },
  ];

  const contentPlanList = [
    ...baseContentPlans.map((item) => {
      const ed = editedContentPlan[item.id];
      return {
        id: item.id,
        pillar: ed ? ed.pillar : item.pillar,
        purpose: ed ? ed.purpose : item.purpose,
        role: ed ? ed.role : item.role,
        details: ed ? ed.details : item.details,
        budget: ed ? ed.budget : item.budget,
        postsCount: ed ? ed.postsCount : item.postsCount,
      };
    }),
    ...customContentPlanIds.map((id) => {
      const ed = editedContentPlan[id] || {};
      return {
        id,
        pillar: ed.pillar || 'Tuyến nội dung mới',
        purpose: ed.purpose || '',
        role: ed.role || '',
        details: ed.details || 'Nội dung chi tiết...',
        budget: ed.budget || 10000000,
        postsCount: ed.postsCount || 5,
      };
    }),
  ];

  const totalContentBudget = contentPlanList.reduce((s, i) => s + (i.budget || 0), 0);
  const totalContentPosts = contentPlanList.reduce((s, i) => s + (i.postsCount || 0), 0);

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
  }, [contentPlanList, expandedParentIds]);

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
      render: (row) => (
        <div style={{ paddingLeft: row.isChildRow ? 20 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          {!row.isTotal && !row.isChildRow && (
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
      ),
    },
    {
      header: 'Mục tiêu & Vai trò',
      align: 'left',
      render: (row) => (row.isTotal || row.isChildRow ? null : <span style={{ fontSize: 12 }}>{row.purpose}</span>),
    },
    {
      header: 'Nội dung chi tiết',
      align: 'left',
      render: (row) => <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{parseParentDetails(row.details || '').description || row.details}</span>,
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

  // Ad Plans data
  const baseAdPlans: AdPlanItem[] = [
    {
      id: 'ad_1',
      objective: 'Tìm kiếm Đại lý & Nhà phân phối',
      topic: 'Chính sách chiết khấu mở đại lý thiết bị vệ sinh Seajong 2026',
      channel: 'Facebook Ads + Google Ads',
      content: 'Chính sách hỗ trợ 100% biển bảng kệ mẫu, chiết khấu lên đến 38%',
      landingPage: 'https://seajong.com/dai-ly',
      budget: 15000000,
      region: 'Toàn quốc (Ưu tiên Miền Bắc & Miền Trung)',
      assignee: 'Nguyễn Thu Huyền',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      audience: 'Chủ cửa hàng VLXD, thầu thợ, đại lý điện nước',
    },
    {
      id: 'ad_2',
      objective: 'Quảng bá Bộ sưu tập Sen phím đàn SJ-SH',
      topic: 'Bộ sưu tập sen tắm phím đàn hiển thị nhiệt độ thông minh',
      channel: 'TikTok Ads + Facebook Video',
      content: 'Video viral trải nghiệm thực tế phím đàn chịu áp 16 bar tại chung cư cao cấp',
      landingPage: 'https://seajong.com/sen-tam',
      budget: 10000000,
      region: 'Hà Nội, TP.HCM, Đà Nẵng',
      assignee: 'Chu Thị Hằng',
      startDate: '2026-08-01',
      endDate: '2026-10-31',
      audience: 'Gia đình trẻ 25-45 tuổi, chuẩn bị hoàn thiện nhà mới',
    },
  ];

  const adPlanList = [
    ...baseAdPlans.map((item) => {
      const ed = editedAdPlan[item.id];
      return {
        id: item.id,
        objective: ed ? ed.objective : item.objective,
        topic: ed ? ed.topic : item.topic,
        channel: ed ? ed.channel : item.channel,
        content: ed ? ed.content : item.content,
        landingPage: ed ? ed.landingPage : item.landingPage,
        budget: ed ? ed.budget : item.budget,
        region: ed ? ed.region : item.region,
        assignee: ed ? ed.assignee : item.assignee,
        startDate: ed ? ed.startDate : item.startDate,
        endDate: ed ? ed.endDate : item.endDate,
        audience: ed ? ed.audience : item.audience,
      };
    }),
    ...customAdPlanIds.map((id) => {
      const ed = editedAdPlan[id] || {};
      return {
        id,
        objective: ed.objective || 'Mục tiêu mới',
        topic: ed.topic || '',
        channel: ed.channel || 'Facebook Ads',
        content: ed.content || '',
        landingPage: ed.landingPage || '',
        budget: ed.budget || 10000000,
        region: ed.region || 'Toàn quốc',
        assignee: ed.assignee || 'Nguyễn Thu Huyền',
        startDate: ed.startDate || '2026-07-01',
        endDate: ed.endDate || '2026-12-31',
        audience: ed.audience || '',
      };
    }),
  ];

  const totalAdBudget = adPlanList.reduce((s, i) => s + (i.budget || 0), 0);

  const adPlanRows: AdPlanItem[] = [
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
  ];

  const adPlanColumns: TableColumn<AdPlanItem>[] = [
    { header: 'STT', width: 42, align: 'center', render: (row) => (row.isTotal ? '' : <span style={{ color: 'var(--muted-foreground)' }}>{row.stt}</span>) },
    { header: 'Mục tiêu quảng cáo', align: 'left', render: (row) => <span style={{ fontWeight: row.isTotal ? 700 : 600 }}>{row.objective}</span> },
    { header: 'Chủ đề', align: 'left', render: (row) => <span>{row.topic}</span> },
    { header: 'Kênh chạy', width: 120, align: 'left', render: (row) => <span className="badge bg-light text-dark border">{row.channel}</span> },
    { header: 'Nội dung thông điệp', align: 'left', render: (row) => <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{row.content}</span> },
    { header: 'Ngân sách (đ)', width: 110, align: 'right', render: (row) => <span style={{ fontWeight: 700 }}>{row.budget.toLocaleString('vi-VN')} đ</span> },
    { header: 'Người phụ trách', width: 120, align: 'left', render: (row) => <span>{row.assignee}</span> },
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
                setEditingAdPlanId(row.id);
                setAdOffcanvasData({
                  objective: row.objective,
                  topic: row.topic,
                  channel: row.channel,
                  content: row.content,
                  landingPage: row.landingPage || '',
                  budget: row.budget,
                  region: row.region,
                  assignee: row.assignee,
                  startDate: row.startDate,
                  endDate: row.endDate,
                  audience: row.audience,
                });
                setShowAdOffcanvas(true);
              }}
            >
              <PencilSquare size={13} />
            </button>
            <button
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
      width: 42,
      align: 'center',
      render: (row) => {
        if (row.id === 'section_theme' || row.type === 'section_header') {
          const isTheme = row.id === 'section_theme';
          const isCollapsed = isTheme ? isThemeCollapsed : collapsedSections.includes(row.id);
          return (
            <div
              className="d-flex align-items-center justify-content-center gap-1"
              style={{ fontWeight: 700, cursor: 'pointer', color: row.colorTheme === 'red' ? '#dc2626' : '#2563eb' }}
              onClick={() => {
                if (isTheme) setIsThemeCollapsed(!isThemeCollapsed);
                else setCollapsedSections((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]));
              }}
            >
              <span>{row.stt}</span>
              <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'}`} style={{ fontSize: 9 }} />
            </div>
          );
        }
        return null;
      },
    },
    {
      header: 'Danh mục',
      width: 110,
      align: 'left',
      render: (row) => {
        if (row.type === 'theme_header' || row.type === 'section_header') {
          return (
            <span style={{ fontWeight: 800, color: row.colorTheme === 'red' ? '#dc2626' : '#1e3a8a', letterSpacing: '0.04em' }}>
              {row.name}
            </span>
          );
        }
        if (row.type === 'theme') {
          return <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--muted-foreground)' }}>{row.name}</span>;
        }
        return <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{row.item?.pillar || ''}</span>;
      },
    },
    {
      header: 'Hạng mục / Nội dung',
      align: 'left',
      render: (row) => {
        if (row.type === 'theme_header' || row.type === 'section_header') return null;
        if (row.id === 'theme_holiday') {
          const allHolidays = [...(HOLIDAYS_LIST_BY_MONTH[selectedMonth] || []), ...(customHolidays.filter((h) => h.month === selectedMonth) || [])];
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {allHolidays.map((h, i) => (
                <span key={i} className="badge bg-danger/10 text-danger border border-danger/20" style={{ fontSize: 11 }}>
                  {h.dateStr}: {h.name}
                </span>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-primary"
                onClick={() => setShowHolidayModal(true)}
                title="Thêm ngày lễ"
              >
                <PlusLg size={12} />
              </button>
            </div>
          );
        }
        if (row.id === 'theme_content') {
          const currentTheme = monthlyThemes.find((t) => t.month === selectedMonth);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#1e3a8a', fontSize: 12 }}>
                {currentTheme ? currentTheme.topic : (monthlyThemeTopic || 'Chưa thiết lập chủ đề tháng')}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link p-0 text-primary"
                onClick={() => setShowThemeModal(true)}
                title="Sửa chủ đề"
              >
                <PencilSquare size={12} />
              </button>
            </div>
          );
        }
        if (row.id === 'theme_product') {
          const monthProducts = monthlyProducts[selectedMonth] || {};
          return (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4].map((w) => {
                const list = monthProducts[w] || [];
                return (
                  <span
                    key={w}
                    className="badge bg-light text-dark border cursor-pointer hover:bg-slate-200"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      setActiveProductWeek(w);
                      setTempSelectedProducts(list);
                      setShowProductModal(true);
                    }}
                  >
                    T{w}: {list.length > 0 ? `${list.length} SP` : '+ Chọn SP'}
                  </span>
                );
              })}
            </div>
          );
        }
        return <span style={{ fontWeight: 600, fontSize: 12.5 }}>{row.name}</span>;
      },
    },
    {
      header: `T1 (01-07/${monthStr})`,
      width: 78,
      align: 'center',
      render: (row) => {
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(1);
        return (
          <button
            type="button"
            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ width: 28, height: 24, padding: 0, fontSize: 11, fontWeight: 700 }}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 1)}
          >
            T1
          </button>
        );
      },
    },
    {
      header: `T2 (08-14/${monthStr})`,
      width: 78,
      align: 'center',
      render: (row) => {
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(2);
        return (
          <button
            type="button"
            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ width: 28, height: 24, padding: 0, fontSize: 11, fontWeight: 700 }}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 2)}
          >
            T2
          </button>
        );
      },
    },
    {
      header: `T3 (15-21/${monthStr})`,
      width: 78,
      align: 'center',
      render: (row) => {
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(3);
        return (
          <button
            type="button"
            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ width: 28, height: 24, padding: 0, fontSize: 11, fontWeight: 700 }}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 3)}
          >
            T3
          </button>
        );
      },
    },
    {
      header: `T4 (22-${lastDayStr}/${monthStr})`,
      width: 78,
      align: 'center',
      render: (row) => {
        if (row.type !== 'section_item') return null;
        const active = (row.item.weeks || []).includes(4);
        return (
          <button
            type="button"
            className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ width: 28, height: 24, padding: 0, fontSize: 11, fontWeight: 700 }}
            onClick={() => toggleTaskWeek(row.parentId, row.item.id, 4)}
          >
            T4
          </button>
        );
      },
    },
    {
      header: 'Người phụ trách',
      width: 120,
      align: 'left',
      render: (row) => (row.type === 'section_item' ? <span style={{ fontSize: 11.5 }}>{row.item.assignee || 'Chu Thị Hằng'}</span> : null),
    },
    {
      header: 'Thao tác',
      width: 60,
      align: 'center',
      render: (row) => {
        if (row.type === 'section_header') {
          return (
            <button
              type="button"
              className="btn btn-sm btn-link p-0 text-primary"
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
              <PlusLg size={13} />
            </button>
          );
        }
        if (row.type === 'section_item') {
          return (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              <button
                className="btn btn-sm btn-link p-0 text-primary"
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
                <PencilSquare size={12} />
              </button>
              <button
                className="btn btn-sm btn-link p-0 text-danger"
                onClick={() => {
                  const key = `${row.parentId}_${selectedMonth}`;
                  setSectionContentItems((prev) => ({
                    ...prev,
                    [key]: (prev[key] || []).filter((i) => i.id !== row.item.id),
                  }));
                  toast.info('Đã xóa', 'Đã xóa hoạt động.');
                }}
              >
                <Trash size={12} />
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

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-0">
      {/* ── TOP HEADER (TUÂN THỦ AGENTS.MD: KHÔNG NÚT BẤM TRONG PAGETITLE) ── */}
      <PageTitle
        title="Lập kế hoạch"
        badge="MARKETING"
        description="Quy trình lập kế hoạch tiếp thị và phát triển thị trường"
      />

      {/* Dynamic Ticker */}
      <DynamicTicker
        pageTitle="Lập kế hoạch Marketing"
        customNews={[
          {
            badge: 'TIẾN ĐỘ QUY TRÌNH',
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
            text: `Đang thực hiện Bước ${currentStep}/4: ${steps[currentStep - 1]?.title} (${steps[currentStep - 1]?.desc})`,
          },
          {
            badge: totalCostMarketing > valMarketingCost ? 'VƯỢT ĐỊNH MỨC' : 'TRONG ĐỊNH MỨC',
            badgeColor: totalCostMarketing > valMarketingCost ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
            text: `Marketing: ${valMarketingCost.toLocaleString('vi-VN')} đ • Chi phí đã lập: ${totalCostMarketing.toLocaleString('vi-VN')} đ (${getRatio(totalCostMarketing).toFixed(1)}%) - ${(valMarketingCost / (totalRevenue || 1) * 100).toFixed(1)}% định mức`,
          },
        ]}
      />

      {/* ── WORKFLOW CARD (CHỨA STEPPER VÀ CÁC BƯỚC NỘI DUNG) ─────────────── */}
      <div className="p-2 px-3 flex-1 flex flex-col min-h-0">
        <WorkflowCard
          stepper={
            <ModernStepper
              steps={steps}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
          contentPadding="px-3 pt-2 pb-3"
          bottomToolbar={
            currentStep === 2 ? (
              <div className="d-flex justify-content-between align-items-center w-100" style={{ padding: '2px 0' }}>
                <div>
                  {subStep === 'ads' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 font-semibold text-xs rounded-md"
                      onClick={() => setSubStep('pillar')}
                    >
                      <ArrowLeft size={13} /> Tuyến nội dung
                    </button>
                  ) : <div />}
                </div>
                <div>
                  {subStep === 'pillar' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary d-flex align-items-center gap-1 font-semibold text-xs rounded-md"
                      onClick={() => setSubStep('ads')}
                    >
                      Kế hoạch quảng cáo <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ) : undefined
          }
        >
          {/* ══════════════════════════════════════════════════════════════════
              BƯỚC 1: MỤC TIÊU NĂM (STEP 1)
             ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="mkt-step1-grid">
              {/* Left Column (5/12) */}
              <div className="mkt-step1-left">
                {/* Year, Date, Approval, Report */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                      NĂM KẾ HOẠCH
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      style={{ fontSize: 12, height: 32 }}
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                  <div style={{ flex: 1.2, minWidth: 100 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 4 }}>
                      NGÀY LẬP
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={planDate}
                      onChange={(e) => setPlanDate(e.target.value)}
                      style={{ fontSize: 12, height: 32 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-sm btn-primary"
                      title="Trình duyệt kế hoạch"
                      onClick={handleSubmitPlan}
                      disabled={isSubmittingPlan || planStatus === 'pending_approval'}
                      style={{ height: 32, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 11, padding: '0 10px' }}
                    >
                      {isSubmittingPlan ? (
                        <div className="spinner-border spinner-border-sm" role="status" style={{ width: 12, height: 12 }} />
                      ) : (
                        <SendFill size={11} />
                      )}
                      Trình duyệt
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      title="Báo cáo kế hoạch"
                      onClick={() => setShowPlanPrintModal(true)}
                      style={{ height: 32, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 11, padding: '0 10px' }}
                    >
                      <FileEarmarkBarGraph size={12} /> Báo cáo
                    </button>
                  </div>
                </div>

                {/* Status Badges & Approval Actions */}
                {planStatus === 'pending_approval' && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 d-flex align-items-center justify-content-between">
                    <span className="badge bg-warning text-dark font-semibold">Đang chờ duyệt</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-success text-xs font-semibold py-1 px-2" onClick={handleApprovePlan}>
                        <Check size={14} /> Phê duyệt
                      </button>
                      <button className="btn btn-sm btn-danger text-xs font-semibold py-1 px-2" onClick={handleRejectPlan}>
                        <X size={14} /> Từ chối
                      </button>
                    </div>
                  </div>
                )}
                {planStatus === 'approved' && (
                  <div>
                    <span className="badge bg-success font-semibold px-2 py-1">Kế hoạch đã phê duyệt</span>
                  </div>
                )}
                {planStatus === 'rejected' && (
                  <div>
                    <span className="badge bg-danger font-semibold px-2 py-1">Kế hoạch bị từ chối</span>
                  </div>
                )}

                {/* Cost/Revenue Progress Card */}
                {(() => {
                  const costRatio = getRatio(totalCostMarketing);
                  const isOver = totalCostMarketing > valMarketingCost;
                  return (
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                          TỶ LỆ CHI PHÍ / DOANH THU
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: isOver ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isOver ? '#ef4444' : '#10b981',
                            border: `1px solid ${isOver ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                          }}
                        >
                          {isOver ? 'Vượt định mức' : 'Trong định mức'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--foreground)' }}>
                          {costRatio.toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                          trên tổng doanh thu
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(100, 116, 139, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(costRatio, 100)}%`,
                            background: isOver
                              ? 'linear-gradient(90deg, #ef4444 0%, #f43f5e 100%)'
                              : 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                            borderRadius: 4,
                            transition: 'width 0.4s ease-in-out',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted-foreground)' }}>
                        <div>
                          Chi phí: <strong style={{ color: 'var(--foreground)' }}>{totalCostMarketing.toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div>
                          Định mức: <strong style={{ color: 'var(--foreground)' }}>{valMarketingCost.toLocaleString('vi-VN')} đ</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Revenue Donut Chart Card */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Cơ cấu doanh thu năm {selectedYear}
                  </span>
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

              {/* Right Column (7/12) */}
              <div className="mkt-step1-right">
                <SectionTitle
                  title={`Bảng chỉ số kế hoạch marketing năm ${selectedYear}`}
                  className="mb-1"
                  action={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="editModeSwitch"
                          checked={isEditing}
                          onChange={(e) => {
                            setIsEditing(e.target.checked);
                            if (!e.target.checked) setSelectedStaffIds([]);
                          }}
                          style={{ cursor: 'pointer', width: 32, height: 16 }}
                        />
                        <label
                          className="form-check-label text-uppercase fw-bold"
                          htmlFor="editModeSwitch"
                          style={{ fontSize: 11, color: 'var(--muted-foreground)', cursor: 'pointer' }}
                        >
                          Chỉnh sửa
                        </label>
                      </div>
                      <button
                        className="btn btn-sm btn-success d-flex align-items-center gap-1.5 font-semibold text-xs rounded"
                        disabled={!isEditing}
                        onClick={() => handleSaveToDB()}
                        style={{ height: 28, padding: '0 10px' }}
                      >
                        <Floppy size={12} /> Lưu vào DB
                      </button>
                    </div>
                  }
                />

                {/* Table: Budget & Targets */}
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
                  cellStyle={() => ({ background: '#fff', padding: '6px 8px' })}
                  wrapperStyle={{ background: '#fff', border: 'none', overflowX: 'auto' }}
                  wrapperClassName="mkt-plan-table-no-min"
                  minWidth={320}
                />

                {/* SectionTitle: Staff Salary */}
                <SectionTitle
                  title="Chi tiết chi phí lương thưởng nhân sự"
                  className="mt-3 mb-1"
                  style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.02em' }}
                  action={
                    isEditing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {selectedStaffIds.length > 0 && (
                          <button
                            className="btn btn-sm btn-outline-danger font-semibold text-xs py-0.5 px-2 rounded"
                            onClick={() => {
                              setCustomStaffIds((prev) => prev.filter((id) => !selectedStaffIds.includes(id)));
                              setDeletedBaseStaffIds((prev) => [...prev, ...selectedStaffIds.filter((id) => id.startsWith('mkt_s'))]);
                              setSelectedStaffIds([]);
                              toast.info('Đã xóa', 'Đã xóa các vị trí đã chọn.');
                            }}
                          >
                            <Trash size={11} /> Xóa ({selectedStaffIds.length})
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline-primary font-semibold text-xs py-0.5 px-2 rounded"
                          onClick={() => {
                            const newId = `mkt_custom_${Date.now()}`;
                            setCustomStaffIds((prev) => [...prev, newId]);
                            setEditedStaff((prev) => ({
                              ...prev,
                              [newId]: { name: 'Vị trí mới', basic: 10000000, perf: 0, allowance: 0, qty: 1 },
                            }));
                          }}
                        >
                          <PlusLg size={11} /> Thêm vị trí
                        </button>
                      </div>
                    )
                  }
                />

                {/* Table: Salary Targets */}
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
                  cellStyle={() => ({ background: '#fff', padding: '6px 8px' })}
                  wrapperStyle={{ background: '#fff', border: 'none', overflowX: 'auto' }}
                  wrapperClassName="mkt-plan-table-no-min"
                  minWidth={480}
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              BƯỚC 2: KẾ HOẠCH NĂM (STEP 2: CONTENT PILLARS & ADS)
             ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', overflow: 'hidden', minWidth: 0, width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 16px 12px 16px', flexShrink: 0, borderBottom: '1px solid var(--border)', background: '#fff' }}>
                <SectionTitle
                  title={subStep === 'pillar' ? `Chi tiết tuyến nội dung năm ${selectedYear}` : `Kế hoạch chạy quảng cáo năm ${selectedYear}`}
                  className="mb-0"
                  style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.02em' }}
                  action={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {subStep === 'pillar' && (
                        <button
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 font-semibold text-xs rounded"
                          style={{ height: 28, padding: '0 10px' }}
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
                        >
                          <PlusLg size={11} /> Thêm tuyến nội dung
                        </button>
                      )}
                      {subStep === 'ads' && (
                        <button
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 font-semibold text-xs rounded"
                          style={{ height: 28, padding: '0 10px' }}
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
                        >
                          <PlusLg size={11} /> Thêm mục tiêu quảng cáo
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-success rounded"
                        title="Lưu thay đổi"
                        onClick={() => handleSaveToDB()}
                        style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Floppy size={12} />
                      </button>
                    </div>
                  }
                />
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                  - Ngân sách phân bổ: <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{valBranding.toLocaleString('vi-VN')} đồng</span>
                </div>
              </div>

              <div className="flex-grow-1 custom-scrollbar" style={{ overflowY: 'auto', padding: '12px 16px', minHeight: 0, minWidth: 0, width: '100%' }}>
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
                    cellStyle={() => ({ background: '#fff', padding: '6px 8px' })}
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
                    cellStyle={() => ({ background: '#fff', padding: '6px 8px' })}
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
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', overflow: 'hidden', minWidth: 0, width: '100%' }}>
              {/* Header with 12 Month Selector */}
              <div className="mkt-step3-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <SectionTitle
                    title={`Kế hoạch hoạt động marketing tháng ${selectedMonth} - Năm ${selectedYear}`}
                    className="mb-0"
                    style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.02em' }}
                  />
                </div>

                {/* 12-Month Selector Timeline */}
                <div className="mkt-month-timeline">
                  <div className="mkt-month-line" />
                  <div className="mkt-month-container">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isActive = m === selectedMonth;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`mkt-month-btn ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedMonth(m)}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 font-semibold text-xs rounded"
                    style={{ height: 28, padding: '0 10px' }}
                    onClick={() => setShowThemeModal(true)}
                  >
                    <PencilSquare size={11} /> Chủ đề tháng
                  </button>
                  <button
                    className="btn btn-sm btn-outline-success rounded"
                    title="Lưu lại"
                    onClick={() => handleSaveToDB()}
                    style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Floppy size={12} />
                  </button>
                </div>
              </div>

              {/* Table Matrix */}
              <div className="flex-grow-1 custom-scrollbar" style={{ overflowY: 'auto', padding: '12px 16px', minHeight: 0, minWidth: 0, width: '100%' }}>
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
                  cellStyle={() => ({ background: '#fff', padding: '6px 8px' })}
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
            <div className="mkt-step4-grid">
              {/* Left Column: Stats & Annual Category Settings */}
              <div className="mkt-step4-left">
                {/* Summary Card */}
                <div
                  className="card m-0 border-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: 8, padding: 12 }}
                >
                  <h6 className="fw-bold text-secondary" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    TÓM TẮT NGÂN SÁCH
                  </h6>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2 }}>Tổng ngân sách năm {selectedYear}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', lineHeight: '1.2' }}>
                      {valBranding.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div className="d-flex gap-3">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2 }}>Đã phân bổ</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', lineHeight: '1.2' }}>
                        {totalAllocatedBudgets.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2 }}>Còn lại chưa phân bổ</div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: valBranding - totalAllocatedBudgets < 0 ? '#ef4444' : '#10b981',
                          lineHeight: '1.2',
                        }}
                      >
                        {(valBranding - totalAllocatedBudgets).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Ngân sách cho đại lý */}
                <SectionTitle title="Ngân sách cho đại lý" className="mb-0" style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.02em' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 12 }}>
                  <BudgetInputRow label="Marketing tại điểm bán" value={agencyPOSBudget} onChange={setAgencyPOSBudget} valBranding={valBranding} />
                  <BudgetInputRow label="Quảng cáo bảng hiệu" value={agencyAdsBudget} onChange={setAgencyAdsBudget} valBranding={valBranding} />
                  <BudgetInputRow label="Quà tặng khai trương & sự kiện" value={agencyGiftBudget} onChange={setAgencyGiftBudget} valBranding={valBranding} />
                </div>

                {/* Section: Ngân sách cho quảng cáo */}
                <SectionTitle title="Ngân sách cho quảng cáo" className="mb-0" style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.02em' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 12 }}>
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

              {/* Right Column: Month Allocations Table */}
              <div className="mkt-step4-right">
                <SectionTitle
                  title={`Phân bổ ngân sách theo tháng - Năm ${selectedYear}`}
                  className="mb-0"
                  style={{ color: 'var(--primary)', fontSize: 12, letterSpacing: '0.02em' }}
                  action={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="form-check form-switch mb-0 d-flex align-items-center gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="editMonthlySwitch"
                          checked={isEditing}
                          onChange={(e) => setIsEditing(e.target.checked)}
                          style={{ cursor: 'pointer', width: 32, height: 16 }}
                        />
                        <label
                          className="form-check-label text-uppercase fw-bold"
                          htmlFor="editMonthlySwitch"
                          style={{ fontSize: 11, color: 'var(--muted-foreground)', cursor: 'pointer' }}
                        >
                          CHỈNH SỬA
                        </label>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-success rounded"
                        title="Lưu lại"
                        onClick={() => handleSaveToDB()}
                        style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Floppy size={12} />
                      </button>
                    </div>
                  }
                />

                {/* 12-Month Selector Timeline */}
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%', maxWidth: 420, margin: '8px 0' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 11,
                      right: 11,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: 2,
                      backgroundColor: 'color-mix(in srgb, var(--primary) 15%, #cbd5e1)',
                      zIndex: 1,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, width: '100%', position: 'relative', zIndex: 2, alignItems: 'center' }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isActive = m === selectedMonth;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedMonth(m)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10.5,
                            fontWeight: isActive ? 700 : 500,
                            backgroundColor: isActive ? '#1e3a8a' : '#fff',
                            color: isActive ? '#fff' : 'color-mix(in srgb, var(--foreground) 75%, #475569)',
                            border: isActive ? 'none' : '1.5px solid color-mix(in srgb, var(--primary) 20%, #cbd5e1)',
                            boxShadow: isActive ? '0 2px 6px rgba(30, 58, 138, 0.2)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monthly Budget Summary */}
                <div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                    Tổng ngân sách dự kiến chi cho tháng {selectedMonth}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                    {(monthlyBudgets[selectedMonth] || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                {/* 13 Categories Monthly Table */}
                <div className="border rounded bg-white overflow-hidden shadow-2xs">
                  <table className="w-100" style={{ fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10.5px]">
                        <th className="py-2 px-3 text-start">Khoản mục chi phí</th>
                        <th className="py-2 px-3 text-end" style={{ width: 140 }}>Ngân sách tháng {selectedMonth}</th>
                        <th className="py-2 px-3 text-start">Ghi chú phân bổ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Section: Agency */}
                      <tr className="bg-blue-50/60 font-bold text-blue-900 border-b">
                        <td colSpan={3} className="py-1.5 px-3">
                          1. Chi phí cho đại lý
                        </td>
                      </tr>
                      {BUDGET_CATEGORIES.slice(0, 3).map((cat) => {
                        const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0, note: '' };
                        return (
                          <tr key={cat.id} className="border-b hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-medium text-slate-800">{cat.label}</td>
                            <td className="py-1.5 px-3 text-end">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm text-end bg-white border px-1 py-0.5"
                                  value={alloc.budget ? alloc.budget.toLocaleString('vi-VN') : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const raw = Number(e.target.value.replace(/\D/g, '')) || 0;
                                    handleMonthlyCategoryBudgetChange(cat.id, raw);
                                  }}
                                  style={{ height: 26, fontSize: 12 }}
                                />
                              ) : (
                                <span className="font-semibold text-slate-900">{alloc.budget ? `${alloc.budget.toLocaleString('vi-VN')} đ` : '0 đ'}</span>
                              )}
                            </td>
                            <td className="py-1.5 px-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-white border px-1.5 py-0.5"
                                  value={alloc.note || ''}
                                  placeholder="Ghi chú chi tiết..."
                                  onChange={(e) => handleMonthlyCategoryNoteChange(cat.id, e.target.value)}
                                  style={{ height: 26, fontSize: 12 }}
                                />
                              ) : (
                                <span className="text-slate-500 text-xs">{alloc.note || '-'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Section: Advertising */}
                      <tr className="bg-blue-50/60 font-bold text-blue-900 border-b">
                        <td colSpan={3} className="py-1.5 px-3">
                          2. Chi phí cho quảng cáo & tiếp thị
                        </td>
                      </tr>
                      {BUDGET_CATEGORIES.slice(3).map((cat) => {
                        const alloc = (monthlyAllocations[selectedMonth] || {})[cat.id] || { budget: 0, note: '' };
                        return (
                          <tr key={cat.id} className="border-b hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-medium text-slate-800">{cat.label}</td>
                            <td className="py-1.5 px-3 text-end">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm text-end bg-white border px-1 py-0.5"
                                  value={alloc.budget ? alloc.budget.toLocaleString('vi-VN') : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const raw = Number(e.target.value.replace(/\D/g, '')) || 0;
                                    handleMonthlyCategoryBudgetChange(cat.id, raw);
                                  }}
                                  style={{ height: 26, fontSize: 12 }}
                                />
                              ) : (
                                <span className="font-semibold text-slate-900">{alloc.budget ? `${alloc.budget.toLocaleString('vi-VN')} đ` : '0 đ'}</span>
                              )}
                            </td>
                            <td className="py-1.5 px-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm bg-white border px-1.5 py-0.5"
                                  value={alloc.note || ''}
                                  placeholder="Ghi chú chi tiết..."
                                  onChange={(e) => handleMonthlyCategoryNoteChange(cat.id, e.target.value)}
                                  style={{ height: 26, fontSize: 12 }}
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
          )}
        </WorkflowCard>
      </div>

      {/* ── OFFCANVAS & MODALS ────────────────────────────────────────────── */}

      {/* 1. Add/Edit Content Pillar Offcanvas (Step 2) */}
      <Offcanvas
        isOpen={showAddOffcanvas}
        onClose={() => setShowAddOffcanvas(false)}
        title={editingContentPlanId ? 'Hiệu chỉnh tuyến nội dung' : 'Thêm tuyến nội dung mới'}
        width="400px"
        footer={
          <div className="w-full flex justify-end gap-2">
            <button className="btn btn-sm btn-outline-secondary text-xs" onClick={() => setShowAddOffcanvas(false)}>
              Hủy
            </button>
            <button
              className="btn btn-sm btn-primary text-xs"
              onClick={() => {
                if (editingContentPlanId) {
                  setEditedContentPlan((prev) => ({ ...prev, [editingContentPlanId]: offcanvasData }));
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
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3.5 text-[13px]">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Tuyến nội dung (Pillar)</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={offcanvasData.pillar}
              placeholder="VD: Nhận diện thương hiệu..."
              onChange={(e) => setOffcanvasData({ ...offcanvasData, pillar: e.target.value })}
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mục tiêu (Purpose)</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={offcanvasData.purpose}
              placeholder="VD: Tăng mức độ tin cậy..."
              onChange={(e) => setOffcanvasData({ ...offcanvasData, purpose: e.target.value })}
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Vai trò (Role)</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={offcanvasData.role}
              placeholder="VD: Định vị thương hiệu..."
              onChange={(e) => setOffcanvasData({ ...offcanvasData, role: e.target.value })}
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nội dung chi tiết</label>
            <textarea
              rows={3}
              className="form-control form-control-sm text-[13px]"
              value={offcanvasData.details}
              placeholder="Mô tả các tuyến bài..."
              onChange={(e) => setOffcanvasData({ ...offcanvasData, details: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ngân sách (VNĐ)</label>
              <input
                type="text"
                className="form-control form-control-sm text-[13px] font-semibold"
                value={offcanvasData.budget ? offcanvasData.budget.toLocaleString('vi-VN') : ''}
                onChange={(e) => setOffcanvasData({ ...offcanvasData, budget: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Số lượng bài</label>
              <input
                type="number"
                className="form-control form-control-sm text-[13px]"
                value={offcanvasData.postsCount}
                onChange={(e) => setOffcanvasData({ ...offcanvasData, postsCount: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      </Offcanvas>

      {/* 2. Add/Edit Ad Plan Offcanvas (Step 2) */}
      <Offcanvas
        isOpen={showAdOffcanvas}
        onClose={() => setShowAdOffcanvas(false)}
        title={editingAdPlanId ? 'Hiệu chỉnh mục tiêu quảng cáo' : 'Thêm mục tiêu quảng cáo mới'}
        width="400px"
        footer={
          <div className="w-full flex justify-end gap-2">
            <button className="btn btn-sm btn-outline-secondary text-xs" onClick={() => setShowAdOffcanvas(false)}>
              Hủy
            </button>
            <button
              className="btn btn-sm btn-primary text-xs"
              onClick={() => {
                if (editingAdPlanId) {
                  setEditedAdPlan((prev) => ({ ...prev, [editingAdPlanId]: adOffcanvasData }));
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
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3.5 text-[13px]">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mục tiêu chiến dịch</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={adOffcanvasData.objective}
              placeholder="VD: Tìm kiếm đại lý, mở rộng thị trường..."
              onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, objective: e.target.value })}
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Chủ đề quảng cáo</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={adOffcanvasData.topic}
              placeholder="Chính sách chiết khấu 2026..."
              onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, topic: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kênh triển khai</label>
              <select
                className="form-select form-select-sm text-[13px]"
                value={adOffcanvasData.channel}
                onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, channel: e.target.value })}
              >
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="Youtube Ads">Youtube Ads</option>
                <option value="Đa kênh">Đa kênh</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ngân sách (VNĐ)</label>
              <input
                type="text"
                className="form-control form-control-sm text-[13px] font-semibold"
                value={adOffcanvasData.budget ? adOffcanvasData.budget.toLocaleString('vi-VN') : ''}
                onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, budget: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Thông điệp nội dung</label>
            <textarea
              rows={2}
              className="form-control form-control-sm text-[13px]"
              value={adOffcanvasData.content}
              placeholder="Nội dung truyền thông chính..."
              onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, content: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Khu vực</label>
              <select
                className="form-select form-select-sm text-[13px]"
                value={adOffcanvasData.region}
                onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, region: e.target.value })}
              >
                {VIETNAM_PROVINCES.slice(0, 15).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Người phụ trách</label>
              <input
                type="text"
                className="form-control form-control-sm text-[13px]"
                value={adOffcanvasData.assignee}
                onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, assignee: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Đối tượng mục tiêu</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={adOffcanvasData.audience}
              placeholder="Khách hàng, độ tuổi, hành vi..."
              onChange={(e) => setAdOffcanvasData({ ...adOffcanvasData, audience: e.target.value })}
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
        footer={
          <div className="w-full flex justify-end gap-2">
            <button className="btn btn-sm btn-outline-secondary text-xs" onClick={() => setShowTaskOffcanvas(false)}>
              Hủy
            </button>
            <button
              className="btn btn-sm btn-primary text-xs"
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
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3.5 text-[13px]">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Hạng mục (Pillar)</label>
            <select className="form-select form-select-sm text-[13px]" value={taskPillar} onChange={(e) => setTaskPillar(e.target.value)}>
              <option value="Sản phẩm">Sản phẩm</option>
              <option value="Bán hàng">Bán hàng</option>
              <option value="Nhận diện thương hiệu">Nhận diện thương hiệu</option>
              <option value="Chiến dịch mùa vụ">Chiến dịch mùa vụ</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Chủ đề / Tên nội dung</label>
            <textarea
              rows={2}
              className="form-control form-control-sm text-[13px]"
              value={taskTopic}
              placeholder="Tiêu đề bài viết hoặc video..."
              onChange={(e) => setTaskTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Tuần triển khai trong tháng</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((w) => {
                const isSelected = taskWeeks.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'} text-xs font-bold py-1 px-3`}
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
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Người phụ trách</label>
            <input
              type="text"
              className="form-control form-control-sm text-[13px]"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
            />
          </div>
        </div>
      </Offcanvas>

      {/* 4. Product Modal (Step 3) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h5 className="font-bold text-sm text-slate-800 uppercase">
                Chọn sản phẩm trọng tâm - Tuần {activeProductWeek} (Tháng {selectedMonth})
              </h5>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setShowProductModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-3 border-b">
              <input
                type="text"
                className="form-control form-control-sm text-xs"
                placeholder="Tìm kiếm sản phẩm hoặc danh mục..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 text-xs">
              {productCategories
                .filter((cat: any) => {
                  const name = typeof cat === 'string' ? cat : cat.name || '';
                  return name.toLowerCase().includes(productSearchQuery.toLowerCase());
                })
                .map((cat: any, i) => {
                  const name = typeof cat === 'string' ? cat : cat.name || `Sản phẩm ${i + 1}`;
                  const isChecked = tempSelectedProducts.includes(name);
                  return (
                    <label
                      key={i}
                      className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 border border-slate-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setTempSelectedProducts([...tempSelectedProducts, name]);
                          else setTempSelectedProducts(tempSelectedProducts.filter((n) => n !== name));
                        }}
                      />
                      <span className="font-medium text-slate-800">{name}</span>
                    </label>
                  );
                })}
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
              <button className="btn btn-sm btn-outline-secondary text-xs" onClick={() => setShowProductModal(false)}>
                Đóng
              </button>
              <button
                className="btn btn-sm btn-primary text-xs"
                onClick={() => {
                  if (activeProductWeek !== null) {
                    setMonthlyProducts((prev) => {
                      const mData = prev[selectedMonth] || {};
                      return { ...prev, [selectedMonth]: { ...mData, [activeProductWeek]: tempSelectedProducts } };
                    });
                  }
                  setShowProductModal(false);
                  toast.success('Thành công', 'Đã lưu danh sách sản phẩm trọng tâm.');
                }}
              >
                Xác nhận ({tempSelectedProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Monthly Theme Modal (Step 3) */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h5 className="font-bold text-sm text-slate-800 uppercase">
                Chủ đề & Thông điệp tháng {selectedMonth}
              </h5>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setShowThemeModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Chủ đề chính trong tháng</label>
                <input
                  type="text"
                  className="form-control form-control-sm text-xs font-semibold"
                  value={monthlyThemeTopic}
                  placeholder="VD: SEAJONG – CÔNG NGHỆ HÀN QUỐC CHO KHÔNG GIAN SỐNG..."
                  onChange={(e) => setMonthlyThemeTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Mục tiêu truyền thông trọng tâm</label>
                <textarea
                  rows={3}
                  className="form-control form-control-sm text-xs"
                  value={monthlyThemeContent}
                  placeholder="Mô tả thông điệp truyền thông cốt lõi..."
                  onChange={(e) => setMonthlyThemeContent(e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
              <button className="btn btn-sm btn-outline-secondary text-xs" onClick={() => setShowThemeModal(false)}>
                Hủy
              </button>
              <button
                className="btn btn-sm btn-primary text-xs"
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Holiday Modal (Step 3) */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h5 className="font-bold text-sm text-slate-800 uppercase">
                Thêm ngày lễ trong tháng {selectedMonth}
              </h5>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setShowHolidayModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Ngày (dd/MM)</label>
                <input
                  type="text"
                  className="form-control form-control-sm text-xs"
                  placeholder="VD: 15/08"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Tên ngày lễ / sự kiện</label>
                <input
                  type="text"
                  className="form-control form-control-sm text-xs"
                  placeholder="VD: Lễ Vu Lan báo hiếu..."
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
              <button className="btn btn-sm btn-outline-secondary text-xs" onClick={() => setShowHolidayModal(false)}>
                Hủy
              </button>
              <button
                className="btn btn-sm btn-primary text-xs"
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
              </button>
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
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: 20px;
          min-height: 400px;
          padding: 0 8px 8px 8px;
          min-width: 0;
        }
        .mkt-step1-left {
          border-right: 1px solid var(--border, #e2e8f0);
          padding-right: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .mkt-step1-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .mkt-step4-grid {
          display: grid;
          grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
          gap: 20px;
          min-height: 400px;
          padding: 0 8px 8px 8px;
          min-width: 0;
        }
        .mkt-step4-left {
          border-right: 1px solid var(--border, #e2e8f0);
          padding-right: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .mkt-step4-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
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
          .mkt-step1-grid, .mkt-step4-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .mkt-step1-left, .mkt-step4-left {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid var(--border, #e2e8f0);
            padding-bottom: 16px;
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
