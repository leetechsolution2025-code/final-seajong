import React, { useState, useEffect, useRef } from 'react';
import { StepPage } from '../components/common/StepPage';
import { TableToolbar } from '../components/common/TableToolbar';
import { FullWidthTable } from '../components/common/FullWidthTable';
import { Pagination } from '../components/common/Pagination';
import { Avatar } from '../components/common/Avatar';
import type { ModernStepItem } from '../types';
import {
  MarketingAreaChart,
  type InsightPoint,
} from '../components/marketing/MarketingAreaChart';
import { CreateCampaignOffcanvas } from '../components/marketing/CreateCampaignOffcanvas';
import { ConnectAdsOffcanvas } from '../components/marketing/ConnectAdsOffcanvas';
import { MarketingLeadOffcanvas } from '../components/marketing/MarketingLeadOffcanvas';
import {
  Megaphone,
  People,
  Telephone,
  Envelope,
  GeoAlt,
  CalendarEvent,
  ThreeDotsVertical,
  ArrowClockwise,
  Upload,
  Gear,
} from 'react-bootstrap-icons';
import { Button } from '../components/common/Button';
import { DepartmentActionMenu } from '../components/common/DepartmentActionMenu';
import { useDepartment } from '../context/DepartmentContext';
import { EventOffcanvas } from '../components/common/EventOffcanvas';
import { SalesOverviewPage } from './sales/SalesOverviewPage';
import { FinanceOverviewPage } from './finance/FinanceOverviewPage';
import { FinanceDebtsPage } from './finance/FinanceDebtsPage';
import { FinanceAssetsPage } from './finance/FinanceAssetsPage';
import { LogisticsOverviewPage } from './logistics/LogisticsOverviewPage';

interface CustomerLead {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  group: 'agency' | 'contractor' | 'retail';
  groupLabel: string;
  source: string;
  status: 'consulting' | 'quoted' | 'signed' | 'negotiating';
  statusLabel: string;
}

const INITIAL_CUSTOMERS: CustomerLead[] = [
  {
    id: 'cust-1',
    code: 'KH-2026-081',
    name: 'Công ty Cổ phần Xây dựng & Nội thất An Gia Phát',
    phone: '0912 345 678',
    email: 'angia.decor@gmail.com',
    area: 'Hà Nội',
    group: 'contractor',
    groupLabel: 'Nhà thầu dự án',
    source: 'Showroom & Sự kiện',
    status: 'signed',
    statusLabel: 'Đã ký hợp đồng',
  },
  {
    id: 'cust-2',
    code: 'KH-2026-082',
    name: 'Tổng Đại lý Thiết bị Vệ sinh Minh Long Khánh',
    phone: '0988 765 432',
    email: 'minhlong.faucet@yahoo.com',
    area: 'Hải Phòng',
    group: 'agency',
    groupLabel: 'Đại lý cấp 1',
    source: 'Website & Google Search',
    status: 'quoted',
    statusLabel: 'Đã gửi báo giá',
  },
  {
    id: 'cust-3',
    code: 'KH-2026-083',
    name: 'Kiến trúc sư Đoàn Văn Thái (Thiết kế Villa Flamingo)',
    phone: '0904 888 999',
    email: 'thaidoan.arch@gmail.com',
    area: 'Vĩnh Phúc',
    group: 'contractor',
    groupLabel: 'Nhà thầu dự án',
    source: 'Triển lãm Vietbuild',
    status: 'negotiating',
    statusLabel: 'Đang thương thảo',
  },
  {
    id: 'cust-4',
    code: 'KH-2026-084',
    name: 'Anh Trần Hùng Dũng (Căn hộ Penthouse Ciputra)',
    phone: '0977 123 987',
    email: 'dungtran.invest@gmail.com',
    area: 'Hà Nội',
    group: 'retail',
    groupLabel: 'Khách bán lẻ cao cấp',
    source: 'Facebook Ads',
    status: 'consulting',
    statusLabel: 'Đang tư vấn',
  },
  {
    id: 'cust-5',
    code: 'KH-2026-085',
    name: 'Đại lý Thiết bị Sen Vòi & Bếp Hải Đăng',
    phone: '0936 555 777',
    email: 'haidang.vattu@gmail.com',
    area: 'Quảng Ninh',
    group: 'agency',
    groupLabel: 'Đại lý cấp 1',
    source: 'Đội ngũ Sales thị trường',
    status: 'signed',
    statusLabel: 'Đã ký hợp đồng',
  },
];

