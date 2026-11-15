import React, { useState, useEffect } from 'react';
import { Offcanvas } from '../../common/Offcanvas';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { Select } from '../../common/Select';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/Toast';
import { parseGuestInfo, cleanGhiChu } from './BaoGiaSanitaryModal';
import {
  FileEarmarkText,
  ClockHistory,
  Telephone,
  Envelope,
  GeoAlt,
  People,
  ChatDots,
  ThreeDots,
  Plus,
  ArrowLeft,
  Check2,
  PencilSquare,
  CartPlus,
  CaretUpFill,
  CaretDownFill,
  BoxSeam,
} from 'react-bootstrap-icons';

export interface QuotationNegotiationItem {
  id: string;
  quotationId: string;
  loai: string;
  ngay: string;
  nguoiThucHien: string;
  ketQua: string;
  createdAt?: string;
}

export interface QuotationDetailItem {
  id?: string;
  tenHang: string;
  donVi?: string;
  soLuong?: number;
  donGia?: number;
  thanhTien?: number;
  ghiChu?: string | null;
}

export interface QuotationDetailData {
  id: string;
  code: string | null;
  customerId: string | null;
  customer?: {
    id: string;
    code?: string;
    name: string;
    dienThoai?: string;
    email?: string;
    address?: string;
    nhom?: string;
    daiDien?: string;
  } | null;
  nguoiPhuTrach?: {
    id: string;
    fullName: string;
  } | null;
  ngayBaoGia?: string;
  ngayHetHan?: string;
  trangThai: string;
  uuTien: string;
  tongTien: number;
  discount: number;
  vat: number;
  chiPhiThiCong: number;
  thanhTien: number;
  ghiChu?: string;
  type?: string;
  createdAt: string;
  items?: QuotationDetailItem[];
  negotiations?: QuotationNegotiationItem[];
}

