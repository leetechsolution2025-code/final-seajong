import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusLg,
  Printer,
  Eye,
  ChatDots,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileEarmarkPdf,
  FileEarmarkText,
  Gift,
  BoxSeam,
  BoxArrowUpRight,
  Image as ImageIcon,
} from 'react-bootstrap-icons';
import { StepPage } from '../../components/common/StepPage';
import type { ModernStepItem } from '../../types';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Offcanvas } from '../../components/common/Offcanvas';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { DeleteButton } from '../../components/common/DeleteButton';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toggle } from '../../components/common/Toggle';
import {
  PrintPreviewModal,
  printDocumentById,
} from '../../components/common/PrintPreviewModal';
import { toast } from 'react-toastify';

const STEPS: ModernStepItem[] = [
  {
    num: 1,
    id: 'policy',
    title: 'Chính sách bán hàng',
    desc: 'Thiết lập chính sách',
    icon: 'bi-file-earmark-text',
  },
  {
    num: 2,
    id: 'promotion',
    title: 'Chương trình khuyến mãi',
    desc: 'Quản lý khuyến mãi',
    icon: 'bi-gift',
  },
  {
    num: 3,
    id: 'quotation',
    title: 'Bảng báo giá',
    desc: 'Quản lý bảng báo giá',
    icon: 'bi-cash-stack',
  },
  {
    num: 4,
    id: 'soft_skills',
    title: 'Kỹ năng mềm',
    desc: 'Đào tạo và tài liệu',
    icon: 'bi-person-workspace',
  },
];

const softSkillsGuide = [
  {
    title: '1. Chuẩn bị trước khi tiếp xúc khách hàng',
    icon: 'bi-journal-check',
    description:
      'Nắm vững kiến thức sản phẩm: thông số kỹ thuật, xuất xứ (công nghệ Hàn Quốc), chất liệu (Sứ Ceramic phủ men Nano, Inox 304, Đồng thau mạ Crom-Niken...), tính năng nổi bật và chế độ bảo hành của Seajong. Hiểu rõ chân dung khách hàng (Chủ nhà, Nhà thầu, Kiến trúc sư hay Đại lý) để có cách tiếp cận phù hợp.',
  },
  {
    title: '2. Kỹ năng tạo ấn tượng đầu tiên (30 giây đầu)',
    icon: 'bi-emoji-smile',
    description:
      'Luôn giữ thái độ niềm nở, trang phục lịch sự và tác phong chuyên nghiệp. Mở đầu bằng nụ cười, lời chào thân thiện và giới thiệu ngắn gọn, rõ ràng về bản thân cùng thương hiệu Thiết bị vệ sinh Seajong.',
  },
  {
    title: '3. Kỹ năng đặt câu hỏi và Lắng nghe chủ động',
    icon: 'bi-ear',
    description: 'Khách hàng không mua sản phẩm, họ mua giải pháp cho không gian sống của họ.',
    points: [
      'Đặt câu hỏi mở để khai thác nhu cầu: Diện tích phòng tắm, phong cách thiết kế (hiện đại, cổ điển), ngân sách dự kiến, thói quen sinh hoạt của gia đình (có người già, trẻ nhỏ không?).',
      'Lắng nghe 80% - Nói 20%: Không ngắt lời khách hàng, ghi chép lại các điểm quan trọng và thể hiện sự đồng cảm.',
    ],
  },
  {
    title: '4. Kỹ năng trình bày giải pháp (Pitching theo mô hình FAB)',
    icon: 'bi-lightbulb',
    description: 'Không chỉ liệt kê tính năng, hãy nói về lợi ích khách hàng nhận được:',
    points: [
      'Feature (Tính năng): Lớp men Nano kháng khuẩn trên bồn cầu Seajong.',
      'Advantage (Ưu điểm): Chống bám bẩn cực tốt, ngăn ngừa vi khuẩn phát triển.',
      'Benefit (Lợi ích cho khách): Giúp chị tiết kiệm 50% thời gian cọ rửa mỗi tuần và bảo vệ sức khỏe cho các bé ở nhà.',
    ],
  },
  {
    title: '5. Kỹ năng xử lý từ chối (Vượt qua rào cản)',
    icon: 'bi-shield-check',
    description:
      'Bình tĩnh đón nhận lời từ chối (chê đắt, chưa nghe tên thương hiệu, cần hỏi ý kiến gia đình...). Quy trình chuẩn: Lắng nghe -> Đồng cảm -> Cô lập vấn đề -> Giải quyết bằng giá trị thực tế (So sánh độ bền, chính sách bảo hành 1 đổi 1, dịch vụ hậu mãi tận tâm của Seajong so với chi phí bỏ ra mỗi ngày).',
  },
  {
    title: '6. Kỹ năng chốt Sale & Chăm sóc sau bán hàng',
    icon: 'bi-award',
    description:
      'Nhận diện tín hiệu mua hàng (hỏi kỹ về lắp đặt, bảo hành, chiết khấu). Đưa ra lời đề nghị chốt sale tự nhiên (lựa chọn A hoặc B, ưu đãi có giới hạn). Sau khi giao hàng, chủ động hỏi thăm quá trình lắp đặt và sử dụng để biến khách hàng cũ thành người giới thiệu khách hàng mới.',
  },
];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

