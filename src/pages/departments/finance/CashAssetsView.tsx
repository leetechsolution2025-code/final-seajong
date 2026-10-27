import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet2,
  Bank,
  Plus,
  Pencil,
  ChevronDown,
  Check,
  ExclamationTriangle,
} from 'react-bootstrap-icons';
import { TableToolbar, type TableToolbarFilter } from '../../../components/common/TableToolbar';
import { Pagination } from '../../../components/common/Pagination';
import { FullWidthTable } from '../../../components/common/FullWidthTable';
import { DeleteButton } from '../../../components/common/DeleteButton';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { NumberInput } from '../../../components/common/NumberInput';
import { EmployeeSelect } from '../../../components/common/EmployeeSelect';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notifyFinanceUpdated, useFinanceRealtimeSync } from '../../../services/financeSyncService';
import { AssetReportPrintModal } from './AssetReportPrintModal';

export interface CashAssetItem {
  id: string;
  code: string;
  name: string;
  type: 'cash' | 'bank' | 'term_deposit';
  accountNumber: string;
  bankName: string;
  branch: string;
  balance: number;
  currency: string;
  termMonths: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  managerName: string;
  status: 'active' | 'locked';
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashAssetsViewProps {
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

// Hàm chuẩn hóa tên tài sản: loại bỏ toàn bộ nội dung trong ngoặc đơn ()
const cleanAssetName = (name: string): string => {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim();
};

// Hàm bóc tách thông tin người phụ trách và chức vụ (không dùng ngoặc đơn, phân cách bằng |)
interface ParsedManager {
  name: string;
  role?: string;
}

const parseManager = (str?: string): ParsedManager => {
  if (!str) return { name: '' };
  const trimmed = str.trim();
  // Trường hợp có ngoặc đơn: "Hoàng Thị Thảo (Thủ quỹ)"
  const match = trimmed.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (match) {
    return {
      name: match[1].trim(),
      role: match[2].trim(),
    };
  }
  // Trường hợp đã có dấu gạch đứng |
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return {
      name: parts[0].trim(),
      role: parts.slice(1).join('|').trim(),
    };
  }
  // Trường hợp có dấu gạch ngang -
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    return {
      name: parts[0].trim(),
      role: parts.slice(1).join(' - ').trim(),
    };
  }
  return { name: trimmed };
};

// Hàm định dạng ngày tháng sang chuẩn Việt Nam (dd/mm/YYYY)
const formatDateVN = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const str = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
};

// Danh mục phân loại tài sản bằng tiền (kèm mã tài khoản kế toán)
interface AccountTypeOption {
  value: 'cash' | 'bank' | 'term_deposit';
  label: string;
  accountCode: string;
}

const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { value: 'cash', label: 'Tiền mặt tại quỹ két', accountCode: 'TK 1111' },
  { value: 'bank', label: 'Tiền gửi thanh toán ngân hàng', accountCode: 'TK 1121' },
  { value: 'term_deposit', label: 'Tiền gửi tiết kiệm có kỳ hạn', accountCode: 'TK 1281' },
];

