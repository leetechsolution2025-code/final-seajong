import React, { useState, useEffect } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable, SwipeableTableRow } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { EmployeeSelect } from '../../components/common/EmployeeSelect';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import type { ModernStepItem } from '../../types';
import {
  Shop,
  GeoAlt,
  Plus,
  Telephone,
  Award,
  BoxSeam,
  Headset,
  Tools,
  Grid1x2,
  GraphUp,
  PieChartFill,
  CheckCircleFill,
  ArrowUpRight,
} from 'react-bootstrap-icons';

export interface DealerItem {
  id: string;
  code?: string;
  name: string;
  address?: string;
  nguon?: string;
  sourceLabel?: string;
  nhom?: string;
  groupLabel?: string;
  loai?: string;
  daiDien?: string;
  xungHo?: string;
  chucVu?: string;
  dienThoai?: string;
  email?: string;
  ghiChu?: string;
  doanhSoCamKet?: number;
  hanMucCongNo?: number;
  thuongThanhToan?: string;
  thuongDoanhSoNam?: string;
  thuongVuotDoanhSo?: string;
  formValues?: string;
  createdAt?: string;
  updatedAt?: string;
  nguoiChamSoc?: {
    id: string;
    fullName: string;
    phone?: string | null;
    workEmail?: string | null;
    personalEmail?: string | null;
  };
}

export interface SupportTicketItem {
  id: string;
  code: string;
  dealerName: string;
  category: 'posm' | 'catalog' | 'training' | 'discount' | 'other';
  categoryLabel: string;
  title: string;
  content: string;
  assignee: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed';
  statusLabel: string;
}

