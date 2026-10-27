import React, { useState, useEffect, useMemo } from 'react';
import { StepPage } from '../../components/common/StepPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Offcanvas } from '../../components/common/Offcanvas';
import type { ModernStepItem } from '../../types';
import {
  PersonBadge,
  StarFill,
  Eye,
  Plus,
  Telephone,
  GeoAlt,
  CalendarCheck,
  CheckCircle,
  FileEarmarkText,
  ChatDots,
  Building,
  Tools,
} from 'react-bootstrap-icons';
import { Button } from '../../components/common/Button';
import { calculateLeadStars, getSourceLabel } from '../../utils/partnerUtils';

export interface PartnerItem {
  id: string;
  code: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  area: string;
  businessType: string;
  step: number;
  stars: number;
  status: string;
  owner: string;
  notes: string;
  source: string;
  contractValue?: number;
  expectedInvestment?: string;
  careHistories?: any[];
  createdAt: string;
}

const PARTNER_STEPS: ModernStepItem[] = [
  { num: 1, id: 'info', title: 'Thông tin', desc: 'Tiếp nhận & Sàng lọc', icon: 'bi-info-circle' },
  { num: 2, id: 'care', title: 'Chăm sóc', desc: 'Liên hệ & Tư vấn', icon: 'bi-chat-left-dots' },
  { num: 3, id: 'quote', title: 'Báo giá', desc: 'Thoả thuận', icon: 'bi-currency-dollar' },
  { num: 4, id: 'contract', title: 'Hợp đồng', desc: 'Ký kết & Hạn mức', icon: 'bi-file-earmark-text' },
  { num: 5, id: 'construction', title: 'Thi công', desc: 'Thiết kế & Trưng bày', icon: 'bi-tools' },
];

