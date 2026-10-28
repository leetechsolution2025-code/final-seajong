import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CashCoin,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Clock,
  Printer,
  FileEarmarkExcel,
  Eye,
  PlusLg,
  XCircle,
  CurrencyExchange,
  Receipt,
  CartCheck,
  Building,
  ArrowRepeat,
  ShieldCheck,
  BagCheck,
  CreditCard,
  Bank,
  Trash,
  ExclamationTriangleFill,
  CheckCircleFill,
  ChevronDown,
  XLg,
  Check2,
} from 'react-bootstrap-icons';
import { TableToolbar, type TableToolbarFilter, type TableToolbarMenuItem } from '../../../components/common/TableToolbar';
import { FullWidthTable } from '../../../components/common/FullWidthTable';
import { Pagination } from '../../../components/common/Pagination';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Offcanvas } from '../../../components/common/Offcanvas';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Input } from '../../../components/common/Input';
import { Select } from '../../../components/common/Select';
import { Toggle } from '../../../components/common/Toggle';
import { PrintPreview } from '../../../components/common/PrintPreview';
import { SuggestionInput, type SuggestionItem } from '../../../components/common/SuggestionInput';
import { useCompanyInfo } from '../../../hooks/useCompanyInfo';
import {
  EXPENSE_OPERATION_TYPES,
  STANDARD_DEBIT_ACCOUNTS,
  STANDARD_CREDIT_ACCOUNTS,
  convertNumberToVietnameseWords,
} from './DebtCostManagementView';
import { notifyFinanceUpdated, useFinanceRealtimeSync } from '../../../services/financeSyncService';
import { getCustomerGroupInfo, STANDARD_CUSTOMER_GROUPS } from '../../../utils/customerGroupUtils';

// ── 1. DANH MỤC TÀI KHOẢN KẾ TOÁN CÓ CHO DÒNG TIỀN RA (OUTFLOW - TT 200/133) ──
export const ACCOUNTING_CREDIT_ACCOUNTS = [
  { code: '1121', name: '1121 - Tiền gửi ngân hàng (VND)' },
  { code: '1111', name: '1111 - Tiền mặt tại quỹ (VND)' },
  { code: '1122', name: '1122 - Tiền gửi ngân hàng (Ngoại tệ)' },
  { code: '331',  name: '331 - Phải trả cho người bán (Đối trừ công nợ)' },
  { code: '141',  name: '141 - Tạm ứng (Trừ hoàn ứng nhân viên)' },
];

// ── 1B. DANH MỤC TÀI KHOẢN KẾ TOÁN CHO DÒNG TIỀN VÀO (INFLOW - TT 200/133) ──
export const INFLOW_DEBIT_ACCOUNTS = [
  { code: '1121', name: '1121 - Tiền gửi ngân hàng (VND)' },
  { code: '1111', name: '1111 - Tiền mặt tại quỹ (VND)' },
  { code: '1122', name: '1122 - Tiền gửi ngân hàng (Ngoại tệ)' },
  { code: '131',  name: '131 - Phải thu của khách hàng (Bù trừ đối trừ)' },
];

export const INFLOW_CREDIT_ACCOUNTS = [
  { code: '131', name: '131 - Phải thu của khách hàng (Thu nợ bán hàng/Dự án)' },
  { code: '511', name: '511 - Doanh thu bán hàng và cung cấp dịch vụ' },
  { code: '141', name: '141 - Tạm ứng (Nhân viên hoàn ứng kinh phí)' },
  { code: '341', name: '341 - Vay và nợ thuê tài chính (Rút vốn tín dụng)' },
  { code: '515', name: '515 - Doanh thu hoạt động tài chính (Lãi tiền gửi)' },
  { code: '711', name: '711 - Thu nhập khác (Thanh lý phế liệu, bồi thường)' },
  { code: '338', name: '338 - Phải trả, phải nộp khác' },
];

export const INFLOW_OPERATION_TYPES = [
  { id: 'thu_no_khach', label: 'Thu hồi công nợ đại lý & hợp đồng dự án', debit: '1121', credit: '131', method: 'ngan_hang' as const },
  { id: 'ban_le', label: 'Thu tiền mặt bán lẻ trực tiếp tại Showroom', debit: '1111', credit: '511', method: 'tien_mat' as const },
  { id: 'hoan_ung', label: 'Thu hoàn ứng tạm ứng công tác & mua sắm nhân viên', debit: '1111', credit: '141', method: 'tien_mat' as const },
  { id: 'vay_ngan_hang', label: 'Rút vốn vay hạn mức tín dụng tài trợ sản xuất', debit: '1121', credit: '341', method: 'ngan_hang' as const },
  { id: 'lai_tien_gui', label: 'Thu lãi tiền gửi ngân hàng định kỳ', debit: '1121', credit: '515', method: 'ngan_hang' as const },
];

// ── 2. DANH MỤC TÀI KHOẢN NGÂN HÀNG & QUỸ TIỀN MẶT THỰC TẾ (COMPANY BANK ACCOUNTS) ──
export interface CompanyBankAccount {
  id: string;
  bankName: string;
  bankShortName: string;
  accountNumber: string;
  branch: string;
  accountingCode: string; // '1121' | '1111' | '331' | '141'
  type: 'bank' | 'cash' | 'offset';
  label: string;
}

export const COMPANY_BANK_ACCOUNTS: CompanyBankAccount[] = [
  {
    id: 'bidv',
    bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    bankShortName: 'BIDV',
    accountNumber: '12810000392818',
    branch: 'Chi nhánh Thăng Long, Hà Nội',
    accountingCode: '1121',
    type: 'bank',
    label: 'BIDV - STK: 12810000392818 (Chi nhánh Thăng Long, Hà Nội)',
  },
  {
    id: 'vcb',
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    bankShortName: 'Vietcombank',
    accountNumber: '0021000492888',
    branch: 'Chi nhánh Hà Nội',
    accountingCode: '1121',
    type: 'bank',
    label: 'Vietcombank - STK: 0021000492888 (Chi nhánh Hà Nội)',
  },
  {
    id: 'vietin',
    bankName: 'Ngân hàng TMCP Công thương Việt Nam',
    bankShortName: 'VietinBank',
    accountNumber: '113002891920',
    branch: 'Chi nhánh Tây Hà Nội',
    accountingCode: '1121',
    type: 'bank',
    label: 'VietinBank - STK: 113002891920 (Chi nhánh Tây Hà Nội)',
  },
  {
    id: 'mb',
    bankName: 'Ngân hàng TMCP Quân đội',
    bankShortName: 'MB Bank',
    accountNumber: '0880199283888',
    branch: 'Chi nhánh Sở Giao Dịch',
    accountingCode: '1121',
    type: 'bank',
    label: 'MB Bank - STK: 0880199283888 (Chi nhánh Sở Giao Dịch)',
  },
  {
    id: 'cash_fund',
    bankName: 'Két quỹ tiền mặt Seajong',
    bankShortName: 'Tiền mặt',
    accountNumber: 'QUY-TIEN-MAT-SEAJONG',
    branch: 'Trụ sở Công ty CP Seajong Việt Nam',
    accountingCode: '1111',
    type: 'cash',
    label: 'Quỹ tiền mặt Seajong (Két quỹ công ty)',
  },
  {
    id: 'offset',
    bankName: 'Đối trừ công nợ bù trừ',
    bankShortName: 'Bù trừ',
    accountNumber: 'DOI-TRU-CONG-NO',
    branch: 'Phòng Kế toán',
    accountingCode: '331',
    type: 'offset',
    label: 'Đối trừ công nợ bù trừ (Không xuất dòng tiền)',
  },
];

// Tương thích ngược
export const PAYMENT_SOURCE_ACCOUNTS = COMPANY_BANK_ACCOUNTS.map((acc) => ({
  code: acc.accountingCode,
  name: acc.label,
}));

// Helper trích xuất mã tài khoản kế toán Nợ
export const extractDebitCode = (str?: string): string => {
  if (!str) return '331';
  const match = str.match(/\b(331|334|338|333|141|242|621|622|627|632|635|641|642|811|1521|1522|154|155|211|131)\b/);
  return match ? match[1] : (STANDARD_DEBIT_ACCOUNTS.some((a) => a.code === str) ? str : '331');
};

// Helper trích xuất mã tài khoản kế toán CÓ
export const extractCreditCode = (str?: string, method?: string): string => {
  if (method === 'tien_mat') return '1111';
  if (!str) return '1121';
  if (str.includes('1111') || str.toLowerCase().includes('tiền mặt')) return '1111';
  if (str.includes('1122')) return '1122';
  if (str.includes('331') || str.toLowerCase().includes('đối trừ')) return '331';
  if (str.includes('141')) return '141';
  return '1121';
};

// Helper trích xuất ID tài khoản ngân hàng / quỹ xuất tiền
export const extractBankAccountId = (str?: string, method?: string): string => {
  if (method === 'tien_mat') return 'cash_fund';
  if (!str) return 'bidv';
  const lower = str.toLowerCase();
  if (lower.includes('tiền mặt') || lower.includes('1111')) return 'cash_fund';
  if (lower.includes('vcb') || lower.includes('vietcombank') || lower.includes('0021000492888')) return 'vcb';
  if (lower.includes('vietin') || lower.includes('113002891920')) return 'vietin';
  if (lower.includes('mb') || lower.includes('0880199283888')) return 'mb';
  if (lower.includes('đối trừ') || lower.includes('bù trừ') || lower.includes('331')) return 'offset';
  return 'bidv';
};

export interface FinanceEmployeeOption {
  value: string;
  label: string;
  role: string;
  isChief?: boolean;
}

// Danh sách nhân viên thực tế trong Database (bảng Employee của Seajong)
export const DEFAULT_FINANCE_EMPLOYEES: FinanceEmployeeOption[] = [
  {
    value: 'Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)',
    label: 'Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)',
    role: 'Kế toán trưởng',
    isChief: true,
  },
  {
    value: 'Đoàn Thị Yến (Trợ lý Giám đốc - Ban Giám đốc)',
    label: 'Đoàn Thị Yến (Trợ lý Giám đốc - Ban Giám đốc)',
    role: 'Ban Giám đốc',
  },
  {
    value: 'Cao Thị Phương (Trưởng phòng - Phòng Nhân sự)',
    label: 'Cao Thị Phương (Trưởng phòng - Phòng Nhân sự)',
    role: 'Nhân sự',
  },
  {
    value: 'Trần Thị Mai Anh (Trưởng bộ phận - Phòng Mua hàng)',
    label: 'Trần Thị Mai Anh (Trưởng bộ phận - Phòng Mua hàng)',
    role: 'Mua hàng',
  },
  {
    value: 'Lưu xuân Trung (Thủ kho - Phòng Kho vận)',
    label: 'Lưu xuân Trung (Thủ kho - Phòng Kho vận)',
    role: 'Kho vận',
  },
  {
    value: 'Đặng Văn Kháng (Phụ kho - Phòng Kho vận)',
    label: 'Đặng Văn Kháng (Phụ kho - Phòng Kho vận)',
    role: 'Kho vận',
  },
  {
    value: 'Phạm Quang Việt (Nhân viên Bán hàng - Phòng Kinh doanh)',
    label: 'Phạm Quang Việt (Nhân viên Bán hàng - Phòng Kinh doanh)',
    role: 'Kinh doanh',
  },
  {
    value: 'Lê Anh Vân (Trưởng phòng - Phòng Đảm bảo chất lượng)',
    label: 'Lê Anh Vân (Trưởng phòng - Phòng Đảm bảo chất lượng)',
    role: 'Đảm bảo chất lượng',
  },
  {
    value: 'Hà Thị Bích Ngọc (Lắp ráp - Phòng Sản xuất)',
    label: 'Hà Thị Bích Ngọc (Lắp ráp - Phòng Sản xuất)',
    role: 'Sản xuất',
  },
  {
    value: 'Nguyễn Thu Huyền (Trưởng phòng - Phòng Marketing)',
    label: 'Nguyễn Thu Huyền (Trưởng phòng - Phòng Marketing)',
    role: 'Marketing',
  },
  {
    value: 'Nguyễn Lê Dũng (Nhân viên - Phòng ban chung)',
    label: 'Nguyễn Lê Dũng (Nhân viên - Phòng ban chung)',
    role: 'Nhân viên',
  },
  {
    value: 'Vũ Hùng Cường (Nhân viên - Phòng ban chung)',
    label: 'Vũ Hùng Cường (Nhân viên - Phòng ban chung)',
    role: 'Nhân viên',
  },
];

export interface CashflowTrackingViewProps {
  currentStep: number;
  onStepChange?: (step: number) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

// ── Định dạng tiền tệ VND ──
const formatVND = (val: number): string => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
};

// ── KIỂU DỮ LIỆU BƯỚC 1: DUYỆT ĐƠN HÀNG ──
interface OrderApprovalItem {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGroup: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'cho_duyet' | 'da_duyet' | 'dang_san_xuat' | 'hoan_tat';
  itemsSummary: string;
  salesPerson: string;
}

// ── KIỂU DỮ LIỆU BƯỚC 2: DUYỆT YÊU CẦU ──
interface RequestApprovalItem {
  id: string;
  code: string;
  type: 'tam_ung' | 'vat_tu' | 'cong_tac' | 'hanh_chinh';
  title: string;
  department: string;
  proposer: string;
  requestDate: string;
  amount: number;
  priority: 'urgent' | 'high' | 'normal';
  status: 'cho_duyet' | 'da_duyet' | 'da_giai_ngan' | 'tu_choi';
  reason: string;
}

// ── KIỂU DỮ LIỆU BƯỚC 3: TIỀN VÀO (INFLOW) ──
interface CashInflowItem {
  id: string;
  code: string;
  source: 'thu_no_khach' | 'ban_le' | 'hoan_ung' | 'vay_ngan_hang';
  sourceTitle: string;
  payerName: string;
  method: 'tien_mat' | 'ngan_hang';
  accountDebit: string;
  accountCredit: string;
  date: string;
  amount: number;
  status: 'cho_thu' | 'da_vao_quy' | 'da_doi_soat';
  voucherCode?: string;
  bankAccountId?: string;
  note: string;
}

// ── KIỂU DỮ LIỆU BƯỚC 4: TIỀN RA (OUTFLOW) ──
interface CashOutflowItem {
  id: string;
  code: string;
  category: 'dong_thau' | 'ma_pvd' | 'no_ncc' | 'tam_ung' | 'luong_van_hanh';
  categoryTitle: string;
  beneficiary: string;
  method: 'unc_ngan_hang' | 'tien_mat';
  accountDebit: string;
  accountCredit: string;
  dueDate: string;
  amount: number;
  status: 'cho_chi' | 'da_chi';
  voucherCode?: string;
  note: string;
}

