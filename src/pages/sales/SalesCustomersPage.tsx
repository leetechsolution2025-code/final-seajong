import React, { useState, useEffect } from 'react';
import { StandardPage } from '../../components/layout/StandardPage';
import { TableToolbar } from '../../components/common/TableToolbar';
import { FullWidthTable } from '../../components/common/FullWidthTable';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Offcanvas } from '../../components/common/Offcanvas';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmployeeSelect } from '../../components/common/EmployeeSelect';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Toggle } from '../../components/common/Toggle';
import { TaoDonHangModal } from '../../components/plan-finance/bao_gia/TaoDonHangModal';
import { getSourceLabel } from '../../utils/partnerUtils';
import {
  Building,
  Shop,
  GeoAlt,
  Plus,
  Pencil,
  Trash,
  Telephone,
  Envelope,
  Check2,
  CaretUpFill,
  CaretDownFill,
  ClockHistory,
  BagCheck,
  Briefcase,
} from 'react-bootstrap-icons';

export interface CustomerOrderItem {
  id: string;
  code: string;
  title?: string;
  date: string;
  time?: string;
  createdAt?: string;
  ngayDat?: string;
  ngayGiao?: string;
  tongTien: number;
  daThanhToan: number;
  discount?: number;
  vat?: number;
  ghiChu?: string;
  dueDate?: string | null;
  status?: string;
  statusLabel?: string;
  items?: any[];
}

export interface CustomerItem {
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
  nguoiChamSoc?: {
    id: string;
    fullName: string;
    phone?: string | null;
    workEmail?: string | null;
    personalEmail?: string | null;
  };
  contracts?: any[];
  orders?: CustomerOrderItem[];
  createdAt: string;
}

const extractBonusPercent = (str?: string, keywordAfter?: string): number => {
  if (!str) return 0;
  if (keywordAfter) {
    const idx = str.toLowerCase().indexOf(keywordAfter.toLowerCase());
    if (idx >= 0) {
      const sub = str.slice(idx);
      const m = sub.match(/(\d+(?:[.,]\d+)?)\s*%/);
      if (m) return Number(m[1].replace(',', '.')) || 0;
    }
  }
  const matches = [...str.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)];
  if (matches.length > 0) {
    const chosen = matches[matches.length - 1];
    return Number(chosen[1].replace(',', '.')) || 0;
  }
  return 0;
};