export const SalesPricingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const activeStep =
    currentStep === 1
      ? 'policy'
      : currentStep === 2
      ? 'promotion'
      : currentStep === 3
      ? 'quotation'
      : 'soft_skills';

  // ── STEP 1: CHÍNH SÁCH BÁN HÀNG ────────────────────────────────────────────
  const [policySearch, setPolicySearch] = useState('');
  const [policyStatusFilter, setPolicyStatusFilter] = useState('');
  const [policyPage, setPolicyPage] = useState(1);
  const [policyLimit, setPolicyLimit] = useState(10);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyList, setPolicyList] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [isDeletingPolicy, setIsDeletingPolicy] = useState(false);

  // Form Thêm chính sách
  const [polName, setPolName] = useState('');
  const [polDocNo, setPolDocNo] = useState('');
  const [polStatus, setPolStatus] = useState('Hiệu lực');
  const [polIssueDate, setPolIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [polIssuer, setPolIssuer] = useState('Giám đốc');
  const [polSummary, setPolSummary] = useState('');
  const [polFile, setPolFile] = useState<File | null>(null);
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);

  // ── STEP 2: CHƯƠNG TRÌNH KHUYẾN MÃI ────────────────────────────────────────
  const [promotionSearch, setPromotionSearch] = useState('');
  const [promotionStatusFilter, setPromotionStatusFilter] = useState('');
  const [promotionPage, setPromotionPage] = useState(1);
  const [promotionLimit, setPromotionLimit] = useState(10);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionList, setPromotionList] = useState<any[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [selectedPromoIds, setSelectedPromoIds] = useState<string[]>([]);
  const [isDeletingPromo, setIsDeletingPromo] = useState(false);

  // Form Thêm khuyến mãi
  const [promoName, setPromoName] = useState('');
  const [promoDocNo, setPromoDocNo] = useState('');
  const [promoStatus, setPromoStatus] = useState('Hiệu lực');
  const [promoStartDate, setPromoStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [promoEndDate, setPromoEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [promoSummary, setPromoSummary] = useState('');
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);

  // PDF Preview Modal
  const [previewPdfItem, setPreviewPdfItem] = useState<any | null>(null);

  // ── STEP 3: BẢNG BÁO GIÁ ───────────────────────────────────────────────────
  const [quotationSearch, setQuotationSearch] = useState('');
  const [quotationCategoryFilter, setQuotationCategoryFilter] = useState('');
  const [quotationCategories, setQuotationCategories] = useState<string[]>([]);
  const [quotationData, setQuotationData] = useState<any[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(true);
  const [pricingSource, setPricingSource] = useState<'commercial' | 'oem'>('commercial');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductOffcanvas, setShowProductOffcanvas] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Product Detail Offcanvas image carousel + single product print
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [showSingleProductPrint, setShowSingleProductPrint] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // Quotation Print Preview state
  const [printCustomerName, setPrintCustomerName] = useState('');
  const [printCustomerAddress, setPrintCustomerAddress] = useState('');
  const [printCustomerPhone, setPrintCustomerPhone] = useState('');
  const [printCustomerEmail, setPrintCustomerEmail] = useState('');
  const [printContactPerson, setPrintContactPerson] = useState('');
  const [printQuotationDate, setPrintQuotationDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [printValidUntil, setPrintValidUntil] = useState(() =>
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [printNotes, setPrintNotes] = useState(
    '1. Báo giá trên chưa bao gồm thuế GTGT (VAT).\n2. Giao hàng miễn phí trong nội thành cho đơn hàng từ 10.000.000 VNĐ.\n3. Thanh toán 100% trước khi giao hàng hoặc theo hợp đồng nguyên tắc.'
  );
  const [printShowStamp, setPrintShowStamp] = useState(true);

  // ── STEP 4: KỸ NĂNG MỀM (Q&A) ──────────────────────────────────────────────
  const [qaList, setQaList] = useState<any[]>([]);
  const [loadingQa, setLoadingQa] = useState(true);
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [qaSearch, setQaSearch] = useState('');
  const [showQaModal, setShowQaModal] = useState(false);
  const [selectedQaIds, setSelectedQaIds] = useState<number[]>([]);
  const [isDeletingQa, setIsDeletingQa] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [isSubmittingQa, setIsSubmittingQa] = useState(false);

  // ── FETCH DATA ─────────────────────────────────────────────────────────────
  const fetchPolicies = async () => {
    try {
      setLoadingPolicies(true);
      const res = await fetch('/api/sales/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicyList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      setLoadingPromotions(true);
      const res = await fetch('/api/sales/promotions');
      if (res.ok) {
        const data = await res.json();
        setPromotionList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoadingPromotions(false);
    }
  };

  const fetchQA = async () => {
    try {
      setLoadingQa(true);
      const res = await fetch('/api/soft-skills-qa');
      if (res.ok) {
        const data = await res.json();
        setQaList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching Q&A:', error);
    } finally {
      setLoadingQa(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingQuotations(true);
      setSelectedProducts([]);

      if (pricingSource === 'oem') {
        const res = await fetch('/api/sales/pricing/oem', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const items = data.products || [];
          const cats = new Set<string>();

          const formatted = items.map((p: any, idx: number) => {
            const catName = p.categoryName || 'Khác';
            cats.add(catName);
            return {
              id: p.id || idx + 1,
              productCode: p.code || '',
              productName: p.name,
              categoryName: catName,
              specification: p.specification || 'BỘ',
              listedPrice: p.listedPrice || 0,
              bomCode: p.bomCode || '',
              bomName: p.bomName || '',
              note: p.note || '',
              imageUrl: p.imageUrl || undefined,
              originalData: p.originalData || p,
            };
          });

          setQuotationCategories(Array.from(cats));
          setQuotationCategoryFilter('');
          setQuotationData(formatted);

          const initialCollapsed: Record<string, boolean> = {};
          cats.forEach((c) => {
            initialCollapsed[c] = true;
          });
          setCollapsedCategories(initialCollapsed);
        }
      } else {
        const res = await fetch('/api/seajong/products?per_page=1000');
        if (res.ok) {
          const data = await res.json();
          const items = data.products || [];

          const extractProductCode = (name: string) => {
            const match = name.match(/(SJ-[A-Z0-9-]+|S-[A-Z0-9-]+)/i);
            return match ? match[0].toUpperCase() : '';
          };

          const cats = new Set<string>();
          const formatted = items.map((p: any, idx: number) => {
            const catNames: string[] = Array.isArray(p.categoryNames)
              ? p.categoryNames
              : Array.isArray(p.categories)
              ? p.categories.map((c: any) => (typeof c === 'object' ? c?.name : '')).filter(Boolean)
              : [];
            const specificCats = catNames.filter(
              (n) => n !== 'Thiết bị vệ sinh' && n !== 'Thiết bị nhà bếp'
            );
            const catName = specificCats[0] || catNames[0] || 'Khác';
            cats.add(catName);
            return {
              id: p.id || idx + 1,
              productCode: p.specs?.['Mã sản phẩm'] || extractProductCode(p.name),
              productName: p.name,
              categoryName: catName,
              specification: 'BỘ',
              listedPrice: p.price || 0,
              bomCode: '',
              bomName: '',
              note: '',
              imageUrl: p.images && p.images.length > 0 ? p.images[0] : undefined,
              originalData: p,
            };
          });

          setQuotationCategories(Array.from(cats));
          setQuotationCategoryFilter('');
          setQuotationData(formatted);

          const initialCollapsed: Record<string, boolean> = {};
          cats.forEach((c) => {
            initialCollapsed[c] = true;
          });
          setCollapsedCategories(initialCollapsed);
        }
      }
    } catch (err) {
      console.error('Error fetching products for quotation:', err);
    } finally {
      setLoadingQuotations(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    fetchPromotions();
    fetchQA();
    fetch('/api/company')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setCompanyInfo(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [pricingSource]);

  // ── HANDLERS: STEP 1 (POLICY) ──────────────────────────────────────────────
  const filteredPolicyData = useMemo(() => {
    return policyList.filter((item) => {
      const matchSearch =
        item.name?.toLowerCase().includes(policySearch.toLowerCase()) ||
        (item.docNo && item.docNo.toLowerCase().includes(policySearch.toLowerCase()));
      const matchStatus = policyStatusFilter ? item.status === policyStatusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [policyList, policySearch, policyStatusFilter]);

  const paginatedPolicyData = useMemo(() => {
    return filteredPolicyData.slice((policyPage - 1) * policyLimit, policyPage * policyLimit);
  }, [filteredPolicyData, policyPage, policyLimit]);

  const handleToggleSelectAllPolicies = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPolicyIds(filteredPolicyData.map((item) => item.id));
    } else {
      setSelectedPolicyIds([]);
    }
  };

  const handleToggleSelectPolicy = (id: string) => {
    setSelectedPolicyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polName.trim()) {
      toast.error('Vui lòng nhập tên chính sách');
      return;
    }
    try {
      setIsSubmittingPolicy(true);
      let fileDataUrl = '';
      let fileName = '';
      if (polFile) {
        fileDataUrl = await fileToDataUrl(polFile);
        fileName = polFile.name;
      }

      const res = await fetch('/api/sales/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: polName.trim(),
          docNo: polDocNo.trim(),
          status: polStatus,
          issueDate: polIssueDate,
          issuer: polIssuer.trim(),
          summary: polSummary.trim(),
          fileDataUrl,
          fileName,
        }),
      });

      if (!res.ok) throw new Error('Failed to create policy');

      toast.success('Thêm chính sách thành công');
      setPolName('');
      setPolDocNo('');
      setPolStatus('Hiệu lực');
      setPolIssueDate(new Date().toISOString().split('T')[0]);
      setPolIssuer('Giám đốc');
      setPolSummary('');
      setPolFile(null);
      setShowPolicyModal(false);
      fetchPolicies();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu chính sách.');
    } finally {
      setIsSubmittingPolicy(false);
    }
  };

  const confirmBulkDeletePolicies = async () => {
    if (selectedPolicyIds.length === 0) return;
    try {
      setIsDeletingPolicy(true);
      const res = await fetch('/api/sales/policies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPolicyIds }),
      });

      if (!res.ok) throw new Error('Failed to delete policies');

      toast.success(`Đã xóa ${selectedPolicyIds.length} chính sách`);
      setSelectedPolicyIds([]);
      fetchPolicies();
    } catch (error) {
      console.error('Error deleting policies:', error);
      toast.error('Có lỗi xảy ra khi xóa chính sách.');
    } finally {
      setIsDeletingPolicy(false);
    }
  };

  // ── HANDLERS: STEP 2 (PROMOTION) ───────────────────────────────────────────
  const filteredPromotionData = useMemo(() => {
    return promotionList.filter((item) => {
      const matchSearch =
        item.name?.toLowerCase().includes(promotionSearch.toLowerCase()) ||
        (item.docNo && item.docNo.toLowerCase().includes(promotionSearch.toLowerCase()));
      const matchStatus = promotionStatusFilter ? item.status === promotionStatusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [promotionList, promotionSearch, promotionStatusFilter]);

  const paginatedPromotionData = useMemo(() => {
    return filteredPromotionData.slice(
      (promotionPage - 1) * promotionLimit,
      promotionPage * promotionLimit
    );
  }, [filteredPromotionData, promotionPage, promotionLimit]);

  const handleToggleSelectAllPromos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPromoIds(filteredPromotionData.map((item) => item.id));
    } else {
      setSelectedPromoIds([]);
    }
  };

  const handleToggleSelectPromo = (id: string) => {
    setSelectedPromoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim()) {
      toast.error('Vui lòng nhập tên chương trình khuyến mãi');
      return;
    }
    try {
      setIsSubmittingPromo(true);
      let fileDataUrl = '';
      let fileName = '';
      if (promoFile) {
        fileDataUrl = await fileToDataUrl(promoFile);
        fileName = promoFile.name;
      }

      const res = await fetch('/api/sales/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promoName.trim(),
          docNo: promoDocNo.trim(),
          status: promoStatus,
          startDate: promoStartDate,
          endDate: promoEndDate,
          summary: promoSummary.trim(),
          fileDataUrl,
          fileName,
        }),
      });

      if (!res.ok) throw new Error('Failed to create promotion');

      toast.success('Thêm chương trình khuyến mãi thành công');
      setPromoName('');
      setPromoDocNo('');
      setPromoStatus('Hiệu lực');
      setPromoStartDate(new Date().toISOString().split('T')[0]);
      setPromoEndDate(new Date().toISOString().split('T')[0]);
      setPromoSummary('');
      setPromoFile(null);
      setShowPromotionModal(false);
      fetchPromotions();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu chương trình khuyến mãi.');
    } finally {
      setIsSubmittingPromo(false);
    }
  };

  const confirmBulkDeletePromos = async () => {
    if (selectedPromoIds.length === 0) return;
    try {
      setIsDeletingPromo(true);
      const res = await fetch('/api/sales/promotions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPromoIds }),
      });

      if (!res.ok) throw new Error('Failed to delete promotions');

      toast.success(`Đã xóa ${selectedPromoIds.length} chương trình khuyến mãi`);
      setSelectedPromoIds([]);
      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotions:', error);
      toast.error('Có lỗi xảy ra khi xóa khuyến mãi.');
    } finally {
      setIsDeletingPromo(false);
    }
  };

  // ── HANDLERS: STEP 3 (QUOTATION) ───────────────────────────────────────────
  const filteredQuotationData = useMemo(() => {
    return quotationData.filter((item) => {
      const q = quotationSearch.toLowerCase();
      const matchSearch =
        item.productName?.toLowerCase().includes(q) ||
        item.productCode?.toLowerCase().includes(q) ||
        (item.bomCode && item.bomCode.toLowerCase().includes(q)) ||
        (item.bomName && item.bomName.toLowerCase().includes(q));
      const matchCategory = quotationCategoryFilter
        ? item.categoryName === quotationCategoryFilter
        : true;
      return matchSearch && matchCategory;
    });
  }, [quotationData, quotationSearch, quotationCategoryFilter]);

  const groupedQuotationRows = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredQuotationData.forEach((item) => {
      const cat = item.categoryName || 'Khác';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    const rows: any[] = [];
    Object.keys(groups).forEach((cat) => {
      const isCollapsed = collapsedCategories[cat];
      rows.push({
        id: `header-${cat}`,
        isCategoryHeader: true,
        categoryName: cat,
        count: groups[cat].length,
        isCollapsed,
      });
      if (!isCollapsed) {
        groups[cat].forEach((item) => {
          rows.push(item);
        });
      }
    });
    return rows;
  }, [filteredQuotationData, collapsedCategories]);

  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const handleToggleSelectAllProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allRealProducts = filteredQuotationData.filter((item) => !item.isCategoryHeader);
      setSelectedProducts(allRealProducts);
    } else {
      setSelectedProducts([]);
    }
  };

  const handleToggleSelectProduct = (row: any) => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === row.id);
      if (exists) return prev.filter((p) => p.id !== row.id);
      return [...prev, row];
    });
  };

  // ── HANDLERS: STEP 4 (SOFT SKILLS Q&A) ─────────────────────────────────────
  const filteredQA = useMemo(() => {
    return qaList.filter(
      (item) =>
        item.question?.toLowerCase().includes(qaSearch.toLowerCase()) ||
        item.answer?.toLowerCase().includes(qaSearch.toLowerCase())
    );
  }, [qaList, qaSearch]);

  const handleToggleSelectQA = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedQaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || !qaAnswer.trim()) {
      toast.error('Vui lòng nhập đầy đủ câu hỏi và câu trả lời');
      return;
    }
    try {
      setIsSubmittingQa(true);
      const res = await fetch('/api/soft-skills-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qaQuestion.trim(),
          answer: qaAnswer.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to create Q&A');
      toast.success('Đã thêm câu hỏi thành công');
      setQaQuestion('');
      setQaAnswer('');
      setShowQaModal(false);
      fetchQA();
    } catch (error) {
      console.error('Error creating QA:', error);
      toast.error('Có lỗi xảy ra khi thêm câu hỏi.');
    } finally {
      setIsSubmittingQa(false);
    }
  };

  const confirmBulkDeleteQA = async () => {
    if (selectedQaIds.length === 0) return;
    try {
      setIsDeletingQa(true);
      const res = await fetch('/api/soft-skills-qa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedQaIds }),
      });

      if (!res.ok) throw new Error('Failed to delete Q&A');

      toast.success(`Đã xóa ${selectedQaIds.length} câu hỏi`);
      setSelectedQaIds([]);
      fetchQA();
    } catch (error) {
      console.error('Error deleting QA:', error);
      toast.error('Có lỗi xảy ra khi xóa câu hỏi.');
    } finally {
      setIsDeletingQa(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const productsToPrint = useMemo(() => {
    return selectedProducts.length > 0
      ? selectedProducts
      : filteredQuotationData.filter((i) => !i.isCategoryHeader);
  }, [selectedProducts, filteredQuotationData]);

  const groupedPrintProducts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    productsToPrint.forEach((p) => {
      const cat = p.categoryName || 'Sản phẩm khác';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [productsToPrint]);

  return (
    <StepPage
      title="Chính sách bán hàng"
      badge="PRICING"
      description="Thiết lập bảng giá riêng biệt cho từng cấp đại lý"
      icon="bi-tags"
      color="violet"
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      hideTicker={true}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 1: CHÍNH SÁCH BÁN HÀNG
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeStep === 'policy' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TableToolbar
            searchPlaceholder="Tìm kiếm văn bản..."
            searchValue={policySearch}
            onSearchChange={(val) => {
              setPolicySearch(val);
              setPolicyPage(1);
            }}
            filters={[
              {
                id: 'policy-status',
                value: policyStatusFilter,
                onChange: (val) => {
                  setPolicyStatusFilter(val);
                  setPolicyPage(1);
                },
                minWidth: '170px',
                options: [
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'Hiệu lực', label: 'Hiệu lực' },
                  { value: 'Hết hiệu lực', label: 'Hết hiệu lực' },
                ],
              },
            ]}
            rightActions={
              <div className="flex items-center gap-2">
                {selectedPolicyIds.length > 0 && (
                  <DeleteButton
                    size="sm"
                    itemCount={selectedPolicyIds.length}
                    disabled={isDeletingPolicy}
                    dialogTitle="Xác nhận xóa chính sách"
                    dialogMessage={`Bạn có chắc chắn muốn xóa ${selectedPolicyIds.length} chính sách đã chọn? Hành động này không thể hoàn tác.`}
                    onConfirm={confirmBulkDeletePolicies}
                  />
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlusLg size={13} />}
                  onClick={() => setShowPolicyModal(true)}
                >
                  Thêm chính sách
                </Button>
              </div>
            }
            showMenu={false}
          />

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={loadingPolicies}
              emptyText="Chưa có văn bản chính sách phù hợp"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={
                          filteredPolicyData.length > 0 &&
                          selectedPolicyIds.length === filteredPolicyData.length
                        }
                        onChange={handleToggleSelectAllPolicies}
                      />
                    </th>
                    <th className="py-2.5 px-3.5 w-[60px] text-center">STT</th>
                    <th className="py-2.5 px-3.5 w-[30%]">Tên văn bản</th>
                    <th className="py-2.5 px-3.5 w-[15%]">Ngày ban hành</th>
                    <th className="py-2.5 px-3.5">Tóm tắt nội dung</th>
                    <th className="py-2.5 px-3.5 w-[140px] text-center">Trạng thái</th>
                    <th className="py-2.5 px-3.5 w-[55px] text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPolicyData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                        Chưa có văn bản chính sách phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginatedPolicyData.map((row, index) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td
                          className="py-2.5 px-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedPolicyIds.includes(row.id)}
                            onChange={() => handleToggleSelectPolicy(row.id)}
                          />
                        </td>
                        <td className="py-2.5 px-3.5 text-center text-slate-500 font-medium">
                          {(policyPage - 1) * policyLimit + index + 1}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-[#175cd3] text-[13px]">{row.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{row.docNo}</div>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-xs font-mono font-medium">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-xs leading-relaxed">
                          {row.summary}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <Badge
                            variant={row.status === 'Hiệu lực' ? 'success' : 'neutral'}
                            hasDot
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.pdfUrl) {
                                setPreviewPdfItem(row);
                              } else {
                                toast.info('Văn bản này chưa có tệp PDF đính kèm');
                              }
                            }}
                            className={row.pdfUrl ? 'text-slate-600' : 'text-slate-300 opacity-50'}
                            title={row.pdfUrl ? 'Xem chi tiết & PDF' : 'Không có tệp PDF'}
                          >
                            <Eye size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </FullWidthTable>
          </div>

          <Pagination
            currentPage={policyPage}
            totalPages={Math.max(1, Math.ceil(filteredPolicyData.length / policyLimit))}
            pageSize={policyLimit}
            totalItems={filteredPolicyData.length}
            itemName="văn bản"
            onPageChange={setPolicyPage}
            onPageSizeChange={(size) => {
              setPolicyLimit(size);
              setPolicyPage(1);
            }}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 2: CHƯƠNG TRÌNH KHUYẾN MÃI
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeStep === 'promotion' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TableToolbar
            searchPlaceholder="Tìm kiếm chương trình..."
            searchValue={promotionSearch}
            onSearchChange={(val) => {
              setPromotionSearch(val);
              setPromotionPage(1);
            }}
            filters={[
              {
                id: 'promo-status',
                value: promotionStatusFilter,
                onChange: (val) => {
                  setPromotionStatusFilter(val);
                  setPromotionPage(1);
                },
                minWidth: '170px',
                options: [
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'Hiệu lực', label: 'Hiệu lực' },
                  { value: 'Hết hiệu lực', label: 'Hết hiệu lực' },
                ],
              },
            ]}
            rightActions={
              <div className="flex items-center gap-2">
                {selectedPromoIds.length > 0 && (
                  <DeleteButton
                    size="sm"
                    itemCount={selectedPromoIds.length}
                    disabled={isDeletingPromo}
                    dialogTitle="Xác nhận xóa khuyến mãi"
                    dialogMessage={`Bạn có chắc chắn muốn xóa ${selectedPromoIds.length} chương trình khuyến mãi đã chọn? Hành động này không thể hoàn tác.`}
                    onConfirm={confirmBulkDeletePromos}
                  />
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PlusLg size={13} />}
                  onClick={() => setShowPromotionModal(true)}
                >
                  Thêm khuyến mãi
                </Button>
              </div>
            }
            showMenu={false}
          />

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={loadingPromotions}
              emptyText="Chưa có chương trình khuyến mãi phù hợp"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={
                          filteredPromotionData.length > 0 &&
                          selectedPromoIds.length === filteredPromotionData.length
                        }
                        onChange={handleToggleSelectAllPromos}
                      />
                    </th>
                    <th className="py-2.5 px-3.5 w-[60px] text-center">STT</th>
                    <th className="py-2.5 px-3.5 w-[28%]">Tên văn bản</th>
                    <th className="py-2.5 px-3.5 w-[18%]">Thời gian hiệu lực</th>
                    <th className="py-2.5 px-3.5">Tóm tắt nội dung</th>
                    <th className="py-2.5 px-3.5 w-[140px] text-center">Trạng thái</th>
                    <th className="py-2.5 px-3.5 w-[55px] text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPromotionData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                        Chưa có chương trình khuyến mãi phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginatedPromotionData.map((row, index) => (
                      <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                        <td
                          className="py-2.5 px-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={selectedPromoIds.includes(row.id)}
                            onChange={() => handleToggleSelectPromo(row.id)}
                          />
                        </td>
                        <td className="py-2.5 px-3.5 text-center text-slate-500 font-medium">
                          {(promotionPage - 1) * promotionLimit + index + 1}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-[#175cd3] text-[13px]">{row.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{row.docNo}</div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="text-xs text-slate-600 font-mono">
                            <span className="text-slate-400 font-sans">Bắt đầu:</span>{' '}
                            {row.startDate}
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-0.5">
                            <span className="text-slate-400 font-sans">Kết thúc:</span>{' '}
                            {row.endDate}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-xs leading-relaxed">
                          {row.summary}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <Badge
                            variant={row.status === 'Hiệu lực' ? 'success' : 'neutral'}
                            hasDot
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.pdfUrl) {
                                setPreviewPdfItem(row);
                              } else {
                                toast.info('Chương trình này chưa có tệp PDF đính kèm');
                              }
                            }}
                            className={row.pdfUrl ? 'text-slate-600' : 'text-slate-300 opacity-50'}
                            title={row.pdfUrl ? 'Xem chi tiết & PDF' : 'Không có tệp PDF'}
                          >
                            <Eye size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </FullWidthTable>
          </div>

          <Pagination
            currentPage={promotionPage}
            totalPages={Math.max(1, Math.ceil(filteredPromotionData.length / promotionLimit))}
            pageSize={promotionLimit}
            totalItems={filteredPromotionData.length}
            itemName="chương trình"
            onPageChange={setPromotionPage}
            onPageSizeChange={(size) => {
              setPromotionLimit(size);
              setPromotionPage(1);
            }}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 3: BẢNG BÁO GIÁ
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeStep === 'quotation' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <TableToolbar
            searchPlaceholder={
              pricingSource === 'oem'
                ? 'Tìm theo tên, mã OEM, mã định mức...'
                : 'Tìm kiếm sản phẩm...'
            }
            searchValue={quotationSearch}
            onSearchChange={setQuotationSearch}
            actionsBeforeSearch={
              <div
                className={`inline-flex items-center px-3 h-[34px] rounded-lg border transition-colors ${
                  pricingSource === 'oem'
                    ? 'bg-blue-50/80 border-blue-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
                title="Chuyển đổi giữa hàng thương mại và sản phẩm OEM có định mức trong kho sản xuất & lắp ráp"
              >
                <Toggle
                  checked={pricingSource === 'oem'}
                  onChange={(checked) => setPricingSource(checked ? 'oem' : 'commercial')}
                  label="Sản phẩm OEM"
                />
              </div>
            }
            filters={[
              {
                id: 'quotation-category',
                value: quotationCategoryFilter,
                onChange: setQuotationCategoryFilter,
                minWidth: '210px',
                options: [
                  { value: '', label: 'Tất cả nhóm hàng' },
                  ...quotationCategories.map((cat) => ({ value: cat, label: cat })),
                ],
              },
            ]}
            rightActions={
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Printer size={14} />}
                  onClick={() => setShowPrintModal(true)}
                >
                  In báo giá
                  {selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ''}
                </Button>
              </div>
            }
            showMenu={false}
          />

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FullWidthTable
              loading={loadingQuotations}
              emptyText="Không tìm thấy sản phẩm phù hợp"
            >
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={
                          filteredQuotationData.length > 0 &&
                          selectedProducts.length === filteredQuotationData.length
                        }
                        onChange={handleToggleSelectAllProducts}
                      />
                    </th>
                    <th className="py-2.5 px-3.5">Thông tin sản phẩm</th>
                    <th className="py-2.5 px-3.5 w-[15%] text-center">Quy cách</th>
                    <th className="py-2.5 px-3.5 w-[18%] text-right">Giá niêm yết</th>
                    <th className="py-2.5 px-3.5 w-[20%]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedQuotationRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                        Không tìm thấy sản phẩm phù hợp
                      </td>
                    </tr>
                  ) : (
                    groupedQuotationRows.map((row) => {
                      if (row.isCategoryHeader) {
                        return (
                          <tr
                            key={row.id}
                            onClick={() => toggleCategoryCollapse(row.categoryName)}
                            className="bg-slate-50/90 hover:bg-slate-100/80 cursor-pointer select-none border-y border-slate-200/80 transition-colors"
                          >
                            <td colSpan={5} className="py-2.5 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-[#003087] uppercase text-xs tracking-wide">
                                  {row.isCollapsed ? (
                                    <ChevronRight size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )}
                                  <span>{row.categoryName}</span>
                                </div>
                                <Badge variant="neutral">{row.count} sản phẩm</Badge>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const isSelected = selectedProducts.some((p) => p.id === row.id);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setSelectedProduct(row.originalData);
                            setCurrentImageIdx(0);
                            setShowProductOffcanvas(true);
                          }}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                        >
                          <td
                            className="py-2.5 px-3.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduct(row)}
                            />
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-semibold text-slate-800 text-[13px]">
                              {row.productName}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {row.productCode && (
                                <span className="text-xs text-slate-400 font-mono">
                                  {row.productCode}
                                </span>
                              )}
                              {row.bomCode && (
                                <Badge
                                  variant="brand"
                                  className="text-[11px]"
                                  style={{ cursor: 'help' }}
                                >
                                  <i className="bi bi-diagram-3 mr-1" />
                                  ĐM: {row.bomCode}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-center text-xs font-medium text-slate-600">
                            {row.specification}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            {Number(row.listedPrice || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3.5 text-xs text-slate-400">{row.note}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </FullWidthTable>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 4: KỸ NĂNG MỀM (CẨM NANG + Q&A)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeStep === 'soft_skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-2 flex-1 min-h-0 overflow-hidden bg-slate-50/50">
          {/* Cột trái: Cẩm nang Kỹ năng mềm */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
              <i className="bi bi-book-half text-blue-600 text-base" />
              <h5 className="font-bold text-slate-800 text-sm m-0">Cẩm nang Kỹ năng mềm</h5>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-2.5">
              {softSkillsGuide.map((section, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 transition-colors shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <i className={`bi ${section.icon} text-base`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h6 className="font-bold text-slate-800 text-[13px] mb-1">{section.title}</h6>
                      <p className="text-slate-600 text-xs leading-relaxed mb-0">
                        {section.description}
                      </p>
                      {section.points && (
                        <ul className="mt-2 space-y-1 pl-4 list-disc text-slate-600 text-xs leading-relaxed">
                          {section.points.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Danh sách Q&A xử lý tình huống */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <TableToolbar
              searchPlaceholder="Tìm kiếm câu hỏi..."
              searchValue={qaSearch}
              onSearchChange={setQaSearch}
              rightActions={
                <div className="flex items-center gap-2">
                  {selectedQaIds.length > 0 && (
                    <DeleteButton
                      size="sm"
                      itemCount={selectedQaIds.length}
                      disabled={isDeletingQa}
                      dialogTitle="Xác nhận xóa câu hỏi"
                      dialogMessage={`Bạn có chắc chắn muốn xóa ${selectedQaIds.length} câu hỏi đã chọn? Hành động này không thể hoàn tác.`}
                      onConfirm={confirmBulkDeleteQA}
                    />
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<PlusLg size={13} />}
                    onClick={() => setShowQaModal(true)}
                  >
                    Thêm câu hỏi
                  </Button>
                </div>
              }
              showMenu={false}
            />

            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {loadingQa ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Đang tải bộ câu hỏi...
                </div>
              ) : filteredQA.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Không tìm thấy câu hỏi nào phù hợp với &ldquo;{qaSearch}&rdquo;
                </div>
              ) : (
                filteredQA.map((item, idx) => {
                  const isOpen = expandedQA === idx;
                  const isSelected = selectedQaIds.includes(item.id);
                  return (
                    <div
                      key={item.id ?? idx}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isOpen
                          ? 'border-blue-400 shadow-xs bg-white'
                          : 'border-slate-200/80 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedQA(isOpen ? null : idx)}
                        className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none ${
                          isOpen ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div onClick={(e) => handleToggleSelectQA(item.id, e)}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              isOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {item.order || idx + 1}
                          </span>
                          <span
                            className={`text-xs leading-snug ${
                              isOpen ? 'font-bold text-blue-700' : 'font-semibold text-slate-800'
                            }`}
                          >
                            {item.question}
                          </span>
                        </div>
                        <div className="shrink-0 text-slate-400">
                          {isOpen ? (
                            <ChevronUp size={14} className="text-blue-600" />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="px-4 pb-3.5 pt-2 border-t border-slate-100 bg-white">
                          <div className="pl-8 flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                            <ChatDots size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>{item.answer}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          OFFCANVAS 1: THÊM CHÍNH SÁCH MỚI
      ═══════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        title="Thêm chính sách mới"
        icon={<FileEarmarkText size={20} />}
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPolicyModal(false)}
              disabled={isSubmittingPolicy}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="add-policy-form"
              variant="primary"
              size="sm"
              isLoading={isSubmittingPolicy}
            >
              Lưu chính sách
            </Button>
          </div>
        }
      >
        <form id="add-policy-form" onSubmit={handleCreatePolicy} className="space-y-3.5 p-1">
          <Input
            label="Tên chính sách *"
            required
            placeholder="Nhập tên chính sách..."
            value={polName}
            onChange={(e) => setPolName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số văn bản"
              placeholder="125/2026/CS-SJ"
              value={polDocNo}
              onChange={(e) => setPolDocNo(e.target.value)}
            />
            <Select
              label="Trạng thái"
              value={polStatus}
              onChange={(e) => setPolStatus(e.target.value)}
              options={[
                { value: 'Hiệu lực', label: 'Đang hiệu lực' },
                { value: 'Hết hiệu lực', label: 'Hết hiệu lực' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Ngày ban hành"
              value={polIssueDate}
              onChange={(e) => setPolIssueDate(e.target.value)}
            />
            <Input
              label="Người ban hành"
              placeholder="Nhập người ban hành..."
              value={polIssuer}
              onChange={(e) => setPolIssuer(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tóm tắt nội dung
            </label>
            <textarea
              rows={3}
              placeholder="Nhập tóm tắt nội dung chính sách..."
              value={polSummary}
              onChange={(e) => setPolSummary(e.target.value)}
              className="form-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tải tệp văn bản gốc (PDF)
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setPolFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1"
            />
          </div>
        </form>
      </Offcanvas>

      {/* ═══════════════════════════════════════════════════════════════════════
          OFFCANVAS 2: THÊM CHƯƠNG TRÌNH KHUYẾN MÃI
      ═══════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        title="Thêm khuyến mãi mới"
        icon={<Gift size={20} />}
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPromotionModal(false)}
              disabled={isSubmittingPromo}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="add-promotion-form"
              variant="primary"
              size="sm"
              isLoading={isSubmittingPromo}
            >
              Lưu chương trình
            </Button>
          </div>
        }
      >
        <form id="add-promotion-form" onSubmit={handleCreatePromotion} className="space-y-3.5 p-1">
          <Input
            label="Tên chương trình *"
            required
            placeholder="Nhập tên chương trình khuyến mãi..."
            value={promoName}
            onChange={(e) => setPromoName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số văn bản"
              placeholder="015/2026/CTKM-SJ"
              value={promoDocNo}
              onChange={(e) => setPromoDocNo(e.target.value)}
            />
            <Select
              label="Trạng thái"
              value={promoStatus}
              onChange={(e) => setPromoStatus(e.target.value)}
              options={[
                { value: 'Hiệu lực', label: 'Đang hiệu lực' },
                { value: 'Hết hiệu lực', label: 'Hết hiệu lực' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Ngày bắt đầu"
              value={promoStartDate}
              onChange={(e) => setPromoStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="Ngày kết thúc"
              value={promoEndDate}
              onChange={(e) => setPromoEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tóm tắt nội dung
            </label>
            <textarea
              rows={3}
              placeholder="Nhập tóm tắt nội dung chương trình khuyến mãi..."
              value={promoSummary}
              onChange={(e) => setPromoSummary(e.target.value)}
              className="form-input w-full text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tải tệp văn bản gốc (PDF)
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setPromoFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1"
            />
          </div>
        </form>
      </Offcanvas>

      {/* ═══════════════════════════════════════════════════════════════════════
          OFFCANVAS 3: CHI TIẾT SẢN PHẨM (BẢNG BÁO GIÁ)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Offcanvas
        isOpen={showProductOffcanvas}
        onClose={() => setShowProductOffcanvas(false)}
        title="Chi tiết sản phẩm"
        icon={<BoxSeam size={20} />}
        width="400px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowProductOffcanvas(false)}>
              Đóng
            </Button>
            {selectedProduct && (
              <Button
                variant="primary"
                size="sm"
                icon={<Printer size={13} />}
                onClick={() => setShowSingleProductPrint(true)}
              >
                In thông tin
              </Button>
            )}
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-4 p-1">
            {(() => {
              const images: string[] = Array.isArray(selectedProduct.images)
                ? selectedProduct.images
                : [];
              return (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 h-[250px] flex items-center justify-center overflow-hidden">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[currentImageIdx] || images[0]}
                        alt={selectedProduct.name}
                        className="max-h-full max-w-full object-contain"
                      />
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentImageIdx((prev) =>
                                prev === 0 ? images.length - 1 : prev - 1
                              )
                            }
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center text-slate-700"
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentImageIdx((prev) =>
                                prev === images.length - 1 ? 0 : prev + 1
                              )
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center text-slate-700"
                          >
                            <ChevronRight size={15} />
                          </button>
                          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
                            {images.map((_, i) => (
                              <span
                                key={i}
                                onClick={() => setCurrentImageIdx(i)}
                                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                                  i === currentImageIdx
                                    ? 'bg-blue-600 scale-110'
                                    : 'bg-slate-400/60'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 gap-2">
                      <ImageIcon size={36} />
                      <span className="text-xs">Chưa có hình ảnh</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div>
              <h5 className="font-bold text-slate-800 text-sm leading-snug mb-1">
                {selectedProduct.name}
              </h5>
              <div className="font-bold text-rose-600 text-base font-mono">
                {selectedProduct.price
                  ? `${Number(selectedProduct.price).toLocaleString('vi-VN')} đ`
                  : 'Liên hệ'}
              </div>
            </div>

            <div>
              <h6 className="font-bold text-slate-700 text-xs uppercase tracking-wider pb-1.5 mb-2 border-b border-slate-200">
                Thông số kỹ thuật
              </h6>
              {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
                  {Object.entries(selectedProduct.specs).map(([key, val]: any, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 px-3 py-2 text-xs ${
                        idx % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="col-span-5 text-slate-500 font-medium">{key}</div>
                      <div className="col-span-7 text-slate-800 font-semibold break-words">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">Chưa cập nhật thông số kỹ thuật.</p>
              )}
            </div>

            {selectedProduct.excerpt && (
              <div>
                <h6 className="font-bold text-slate-700 text-xs uppercase tracking-wider pb-1.5 mb-2 border-b border-slate-200">
                  Mô tả ngắn
                </h6>
                <div
                  className="text-xs text-slate-600 leading-relaxed"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {selectedProduct.excerpt}
                </div>
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: THÊM CÂU HỎI KỸ NĂNG MỀM (Q&A)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showQaModal}
        onClose={() => setShowQaModal(false)}
        title="Thêm câu hỏi xử lý tình huống"
        headerIcon={<ChatDots size={18} />}
        maxWidth="520px"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowQaModal(false)}
              disabled={isSubmittingQa}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="add-qa-form"
              variant="primary"
              size="sm"
              isLoading={isSubmittingQa}
            >
              Thêm câu hỏi
            </Button>
          </div>
        }
      >
        <form id="add-qa-form" onSubmit={handleCreateQA} className="space-y-3.5">
          <Input
            label="Câu hỏi / Tình huống thực tế *"
            required
            placeholder="Nhập câu hỏi hoặc lời từ chối của khách hàng..."
            value={qaQuestion}
            onChange={(e) => setQaQuestion(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gợi ý trả lời / Cách xử lý <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              placeholder="Nhập kịch bản trả lời mẫu..."
              value={qaAnswer}
              onChange={(e) => setQaAnswer(e.target.value)}
              className="form-input w-full text-xs"
            />
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 5: XEM TRƯỚC VĂN BẢN PDF & TÓM TẮT (FULLSCREEN MODAL)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={Boolean(previewPdfItem)}
        onClose={() => setPreviewPdfItem(null)}
        isFullscreen={true}
        title={previewPdfItem?.name || 'Xem tài liệu'}
        description={previewPdfItem?.docNo ? `Số hiệu: ${previewPdfItem.docNo}` : undefined}
        headerIcon={<FileEarmarkPdf size={18} />}
        headerActions={
          previewPdfItem?.pdfUrl ? (
            <a
              href={previewPdfItem.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <BoxArrowUpRight size={12} />
              <span>Mở tab mới</span>
            </a>
          ) : undefined
        }
      >
        {previewPdfItem && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden border border-slate-200 rounded-xl">
            <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/70 p-5 overflow-y-auto space-y-4">
              <h6 className="font-bold text-blue-700 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                Thông tin văn bản
              </h6>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Tóm tắt nội dung
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap shadow-2xs">
                  {previewPdfItem.summary || 'Không có tóm tắt nội dung.'}
                </div>
              </div>

              {previewPdfItem.date && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">
                    Ngày ban hành
                  </div>
                  <div className="text-xs font-semibold text-slate-800 font-mono">
                    {previewPdfItem.date}
                  </div>
                </div>
              )}

              {(previewPdfItem.startDate || previewPdfItem.endDate) && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">
                    Thời gian hiệu lực
                  </div>
                  <div className="text-xs font-semibold text-slate-800 font-mono">
                    Từ {previewPdfItem.startDate || '...'} đến {previewPdfItem.endDate || '...'}
                  </div>
                </div>
              )}

              {previewPdfItem.issuer && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase mb-0.5">
                    Người ban hành
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {previewPdfItem.issuer}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Trạng thái
                </div>
                <Badge
                  variant={previewPdfItem.status === 'Hiệu lực' ? 'success' : 'neutral'}
                  hasDot
                >
                  {previewPdfItem.status}
                </Badge>
              </div>
            </div>

            <div className="lg:col-span-8 bg-slate-200 flex flex-col min-h-0">
              {previewPdfItem.pdfUrl ? (
                <iframe
                  src={`${previewPdfItem.pdfUrl}#toolbar=1`}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  Không có tệp PDF đính kèm
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 6: IN BẢNG BÁO GIÁ (QUOTATION PRINT PREVIEW)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showPrintModal && (
        <PrintPreviewModal
          title="Xem trước & In Bảng Báo Giá"
          subtitle={`Đã chọn ${productsToPrint.length} sản phẩm`}
          documentId="quotation-print-doc"
          printOrientation="portrait"
          onClose={() => setShowPrintModal(false)}
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<Printer size={13} />}
              onClick={() =>
                printDocumentById('quotation-print-doc', 'portrait', 'Bảng Báo Giá Seajong')
              }
            >
              In báo giá
            </Button>
          }
          sidebar={
            <div className="space-y-3 text-xs">
              <h6 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                Thông tin Khách hàng & Báo giá
              </h6>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  label="Ngày báo giá"
                  value={printQuotationDate}
                  onChange={(e) => setPrintQuotationDate(e.target.value)}
                />
                <Input
                  type="date"
                  label="Hiệu lực đến"
                  value={printValidUntil}
                  onChange={(e) => setPrintValidUntil(e.target.value)}
                />
              </div>

              <Input
                label="Tên khách hàng / Đối tác"
                placeholder="VD: Công ty TNHH Xây dựng ABC"
                value={printCustomerName}
                onChange={(e) => setPrintCustomerName(e.target.value)}
              />

              <Input
                label="Địa chỉ khách hàng"
                placeholder="Nhập địa chỉ..."
                value={printCustomerAddress}
                onChange={(e) => setPrintCustomerAddress(e.target.value)}
              />

              <Input
                label="Người liên hệ"
                placeholder="VD: Anh Nam - Phòng Thu mua"
                value={printContactPerson}
                onChange={(e) => setPrintContactPerson(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Số điện thoại"
                  placeholder="0909..."
                  value={printCustomerPhone}
                  onChange={(e) => setPrintCustomerPhone(e.target.value)}
                />
                <Input
                  label="Email"
                  placeholder="email@..."
                  value={printCustomerEmail}
                  onChange={(e) => setPrintCustomerEmail(e.target.value)}
                />
              </div>

              <div className="pt-1">
                <Toggle
                  checked={printShowStamp}
                  onChange={setPrintShowStamp}
                  label="Hiển thị dấu treo"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Điều khoản & Ghi chú
                </label>
                <textarea
                  rows={5}
                  className="form-input w-full text-xs"
                  value={printNotes}
                  onChange={(e) => setPrintNotes(e.target.value)}
                />
              </div>
            </div>
          }
          document={
            <div
              className="pdf-content-page bg-white shadow-lg shrink-0"
              style={{
                width: '100%',
                minHeight: '1122px',
                height: 'auto',
                padding: '15mm 15mm 15mm 20mm',
                boxSizing: 'border-box',
                position: 'relative',
                fontFamily: "'Roboto Condensed', sans-serif",
                color: '#1e293b',
              }}
            >
              {/* Header công ty */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #003087',
                  paddingBottom: '12px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={companyInfo?.logoUrl || companyInfo?.logo || '/logo.png'}
                    alt="Logo Seajong"
                    style={{ height: '55px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                  />
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        color: '#003087',
                        fontSize: '15px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {companyInfo?.name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                    </h4>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                      {companyInfo?.address && <div>Địa chỉ: {companyInfo.address}</div>}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {companyInfo?.phone && <span>ĐT: {companyInfo.phone}</span>}
                        {companyInfo?.email && <span>Email: {companyInfo.email}</span>}
                        {companyInfo?.taxCode && <span>MST: {companyInfo.taxCode}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2
                    style={{
                      margin: 0,
                      fontWeight: 900,
                      color: '#003087',
                      fontSize: '20px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    BẢNG BÁO GIÁ
                  </h2>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Ngày: {formatDateDisplay(printQuotationDate)}
                  </div>
                </div>
              </div>

              {(printCustomerName ||
                printCustomerAddress ||
                printContactPerson ||
                printCustomerPhone ||
                printCustomerEmail) && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {printCustomerName && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: '#64748b' }}>Kính gửi: </span>
                        <strong style={{ color: '#0f172a', fontSize: '13px' }}>
                          {printCustomerName}
                        </strong>
                      </div>
                    )}
                    {printCustomerAddress && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: '#64748b' }}>Địa chỉ: </span>
                        <span>{printCustomerAddress}</span>
                      </div>
                    )}
                    {printContactPerson && (
                      <div>
                        <span style={{ color: '#64748b' }}>Người liên hệ: </span>
                        <span style={{ fontWeight: 600 }}>{printContactPerson}</span>
                      </div>
                    )}
                    {printCustomerPhone && (
                      <div>
                        <span style={{ color: '#64748b' }}>Điện thoại: </span>
                        <span>{printCustomerPhone}</span>
                      </div>
                    )}
                    {printCustomerEmail && (
                      <div>
                        <span style={{ color: '#64748b' }}>Email: </span>
                        <span>{printCustomerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', marginBottom: '12px', lineHeight: 1.5 }}>
                Công ty Cổ phần Seajong Việt Nam trân trọng gửi tới Quý Khách hàng bảng báo giá các
                sản phẩm thiết bị vệ sinh và phụ kiện cao cấp như sau:
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11.5px',
                  marginBottom: '20px',
                }}
              >
                <thead>
                  <tr
                    className="pdf-brand-bg"
                    style={{
                      backgroundColor: '#003087',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      fontSize: '10.5px',
                    }}
                  >
                    <th
                      style={{
                        padding: '8px 6px',
                        border: '1px solid #003087',
                        textAlign: 'center',
                        width: '36px',
                      }}
                    >
                      STT
                    </th>
                    <th
                      style={{
                        padding: '8px 6px',
                        border: '1px solid #003087',
                        textAlign: 'left',
                        width: '95px',
                      }}
                    >
                      Mã hàng
                    </th>
                    <th
                      style={{
                        padding: '8px 6px',
                        border: '1px solid #003087',
                        textAlign: 'left',
                      }}
                    >
                      Tên hàng hoá / Quy cách
                    </th>
                    <th
                      style={{
                        padding: '8px 6px',
                        border: '1px solid #003087',
                        textAlign: 'center',
                        width: '55px',
                      }}
                    >
                      ĐVT
                    </th>
                    <th
                      style={{
                        padding: '8px 6px',
                        border: '1px solid #003087',
                        textAlign: 'right',
                        width: '105px',
                      }}
                    >
                      Đơn giá (VNĐ)
                    </th>
                    <th
                      style={{
                        padding: '8px 6px',
                        border: '1px solid #003087',
                        textAlign: 'left',
                        width: '95px',
                      }}
                    >
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let sttCounter = 1;
                    return Object.entries(groupedPrintProducts).map(([catName, prods]) => (
                      <React.Fragment key={catName}>
                        <tr
                          className="pdf-brand-light-bg"
                          style={{
                            backgroundColor: 'rgba(0, 48, 135, 0.06)',
                            color: '#003087',
                            fontWeight: 700,
                          }}
                        >
                          <td
                            colSpan={6}
                            style={{
                              padding: '6px 8px',
                              border: '1px solid #cbd5e1',
                              textTransform: 'uppercase',
                              fontSize: '11px',
                            }}
                          >
                            {catName} ({prods.length})
                          </td>
                        </tr>
                        {prods.map((p) => {
                          const currentStt = sttCounter++;
                          return (
                            <tr key={p.id}>
                              <td
                                style={{
                                  padding: '6px',
                                  border: '1px solid #cbd5e1',
                                  textAlign: 'center',
                                }}
                              >
                                {currentStt}
                              </td>
                              <td
                                style={{
                                  padding: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontWeight: 600,
                                }}
                              >
                                {p.productCode}
                              </td>
                              <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontWeight: 600 }}>{p.productName}</div>
                                {p.bomCode && (
                                  <div
                                    style={{
                                      fontSize: '10px',
                                      color: '#475569',
                                      marginTop: '2px',
                                    }}
                                  >
                                    Mã ĐM: {p.bomCode} {p.bomName ? `(${p.bomName})` : ''}
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
                                  padding: '6px',
                                  border: '1px solid #cbd5e1',
                                  textAlign: 'center',
                                }}
                              >
                                {p.specification}
                              </td>
                              <td
                                style={{
                                  padding: '6px',
                                  border: '1px solid #cbd5e1',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: '#be123c',
                                }}
                              >
                                {Number(p.listedPrice || 0).toLocaleString('vi-VN')}
                              </td>
                              <td
                                style={{
                                  padding: '6px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '10.5px',
                                }}
                              >
                                {p.note}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ));
                  })()}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '24px',
                  marginTop: '16px',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ flex: 1, fontSize: '11.5px' }}>
                  {printNotes && (
                    <>
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          color: '#003087',
                        }}
                      >
                        Ghi chú & Điều khoản:
                      </div>
                      <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5, color: '#334155' }}>
                        {printNotes}
                      </div>
                    </>
                  )}
                  {printValidUntil && (
                    <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#475569' }}>
                      * Báo giá có hiệu lực đến hết ngày {formatDateDisplay(printValidUntil)}.
                    </div>
                  )}
                </div>

                <div style={{ width: '220px', textAlign: 'center', position: 'relative' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
                    ĐẠI DIỆN CÔNG TY
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    (Ký, ghi rõ họ tên & đóng dấu)
                  </div>
                  {printShowStamp && (
                    <img
                      src="/seajong_stampt.png"
                      alt="Stamp"
                      style={{
                        width: '130px',
                        height: 'auto',
                        margin: '8px auto 0',
                        opacity: 0.9,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 7: IN CHI TIẾT 1 SẢN PHẨM (TỪ PRODUCT DETAIL OFFCANVAS)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showSingleProductPrint && selectedProduct && (
        <PrintPreviewModal
          title="Xem trước & In Thông Tin Sản Phẩm"
          subtitle={selectedProduct.name}
          documentId="product-detail-print-doc"
          printOrientation="portrait"
          onClose={() => setShowSingleProductPrint(false)}
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<Printer size={13} />}
              onClick={() =>
                printDocumentById(
                  'product-detail-print-doc',
                  'portrait',
                  `Thông tin sản phẩm - ${selectedProduct.name}`
                )
              }
            >
              In ngay
            </Button>
          }
          document={
            <div
              className="pdf-content-page bg-white shadow-lg shrink-0"
              style={{
                width: '100%',
                minHeight: '1122px',
                height: 'auto',
                padding: '15mm 15mm 15mm 20mm',
                boxSizing: 'border-box',
                fontFamily: "'Roboto Condensed', sans-serif",
                color: '#1e293b',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #003087',
                  paddingBottom: '12px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img
                    src={companyInfo?.logoUrl || companyInfo?.logo || '/logo.png'}
                    alt="Logo Seajong"
                    style={{ height: '55px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                  />
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        color: '#003087',
                        fontSize: '15px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {companyInfo?.name || 'CÔNG TY CỔ PHẦN SEAJONG VIỆT NAM'}
                    </h4>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                      {companyInfo?.address && <div>Địa chỉ: {companyInfo.address}</div>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontWeight: 800, color: '#003087', fontSize: '17px' }}>
                    THÔNG TIN SẢN PHẨM
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Ngày in: {new Date().toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    flexShrink: 0,
                  }}
                >
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa có ảnh</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    {selectedProduct.name}
                  </h2>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#be123c',
                      marginBottom: '12px',
                    }}
                  >
                    Giá niêm yết:{' '}
                    {selectedProduct.price
                      ? `${Number(selectedProduct.price).toLocaleString('vi-VN')} đ`
                      : 'Liên hệ'}
                  </div>
                  {selectedProduct.excerpt && (
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: '#334155',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {selectedProduct.excerpt}
                    </div>
                  )}
                </div>
              </div>

              {selectedProduct.specs && Object.keys(selectedProduct.specs).length > 0 && (
                <div>
                  <h4
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#003087',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid #cbd5e1',
                      paddingBottom: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    Thông số kỹ thuật chi tiết
                  </h4>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                    }}
                  >
                    <tbody>
                      {Object.entries(selectedProduct.specs).map(([key, val]: any, idx) => (
                        <tr key={idx}>
                          <td
                            style={{
                              padding: '7px 10px',
                              border: '1px solid #cbd5e1',
                              width: '35%',
                              backgroundColor: '#f8fafc',
                              fontWeight: 600,
                            }}
                          >
                            {key}
                          </td>
                          <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1' }}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          }
        />
      )}
    </StepPage>
  );
};

export default SalesPricingPage;