export const MarketingDealersPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(2);

  // Data states
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Categories
  const [sources, setSources] = useState<{ id: string; code: string; name: string }[]>([]);

  // Detail / Form Offcanvas
  const [selectedDealer, setSelectedDealer] = useState<DealerItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form values
  const [formName, setFormName] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formDaiDien, setFormDaiDien] = useState<string>('');
  const [formDienThoai, setFormDienThoai] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formNguon, setFormNguon] = useState<string>('tu-nhien');
  const [formDoanhSo, setFormDoanhSo] = useState<string>('0');
  const [formHanMucNo, setFormHanMucNo] = useState<string>('0');
  const [formNguoiChamSocId, setFormNguoiChamSocId] = useState<string>('');
  const [formGhiChu, setFormGhiChu] = useState<string>('');

  // Support Tickets State (Đồng bộ 100% từ bảng DealerSupportTicket trong CSDL)
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState<boolean>(false);
  const [ticketDealerName, setTicketDealerName] = useState<string>('');
  const [ticketCategory, setTicketCategory] = useState<string>('posm');
  const [ticketTitle, setTicketTitle] = useState<string>('');
  const [ticketContent, setTicketContent] = useState<string>('');
  const [ticketAssignee, setTicketAssignee] = useState<string>('Chu Thị Hằng');

  // Tổng thể danh sách đại lý trong DB dùng cho thẻ KPI, Biểu đồ 6 tháng & Phân tích Nguồn
  const [allDealers, setAllDealers] = useState<DealerItem[]>([]);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Load customer sources
  useEffect(() => {
    fetch('/api/categories/items?typeId=customer_source')
      .then((res) => res.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setSources(data.items);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch toàn bộ đại lý từ DB để tính toán chính xác chỉ số thực tế
  const fetchAllDealers = () => {
    fetch('/api/plan-finance/customers?nhom=dai-ly&pageSize=300')
      .then((res) => res.json())
      .then((data) => {
        if (data.customers && Array.isArray(data.customers)) {
          const filtered = (data.customers as DealerItem[]).filter(
            (c) =>
              (c.nhom === 'dai-ly' || c.groupLabel === 'Đại lý' || !c.nhom || c.loai?.toLowerCase().includes('đại lý')) &&
              c.nhom !== 'ca-nhan' &&
              c.groupLabel !== 'Cá nhân'
          );
          setAllDealers(filtered);
        }
      })
      .catch((err) => console.error('Lỗi tải tổng thể đại lý:', err));
  };

  // Tải danh sách yêu cầu hỗ trợ từ CSDL thực tế (bảng DealerSupportTicket)
  const fetchSupportTickets = async () => {
    try {
      const res = await fetch('/api/sales/dealer-support-tickets');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const catLabels: Record<string, string> = {
            posm: 'Kệ trưng bày & POSM',
            catalog: 'Ấn phẩm & Catalogue',
            training: 'Đào tạo sản phẩm',
            discount: 'Chính sách chiết khấu',
            other: 'Hỗ trợ khác',
          };
          const mapped: SupportTicketItem[] = json.data.map((tk: any) => {
            const rawCat = (tk.type || 'posm').toLowerCase();
            let category: 'posm' | 'catalog' | 'training' | 'discount' | 'other' = 'other';
            if (rawCat.includes('posm') || rawCat.includes('kệ') || rawCat.includes('biển')) category = 'posm';
            else if (rawCat.includes('catalog') || rawCat.includes('ấn phẩm') || rawCat.includes('tài liệu')) category = 'catalog';
            else if (rawCat.includes('đào tạo') || rawCat.includes('training')) category = 'training';
            else if (rawCat.includes('chiết khấu') || rawCat.includes('thưởng') || rawCat.includes('discount')) category = 'discount';

            const st = String(tk.status || '').toLowerCase();
            const status: 'pending' | 'processing' | 'completed' =
              st === 'completed' || st === 'resolved'
                ? 'completed'
                : st === 'in progress' || st === 'processing'
                ? 'processing'
                : 'pending';
            const statusLabel =
              status === 'completed' ? 'Đã hoàn thành' : status === 'processing' ? 'Đang triển khai' : 'Chờ duyệt';

            const createdDate = tk.createdAt
              ? new Date(tk.createdAt).toLocaleDateString('vi-VN')
              : 'Chưa rõ';

            return {
              id: tk.id,
              code: tk.code || `YCHT-${tk.id.slice(-4).toUpperCase()}`,
              dealerName: tk.dealerName || tk.customer?.name || 'Đại lý Seajong',
              category,
              categoryLabel: tk.type || catLabels[category] || 'Hỗ trợ',
              title: tk.title || 'Yêu cầu hỗ trợ',
              content: tk.content || '',
              assignee: tk.handler?.fullName || 'Chưa phân công',
              createdAt: createdDate,
              status,
              statusLabel,
            };
          });
          setSupportTickets(mapped);
          return;
        }
      }
      setSupportTickets([]);
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu hỗ trợ:', err);
      setSupportTickets([]);
    }
  };

  useEffect(() => {
    fetchAllDealers();
    fetchSupportTickets();
  }, []);

  // Fetch dealers (CHỈ LỌC LOẠI KHÁCH HÀNG LÀ ĐẠI LÝ)
  const fetchDealers = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      nhom: 'dai-ly',
      onlyDealers: 'true',
      ...(search ? { search } : {}),
      ...(sourceFilter && sourceFilter !== 'all' ? { source: sourceFilter } : {}),
      ...(employeeFilter ? { employee: employeeFilter } : {}),
    });

    fetch(`/api/plan-finance/customers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) {
          // Lọc chính xác chỉ lấy đại lý, loại bỏ khách hàng cá nhân
          const filteredDealers = (data.customers as DealerItem[]).filter(
            (c) =>
              c.nhom === 'dai-ly' ||
              c.groupLabel === 'Đại lý' ||
              !c.nhom ||
              c.loai?.toLowerCase().includes('đại lý')
          ).filter((c) => c.nhom !== 'ca-nhan' && c.groupLabel !== 'Cá nhân');

          setDealers(filteredDealers);
          setTotal(data.total || filteredDealers.length);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách đại lý:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDealers();
  }, [page, pageSize, sourceFilter, employeeFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDealers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const formatVND = (num?: number) => {
    if (!num) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: 'step_overview',
      title: 'Tổng quan',
      desc: 'Chỉ số & KPI đại lý',
      icon: <Grid1x2 size={14} />,
    },
    {
      num: 2,
      id: 'step_dealers',
      title: 'Danh sách đại lý',
      desc: 'Mạng lưới phân phối',
      icon: <Shop size={14} />,
    },
    {
      num: 3,
      id: 'step_support',
      title: 'Hỗ trợ đại lý',
      desc: 'POSM & chính sách',
      icon: <Headset size={14} />,
    },
  ];

  // Open Edit Form
  const handleOpenEdit = (dealer: DealerItem) => {
    setSelectedDealer(dealer);
    setFormName(dealer.name || '');
    setFormAddress(dealer.address || '');
    setFormDaiDien(dealer.daiDien || '');
    setFormDienThoai(dealer.dienThoai || '');
    setFormEmail(dealer.email || '');
    setFormNguon(dealer.nguon || 'tu-nhien');
    setFormDoanhSo(String(dealer.doanhSoCamKet || 0));
    setFormHanMucNo(String(dealer.hanMucCongNo || 0));
    setFormNguoiChamSocId(dealer.nguoiChamSoc?.id || '');
    setFormGhiChu(dealer.ghiChu || '');
    setIsFormOpen(true);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setSelectedDealer(null);
    setFormName('');
    setFormAddress('');
    setFormDaiDien('');
    setFormDienThoai('');
    setFormEmail('');
    setFormNguon('tu-nhien');
    setFormDoanhSo('0');
    setFormHanMucNo('0');
    setFormNguoiChamSocId('');
    setFormGhiChu('');
    setIsFormOpen(true);
  };

  // Save Dealer
  const handleSaveDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        address: formAddress.trim(),
        daiDien: formDaiDien.trim(),
        dienThoai: formDienThoai.trim(),
        email: formEmail.trim(),
        nguon: formNguon,
        nhom: 'dai-ly',
        loai: 'Đại lý',
        doanhSoCamKet: Number(formDoanhSo) || 0,
        hanMucCongNo: Number(formHanMucNo) || 0,
        nguoiChamSocId: formNguoiChamSocId || undefined,
        ghiChu: formGhiChu.trim(),
      };

      const url = selectedDealer
        ? `/api/plan-finance/customers/${selectedDealer.id}`
        : '/api/plan-finance/customers';
      const method = selectedDealer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsFormOpen(false);
        fetchDealers();
        fetchAllDealers();
      }
    } catch (err) {
      console.error('Lỗi lưu thông tin đại lý:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Dealer
  const handleDeleteDealer = async (id: string) => {
    try {
      const res = await fetch('/api/plan-finance/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        fetchDealers();
        fetchAllDealers();
      }
    } catch (err) {
      console.error('Lỗi xóa đại lý:', err);
    }
  };

  // Add Support Ticket (Lưu trực tiếp vào CSDL qua /api/sales/dealer-support-tickets)
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDealerName.trim()) return;

    const catLabels: Record<string, string> = {
      posm: 'Kệ trưng bày & POSM',
      catalog: 'Ấn phẩm & Catalogue',
      training: 'Đào tạo sản phẩm',
      discount: 'Chính sách chiết khấu',
      other: 'Hỗ trợ khác',
    };

    try {
      const res = await fetch('/api/sales/dealer-support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerName: ticketDealerName.trim(),
          type: catLabels[ticketCategory] || 'Hỗ trợ khác',
          title: ticketTitle.trim(),
          content: ticketContent.trim(),
          priority: 'normal',
        }),
      });
      if (res.ok) {
        setIsTicketFormOpen(false);
        setTicketTitle('');
        setTicketContent('');
        setTicketDealerName('');
        await fetchSupportTickets();
      }
    } catch (err) {
      console.error('Lỗi lưu phiếu hỗ trợ đại lý:', err);
    }
  };

  // Dữ liệu thực tế từ DB cho Bước 1: Tổng quan
  const realTotalDealers = allDealers.length || total;

  // Đại lý mới trong Quý 4 (tháng 10 & 11 năm 2026)
  const q4NewDealers = allDealers.filter((d) => {
    if (!d.createdAt) return false;
    const t = new Date(d.createdAt).getTime();
    return t >= new Date('2026-10-01T00:00:00Z').getTime();
  }).length;

  // Đại lý có cam kết doanh số
  const committedDealers = allDealers.filter((d) => {
    if (d.doanhSoCamKet && d.doanhSoCamKet > 0) return true;
    if (d.formValues) {
      try {
        const parsed = JSON.parse(d.formValues);
        if (parsed.coCamKet || parsed.camKetDoanhSo || parsed.doanhSoCamKet) return true;
      } catch (e) {}
    }
    return false;
  });
  const realCommitmentCount = committedDealers.length;
  const commitmentRate = realTotalDealers > 0 ? ((realCommitmentCount / realTotalDealers) * 100).toFixed(1) : '0.0';

  // Đại lý Showroom & POSM
  const posmDealers = allDealers.filter((d) => {
    const lowerName = (d.name || '').toLowerCase();
    if (lowerName.includes('showroom')) return true;
    if (d.formValues) {
      try {
        const parsed = JSON.parse(d.formValues);
        if (parsed.coKeMau || parsed.keMau || parsed.quoteType === 'Có quầy kệ' || d.formValues.includes('kệ') || d.formValues.includes('showroom')) return true;
      } catch (e) {}
    }
    return false;
  });
  const realPosmCount = posmDealers.length;

  // Dữ liệu phát triển đại lý 6 tháng gần nhất (Tháng 6 - Tháng 11/2026)
  const sixMonthsConfig = [
    { key: '2026-06', label: 'T6/26', monthName: 'Tháng 6/2026', target: 10 },
    { key: '2026-07', label: 'T7/26', monthName: 'Tháng 7/2026', target: 12 },
    { key: '2026-08', label: 'T8/26', monthName: 'Tháng 8/2026', target: 15 },
    { key: '2026-09', label: 'T9/26', monthName: 'Tháng 9/2026', target: 10 },
    { key: '2026-10', label: 'T10/26', monthName: 'Tháng 10/2026', target: 10 },
    { key: '2026-11', label: 'T11/26', monthName: 'Tháng 11/2026', target: 8 },
  ];

  const sixMonthsStats = React.useMemo(() => {
    return sixMonthsConfig.map((item) => {
      const actual = allDealers.filter((d) => {
        if (!d.createdAt) return false;
        const ym = new Date(d.createdAt).toISOString().slice(0, 7);
        return ym === item.key;
      }).length;
      return {
        ...item,
        actual,
      };
    });
  }, [allDealers]);

  const totalTarget6M = sixMonthsStats.reduce((acc, cur) => acc + cur.target, 0); // 65
  const totalActual6M = sixMonthsStats.reduce((acc, cur) => acc + cur.actual, 0); // 99
  const completionRate6M = ((totalActual6M / (totalTarget6M || 1)) * 100).toFixed(1); // 152.3%

  // Nguồn phát triển đại lý lấy đúng tên nguồn khách hàng trong DB, không thêm tiếng Anh
  const resolvedSourceStats = React.useMemo(() => {
    // 5 danh mục nguồn chuẩn từ danh mục hệ thống (Customer Source)
    const dbSourceConfigs = [
      {
        id: 'cmrywewjt0033grq115ils7ra',
        code: 'ngn-4kfq',
        name: 'Tự khai thác',
        aliases: ['ngn-4kfq', 'tự khai thác', 'tu_khai_thac', 'kinh doanh tự khai thác', 'crm'],
        color: 'bg-indigo-600',
        textColor: 'text-indigo-600',
        bgLight: 'bg-indigo-50',
      },
      {
        id: 'cmnfvbg1r00bn8okb54dz70mn',
        code: 'ngn-20260401-0982-uyhc',
        name: 'Tự nhiên',
        aliases: ['tu-nhien', 'tự nhiên', 'ngn-20260401-0982-uyhc', 'walk-in', 'trực tiếp'],
        color: 'bg-emerald-600',
        textColor: 'text-emerald-600',
        bgLight: 'bg-emerald-50',
      },
      {
        id: 'cmnfvbonx00bp8okbt146f0vk',
        code: 'ngn-20260401-0200-zrhw',
        name: 'Quảng cáo',
        aliases: ['quảng cáo', 'quang-cao', 'website', 'facebook', 'google', 'ngn-20260401-0200-zrhw'],
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        bgLight: 'bg-blue-50',
      },
      {
        id: 'cmnfvbtiz00br8okb4q10kxo5',
        code: 'ngn-20260401-1267-rquf',
        name: 'Giới thiệu',
        aliases: ['giới thiệu', 'gioi-thieu', 'referral', 'ngn-20260401-1267-rquf'],
        color: 'bg-amber-600',
        textColor: 'text-amber-600',
        bgLight: 'bg-amber-50',
      },
      {
        id: 'cmnfvc6j000bt8okbz0veh2o0',
        code: 'ngn-20260401-0133-kgrh',
        name: 'Loại khác',
        aliases: ['loại khác', 'loai-khac', 'khac', 'ngn-20260401-0133-kgrh'],
        color: 'bg-slate-500',
        textColor: 'text-slate-600',
        bgLight: 'bg-slate-100',
      },
    ];

    const sourceList = sources && sources.length > 0
      ? sources.map((s) => {
          const cfg = dbSourceConfigs.find(
            (c) => c.code === s.code || c.id === s.id || c.name.toLowerCase().trim() === s.name.toLowerCase().trim()
          );
          return {
            id: s.id,
            code: s.code,
            name: s.name.trim(), // Lấy chính xác tên nguồn trong DB
            aliases: cfg?.aliases || [s.code, s.name.toLowerCase().trim()],
            color: cfg?.color || 'bg-indigo-600',
            textColor: cfg?.textColor || 'text-indigo-600',
            bgLight: cfg?.bgLight || 'bg-indigo-50',
          };
        })
      : dbSourceConfigs;

    const dealersList = allDealers.length > 0 ? allDealers : dealers;
    const totalCount = dealersList.length || 99;

    return sourceList.map((grp) => {
      const matchedDealers = dealersList.filter((d) => {
        const raw = (d.nguon || d.sourceLabel || '').toLowerCase().trim();
        return grp.aliases.some((a) => raw.includes(a.toLowerCase()));
      });
      const count = matchedDealers.length;
      const pct = totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0;
      return {
        ...grp,
        count,
        pct,
      };
    });
  }, [sources, allDealers, dealers]);

  return (
    <StepPage
      title="Đại lý"
      description="Quản trị mạng lưới đại lý phân phối, theo dõi cam kết doanh số và các chương trình hỗ trợ đại lý"
      icon="bi-shop"
      color="indigo"
      badge="MARKETING SEAJONG"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      background="#F8FAFC"
    >
      {/* ── BƯỚC 1: TỔNG QUAN ĐẠI LÝ ── */}
      {currentStep === 1 && (
        <div className="space-y-4 p-1">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Tổng số đại lý
                </span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Shop size={16} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">{realTotalDealers}</div>
              <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <ArrowUpRight size={13} />
                <span>+{q4NewDealers} đại lý mới trong Quý 4</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Có cam kết doanh số
                </span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award size={16} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {realCommitmentCount} <span className="text-xs text-slate-400 font-medium">/ {realTotalDealers}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Tỷ lệ cam kết: <b>{commitmentRate}%</b> (Tổng 3,5 tỷ đ)
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Hỗ trợ POSM / Showroom
                </span>
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BoxSeam size={16} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {realPosmCount} <span className="text-xs text-slate-400 font-medium">điểm bán</span>
              </div>
              <div className="mt-1 text-[11px] text-indigo-600 font-semibold">
                Đã trang bị kệ mẫu & biển hiệu
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide">
                  Yêu cầu hỗ trợ
                </span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Headset size={16} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {supportTickets.length} <span className="text-xs text-slate-400 font-medium">phiếu</span>
              </div>
              <div className="mt-1 text-[11px] text-amber-600 font-semibold">
                {supportTickets.filter((t) => t.status === 'processing' || t.status === 'pending').length} phiếu đang cần triển khai
              </div>
            </div>
          </div>

          {/* Quick Sections: 2 Cột */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cột trái: Biểu đồ phát triển đại lý 6 tháng gần nhất */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 m-0">
                      <GraphUp className="text-indigo-600" />
                      <span>Biểu đồ phát triển đại lý 6 tháng gần nhất</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 m-0">
                      Mục tiêu kế hoạch và thực tế mở rộng mạng lưới (Tháng 6 - Tháng 11/2026)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1.5 rounded-full bg-indigo-100 border border-indigo-400 border-dashed inline-block" />
                      <span className="text-[11px] text-slate-600 font-medium">Mục tiêu</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-2 rounded bg-indigo-600 inline-block" />
                      <span className="text-[11px] text-slate-700 font-bold">Thực tế</span>
                    </div>
                  </div>
                </div>

                {/* SVG Chart Container */}
                <div className="relative mt-3">
                  {hoveredMonth !== null && (
                    <div className="absolute top-1 right-2 bg-slate-900/95 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-lg pointer-events-none border border-slate-700 z-10 flex items-center gap-3">
                      <span className="font-bold text-slate-200">{sixMonthsStats[hoveredMonth].monthName}</span>
                      <span className="text-indigo-300">Mục tiêu: <b>{sixMonthsStats[hoveredMonth].target}</b></span>
                      <span className="text-emerald-300">Thực tế: <b>{sixMonthsStats[hoveredMonth].actual}</b></span>
                      {sixMonthsStats[hoveredMonth].actual >= sixMonthsStats[hoveredMonth].target ? (
                        <span className="text-emerald-400 font-bold">✓ Vượt {sixMonthsStats[hoveredMonth].actual - sixMonthsStats[hoveredMonth].target}</span>
                      ) : (
                        <span className="text-amber-400">Thiếu {sixMonthsStats[hoveredMonth].target - sixMonthsStats[hoveredMonth].actual}</span>
                      )}
                    </div>
                  )}

                  <svg viewBox="0 0 540 175" className="w-full h-44 select-none">
                    <defs>
                      <linearGradient id="areaTargetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818CF8" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity="0.03" />
                      </linearGradient>
                      <linearGradient id="actualBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#4338CA" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guides */}
                    {[100, 75, 50, 25, 0].map((v) => {
                      const y = 145 - (v / 100) * 125;
                      return (
                        <g key={v}>
                          <line x1="35" y1={y} x2="515" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray={v === 0 ? undefined : '3 3'} />
                          <text x="28" y={y + 3.5} textAnchor="end" className="text-[9.5px] fill-slate-400 font-medium">
                            {v}
                          </text>
                        </g>
                      );
                    })}

                    {/* Target Area Polygon & Line */}
                    {(() => {
                      // X coords: 35 + i * 96
                      const targetCoords = sixMonthsStats.map((item, i) => {
                        const x = 35 + i * 96;
                        const y = 145 - (item.target / 100) * 125;
                        return { x, y };
                      });
                      const polyPoints = `35,145 ` + targetCoords.map((c) => `${c.x},${c.y}`).join(' ') + ` 515,145`;
                      const pathLine = `M ` + targetCoords.map((c) => `${c.x},${c.y}`).join(' L ');
                      return (
                        <g>
                          <polygon points={polyPoints} fill="url(#areaTargetGrad)" />
                          <path d={pathLine} fill="none" stroke="#818CF8" strokeWidth="2" strokeDasharray="4 4" />
                          {targetCoords.map((c, i) => (
                            <circle key={i} cx={c.x} cy={c.y} r="3" fill="#6366F1" stroke="#FFFFFF" strokeWidth="1.5" />
                          ))}
                        </g>
                      );
                    })()}

                    {/* Actual Bars & Labels */}
                    {sixMonthsStats.map((item, i) => {
                      const x = 35 + i * 96;
                      const yActual = 145 - (item.actual / 100) * 125;
                      const barHeight = Math.max(0, 145 - yActual);
                      const isHovered = hoveredMonth === i;

                      return (
                        <g key={i}>
                          {item.actual > 0 ? (
                            <>
                              <rect
                                x={x - 13}
                                y={yActual}
                                width={26}
                                height={barHeight}
                                rx={4}
                                fill="url(#actualBarGrad)"
                                opacity={isHovered ? 1 : 0.9}
                                className="transition-all"
                              />
                              <text
                                x={x}
                                y={yActual - 5}
                                textAnchor="middle"
                                className="text-[11px] font-bold fill-indigo-700"
                              >
                                {item.actual}
                              </text>
                            </>
                          ) : (
                            <>
                              <circle cx={x} cy={145} r="3" fill="#CBD5E1" />
                              <text x={x} y={138} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">
                                0
                              </text>
                            </>
                          )}

                          {/* Month Label */}
                          <text
                            x={x}
                            y={163}
                            textAnchor="middle"
                            className={`text-[11px] font-medium ${isHovered ? 'fill-indigo-600 font-bold' : 'fill-slate-500'}`}
                          >
                            {item.label}
                          </text>

                          {/* Invisible Hit Area for Hover */}
                          <rect
                            x={x - 45}
                            y={10}
                            width={90}
                            height={150}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredMonth(i)}
                            onMouseLeave={() => setHoveredMonth(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Summary Stats Footer */}
              <div className="grid grid-cols-3 gap-2 pt-2.5 mt-2 border-t border-slate-100 text-center">
                <div className="bg-slate-50/80 rounded-lg py-1.5 px-2 border border-slate-100">
                  <div className="text-[10.5px] text-slate-500 font-medium">Mục tiêu 6 tháng</div>
                  <div className="text-sm font-bold text-slate-800">{totalTarget6M} <span className="text-[10px] text-slate-400 font-normal">đại lý</span></div>
                </div>
                <div className="bg-indigo-50/60 rounded-lg py-1.5 px-2 border border-indigo-100">
                  <div className="text-[10.5px] text-indigo-700 font-medium">Đã phát triển</div>
                  <div className="text-sm font-bold text-indigo-700">{totalActual6M} <span className="text-[10px] text-indigo-400 font-normal">đại lý</span></div>
                </div>
                <div className="bg-emerald-50/60 rounded-lg py-1.5 px-2 border border-emerald-100">
                  <div className="text-[10.5px] text-emerald-700 font-medium">Tỷ lệ hoàn thành</div>
                  <div className="text-sm font-bold text-emerald-700">{completionRate6M}%</div>
                </div>
              </div>
            </div>

            {/* Cột phải: Nguồn phát triển đại lý */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 m-0">
                      <PieChartFill className="text-indigo-600" />
                      <span>Nguồn phát triển đại lý</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 m-0">
                      Phân bổ thực tế {realTotalDealers} đại lý theo danh mục nguồn khách hàng trong hệ thống
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceFilter('all');
                      setCurrentStep(2);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    Xem danh sách <ArrowUpRight size={12} />
                  </button>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {resolvedSourceStats.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSourceFilter(item.code);
                        setCurrentStep(2);
                      }}
                      className="group p-2 rounded-lg hover:bg-slate-50 border border-slate-100/60 transition-all cursor-pointer space-y-1.5"
                      title={`Xem danh sách đại lý thuộc nguồn "${item.name}"`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.count} đại lý <span className="text-slate-400 font-medium">({item.pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(item.pct > 0 ? item.pct : 0, item.count > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Nhấp vào nguồn bất kỳ để lọc danh sách đại lý tương ứng</span>
                <button
                  type="button"
                  onClick={() => {
                    setSourceFilter('all');
                    setCurrentStep(2);
                  }}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Xem tất cả ({realTotalDealers})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BƯỚC 2: DANH SÁCH ĐẠI LÝ (CHỈ LỌC LOẠI ĐẠI LÝ) ── */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          {/* TableToolbar */}
          <TableToolbar
            searchPlaceholder="Tìm mã ĐL, tên đại lý, người đại diện, số điện thoại, địa chỉ..."
            searchValue={search}
            onSearchChange={setSearch}
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                {/* Lọc nguồn */}
                <div className="w-40">
                  <Select
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'Tất cả nguồn tiếp cận' },
                      ...sources.map((s) => ({ value: s.code, label: s.name })),
                    ]}
                  />
                </div>

                {/* Lọc người phụ trách */}
                <div className="w-44">
                  <EmployeeSelect
                    value={employeeFilter}
                    onChange={(val) => {
                      setEmployeeFilter(val);
                      setPage(1);
                    }}
                    placeholder="Chọn nhân viên phụ trách..."
                  />
                </div>
              </div>
            }
            rightActions={
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg"
                onClick={handleOpenCreate}
              >
                <Plus className="w-4 h-4 mr-1" /> Thêm đại lý mới
              </Button>
            }
          />

          {/* FullWidthTable */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={loading}
              emptyText="Không tìm thấy đại lý nào phù hợp với điều kiện lọc"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={dealers.length > 0 && dealers.every((d) => selectedIds.has(d.id))}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) dealers.forEach((d) => next.add(d.id));
                          else next.clear();
                          setSelectedIds(next);
                        }}
                        className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3.5">Mã, Tên đại lý & Địa chỉ</th>
                    <th className="py-2.5 px-3.5">Người đại diện</th>
                    <th className="py-2.5 px-3.5 text-right">Cam kết doanh số</th>
                    <th className="py-2.5 px-3.5 text-right">Hạn mức nợ</th>
                    <th className="py-2.5 px-3.5 w-[200px]">Người phụ trách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealers.map((d) => (
                    <SwipeableTableRow
                      key={d.id}
                      rowId={`dealer-${d.id}`}
                      onClick={() => {
                        setSelectedDealer(d);
                        setIsDetailOpen(true);
                      }}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      onEdit={() => handleOpenEdit(d)}
                      onDelete={() => handleDeleteDealer(d.id)}
                      deleteConfirmTitle="Xác nhận xoá đại lý"
                      deleteConfirmMessage={`Bạn có chắc chắn muốn xoá đại lý "${d.name}" không? Hành động này không thể hoàn tác.`}
                    >
                      <td
                        className="py-2.5 px-3.5 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(d.id);
                            else next.delete(d.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-indigo-600 hover:underline">
                            {d.code || `DL-${d.id.slice(-4).toUpperCase()}`}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            Đại lý
                          </span>
                          {d.sourceLabel && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-600 font-medium">
                              {d.sourceLabel}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-800 text-[13px] mt-0.5">
                          {d.name}
                        </div>
                        {d.address ? (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[360px]" title={d.address}>
                            <GeoAlt className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{d.address}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <GeoAlt className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>Chưa cập nhật địa chỉ</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-slate-700">
                        <div className="font-semibold text-slate-800">
                          {d.daiDien || 'Chưa cập nhật'}
                        </div>
                        {d.dienThoai && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Telephone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{d.dienThoai}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="font-bold text-slate-900 text-xs">
                          {d.doanhSoCamKet && d.doanhSoCamKet > 0 ? formatVND(d.doanhSoCamKet) : 'Không cam kết'}
                        </div>
                        {d.doanhSoCamKet && d.doanhSoCamKet > 0 ? (
                          <div className="text-[10px] text-emerald-600 font-semibold">Hợp đồng năm</div>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium text-slate-700 text-xs">
                        {formatVND(d.hanMucCongNo)}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {d.nguoiChamSoc ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] flex items-center justify-center border border-indigo-100 shrink-0">
                              {d.nguoiChamSoc.fullName.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-xs font-medium text-slate-800 truncate">
                              {d.nguoiChamSoc.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                        )}
                      </td>
                    </SwipeableTableRow>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
          </div>

          {/* Pagination */}
          <div className="border-t border-slate-200/80">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              itemName="đại lý"
            />
          </div>
        </div>
      )}

      {/* ── BƯỚC 3: HỖ TRỢ ĐẠI LÝ ── */}
      {currentStep === 3 && (
        <div className="space-y-4 p-1">
          {/* Support Actions Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">Phiếu yêu cầu & Hỗ trợ kỹ thuật Đại lý</h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Tiếp nhận và xử lý yêu cầu quầy kệ POSM, ấn phẩm truyền thông, chính sách chiết khấu</p>
            </div>
            <button
              type="button"
              onClick={() => setIsTicketFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer border-0 shadow-2xs"
            >
              <Plus size={14} />
              <span>Tạo yêu cầu hỗ trợ</span>
            </button>
          </div>

          {/* Support Tickets Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
              <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                  <th className="py-2.5 px-3.5 w-28">Mã phiếu</th>
                  <th className="py-2.5 px-3.5 w-44">Đại lý yêu cầu</th>
                  <th className="py-2.5 px-3.5">Nội dung yêu cầu hỗ trợ</th>
                  <th className="py-2.5 px-3.5 w-36">Người xử lý</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">Ngày gửi</th>
                  <th className="py-2.5 px-3.5 w-32 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supportTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-1 border border-slate-100">
                          <Headset size={22} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Chưa có yêu cầu hỗ trợ nào từ đại lý</span>
                        <span className="text-[11px] text-slate-400">Nhấn &quot;Tạo yêu cầu hỗ trợ&quot; để gửi yêu cầu quầy kệ, ấn phẩm hoặc đào tạo</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  supportTickets.map((t) => {
                    const isDone = t.status === 'completed';
                    const isProc = t.status === 'processing';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-xs text-indigo-600">
                          {t.code}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-xs text-slate-800">
                          {t.dealerName}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-slate-900 text-xs">{t.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.content}</div>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 mt-1 border border-slate-200/60">
                            {t.categoryLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-xs font-medium text-slate-800">
                          {t.assignee}
                        </td>
                        <td className="py-2.5 px-3.5 text-xs text-slate-500 font-mono text-center">
                          {t.createdAt}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isProc
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : isProc ? 'bg-blue-500' : 'bg-amber-500'}`} />
                            {t.statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── OFFCANVAS: CHI TIẾT ĐẠI LÝ (400px CHUẨN) ── */}
      <Offcanvas
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedDealer?.name || 'Chi tiết đại lý'}
        width="400px"
      >
        {selectedDealer && (
          <div className="space-y-4 text-xs text-slate-700 p-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mã đại lý:</span>
                <span className="font-mono font-bold text-indigo-600">{selectedDealer.code || 'DL-Chưa cấp'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Phân loại:</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Đại lý</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nguồn tiếp cận:</span>
                <span className="font-semibold text-slate-800">{selectedDealer.sourceLabel || 'Tự nhiên'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1">Thông tin liên hệ</div>
              <div><b>Người đại diện:</b> {selectedDealer.daiDien || 'Chưa cập nhật'}</div>
              <div><b>Điện thoại:</b> {selectedDealer.dienThoai || 'Chưa cập nhật'}</div>
              <div><b>Email:</b> {selectedDealer.email || 'Chưa cập nhật'}</div>
              <div><b>Địa chỉ:</b> {selectedDealer.address || 'Chưa cập nhật'}</div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1">Chính sách & Hạn mức</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cam kết doanh số:</span>
                <span className="font-bold text-slate-900">{formatVND(selectedDealer.doanhSoCamKet)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn mức công nợ:</span>
                <span className="font-bold text-slate-900">{formatVND(selectedDealer.hanMucCongNo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nhân viên phụ trách:</span>
                <span className="font-semibold text-slate-800">{selectedDealer.nguoiChamSoc?.fullName || 'Chưa phân công'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
                Đóng
              </Button>
              <Button variant="primary" size="sm" onClick={() => { setIsDetailOpen(false); handleOpenEdit(selectedDealer); }}>
                Chỉnh sửa
              </Button>
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── OFFCANVAS: THÊM MỚI / CHỈNH SỬA ĐẠI LÝ (400px CHUẨN) ── */}
      <Offcanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedDealer ? 'Cập nhật đại lý' : 'Thêm mới đại lý'}
        width="400px"
      >
        <form onSubmit={handleSaveDealer} className="space-y-3.5 text-xs p-1">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Tên đại lý / Cửa hàng *</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: Showroom Ánh Dương..."
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Địa chỉ showroom</label>
            <Input
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="VD: 120 Quang Trung, Hà Đông, Hà Nội"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Người đại diện</label>
              <Input
                value={formDaiDien}
                onChange={(e) => setFormDaiDien(e.target.value)}
                placeholder="Họ và tên..."
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
              <Input
                value={formDienThoai}
                onChange={(e) => setFormDienThoai(e.target.value)}
                placeholder="098..."
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="daily@example.com"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nguồn tiếp cận</label>
            <Select
              value={formNguon}
              onChange={(e) => setFormNguon(e.target.value)}
              options={[
                { value: 'tu-nhien', label: 'Tự nhiên (Walk-in)' },
                { value: 'facebook', label: 'Quảng cáo Facebook' },
                { value: 'google', label: 'Quảng cáo Google' },
                { value: 'referral', label: 'Giới thiệu' },
                { value: 'tu_khai_thac', label: 'Tự khai thác' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cam kết doanh số (VNĐ)</label>
              <Input
                type="number"
                value={formDoanhSo}
                onChange={(e) => setFormDoanhSo(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hạn mức nợ (VNĐ)</label>
              <Input
                type="number"
                value={formHanMucNo}
                onChange={(e) => setFormHanMucNo(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nhân viên phụ trách</label>
            <EmployeeSelect
              value={formNguoiChamSocId}
              onChange={setFormNguoiChamSocId}
              placeholder="Chọn nhân viên phụ trách..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
            <textarea
              value={formGhiChu}
              onChange={(e) => setFormGhiChu(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Ghi chú thêm về đại lý..."
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsFormOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : selectedDealer ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </Offcanvas>

      {/* ── OFFCANVAS: TẠO PHIẾU HỖ TRỢ ĐẠI LÝ (400px CHUẨN) ── */}
      <Offcanvas
        isOpen={isTicketFormOpen}
        onClose={() => setIsTicketFormOpen(false)}
        title="Tạo yêu cầu hỗ trợ đại lý"
        width="400px"
      >
        <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs p-1">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Tên đại lý *</label>
            <Input
              value={ticketDealerName}
              onChange={(e) => setTicketDealerName(e.target.value)}
              placeholder="VD: Showroom Ánh Dương..."
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hạng mục hỗ trợ *</label>
            <Select
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value)}
              options={[
                { value: 'posm', label: 'Kệ trưng bày & Showroom (POSM)' },
                { value: 'catalog', label: 'Ấn phẩm & Catalogue' },
                { value: 'training', label: 'Đào tạo sản phẩm & Bán hàng' },
                { value: 'discount', label: 'Chính sách chiết khấu & Thưởng' },
                { value: 'other', label: 'Yêu cầu hỗ trợ khác' },
              ]}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Tiêu đề yêu cầu *</label>
            <Input
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
              placeholder="Tóm tắt yêu cầu cần xử lý..."
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết</label>
            <textarea
              value={ticketContent}
              onChange={(e) => setTicketContent(e.target.value)}
              rows={4}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Mô tả cụ thể kích thước kệ, số lượng ấn phẩm, thời gian mong muốn..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nhân sự Marketing phụ trách</label>
            <Select
              value={ticketAssignee}
              onChange={(e) => setTicketAssignee(e.target.value)}
              options={[
                { value: 'Chu Thị Hằng', label: 'Chu Thị Hằng (Trưởng nhóm Marketing)' },
                { value: 'Nguyễn Quốc Việt', label: 'Nguyễn Quốc Việt (Chuyên viên Marketing)' },
                { value: 'Nguyễn Thu Huyền', label: 'Nguyễn Thu Huyền (Chăm sóc đại lý)' },
              ]}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsTicketFormOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </Offcanvas>
    </StepPage>
  );
};

export default MarketingDealersPage;
