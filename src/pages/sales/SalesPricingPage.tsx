import React, { useState, useEffect, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import type { ModernStepItem } from '../../types';
import {
  FileEarmarkText,
  Gift,
  CashStack,
  PersonWorkspace,
  Plus,
  Eye,
  CheckCircle,
  FileEarmarkPdf,
  Tag,
  ShieldCheck,
  Download,
  Printer,
  ChevronDown,
} from 'react-bootstrap-icons';

interface PolicyItem {
  id: string;
  name: string;
  docNo?: string;
  date?: string;
  status: string;
  summary: string;
}

interface PromotionItem {
  id: string;
  name: string;
  docNo?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  summary: string;
}

interface PriceProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  material: string;
  retailPrice: number;
  c1Price: number;
  c2Price: number;
  warranty: string;
  stock: number;
}

const PRICING_STEPS: ModernStepItem[] = [
  { num: 1, id: 'policy', title: 'Chính sách bán hàng', desc: 'Thiết lập chính sách', icon: 'bi-file-earmark-text' },
  { num: 2, id: 'promotion', title: 'Chương trình khuyến mãi', desc: 'Quản lý khuyến mãi', icon: 'bi-gift' },
  { num: 3, id: 'quotation', title: 'Bảng báo giá', desc: 'Bảng giá sản phẩm', icon: 'bi-cash-stack' },
  { num: 4, id: 'soft_skills', title: 'Kỹ năng & Tài liệu', desc: 'Kịch bản & Q&A', icon: 'bi-person-workspace' },
];

