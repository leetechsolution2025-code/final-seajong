import React, { useState, useEffect, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TaskManagementView } from '../../components/common/TaskManagementView';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SuggestionInput } from '../../components/common/SuggestionInput';
import { DeleteButton } from '../../components/common/DeleteButton';
import { Toggle } from '../../components/common/Toggle';
import { VIETNAM_PROVINCES } from '../marketing/constants';
import type { ModernStepItem } from '../../types';
import {
  PersonBadge,
  StarFill,
  Eye,
  Plus,
  Telephone,
  Envelope,
  GeoAlt,
  CalendarCheck,
  CheckCircle,
  FileEarmarkText,
  ChatDots,
  Building,
  Tools,
  CaretDownFill,
  CaretUpFill,
  ClockHistory,
  PencilSquare,
  People,
  ArrowLeft,
  ThreeDots,
  Check2Square,
  Check2,
  FileEarmarkCheck,
  FileEarmarkPlus,
  FileEarmarkPdfFill,
  Trash,
} from 'react-bootstrap-icons';
import { Button } from '../../components/common/Button';
import { BaoGiaSanitaryModal, type CustomerRow } from '../../components/plan-finance/bao_gia/BaoGiaSanitaryModal';
import { BienBanModal } from '../../components/sales/partners/BienBanModal';
import { HopDongModal } from '../../components/sales/partners/HopDongModal';
import { PhuLucModal } from '../../components/sales/partners/PhuLucModal';
import {
  calculateLeadStars,
  getSourceLabel,
  getAttachmentDisplayName,
  openAttachmentFile,
  formatPartnerVnd,
} from '../../utils/partnerUtils';

export interface PartnerItem {
  id: string;
  code: string;
  name: string;
  companyName: string;
  address?: string;
  phone: string;
  email: string;
  area: string;
  businessType: string;
  step: number;
  stars: number;
  status: string;
  careStatus?: string;
  owner: string;
  ownerPhone?: string;
  ownerEmail?: string;
  notes: string;
  source: string;
  contractNo?: string;
  contractValue?: number;
  hdCode?: string;
  hdDate?: string;
  hdDiaDiem?: string;
  hdANguoiKy?: string;
  hdAChucVu?: string;
  hdB_Ten?: string;
  hdB_DiaChi?: string;
  hdB_MST?: string;
  hdB_DaiDien?: string;
  hdB_ChucVu?: string;
  hdB_DienThoai?: string;
  hdB_Email?: string;
  hdShowroomAddress?: string;
  hdShowroomArea?: string;
  hdAnnualRevenue?: string;
  hdMonthlyRevenue?: string;
  hdDurationYears?: string;
  hdExclusiveRadius?: string;
  hdExclusiveMonths?: string;
  creditLimit?: number;
  signDate?: string;
  contractStatus?: string;
  contractPdf?: string;
  bbQuoteCode?: string;
  bbCode?: string;
  bbDate?: string;
  bbDiaDiem?: string;
  bbANguoiKy?: string;
  bbAChucVu?: string;
  bbA_DienThoai?: string;
  bbB_Ten?: string;
  bbB_DiaChi?: string;
  bbB_MST?: string;
  bbB_DaiDien?: string;
  bbB_ChucVu?: string;
  bbB_DienThoai?: string;
  bbB_Email?: string;
  bbSupports?: any;
  bbBonuses?: any[];
  bbPdf?: string;
  plNo?: string;
  plDate?: string;
  plAddress?: string;
  plCptc?: string;
  plCptcText?: string;
  plRevenueMkt?: string;
  plRevenueMktText?: string;
  plRevenueCommit?: string;
  plRevenueCommitText?: string;
  plDurationDays?: string;
  plMaxDelayDays?: string;
  plTimeline1?: string;
  plTimeline2?: string;
  plTimeline3?: string;
  plTimeline4?: string;
  plTimeline5?: string;
  plPhase1Date?: string;
  plPhase1Rate?: string;
  plPhase1Amount?: string;
  plPhase1AmountText?: string;
  plPhase2Date?: string;
  plPhase2Rate?: string;
  plPhase2Amount?: string;
  plPhase2AmountText?: string;
  plPhase3Date?: string;
  plPhase3Rate?: string;
  plPhase3Amount?: string;
  plPhase3AmountText?: string;
  plPenaltyMaxDelay?: string;
  plCustomClauses?: any[];
  plPdf?: string;
  expectedInvestment?: string;
  careHistories?: any[];
  createdAt: string;
  quoteId?: string;
  quoteCode?: string;
  quoteValue?: number;
  discountRate?: number;
  quoteStatus?: string;
  quoteRawStatus?: string;
  quoteType?: string;
  quoteCreatedAt?: string;
  quoteData?: any;
  quoteNegotiations?: any[];
}

const PARTNER_STEPS: ModernStepItem[] = [
  { num: 1, id: 'care', title: 'Chăm sóc khách hàng', desc: 'Liên hệ & Tư vấn', icon: 'bi-chat-left-dots' },
  { num: 2, id: 'quote', title: 'Quản lý báo giá', desc: 'Thoả thuận', icon: 'bi-currency-dollar' },
  { num: 3, id: 'contract', title: 'Theo dõi hợp đồng', desc: 'Ký kết & Hạn mức', icon: 'bi-file-earmark-text' },
  { num: 4, id: 'construction', title: 'Kế hoạch thi công', desc: 'Thiết kế & Trưng bày', icon: 'bi-tools' },
];