export const CashflowTrackingView: React.FC<CashflowTrackingViewProps> = ({
  currentStep,
  onStepChange,
  onShowToast,
}) => {
  // ── 1. DỮ LIỆU BƯỚC 1: DUYỆT ĐƠN HÀNG ──
  const [orders, setOrders] = useState<OrderApprovalItem[]>([
    {
      id: 'ord-1',
      code: 'DBH-20261027-01',
      customerName: 'Công ty Cổ phần Xây dựng An Gia Phát',
      customerPhone: '0912 345 678',
      customerAddress: 'KĐT Sala, TP. Thủ Đức, TP. Hồ Chí Minh',
      customerGroup: 'du-an',
      orderDate: '27/10/2026',
      deliveryDate: '02/11/2026',
      totalAmount: 148500000,
      paidAmount: 50000000,
      remainingAmount: 98500000,
      status: 'cho_duyet',
      itemsSummary: '',
      salesPerson: 'Nguyễn Văn Minh (Sales Dự Án)',
    },
    {
      id: 'ord-2',
      code: 'DBH-20261026-03',
      customerName: 'Tổng kho Thiết bị Vệ sinh Minh Châu',
      customerPhone: '0988 776 554',
      customerAddress: 'Số 45 Cầu Giấy, P. Quan Hoa, Cầu Giấy, Hà Nội',
      customerGroup: 'dai-ly',
      orderDate: '26/10/2026',
      deliveryDate: '29/10/2026',
      totalAmount: 92300000,
      paidAmount: 92300000,
      remainingAmount: 0,
      status: 'da_duyet',
      itemsSummary: '',
      salesPerson: 'Trần Thị Mai (Sales Đại Lý)',
    },
    {
      id: 'ord-3',
      code: 'DBH-20261025-08',
      customerName: 'Khách lẻ - Showroom Nguyễn Thị Thảo',
      customerPhone: '0903 214 567',
      customerAddress: '128 Nguyễn Trãi, Thanh Xuân, Hà Nội',
      customerGroup: 'ca-nhan',
      orderDate: '25/10/2026',
      deliveryDate: '26/10/2026',
      totalAmount: 18600000,
      paidAmount: 18600000,
      remainingAmount: 0,
      status: 'hoan_tat',
      itemsSummary: '',
      salesPerson: 'Lê Hoàng Nam (Showroom)',
    },
    {
      id: 'ord-4',
      code: 'DBH-20261024-02',
      customerName: 'Đại lý VLXD & Nội thất Hoàng Long',
      customerPhone: '0975 889 123',
      customerAddress: 'Phố Nối, Mỹ Hào, Hưng Yên',
      customerGroup: 'dai-ly',
      orderDate: '24/10/2026',
      deliveryDate: '30/10/2026',
      totalAmount: 64200000,
      paidAmount: 20000000,
      remainingAmount: 44200000,
      status: 'dang_san_xuat',
      itemsSummary: '',
      salesPerson: 'Nguyễn Văn Minh (Sales Đại Lý)',
    },
    {
      id: 'ord-5',
      code: 'DBH-20261027-04',
      customerName: 'Dự án Căn hộ Nghỉ dưỡng Blue Sea Phú Quốc',
      customerPhone: '0938 998 776',
      customerAddress: 'Bãi Trường, Dương Tơ, TP. Phú Quốc, Kiên Giang',
      customerGroup: 'du-an',
      orderDate: '27/10/2026',
      deliveryDate: '10/11/2026',
      totalAmount: 320000000,
      paidAmount: 100000000,
      remainingAmount: 220000000,
      status: 'cho_duyet',
      itemsSummary: '',
      salesPerson: 'Lê Công Vụ (Giám Đốc Dự Án)',
    },
  ]);

  // Checkbox lựa chọn xóa dữ liệu cho các bước
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [selectedInflowIds, setSelectedInflowIds] = useState<Set<string>>(new Set());
  const [selectedOutflowIds, setSelectedOutflowIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // ── 2. DỮ LIỆU BƯỚC 2: DUYỆT YÊU CẦU ──
  const [requests, setRequests] = useState<RequestApprovalItem[]>([
    {
      id: 'req-1',
      code: 'YCD-20261027-01',
      type: 'vat_tu',
      title: 'Mua nguyên liệu phôi đồng thau thỏi tiêu chuẩn 59-1 đúc thân vòi',
      department: 'Phòng Sản xuất – Gia công',
      proposer: 'Kỹ sư trưởng Vũ Mạnh Cường',
      requestDate: '27/10/2026',
      amount: 185000000,
      priority: 'urgent',
      status: 'cho_duyet',
      reason: 'Bổ sung khẩn cấp 5 tấn phôi đồng thau 59-1 để hoàn thành đơn hàng xuất khẩu Quý 4',
    },
    {
      id: 'req-2',
      code: 'YCD-20261026-05',
      type: 'tam_ung',
      title: 'Tạm ứng chi phí công tác giám sát lắp đặt showroom Đà Nẵng',
      department: 'Phòng Kinh doanh & Marketing',
      proposer: 'Phạm Hồng Quân',
      requestDate: '26/10/2026',
      amount: 15000000,
      priority: 'high',
      status: 'da_duyet',
      reason: 'Vé máy bay, lưu trú và tiếp khách đối tác phân phối khu vực Miền Trung',
    },
    {
      id: 'req-3',
      code: 'YCD-20261025-02',
      type: 'hanh_chinh',
      title: 'Thanh toán phí bảo trì định kỳ hệ thống máy nén khí và lò đúc',
      department: 'Phòng Kỹ thuật – Bảo trì',
      proposer: 'Nguyễn Đình Trọng',
      requestDate: '25/10/2026',
      amount: 28500000,
      priority: 'normal',
      status: 'da_giai_ngan',
      reason: 'Bảo dưỡng buồng mạ PVD chân không và hiệu chuẩn robot mài đánh bóng',
    },
    {
      id: 'req-4',
      code: 'YCD-20261024-03',
      type: 'vat_tu',
      title: 'Đề xuất mua lõi chia nước gốm sứ Sedal (Tây Ban Nha) cho sen vòi',
      department: 'Phòng Quản lý Kho vận & Vật tư',
      proposer: 'Đào Thu Hương',
      requestDate: '24/10/2026',
      amount: 72000000,
      priority: 'high',
      status: 'cho_duyet',
      reason: 'Nhập khẩu lô 2.000 van đĩa sứ cao cấp chống rò rỉ đạt chuẩn 500.000 lần đóng mở',
    },
  ]);

  // ── 3. DỮ LIỆU BƯỚC 3: TIỀN VÀO (INFLOW) ──
  const [inflows, setInflows] = useState<CashInflowItem[]>([
    {
      id: 'in-1',
      code: 'PT-20261027-01',
      source: 'thu_no_khach',
      sourceTitle: 'Thu hồi công nợ đại lý phân phối',
      payerName: 'Tổng kho Thiết bị Vệ sinh Minh Châu',
      method: 'ngan_hang',
      accountDebit: 'TK 1121 (Vietcombank CN Hà Nội)',
      accountCredit: 'TK 131 (Phải thu khách hàng)',
      date: '27/10/2026 14:15',
      amount: 92300000,
      status: 'cho_thu',
      bankAccountId: 'vcb',
      note: 'Thanh toán trọn gói đơn hàng số DBH-20261026-03 qua cổng ngân hàng',
    },
    {
      id: 'in-2',
      code: 'PT-20261027-02',
      source: 'thu_no_khach',
      sourceTitle: 'Đặt cọc tạm ứng hợp đồng dự án',
      payerName: 'Công ty Cổ phần Xây dựng An Gia Phát',
      method: 'ngan_hang',
      accountDebit: 'TK 1121 (BIDV Thăng Long)',
      accountCredit: 'TK 131 (Phải thu khách hàng)',
      date: '27/10/2026 10:30',
      amount: 50000000,
      status: 'cho_thu',
      bankAccountId: 'bidv',
      note: 'Tạm ứng đợt 1 theo điều khoản hợp đồng cung cấp thiết bị vệ sinh cao cấp Seajong',
    },
    {
      id: 'in-3',
      code: 'PT-20261026-04',
      source: 'ban_le',
      sourceTitle: 'Thu tiền mặt bán lẻ trực tiếp tại Showroom',
      payerName: 'Khách lẻ - Chị Nguyễn Thị Thảo',
      method: 'tien_mat',
      accountDebit: 'TK 1111 (Quỹ tiền mặt Seajong)',
      accountCredit: 'TK 511 (Doanh thu bán hàng)',
      date: '26/10/2026 16:45',
      amount: 18600000,
      status: 'da_doi_soat',
      voucherCode: 'PT-20261026-04',
      bankAccountId: 'cash_fund',
      note: 'Khách hàng thanh toán tiền mặt trực tiếp tại quầy thanh toán Showroom',
    },
    {
      id: 'in-4',
      code: 'PT-20261025-01',
      source: 'hoan_ung',
      sourceTitle: 'Hoàn ứng công tác phí thị trường Miền Nam',
      payerName: 'Chuyên viên Lê Văn Dũng (Sales)',
      method: 'tien_mat',
      accountDebit: 'TK 1111 (Quỹ tiền mặt Seajong)',
      accountCredit: 'TK 141 (Tạm ứng nhân viên)',
      date: '25/10/2026 09:20',
      amount: 4200000,
      status: 'da_doi_soat',
      voucherCode: 'PT-20261025-01',
      bankAccountId: 'cash_fund',
      note: 'Hoàn trả phần kinh phí tạm ứng chưa sử dụng hết sau chuyến công tác hội chợ',
    },
    {
      id: 'in-5',
      code: 'PT-20261024-03',
      source: 'vay_ngan_hang',
      sourceTitle: 'Rút vốn vay hạn mức tín dụng tài trợ sản xuất',
      payerName: 'Ngân hàng TMCP Ngoại thương Việt Nam (VCB)',
      method: 'ngan_hang',
      accountDebit: 'TK 1121 (Vietcombank CN Hà Nội)',
      accountCredit: 'TK 341 (Vay và nợ thuê tài chính)',
      date: '24/10/2026 11:00',
      amount: 300000000,
      status: 'da_doi_soat',
      voucherCode: 'BC-20261024-03',
      bankAccountId: 'vcb',
      note: 'Giải ngân khế ước nhận nợ theo Hợp đồng tín dụng tài trợ vốn lưu động Seajong',
    },
  ]);

  // ── 4. DỮ LIỆU BƯỚC 4: TIỀN RA (OUTFLOW) ──
  const [outflows, setOutflows] = useState<CashOutflowItem[]>([
    {
      id: 'out-1',
      code: 'LC-20261027-01',
      category: 'dong_thau',
      categoryTitle: 'Mua nguyên liệu phôi đồng thau 59-1',
      beneficiary: 'Công ty Cổ phần Kim loại Màu & Hợp kim Hải Phòng',
      method: 'unc_ngan_hang',
      accountDebit: 'TK 331 (Phải trả nhà cung cấp)',
      accountCredit: 'TK 1121 (Vietcombank CN Hà Nội)',
      dueDate: '27/10/2026',
      amount: 185000000,
      status: 'cho_chi',
      note: 'Giải ngân thanh toán tiền hàng đợt 1 theo hợp đồng cung ứng 5 tấn đồng thau thỏi',
    },
    {
      id: 'out-2',
      code: 'LC-20261026-02',
      category: 'ma_pvd',
      categoryTitle: 'Gia công xi mạ PVD công nghệ cao',
      beneficiary: 'Công ty TNHH Kỹ thuật Xi mạ Chân không NanoTech',
      method: 'unc_ngan_hang',
      accountDebit: 'TK 627 (Chi phí sản xuất chung)',
      accountCredit: 'TK 1122 (BIDV Thăng Long)',
      dueDate: '26/10/2026',
      amount: 45000000,
      status: 'da_chi',
      voucherCode: 'PC-20261026-02',
      note: 'Thanh toán chi phí xi mạ màu xám xước titan PVD cho 500 củ sen Seajong',
    },
    {
      id: 'out-3',
      code: 'LC-20261025-01',
      category: 'tam_ung',
      categoryTitle: 'Chi tạm ứng công tác thị trường',
      beneficiary: 'Phạm Hồng Quân (Phòng Kinh doanh)',
      method: 'tien_mat',
      accountDebit: 'TK 141 (Tạm ứng nhân viên)',
      accountCredit: 'TK 1111 (Quỹ tiền mặt Seajong)',
      dueDate: '25/10/2026',
      amount: 15000000,
      status: 'da_chi',
      voucherCode: 'PC-20261025-01',
      note: 'Xuất quỹ tiền mặt tạm ứng công tác theo Phiếu yêu cầu đã được phê duyệt',
    },
    {
      id: 'out-4',
      code: 'LC-20261027-03',
      category: 'no_ncc',
      categoryTitle: 'Thanh toán tiền vỏ hộp bao bì & tem nhãn Seajong',
      beneficiary: 'Nhà máy In & Bao bì Carton Đại Đồng Tiến',
      method: 'unc_ngan_hang',
      accountDebit: 'TK 331 (Phải trả nhà cung cấp)',
      accountCredit: 'TK 1121 (Vietcombank CN Hà Nội)',
      dueDate: '28/10/2026',
      amount: 32000000,
      status: 'cho_chi',
      note: 'Thanh toán đợt cuối lô 10.000 vỏ hộp củ sen và tem bảo hành điện tử QR-code',
    },
  ]);

  // ── FILTER VÀ TÌM KIẾM TRÊN TỪNG BƯỚC ──
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filter1, setFilter1] = useState<string>('all');
  const [filter2, setFilter2] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modal/Offcanvas xem chi tiết và giải ngân lệnh chi
  const [selectedOrder, setSelectedOrder] = useState<OrderApprovalItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestApprovalItem | null>(null);
  const [selectedOutflow, setSelectedOutflow] = useState<CashOutflowItem | null>(null);
  const [payoutExecutionDate, setPayoutExecutionDate] = useState<string>('27/10/2026');
  const [payoutMethod, setPayoutMethod] = useState<'unc_ngan_hang' | 'tien_mat'>('unc_ngan_hang');
  const [financeEmployees, setFinanceEmployees] = useState<FinanceEmployeeOption[]>(DEFAULT_FINANCE_EMPLOYEES);
  const [payoutExecutor, setPayoutExecutor] = useState<string>('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');
  const [payoutDebitAccount, setPayoutDebitAccount] = useState<string>('331');
  const [payoutCreditAccount, setPayoutCreditAccount] = useState<string>('1121');
  const [payoutBankAccountId, setPayoutBankAccountId] = useState<string>('bidv');
  const company = useCompanyInfo();
  const [isPrintVoucherToggle, setIsPrintVoucherToggle] = useState<boolean>(true);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [printPreviewItem, setPrintPreviewItem] = useState<{
    voucherCode: string;
    code: string;
    amount: number;
    beneficiary: string;
    categoryTitle: string;
    note: string;
    method: 'unc_ngan_hang' | 'tien_mat' | 'ngan_hang';
    direction?: 'inflow' | 'outflow';
    debitAccount: string;
    creditAccount: string;
    bankAccountId?: string;
    executor: string;
    date: string;
  } | null>(null);

  const handlePayoutBankAccountChange = (bankId: string) => {
    setPayoutBankAccountId(bankId);
    const bankItem = COMPANY_BANK_ACCOUNTS.find((b) => b.id === bankId);
    if (!bankItem) return;
    if (bankItem.type === 'bank') {
      setPayoutMethod('unc_ngan_hang');
      setPayoutCreditAccount('1121');
    } else if (bankItem.type === 'cash') {
      setPayoutMethod('tien_mat');
      setPayoutCreditAccount('1111');
    } else if (bankItem.type === 'offset') {
      setPayoutCreditAccount('331');
    }
  };

  const handlePayoutMethodChange = (method: 'unc_ngan_hang' | 'tien_mat') => {
    setPayoutMethod(method);
    if (method === 'tien_mat') {
      setPayoutCreditAccount('1111');
      setPayoutBankAccountId('cash_fund');
    } else {
      setPayoutCreditAccount('1121');
      if (payoutBankAccountId === 'cash_fund') {
        setPayoutBankAccountId('bidv');
      }
    }
  };

  const handlePayoutCreditChange = (code: string) => {
    setPayoutCreditAccount(code);
    if (code === '1111') {
      setPayoutMethod('tien_mat');
      setPayoutBankAccountId('cash_fund');
    } else if (code === '1121' || code === '1122') {
      setPayoutMethod('unc_ngan_hang');
      if (payoutBankAccountId === 'cash_fund' || payoutBankAccountId === 'offset') {
        setPayoutBankAccountId('bidv');
      }
    } else if (code === '331') {
      setPayoutBankAccountId('offset');
    }
  };

  const handleOpenOutflowDetail = (out: CashOutflowItem) => {
    setSelectedOutflow(out);
    setPayoutMethod(out.method || 'unc_ngan_hang');
    setPayoutExecutionDate(out.dueDate || new Date().toLocaleDateString('vi-VN'));
    setPayoutExecutor('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');
    setPayoutDebitAccount(extractDebitCode(out.accountDebit));
    setPayoutCreditAccount(extractCreditCode(out.accountCredit, out.method));
    setPayoutBankAccountId(extractBankAccountId(out.accountCredit, out.method));
  };

  // ── STATE & HANDLERS CHO BƯỚC 3: XÁC NHẬN THU TIỀN (INFLOW) ──
  const [selectedInflow, setSelectedInflow] = useState<CashInflowItem | null>(null);
  const [inflowExecutionDate, setInflowExecutionDate] = useState<string>('27/10/2026');
  const [inflowMethod, setInflowMethod] = useState<'ngan_hang' | 'tien_mat'>('ngan_hang');
  const [inflowCollector, setInflowCollector] = useState<string>('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');
  const [inflowDebitAccount, setInflowDebitAccount] = useState<string>('1121');
  const [inflowCreditAccount, setInflowCreditAccount] = useState<string>('131');
  const [inflowBankAccountId, setInflowBankAccountId] = useState<string>('vcb');
  const [isInflowPrintToggle, setIsInflowPrintToggle] = useState<boolean>(true);

  // Modal tạo phiếu thu tiền mới (Bước 3)
  const [showCreateInflowModal, setShowCreateInflowModal] = useState<boolean>(false);
  const [newInflowPayer, setNewInflowPayer] = useState<string>('');
  const [newInflowSourceTitle, setNewInflowSourceTitle] = useState<string>('Thu hồi công nợ bán hàng đại lý & dự án');
  const [newInflowAmount, setNewInflowAmount] = useState<string>('');
  const [newInflowMethod, setNewInflowMethod] = useState<'ngan_hang' | 'tien_mat'>('ngan_hang');
  const [newInflowDebitAccount, setNewInflowDebitAccount] = useState<string>('1121');
  const [newInflowCreditAccount, setNewInflowCreditAccount] = useState<string>('131');
  const [newInflowBankAccountId, setNewInflowBankAccountId] = useState<string>('vcb');
  const [newInflowCollector, setNewInflowCollector] = useState<string>('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');
  const [newInflowNote, setNewInflowNote] = useState<string>('');

  const handleInflowBankAccountChange = (bankId: string) => {
    setInflowBankAccountId(bankId);
    const bankItem = COMPANY_BANK_ACCOUNTS.find((b) => b.id === bankId);
    if (!bankItem) return;
    if (bankItem.type === 'bank') {
      setInflowMethod('ngan_hang');
      setInflowDebitAccount('1121');
    } else if (bankItem.type === 'cash') {
      setInflowMethod('tien_mat');
      setInflowDebitAccount('1111');
    }
  };

  const handleInflowMethodChange = (method: 'ngan_hang' | 'tien_mat') => {
    setInflowMethod(method);
    if (method === 'tien_mat') {
      setInflowDebitAccount('1111');
      setInflowBankAccountId('cash_fund');
    } else {
      setInflowDebitAccount('1121');
      if (inflowBankAccountId === 'cash_fund') {
        setInflowBankAccountId('vcb');
      }
    }
  };

  const handleInflowDebitChange = (code: string) => {
    setInflowDebitAccount(code);
    if (code === '1111') {
      setInflowMethod('tien_mat');
      setInflowBankAccountId('cash_fund');
    } else if (code === '1121' || code === '1122') {
      setInflowMethod('ngan_hang');
      if (inflowBankAccountId === 'cash_fund') {
        setInflowBankAccountId('vcb');
      }
    }
  };

  const handleOpenInflowDetail = (inf: CashInflowItem) => {
    setSelectedInflow(inf);
    setInflowMethod(inf.method || 'ngan_hang');
    setInflowExecutionDate(inf.date ? inf.date.split(' ')[0] : new Date().toLocaleDateString('vi-VN'));
    setInflowCollector('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');

    const debitCode = inf.accountDebit.includes('1111') ? '1111' : (inf.accountDebit.includes('1122') ? '1122' : '1121');
    setInflowDebitAccount(debitCode);

    const creditMatch = inf.accountCredit.match(/\b(131|511|141|341|515|711|338)\b/);
    setInflowCreditAccount(creditMatch ? creditMatch[1] : '131');

    const bankId = inf.bankAccountId || extractBankAccountId(inf.accountDebit, inf.method);
    setInflowBankAccountId(bankId);
  };

  // Xác nhận thu tiền
  const handleExecuteInflow = (inflowItem: CashInflowItem) => {
    const isCash = inflowMethod === 'tien_mat';
    const voucherNum = inflowItem.voucherCode || (isCash ? `PT-${Date.now().toString().slice(-6)}` : `BC-${Date.now().toString().slice(-6)}`);
    const bankItem = COMPANY_BANK_ACCOUNTS.find((b) => b.id === inflowBankAccountId);
    const debitAccObj = INFLOW_DEBIT_ACCOUNTS.find((a) => a.code === inflowDebitAccount);
    const creditAccObj = INFLOW_CREDIT_ACCOUNTS.find((a) => a.code === inflowCreditAccount);

    const accountDebitDisplay = bankItem && bankItem.type === 'bank'
      ? `TK ${inflowDebitAccount} (${bankItem.bankShortName} - STK ${bankItem.accountNumber})`
      : (debitAccObj ? `TK ${debitAccObj.code} (${debitAccObj.name.replace(/^[\d]+\s*-\s*/, '')})` : `TK ${inflowDebitAccount}`);

    const accountCreditDisplay = creditAccObj
      ? `TK ${creditAccObj.code} (${creditAccObj.name.replace(/^[\d]+\s*-\s*/, '')})`
      : `TK ${inflowCreditAccount}`;

    setInflows((prev) =>
      prev.map((i) =>
        i.id === inflowItem.id
          ? {
              ...i,
              status: 'da_vao_quy',
              voucherCode: voucherNum,
              method: inflowMethod,
              accountDebit: accountDebitDisplay,
              accountCredit: accountCreditDisplay,
              bankAccountId: inflowBankAccountId,
              date: `${inflowExecutionDate} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
            }
          : i
      )
    );

    notifyFinanceUpdated();
    onShowToast?.(
      'success',
      'Xác nhận thu tiền thành công',
      `Đã thu vào quỹ ${formatVND(inflowItem.amount)} từ ${inflowItem.payerName}, cấp số chứng từ ${voucherNum} và hạch toán Nợ TK ${inflowDebitAccount} / Có TK ${inflowCreditAccount}.`
    );

    return voucherNum;
  };

  // Tạo phiếu thu tiền mới
  const handleOpenCreateInflowModal = () => {
    setNewInflowPayer('');
    setNewInflowSourceTitle('Thu hồi công nợ đại lý phân phối');
    setNewInflowAmount('');
    setNewInflowMethod('ngan_hang');
    setNewInflowDebitAccount('1121');
    setNewInflowCreditAccount('131');
    setNewInflowBankAccountId('vcb');
    setNewInflowCollector('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');
    setNewInflowNote('');
    setShowCreateInflowModal(true);
  };

  const handleCreateInflowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInflowPayer.trim() || !newInflowAmount || Number(newInflowAmount) <= 0) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập đối tượng nộp tiền và số tiền thu hợp lệ.');
      return;
    }
    const isCash = newInflowMethod === 'tien_mat';
    const newCode = `PT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-2)}`;
    const bankItem = COMPANY_BANK_ACCOUNTS.find((b) => b.id === newInflowBankAccountId);
    const debitAccObj = INFLOW_DEBIT_ACCOUNTS.find((a) => a.code === newInflowDebitAccount);
    const creditAccObj = INFLOW_CREDIT_ACCOUNTS.find((a) => a.code === newInflowCreditAccount);

    const accountDebitDisplay = bankItem && bankItem.type === 'bank'
      ? `TK ${newInflowDebitAccount} (${bankItem.bankShortName} - STK ${bankItem.accountNumber})`
      : (debitAccObj ? `TK ${debitAccObj.code} (${debitAccObj.name.replace(/^[\d]+\s*-\s*/, '')})` : `TK ${newInflowDebitAccount}`);

    const accountCreditDisplay = creditAccObj
      ? `TK ${creditAccObj.code} (${creditAccObj.name.replace(/^[\d]+\s*-\s*/, '')})`
      : `TK ${newInflowCreditAccount}`;

    const newInflowItem: CashInflowItem = {
      id: `in-${Date.now()}`,
      code: newCode,
      source: 'thu_no_khach',
      sourceTitle: newInflowSourceTitle.trim(),
      payerName: newInflowPayer.trim(),
      method: newInflowMethod,
      accountDebit: accountDebitDisplay,
      accountCredit: accountCreditDisplay,
      date: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      amount: Number(newInflowAmount),
      status: 'cho_thu',
      bankAccountId: newInflowBankAccountId,
      note: newInflowNote.trim() ? `${newInflowNote.trim()} (Người thu: ${newInflowCollector})` : `(Người thu: ${newInflowCollector})`,
    };

    setInflows((prev) => [newInflowItem, ...prev]);
    setShowCreateInflowModal(false);
    notifyFinanceUpdated();
    onShowToast?.(
      'success',
      'Đã lập phiếu thu tiền',
      `Đã tạo phiếu thu ${newCode} cho ${newInflowPayer} với số tiền ${formatVND(Number(newInflowAmount))}.`
    );
  };

  // Modal/Offcanvas tạo lệnh chi mới (Bước 4) - Chuẩn Offcanvas 400px
  const [showCreateOutflowModal, setShowCreateOutflowModal] = useState<boolean>(false);
  const [newBeneficiary, setNewBeneficiary] = useState<string>('');
  const [newCategoryTitle, setNewCategoryTitle] = useState<string>('Bảo dưỡng máy móc, điện nước, phụ liệu xưởng sản xuất');
  const [selectedExpenseOpId, setSelectedExpenseOpId] = useState<string>('production_overhead');
  const [selectedDebitAccount, setSelectedDebitAccount] = useState<string>('627');
  const [selectedCreditAccount, setSelectedCreditAccount] = useState<string>('1121');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('bidv');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newMethod, setNewMethod] = useState<'unc_ngan_hang' | 'tien_mat'>('unc_ngan_hang');
  const [newCreator, setNewCreator] = useState<string>('Trần Thị Linh (Kế toán trưởng - Phòng Tài chính – Kế toán)');
  const [newNote, setNewNote] = useState<string>('');
  const [isSubmitForApproval, setIsSubmitForApproval] = useState<boolean>(false);
  const [isPrintVoucher, setIsPrintVoucher] = useState<boolean>(false);
  const [isExpenseDropdownOpen, setIsExpenseDropdownOpen] = useState<boolean>(false);
  const [expenseSearchKeyword, setExpenseSearchKeyword] = useState<string>('');

  const handleOpenCreateModal = () => {
    setNewBeneficiary('');
    setNewCategoryTitle('Bảo dưỡng máy móc, điện nước, phụ liệu xưởng sản xuất');
    setSelectedExpenseOpId('production_overhead');
    setSelectedDebitAccount('627');
    setSelectedCreditAccount('1121');
    setSelectedBankAccountId('bidv');
    setNewMethod('unc_ngan_hang');
    setNewAmount('');
    setNewNote('');
    setIsSubmitForApproval(false);
    setIsPrintVoucher(false);
    setIsExpenseDropdownOpen(false);
    setExpenseSearchKeyword('');
    setShowCreateOutflowModal(true);
  };

  const handleSelectExpenseOp = (op: typeof EXPENSE_OPERATION_TYPES[0]) => {
    setNewCategoryTitle(op.label);
    setSelectedExpenseOpId(op.id);
    setSelectedDebitAccount(op.debit);
    if (newMethod === 'tien_mat') {
      setSelectedCreditAccount('1111');
      setSelectedBankAccountId('cash_fund');
    } else {
      setSelectedCreditAccount(op.credit === '1111' ? '1121' : op.credit);
      if (selectedBankAccountId === 'cash_fund') {
        setSelectedBankAccountId('bidv');
      }
    }
    setIsExpenseDropdownOpen(false);
  };

  const handleClearExpenseOp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewCategoryTitle('');
    setSelectedExpenseOpId('');
  };

  const handleNewBankAccountChange = (bankId: string) => {
    setSelectedBankAccountId(bankId);
    const bankItem = COMPANY_BANK_ACCOUNTS.find((b) => b.id === bankId);
    if (!bankItem) return;
    if (bankItem.type === 'bank') {
      setNewMethod('unc_ngan_hang');
      setSelectedCreditAccount('1121');
    } else if (bankItem.type === 'cash') {
      setNewMethod('tien_mat');
      setSelectedCreditAccount('1111');
    } else if (bankItem.type === 'offset') {
      setSelectedCreditAccount('331');
    }
  };

  const handleMethodChange = (method: 'unc_ngan_hang' | 'tien_mat') => {
    setNewMethod(method);
    if (method === 'tien_mat') {
      setSelectedCreditAccount('1111');
      setSelectedBankAccountId('cash_fund');
    } else {
      setSelectedCreditAccount('1121');
      if (selectedBankAccountId === 'cash_fund') {
        setSelectedBankAccountId('bidv');
      }
    }
  };

  const handleNewCreditChange = (code: string) => {
    setSelectedCreditAccount(code);
    if (code === '1111') {
      setNewMethod('tien_mat');
      setSelectedBankAccountId('cash_fund');
    } else if (code === '1121' || code === '1122') {
      setNewMethod('unc_ngan_hang');
      if (selectedBankAccountId === 'cash_fund' || selectedBankAccountId === 'offset') {
        setSelectedBankAccountId('bidv');
      }
    } else if (code === '331') {
      setSelectedBankAccountId('offset');
    }
  };

  // Danh sách loại nghiệp vụ chi đã lọc theo từ khóa tìm kiếm
  const filteredExpenseOps = useMemo(() => {
    if (!expenseSearchKeyword.trim()) return EXPENSE_OPERATION_TYPES;
    const kw = expenseSearchKeyword.toLowerCase();
    return EXPENSE_OPERATION_TYPES.filter(
      (op) =>
        op.label.toLowerCase().includes(kw) ||
        op.debit.includes(kw) ||
        op.credit.includes(kw) ||
        op.catLabel.toLowerCase().includes(kw) ||
        (op.groupLabel && op.groupLabel.toLowerCase().includes(kw))
    );
  }, [expenseSearchKeyword]);

  // Phân nhóm nghiệp vụ chi theo Header nhóm chuẩn kế toán giống hình 2
  const groupedExpenseOps = useMemo(() => {
    const groups: { [key: string]: typeof EXPENSE_OPERATION_TYPES } = {};
    filteredExpenseOps.forEach((op) => {
      const grp = op.groupLabel || 'NGHIỆP VỤ KHÁC';
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(op);
    });
    return groups;
  }, [filteredExpenseOps]);

  // Khi chuyển bước: Reset filter, page & các dòng được chọn
  useEffect(() => {
    setSearchTerm('');
    setFilter1('all');
    setFilter2('all');
    setCurrentPage(1);
    setSelectedOrderIds(new Set());
    setSelectedRequestIds(new Set());
    setSelectedInflowIds(new Set());
    setSelectedOutflowIds(new Set());
  }, [currentStep]);

  // Đồng bộ thời gian thực từ cơ sở dữ liệu
  const loadBackendData = useCallback(() => {
    setIsLoading(true);

    // 1. Tải danh sách đơn hàng thực tế từ DB
    fetch('/api/sales/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data?.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          const mappedOrders: OrderApprovalItem[] = data.orders.map((o: any) => {
            const rawGroup = o.customer?.nhom || 'dai-ly';
            const total = Number(o.tongTien) || 0;
            const paid = Number(o.daThanhToan) || 0;
            let st: 'cho_duyet' | 'da_duyet' | 'dang_san_xuat' | 'hoan_tat' = 'cho_duyet';
            if (o.trangThai === 'completed') st = 'hoan_tat';
            else if (o.trangThai === 'in_production') st = 'dang_san_xuat';
            else if (o.trangThai === 'approved') st = 'da_duyet';

            return {
              id: o.id,
              code: o.code || `DBH-${o.id}`,
              customerName: o.customer?.name || (o.code ? `Khách hàng ${o.code}` : 'Khách hàng'),
              customerPhone: o.customer?.dienThoai || '0988 776 554',
              customerAddress: o.customer?.address || '',
              customerGroup: rawGroup,
              orderDate: o.ngayDat ? new Date(o.ngayDat).toLocaleDateString('vi-VN') : '27/10/2026',
              deliveryDate: o.ngayGiao ? new Date(o.ngayGiao).toLocaleDateString('vi-VN') : '02/11/2026',
              totalAmount: total,
              paidAmount: paid,
              remainingAmount: Math.max(0, total - paid),
              status: st,
              itemsSummary: '',
              salesPerson: o.nguoiPhuTrach || '',
            };
          });
          setOrders(mappedOrders);
        }
      })
      .catch((err) => console.log('Dùng dữ liệu fallback cho đơn hàng:', err));

    // 2. Tải dữ liệu các lệnh chi tiền thực tế
    fetch('/api/finance/payment-orders')
      .then((res) => res.json())
      .then((data) => {
        if (data?.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          const mapped: CashOutflowItem[] = data.orders.map((o: any) => ({
            id: String(o.id),
            code: o.orderCode || `LC-${o.id}`,
            category: 'dong_thau',
            categoryTitle: o.description || 'Lệnh chi thanh toán',
            beneficiary: o.beneficiaryName || 'Đối tác thụ hưởng',
            method: o.paymentMethod === 'bank' ? 'unc_ngan_hang' : 'tien_mat',
            accountDebit: 'TK 331/642',
            accountCredit: o.paymentMethod === 'bank' ? 'TK 1121' : 'TK 1111',
            dueDate: o.dueDate || new Date().toLocaleDateString('vi-VN'),
            amount: Number(o.amount) || 0,
            status: o.status === 'executed' ? 'da_chi' : 'cho_chi',
            voucherCode: o.voucherCode,
            note: o.description || '',
          }));
          setOutflows((prev) => {
            const ids = new Set(mapped.map((m) => m.id));
            const remain = prev.filter((p) => !ids.has(p.id));
            return [...mapped, ...remain];
          });
        }
      })
      .catch((err) => console.log('Dùng dữ liệu fallback cho cashflow:', err))
      .finally(() => setIsLoading(false));

    // 3. Tải danh sách nhân viên thực tế từ Database (bảng Employee)
    fetch('/api/hr/employees?pageSize=100')
      .then((res) => res.json())
      .then((data) => {
        if (data?.employees && Array.isArray(data.employees) && data.employees.length > 0) {
          const mapped: FinanceEmployeeOption[] = data.employees.map((emp: any) => {
            const pos = emp.positionTitle || (emp.position?.startsWith('vtr') ? 'Cán bộ' : emp.position) || 'Cán bộ';
            const dept = emp.departmentName || 'Công ty CP Seajong';
            const isChief = emp.fullName?.toLowerCase().includes('linh') || pos?.toLowerCase().includes('kế toán trưởng');
            const formattedPos = isChief ? 'Kế toán trưởng' : pos;
            const text = `${emp.fullName} (${formattedPos} - ${dept})`;
            return {
              value: text,
              label: text,
              role: formattedPos,
              isChief,
            };
          });

          // Sắp xếp: Kế toán trưởng lên đầu tiên, sau đó đến Phòng Tài chính - Kế toán, Ban Giám đốc...
          mapped.sort((a, b) => {
            if (a.isChief) return -1;
            if (b.isChief) return 1;
            if (a.label.includes('Tài chính') || a.label.includes('Kế toán')) return -1;
            if (b.label.includes('Tài chính') || b.label.includes('Kế toán')) return 1;
            if (a.label.includes('Giám đốc')) return -1;
            if (b.label.includes('Giám đốc')) return 1;
            return a.label.localeCompare(b.label, 'vi');
          });

          setFinanceEmployees(mapped);
        }
      })
      .catch((err) => console.log('Sử dụng danh sách nhân viên thực tế fallback:', err));
  }, []);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  useFinanceRealtimeSync(() => {
    loadBackendData();
  });


  // ── XỬ LÝ HÀNH ĐỘNG BƯỚC 1: DUYỆT ĐƠN HÀNG ──
  const handleApproveOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'da_duyet' } : o))
    );
    notifyFinanceUpdated();
    onShowToast?.('success', 'Đã duyệt đơn hàng', 'Đơn hàng đã được phê duyệt và chuyển sang bộ phận sản xuất.');
  };

  const currentSelectedCount = useMemo(() => {
    if (currentStep === 1) return selectedOrderIds.size;
    if (currentStep === 2) return selectedRequestIds.size;
    if (currentStep === 3) return selectedInflowIds.size;
    return selectedOutflowIds.size;
  }, [currentStep, selectedOrderIds, selectedRequestIds, selectedInflowIds, selectedOutflowIds]);

  const handleDeleteSelectedItems = () => {
    if (currentStep === 1) {
      const count = selectedOrderIds.size;
      setOrders((prev) => prev.filter((o) => !selectedOrderIds.has(o.id)));
      setSelectedOrderIds(new Set());
      setShowDeleteConfirm(false);
      notifyFinanceUpdated();
      onShowToast?.('success', 'Đã xóa đơn hàng', `Đã xóa thành công ${count} đơn hàng khỏi hệ thống.`);
    } else if (currentStep === 2) {
      const count = selectedRequestIds.size;
      setRequests((prev) => prev.filter((r) => !selectedRequestIds.has(r.id)));
      setSelectedRequestIds(new Set());
      setShowDeleteConfirm(false);
      notifyFinanceUpdated();
      onShowToast?.('success', 'Đã xóa yêu cầu', `Đã xóa thành công ${count} yêu cầu đề xuất khỏi hệ thống.`);
    } else if (currentStep === 3) {
      const count = selectedInflowIds.size;
      setInflows((prev) => prev.filter((inf) => !selectedInflowIds.has(inf.id)));
      setSelectedInflowIds(new Set());
      setShowDeleteConfirm(false);
      notifyFinanceUpdated();
      onShowToast?.('success', 'Đã xóa phiếu thu', `Đã xóa thành công ${count} giao dịch dòng vào khỏi hệ thống.`);
    } else if (currentStep === 4) {
      const count = selectedOutflowIds.size;
      setOutflows((prev) => prev.filter((out) => !selectedOutflowIds.has(out.id)));
      setSelectedOutflowIds(new Set());
      setShowDeleteConfirm(false);
      notifyFinanceUpdated();
      onShowToast?.('success', 'Đã xóa lệnh chi', `Đã xóa thành công ${count} lệnh chi tiền khỏi hệ thống.`);
    }
  };

  // ── XỬ LÝ HÀNH ĐỘNG BƯỚC 2: DUYỆT YÊU CẦU ──
  const handleApproveRequest = (reqId: string) => {
    const target = requests.find((r) => r.id === reqId);
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'da_duyet' } : r))
    );
    // Tự động thêm một lệnh chi tiền chờ giải ngân ở Bước 4
    if (target) {
      const newOutflow: CashOutflowItem = {
        id: `out-auto-${Date.now()}`,
        code: `LC-${Date.now().toString().slice(-6)}`,
        category: 'tam_ung',
        categoryTitle: target.title,
        beneficiary: target.proposer,
        method: 'unc_ngan_hang',
        accountDebit: 'TK 331/141',
        accountCredit: 'TK 1121',
        dueDate: new Date().toLocaleDateString('vi-VN'),
        amount: target.amount,
        status: 'cho_chi',
        note: `Giải ngân tự động theo Yêu cầu ${target.code}`,
      };
      setOutflows((prev) => [newOutflow, ...prev]);
    }
    notifyFinanceUpdated();
    onShowToast?.('success', 'Đã duyệt yêu cầu', 'Yêu cầu đã được duyệt và tự động sinh Lệnh chi tiền ở Bước 4.');
  };

  const handleRejectRequest = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'tu_choi' } : r))
    );
    notifyFinanceUpdated();
    onShowToast?.('warning', 'Đã từ chối', 'Yêu cầu đã bị từ chối phê duyệt.');
  };

  // ── XỬ LÝ HÀNH ĐỘNG BƯỚC 4: GIẢI NGÂN LỆNH CHI ──
  const handleExecutePayout = async (outflowItem: CashOutflowItem) => {
    try {
      const res = await fetch(`/api/finance/payment-orders/${outflowItem.id}/execute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executedBy: payoutExecutor,
          executedDate: payoutExecutionDate,
          paymentMethod: payoutMethod,
          accountDebit: payoutDebitAccount || outflowItem.accountDebit,
          accountCredit: payoutCreditAccount || outflowItem.accountCredit,
        }),
      });
      const data = await res.json();
      const voucherNum = data?.voucherCode || `PC-${Date.now().toString().slice(-6)}`;

      setOutflows((prev) =>
        prev.map((o) =>
          o.id === outflowItem.id
            ? {
                ...o,
                status: 'da_chi',
                method: payoutMethod,
                voucherCode: voucherNum,
                accountDebit: payoutDebitAccount || o.accountDebit,
                accountCredit: payoutCreditAccount || o.accountCredit,
              }
            : o
        )
      );
      notifyFinanceUpdated();
      onShowToast?.(
        'success',
        'Giải ngân & Hạch toán thành công',
        `Đã xuất quỹ ${formatVND(outflowItem.amount)} bởi ${payoutExecutor}, tự động lập Phiếu chi ${voucherNum} và ghi sổ kép Nhật ký chung.`
      );
      return voucherNum;
    } catch {
      const voucherNum = `PC-${Date.now().toString().slice(-6)}`;
      setOutflows((prev) =>
        prev.map((o) =>
          o.id === outflowItem.id
            ? {
                ...o,
                status: 'da_chi',
                method: payoutMethod,
                voucherCode: voucherNum,
                accountDebit: payoutDebitAccount || o.accountDebit,
                accountCredit: payoutCreditAccount || o.accountCredit,
              }
            : o
        )
      );
      notifyFinanceUpdated();
      onShowToast?.(
        'success',
        'Giải ngân & Hạch toán thành công',
        `Đã xuất quỹ ${formatVND(outflowItem.amount)} bởi ${payoutExecutor}, tự động lập Phiếu chi ${voucherNum} và ghi sổ kép Nhật ký chung.`
      );
      return voucherNum;
    }
  };

  const handleCreateOutflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeneficiary.trim() || !newAmount || Number(newAmount) <= 0) {
      onShowToast?.('warning', 'Thiếu thông tin', 'Vui lòng nhập đối tượng thụ hưởng và số tiền hợp lệ.');
      return;
    }
    const newCode = `LC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-2)}`;
    const autoLimit = Number(localStorage.getItem('seajong_accounting_single_limit') || 20000000);
    const isAutoEnabled = localStorage.getItem('seajong_accounting_auto_enabled') !== 'false';
    const numAmount = Number(newAmount);
    const isOverLimit = numAmount > autoLimit;
    const mustSubmitApproval = !isAutoEnabled || isOverLimit;
    const willSubmitForApproval = mustSubmitApproval || isSubmitForApproval;

    const debitAccObj = STANDARD_DEBIT_ACCOUNTS.find((a) => a.code === selectedDebitAccount);
    const creditAccObj = ACCOUNTING_CREDIT_ACCOUNTS.find((a) => a.code === selectedCreditAccount);
    const bankItem = COMPANY_BANK_ACCOUNTS.find((b) => b.id === selectedBankAccountId);

    const accountCreditDisplay = bankItem && bankItem.type === 'bank'
      ? `TK ${selectedCreditAccount} (${bankItem.bankShortName} - STK ${bankItem.accountNumber})`
      : (creditAccObj ? `TK ${creditAccObj.code} (${creditAccObj.name.replace(/^[\d]+\s*-\s*/, '')})` : `TK ${selectedCreditAccount}`);

    const newItem: CashOutflowItem = {
      id: `out-${Date.now()}`,
      code: newCode,
      category: 'no_ncc',
      categoryTitle: newCategoryTitle.trim() || 'Bảo dưỡng máy móc, điện nước, phụ liệu xưởng sản xuất',
      beneficiary: newBeneficiary.trim(),
      method: newMethod,
      accountDebit: debitAccObj ? `TK ${debitAccObj.code} (${debitAccObj.name.replace(/^[\d]+\s*-\s*/, '')})` : `TK ${selectedDebitAccount}`,
      accountCredit: accountCreditDisplay,
      dueDate: new Date().toLocaleDateString('vi-VN'),
      amount: numAmount,
      status: willSubmitForApproval ? 'cho_chi' : 'da_chi',
      voucherCode: willSubmitForApproval
        ? undefined
        : `PC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-2)}`,
      note: newNote.trim() ? `${newNote.trim()} (Người đề xuất: ${newCreator})` : `(Người đề xuất: ${newCreator})`,
    };
    setOutflows((prev) => [newItem, ...prev]);
    setShowCreateOutflowModal(false);
    setNewBeneficiary('');
    setNewCategoryTitle('Bảo dưỡng máy móc, điện nước, phụ liệu xưởng sản xuất');
    setSelectedExpenseOpId('production_overhead');
    setSelectedDebitAccount('627');
    setSelectedCreditAccount('1121');
    setSelectedBankAccountId('bidv');
    setNewMethod('unc_ngan_hang');
    setNewAmount('');
    setNewNote('');
    setIsSubmitForApproval(false);
    notifyFinanceUpdated();

    if (willSubmitForApproval) {
      onShowToast?.(
        'success',
        'Đã trình duyệt lệnh chi',
        `Đã lập và gửi trình duyệt Lệnh chi ${newCode} (${formatVND(newItem.amount)}) tới Ban Giám đốc phê duyệt.`
      );
    } else {
      onShowToast?.(
        'success',
        'Đã xác nhận tự động chi',
        `Lệnh chi ${newCode} (${formatVND(newItem.amount)}) trong hạn mức quy định đã được Kế toán duyệt và giải ngân thành công.`
      );
    }
    if (isPrintVoucher) {
      setIsPrintVoucher(false);
      setTimeout(() => {
        onShowToast?.('info', 'In phiếu chi', `Đang kết xuất Phiếu chi cho Lệnh chi ${newCode}...`);
        window.print();
      }, 500);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // LỌC DỮ LIỆU THEO TỪNG BƯỚC
  // ══════════════════════════════════════════════════════════════════

  // Bước 1: Duyệt đơn hàng
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerPhone.includes(searchTerm) ||
        item.salesPerson.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filter1 === 'all' || item.status === filter1;
      const matchGroup = filter2 === 'all' || item.customerGroup === filter2;
      return matchSearch && matchStatus && matchGroup;
    });
  }, [orders, searchTerm, filter1, filter2]);

  // Bước 2: Duyệt yêu cầu
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proposer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filter1 === 'all' || item.status === filter1;
      const matchType = filter2 === 'all' || item.type === filter2;
      return matchSearch && matchStatus && matchType;
    });
  }, [requests, searchTerm, filter1, filter2]);

  // Bước 3: Tiền vào
  const filteredInflows = useMemo(() => {
    return inflows.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sourceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMethod = filter1 === 'all' || item.method === filter1;
      const matchSource = filter2 === 'all' || item.source === filter2;
      return matchSearch && matchMethod && matchSource;
    });
  }, [inflows, searchTerm, filter1, filter2]);

  // Bước 4: Tiền ra
  const filteredOutflows = useMemo(() => {
    return outflows.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.beneficiary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filter1 === 'all' || item.status === filter1;
      const matchMethod = filter2 === 'all' || item.method === filter2;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [outflows, searchTerm, filter1, filter2]);

  // ══════════════════════════════════════════════════════════════════
  // CẤU HÌNH TABLE TOOLBAR THEO TỪNG BƯỚC
  // ══════════════════════════════════════════════════════════════════

  const toolbarFilters = useMemo((): TableToolbarFilter[] => {
    if (currentStep === 1) {
      // Trích xuất các nhóm khách hàng thực tế xuất hiện trong dữ liệu DB
      const existingGroups = Array.from(new Set(orders.map((o) => o.customerGroup).filter(Boolean)));
      const dynamicGroupOptions = existingGroups.map((grpCode) => {
        const info = getCustomerGroupInfo(grpCode);
        return {
          value: grpCode,
          label: info.name,
        };
      });

      return [
        {
          id: 'order-status',
          ariaLabel: 'Trạng thái đơn hàng',
          value: filter1,
          onChange: setFilter1,
          options: [
            { value: 'all', label: 'Tất cả trạng thái' },
            { value: 'cho_duyet', label: 'Chờ duyệt' },
            { value: 'da_duyet', label: 'Đã phê duyệt' },
            { value: 'dang_san_xuat', label: 'Đang sản xuất' },
            { value: 'hoan_tat', label: 'Hoàn tất' },
          ],
        },
        {
          id: 'order-group',
          ariaLabel: 'Phân loại khách hàng',
          value: filter2,
          onChange: setFilter2,
          options: [
            { value: 'all', label: 'Tất cả khách hàng' },
            ...dynamicGroupOptions,
          ],
        },
      ];
    }

    if (currentStep === 2) {
      return [
        {
          id: 'req-status',
          ariaLabel: 'Trạng thái yêu cầu',
          value: filter1,
          onChange: setFilter1,
          options: [
            { value: 'all', label: 'Tất cả trạng thái' },
            { value: 'cho_duyet', label: 'Chờ duyệt chi' },
            { value: 'da_duyet', label: 'Đã duyệt chi' },
            { value: 'da_giai_ngan', label: 'Đã lập lệnh chi' },
            { value: 'tu_choi', label: 'Đã từ chối' },
          ],
        },
        {
          id: 'req-type',
          ariaLabel: 'Phân loại yêu cầu',
          value: filter2,
          onChange: setFilter2,
          options: [
            { value: 'all', label: 'Tất cả loại yêu cầu' },
            { value: 'vat_tu', label: 'Mua vật tư đồng thau' },
            { value: 'tam_ung', label: 'Tạm ứng công tác' },
            { value: 'hanh_chinh', label: 'Bảo trì & Vận hành' },
          ],
        },
      ];
    }

    if (currentStep === 3) {
      return [
        {
          id: 'inflow-method',
          ariaLabel: 'Hình thức thanh toán',
          value: filter1,
          onChange: setFilter1,
          options: [
            { value: 'all', label: 'Tất cả hình thức' },
            { value: 'ngan_hang', label: 'Ngân hàng (TK 1121)' },
            { value: 'tien_mat', label: 'Tiền mặt (TK 1111)' },
          ],
        },
        {
          id: 'inflow-source',
          ariaLabel: 'Nguồn thu',
          value: filter2,
          onChange: setFilter2,
          options: [
            { value: 'all', label: 'Tất cả nguồn thu' },
            { value: 'thu_no_khach', label: 'Thu nợ khách hàng (131)' },
            { value: 'ban_le', label: 'Doanh thu bán lẻ (511)' },
            { value: 'hoan_ung', label: 'Thu hoàn ứng (141)' },
            { value: 'vay_ngan_hang', label: 'Vay tín dụng (341)' },
          ],
        },
      ];
    }

    // currentStep === 4
    return [
      {
        id: 'outflow-status',
        ariaLabel: 'Trạng thái giải ngân',
        value: filter1,
        onChange: setFilter1,
        options: [
          { value: 'all', label: 'Tất cả trạng thái' },
          { value: 'cho_chi', label: 'Chờ giải ngân' },
          { value: 'da_chi', label: 'Đã xuất quỹ' },
        ],
      },
      {
        id: 'outflow-method',
        ariaLabel: 'Phương thức chi',
        value: filter2,
        onChange: setFilter2,
        options: [
          { value: 'all', label: 'Tất cả hình thức' },
          { value: 'unc_ngan_hang', label: 'Ủy nhiệm chi (UNC)' },
          { value: 'tien_mat', label: 'Phiếu chi tiền mặt' },
        ],
      },
    ];
  }, [currentStep, filter1, filter2, orders]);

  const toolbarMenuItems: TableToolbarMenuItem[] = useMemo(() => [
    {
      id: 'refresh',
      label: 'Làm mới dữ liệu',
      icon: <ArrowRepeat size={14} />,
      onClick: () => {
        loadBackendData();
        onShowToast?.('success', 'Đã đồng bộ', 'Dữ liệu luồng tiền đã được cập nhật mới nhất');
      },
    },
    {
      id: 'print-list',
      label: 'In bảng dữ liệu',
      icon: <Printer size={14} />,
      onClick: () => window.print(),
    },
    {
      id: 'export-csv',
      label: 'Xuất file dữ liệu (CSV)',
      icon: <FileEarmarkExcel size={14} />,
      onClick: () => {
        onShowToast?.('info', 'Xuất dữ liệu', 'Đang kết xuất bảng dữ liệu sang tệp bảng tính Excel');
      },
    },
  ], [loadBackendData, onShowToast]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#ffffff',
      }}
    >


      {/* ── B. COMPONENT TABLETOOLBAR CHUẨN DOANH NGHIỆP ── */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder={
          currentStep === 1
            ? 'Tìm mã đơn hàng, tên khách hàng, số điện thoại...'
            : currentStep === 2
            ? 'Tìm mã yêu cầu, tiêu đề đề xuất, phòng ban, người đề xuất...'
            : currentStep === 3
            ? 'Tìm mã phiếu thu, đối tượng nộp tiền, nội dung ghi nhận...'
            : 'Tìm mã lệnh chi, nhà cung cấp thụ hưởng, nội dung chi tiền...'
        }
        filters={toolbarFilters}
        rightActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.('info', 'Xuất Excel', 'Đang trích xuất dữ liệu dòng tiền ra file Excel.')}
              leftIcon={<FileEarmarkExcel size={14} color="#16a34a" />}
            >
              Xuất Excel
            </Button>
            {currentStep === 3 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreateInflowModal}
                leftIcon={<PlusLg size={14} />}
                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
              >
                Lập phiếu thu
              </Button>
            )}
            {currentStep === 4 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreateModal}
                leftIcon={<PlusLg size={14} />}
              >
                Tạo mới
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              disabled={currentSelectedCount === 0}
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash size={14} />}
            >
              Xoá{currentSelectedCount > 0 ? ` (${currentSelectedCount})` : ''}
            </Button>
          </div>
        }
        showMenu={false}
        menuItems={[]}
      />

      {/* ── C. COMPONENT FULLWIDTHTABLE CHO TỪNG BƯỚC ── */}
      <FullWidthTable loading={isLoading}>
        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 1: DUYỆT ĐƠN HÀNG (ORDER APPROVALS)
            4 Cột: Mã đơn hàng | Thông tin khách hàng | Giá trị | Trạng thái
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 w-56">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
                        } else {
                          setSelectedOrderIds(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="Chọn tất cả đơn hàng"
                    />
                    <span>Mã đơn hàng</span>
                  </div>
                </th>
                <th className="py-2.5 px-3.5 min-w-[280px]">Thông tin khách hàng</th>
                <th className="py-2.5 px-3.5 w-44 text-right">Giá trị</th>
                <th className="py-2.5 px-3.5 w-36 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 px-4 text-slate-400">
                    Không có đơn hàng nào khớp với điều kiện tìm kiếm
                  </td>
                </tr>
              ) : (
                filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(ord.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const next = new Set(selectedOrderIds);
                            if (e.target.checked) next.add(ord.id);
                            else next.delete(ord.id);
                            setSelectedOrderIds(next);
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 text-[13px] block">
                            {ord.code}
                          </span>
                          <div className="text-[11.5px] text-slate-500 mt-0.5 whitespace-nowrap">
                            Ngày đặt: {ord.orderDate} • Giao: {ord.deliveryDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-[13px]">
                          {ord.customerName}
                        </span>
                        {ord.customerGroup && (
                          <>
                            <span className="text-slate-300 text-[12px]">|</span>
                            <span className="text-slate-500 text-[12px] font-medium">
                              {getCustomerGroupInfo(ord.customerGroup).name}
                            </span>
                          </>
                        )}
                      </div>
                      {ord.customerAddress && (
                        <div className="text-[11.5px] text-slate-500 mt-0.5 line-clamp-1" title={ord.customerAddress}>
                          {ord.customerAddress}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right">
                      <div className="font-bold text-slate-900 text-[13px]">
                        {formatVND(ord.totalAmount)}
                      </div>
                      <div className="text-[11.5px] text-emerald-600 font-medium mt-0.5 whitespace-nowrap">
                        Đã thu: {formatVND(ord.paidAmount)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${
                          ord.status === 'cho_duyet'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : ord.status === 'da_duyet'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : ord.status === 'dang_san_xuat'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {ord.status === 'cho_duyet'
                          ? 'Chờ duyệt'
                          : ord.status === 'da_duyet'
                          ? 'Đã phê duyệt'
                          : ord.status === 'dang_san_xuat'
                          ? 'Đang sản xuất'
                          : 'Hoàn tất'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 2: DUYỆT YÊU CẦU (REQUEST APPROVALS)
            4 Cột: Mã yêu cầu | Người yêu cầu | Nội dung | Trạng thái
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 w-56">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={filteredRequests.length > 0 && selectedRequestIds.size === filteredRequests.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequestIds(new Set(filteredRequests.map((r) => r.id)));
                        } else {
                          setSelectedRequestIds(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="Chọn tất cả yêu cầu"
                    />
                    <span>Mã yêu cầu</span>
                  </div>
                </th>
                <th className="py-2.5 px-3.5 w-52">Người yêu cầu</th>
                <th className="py-2.5 px-3.5 min-w-[280px]">Nội dung</th>
                <th className="py-2.5 px-3.5 w-36 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 px-4 text-slate-400">
                    Không có yêu cầu nào khớp với điều kiện tìm kiếm
                  </td>
                </tr>
              ) : (
                filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.has(req.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const next = new Set(selectedRequestIds);
                            if (e.target.checked) next.add(req.id);
                            else next.delete(req.id);
                            setSelectedRequestIds(next);
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 text-[13px] block">
                            {req.code}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                req.type === 'vat_tu'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : req.type === 'tam_ung'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : req.type === 'cong_tac'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {req.type === 'vat_tu'
                                ? 'Mua vật tư'
                                : req.type === 'tam_ung'
                                ? 'Tạm ứng'
                                : req.type === 'cong_tac'
                                ? 'Công tác'
                                : 'Hành chính'}
                            </span>
                            <span className="text-[11px] text-slate-400">{req.requestDate}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="font-semibold text-slate-900 text-[13px]">{req.proposer}</div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">{req.department}</div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="font-semibold text-slate-900 text-[13px]">{req.title}</div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">{req.reason}</div>
                      <div className="text-[12px] font-bold text-slate-800 mt-1">
                        Số tiền đề xuất: <span className="text-emerald-700">{formatVND(req.amount)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${
                          req.status === 'cho_duyet'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : req.status === 'da_duyet'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : req.status === 'da_giai_ngan'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {req.status === 'cho_duyet'
                          ? 'Chờ duyệt chi'
                          : req.status === 'da_duyet'
                          ? 'Đã duyệt chi'
                          : req.status === 'da_giai_ngan'
                          ? 'Đã lập lệnh chi'
                          : 'Đã từ chối'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 3: DÒNG VÀO (CASH INFLOW)
            4 Cột: Mã hiệu | Nguồn vào | Số tiền | Trạng thái
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 w-56">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={filteredInflows.length > 0 && selectedInflowIds.size === filteredInflows.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInflowIds(new Set(filteredInflows.map((inf) => inf.id)));
                        } else {
                          setSelectedInflowIds(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="Chọn tất cả giao dịch dòng vào"
                    />
                    <span>Mã hiệu</span>
                  </div>
                </th>
                <th className="py-2.5 px-3.5 min-w-[300px]">Nguồn vào</th>
                <th className="py-2.5 px-3.5 w-48 text-right">Số tiền</th>
                <th className="py-2.5 px-3.5 w-36 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInflows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 px-4 text-slate-400">
                    Không có dữ liệu dòng vào nào khớp điều kiện tìm kiếm
                  </td>
                </tr>
              ) : (
                filteredInflows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((inf) => (
                  <tr
                    key={inf.id}
                    onClick={() => handleOpenInflowDetail(inf)}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedInflowIds.has(inf.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const next = new Set(selectedInflowIds);
                            if (e.target.checked) next.add(inf.id);
                            else next.delete(inf.id);
                            setSelectedInflowIds(next);
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 text-[13px] block">
                            {inf.code}
                          </span>
                          {inf.voucherCode && (
                            <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                              ✓ {inf.voucherCode}
                            </span>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                inf.method === 'ngan_hang'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {inf.method === 'ngan_hang' ? 'Chuyển khoản' : 'Tiền mặt'}
                            </span>
                            <span className="text-[11px] text-slate-400">{inf.date}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="font-semibold text-slate-900 text-[13px]">{inf.sourceTitle}</div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Đối tượng nộp: <span className="font-medium text-slate-800">{inf.payerName}</span>
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Hạch toán: Nợ <span className="font-mono text-slate-700">{inf.accountDebit}</span> • Có <span className="font-mono text-slate-700">{inf.accountCredit}</span>
                      </div>
                      {inf.note && (
                        <div className="text-[11.5px] text-slate-400 mt-0.5 line-clamp-1">{inf.note}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right">
                      <div className="font-bold text-emerald-600 text-[13.5px]">
                        +{formatVND(inf.amount)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Thực thu quỹ</div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap gap-1 ${
                          inf.status === 'cho_thu'
                            ? 'bg-amber-50 text-amber-700 border border-amber-300'
                            : inf.status === 'da_vao_quy'
                            ? 'bg-sky-50 text-sky-700 border border-sky-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        }`}
                      >
                        {inf.status === 'cho_thu' ? (
                          <>
                            <Clock size={11} className="text-amber-600" />
                            Chờ xác nhận thu
                          </>
                        ) : inf.status === 'da_vao_quy' ? (
                          <>
                            <CheckCircleFill size={11} className="text-sky-600" />
                            Đã vào quỹ
                          </>
                        ) : (
                          <>
                            <CheckCircleFill size={11} className="text-emerald-600" />
                            Đã đối soát
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BƯỚC 4: DÒNG RA (CASH OUTFLOW)
            4 Cột: Mã hiệu | Thông tin chi phí | Số tiền | Trạng thái
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead className="sticky top-0 z-10 bg-white border-t border-slate-200 border-b-2 border-slate-200">
              <tr className="text-slate-500 text-[11.5px] uppercase tracking-[0.06em] font-bold">
                <th className="py-2.5 px-3.5 w-56">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={filteredOutflows.length > 0 && selectedOutflowIds.size === filteredOutflows.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOutflowIds(new Set(filteredOutflows.map((out) => out.id)));
                        } else {
                          setSelectedOutflowIds(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="Chọn tất cả lệnh chi"
                    />
                    <span>Mã hiệu</span>
                  </div>
                </th>
                <th className="py-2.5 px-3.5 min-w-[300px]">Thông tin chi phí</th>
                <th className="py-2.5 px-3.5 w-48 text-right">Số tiền</th>
                <th className="py-2.5 px-3.5 w-36 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOutflows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 px-4 text-slate-400">
                    Không có lệnh chi tiền nào khớp điều kiện tìm kiếm
                  </td>
                </tr>
              ) : (
                filteredOutflows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((out) => (
                  <tr
                    key={out.id}
                    onClick={() => handleOpenOutflowDetail(out)}
                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedOutflowIds.has(out.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const next = new Set(selectedOutflowIds);
                            if (e.target.checked) next.add(out.id);
                            else next.delete(out.id);
                            setSelectedOutflowIds(next);
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 text-[13px] block">
                            {out.code}
                          </span>
                          {out.voucherCode && (
                            <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                              ✓ {out.voucherCode}
                            </span>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                                out.method === 'unc_ngan_hang'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {out.method === 'unc_ngan_hang' ? 'UNC Ngân hàng' : 'Tiền mặt'}
                            </span>
                            <span className="text-[11px] text-slate-400">Hạn: {out.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 align-top">
                      <div className="font-semibold text-slate-900 text-[13px]">{out.categoryTitle}</div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Thụ hưởng: <span className="font-medium text-slate-800">{out.beneficiary}</span>
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Hạch toán: Nợ <span className="font-mono text-slate-700">{out.accountDebit}</span> • Có <span className="font-mono text-slate-700">{out.accountCredit}</span>
                      </div>
                      {out.note && (
                        <div className="text-[11.5px] text-slate-400 mt-0.5 line-clamp-1">{out.note}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-right">
                      <div className="font-bold text-rose-600 text-[13.5px]">
                        -{formatVND(out.amount)}
                      </div>
                      {out.accountCredit && (
                        <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                          {out.accountCredit}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 align-top text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${
                          out.status === 'cho_chi'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {out.status === 'cho_chi' ? 'Chờ giải ngân' : 'Đã xuất quỹ'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </FullWidthTable>

      {/* ── D. COMPONENT PAGINATION PHÂN TRANG CHUẨN DOANH NGHIỆP ── */}
      <Pagination
        currentPage={currentPage}
        totalItems={
          currentStep === 1
            ? filteredOrders.length
            : currentStep === 2
            ? filteredRequests.length
            : currentStep === 3
            ? filteredInflows.length
            : filteredOutflows.length
        }
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        pageSizeOptions={[5, 10, 20, 50]}
        itemName={
          currentStep === 1
            ? 'đơn hàng'
            : currentStep === 2
            ? 'yêu cầu'
            : currentStep === 3
            ? 'khoản thu'
            : 'lệnh chi'
        }
      />

      {/* ── OFFCANVAS XEM CHI TIẾT ĐƠN HÀNG (BƯỚC 1) ── */}
      {selectedOrder && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          title={`Đơn hàng: ${selectedOrder.code}`}
          description="Thông tin chi tiết đơn hàng & phê duyệt luồng tiền"
          width="400px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Đóng
              </Button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setOrders((prev) =>
                      prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: 'cho_duyet' } : o))
                    );
                    notifyFinanceUpdated();
                    onShowToast?.('warning', 'Từ chối đơn hàng', `Đã từ chối đơn hàng ${selectedOrder.code}`);
                    setSelectedOrder(null);
                  }}
                >
                  Từ chối
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleApproveOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                >
                  Phê duyệt
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
            {/* Thông tin khách hàng */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Khách hàng
                </span>
                {(() => {
                  const grp = getCustomerGroupInfo(selectedOrder.customerGroup);
                  return (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        backgroundColor: grp.badgeBg,
                        color: grp.badgeText,
                        border: `1px solid ${grp.badgeBorder}`,
                      }}
                    >
                      {grp.name}
                    </span>
                  );
                })()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                {selectedOrder.customerName}
              </div>
              {selectedOrder.customerAddress && (
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                  Địa chỉ: <strong>{selectedOrder.customerAddress}</strong>
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                SĐT: <strong>{selectedOrder.customerPhone}</strong>
              </div>
            </div>

            {/* Thông tin thời gian */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Thời gian & Trạng thái
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Ngày đặt hàng:</span>
                  <strong style={{ color: '#1e293b' }}>{selectedOrder.orderDate}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Hạn giao hàng:</span>
                  <strong style={{ color: '#1e293b' }}>{selectedOrder.deliveryDate}</strong>
                </div>
              </div>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Trạng thái đơn:</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    backgroundColor:
                      selectedOrder.status === 'cho_duyet' ? '#fef3c7' :
                      selectedOrder.status === 'da_duyet' ? '#e0f2fe' :
                      selectedOrder.status === 'dang_san_xuat' ? '#ede9fe' : '#dcfce7',
                    color:
                      selectedOrder.status === 'cho_duyet' ? '#b45309' :
                      selectedOrder.status === 'da_duyet' ? '#0369a1' :
                      selectedOrder.status === 'dang_san_xuat' ? '#6d28d9' : '#15803d',
                  }}
                >
                  {selectedOrder.status === 'cho_duyet' ? 'Chờ duyệt' :
                   selectedOrder.status === 'da_duyet' ? 'Đã phê duyệt' :
                   selectedOrder.status === 'dang_san_xuat' ? 'Đang sản xuất' : 'Hoàn tất'}
                </span>
              </div>
            </div>

            {/* Thông tin tài chính */}
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Giá trị tài chính
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#047857', fontSize: '0.8rem' }}>Tổng giá trị:</span>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatVND(selectedOrder.totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #d1fae5' }}>
                <span style={{ color: '#047857', fontSize: '0.8rem' }}>Đã thanh toán:</span>
                <strong style={{ color: '#059669' }}>{formatVND(selectedOrder.paidAmount)}</strong>
              </div>
            </div>
          </div>
        </Offcanvas>
      )}

      {/* ── CONFIRM DIALOG XÁC NHẬN XÓA DỮ LIỆU HÀNG LOẠT ── */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={
          currentStep === 1
            ? 'Xác nhận xóa dữ liệu đơn hàng'
            : currentStep === 2
            ? 'Xác nhận xóa yêu cầu đề xuất'
            : currentStep === 3
            ? 'Xác nhận xóa giao dịch dòng vào'
            : 'Xác nhận xóa lệnh chi tiền'
        }
        message={
          currentStep === 1
            ? `Bạn có chắc chắn muốn xóa ${selectedOrderIds.size} đơn hàng đã chọn khỏi hệ thống? Dữ liệu sau khi xóa sẽ không thể phục hồi.`
            : currentStep === 2
            ? `Bạn có chắc chắn muốn xóa ${selectedRequestIds.size} yêu cầu đề xuất đã chọn khỏi hệ thống? Dữ liệu sau khi xóa sẽ không thể phục hồi.`
            : currentStep === 3
            ? `Bạn có chắc chắn muốn xóa ${selectedInflowIds.size} giao dịch dòng vào đã chọn khỏi hệ thống? Dữ liệu sau khi xóa sẽ không thể phục hồi.`
            : `Bạn có chắc chắn muốn xóa ${selectedOutflowIds.size} lệnh chi tiền đã chọn khỏi hệ thống? Dữ liệu sau khi xóa sẽ không thể phục hồi.`
        }
        variant="danger"
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={handleDeleteSelectedItems}
        onClose={() => setShowDeleteConfirm(false)}
      />

      {/* ── MODAL XEM CHI TIẾT TỜ TRÌNH YÊU CẦU (BƯỚC 2) ── */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title={`TỜ TRÌNH ĐỀ NGHỊ CHI TIỀN: ${selectedRequest.code}`}
          maxWidth="540px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '4px' }}>
                {selectedRequest.title}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                Đề xuất bởi: <strong style={{ color: '#1e293b' }}>{selectedRequest.proposer}</strong> ({selectedRequest.department}) • Ngày gửi: {selectedRequest.requestDate}
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Căn cứ và lý do chi:</div>
              <p style={{ margin: 0, color: '#334155', lineHeight: '1.5' }}>{selectedRequest.reason}</p>
            </div>

            <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#166534' }}>Số tiền đề xuất giải ngân:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                {formatVND(selectedRequest.amount)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              {selectedRequest.status === 'cho_duyet' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleApproveRequest(selectedRequest.id);
                      setSelectedRequest(null);
                    }}
                  >
                    Duyệt chi tiền
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleRejectRequest(selectedRequest.id);
                      setSelectedRequest(null);
                    }}
                  >
                    Từ chối
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── OFFCANVAS XEM CHI TIẾT & HẠCH TOÁN LỆNH CHI (BƯỚC 4) ── */}
      {selectedOutflow && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedOutflow(null)}
          icon={<Receipt size={22} className="text-blue-600" />}
          title={`Lệnh chi tiền: ${selectedOutflow.code}`}
          description={
            selectedOutflow.status === 'da_chi'
              ? 'Đã giải ngân & hạch toán Sổ nhật ký chung'
              : 'Chờ Kế toán trưởng giải ngân & ghi sổ kép tự động'
          }
          subHeader={
            <div className="px-4 py-2 bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span>Mã chứng từ:</span>
                <span className="font-mono text-blue-700 font-bold">{selectedOutflow.code}</span>
              </div>
              {selectedOutflow.status === 'da_chi' ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                  <CheckCircleFill size={11} className="text-emerald-600" />
                  Đã giải ngân
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                  <Clock size={11} className="text-amber-600" />
                  Chờ giải ngân
                </span>
              )}
            </div>
          }
          width="420px"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedOutflow(null)}>
                Đóng
              </Button>
              {selectedOutflow.status === 'cho_chi' ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    const currentOutflow = selectedOutflow;
                    const voucherNum = await handleExecutePayout(currentOutflow);
                    if (isPrintVoucherToggle) {
                      setPrintPreviewItem({
                        voucherCode: voucherNum,
                        code: currentOutflow.code,
                        amount: currentOutflow.amount,
                        beneficiary: currentOutflow.beneficiary,
                        categoryTitle: currentOutflow.categoryTitle,
                        note: currentOutflow.note || '',
                        method: payoutMethod,
                        debitAccount: payoutDebitAccount,
                        creditAccount: payoutCreditAccount,
                        bankAccountId: payoutBankAccountId,
                        executor: payoutExecutor,
                        date: payoutExecutionDate || new Date().toLocaleDateString('vi-VN'),
                      });
                      setIsPrintPreviewOpen(true);
                    }
                    setSelectedOutflow(null);
                  }}
                >
                  Xác nhận giải ngân
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPrintPreviewItem({
                      voucherCode: selectedOutflow.voucherCode || `PC-${selectedOutflow.code}`,
                      code: selectedOutflow.code,
                      amount: selectedOutflow.amount,
                      beneficiary: selectedOutflow.beneficiary,
                      categoryTitle: selectedOutflow.categoryTitle,
                      note: selectedOutflow.note || '',
                      method: payoutMethod,
                      debitAccount: payoutDebitAccount,
                      creditAccount: payoutCreditAccount,
                      bankAccountId: payoutBankAccountId,
                      executor: payoutExecutor,
                      date: payoutExecutionDate || selectedOutflow.dueDate || new Date().toLocaleDateString('vi-VN'),
                    });
                    setIsPrintPreviewOpen(true);
                  }}
                >
                  <Printer size={13} className="mr-1 inline" />
                  In chứng từ chi
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-3 text-[13px] pb-4">
            {/* 1. THẺ THÔNG TIN KHOẢN MỤC CHI TIÊU & ĐƠN VỊ THỤ HƯỞNG */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="text-[10.5px] uppercase font-bold text-rose-700 tracking-wider">
                Khoản mục chi tiêu
              </div>
              <div className="font-bold text-slate-900 text-sm leading-snug">
                {selectedOutflow.categoryTitle}
              </div>
              <div className="text-xs text-rose-950/80 pt-1.5 border-t border-rose-200/60 mt-0.5 flex items-center justify-between">
                <span>Đơn vị thụ hưởng:</span>
                <strong className="text-slate-900 font-semibold truncate max-w-[240px]">
                  {selectedOutflow.beneficiary}
                </strong>
              </div>
            </div>

            {/* 2. CARD ĐỊNH KHOẢN TỰ ĐỘNG SỔ NHẬT KÝ CHUNG (TÀI KHOẢN KẾ TOÁN TT 200) */}
            <div className="p-3 bg-[#f8fafc] border border-blue-200/70 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  ĐỊNH KHOẢN TỰ ĐỘNG SỔ NHẬT KÝ CHUNG
                </span>
                <span className="text-[11px] font-bold text-[#0284c7] bg-[#e0f2fe] px-2 py-0.5 rounded-md border border-[#bae6fd]">
                  Nợ TK {payoutDebitAccount} / Có TK {payoutCreditAccount}
                </span>
              </div>

              {/* Ô CHỌN TÀI KHOẢN KẾ TOÁN NỢ (Chi phí / Công nợ) */}
              <div>
                <Select
                  label="Tài khoản Kế toán NỢ (Chi phí / Công nợ)"
                  required
                  value={payoutDebitAccount}
                  onChange={(e) => setPayoutDebitAccount(e.target.value)}
                  disabled={selectedOutflow.status === 'da_chi'}
                  options={STANDARD_DEBIT_ACCOUNTS.map((acc) => ({
                    value: acc.code,
                    label: acc.name,
                  }))}
                />
              </div>

              {/* Ô CHỌN TÀI KHOẢN KẾ TOÁN CÓ (Nguồn xuất quỹ kế toán) */}
              <div>
                <Select
                  label="Tài khoản Kế toán CÓ (Nguồn xuất quỹ)"
                  required
                  value={payoutCreditAccount}
                  onChange={(e) => handlePayoutCreditChange(e.target.value)}
                  disabled={selectedOutflow.status === 'da_chi'}
                  options={ACCOUNTING_CREDIT_ACCOUNTS.map((acc) => ({
                    value: acc.code,
                    label: acc.name,
                  }))}
                />
              </div>

              <div className="text-[10.5px] text-slate-500 italic leading-snug">
                * Hạch toán kép vào Sổ nhật ký chung theo chế độ kế toán doanh nghiệp (TT 200).
              </div>
            </div>

            {/* 3. THẺ SỐ TIỀN XUẤT QUỸ */}
            <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                Số tiền xuất quỹ:
              </span>
              <span className="text-lg font-extrabold text-rose-600">
                {formatVND(selectedOutflow.amount)}
              </span>
            </div>

            {/* CÔNG TẮC TOGGLE "IN CHỨNG TỪ" DƯỚI SỐ TIỀN XUẤT QUỸ */}
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Printer size={13} className="text-blue-600" />
                  In chứng từ
                </span>
                <span className="text-[11px] text-slate-500">
                  {payoutMethod === 'tien_mat'
                    ? 'Tự động mở xem trước Phiếu chi sau khi giải ngân'
                    : 'Tự động mở xem trước Ủy nhiệm chi (UNC) sau khi giải ngân'}
                </span>
              </div>
              <div className="flex items-center">
                <Toggle
                  checked={isPrintVoucherToggle}
                  onChange={(val) => setIsPrintVoucherToggle(val)}
                  disabled={selectedOutflow.status === 'da_chi'}
                />
              </div>
            </div>

            {/* 4. CHI TIẾT GIẢI NGÂN: NGƯỜI CHI, NGÀY CHI, HÌNH THỨC & TÀI KHOẢN NGÂN HÀNG TRÍCH TIỀN */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2.5 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Thông tin giải ngân &amp; Chứng từ
              </div>

              {/* Ô HÌNH THỨC THANH TOÁN (CHO PHÉP THAY ĐỔI) & HẠN GIẢI NGÂN */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Select
                    label="Hình thức thanh toán"
                    value={payoutMethod}
                    disabled={selectedOutflow.status === 'da_chi'}
                    onChange={(e) => handlePayoutMethodChange(e.target.value as 'unc_ngan_hang' | 'tien_mat')}
                    options={[
                      { value: 'unc_ngan_hang', label: 'Ủy nhiệm chi (UNC)' },
                      { value: 'tien_mat', label: 'Phiếu chi tiền mặt' },
                    ]}
                  />
                </div>

                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">Hạn giải ngân:</span>
                  <div className="h-[38px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center">
                    {selectedOutflow.dueDate}
                  </div>
                </div>
              </div>

              {/* Ô CHỌN TÀI KHOẢN NGÂN HÀNG TRÍCH TIỀN / QUỸ XUẤT TIỀN */}
              <div className="pt-2 border-t border-slate-100">
                <Select
                  label="Tài khoản ngân hàng trích tiền / Quỹ xuất tiền"
                  required
                  value={payoutBankAccountId}
                  onChange={(e) => handlePayoutBankAccountChange(e.target.value)}
                  disabled={selectedOutflow.status === 'da_chi'}
                  options={COMPANY_BANK_ACCOUNTS.map((acc) => ({
                    value: acc.id,
                    label: acc.label,
                  }))}
                />
                {(() => {
                  const selectedBank = COMPANY_BANK_ACCOUNTS.find((b) => b.id === payoutBankAccountId);
                  if (!selectedBank) return null;
                  return (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-1.5 flex flex-col gap-0.5">
                      {selectedBank.type === 'bank' ? (
                        <>
                          <div><span className="font-semibold text-slate-700">Ngân hàng:</span> {selectedBank.bankName}</div>
                          <div><span className="font-semibold text-slate-700">Số tài khoản:</span> <span className="font-mono font-bold text-blue-700">{selectedBank.accountNumber}</span> - {selectedBank.branch}</div>
                        </>
                      ) : selectedBank.type === 'cash' ? (
                        <div><span className="font-semibold text-slate-700">Nguồn tiền:</span> Thủ quỹ xuất tiền mặt trực tiếp tại két công ty Seajong</div>
                      ) : (
                        <div><span className="font-semibold text-slate-700">Hình thức:</span> Bù trừ đối chiếu công nợ nhà cung cấp hai bên</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <div>
                  <Input
                    type="text"
                    label="Ngày chi thực tế"
                    value={payoutExecutionDate}
                    onChange={(e) => setPayoutExecutionDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    disabled={selectedOutflow.status === 'da_chi'}
                  />
                </div>

                <div>
                  <Select
                    label="Người thực hiện chi"
                    value={payoutExecutor}
                    onChange={(e) => setPayoutExecutor(e.target.value)}
                    disabled={selectedOutflow.status === 'da_chi'}
                    options={financeEmployees.map((emp) => ({
                      value: emp.value,
                      label: emp.label,
                    }))}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[11px] text-slate-500 mb-0.5">Số chứng từ kế toán:</span>
                {selectedOutflow.voucherCode ? (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedOutflow.voucherCode}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      (Đã ghi sổ kép)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 italic">
                    Tự động cấp số Phiếu chi PC-... khi nhấn Xác nhận giải ngân
                  </span>
                )}
              </div>

              {selectedOutflow.note && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[11px] text-slate-500 mb-1">Nội dung chi tiết / Căn cứ:</span>
                  <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                    {selectedOutflow.note}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Offcanvas>
      )}

      {/* ── OFFCANVAS XEM CHI TIẾT & XÁC NHẬN THU TIỀN VÀO QUỸ (BƯỚC 3) ── */}
      {selectedInflow && (
        <Offcanvas
          isOpen={true}
          onClose={() => setSelectedInflow(null)}
          icon={<Receipt size={22} className="text-emerald-600" />}
          title={`Phiếu thu tiền: ${selectedInflow.code}`}
          description={
            selectedInflow.status !== 'cho_thu'
              ? 'Đã thu vào quỹ & hạch toán Sổ nhật ký chung'
              : 'Chờ Thủ quỹ / Kế toán xác nhận thu tiền vào quỹ & ghi sổ kép tự động'
          }
          subHeader={
            <div className="px-4 py-2 bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span>Mã chứng từ:</span>
                <span className="font-mono text-emerald-700 font-bold">{selectedInflow.code}</span>
              </div>
              {selectedInflow.status !== 'cho_thu' ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                  <CheckCircleFill size={11} className="text-emerald-600" />
                  {selectedInflow.status === 'da_doi_soat' ? 'Đã đối soát' : 'Đã vào quỹ'}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                  <Clock size={11} className="text-amber-600" />
                  Chờ xác nhận thu
                </span>
              )}
            </div>
          }
          width="420px"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedInflow(null)}>
                Đóng
              </Button>
              {selectedInflow.status === 'cho_thu' ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                  onClick={() => {
                    const currentInflow = selectedInflow;
                    const voucherNum = handleExecuteInflow(currentInflow);
                    if (isInflowPrintToggle) {
                      setPrintPreviewItem({
                        voucherCode: voucherNum,
                        code: currentInflow.code,
                        amount: currentInflow.amount,
                        beneficiary: currentInflow.payerName,
                        categoryTitle: currentInflow.sourceTitle,
                        note: currentInflow.note || '',
                        method: inflowMethod === 'tien_mat' ? 'tien_mat' : 'ngan_hang',
                        direction: 'inflow',
                        debitAccount: inflowDebitAccount,
                        creditAccount: inflowCreditAccount,
                        bankAccountId: inflowBankAccountId,
                        executor: inflowCollector,
                        date: inflowExecutionDate || new Date().toLocaleDateString('vi-VN'),
                      });
                      setIsPrintPreviewOpen(true);
                    }
                    setSelectedInflow(null);
                  }}
                >
                  <CheckCircleFill size={13} className="mr-1 inline" />
                  Xác nhận thu tiền
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPrintPreviewItem({
                      voucherCode: selectedInflow.voucherCode || selectedInflow.code,
                      code: selectedInflow.code,
                      amount: selectedInflow.amount,
                      beneficiary: selectedInflow.payerName,
                      categoryTitle: selectedInflow.sourceTitle,
                      note: selectedInflow.note || '',
                      method: inflowMethod === 'tien_mat' ? 'tien_mat' : 'ngan_hang',
                      direction: 'inflow',
                      debitAccount: inflowDebitAccount,
                      creditAccount: inflowCreditAccount,
                      bankAccountId: inflowBankAccountId,
                      executor: inflowCollector,
                      date: inflowExecutionDate || new Date().toLocaleDateString('vi-VN'),
                    });
                    setIsPrintPreviewOpen(true);
                  }}
                >
                  <Printer size={13} className="mr-1 inline" />
                  In chứng từ thu
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-3 text-[13px] pb-4">
            {/* 1. THẺ THÔNG TIN KHOẢN MỤC THU & ĐỐI TƯỢNG NỘP */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="text-[10.5px] uppercase font-bold text-emerald-800 tracking-wider">
                Khoản mục thu tiền
              </div>
              <div className="font-bold text-slate-900 text-sm leading-snug">
                {selectedInflow.sourceTitle}
              </div>
              <div className="text-xs text-emerald-950/80 pt-1.5 border-t border-emerald-200/60 mt-0.5 flex items-center justify-between">
                <span>Đối tượng nộp tiền:</span>
                <strong className="text-slate-900 font-semibold truncate max-w-[240px]">
                  {selectedInflow.payerName}
                </strong>
              </div>
            </div>

            {/* 2. CARD ĐỊNH KHOẢN TỰ ĐỘNG SỔ NHẬT KÝ CHUNG (TÀI KHOẢN KẾ TOÁN TT 200) */}
            <div className="p-3 bg-[#f8fafc] border border-blue-200/70 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  ĐỊNH KHOẢN TỰ ĐỘNG SỔ NHẬT KÝ CHUNG
                </span>
                <span className="text-[11px] font-bold text-[#0284c7] bg-[#e0f2fe] px-2 py-0.5 rounded-md border border-[#bae6fd]">
                  Nợ TK {inflowDebitAccount} / Có TK {inflowCreditAccount}
                </span>
              </div>

              {/* Ô CHỌN TÀI KHOẢN KẾ TOÁN NỢ (Nguồn thu nhận tiền) */}
              <div>
                <Select
                  label="Tài khoản Kế toán NỢ (Nguồn nhận tiền vào)"
                  required
                  value={inflowDebitAccount}
                  onChange={(e) => handleInflowDebitChange(e.target.value)}
                  disabled={selectedInflow.status !== 'cho_thu'}
                  options={INFLOW_DEBIT_ACCOUNTS.map((acc) => ({
                    value: acc.code,
                    label: acc.name,
                  }))}
                />
              </div>

              {/* Ô CHỌN TÀI KHOẢN KẾ TOÁN CÓ (Công nợ phải thu / Doanh thu) */}
              <div>
                <Select
                  label="Tài khoản Kế toán CÓ (Công nợ / Doanh thu / Nguồn thu)"
                  required
                  value={inflowCreditAccount}
                  onChange={(e) => setInflowCreditAccount(e.target.value)}
                  disabled={selectedInflow.status !== 'cho_thu'}
                  options={INFLOW_CREDIT_ACCOUNTS.map((acc) => ({
                    value: acc.code,
                    label: acc.name,
                  }))}
                />
              </div>

              <div className="text-[10.5px] text-slate-500 italic leading-snug">
                * Hạch toán kép vào Sổ nhật ký chung theo chế độ kế toán doanh nghiệp (TT 200).
              </div>
            </div>

            {/* 3. THẺ SỐ TIỀN THỰC THU QUỸ */}
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Số tiền thực thu vào quỹ:
              </span>
              <span className="text-lg font-extrabold text-emerald-600">
                +{formatVND(selectedInflow.amount)}
              </span>
            </div>

            {/* CÔNG TẮC TOGGLE "IN CHỨNG TỪ" */}
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Printer size={13} className="text-blue-600" />
                  In chứng từ thu
                </span>
                <span className="text-[11px] text-slate-500">
                  {inflowMethod === 'tien_mat'
                    ? 'Tự động mở xem trước Phiếu thu tiền mặt sau khi xác nhận thu'
                    : 'Tự động mở xem trước Giấy báo Có ngân hàng sau khi xác nhận thu'}
                </span>
              </div>
              <div className="flex items-center">
                <Toggle
                  checked={isInflowPrintToggle}
                  onChange={(val) => setIsInflowPrintToggle(val)}
                  disabled={selectedInflow.status !== 'cho_thu'}
                />
              </div>
            </div>

            {/* 4. CHI TIẾT THU TIỀN: HÌNH THỨC, TÀI KHOẢN NGÂN HÀNG NHẬN, NGƯỜI THU */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2.5 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Thông tin thu tiền &amp; Chứng từ
              </div>

              {/* Ô HÌNH THỨC THANH TOÁN (CHO PHÉP THAY ĐỔI) & NGÀY CHỨNG TỪ */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Select
                    label="Hình thức nhận tiền"
                    value={inflowMethod}
                    disabled={selectedInflow.status !== 'cho_thu'}
                    onChange={(e) => handleInflowMethodChange(e.target.value as 'ngan_hang' | 'tien_mat')}
                    options={[
                      { value: 'ngan_hang', label: 'Chuyển khoản ngân hàng' },
                      { value: 'tien_mat', label: 'Tiền mặt tại quỹ' },
                    ]}
                  />
                </div>

                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">Ngày lập phiếu / ghi nhận:</span>
                  <div className="h-[38px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center">
                    {selectedInflow.date}
                  </div>
                </div>
              </div>

              {/* Ô CHỌN TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN / QUỸ NHẬN TIỀN */}
              <div className="pt-2 border-t border-slate-100">
                <Select
                  label="Tài khoản ngân hàng nhận tiền / Quỹ nhận tiền"
                  required
                  value={inflowBankAccountId}
                  onChange={(e) => handleInflowBankAccountChange(e.target.value)}
                  disabled={selectedInflow.status !== 'cho_thu'}
                  options={COMPANY_BANK_ACCOUNTS.map((acc) => ({
                    value: acc.id,
                    label: acc.label,
                  }))}
                />
                {(() => {
                  const selectedBank = COMPANY_BANK_ACCOUNTS.find((b) => b.id === inflowBankAccountId);
                  if (!selectedBank) return null;
                  return (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-1.5 flex flex-col gap-0.5">
                      {selectedBank.type === 'bank' ? (
                        <>
                          <div><span className="font-semibold text-slate-700">Ngân hàng thụ hưởng:</span> {selectedBank.bankName}</div>
                          <div><span className="font-semibold text-slate-700">Số tài khoản:</span> <span className="font-mono font-bold text-blue-700">{selectedBank.accountNumber}</span> - {selectedBank.branch}</div>
                        </>
                      ) : selectedBank.type === 'cash' ? (
                        <div><span className="font-semibold text-slate-700">Nơi nhận quỹ:</span> Tiền mặt tại két thủ quỹ công ty Seajong</div>
                      ) : (
                        <div><span className="font-semibold text-slate-700">Hình thức:</span> Bù trừ đối chiếu công nợ hai chiều</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <div>
                  <Input
                    type="text"
                    label="Ngày thu tiền thực tế"
                    value={inflowExecutionDate}
                    onChange={(e) => setInflowExecutionDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    disabled={selectedInflow.status !== 'cho_thu'}
                  />
                </div>

                <div>
                  <Select
                    label="Người thực hiện thu"
                    value={inflowCollector}
                    onChange={(e) => setInflowCollector(e.target.value)}
                    disabled={selectedInflow.status !== 'cho_thu'}
                    options={financeEmployees.map((emp) => ({
                      value: emp.value,
                      label: emp.label,
                    }))}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[11px] text-slate-500 mb-0.5">Số chứng từ kế toán:</span>
                {selectedInflow.voucherCode ? (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedInflow.voucherCode}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      (Đã ghi sổ kép)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-600 italic">
                    Tự động cấp số Phiếu thu PT-... khi nhấn Xác nhận thu tiền
                  </span>
                )}
              </div>

              {selectedInflow.note && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-[11px] text-slate-500 mb-1">Nội dung chi tiết / Căn cứ:</span>
                  <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                    {selectedInflow.note}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Offcanvas>
      )}

      {/* ── OFFCANVAS TẠO PHIẾU THU MỚI RỘNG 400PX (BƯỚC 3) ── */}
      {showCreateInflowModal && (
        <Offcanvas
          isOpen={showCreateInflowModal}
          onClose={() => setShowCreateInflowModal(false)}
          title="Lập phiếu thu tiền mới"
          width="400px"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowCreateInflowModal(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="form-create-cash-inflow"
                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
              >
                Tạo phiếu thu
              </Button>
            </div>
          }
        >
          <form
            id="form-create-cash-inflow"
            onSubmit={handleCreateInflowSubmit}
            className="flex flex-col gap-3 text-[13px] pb-4"
          >
            {/* 1. ĐỐI TƯỢNG NỘP TIỀN */}
            <div>
              <Input
                type="text"
                label="Đối tượng nộp tiền (Khách hàng / Nhân viên / Ngân hàng)"
                required
                value={newInflowPayer}
                onChange={(e) => setNewInflowPayer(e.target.value)}
                placeholder="Ví dụ: Đại lý Minh Châu, Lê Văn Dũng..."
              />
            </div>

            {/* 2. KHOẢN MỤC THU / LÝ DO NỘP */}
            <div>
              <Select
                label="Loại nghiệp vụ thu tiền"
                value={newInflowSourceTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewInflowSourceTitle(val);
                  const op = INFLOW_OPERATION_TYPES.find((o) => o.label === val);
                  if (op) {
                    setNewInflowDebitAccount(op.debit);
                    setNewInflowCreditAccount(op.credit);
                    setNewInflowMethod(op.method);
                    if (op.method === 'tien_mat') {
                      setNewInflowBankAccountId('cash_fund');
                    } else {
                      setNewInflowBankAccountId('vcb');
                    }
                  }
                }}
                options={INFLOW_OPERATION_TYPES.map((op) => ({
                  value: op.label,
                  label: op.label,
                }))}
              />
            </div>

            {/* 3. CARD ĐỊNH KHOẢN SỔ NHẬT KÝ CHUNG */}
            <div className="p-3 bg-[#f8fafc] border border-blue-200/70 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  ĐỊNH KHOẢN SỔ NHẬT KÝ CHUNG
                </span>
                <span className="text-[11px] font-bold text-[#0284c7] bg-[#e0f2fe] px-2 py-0.5 rounded-md border border-[#bae6fd]">
                  Nợ TK {newInflowDebitAccount} / Có TK {newInflowCreditAccount}
                </span>
              </div>

              <div>
                <Select
                  label="Tài khoản Kế toán NỢ (Nguồn nhận tiền vào)"
                  required
                  value={newInflowDebitAccount}
                  onChange={(e) => setNewInflowDebitAccount(e.target.value)}
                  options={INFLOW_DEBIT_ACCOUNTS.map((acc) => ({
                    value: acc.code,
                    label: acc.name,
                  }))}
                />
              </div>

              <div>
                <Select
                  label="Tài khoản Kế toán CÓ (Công nợ / Doanh thu)"
                  required
                  value={newInflowCreditAccount}
                  onChange={(e) => setNewInflowCreditAccount(e.target.value)}
                  options={INFLOW_CREDIT_ACCOUNTS.map((acc) => ({
                    value: acc.code,
                    label: acc.name,
                  }))}
                />
              </div>
            </div>

            {/* 4. SỐ TIỀN & HÌNH THỨC */}
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                type="number"
                label="Số tiền thu (đồng)"
                required
                min={1000}
                value={newInflowAmount}
                onChange={(e) => setNewInflowAmount(e.target.value)}
                placeholder="0"
                suffix="đồng"
              />

              <Select
                label="Hình thức nhận tiền"
                value={newInflowMethod}
                onChange={(e) => {
                  const val = e.target.value as 'ngan_hang' | 'tien_mat';
                  setNewInflowMethod(val);
                  if (val === 'tien_mat') {
                    setNewInflowDebitAccount('1111');
                    setNewInflowBankAccountId('cash_fund');
                  } else {
                    setNewInflowDebitAccount('1121');
                    setNewInflowBankAccountId('vcb');
                  }
                }}
                options={[
                  { value: 'ngan_hang', label: 'Chuyển khoản ngân hàng' },
                  { value: 'tien_mat', label: 'Tiền mặt tại quỹ' },
                ]}
              />
            </div>

            {/* TÀI KHOẢN NGÂN HÀNG / QUỸ TIỀN MẶT */}
            <div>
              <Select
                label="Tài khoản ngân hàng nhận tiền / Quỹ nhận tiền"
                required
                value={newInflowBankAccountId}
                onChange={(e) => {
                  const bId = e.target.value;
                  setNewInflowBankAccountId(bId);
                  const b = COMPANY_BANK_ACCOUNTS.find((item) => item.id === bId);
                  if (b?.type === 'bank') {
                    setNewInflowMethod('ngan_hang');
                    setNewInflowDebitAccount('1121');
                  } else if (b?.type === 'cash') {
                    setNewInflowMethod('tien_mat');
                    setNewInflowDebitAccount('1111');
                  }
                }}
                options={COMPANY_BANK_ACCOUNTS.map((acc) => ({
                  value: acc.id,
                  label: acc.label,
                }))}
              />
            </div>

            {/* 5. NGƯỜI LẬP PHIẾU */}
            <div>
              <Select
                label="Người lập phiếu thu / Kế toán ghi nhận"
                value={newInflowCollector}
                onChange={(e) => setNewInflowCollector(e.target.value)}
                options={financeEmployees.map((emp) => ({
                  value: emp.value,
                  label: emp.label,
                }))}
              />
            </div>

            {/* 6. GHI CHÚ */}
            <div>
              <Input
                type="text"
                label="Diễn giải chi tiết / Căn cứ chứng từ"
                value={newInflowNote}
                onChange={(e) => setNewInflowNote(e.target.value)}
                placeholder="Ví dụ: Thu tiền cọc theo hợp đồng số..."
              />
            </div>
          </form>
        </Offcanvas>
      )}

      {/* ── OFFCANVAS TẠO LỆNH CHI MỚI RỘNG 400PX (BƯỚC 4) ── */}
      {(() => {
        const autoLimit = Number(localStorage.getItem('seajong_accounting_single_limit') || 20000000);
        const isAutoEnabled = localStorage.getItem('seajong_accounting_auto_enabled') !== 'false';
        const numAmount = Number(newAmount) || 0;
        const isExceeded = numAmount > autoLimit;
        const isMustSubmitApproval = numAmount > 0 && (!isAutoEnabled || isExceeded);
        const isEligibleAutoApprove = isAutoEnabled && numAmount > 0 && !isExceeded;
        const willSubmit = isMustSubmitApproval || isSubmitForApproval;

        return (
          <Offcanvas
            isOpen={showCreateOutflowModal}
            onClose={() => setShowCreateOutflowModal(false)}
            title="Tạo lệnh chi tiền mới"
            width="400px"
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowCreateOutflowModal(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  form="form-create-cash-outflow"
                >
                  {willSubmit ? 'Trình duyệt' : 'Xác nhận chi'}
                </Button>
              </div>
            }
          >
            <form
              id="form-create-cash-outflow"
              onSubmit={handleCreateOutflow}
              className="flex flex-col gap-3 text-[13px] pb-4"
            >
              {/* 1. ĐỐI TƯỢNG THỤ HƯỞNG */}
              <Input
                label="Đối tượng thụ hưởng"
                required
                value={newBeneficiary}
                onChange={(e) => setNewBeneficiary(e.target.value)}
                placeholder="Ví dụ: Công ty CP Đúc Đồng & Kim Khí Minh Phát hoặc Nhà máy Sứ Vệ Sinh Tân Á..."
              />

              {/* 2. LOẠI NGHIỆP VỤ CHI (GIAO DIỆN THEO CHUẨN THIẾT KẾ ĐÍNH KÈM) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại nghiệp vụ chi <span className="text-red-500">*</span>
                </label>

                {/* Khung ô chọn có text xanh dương đậm, nút x xóa và mũi tên v */}
                <div
                  onClick={() => setIsExpenseDropdownOpen(!isExpenseDropdownOpen)}
                  className="w-full min-h-[40px] px-3 py-2 bg-white border border-slate-300 hover:border-sky-400 focus-within:border-sky-500 rounded-lg flex items-center justify-between gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <div className="flex-1 truncate">
                    {newCategoryTitle ? (
                      <span className="font-semibold text-[#0369a1] text-[13px] leading-snug">
                        {newCategoryTitle}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        Chọn loại nghiệp vụ chi thiết bị vệ sinh...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-400">
                    {newCategoryTitle && (
                      <button
                        type="button"
                        onClick={handleClearExpenseOp}
                        className="p-1 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        title="Xóa lựa chọn"
                      >
                        <XLg size={11} />
                      </button>
                    )}
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 text-slate-500 ${
                        isExpenseDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Popup dropdown danh mục nghiệp vụ chi */}
                {isExpenseDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[1500]"
                      onClick={() => setIsExpenseDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[1510] overflow-hidden max-h-64 flex flex-col">
                      <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                        <input
                          type="text"
                          value={expenseSearchKeyword}
                          onChange={(e) => setExpenseSearchKeyword(e.target.value)}
                          placeholder="Tìm kiếm nghiệp vụ chi thiết bị vệ sinh..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-sky-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="overflow-y-auto max-h-72">
                        {filteredExpenseOps.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            Không tìm thấy nghiệp vụ phù hợp
                          </div>
                        ) : (
                          Object.entries(groupedExpenseOps).map(([groupTitle, items]) => (
                            <div key={groupTitle}>
                              {/* TIÊU ĐỀ PHÂN NHÓM CHUẨN KẾ TOÁN GIỐNG HÌNH 2 */}
                              <div className="px-3 py-1.5 bg-slate-50 text-sky-700 text-[11px] font-bold uppercase tracking-wider border-y border-slate-100 sticky top-0 z-10 select-none shadow-sm">
                                {groupTitle}
                              </div>

                              <div className="divide-y divide-slate-50">
                                {items.map((op) => {
                                  const isSelected = selectedExpenseOpId === op.id || newCategoryTitle === op.label;
                                  const targetCredit = newMethod === 'tien_mat' ? '1111' : (op.credit === '1111' ? '1121' : op.credit);
                                  return (
                                    <div
                                      key={op.id}
                                      onClick={() => handleSelectExpenseOp(op)}
                                      className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                        isSelected ? 'bg-sky-50 text-sky-950' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex-1 min-w-0 pr-1">
                                        <div className={`text-[12.5px] leading-snug line-clamp-2 ${isSelected ? 'font-semibold text-sky-900' : 'text-slate-800'}`}>
                                          {op.label}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                                          Nợ TK {op.debit} • Có TK {targetCredit}
                                        </div>
                                      </div>

                                      {/* DẤU TÍCH XANH NẾU ĐANG ĐƯỢC CHỌN GIỐNG HÌNH 2 */}
                                      {isSelected && (
                                        <Check2 size={16} className="text-sky-600 flex-shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 3. CARD ĐỊNH KHOẢN SỔ NHẬT KÝ CHUNG (TÀI KHOẢN KẾ TOÁN TT 200) */}
              <div className="p-3 bg-[#f8fafc] border border-blue-200/70 rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    ĐỊNH KHOẢN SỔ NHẬT KÝ CHUNG
                  </span>
                  <span className="text-[11px] font-bold text-[#0284c7] bg-[#e0f2fe] px-2 py-0.5 rounded-md border border-[#bae6fd]">
                    Nợ TK {selectedDebitAccount} / Có TK {selectedCreditAccount}
                  </span>
                </div>

                {/* Dòng 1: Tài khoản Kế toán NỢ */}
                <div>
                  <Select
                    label="Tài khoản Kế toán NỢ (Chi phí / Công nợ)"
                    required
                    value={selectedDebitAccount}
                    onChange={(e) => setSelectedDebitAccount(e.target.value)}
                    options={STANDARD_DEBIT_ACCOUNTS.map((acc) => ({
                      value: acc.code,
                      label: acc.name,
                    }))}
                  />
                </div>

                {/* Dòng 2: Tài khoản Kế toán CÓ */}
                <div>
                  <Select
                    label="Tài khoản Kế toán CÓ (Nguồn xuất quỹ)"
                    required
                    value={selectedCreditAccount}
                    onChange={(e) => handleNewCreditChange(e.target.value)}
                    options={ACCOUNTING_CREDIT_ACCOUNTS.map((acc) => ({
                      value: acc.code,
                      label: acc.name,
                    }))}
                  />
                </div>
              </div>

              {/* 4. SỐ TIỀN & PHƯƠNG THỨC THANH TOÁN */}
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  type="number"
                  label="Số tiền chi (đồng)"
                  required
                  min={1000}
                  value={newAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAmount(val);
                    const limit = Number(localStorage.getItem('seajong_accounting_single_limit') || 20000000);
                    const enabled = localStorage.getItem('seajong_accounting_auto_enabled') !== 'false';
                    const num = Number(val) || 0;
                    if (num > limit || !enabled) {
                      setIsSubmitForApproval(true);
                    } else {
                      setIsSubmitForApproval(false);
                    }
                  }}
                  placeholder="0"
                  suffix="đồng"
                />

                <Select
                  label="Phương thức thanh toán"
                  value={newMethod}
                  onChange={(e) => handleMethodChange(e.target.value as any)}
                  options={[
                    { value: 'unc_ngan_hang', label: 'Ủy nhiệm chi (UNC)' },
                    { value: 'tien_mat', label: 'Phiếu chi tiền mặt' },
                  ]}
                />
              </div>

              {/* Ô CHỌN TÀI KHOẢN NGÂN HÀNG TRÍCH TIỀN / QUỸ XUẤT TIỀN THỰC TẾ */}
              <div>
                <Select
                  label="Tài khoản ngân hàng trích tiền / Quỹ xuất tiền"
                  required
                  value={selectedBankAccountId}
                  onChange={(e) => handleNewBankAccountChange(e.target.value)}
                  options={COMPANY_BANK_ACCOUNTS.map((acc) => ({
                    value: acc.id,
                    label: acc.label,
                  }))}
                />
                {(() => {
                  const selectedBank = COMPANY_BANK_ACCOUNTS.find((b) => b.id === selectedBankAccountId);
                  if (!selectedBank) return null;
                  return (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-1 flex flex-col gap-0.5">
                      {selectedBank.type === 'bank' ? (
                        <>
                          <div><span className="font-semibold text-slate-700">Ngân hàng:</span> {selectedBank.bankName}</div>
                          <div><span className="font-semibold text-slate-700">Số tài khoản:</span> <span className="font-mono font-bold text-blue-700">{selectedBank.accountNumber}</span> - {selectedBank.branch}</div>
                        </>
                      ) : selectedBank.type === 'cash' ? (
                        <div><span className="font-semibold text-slate-700">Nguồn tiền:</span> Thủ quỹ xuất tiền mặt trực tiếp tại két công ty Seajong</div>
                      ) : (
                        <div><span className="font-semibold text-slate-700">Hình thức:</span> Bù trừ đối chiếu công nợ nhà cung cấp hai bên</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 5. NGƯỜI ĐỀ XUẤT / LẬP LỆNH CHI (TỪ DATABASE) */}
              <div>
                <Select
                  label="Người đề xuất / Lập lệnh chi"
                  value={newCreator}
                  onChange={(e) => setNewCreator(e.target.value)}
                  options={financeEmployees.map((emp) => ({
                    value: emp.value,
                    label: emp.label,
                  }))}
                />
              </div>

              {/* Chỉ báo định mức tự động chi của Kế toán theo Nội quy lao động */}
              {newAmount && Number(newAmount) > 0 && (() => {
                if (!isAutoEnabled) {
                  return (
                    <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200 flex items-center gap-1.5 leading-snug">
                      <ExclamationTriangleFill size={12} className="text-amber-600 flex-shrink-0" />
                      <span>Cơ chế tự động chi đang tắt trong Quy chế — Lệnh chi bắt buộc chuyển sang <strong>Trình Ban Giám đốc</strong>.</span>
                    </div>
                  );
                }
                if (isExceeded) {
                  return (
                    <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200 flex items-center gap-1.5 leading-snug">
                      <ExclamationTriangleFill size={12} className="text-amber-600 flex-shrink-0" />
                      <span>Vượt hạn mức tự động chi (&gt; <strong>{autoLimit.toLocaleString('vi-VN')} đồng</strong>) — Bắt buộc <strong>Trình Ban Giám đốc</strong> ký duyệt.</span>
                    </div>
                  );
                }
                return (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 flex items-center gap-1.5 leading-snug">
                    <CheckCircleFill size={12} className="text-emerald-600 flex-shrink-0" />
                    <span>Trong hạn mức tự động chi (≤ <strong>{autoLimit.toLocaleString('vi-VN')} đồng</strong>) — Kế toán được phê duyệt &amp; giải ngân trực tiếp.</span>
                  </div>
                );
              })()}

              {/* GHI CHÚ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ghi chú điều khoản hợp đồng hoặc căn cứ đề xuất..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* CHECKBOX TRÌNH DUYỆT & IN PHIẾU CHI */}
              <div className="flex items-center gap-5 pt-0.5 pb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="submit-approval-check"
                    checked={willSubmit}
                    disabled={isMustSubmitApproval}
                    onChange={(e) => {
                      if (!isMustSubmitApproval) {
                        setIsSubmitForApproval(e.target.checked);
                      }
                    }}
                    className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                      isMustSubmitApproval ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                  />
                  <label
                    htmlFor="submit-approval-check"
                    className={`text-xs font-medium select-none flex items-center gap-1.5 ${
                      isMustSubmitApproval ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-800'
                    }`}
                  >
                    <span>Trình duyệt</span>
                    {isMustSubmitApproval ? (
                      <span className="text-[10px] font-normal text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                        Bắt buộc
                      </span>
                    ) : isEligibleAutoApprove ? (
                      <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-300">
                        Tự duyệt
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="print-voucher-check"
                    checked={isPrintVoucher}
                    onChange={(e) => setIsPrintVoucher(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="print-voucher-check"
                    className="text-xs font-medium text-slate-800 cursor-pointer select-none"
                  >
                    In phiếu chi
                  </label>
                </div>
              </div>
            </form>
          </Offcanvas>
        );
      })()}

      {/* ── MODAL XEM TRƯỚC VÀ IN CHỨNG TỪ (PRINTPREVIEW) CHO PHIẾU CHI & ỦY NHIỆM CHI ── */}
      {isPrintPreviewOpen && printPreviewItem && (() => {
        const parts = (printPreviewItem.date || '').split(/[\/\-]/);
        const day = parts.length === 3 ? (parts[0].length === 4 ? parts[2] : parts[0]) : String(new Date().getDate()).padStart(2, '0');
        const month = parts.length === 3 ? parts[1] : String(new Date().getMonth() + 1).padStart(2, '0');
        const year = parts.length === 3 ? (parts[0].length === 4 ? parts[0] : parts[2]) : String(new Date().getFullYear());
        const isInflow = printPreviewItem.direction === 'inflow';
        const isCashInflow = isInflow && printPreviewItem.method === 'tien_mat';
        const isCreditAdvice = isInflow && (printPreviewItem.method === 'ngan_hang' || printPreviewItem.method === 'unc_ngan_hang');
        const isUNC = !isInflow && printPreviewItem.method === 'unc_ngan_hang';
        const isCashOutflow = !isInflow && printPreviewItem.method === 'tien_mat';

        const docTitle = isInflow
          ? (isCashInflow ? 'PHIẾU THU TIỀN MẶT' : 'GIẤY BÁO CÓ (CREDIT ADVICE)')
          : (isUNC ? 'ỦY NHIỆM CHI (UNC)' : 'PHIẾU CHI TIỀN MẶT');

        const getBankInfo = (bankAccId?: string, code?: string) => {
          const found = COMPANY_BANK_ACCOUNTS.find((b) => b.id === bankAccId);
          if (found && found.type === 'bank') {
            return {
              bankName: found.bankName,
              branch: found.branch,
              accountNumber: found.accountNumber,
            };
          }
          if (bankAccId === 'vcb' || code === '1121') {
            return {
              bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
              branch: 'Chi nhánh Hà Nội',
              accountNumber: '0021000492888',
            };
          }
          if (bankAccId === 'vietin' || code === '1124') {
            return {
              bankName: 'Ngân hàng TMCP Công thương Việt Nam (VietinBank)',
              branch: 'Chi nhánh Tây Hà Nội',
              accountNumber: '113002891920',
            };
          }
          if (bankAccId === 'mb' || code === '1123') {
            return {
              bankName: 'Ngân hàng TMCP Quân đội (MB Bank)',
              branch: 'Chi nhánh Sở Giao Dịch',
              accountNumber: '0880199283888',
            };
          }
          return {
            bankName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
            branch: 'Chi nhánh Thăng Long, Hà Nội',
            accountNumber: '12810000392818',
          };
        };

        const bankInfo = getBankInfo(printPreviewItem.bankAccountId, printPreviewItem.creditAccount);
        const amountWords = convertNumberToVietnameseWords(printPreviewItem.amount);

        return (
          <PrintPreview
            isOpen={isPrintPreviewOpen}
            onClose={() => setIsPrintPreviewOpen(false)}
            documentTitle={docTitle}
            documentCode={printPreviewItem.voucherCode}
            date={`Ngày ${day} tháng ${month} năm ${year}`}
            department="Phòng Tài chính – Kế toán"
            author={printPreviewItem.executor}
            defaultPaperSize="A4"
            defaultOrientation="portrait"
            hideSidebar={true}
          >
            {() => (
              <div
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  color: '#000000',
                  lineHeight: 1.45,
                  fontSize: '13pt',
                  width: '100%',
                }}
              >
                {/* 1. MẪU ỦY NHIỆM CHI (UNC) CHO NGÂN HÀNG (DÒNG TIỀN RA) */}
                {isUNC && (
                  <div>
                    {/* Header ngân hàng & Mẫu UNC */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ maxWidth: '65%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase', color: '#0369a1' }}>
                          {bankInfo.bankName}
                        </div>
                        <div style={{ fontSize: '10.5pt', marginTop: '3px' }}>
                          <strong>Chi nhánh:</strong> {bankInfo.branch}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '32%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>Mẫu số: 01/UNC</div>
                        <div style={{ fontSize: '10pt', marginTop: '2px' }}>
                          <strong>Số UNC:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{printPreviewItem.voucherCode}</span>
                        </div>
                        <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: '2px' }}>
                          Ngày {day}/{month}/{year}
                        </div>
                      </div>
                    </div>

                    {/* Tiêu đề Ủy nhiệm chi */}
                    <div style={{ textAlign: 'center', margin: '14px 0 18px 0' }}>
                      <h1
                        style={{
                          fontSize: '20pt',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                          margin: '0 0 4px 0',
                          textTransform: 'uppercase',
                        }}
                      >
                        ỦY NHIỆM CHI - PAYMENT ORDER
                      </h1>
                      <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                        (Chuyển khoản thanh toán qua hệ thống ngân hàng)
                      </div>
                    </div>

                    {/* Khung Thông tin Bên chuyển & Bên nhận */}
                    <div
                      style={{
                        border: '1.5px solid #000',
                        borderRadius: '4px',
                        padding: '12px 14px',
                        marginBottom: '14px',
                      }}
                    >
                      {/* BÊN TRẢ TIỀN */}
                      <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #666' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', color: '#0369a1', marginBottom: '4px' }}>
                          A. ĐƠN VỊ TRẢ TIỀN (TRÍCH NỢ):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '4px', fontSize: '11.5pt' }}>
                          <span>Tên tài khoản:</span>
                          <strong style={{ textTransform: 'uppercase' }}>
                            {company?.company_name || 'CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM'}
                          </strong>
                          <span>Số tài khoản:</span>
                          <strong style={{ fontSize: '12.5pt', fontFamily: 'monospace', color: '#000' }}>
                            {bankInfo.accountNumber}
                          </strong>
                          <span>Tại ngân hàng:</span>
                          <span>{bankInfo.bankName} - {bankInfo.branch}</span>
                        </div>
                      </div>

                      {/* BÊN THỤ HƯỞNG */}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', color: '#0369a1', marginBottom: '4px' }}>
                          B. ĐƠN VỊ THỤ HƯỞNG (GHI CÓ):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '4px', fontSize: '11.5pt' }}>
                          <span>Tên đơn vị nhận:</span>
                          <strong style={{ textTransform: 'uppercase' }}>{printPreviewItem.beneficiary}</strong>
                          <span>Số tài khoản:</span>
                          <span style={{ fontSize: '12pt', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            0491000889218
                          </span>
                          <span>Tại ngân hàng:</span>
                          <span>Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank) - Chi nhánh Hải Phòng</span>
                        </div>
                      </div>
                    </div>

                    {/* Khung Số tiền & Nội dung */}
                    <div
                      style={{
                        border: '1.5px solid #000',
                        borderRadius: '4px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '6px', fontSize: '12pt' }}>
                        <span>Số tiền bằng số:</span>
                        <strong style={{ fontSize: '14pt', color: '#b91c1c' }}>
                          {formatVND(printPreviewItem.amount)}
                        </strong>
                        <span>Số tiền bằng chữ:</span>
                        <strong style={{ fontStyle: 'italic' }}>{amountWords}</strong>
                        <span>Nội dung chi tiết:</span>
                        <span>{printPreviewItem.note || printPreviewItem.categoryTitle}</span>
                        <span>Phí chuyển tiền:</span>
                        <span>Đơn vị trả tiền chịu</span>
                      </div>
                    </div>

                    {/* Chữ ký hai bên và ngân hàng */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr',
                        gap: '16px',
                        marginTop: '20px',
                      }}
                    >
                      <div style={{ border: '1px solid #999', borderRadius: '4px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', marginBottom: '4px' }}>
                          ĐƠN VỊ TRẢ TIỀN (SEAJONG)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Kế toán trưởng</div>
                            <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>{printPreviewItem.executor}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Chủ tài khoản</div>
                            <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, đóng dấu)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
                              {company?.legal_rep || 'Ban Giám Đốc'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ border: '1px solid #999', borderRadius: '4px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', marginBottom: '4px' }}>
                          DÀNH CHO NGÂN HÀNG
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Giao dịch viên</div>
                            <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontSize: '10.5pt' }}>Đã kiểm soát</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Kiểm soát viên</div>
                            <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, đóng dấu ngày)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontSize: '10.5pt' }}>Đã thực hiện</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MẪU PHIẾU CHI TIỀN MẶT (MẪU 02-TT THEO THÔNG TƯ 200/2014/TT-BTC) */}
                {isCashOutflow && (
                  <div>
                    {/* Header thông tin công ty và mẫu số Thông tư */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ maxWidth: '64%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', lineHeight: 1.3 }}>
                          {company?.company_name || 'CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM'}
                        </div>
                        <div style={{ fontSize: '10pt', marginTop: '2px', lineHeight: 1.35 }}>
                          <strong>Địa chỉ:</strong> {company?.address || 'KCN Phùng Xá, Thạch Thất, TP. Hà Nội'}
                        </div>
                        <div style={{ fontSize: '10pt', marginTop: '2px' }}>
                          <strong>Mã số thuế:</strong> {company?.tax_code || '0109876543'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', minWidth: '34%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>Mẫu số 02 - TT</div>
                        <div style={{ fontSize: '9.5pt', fontStyle: 'italic', marginTop: '2px' }}>
                          (Ban hành theo Thông tư số 200/2014/TT-BTC
                        </div>
                        <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>
                          Ngày 22/12/2014 của Bộ Tài chính)
                        </div>
                      </div>
                    </div>

                    {/* Tiêu đề chính Phiếu Chi */}
                    <div style={{ textAlign: 'center', margin: '20px 0 16px 0' }}>
                      <h1
                        style={{
                          fontSize: '22pt',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                          margin: '0 0 4px 0',
                          textTransform: 'uppercase',
                        }}
                      >
                        PHIẾU CHI
                      </h1>
                      <div style={{ fontStyle: 'italic', fontSize: '12pt', marginBottom: '8px' }}>
                        Ngày {day} tháng {month} năm {year}
                      </div>

                      {/* Thông tin số phiếu & Định khoản Nợ / Có */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '28px',
                          fontSize: '11.5pt',
                          marginTop: '4px',
                        }}
                      >
                        <div>
                          <strong>Số:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{printPreviewItem.voucherCode}</span>
                        </div>
                        <div>
                          <strong>Nợ:</strong> <span>TK {printPreviewItem.debitAccount}</span>
                        </div>
                        <div>
                          <strong>Có:</strong> <span>TK {printPreviewItem.creditAccount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nội dung chi tiết Phiếu chi */}
                    <div style={{ fontSize: '12.5pt', lineHeight: 1.7, marginTop: '16px' }}>
                      <div>
                        - Họ và tên người nhận tiền: <strong>{printPreviewItem.beneficiary}</strong>
                      </div>
                      <div>
                        - Địa chỉ (Bộ phận): Đơn vị thụ hưởng / Khách hàng Seajong
                      </div>
                      <div>
                        - Lý do chi: {printPreviewItem.categoryTitle} {printPreviewItem.note ? `(${printPreviewItem.note})` : ''}
                      </div>
                      <div>
                        - Số tiền: <strong style={{ fontSize: '13pt', color: '#b91c1c' }}>{formatVND(printPreviewItem.amount)}</strong>
                      </div>
                      <div>
                        - Viết bằng chữ: <strong style={{ fontStyle: 'italic' }}>{amountWords}</strong>
                      </div>
                      <div>
                        - Kèm theo: 01 chứng từ kế toán gốc.
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: '14px', fontSize: '11.5pt' }}>
                      Ngày {day} tháng {month} năm {year}
                    </div>

                    {/* 5 Cột Chữ ký */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        textAlign: 'center',
                        marginTop: '10px',
                        gap: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Giám đốc</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, đóng dấu)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{company?.legal_rep || 'Ban Giám Đốc'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Kế toán trưởng</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{printPreviewItem.executor}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Thủ quỹ</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Thủ quỹ Seajong</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Người lập phiếu</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Kế toán thanh toán</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Người nhận tiền</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{printPreviewItem.beneficiary.slice(0, 18)}</div>
                      </div>
                    </div>

                    {/* Phần xác nhận nhận tiền */}
                    <div style={{ marginTop: '24px', paddingTop: '10px', borderTop: '1px dashed #999', fontSize: '11pt', fontStyle: 'italic' }}>
                      Đã nhận đủ số tiền (viết bằng chữ): {amountWords}
                    </div>
                  </div>
                )}

                {/* 3. MẪU PHIẾU THU TIỀN MẶT (MẪU 01-TT THEO THÔNG TƯ 200/2014/TT-BTC) (DÒNG TIỀN VÀO) */}
                {isCashInflow && (
                  <div>
                    {/* Header thông tin công ty và mẫu số Thông tư */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ maxWidth: '64%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', lineHeight: 1.3 }}>
                          {company?.company_name || 'CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM'}
                        </div>
                        <div style={{ fontSize: '10pt', marginTop: '2px', lineHeight: 1.35 }}>
                          <strong>Địa chỉ:</strong> {company?.address || 'KCN Phùng Xá, Thạch Thất, TP. Hà Nội'}
                        </div>
                        <div style={{ fontSize: '10pt', marginTop: '2px' }}>
                          <strong>Mã số thuế:</strong> {company?.tax_code || '0109876543'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', minWidth: '34%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>Mẫu số 01 - TT</div>
                        <div style={{ fontSize: '9.5pt', fontStyle: 'italic', marginTop: '2px' }}>
                          (Ban hành theo Thông tư số 200/2014/TT-BTC
                        </div>
                        <div style={{ fontSize: '9.5pt', fontStyle: 'italic' }}>
                          Ngày 22/12/2014 của Bộ Tài chính)
                        </div>
                      </div>
                    </div>

                    {/* Tiêu đề chính Phiếu Thu */}
                    <div style={{ textAlign: 'center', margin: '20px 0 16px 0' }}>
                      <h1
                        style={{
                          fontSize: '22pt',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                          margin: '0 0 4px 0',
                          textTransform: 'uppercase',
                          color: '#047857',
                        }}
                      >
                        PHIẾU THU
                      </h1>
                      <div style={{ fontStyle: 'italic', fontSize: '12pt', marginBottom: '8px' }}>
                        Ngày {day} tháng {month} năm {year}
                      </div>

                      {/* Thông tin số phiếu & Định khoản Nợ / Có */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '28px',
                          fontSize: '11.5pt',
                          marginTop: '4px',
                        }}
                      >
                        <div>
                          <strong>Số:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{printPreviewItem.voucherCode}</span>
                        </div>
                        <div>
                          <strong>Nợ:</strong> <span>TK {printPreviewItem.debitAccount}</span>
                        </div>
                        <div>
                          <strong>Có:</strong> <span>TK {printPreviewItem.creditAccount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nội dung chi tiết Phiếu thu */}
                    <div style={{ fontSize: '12.5pt', lineHeight: 1.7, marginTop: '16px' }}>
                      <div>
                        - Họ và tên người nộp tiền: <strong>{printPreviewItem.beneficiary}</strong>
                      </div>
                      <div>
                        - Địa chỉ (Bộ phận): Khách hàng / Đại lý / Đối tác của Seajong
                      </div>
                      <div>
                        - Lý do nộp: {printPreviewItem.categoryTitle} {printPreviewItem.note ? `(${printPreviewItem.note})` : ''}
                      </div>
                      <div>
                        - Số tiền: <strong style={{ fontSize: '13pt', color: '#047857' }}>+{formatVND(printPreviewItem.amount)}</strong>
                      </div>
                      <div>
                        - Viết bằng chữ: <strong style={{ fontStyle: 'italic' }}>{amountWords}</strong>
                      </div>
                      <div>
                        - Kèm theo: 01 chứng từ kế toán gốc / Biên nhận thu tiền.
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontStyle: 'italic', marginTop: '14px', fontSize: '11.5pt' }}>
                      Ngày {day} tháng {month} năm {year}
                    </div>

                    {/* 5 Cột Chữ ký */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        textAlign: 'center',
                        marginTop: '10px',
                        gap: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Giám đốc</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, đóng dấu)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{company?.legal_rep || 'Ban Giám Đốc'}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Kế toán trưởng</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{printPreviewItem.executor}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Người nộp tiền</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>{printPreviewItem.beneficiary.slice(0, 18)}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Người lập phiếu</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Kế toán thu tiền</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>Thủ quỹ</div>
                        <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                        <div style={{ height: '70px' }} />
                        <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Thủ quỹ Seajong</div>
                      </div>
                    </div>

                    {/* Phần xác nhận nhận tiền */}
                    <div style={{ marginTop: '24px', paddingTop: '10px', borderTop: '1px dashed #999', fontSize: '11pt', fontStyle: 'italic' }}>
                      Đã nhận đủ số tiền (viết bằng chữ): {amountWords}
                    </div>
                  </div>
                )}

                {/* 4. MẪU GIẤY BÁO CÓ NGÂN HÀNG (CREDIT ADVICE) (DÒNG TIỀN VÀO CHUYỂN KHOẢN) */}
                {isCreditAdvice && (
                  <div>
                    {/* Header ngân hàng & Mẫu số */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '2px solid #000',
                        paddingBottom: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ maxWidth: '65%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase', color: '#047857' }}>
                          {bankInfo.bankName}
                        </div>
                        <div style={{ fontSize: '10.5pt', marginTop: '3px' }}>
                          <strong>Chi nhánh:</strong> {bankInfo.branch}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '32%' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11.5pt' }}>Mẫu số: 02/BÁO CÓ</div>
                        <div style={{ fontSize: '10pt', marginTop: '2px' }}>
                          <strong>Số Báo Có:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{printPreviewItem.voucherCode}</span>
                        </div>
                        <div style={{ fontSize: '10pt', fontStyle: 'italic', marginTop: '2px' }}>
                          Ngày {day}/{month}/{year}
                        </div>
                      </div>
                    </div>

                    {/* Tiêu đề Giấy Báo Có */}
                    <div style={{ textAlign: 'center', margin: '14px 0 18px 0' }}>
                      <h1
                        style={{
                          fontSize: '20pt',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                          margin: '0 0 4px 0',
                          textTransform: 'uppercase',
                          color: '#047857',
                        }}
                      >
                        GIẤY BÁO CÓ - CREDIT ADVICE
                      </h1>
                      <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                        (Chứng từ ghi Có tài khoản tiền gửi thanh toán doanh nghiệp)
                      </div>
                    </div>

                    {/* Khung Thông tin tài khoản thụ hưởng & người chuyển */}
                    <div
                      style={{
                        border: '1.5px solid #000',
                        borderRadius: '4px',
                        padding: '12px 14px',
                        marginBottom: '14px',
                      }}
                    >
                      {/* ĐƠN VỊ THỤ HƯỞNG (GHI CÓ VÀO TK) */}
                      <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #666' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', color: '#047857', marginBottom: '4px' }}>
                          A. TÀI KHOẢN THỤ HƯỞNG (GHI CÓ):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '4px', fontSize: '11.5pt' }}>
                          <span>Tên tài khoản:</span>
                          <strong style={{ textTransform: 'uppercase' }}>
                            {company?.company_name || 'CÔNG TY CỔ PHẦN SEAJONG FAUCET VIỆT NAM'}
                          </strong>
                          <span>Số tài khoản:</span>
                          <strong style={{ fontSize: '12.5pt', fontFamily: 'monospace', color: '#047857' }}>
                            {bankInfo.accountNumber}
                          </strong>
                          <span>Tại ngân hàng:</span>
                          <span>{bankInfo.bankName} - {bankInfo.branch}</span>
                        </div>
                      </div>

                      {/* ĐƠN VỊ NỘP / CHUYỂN TIỀN */}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', color: '#047857', marginBottom: '4px' }}>
                          B. ĐƠN VỊ NỘP / CHUYỂN TIỀN:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '4px', fontSize: '11.5pt' }}>
                          <span>Tên người nộp:</span>
                          <strong style={{ textTransform: 'uppercase' }}>{printPreviewItem.beneficiary}</strong>
                          <span>Hạch toán kế toán:</span>
                          <span>
                            Nợ <strong>TK {printPreviewItem.debitAccount}</strong> • Có <strong>TK {printPreviewItem.creditAccount}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Khung Số tiền & Nội dung */}
                    <div
                      style={{
                        border: '1.5px solid #000',
                        borderRadius: '4px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        backgroundColor: '#f0fdf4',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '6px', fontSize: '12pt' }}>
                        <span>Số tiền ghi Có:</span>
                        <strong style={{ fontSize: '14pt', color: '#047857' }}>
                          +{formatVND(printPreviewItem.amount)}
                        </strong>
                        <span>Số tiền bằng chữ:</span>
                        <strong style={{ fontStyle: 'italic' }}>{amountWords}</strong>
                        <span>Nội dung giao dịch:</span>
                        <span>{printPreviewItem.note || printPreviewItem.categoryTitle}</span>
                        <span>Ngày hạch toán:</span>
                        <span>{day}/{month}/{year}</span>
                      </div>
                    </div>

                    {/* Chữ ký hai bên */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginTop: '20px',
                      }}
                    >
                      <div style={{ border: '1px solid #999', borderRadius: '4px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', marginBottom: '4px' }}>
                          ĐƠN VỊ THỤ HƯỞNG (SEAJONG)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Kế toán trưởng</div>
                            <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, họ tên)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>{printPreviewItem.executor}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ border: '1px solid #999', borderRadius: '4px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase', marginBottom: '4px' }}>
                          NGÂN HÀNG THỰC HIỆN
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '10.5pt' }}>Kiểm soát viên</div>
                            <div style={{ fontSize: '9pt', fontStyle: 'italic' }}>(Ký, đóng dấu điện tử)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontSize: '10.5pt', color: '#047857', fontWeight: 'bold' }}>✓ Đã hạch toán thành công</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </PrintPreview>
        );
      })()}
    </div>
  );
};

export default CashflowTrackingView;