export const SalesPricingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals
  const [showAddPolicyModal, setShowAddPolicyModal] = useState<boolean>(false);
  const [showAddPromoModal, setShowAddPromoModal] = useState<boolean>(false);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  // Form states
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    docNo: `CS-SJ2026-${Date.now().toString().slice(-4)}`,
    status: 'Hiệu lực',
    summary: '',
  });

  const [newPromo, setNewPromo] = useState({
    name: '',
    docNo: `KM-SJ2026-${Date.now().toString().slice(-4)}`,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'Hiệu lực',
    summary: '',
  });

  // Products list state for quotation/price step
  const [products, setProducts] = useState<PriceProduct[]>([
    { id: 'p1', sku: 'SJ-S808-GREY', name: 'Sen cây phím đàn màn hình LED hiển thị nhiệt độ mạ PVD Grey', category: 'Sen cây tắm', material: 'Đồng thau 59-1', retailPrice: 6850000, c1Price: 4452500, c2Price: 4932000, warranty: '5 năm', stock: 125 },
    { id: 'p2', sku: 'SJ-S909-CHROME', name: 'Sen cây nhiệt độ lõi van Vernet Pháp mạ Crome sáng bóng', category: 'Sen cây tắm', material: 'Đồng thau 59-1', retailPrice: 8500000, c1Price: 5525000, c2Price: 6120000, warranty: '5 năm', stock: 84 },
    { id: 'p3', sku: 'SJ-V102-TITAN', name: 'Vòi lavabo nóng lạnh thân cao mạ xám Titan chống bám vân tay', category: 'Vòi chậu lavabo', material: 'Đồng nguyên khối', retailPrice: 2450000, c1Price: 1592500, c2Price: 1764000, warranty: '5 năm', stock: 240 },
    { id: 'p4', sku: 'SJ-V101-BLACK', name: 'Vòi lavabo nóng lạnh thân thấp màu đen nhám tĩnh điện', category: 'Vòi chậu lavabo', material: 'Đồng nguyên khối', retailPrice: 1850000, c1Price: 1202500, c2Price: 1332000, warranty: '5 năm', stock: 310 },
    { id: 'p5', sku: 'SJ-B205-SMART', name: 'Vòi chậu rửa bát dây rút cảm ứng tự động 3 chế độ xả', category: 'Vòi bếp', material: 'SUS 304 & Đồng', retailPrice: 3250000, c1Price: 2112500, c2Price: 2340000, warranty: '3 năm', stock: 95 },
    { id: 'p6', sku: 'SJ-A501-SET', name: 'Bộ phụ kiện phòng tắm 6 món mạ PVD cao cấp Seajong', category: 'Phụ kiện', material: 'Đồng mạ PVD', retailPrice: 2950000, c1Price: 1917500, c2Price: 2124000, warranty: '3 năm', stock: 180 },
  ]);

  // Soft skills / Q&A scripts
  const [qaList, setQaList] = useState([
    {
      q: 'Đại lý hỏi: Giá sản phẩm sen vòi Seajong cao hơn các thương hiệu thông thường trên thị trường?',
      a: 'Trả lời: Seajong sử dụng 100% phôi đồng tiêu chuẩn 59-1 đúc trọng lực nguyên khối, lõi van đĩa sứ ceramic chống mòn đạt 500.000 lần đóng mở (tương đương 15 năm sử dụng). Bề mặt mạ PVD 5 lớp chống bong tróc muối biển, bảo hành chính hãng 5 năm - 1 đổi 1 trong năm đầu. Đây là lợi thế cạnh tranh tuyệt đối giúp showroom khẳng định uy tín với chủ nhà và nhà thầu.',
      tag: 'Kỹ năng xử lý giá',
    },
    {
      q: 'Đại lý hỏi: Chính sách hỗ trợ quầy kệ và bảng biển showroom của Seajong như thế nào?',
      a: 'Trả lời: Công ty tài trợ 100% chi phí thiết kế 3D và đóng tủ kệ trưng bày chuẩn nhận diện thương hiệu cho đại lý đạt cam kết doanh số từ 150 triệu/tháng. Đội ngũ kỹ thuật Seajong sẽ trực tiếp đến lắp đặt, hoàn thiện layout quầy kệ và bàn giao catalogue mẫu.',
      tag: 'Chính sách đại lý',
    },
    {
      q: 'Đại lý hỏi: Điều kiện thanh toán và hạn mức công nợ ban đầu?',
      a: 'Trả lời: Với đơn hàng đầu tiên (đơn mở đại lý trưng bày), chiết khấu trực tiếp 35% và tặng thêm gói quà tặng khai trương. Từ đơn hàng thứ 2, đại lý được áp dụng chính sách gối đầu công nợ 30 ngày với hạn mức từ 30 triệu đến 100 triệu tuỳ thuộc vào quy mô và xếp hạng tín dụng.',
      tag: 'Chính sách công nợ',
    },
  ]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/sales/policies').then((r) => r.json()).catch(() => []),
      fetch('/api/sales/promotions').then((r) => r.json()).catch(() => []),
      fetch('/api/seajong/products?limit=50').then((r) => r.json()).catch(() => ({ products: [] })),
    ])
      .then(([polData, promData, prodData]) => {
        if (Array.isArray(polData) && polData.length > 0) setPolicies(polData);
        if (Array.isArray(promData) && promData.length > 0) setPromotions(promData);
        if (prodData && Array.isArray(prodData.products) && prodData.products.length > 0) {
          const mapped = prodData.products.map((p: any, idx: number) => {
            const retail = p.price || 4500000;
            return {
              id: String(p.id || idx),
              sku: p.specs?.['Mã sản phẩm:'] || `SJ-PR-${p.id}`,
              name: p.name,
              category: p.categoryNames?.[0] || 'Thiết bị vệ sinh',
              material: p.specs?.['Chất liệu:'] || 'Đồng mạ Chrome/PVD',
              retailPrice: retail,
              c1Price: Math.round(retail * 0.65),
              c2Price: Math.round(retail * 0.72),
              warranty: p.specs?.['Thời gian bảo hành'] || '3 năm',
              stock: 50 + ((idx * 7) % 80),
            };
          });
          setProducts(mapped);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatVND = (num: number) => num.toLocaleString('vi-VN') + ' đ';

  // Filtered lists
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.summary?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [policies, searchTerm, statusFilter]);

  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.summary?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [promotions, searchTerm, statusFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      return !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [products, searchTerm]);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.name) return;
    try {
      const res = await fetch('/api/sales/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicy),
      });
      if (res.ok) {
        setShowAddPolicyModal(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.name) return;
    try {
      const res = await fetch('/api/sales/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromo),
      });
      if (res.ok) {
        setShowAddPromoModal(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const tickerNews = [
    {
      badge: 'BẢNG GIÁ NIÊM YẾT',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      text: 'Bảng giá niêm yết thiết bị vệ sinh Seajong 2026 áp dụng đồng bộ toàn quốc cho hệ thống đại lý & showroom',
    },
    {
      badge: 'CHIẾT KHẤU ĐẠI LÝ',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Chiết khấu đại lý cấp 1: 35% | Đại lý cấp 2: 28% | Hỗ trợ 100% chi phí quầy kệ & biển hiệu Seajong',
    },
    {
      badge: 'CHƯƠNG TRÌNH KHUYẾN MÃI',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'Chương trình Q4: Tặng vòi lavabo lạnh khi mua 10 bộ sen cây phím đàn LED hiển thị nhiệt độ',
    },
  ];

  return (
    <StepPage
      title="Chính sách bán hàng & Báo giá"
      badge="PRICING"
      description="Quản lý chính sách phân phối, chương trình khuyến mãi, bảng giá niêm yết và kỹ năng bán hàng Seajong"
      icon="bi-tags"
      color="blue"
      steps={PRICING_STEPS}
      currentStep={currentStep}
      onStepChange={(s) => {
        setCurrentStep(s);
        setPage(1);
      }}
      customTickerNews={tickerNews}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar chuẩn theo AGENTS.MD (nằm trong card chính) ── */}
        <TableToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={
            currentStep === 1
              ? 'Tìm kiếm văn bản chính sách...'
              : currentStep === 2
              ? 'Tìm chương trình khuyến mãi...'
              : currentStep === 3
              ? 'Tìm mã SKU, tên sản phẩm sen vòi...'
              : 'Tìm kiếm kịch bản, câu hỏi Q&A...'
          }
          filters={
            currentStep <= 2
              ? [
                  {
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: [
                      { label: 'Tất cả trạng thái', value: 'all' },
                      { label: 'Hiệu lực', value: 'Hiệu lực' },
                      { label: 'Hết hiệu lực', value: 'Hết hiệu lực' },
                    ],
                  },
                ]
              : []
          }
          rightActions={
            currentStep === 1 ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddPolicyModal(true)}
              >
                Thêm chính sách
              </Button>
            ) : currentStep === 2 ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddPromoModal(true)}
              >
                Tạo khuyến mãi
              </Button>
            ) : currentStep === 3 ? (
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={() => alert('Đang xuất bảng giá niêm yết PDF...')}
              >
                Tải bảng giá PDF
              </Button>
            ) : null
          }
          onRefresh={fetchData}
          onExportExcel={() => alert('Xuất dữ liệu bảng ra file Excel')}
        />

        {/* ── NỘI DUNG TỪNG BƯỚC ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* BƯỚC 1: CHÍNH SÁCH BÁN HÀNG */}
          {currentStep === 1 && (
            <FullWidthTable loading={loading} emptyText="Chưa có chính sách bán hàng nào">
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3.5">Tên văn bản chính sách</th>
                    <th className="py-2.5 px-3.5 w-32">Số hiệu văn bản</th>
                    <th className="py-2.5 px-3.5 w-32">Ngày ban hành</th>
                    <th className="py-2.5 px-3.5">Tóm tắt nội dung</th>
                    <th className="py-2.5 px-3.5 text-center w-28">Trạng thái</th>
                    <th className="py-2.5 px-3.5 text-center w-24">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPolicies.slice((page - 1) * pageSize, page * pageSize).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-blue-700">{p.name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{p.docNo || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.date || '2026-01-15'}</td>
                      <td className="py-2.5 px-3 text-slate-600 leading-relaxed">{p.summary}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setViewingDoc(p)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
          )}

          {/* BƯỚC 2: CHƯƠNG TRÌNH KHUYẾN MÃI */}
          {currentStep === 2 && (
            <FullWidthTable loading={loading} emptyText="Chưa có chương trình khuyến mãi nào">
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3.5">Tên chương trình khuyến mãi</th>
                    <th className="py-2.5 px-3.5 w-32">Mã chương trình</th>
                    <th className="py-2.5 px-3.5 w-48">Thời gian áp dụng</th>
                    <th className="py-2.5 px-3.5">Tóm tắt thể lệ</th>
                    <th className="py-2.5 px-3.5 text-center w-28">Trạng thái</th>
                    <th className="py-2.5 px-3.5 text-center w-24">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPromotions.slice((page - 1) * pageSize, page * pageSize).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-rose-700 flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-rose-500" />
                          {p.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{p.docNo || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.startDate} → {p.endDate}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 leading-relaxed">{p.summary}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setViewingDoc(p)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
          )}

          {/* BƯỚC 3: BẢNG BÁO GIÁ SẢN PHẨM */}
          {currentStep === 3 && (
            <FullWidthTable loading={loading} emptyText="Không có sản phẩm nào">
              <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
                <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3.5 w-32">Mã SKU</th>
                    <th className="py-2.5 px-3.5">Tên sản phẩm thiết bị sen vòi</th>
                    <th className="py-2.5 px-3.5 w-28">Nhóm hàng</th>
                    <th className="py-2.5 px-3.5 w-28">Chất liệu</th>
                    <th className="py-2.5 px-3.5 text-right">Giá niêm yết</th>
                    <th className="py-2.5 px-3.5 text-right text-blue-700">Giá ĐL C1 (-35%)</th>
                    <th className="py-2.5 px-3.5 text-right text-teal-700">Giá ĐL C2 (-28%)</th>
                    <th className="py-2.5 px-3.5 text-center w-24">Bảo hành</th>
                    <th className="py-2.5 px-3.5 text-center w-24">Tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.slice((page - 1) * pageSize, page * pageSize).map((prod, idx) => (
                    <tr key={prod.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{prod.sku}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{prod.name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{prod.category}</td>
                      <td className="py-2.5 px-3 text-slate-500">{prod.material}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatVND(prod.retailPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                        {formatVND(prod.c1Price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-teal-700">
                        {formatVND(prod.c2Price)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-700 font-medium">
                          {prod.warranty}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                        {prod.stock} bộ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FullWidthTable>
          )}

          {/* BƯỚC 4: KỸ NĂNG & TÀI LIỆU BÁN HÀNG */}
          {currentStep === 4 && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Cẩm nang xử lý từ chối và kịch bản chốt hợp đồng đại lý Seajong
                </h3>
                <span className="text-xs text-slate-500">Tài liệu đào tạo nội bộ Phòng Kinh doanh</span>
              </div>

              <div className="space-y-3">
                {qaList.map((qa, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        {qa.q}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {qa.tag}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-xs leading-relaxed border border-slate-200/60">
                      {qa.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Phân trang cho các bước bảng ── */}
        {currentStep <= 3 && (() => {
          const totalItems =
            currentStep === 1
              ? filteredPolicies.length
              : currentStep === 2
              ? filteredPromotions.length
              : filteredProducts.length;
          const itemName =
            currentStep === 1
              ? 'chính sách'
              : currentStep === 2
              ? 'khuyến mại'
              : 'sản phẩm';
          const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
          return (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              totalItems={totalItems}
              pageSize={pageSize}
              itemName={itemName}
            />
          );
        })()}
      </div>

      {/* ── MODAL THÊM CHÍNH SÁCH ── */}
      {showAddPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Thêm chính sách bán hàng mới</h3>
              <button onClick={() => setShowAddPolicyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreatePolicy} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên văn bản chính sách *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chính sách chiết khấu đại lý cấp 1 năm 2026"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số hiệu văn bản</label>
                  <input
                    type="text"
                    value={newPolicy.docNo}
                    onChange={(e) => setNewPolicy({ ...newPolicy, docNo: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trạng thái</label>
                  <select
                    value={newPolicy.status}
                    onChange={(e) => setNewPolicy({ ...newPolicy, status: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Hiệu lực">Hiệu lực</option>
                    <option value="Hết hiệu lực">Hết hiệu lực</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tóm tắt nội dung quy định</label>
                <textarea
                  rows={3}
                  placeholder="Nhập tóm tắt mức chiết khấu, thời hạn công nợ, cam kết doanh số..."
                  value={newPolicy.summary}
                  onChange={(e) => setNewPolicy({ ...newPolicy, summary: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowAddPolicyModal(false)}>Hủy bỏ</Button>
                <Button type="submit" variant="primary" size="sm">Lưu chính sách</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM KHUYẾN MÃI ── */}
      {showAddPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Tạo chương trình khuyến mãi mới</h3>
              <button onClick={() => setShowAddPromoModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreatePromotion} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên chương trình khuyến mãi *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Combo Khai Trương Showroom: Tặng Vòi Lavabo"
                  value={newPromo.name}
                  onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newPromo.startDate}
                    onChange={(e) => setNewPromo({ ...newPromo, startDate: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newPromo.endDate}
                    onChange={(e) => setNewPromo({ ...newPromo, endDate: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Thể lệ & Quà tặng</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chi tiết quà tặng, đối tượng đại lý áp dụng..."
                  value={newPromo.summary}
                  onChange={(e) => setNewPromo({ ...newPromo, summary: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowAddPromoModal(false)}>Hủy bỏ</Button>
                <Button type="submit" variant="primary" size="sm">Tạo khuyến mãi</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL XEM CHI TIẾT VĂN BẢN ── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{viewingDoc.name}</h3>
                <span className="text-xs text-slate-500 font-mono">{viewingDoc.docNo}</span>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px] mb-1">Nội dung văn bản:</span>
                <p className="text-slate-700 leading-relaxed">{viewingDoc.summary}</p>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Trạng thái: <strong className="text-emerald-600">{viewingDoc.status}</strong></span>
                <span>Ban hành bởi: Ban Giám Đốc Seajong</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </StepPage>
  );
};

export default SalesPricingPage;