const renderBonusTextWithDangerBadges = (text?: string): React.ReactNode => {
  if (!text) return null;
  const allMatches = [...text.matchAll(/(\d+(?:[.,]\d+)?\s*%)/g)];
  if (allMatches.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  allMatches.forEach((m, idx) => {
    const start = m.index ?? 0;
    const matchedStr = m[0];
    const end = start + matchedStr.length;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const afterText = text.slice(end).trim().toLowerCase();
    const isCommitmentThreshold =
      allMatches.length > 1 &&
      (afterText.startsWith('cam kết') || afterText.startsWith('chỉ tiêu'));

    if (isCommitmentThreshold) {
      parts.push(matchedStr);
    } else {
      parts.push(
        <span
          key={`bonus-pct-${idx}-${start}`}
          className="badge badge-danger inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded-full text-[11px] font-bold border border-red-200 leading-none"
        >
          {matchedStr.replace(/\s+/g, '')}
        </span>
      );
    }
    lastIndex = end;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

const AutoResizeTextarea: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(38, el.scrollHeight)}px`;
  };

  useEffect(() => {
    adjustHeight();
    const raf = requestAnimationFrame(adjustHeight);
    const timer = setTimeout(adjustHeight, 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div>
      <label className="form-label block mb-1">{label}</label>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          adjustHeight();
        }}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-[13px] text-slate-800 leading-snug focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none overflow-hidden transition-colors"
      />
    </div>
  );
};

export const SalesCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [search, setSearch] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [customerSources, setCustomerSources] = useState<string[]>([
    'Tự nhiên',
    'Quảng cáo',
    'Giới thiệu',
    'Loại khác',
    'Tự khai thác',
  ]);
  const [hangCategories, setHangCategories] = useState<{ label: string; value: string }[]>([
    { label: 'Kim cương', value: 'Kim cương' },
    { label: 'Vàng', value: 'Vàng' },
    { label: 'Bạc', value: 'Bạc' },
    { label: 'Đồng', value: 'Đồng' },
  ]);
  const [nhomCategories, setNhomCategories] = useState<{ label: string; value: string }[]>([
    { label: 'Đại lý', value: 'dai-ly' },
    { label: 'Dự án', value: 'du-an' },
    { label: 'Cá nhân', value: 'ca-nhan' },
  ]);

  // Selection & Delete confirmation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [isContactProfileOpen, setIsContactProfileOpen] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);

  // Form state (chuẩn giao diện Offcanvas client-seajong)
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    address: '',
    nguon: 'Tự nhiên',
    nguoiChamSocName: '',
    xungHo: 'Anh',
    daiDien: '',
    chucVu: '',
    dienThoai: '',
    email: '',
    nhom: 'dai-ly',
    loai: 'Đồng',
    hanMucCongNo: 0,
    coCamKet: true,
    doanhSoCamKet: 0,
    thuongThanhToan: 'Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)',
    thuongDoanhSoNam: 'Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế',
    thuongVuotDoanhSo: 'Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết',
  });

  useEffect(() => {
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

    fetch('/api/categories/items?typeId=lo_i_kh_ch_h_ng')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const opts = items
            .filter((it: any) => it.status !== 'hidden' && it.name)
            .map((it: any) => ({
              label: String(it.name).trim(),
              value: String(it.code || it.name).trim(),
            }));
          if (opts.length > 0) {
            setHangCategories(opts);
          }
        }
      })
      .catch(() => {});

    fetch('/api/categories/items?typeId=customer_group')
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const opts = items
            .filter((it: any) => it.status !== 'hidden' && it.name)
            .map((it: any) => {
              const nameStr = String(it.name).trim();
              const lower = nameStr.toLowerCase();
              const normCode = lower.includes('đại lý')
                ? 'dai-ly'
                : lower.includes('dự án')
                ? 'du-an'
                : lower.includes('cá nhân')
                ? 'ca-nhan'
                : String(it.code || nameStr).trim();
              return { label: nameStr, value: normCode };
            });
          if (opts.length > 0) {
            setNhomCategories(opts);
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchCustomers = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(groupFilter && groupFilter !== 'all' ? { nhom: groupFilter } : {}),
      ...(search ? { search } : {}),
      ...(sourceFilter && sourceFilter !== 'all' ? { source: sourceFilter } : {}),
      ...(employeeFilter ? { employee: employeeFilter } : {}),
    });

    fetch(`/api/plan-finance/customers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) {
          setCustomers(data.customers);
          setTotal(data.total || 0);
          setSelectedCustomer((prev) => {
            if (!prev) return null;
            const updated = data.customers.find((item: CustomerItem) => item.id === prev.id);
            return updated || prev;
          });
        }
      })
      .catch((err) => console.error('Lỗi nạp danh sách khách hàng & đại lý:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, groupFilter, sourceFilter, employeeFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const formatVND = (num?: number) => {
    if (!num) return '0 đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const hasSalesCommitment = (c: CustomerItem): boolean => {
    if (c.formValues) {
      try {
        const fv = JSON.parse(c.formValues);
        if (typeof fv.coCamKet === 'boolean') {
          return fv.coCamKet;
        }
      } catch {}
    }
    return Number(c.doanhSoCamKet) > 0;
  };

  const resolveDisplaySource = (c: CustomerItem): string => {
    if (c.sourceLabel) return c.sourceLabel;
    if (!c.nguon || !c.nguon.trim()) return '';
    return getSourceLabel(c.nguon);
  };

  const resolveDisplayGroup = (c: CustomerItem): string => {
    if (c.groupLabel) return c.groupLabel;
    const raw = (c.nhom || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const matched = nhomCategories.find(
      (opt) => opt.value.toLowerCase() === lower || opt.label.toLowerCase() === lower
    );
    if (matched) return matched.label;
    if (lower.includes('dai-ly') || lower.includes('đại lý')) return 'Đại lý';
    if (lower.includes('du-an') || lower.includes('dự án')) return 'Dự án';
    if (lower.includes('ca-nhan') || lower.includes('cá nhân')) return 'Cá nhân';
    return raw;
  };

  const resolveDisplayRepresentative = (c: CustomerItem): string => {
    const rawRep = (c.daiDien || c.name || '').trim();
    if (!rawRep) return '—';
    const salutation = (c.xungHo || 'Anh').trim();
    const prefixMatch = rawRep.match(/^(Anh|Chị|Ông|Bà|Cô|Chú)\s+/i);
    if (prefixMatch) {
      if (c.daiDien && c.daiDien.trim() && salutation) {
        const stripped = rawRep.replace(/^(Anh|Chị|Ông|Bà|Cô|Chú)\s+/i, '').trim();
        return `${salutation} ${stripped}`;
      }
      return rawRep;
    }
    return salutation ? `${salutation} ${rawRep}` : rawRep;
  };

  const resolveDisplayPosition = (c: CustomerItem): string => {
    if (c.chucVu && c.chucVu.trim()) return c.chucVu.trim();
    if (c.formValues) {
      try {
        const fv = JSON.parse(c.formValues);
        const pos = fv.chucVu || fv.position || fv.bbB_ChucVu;
        if (pos && String(pos).trim()) return String(pos).trim();
      } catch {}
    }
    return '';
  };

  const getLowestRankValue = () => {
    const dongOpt = hangCategories.find(
      (opt) =>
        opt.label.toLowerCase().includes('đồng') || opt.value.toLowerCase().includes('dong')
    );
    return dongOpt?.value || hangCategories[hangCategories.length - 1]?.value || 'Đồng';
  };

  const resolveRankValue = (rawLoai?: string) => {
    const lowest = getLowestRankValue();
    if (!rawLoai || !rawLoai.trim()) return lowest;
    const lower = rawLoai.trim().toLowerCase();
    const matched = hangCategories.find(
      (opt) => opt.value.toLowerCase() === lower || opt.label.toLowerCase() === lower
    );
    return matched ? matched.value : lowest;
  };

  const resolveGroupValue = (rawNhom?: string) => {
    const lower = (rawNhom || '').trim().toLowerCase();
    if (lower.includes('du-an') || lower.includes('dự án') || lower === 'khg-20260401-9433-skns') {
      return 'du-an';
    }
    if (lower.includes('ca-nhan') || lower.includes('cá nhân') || lower === 'khg-20260401-3898-wxjs') {
      return 'ca-nhan';
    }
    return 'dai-ly';
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({
      id: '',
      code: '',
      name: '',
      address: '',
      nguon: customerSources[0] || 'Tự nhiên',
      nguoiChamSocName: '',
      xungHo: 'Anh',
      daiDien: '',
      chucVu: '',
      dienThoai: '',
      email: '',
      nhom: 'dai-ly',
      loai: getLowestRankValue(),
      hanMucCongNo: 0,
      coCamKet: true,
      doanhSoCamKet: 0,
      thuongThanhToan: 'Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)',
      thuongDoanhSoNam: 'Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế',
      thuongVuotDoanhSo: 'Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c: CustomerItem) => {
    setIsEditMode(true);
    let fv: any = {};
    if (c.formValues) {
      try {
        fv = JSON.parse(c.formValues);
      } catch {}
    }
    const rawRep = (c.daiDien || '').trim();
    const cleanedRep = rawRep.replace(/^(Anh|Chị|Ông|Bà|Cô|Chú)\s+/i, '').trim();
    const detectedPrefix = rawRep.match(/^(Anh|Chị|Ông|Bà|Cô|Chú)\b/i)?.[1];
    setFormData({
      id: c.id,
      code: c.code || '',
      name: c.name,
      address: c.address || '',
      nguon: resolveDisplaySource(c) || '',
      nguoiChamSocName: c.nguoiChamSoc?.fullName || '',
      xungHo: c.xungHo || detectedPrefix || 'Anh',
      daiDien: cleanedRep,
      chucVu: resolveDisplayPosition(c),
      dienThoai: c.dienThoai || '',
      email: c.email || '',
      nhom: resolveGroupValue(c.nhom),
      loai: resolveRankValue(c.loai),
      hanMucCongNo: c.hanMucCongNo || 0,
      coCamKet: hasSalesCommitment(c),
      doanhSoCamKet: c.doanhSoCamKet || fv.doanhSoCamKet || 0,
      thuongThanhToan:
        c.thuongThanhToan ||
        fv.thuongThanhToan ||
        'Mức thưởng = 2% * Doanh số thanh toán đúng hạn (Chưa VAT)',
      thuongDoanhSoNam:
        c.thuongDoanhSoNam ||
        fv.thuongDoanhSoNam ||
        'Doanh số thực tế năm >= 100% Cam kết: Thưởng 1.5% tổng doanh số thực tế',
      thuongVuotDoanhSo:
        c.thuongVuotDoanhSo ||
        fv.thuongVuotDoanhSo ||
        'Vượt chỉ tiêu: Thưởng 3% trên phần doanh số vượt chỉ tiêu cam kết',
    });
    setShowDrawer(false);
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const url = isEditMode
        ? `/api/plan-finance/customers/${formData.id}`
        : '/api/plan-finance/customers';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          doanhSoCamKet: formData.coCamKet ? Number(formData.doanhSoCamKet) || 0 : 0,
          thuongThanhToan: formData.coCamKet ? formData.thuongThanhToan : '',
          thuongDoanhSoNam: formData.coCamKet ? formData.thuongDoanhSoNam : '',
          thuongVuotDoanhSo: formData.coCamKet ? formData.thuongVuotDoanhSo : '',
          formValues: JSON.stringify({
            coCamKet: formData.coCamKet,
            doanhSoCamKet: formData.coCamKet ? Number(formData.doanhSoCamKet) || 0 : 0,
            thuongThanhToan: formData.coCamKet ? formData.thuongThanhToan : '',
            thuongDoanhSoNam: formData.coCamKet ? formData.thuongDoanhSoNam : '',
            thuongVuotDoanhSo: formData.coCamKet ? formData.thuongVuotDoanhSo : '',
          }),
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteTargetIds(Array.from(selectedIds));
    setShowDeleteConfirm(true);
  };

  const handleRequestDeleteSingle = (customerId: string) => {
    setDeleteTargetIds([customerId]);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/plan-finance/customers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteTargetIds }),
      });
      if (res.ok) {
        const deletedSet = new Set(deleteTargetIds);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedSet.forEach((id) => next.delete(id));
          return next;
        });
        if (selectedCustomer && deletedSet.has(selectedCustomer.id)) {
          setShowDrawer(false);
          setSelectedCustomer(null);
        }
        setShowDeleteConfirm(false);
        setDeleteTargetIds([]);
        fetchCustomers();
      }
    } catch (err) {
      console.error('Lỗi khi xoá đại lý:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <StandardPage
      title="Khách hàng và đại lý"
      badge="DEALERS"
      description="Quản lý mạng lưới khách hàng và đại lý phân phối thiết bị vệ sinh Seajong, cam kết doanh số và công nợ"
      icon="bi-people"
      color="blue"
      hideTicker={true}
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* ── TableToolbar chuẩn theo AGENTS.MD (nằm trong card chính) ── */}
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã ĐL, tên đại lý, người đại diện, số điện thoại, địa chỉ..."
          filters={[
            {
              id: 'group-filter',
              value: groupFilter,
              onChange: (v) => {
                setGroupFilter(v);
                setPage(1);
              },
              minWidth: '175px',
              options: [
                { label: 'Tất cả các nhóm', value: 'all' },
                ...nhomCategories,
              ],
            },
            {
              id: 'source-filter',
              value: sourceFilter,
              onChange: (v) => {
                setSourceFilter(v);
                setPage(1);
              },
              minWidth: '190px',
              options: [
                { label: 'Tất cả nguồn tiếp cận', value: 'all' },
                ...customerSources.map((src) => ({ label: src, value: src })),
              ],
            },
          ]}
          customFilters={
            <div style={{ width: '230px' }}>
              <EmployeeSelect
                multiple={false}
                value={employeeFilter}
                onChange={(val) => {
                  setEmployeeFilter(val);
                  setPage(1);
                }}
                placeholder="Chọn nhân viên phụ trách..."
                searchPlaceholder="Tìm tên nhân viên, phòng ban..."
                showAllOption={true}
                allOptionLabel="Tất cả nhân viên"
                hidePositionBadge={true}
                clearable={true}
              />
            </div>
          }
          rightActions={
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash className="w-4 h-4" />}
                  onClick={handleRequestDeleteSelected}
                >
                  Xoá ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Thêm đại lý mới
              </Button>
            </div>
          }
          onRefresh={fetchCustomers}
          onExportExcel={() => alert('Đang xuất danh sách đại lý ra file Excel...')}
        />

        {/* ── FullWidthTable với sticky header chuẩn Enterprise ── */}
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
                      checked={
                        customers.length > 0 &&
                        customers.every((c) => selectedIds.has(c.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) {
                          customers.forEach((c) => next.add(c.id));
                        } else {
                          customers.forEach((c) => next.delete(c.id));
                        }
                        setSelectedIds(next);
                      }}
                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3.5">Mã, Tên đại lý & Địa chỉ</th>
                  <th className="py-2.5 px-3.5">Người đại diện</th>
                  <th className="py-2.5 px-3.5 text-right">Cam kết doanh số</th>
                  <th className="py-2.5 px-3.5 text-right">Hạn mức nợ</th>
                  <th className="py-2.5 px-3.5 w-[230px]">Người phụ trách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const groupName = resolveDisplayGroup(c);
                  const sourceName = resolveDisplaySource(c);
                  const repDisplayName = resolveDisplayRepresentative(c);
                  const repPosition = resolveDisplayPosition(c);
                  const ownerEmail =
                    c.nguoiChamSoc?.workEmail || c.nguoiChamSoc?.personalEmail || '';
                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowDrawer(true);
                      }}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td
                        className="py-2.5 px-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) {
                              next.add(c.id);
                            } else {
                              next.delete(c.id);
                            }
                            setSelectedIds(next);
                          }}
                          className="rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-blue-600 hover:underline">
                            {c.code || `KH-${c.id.slice(-4).toUpperCase()}`}
                          </span>
                          {groupName && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10.5px] border font-semibold ${
                                groupName === 'Dự án'
                                  ? 'bg-violet-50 text-violet-700 border-violet-100'
                                  : groupName === 'Cá nhân'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-blue-50 text-blue-700 border-blue-100'
                              }`}
                            >
                              {groupName}
                            </span>
                          )}
                          {sourceName && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-600 font-medium">
                              {sourceName}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-800 text-[13px] mt-0.5">
                          {c.name}
                        </div>
                        {c.address ? (
                          <div
                            className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"
                            title={c.address}
                          >
                            <GeoAlt className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[380px]">{c.address}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <GeoAlt className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>Chưa cập nhật địa chỉ</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-slate-700 font-medium">
                          {repDisplayName}
                        </div>
                        {repPosition && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{repPosition}</span>
                          </div>
                        )}
                        {c.dienThoai ? (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Telephone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-mono">{c.dienThoai}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Telephone className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>Chưa có SĐT</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Envelope className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800">
                        {hasSalesCommitment(c)
                          ? formatVND(c.doanhSoCamKet)
                          : 'Không cam kết'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 font-medium">
                        {formatVND(c.hanMucCongNo)}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {c.nguoiChamSoc?.fullName ? (
                          <>
                            <div className="font-medium text-slate-800 text-xs">
                              {c.nguoiChamSoc.fullName}
                            </div>
                            {c.nguoiChamSoc.phone && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Telephone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-mono">{c.nguoiChamSoc.phone}</span>
                              </div>
                            )}
                            {ownerEmail && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Envelope className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>{ownerEmail}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FullWidthTable>
        </div>

        {/* ── Phân trang ── */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 15, 20, 50]}
          totalItems={total}
          pageSize={pageSize}
          itemName="đại lý"
        />
      </div>

      {/* ── HỘP THOẠI XÁC NHẬN XOÁ DỮ LIỆU (CONFIRM DIALOG) ── */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
            setDeleteTargetIds([]);
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xoá dữ liệu đại lý"
        message={
          <span>
            Bạn có chắc chắn muốn xoá <b>{deleteTargetIds.length}</b> đại lý đã chọn khỏi cơ sở dữ liệu?
          </span>
        }
        warningNote="Hành động này không thể hoàn tác. Dữ liệu đại lý đã chọn sẽ bị xoá vĩnh viễn khỏi hệ thống."
        confirmText="Xác nhận xoá"
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* ── DRAWER CHI TIẾT HỒ SƠ ĐẠI LÝ (ÁP DỤNG OFFCANVAS) ── */}
      <Offcanvas
        isOpen={Boolean(showDrawer && selectedCustomer)}
        onClose={() => setShowDrawer(false)}
        title="Thông tin khách hàng"
        description={selectedCustomer?.code ? `Mã đại lý: ${selectedCustomer.code}` : undefined}
        icon={<Building size={20} className="text-blue-600" />}
        width="400px"
        bodyClassName="p-4 space-y-4"
        footer={
          <div className="w-full flex items-center justify-between gap-2">
            {selectedCustomer ? (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash className="w-3.5 h-3.5" />}
                onClick={() => handleRequestDeleteSingle(selectedCustomer.id)}
                className="text-[13px] font-semibold"
              >
                Xoá
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {selectedCustomer && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(selectedCustomer)}
                  className="text-[13px] font-semibold"
                >
                  Chỉnh sửa
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDrawer(false)}
                className="text-[13px] font-semibold"
              >
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4 text-[13.5px]">
            {/* Hồ sơ liên hệ (Có icon fill chevron thu hẹp / mở rộng) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <div
                onClick={() => setIsContactProfileOpen(!isContactProfileOpen)}
                className="flex items-center justify-between gap-2 cursor-pointer select-none"
              >
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                  Hồ sơ liên hệ
                </h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsContactProfileOpen(!isContactProfileOpen);
                  }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors cursor-pointer"
                  title={isContactProfileOpen ? 'Thu hẹp hồ sơ liên hệ' : 'Mở rộng hồ sơ liên hệ'}
                >
                  {isContactProfileOpen ? <CaretUpFill size={12} /> : <CaretDownFill size={12} />}
                </button>
              </div>

              {isContactProfileOpen && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-slate-700">
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-xs">Tên khách hàng:</span>
                    <span className="font-bold text-slate-900 text-sm block">
                      {selectedCustomer.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Người đại diện:</span>
                    <span className="font-bold text-slate-900 text-sm block">
                      {resolveDisplayRepresentative(selectedCustomer)}
                    </span>
                    {resolveDisplayPosition(selectedCustomer) && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{resolveDisplayPosition(selectedCustomer)}</span>
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Số điện thoại:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {selectedCustomer.dienThoai || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Nguồn tiếp cận:</span>
                    <span className="font-semibold text-slate-800 text-[13px]">
                      {resolveDisplaySource(selectedCustomer) || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Nhân viên phụ trách:</span>
                    <span className="font-bold text-blue-600 text-[13px]">
                      {selectedCustomer.nguoiChamSoc?.fullName || 'Chưa phân công'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-xs">Địa chỉ:</span>
                    <span className="font-semibold text-slate-800 text-[13px]">
                      {selectedCustomer.address || 'Chưa cập nhật địa chỉ'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chỉ tiêu cam kết */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Chỉ tiêu cam kết
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                  <span className="text-xs text-blue-700 block font-medium">Cam kết doanh số:</span>
                  <span
                    className={`font-black text-[13px] text-blue-900 whitespace-nowrap block mt-0.5 ${
                      hasSalesCommitment(selectedCustomer) ? 'font-mono' : ''
                    }`}
                  >
                    {hasSalesCommitment(selectedCustomer)
                      ? formatVND(selectedCustomer.doanhSoCamKet)
                      : 'Không cam kết'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-xs text-emerald-700 block font-medium">Hạn mức công nợ:</span>
                  <span className="font-black text-[13px] text-emerald-900 font-mono whitespace-nowrap block mt-0.5">
                    {formatVND(selectedCustomer.hanMucCongNo)}
                  </span>
                </div>
              </div>

              {hasSalesCommitment(selectedCustomer) && selectedCustomer.thuongThanhToan && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[13px] leading-relaxed">
                  <span className="font-semibold text-slate-800">Thưởng thanh toán: </span>
                  {renderBonusTextWithDangerBadges(selectedCustomer.thuongThanhToan)}
                </div>
              )}
              {hasSalesCommitment(selectedCustomer) && selectedCustomer.thuongDoanhSoNam && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[13px] leading-relaxed">
                  <span className="font-semibold text-slate-800">Thưởng năm: </span>
                  {renderBonusTextWithDangerBadges(selectedCustomer.thuongDoanhSoNam)}
                </div>
              )}
              {hasSalesCommitment(selectedCustomer) && selectedCustomer.thuongVuotDoanhSo && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[13px] leading-relaxed">
                  <span className="font-semibold text-slate-800">Thưởng vượt chỉ tiêu: </span>
                  {renderBonusTextWithDangerBadges(selectedCustomer.thuongVuotDoanhSo)}
                </div>
              )}

              {hasSalesCommitment(selectedCustomer) &&
                (() => {
                  const ordersList = selectedCustomer.orders || [];
                  const totalSales = ordersList.reduce(
                    (sum, o) => sum + (Number(o.tongTien) || 0),
                    0
                  );
                  const totalPaid = ordersList.reduce(
                    (sum, o) => sum + (Number(o.daThanhToan) || 0),
                    0
                  );
                  const target = Number(selectedCustomer.doanhSoCamKet) || 0;
                  const payRate = extractBonusPercent(selectedCustomer.thuongThanhToan);
                  const annualRate = extractBonusPercent(selectedCustomer.thuongDoanhSoNam, 'thưởng');
                  const exceedRate = extractBonusPercent(selectedCustomer.thuongVuotDoanhSo, 'thưởng');

                  const bonusPaid = Math.round((totalPaid * payRate) / 100);
                  const bonusAnnual =
                    target > 0 && totalSales >= target
                      ? Math.round((totalSales * annualRate) / 100)
                      : 0;
                  const bonusExceed =
                    target > 0 && totalSales > target
                      ? Math.round(((totalSales - target) * exceedRate) / 100)
                      : 0;
                  const totalBonus = bonusPaid + bonusAnnual + bonusExceed;

                  if (totalSales <= 0 && totalPaid <= 0) return null;
                  return (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-amber-800 flex items-center flex-wrap gap-1">
                        <span>Thưởng tạm tính:</span>
                        <span className="badge badge-danger inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-red-200 leading-none">
                          {payRate}%
                        </span>
                        <span className="badge badge-danger inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-red-200 leading-none">
                          {annualRate}%
                        </span>
                        <span className="badge badge-danger inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-red-200 leading-none">
                          {exceedRate}%
                        </span>
                      </span>
                      <span className="font-mono font-bold text-amber-900 text-[13px] shrink-0">
                        {formatVND(totalBonus)}
                      </span>
                    </div>
                  );
                })()}
            </div>

            {/* Danh sách các đơn hàng của đại lý theo dạng Timeline */}
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <ClockHistory className="w-3.5 h-3.5 text-blue-600" />
                  <span>Danh sách đơn hàng ({selectedCustomer.orders?.length || 0})</span>
                </h4>
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 && (
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                    {formatVND(
                      selectedCustomer.orders.reduce(
                        (sum, ord) => sum + (Number(ord.tongTien) || 0),
                        0
                      )
                    )}
                  </span>
                )}
              </div>

              {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                <div className="relative pl-6 space-y-3 pt-1 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
                  {selectedCustomer.orders.map((ord, idx) => {
                    const isCompleted =
                      ord.status === 'completed' ||
                      (ord.tongTien > 0 && ord.daThanhToan >= ord.tongTien);
                    const isDue = ord.status === 'due';
                    return (
                      <div key={ord.id || idx} className="relative">
                        <span
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border flex items-center justify-center ${
                            isCompleted
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                              : isDue
                              ? 'bg-amber-50 border-amber-200 text-amber-600'
                              : 'bg-blue-50 border-blue-200 text-blue-600'
                          }`}
                        >
                          <BagCheck size={11} />
                        </span>
                        <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrder({
                                  ...ord,
                                  customer: {
                                    id: selectedCustomer.id,
                                    code: selectedCustomer.code,
                                    name: selectedCustomer.name,
                                    dienThoai: selectedCustomer.dienThoai || '',
                                    address: selectedCustomer.address || '',
                                    nhom: selectedCustomer.nhom || 'dai-ly',
                                    nguon: selectedCustomer.nguon || '',
                                  },
                                });
                                setShowOrderModal(true);
                              }}
                              className="font-mono font-extrabold text-blue-600 hover:text-blue-700 hover:underline tracking-wide cursor-pointer text-left"
                              title="Nhấn để chỉnh sửa đơn hàng"
                            >
                              {ord.code || 'ĐH-SEAJONG'}
                            </button>
                            <span className="text-slate-400 font-mono">
                              {ord.date}
                              {ord.time ? ` • ${ord.time}` : ''}
                            </span>
                          </div>
                          <div className="pt-1.5 border-t border-dashed border-slate-200 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="text-slate-500">Giá trị: </span>
                              <strong className="font-mono text-slate-900">
                                {formatVND(ord.tongTien)}
                              </strong>
                              {ord.daThanhToan > 0 && (
                                <span className="text-[11px] text-emerald-600 font-mono ml-1.5">
                                  (Đã TT: {formatVND(ord.daThanhToan)})
                                </span>
                              )}
                            </div>
                            {ord.dueDate && !isCompleted && (
                              <span className="text-[11px] text-slate-400">
                                Hạn thanh toán:{' '}
                                <strong className="text-slate-600 font-mono">{ord.dueDate}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">Chưa có đơn hàng nào phát sinh</p>
              )}
            </div>
          </div>
        )}
      </Offcanvas>

      {/* ── MODAL CHỈNH SỬA ĐƠN HÀNG KHI NHẤN VÀO SỐ HIỆU ĐƠN HÀNG TRONG TIMELINE ── */}
      <TaoDonHangModal
        open={showOrderModal}
        onClose={() => {
          setShowOrderModal(false);
          setEditingOrder(null);
        }}
        customer={selectedCustomer as any}
        editOrder={editingOrder}
        mode="order"
        onSaved={() => {
          fetchCustomers();
        }}
      />

      {/* ── OFFCANVAS THÊM / CHỈNH SỬA ĐẠI LÝ (RỘNG 400PX - CHUẨN CLIENT-SEAJONG) ── */}
      <Offcanvas
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isEditMode ? 'Chỉnh sửa đại lý' : 'Thêm đại lý mới'}
        icon={<Shop size={18} className="text-blue-600" />}
        width="400px"
        bodyClassName="p-3.5 overflow-y-auto"
        footer={
          <div className="w-full flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Check2 className="w-4 h-4" />}
              onClick={(e) => handleSubmitForm(e as unknown as React.FormEvent)}
            >
              {isEditMode ? 'Lưu thay đổi' : 'Thêm mới đại lý'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-3 text-[13px]">
          {/* Tên đại lý */}
          <div>
            <Input
              label="Tên đại lý"
              required
              placeholder="Nhập tên đại lý / showroom"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Số điện thoại & Email */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-5">
              <Input
                type="tel"
                label="Số điện thoại"
                placeholder="Số điện thoại"
                value={formData.dienThoai}
                onChange={(e) => setFormData({ ...formData, dienThoai: e.target.value })}
              />
            </div>
            <div className="col-span-7">
              <Input
                type="email"
                label="Email"
                placeholder="Email liên hệ"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Địa chỉ kinh doanh / Showroom */}
          <div>
            <Input
              label="Địa chỉ kinh doanh / Showroom"
              placeholder="Địa chỉ cửa hàng / showroom"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Xưng hô & Người đại diện */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-4">
              <Select
                label="Xưng hô"
                value={formData.xungHo}
                onChange={(e) => setFormData({ ...formData, xungHo: e.target.value })}
                options={[
                  { label: 'Anh', value: 'Anh' },
                  { label: 'Chị', value: 'Chị' },
                  { label: 'Ông', value: 'Ông' },
                  { label: 'Bà', value: 'Bà' },
                ]}
              />
            </div>
            <div className="col-span-8">
              <Input
                label="Người đại diện"
                placeholder="Họ và tên người đại diện"
                value={formData.daiDien}
                onChange={(e) => setFormData({ ...formData, daiDien: e.target.value })}
              />
            </div>
          </div>

          {/* Chức vụ & Nguồn khai thác */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Input
                label="Chức vụ"
                placeholder="Chủ showroom, Giám đốc..."
                value={formData.chucVu}
                onChange={(e) => setFormData({ ...formData, chucVu: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Nguồn khai thác"
                value={formData.nguon}
                onChange={(e) => setFormData({ ...formData, nguon: e.target.value })}
                options={[
                  { label: 'Chọn nguồn', value: '' },
                  ...customerSources.map((src) => ({ label: src, value: src })),
                ]}
              />
            </div>
          </div>

          {/* Nhóm & Hạng */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Select
                label="Nhóm"
                value={formData.nhom}
                onChange={(e) => setFormData({ ...formData, nhom: e.target.value })}
                options={nhomCategories}
              />
            </div>
            <div>
              <Select
                label="Hạng"
                value={formData.loai}
                onChange={(e) => setFormData({ ...formData, loai: e.target.value })}
                options={hangCategories}
              />
            </div>
          </div>

          {/* Hạn mức công nợ & Nhân viên phụ trách */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className="col-span-5">
              <Input
                type="number"
                label="Hạn mức công nợ (₫)"
                placeholder="0"
                value={formData.hanMucCongNo}
                onNumericChange={(val) => setFormData({ ...formData, hanMucCongNo: val })}
              />
            </div>
            <div className="col-span-7">
              <EmployeeSelect
                label="Nhân viên phụ trách"
                multiple={false}
                value={formData.nguoiChamSocName}
                onChange={(val) => setFormData({ ...formData, nguoiChamSocName: val })}
                placeholder="Chọn nhân viên chăm sóc"
                hidePositionBadge={true}
              />
            </div>
          </div>

          {/* Có cam kết doanh số năm (Switch + các trường cam kết & thưởng) */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <Toggle
              checked={formData.coCamKet}
              onChange={(checked) => setFormData({ ...formData, coCamKet: checked })}
              label="Có cam kết doanh số năm"
            />

            {formData.coCamKet && (
              <div className="space-y-2.5">
                <div>
                  <Input
                    type="number"
                    label="Mức cam kết doanh số năm (₫)"
                    placeholder="Ví dụ: 1.000.000.000"
                    value={formData.doanhSoCamKet}
                    onNumericChange={(val) => setFormData({ ...formData, doanhSoCamKet: val })}
                  />
                </div>
                <AutoResizeTextarea
                  label="Thưởng thanh toán đúng hạn"
                  value={formData.thuongThanhToan}
                  onChange={(val) => setFormData({ ...formData, thuongThanhToan: val })}
                />
                <AutoResizeTextarea
                  label="Thưởng đạt doanh số năm"
                  value={formData.thuongDoanhSoNam}
                  onChange={(val) => setFormData({ ...formData, thuongDoanhSoNam: val })}
                />
                <AutoResizeTextarea
                  label="Thưởng vượt chỉ tiêu"
                  value={formData.thuongVuotDoanhSo}
                  onChange={(val) => setFormData({ ...formData, thuongVuotDoanhSo: val })}
                />
              </div>
            )}
          </div>
        </form>
      </Offcanvas>
    </StandardPage>
  );
};

export default SalesCustomersPage;