// Danh mục ngân hàng phổ biến tại Việt Nam phục vụ gợi ý nhập liệu
const POPULAR_VN_BANKS = [
  { shortName: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { shortName: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư & Phát triển Việt Nam' },
  { shortName: 'VietinBank', fullName: 'Ngân hàng TMCP Công thương Việt Nam' },
  { shortName: 'Agribank', fullName: 'Ngân hàng Nông nghiệp & PT Nông thôn' },
  { shortName: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { shortName: 'MBBank', fullName: 'Ngân hàng TMCP Quân đội' },
  { shortName: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { shortName: 'ACB', fullName: 'Ngân hàng TMCP Á Châu' },
  { shortName: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong' },
  { shortName: 'VIB', fullName: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { shortName: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { shortName: 'HDBank', fullName: 'Ngân hàng TMCP Phát triển TP.HCM' },
  { shortName: 'SHB', fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { shortName: 'MSB', fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { shortName: 'SeABank', fullName: 'Ngân hàng TMCP Đông Nam Á' },
  { shortName: 'OCB', fullName: 'Ngân hàng TMCP Phương Đông' },
  { shortName: 'LPBank', fullName: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
];

// Cấu trúc tự sinh mã định danh tài sản theo quy tắc
const generateAssetCode = (
  type: 'cash' | 'bank' | 'term_deposit',
  bankName: string,
  existingList: CashAssetItem[]
): string => {
  const currentYear = new Date().getFullYear();
  if (type === 'cash') {
    const cashList = existingList.filter((x) => x.type === 'cash');
    const nextNum = cashList.length + 1;
    return `TM-QUY-${String(nextNum).padStart(2, '0')}`;
  } else if (type === 'bank') {
    let bankPrefix = 'NH';
    const bLower = (bankName || '').toLowerCase();
    if (bLower.includes('vietcombank') || bLower.includes('vcb')) bankPrefix = 'VCB';
    else if (bLower.includes('bidv')) bankPrefix = 'BIDV';
    else if (bLower.includes('techcombank') || bLower.includes('tcb')) bankPrefix = 'TCB';
    else if (bLower.includes('mbbank') || bLower.includes('mb')) bankPrefix = 'MB';
    else if (bLower.includes('vietinbank') || bLower.includes('ctg')) bankPrefix = 'CTG';
    else if (bLower.includes('agribank') || bLower.includes('vba')) bankPrefix = 'AGR';
    else if (bLower.includes('acb')) bankPrefix = 'ACB';
    else if (bLower.includes('tpbank')) bankPrefix = 'TPB';
    else if (bLower.includes('vpbank')) bankPrefix = 'VPB';
    else if (bLower.includes('shb')) bankPrefix = 'SHB';
    else if (bLower.includes('sacombank') || bLower.includes('stb')) bankPrefix = 'STB';

    const bankList = existingList.filter((x) => x.type === 'bank');
    const nextNum = bankList.length + 1;
    return `TG-${bankPrefix}-${String(nextNum).padStart(2, '0')}`;
  } else {
    const termList = existingList.filter((x) => x.type === 'term_deposit');
    const nextNum = termList.length + 1;
    return `HDTG-${currentYear}/${String(nextNum).padStart(2, '0')}`;
  }
};

export const CashAssetsView: React.FC<CashAssetsViewProps> = ({ onShowToast }) => {
  const [items, setItems] = useState<CashAssetItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Offcanvas Thêm mới / Chỉnh sửa
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CashAssetItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'cash' | 'bank' | 'term_deposit'>('bank');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formBankName, setFormBankName] = useState('Vietcombank');
  const [formBranch, setFormBranch] = useState('');
  const [formBalance, setFormBalance] = useState(0);
  const [formTermMonths, setFormTermMonths] = useState(0);
  const [formInterestRate, setFormInterestRate] = useState(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formMaturityDate, setFormMaturityDate] = useState('');
  const [formManagerName, setFormManagerName] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'locked'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown phân loại tài sản & Gợi ý ngân hàng
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isBankSuggestOpen, setIsBankSuggestOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const bankSuggestRef = useRef<HTMLDivElement>(null);

  // Click outside để đóng các menu dropdown trong form
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (bankSuggestRef.current && !bankSuggestRef.current.contains(e.target as Node)) {
        setIsBankSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Offcanvas Chi tiết
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CashAssetItem | null>(null);

  // Confirm Xóa
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CashAssetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal in báo cáo quản lý tài sản toàn diện
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  // Tải danh sách tài sản bằng tiền từ API (hỗ trợ silent update chống giật nháy)
  const loadData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const res = await fetch('/api/finance/cash-assets');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        if (!silent) {
          onShowToast?.('error', 'Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ lấy danh sách tài sản bằng tiền.');
        }
      }
    } catch (err: any) {
      if (!silent) {
        onShowToast?.('error', 'Lỗi kết nối', err.message);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lắng nghe cập nhật thời gian thực (chạy ở chế độ silent ngầm, triệt tiêu hiện tượng nháy)
  useFinanceRealtimeSync(() => {
    loadData(true);
  });

  // Định dạng VNĐ
  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
  };

  // Đổi loại tài sản (tự sinh mã định danh theo cấu trúc nếu thêm mới)
  const handleTypeChange = (newType: 'cash' | 'bank' | 'term_deposit') => {
    setFormType(newType);
    if (!editingItem) {
      const newCode = generateAssetCode(newType, formBankName, items);
      setFormCode(newCode);
      if (newType === 'cash') {
        if (!formName || formName.includes('Vietcombank') || formName.includes('Tài khoản') || formName.includes('Hợp đồng')) {
          setFormName('Quỹ két tiền mặt văn phòng');
        }
        setFormManagerName('Hoàng Thị Thảo | Thủ quỹ');
      } else if (newType === 'term_deposit') {
        if (!formName || formName.includes('Quỹ két') || formName.includes('Tài khoản')) {
          setFormName(`Hợp đồng tiền gửi tiết kiệm ${formTermMonths || 6} tháng`);
        }
        setFormManagerName('Hà Hải Lâm | Giám đốc');
      } else {
        if (!formName || formName.includes('Quỹ két') || formName.includes('Hợp đồng')) {
          setFormName(`Tài khoản thanh toán ${formBankName || 'Vietcombank'}`);
        }
        setFormManagerName('Nguyễn Hồng Nhung | Kế toán NH');
      }
    }
  };

  // Chọn ngân hàng từ danh sách gợi ý
  const handleBankSelect = (bankShortName: string) => {
    setFormBankName(bankShortName);
    if (!editingItem && formType === 'bank') {
      setFormCode(generateAssetCode('bank', bankShortName, items));
      if (!formName || formName.startsWith('Tài khoản thanh toán')) {
        setFormName(`Tài khoản thanh toán ${bankShortName}`);
      }
    }
  };

  // Bộ lọc danh sách
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Tìm kiếm
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        (item.accountNumber && item.accountNumber.toLowerCase().includes(term)) ||
        (item.bankName && item.bankName.toLowerCase().includes(term)) ||
        (item.branch && item.branch.toLowerCase().includes(term)) ||
        (item.managerName && item.managerName.toLowerCase().includes(term));

      // 2. Lọc loại
      const matchType = typeFilter === 'ALL' || item.type === typeFilter;

      // 3. Lọc ngân hàng / tổ chức
      const matchBank =
        bankFilter === 'ALL' ||
        (bankFilter === 'INTERNAL' && item.type === 'cash') ||
        (item.bankName && item.bankName.toLowerCase().includes(bankFilter.toLowerCase()));

      // 4. Lọc trạng thái hoạt động / tạm khóa
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchType && matchBank && matchStatus;
    });
  }, [items, searchTerm, typeFilter, bankFilter, statusFilter]);

  // Phân trang
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Xuất file Excel bảng kê tài sản bằng tiền
  const handleExportExcel = () => {
    const fileName = `Tai_san_bang_tien_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'STT,Mã tài khoản,Tên tài sản / Quỹ,Loại tài sản,Số tài khoản,Ngân hàng,Chi nhánh,Số dư (VNĐ),Kỳ hạn (tháng),Lãi suất (%),Người quản lý,Trạng thái\n';
    filteredItems.forEach((item, idx) => {
      const typeLabel = item.type === 'cash' ? 'Tiền mặt' : item.type === 'term_deposit' ? 'Tiền gửi kỳ hạn' : 'Tiền gửi thanh toán';
      csvContent += `${idx + 1},"${item.code}","${cleanAssetName(item.name)}","${typeLabel}","${item.accountNumber}","${item.bankName}","${item.branch}",${item.balance},${item.termMonths || 0},${item.interestRate || 0},"${item.managerName || ''}","${item.status === 'active' ? 'Đang hoạt động' : 'Đang tạm khóa'}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mở Form Thêm mới
  const handleOpenCreate = () => {
    setEditingItem(null);
    const initialType = 'bank';
    const initialBank = 'Vietcombank';
    const autoCode = generateAssetCode(initialType, initialBank, items);
    setFormCode(autoCode);
    setFormName('Tài khoản thanh toán Vietcombank');
    setFormType(initialType);
    setFormAccountNumber('');
    setFormBankName(initialBank);
    setFormBranch('');
    setFormBalance(0);
    setFormTermMonths(0);
    setFormInterestRate(0.2);
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormMaturityDate('');
    setFormManagerName('Nguyễn Hồng Nhung | Kế toán NH');
    setFormStatus('active');
    setFormNotes('');
    setIsTypeDropdownOpen(false);
    setIsBankSuggestOpen(false);
    setIsFormOpen(true);
  };

  // Mở Form Sửa
  const handleOpenEdit = (item: CashAssetItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormType(item.type);
    setFormAccountNumber(item.accountNumber || '');
    setFormBankName(item.bankName || '');
    setFormBranch(item.branch || '');
    setFormBalance(item.balance || 0);
    setFormTermMonths(item.termMonths || 0);
    setFormInterestRate(item.interestRate || 0);
    setFormStartDate(item.startDate || '');
    setFormMaturityDate(item.maturityDate || '');
    setFormManagerName(item.managerName || '');
    setFormStatus(item.status || 'active');
    setFormNotes(item.notes || '');
    setIsTypeDropdownOpen(false);
    setIsBankSuggestOpen(false);
    setIsFormOpen(true);
  };

  // Lưu Form Thêm mới / Sửa
  const handleSaveForm = async () => {
    if (!formName.trim()) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập tên tài khoản hoặc sổ quỹ.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Partial<CashAssetItem> = {
        id: editingItem ? editingItem.id : `cba-${Date.now()}`,
        code: formCode,
        name: formName.trim(),
        type: formType,
        accountNumber: formAccountNumber.trim(),
        bankName: formType === 'cash' ? 'Nội bộ công ty' : formBankName.trim(),
        branch: formBranch.trim(),
        balance: formBalance,
        currency: 'VND',
        termMonths: formType === 'term_deposit' ? Number(formTermMonths) : 0,
        interestRate: Number(formInterestRate),
        startDate: formStartDate,
        maturityDate: formType === 'term_deposit' ? formMaturityDate : '',
        managerName: formManagerName.trim(),
        status: formStatus,
        notes: formNotes.trim(),
      };

      const res = await fetch('/api/finance/cash-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        notifyFinanceUpdated('cash_assets', 'update');
        onShowToast?.('success', 'Thành công', editingItem ? 'Đã cập nhật thông tin tài sản bằng tiền.' : 'Đã tạo tài khoản / sổ quỹ mới.');
        setIsFormOpen(false);
        loadData();
      } else {
        onShowToast?.('error', 'Lưu thất bại', data.message || 'Có lỗi xảy ra khi lưu.');
      }
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi hệ thống', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa tài sản bằng tiền
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/finance/cash-assets/${itemToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        notifyFinanceUpdated('cash_assets', 'delete');
        onShowToast?.('success', 'Đã xóa', `Đã xóa tài sản ${itemToDelete.name}.`);
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        loadData();
      } else {
        onShowToast?.('error', 'Xóa thất bại', data.message);
      }
    } catch (err: any) {
      onShowToast?.('error', 'Lỗi', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Chọn / bỏ chọn tất cả tài sản trên trang hiện tại
  const handleToggleSelectAll = () => {
    if (selectedIds.length === pagedItems.length && pagedItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedItems.map((a) => a.id));
    }
  };

  // Chọn / bỏ chọn từng tài sản
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Xóa các mục đã chọn qua DeleteButton
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/finance/cash-assets/${id}`, { method: 'DELETE' });
      }
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      notifyFinanceUpdated('cash_assets', 'delete');
      onShowToast?.('success', 'Đã xoá tài sản', `Đã xoá thành công ${selectedIds.length} tài khoản / sổ quỹ khỏi cơ sở dữ liệu.`);
    } catch (e: any) {
      console.error('Lỗi khi xoá tài khoản/sổ quỹ:', e);
      onShowToast?.('error', 'Lỗi', 'Không thể xoá các tài sản đã chọn.');
    }
  };

  // Cấu hình TableToolbar Filter
  const toolbarFilters: TableToolbarFilter[] = [
    {
      id: 'typeFilter',
      value: typeFilter,
      onChange: (val) => {
        setTypeFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Tất cả loại tiền', value: 'ALL' },
        { label: 'Tiền mặt tại quỹ', value: 'cash' },
        { label: 'Tiền gửi thanh toán', value: 'bank' },
        { label: 'Tiền gửi có kỳ hạn', value: 'term_deposit' },
      ],
    },
    {
      id: 'bankFilter',
      value: bankFilter,
      onChange: (val) => {
        setBankFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Tất cả', value: 'ALL' },
        { label: 'Vietcombank', value: 'Vietcombank' },
        { label: 'BIDV', value: 'BIDV' },
        { label: 'Quỹ két nội bộ', value: 'INTERNAL' },
      ],
    },
    {
      id: 'statusFilter',
      value: statusFilter,
      onChange: (val) => {
        setStatusFilter(val);
        setCurrentPage(1);
      },
      options: [
        { label: 'Tất cả trạng thái', value: 'ALL' },
        { label: 'Hoạt động', value: 'active' },
        { label: 'Tạm khóa', value: 'locked' },
      ],
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-surface-1, #ffffff)',
      }}
    >
      {/* 1. THANH CÔNG CỤ TABLE TOOLBAR */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm theo tên tài khoản, số TK, ngân hàng, chi nhánh..."
        searchMinWidth="240px"
        filters={toolbarFilters}
        printLabel="In báo cáo"
        onPrint={() => setIsReportPrintOpen(true)}
        onExportExcel={handleExportExcel}
        onRefresh={() => loadData(false)}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenCreate}
            >
              Thêm mới
            </Button>

            <DeleteButton
              size="sm"
              itemCount={selectedIds.length}
              disabled={selectedIds.length === 0}
              onConfirm={handleDeleteSelected}
              dialogTitle="Xác nhận xoá tài sản bằng tiền"
              dialogMessage={
                selectedIds.length > 0
                  ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} tài khoản / sổ quỹ đã chọn khỏi cơ sở dữ liệu? Hành động này không thể hoàn tác.`
                  : 'Bạn có chắc chắn muốn xóa tài khoản này khỏi cơ sở dữ liệu?'
              }
              title={
                selectedIds.length === 0
                  ? 'Chọn ít nhất một tài sản để xoá'
                  : `Xoá ${selectedIds.length} tài sản đã chọn`
              }
            />
          </div>
        }
        style={{
          marginBottom: 0,
          padding: '10px 20px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        }}
      />

      {/* 2. FULL WIDTH TABLE: BẢNG DANH MỤC TÀI SẢN BẰNG TIỀN (CHỐNG NHÁY) */}
      <FullWidthTable loading={isLoading && items.length > 0} loadingText="Đang đồng bộ dữ liệu...">
        <table
          className="custom-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            margin: 0,
            fontSize: '0.8125rem',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--bg-surface-2, #f8fafc)',
            }}
          >
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                color: 'var(--text-muted, #64748b)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              <th style={{ width: '40px', textAlign: 'center', padding: '10px 8px' }}>
                <input
                  type="checkbox"
                  checked={pagedItems.length > 0 && selectedIds.length === pagedItems.length}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ minWidth: '260px', padding: '10px 14px' }}>Tên tài sản / Tài khoản</th>
              <th style={{ minWidth: '220px', padding: '10px 14px', whiteSpace: 'nowrap' }}>Số tài khoản / Chi nhánh</th>
              <th style={{ width: '160px', padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Số dư hiện tại</th>
              <th style={{ width: '180px', padding: '10px 14px', whiteSpace: 'nowrap' }}>Kỳ hạn & Lãi suất</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Đang tải danh mục tài sản bằng tiền...</div>
                </td>
              </tr>
            ) : pagedItems.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                  <ExclamationTriangle size={32} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#64748b' }}>
                    Không tìm thấy tài khoản hoặc sổ quỹ nào
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '4px' }}>
                    Thử thay đổi từ khóa tìm kiếm hoặc các tiêu chí bộ lọc
                  </div>
                </td>
              </tr>
            ) : (
              pagedItems.map((item, index) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsDetailOpen(true);
                    }}
                    style={{
                      borderBottom: index < pagedItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                      backgroundColor: isSelected ? 'rgba(23, 92, 211, 0.04)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Cột 1: Checkbox */}
                    <td
                      style={{ width: '40px', textAlign: 'center', padding: '10px 8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelect(item.id, e as any)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Tên tài sản / Tài khoản, Phân loại, Trạng thái & Người phụ trách */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            lineHeight: 1.35,
                          }}
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailOpen(true);
                          }}
                          title={item.name}
                        >
                          {cleanAssetName(item.name)}
                        </span>

                        {item.type === 'cash' ? (
                          <Badge variant="success">Tiền mặt tại két</Badge>
                        ) : item.type === 'term_deposit' ? (
                          <Badge variant="warning">Tiền gửi kỳ hạn</Badge>
                        ) : (
                          <Badge variant="brand">Tiền gửi thanh toán</Badge>
                        )}

                        {item.status === 'active' ? (
                          <Badge variant="success">Hoạt động</Badge>
                        ) : (
                          <Badge variant="neutral">Tạm khóa</Badge>
                        )}
                      </div>
                      {item.managerName && (() => {
                        const mgr = parseManager(item.managerName);
                        return (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary, #64748b)',
                              marginTop: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              lineHeight: 1.25,
                            }}
                          >
                            <span>Phụ trách:</span>
                            <strong style={{ color: 'var(--text-primary, #334155)', fontWeight: 600 }}>
                              {mgr.name}
                            </strong>
                            {mgr.role && (
                              <>
                                <span style={{ color: 'var(--text-tertiary, #94a3b8)', margin: '0 2px' }}>|</span>
                                <span style={{ fontWeight: 400, color: 'var(--text-secondary, #64748b)' }}>
                                  {mgr.role}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Số tài khoản & Ngân hàng */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {item.accountNumber || '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', marginTop: '3px', whiteSpace: 'nowrap' }}>
                        {item.bankName} {item.branch ? `• ${item.branch}` : ''}
                      </div>
                    </td>

                    {/* Số dư hiện tại */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        {formatVND(item.balance)}
                      </div>
                    </td>

                    {/* Kỳ hạn & Lãi suất */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {item.type === 'term_deposit' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(111, 66, 193, 0.08)',
                              color: '#6f42c1',
                              border: '1px solid rgba(111, 66, 193, 0.2)',
                              lineHeight: 1.25,
                            }}
                          >
                            {item.termMonths} tháng • {item.interestRate}%/năm
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
                            Đáo hạn: <span style={{ fontWeight: 600, color: 'var(--text-primary, #334155)', fontFamily: 'monospace' }}>{formatDateVN(item.maturityDate)}</span>
                          </div>
                        </div>
                      ) : item.type === 'bank' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(100, 116, 139, 0.08)',
                              color: '#475569',
                              border: '1px solid rgba(100, 116, 139, 0.16)',
                              lineHeight: 1.25,
                            }}
                          >
                            Không kỳ hạn • {item.interestRate || 0.2}%/năm
                          </span>
                        </div>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            backgroundColor: 'var(--bg-surface-2, #f8fafc)',
                            color: 'var(--text-tertiary, #94a3b8)',
                            border: '1px dashed var(--border-default, #cbd5e1)',
                          }}
                        >
                          Không áp dụng
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </FullWidthTable>

        {/* Phân trang */}
        <div style={{ flexShrink: 0, padding: '10px 20px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', backgroundColor: 'var(--bg-surface-1, #ffffff)' }}>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>

      {/* 4. OFFCANVAS THÊM MỚI / CHỈNH SỬA TÀI KHOẢN (RỘNG 400PX, ICON LỚN Ở HEAD, BUTTON CHUẨN) */}
      <Offcanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? 'Chỉnh sửa tài sản bằng tiền' : 'Thêm tài khoản / Sổ quỹ'}
        description={editingItem ? `Cập nhật thông tin cho mã ${formCode}` : 'Khai báo tài khoản ngân hàng hoặc quỹ tiền mặt mới'}
        icon={<Wallet2 size={24} style={{ color: 'var(--color-primary)' }} />}
        width="400px"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleSaveForm} disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* 1. Phân loại tài sản (căn lề số tài khoản về bên phải) */}
          <div style={{ position: 'relative' }} ref={typeDropdownRef}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
              Phân loại tài sản bằng tiền <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
              style={{
                width: '100%',
                minHeight: '36px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                border: isTypeDropdownOpen ? '1px solid var(--color-primary, #0284c7)' : '1px solid var(--border-default, #cbd5e1)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isTypeDropdownOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === formType)?.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'var(--color-primary, #0284c7)',
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {ACCOUNT_TYPE_OPTIONS.find((o) => o.value === formType)?.accountCode}
                </span>
                <ChevronDown
                  size={13}
                  style={{
                    color: 'var(--text-tertiary, #94a3b8)',
                    transform: isTypeDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}
                />
              </div>
            </button>

            {isTypeDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  border: '1px solid var(--border-default, #cbd5e1)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                  const isSelected = opt.value === formType;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        handleTypeChange(opt.value);
                        setIsTypeDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                        color: isSelected ? 'var(--color-primary, #0284c7)' : 'var(--text-primary)',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover, #f8fafc)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSelected ? (
                          <Check size={14} style={{ color: 'var(--color-primary, #0284c7)', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: '14px' }} />
                        )}
                        <span style={{ fontSize: '0.8125rem', fontWeight: isSelected ? 600 : 400 }}>
                          {opt.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: isSelected ? 'var(--color-primary, #0284c7)' : 'var(--text-secondary, #64748b)',
                          backgroundColor: isSelected ? 'transparent' : '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {opt.accountCode}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Tên tài khoản / Sổ quỹ */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
              Tên tài khoản / Sổ quỹ <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="VD: Tài khoản thanh toán Vietcombank..."
            />
          </div>

          {/* 3. Mã định danh & Trạng thái */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Mã định danh <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--color-primary)' }}>(Tự sinh)</span>
              </label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="TM-QUY-01, TG-VCB-01..."
                style={{ backgroundColor: 'var(--bg-surface-2, #f8fafc)', fontFamily: 'monospace', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                Trạng thái
              </label>
              <Select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                options={[
                  { label: 'Hoạt động', value: 'active' },
                  { label: 'Tạm khóa', value: 'locked' },
                ]}
              />
            </div>
          </div>

          {/* 4. Thông tin ngân hàng & Số TK */}
          {formType !== 'cash' && (
            <>
              <div style={{ position: 'relative' }} ref={bankSuggestRef}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Ngân hàng <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <Input
                  value={formBankName}
                  onChange={(e) => {
                    setFormBankName(e.target.value);
                    setIsBankSuggestOpen(true);
                  }}
                  onFocus={() => setIsBankSuggestOpen(true)}
                  placeholder="Nhập hoặc chọn ngân hàng Việt Nam..."
                />
                {isBankSuggestOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      maxHeight: '190px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-default, #cbd5e1)',
                      borderRadius: '6px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                      zIndex: 50,
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                      Gợi ý ngân hàng tại Việt Nam
                    </div>
                    {POPULAR_VN_BANKS.filter(
                      (b) =>
                        !formBankName ||
                        b.shortName.toLowerCase().includes(formBankName.toLowerCase()) ||
                        b.fullName.toLowerCase().includes(formBankName.toLowerCase())
                    ).map((bank) => (
                      <div
                        key={bank.shortName}
                        onClick={() => {
                          handleBankSelect(bank.shortName);
                          setIsBankSuggestOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover, #f8fafc)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {bank.shortName}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          {bank.fullName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Chi nhánh
                </label>
                <Input
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                  placeholder="Chi nhánh Thăng Long, Hà Tây..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Số tài khoản / Hợp đồng tiền gửi
                </label>
                <Input
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                  placeholder="0011004567899..."
                />
              </div>
            </>
          )}

          {/* 5. Số dư hiện tại (hiển thị đồng, nhãn Số dư hiện tại) */}
          <div>
            <NumberInput
              label="Số dư hiện tại"
              value={formBalance}
              onValueChange={setFormBalance}
              suffix="đồng"
              helperText="Số dư khả dụng tại thời điểm cập nhật"
            />
          </div>

          {formType === 'term_deposit' && (
            <div style={{ backgroundColor: 'var(--bg-surface-2)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#6f42c1' }}>
                Thông số kỳ hạn & Lãi suất
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Kỳ hạn (tháng)
                  </label>
                  <Input
                    type="number"
                    value={String(formTermMonths)}
                    onChange={(e) => setFormTermMonths(Number(e.target.value))}
                    placeholder="6, 12..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Lãi suất (%/năm)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={String(formInterestRate)}
                    onChange={(e) => setFormInterestRate(Number(e.target.value))}
                    placeholder="5.6..."
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Ngày gửi
                  </label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Ngày đáo hạn
                  </label>
                  <Input
                    type="date"
                    value={formMaturityDate}
                    onChange={(e) => setFormMaturityDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Người phụ trách: áp dụng component EmployeeSelect */}
          <div>
            <EmployeeSelect
              label="Người phụ trách"
              multiple={false}
              value={formManagerName ? parseManager(formManagerName).name : ''}
              onChange={(val, selectedEmps) => {
                if (selectedEmps && selectedEmps.length > 0) {
                  const emp = selectedEmps[0];
                  const role = emp.position || emp.department || '';
                  setFormManagerName(role ? `${emp.name} | ${role}` : emp.name);
                } else {
                  setFormManagerName(val);
                }
              }}
              placeholder="Chọn nhân sự phụ trách..."
            />
          </div>

          {/* 7. Ghi chú dùng textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Nhập ghi chú chi tiết..."
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid var(--border-default, #cbd5e1)',
                backgroundColor: 'var(--bg-surface, #ffffff)',
                color: 'var(--text-primary, #0f172a)',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Offcanvas>

      {/* 5. OFFCANVAS XEM CHI TIẾT TÀI KHOẢN (RỘNG 400PX, ICON LỚN Ở HEAD, BUTTON CHUẨN) */}
      <Offcanvas
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedItem ? selectedItem.name : 'Chi tiết tài sản bằng tiền'}
        description={selectedItem ? `Mã: ${selectedItem.code} • Phân hệ Vốn bằng tiền` : ''}
        icon={<Bank size={24} style={{ color: 'var(--color-primary)' }} />}
        width="400px"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>
            {selectedItem && (
              <Button
                variant="primary"
                leftIcon={<Pencil size={14} />}
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedItem);
                }}
              >
                Chỉnh sửa
              </Button>
            )}
          </div>
        }
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Box số dư */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border-default)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Số dư khả dụng hiện tại
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '4px' }}>
                {formatVND(selectedItem.balance)}
              </div>
              <div style={{ display: 'inline-flex', marginTop: '6px' }}>
                {selectedItem.type === 'cash' ? (
                  <Badge variant="success">Quỹ tiền mặt</Badge>
                ) : selectedItem.type === 'term_deposit' ? (
                  <Badge variant="warning">Tiền gửi kỳ hạn</Badge>
                ) : (
                  <Badge variant="brand">Tài khoản thanh toán</Badge>
                )}
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Mã định danh:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedItem.code}</span>
              </div>
              {selectedItem.type !== 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Ngân hàng:</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedItem.bankName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Chi nhánh:</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{selectedItem.branch || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Số tài khoản:</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {selectedItem.accountNumber}
                    </span>
                  </div>
                </>
              )}
              {selectedItem.type === 'term_deposit' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Kỳ hạn & Lãi suất:</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(111, 66, 193, 0.08)',
                        color: '#6f42c1',
                        border: '1px solid rgba(111, 66, 193, 0.2)',
                      }}
                    >
                      {selectedItem.termMonths} tháng • {selectedItem.interestRate}%/năm
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Ngày gửi:</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{formatDateVN(selectedItem.startDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Ngày đáo hạn:</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#28a745', fontFamily: 'monospace' }}>{formatDateVN(selectedItem.maturityDate)}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Người phụ trách:</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                  {selectedItem.managerName ? (() => {
                    const mgr = parseManager(selectedItem.managerName);
                    return (
                      <span>
                        <strong style={{ fontWeight: 600 }}>{mgr.name}</strong>
                        {mgr.role && (
                          <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> | {mgr.role}</span>
                        )}
                      </span>
                    );
                  })() : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-default)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Trạng thái:</span>
                <span style={{ fontSize: '0.8125rem' }}>
                  {selectedItem.status === 'active' ? (
                    <Badge variant="success">Hoạt động bình thường</Badge>
                  ) : (
                    <Badge variant="neutral">Tạm khóa giao dịch</Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Ghi chú */}
            {selectedItem.notes && (
              <div style={{ backgroundColor: 'var(--bg-surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Ghi chú mục đích:
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedItem.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </Offcanvas>

      {/* 6. CONFIRM DIALOG XÓA TÀI KHOẢN */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Xóa tài sản bằng tiền"
        message={`Bạn có chắc chắn muốn xóa tài khoản "${itemToDelete?.name}" (${itemToDelete?.code})? Hành động này không thể hoàn tác.`}
        confirmText={isDeleting ? 'Đang xóa...' : 'Xóa tài sản'}
        cancelText="Hủy bỏ"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
      />

      {/* 7. MODAL XEM TRƯỚC VÀ IN BÁO CÁO TÀI SẢN TOÀN DIỆN */}
      <AssetReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        cashAssets={items}
      />
    </div>
  );
};