export const SalesPartnersPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Pagination & Selection
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer / Modals
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState<boolean>(false);
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState<boolean>(true);
  const [showAddCareForm, setShowAddCareForm] = useState<boolean>(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBienBanModal, setShowBienBanModal] = useState<boolean>(false);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [showPhuLucModal, setShowPhuLucModal] = useState<boolean>(false);
  const [showDeleteContractModal, setShowDeleteContractModal] = useState<boolean>(false);
  const [showQuoteModal, setShowQuoteModal] = useState<boolean>(false);
  const [quoteCustomer, setQuoteCustomer] = useState<CustomerRow | null>(null);
  const [quotationEditData, setQuotationEditData] = useState<any | null>(null);

  // New partner form
  const [newPartner, setNewPartner] = useState({
    salutation: '',
    name: '',
    companyName: '',
    address: '',
    phone: '',
    email: '',
    area: 'Hà Nội',
    businessType: 'Showroom TBVS',
    receivedDate: new Date().toISOString().split('T')[0],
    executor: 'Phạm Quang Việt',
    notes: '',
    source: 'Tự khai thác',
  });

  // Danh sách gợi ý từ DB & Hằng số
  const [customerSources, setCustomerSources] = useState<string[]>([
    'Tự nhiên',
    'Quảng cáo',
    'Giới thiệu',
    'Loại khác',
    'Tự khai thác',
  ]);
  const [salutationSuggestions, setSalutationSuggestions] = useState<string[]>([
    'Ông',
    'Bà',
    'Anh',
    'Chị',
  ]);
  const [salesEmployees, setSalesEmployees] = useState<string[]>([
    'Phạm Quang Việt',
    'Nguyên Văn Thành',
    'Trịnh Văn Tuyến',
    'Vũ Hoàng Long',
    'Lê Vụ',
  ]);
  const provinceSuggestions = useMemo(() => VIETNAM_PROVINCES.slice(4), []);

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Care history form
  const [careForm, setCareForm] = useState({
    executionTime: getCurrentDateTimeLocal(),
    hinhThuc: 'Gọi điện',
    attitude: 'Tích cực',
    collabNeeds: '',
    notes: '',
    executor: 'Phạm Quang Việt',
    nextDate: '',
    nextPriority: 'Trung bình',
    addToSchedule: false,
    nextTaskDesc: '',
  });

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const [partnersRes, quotesRes] = await Promise.all([
        fetch('/api/sales/partners').catch(() => null),
        fetch('/api/plan-finance/quotations?pageSize=100').catch(() => null),
      ]);

      const partnersData = partnersRes && partnersRes.ok ? await partnersRes.json() : [];
      const quotesPayload = quotesRes && quotesRes.ok ? await quotesRes.json() : null;
      const allQuotations: any[] = Array.isArray(quotesPayload?.quotations)
        ? quotesPayload.quotations
        : Array.isArray(quotesPayload)
        ? quotesPayload
        : [];

      if (Array.isArray(partnersData)) {
        const enriched: PartnerItem[] = partnersData.map((p: PartnerItem) => {
          const cleanPartnerPhone = String(p.phone || '').replace(/\s+/g, '');
          const partnerNameLower = String(p.companyName || p.name || '').trim().toLowerCase();

          const matchedQuote =
            allQuotations.find(
              (q) =>
                (p.quoteId && q.id === p.quoteId) ||
                (p.quoteCode && q.code === p.quoteCode) ||
                q.customerId === p.id ||
                (p.code && q.customer?.code && q.customer.code === p.code) ||
                (cleanPartnerPhone &&
                  q.customer?.dienThoai &&
                  String(q.customer.dienThoai).replace(/\s+/g, '') === cleanPartnerPhone) ||
                (partnerNameLower &&
                  q.customer?.name &&
                  String(q.customer.name).trim().toLowerCase() === partnerNameLower)
            ) || p.quoteData || null;

          const rawQuoteStatus = matchedQuote?.trangThai || p.quoteRawStatus || '';
          const mappedQuoteStatus =
            p.quoteStatus === 'ContractSigning' || Number(p.step) >= 3
              ? 'ContractSigning'
              : p.quoteStatus ||
                (rawQuoteStatus === 'approved'
                  ? 'Accepted'
                  : rawQuoteStatus === 'rejected'
                  ? 'Declined'
                  : rawQuoteStatus === 'pending_approval'
                  ? 'Pending'
                  : rawQuoteStatus === 'sent'
                  ? 'Sent'
                  : rawQuoteStatus
                  ? 'Draft'
                  : undefined);

          const hasQuote = Boolean(matchedQuote || p.quoteId || p.quoteCode || Number(p.quoteValue) > 0);
          const resolvedStep = hasQuote && Number(p.step) < 2 ? 2 : Number(p.step) || 1;

          return {
            ...p,
            step: resolvedStep,
            quoteId: matchedQuote?.id || p.quoteId || '',
            quoteCode: matchedQuote?.code || p.quoteCode || '',
            quoteValue: Number(matchedQuote?.tongCong ?? p.quoteValue ?? 0),
            discountRate: Number(matchedQuote?.discount ?? p.discountRate ?? 0),
            quoteStatus: mappedQuoteStatus,
            quoteRawStatus: rawQuoteStatus || p.quoteRawStatus,
            quoteType: matchedQuote?.quoteType || p.quoteType || 'Có quầy kệ',
            quoteCreatedAt: matchedQuote?.ngayBaoGia || matchedQuote?.createdAt || p.quoteCreatedAt || null,
            quoteData: matchedQuote || p.quoteData || null,
          };
        });

        setPartners(enriched);
        setSelectedPartner((prev) => {
          if (!prev) return null;
          return enriched.find((item) => item.id === prev.id) || prev;
        });
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đối tác:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();

    // Tải danh sách Nguồn khách hàng từ DB (/api/categories/items?typeId=customer_source)
    fetch('/api/categories/items?typeId=customer_source')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const names = items
            .filter((it: any) => it.status !== 'hidden' && it.name)
            .map((it: any) => String(it.name).trim())
            .filter(Boolean);
          if (names.length > 0) {
            setCustomerSources(Array.from(new Set(names)));
          }
        }
      })
      .catch(() => {});

    // Tải danh sách Xưng hô từ DB (/api/categories/items?typeId=x_ng_h_)
    fetch('/api/categories/items?typeId=x_ng_h_')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const names = items
            .filter((it: any) => it.status !== 'hidden' && it.name)
            .map((it: any) => String(it.name));
          if (names.length > 0) {
            setSalutationSuggestions(names);
          }
        }
      })
      .catch(() => {});

    // Tải danh sách nhân viên Phòng Kinh doanh từ DB (/api/users)
    fetch('/api/users')
      .then((res) => res.json())
      .then((users) => {
        if (Array.isArray(users) && users.length > 0) {
          const salesStaff = users
            .filter((u: any) =>
              /kinh doanh|sale|bán hàng/i.test(String(u.department || ''))
            )
            .map((u: any) => String(u.name || '').trim())
            .filter(Boolean);
          if (salesStaff.length > 0) {
            setSalesEmployees(Array.from(new Set(salesStaff)));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Filter partners according to current step and search
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const pStep = Number(p.step) || 1;
      const hasQuote = Boolean(p.quoteId || p.quoteCode || Number(p.quoteValue) > 0);
      const matchStep =
        currentStep === 1
          ? pStep >= 1
          : currentStep === 2
          ? pStep >= 2 || hasQuote
          : currentStep === 3
          ? pStep >= 3
          : pStep === currentStep;
      const matchSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.area.toLowerCase().includes(searchTerm.toLowerCase());
      const matchArea = areaFilter === 'all' || p.area.includes(areaFilter);
      const partnerSourceLabel = getSourceLabel(p.source);
      const matchSource =
        sourceFilter === 'all' ||
        partnerSourceLabel.toLowerCase() === sourceFilter.toLowerCase() ||
        (p.source || '').toLowerCase().includes(sourceFilter.toLowerCase());

      return matchStep && matchSearch && matchArea && matchSource;
    });
  }, [partners, currentStep, searchTerm, areaFilter, sourceFilter]);

  const paginatedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPartners.slice(start, start + pageSize);
  }, [filteredPartners, page, pageSize]);

  const totalPages = Math.ceil(filteredPartners.length / pageSize) || 1;

  // Chốt báo giá ở Bước 2: Giữ thông tin báo giá ở Bước 2, chuyển trạng thái sang "Đang ký hợp đồng" (và mở sang Bước 3)
  const handleFinalizeQuote = async (partner: PartnerItem) => {
    const nextStep = Math.max(3, Number(partner.step) || 3);
    const updatedFields = {
      step: nextStep,
      quoteStatus: 'ContractSigning',
    };

    setPartners((prev) =>
      prev.map((p) => (p.id === partner.id ? { ...p, ...updatedFields } : p))
    );
    setSelectedPartner((prev) =>
      prev && prev.id === partner.id ? { ...prev, ...updatedFields } : prev
    );

    try {
      await fetch(`/api/sales/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
    } catch (e) {
      console.error('Lỗi chốt báo giá:', e);
    }
  };

  // Nhấn Tạo báo giá: giữ nguyên khách hàng ở bước Chăm sóc khách hàng (step 1),
  // chuyển trạng thái thành "Đã chăm sóc" và mở modal Tạo báo giá
  const handleCreateQuoteForPartner = async (partner: PartnerItem) => {
    const fullAddr = partner.address
      ? partner.area && !partner.address.toLowerCase().includes(partner.area.toLowerCase())
        ? `${partner.address}, ${partner.area}`
        : partner.address
      : partner.area;

    // Cập nhật ngay trạng thái "Đã chăm sóc" trên giao diện và giữ nguyên step = 1
    setPartners((prev) =>
      prev.map((p) =>
        p.id === partner.id ? { ...p, step: 1, careStatus: 'cared' } : p
      )
    );
    setSelectedPartner((prev) =>
      prev && prev.id === partner.id
        ? { ...prev, step: 1, careStatus: 'cared' }
        : prev
    );

    // Mở modal Tạo báo giá với thông tin khách hàng
    setQuotationEditData(null);
    setQuoteCustomer({
      id: partner.id,
      name: partner.companyName || partner.name,
      nhom: 'dai-ly',
      nguon: partner.source || null,
      dienThoai: partner.phone || null,
      email: partner.email || null,
      address: fullAddr || null,
      daiDien: partner.name || null,
      xungHo: (partner as any).salutation || null,
      chucVu: 'Đại diện',
      ghiChu: partner.notes || null,
      nguoiChamSoc: partner.owner ? { id: '', fullName: partner.owner } : null,
      nguoiChamSocId: null,
      createdAt: partner.createdAt,
    });
    setShowDetailDrawer(false);
    setShowAddCareForm(false);
    setShowQuoteModal(true);

    try {
      await fetch(`/api/sales/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, careStatus: 'cared' }),
      });
    } catch (e) {
      console.error('Lỗi cập nhật trạng thái Đã chăm sóc:', e);
    }
  };

  // Mở xem / chỉnh sửa báo giá của đối tác ở Bước 2
  const handleOpenQuoteForPartner = async (partner: PartnerItem) => {
    const fullAddr = partner.address
      ? partner.area && !partner.address.toLowerCase().includes(partner.area.toLowerCase())
        ? `${partner.address}, ${partner.area}`
        : partner.address
      : partner.area;

    setQuoteCustomer({
      id: partner.id,
      name: partner.companyName || partner.name,
      nhom: 'dai-ly',
      nguon: partner.source || null,
      dienThoai: partner.phone || null,
      email: partner.email || null,
      address: fullAddr || null,
      daiDien: partner.name || null,
      xungHo: (partner as any).salutation || null,
      chucVu: 'Đại diện',
      ghiChu: partner.notes || null,
      nguoiChamSoc: partner.owner ? { id: '', fullName: partner.owner } : null,
      nguoiChamSocId: null,
      createdAt: partner.createdAt,
    });

    if (partner.quoteData && partner.quoteData.id) {
      setQuotationEditData(partner.quoteData);
    } else if (partner.quoteId || partner.quoteCode) {
      try {
        const res = await fetch('/api/plan-finance/quotations?pageSize=100');
        if (res.ok) {
          const payload = await res.json();
          const list: any[] = Array.isArray(payload?.quotations) ? payload.quotations : [];
          const found = list.find(
            (q) =>
              (partner.quoteId && q.id === partner.quoteId) ||
              (partner.quoteCode && q.code === partner.quoteCode)
          );
          setQuotationEditData(found || null);
        } else {
          setQuotationEditData(null);
        }
      } catch {
        setQuotationEditData(null);
      }
    } else {
      setQuotationEditData(null);
    }

    setShowDetailDrawer(false);
    setShowAddCareForm(false);
    setShowQuoteModal(true);
  };

  // Delete selected partners
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch('/api/sales/partners/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setPartners((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error('Lỗi xoá khách hàng / đối tác:', e);
    }
  };

  // Open edit partner in Offcanvas
  const handleOpenEditPartner = (partner: PartnerItem) => {
    setEditingPartnerId(partner.id);
    setNewPartner({
      salutation: (partner as any).salutation || 'Anh',
      name: partner.name.replace(/^(Ông|Bà|Anh|Chị)\s+/i, ''),
      companyName: partner.companyName || partner.name,
      address: partner.address || '',
      phone: partner.phone || '',
      email: partner.email || '',
      area: partner.area || 'Hà Nội',
      businessType: partner.businessType || 'Showroom TBVS',
      receivedDate:
        (partner as any).receivedDate ||
        (partner.createdAt ? new Date(partner.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      executor: partner.owner || 'Phạm Quang Việt',
      notes: partner.notes || '',
      source: partner.source || 'Kinh doanh tự khai thác',
    });
    setShowDetailDrawer(false);
    setShowAddModal(true);
  };

  // Create or Update partner
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.phone) return;

    const cleanName = newPartner.name.replace(/^(Ông|Bà|Anh|Chị)\s+/i, '').trim();
    const displayRepName = newPartner.salutation.trim()
      ? `${newPartner.salutation.trim()} ${cleanName}`
      : cleanName;

    try {
      const url = editingPartnerId
        ? `/api/sales/partners/${editingPartnerId}`
        : '/api/sales/partners';
      const method = editingPartnerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPartner,
          name: displayRepName,
          businessAddress: newPartner.address
            ? `${newPartner.address}, ${newPartner.area}`
            : newPartner.area,
          ...(editingPartnerId ? {} : { step: 1 }),
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingPartnerId(null);
        setNewPartner({
          salutation: '',
          name: '',
          companyName: '',
          address: '',
          phone: '',
          email: '',
          area: 'Hà Nội',
          businessType: 'Showroom TBVS',
          receivedDate: new Date().toISOString().split('T')[0],
          executor: 'Phạm Quang Việt',
          notes: '',
          source: 'Kinh doanh tự khai thác',
        });
        fetchPartners();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Care History
  const handleAddCare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    try {
      const res = await fetch(`/api/sales/partners/${selectedPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCare: {
            ...careForm,
            approachStep: careForm.hinhThuc,
            fullName: selectedPartner.name,
            phone: selectedPartner.phone,
            companyName: selectedPartner.companyName,
            businessAddress: selectedPartner.area,
            stars: 4,
          },
        }),
      });
      if (res.ok) {
        setCareForm({
          executionTime: getCurrentDateTimeLocal(),
          hinhThuc: 'Gọi điện',
          attitude: 'Tích cực',
          collabNeeds: '',
          notes: '',
          executor: selectedPartner.owner || 'Phạm Quang Việt',
          nextDate: '',
          nextPriority: 'Trung bình',
          addToSchedule: false,
          nextTaskDesc: '',
        });
        setShowAddCareForm(false);
        fetch('/api/sales/partners')
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setPartners(data);
              const refreshed = data.find((item: PartnerItem) => item.id === selectedPartner.id);
              if (refreshed) setSelectedPartner(refreshed);
            }
          });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Mở Biên bản ghi nhớ fullscreen (Bước 3)
  const handleOpenBienBanModal = (partner: PartnerItem) => {
    setSelectedPartner(partner);
    setShowDetailDrawer(false);
    setShowBienBanModal(true);
  };

  // 2. Mở Hợp đồng đại lý fullscreen (Bước 3)
  const handleOpenContractModal = (partner: PartnerItem) => {
    setSelectedPartner(partner);
    setShowDetailDrawer(false);
    setShowContractModal(true);
  };

  // 3. Mở Phụ lục hợp đồng fullscreen (Bước 3)
  const handleOpenPhuLucModal = (partner: PartnerItem) => {
    setSelectedPartner(partner);
    setShowDetailDrawer(false);
    setShowPhuLucModal(true);
  };

  // 4. Xoá thông tin bộ hợp đồng (Biên bản, Hợp đồng, Phụ lục) của đại lý ở Bước 3
  const handleDeleteContractDocs = async () => {
    if (!selectedPartner) return;

    const clearedFields = {
      step: 2,
      quoteStatus: 'Sent',
      contractNo: '',
      contractValue: 0,
      hdAnnualRevenue: '',
      hdMonthlyRevenue: '',
      creditLimit: 0,
      signDate: '',
      contractStatus: 'Pending Signature',
      contractPdf: '',
      bbQuoteCode: '',
      bbCode: '',
      bbDate: '',
      bbDiaDiem: '',
      bbPdf: '',
      plNo: '',
      plDate: '',
      plAddress: '',
      plCptc: '',
      plCptcText: '',
      plRevenueCommit: '',
      plRevenueCommitText: '',
      plPdf: '',
    };

    setPartners((prev) =>
      prev.map((p) => (p.id === selectedPartner.id ? { ...p, ...clearedFields } : p))
    );
    setShowDeleteContractModal(false);
    setShowDetailDrawer(false);
    setSelectedPartner(null);

    try {
      await fetch(`/api/sales/partners/${selectedPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clearedFields),
      });
    } catch (err) {
      console.error('Lỗi xoá hợp đồng:', err);
    }
  };

  const tickerItems = [
    {
      badge: 'TIẾP CẬN ĐẠI LÝ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: `Tổng đối tác đang tiếp cận phát triển: <b>${partners.length}</b> đại lý tiềm năng`,
    },
    {
      badge: 'TIẾN ĐỘ BƯỚC',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: `Đang ở Bước ${currentStep} (${PARTNER_STEPS.find((s) => s.num === currentStep)?.title}): <b>${filteredPartners.length}</b> đối tác`,
    },
    {
      badge: 'MỤC TIÊU PHÁT TRIỂN',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: `Mục tiêu tháng 10/2026: Ký mới <b>5</b> đại lý showroom thiết bị vệ sinh Seajong`,
    },
  ];

  return (
    <StepPage
      title="Phát triển mạng lưới đại lý"
      badge="PARTNERS"
      description="Quy trình 4 bước phát triển, thẩm định và ký kết đại lý phân phối thiết bị vệ sinh Seajong"
      icon="bi-person-badge"
      color="blue"
      steps={PARTNER_STEPS}
      currentStep={currentStep}
      onStepChange={(step) => {
        setCurrentStep(step);
        setPage(1);
        setSelectedIds(new Set());
        if (step === 4) {
          setShowDetailDrawer(false);
        }
      }}
      customTickerNews={tickerItems}
    >
      {currentStep === 4 ? (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
          <TaskManagementView
            hideTitle={true}
            department="all"
            showCategoryTabs={true}
            allowAdd={true}
          />
        </div>
      ) : (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
          {/* ── TableToolbar trong thẻ card chính theo đúng AGENTS.MD ── */}
        <TableToolbar
          showMenu={false}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm tên đại lý, số điện thoại, khu vực..."
          filters={[
            {
              value: areaFilter,
              onChange: setAreaFilter,
              options: [
                { label: 'Tất cả khu vực', value: 'all' },
                { label: 'Hà Nội', value: 'Hà Nội' },
                { label: 'Hải Phòng', value: 'Hải Phòng' },
                { label: 'Bắc Ninh', value: 'Bắc Ninh' },
                { label: 'Đà Nẵng', value: 'Đà Nẵng' },
                { label: 'TP. Hồ Chí Minh', value: 'Hồ Chí Minh' },
              ],
            },
            {
              value: sourceFilter,
              onChange: setSourceFilter,
              options: [
                { label: 'Tất cả nguồn tiếp cận', value: 'all' },
                ...customerSources.map((src) => ({ label: src, value: src })),
              ],
            },
          ]}
          rightActions={
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <DeleteButton
                  size="sm"
                  itemCount={selectedIds.size}
                  onConfirm={handleDeleteSelected}
                />
              )}
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingPartnerId(null);
                  setNewPartner({
                    salutation: '',
                    name: '',
                    companyName: '',
                    address: '',
                    phone: '',
                    email: '',
                    area: 'Hà Nội',
                    businessType: 'Showroom TBVS',
                    receivedDate: new Date().toISOString().split('T')[0],
                    executor: 'Phạm Quang Việt',
                    notes: '',
                    source: customerSources[0] || 'Tự khai thác',
                  });
                  setShowAddModal(true);
                }}
              >
                Thêm mới
              </Button>
            </div>
          }
          onRefresh={fetchPartners}
        />

        {/* ── Bảng FullWidthTable ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <FullWidthTable
            loading={loading}
            emptyText={`Không có đối tác nào đang ở bước ${PARTNER_STEPS.find((s) => s.num === currentStep)?.title}`}
          >
            <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
              <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                  <th className="py-2.5 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedPartners.length > 0 &&
                        paginatedPartners.every((p) => selectedIds.has(p.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) {
                          paginatedPartners.forEach((p) => next.add(p.id));
                        } else {
                          paginatedPartners.forEach((p) => next.delete(p.id));
                        }
                        setSelectedIds(next);
                      }}
                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  {currentStep === 2 ? (
                    <>
                      <th className="py-2.5 px-3.5 w-[280px]">Mã hồ sơ & Tên đại lý</th>
                      <th className="py-2.5 px-3.5 w-[190px]">Mã & Loại báo giá</th>
                      <th className="py-2.5 px-3.5 w-[160px] text-right">Giá trị dự kiến</th>
                      <th className="py-2.5 px-3.5 w-[110px] text-center">Chiết khấu</th>
                      <th className="py-2.5 px-3.5 w-[170px] text-center">Trạng thái</th>
                      <th className="py-2.5 px-3.5 w-[210px]">Phụ trách</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-3.5 w-[290px]">Mã hồ sơ & Tên đại lý</th>
                      <th className="py-2.5 px-3.5 w-[220px]">Đại diện & Liên hệ</th>
                      <th className="py-2.5 px-3.5">Nhu cầu hợp tác</th>
                      <th className="py-2.5 px-3.5 w-[230px]">Phụ trách</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {paginatedPartners.map((p) => {
                const customerAddress = p.address
                  ? p.area && !p.address.toLowerCase().includes(p.area.toLowerCase())
                    ? `${p.address}, ${p.area}`
                    : p.address
                  : p.area;

                if (currentStep === 2) {
                  const qStatus = p.quoteStatus || 'Sent';
                  const rawStatus = p.quoteRawStatus || '';
                  const isContractSigning =
                    qStatus === 'ContractSigning' || Number(p.step) >= 3;
                  const isPendingApproval =
                    !isContractSigning &&
                    (rawStatus === 'pending_approval' || qStatus === 'Pending');
                  const isAccepted =
                    !isContractSigning &&
                    (rawStatus === 'approved' || qStatus === 'Accepted');
                  const isDeclined =
                    !isContractSigning &&
                    (rawStatus === 'rejected' || qStatus === 'Declined');

                  const statusLabel = isContractSigning
                    ? 'Đang ký hợp đồng'
                    : isAccepted
                    ? 'Đã duyệt'
                    : isDeclined
                    ? 'Từ chối'
                    : isPendingApproval
                    ? 'Đang trình duyệt'
                    : qStatus === 'Sent' || rawStatus === 'sent'
                    ? 'Đã lập báo giá'
                    : 'Bản nháp';

                  const statusClass = isContractSigning
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isAccepted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isDeclined
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isPendingApproval
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                  const dotClass = isContractSigning
                    ? 'bg-emerald-500'
                    : isAccepted
                    ? 'bg-emerald-500'
                    : isDeclined
                    ? 'bg-rose-500'
                    : isPendingApproval
                    ? 'bg-amber-500'
                    : 'bg-blue-500';

                  const subStatusLabel = isContractSigning
                    ? 'Đã chốt báo giá'
                    : 'Đang thoả thuận';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedPartner(p);
                        setShowDetailDrawer(true);
                      }}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td
                        className="py-2.5 px-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) {
                              next.add(p.id);
                            } else {
                              next.delete(p.id);
                            }
                            setSelectedIds(next);
                          }}
                          className="rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-blue-600 hover:underline">
                            {p.code}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-600 font-medium">
                            {getSourceLabel(p.source)}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 text-xs mt-0.5">
                          {p.companyName || p.name}
                        </div>
                        {customerAddress && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <GeoAlt className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{customerAddress}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQuoteForPartner(p);
                          }}
                          className="font-mono font-bold text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Nhấn để xem / chỉnh sửa báo giá"
                        >
                          <FileEarmarkText className="w-3.5 h-3.5 shrink-0" />
                          <span>{p.quoteCode || 'Chưa có mã'}</span>
                        </button>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold border ${
                              p.quoteType === 'Không có quầy kệ'
                                ? 'bg-slate-50 text-slate-600 border-slate-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {p.quoteType || 'Có quầy kệ'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="font-mono font-bold text-slate-900 text-[13px]">
                          {Number(p.quoteValue || 0).toLocaleString('vi-VN')} đ
                        </div>
                        {p.quoteCreatedAt && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ngày lập: {new Date(p.quoteCreatedAt).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                          {Number(p.discountRate || 0)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                            {statusLabel}
                          </span>
                          <span
                            className={`text-[10.5px] font-medium ${
                              isContractSigning ? 'text-blue-600' : 'text-emerald-600'
                            }`}
                          >
                            {subStatusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800 text-xs">{p.owner}</div>
                        {p.ownerPhone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Telephone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-mono">{p.ownerPhone}</span>
                          </div>
                        )}
                        {p.ownerEmail && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Envelope className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{p.ownerEmail}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setSelectedPartner(p);
                      setShowDetailDrawer(true);
                    }}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td
                      className="py-2.5 px-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) {
                            next.add(p.id);
                          } else {
                            next.delete(p.id);
                          }
                          setSelectedIds(next);
                        }}
                        className="rounded border-slate-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-blue-600 hover:underline">
                          {p.code}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-600 font-medium">
                          {getSourceLabel(p.source)}
                        </span>
                        {(() => {
                          const isCared = Boolean(
                            (p.careHistories && p.careHistories.length > 0) ||
                              p.careStatus === 'cared'
                          );
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                isCared
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCared ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              {isCared ? 'Đã chăm sóc' : 'Mới tiếp nhận'}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5">
                        {p.companyName || p.name}
                      </div>
                      {customerAddress && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <GeoAlt className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{customerAddress}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-700">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Telephone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="font-mono">{p.phone}</span>
                      </div>
                      {p.email && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Envelope className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{p.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 text-xs">
                      <div className="line-clamp-2 leading-relaxed">
                        {p.notes || 'Tư vấn chính sách đại lý & trưng bày mẫu'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 text-xs">{p.owner}</div>
                      {p.ownerPhone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Telephone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-mono">{p.ownerPhone}</span>
                        </div>
                      )}
                      {p.ownerEmail && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Envelope className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{p.ownerEmail}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </FullWidthTable>
        </div>

        {/* ── Pagination ── */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          totalItems={filteredPartners.length}
          pageSize={pageSize}
          itemName="đối tác"
        />
      </div>
      )}

      {/* ── DRAWER CHI TIẾT ĐỐI TÁC & NHẬT KÝ CHĂM SÓC (ÁP DỤNG OFFCANVAS CHUẨN CRM) ── */}
      <Offcanvas
        isOpen={Boolean(showDetailDrawer && selectedPartner)}
        onClose={() => {
          setShowDetailDrawer(false);
          setShowAddCareForm(false);
        }}
        title={showAddCareForm ? 'Thêm kết quả chăm sóc' : 'Thông tin chi tiết khách hàng'}
        icon={
          showAddCareForm ? (
            <button
              type="button"
              onClick={() => setShowAddCareForm(false)}
              className="w-full h-full flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
              title="Quay lại thông tin chi tiết khách hàng"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <FileEarmarkText size={18} className="text-blue-600" />
          )
        }
        width="400px"
        bodyClassName={showAddCareForm ? 'p-4 flex flex-col' : 'p-4 space-y-3.5'}
        footer={
          showAddCareForm ? (
            <div className="w-full flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddCareForm(false)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Quay lại</span>
              </button>
              <button
                type="submit"
                form="add-care-result-form"
                className="btn btn-primary flex-1 py-2 rounded-lg text-white text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Check2 size={15} />
                <span>Lưu kết quả</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center gap-2">
              {selectedPartner && currentStep !== 3 && (
                <button
                  type="button"
                  onClick={() => handleOpenEditPartner(selectedPartner)}
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Chỉnh sửa thông tin khách hàng"
                >
                  <PencilSquare size={15} />
                </button>
              )}
              {selectedPartner && currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => handleOpenQuoteForPartner(selectedPartner)}
                  className="flex-1 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileEarmarkText className="w-3.5 h-3.5" />
                  <span>Xem báo giá</span>
                </button>
              )}
              {selectedPartner && currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => handleCreateQuoteForPartner(selectedPartner)}
                  className="btn btn-primary flex-1 py-2 rounded-lg text-white text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileEarmarkText className="w-3.5 h-3.5" />
                  <span>Tạo báo giá</span>
                </button>
              )}
              {selectedPartner && currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => handleFinalizeQuote(selectedPartner)}
                  disabled={
                    selectedPartner.quoteStatus === 'ContractSigning' ||
                    Number(selectedPartner.step) >= 3
                  }
                  className={`flex-1 py-2 rounded-lg text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    selectedPartner.quoteStatus === 'ContractSigning' ||
                    Number(selectedPartner.step) >= 3
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'btn btn-primary text-white cursor-pointer'
                  }`}
                >
                  <Check2 className="w-4 h-4" />
                  <span>
                    {selectedPartner.quoteStatus === 'ContractSigning' ||
                    Number(selectedPartner.step) >= 3
                      ? 'Đang ký hợp đồng'
                      : 'Chốt báo giá'}
                  </span>
                </button>
              )}
              {selectedPartner && currentStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenBienBanModal(selectedPartner)}
                    className="btn btn-primary flex-1 h-9 rounded-lg text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Lập / Ký biên bản ghi nhớ"
                  >
                    <FileEarmarkText className="w-3.5 h-3.5 shrink-0" />
                    <span>Biên bản</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenContractModal(selectedPartner)}
                    className="btn btn-primary flex-1 h-9 rounded-lg text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Ký hợp đồng đại lý"
                  >
                    <FileEarmarkCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Hợp đồng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPhuLucModal(selectedPartner)}
                    className="btn btn-primary flex-1 h-9 rounded-lg text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Lập / Ký phụ lục hợp đồng"
                  >
                    <FileEarmarkPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Phụ lục</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailDrawer(false);
                      setShowDeleteContractModal(true);
                    }}
                    className="h-9 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[12px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="Xoá thông tin văn bản hợp đồng"
                  >
                    <Trash className="w-3.5 h-3.5 shrink-0" />
                    <span>Xoá</span>
                  </button>
                </>
              )}
            </div>
          )
        }
      >
        {selectedPartner && (() => {
          if (showAddCareForm) {
            const interactionMethods = [
              { id: 'Gọi điện', label: 'Gọi điện', icon: <Telephone size={15} /> },
              { id: 'Gặp mặt', label: 'Gặp mặt', icon: <People size={15} /> },
              { id: 'Nhắn tin', label: 'Nhắn tin', icon: <ChatDots size={15} /> },
              { id: 'Email', label: 'Email', icon: <Envelope size={15} /> },
              { id: 'Khác', label: 'Khác', icon: <ThreeDots size={15} /> },
            ];
            const careStaffOptions = Array.from(
              new Set([...salesEmployees, careForm.executor, selectedPartner.owner].filter(Boolean))
            ).map((emp) => ({ value: emp, label: emp }));

            return (
              <form
                id="add-care-result-form"
                onSubmit={handleAddCare}
                className="flex-1 flex flex-col gap-3.5 h-full text-[13px]"
              >
                {/* Thời gian & Người chăm sóc */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <Input
                    label="Thời gian"
                    required
                    type="datetime-local"
                    value={careForm.executionTime}
                    onChange={(e) =>
                      setCareForm({ ...careForm, executionTime: e.target.value })
                    }
                  />
                  <Select
                    label="Người chăm sóc"
                    value={careForm.executor}
                    onChange={(e) =>
                      setCareForm({ ...careForm, executor: e.target.value })
                    }
                    options={careStaffOptions}
                  />
                </div>

                {/* Hình thức tương tác */}
                <div className="shrink-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Hình thức tương tác <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {interactionMethods.map((item) => {
                      const isActive = careForm.hinhThuc === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setCareForm({ ...careForm, hinhThuc: item.id })
                          }
                          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-50/90 border-[1.5px] border-blue-600 text-blue-600 font-bold shadow-2xs'
                              : 'bg-slate-50/80 border border-slate-200/80 text-slate-600 hover:bg-slate-100 font-semibold'
                          }`}
                        >
                          {item.icon}
                          <span className="leading-tight truncate max-w-full">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tóm tắt kết quả */}
                <div className="shrink-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tóm tắt kết quả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Mô tả chi tiết kết quả buổi chăm sóc khách hàng..."
                    value={careForm.collabNeeds}
                    onChange={(e) =>
                      setCareForm({ ...careForm, collabNeeds: e.target.value })
                    }
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* CÔNG VIỆC TIẾP THEO */}
                <div className="pt-2.5 border-t border-slate-100 flex-1 flex flex-col gap-3 min-h-[210px]">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase text-blue-600 tracking-wide shrink-0">
                    <Check2Square className="w-3.5 h-3.5" />
                    <span>CÔNG VIỆC TIẾP THEO</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    <Input
                      label="Ngày thực hiện"
                      type="date"
                      value={careForm.nextDate}
                      onChange={(e) =>
                        setCareForm({ ...careForm, nextDate: e.target.value })
                      }
                    />
                    <Select
                      label="Mức độ ưu tiên"
                      value={careForm.nextPriority}
                      onChange={(e) =>
                        setCareForm({ ...careForm, nextPriority: e.target.value })
                      }
                      options={[
                        { value: 'Thấp', label: 'Thấp' },
                        { value: 'Trung bình', label: 'Trung bình' },
                        { value: 'Cao', label: 'Cao' },
                        { value: 'Khẩn cấp', label: 'Khẩn cấp' },
                      ]}
                    />
                  </div>

                  <div className="shrink-0 py-0.5">
                    <Toggle
                      checked={careForm.addToSchedule}
                      onChange={(checked) =>
                        setCareForm({ ...careForm, addToSchedule: checked })
                      }
                      label="Thêm vào lịch hẹn"
                    />
                  </div>

                  <div className="flex-1 flex flex-col min-h-[100px]">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 shrink-0">
                      Mô tả công việc
                    </label>
                    <textarea
                      placeholder="Mô tả chi tiết công việc cần thực hiện tiếp theo..."
                      value={careForm.nextTaskDesc}
                      onChange={(e) =>
                        setCareForm({ ...careForm, nextTaskDesc: e.target.value })
                      }
                      className="w-full flex-1 min-h-[90px] px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </form>
            );
          }

          const customerFullAddress = selectedPartner.address
            ? selectedPartner.area && !selectedPartner.address.toLowerCase().includes(selectedPartner.area.toLowerCase())
              ? `${selectedPartner.address}, ${selectedPartner.area}`
              : selectedPartner.address
            : selectedPartner.area;
          const hasCare = Boolean(
            (selectedPartner.careHistories && selectedPartner.careHistories.length > 0) ||
              selectedPartner.careStatus === 'cared'
          );
          const createdDateObj = new Date(selectedPartner.createdAt);
          const createdDateStr = createdDateObj.toLocaleDateString('vi-VN');
          const createdTimeStr = createdDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

          return (
            <div className="space-y-3.5 text-[13px]">
              {/* 1. THÔNG TIN KHÁCH HÀNG (CÓ FILL CHEVRON THU HẸP / MỞ RỘNG) */}
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                <div
                  onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
                  className="flex items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <span className="font-mono font-extrabold text-[13.5px] text-blue-600">
                    {selectedPartner.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px] font-semibold">
                      {getSourceLabel(selectedPartner.source)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomerInfoOpen(!isCustomerInfoOpen);
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors cursor-pointer"
                      title={isCustomerInfoOpen ? 'Thu hẹp thông tin khách hàng' : 'Mở rộng thông tin khách hàng'}
                    >
                      {isCustomerInfoOpen ? <CaretUpFill size={12} /> : <CaretDownFill size={12} />}
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
                  className="font-bold text-slate-900 text-[14px] leading-snug mt-1.5 cursor-pointer"
                >
                  {selectedPartner.companyName || selectedPartner.name}
                </div>

                {isCustomerInfoOpen && (
                  <div className="mt-2.5 space-y-2">
                    {customerFullAddress && (
                      <div className="flex items-start gap-2 text-xs text-slate-600">
                        <GeoAlt className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>{customerFullAddress}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <Building className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        Nhu cầu hợp tác:{' '}
                        <strong className="text-slate-800">
                          {selectedPartner.notes || 'Tư vấn chính sách đại lý & trưng bày mẫu'}
                        </strong>
                      </span>
                    </div>

                    <div className="pt-2.5 mt-2.5 border-t border-dashed border-slate-200 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">
                          Trạng thái chăm sóc
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            hasCare
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              hasCare ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {hasCare ? 'Đã chăm sóc' : 'Mới tiếp nhận'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-1">
                          {createdDateStr}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">
                          Người phụ trách
                        </span>
                        <div className="font-bold text-slate-900 text-[12.5px]">
                          {selectedPartner.owner}
                        </div>
                        {selectedPartner.ownerPhone && (
                          <div className="text-[11px] font-mono font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                            <Telephone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{selectedPartner.ownerPhone}</span>
                          </div>
                        )}
                        {selectedPartner.ownerEmail && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Envelope className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">{selectedPartner.ownerEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. NGƯỜI LIÊN HỆ TRỰC TIẾP */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2">
                <div className="text-[11px] font-extrabold uppercase text-slate-700 tracking-wider">
                  NGƯỜI LIÊN HỆ TRỰC TIẾP
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-[13.5px]">
                    {selectedPartner.name}
                  </span>
                  <span className="text-xs italic text-slate-500">Đại diện</span>
                </div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs pt-0.5">
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-blue-600">
                    <Telephone className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedPartner.phone}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Envelope className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    {selectedPartner.email || 'Chưa có email'}
                  </span>
                </div>
              </div>

              {/* 2.5. THÔNG TIN BÁO GIÁ ĐÃ LẬP (NẾU CÓ) */}
              {(selectedPartner.quoteCode || selectedPartner.quoteId || Number(selectedPartner.quoteValue) > 0) && (
                <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-blue-800 tracking-wider flex items-center gap-1.5">
                      <FileEarmarkText className="w-3.5 h-3.5 text-blue-600" />
                      BÁO GIÁ ĐẠI LÝ ĐÃ LẬP
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenQuoteForPartner(selectedPartner)}
                      className="text-xs font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {selectedPartner.quoteCode || 'Mở báo giá →'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs items-end">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Loại báo giá</span>
                      <span className="font-semibold text-slate-800">
                        {selectedPartner.quoteType || 'Có quầy kệ'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Trạng thái</span>
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                          selectedPartner.quoteStatus === 'ContractSigning' ||
                          Number(selectedPartner.step) >= 3
                            ? 'text-emerald-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {selectedPartner.quoteStatus === 'ContractSigning' ||
                        Number(selectedPartner.step) >= 3
                          ? 'Đang ký hợp đồng'
                          : 'Đang thoả thuận'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Giá trị dự kiến</span>
                      <span className="font-mono font-bold text-blue-700">
                        {Number(selectedPartner.quoteValue || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. NỘI DUNG BƯỚC 3 (BIÊN BẢN, HỢP ĐỒNG, PHỤ LỤC HỢP ĐỒNG) HOẶC QUÁ TRÌNH CHĂM SÓC KHÁCH HÀNG */}
              {currentStep === 3 ? (
                <div className="space-y-3 pt-1">
                  {/* MỤC 1: BIÊN BẢN GHI NHỚ */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase text-slate-800 tracking-wider">
                        <FileEarmarkText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Biên bản ghi nhớ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenBienBanModal(selectedPartner)}
                        className="h-7 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FileEarmarkText className="w-3 h-3" />
                        <span>{selectedPartner.bbCode ? 'Cập nhật' : 'Ký biên bản'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Số báo giá liên quan
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {selectedPartner.bbQuoteCode || selectedPartner.quoteCode || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Số biên bản
                        </span>
                        <span className="font-mono font-bold text-blue-600">
                          {selectedPartner.bbCode || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Ngày lập biên bản
                        </span>
                        <span className="font-medium text-slate-700">
                          {selectedPartner.bbDate
                            ? new Date(selectedPartner.bbDate).toLocaleDateString('vi-VN')
                            : '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Tệp đính kèm
                        </span>
                        {selectedPartner.bbPdf ? (
                          <button
                            type="button"
                            onClick={() => openAttachmentFile(selectedPartner.bbPdf)}
                            title={getAttachmentDisplayName(
                              selectedPartner.bbPdf,
                              `Bien_ban_${selectedPartner.bbCode || selectedPartner.code}.pdf`
                            )}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors max-w-[145px] min-w-0 overflow-hidden cursor-pointer"
                          >
                            <FileEarmarkPdfFill className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate block">
                              {getAttachmentDisplayName(
                                selectedPartner.bbPdf,
                                `Bien_ban_${selectedPartner.bbCode || selectedPartner.code}.pdf`
                              )}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">Chưa có tệp</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MỤC 2: HỢP ĐỒNG */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase text-slate-800 tracking-wider">
                        <FileEarmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Hợp đồng</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenContractModal(selectedPartner)}
                        className="h-7 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FileEarmarkCheck className="w-3 h-3" />
                        <span>{selectedPartner.contractNo ? 'Cập nhật' : 'Ký hợp đồng'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Số hợp đồng đại lý
                        </span>
                        <span className="font-mono font-bold text-blue-600">
                          {selectedPartner.contractNo || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Trạng thái ký kết
                        </span>
                        {(() => {
                          const cStatus =
                            selectedPartner.contractStatus ||
                            (selectedPartner.contractNo ? 'Signed' : 'Pending');
                          const isSigned = cStatus === 'Signed' || cStatus === 'Active';
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                                isSigned
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSigned ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              {cStatus === 'Active'
                                ? 'Đang hiệu lực'
                                : cStatus === 'Signed'
                                ? 'Đã ký kết'
                                : 'Chờ ký kết'}
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Giá trị cam kết năm
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatPartnerVnd(
                            selectedPartner.hdAnnualRevenue || selectedPartner.contractValue
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Giá trị cam kết tháng
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatPartnerVnd(
                            selectedPartner.hdMonthlyRevenue ||
                              (selectedPartner.contractValue
                                ? Math.round(Number(selectedPartner.contractValue) / 12)
                                : undefined)
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Ngày ký hợp đồng
                        </span>
                        <span className="font-medium text-slate-700">
                          {selectedPartner.signDate || selectedPartner.hdDate
                            ? new Date(
                                (selectedPartner.signDate || selectedPartner.hdDate) as string
                              ).toLocaleDateString('vi-VN')
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Hạn mức công nợ
                        </span>
                        <span className="font-mono font-bold text-blue-700">
                          {formatPartnerVnd(selectedPartner.creditLimit)}
                        </span>
                      </div>
                      {(selectedPartner.hdDurationYears ||
                        selectedPartner.hdExclusiveRadius ||
                        selectedPartner.hdShowroomArea) && (
                        <>
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">
                              Thời hạn hợp đồng
                            </span>
                            <span className="font-medium text-slate-700">
                              {selectedPartner.hdDurationYears
                                ? `${selectedPartner.hdDurationYears} năm`
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">
                              Bảo hộ độc quyền
                            </span>
                            <span className="font-medium text-slate-700">
                              {selectedPartner.hdExclusiveRadius
                                ? `Bán kính ${selectedPartner.hdExclusiveRadius}km (${selectedPartner.hdExclusiveMonths || '06'} tháng)`
                                : selectedPartner.hdShowroomArea
                                ? `Showroom ${selectedPartner.hdShowroomArea} m²`
                                : '—'}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="col-span-2 pt-1 border-t border-dashed border-slate-100 flex items-center justify-between gap-2 min-w-0">
                        <span className="text-[11px] text-slate-400 shrink-0">Tệp đính kèm</span>
                        {selectedPartner.contractPdf ? (
                          <button
                            type="button"
                            onClick={() => openAttachmentFile(selectedPartner.contractPdf)}
                            title={getAttachmentDisplayName(
                              selectedPartner.contractPdf,
                              `Hop_dong_${selectedPartner.contractNo || selectedPartner.code}.pdf`
                            )}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors max-w-[200px] min-w-0 overflow-hidden cursor-pointer"
                          >
                            <FileEarmarkPdfFill className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate block">
                              {getAttachmentDisplayName(
                                selectedPartner.contractPdf,
                                `Hop_dong_${selectedPartner.contractNo || selectedPartner.code}.pdf`
                              )}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">Chưa có tệp</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MỤC 3: PHỤ LỤC HỢP ĐỒNG */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase text-slate-800 tracking-wider">
                        <FileEarmarkPlus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Phụ lục hợp đồng</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenPhuLucModal(selectedPartner)}
                        className="h-7 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FileEarmarkPlus className="w-3 h-3" />
                        <span>{selectedPartner.plNo ? 'Cập nhật' : 'Ký phụ lục'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Số phụ lục
                        </span>
                        <span className="font-mono font-bold text-blue-600">
                          {selectedPartner.plNo
                            ? selectedPartner.plNo.includes('/')
                              ? selectedPartner.plNo
                              : `${selectedPartner.plNo}/HĐĐL-SEAJONG`
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Ngày lập phụ lục
                        </span>
                        <span className="font-medium text-slate-700">
                          {selectedPartner.plDate
                            ? new Date(selectedPartner.plDate).toLocaleDateString('vi-VN')
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Chi phí thi công (CPTC)
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatPartnerVnd(selectedPartner.plCptc)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          Doanh thu cam kết
                        </span>
                        <span className="font-mono font-bold text-blue-700">
                          {formatPartnerVnd(selectedPartner.plRevenueCommit)}
                        </span>
                      </div>
                      {(selectedPartner.plRevenueMkt || selectedPartner.plDurationDays) && (
                        <>
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">
                              Doanh số nhận gói MKT
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatPartnerVnd(selectedPartner.plRevenueMkt)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-0.5">
                              Thời gian thi công
                            </span>
                            <span className="font-medium text-slate-700">
                              {selectedPartner.plDurationDays
                                ? `${selectedPartner.plDurationDays} ngày (tối đa ${selectedPartner.plMaxDelayDays || '19'} ngày)`
                                : '—'}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="col-span-2 pt-1 border-t border-dashed border-slate-100 flex items-center justify-between gap-2 min-w-0">
                        <span className="text-[11px] text-slate-400 shrink-0">Tệp đính kèm</span>
                        {selectedPartner.plPdf ? (
                          <button
                            type="button"
                            onClick={() => openAttachmentFile(selectedPartner.plPdf)}
                            title={getAttachmentDisplayName(
                              selectedPartner.plPdf,
                              `Phu_luc_${selectedPartner.plNo || selectedPartner.code}.pdf`
                            )}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors max-w-[200px] min-w-0 overflow-hidden cursor-pointer"
                          >
                            <FileEarmarkPdfFill className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate block">
                              {getAttachmentDisplayName(
                                selectedPartner.plPdf,
                                `Phu_luc_${selectedPartner.plNo || selectedPartner.code}.pdf`
                              )}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">Chưa có tệp</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase text-slate-800 tracking-wider">
                      <ClockHistory className="w-3.5 h-3.5 text-blue-600" />
                      <span>QUÁ TRÌNH CHĂM SÓC KHÁCH HÀNG</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCareForm({
                          executionTime: getCurrentDateTimeLocal(),
                          hinhThuc: 'Gọi điện',
                          attitude: 'Tích cực',
                          collabNeeds: '',
                          notes: '',
                          executor: selectedPartner.owner || 'Phạm Quang Việt',
                          nextDate: '',
                          nextPriority: 'Trung bình',
                          addToSchedule: false,
                          nextTaskDesc: '',
                        });
                        setShowAddCareForm(true);
                      }}
                      className="btn btn-primary btn-sm px-2.5 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>

                  {/* Dòng thời gian (Timeline) quá trình chăm sóc */}
                  <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
                    {selectedPartner.careHistories &&
                      selectedPartner.careHistories.map((h: any, i: number) => {
                        const dObj = new Date(h.executionDate || h.createdAt);
                        const dStr = dObj.toLocaleDateString('vi-VN');
                        const tStr = dObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={h.id || i} className="relative">
                            <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                              <ChatDots size={11} />
                            </span>
                            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-extrabold uppercase text-blue-600 tracking-wide">
                                  {h.approachStep || h.hinhThuc || 'CHĂM SÓC KHÁCH HÀNG'}
                                </span>
                                <span className="text-slate-400 font-mono">
                                  {dStr} • {tStr}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 text-[12.5px]">
                                Tư vấn khách hàng ({h.attitude || 'Tích cực'})
                              </div>
                              <p className="text-slate-600 text-xs leading-relaxed">
                                {h.collabNeeds || h.notes || 'Đã liên hệ tư vấn sản phẩm và chính sách đại lý.'}
                              </p>
                              {h.deploymentPlan && (
                                <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-200 text-[11.5px] text-blue-700">
                                  <strong>Công việc tiếp theo:</strong> {h.deploymentPlan}
                                </div>
                              )}
                              <div className="text-[11px] text-slate-400 text-right pt-1">
                                Thực hiện: <strong className="text-slate-700">{h.executor || selectedPartner.owner}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Mốc khởi tạo hồ sơ ban đầu */}
                    <div className="relative">
                      <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                        <People size={11} />
                      </span>
                      <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold uppercase text-blue-600 tracking-wide">
                            TIẾP NHẬN MỚI
                          </span>
                          <span className="text-slate-400 font-mono">
                            {createdDateStr} • {createdTimeStr}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-[12.5px]">
                          Tạo mới hồ sơ khách hàng vào hệ thống CRM
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Khởi tạo hồ sơ khách hàng {selectedPartner.companyName || selectedPartner.name}.{' '}
                          <strong className="text-slate-700">
                            Nguồn tiếp cận: {getSourceLabel(selectedPartner.source)}.
                          </strong>
                        </p>
                        <div className="text-[11px] text-slate-400 text-right pt-1">
                          Thực hiện: <strong className="text-slate-700">{selectedPartner.owner}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Offcanvas>

      {/* ── OFFCANVAS THÊM KHÁCH HÀNG / ĐỐI TÁC MỚI (RỘNG 400PX) ── */}
      <Offcanvas
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm khách hàng mới"
        description="Nhập thông tin khách hàng"
        icon={<Plus size={20} className="text-blue-600" />}
        width="400px"
        bodyStyle={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
        bodyClassName="p-4 flex flex-col flex-1 min-h-0"
        footer={
          <div className="w-full flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => handleCreatePartner(e as unknown as React.FormEvent)}
            >
              Lưu khách hàng
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreatePartner} className="flex-1 flex flex-col min-h-0 gap-3 text-[13px] h-full">
          <div className="shrink-0">
            <Input
              label="Tên đại lý"
              required
              placeholder="VD: Showroom Thiết Bị Vệ Sinh Minh Long"
              value={newPartner.companyName}
              onChange={(e) =>
                setNewPartner({
                  ...newPartner,
                  companyName: e.target.value,
                  name: newPartner.name || e.target.value,
                })
              }
            />
          </div>

          <div className="shrink-0">
            <Input
              label="Địa chỉ"
              placeholder="VD: Số 120 đường Nguyễn Văn Cừ..."
              value={newPartner.address}
              onChange={(e) => setNewPartner({ ...newPartner, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-12 gap-2.5 shrink-0">
            <div className="col-span-4">
              <SuggestionInput
                label="Xưng hô"
                placeholder="Anh / Chị..."
                value={newPartner.salutation}
                onChange={(val) => setNewPartner({ ...newPartner, salutation: val })}
                suggestions={salutationSuggestions}
                showClearButton={false}
              />
            </div>
            <div className="col-span-8">
              <Input
                label="Người đại diện"
                required
                placeholder="VD: Minh"
                value={newPartner.name}
                onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2.5 shrink-0">
            <div className="col-span-5">
              <Input
                type="tel"
                label="Số điện thoại"
                required
                placeholder="0988 123 456"
                value={newPartner.phone}
                onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
              />
            </div>
            <div className="col-span-7">
              <Input
                type="email"
                label="Email liên hệ"
                placeholder="VD: daily@gmail.com"
                value={newPartner.email}
                onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            <div>
              <SuggestionInput
                label="Tỉnh thành"
                placeholder="Chọn tỉnh thành..."
                value={newPartner.area}
                onChange={(val) => setNewPartner({ ...newPartner, area: val })}
                suggestions={provinceSuggestions}
                showClearButton={false}
              />
            </div>
            <div>
              <Select
                label="Nguồn tiếp cận"
                value={newPartner.source}
                onChange={(e) => setNewPartner({ ...newPartner, source: e.target.value })}
                options={customerSources.map((src) => ({ value: src, label: src }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            <div>
              <Input
                type="date"
                label="Thời gian tiếp nhận"
                value={newPartner.receivedDate}
                onChange={(e) => setNewPartner({ ...newPartner, receivedDate: e.target.value })}
              />
            </div>
            <div>
              <SuggestionInput
                label="Người chăm sóc"
                placeholder="Chọn nhân viên KD..."
                value={newPartner.executor}
                onChange={(val) => setNewPartner({ ...newPartner, executor: val })}
                suggestions={salesEmployees}
                showClearButton={false}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="form-label block shrink-0">
              Nhu cầu hợp tác
            </label>
            <textarea
              placeholder="Nhập ghi chú nhu cầu trưng bày, mặt bằng hoặc tiềm năng khách hàng..."
              value={newPartner.notes}
              onChange={(e) => setNewPartner({ ...newPartner, notes: e.target.value })}
              className="flex-1 w-full h-full min-h-[90px] px-3 py-2 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </form>
      </Offcanvas>

      {/* ── MODAL 1: LẬP & KÝ BIÊN BẢN GHI NHỚ (FULLSCREEN) ── */}
      <BienBanModal
        open={showBienBanModal}
        partner={selectedPartner}
        onClose={() => {
          setShowBienBanModal(false);
          setShowDetailDrawer(true);
        }}
        onSaved={(updatedFields) => {
          if (!selectedPartner) return;
          setPartners((prev) =>
            prev.map((p) =>
              p.id === selectedPartner.id ? { ...p, ...updatedFields } : p
            )
          );
          setSelectedPartner((prev) =>
            prev && prev.id === selectedPartner.id
              ? { ...prev, ...updatedFields }
              : prev
          );
          setShowDetailDrawer(true);
        }}
      />

      {/* ── MODAL 2: LẬP & KÝ HỢP ĐỒNG ĐẠI LÝ (FULLSCREEN) ── */}
      <HopDongModal
        open={showContractModal}
        partner={selectedPartner}
        onClose={() => {
          setShowContractModal(false);
          setShowDetailDrawer(true);
        }}
        onSaved={(updatedFields) => {
          if (!selectedPartner) return;
          setPartners((prev) =>
            prev.map((p) =>
              p.id === selectedPartner.id ? { ...p, ...updatedFields } : p
            )
          );
          setSelectedPartner((prev) =>
            prev && prev.id === selectedPartner.id
              ? { ...prev, ...updatedFields }
              : prev
          );
          window.dispatchEvent(new Event('decodoor_contracts_updated'));
          setShowDetailDrawer(true);
        }}
      />

      {/* ── MODAL 3: LẬP & KÝ PHỤ LỤC HỢP ĐỒNG (FULLSCREEN) ── */}
      <PhuLucModal
        open={showPhuLucModal}
        partner={selectedPartner}
        onClose={() => {
          setShowPhuLucModal(false);
          setShowDetailDrawer(true);
        }}
        onSaved={(updatedFields) => {
          if (!selectedPartner) return;
          setPartners((prev) =>
            prev.map((p) =>
              p.id === selectedPartner.id ? { ...p, ...updatedFields } : p
            )
          );
          setSelectedPartner((prev) =>
            prev && prev.id === selectedPartner.id
              ? { ...prev, ...updatedFields }
              : prev
          );
          window.dispatchEvent(new Event('decodoor_contracts_updated'));
          setShowDetailDrawer(true);
        }}
      />

      {/* ── MODAL 4: XÁC NHẬN XOÁ THÔNG TIN HỢP ĐỒNG ── */}
      {showDeleteContractModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-rose-50 flex items-center justify-between">
              <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                <Trash className="w-4 h-4 text-rose-600" />
                Xác nhận xoá văn bản hợp đồng
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteContractModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs text-slate-600">
              <p>
                Bạn có chắc chắn muốn xoá toàn bộ thông tin{' '}
                <strong className="text-slate-800">Biên bản ghi nhớ, Hợp đồng và Phụ lục hợp đồng</strong>{' '}
                của đối tác <strong className="text-slate-900">{selectedPartner.companyName || selectedPartner.name}</strong>?
              </p>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteContractModal(false)}
                >
                  Hủy bỏ
                </Button>
                <button
                  type="button"
                  onClick={handleDeleteContractDocs}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Xác nhận xoá
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO BÁO GIÁ ĐẠI LÝ (BAO GIA SANITARY MODAL TỪ CLIENT-SEAJONG) ── */}
      <BaoGiaSanitaryModal
        open={showQuoteModal}
        type="agency"
        customer={quoteCustomer}
        editData={quotationEditData}
        onClose={() => {
          setShowQuoteModal(false);
          setQuoteCustomer(null);
          setQuotationEditData(null);
        }}
        onSaved={() => {
          setCurrentStep(2);
          setPage(1);
          fetchPartners();
        }}
      />
    </StepPage>
  );
};

export default SalesPartnersPage;