export const SalesPartnersPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [starFilter, setStarFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Drawer / Modals
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);

  // New partner form
  const [newPartner, setNewPartner] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    area: 'Hà Nội',
    businessType: 'Showroom TBVS',
    notes: '',
    source: 'Kinh doanh tự khai thác',
  });

  // Care history form
  const [careForm, setCareForm] = useState({
    hinhThuc: 'Gặp mặt',
    attitude: 'Tích cực',
    collabNeeds: '',
    notes: '',
    executor: 'Phạm Quang Việt',
  });

  // Contract form
  const [contractForm, setContractForm] = useState({
    contractNo: `HD-SJ2026-${Date.now().toString().slice(-4)}`,
    commitment: 300000000,
    creditLimit: 50000000,
    signer: '',
    signedDate: new Date().toISOString().split('T')[0],
  });

  const fetchPartners = () => {
    setLoading(true);
    fetch('/api/sales/partners')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPartners(data);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách đối tác:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Filter partners according to current step and search
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchStep = Number(p.step) === currentStep;
      const matchSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.area.toLowerCase().includes(searchTerm.toLowerCase());
      const matchArea = areaFilter === 'all' || p.area.includes(areaFilter);
      const matchStar = starFilter === 'all' || Number(p.stars) === Number(starFilter);

      return matchStep && matchSearch && matchArea && matchStar;
    });
  }, [partners, currentStep, searchTerm, areaFilter, starFilter]);

  const paginatedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPartners.slice(start, start + pageSize);
  }, [filteredPartners, page, pageSize]);

  const totalPages = Math.ceil(filteredPartners.length / pageSize) || 1;

  // Move partner to next step
  const handleAdvanceStep = async (partner: PartnerItem) => {
    const nextStep = Math.min(5, Number(partner.step) + 1);
    try {
      const res = await fetch(`/api/sales/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: nextStep }),
      });
      if (res.ok) {
        setPartners((prev) =>
          prev.map((p) => (p.id === partner.id ? { ...p, step: nextStep } : p))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create partner
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name || !newPartner.phone) return;

    try {
      const res = await fetch('/api/sales/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPartner,
          step: 1,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewPartner({
          name: '',
          companyName: '',
          phone: '',
          email: '',
          area: 'Hà Nội',
          businessType: 'Showroom TBVS',
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
          hinhThuc: 'Gặp mặt',
          attitude: 'Tích cực',
          collabNeeds: '',
          notes: '',
          executor: 'Phạm Quang Việt',
        });
        fetchPartners();
        setShowDetailDrawer(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sign contract
  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    try {
      const res = await fetch(`/api/sales/partners/${selectedPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 5,
          contractValue: contractForm.commitment,
          contractNo: contractForm.contractNo,
        }),
      });
      if (res.ok) {
        setShowContractModal(false);
        fetchPartners();
      }
    } catch (e) {
      console.error(e);
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
      description="Quy trình 5 bước phát triển, thẩm định và ký kết đại lý phân phối thiết bị vệ sinh Seajong"
      icon="bi-person-badge"
      color="blue"
      steps={PARTNER_STEPS}
      currentStep={currentStep}
      onStepChange={(step) => {
        setCurrentStep(step);
        setPage(1);
      }}
      customTickerNews={tickerItems}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar trong thẻ card chính theo đúng AGENTS.MD ── */}
        <TableToolbar
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
              value: starFilter,
              onChange: setStarFilter,
              options: [
                { label: 'Tất cả mức sao', value: 'all' },
                { label: '5 Sao (Rất tiềm năng)', value: '5' },
                { label: '4 Sao (Tiềm năng)', value: '4' },
                { label: '3 Sao (Bình thường)', value: '3' },
              ],
            },
          ]}
          rightActions={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Thêm đối tác
            </Button>
          }
          onRefresh={fetchPartners}
          onExportExcel={() => alert('Xuất danh sách đại lý tiềm năng ra file Excel')}
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
                  <th className="py-2.5 px-3.5 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3.5 w-28">Mã hồ sơ</th>
                  <th className="py-2.5 px-3.5">Tên đại lý / Doanh nghiệp</th>
                  <th className="py-2.5 px-3.5">Đại diện & Liên hệ</th>
                  <th className="py-2.5 px-3.5">Khu vực</th>
                  <th className="py-2.5 px-3.5 text-center">Đánh giá</th>
                  <th className="py-2.5 px-3.5">Nguồn</th>
                  <th className="py-2.5 px-3.5">Phụ trách</th>
                  <th className="py-2.5 px-3.5 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {paginatedPartners.map((p, idx) => (
                <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                    {p.code}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{p.companyName || p.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-slate-400" />
                      {p.businessType}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-700">{p.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Telephone className="w-3 h-3 text-emerald-600" />
                      <span className="font-mono">{p.phone}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 text-slate-600">
                      <GeoAlt className="w-3 h-3 text-rose-500 flex-shrink-0" />
                      <span>{p.area}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-bold text-[10.5px]">
                      <StarFill className="w-2.5 h-2.5 text-amber-500" />
                      <span>{p.stars} sao</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-600 font-medium">
                      {getSourceLabel(p.source)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {p.owner}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedPartner(p);
                          setShowDetailDrawer(true);
                        }}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-semibold flex items-center gap-1"
                        title="Xem chi tiết & lịch sử chăm sóc"
                      >
                        <Eye className="w-3 h-3" /> Chi tiết
                      </button>

                      {currentStep < 4 ? (
                        <button
                          onClick={() => handleAdvanceStep(p)}
                          className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-semibold"
                          title="Chuyển sang bước tiếp theo"
                        >
                          Chuyển bước →
                        </button>
                      ) : currentStep === 4 ? (
                        <button
                          onClick={() => {
                            setSelectedPartner(p);
                            setContractForm((prev) => ({
                              ...prev,
                              signer: p.name,
                            }));
                            setShowContractModal(true);
                          }}
                          className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <FileEarmarkText className="w-3 h-3" /> Ký HĐ
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Đã ký
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* ── DRAWER CHI TIẾT ĐỐI TÁC & NHẬT KÝ CHĂM SÓC (ÁP DỤNG OFFCANVAS) ── */}
      <Offcanvas
        isOpen={Boolean(showDetailDrawer && selectedPartner)}
        onClose={() => setShowDetailDrawer(false)}
        title={selectedPartner ? (selectedPartner.companyName || selectedPartner.name) : 'Chi tiết đối tác'}
        description={selectedPartner?.code ? `Mã đại lý: ${selectedPartner.code}` : undefined}
        icon={<PersonBadge size={20} className="text-blue-600" />}
        width="400px"
        bodyClassName="p-4 space-y-4"
        footer={
          <div className="w-full flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowDetailDrawer(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-[13px] font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedPartner && (
          <div className="space-y-4 text-[13.5px]">
            {/* Thông tin chung */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Thông tin đại lý & Showroom
              </h4>
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-xs">Người đại diện:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedPartner.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Số điện thoại:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{selectedPartner.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Địa chỉ / Khu vực:</span>
                  <span className="font-semibold text-slate-800 text-[13px]">{selectedPartner.area}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Mô hình kinh doanh:</span>
                  <span className="font-semibold text-slate-800 text-[13px]">{selectedPartner.businessType}</span>
                </div>
              </div>
            </div>

            {/* Form thêm nhật ký chăm sóc */}
            <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200/70">
              <h4 className="font-bold text-blue-900 uppercase text-xs tracking-wider mb-2.5 flex items-center gap-1.5">
                <ChatDots className="w-4 h-4 text-blue-600" />
                Ghi nhận hoạt động tư vấn mới
              </h4>
              <form onSubmit={handleAddCare} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Hình thức liên hệ
                    </label>
                    <select
                      value={careForm.hinhThuc}
                      onChange={(e) => setCareForm({ ...careForm, hinhThuc: e.target.value })}
                      className="w-full text-[13px] p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Gặp mặt">Gặp mặt trực tiếp</option>
                      <option value="Điện thoại">Gọi điện thoại</option>
                      <option value="Zalo">Nhắn tin Zalo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Thái độ của khách
                    </label>
                    <select
                      value={careForm.attitude}
                      onChange={(e) => setCareForm({ ...careForm, attitude: e.target.value })}
                      className="w-full text-[13px] p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Rất tích cực">Rất tích cực (Muốn chốt ngay)</option>
                      <option value="Tích cực">Tích cực (Xem xét kệ mẫu)</option>
                      <option value="Cần tư vấn thêm">Cần tư vấn thêm</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nhu cầu trưng bày & sản phẩm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Muốn lắp 2 kệ mẫu combo sen cây phím đàn..."
                    value={careForm.collabNeeds}
                    onChange={(e) => setCareForm({ ...careForm, collabNeeds: e.target.value })}
                    className="w-full text-[13px] p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-0"
                  >
                    Lưu nhật ký chăm sóc
                  </button>
                </div>
              </form>
            </div>

            {/* Lịch sử chăm sóc trước đó */}
            <div>
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-2.5">
                Lịch sử chăm sóc ({selectedPartner.careHistories?.length || 0})
              </h4>
              {selectedPartner.careHistories && selectedPartner.careHistories.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedPartner.careHistories.map((h: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-3xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-700 text-[13px]">{h.approachStep || h.hinhThuc}</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(h.executionDate || h.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[13px] leading-relaxed">
                        {h.collabNeeds || h.otherRequirements || h.notes || 'Đã liên hệ tư vấn'}
                      </p>
                      <div className="text-xs text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-100">
                        <span>Phụ trách: <strong className="text-slate-600">{h.executor || 'Phạm Quang Việt'}</strong></span>
                        <span className="font-medium text-slate-600">Thái độ: {h.attitude}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">Chưa có nhật ký chăm sóc nào</p>
              )}
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── MODAL THÊM ĐỐI TÁC MỚI ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Thêm đại lý tiềm năng mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreatePartner} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên đại lý / Showroom *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Showroom Thiết Bị Vệ Sinh Minh Long"
                  value={newPartner.companyName}
                  onChange={(e) => setNewPartner({ ...newPartner, companyName: e.target.value, name: newPartner.name || e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Người đại diện *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Anh Minh"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0988 123 456"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Khu vực / Tỉnh thành</label>
                  <input
                    type="text"
                    placeholder="VD: Bắc Ninh, Hà Nội..."
                    value={newPartner.area}
                    onChange={(e) => setNewPartner({ ...newPartner, area: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mô hình</label>
                  <select
                    value={newPartner.businessType}
                    onChange={(e) => setNewPartner({ ...newPartner, businessType: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Showroom TBVS">Showroom TBVS</option>
                    <option value="Cửa hàng điện nước">Cửa hàng điện nước</option>
                    <option value="Nhà thầu xây dựng">Nhà thầu xây dựng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nguồn tiếp cận</label>
                <select
                  value={newPartner.source}
                  onChange={(e) => setNewPartner({ ...newPartner, source: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="Kinh doanh tự khai thác">Kinh doanh tự khai thác</option>
                  <option value="Facebook Ads">Facebook Ads</option>
                  <option value="Showroom">Khách vãng lai Showroom</option>
                  <option value="Triển lãm Vietbuild">Triển lãm Vietbuild</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu đối tác
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL KÝ HỢP ĐỒNG ĐẠI LÝ ── */}
      {showContractModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
              <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                <FileEarmarkText className="w-5 h-5 text-emerald-600" />
                Ký hợp đồng phân phối thiết bị vệ sinh Seajong
              </h3>
              <button onClick={() => setShowContractModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSignContract} className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800 text-sm">{selectedPartner.companyName}</div>
                <div className="text-slate-500">Đại diện: {selectedPartner.name} - SĐT: {selectedPartner.phone}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số hợp đồng</label>
                  <input
                    type="text"
                    required
                    value={contractForm.contractNo}
                    onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày ký</label>
                  <input
                    type="date"
                    required
                    value={contractForm.signedDate}
                    onChange={(e) => setContractForm({ ...contractForm, signedDate: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cam kết doanh số năm (VNĐ)</label>
                  <input
                    type="number"
                    step="10000000"
                    value={contractForm.commitment}
                    onChange={(e) => setContractForm({ ...contractForm, commitment: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-blue-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hạn mức công nợ (VNĐ)</label>
                  <input
                    type="number"
                    step="10000000"
                    value={contractForm.creditLimit}
                    onChange={(e) => setContractForm({ ...contractForm, creditLimit: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[11px]">
                ✓ Khi xác nhận ký hợp đồng, đối tác sẽ tự động chuyển sang <strong>Bước 5: Thi công & Lắp đặt quầy kệ showroom</strong>.
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowContractModal(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Xác nhận ký kết
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StepPage>
  );
};

export default SalesPartnersPage;