interface ChiTietBaoGiaOffcanvasProps {
  quotation: QuotationDetailData | null;
  onClose: () => void;
  onEditQuotation?: (quotation: QuotationDetailData) => void;
  onCreateOrderFromQuotation?: (quotation: QuotationDetailData) => void;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: 'Bản nháp', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  pending: { label: 'Chờ duyệt', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  pending_approval: { label: 'Đang trình duyệt', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  sent: { label: 'Đang thương thảo', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  approved: { label: 'Đã phê duyệt', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  won: { label: 'Thành công', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  lost: { label: 'Thất bại', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  rejected: { label: 'Từ chối', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  paused: { label: 'Tạm dừng', bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
  cancelled: { label: 'Đã huỷ', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
};

function QuotationStatusBadge({ status }: { status: string }) {
  const s = (status || 'draft').toLowerCase();
  const cfg = STATUS_CONFIG[s] || {
    label: status || 'Khác',
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
  };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getNegotiationTypeMeta(loai: string) {
  const key = (loai || '').toLowerCase().trim();
  if (key === 'system' || key === 'he_thong') {
    return {
      label: 'CẬP NHẬT HỆ THỐNG',
      badgeClass: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      textClass: 'text-indigo-700',
      icon: <FileEarmarkText size={11} />,
    };
  }
  if (key === 'call' || key === 'gọi điện' || key === 'goi_dien') {
    return {
      label: 'GỌI ĐIỆN THƯƠNG THẢO',
      badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      textClass: 'text-emerald-700',
      icon: <Telephone size={11} />,
    };
  }
  if (key === 'meeting' || key === 'gặp mặt' || key === 'gap_mat') {
    return {
      label: 'GẶP MẶT TRỰC TIẾP',
      badgeClass: 'bg-amber-50 border-amber-200 text-amber-600',
      textClass: 'text-amber-700',
      icon: <People size={11} />,
    };
  }
  if (key === 'email') {
    return {
      label: 'GỬI EMAIL BÁO GIÁ',
      badgeClass: 'bg-sky-50 border-sky-200 text-sky-600',
      textClass: 'text-sky-700',
      icon: <Envelope size={11} />,
    };
  }
  if (key === 'message' || key === 'nhắn tin' || key === 'zalo') {
    return {
      label: 'NHẮN TIN / ZALO',
      badgeClass: 'bg-blue-50 border-blue-200 text-blue-600',
      textClass: 'text-blue-700',
      icon: <ChatDots size={11} />,
    };
  }
  return {
    label: loai ? loai.toUpperCase() : 'THƯƠNG THẢO BÁO GIÁ',
    badgeClass: 'bg-blue-50 border-blue-200 text-blue-600',
    textClass: 'text-blue-700',
    icon: <ChatDots size={11} />,
  };
}

export const ChiTietBaoGiaOffcanvas: React.FC<ChiTietBaoGiaOffcanvasProps> = ({
  quotation: initialQuotation,
  onClose,
  onEditQuotation,
  onCreateOrderFromQuotation,
  onRefresh,
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [detailData, setDetailData] = useState<QuotationDetailData | null>(initialQuotation);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState<boolean>(true);
  const [isItemsOpen, setIsItemsOpen] = useState<boolean>(true);
  const [showAddNegotiationForm, setShowAddNegotiationForm] = useState<boolean>(false);
  const [submittingNegotiation, setSubmittingNegotiation] = useState<boolean>(false);

  const [negForm, setNegForm] = useState({
    ngay: getCurrentDateTimeLocal(),
    loai: 'call',
    nguoiThucHien: user?.name || 'Lê Công Vụ',
    trangThaiMoi: '',
    ketQua: '',
  });

  const fetchQuotationDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/plan-finance/quotations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết báo giá:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (initialQuotation) {
      setDetailData(initialQuotation);
      setShowAddNegotiationForm(false);
      setNegForm({
        ngay: getCurrentDateTimeLocal(),
        loai: 'call',
        nguoiThucHien: user?.name || initialQuotation.nguoiPhuTrach?.fullName || 'Lê Công Vụ',
        trangThaiMoi: initialQuotation.trangThai || 'sent',
        ketQua: '',
      });
      fetchQuotationDetail(initialQuotation.id);
    } else {
      setDetailData(null);
      setShowAddNegotiationForm(false);
    }
  }, [initialQuotation?.id]);

  const q = detailData || initialQuotation;
  if (!q) return null;

  const formatVND = (num?: number | null) => Number(num || 0).toLocaleString('vi-VN') + ' đ';

  const guestInfo = parseGuestInfo(q.ghiChu);
  const cleanedNote = cleanGhiChu(q.ghiChu);

  const customerName = q.customer?.name || guestInfo?.name || 'Khách hàng vãng lai';
  const customerPhone = q.customer?.dienThoai || guestInfo?.dienThoai || '';
  const customerEmail = q.customer?.email || '';
  const customerAddress = q.customer?.address || guestInfo?.address || '';
  const customerCode = q.customer?.code || (q.customer?.nhom === 'dai-ly' ? 'ĐẠI LÝ' : 'KHÁCH LẺ');

  const ngayLapStr = (q.ngayBaoGia || q.createdAt)
    ? new Date(q.ngayBaoGia || q.createdAt).toLocaleDateString('vi-VN')
    : '—';
  const ngayHetHanStr = q.ngayHetHan
    ? new Date(q.ngayHetHan).toLocaleDateString('vi-VN')
    : '—';

  const itemsList = q.items || [];
  const negotiationsList = q.negotiations || [];

  const tamTinh =
    q.tongTien > 0
      ? q.tongTien
      : itemsList.reduce(
          (sum, it) => sum + (Number(it.thanhTien) || Number(it.soLuong || 1) * Number(it.donGia || 0)),
          0
        );
  const discountPct = Number(q.discount || 0);
  const discountAmount = Math.round((tamTinh * discountPct) / 100);
  const afterDiscount = tamTinh - discountAmount;
  const vatPct = Number(q.vat || 0);
  const vatAmount = Math.round((afterDiscount * vatPct) / 100);
  const chiPhiThiCong = Number(q.chiPhiThiCong || 0);
  const grandTotal = q.thanhTien ?? (afterDiscount + vatAmount + chiPhiThiCong);

  const handleAddNegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negForm.ketQua.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập nội dung kết quả thương thảo');
      return;
    }

    setSubmittingNegotiation(true);
    try {
      const statusChanged = negForm.trangThaiMoi && negForm.trangThaiMoi !== q.trangThai;
      let finalKetQua = negForm.ketQua.trim();

      if (statusChanged) {
        const oldLabel = STATUS_CONFIG[q.trangThai]?.label || q.trangThai;
        const newLabel = STATUS_CONFIG[negForm.trangThaiMoi]?.label || negForm.trangThaiMoi;
        finalKetQua += `\n- Chuyển trạng thái: từ "${oldLabel}" sang "${newLabel}"`;
      }

      const res = await fetch(`/api/plan-finance/quotations/${q.id}/negotiations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loai: negForm.loai,
          ngay: negForm.ngay ? new Date(negForm.ngay).toISOString() : new Date().toISOString(),
          nguoiThucHien: negForm.nguoiThucHien.trim() || user?.name || 'Nhân viên KD',
          ketQua: finalKetQua,
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể lưu lịch sử thương thảo');
      }

      if (statusChanged) {
        await fetch(`/api/plan-finance/quotations/${q.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trangThai: negForm.trangThaiMoi }),
        });
      }

      toast.success('Đã lưu', 'Đã cập nhật lịch sử thương thảo báo giá');
      setShowAddNegotiationForm(false);
      setNegForm((prev) => ({ ...prev, ketQua: '' }));
      await fetchQuotationDetail(q.id);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Có lỗi xảy ra khi lưu thương thảo');
    } finally {
      setSubmittingNegotiation(false);
    }
  };

  const interactionMethods = [
    { id: 'call', label: 'Gọi điện', icon: <Telephone size={15} /> },
    { id: 'meeting', label: 'Gặp mặt', icon: <People size={15} /> },
    { id: 'message', label: 'Nhắn tin', icon: <ChatDots size={15} /> },
    { id: 'email', label: 'Email', icon: <Envelope size={15} /> },
    { id: 'other', label: 'Khác', icon: <ThreeDots size={15} /> },
  ];

  return (
    <Offcanvas
      isOpen={Boolean(initialQuotation)}
      onClose={onClose}
      title={showAddNegotiationForm ? 'Thêm lịch sử thương thảo' : 'Chi tiết báo giá'}
      description={`${q.code || 'QUO-CHUA-MA'} • Ngày lập: ${ngayLapStr}`}
      icon={
        showAddNegotiationForm ? (
          <button
            type="button"
            onClick={() => setShowAddNegotiationForm(false)}
            className="w-full h-full flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
            title="Quay lại chi tiết báo giá"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <FileEarmarkText size={18} className="text-blue-600" />
        )
      }
      width="400px"
      bodyClassName={showAddNegotiationForm ? 'p-4 flex flex-col' : 'p-4 space-y-3.5'}
      footer={
        showAddNegotiationForm ? (
          <div className="w-full flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddNegotiationForm(false)}
              className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Quay lại</span>
            </button>
            <button
              type="submit"
              form="add-quotation-negotiation-form"
              disabled={submittingNegotiation}
              className="btn btn-primary flex-1 py-2 rounded-lg bg-[#003087] hover:bg-[#00256c] text-white text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check2 size={15} />
              <span>{submittingNegotiation ? 'Đang lưu...' : 'Lưu thương thảo'}</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-end gap-2">
            {onEditQuotation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditQuotation(q)}
                className="flex-1 text-[13px] font-semibold border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700"
              >
                <PencilSquare className="w-3.5 h-3.5 mr-1.5" />
                Mở / Sửa báo giá
              </Button>
            )}
            {onCreateOrderFromQuotation && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onCreateOrderFromQuotation(q)}
                className="flex-1 bg-[#003087] hover:bg-[#00256c] border-[#003087] text-white text-[13px] font-semibold"
              >
                <CartPlus className="w-3.5 h-3.5 mr-1.5" />
                Lên đơn hàng
              </Button>
            )}
          </div>
        )
      }
    >
      {showAddNegotiationForm ? (
        <form
          id="add-quotation-negotiation-form"
          onSubmit={handleAddNegotiation}
          className="flex-1 flex flex-col gap-3.5 h-full text-[13px]"
        >
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <Input
              label="Thời gian"
              required
              type="datetime-local"
              value={negForm.ngay}
              onChange={(e) => setNegForm({ ...negForm, ngay: e.target.value })}
            />
            <Input
              label="Người thực hiện"
              required
              placeholder="Tên nhân sự..."
              value={negForm.nguoiThucHien}
              onChange={(e) => setNegForm({ ...negForm, nguoiThucHien: e.target.value })}
            />
          </div>

          <div className="shrink-0">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hình thức thương thảo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {interactionMethods.map((item) => {
                const isActive = negForm.loai === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNegForm({ ...negForm, loai: item.id })}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/90 border-[1.5px] border-blue-600 text-blue-600 font-bold shadow-2xs'
                        : 'bg-slate-50/80 border border-slate-200/80 text-slate-600 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    {item.icon}
                    <span className="leading-tight truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0">
            <Select
              label="Cập nhật trạng thái báo giá"
              value={negForm.trangThaiMoi}
              onChange={(e) => setNegForm({ ...negForm, trangThaiMoi: e.target.value })}
              options={[
                { value: 'draft', label: 'Bản nháp' },
                { value: 'sent', label: 'Đang thương thảo' },
                { value: 'pending_approval', label: 'Đang trình duyệt' },
                { value: 'approved', label: 'Đã phê duyệt' },
                { value: 'won', label: 'Thành công (Chốt đơn)' },
                { value: 'paused', label: 'Tạm dừng' },
                { value: 'lost', label: 'Thất bại' },
                { value: 'cancelled', label: 'Đã huỷ' },
              ]}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-[140px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 shrink-0">
              Nội dung & Kết quả thương thảo <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              placeholder="Ghi nhận phản hồi của khách hàng về mức giá, chiết khấu, điều khoản giao hàng hoặc yêu cầu chỉnh sửa sản phẩm..."
              value={negForm.ketQua}
              onChange={(e) => setNegForm({ ...negForm, ketQua: e.target.value })}
              className="w-full flex-1 px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </form>
      ) : (
        <div className="space-y-3.5 text-[13px]">
          {/* 1. THÔNG TIN KHÁCH HÀNG & BÁO GIÁ */}
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
            <div
              onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
              className="flex items-center justify-between gap-2 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-extrabold text-[12.5px] text-[#003087]">
                  {customerCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10.5px] font-semibold">
                  {q.type === 'agency' || q.customer?.nhom === 'dai-ly' ? 'Báo giá đại lý' : 'Báo giá bán lẻ'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <QuotationStatusBadge status={q.trangThai} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCustomerInfoOpen(!isCustomerInfoOpen);
                  }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors cursor-pointer"
                  title={isCustomerInfoOpen ? 'Thu hẹp' : 'Mở rộng'}
                >
                  {isCustomerInfoOpen ? <CaretUpFill size={12} /> : <CaretDownFill size={12} />}
                </button>
              </div>
            </div>

            <div
              onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
              className="font-bold text-slate-900 text-[14.5px] leading-snug mt-1.5 cursor-pointer"
            >
              {customerName}
            </div>

            {isCustomerInfoOpen && (
              <div className="mt-2.5 space-y-2">
                {customerPhone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Telephone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono font-bold text-slate-800">{customerPhone}</span>
                    {customerEmail && (
                      <>
                        <span className="text-slate-300">•</span>
                        <Envelope className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{customerEmail}</span>
                      </>
                    )}
                  </div>
                )}
                {customerAddress && (
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <GeoAlt className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{customerAddress}</span>
                  </div>
                )}

                <div className="pt-2.5 mt-2.5 border-t border-dashed border-slate-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Hiệu lực báo giá</span>
                    <span className="font-semibold text-slate-800">
                      {ngayLapStr} → {ngayHetHanStr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Người phụ trách</span>
                    <span className="font-semibold text-slate-800">
                      {q.nguoiPhuTrach?.fullName || 'Lê Công Vụ'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. TỔNG HỢP GIÁ TRỊ TÀI CHÍNH */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-slate-600">
              <span>Tổng tiền hàng ({itemsList.length} SP):</span>
              <span className="font-mono font-semibold text-slate-900">{formatVND(tamTinh)}</span>
            </div>
            {discountPct > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Chiết khấu ({discountPct}%):</span>
                <span className="font-mono font-semibold">-{formatVND(discountAmount)}</span>
              </div>
            )}
            {vatPct > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Thuế GTGT ({vatPct}%):</span>
                <span className="font-mono font-semibold text-slate-800">+{formatVND(vatAmount)}</span>
              </div>
            )}
            {chiPhiThiCong > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Chi phí thi công:</span>
                <span className="font-mono font-semibold text-slate-800">+{formatVND(chiPhiThiCong)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[#003087] border-t border-blue-200/70 pt-1.5">
              <span className="font-bold">Tổng giá trị báo giá:</span>
              <span className="font-mono font-extrabold text-[14.5px]">{formatVND(grandTotal)}</span>
            </div>
          </div>

          {/* 3. DANH SÁCH MẶT HÀNG BÁO GIÁ */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div
              onClick={() => setIsItemsOpen(!isItemsOpen)}
              className="p-3 bg-slate-100/80 font-bold text-slate-800 text-[12.5px] flex items-center justify-between cursor-pointer select-none"
            >
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11.5px]">
                <BoxSeam className="w-3.5 h-3.5 text-blue-600" />
                <span>Chi tiết sản phẩm báo giá</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                  {itemsList.length} SP
                </span>
                {isItemsOpen ? <CaretUpFill size={11} className="text-slate-500" /> : <CaretDownFill size={11} className="text-slate-500" />}
              </div>
            </div>

            {isItemsOpen && (
              <div className="p-3 space-y-2.5 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {loadingDetail && itemsList.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Đang tải danh sách sản phẩm...</div>
                ) : itemsList.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2 text-center">
                    Chưa có danh sách sản phẩm trong báo giá
                  </div>
                ) : (
                  itemsList.map((item, idx) => {
                    let itemCode = '';
                    let areaLabel = '';
                    if (item.ghiChu) {
                      try {
                        const parsed = JSON.parse(item.ghiChu);
                        itemCode = parsed.code || '';
                        areaLabel = parsed.viTri || parsed.khuVuc || '';
                      } catch {
                        // ignore non-json
                      }
                    }
                    const lineTotal =
                      item.thanhTien ?? Number(item.soLuong || 1) * Number(item.donGia || 0);
                    return (
                      <div key={item.id || idx} className="pt-2.5 first:pt-0 flex justify-between items-start gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-[12.5px] leading-snug">
                            {itemCode && (
                              <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mr-1.5">
                                {itemCode}
                              </span>
                            )}
                            {item.tenHang}
                          </div>
                          <div className="text-[11.5px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>
                              SL: <strong className="text-slate-800">{item.soLuong || 1} {item.donVi || 'cái'}</strong>
                            </span>
                            <span>·</span>
                            <span>Đơn giá: {formatVND(item.donGia || 0)}</span>
                            {areaLabel && (
                              <>
                                <span>·</span>
                                <span className="text-indigo-600 font-medium">{areaLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-[12.5px] whitespace-nowrap">
                          {formatVND(lineTotal)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {cleanedNote && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Điều khoản & Ghi chú:</span>
              <div className="whitespace-pre-line line-clamp-3" title={cleanedNote}>
                {cleanedNote}
              </div>
            </div>
          )}

          {/* 4. LỊCH SỬ THƯƠNG THẢO BÁO GIÁ (VERTICAL TIMELINE) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase text-slate-800 tracking-wider">
                <ClockHistory className="w-3.5 h-3.5 text-blue-600" />
                <span>LỊCH SỬ THƯƠNG THẢO ({negotiationsList.length || 1})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNegForm({
                    ngay: getCurrentDateTimeLocal(),
                    loai: 'call',
                    nguoiThucHien: user?.name || q.nguoiPhuTrach?.fullName || 'Lê Công Vụ',
                    trangThaiMoi: q.trangThai || 'sent',
                    ketQua: '',
                  });
                  setShowAddNegotiationForm(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#003087] hover:bg-[#00256c] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Thêm lịch sử thương thảo mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
              {negotiationsList.map((neg, idx) => {
                const dObj = new Date(neg.ngay || neg.createdAt || q.createdAt);
                const dStr = dObj.toLocaleDateString('vi-VN');
                const tStr = dObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const meta = getNegotiationTypeMeta(neg.loai);

                return (
                  <div key={neg.id || idx} className="relative">
                    <span
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full border flex items-center justify-center ${meta.badgeClass}`}
                    >
                      {meta.icon}
                    </span>
                    <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className={`font-extrabold uppercase tracking-wide ${meta.textClass}`}>
                          {meta.label}
                        </span>
                        <span className="text-slate-400 font-mono shrink-0">
                          {dStr} • {tStr}
                        </span>
                      </div>
                      <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-line">
                        {neg.ketQua || 'Đã trao đổi thương thảo báo giá với khách hàng.'}
                      </div>
                      <div className="text-[11px] text-slate-400 text-right pt-1 border-t border-dashed border-slate-200/70">
                        Thực hiện:{' '}
                        <strong className="text-slate-700">
                          {neg.nguoiThucHien || q.nguoiPhuTrach?.fullName || 'Hệ thống'}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Mốc khởi tạo ban đầu nếu chưa có bản ghi system tạo mới */}
              {negotiationsList.length === 0 && (
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <FileEarmarkText size={11} />
                  </span>
                  <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold uppercase text-emerald-700 tracking-wide">
                        KHỞI TẠO BÁO GIÁ
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(q.createdAt).toLocaleDateString('vi-VN')} •{' '}
                        {new Date(q.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-[12.5px]">
                      Lập phiếu báo giá {q.code || ''}
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Khởi tạo báo giá cho khách hàng <strong>{customerName}</strong> với tổng giá trị{' '}
                      <strong className="font-mono text-slate-800">{formatVND(grandTotal)}</strong>.
                    </p>
                    <div className="text-[11px] text-slate-400 text-right pt-1">
                      Thực hiện:{' '}
                      <strong className="text-slate-700">
                        {q.nguoiPhuTrach?.fullName || 'Lê Công Vụ'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Offcanvas>
  );
};