export const DepartmentPage: React.FC<{ deptCode?: string }> = ({ deptCode }) => {
  const { activeDeptCode, setActiveMenuKey } = useDepartment();
  const currentDept = (deptCode || activeDeptCode || '').toLowerCase();

  if (currentDept === 'sales' || currentDept === 'kd' || currentDept === 'kinh-doanh') {
    return <SalesOverviewPage />;
  }

  // ── PHÒNG TÀI CHÍNH – KẾ TOÁN (FINANCE) ──
  if (currentDept === 'finance' || currentDept === 'tai-chinh' || currentDept === 'ke-toan') {
    return <FinanceOverviewPage />;
  }

  // ── BỘ PHẬN KHO HÀNG (LOGISTICS / KHO VẬN) ──
  if (currentDept === 'logistics' || currentDept === 'kho' || currentDept === 'kho-hang' || currentDept === 'warehouse') {
    return <LogisticsOverviewPage />;
  }

  // === WORKFLOW STEP STATE ===
  const [currentStep, setCurrentStep] = useState<number>(1);

  // === STEP 1: MARKETING DASHBOARD STATE (TỪ CLIENT-SEAJONG) ===
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [, setLoadingLeads] = useState<boolean>(true);

  // Feed & Chart selection
  const [activeFeedIndex, setActiveFeedIndex] = useState<number>(-1);
  const [chartRange, setChartRange] = useState<'7' | '14' | '30'>('30');
  const [activeListTab, setActiveListTab] = useState<'campaigns' | 'leads'>('campaigns');

  // Offcanvas Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isConnectOpen, setIsConnectOpen] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isEventCalendarOpen, setIsEventCalendarOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Marketing Campaigns & Leads from Backend
  const fetchDashboardData = async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/marketing/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.campaigns && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
        }
      }
    } catch (err) {
      console.error('Error fetching marketing dashboard:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchLeadsData = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/marketing/leads');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeads(data);
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchLeadsData();
  }, []);

  // Compute Active Campaign & Insights for Chart
  const activeCampaignsList = campaigns.filter((c) => c.status?.toUpperCase() === 'ACTIVE');
  const safeCampaign =
    activeFeedIndex >= 0 && activeCampaignsList[activeFeedIndex]
      ? activeCampaignsList[activeFeedIndex]
      : null;

  // Aggregate insights for chart
  const getAggregatedInsights = (): InsightPoint[] => {
    if (safeCampaign) {
      const rawData = safeCampaign.insights?.data || [];
      return rawData;
    }

    // Merge insights across all campaigns by date
    const dateMap: Record<string, InsightPoint> = {};
    campaigns.forEach((c) => {
      const cInsights: InsightPoint[] = c.insights?.data || [];
      cInsights.forEach((i) => {
        const d = i.date_start;
        if (!dateMap[d]) {
          dateMap[d] = {
            date_start: d,
            spend: '0',
            impressions: '0',
            reach: '0',
            leads: '0',
            clicks: '0',
          };
        }
        dateMap[d].spend = (parseFloat(dateMap[d].spend) + (parseFloat(i.spend) || 0)).toString();
        dateMap[d].impressions = (
          parseInt(dateMap[d].impressions, 10) + (parseInt(i.impressions, 10) || 0)
        ).toString();
        dateMap[d].reach = (
          parseInt(dateMap[d].reach, 10) + (parseInt(i.reach, 10) || 0)
        ).toString();
        dateMap[d].leads = (
          parseInt(dateMap[d].leads, 10) + (parseInt(i.leads, 10) || 0)
        ).toString();
        dateMap[d].clicks = (
          parseInt(dateMap[d].clicks, 10) + (parseInt(i.clicks, 10) || 0)
        ).toString();
      });
    });

    return Object.values(dateMap).sort((a, b) => a.date_start.localeCompare(b.date_start));
  };

  const chartInsights = getAggregatedInsights();

  // Metrics for the Feed Row
  const feedTargetCampaign = safeCampaign || campaigns[0] || null;
  const feedDays = feedTargetCampaign?.insights?.data || [];
  const feedToday = feedDays[feedDays.length - 1] || {};
  const feedSpend = parseFloat(feedToday.spend || '0');
  const feedClicks = parseInt(feedToday.clicks || '0', 10);
  const feedImpressions = parseInt(feedToday.impressions || '0', 10);
  const feedLeads = parseInt(feedToday.leads || '0', 10);
  const feedCTR =
    feedImpressions > 0 ? ((feedClicks / feedImpressions) * 100).toFixed(2) + '%' : '3.45%';
  const feedCPA = feedLeads > 0 ? Math.round(feedSpend / feedLeads) : 48000;

  // Handle Campaign Created callback
  const handleCampaignCreated = (newCamp: any) => {
    setCampaigns((prev) => [newCamp, ...prev]);
    fetchDashboardData();
  };

  // Handle Excel Import
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Đã nhận tệp: ${file.name}. Hệ thống đang phân tích số liệu báo cáo chiến dịch!`);
      setTimeout(() => {
        alert('Đồng bộ dữ liệu báo cáo chiến dịch hoàn tất!');
        fetchDashboardData();
      }, 800);
    }
  };

  // === STEP 2: CUSTOMERS STATE ===
  const [customers] = useState<CustomerLead[]>(INITIAL_CUSTOMERS);
  const [custSearch, setCustSearch] = useState('');
  const [custGroup, setCustGroup] = useState('all');
  const [custStatus, setCustStatus] = useState('all');
  const [custPage, setCustPage] = useState(1);
  const [custPageSize, setCustPageSize] = useState(10);

  const filteredCustomers = customers.filter((item) => {
    const matchSearch =
      custSearch === '' ||
      item.name.toLowerCase().includes(custSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(custSearch.toLowerCase()) ||
      item.phone.includes(custSearch) ||
      item.area.toLowerCase().includes(custSearch.toLowerCase());
    const matchGroup = custGroup === 'all' || item.group === custGroup;
    const matchStatus = custStatus === 'all' || item.status === custStatus;
    return matchSearch && matchGroup && matchStatus;
  });

  const pagedCustomers = filteredCustomers.slice(
    (custPage - 1) * custPageSize,
    custPage * custPageSize
  );

  const getCustStatusBadge = (st: CustomerLead['status'], label: string) => {
    switch (st) {
      case 'signed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {label}
          </span>
        );
      case 'quoted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {label}
          </span>
        );
      case 'negotiating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {label}
          </span>
        );
      case 'consulting':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {label}
          </span>
        );
    }
  };

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'marketing-activities',
      title: 'Hoạt động marketing',
      desc: 'Chiến dịch, truyền thông, sự kiện và ấn phẩm',
      icon: <Megaphone size={18} />,
      badge: `${campaigns.length} chiến dịch`,
      badgeVariant: 'brand',
      color: '#e11d48',
    },
    {
      num: 2,
      id: 'customer-list',
      title: 'Danh sách khách hàng',
      desc: 'Khách hàng tiềm năng, đại lý và đối tác',
      icon: <People size={18} />,
      badge: `${customers.length} KH`,
      badgeVariant: 'success',
      color: '#059669',
    },
  ];

  return (
    <StepPage
      title="Marketing"
      description="Xây dựng thương hiệu Seajong, triển khai chiến dịch quảng bá, quản trị tài sản số và sự kiện."
      icon="bi-megaphone"
      color="rose"
      tickerContext={currentStep === 2 ? 'sales' : currentStep === 4 ? 'sales' : 'marketing'}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      stepperExtraRight={
        <div className="flex items-center gap-2 pr-1">
          {/* Nút Lịch sự kiện (Pill button đúng thiết kế ảnh) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEventCalendarOpen(true)}
            leftIcon={<CalendarEvent className="text-blue-600 shrink-0" size={15} />}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:border-slate-300 select-none shrink-0"
            title="Mở Lịch sự kiện Seajong"
          >
            <span className="font-bold text-slate-800 tracking-tight">Lịch sự kiện</span>
          </Button>

          {/* Nút Ba Chấm Dropdown Menu tiện ích dùng chung */}
          <DepartmentActionMenu />
        </div>
      }
    >
      {/* ════════════════════════════════════════════════════════════
          BƯỚC 1: HOẠT ĐỘNG MARKETING
          (Đồng bộ chuẩn client-seajong: Đã loại bỏ TableToolbar, FullWidthTable, Pagination)
          ════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="mkt-live-charts">
          {/* ──── CỘT TRÁI: LIVE CHART & CAMPAIGN PERFORMANCE & FEED ──── */}
          <div className="flex flex-col h-full min-h-0 pr-0 lg:pr-3 overflow-hidden">
            {/* Header Card */}
            <div className="mkt-chart-header">
              <div className="min-w-0 pr-2">
                <h2 className="mkt-chart-title">
                  <i className="bi bi-graph-up-arrow text-emerald-500" />
                  <span className="truncate max-w-[340px]" title={feedTargetCampaign?.name}>
                    Hiệu quả: {feedTargetCampaign?.name || 'Tất cả chiến dịch'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 mb-0 truncate hidden sm:block">
                  Xu hướng tiếp cận, tương tác và chuyển đổi khách hàng tiềm năng.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mkt-chart-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConnectOpen(true)}
                  className="w-8 h-8 !p-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Cấu hình kết nối API & Webhook"
                >
                  <i className="bi bi-gear-fill text-slate-500" />
                </Button>

                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  leftIcon={<i className="bi bi-plus-lg" />}
                  className="px-3.5 py-1.5 rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  Tạo chiến dịch
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 !p-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  title="Import Báo cáo Excel"
                >
                  <i className="bi bi-file-earmark-arrow-up text-emerald-600" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

              </div>
            </div>

            {/* Interactive SVG Area Chart */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/80">
              <MarketingAreaChart
                data={chartInsights}
                range={chartRange}
                onRangeChange={setChartRange}
                campaignName={feedTargetCampaign?.name}
              />
            </div>

            {/* Realtime Active Campaigns Feed */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Cập nhật mới nhất
                </span>

                <div className="flex items-center gap-2">
                  {activeCampaignsList.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveFeedIndex((prev) => Math.max(-1, prev - 1))}
                        disabled={activeFeedIndex === -1}
                        className="w-5 h-5 !p-0 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                      >
                        <i className="bi bi-chevron-left text-[10px]" />
                      </Button>
                      <span className="text-[11px] font-bold text-slate-600 w-11 text-center font-mono">
                        {activeFeedIndex === -1 ? 'Tất cả' : `${activeFeedIndex + 1}/${activeCampaignsList.length}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setActiveFeedIndex((prev) =>
                            Math.min(activeCampaignsList.length - 1, prev + 1)
                          )
                        }
                        disabled={activeFeedIndex >= activeCampaignsList.length - 1}
                        className="w-5 h-5 !p-0 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 border-0 bg-transparent cursor-pointer"
                      >
                        <i className="bi bi-chevron-right text-[10px]" />
                      </Button>
                    </div>
                  )}

                  <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <i
                      className="bi bi-lightning-charge-fill text-emerald-500"
                      style={{ animation: 'pulse-lightning 1.5s infinite' }}
                    />
                    KẾT NỐI TỨC THÌ
                  </span>
                </div>
              </div>

              {/* Feed metrics row */}
              <div className="mkt-campaign-feed-row p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {feedTargetCampaign?.platform === 'facebook' ? (
                      <i className="bi bi-facebook text-blue-600 text-sm" />
                    ) : feedTargetCampaign?.platform === 'tiktok' ? (
                      <i className="bi bi-tiktok text-slate-900 text-sm" />
                    ) : feedTargetCampaign?.platform === 'youtube' ? (
                      <i className="bi bi-youtube text-red-600 text-sm" />
                    ) : feedTargetCampaign?.platform === 'instagram' ? (
                      <i className="bi bi-instagram text-pink-600 text-sm" />
                    ) : (
                      <i className="bi bi-globe text-slate-500 text-sm" />
                    )}
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {feedTargetCampaign?.name || 'Chiến dịch Seajong ERP'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <i className="bi bi-bullseye text-emerald-600" />
                      Mục tiêu: {feedTargetCampaign?.objective || 'Lượt tương tác'}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="bi bi-eye" />
                      {feedImpressions.toLocaleString('vi-VN')} hiển thị
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="bi bi-cursor" />
                      CTR: {feedCTR}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="bi bi-wallet2" />
                      CPA: {feedCPA.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                </div>

                <div className="mkt-campaign-metrics">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Hôm nay chi</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {Math.round(feedSpend / 1000).toLocaleString('vi-VN')}k
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Clicks mới</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {feedClicks.toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold mb-0.5">Tốc độ Lead</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-600 flex items-center justify-end gap-1">
                      <i className="bi bi-person-plus-fill text-xs" />
                      +{feedLeads}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── CỘT PHẢI: BẢNG CHIẾN DỊCH TỔNG HỢP & DỮ LIỆU KHÁCH HÀNG ──── */}
          <div className="flex flex-col h-full min-h-0 pl-0 lg:pl-3 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <Button
                  variant={activeListTab === 'campaigns' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveListTab('campaigns')}
                  leftIcon={<i className="bi bi-megaphone-fill text-blue-600" />}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${activeListTab === 'campaigns'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                  Chiến dịch quảng cáo
                </Button>

                <Button
                  variant={activeListTab === 'leads' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveListTab('leads')}
                  leftIcon={<i className="bi bi-people-fill text-emerald-600" />}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${activeListTab === 'leads'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                    }`}
                >
                  Dữ liệu khách hàng
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {activeListTab === 'campaigns'
                    ? `${campaigns.length} chiến dịch`
                    : `${leads.length} leads`}
                </span>
              </div>
            </div>

            {/* Content List Area */}
            <div className="flex-1 overflow-y-auto min-h-0 pt-2 space-y-1">
              {activeListTab === 'campaigns' ? (
                loadingCampaigns ? (
                  <div className="p-8 text-center text-slate-400">
                    <i className="bi bi-arrow-repeat text-2xl animate-spin block mb-2" />
                    <span className="text-xs">Đang tải dữ liệu chiến dịch...</span>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <i className="bi bi-inbox text-3xl block mb-2 opacity-50" />
                    <span className="text-xs font-semibold">Chưa có chiến dịch nào</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {campaigns.map((c, i) => {
                      const days = c.insights?.data || [];
                      const totalSpend = days.reduce(
                        (a: number, d: any) => a + (parseFloat(d.spend) || 0),
                        0
                      );
                      const isSelected =
                        feedTargetCampaign?.id === c.id ||
                        (activeFeedIndex === -1 && i === 0);

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            const foundIdx = activeCampaignsList.findIndex((item) => item.id === c.id);
                            setActiveFeedIndex(foundIdx >= 0 ? foundIdx : 0);
                          }}
                          className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${isSelected
                              ? 'bg-blue-50/60 border border-blue-200/80 shadow-2xs'
                              : 'hover:bg-slate-50 border border-transparent'
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {c.platform === 'facebook' ? (
                                <i className="bi bi-facebook text-blue-600 text-sm" />
                              ) : c.platform === 'tiktok' ? (
                                <i className="bi bi-tiktok text-slate-900 text-sm" />
                              ) : c.platform === 'youtube' ? (
                                <i className="bi bi-youtube text-red-600 text-sm" />
                              ) : c.platform === 'instagram' ? (
                                <i className="bi bi-instagram text-pink-600 text-sm" />
                              ) : (
                                <i className="bi bi-globe text-slate-500 text-sm" />
                              )}
                              <span className="text-xs font-bold text-slate-900 truncate" title={c.name}>
                                {c.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>{days.length} ngày báo cáo</span>
                              <span>•</span>
                              <span className="capitalize">{c.platform || 'Ads'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status?.toUpperCase() === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                                style={{
                                  animation:
                                    c.status?.toUpperCase() === 'ACTIVE'
                                      ? 'status-pulse-dot 2s infinite'
                                      : 'none',
                                }}
                              />
                              {c.status?.toUpperCase() === 'ACTIVE' ? 'Đang chạy' : 'Hoàn thành'}
                            </span>

                            <span className="text-xs font-extrabold font-mono text-slate-800 text-right min-w-[80px]">
                              {Math.round(totalSpend).toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <i className="bi bi-inbox text-3xl block mb-2 opacity-50" />
                  <span className="text-xs font-semibold">Chưa có lead khách hàng nào</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {leads.map((l) => {
                    const lName = l.fullName || 'Khách hàng';
                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLead(l)}
                        className="p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {lName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {lName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {l.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <i className="bi bi-telephone text-[10px]" />
                                  {l.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 block mb-0.5">
                            {l.campaign?.name || l.source || 'Facebook Ads'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(l.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Offcanvas Modals */}
          <CreateCampaignOffcanvas
            open={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSuccess={handleCampaignCreated}
          />

          <ConnectAdsOffcanvas
            open={isConnectOpen}
            onClose={() => setIsConnectOpen(false)}
          />

          <MarketingLeadOffcanvas
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          BƯỚC 2: DANH SÁCH KHÁCH HÀNG
          ════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="flex flex-col h-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* TableToolbar */}
          <TableToolbar
            showMenu={false}
            searchValue={custSearch}
            onSearchChange={(val) => {
              setCustSearch(val);
              setCustPage(1);
            }}
            searchPlaceholder="Tìm theo tên khách hàng, số điện thoại, khu vực..."
            searchMinWidth="260px"
            filters={[
              {
                id: 'cust-group-filter',
                value: custGroup,
                onChange: (val) => {
                  setCustGroup(val);
                  setCustPage(1);
                },
                minWidth: '180px',
                options: [
                  { label: 'Tất cả phân nhóm', value: 'all' },
                  { label: 'Đại lý cấp 1', value: 'agency' },
                  { label: 'Nhà thầu dự án', value: 'contractor' },
                  { label: 'Khách bán lẻ cao cấp', value: 'retail' },
                ],
              },
              {
                id: 'cust-status-filter',
                value: custStatus,
                onChange: (val) => {
                  setCustStatus(val);
                  setCustPage(1);
                },
                minWidth: '180px',
                options: [
                  { label: 'Tất cả trạng thái', value: 'all' },
                  { label: 'Đang tư vấn', value: 'consulting' },
                  { label: 'Đã gửi báo giá', value: 'quoted' },
                  { label: 'Đang thương thảo', value: 'negotiating' },
                  { label: 'Đã ký hợp đồng', value: 'signed' },
                ],
              },
            ]}
            onExportExcel={() => alert('Đang xuất danh sách khách hàng & đối tác Seajong ra Excel')}
            rightActions={
              <Button
                variant="primary"
                size="sm"
                onClick={() => alert('Mở form tiếp nhận khách hàng mới')}
                leftIcon={<i className="bi bi-plus-lg text-sm" />}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-0"
              >
                Thêm khách hàng
              </Button>
            }
          />

          {/* FullWidthTable */}
          <FullWidthTable>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold text-slate-600 w-28">MÃ KH</th>
                  <th className="py-3 px-4 font-bold text-slate-600">KHÁCH HÀNG / DOANH NGHIỆP</th>
                  <th className="py-3 px-4 font-bold text-slate-600">LIÊN HỆ</th>
                  <th className="py-3 px-4 font-bold text-slate-600">KHU VỰC</th>
                  <th className="py-3 px-4 font-bold text-slate-600">NHÓM KH</th>
                  <th className="py-3 px-4 font-bold text-slate-600">NGUỒN TIẾP CẬN</th>
                  <th className="py-3 px-4 font-bold text-slate-600 text-center">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Không tìm thấy khách hàng phù hợp
                    </td>
                  </tr>
                ) : (
                  pagedCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {cust.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={cust.name} size="sm" />
                          <span className="font-bold text-slate-900">{cust.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-slate-700 flex items-center gap-1.5">
                            <Telephone size={12} className="text-slate-400" />
                            {cust.phone}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Envelope size={12} className="text-slate-400" />
                            {cust.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <GeoAlt size={12} className="text-slate-400" />
                          {cust.area}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {cust.groupLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-medium">
                        {cust.source}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getCustStatusBadge(cust.status, cust.statusLabel)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </FullWidthTable>

          {/* Pagination */}
          <Pagination
            currentPage={custPage}
            totalItems={filteredCustomers.length}
            pageSize={custPageSize}
            onPageChange={setCustPage}
            onPageSizeChange={(newSize) => {
              setCustPageSize(newSize);
              setCustPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
            itemName="khách hàng"
          />
        </div>
      )}

      {/* ── Offcanvas Lịch Sự Kiện Đa Năng Chuẩn client-skydoor ── */}
      <EventOffcanvas
        isOpen={isEventCalendarOpen}
        onClose={() => setIsEventCalendarOpen(false)}
      />
    </StepPage>
  );
};

export default DepartmentPage;
